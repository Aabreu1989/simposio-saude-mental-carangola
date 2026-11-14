/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  EventConfig,
  Registration,
  DownloadMaterial,
  SocialPost,
  PushNotificationItem,
  NewsletterSubscriber,
  EvaluationFeedback,
  CertificateDownloadRecord
} from './types.ts';
import { UserCheck, Sparkles, Home, Calendar, FileDown, Menu, MessageSquare } from 'lucide-react';
import { THEMATIC_AXES, INITIAL_SCHEDULE, INITIAL_EVENT_CONFIG, SPEAKERS_PROFILES, INITIAL_MATERIALS } from './data/initialData.ts';
import {
  loadStoredData,
  saveToStorage,
  saveMaterialsToStorageSafe,
  STORAGE_KEYS,
  REALTIME_CHANNEL_NAME,
  sendBrowserNotification,
  isCertificateAvailableForPublic,
  getDeletedMaterialIds,
  addDeletedMaterialId,
  getDeletedRegistrationIds,
  addDeletedRegistrationId,
  getDeletedPostIds,
  addDeletedPostId
} from './utils/helpers.ts';
import { isSupabaseConfigured, supabaseRestQuery } from './services/supabaseClient.ts';
import {
  testFirestoreConnection,
  subscribeAuthState,
  signInFirestoreAdmin,
  signOutFirestoreAdmin,
  isVerifiedAdminUser,
  seedInitialDataIfNeeded,
  savePublicRegistrationToDb,
  persistRegistrationAndPermissionInDb,
  persistMultipleRegistrationsInDb,
  deleteRegistrationInDb,
  recordCertificateDownloadInDb,
  saveEventConfigInDb,
  subscribeEventConfig,
  subscribeAdminRegistrations,
  subscribeCertificateDownloads,
  saveDownloadMaterialToDb,
  deleteDownloadMaterialInDb,
  incrementMaterialDownloadInDb,
  subscribeDownloadMaterials,
  PRIMARY_ADMIN_EMAIL,
  getStoredLocalAdmin,
  createLocalAdminSession,
  type FirebaseAdminUser
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
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { AdminLogin } from './components/AdminLogin.tsx';
import { AddToCalendarModal } from './components/AddToCalendarModal.tsx';
import { ShareModal } from './components/ShareModal.tsx';
import { EventLocationMap } from './components/EventLocationMap.tsx';
import { AlertBanner } from './components/AlertBanner.tsx';

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
  const initialData = loadStoredData();

  // App State - 'public' landing, 'inscricao' direct form view, 'admin' dashboard
  const [currentView, setCurrentView] = useState<'public' | 'admin' | 'inscricao'>(getInitialView);
  const [config, setConfig] = useState<EventConfig>(initialData.config);
  const [registrations, setRegistrations] = useState<Registration[]>(initialData.registrations);
  const [materials, setMaterials] = useState<DownloadMaterial[]>(initialData.materials);
  const [posts, setPosts] = useState<SocialPost[]>(initialData.posts);
  const [notifications, setNotifications] = useState<PushNotificationItem[]>(initialData.notifications);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>(initialData.subscribers);
  const [evaluations, setEvaluations] = useState<EvaluationFeedback[]>(initialData.evaluations);
  const [offlineQueue, setOfflineQueue] = useState<Registration[]>(initialData.offlineQueue);
  const [lastRegistered, setLastRegistered] = useState<Registration | null>(initialData.lastRegistered);
  const [certificateDownloads, setCertificateDownloads] = useState<CertificateDownloadRecord[]>(initialData.certificateDownloads);

  // Connectivity state
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Firebase Firestore auth & cloud sync state (Authorized official manager: farmaciademinas.marketing@gmail.com)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAdminUser | null>(() => {
    return getStoredLocalAdmin() || createLocalAdminSession(PRIMARY_ADMIN_EMAIL);
  });
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [firebaseSyncError, setFirebaseSyncError] = useState<string | null>(null);

  // Modals state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);
  const [deepLinkCertCode, setDeepLinkCertCode] = useState<string | null>(null);
  const [managerCertAttendee, setManagerCertAttendee] = useState<Registration | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [selectedAxisFilter, setSelectedAxisFilter] = useState<string | undefined>(undefined);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Google Maps Quota Handling (Demo Key)
  const [isMapsQuotaExceeded, setIsMapsQuotaExceeded] = useState(false);
  useEffect(() => {
    const handler = () => setIsMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handler);
    return () => window.removeEventListener('gmp-quota-exceeded', handler);
  }, []);

  // Firestore Boot Connection Test & Global Config + Auth Subscriptions
  useEffect(() => {
    testFirestoreConnection().catch((err) => {
      console.warn('Firestore connection test info:', err);
    });

    const unsubConfig = subscribeEventConfig((remoteCfg) => {
      setConfig((prev) => {
        const merged: EventConfig = {
          ...prev,
          ...remoteCfg,
          emailJsConfig: remoteCfg.emailJsConfig || prev.emailJsConfig,
          certificateDesign: {
            ...INITIAL_CERTIFICATE_DESIGN,
            ...(prev.certificateDesign || {}),
            ...(remoteCfg.certificateDesign || {})
          },
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
      const validRemote = remoteMaterials.filter((m) => !deletedIds.has(m.id) && !m.deleted);

      setMaterials((prev) => {
        const remoteIds = new Set(validRemote.map((m) => m.id));
        const localOnly = prev.filter((m) => !remoteIds.has(m.id) && !deletedIds.has(m.id));
        const missingInitials = INITIAL_MATERIALS.filter(
          (m) => !remoteIds.has(m.id) && !localOnly.some((l) => l.id === m.id) && !deletedIds.has(m.id)
        );

        // Put remote materials (including PDFs uploaded via admin) and local admin uploads first
        const allList = [...validRemote, ...localOnly, ...missingInitials].filter(
          (item) => !deletedIds.has(item.id)
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
      setFirebaseUser(user);
      if (user && !isVerifiedAdminUser(user)) {
        setFirebaseSyncError(
          `A conta ${user.email || 'conectada'} não é o gestor autorizado (farmaciademinas.marketing@gmail.com).`
        );
      } else {
        setFirebaseSyncError(null);
      }
    });

    return () => {
      unsubConfig();
      unsubMaterials();
      unsubAuth();
    };
  }, []);

  // Subscribe to Firestore registrations & downloads when verified admin is connected
  useEffect(() => {
    if (!isVerifiedAdminUser(firebaseUser)) return;

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

    const unsubRegs = subscribeAdminRegistrations((remoteRegs) => {
      if (!isActive || remoteRegs.length === 0) return;
      const deletedRegIds = getDeletedRegistrationIds();
      const validRemote = remoteRegs.filter((r) => !deletedRegIds.has(r.id));
      setRegistrations(validRemote);
      saveToStorage(STORAGE_KEYS.REGISTRATIONS, validRemote);
    });

    const unsubDownloads = subscribeCertificateDownloads((remoteDownloads) => {
      if (!isActive) return;
      setCertificateDownloads(remoteDownloads);
      saveToStorage(STORAGE_KEYS.CERT_DOWNLOADS, remoteDownloads);
    });

    return () => {
      isActive = false;
      unsubRegs();
      unsubDownloads();
    };
  }, [firebaseUser]);

  const handleConnectFirebaseAdmin = async () => {
    setFirebaseSyncError(null);
    setIsCloudSyncing(true);
    try {
      const user = await signInFirestoreAdmin();
      if (user) {
        if (!isVerifiedAdminUser(user)) {
          setFirebaseSyncError(
            `Conta ${user.email || 'selecionada'} sem permissão de gestor. Faça login com farmaciademinas.marketing@gmail.com.`
          );
        } else {
          setFirebaseUser(user);
          setFirebaseSyncError(null);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha na autenticação Google.';
      setFirebaseSyncError(message);
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleDisconnectFirebaseAdmin = async () => {
    try {
      await signOutFirestoreAdmin();
      setFirebaseUser(null);
    } catch (err) {
      console.warn('Erro ao desconectar Firebase Auth:', err);
    }
  };

  // Admin authentication state: By default, keep logged in as authorized single manager during development,
  // but if the manager explicitly clicks "Encerrar Sessão / Sair", prompt the login screen.
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const explicitLogout = localStorage.getItem('simposio_admin_logged_out');
        if (explicitLogout === 'true') {
          return false;
        }
        return true;
      } catch {
        return true;
      }
    }
    return true;
  });

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    try {
      localStorage.setItem('simposio_admin_logged_out', 'true');
      sessionStorage.removeItem('simposio_admin_auth');
      localStorage.removeItem('simposio_admin_auth');
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

  const handleRecordCertificateDownload = (attendee: Registration, method: 'pdf' | 'print') => {
    // Regra estrita: somente Credenciado (Presente) pode baixar/registrar certificado
    if (attendee.status !== 'presente') {
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

    setCertificateDownloads((prev) => {
      const updated = [record, ...prev];
      saveToStorage(STORAGE_KEYS.CERT_DOWNLOADS, updated);
      return updated;
    });

    setRegistrations((prev) => {
      const updated = prev.map((r) =>
        r.id === attendee.id && r.status === 'presente'
          ? {
              ...r,
              certificateIssued: true,
              certificateDownloaded: true,
              certificateDownloadedAt: nowIso,
              certificateDownloadCount: (r.certificateDownloadCount || 0) + 1
            }
          : r
      );
      saveToStorage(STORAGE_KEYS.REGISTRATIONS, updated);
      return updated;
    });

    recordCertificateDownloadInDb(attendee, record).catch((err) => {
      console.warn('Aviso ao gravar download de certificado no Firestore:', err);
    });
  };

  const handleToggleCertificateIssued = (regId: string) => {
    let changedReg: Registration | null = null;
    setRegistrations((prev) => {
      const updated = prev.map((r) => {
        if (r.id === regId) {
          // Estrito: participantes que ainda constam como Fazer Check-in ou Cancelada nunca podem liberar certificado
          const nextIssued = r.status === 'presente' ? !r.certificateIssued : false;
          changedReg = { ...r, certificateIssued: nextIssued };
          return changedReg;
        }
        return r;
      });
      saveToStorage(STORAGE_KEYS.REGISTRATIONS, updated);
      return updated;
    });

    if (changedReg) {
      persistRegistrationAndPermissionInDb(changedReg).catch((err) => {
        setFirebaseSyncError('Erro ao salvar permissão de certificado no banco de dados.');
        console.warn(err);
      });
    }
  };

  const handleReleaseAllPresentCertificates = (): number => {
    let releasedCount = 0;
    const changedRegs: Registration[] = [];
    setRegistrations((prev) => {
      const updated = prev.map((r) => {
        if (r.status === 'presente' && !r.certificateIssued) {
          releasedCount += 1;
          const nextReg = { ...r, certificateIssued: true };
          changedRegs.push(nextReg);
          return nextReg;
        }
        return r;
      });
      saveToStorage(STORAGE_KEYS.REGISTRATIONS, updated);
      return updated;
    });

    if (changedRegs.length > 0) {
      persistMultipleRegistrationsInDb(changedRegs).catch((err) => {
        console.warn('Erro ao liberar certificados em lote no Firestore:', err);
      });
    }

    return releasedCount;
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
      if (!changedKey || changedKey === STORAGE_KEYS.REGISTRATIONS) setRegistrations(fresh.registrations);
      if (!changedKey || changedKey === STORAGE_KEYS.MATERIALS) setMaterials(fresh.materials);
      if (!changedKey || changedKey === STORAGE_KEYS.POSTS) setPosts(fresh.posts);
      if (!changedKey || changedKey === STORAGE_KEYS.NOTIFICATIONS) setNotifications(fresh.notifications);
      if (!changedKey || changedKey === STORAGE_KEYS.SUBSCRIBERS) setSubscribers(fresh.subscribers);
      if (!changedKey || changedKey === STORAGE_KEYS.EVALUATIONS) setEvaluations(fresh.evaluations);
      if (!changedKey || changedKey === STORAGE_KEYS.OFFLINE_QUEUE) setOfflineQueue(fresh.offlineQueue);
      if (!changedKey || changedKey === STORAGE_KEYS.LAST_REGISTERED) setLastRegistered(fresh.lastRegistered);
      if (!changedKey || changedKey === STORAGE_KEYS.CERT_DOWNLOADS) setCertificateDownloads(fresh.certificateDownloads);
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

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync offline queue to main registrations
  const syncOfflineQueue = () => {
    const queued = loadStoredData().offlineQueue;
    if (queued.length === 0) return;
    setIsSyncing(true);

    setTimeout(() => {
      setRegistrations((prev) => {
        const merged = [...queued, ...prev];
        saveToStorage(STORAGE_KEYS.REGISTRATIONS, merged);
        return merged;
      });
      setOfflineQueue([]);
      saveToStorage(STORAGE_KEYS.OFFLINE_QUEUE, []);
      setIsSyncing(false);

      sendBrowserNotification(
        'Sincronização Concluída',
        'As inscrições realizadas em modo offline foram enviadas com sucesso ao SUS Carangola.'
      );
    }, 1200);
  };

  // Handlers for Registrations
  const handleSaveRegistration = (newReg: Registration, isQueued: boolean) => {
    const safeNewReg: Registration = {
      ...newReg,
      status: 'confirmada',
      certificateIssued: false,
      checkedInAt: undefined
    };
    if (isQueued) {
      const updatedQueue = [safeNewReg, ...offlineQueue];
      setOfflineQueue(updatedQueue);
      saveToStorage(STORAGE_KEYS.OFFLINE_QUEUE, updatedQueue);
    } else {
      const updated = [safeNewReg, ...registrations];
      setRegistrations(updated);
      saveToStorage(STORAGE_KEYS.REGISTRATIONS, updated);
      savePublicRegistrationToDb(safeNewReg).catch((err) => {
        console.warn('Aviso ao persistir inscrição no Firestore:', err);
      });
    }
    setLastRegistered(safeNewReg);
    saveToStorage(STORAGE_KEYS.LAST_REGISTERED, safeNewReg);
  };

  const handleToggleCheckIn = (regId: string) => {
    let updatedTarget: Registration | null = null;
    setRegistrations((prev) => {
      const updated = prev.map((r) => {
        if (r.id === regId) {
          const isNowPresent = r.status !== 'presente';
          updatedTarget = {
            ...r,
            status: isNowPresent ? ('presente' as const) : ('confirmada' as const),
            checkedInAt: isNowPresent ? new Date().toISOString() : undefined,
            certificateIssued: isNowPresent
          };
          return updatedTarget;
        }
        return r;
      });
      saveToStorage(STORAGE_KEYS.REGISTRATIONS, updated);
      return updated;
    });

    if (updatedTarget) {
      persistRegistrationAndPermissionInDb(updatedTarget).catch((err) => {
        setFirebaseSyncError('Erro ao persistir Status & Presença no banco de dados.');
        console.warn(err);
      });
    }
  };

  const handleUpdateRegistrationStatus = (id: string, newStatus: 'confirmada' | 'presente' | 'cancelada') => {
    let updatedTarget: Registration | null = null;
    setRegistrations((prev) => {
      const updated = prev.map((r) => {
        if (r.id === id) {
          const isPresent = newStatus === 'presente';
          updatedTarget = {
            ...r,
            status: newStatus,
            checkedInAt: isPresent ? (r.checkedInAt || new Date().toISOString()) : undefined,
            certificateIssued: isPresent
          };
          return updatedTarget;
        }
        return r;
      });
      saveToStorage(STORAGE_KEYS.REGISTRATIONS, updated);
      return updated;
    });

    if (updatedTarget) {
      persistRegistrationAndPermissionInDb(updatedTarget).catch((err) => {
        setFirebaseSyncError('Erro ao persistir Status & Presença no banco de dados.');
        console.warn(err);
      });
    }
  };

  const handleDeleteRegistration = (id: string) => {
    // 1. Permanently register deleted ID so it cannot be resurrected by snapshots or reloads
    addDeletedRegistrationId(id);

    const targetReg = registrations.find((r) => r.id === id);

    setRegistrations((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      saveToStorage(STORAGE_KEYS.REGISTRATIONS, updated);
      return updated;
    });
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

  // Handler for Batch Import (Google Forms & Excel)
  const handleBatchImportRegistrations = (newBatch: Registration[]) => {
    let persistedList: Registration[] = [];
    setRegistrations((prev) => {
      const existingCpfMap = new Set(
        prev.map((r) => (r.cpf || '').replace(/\D/g, '')).filter(Boolean)
      );
      const existingEmailMap = new Set(
        prev.map((r) => (r.email || '').toLowerCase().trim()).filter(Boolean)
      );

      const trulyNew: Registration[] = [];
      const updatedExisting = [...prev];

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
          // If already exists, annotate note without duplicating record
          const idx = updatedExisting.findIndex(
            (e) =>
              (cleanCpf && (e.cpf || '').replace(/\D/g, '') === cleanCpf) ||
              (cleanEmail && (e.email || '').toLowerCase().trim() === cleanEmail)
          );
          if (idx !== -1 && !updatedExisting[idx].notes?.includes('Google Forms')) {
            updatedExisting[idx] = {
              ...updatedExisting[idx],
              notes: (updatedExisting[idx].notes ? updatedExisting[idx].notes + ' | ' : '') + 'Registrado também via Google Forms'
            };
          }
        }
      }

      const merged = [...updatedExisting, ...trulyNew];
      persistedList = trulyNew;
      saveToStorage(STORAGE_KEYS.REGISTRATIONS, merged);
      return merged;
    });

    if (persistedList.length > 0) {
      persistMultipleRegistrationsInDb(persistedList).catch((err) => {
        console.warn('Aviso ao importar lote para Firestore:', err);
      });
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

  // Handlers for Social Wall
  const handleAddSocialPost = (post: SocialPost) => {
    const updated = [post, ...posts];
    setPosts(updated);
    saveToStorage(STORAGE_KEYS.POSTS, updated);
  };

  const handleLikePost = (postId: string) => {
    setPosts((prev) => {
      const updated = prev.map((p) => {
        if (p.id === postId) {
          const hasLiked = !p.hasLiked;
          return {
            ...p,
            hasLiked,
            likes: hasLiked ? p.likes + 1 : Math.max(0, p.likes - 1)
          };
        }
        return p;
      });
      saveToStorage(STORAGE_KEYS.POSTS, updated);
      return updated;
    });
  };

  const handleDeletePost = (postId: string) => {
    addDeletedPostId(postId);
    setPosts((prev) => {
      const updated = prev.filter((p) => p.id !== postId);
      saveToStorage(STORAGE_KEYS.POSTS, updated);
      return updated;
    });

    if (isSupabaseConfigured()) {
      supabaseRestQuery('social_posts', {
        method: 'DELETE',
        query: `id=eq.${postId}`
      }).catch(() => {});
    }
  };

  // Handlers for Notifications & Newsletter
  const handleSendNotification = (item: PushNotificationItem) => {
    const updated = [item, ...notifications];
    setNotifications(updated);
    saveToStorage(STORAGE_KEYS.NOTIFICATIONS, updated);
  };

  const handleSubscribeNewsletter = (subscriber: NewsletterSubscriber) => {
    const updated = [subscriber, ...subscribers];
    setSubscribers(updated);
    saveToStorage(STORAGE_KEYS.SUBSCRIBERS, updated);
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

    // 2. Optimistically update local React state
    setMaterials((prev) => {
      const updated = prev.filter((m) => m.id !== materialId);
      saveMaterialsToStorageSafe(updated);
      return updated;
    });

    // 3. Attempt Firestore cloud deletion (handles both chunked and direct documents)
    try {
      await deleteDownloadMaterialInDb(materialId);
    } catch (err) {
      console.warn('Aviso ao excluir material no Firestore:', err);
    }

    // 4. Attempt Supabase cloud deletion if configured
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
  const handleUpdateConfig = (newConfig: EventConfig) => {
    setConfig(newConfig);
    saveToStorage(STORAGE_KEYS.CONFIG, newConfig);
    saveEventConfigInDb(newConfig).catch((err) => {
      console.warn('Aviso ao persistir configurações no Firestore:', err);
    });
  };

  const handleResetConfig = () => {
    setConfig(INITIAL_EVENT_CONFIG);
    saveToStorage(STORAGE_KEYS.CONFIG, INITIAL_EVENT_CONFIG);
    saveEventConfigInDb(INITIAL_EVENT_CONFIG).catch((err) => {
      console.warn('Aviso ao restaurar configurações no Firestore:', err);
    });
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
      
      {/* Google Maps Demo Quota Notification Banner */}
      {isMapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Top Header */}
      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        onOpenRegister={handleOpenRegistration}
        editionTitle={config.editionTitle}
        onShare={() => setIsShareOpen(true)}
        onOpenCalendar={() => setIsCalendarOpen(true)}
        onOpenCertificate={handleOpenCertificate}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        notifications={notifications}
      />

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
            speakers={SPEAKERS_PROFILES}
            config={config}
          />

          {/* Eixos Temáticos e Contextualização do Território */}
          <ThematicAxesSection
            axes={THEMATIC_AXES}
            onSelectAxis={(axisId) => {
              setSelectedAxisFilter(axisId);
              const el = document.getElementById('programacao');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
          />

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
          {!isAdminAuthenticated ? (
            <AdminLogin
              onLoginSuccess={() => {
                try {
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
            />
          ) : (
            <AdminDashboard
              config={config}
              onUpdateConfig={handleUpdateConfig}
              onResetConfig={handleResetConfig}
              registrations={registrations}
              onToggleCheckIn={handleToggleCheckIn}
              onUpdateRegistrationStatus={handleUpdateRegistrationStatus}
              onDeleteRegistration={handleDeleteRegistration}
              onBatchImportRegistrations={handleBatchImportRegistrations}
              notifications={notifications}
              onSendNotification={handleSendNotification}
              subscribers={subscribers}
              materials={materials}
              onAddMaterial={handleAddMaterial}
              onDeleteMaterial={handleDeleteMaterial}
              socialPosts={posts}
              onDeletePost={handleDeletePost}
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
                isVerifiedAdmin: isVerifiedAdminUser(firebaseUser),
                isSyncing: isCloudSyncing,
                error: firebaseSyncError
              }}
              onConnectFirebaseAdmin={handleConnectFirebaseAdmin}
              onDisconnectFirebaseAdmin={handleDisconnectFirebaseAdmin}
            />
          )}
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

    </div>
  );
}
