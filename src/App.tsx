/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import {
  EventConfig,
  Registration,
  DownloadMaterial,
  SocialPost,
  PushNotificationItem,
  NewsletterSubscriber,
  EvaluationFeedback,
  CertificateDownloadRecord,
  SpeakerProfile
} from './types.ts';
import { UserCheck, Sparkles, Home, Calendar, FileDown, Menu, MessageSquare } from 'lucide-react';
import { THEMATIC_AXES, INITIAL_SCHEDULE, INITIAL_EVENT_CONFIG, SPEAKERS_PROFILES, INITIAL_MATERIALS } from './data/initialData.ts';
import {
  loadStoredData,
  saveToStorage,
  saveMaterialsToStorageSafe,
  saveSpeakersToStorage,
  STORAGE_KEYS,
  REALTIME_CHANNEL_NAME,
  TAB_INSTANCE_ID,
  sendBrowserNotification,
  isCertificateAvailableForPublic,
  getDeletedMaterialIds,
  addDeletedMaterialId,
  isProhibitedPrivateMaterial,
  getDeletedRegistrationIds,
  addDeletedRegistrationId,
  getDeletedPostIds,
  addDeletedPostId,
  broadcastRealtimeUpdate,
  mergeSpeakersWithDefaults,
  INVENTED_POST_IDS,
  reconcileSocialPostsSnapshot,
  sanitizePostsForStorage,
  buildSubscriberIdFromRegistrationId,
  hydrateConfirmedTombstonesMap,
  reconcileSubscribersSnapshot,
  addConfirmedSubscriberTombstoneHint,
  removeConfirmedSubscriberTombstoneHint,
  validateStrictIsoTimestamp,
  enqueueSerialQueueTask,
  sanitizeCertificateBannerUrl,
  type ConfirmedTombstoneEntry,
  type StorageSaveResult,
  type SubscribersSnapshotMeta
} from './utils/helpers.ts';
import { isSupabaseConfigured, supabaseRestQuery } from './services/supabaseClient.ts';
import {
  testFirestoreConnection,
  subscribeAuthState,
  signInFirestoreAdmin,
  consumeAdminRedirectResult,
  signOutFirestoreAdmin,
  isVerifiedAdminUser,
  isAuthorizedServerAdminSession,
  seedInitialDataIfNeeded,
  savePublicRegistrationToDb,
  synchronizeOfflineRegistrationQueue,
  persistRegistrationAndPermissionInDb,
  persistMultipleRegistrationsInDb,
  persistAdminImportedRegistrationsWithTriadCheckInDb,
  deleteRegistrationInDb,
  type AdminBatchImportResult,
  recordCertificateDownloadInDb,
  saveEventConfigInDb,
  subscribeEventConfig,
  fetchAdminRegistrationsFromDb,
  subscribeAdminRegistrations,
  subscribeCertificateDownloads,
  saveDownloadMaterialToDb,
  deleteDownloadMaterialInDb,
  incrementMaterialDownloadInDb,
  subscribeDownloadMaterials,
  saveSpeakerToDb,
  deleteSpeakerInDb,
  saveAllSpeakersToDb,
  subscribeSpeakers,
  saveSocialPostToDb,
  likeSocialPostInDb,
  deleteSocialPostInDb,
  moderateSocialPostInDb,
  subscribeSocialPosts,
  ensureAuthenticatedUser,
  saveNotificationToDb,
  deleteNotificationInDb,
  subscribeNotifications,
  subscribeNewsletterInDb,
  deleteSubscriberInDb,
  subscribeAdminSubscribers,
  PRIMARY_ADMIN_EMAIL,
  type FirebaseAdminUser,
  firestoreAuth
} from './services/firebaseDb.ts';
import { INITIAL_BADGE_DESIGN, INITIAL_CERTIFICATE_DESIGN } from './data/initialData.ts';
import type { User } from 'firebase/auth';

// Components
import { Header } from './components/Header.tsx';
import { Hero } from './components/Hero.tsx';
import { EventIntroSection } from './components/EventIntroSection.tsx';
import { ThematicAxesSection } from './components/ThematicAxesSection.tsx';
import { ScheduleSection } from './components/ScheduleSection.tsx';
import { SpeakersSection } from './components/SpeakersSection.tsx';
import { DownloadsSection } from './components/DownloadsSection.tsx';
import { SocialWall } from './components/SocialWall.tsx';
import { Footer } from './components/Footer.tsx';
import { RegistrationModal } from './components/RegistrationModal.tsx';
import { CertificateModal } from './components/CertificateModal.tsx';
// Lazy load heavy admin components (268KB+ AdminDashboard) — only loaded when admin view is active
const AdminDashboard = lazy(() => import('./components/AdminDashboard.tsx').then(m => ({ default: m.AdminDashboard })));
const AdminLogin = lazy(() => import('./components/AdminLogin.tsx').then(m => ({ default: m.AdminLogin })));
import { AddToCalendarModal } from './components/AddToCalendarModal.tsx';
import { ShareModal } from './components/ShareModal.tsx';
import { EventLocationMap } from './components/EventLocationMap.tsx';
import { AlertBanner } from './components/AlertBanner.tsx';
import { InstallAppBanner } from './components/InstallAppBanner.tsx';
import { InstallAppModal } from './components/InstallAppModal.tsx';

const getInitialView = (): 'public' | 'admin' | 'inscricao' => {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();
    const pathname = window.location.pathname.toLowerCase();
    if (
      hash === '#inscricao' ||
      hash === '#inscrever' ||
      hash === '#inscricoes' ||
      hash === '#formulario' ||
      search.includes('inscricao') ||
      search.includes('inscrever') ||
      pathname.endsWith('/inscricao')
    ) {
      return 'inscricao';
    }
    if (hash === '#admin' || search.includes('admin')) {
      return 'admin';
    }
  }
  return 'public';
};

