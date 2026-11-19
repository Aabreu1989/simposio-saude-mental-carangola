/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  inMemoryPersistence,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  writeBatch,
  runTransaction,
  query,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  Registration,
  EventConfig,
  CertificateDownloadRecord,
  DownloadMaterial,
  SpeakerProfile,
  SocialPost,
  PushNotificationItem,
  NewsletterSubscriber
} from '../types.ts';
import { SPEAKERS_PROFILES } from '../data/initialData.ts';
import {
  generateRegistrationCode,
  buildRegistrationId,
  sanitizeRegistrationId,
  validateSubscriberId,
  buildSubscriberIdFromRegistrationId,
  validateStrictIsoTimestamp,
  SubscribersSnapshotMeta
} from '../utils/helpers.ts';

const app = getApps().some((a) => a.name === '[DEFAULT]') ? getApp() : initializeApp(firebaseConfig);
export const firestoreAuth = getAuth(app);
export const ACTIVE_FIREBASE_PROJECT_ID = firebaseConfig.projectId;
export const ACTIVE_FIRESTORE_DATABASE_ID =
  (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId || '(default)';
export const db = getFirestore(app, ACTIVE_FIRESTORE_DATABASE_ID);
export const storage = getStorage(app);

const PUBLIC_UNAUTH_APP_NAME = 'simposio-public-unauth';
const inMemoryVerifiedPublicAuths = new WeakSet<Auth>();

/**
 * Inicializa Auth na instância pública exclusivamente com `inMemoryPersistence`.
 * Re-execuções com as mesmas opções (ex.: HMR) retornam a mesma instância sem erro;
 * se o app já tiver sido inicializado com persistência diferente (ex.: via getAuth()),
 * falha fechado lançando PUBLIC_UNAUTH_PERSISTENCE_VIOLATION sem recorrer a getAuth().
 */
export const initStrictInMemoryPublicAuth = (targetApp: FirebaseApp): Auth => {
  let publicAuth: Auth;
  try {
    publicAuth = initializeAuth(targetApp, { persistence: inMemoryPersistence });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === 'auth/already-initialized') {
      throw new Error(
        'PUBLIC_UNAUTH_PERSISTENCE_VIOLATION: Instância Auth pública já inicializada sem garantia estrita de inMemoryPersistence.'
      );
    }
    throw err;
  }

  if (publicAuth.currentUser !== null) {
    throw new Error('PUBLIC_UNAUTH_INVARIANT_VIOLATION: Instância pública não pode possuir sessão autenticada.');
  }

  inMemoryVerifiedPublicAuths.add(publicAuth);
  return publicAuth;
};

// Inicialização estritamente idempotente (inclusive sob HMR) da instância pública não autenticada.
// Não exporta o serviço Auth privado e garante persistência apenas em memória sem nenhum signIn.
const getOrInitPublicUnauthInstances = () => {
  const existingPublicApp = getApps().find((a) => a.name === PUBLIC_UNAUTH_APP_NAME);
  if (existingPublicApp) {
    if (
      existingPublicApp.options.projectId !== firebaseConfig.projectId ||
      existingPublicApp.options.appId !== firebaseConfig.appId ||
      existingPublicApp.options.apiKey !== firebaseConfig.apiKey
    ) {
      throw new Error('PUBLIC_UNAUTH_APP_CONFIG_MISMATCH');
    }
  }

  const publicApp = existingPublicApp || initializeApp(firebaseConfig, PUBLIC_UNAUTH_APP_NAME);
  const publicAuth = initStrictInMemoryPublicAuth(publicApp);
  const publicDb = getFirestore(publicApp, ACTIVE_FIRESTORE_DATABASE_ID);
  return { publicApp, publicAuth, publicDb };
};

const { publicApp: publicUnauthApp, publicDb: publicUnauthDb } = getOrInitPublicUnauthInstances();

export const getPublicUnauthInstanceDiagnostics = () => {
  const { publicApp, publicAuth, publicDb } = getOrInitPublicUnauthInstances();
  return {
    appName: publicApp.name,
    projectId: publicApp.options.projectId,
    databaseId: ACTIVE_FIRESTORE_DATABASE_ID,
    hasCurrentUser: publicAuth.currentUser !== null,
    persistenceMode: 'inMemoryPersistence' as const,
    inMemoryPersistenceVerified: inMemoryVerifiedPublicAuths.has(publicAuth),
    isolatedFromDefault:
      publicApp !== app &&
      publicDb !== db &&
      publicAuth !== firestoreAuth &&
      publicUnauthApp === publicApp &&
      publicUnauthDb === publicDb
  };
};

export const getActiveFirebaseConfigSummary = () => ({
  projectId: ACTIVE_FIREBASE_PROJECT_ID,
  firestoreDatabaseId: ACTIVE_FIRESTORE_DATABASE_ID,
  authDomain: firebaseConfig.authDomain,
  appId: firebaseConfig.appId
});

export const PRIMARY_ADMIN_EMAIL = 'farmaciademinas.marketing@gmail.com';
export const AUTHORIZED_ADMIN_EMAILS: readonly string[] = [
  'farmaciademinas.marketing@gmail.com',
  'amandajhonnes@yahoo.com.br'
];

export type FirebaseAdminUser = User;

export const LOCAL_ADMIN_STORAGE_KEY = 'simposio_admin_session_auth';

// Clean up any legacy fake local admin session from localStorage
const purgeLegacyLocalAdminSession = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.removeItem(LOCAL_ADMIN_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
};
purgeLegacyLocalAdminSession();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

export type FirestoreErrorCategory =
  | 'offline'
  | 'permission_denied'
  | 'not_found'
  | 'auth_error'
  | 'config_error'
  | 'collision'
  | 'validation_error'
  | 'unknown';

export interface FirestoreErrorInfo {
  error: string;
  code?: string;
  category: FirestoreErrorCategory;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: Array<{
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }>;
  };
}

export function classifyFirestoreError(error: unknown): FirestoreErrorCategory {
  const errObj = error as { code?: string; message?: string; status?: string };
  const code = String(errObj?.code || errObj?.status || '').toLowerCase();
  const msg = String(errObj?.message || error || '').toLowerCase();

  if (
    code.includes('unavailable') ||
    msg.includes('client is offline') ||
    msg.includes('network-request-failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('offline')
  ) {
    return 'offline';
  }
  if (
    code.includes('permission-denied') ||
    code.includes('permission_denied') ||
    msg.includes('missing or insufficient permissions') ||
    msg.includes('permission-denied') ||
    msg.includes('permission_denied')
  ) {
    return 'permission_denied';
  }
  if (
    code.includes('not-found') ||
    code.includes('not_found') ||
    msg.includes('does not exist') ||
    msg.includes('not-found') ||
    msg.includes('not_found')
  ) {
    return 'not_found';
  }
  if (
    code.includes('unauthenticated') ||
    code.includes('auth/') ||
    msg.includes('unauthorized-domain') ||
    msg.includes('unauthenticated')
  ) {
    return 'auth_error';
  }
  if (
    code.includes('validation') ||
    msg.includes('validation_error')
  ) {
    return 'validation_error';
  }
  if (
    code.includes('already-exists') ||
    msg.includes('public_duplicate_or_unverifiable_state') ||
    msg.includes('triad_') ||
    msg.includes('registration_identity_conflict')
  ) {
    return 'collision';
  }
  if (
    code.includes('invalid-argument') ||
    msg.includes('api key not valid') ||
    msg.includes('configuration') ||
    msg.includes('project_invalid')
  ) {
    return 'config_error';
  }
  return 'unknown';
}

export function formatFirestoreUserErrorMessage(
  category: FirestoreErrorCategory,
  error: unknown
): string {
  const rawMessage = error instanceof Error ? error.message : String(error || '');
  switch (category) {
    case 'offline':
      return 'Sem conexão com o servidor Firestore no momento. Verifique sua internet e tente novamente.';
    case 'permission_denied':
      return 'O servidor recusou a gravação por restrição de permissão ou conflito de registro no Firestore.';
    case 'not_found':
      return 'Banco de dados ou coleção do Firestore não encontrada na configuração atual.';
    case 'auth_error':
      return `Falha de autenticação no Firebase: ${rawMessage || 'sessão não autorizada'}.`;
    case 'config_error':
      return `Erro de configuração do projeto Firebase (${ACTIVE_FIREBASE_PROJECT_ID}): ${rawMessage}`;
    case 'collision':
      return 'Não foi possível gerar um código exclusivo para a inscrição após novas tentativas. Tente novamente.';
    case 'validation_error':
      return rawMessage || 'Dados obrigatórios da inscrição estão incompletos ou inválidos.';
    default:
      return rawMessage || 'Erro técnico ao comunicar com o banco de dados Firestore.';
  }
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const category = classifyFirestoreError(error);
  const code = (error as { code?: string })?.code;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    code,
    category,
    authInfo: {
      userId: firestoreAuth.currentUser?.uid,
      email: firestoreAuth.currentUser?.email,
      emailVerified: firestoreAuth.currentUser?.emailVerified,
      isAnonymous: firestoreAuth.currentUser?.isAnonymous,
      tenantId: firestoreAuth.currentUser?.tenantId,
      providerInfo:
        firestoreAuth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL
        })) || []
    },
    operationType,
    path
  };
  const serialized = JSON.stringify(errInfo);
  console.error('Firestore Error:', serialized);
  throw new Error(serialized);
}

export interface FirestoreConnectionResult {
  ok: boolean;
  offline?: boolean;
  category?: FirestoreErrorCategory;
  error?: string;
  projectId: string;
  databaseId: string;
}

type ConnectionProbeFn = () => Promise<void>;
let customConnectionProbeForTests: ConnectionProbeFn | null = null;

export function setFirestoreConnectionProbeForTests(probe: ConnectionProbeFn | null): void {
  customConnectionProbeForTests = probe;
}

export async function testFirestoreConnection(): Promise<FirestoreConnectionResult> {
  try {
    if (customConnectionProbeForTests) {
      await customConnectionProbeForTests();
    } else {
      await getDocFromServer(doc(db, 'event_config', 'main'));
    }
    return {
      ok: true,
      projectId: ACTIVE_FIREBASE_PROJECT_ID,
      databaseId: ACTIVE_FIRESTORE_DATABASE_ID
    };
  } catch (error) {
    const category = classifyFirestoreError(error);
    const errMessage = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      offline: category === 'offline',
      category,
      error: errMessage,
      projectId: ACTIVE_FIREBASE_PROJECT_ID,
      databaseId: ACTIVE_FIRESTORE_DATABASE_ID
    };
  }
}

const stripUndefined = <T extends Record<string, unknown>>(obj: T): Record<string, unknown> => {
  const cleaned: Record<string, unknown> = {};
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        cleaned[key] = stripUndefined(value as Record<string, unknown>);
      } else {
        cleaned[key] = value;
      }
    }
  });
  return cleaned;
};

const sanitizeId = (raw: string, fallbackPrefix = 'doc'): string => {
  const cleaned = (raw || '').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120);
  return cleaned || `${fallbackPrefix}-${Date.now()}`;
};

const sanitizeCode = (raw: string): string => {
  const cleaned = (raw || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '-').slice(0, 32);
  return cleaned.length >= 3 ? cleaned : `CAR-${Date.now().toString().slice(-6)}`;
};

