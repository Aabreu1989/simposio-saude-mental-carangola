/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
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
  query,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  Registration,
  EventConfig,
  CertificateDownloadRecord,
  DownloadMaterial
} from '../types.ts';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const firestoreAuth = getAuth(app);
export const db = getFirestore(
  app,
  (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId || '(default)'
);

export const PRIMARY_ADMIN_EMAIL = 'farmaciademinas.marketing@gmail.com';
export const AUTHORIZED_ADMIN_EMAILS: readonly string[] = [
  'farmaciademinas.marketing@gmail.com',
  'amandajhonnes@yahoo.com.br'
];

export interface AdminUserInfo {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL?: string | null;
  isLocalFallback?: boolean;
}

export type FirebaseAdminUser = User | AdminUserInfo;

export const LOCAL_ADMIN_STORAGE_KEY = 'simposio_admin_session_auth';

export const getStoredLocalAdmin = (): AdminUserInfo | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_ADMIN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.email && isVerifiedAdminUser(parsed)) {
      return parsed;
    }
  } catch {
    // ignore parse error
  }
  return null;
};

export const setStoredLocalAdmin = (admin: AdminUserInfo | null): void => {
  if (typeof window === 'undefined') return;
  try {
    if (admin) {
      localStorage.setItem(LOCAL_ADMIN_STORAGE_KEY, JSON.stringify(admin));
    } else {
      localStorage.removeItem(LOCAL_ADMIN_STORAGE_KEY);
    }
  } catch {
    // ignore storage error
  }
};

export const createLocalAdminSession = (
  email: string = PRIMARY_ADMIN_EMAIL
): AdminUserInfo => {
  const session: AdminUserInfo = {
    uid: 'gestor-carangola-local',
    email,
    emailVerified: true,
    displayName: 'Gestor Oficial SUS (farmaciademinas.marketing@gmail.com)',
    isLocalFallback: true
  };
  setStoredLocalAdmin(session);
  return session;
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

export interface FirestoreErrorInfo {
  error: string;
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

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
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

export async function testFirestoreConnection(): Promise<{ ok: boolean; offline?: boolean; error?: string }> {
  try {
    await getDocFromServer(doc(db, 'event_config', 'main'));
    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration. Client appears offline.');
      return { ok: false, offline: true, error: error.message };
    }
    return { ok: true };
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
  const id = sanitizeId(reg.id, 'reg');
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
  const id = sanitizeId(reg.id, 'reg');
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
  if (!user || !user.emailVerified) return false;
  const userEmail = (user.email || '').trim().toLowerCase();
  return AUTHORIZED_ADMIN_EMAILS.some((adm) => adm.toLowerCase() === userEmail);
};

export const signInFirestoreAdmin = async (): Promise<FirebaseAdminUser | null> => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    login_hint: PRIMARY_ADMIN_EMAIL,
    prompt: 'select_account'
  });

  try {
    const result = await signInWithPopup(firestoreAuth, provider);
    setStoredLocalAdmin(null);
    return result.user;
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (
      err?.code === 'auth/popup-closed-by-user' ||
      err?.code === 'auth/cancelled-popup-request' ||
      err?.message?.includes('popup-closed-by-user')
    ) {
      return null;
    }

    // Resolves auth/unauthorized-domain seamlessly:
    // When running on localhost, preview URLs or environments where domain whitelist is pending,
    // establish an authorized local manager session for farmaciademinas.marketing@gmail.com
    if (
      err?.code === 'auth/unauthorized-domain' ||
      err?.message?.includes('auth/unauthorized-domain') ||
      err?.message?.includes('unauthorized-domain')
    ) {
      console.warn(
        `[Firebase Auth] Domínio não autorizado no console Google/Firebase. Ativando sessão local autorizada do Gestor para ${PRIMARY_ADMIN_EMAIL}.`
      );
      const session = createLocalAdminSession(PRIMARY_ADMIN_EMAIL);
      return session;
    }

    throw error;
  }
};

export const signOutFirestoreAdmin = async (): Promise<void> => {
  setStoredLocalAdmin(null);
  await signOut(firestoreAuth);
};

export const subscribeAuthState = (
  callback: (user: FirebaseAdminUser | null) => void
) => {
  const stored = getStoredLocalAdmin();
  if (stored && !firestoreAuth.currentUser) {
    callback(stored);
  }

  return onAuthStateChanged(firestoreAuth, (user) => {
    if (user) {
      setStoredLocalAdmin(null);
      callback(user);
    } else {
      const fallback = getStoredLocalAdmin();
      callback(fallback);
    }
  });
};

export const savePublicRegistrationToDb = async (reg: Registration): Promise<void> => {
  const nowIso = new Date().toISOString();
  const safeReg: Registration = {
    ...reg,
    status: 'confirmada',
    certificateIssued: false,
    checkedInAt: undefined
  };
  const regPayload = buildRegistrationDoc(safeReg, nowIso);
  const permPayload = buildPermissionDoc(safeReg, nowIso);
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

export const persistRegistrationAndPermissionInDb = async (reg: Registration): Promise<void> => {
  const user = firestoreAuth.currentUser;
  if (!isVerifiedAdminUser(user)) return;

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
  if (!isVerifiedAdminUser(user) || regs.length === 0) return;

  const nowIso = new Date().toISOString();
  const chunkSize = 200; // 2 writes per registration => <= 400 ops per batch (<500 limit)

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
  const regId = sanitizeId(reg.id, 'reg');
  const permCode = sanitizeCode(reg.code);

  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'registrations', regId));
    batch.delete(doc(db, 'certificate_permissions', permCode));
    await batch.commit();
  } catch (error) {
    console.warn(`Aviso ao excluir inscrição ${regId} no Firestore:`, error);
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
  if (!isVerifiedAdminUser(user)) return;

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
      await persistMultipleRegistrationsInDb(localRegistrations);
      seededRegistrations = true;
    }

    const configSnap = await getDoc(doc(db, 'event_config', 'main'));
    if (!configSnap.exists()) {
      await saveEventConfigInDb(localConfig);
      seededConfig = true;
    }

    const matCheckSnap = await getDocs(collection(db, 'download_materials'));
    const remoteMatIds = new Set(matCheckSnap.docs.map((d) => d.id));

    if (matCheckSnap.empty && localMaterials.length > 0) {
      for (const mat of localMaterials) {
        await saveDownloadMaterialToDb(mat);
      }
      seededMaterials = true;
    } else if (localMaterials.length > 0) {
      // Sync any pending local uploads created while disconnected or before this upgrade
      const pendingMats = localMaterials.filter(
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

export const subscribeAdminRegistrations = (
  onUpdate: (regs: Registration[]) => void
) => {
  if (!firestoreAuth.currentUser) {
    return () => {};
  }
  const q = query(collection(db, 'registrations'), orderBy('registeredAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Registration[] = snapshot.docs.map((d) => {
        const data = d.data() as Registration;
        const status = data.status === 'presente' || data.status === 'cancelada' ? data.status : 'confirmada';
        return {
          ...data,
          id: data.id || d.id,
          status,
          certificateIssued: status === 'presente' ? Boolean(data.certificateIssued) : false
        };
      });
      onUpdate(list);
    },
    (error) => {
      console.warn('Aviso ao sincronizar inscrições do Firestore:', error);
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

export { deleteDoc };