export default function App() {
  const [initialData] = useState(() => loadStoredData());

  // App State - 'public' landing, 'inscricao' direct form view, 'admin' dashboard
  const [currentView, setCurrentView] = useState<'public' | 'admin' | 'inscricao'>(getInitialView);
  const [config, setConfig] = useState<EventConfig>(initialData.config);
  const [registrations, setRegistrations] = useState<Registration[]>(initialData.registrations);
  const registrationsRef = useRef<Registration[]>(initialData.registrations);
  const applyRegistrationsState = useCallback(
    (nextRegs: Registration[], options: { persist?: boolean } = { persist: true }) => {
      registrationsRef.current = nextRegs;
      setRegistrations(nextRegs);
      if (options.persist) {
        saveToStorage(STORAGE_KEYS.REGISTRATIONS, nextRegs);
      }
    },
    []
  );
  const [materials, setMaterials] = useState<DownloadMaterial[]>(initialData.materials);
  const [posts, setPosts] = useState<SocialPost[]>(initialData.posts);
  const likingPostIdsRef = useRef<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<PushNotificationItem[]>(initialData.notifications);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>(initialData.subscribers);
  const subscribersRef = useRef<NewsletterSubscriber[]>(initialData.subscribers);
  const subscriberOpQueueRef = useRef<Promise<void>>(Promise.resolve());
  const confirmedTombstonesRef = useRef<Map<string, ConfirmedTombstoneEntry> | null>(null);
  if (confirmedTombstonesRef.current === null) {
    confirmedTombstonesRef.current = hydrateConfirmedTombstonesMap(
      initialData.subscribers,
      initialData.confirmedSubscriberTombstones
    );
  }

  const applySubscribersTransition = useCallback(
    (
      computeNext: (current: NewsletterSubscriber[]) => NewsletterSubscriber[],
      options: { persist: boolean }
    ): { nextState: NewsletterSubscriber[]; storageResult: StorageSaveResult | null } => {
      const nextState = computeNext(subscribersRef.current);
      subscribersRef.current = nextState;
      setSubscribers(nextState);
      const storageResult = options.persist
        ? saveToStorage(STORAGE_KEYS.SUBSCRIBERS, nextState)
        : null;
      return { nextState, storageResult };
    },
    []
  );

  const enqueueSubscriberOperation = useCallback(
    <T,>(op: () => Promise<T>): Promise<T> => enqueueSerialQueueTask(subscriberOpQueueRef, op),
    []
  );
  const [evaluations, setEvaluations] = useState<EvaluationFeedback[]>(initialData.evaluations);
  const [offlineQueue, setOfflineQueue] = useState<Registration[]>(initialData.offlineQueue);
  const [lastRegistered, setLastRegistered] = useState<Registration | null>(initialData.lastRegistered);
  const [certificateDownloads, setCertificateDownloads] = useState<CertificateDownloadRecord[]>(initialData.certificateDownloads);
  const [speakers, setSpeakers] = useState<SpeakerProfile[]>(initialData.speakers || SPEAKERS_PROFILES);

  // Connectivity state
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Firebase Firestore auth & cloud sync state (Authorized official manager: farmaciademinas.marketing@gmail.com or /admins/{uid})
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAdminUser | null>(null);
  const [isServerAuthorizedAdmin, setIsServerAuthorizedAdmin] = useState<boolean>(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [firebaseSyncError, setFirebaseSyncError] = useState<string | null>(null);

  // Modals state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);
  const [isInstallAppModalOpen, setIsInstallAppModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [deepLinkCertCode, setDeepLinkCertCode] = useState<string | null>(null);
  const [managerCertAttendee, setManagerCertAttendee] = useState<Registration | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [selectedAxisFilter, setSelectedAxisFilter] = useState<string | undefined>(undefined);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Firestore Boot Connection Test & Global Config + Auth Subscriptions
  useEffect(() => {
    testFirestoreConnection().catch((err) => {
      console.warn('Firestore connection test info:', err);
    });

    consumeAdminRedirectResult()
      .then(async ({ user, hadPendingRedirect, error }) => {
        if (user) {
          const authorized = await isAuthorizedServerAdminSession().catch(() =>
            isVerifiedAdminUser(user)
          );
          if (authorized) {
            setFirebaseUser(user);
            setIsServerAuthorizedAdmin(true);
            setFirebaseSyncError(null);
            try {
              sessionStorage.setItem('simposio_admin_auth', 'true');
              localStorage.removeItem('simposio_admin_logged_out');
            } catch {
              // ignore storage errors
            }
            setIsAdminAuthenticated(true);
            setCurrentView('admin');
            if (typeof window !== 'undefined' && window.location.hash !== '#admin') {
              window.history.replaceState(null, '', window.location.pathname + window.location.search + '#admin');
            }
            return;
          }
          setIsServerAuthorizedAdmin(false);
          setFirebaseSyncError(
            `A conta ${user.email || 'conectada'} não possui permissão de gestor autorizada.`
          );
          if (hadPendingRedirect) {
            setCurrentView('admin');
          }
          return;
        }
        if (error) {
          setIsServerAuthorizedAdmin(false);
          setFirebaseSyncError(error);
          if (hadPendingRedirect) {
            setCurrentView('admin');
          }
        }
      })
      .catch(() => {});

    const unsubConfig = subscribeEventConfig((remoteCfg) => {
      setConfig((prev) => {
        const mergedCertDesign = {
          ...INITIAL_CERTIFICATE_DESIGN,
          ...(prev.certificateDesign || {}),
          ...(remoteCfg.certificateDesign || {})
        };
        mergedCertDesign.bannerImageUrl = sanitizeCertificateBannerUrl(
          mergedCertDesign.bannerImageUrl
        );
        if (!mergedCertDesign.bannerImageUrl) {
          mergedCertDesign.showBannerImage = false;
        }
        const merged: EventConfig = {
          ...prev,
          ...remoteCfg,
          emailJsConfig: remoteCfg.emailJsConfig || prev.emailJsConfig,
          certificateDesign: mergedCertDesign,
          badgeDesign: {
            ...INITIAL_BADGE_DESIGN,
            ...(prev.badgeDesign || {}),
            ...(remoteCfg.badgeDesign || {})
          }
        };
        saveToStorage(STORAGE_KEYS.CONFIG, merged);
        return merged;
      });
    });

    const unsubMaterials = subscribeDownloadMaterials((remoteMaterials) => {
      const deletedIds = getDeletedMaterialIds();
      deletedIds.add('mat-0');
      deletedIds.add('mat-5');

      // Purge prohibited or private documents from Firestore if encountered
      remoteMaterials.forEach((m) => {
        if (m && (isProhibitedPrivateMaterial(m) || m.id === 'mat-5' || m.id === 'mat-0')) {
          deleteDownloadMaterialInDb(m.id).catch(() => {});
        }
      });

      const validRemote = remoteMaterials.filter(
        (m) =>
          !deletedIds.has(m.id) &&
          !isProhibitedPrivateMaterial(m) &&
          !m.deleted &&
          m.id !== 'mat-0' &&
          m.id !== 'mat-5' &&
          m.fileUrl !== '#'
      );

      setMaterials((prev) => {
        const remoteIds = new Set(validRemote.map((m) => m.id));
        // Manter apenas materiais locais que NÃO estão no remote E NÃO foram deletados e NÃO são privados
        const localOnly = prev.filter(
          (m) =>
            !remoteIds.has(m.id) &&
            !deletedIds.has(m.id) &&
            !isProhibitedPrivateMaterial(m) &&
            m.id !== 'mat-0' &&
            m.id !== 'mat-5' &&
            m.fileUrl !== '#'
        );

        // NUNCA re-adicionar INITIAL_MATERIALS — se foram deletados, ficam deletados para sempre
        const allList = [...validRemote, ...localOnly].filter(
          (item) =>
            !deletedIds.has(item.id) &&
            !isProhibitedPrivateMaterial(item) &&
            item.id !== 'mat-0' &&
            item.id !== 'mat-5' &&
            item.fileUrl !== '#'
        );
        const uniqueMap = new Map<string, DownloadMaterial>();
        allList.forEach((item) => {
          if (!uniqueMap.has(item.id)) {
            uniqueMap.set(item.id, item);
          }
        });
        const merged = Array.from(uniqueMap.values());
        saveMaterialsToStorageSafe(merged);
        return merged;
      });
    });

    const unsubAuth = subscribeAuthState((user) => {
      if (user?.isAnonymous) {
        // Sessão anônima do Mural Social não é login administrativo e não deve poluir o banner do gestor
        setFirebaseUser(null);
        setFirebaseSyncError(null);
        return;
      }
      setFirebaseUser(user);
      if (!user || user.isAnonymous) {
        setIsServerAuthorizedAdmin(false);
        setFirebaseSyncError(null);
        return;
      }
      isAuthorizedServerAdminSession()
        .then((authorized) => {
          setIsServerAuthorizedAdmin(authorized);
          if (!authorized) {
            setFirebaseSyncError(
              `A conta ${user.email || 'conectada'} não possui permissão de gestor autorizada.`
            );
          } else {
            setFirebaseSyncError(null);
          }
        })
        .catch(() => {
          const fallbackOk = isVerifiedAdminUser(user);
          setIsServerAuthorizedAdmin(fallbackOk);
          if (!fallbackOk) {
            setFirebaseSyncError(
              `A conta ${user.email || 'conectada'} não possui permissão de gestor autorizada.`
            );
          } else {
            setFirebaseSyncError(null);
          }
        });
    });

    const unsubSpeakers = subscribeSpeakers((remoteSpeakers) => {
      if (remoteSpeakers && remoteSpeakers.length > 0) {
        setSpeakers((currentSpeakers) => {
          const merged = mergeSpeakersWithDefaults(remoteSpeakers, currentSpeakers);
          saveSpeakersToStorage(merged);
          return merged;
        });
      }
    });

    const unsubPosts = subscribeSocialPosts((remotePosts, meta) => {
      const deletedIds = getDeletedPostIds();
      if (isVerifiedAdminUser(firestoreAuth.currentUser)) {
        remotePosts.forEach((p) => {
          if (p && INVENTED_POST_IDS.has(p.id)) {
            deleteSocialPostInDb(p.id).catch(() => {});
          }
        });
      }
      setPosts((prev) => {
        const reconciled = reconcileSocialPostsSnapshot(
          remotePosts,
          prev,
          deletedIds,
          meta
        );
        saveToStorage(STORAGE_KEYS.POSTS, sanitizePostsForStorage(reconciled));
        return reconciled;
      });
    });

    const unsubNotifications = subscribeNotifications((remoteNotifs) => {
      if (remoteNotifs && remoteNotifs.length > 0) {
        setNotifications(remoteNotifs);
        saveToStorage(STORAGE_KEYS.NOTIFICATIONS, remoteNotifs);
      }
    });

    return () => {
      unsubConfig();
      unsubMaterials();
      unsubAuth();
      unsubSpeakers();
      unsubPosts();
      unsubNotifications();
    };
  }, []);

  // Subscribe to Firestore registrations & downloads when verified admin is connected
  useEffect(() => {
    if (!isServerAuthorizedAdmin) return;

    let isActive = true;
    setIsCloudSyncing(true);

    const snapshotLoaded = loadStoredData();
    const snapshotSeedRegs = snapshotLoaded.registrations;
    const snapshotSeedCfg = snapshotLoaded.config;
    // Prefer current React materials in case an un-persisted large pending upload sits in memory
    const inMemoryPending = materials.filter((m) => m.pendingCloudSync);
    const seedMaterialsMap = new Map<string, DownloadMaterial>();
    [...snapshotLoaded.materials, ...inMemoryPending].forEach((m) => {
      seedMaterialsMap.set(m.id, m);
    });

    seedInitialDataIfNeeded(snapshotSeedRegs, snapshotSeedCfg, Array.from(seedMaterialsMap.values()))
      .then((res) => {
        if (isActive && res.seededMaterials) {
          setMaterials((prev) => {
            const updated = prev.map((m) =>
              m.pendingCloudSync ? { ...m, pendingCloudSync: false } : m
            );
            saveMaterialsToStorageSafe(updated);
            return updated;
          });
        }
      })
      .catch((err) => {
        console.warn('Erro ao inicializar dados no Firestore:', err);
      })
      .finally(() => {
        if (isActive) setIsCloudSyncing(false);
      });

    fetchAdminRegistrationsFromDb()
      .then((remoteRegs) => {
        if (!isActive) return;
        const deletedRegIds = getDeletedRegistrationIds();
        const validRemote = remoteRegs.filter((r) => !deletedRegIds.has(r.id));
        applyRegistrationsState(validRemote, { persist: true });
      })
      .catch((err) => {
        if (isActive) {
          console.warn('Aviso ao carregar inscrições iniciais do Firestore:', err);
        }
      });

    const unsubRegs = subscribeAdminRegistrations(
      (remoteRegs) => {
        if (!isActive) return;
        const deletedRegIds = getDeletedRegistrationIds();
        const validRemote = remoteRegs.filter((r) => !deletedRegIds.has(r.id));
        applyRegistrationsState(validRemote, { persist: true });
      },
      (err) => {
        if (!isActive) return;
        const msg = err instanceof Error ? err.message : 'Falha de conexão com o Firestore.';
        setFirebaseSyncError(`Erro ao sincronizar inscrições em tempo real: ${msg}`);
      }
    );

    const unsubDownloads = subscribeCertificateDownloads((remoteDownloads) => {
      if (!isActive) return;
      setCertificateDownloads(remoteDownloads);
      saveToStorage(STORAGE_KEYS.CERT_DOWNLOADS, remoteDownloads);
    });

    const unsubSubscribers = subscribeAdminSubscribers((remoteSubscribers, meta) => {
      if (!isActive || !remoteSubscribers) return;
      const snapshotMeta: SubscribersSnapshotMeta = meta || {
        source: 'firestore_server',
        isExhaustive: false
      };
      applySubscribersTransition(
        (current) =>
          reconcileSubscribersSnapshot(
            remoteSubscribers,
            current,
            confirmedTombstonesRef.current!,
            snapshotMeta,
            getDeletedRegistrationIds()
          ),
        { persist: true }
      );
    });

    return () => {
      isActive = false;
      unsubRegs();
      unsubDownloads();
      unsubSubscribers();
    };
  }, [firebaseUser, isServerAuthorizedAdmin, applyRegistrationsState]);

  const handleConnectFirebaseAdmin = async (
    options?: { preferRedirect?: boolean }
  ): Promise<boolean> => {
    setFirebaseSyncError(null);
    setIsCloudSyncing(true);
    try {
      const user = await signInFirestoreAdmin(options);
      if (user) {
        setFirebaseUser(user);
        const authorized = await isAuthorizedServerAdminSession().catch(() =>
          isVerifiedAdminUser(user)
        );
        if (!authorized) {
          setIsServerAuthorizedAdmin(false);
          setFirebaseSyncError(
            `Conta ${user.email || 'selecionada'} sem permissão de gestor. Faça login com ${PRIMARY_ADMIN_EMAIL} ou conta cadastrada em /admins.`
          );
          return false;
        }
        setIsServerAuthorizedAdmin(true);
        setFirebaseSyncError(null);
        return true;
      }
      return false;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha na autenticação Google.';
      setFirebaseSyncError(message);
      return false;
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleGoogleAdminLoginFromGate = async (
    options?: { preferRedirect?: boolean }
  ): Promise<boolean> => {
    const ok = await handleConnectFirebaseAdmin(options);
    if (ok) {
      try {
        sessionStorage.setItem('simposio_admin_auth', 'true');
        localStorage.removeItem('simposio_admin_logged_out');
      } catch {
        // ignore storage errors
      }
      setIsAdminAuthenticated(true);
    }
    return ok;
  };

  const handleRefreshRegistrationsFromCloud = async (): Promise<number> => {
    setIsCloudSyncing(true);
    setFirebaseSyncError(null);
    try {
      const remoteRegs = await fetchAdminRegistrationsFromDb();
      const deletedRegIds = getDeletedRegistrationIds();
      const validRemote = remoteRegs.filter((r) => !deletedRegIds.has(r.id));
      applyRegistrationsState(validRemote, { persist: true });
      return validRemote.length;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Falha ao buscar inscrições na nuvem.';
      setFirebaseSyncError(`Não foi possível atualizar inscritos da nuvem: ${message}`);
      throw err;
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleDisconnectFirebaseAdmin = async () => {
    try {
      await signOutFirestoreAdmin();
      setFirebaseUser(null);
      setIsServerAuthorizedAdmin(false);
    } catch (err) {
      console.warn('Erro ao desconectar Firebase Auth:', err);
    }
  };

  // Admin authentication state:
  // Strict security: ONLY grant automatic access if THIS SPECIFIC BROWSER
  // has previously authenticated AND selected the option "Manter conectado neste navegador".
  // Otherwise, username and password are required.
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const explicitLogout = localStorage.getItem('simposio_admin_logged_out');
      if (explicitLogout === 'true') {
        return false;
      }
      const isRemembered = localStorage.getItem('simposio_admin_remember') === 'true';
      const hasLocalAuth = localStorage.getItem('simposio_admin_auth') === 'true';
      if (isRemembered && hasLocalAuth) {
        return true;
      }
      const hasSessionAuth = sessionStorage.getItem('simposio_admin_auth') === 'true';
      if (hasSessionAuth) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  });

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    setFirebaseUser(null);
    setIsServerAuthorizedAdmin(false);
    signOutFirestoreAdmin().catch(() => {});
    try {
      localStorage.setItem('simposio_admin_logged_out', 'true');
      localStorage.removeItem('simposio_admin_remember');
      localStorage.removeItem('simposio_admin_auth');
      sessionStorage.removeItem('simposio_admin_auth');
    } catch {
      // ignore
    }
    // Keep in admin view showing the Login screen so manager authentication can be verified
    setCurrentView('admin');
    if (window.location.hash !== '#admin') {
      window.history.pushState(null, '', window.location.pathname + '#admin');
    }
  };

  // Direct Registration Navigation Handlers
  const handleOpenRegistration = () => {
    setCurrentView('inscricao');
    if (window.location.hash !== '#inscricao') {
      window.history.pushState(null, '', window.location.pathname + '#inscricao');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseRegistration = () => {
    setCurrentView('public');
    if (window.location.hash === '#inscricao' || window.location.hash === '#inscrever') {
      window.history.pushState(null, '', window.location.pathname + window.location.search);
    }
  };

  const handleOpenCertificate = () => {
    if (!isCertificateAvailableForPublic()) return;
    setManagerCertAttendee(null);
    setIsCertificateOpen(true);
  };

  const handleManagerPreviewCertificate = (attendee: Registration) => {
    setManagerCertAttendee(attendee);
    setIsCertificateOpen(true);
  };

  const handleRecordCertificateDownload = async (
    attendee: Registration,
    method: 'pdf' | 'print'
  ): Promise<void> => {
    // Regra estrita: somente Credenciado (Presente) com certificado oficialmente liberado registra download
    if (attendee.status !== 'presente' || !attendee.certificateIssued) {
      return;
    }

    const nowIso = new Date().toISOString();
    const record: CertificateDownloadRecord = {
      id: `cert-dl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      registrationId: attendee.id,
      code: attendee.code,
      fullName: attendee.fullName,
      cpf: attendee.cpf,
      city: attendee.city,
      professionalRole: attendee.professionalRole,
      institution: attendee.institution,
      downloadedAt: nowIso,
      method
    };

    try {
      await recordCertificateDownloadInDb(attendee, record);

      setCertificateDownloads((prev) => {
        const updated = [record, ...prev];
        saveToStorage(STORAGE_KEYS.CERT_DOWNLOADS, updated);
        return updated;
      });

      const nextRegs = registrationsRef.current.map((r) =>
        r.id === attendee.id && r.status === 'presente' && r.certificateIssued
          ? {
              ...r,
              certificateDownloaded: true,
              certificateDownloadedAt: nowIso,
              certificateDownloadCount: (r.certificateDownloadCount || 0) + 1
            }
          : r
      );
      applyRegistrationsState(nextRegs, { persist: true });
    } catch (err) {
      console.warn('Aviso ao gravar download de certificado no Firestore:', err);
      setFirebaseSyncError('Não foi possível registrar a emissão do certificado no banco de dados.');
    }
  };

  const handleToggleCertificateIssued = async (regId: string): Promise<Registration> => {
    const current = registrationsRef.current.find((r) => r.id === regId);
    if (!current) {
      throw new Error('REGISTRATION_NOT_FOUND');
    }
    if (current.status !== 'presente') {
      throw new Error('PARTICIPANT_NOT_PRESENT');
    }

    const nextReg: Registration = {
      ...current,
      certificateIssued: !current.certificateIssued
    };

    try {
      await persistRegistrationAndPermissionInDb(nextReg);
      const nextRegs = registrationsRef.current.map((r) => (r.id === regId ? nextReg : r));
      applyRegistrationsState(nextRegs, { persist: true });
      setFirebaseSyncError(null);
      return nextReg;
    } catch (err) {
      setFirebaseSyncError('Erro ao salvar permissão de certificado no banco de dados.');
      throw err;
    }
  };

  const handleReleaseAllPresentCertificates = async (): Promise<number> => {
    const changedRegs: Registration[] = registrationsRef.current
      .filter((r) => r.status === 'presente' && !r.certificateIssued)
      .map((r) => ({ ...r, certificateIssued: true }));

    if (changedRegs.length === 0) {
      return 0;
    }

    try {
      await persistMultipleRegistrationsInDb(changedRegs);
      const changedById = new Map(changedRegs.map((r) => [r.id, r]));
      const nextRegs = registrationsRef.current.map((r) => changedById.get(r.id) || r);
      applyRegistrationsState(nextRegs, { persist: true });
      setFirebaseSyncError(null);
      return changedRegs.length;
    } catch (err) {
      setFirebaseSyncError('Erro ao liberar certificados em lote no banco de dados.');
      throw err;
    }
  };

  // Synchronize URL hash (#inscricao / #admin / #certificado?code=... / section anchors) with corresponding view & modals
  useEffect(() => {
    const handleUrlChange = () => {
      const rawHash = window.location.hash || '';
      const hash = rawHash.toLowerCase();
      const search = window.location.search.toLowerCase();
      const pathname = window.location.pathname.toLowerCase();

      if (
        hash === '#inscricao' ||
        hash === '#inscrever' ||
        hash === '#inscricoes' ||
        hash === '#formulario' ||
        search.includes('inscricao') ||
        pathname.endsWith('/inscricao')
      ) {
        setCurrentView('inscricao');
        return;
      }

      if (hash === '#admin' || search.includes('admin')) {
        setCurrentView('admin');
        return;
      }

      if (hash.startsWith('#certificado')) {
        const hashQueryPart = rawHash.includes('?') ? rawHash.split('?')[1] : '';
        const params = new URLSearchParams(hashQueryPart || window.location.search);
        const codeParam = params.get('code')?.trim() || null;
        setCurrentView('public');
        setManagerCertAttendee(null);
        setDeepLinkCertCode(codeParam);
        setIsCertificateOpen(true);
        return;
      }

      setCurrentView('public');
      if (hash && hash.length > 1) {
        const sectionId = rawHash.slice(1).split('?')[0];
        setTimeout(() => {
          document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
        }, 120);
      }
    };

    handleUrlChange();
    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  // Real-time synchronization across browser tabs/windows via storage & BroadcastChannel
  useEffect(() => {
    const syncSliceFromStorage = (changedKey?: string | null) => {
      const fresh = loadStoredData();
      if (!changedKey || changedKey === STORAGE_KEYS.CONFIG) setConfig(fresh.config);
      if (!changedKey || changedKey === STORAGE_KEYS.REGISTRATIONS) {
        applyRegistrationsState(fresh.registrations, { persist: false });
      }
      if (!changedKey || changedKey === STORAGE_KEYS.MATERIALS) setMaterials(fresh.materials);
      if (!changedKey || changedKey === STORAGE_KEYS.POSTS) setPosts(fresh.posts);
      if (!changedKey || changedKey === STORAGE_KEYS.NOTIFICATIONS) setNotifications(fresh.notifications);
      if (!changedKey || changedKey === STORAGE_KEYS.SUBSCRIBERS) {
        applySubscribersTransition(
          (current) =>
            reconcileSubscribersSnapshot(
              fresh.subscribers,
              current,
              confirmedTombstonesRef.current!,
              { source: 'cross_tab_storage', isExhaustive: false },
              getDeletedRegistrationIds()
            ),
          { persist: false }
        );
      }
      if (!changedKey || changedKey === STORAGE_KEYS.EVALUATIONS) setEvaluations(fresh.evaluations);
      if (!changedKey || changedKey === STORAGE_KEYS.OFFLINE_QUEUE) setOfflineQueue(fresh.offlineQueue);
      if (!changedKey || changedKey === STORAGE_KEYS.LAST_REGISTERED) setLastRegistered(fresh.lastRegistered);
      if (!changedKey || changedKey === STORAGE_KEYS.CERT_DOWNLOADS) setCertificateDownloads(fresh.certificateDownloads);
      if (!changedKey || changedKey === STORAGE_KEYS.SPEAKERS) setSpeakers(fresh.speakers);
    };

    const handleStorageEvent = (e: StorageEvent) => {
      syncSliceFromStorage(e.key);
    };

    window.addEventListener('storage', handleStorageEvent);

    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel(REALTIME_CHANNEL_NAME);
        channel.onmessage = (event) => {
          if (event.data?.senderId === TAB_INSTANCE_ID) return;
          syncSliceFromStorage(event.data?.key || null);
        };
      }
    } catch {
      // ignore BroadcastChannel failures
    }

    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      if (channel) {
        try {
          channel.close();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Register service worker only in production; in dev, clear stale SW caches that can block preview updates
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      if (import.meta.env.DEV) {
        navigator.serviceWorker
          .getRegistrations()
          .then((regs) => {
            regs.forEach((reg) => reg.unregister());
          })
          .catch(() => {});
        if ('caches' in window) {
          caches.keys().then((keys) => {
            keys.forEach((k) => caches.delete(k));
          }).catch(() => {});
        }
      } else {
        navigator.serviceWorker
          .register('/sw.js')
          .catch((err) => console.warn('SW registration info:', err));
      }
    }

    const handleOnline = () => {
      setIsOnline(true);
      // Auto-trigger sync if there are pending offline registrations
      syncOfflineQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Sync offline queue to main registrations with genuine atomic persistence
  const syncOfflineQueue = async () => {
    const stored = loadStoredData();
    if (stored.offlineQueue.length === 0) return;
    setIsSyncing(true);

    try {
      const outcome = await synchronizeOfflineRegistrationQueue(
        stored.offlineQueue,
        stored.registrations
      );

      if (outcome.synced.length > 0) {
        applyRegistrationsState(outcome.mergedRegistrations, { persist: true });
        const latestSynced = outcome.synced[0];
        setLastRegistered(latestSynced);
        saveToStorage(STORAGE_KEYS.LAST_REGISTERED, latestSynced);

        const syncedSubs = outcome.syncedEntries
          .filter(
            (entry) =>
              !entry.alreadyExistedOnServer &&
              !entry.subscriberTombstoned &&
              Boolean(entry.registration.acceptEmailNews || entry.registration.acceptWhatsappNews)
          )
          .map((entry): NewsletterSubscriber => {
            const reg = entry.registration;
            return {
              id: buildSubscriberIdFromRegistrationId(reg.id),
              email: (reg.email || '').trim().toLowerCase(),
              name: reg.fullName,
              phone: reg.phone,
              city: reg.city,
              role: reg.professionalRole,
              institution: reg.institution,
              receiveEmail: Boolean(reg.acceptEmailNews),
              receiveWhatsapp: Boolean(reg.acceptWhatsappNews),
              origin: 'inscricao',
              subscribedAt: new Date().toISOString().split('T')[0],
              status: 'active',
              consent: true
            };
          });

        if (syncedSubs.length > 0) {
          const syncedSubIds = new Set(syncedSubs.map((s) => s.id));
          applySubscribersTransition(
            (prev) => [...syncedSubs, ...prev.filter((s) => !syncedSubIds.has(s.id))],
            { persist: true }
          );
        }
      }

      setOfflineQueue(outcome.remainingQueue);
      saveToStorage(STORAGE_KEYS.OFFLINE_QUEUE, outcome.remainingQueue);

      if (outcome.synced.length > 0 && outcome.allSucceeded) {
        sendBrowserNotification(
          'Sincronização Concluída',
          `Todas as ${outcome.synced.length} inscrições realizadas offline foram confirmadas no Firestore.`
        );
      } else if (outcome.remainingQueue.length > 0) {
        const authNote =
          outcome.requiresAdminTriadVerificationCount > 0
            ? ' Verificação remota de duplicidades pré-existentes exige sessão administrativa autorizada; itens mantidos na fila.'
            : '';
        sendBrowserNotification(
          outcome.synced.length > 0 ? 'Sincronização Parcial' : 'Sincronização Pendente',
          `${outcome.synced.length} confirmada(s). ${outcome.remainingQueue.length} permanece(m) pendente(s) na fila sem confirmação.${authNote}`
        );
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Handlers for Registrations with true async persistence verification
  const handleSaveRegistration = async (
    newReg: Registration,
    isQueued: boolean
  ): Promise<{
    status: 'persisted' | 'already_exists' | 'queued' | 'error';
    registration: Registration;
    error?: string;
  }> => {
    const safeNewReg: Registration = {
      ...newReg,
      status: 'confirmada',
      certificateIssued: false,
      checkedInAt: undefined
    };

    if (isQueued) {
      const updatedQueue = [safeNewReg, ...offlineQueue.filter((r) => r.id !== safeNewReg.id)];
      setOfflineQueue(updatedQueue);
      saveToStorage(STORAGE_KEYS.OFFLINE_QUEUE, updatedQueue);
      return { status: 'queued', registration: safeNewReg };
    }

    try {
      const saveRes = await savePublicRegistrationToDb(safeNewReg);
      const confirmedReg: Registration = {
        ...safeNewReg,
        id: saveRes.id,
        code: saveRes.code
      };
      const updated = [
        confirmedReg,
        ...registrationsRef.current.filter(
          (r) => r.id !== confirmedReg.id && r.code !== confirmedReg.code
        )
      ];
      applyRegistrationsState(updated, { persist: true });
      setLastRegistered(confirmedReg);
      saveToStorage(STORAGE_KEYS.LAST_REGISTERED, confirmedReg);

      if (!saveRes.alreadyExisted && (confirmedReg.acceptEmailNews || confirmedReg.acceptWhatsappNews)) {
        const subId = buildSubscriberIdFromRegistrationId(confirmedReg.id);
        const newSub: NewsletterSubscriber = {
          id: subId,
          email: confirmedReg.email,
          name: confirmedReg.fullName,
          phone: confirmedReg.phone,
          city: confirmedReg.city,
          role: confirmedReg.professionalRole,
          institution: confirmedReg.institution,
          receiveEmail: Boolean(confirmedReg.acceptEmailNews),
          receiveWhatsapp: Boolean(confirmedReg.acceptWhatsappNews),
          origin: 'inscricao',
          subscribedAt: new Date().toISOString().split('T')[0],
          status: 'active',
          consent: true
        };
        applySubscribersTransition(
          (prev) => [newSub, ...prev.filter((s) => s.id !== subId)],
          { persist: true }
        );
      }

      return {
        status: saveRes.alreadyExisted ? 'already_exists' : 'persisted',
        registration: confirmedReg
      };
    } catch (err: unknown) {
      console.warn('Falha ao persistir inscrição pública no Firestore:', err);
      let errorMsg = 'Não foi possível gravar sua inscrição no banco de dados do Simpósio.';
      if (err instanceof Error) {
        try {
          if (err.message.startsWith('{')) {
            const parsed = JSON.parse(err.message);
            errorMsg = parsed.error || errorMsg;
          } else {
            errorMsg = err.message;
          }
        } catch {
          errorMsg = err.message;
        }
      }
      return {
        status: 'error',
        registration: safeNewReg,
        error: errorMsg
      };
    }
  };

  const handleToggleCheckIn = async (regId: string): Promise<Registration> => {
    const current = registrationsRef.current.find((r) => r.id === regId);
    if (!current) {
      throw new Error('REGISTRATION_NOT_FOUND');
    }
    const isNowPresent = current.status !== 'presente';
    const nextReg: Registration = {
      ...current,
      status: isNowPresent ? ('presente' as const) : ('confirmada' as const),
      checkedInAt: isNowPresent ? new Date().toISOString() : undefined,
      certificateIssued: isNowPresent
    };

    try {
      await persistRegistrationAndPermissionInDb(nextReg);
      const nextRegs = registrationsRef.current.map((r) => (r.id === regId ? nextReg : r));
      applyRegistrationsState(nextRegs, { persist: true });
      setFirebaseSyncError(null);
      return nextReg;
    } catch (err) {
      setFirebaseSyncError('Erro ao persistir Status & Presença no banco de dados.');
      throw err;
    }
  };

  const handleUpdateRegistrationStatus = async (
    id: string,
    newStatus: 'confirmada' | 'presente' | 'cancelada'
  ): Promise<Registration> => {
    const current = registrationsRef.current.find((r) => r.id === id);
    if (!current) {
      throw new Error('REGISTRATION_NOT_FOUND');
    }
    const isPresent = newStatus === 'presente';
    const nextReg: Registration = {
      ...current,
      status: newStatus,
      checkedInAt: isPresent ? (current.checkedInAt || new Date().toISOString()) : undefined,
      certificateIssued: isPresent
    };

    try {
      await persistRegistrationAndPermissionInDb(nextReg);
      const nextRegs = registrationsRef.current.map((r) => (r.id === id ? nextReg : r));
      applyRegistrationsState(nextRegs, { persist: true });
      setFirebaseSyncError(null);
      return nextReg;
    } catch (err) {
      setFirebaseSyncError('Erro ao persistir Status & Presença no banco de dados.');
      throw err;
    }
  };

  const handleDeleteRegistration = (id: string) => {
    // 1. Permanently register deleted ID so it cannot be resurrected by snapshots or reloads
    addDeletedRegistrationId(id);

    const targetReg = registrationsRef.current.find((r) => r.id === id);

    applyRegistrationsState(
      registrationsRef.current.filter((r) => r.id !== id),
      { persist: true }
    );
    setOfflineQueue((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      saveToStorage(STORAGE_KEYS.OFFLINE_QUEUE, updated);
      return updated;
    });
    setCertificateDownloads((prev) => {
      const updated = prev.filter((d) => d.registrationId !== id);
      saveToStorage(STORAGE_KEYS.CERT_DOWNLOADS, updated);
      return updated;
    });
    const deterministicSubId = buildSubscriberIdFromRegistrationId(id);
    confirmedTombstonesRef.current?.delete(deterministicSubId);
    removeConfirmedSubscriberTombstoneHint(deterministicSubId);
    applySubscribersTransition(
      (prev) => prev.filter((s) => s.id !== deterministicSubId),
      { persist: true }
    );
    const storedLast = loadStoredData().lastRegistered;
    if (lastRegistered?.id === id || storedLast?.id === id) {
      setLastRegistered(null);
      saveToStorage(STORAGE_KEYS.LAST_REGISTERED, null);
    }

    if (targetReg) {
      deleteRegistrationInDb(targetReg).catch((err) => {
        console.warn('Aviso ao excluir inscrição no Firestore:', err);
      });
    }

    if (isSupabaseConfigured()) {
      supabaseRestQuery('registrations', {
        method: 'DELETE',
        query: `id=eq.${id}`
      }).catch(() => {});
    }
  };

  // Handler for Batch Import (Google Forms & Excel) com transação administrativa da tríade e reporte individual
  const handleBatchImportRegistrations = async (
    newBatch: Registration[]
  ): Promise<AdminBatchImportResult> => {
    const baselineRegs = registrations.length > 0 ? registrations : loadStoredData().registrations;
    const existingCpfMap = new Set(
      baselineRegs.map((r) => (r.cpf || '').replace(/\D/g, '')).filter(Boolean)
    );
    const existingEmailMap = new Set(
      baselineRegs.map((r) => (r.email || '').toLowerCase().trim()).filter(Boolean)
    );

    const trulyNew: Registration[] = [];
    const notesUpdatedExisting: Registration[] = [];
    const updatedNotesById = new Map<string, Registration>();

    for (const item of newBatch) {
      const cleanCpf = (item.cpf || '').replace(/\D/g, '');
      const cleanEmail = (item.email || '').toLowerCase().trim();

      const isDuplicate =
        (cleanCpf && existingCpfMap.has(cleanCpf)) ||
        (cleanEmail && existingEmailMap.has(cleanEmail));

      if (!isDuplicate) {
        const normalizedItem: Registration = {
          ...item,
          certificateIssued: item.status === 'presente' ? Boolean(item.certificateIssued) : false
        };
        trulyNew.push(normalizedItem);
        if (cleanCpf) existingCpfMap.add(cleanCpf);
        if (cleanEmail) existingEmailMap.add(cleanEmail);
      } else {
        const existingMatch = baselineRegs.find(
          (e) =>
            (cleanCpf && (e.cpf || '').replace(/\D/g, '') === cleanCpf) ||
            (cleanEmail && (e.email || '').toLowerCase().trim() === cleanEmail)
        );
        if (existingMatch && !existingMatch.notes?.includes('Google Forms')) {
          const annotated: Registration = {
            ...existingMatch,
            notes:
              (existingMatch.notes ? existingMatch.notes + ' | ' : '') +
              'Registrado também via Google Forms'
          };
          notesUpdatedExisting.push(annotated);
          updatedNotesById.set(annotated.id, annotated);
        }
      }
    }

    if (notesUpdatedExisting.length > 0) {
      const nextNotesRegs = registrationsRef.current.map((r) => updatedNotesById.get(r.id) || r);
      applyRegistrationsState(nextNotesRegs, { persist: true });
      persistMultipleRegistrationsInDb(notesUpdatedExisting).catch((err) => {
        console.warn('Aviso ao atualizar observações de inscritos existentes:', err);
      });
    }

    if (trulyNew.length === 0) {
      return {
        totalAttempted: 0,
        confirmedCreated: [],
        confirmedExisting: [],
        failed: [],
        itemResults: []
      };
    }

    try {
      const importResult = await persistAdminImportedRegistrationsWithTriadCheckInDb(trulyNew);
      const confirmedRegs = [...importResult.confirmedCreated, ...importResult.confirmedExisting];

      if (confirmedRegs.length > 0) {
        const seenIds = new Set(registrationsRef.current.map((r) => r.id));
        const toAppend = confirmedRegs.filter((r) => !seenIds.has(r.id));
        const merged = [...registrationsRef.current, ...toAppend];
        applyRegistrationsState(merged, { persist: true });

        const newSubs = importResult.confirmedCreated
          .filter((reg) => Boolean(reg.acceptEmailNews || reg.acceptWhatsappNews))
          .map((reg): NewsletterSubscriber => ({
            id: buildSubscriberIdFromRegistrationId(reg.id),
            email: (reg.email || '').trim().toLowerCase(),
            name: reg.fullName,
            phone: reg.phone,
            city: reg.city,
            role: reg.professionalRole,
            institution: reg.institution,
            receiveEmail: Boolean(reg.acceptEmailNews),
            receiveWhatsapp: Boolean(reg.acceptWhatsappNews),
            origin: 'inscricao',
            subscribedAt: new Date().toISOString().split('T')[0],
            status: 'active',
            consent: true
          }));

        if (newSubs.length > 0) {
          const newSubIds = new Set(newSubs.map((s) => s.id));
          applySubscribersTransition(
            (prev) => [...newSubs, ...prev.filter((s) => !newSubIds.has(s.id))],
            { persist: true }
          );
        }
      }

      if (importResult.failed.length > 0) {
        const failedSummary = importResult.failed
          .map((f) => `${f.fullName} [${f.code}]: ${f.error}`)
          .join(' | ');
        setFirebaseSyncError(
          `Importação parcial: ${confirmedRegs.length} confirmada(s) no Firestore; ${importResult.failed.length} rejeitada(s) sem gravação: ${failedSummary}`
        );
      } else {
        setFirebaseSyncError(null);
      }

      return importResult;
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : String(err);
      const failedResult: AdminBatchImportResult = {
        totalAttempted: trulyNew.length,
        confirmedCreated: [],
        confirmedExisting: [],
        failed: trulyNew.map((r) => ({
          id: r.id,
          code: r.code,
          fullName: r.fullName,
          email: r.email,
          error: reason
        })),
        itemResults: trulyNew.map((r) => ({
          id: r.id,
          code: r.code,
          fullName: r.fullName,
          email: r.email,
          outcome: 'failed',
          error: reason
        }))
      };
      setFirebaseSyncError(
        `Falha na importação administrativa (${trulyNew.length} item(ns) não gravados no Firestore): ${reason}`
      );
      return failedResult;
    }
  };

  // Handlers for Materials
  const handleIncrementDownload = (materialId: string) => {
    let targetMaterial: DownloadMaterial | undefined;
    setMaterials((prev) => {
      const updated = prev.map((m) => {
        if (m.id === materialId) {
          targetMaterial = m;
          return { ...m, downloadsCount: m.downloadsCount + 1 };
        }
        return m;
      });
      saveMaterialsToStorageSafe(updated);
      return updated;
    });

    if (targetMaterial) {
      incrementMaterialDownloadInDb(targetMaterial).catch(() => {});
    }
  };

  // Handlers for Social Wall (confirmação remota obrigatória antes de alterar estado/localStorage)
  const handleAddSocialPost = async (
    post: SocialPost,
    rawImageFile?: File | Blob
  ): Promise<SocialPost> => {
    const persisted = await saveSocialPostToDb(post, rawImageFile);
    setPosts((prev) => {
      const next = [persisted, ...prev.filter((p) => p.id !== persisted.id)].sort(
        (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
      );
      saveToStorage(STORAGE_KEYS.POSTS, sanitizePostsForStorage(next));
      return next;
    });
    return persisted;
  };

  const handleLikePost = async (postId: string): Promise<void> => {
    if (likingPostIdsRef.current.has(postId)) return;
    likingPostIdsRef.current.add(postId);
    try {
      const voterId = await ensureAuthenticatedUser();
      const res = await likeSocialPostInDb(postId, voterId);
      if (!res.success) {
        throw new Error('Não foi possível confirmar sua curtida no servidor.');
      }
      setPosts((prev) => {
        const updated = prev.map((p) =>
          p.id === postId ? { ...p, likes: res.likes, hasLiked: res.hasLiked } : p
        );
        saveToStorage(STORAGE_KEYS.POSTS, sanitizePostsForStorage(updated));
        return updated;
      });
    } finally {
      likingPostIdsRef.current.delete(postId);
    }
  };

  const handleDeletePost = async (postId: string): Promise<void> => {
    await deleteSocialPostInDb(postId);
    addDeletedPostId(postId);
    setPosts((prev) => {
      const updated = prev.filter((p) => p.id !== postId);
      saveToStorage(STORAGE_KEYS.POSTS, sanitizePostsForStorage(updated));
      return updated;
    });
  };

  const handleModeratePost = async (
    postId: string,
    status: 'approved' | 'rejected',
    pinned = false
  ): Promise<void> => {
    await moderateSocialPostInDb(postId, status, pinned);
    const moderatedAt = new Date().toISOString();
    const moderatedBy = firebaseUser?.email || 'admin';
    setPosts((prev) => {
      const updated = prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              status,
              pinned: status === 'approved' ? Boolean(pinned) : false,
              moderatedAt,
              moderatedBy
            }
          : p
      );
      saveToStorage(STORAGE_KEYS.POSTS, sanitizePostsForStorage(updated));
      return updated;
    });
  };

  // Handlers for Notifications & Newsletter
  const handleSendNotification = async (item: PushNotificationItem) => {
    const updated = [item, ...notifications];
    setNotifications(updated);
    saveToStorage(STORAGE_KEYS.NOTIFICATIONS, updated);

    try {
      await saveNotificationToDb(item);
    } catch (err) {
      console.warn('Aviso salvo localmente, falha ao persistir no Firestore:', err);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      saveToStorage(STORAGE_KEYS.NOTIFICATIONS, updated);
      return updated;
    });

    try {
      await deleteNotificationInDb(id);
    } catch (err) {
      console.warn('Erro ao deletar notificação no Firestore:', err);
    }
  };

  const handleSubscribeNewsletter = async (subscriber: NewsletterSubscriber) => {
    return enqueueSubscriberOperation(async () => {
      try {
        const res = await subscribeNewsletterInDb(subscriber);
        applySubscribersTransition(
          (prev) => [
            res.subscriber,
            ...prev.filter((s) => s.id !== res.subscriber.id && s.email !== res.subscriber.email)
          ],
          { persist: true }
        );
      } catch (err) {
        console.warn('Falha ao gravar inscrição na newsletter no Firestore:', err);
        throw err;
      }
    });
  };

  const handleDeleteSubscriber = async (id: string): Promise<void> => {
    return enqueueSubscriberOperation(async () => {
      // 1. Confirmação remota prévia obrigatória via transação atômica no Firestore.
      // Em caso de documento inexistente, sessão não-admin ou erro de rede/lote, lança exceção
      // sem modificar React, subscribersRef, confirmedTombstonesRef nem localStorage.
      const remoteResult = await deleteSubscriberInDb(id);
      const confirmedIso =
        validateStrictIsoTimestamp(remoteResult.tombstoneConfirmedAt) ||
        remoteResult.tombstoneConfirmedAt;
      const confirmedMs = Date.parse(confirmedIso) || Date.now();

      let confirmedTarget: NewsletterSubscriber | null = null;
      const { storageResult } = applySubscribersTransition(
        (currentInMemory) =>
          currentInMemory.map((s) => {
            if (s.id === id) {
              const tombstoned: NewsletterSubscriber = {
                ...s,
                status: 'unsubscribed' as const,
                receiveEmail: false,
                receiveWhatsapp: false,
                unsubscribedAt: confirmedIso
              };
              confirmedTarget = tombstoned;
              return tombstoned;
            }
            return s;
          }),
        { persist: true }
      );

      const fallbackSub: NewsletterSubscriber = confirmedTarget || {
        id,
        email: '',
        subscribedAt: '',
        receiveEmail: false,
        receiveWhatsapp: false,
        status: 'unsubscribed',
        unsubscribedAt: confirmedIso
      };

      // Registra confirmação na memória RAM desta sessão como 'server_verified'
      confirmedTombstonesRef.current?.set(id, {
        subscriber: fallbackSub,
        confirmedAtIso: confirmedIso,
        confirmedAtMs: confirmedMs,
        trustLevel: 'server_verified',
        seenOnAuthoritativeServer: false
      });

      // Persiste hint local após confirmação remota (tratado apenas como 'local_persisted_hint' em recargas)
      addConfirmedSubscriberTombstoneHint(fallbackSub, confirmedIso);

      if (storageResult && !storageResult.persisted) {
        console.warn(
          `[Storage] Tombstone ${id} confirmado no Firestore, mas persistência em localStorage falhou: ${storageResult.error || 'indisponível'}.`
        );
      }
    });
  };

  const handleAddMaterial = async (
    newMaterial: DownloadMaterial,
    onProgress?: (pct: number) => void
  ): Promise<{ cloudSynced: boolean; requiresAuth?: boolean; error?: string; material: DownloadMaterial }> => {
    const nowIso = new Date().toISOString();
    const enriched: DownloadMaterial = {
      ...newMaterial,
      createdAt: newMaterial.createdAt || nowIso,
      updatedAt: nowIso
    };

    if (isVerifiedAdminUser(firebaseUser)) {
      try {
        const cloudSaved = await saveDownloadMaterialToDb(enriched, onProgress);
        setMaterials((prev) => {
          const filtered = prev.filter((m) => m.id !== cloudSaved.id);
          const updated = [cloudSaved, ...filtered];
          saveMaterialsToStorageSafe(updated);
          return updated;
        });
        return { cloudSynced: true, material: cloudSaved };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao enviar PDF para a nuvem.';
        console.warn('Falha ao salvar PDF no Firestore:', err);
        const pendingMat: DownloadMaterial = { ...enriched, pendingCloudSync: true };
        setMaterials((prev) => {
          const updated = [pendingMat, ...prev.filter((m) => m.id !== pendingMat.id)];
          saveMaterialsToStorageSafe(updated);
          return updated;
        });
        return { cloudSynced: false, error: msg, material: pendingMat };
      }
    }

    const localPending: DownloadMaterial = { ...enriched, pendingCloudSync: true };
    let quotaExceeded = false;
    setMaterials((prev) => {
      const updated = [localPending, ...prev.filter((m) => m.id !== localPending.id)];
      const res = saveMaterialsToStorageSafe(updated);
      quotaExceeded = res.quotaFallback;
      return updated;
    });
    return {
      cloudSynced: false,
      requiresAuth: true,
      error: quotaExceeded
        ? 'Arquivo grande demais para o armazenamento local do navegador. Conecte a conta Google do gestor para publicar na nuvem.'
        : undefined,
      material: localPending
    };
  };

  const handleDeleteMaterial = async (materialId: string): Promise<void> => {
    // 1. Immediately record in permanent blacklist so it can never be resurrected by snapshots or reloads
    addDeletedMaterialId(materialId);

    // 2. Direct hard purge from localStorage
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEYS.MATERIALS);
        if (raw) {
          const parsed = JSON.parse(raw) as DownloadMaterial[];
          const cleaned = parsed.filter(
            (m) => m && m.id !== materialId && !isProhibitedPrivateMaterial(m) && m.id !== 'mat-5' && m.id !== 'mat-0'
          );
          localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(cleaned));
        }
        const delSet = getDeletedMaterialIds();
        delSet.add(materialId);
        localStorage.setItem(STORAGE_KEYS.DELETED_MATERIALS, JSON.stringify(Array.from(delSet)));
        broadcastRealtimeUpdate(STORAGE_KEYS.MATERIALS);
        broadcastRealtimeUpdate(STORAGE_KEYS.DELETED_MATERIALS);
      }
    } catch {
      // ignore
    }

    // 3. Optimistically update local React state
    setMaterials((prev) => {
      const updated = prev.filter(
        (m) => m.id !== materialId && !isProhibitedPrivateMaterial(m) && m.id !== 'mat-5' && m.id !== 'mat-0'
      );
      saveMaterialsToStorageSafe(updated);
      return updated;
    });

    // 4. Attempt Firestore cloud deletion (handles both chunked and direct documents)
    try {
      await deleteDownloadMaterialInDb(materialId);
    } catch (err) {
      console.warn('Aviso ao excluir material no Firestore:', err);
    }

    // 5. Attempt Supabase cloud deletion if configured
    if (isSupabaseConfigured()) {
      try {
        await supabaseRestQuery('download_materials', {
          method: 'DELETE',
          query: `id=eq.${materialId}`
        });
      } catch (err) {
        console.warn('Aviso ao excluir material no Supabase:', err);
      }
    }
  };

  const handleSubmitEvaluation = (feedback: EvaluationFeedback) => {
    const updated = [feedback, ...evaluations];
    setEvaluations(updated);
    saveToStorage(STORAGE_KEYS.EVALUATIONS, updated);
  };

  // Event Config Updates (for reuse in future events, certificate & badge design)
  const handleUpdateConfig = async (newConfig: EventConfig): Promise<void> => {
    try {
      await saveEventConfigInDb(newConfig);
      setConfig(newConfig);
      saveToStorage(STORAGE_KEYS.CONFIG, newConfig);
      setFirebaseSyncError(null);
    } catch (err) {
      setFirebaseSyncError('Erro ao salvar configurações do evento no banco de dados.');
      throw err;
    }
  };

  const handleResetConfig = async (): Promise<void> => {
    try {
      await saveEventConfigInDb(INITIAL_EVENT_CONFIG);
      setConfig(INITIAL_EVENT_CONFIG);
      saveToStorage(STORAGE_KEYS.CONFIG, INITIAL_EVENT_CONFIG);
      setFirebaseSyncError(null);
    } catch (err) {
      setFirebaseSyncError('Erro ao restaurar configurações do evento no banco de dados.');
      throw err;
    }
  };

  // Speakers Handlers (fully editable in Admin Dashboard)
  const handleUpdateSpeaker = (updated: SpeakerProfile) => {
    setSpeakers((prev) => {
      const exists = prev.some((s) => s.id === updated.id);
      const next = exists ? prev.map((s) => (s.id === updated.id ? updated : s)) : [...prev, updated];
      saveSpeakersToStorage(next);
      return next;
    });
    if (isVerifiedAdminUser(firebaseUser)) {
      saveSpeakerToDb(updated).catch((err) => {
        console.warn('Aviso ao persistir palestrante no Firestore:', err);
      });
    }
  };

  const handleAddSpeaker = (newSpeaker: SpeakerProfile) => {
    setSpeakers((prev) => {
      const next = [...prev, newSpeaker];
      saveSpeakersToStorage(next);
      return next;
    });
    if (isVerifiedAdminUser(firebaseUser)) {
      saveSpeakerToDb(newSpeaker).catch((err) => {
        console.warn('Aviso ao cadastrar palestrante no Firestore:', err);
      });
    }
  };

  const handleDeleteSpeaker = (speakerId: string) => {
    setSpeakers((prev) => {
      const next = prev.filter((s) => s.id !== speakerId);
      saveSpeakersToStorage(next);
      return next;
    });
    if (isVerifiedAdminUser(firebaseUser)) {
      deleteSpeakerInDb(speakerId).catch((err) => {
        console.warn('Aviso ao excluir palestrante do Firestore:', err);
      });
    }
  };

  const handleResetSpeakers = () => {
    setSpeakers(SPEAKERS_PROFILES);
    saveSpeakersToStorage(SPEAKERS_PROFILES);
    if (isVerifiedAdminUser(firebaseUser)) {
      saveAllSpeakersToDb(SPEAKERS_PROFILES).catch((err) => {
        console.warn('Aviso ao restaurar palestrantes no Firestore:', err);
      });
    }
  };

  const handleShareEvent = () => {
    if (navigator.share) {
      navigator
        .share({
          title: config.editionTitle,
          text: `${config.editionTitle} ${config.regionTitle} - ${config.subtitle}`,
          url: window.location.href
        })
        .catch(() => setIsShareOpen(true));
    } else {
      setIsShareOpen(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#faf8f5] text-slate-800 font-sans">

      {/* Top Header */}
      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        onOpenRegister={handleOpenRegistration}
        editionTitle={config.editionTitle}
        onShare={() => setIsShareOpen(true)}
        onOpenCalendar={() => setIsCalendarOpen(true)}
        onOpenCertificate={handleOpenCertificate}
        onOpenInstallApp={() => setIsInstallAppModalOpen(true)}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        notifications={notifications}
      />

      {/* PWA / WebApp Install Banner: Appears every time someone enters the platform */}
      {currentView === 'public' && (
        <InstallAppBanner
          onOpenInstallModal={() => setIsInstallAppModalOpen(true)}
          deferredPrompt={deferredPrompt}
          onInstallSuccess={() => {
            sendBrowserNotification(
              'WebApp Instalado com Sucesso!',
              'O Simpósio de Saúde Mental Carangola agora está disponível na tela inicial do seu aparelho.'
            );
          }}
        />
      )}

      {/* Live Alert & Notification Banner for Public Portal */}
      {currentView === 'public' && (
        <AlertBanner
          notifications={notifications}
          onOpenCertificate={handleOpenCertificate}
          onOpenRegister={handleOpenRegistration}
        />
      )}

      {/* Main View Router: Direct Dedicated Registration Form vs Public Landing vs Admin Dashboard */}
      {currentView === 'inscricao' ? (
        <main className="flex-1 pb-16">
          <RegistrationModal
            isOpen={true}
            isStandalone={true}
            onClose={handleCloseRegistration}
            onSaveRegistration={handleSaveRegistration}
            onSubscribeNewsletter={handleSubscribeNewsletter}
            totalRegistered={registrations.length + offlineQueue.length}
            existingCodes={[...registrations, ...offlineQueue].map((r) => r.code)}
            config={config}
            isOnline={isOnline}
            existingRegistration={lastRegistered}
            onOpenCalendar={() => setIsCalendarOpen(true)}
            onOpenShare={() => setIsShareOpen(true)}
          />
        </main>
      ) : currentView === 'public' ? (
        <main className="flex-1 pb-20 lg:pb-0">
          {/* Hero Section */}
          <Hero
            config={config}
            totalRegistered={registrations.length + offlineQueue.length}
            onOpenRegister={handleOpenRegistration}
            onShare={() => setIsShareOpen(true)}
            onOpenCalendar={() => setIsCalendarOpen(true)}
          />

          {/* Introdução Oficial do Evento */}
          <EventIntroSection />

          {/* Programação Completa do Evento (Destaque Principal) */}
          <ScheduleSection
            sessions={INITIAL_SCHEDULE}
            axes={THEMATIC_AXES}
            selectedAxisId={selectedAxisFilter}
            onClearAxisFilter={() => setSelectedAxisFilter(undefined)}
            eventTitle={config.editionTitle}
            eventDate={config.eventDate}
            config={config}
          />

          {/* Palestrantes e Mediadores Convidados */}
          <SpeakersSection
            speakers={speakers}
            config={config}
          />

          {/* Eixos Temáticos e Contextualização do Território — OCULTO (descomente para reativar) */}
          {/* <ThematicAxesSection
            axes={THEMATIC_AXES}
            onSelectAxis={(axisId) => {
              setSelectedAxisFilter(axisId);
              const el = document.getElementById('programacao');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
          /> */}

          {/* Downloads & Certificados */}
          <DownloadsSection
            materials={materials}
            onOpenCertificate={handleOpenCertificate}
            onIncrementDownload={handleIncrementDownload}
          />

          {/* Mural Social em Tempo Real */}
          <SocialWall
            posts={posts}
            onAddPost={handleAddSocialPost}
            onLikePost={handleLikePost}
            config={config}
          />

          {/* Mapa do Local do Evento */}
          <EventLocationMap />

          {/* Bottom Mobile Navigation Dock (Thumb-friendly 1-tap navigation for phones & tablets) */}
          <nav
            aria-label="Navegação rápida móvel"
            className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.09)]"
          >
            <div className="max-w-md mx-auto grid grid-cols-5 items-center px-1.5 py-1">
              {/* Início */}
              <button
                type="button"
                onClick={() => {
                  setCurrentView('public');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex flex-col items-center justify-center py-1.5 px-1 text-stone-600 hover:text-[#0a3641] active:scale-95 transition-all cursor-pointer group"
              >
                <Home className="w-5 h-5 text-stone-500 group-hover:text-[#0a3641] transition-colors" />
                <span className="text-[10px] font-bold tracking-tight mt-0.5">Início</span>
              </button>

              {/* Programação */}
              <button
                type="button"
                onClick={() => {
                  if (currentView !== 'public') setCurrentView('public');
                  const el = document.getElementById('programacao');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex flex-col items-center justify-center py-1.5 px-1 text-stone-600 hover:text-[#ea7a38] active:scale-95 transition-all cursor-pointer group"
              >
                <Calendar className="w-5 h-5 text-stone-500 group-hover:text-[#ea7a38] transition-colors" />
                <span className="text-[10px] font-bold tracking-tight mt-0.5">Programa</span>
              </button>

              {/* Inscrição Destacada (Center Elevated Action) */}
              <div className="flex justify-center -mt-4">
                <button
                  type="button"
                  onClick={handleOpenRegistration}
                  className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#d96522] via-[#ea7a38] to-[#f28e52] text-white flex flex-col items-center justify-center shadow-lg shadow-[#ea7a38]/40 active:scale-90 border-2 border-white transition-all cursor-pointer hover:brightness-105"
                  aria-label="Fazer Inscrição Gratuita"
                  title="Fazer Inscrição Gratuita"
                >
                  <UserCheck className="w-4.5 h-4.5 text-white" />
                  <span className="text-[7.5px] font-black uppercase tracking-tight leading-none mt-0.5">INSCREVER</span>
                </button>
              </div>

              {/* Mural Social */}
              <button
                type="button"
                onClick={() => {
                  if (currentView !== 'public') {
                    setCurrentView('public');
                    setTimeout(() => {
                      const el = document.getElementById('mural');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }, 120);
                  } else {
                    const el = document.getElementById('mural');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="flex flex-col items-center justify-center py-1.5 px-1 text-stone-600 hover:text-amber-600 active:scale-95 transition-all cursor-pointer group"
                aria-label="Ir para o Mural Social"
              >
                <MessageSquare className="w-5 h-5 text-stone-500 group-hover:text-amber-600 transition-colors" />
                <span className="text-[10px] font-bold tracking-tight mt-0.5">Mural</span>
              </button>

              {/* Menu (Abre a gaveta completa do portal) */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="flex flex-col items-center justify-center py-1.5 px-1 text-stone-700 hover:text-[#0a3641] active:scale-95 transition-all cursor-pointer group"
                aria-label="Abrir Menu Completo"
              >
                <div className="w-5 h-5 flex items-center justify-center rounded-md bg-[#0a3641] text-white">
                  <Menu className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-black text-[#0a3641] tracking-tight mt-0.5 uppercase">Menu</span>
              </button>
            </div>
          </nav>
        </main>
      ) : (
        /* Admin Manager Portal or Login */
        <main className="flex-1">
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
          {!isAdminAuthenticated ? (
            <AdminLogin
              onLoginSuccess={(rememberMe) => {
                try {
                  sessionStorage.setItem('simposio_admin_auth', 'true');
                  if (rememberMe) {
                    localStorage.setItem('simposio_admin_remember', 'true');
                    localStorage.setItem('simposio_admin_auth', 'true');
                  } else {
                    localStorage.removeItem('simposio_admin_remember');
                    localStorage.removeItem('simposio_admin_auth');
                  }
                  localStorage.removeItem('simposio_admin_logged_out');
                } catch {
                  // ignore
                }
                setIsAdminAuthenticated(true);
              }}
              onBackToPublic={() => {
                setCurrentView('public');
                if (window.location.hash === '#admin') {
                  window.history.pushState(null, '', window.location.pathname + window.location.search);
                }
              }}
              editionTitle={config.editionTitle}
              onGoogleAdminLogin={handleGoogleAdminLoginFromGate}
              googleAuthError={firebaseSyncError}
            />
          ) : (
            <AdminDashboard
              config={config}
              onUpdateConfig={handleUpdateConfig}
              onResetConfig={handleResetConfig}
              speakers={speakers}
              onUpdateSpeaker={handleUpdateSpeaker}
              onAddSpeaker={handleAddSpeaker}
              onDeleteSpeaker={handleDeleteSpeaker}
              onResetSpeakers={handleResetSpeakers}
              registrations={registrations}
              onToggleCheckIn={handleToggleCheckIn}
              onUpdateRegistrationStatus={handleUpdateRegistrationStatus}
              onDeleteRegistration={handleDeleteRegistration}
              onBatchImportRegistrations={handleBatchImportRegistrations}
              notifications={notifications}
              onSendNotification={handleSendNotification}
              onDeleteNotification={handleDeleteNotification}
              subscribers={subscribers}
              onDeleteSubscriber={handleDeleteSubscriber}
              materials={materials}
              onAddMaterial={handleAddMaterial}
              onDeleteMaterial={handleDeleteMaterial}
              socialPosts={posts}
              onDeletePost={handleDeletePost}
              onModeratePost={handleModeratePost}
              onBackToPublic={() => {
                setCurrentView('public');
                if (window.location.hash === '#admin') {
                  window.history.pushState(null, '', window.location.pathname + window.location.search);
                }
              }}
              onLogout={handleAdminLogout}
              certificateDownloads={certificateDownloads}
              onToggleCertificateIssued={handleToggleCertificateIssued}
              onReleaseAllPresentCertificates={handleReleaseAllPresentCertificates}
              onPreviewCertificate={handleManagerPreviewCertificate}
              firebaseSyncState={{
                isConnected: Boolean(firebaseUser),
                userEmail: firebaseUser?.email || null,
                isVerifiedAdmin: isServerAuthorizedAdmin,
                isSyncing: isCloudSyncing,
                error: firebaseSyncError
              }}
              onConnectFirebaseAdmin={handleConnectFirebaseAdmin}
              onDisconnectFirebaseAdmin={handleDisconnectFirebaseAdmin}
              onRefreshRegistrations={handleRefreshRegistrationsFromCloud}
            />
          )}
          </Suspense>
        </main>
      )}

      {/* Footer */}
      <Footer
        config={config}
        onOpenAdmin={() => {
          setCurrentView('admin');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenCertificate={handleOpenCertificate}
        onOpenRegister={handleOpenRegistration}
        onOpenInstallApp={() => setIsInstallAppModalOpen(true)}
      />

      {/* Registration Modal */}
      <RegistrationModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSaveRegistration={handleSaveRegistration}
        onSubscribeNewsletter={handleSubscribeNewsletter}
        totalRegistered={registrations.length + offlineQueue.length}
        existingCodes={[...registrations, ...offlineQueue].map((r) => r.code)}
        config={config}
        isOnline={isOnline}
        existingRegistration={lastRegistered}
        onOpenCalendar={() => setIsCalendarOpen(true)}
        onOpenShare={() => setIsShareOpen(true)}
      />

      {/* Certificate Validation Modal */}
      <CertificateModal
        isOpen={isCertificateOpen}
        onClose={() => {
          setIsCertificateOpen(false);
          setManagerCertAttendee(null);
          setDeepLinkCertCode(null);
        }}
        registrations={registrations}
        config={config}
        initialAttendee={managerCertAttendee}
        initialSearchCode={deepLinkCertCode}
        allowManagerAccess={Boolean(managerCertAttendee || (currentView === 'admin' && isAdminAuthenticated))}
        onRecordDownload={handleRecordCertificateDownload}
      />

      {/* Add To Calendar Modal */}
      <AddToCalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        config={config}
      />

      {/* Share / Divulgação Modal */}
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        config={config}
      />

      {/* WebApp Download / Install Modal */}
      <InstallAppModal
        isOpen={isInstallAppModalOpen}
        onClose={() => setIsInstallAppModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onInstallSuccess={() => {
          sendBrowserNotification(
            'WebApp Instalado com Sucesso!',
            'O Simpósio de Saúde Mental Carangola agora está disponível na tela inicial do seu aparelho.'
          );
        }}
      />

    </div>
  );
}