export const sha256Hex = async (message: string): Promise<string> => {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const msgUint8 = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let hash1 = 0x55555555;
  let hash2 = 0xaaaaaaaa;
  for (let i = 0; i < message.length; i++) {
    const code = message.charCodeAt(i);
    hash1 = Math.imul(hash1 ^ code, 2654435761);
    hash2 = Math.imul(hash2 ^ code, 1597334677);
  }
  const part1 = (hash1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (hash2 >>> 0).toString(16).padStart(8, '0');
  return (part1 + part2).repeat(4).slice(0, 64);
};

export const generateSecureToken = (): string => {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  const rand = () => Math.random().toString(36).substring(2);
  return (rand() + rand() + rand() + rand()).padEnd(64, '0').slice(0, 64);
};

let pendingAnonAuthPromise: Promise<string> | null = null;
let ensureAuthObserverForTests: ((uid: string) => void) | null = null;

export const setEnsureAuthObserverForTests = (observer: ((uid: string) => void) | null): void => {
  ensureAuthObserverForTests = observer;
};

export const ensureAuthenticatedUser = async (): Promise<string> => {
  if (firestoreAuth.currentUser) {
    const uid = firestoreAuth.currentUser.uid;
    ensureAuthObserverForTests?.(uid);
    return uid;
  }
  if (pendingAnonAuthPromise) {
    return pendingAnonAuthPromise;
  }

  pendingAnonAuthPromise = (async () => {
    try {
      const cred = await signInAnonymously(firestoreAuth);
      ensureAuthObserverForTests?.(cred.user.uid);
      return cred.user.uid;
    } catch (err) {
      console.warn('Aviso: Autenticação anônima temporariamente indisponível:', err);
      let fallbackId: string;
      if (typeof localStorage !== 'undefined') {
        let localId = localStorage.getItem('sus_voter_id');
        if (!localId) {
          localId = 'voter-' + generateSecureToken().slice(0, 16);
          localStorage.setItem('sus_voter_id', localId);
        }
        fallbackId = localId;
      } else {
        fallbackId = 'voter-' + generateSecureToken().slice(0, 16);
      }
      ensureAuthObserverForTests?.(fallbackId);
      return fallbackId;
    } finally {
      pendingAnonAuthPromise = null;
    }
  })();

  return pendingAnonAuthPromise;
};

export interface CertificatePermissionRecord {
  code: string;
  registrationId: string;
  status: 'confirmada' | 'presente' | 'cancelada';
  certificateIssued: boolean;
  certificateDownloaded?: boolean;
  certificateDownloadCount?: number;
  checkedInAt?: string;
  participantName?: string;
  city?: string;
  professionalRole?: string;
  institution?: string;
  updatedAt?: string;
}

const buildRegistrationDoc = (reg: Registration, nowIso: string): Record<string, unknown> => {
  const id = sanitizeRegistrationId(reg.id, 'reg');
  const code = sanitizeCode(reg.code);
  const status = reg.status === 'presente' || reg.status === 'cancelada' ? reg.status : 'confirmada';
  // Regra estrita: certificado só pode estar liberado quando credenciado ('presente')
  const certificateIssued = status === 'presente' ? Boolean(reg.certificateIssued) : false;

  const base: Record<string, unknown> = {
    id,
    code,
    fullName: (reg.fullName || 'Participante').trim().slice(0, 160),
    cpf: (reg.cpf || '000.000.000-00').trim().slice(0, 20),
    email: (reg.email || '').trim().slice(0, 160),
    phone: (reg.phone || '').trim().slice(0, 32),
    city: (reg.city || 'Carangola').trim().slice(0, 100),
    professionalRole: (reg.professionalRole || 'Participante').trim().slice(0, 120),
    institution: (reg.institution || 'SUS').trim().slice(0, 180),
    axisInterest: (reg.axisInterest || 'Eixo 1').trim().slice(0, 160),
    status,
    registeredAt: (reg.registeredAt || nowIso).slice(0, 40),
    certificateIssued,
    updatedAt: nowIso
  };

  if (reg.cns) base.cns = String(reg.cns).slice(0, 32);
  if (reg.accessibilityNeeds) base.accessibilityNeeds = String(reg.accessibilityNeeds).slice(0, 200);
  if (status === 'presente' && reg.checkedInAt) base.checkedInAt = String(reg.checkedInAt).slice(0, 40);
  if (typeof reg.certificateDownloaded === 'boolean') base.certificateDownloaded = reg.certificateDownloaded;
  if (reg.certificateDownloadedAt) base.certificateDownloadedAt = String(reg.certificateDownloadedAt).slice(0, 40);
  if (typeof reg.certificateDownloadCount === 'number' && reg.certificateDownloadCount >= 0) {
    base.certificateDownloadCount = reg.certificateDownloadCount;
  }
  if (reg.notes) base.notes = String(reg.notes).slice(0, 500);
  if (reg.instagram) base.instagram = String(reg.instagram).slice(0, 120);
  if (reg.linkedin) base.linkedin = String(reg.linkedin).slice(0, 200);
  if (reg.otherSocial) base.otherSocial = String(reg.otherSocial).slice(0, 200);
  if (reg.ageGroup) base.ageGroup = String(reg.ageGroup).slice(0, 40);
  if (reg.educationLevel) base.educationLevel = String(reg.educationLevel).slice(0, 80);
  if (reg.susCareLevel) base.susCareLevel = String(reg.susCareLevel).slice(0, 120);
  if (reg.referralSource) base.referralSource = String(reg.referralSource).slice(0, 120);
  if (typeof reg.acceptEmailNews === 'boolean') base.acceptEmailNews = reg.acceptEmailNews;
  if (typeof reg.acceptWhatsappNews === 'boolean') base.acceptWhatsappNews = reg.acceptWhatsappNews;
  if (reg.origin === 'portal' || reg.origin === 'google_forms' || reg.origin === 'presencial') {
    base.origin = reg.origin;
  }

  return base;
};

const buildPermissionDoc = (reg: Registration, nowIso: string): Record<string, unknown> => {
  const id = sanitizeRegistrationId(reg.id, 'reg');
  const code = sanitizeCode(reg.code);
  const status = reg.status === 'presente' || reg.status === 'cancelada' ? reg.status : 'confirmada';
  const certificateIssued = status === 'presente' ? Boolean(reg.certificateIssued) : false;

  const docData: Record<string, unknown> = {
    code,
    registrationId: id,
    status,
    certificateIssued,
    participantName: (reg.fullName || 'Participante').trim().slice(0, 160),
    city: (reg.city || 'Carangola').trim().slice(0, 100),
    professionalRole: (reg.professionalRole || 'Participante').trim().slice(0, 120),
    institution: (reg.institution || 'SUS').trim().slice(0, 180),
    updatedAt: nowIso
  };

  if (typeof reg.certificateDownloaded === 'boolean') docData.certificateDownloaded = reg.certificateDownloaded;
  if (typeof reg.certificateDownloadCount === 'number' && reg.certificateDownloadCount >= 0) {
    docData.certificateDownloadCount = reg.certificateDownloadCount;
  }
  if (status === 'presente' && reg.checkedInAt) {
    docData.checkedInAt = String(reg.checkedInAt).slice(0, 40);
  }

  return docData;
};

export const isVerifiedAdminUser = (
  user: FirebaseAdminUser | null | undefined
): boolean => {
  if (!user) return false;
  if ((user as { isLocalFallback?: boolean }).isLocalFallback) return false;
  if (!user.emailVerified) return false;
  const activeAuthUser = firestoreAuth.currentUser;
  if (activeAuthUser && activeAuthUser.uid !== user.uid) return false;
  if (!user.uid || typeof user.uid !== 'string') return false;
  const userEmail = (user.email || '').trim().toLowerCase();
  return AUTHORIZED_ADMIN_EMAILS.some((adm) => adm.toLowerCase() === userEmail);
};

/**
 * Verificação assíncrona alinhada integralmente a `isAdmin()` das firestore.rules:
 * verifica token JWT real (`email_verified`), allowlist oficial e documento `/admins/{uid}` no servidor.
 * Usada exclusivamente no caminho administrativo sobre `[DEFAULT]` `db`.
 */
export const isAuthorizedServerAdminSession = async (): Promise<boolean> => {
  await firestoreAuth.authStateReady();
  const user = firestoreAuth.currentUser;
  if (!user || (user as { isLocalFallback?: boolean }).isLocalFallback) {
    return false;
  }

  const tokenResult = await user.getIdTokenResult();
  if (tokenResult.claims.email_verified !== true) {
    return false;
  }

  const claimEmail = String(tokenResult.claims.email || user.email || '').trim().toLowerCase();
  if (AUTHORIZED_ADMIN_EMAILS.some((adm) => adm.toLowerCase() === claimEmail)) {
    return true;
  }

  const adminSnap = await getDocFromServer(doc(db, 'admins', user.uid));
  return adminSnap.exists();
};

export const ADMIN_AUTH_REDIRECT_PENDING_KEY = 'simposio_admin_google_redirect_pending';
const REDIRECT_PENDING_TTL_MS = 5 * 60 * 1000;

export const isStandalonePwaMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const matchStandalone =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches === true;
    const iosStandalone =
      (typeof navigator !== 'undefined' &&
        (navigator as { standalone?: boolean }).standalone === true) ||
      false;
    return matchStandalone || iosStandalone;
  } catch {
    return false;
  }
};

export const isEmbeddedInAppBrowser = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /WhatsApp|Instagram|FBAN|FBAV|Line\//i.test(navigator.userAgent || '');
};

export const shouldFallbackToRedirectAuth = (
  error: unknown,
  standalonePwa = false
): boolean => {
  const errObj = error as { code?: string; message?: string };
  const code = String(errObj?.code || '').toLowerCase();
  const msg = String(errObj?.message || '').toLowerCase();

  if (
    code.includes('auth/popup-blocked') ||
    msg.includes('auth/popup-blocked') ||
    code.includes('auth/operation-not-supported-in-this-environment') ||
    msg.includes('auth/operation-not-supported-in-this-environment') ||
    code.includes('auth/web-storage-unsupported') ||
    msg.includes('auth/web-storage-unsupported')
  ) {
    return true;
  }

  if (
    standalonePwa &&
    (code.includes('auth/popup-closed-by-user') ||
      msg.includes('popup-closed-by-user') ||
      code.includes('auth/cancelled-popup-request'))
  ) {
    return true;
  }

  return false;
};

const readPendingRedirectFlag = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage?.getItem(ADMIN_AUTH_REDIRECT_PENDING_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    return Number.isFinite(ts) && Date.now() - ts <= REDIRECT_PENDING_TTL_MS;
  } catch {
    return false;
  }
};

const writePendingRedirectFlag = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.setItem(ADMIN_AUTH_REDIRECT_PENDING_KEY, String(Date.now()));
  } catch {
    // ignore storage errors
  }
};

const clearPendingRedirectFlag = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.removeItem(ADMIN_AUTH_REDIRECT_PENDING_KEY);
  } catch {
    // ignore storage errors
  }
};

const formatGoogleAdminAuthError = (error: unknown): unknown => {
  const err = error as { code?: string; message?: string };
  if (
    err?.code === 'auth/unauthorized-domain' ||
    err?.message?.includes('auth/unauthorized-domain') ||
    err?.message?.includes('unauthorized-domain')
  ) {
    const domain = typeof window !== 'undefined' ? window.location.hostname : 'domínio atual';
    const authErr = new Error(
      `Domínio não autorizado no Firebase Authentication (${domain}). Autorize este domínio em Firebase Console → Authentication → Settings → Authorized domains no projeto ${ACTIVE_FIREBASE_PROJECT_ID}.`
    );
    (authErr as { code?: string }).code = 'auth/unauthorized-domain';
    return authErr;
  }
  return error;
};

export const signInFirestoreAdmin = async (
  options?: { preferRedirect?: boolean }
): Promise<FirebaseAdminUser | null> => {
  if (isEmbeddedInAppBrowser()) {
    throw new Error(
      'O Google bloqueia login dentro do navegador interno do WhatsApp/Instagram. Abra este link diretamente no Chrome ou Safari para conectar a conta do gestor.'
    );
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    login_hint: PRIMARY_ADMIN_EMAIL,
    prompt: 'select_account'
  });

  const startRedirect = async (): Promise<null> => {
    writePendingRedirectFlag();
    await signInWithRedirect(firestoreAuth, provider);
    return null;
  };

  if (options?.preferRedirect) {
    try {
      return await startRedirect();
    } catch (error: unknown) {
      clearPendingRedirectFlag();
      throw formatGoogleAdminAuthError(error);
    }
  }

  try {
    const result = await signInWithPopup(firestoreAuth, provider);
    if (!isVerifiedAdminUser(result.user)) {
      await signOut(firestoreAuth);
      throw new Error(
        `A conta autenticada (${result.user.email || 'sem e-mail'}) não possui permissão de gestor autorizado no Firebase.`
      );
    }
    clearPendingRedirectFlag();
    return result.user;
  } catch (error: unknown) {
    const formatted = formatGoogleAdminAuthError(error);
    if ((formatted as { code?: string })?.code === 'auth/unauthorized-domain') {
      throw formatted;
    }

    if (shouldFallbackToRedirectAuth(error, isStandalonePwaMode())) {
      return await startRedirect();
    }

    const err = error as { code?: string; message?: string };
    if (
      err?.code === 'auth/popup-closed-by-user' ||
      err?.code === 'auth/cancelled-popup-request' ||
      err?.message?.includes('popup-closed-by-user')
    ) {
      return null;
    }
    throw formatted;
  }
};

export const consumeAdminRedirectResult = async (): Promise<{
  user: FirebaseAdminUser | null;
  hadPendingRedirect: boolean;
  error?: string;
}> => {
  const hadPendingRedirect = readPendingRedirectFlag();
  clearPendingRedirectFlag();

  try {
    const result = await getRedirectResult(firestoreAuth);
    if (result?.user) {
      if (!isVerifiedAdminUser(result.user)) {
        await signOut(firestoreAuth);
        return {
          user: null,
          hadPendingRedirect: true,
          error: `A conta autenticada (${result.user.email || 'sem e-mail'}) não possui permissão de gestor autorizado no Firebase.`
        };
      }
      return { user: result.user, hadPendingRedirect: true };
    }
    if (
      hadPendingRedirect &&
      firestoreAuth.currentUser &&
      isVerifiedAdminUser(firestoreAuth.currentUser)
    ) {
      return { user: firestoreAuth.currentUser, hadPendingRedirect: true };
    }
    return { user: null, hadPendingRedirect };
  } catch (error: unknown) {
    const formatted = formatGoogleAdminAuthError(error);
    return {
      user: null,
      hadPendingRedirect,
      error:
        formatted instanceof Error
          ? formatted.message
          : 'Falha ao concluir autenticação Google por redirecionamento.'
    };
  }
};

export const signOutFirestoreAdmin = async (): Promise<void> => {
  await signOut(firestoreAuth);
};

export const subscribeAuthState = (
  callback: (user: FirebaseAdminUser | null) => void
) => {
  return onAuthStateChanged(firestoreAuth, (user) => {
    callback(user);
  });
};

export interface PublicRegistrationSaveResult {
  success: boolean;
  alreadyExisted?: boolean;
  subscriberTombstoned?: boolean;
  id: string;
  code: string;
  attemptsUsed: number;
}

export interface FirestoreRegistrationStorageAdapter {
  getPermissionDoc: (code: string) => Promise<{ exists: boolean; data?: Record<string, unknown> }>;
  commitRegistrationBatch: (
    regId: string,
    regPayload: Record<string, unknown>,
    permCode: string,
    permPayload: Record<string, unknown>,
    subPayload?: Record<string, unknown> | null
  ) => Promise<void>;
}

// Adaptador público padrão vinculado ESTRITAMENTE à instância isolada não autenticada (publicUnauthDb).
// Nunca lê firestoreAuth ([DEFAULT]), eliminando qualquer janela de corrida TOCTOU entre sessão e escrita.
const defaultPublicRegistrationAdapter: FirestoreRegistrationStorageAdapter = {
  async getPermissionDoc(code: string) {
    const snap = await getDocFromServer(doc(publicUnauthDb, 'certificate_permissions', code));
    return {
      exists: snap.exists(),
      data: snap.exists() ? (snap.data() as Record<string, unknown>) : undefined
    };
  },
  async commitRegistrationBatch(regId, regPayload, permCode, permPayload, subPayload) {
    const batch = writeBatch(publicUnauthDb);
    batch.set(doc(publicUnauthDb, 'registrations', regId), regPayload);
    batch.set(doc(publicUnauthDb, 'certificate_permissions', permCode), permPayload);
    if (subPayload) {
      batch.set(doc(publicUnauthDb, 'newsletter_subscribers', String(subPayload.id)), subPayload);
    }
    await batch.commit();
  }
};

let customRegistrationAdapterForTests: FirestoreRegistrationStorageAdapter | null = null;

export function setFirestoreRegistrationAdapterForTests(
  adapter: FirestoreRegistrationStorageAdapter | null
): void {
  customRegistrationAdapterForTests = adapter;
}

export interface AdminTriadStorageAdapterForTests {
  isAdminAuthorized: () => boolean;
  getServerDoc: (
    collectionName: 'registrations' | 'certificate_permissions' | 'newsletter_subscribers',
    docId: string
  ) => Promise<Record<string, unknown> | null>;
  runTriadTransaction: <T>(
    fn: (tx: {
      get: (
        collectionName: 'registrations' | 'certificate_permissions' | 'newsletter_subscribers',
        docId: string
      ) => Promise<Record<string, unknown> | null>;
      set: (
        collectionName: 'registrations' | 'certificate_permissions' | 'newsletter_subscribers',
        docId: string,
        data: Record<string, unknown>
      ) => void;
    }) => Promise<T>
  ) => Promise<T>;
}

let customAdminTriadAdapterForTests: AdminTriadStorageAdapterForTests | null = null;

export function setAdminTriadAdapterForTests(
  adapter: AdminTriadStorageAdapterForTests | null
): void {
  customAdminTriadAdapterForTests = adapter;
}

const buildSubscriberPayloadFromRegistration = (
  currentReg: Registration,
  candidateId: string,
  nowIso: string
): Record<string, unknown> | null => {
  const wantsNews = Boolean(currentReg.acceptEmailNews || currentReg.acceptWhatsappNews);
  if (!wantsNews) return null;

  const subId = validateSubscriberId(buildSubscriberIdFromRegistrationId(candidateId));
  const payload: Record<string, unknown> = {
    id: subId,
    email: String(currentReg.email).trim().toLowerCase(),
    name: String(currentReg.fullName).trim(),
    phone: currentReg.phone ? String(currentReg.phone).trim() : undefined,
    city: currentReg.city ? String(currentReg.city).trim() : undefined,
    role: currentReg.professionalRole ? String(currentReg.professionalRole).trim() : undefined,
    institution: currentReg.institution ? String(currentReg.institution).trim() : undefined,
    receiveEmail: Boolean(currentReg.acceptEmailNews),
    receiveWhatsapp: Boolean(currentReg.acceptWhatsappNews),
    origin: 'inscricao',
    subscribedAt: nowIso.split('T')[0],
    status: 'active',
    consent: true,
    updatedAt: nowIso
  };
  Object.keys(payload).forEach((k) => {
    if (payload[k] === undefined) delete payload[k];
  });
  return payload;
};

const validatePublicBatchPayloadsLocally = (
  regPayload: Record<string, unknown>,
  permPayload: Record<string, unknown>,
  subPayload: Record<string, unknown> | null
): void => {
  const regId = String(regPayload.id || '');
  const code = String(regPayload.code || '');
  if (!/^[a-zA-Z0-9_-]{1,124}$/.test(regId)) {
    throw new Error('VALIDATION_ERROR: Identificador de inscrição inválido.');
  }
  if (!/^[A-Z0-9_-]{3,32}$/.test(code) || permPayload.code !== code || permPayload.registrationId !== regId) {
    throw new Error('VALIDATION_ERROR: Código de permissão incompatível.');
  }
  if (String(regPayload.fullName || '').trim().length < 2 || String(regPayload.cpf || '').trim().length < 11) {
    throw new Error('VALIDATION_ERROR: Dados obrigatórios da inscrição inválidos.');
  }
  if (regPayload.status !== 'confirmada' || regPayload.certificateIssued !== false) {
    throw new Error('VALIDATION_ERROR: Inscrição pública deve iniciar como confirmada sem certificado.');
  }
  if (subPayload) {
    validateSubscriberId(String(subPayload.id || ''));
    if (String(subPayload.email || '').trim().length < 5 || subPayload.status !== 'active' || subPayload.consent !== true) {
      throw new Error('VALIDATION_ERROR: Payload de assinante inválido.');
    }
  }
};

export const savePublicRegistrationToDb = async (
  reg: Registration,
  maxCollisionRetries = 3
): Promise<PublicRegistrationSaveResult> => {
  const adapter = customRegistrationAdapterForTests || defaultPublicRegistrationAdapter;
  const nowIso = new Date().toISOString();
  const stableId = buildRegistrationId(reg.id);

  let currentReg: Registration = {
    ...reg,
    id: stableId,
    status: 'confirmada',
    certificateIssued: false,
    checkedInAt: undefined
  };

  let attemptsUsed = 0;
  let lastError: unknown = null;
  const triedCodes = new Set<string>();

  for (let attempt = 0; attempt < maxCollisionRetries; attempt += 1) {
    attemptsUsed += 1;
    const candidateCode = sanitizeCode(currentReg.code);
    const candidateId = sanitizeRegistrationId(currentReg.id, 'reg');
    triedCodes.add(candidateCode);

    // 1. Pré-checagem pública em certificate_permissions/{candidateCode}
    let existingPerm: { exists: boolean; data?: Record<string, unknown> } | null = null;
    try {
      existingPerm = await adapter.getPermissionDoc(candidateCode);
    } catch {
      existingPerm = null;
    }

    if (existingPerm?.exists) {
      const existingRegId = String(existingPerm.data?.registrationId || '');
      if (existingRegId !== candidateId) {
        // Colisão real de código com outra inscrição: preserva documento alheio e gera novo código
        if (attempt < maxCollisionRetries - 1) {
          const newCode = generateRegistrationCode(0, Array.from(triedCodes));
          triedCodes.add(newCode);
          currentReg = {
            ...currentReg,
            code: newCode
          };
          continue;
        }
        const colErr = Object.assign(
          new Error(`CODE_COLLISION_EXHAUSTED: Código ${candidateCode} já ocupado por outra inscrição.`),
          { code: 'already-exists' }
        );
        handleFirestoreError(colErr, OperationType.WRITE, `certificate_permissions/${candidateCode}`);
      }

      // Mesmo registrationId na permissão pública: política estritamente FAIL-CLOSED.
      // O cliente público não lê registrations/newsletter_subscribers (LGPD), portanto NUNCA
      // classifica como alreadyExisted: true e NUNCA cria/recupera assinante.
      const dupErr = Object.assign(
        new Error(
          'PUBLIC_DUPLICATE_OR_UNVERIFIABLE_STATE: Já existe registro vinculado a este identificador/código. Consulte seu comprovante na aba Certificado ou contate a coordenação.'
        ),
        { code: 'already-exists' }
      );
      handleFirestoreError(dupErr, OperationType.WRITE, `certificate_permissions/${candidateCode}`);
    }

    const regPayload = buildRegistrationDoc(currentReg, nowIso);
    const permPayload = buildPermissionDoc(currentReg, nowIso);
    const subPayload = buildSubscriberPayloadFromRegistration(currentReg, candidateId, nowIso);

    try {
      validatePublicBatchPayloadsLocally(regPayload, permPayload, subPayload);
    } catch (validationErr) {
      handleFirestoreError(validationErr, OperationType.WRITE, `registrations/${candidateId}`);
    }

    try {
      await adapter.commitRegistrationBatch(candidateId, regPayload, candidateCode, permPayload, subPayload);

      return {
        success: true,
        alreadyExisted: false,
        id: candidateId,
        code: candidateCode,
        attemptsUsed
      };
    } catch (error) {
      lastError = error;
      const category = classifyFirestoreError(error);

      // Só trata colisão concorrente diante de PROVA DOCUMENTAL POSITIVA em certificate_permissions;
      // permission_denied sem evidência de código conflitante propaga o erro sem mascarar autorização/ID.
      if (category === 'permission_denied') {
        let postPerm: { exists: boolean; data?: Record<string, unknown> } | null = null;
        try {
          postPerm = await adapter.getPermissionDoc(candidateCode);
        } catch {
          postPerm = null;
        }

        if (postPerm?.exists) {
          const existingRegId = String(postPerm.data?.registrationId || '');
          if (existingRegId !== candidateId && attempt < maxCollisionRetries - 1) {
            const newCode = generateRegistrationCode(0, Array.from(triedCodes));
            triedCodes.add(newCode);
            currentReg = {
              ...currentReg,
              code: newCode
            };
            continue;
          }
          if (existingRegId === candidateId) {
            const dupErr = Object.assign(
              new Error(
                'PUBLIC_DUPLICATE_OR_UNVERIFIABLE_STATE: Registro concorrente já existente no servidor para este código/identificador.'
              ),
              { code: 'already-exists' }
            );
            handleFirestoreError(dupErr, OperationType.WRITE, `certificate_permissions/${candidateCode}`);
          }
        }
      }

      handleFirestoreError(error, OperationType.WRITE, `registrations/${candidateId}`);
    }
  }

  handleFirestoreError(lastError, OperationType.WRITE, `registrations/${currentReg.id}`);
};

interface TriadDocsValidationResult {
  valid: boolean;
  reason?:
    | 'TRIAD_ORPHAN_PERMISSION_CONFLICT'
    | 'INCOMPLETE_TRIAD_OR_ISOLATED_DOC'
    | 'CODE_COLLISION_CONFLICT'
    | 'REGISTRATION_IDENTITY_CONFLICT'
    | 'ORIGINAL_CONSENT_MISMATCH'
    | 'TRIAD_MISSING_SUBSCRIBER_CONFLICT'
    | 'UNEXPECTED_SUBSCRIBER_WITHOUT_OPT_IN'
    | 'SUBSCRIBER_IDENTITY_OR_CONSENT_INVALID'
    | 'INVALID_TOMBSTONE_CHANNELS'
    | 'ACTIVE_SUBSCRIBER_CHANNEL_MISMATCH';
  subscriberTombstoned: boolean;
}

/**
 * Validação única e rigorosa da tríade (`registrations` + `certificate_permissions` + `newsletter_subscribers`),
 * compartilhada entre o caminho transacional administrativo (Grupo B) e a reconciliação da fila offline (Grupo D).
 */
const validateExistingRegistrationTriadDocs = (params: {
  candidateId: string;
  candidateCode: string;
  subId: string;
  expectedCpf: string;
  expectedEmail: string;
  expectedEmailOptIn: boolean;
  expectedWhatsappOptIn: boolean;
  regData: Record<string, unknown> | null;
  permData: Record<string, unknown> | null;
  subData: Record<string, unknown> | null;
}): TriadDocsValidationResult => {
  const {
    candidateId,
    candidateCode,
    subId,
    expectedCpf,
    expectedEmail,
    expectedEmailOptIn,
    expectedWhatsappOptIn,
    regData,
    permData,
    subData
  } = params;

  if (permData && !regData) {
    return { valid: false, reason: 'TRIAD_ORPHAN_PERMISSION_CONFLICT', subscriberTombstoned: false };
  }
  if (!permData || !regData) {
    return { valid: false, reason: 'INCOMPLETE_TRIAD_OR_ISOLATED_DOC', subscriberTombstoned: false };
  }

  if (
    String(permData.code || '') !== candidateCode ||
    String(permData.registrationId || '') !== candidateId
  ) {
    return { valid: false, reason: 'CODE_COLLISION_CONFLICT', subscriberTombstoned: false };
  }

  const cleanCpf = (v: unknown) => String(v || '').replace(/\D/g, '');
  const cleanEmail = (v: unknown) => String(v || '').trim().toLowerCase();

  if (
    String(regData.id || '') !== candidateId ||
    String(regData.code || '') !== candidateCode ||
    cleanCpf(regData.cpf) !== cleanCpf(expectedCpf) ||
    cleanEmail(regData.email) !== cleanEmail(expectedEmail)
  ) {
    return { valid: false, reason: 'REGISTRATION_IDENTITY_CONFLICT', subscriberTombstoned: false };
  }

  // 1. Validar tipos e correspondência do consentimento original persistido em regData
  //    ANTES de qualquer decisão sobre existência esperada de assinante
  if (
    (regData.acceptEmailNews !== undefined && typeof regData.acceptEmailNews !== 'boolean') ||
    (regData.acceptWhatsappNews !== undefined && typeof regData.acceptWhatsappNews !== 'boolean')
  ) {
    return { valid: false, reason: 'ORIGINAL_CONSENT_MISMATCH', subscriberTombstoned: false };
  }

  const persistedEmailOptIn = regData.acceptEmailNews === true;
  const persistedWhatsappOptIn = regData.acceptWhatsappNews === true;
  const incomingEmailOptIn = Boolean(expectedEmailOptIn);
  const incomingWhatsappOptIn = Boolean(expectedWhatsappOptIn);

  if (persistedEmailOptIn !== incomingEmailOptIn || persistedWhatsappOptIn !== incomingWhatsappOptIn) {
    return { valid: false, reason: 'ORIGINAL_CONSENT_MISMATCH', subscriberTombstoned: false };
  }

  // 2. Determinar a existência esperada do assinante a partir do consentimento original persistido
  const persistedHasOptIn = persistedEmailOptIn || persistedWhatsappOptIn;
  let subscriberTombstoned = false;

  if (!persistedHasOptIn) {
    // Sem opt-in original: nunca aceitar silenciosamente um documento de assinante isolado com o ID determinístico
    if (subData) {
      return { valid: false, reason: 'UNEXPECTED_SUBSCRIBER_WITHOUT_OPT_IN', subscriberTombstoned: false };
    }
    return { valid: true, subscriberTombstoned: false };
  }

  // 3. Com opt-in original confirmado: assinante vinculado deve existir, pertencer à inscrição e conter consentimento válido
  if (!subData) {
    return { valid: false, reason: 'TRIAD_MISSING_SUBSCRIBER_CONFLICT', subscriberTombstoned: false };
  }
  if (
    String(subData.id || '') !== subId ||
    cleanEmail(subData.email) !== cleanEmail(expectedEmail) ||
    subData.consent !== true
  ) {
    return { valid: false, reason: 'SUBSCRIBER_IDENTITY_OR_CONSENT_INVALID', subscriberTombstoned: false };
  }

  // 4. Estado atual do assinante:
  // - Tombstone ('unsubscribed'): preserva canais revogados sem exigir igualdade com consentimento original
  // - Ativo: exige canais compatíveis com o opt-in original persistido
  if (subData.status === 'unsubscribed') {
    if (subData.receiveEmail !== false || subData.receiveWhatsapp !== false) {
      return { valid: false, reason: 'INVALID_TOMBSTONE_CHANNELS', subscriberTombstoned: false };
    }
    subscriberTombstoned = true;
  } else {
    if (
      (subData.status && subData.status !== 'active') ||
      subData.receiveEmail !== persistedEmailOptIn ||
      subData.receiveWhatsapp !== persistedWhatsappOptIn
    ) {
      return { valid: false, reason: 'ACTIVE_SUBSCRIBER_CHANNEL_MISMATCH', subscriberTombstoned: false };
    }
  }

  return { valid: true, subscriberTombstoned };
};

/**
 * Caminho administrativo privilegiado sobre `[DEFAULT]` `db` via `runTransaction`.
 * Exige sessão administrativa real verificada pelas Rules (`isAuthorizedServerAdminSession`),
 * inspeciona os 3 documentos da tríade antes de qualquer escrita e valida integralmente
 * inscrição, permissão e assinante vinculado (inclusive tombstone sem reativação).
 */
export const saveAdminRegistrationWithTriadCheckInDb = async (
  reg: Registration
): Promise<PublicRegistrationSaveResult> => {
  const isAdminSession = customAdminTriadAdapterForTests
    ? customAdminTriadAdapterForTests.isAdminAuthorized()
    : await isAuthorizedServerAdminSession();
  if (!isAdminSession) {
    throw new Error('ADMIN_AUTH_REQUIRED');
  }

  const nowIso = new Date().toISOString();
  const candidateId = sanitizeRegistrationId(buildRegistrationId(reg.id), 'reg');
  const candidateCode = sanitizeCode(reg.code);
  const currentReg: Registration = { ...reg, id: candidateId, code: candidateCode };

  const regPayload = buildRegistrationDoc(currentReg, nowIso);
  const permPayload = buildPermissionDoc(currentReg, nowIso);
  const subPayload = buildSubscriberPayloadFromRegistration(currentReg, candidateId, nowIso);
  const subDocId = validateSubscriberId(buildSubscriberIdFromRegistrationId(candidateId));

  const executeTriadCheck = async (txOps: {
    get: (
      collectionName: 'registrations' | 'certificate_permissions' | 'newsletter_subscribers',
      docId: string
    ) => Promise<Record<string, unknown> | null>;
    set: (
      collectionName: 'registrations' | 'certificate_permissions' | 'newsletter_subscribers',
      docId: string,
      data: Record<string, unknown>
    ) => void;
  }): Promise<PublicRegistrationSaveResult> => {
    const [regData, permData, subData] = await Promise.all([
      txOps.get('registrations', candidateId),
      txOps.get('certificate_permissions', candidateCode),
      txOps.get('newsletter_subscribers', subDocId)
    ]);

    if (permData) {
      const check = validateExistingRegistrationTriadDocs({
        candidateId,
        candidateCode,
        subId: subDocId,
        expectedCpf: currentReg.cpf,
        expectedEmail: currentReg.email,
        expectedEmailOptIn: Boolean(currentReg.acceptEmailNews),
        expectedWhatsappOptIn: Boolean(currentReg.acceptWhatsappNews),
        regData,
        permData,
        subData
      });
      if (!check.valid) {
        throw new Error(check.reason || 'TRIAD_INTEGRITY_CONFLICT');
      }
      // Tríade íntegra e verificada no servidor (inclusive se sub estiver em tombstone: nunca reativa)
      return {
        success: true,
        alreadyExisted: true,
        subscriberTombstoned: check.subscriberTombstoned,
        id: candidateId,
        code: candidateCode,
        attemptsUsed: 1
      };
    }

    if (regData) {
      throw new Error('COLISAO_REGISTRATION_ID');
    }
    if (subData) {
      throw new Error('SOBREESCRITA_PROIBIDA');
    }

    txOps.set('registrations', candidateId, regPayload);
    txOps.set('certificate_permissions', candidateCode, permPayload);
    if (subPayload) {
      txOps.set('newsletter_subscribers', subDocId, subPayload);
    }

    return {
      success: true,
      alreadyExisted: false,
      subscriberTombstoned: false,
      id: candidateId,
      code: candidateCode,
      attemptsUsed: 1
    };
  };

  try {
    if (customAdminTriadAdapterForTests) {
      return await customAdminTriadAdapterForTests.runTriadTransaction(executeTriadCheck);
    }

    const regRef = doc(db, 'registrations', candidateId);
    const permRef = doc(db, 'certificate_permissions', candidateCode);
    const subRef = doc(db, 'newsletter_subscribers', subDocId);
    const refMap = {
      registrations: regRef,
      certificate_permissions: permRef,
      newsletter_subscribers: subRef
    };

    return await runTransaction(db, async (transaction) =>
      executeTriadCheck({
        get: async (col) => {
          const snap = await transaction.get(refMap[col]);
          return snap.exists() ? (snap.data() as Record<string, unknown>) : null;
        },
        set: (col, _docId, data) => {
          transaction.set(refMap[col], data);
        }
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `registrations/${candidateId}`);
  }
};

export interface AdminBatchImportItemResult {
  id: string;
  code: string;
  fullName: string;
  email: string;
  outcome: 'created' | 'already_existed' | 'failed';
  registration?: Registration;
  error?: string;
}

export interface AdminBatchImportResult {
  totalAttempted: number;
  confirmedCreated: Registration[];
  confirmedExisting: Registration[];
  failed: Array<{
    id: string;
    code: string;
    fullName: string;
    email: string;
    error: string;
  }>;
  itemResults: AdminBatchImportItemResult[];
}

export const persistAdminImportedRegistrationsWithTriadCheckInDb = async (
  regs: Registration[]
): Promise<AdminBatchImportResult> => {
  if (regs.length === 0) {
    return {
      totalAttempted: 0,
      confirmedCreated: [],
      confirmedExisting: [],
      failed: [],
      itemResults: []
    };
  }

  const isAdminSession = customAdminTriadAdapterForTests
    ? customAdminTriadAdapterForTests.isAdminAuthorized()
    : await isAuthorizedServerAdminSession();
  if (!isAdminSession) {
    throw new Error('ADMIN_AUTH_REQUIRED');
  }

  const confirmedCreated: Registration[] = [];
  const confirmedExisting: Registration[] = [];
  const failed: AdminBatchImportResult['failed'] = [];
  const itemResults: AdminBatchImportItemResult[] = [];

  for (const reg of regs) {
    const candidateId = sanitizeRegistrationId(buildRegistrationId(reg.id), 'reg');
    const candidateCode = sanitizeCode(reg.code || '');
    const fullName = (reg.fullName || 'Participante').trim();
    const email = (reg.email || '').trim().toLowerCase();

    try {
      const res = await saveAdminRegistrationWithTriadCheckInDb({
        ...reg,
        id: candidateId,
        code: candidateCode
      });
      const confirmedReg: Registration = {
        ...reg,
        id: res.id,
        code: res.code
      };
      if (res.alreadyExisted) {
        confirmedExisting.push(confirmedReg);
        itemResults.push({
          id: res.id,
          code: res.code,
          fullName,
          email,
          outcome: 'already_existed',
          registration: confirmedReg
        });
      } else {
        confirmedCreated.push(confirmedReg);
        itemResults.push({
          id: res.id,
          code: res.code,
          fullName,
          email,
          outcome: 'created',
          registration: confirmedReg
        });
      }
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : String(err);
      failed.push({
        id: candidateId,
        code: candidateCode,
        fullName,
        email,
        error: reason
      });
      itemResults.push({
        id: candidateId,
        code: candidateCode,
        fullName,
        email,
        outcome: 'failed',
        error: reason
      });
    }
  }

  return {
    totalAttempted: regs.length,
    confirmedCreated,
    confirmedExisting,
    failed,
    itemResults
  };
};

export interface OfflineQueueSyncedEntry {
  registration: Registration;
  alreadyExistedOnServer: boolean;
  subscriberTombstoned: boolean;
}

export interface OfflineQueuePendingItem {
  registration: Registration;
  reason: string;
}

export interface OfflineQueueSyncOutcome {
  synced: Registration[];
  syncedEntries: OfflineQueueSyncedEntry[];
  remainingQueue: Registration[];
  pendingFailures: OfflineQueuePendingItem[];
  requiresAdminTriadVerificationCount: number;
  mergedRegistrations: Registration[];
  allSucceeded: boolean;
}

interface ServerTriadVerificationResult {
  confirmed: boolean;
  requiresAdminVerification: boolean;
  subscriberTombstoned: boolean;
  serverRegistration?: Registration;
  reason?: string;
}

/**
 * Verificador remoto fechado da tríade no servidor (nunca aceita callback arbitrário nem estado local).
 * Sem sessão administrativa autorizada (`isAuthorizedServerAdminSession`), não é possível ler
 * `registrations` nem `newsletter_subscribers` sob as `firestore.rules` vigentes.
 */
const verifyIntactRegistrationTriadOnServer = async (
  item: Registration
): Promise<ServerTriadVerificationResult> => {
  const candidateId = sanitizeRegistrationId(buildRegistrationId(item.id), 'reg');
  const candidateCode = sanitizeCode(item.code || '');
  if (!candidateCode) {
    return {
      confirmed: false,
      requiresAdminVerification: false,
      subscriberTombstoned: false,
      reason: 'INVALID_REGISTRATION_CODE'
    };
  }

  try {
    const isAdminSession = customAdminTriadAdapterForTests
      ? customAdminTriadAdapterForTests.isAdminAuthorized()
      : await isAuthorizedServerAdminSession();

    if (!isAdminSession) {
      return {
        confirmed: false,
        requiresAdminVerification: true,
        subscriberTombstoned: false,
        reason: 'ADMIN_SESSION_REQUIRED_FOR_TRIAD_VERIFICATION'
      };
    }

    const subId = validateSubscriberId(buildSubscriberIdFromRegistrationId(candidateId));

    let regData: Record<string, unknown> | null = null;
    let permData: Record<string, unknown> | null = null;
    let subData: Record<string, unknown> | null = null;

    // Lê sempre os 3 documentos da tríade no servidor (inclusive quando a entrada recebida vier sem opt-in),
    // impedindo contorno por entrada sem consentimento ou aceitação silenciosa de assinante isolado.
    if (customAdminTriadAdapterForTests) {
      [regData, permData, subData] = await Promise.all([
        customAdminTriadAdapterForTests.getServerDoc('registrations', candidateId),
        customAdminTriadAdapterForTests.getServerDoc('certificate_permissions', candidateCode),
        customAdminTriadAdapterForTests.getServerDoc('newsletter_subscribers', subId)
      ]);
    } else {
      const [regSnap, permSnap, subSnap] = await Promise.all([
        getDocFromServer(doc(db, 'registrations', candidateId)),
        getDocFromServer(doc(db, 'certificate_permissions', candidateCode)),
        getDocFromServer(doc(db, 'newsletter_subscribers', subId))
      ]);
      regData = regSnap.exists() ? (regSnap.data() as Record<string, unknown>) : null;
      permData = permSnap.exists() ? (permSnap.data() as Record<string, unknown>) : null;
      subData = subSnap.exists() ? (subSnap.data() as Record<string, unknown>) : null;
    }

    const check = validateExistingRegistrationTriadDocs({
      candidateId,
      candidateCode,
      subId,
      expectedCpf: item.cpf,
      expectedEmail: item.email,
      expectedEmailOptIn: Boolean(item.acceptEmailNews),
      expectedWhatsappOptIn: Boolean(item.acceptWhatsappNews),
      regData,
      permData,
      subData
    });

    if (!check.valid || !regData) {
      return {
        confirmed: false,
        requiresAdminVerification: false,
        subscriberTombstoned: false,
        reason: check.reason || 'INCOMPLETE_TRIAD_OR_ISOLATED_DOC'
      };
    }

    const serverStatus =
      regData.status === 'presente' || regData.status === 'cancelada'
        ? regData.status
        : 'confirmada';

    return {
      confirmed: true,
      requiresAdminVerification: false,
      subscriberTombstoned: check.subscriberTombstoned,
      serverRegistration: {
        ...item,
        id: candidateId,
        code: candidateCode,
        status: serverStatus,
        certificateIssued: serverStatus === 'presente' ? Boolean(regData.certificateIssued) : false,
        checkedInAt:
          serverStatus === 'presente' && typeof regData.checkedInAt === 'string'
            ? regData.checkedInAt
            : item.checkedInAt
      }
    };
  } catch (err: unknown) {
    return {
      confirmed: false,
      requiresAdminVerification: false,
      subscriberTombstoned: false,
      reason: err instanceof Error ? err.message : String(err)
    };
  }
};

let activeOfflineSyncPromise: Promise<OfflineQueueSyncOutcome> | null = null;

export const synchronizeOfflineRegistrationQueue = async (
  queuedItems: Registration[],
  existingRegistrations: Registration[]
): Promise<OfflineQueueSyncOutcome> => {
  if (activeOfflineSyncPromise) {
    return activeOfflineSyncPromise;
  }

  const syncPromise = (async (): Promise<OfflineQueueSyncOutcome> => {
    // Garante que activeOfflineSyncPromise esteja atribuída antes da conclusão mesmo sem awaits no loop
    await Promise.resolve();
    try {
      // Deduplica fila por id sem jamais usar existingRegistrations para descartar itens pendentes
      const uniqueQueueMap = new Map<string, Registration>();
      queuedItems.forEach((item) => {
        if (item?.id && !uniqueQueueMap.has(item.id)) {
          uniqueQueueMap.set(item.id, item);
        }
      });

      const remainingQueue: Registration[] = [];
      const synced: Registration[] = [];
      const syncedEntries: OfflineQueueSyncedEntry[] = [];
      const pendingFailures: OfflineQueuePendingItem[] = [];
      let requiresAdminTriadVerificationCount = 0;

      for (const item of uniqueQueueMap.values()) {
        try {
          const res = await savePublicRegistrationToDb(item);
          const syncedReg: Registration = {
            ...item,
            id: res.id,
            code: res.code,
            status: 'confirmada',
            certificateIssued: false
          };
          synced.push(syncedReg);
          syncedEntries.push({
            registration: syncedReg,
            alreadyExistedOnServer: false,
            subscriberTombstoned: false
          });
        } catch (err) {
          const serverCheck = await verifyIntactRegistrationTriadOnServer(item);
          if (serverCheck.confirmed && serverCheck.serverRegistration) {
            synced.push(serverCheck.serverRegistration);
            syncedEntries.push({
              registration: serverCheck.serverRegistration,
              alreadyExistedOnServer: true,
              subscriberTombstoned: serverCheck.subscriberTombstoned
            });
          } else {
            console.warn(
              `[Sync Offline] Falha ao sincronizar inscrição ${item.code} (${serverCheck.reason || 'UNCONFIRMED'}):`,
              err
            );
            if (serverCheck.requiresAdminVerification) {
              requiresAdminTriadVerificationCount += 1;
            }
            remainingQueue.push(item);
            pendingFailures.push({
              registration: item,
              reason: serverCheck.reason || (err instanceof Error ? err.message : String(err))
            });
          }
        }
      }

      const seenIds = new Set<string>();
      const seenCodes = new Set<string>();
      const mergedRegistrations: Registration[] = [];

      for (const reg of [...synced, ...existingRegistrations]) {
        const cleanId = reg.id;
        const cleanCode = (reg.code || '').toUpperCase();
        if (!seenIds.has(cleanId) && !seenCodes.has(cleanCode)) {
          seenIds.add(cleanId);
          seenCodes.add(cleanCode);
          mergedRegistrations.push(reg);
        }
      }

      return {
        synced,
        syncedEntries,
        remainingQueue,
        pendingFailures,
        requiresAdminTriadVerificationCount,
        mergedRegistrations,
        allSucceeded: remainingQueue.length === 0
      };
    } finally {
      if (activeOfflineSyncPromise === syncPromise) {
        activeOfflineSyncPromise = null;
      }
    }
  })();

  activeOfflineSyncPromise = syncPromise;
  return syncPromise;
};

export const persistRegistrationAndPermissionInDb = async (reg: Registration): Promise<void> => {
  const user = firestoreAuth.currentUser;
  if (!isVerifiedAdminUser(user)) {
    throw new Error('ADMIN_AUTH_REQUIRED');
  }

  const nowIso = new Date().toISOString();
  const regPayload = buildRegistrationDoc(reg, nowIso);
  const permPayload = buildPermissionDoc(reg, nowIso);
  const regId = String(regPayload.id);
  const permCode = String(permPayload.code);

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'registrations', regId), regPayload);
    batch.set(doc(db, 'certificate_permissions', permCode), permPayload);
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `registrations/${regId}`);
  }
};

export const persistMultipleRegistrationsInDb = async (regs: Registration[]): Promise<void> => {
  const user = firestoreAuth.currentUser;
  if (!isVerifiedAdminUser(user)) {
    throw new Error('ADMIN_AUTH_REQUIRED');
  }
  if (regs.length === 0) return;

  const nowIso = new Date().toISOString();
  const chunkSize = 150; // 2 writes per registration => 300 ops per batch (<= 450 limit, well below 500)

  try {
    for (let i = 0; i < regs.length; i += chunkSize) {
      const slice = regs.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      slice.forEach((reg) => {
        const regPayload = buildRegistrationDoc(reg, nowIso);
        const permPayload = buildPermissionDoc(reg, nowIso);
        batch.set(doc(db, 'registrations', String(regPayload.id)), regPayload);
        batch.set(doc(db, 'certificate_permissions', String(permPayload.code)), permPayload);
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'registrations');
  }
};

export const deleteRegistrationInDb = async (reg: Registration): Promise<void> => {
  const isAdminSession = await isAuthorizedServerAdminSession();
  if (!isAdminSession) {
    throw new Error('ADMIN_AUTH_REQUIRED');
  }
  const regId = sanitizeRegistrationId(reg.id, 'reg');
  const permCode = sanitizeCode(reg.code);
  const subId = buildSubscriberIdFromRegistrationId(regId);

  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'registrations', regId));
    batch.delete(doc(db, 'certificate_permissions', permCode));
    batch.delete(doc(db, 'newsletter_subscribers', subId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `registrations/${regId}`);
  }
};

export const recordCertificateDownloadInDb = async (
  attendee: Registration,
  record: CertificateDownloadRecord
): Promise<void> => {
  if (attendee.status !== 'presente' || !attendee.certificateIssued) {
    return;
  }

  const nowIso = new Date().toISOString();
  const downloadId = sanitizeId(record.id, 'cert-dl');
  const regId = sanitizeId(attendee.id, 'reg');
  const code = sanitizeCode(attendee.code);

  const downloadPayload = stripUndefined({
    id: downloadId,
    registrationId: regId,
    code,
    fullName: (record.fullName || attendee.fullName).slice(0, 160),
    cpf: (record.cpf || attendee.cpf || '').slice(0, 20),
    city: (record.city || attendee.city || '').slice(0, 100),
    professionalRole: (record.professionalRole || attendee.professionalRole || '').slice(0, 120),
    institution: (record.institution || attendee.institution || '').slice(0, 180),
    downloadedAt: (record.downloadedAt || nowIso).slice(0, 40),
    method: record.method
  });

  try {
    await setDoc(doc(db, 'certificate_downloads', downloadId), downloadPayload);

    const updatedReg: Registration = {
      ...attendee,
      certificateDownloaded: true,
      certificateDownloadedAt: nowIso,
      certificateDownloadCount: (attendee.certificateDownloadCount || 0) + 1
    };

    if (isVerifiedAdminUser(firestoreAuth.currentUser)) {
      await persistRegistrationAndPermissionInDb(updatedReg);
    } else {
      const permRef = doc(db, 'certificate_permissions', code);
      const permSnap = await getDoc(permRef);
      if (permSnap.exists() && permSnap.data()?.status === 'presente' && permSnap.data()?.certificateIssued === true) {
        await setDoc(
          permRef,
          {
            certificateDownloaded: true,
            certificateDownloadCount: (permSnap.data()?.certificateDownloadCount || 0) + 1,
            updatedAt: nowIso
          },
          { merge: true }
        );
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `certificate_downloads/${downloadId}`);
  }
};

export const fetchCertificatePermissionByCode = async (
  rawCode: string
): Promise<CertificatePermissionRecord | null> => {
  const code = sanitizeCode(rawCode);
  if (!code) return null;

  try {
    const snap = await getDoc(doc(db, 'certificate_permissions', code));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      code: String(data.code || code),
      registrationId: String(data.registrationId || ''),
      status:
        data.status === 'presente' || data.status === 'cancelada' ? data.status : 'confirmada',
      certificateIssued:
        data.status === 'presente' ? Boolean(data.certificateIssued) : false,
      certificateDownloaded: Boolean(data.certificateDownloaded),
      certificateDownloadCount: Number(data.certificateDownloadCount || 0),
      checkedInAt: data.checkedInAt ? String(data.checkedInAt) : undefined,
      participantName: data.participantName ? String(data.participantName) : undefined,
      city: data.city ? String(data.city) : undefined,
      professionalRole: data.professionalRole ? String(data.professionalRole) : undefined,
      institution: data.institution ? String(data.institution) : undefined,
      updatedAt: data.updatedAt ? String(data.updatedAt) : undefined
    };
  } catch (error) {
    console.warn('Erro ao consultar permissão de certificado no Firestore:', error);
    return null;
  }
};

export const saveEventConfigInDb = async (config: EventConfig): Promise<void> => {
  const user = firestoreAuth.currentUser;
  if (!isVerifiedAdminUser(user)) {
    throw new Error('ADMIN_AUTH_REQUIRED');
  }

  const nowIso = new Date().toISOString();
  const payload = stripUndefined({
    editionTitle: (config.editionTitle || '1º Simpósio de Saúde Mental').slice(0, 160),
    regionTitle: (config.regionTitle || 'da Microrregião de Carangola').slice(0, 160),
    subtitle: (config.subtitle || '').slice(0, 500),
    eventDate: (config.eventDate || '').slice(0, 60),
    eventFullDate: (config.eventFullDate || '').slice(0, 80),
    eventHours: (config.eventHours || '').slice(0, 60),
    locationName: (config.locationName || '').slice(0, 120),
    locationAddress: (config.locationAddress || '').slice(0, 240),
    contactEmail: (config.contactEmail || '').slice(0, 160),
    contactPhone: (config.contactPhone || '').slice(0, 40),
    maxSpots: Number(config.maxSpots) || 200,
    certificateWorkload: Number(config.certificateWorkload) || 8,
    bannerImage: (config.bannerImage || '').slice(0, 300),
    isRegistrationOpen: Boolean(config.isRegistrationOpen),
    organizer: (config.organizer || '').slice(0, 240),
    googleFormsUrl: (config.googleFormsUrl || '').slice(0, 400),
    googleSheetsSyncUrl: (config.googleSheetsSyncUrl || '').slice(0, 400),
    enableGoogleFormsOption: Boolean(config.enableGoogleFormsOption),
    certificateDesign: config.certificateDesign ? stripUndefined(config.certificateDesign as unknown as Record<string, unknown>) : undefined,
    badgeDesign: config.badgeDesign ? stripUndefined(config.badgeDesign as unknown as Record<string, unknown>) : undefined,
    emailJsConfig: config.emailJsConfig ? stripUndefined(config.emailJsConfig as unknown as Record<string, unknown>) : undefined,
    updatedAt: nowIso
  });

  try {
    await setDoc(doc(db, 'event_config', 'main'), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'event_config/main');
  }
};

const CHUNK_CHAR_SIZE = 450000;

const parseDataUrl = (dataUrl: string): { mimeType: string; base64: string } | null => {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) return null;
  return {
    mimeType: match[1] || 'application/pdf',
    base64: match[2]
  };
};

const VALID_MATERIAL_CATEGORIES: DownloadMaterial['category'][] = [
  'Apostila',
  'Legislação',
  'Apresentação',
  'Fluxograma',
  'Cartilha'
];

const VALID_MATERIAL_FORMATS: DownloadMaterial['format'][] = ['PDF', 'DOCX', 'ZIP'];

const buildMaterialDoc = (
  mat: DownloadMaterial,
  overrides: { fileUrl?: string; chunkCount?: number; mimeType?: string },
  nowIso: string
): Record<string, unknown> => {
  const id = sanitizeId(mat.id, 'mat');
  const category = VALID_MATERIAL_CATEGORIES.includes(mat.category) ? mat.category : 'Fluxograma';
  const format = VALID_MATERIAL_FORMATS.includes(mat.format) ? mat.format : 'PDF';
  const pagesNum = Math.max(1, Math.min(2000, Math.round(Number(mat.pages) || 1)));
  const downloadsNum = Math.max(0, Math.round(Number(mat.downloadsCount) || 0));

  const payload: Record<string, unknown> = {
    id,
    title: (mat.title || 'Documento Técnico').trim().slice(0, 240),
    category,
    author: (mat.author || 'Secretaria Municipal de Saúde de Carangola').trim().slice(0, 200),
    format,
    size: (mat.size || '1.0 MB').trim().slice(0, 40),
    description: (mat.description || 'Material técnico do Simpósio de Saúde Mental.').trim().slice(0, 2000),
    pages: pagesNum,
    downloadsCount: downloadsNum,
    fileUrl: (overrides.fileUrl ?? mat.fileUrl ?? '#').slice(0, 600000),
    createdAt: (mat.createdAt || nowIso).slice(0, 40),
    updatedAt: nowIso.slice(0, 40)
  };

  if (typeof overrides.chunkCount === 'number' && overrides.chunkCount >= 0) {
    payload.chunkCount = overrides.chunkCount;
  } else if (typeof mat.chunkCount === 'number' && mat.chunkCount >= 0) {
    payload.chunkCount = mat.chunkCount;
  }

  if (mat.fileName) {
    payload.fileName = String(mat.fileName).trim().slice(0, 240);
  }
  if (overrides.mimeType || mat.mimeType) {
    payload.mimeType = String(overrides.mimeType || mat.mimeType).trim().slice(0, 120);
  }

  return payload;
};

export const saveDownloadMaterialToDb = async (
  material: DownloadMaterial,
  onProgress?: (pct: number) => void
): Promise<DownloadMaterial> => {
  const user = firestoreAuth.currentUser;
  if (!isVerifiedAdminUser(user)) {
    throw new Error('ADMIN_AUTH_REQUIRED');
  }

  const nowIso = new Date().toISOString();
  const id = sanitizeId(material.id, 'mat');

  if (material.fileUrl && material.fileUrl.startsWith('data:')) {
    const parsed = parseDataUrl(material.fileUrl);
    if (!parsed || !parsed.base64) {
      throw new Error('Formato Base64 do arquivo PDF inválido.');
    }

    const totalChunks = Math.ceil(parsed.base64.length / CHUNK_CHAR_SIZE);
    if (totalChunks > 200) {
      throw new Error('O arquivo PDF excede o limite suportado para sincronização em nuvem.');
    }

    const chunkedUrl = `firestore-chunked://${id}`;
    const docPayload = buildMaterialDoc(
      { ...material, id },
      { fileUrl: chunkedUrl, chunkCount: totalChunks, mimeType: parsed.mimeType },
      nowIso
    );

    try {
      onProgress?.(10);
      await setDoc(doc(db, 'download_materials', id), docPayload);

      const BATCH_SIZE = 5;
      for (let start = 0; start < totalChunks; start += BATCH_SIZE) {
        const batch = writeBatch(db);
        const end = Math.min(totalChunks, start + BATCH_SIZE);
        for (let idx = start; idx < end; idx++) {
          const chunkSlice = parsed.base64.slice(idx * CHUNK_CHAR_SIZE, (idx + 1) * CHUNK_CHAR_SIZE);
          const chunkId = `chunk-${String(idx).padStart(4, '0')}`;
          batch.set(doc(db, 'download_materials', id, 'chunks', chunkId), {
            index: idx,
            data: chunkSlice
          });
        }
        await batch.commit();
        const pct = Math.min(100, Math.round(10 + ((end / totalChunks) * 90)));
        onProgress?.(pct);
      }

      return {
        ...material,
        id,
        fileUrl: chunkedUrl,
        chunkCount: totalChunks,
        mimeType: parsed.mimeType,
        createdAt: String(docPayload.createdAt),
        updatedAt: nowIso,
        pendingCloudSync: false
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `download_materials/${id}`);
    }
  }

  const docPayload = buildMaterialDoc({ ...material, id }, { chunkCount: material.chunkCount || 0 }, nowIso);
  try {
    onProgress?.(50);
    await setDoc(doc(db, 'download_materials', id), docPayload);
    onProgress?.(100);
    return {
      ...material,
      id,
      fileUrl: String(docPayload.fileUrl),
      chunkCount: Number(docPayload.chunkCount || 0),
      createdAt: String(docPayload.createdAt),
      updatedAt: nowIso,
      pendingCloudSync: false
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `download_materials/${id}`);
  }
};

export const fetchChunkedMaterialBlobUrl = async (
  materialId: string,
  mimeType = 'application/pdf'
): Promise<string> => {
  const id = sanitizeId(materialId, 'mat');
  try {
    const q = query(
      collection(db, 'download_materials', id, 'chunks'),
      orderBy('index', 'asc')
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      throw new Error('Os fragmentos do arquivo PDF não foram encontrados na nuvem.');
    }

    const base64Parts: string[] = [];
    snapshot.docs.forEach((d) => {
      const data = d.data() as { index?: number; data?: string };
      if (data.data) base64Parts.push(data.data);
    });

    const fullBase64 = base64Parts.join('');
    const binaryStr = atob(fullBase64);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: mimeType || 'application/pdf' });
    return URL.createObjectURL(blob);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `download_materials/${id}/chunks`);
  }
};

export const deleteDownloadMaterialInDb = async (materialId: string): Promise<void> => {
  const id = sanitizeId(materialId, 'mat');
  try {
    const chunksSnap = await getDocs(collection(db, 'download_materials', id, 'chunks')).catch(() => null);
    if (chunksSnap && !chunksSnap.empty) {
      const docs = chunksSnap.docs;
      for (let i = 0; i < docs.length; i += 200) {
        const batch = writeBatch(db);
        docs.slice(i, i + 200).forEach((d) => batch.delete(d.ref));
        await batch.commit().catch(() => {});
      }
    }
    await deleteDoc(doc(db, 'download_materials', id));
  } catch (error) {
    console.warn(`Aviso ao excluir material ${id} no Firestore:`, error);
  }
};

export const incrementMaterialDownloadInDb = async (material: DownloadMaterial): Promise<void> => {
  const id = sanitizeId(material.id, 'mat');
  try {
    const ref = doc(db, 'download_materials', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const currentCount = Number(snap.data()?.downloadsCount || 0);
    await updateDoc(ref, { downloadsCount: currentCount + 1 });
  } catch (error) {
    console.warn(`Aviso ao incrementar contador de download de ${id}:`, error);
  }
};

export const subscribeDownloadMaterials = (
  onUpdate: (materials: DownloadMaterial[]) => void
) => {
  const q = collection(db, 'download_materials');
  return onSnapshot(
    q,
    (snapshot) => {
      const list: DownloadMaterial[] = snapshot.docs.map((d) => {
        const data = d.data() as DownloadMaterial;
        return {
          ...data,
          id: data.id || d.id,
          pendingCloudSync: false
        };
      });
      list.sort((a, b) => {
        const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
        const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
        if (aTime !== bTime) return bTime - aTime;
        return a.id.localeCompare(b.id);
      });
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'download_materials');
    }
  );
};

export const seedInitialDataIfNeeded = async (
  localRegistrations: Registration[],
  localConfig: EventConfig,
  localMaterials: DownloadMaterial[] = []
): Promise<{ seededRegistrations: boolean; seededConfig: boolean; seededMaterials: boolean }> => {
  const user = firestoreAuth.currentUser;
  if (!isVerifiedAdminUser(user)) {
    return { seededRegistrations: false, seededConfig: false, seededMaterials: false };
  }

  let seededRegistrations = false;
  let seededConfig = false;
  let seededMaterials = false;

  try {
    const regCheckSnap = await getDocs(query(collection(db, 'registrations'), limit(1)));
    if (regCheckSnap.empty && localRegistrations.length > 0) {
      const seedResult = await persistAdminImportedRegistrationsWithTriadCheckInDb(localRegistrations);
      seededRegistrations =
        seedResult.confirmedCreated.length > 0 || seedResult.confirmedExisting.length > 0;
      if (seedResult.failed.length > 0) {
        throw new Error(
          `SEED_REGISTRATIONS_PARTIAL_FAILURE: ${seedResult.failed
            .map((f) => `${f.code} (${f.error})`)
            .join('; ')}`
        );
      }
    }

    const configSnap = await getDoc(doc(db, 'event_config', 'main'));
    if (!configSnap.exists()) {
      await saveEventConfigInDb(localConfig);
      seededConfig = true;
    }

    const matCheckSnap = await getDocs(collection(db, 'download_materials'));
    const remoteMatIds = new Set(matCheckSnap.docs.map((d) => d.id));

    // Hard eradication of mat-5 or private documents if ever saved in remote Firestore
    if (remoteMatIds.has('mat-5')) {
      await deleteDownloadMaterialInDb('mat-5').catch(() => {});
    }

    const safeLocalMaterials = localMaterials.filter(
      (m) =>
        m &&
        m.id !== 'mat-5' &&
        m.id !== 'mat-0' &&
        !m.title?.toLowerCase().includes('termo de responsabilidade') &&
        !m.title?.toLowerCase().includes('cessão de uso') &&
        !m.fileName?.toLowerCase().includes('termo-de-responsabilidade')
    );

    if (matCheckSnap.empty && safeLocalMaterials.length > 0) {
      for (const mat of safeLocalMaterials) {
        await saveDownloadMaterialToDb(mat);
      }
      seededMaterials = true;
    } else if (safeLocalMaterials.length > 0) {
      // Sync any pending local uploads created while disconnected or before this upgrade
      const pendingMats = safeLocalMaterials.filter(
        (m) => !remoteMatIds.has(sanitizeId(m.id, 'mat')) && (m.pendingCloudSync || m.fileUrl?.startsWith('data:'))
      );
      for (const mat of pendingMats) {
        await saveDownloadMaterialToDb(mat);
        seededMaterials = true;
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'registrations');
  }

  return { seededRegistrations, seededConfig, seededMaterials };
};

export const subscribeEventConfig = (
  onUpdate: (configPartial: Partial<EventConfig>) => void
) => {
  return onSnapshot(
    doc(db, 'event_config', 'main'),
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as Partial<EventConfig>);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'event_config/main');
    }
  );
};

const mapFirestoreRegistrationDoc = (
  docId: string,
  rawData: Record<string, unknown>
): Registration => {
  const data = rawData as unknown as Registration;
  const status =
    data.status === 'presente' || data.status === 'cancelada' ? data.status : 'confirmada';
  return {
    ...data,
    id: data.id || docId,
    status,
    certificateIssued: status === 'presente' ? Boolean(data.certificateIssued) : false
  };
};

export const fetchAdminRegistrationsFromDb = async (): Promise<Registration[]> => {
  const user = firestoreAuth.currentUser;
  if (!user || !isVerifiedAdminUser(user)) {
    throw new Error('ADMIN_AUTH_REQUIRED');
  }
  try {
    const snap = await getDocs(query(collection(db, 'registrations'), orderBy('registeredAt', 'desc')));
    return snap.docs.map((d) =>
      mapFirestoreRegistrationDoc(d.id, d.data() as Record<string, unknown>)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'registrations');
  }
};

export const subscribeAdminRegistrations = (
  onUpdate: (regs: Registration[]) => void,
  onError?: (error: unknown) => void
) => {
  if (!firestoreAuth.currentUser) {
    return () => {};
  }
  const q = query(collection(db, 'registrations'), orderBy('registeredAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Registration[] = snapshot.docs.map((d) =>
        mapFirestoreRegistrationDoc(d.id, d.data() as Record<string, unknown>)
      );
      onUpdate(list);
    },
    (error) => {
      console.warn('Aviso ao sincronizar inscrições do Firestore:', error);
      onError?.(error);
    }
  );
};

export const subscribeCertificateDownloads = (
  onUpdate: (records: CertificateDownloadRecord[]) => void
) => {
  if (!firestoreAuth.currentUser) {
    return () => {};
  }
  const q = query(collection(db, 'certificate_downloads'), orderBy('downloadedAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: CertificateDownloadRecord[] = snapshot.docs.map(
        (d) => d.data() as CertificateDownloadRecord
      );
      onUpdate(list);
    },
    (error) => {
      console.warn('Aviso ao sincronizar downloads de certificados do Firestore:', error);
    }
  );
};

export const saveSpeakerToDb = async (speaker: SpeakerProfile): Promise<void> => {
  const user = firestoreAuth.currentUser;
  if (!isVerifiedAdminUser(user)) {
    throw new Error('ADMIN_AUTH_REQUIRED');
  }
  const speakerId = sanitizeId(speaker.id, 'spk');
  const baseline = SPEAKERS_PROFILES.find((p) => p.id === speaker.id);
  const instagram = speaker.socials?.instagram && speaker.socials.instagram.trim() !== ''
    ? speaker.socials.instagram.trim().slice(0, 100)
    : (baseline?.socials?.instagram || '');
  const instagramUrl = speaker.socials?.instagramUrl && speaker.socials.instagramUrl.trim() !== '' && speaker.socials.instagramUrl !== 'https://www.instagram.com/'
    ? speaker.socials.instagramUrl.trim().slice(0, 300)
    : (baseline?.socials?.instagramUrl || (instagram ? `https://www.instagram.com/${instagram.replace(/^@/, '')}` : ''));
  const linkedin = speaker.socials?.linkedin && speaker.socials.linkedin.trim() !== ''
    ? speaker.socials.linkedin.trim().slice(0, 100)
    : (baseline?.socials?.linkedin || '');
  const linkedinUrl = speaker.socials?.linkedinUrl && speaker.socials.linkedinUrl.trim() !== '' && speaker.socials.linkedinUrl !== 'https://www.linkedin.com/'
    ? speaker.socials.linkedinUrl.trim().slice(0, 300)
    : (baseline?.socials?.linkedinUrl || '');
  const lattesUrl = speaker.socials?.lattesUrl && speaker.socials.lattesUrl.trim() !== '' && speaker.socials.lattesUrl !== 'https://lattes.cnpq.br/'
    ? speaker.socials.lattesUrl.trim().slice(0, 300)
    : (baseline?.socials?.lattesUrl || '');

  const payload = stripUndefined({
    id: speakerId,
    name: (speaker.name || baseline?.name || '').trim().slice(0, 160),
    role: (speaker.role || baseline?.role || '').trim().slice(0, 160),
    institution: (speaker.institution || baseline?.institution || '').trim().slice(0, 200),
    sessionGroup: speaker.sessionGroup || baseline?.sessionGroup || 'abertura',
    sessionLabel: (speaker.sessionLabel || baseline?.sessionLabel || '').trim().slice(0, 200),
    sessionTime: (speaker.sessionTime || baseline?.sessionTime || '').trim().slice(0, 80),
    photoUrl: speaker.photoUrl ? speaker.photoUrl.trim().slice(0, 500000) : (baseline?.photoUrl || ''),
    photoPosition: (speaker.photoPosition || baseline?.photoPosition || 'center 18%').trim().slice(0, 50),
    bio: (speaker.bio !== undefined && speaker.bio !== null ? speaker.bio : (baseline?.bio || '')).trim().slice(0, 3000),
    socials: {
      instagram,
      instagramUrl,
      linkedin,
      linkedinUrl,
      lattesUrl
    },
    updatedAt: new Date().toISOString()
  });

  try {
    await setDoc(doc(db, 'speakers', speakerId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `speakers/${speakerId}`);
  }
};

export const saveAllSpeakersToDb = async (speakers: SpeakerProfile[]): Promise<void> => {
  const user = firestoreAuth.currentUser;
  if (!isVerifiedAdminUser(user)) {
    throw new Error('ADMIN_AUTH_REQUIRED');
  }
  for (const spk of speakers) {
    await saveSpeakerToDb(spk);
  }
};

export const deleteSpeakerInDb = async (speakerId: string): Promise<void> => {
  const user = firestoreAuth.currentUser;
  if (!isVerifiedAdminUser(user)) {
    throw new Error('ADMIN_AUTH_REQUIRED');
  }
  const id = sanitizeId(speakerId, 'spk');
  try {
    await deleteDoc(doc(db, 'speakers', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `speakers/${id}`);
  }
};

export const subscribeSpeakers = (onUpdate: (speakers: SpeakerProfile[]) => void) => {
  const q = collection(db, 'speakers');
  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) return;
      const list: SpeakerProfile[] = snapshot.docs.map((d) => {
        const data = d.data() as SpeakerProfile;
        return {
          id: data.id || d.id,
          name: data.name || '',
          role: data.role || '',
          institution: data.institution || '',
          sessionGroup: data.sessionGroup || 'abertura',
          sessionLabel: data.sessionLabel || '',
          sessionTime: data.sessionTime || '',
          photoUrl: data.photoUrl || '',
          photoPosition: data.photoPosition || 'center 18%',
          bio: data.bio || '',
          socials: data.socials || {}
        };
      });
      onUpdate(list);
    },
    (error) => {
      console.warn('Aviso ao sincronizar palestrantes do Firestore:', error);
    }
  );
};

// ============================================================================
// TEST ADAPTERS FOR SOCIAL WALL, NOTIFICATIONS & NEWSLETTER
// ============================================================================

export interface SocialPostsStorageAdapter {
  savePost: (post: SocialPost, imageBlob?: Blob) => Promise<SocialPost>;
  toggleLike: (postId: string, voterId: string) => Promise<{ likes: number; hasLiked: boolean }>;
  deletePost: (postId: string) => Promise<void>;
  moderatePost: (postId: string, status: 'approved' | 'rejected', pinned?: boolean) => Promise<void>;
}

export interface NotificationsStorageAdapter {
  saveNotification: (item: PushNotificationItem) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

export interface NewsletterStorageAdapter {
  subscribe: (sub: NewsletterSubscriber) => Promise<{ isNew: boolean; subscriber: NewsletterSubscriber; unsubscribeToken?: string }>;
  unsubscribe: (emailOrId: string, tokenProof?: string) => Promise<void>;
  deleteSubscriber: (id: string) => Promise<void>;
  updateSubscriberConsent?: (
    id: string,
    changes: { receiveEmail?: boolean; receiveWhatsapp?: boolean }
  ) => Promise<void>;
}

let customSocialPostsAdapter: SocialPostsStorageAdapter | null = null;
let customNotificationsAdapter: NotificationsStorageAdapter | null = null;
let customNewsletterAdapter: NewsletterStorageAdapter | null = null;

export const setSocialPostsAdapterForTests = (adapter: SocialPostsStorageAdapter | null) => {
  customSocialPostsAdapter = adapter;
};

export const setNotificationsAdapterForTests = (adapter: NotificationsStorageAdapter | null) => {
  customNotificationsAdapter = adapter;
};

export const setNewsletterAdapterForTests = (adapter: NewsletterStorageAdapter | null) => {
  customNewsletterAdapter = adapter;
};

// ============================================================================
// 1. SOCIAL WALL: FIRESTORE & FIREBASE STORAGE INTEGRATION
// ============================================================================

const dataUrlToBlob = (dataUrl: string): Blob | null => {
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const binary = atob(parts[1]);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type: mimeType });
  } catch {
    return null;
  }
};

export const saveSocialPostToDb = async (
  post: SocialPost,
  rawImageFile?: File | Blob
): Promise<SocialPost> => {
  await ensureAuthenticatedUser();

  const id = sanitizeId(post.id, 'post');
  const nowIso = new Date().toISOString();
  const isAdmin = isVerifiedAdminUser(firestoreAuth.currentUser);

  // Regra de Moderação e Integridade do Social Wall:
  // Publicações públicas nascem OBRIGATORIAMENTE com status pending, pinned false e likes 0.
  // Somente administradores autorizados podem moderar, aprovar, rejeitar ou fixar.
  const initialStatus = isAdmin ? (post.status || 'approved') : 'pending';
  const initialPinned = isAdmin ? Boolean(post.pinned) : false;
  const initialLikes = isAdmin ? Math.max(0, Math.round(Number(post.likes) || 0)) : 0;

  const sanitizedPost: SocialPost = {
    ...post,
    id,
    status: initialStatus as 'approved' | 'pending' | 'rejected',
    pinned: initialPinned,
    likes: initialLikes
  };

  if (customSocialPostsAdapter) {
    return customSocialPostsAdapter.savePost(sanitizedPost, rawImageFile);
  }

  let finalImageUrl = post.imageUrl;
  let storagePath: string | undefined = post.storagePath;

  // Resolve upload to Firebase Storage if an image file or base64 is present
  let blobToUpload: Blob | null = rawImageFile || null;
  if (!blobToUpload && post.imageUrl?.startsWith('data:image/')) {
    blobToUpload = dataUrlToBlob(post.imageUrl);
  }

  if (blobToUpload) {
    if (blobToUpload.size === 0) {
      throw new Error('O arquivo de imagem selecionado está vazio.');
    }
    if (blobToUpload.size > 5 * 1024 * 1024) {
      throw new Error('A imagem selecionada excede o limite máximo permitido de 5MB.');
    }
    const mimeType = blobToUpload.type || 'image/jpeg';
    if (!mimeType.startsWith('image/')) {
      throw new Error('O arquivo selecionado não é uma imagem válida.');
    }

    try {
      const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
      const cleanPath = `social_posts/${id}/${Date.now()}_img.${ext}`;
      const fileRef = storageRef(storage, cleanPath);
      const snapshot = await uploadBytes(fileRef, blobToUpload, {
        contentType: mimeType,
        customMetadata: { postId: id, author: post.authorName }
      });
      finalImageUrl = await getDownloadURL(snapshot.ref);
      storagePath = cleanPath;
    } catch (storageErr) {
      console.warn('Aviso: Falha ao enviar foto para Firebase Storage, mantendo post em texto puro:', storageErr);
      finalImageUrl = undefined;
    }
  }

  const payload: Record<string, unknown> = {
    id,
    authorName: (post.authorName || 'Participante').trim().slice(0, 120),
    authorRole: (post.authorRole || 'Participante do Simpósio').trim().slice(0, 120),
    city: (post.city || 'Carangola').trim().slice(0, 100),
    content: (post.content || '').trim().slice(0, 1000),
    hashtags: (post.hashtags || '').trim().slice(0, 300),
    likes: initialLikes,
    createdAt: post.createdAt || nowIso,
    timestamp: Number(post.timestamp) || Date.now(),
    status: initialStatus,
    pinned: initialPinned,
    updatedAt: nowIso
  };

  if (finalImageUrl && !finalImageUrl.startsWith('data:')) payload.imageUrl = finalImageUrl;
  if (storagePath) payload.storagePath = storagePath;
  if (post.imageFileName) payload.imageFileName = post.imageFileName.slice(0, 160);

  try {
    await setDoc(doc(db, 'social_posts', id), payload, { merge: true });
    return {
      ...post,
      id,
      status: initialStatus as 'approved' | 'pending' | 'rejected',
      pinned: initialPinned,
      likes: initialLikes,
      imageUrl: finalImageUrl || post.imageUrl,
      storagePath
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `social_posts/${id}`);
    return post;
  }
};

export const likeSocialPostInDb = async (
  postId: string,
  voterId: string
): Promise<{ success: boolean; likes: number; hasLiked: boolean }> => {
  const ensuredUid = await ensureAuthenticatedUser();

  if (customSocialPostsAdapter) {
    const res = await customSocialPostsAdapter.toggleLike(postId, voterId);
    return { success: true, ...res };
  }

  const cleanPostId = sanitizeId(postId, 'post');
  // Vincula a identidade do votante ao usuário autenticado ou ao identificador fornecido
  const currentUid = firestoreAuth.currentUser?.uid || ensuredUid;
  const cleanVoterId = sanitizeId(currentUid || voterId, 'voter');

  try {
    const likeDocRef = doc(db, 'social_posts', cleanPostId, 'likes', cleanVoterId);
    const postDocRef = doc(db, 'social_posts', cleanPostId);

    // Transação Firestore atômica garantindo consistência sob concorrência e impedindo valores negativos
    const result = await runTransaction(db, async (transaction) => {
      const [likeSnap, postSnap] = await Promise.all([
        transaction.get(likeDocRef),
        transaction.get(postDocRef)
      ]);

      const currentLikes = postSnap.exists()
        ? Math.max(0, Number(postSnap.data()?.likes) || 0)
        : 0;
      const nowIso = new Date().toISOString();

      if (likeSnap.exists()) {
        // Toggle OFF
        const nextLikes = Math.max(0, currentLikes - 1);
        transaction.delete(likeDocRef);
        transaction.update(postDocRef, { likes: nextLikes, updatedAt: nowIso });
        return { success: true, likes: nextLikes, hasLiked: false };
      } else {
        // Toggle ON
        const nextLikes = currentLikes + 1;
        transaction.set(likeDocRef, {
          votedAt: nowIso,
          postId: cleanPostId,
          voterId: cleanVoterId
        });
        transaction.update(postDocRef, { likes: nextLikes, updatedAt: nowIso });
        return { success: true, likes: nextLikes, hasLiked: true };
      }
    });

    return result;
  } catch (error) {
    console.warn('Aviso: Falha ao sincronizar curtida no Firestore (modo offline/fallback ativo):', error);
    return { success: false, likes: 0, hasLiked: false };
  }
};

export const deleteSocialPostInDb = async (postId: string): Promise<void> => {
  if (customSocialPostsAdapter) {
    return customSocialPostsAdapter.deletePost(postId);
  }

  const user = firestoreAuth.currentUser;
  if (!isVerifiedAdminUser(user)) {
    throw new Error('ADMIN_AUTH_REQUIRED');
  }

  const cleanId = sanitizeId(postId, 'post');
  try {
    const postRef = doc(db, 'social_posts', cleanId);
    const snap = await getDoc(postRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data?.storagePath) {
        try {
          await deleteObject(storageRef(storage, data.storagePath));
        } catch {
          // ignore storage delete errors
        }
      }
      try {
        const likesSnap = await getDocs(collection(db, 'social_posts', cleanId, 'likes'));
        if (!likesSnap.empty) {
          const batch = writeBatch(db);
          likesSnap.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      } catch {
        // ignore likes cleanup error
      }
    }
    await deleteDoc(postRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `social_posts/${cleanId}`);
  }
};

export const moderateSocialPostInDb = async (
  postId: string,
  status: 'approved' | 'rejected',
  pinned = false
): Promise<void> => {
  if (customSocialPostsAdapter) {
    return customSocialPostsAdapter.moderatePost(postId, status, pinned);
  }

  const user = firestoreAuth.currentUser;
  if (!isVerifiedAdminUser(user)) {
    throw new Error('ADMIN_AUTH_REQUIRED');
  }

  const cleanId = sanitizeId(postId, 'post');
  try {
    await updateDoc(doc(db, 'social_posts', cleanId), {
      status,
      pinned,
      moderatedAt: new Date().toISOString(),
      moderatedBy: user?.email || 'admin',
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `social_posts/${cleanId}`);
  }
};

export const subscribeSocialPosts = (onUpdate: (posts: SocialPost[]) => void) => {
  const q = query(collection(db, 'social_posts'), orderBy('timestamp', 'desc'), limit(100));
  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) return;
      const list: SocialPost[] = snapshot.docs.map((d) => {
        const data = d.data() as SocialPost;
        return {
          id: data.id || d.id,
          authorName: data.authorName || 'Participante',
          authorRole: data.authorRole || 'Participante do Simpósio',
          city: data.city || 'Carangola',
          content: data.content || '',
          hashtags: data.hashtags,
          imageUrl: data.imageUrl,
          storagePath: data.storagePath,
          imageFileName: data.imageFileName,
          likes: Math.max(0, Number(data.likes) || 0),
          createdAt: data.createdAt || '',
          timestamp: Number(data.timestamp) || Date.now(),
          pinned: Boolean(data.pinned),
          status: data.status || 'approved'
        };
      });
      onUpdate(list);
    },
    (error) => {
      console.warn('Aviso ao sincronizar postagens do SocialWall do Firestore:', error);
    }
  );
};

// ============================================================================
// 2. ALERTAS & NOTIFICAÇÕES: FIRESTORE INTEGRATION
// ============================================================================

export const saveNotificationToDb = async (notification: PushNotificationItem): Promise<void> => {
  if (customNotificationsAdapter) {
    return customNotificationsAdapter.saveNotification(notification);
  }

  const user = firestoreAuth.currentUser;
  if (!isVerifiedAdminUser(user)) {
    throw new Error('ADMIN_AUTH_REQUIRED');
  }

  const cleanId = sanitizeId(notification.id, 'notif');
  const payload: Record<string, unknown> = {
    id: cleanId,
    title: (notification.title || '').trim().slice(0, 160),
    body: (notification.body || '').trim().slice(0, 1000),
    category: ['lembrete', 'aviso', 'material', 'certificado', 'urgente'].includes(notification.category)
      ? notification.category
      : 'aviso',
    targetAudience: ['todos', 'inscritos', 'presentes', 'profissionais'].includes(notification.targetAudience)
      ? notification.targetAudience
      : 'todos',
    sentAt: notification.sentAt || new Date().toISOString(),
    readCount: Math.max(0, Math.round(Number(notification.readCount) || 0)),
    totalSent: Math.max(0, Math.round(Number(notification.totalSent) || 0)),
    createdAt: new Date().toISOString(),
    active: true
  };

  if (notification.clickedUrl) {
    payload.clickedUrl = String(notification.clickedUrl).slice(0, 300);
  }

  try {
    await setDoc(doc(db, 'notifications', cleanId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `notifications/${cleanId}`);
  }
};

export const deleteNotificationInDb = async (notificationId: string): Promise<void> => {
  if (customNotificationsAdapter) {
    return customNotificationsAdapter.deleteNotification(notificationId);
  }

  const user = firestoreAuth.currentUser;
  if (!isVerifiedAdminUser(user)) {
    throw new Error('ADMIN_AUTH_REQUIRED');
  }

  const cleanId = sanitizeId(notificationId, 'notif');
  try {
    await deleteDoc(doc(db, 'notifications', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `notifications/${cleanId}`);
  }
};

export const subscribeNotifications = (onUpdate: (notifications: PushNotificationItem[]) => void) => {
  const q = query(collection(db, 'notifications'), orderBy('sentAt', 'desc'), limit(50));
  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) return;
      const list: PushNotificationItem[] = snapshot.docs.map((d) => {
        const data = d.data() as PushNotificationItem;
        return {
          id: data.id || d.id,
          title: data.title || '',
          body: data.body || '',
          category: data.category || 'aviso',
          targetAudience: data.targetAudience || 'todos',
          sentAt: data.sentAt || new Date().toISOString(),
          readCount: Number(data.readCount) || 0,
          totalSent: Number(data.totalSent) || 0,
          clickedUrl: data.clickedUrl
        };
      });
      onUpdate(list);
    },
    (error) => {
      console.warn('Aviso ao sincronizar alertas do Firestore:', error);
    }
  );
};

// ============================================================================
// 3. NEWSLETTER: FIRESTORE INTEGRATION & LGPD PRIVACY
// ============================================================================

export const subscribeNewsletterInDb = async (
  sub: NewsletterSubscriber
): Promise<{ isNew: boolean; subscriber: NewsletterSubscriber; unsubscribeToken?: string }> => {
  if (customNewsletterAdapter) {
    return customNewsletterAdapter.subscribe(sub);
  }

  const cleanEmail = (sub.email || '').trim().toLowerCase();
  if (!cleanEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
    throw new Error('Endereço de e-mail inválido para inscrição na newsletter.');
  }

  // 1. Eliminar IDs derivados do e-mail.
  // 2. Utilizar identificadores aleatórios não reversíveis e sem dados pessoais.
  const emailHash = await sha256Hex(cleanEmail);
  const randomSuffix = generateSecureToken().slice(0, 16);
  const docId = `sub-${Date.now().toString(36)}-${randomSuffix}`;
  const nowIso = new Date().toISOString();

  // 4. Implementar cancelamento com prova de titularidade através de token criptográfico opaco
  const unsubscribeToken = generateSecureToken();
  const unsubscribeTokenHash = await sha256Hex(unsubscribeToken);
  const expiresAtMillis = Date.now() + 365 * 24 * 60 * 60 * 1000;
  const tokenExpiresAt = new Date(expiresAtMillis).toISOString();

  const payload: Record<string, unknown> = {
    id: docId,
    email: cleanEmail,
    emailHash,
    subscribedAt: sub.subscribedAt || nowIso.split('T')[0],
    receiveWhatsapp: Boolean(sub.receiveWhatsapp),
    receiveEmail: sub.receiveEmail !== false,
    status: 'active',
    origin: sub.origin || 'newsletter_form',
    consent: true,
    unsubscribeTokenHash,
    unsubscribeTokenExpiresAt: tokenExpiresAt,
    unsubscribeTokenExpiresAtMillis: expiresAtMillis,
    updatedAt: nowIso
  };

  if (sub.name) payload.name = sub.name.trim().slice(0, 120);
  if (sub.phone) payload.phone = sub.phone.trim().slice(0, 32);
  if (sub.role) payload.role = sub.role.trim().slice(0, 120);
  if (sub.city) payload.city = sub.city.trim().slice(0, 100);
  if (sub.institution) payload.institution = sub.institution.trim().slice(0, 180);

  try {
    // 3. Prevenção de duplicações sem expor o e-mail em caminhos públicos de documentos
    let isNew = true;
    try {
      const indexRef = doc(db, 'newsletter_indexes', emailHash);
      const indexSnap = await getDoc(indexRef);
      if (indexSnap.exists()) {
        isNew = false;
      } else {
        await setDoc(indexRef, { subscriberId: docId, createdAt: nowIso });
      }
    } catch {
      // Ignora erro no índice caso indisponível no cliente offline
    }

    const docRef = doc(db, 'newsletter_subscribers', docId);
    await setDoc(docRef, payload, { merge: true });

    // Salva token seguro no dispositivo do participante para autorizar cancelamento futuro
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`sm_unsub_token_${docId}`, unsubscribeToken);
        localStorage.setItem(`sm_sub_id_${cleanEmail}`, docId);
      } catch {
        // ignore storage errors
      }
    }

    return {
      isNew,
      subscriber: {
        ...sub,
        id: docId,
        email: cleanEmail,
        emailHash,
        status: 'active',
        consent: true
      },
      unsubscribeToken
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `newsletter_subscribers/${docId}`);
    return { isNew: true, subscriber: { ...sub, id: docId, email: cleanEmail } };
  }
};

export const unsubscribeNewsletterInDb = async (
  emailOrId: string,
  rawToken?: string
): Promise<void> => {
  if (customNewsletterAdapter) {
    return customNewsletterAdapter.unsubscribe(emailOrId, rawToken);
  }

  const clean = (emailOrId || '').trim().toLowerCase();
  let subscriberId = clean;

  // Resolve subscriberId caso tenha sido fornecido e-mail e exista mapeamento local
  if (clean.includes('@') && typeof localStorage !== 'undefined') {
    const cachedId = localStorage.getItem(`sm_sub_id_${clean}`);
    if (cachedId) {
      subscriberId = cachedId;
    }
  }

  // Busca o token de titularidade do parâmetro ou do armazenamento do cliente
  let token = rawToken;
  if (!token && typeof localStorage !== 'undefined') {
    token = localStorage.getItem(`sm_unsub_token_${subscriberId}`) || undefined;
  }

  const user = firestoreAuth.currentUser;
  const isAdmin = isVerifiedAdminUser(user);

  if (!token && !isAdmin) {
    throw new Error('TOKEN_PROOF_REQUIRED: O cancelamento da inscrição exige a apresentação do token criptográfico de titularidade.');
  }

  const tokenProof = token ? await sha256Hex(token) : undefined;
  const nowIso = new Date().toISOString();

  const updatePayload: Record<string, unknown> = {
    status: 'unsubscribed',
    receiveWhatsapp: false,
    receiveEmail: false,
    unsubscribeTokenHash: '',
    unsubscribedAt: nowIso,
    updatedAt: nowIso
  };

  if (tokenProof) {
    updatePayload.tokenProof = tokenProof;
  }

  try {
    await updateDoc(doc(db, 'newsletter_subscribers', subscriberId), updatePayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `newsletter_subscribers/${subscriberId}`);
  }
};

export interface DeleteSubscriberResult {
  readonly success: true;
  readonly subscriberId: string;
  readonly tombstoneConfirmedAt: string;
  readonly alreadyTombstoned: boolean;
}

export const updateSubscriberConsentInDb = async (
  subscriberId: string,
  changes: { receiveEmail?: boolean; receiveWhatsapp?: boolean }
): Promise<void> => {
  const isAdminSession = await isAuthorizedServerAdminSession();
  if (!isAdminSession) {
    throw new Error('ADMIN_AUTH_REQUIRED');
  }

  const cleanId = validateSubscriberId(subscriberId);
  const subRef = doc(db, 'newsletter_subscribers', cleanId);

  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(subRef);
      if (!snap.exists()) {
        throw new Error('SUBSCRIBER_NOT_FOUND');
      }

      const currentData = snap.data() as NewsletterSubscriber;

      if (currentData.status === 'unsubscribed') {
        throw new Error('TOMBSTONE_MODIFICATION_FORBIDDEN');
      }

      const currentEmail: boolean | undefined = currentData.receiveEmail;
      const currentWhatsapp: boolean | undefined = currentData.receiveWhatsapp;

      let nextEmail: boolean | undefined = currentEmail;
      if (changes.receiveEmail === false) {
        nextEmail = false;
      } else if (changes.receiveEmail === true && currentEmail !== true) {
        nextEmail = currentEmail;
      }

      let nextWhatsapp: boolean | undefined = currentWhatsapp;
      if (changes.receiveWhatsapp === false) {
        nextWhatsapp = false;
      } else if (changes.receiveWhatsapp === true && currentWhatsapp !== true) {
        nextWhatsapp = currentWhatsapp;
      }

      const isFullyRevoked = nextEmail === false && nextWhatsapp === false;
      const nextStatus = isFullyRevoked ? 'unsubscribed' : (currentData.status || 'active');
      const nowIso = new Date().toISOString();

      const updatePayload: Record<string, unknown> = {
        status: nextStatus,
        updatedAt: nowIso
      };

      if (nextEmail !== undefined) {
        updatePayload.receiveEmail = nextEmail;
      }
      if (nextWhatsapp !== undefined) {
        updatePayload.receiveWhatsapp = nextWhatsapp;
      }

      if (isFullyRevoked) {
        updatePayload.unsubscribedAt = currentData.unsubscribedAt || nowIso;
        updatePayload.unsubscribeTokenHash = '';
      }

      transaction.set(subRef, updatePayload, { merge: true });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `newsletter_subscribers/${cleanId}`);
  }
};

export const deleteSubscriberInDb = async (
  subscriberId: string
): Promise<DeleteSubscriberResult> => {
  const isAdminSession = await isAuthorizedServerAdminSession();
  if (!isAdminSession) {
    throw new Error('ADMIN_AUTH_REQUIRED');
  }

  const cleanId = validateSubscriberId(subscriberId);
  const subRef = doc(db, 'newsletter_subscribers', cleanId);

  try {
    return await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(subRef);
      if (!snap.exists()) {
        throw new Error('SUBSCRIBER_NOT_FOUND');
      }

      const currentData = snap.data() as NewsletterSubscriber;
      if (currentData.status === 'unsubscribed') {
        // Preserva o tombstone existente sem gerar nova data nem reescrever dados
        const existingTs =
          validateStrictIsoTimestamp(currentData.unsubscribedAt) ||
          validateStrictIsoTimestamp(currentData.updatedAt) ||
          String(currentData.unsubscribedAt || currentData.updatedAt || '');
        return {
          success: true as const,
          subscriberId: cleanId,
          tombstoneConfirmedAt: existingTs,
          alreadyTombstoned: true
        };
      }

      const nowIso = new Date().toISOString();
      const tombstonePayload: Record<string, unknown> = {
        status: 'unsubscribed',
        receiveEmail: false,
        receiveWhatsapp: false,
        unsubscribedAt: nowIso,
        unsubscribeTokenHash: '',
        updatedAt: nowIso
      };
      transaction.set(subRef, tombstonePayload, { merge: true });
      return {
        success: true as const,
        subscriberId: cleanId,
        tombstoneConfirmedAt: nowIso,
        alreadyTombstoned: false
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `newsletter_subscribers/${cleanId}`);
  }
};

export const subscribeAdminSubscribers = (
  onUpdate: (subscribers: NewsletterSubscriber[], meta: SubscribersSnapshotMeta) => void
) => {
  let cancelled = false;
  let activeUnsub: (() => void) | null = null;

  isAuthorizedServerAdminSession()
    .then((allowed) => {
      if (cancelled || !allowed) return;

      // Consulta integral da coleção sem filtros where, sem orderBy no servidor e sem limit(500)
      const q = collection(db, 'newsletter_subscribers');
      activeUnsub = onSnapshot(
        q,
        (snapshot) => {
          const meta: SubscribersSnapshotMeta = {
            source: snapshot.metadata.fromCache ? 'firestore_cache' : 'firestore_server',
            isExhaustive: !snapshot.metadata.fromCache
          };

          if (snapshot.empty) {
            onUpdate([], meta);
            return;
          }

          const list: NewsletterSubscriber[] = snapshot.docs.map((d) => {
            const data = d.data() as NewsletterSubscriber;
            return {
              id: data.id || d.id,
              email: data.email || '',
              name: data.name,
              phone: data.phone,
              role: data.role,
              city: data.city,
              institution: data.institution,
              subscribedAt: data.subscribedAt || '',
              receiveWhatsapp: data.receiveWhatsapp,
              receiveEmail: data.receiveEmail,
              origin: data.origin,
              status: data.status || 'active',
              unsubscribedAt: data.unsubscribedAt,
              consent: data.consent,
              updatedAt: data.updatedAt
            };
          });

          list.sort((a, b) => (b.subscribedAt || '').localeCompare(a.subscribedAt || ''));
          onUpdate(list, meta);
        },
        (error) => {
          console.warn('Aviso ao sincronizar assinantes de newsletter:', error);
        }
      );
    })
    .catch((err) => {
      console.warn('Sessão administrativa indisponível para listener de assinantes:', err);
    });

  return () => {
    cancelled = true;
    if (activeUnsub) activeUnsub();
  };
};

export { deleteDoc };
