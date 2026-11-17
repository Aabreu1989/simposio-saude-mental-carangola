import { Registration, EventConfig, DownloadMaterial, SocialPost, PushNotificationItem, NewsletterSubscriber, EvaluationFeedback, CertificateDownloadRecord, CertificateDesignConfig, BadgeDesignConfig, SpeakerProfile } from '../types.ts';
import { INITIAL_EVENT_CONFIG, INITIAL_CERTIFICATE_DESIGN, INITIAL_BADGE_DESIGN, INITIAL_REGISTRATIONS, INITIAL_MATERIALS, INITIAL_SCHEDULE, THEMATIC_AXES, INITIAL_SOCIAL_POSTS, INITIAL_NOTIFICATIONS, INITIAL_SUBSCRIBERS, INITIAL_EVALUATIONS, DEFAULT_EVENT_HASHTAGS, SPEAKERS_PROFILES } from '../data/initialData.ts';
import { generateScheduleHTML, openSchedulePDFWindow } from './schedulePdfGenerator.ts';
import { fetchChunkedMaterialBlobUrl } from '../services/firebaseDb.ts';

const STORAGE_KEYS = {
  CONFIG: 'carangola_sm_config',
  REGISTRATIONS: 'carangola_sm_registrations',
  MATERIALS: 'carangola_sm_materials',
  POSTS: 'carangola_sm_posts',
  NOTIFICATIONS: 'carangola_sm_notifications',
  SUBSCRIBERS: 'carangola_sm_subscribers',
  EVALUATIONS: 'carangola_sm_evaluations',
  OFFLINE_QUEUE: 'carangola_sm_offline_queue',
  LAST_REGISTERED: 'carangola_sm_last_registered',
  CERT_DOWNLOADS: 'carangola_sm_cert_downloads',
  DELETED_MATERIALS: 'carangola_sm_deleted_materials',
  DELETED_REGISTRATIONS: 'carangola_sm_deleted_registrations',
  DELETED_POSTS: 'carangola_sm_deleted_posts',
  SPEAKERS: 'carangola_sm_speakers'
};

export const isProhibitedPrivateMaterial = (m?: Partial<DownloadMaterial> | null): boolean => {
  if (!m) return false;
  if (m.id === 'mat-5' || m.id === 'mat-0') return true;
  const title = (m.title || '').toLowerCase();
  const fileName = (m.fileName || '').toLowerCase();
  const fileUrl = (m.fileUrl || '').toLowerCase();
  const description = (m.description || '').toLowerCase();
  return (
    title.includes('cessão de uso') ||
    title.includes('cessao de uso') ||
    title.includes('termo de responsabilidade') ||
    fileName.includes('termo-de-responsabilidade') ||
    fileName.includes('cessao-de-uso') ||
    fileUrl.includes('termo-responsabilidade') ||
    description.includes('termo oficial de cessão') ||
    description.includes('cessão e responsabilidade de uso do auditório')
  );
};

export const getDeletedMaterialIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_MATERIALS);
    const set = new Set<string>(raw ? JSON.parse(raw) : []);
    set.add('mat-0');
    set.add('mat-5');
    return set;
  } catch {
    return new Set(['mat-0', 'mat-5']);
  }
};

export const addDeletedMaterialId = (id: string): void => {
  try {
    const set = getDeletedMaterialIds();
    set.add(id);
    set.add('mat-0');
    set.add('mat-5');
    localStorage.setItem(STORAGE_KEYS.DELETED_MATERIALS, JSON.stringify(Array.from(set)));
    broadcastRealtimeUpdate(STORAGE_KEYS.DELETED_MATERIALS);
  } catch (err) {
    console.error('Error persisting deleted material id:', err);
  }
};

export const getDeletedRegistrationIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_REGISTRATIONS);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};

export const addDeletedRegistrationId = (id: string): void => {
  try {
    const set = getDeletedRegistrationIds();
    set.add(id);
    localStorage.setItem(STORAGE_KEYS.DELETED_REGISTRATIONS, JSON.stringify(Array.from(set)));
    broadcastRealtimeUpdate(STORAGE_KEYS.DELETED_REGISTRATIONS);
  } catch (err) {
    console.error('Error persisting deleted registration id:', err);
  }
};

export const getDeletedPostIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_POSTS);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};

export const addDeletedPostId = (id: string): void => {
  try {
    const set = getDeletedPostIds();
    set.add(id);
    localStorage.setItem(STORAGE_KEYS.DELETED_POSTS, JSON.stringify(Array.from(set)));
    broadcastRealtimeUpdate(STORAGE_KEYS.DELETED_POSTS);
  } catch (err) {
    console.error('Error persisting deleted post id:', err);
  }
};

// In-memory store for large base64 material blobs so localStorage stays <50KB and never freezes the UI thread
const inMemoryMaterialBlobs = new Map<string, string>();

export const TAB_INSTANCE_ID = `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const loadStoredData = () => {
  const getItem = <T>(key: string, defaultValue: T): T => {
    try {
      if (typeof localStorage === 'undefined') return defaultValue;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const loadedConfig = getItem<EventConfig>(STORAGE_KEYS.CONFIG, INITIAL_EVENT_CONFIG);
  if (
    !loadedConfig.locationName ||
    loadedConfig.locationName !== 'UEMG Carangola' ||
    !loadedConfig.locationAddress ||
    loadedConfig.locationAddress.includes('Pedro de Oliveira') ||
    loadedConfig.eventHours === '8h30 às 16h'
  ) {
    loadedConfig.locationName = 'UEMG Carangola';
    loadedConfig.locationAddress = 'Praça Cel. Maximiano, 180 - Centro, Carangola - MG, 36800-000';
    loadedConfig.eventHours = '7h30 às 16h30';
  }
  loadedConfig.certificateDesign = {
    ...INITIAL_CERTIFICATE_DESIGN,
    ...(loadedConfig.certificateDesign || {}),
    showBannerImage: false,
    bannerImageUrl:
      loadedConfig.certificateDesign?.bannerImageUrl &&
      !loadedConfig.certificateDesign.bannerImageUrl.includes('WhatsApp_Image')
        ? loadedConfig.certificateDesign.bannerImageUrl
        : '/assets/banner-oficial-simposio-saude-mental-carangola.jpg',
    footerQuote: '',
    badgeLabel: '',
    mainTitle: 'CERTIFICADO',
    primaryColor: '#0a3641',
    accentColor: '#ea7a38',
    secondaryColor: '#028090',
    backgroundColor: '#ffffff'
  };
  loadedConfig.badgeDesign = {
    ...INITIAL_BADGE_DESIGN,
    ...(loadedConfig.badgeDesign || {})
  };
  if (!loadedConfig.bannerImage || loadedConfig.bannerImage.includes('WhatsApp_Image')) {
    loadedConfig.bannerImage = '/assets/banner-oficial-simposio-saude-mental-carangola.jpg';
  }

  const deletedMatIds = getDeletedMaterialIds();
  deletedMatIds.add('mat-0');
  deletedMatIds.add('mat-5');

  const rawStoredMaterials = getItem<DownloadMaterial[]>(STORAGE_KEYS.MATERIALS, INITIAL_MATERIALS);
  const storedMaterials = (rawStoredMaterials || []).filter(
    (m) => m && !deletedMatIds.has(m.id) && !isProhibitedPrivateMaterial(m) && m.id !== 'mat-5' && m.id !== 'mat-0'
  );

  // If local storage contains mat-5 or any private prohibited material from a previous session, clean it out immediately
  if (
    typeof localStorage !== 'undefined' &&
    (rawStoredMaterials || []).some((m) => m && (isProhibitedPrivateMaterial(m) || m.id === 'mat-5' || m.id === 'mat-0'))
  ) {
    try {
      localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(storedMaterials));
      const delSet = getDeletedMaterialIds();
      delSet.add('mat-5');
      delSet.add('mat-0');
      localStorage.setItem(STORAGE_KEYS.DELETED_MATERIALS, JSON.stringify(Array.from(delSet)));
    } catch {
      // ignore
    }
  }

  const existingStoredMatIds = new Set((storedMaterials || []).map((m) => m?.id));
  const missingInitialMaterials = INITIAL_MATERIALS.filter(
    (m) =>
      m &&
      !existingStoredMatIds.has(m.id) &&
      !deletedMatIds.has(m.id) &&
      !isProhibitedPrivateMaterial(m) &&
      m.id !== 'mat-5' &&
      m.id !== 'mat-0'
  );
  const combinedMaterials = [...missingInitialMaterials, ...(storedMaterials || [])];
  let hadHugeInlineBlobInStorage = false;

  const syncedMaterials = combinedMaterials
    .filter(
      (m) =>
        m &&
        !deletedMatIds.has(m.id) &&
        !isProhibitedPrivateMaterial(m) &&
        m.id !== 'mat-0' &&
        m.id !== 'mat-5' &&
        m.fileUrl !== '#'
    )
    .map((m) => {
      if (m.fileUrl?.startsWith('data:') && m.fileUrl.length > 100000) {
        hadHugeInlineBlobInStorage = true;
        inMemoryMaterialBlobs.set(m.id, m.fileUrl);
        return m;
      }
      if (m.fileUrl?.startsWith('in-memory-blob://') && inMemoryMaterialBlobs.has(m.id)) {
        return { ...m, fileUrl: inMemoryMaterialBlobs.get(m.id)! };
      }
      return m;
    });

  // If previous sessions left a multi-megabyte PDF in localStorage, compact it once without broadcasting
  if (hadHugeInlineBlobInStorage && typeof localStorage !== 'undefined') {
    try {
      const compactForDisk = syncedMaterials.map((m) =>
        m.fileUrl?.startsWith('data:') && m.fileUrl.length > 100000
          ? {
              ...m,
              fileUrl: m.chunkCount ? `firestore-chunked://${m.id}` : `in-memory-blob://${m.id}`
            }
          : m
      );
      localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(compactForDisk));
    } catch {
      // ignore storage errors
    }
  }

  const deletedPostIds = getDeletedPostIds();
  const storedPosts = getItem<SocialPost[]>(STORAGE_KEYS.POSTS, INITIAL_SOCIAL_POSTS) || [];
  const storedIds = new Set(storedPosts.map((p) => p.id));
  const missingInitialPosts = INITIAL_SOCIAL_POSTS.filter(
    (sp) => !storedIds.has(sp.id) && !deletedPostIds.has(sp.id)
  );
  const rawPosts = [...storedPosts, ...missingInitialPosts].filter(
    (p) => p && !deletedPostIds.has(p.id)
  );
  const mergedPosts: SocialPost[] = rawPosts
    .map((post, index) => ({
      ...post,
      hashtags: post.hashtags?.trim() ? post.hashtags : DEFAULT_EVENT_HASHTAGS,
      timestamp: typeof post.timestamp === 'number' ? post.timestamp : Date.now() - (index + 1) * 600000
    }))
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  saveToStorage(STORAGE_KEYS.POSTS, mergedPosts);

  const EXAMPLE_REG_IDS = new Set([
    'reg-001','reg-002','reg-003','reg-004','reg-005',
    'reg-006','reg-007','reg-008','reg-009','reg-010','reg-011'
  ]);
  const deletedRegIds = getDeletedRegistrationIds();
  const rawRegistrations = getItem<Registration[]>(STORAGE_KEYS.REGISTRATIONS, [])
    .filter((r) => r && !deletedRegIds.has(r.id) && !EXAMPLE_REG_IDS.has(r.id));
  const normalizedRegistrations = rawRegistrations.map((reg) =>
    reg.status !== 'presente' && reg.certificateIssued
      ? { ...reg, certificateIssued: false }
      : reg
  );

  const LEGACY_NOTIF_IDS = new Set(['notif-1', 'notif-2', 'notif-3']);
  const notifications = getItem<PushNotificationItem[]>(
    STORAGE_KEYS.NOTIFICATIONS,
    INITIAL_NOTIFICATIONS
  ).filter((n) => n && !LEGACY_NOTIF_IDS.has(n.id));

  const rawStoredSpeakers = getItem<SpeakerProfile[]>(STORAGE_KEYS.SPEAKERS, SPEAKERS_PROFILES);
  const officialIds = new Set(SPEAKERS_PROFILES.map((s) => s.id));
  const customStoredSpeakers = (rawStoredSpeakers || []).filter((s) => s && !officialIds.has(s.id));
  const syncedSpeakers = [
    ...SPEAKERS_PROFILES.map((initialMatch) => {
      const stored = (rawStoredSpeakers || []).find((s) => s.id === initialMatch.id);
      return {
        ...initialMatch,
        photoUrl: stored?.photoUrl || initialMatch.photoUrl,
        photoPosition: stored?.photoPosition || initialMatch.photoPosition,
        socials: {
          ...initialMatch.socials,
          ...(stored?.socials || {})
        }
      };
    }),
    ...customStoredSpeakers
  ];

  return {
    config: loadedConfig,
    registrations: normalizedRegistrations,
    materials: syncedMaterials,
    posts: mergedPosts,
    notifications,
    subscribers: getItem<NewsletterSubscriber[]>(STORAGE_KEYS.SUBSCRIBERS, INITIAL_SUBSCRIBERS),
    evaluations: getItem<EvaluationFeedback[]>(STORAGE_KEYS.EVALUATIONS, INITIAL_EVALUATIONS),
    offlineQueue: getItem<Registration[]>(STORAGE_KEYS.OFFLINE_QUEUE, []),
    lastRegistered: getItem<Registration | null>(STORAGE_KEYS.LAST_REGISTERED, null),
    certificateDownloads: getItem<CertificateDownloadRecord[]>(STORAGE_KEYS.CERT_DOWNLOADS, []),
    speakers: syncedSpeakers
  };
};

export const REALTIME_CHANNEL_NAME = 'simposio_sus_realtime';

export const broadcastRealtimeUpdate = (key: string) => {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(REALTIME_CHANNEL_NAME);
      channel.postMessage({ key, senderId: TAB_INSTANCE_ID, timestamp: Date.now() });
      channel.close();
    }
  } catch {
    // ignore BroadcastChannel errors in restricted contexts
  }
};

export const saveSpeakersToStorage = (speakers: SpeakerProfile[]): void => {
  try {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.SPEAKERS, JSON.stringify(speakers));
    } catch {
      const compact = speakers.map((spk) => {
        if (spk.photoUrl && spk.photoUrl.startsWith('data:') && spk.photoUrl.length > 80000) {
          const initialMatch = SPEAKERS_PROFILES.find((p) => p.id === spk.id);
          return { ...spk, photoUrl: initialMatch?.photoUrl || '' };
        }
        return spk;
      });
      localStorage.setItem(STORAGE_KEYS.SPEAKERS, JSON.stringify(compact));
    }
    broadcastRealtimeUpdate(STORAGE_KEYS.SPEAKERS);
  } catch (err) {
    console.warn('Aviso ao gravar palestrantes em localStorage:', err);
  }
};

export const saveToStorage = (key: string, data: unknown) => {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(data));
    broadcastRealtimeUpdate(key);
  } catch (err) {
    console.warn('Aviso ao gravar em localStorage:', err);
  }
};

export const saveMaterialsToStorageSafe = (materials: DownloadMaterial[]): { savedFull: boolean; quotaFallback: boolean } => {
  const safeMaterials = materials.filter(
    (m) => m && !isProhibitedPrivateMaterial(m) && m.id !== 'mat-5' && m.id !== 'mat-0'
  );
  // Never write multi-megabyte data: URLs to localStorage; cache them in memory so UI stays fast
  const sanitized = safeMaterials.map((mat) => {
    if (mat.fileUrl?.startsWith('data:') && mat.fileUrl.length > 100000) {
      inMemoryMaterialBlobs.set(mat.id, mat.fileUrl);
      return {
        ...mat,
        fileUrl:
          !mat.pendingCloudSync && mat.chunkCount && mat.chunkCount > 0
            ? `firestore-chunked://${mat.id}`
            : `in-memory-blob://${mat.id}`
      };
    }
    return mat;
  });

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(sanitized));
      broadcastRealtimeUpdate(STORAGE_KEYS.MATERIALS);
    }
    return { savedFull: true, quotaFallback: false };
  } catch {
    return { savedFull: false, quotaFallback: true };
  }
};

export const triggerMaterialDownload = async (material: DownloadMaterial): Promise<void> => {
  if (
    material.id === 'mat-0' ||
    material.title.toLowerCase().includes('grade horária') ||
    material.title.toLowerCase().includes('programação completa')
  ) {
    const opened = openSchedulePDFWindow(INITIAL_SCHEDULE, THEMATIC_AXES, INITIAL_EVENT_CONFIG);
    if (!opened) {
      const html = generateScheduleHTML(INITIAL_SCHEDULE, THEMATIC_AXES, INITIAL_EVENT_CONFIG);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'programa_oficial_simposio_saude_mental_carangola.html';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
        URL.revokeObjectURL(url);
      }, 10000);
    }
    return;
  }

  const ext = material.format ? material.format.toLowerCase() : 'pdf';
  const safeSlug = material.title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const downloadFilename = `${safeSlug || 'documento_sus'}.${ext}`;

  if (material.fileUrl && material.fileUrl.startsWith('firestore-chunked://')) {
    const targetId = material.fileUrl.replace('firestore-chunked://', '') || material.id;
    const blobUrl = await fetchChunkedMaterialBlobUrl(targetId, material.mimeType || 'application/pdf');
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = material.fileName || downloadFilename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try {
        if (link.parentNode) link.parentNode.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } catch {
        // ignore cleanup error
      }
    }, 60000);
    return;
  }

  if (
    material.fileUrl &&
    (material.fileUrl.startsWith('data:') ||
      material.fileUrl.startsWith('blob:') ||
      material.fileUrl.startsWith('http') ||
      material.fileUrl.startsWith('/'))
  ) {
    const link = document.createElement('a');
    link.href = material.fileUrl;
    link.download = material.fileName || downloadFilename;
    if (material.fileUrl.startsWith('http')) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try {
        if (link.parentNode) link.parentNode.removeChild(link);
      } catch {
        // ignore
      }
    }, 5000);
    return;
  }

  const docContent = `
========================================================================
SISTEMA ÚNICO DE SAÚDE (SUS) - MINAS GERAIS
SECRETARIA MUNICIPAL DE SAÚDE DE CARANGOLA
1º SIMPÓSIO DE SAÚDE MENTAL DA MICRORREGIÃO DE CARANGOLA
========================================================================

DOCUMENTO TÉCNICO: ${material.title}
CATEGORIA: ${material.category}
FORMATO: ${material.format || 'PDF'}
AUTORIA / EXPEDIÇÃO: ${material.author}
DATA DE PUBLICAÇÃO: Dezembro de 2026

RESUMO TÉCNICO:
${material.description}

DIRETRIZES FUNDAMENTAIS DA RAPS:
1. Universalidade, integralidade e equidade no acesso aos cuidados psicossociais.
2. Desinstitucionalização ativa: garantia do cuidado em liberdade e combate a manicômios.
3. Articulação em Rede: Integração entre a Atenção Primária (ESF/UBS), CAPS, SAMU 192 e Hospital Geral Casa de Caridade de Carangola.
4. Matriciamento sistemático e educação permanente das equipes de saúde.
5. Garantia irrestrita dos Direitos Humanos conforme a Lei Federal 10.216/2001.

Para maiores esclarecimentos: saudemental.carangola@sus.mg.gov.br
Carangola - Minas Gerais - Brasil
========================================================================
  `.trim();

  const blob = new Blob([docContent], { type: 'application/pdf;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = downloadFilename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    try {
      if (link.parentNode) link.parentNode.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  }, 15000);
};

export { STORAGE_KEYS };

export const formatCPF = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

export const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
};

const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export const generateSecureToken = (length = 8): string => {
  const bytes = new Uint8Array(length);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
};

// Standard FIPS 180-4 SHA-256 (synchronous, deterministic across Browser & Node.js)
const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);

export const sha256Hex = (input: string): string => {
  const utf8 = new TextEncoder().encode(input);
  const bitLen = utf8.length * 8;
  const totalBytes = (((utf8.length + 8) >> 6) + 1) << 6;
  const buf = new Uint8Array(totalBytes);
  buf.set(utf8);
  buf[utf8.length] = 0x80;
  const view = new DataView(buf.buffer);
  view.setUint32(totalBytes - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(totalBytes - 4, bitLen >>> 0, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;
  const w = new Uint32Array(64);

  for (let offset = 0; offset < totalBytes; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i += 1) {
      const v0 = w[i - 15];
      const s0 = ((v0 >>> 7) | (v0 << 25)) ^ ((v0 >>> 18) | (v0 << 14)) ^ (v0 >>> 3);
      const v1 = w[i - 2];
      const s1 = ((v1 >>> 17) | (v1 << 15)) ^ ((v1 >>> 19) | (v1 << 13)) ^ (v1 >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i += 1) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((n) => n.toString(16).padStart(8, '0'))
    .join('');
};

export const buildRegistrationId = (existingId?: string): string => {
  const cleanedExisting = (existingId || '').trim();
  if (/^reg-[a-zA-Z0-9_-]{8,120}$/.test(cleanedExisting)) {
    return cleanedExisting;
  }
  return `reg-${Date.now().toString(36)}-${generateSecureToken(10).toLowerCase()}`;
};

export const generateRegistrationCode = (
  _count?: number,
  excludeCodes: string[] = []
): string => {
  const excluded = new Set<string>(excludeCodes.map((c) => c.toUpperCase()));

  // Generate cryptographically random, non-sequential code compliant with ^[A-Z0-9_-]{3,32}$
  // Does not depend on localStorage count or loaded registrations for uniqueness.
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const candidate = `CAR-SM-${generateSecureToken(8)}`;
    if (!excluded.has(candidate)) {
      return candidate;
    }
  }
  return `CAR-SM-${generateSecureToken(10)}`;
};

const operationIdentityMap = new Map<string, { id: string; code: string }>();

export const clearParticipantAttemptCache = (): void => {
  operationIdentityMap.clear();
};

export const getOrCreateParticipantRegistrationIdentity = (
  operationKey: string,
   legacyKeyPart?: string,
  excludeCodes: string[] = [],
  forceNewCode = false
): { id: string; code: string } => {
  // Internal ephemeral in-memory key for idempotency of the active submission operation only.
  // Never persisted publicly or embedded in document IDs/codes.
  const normKey = `${(operationKey || '').trim().toLowerCase()}|${(legacyKeyPart || '').trim().toLowerCase()}`;

  if (!forceNewCode && normKey !== '|') {
    const cached = operationIdentityMap.get(normKey);
    if (cached) {
      return cached;
    }
  }

  const prev = operationIdentityMap.get(normKey);
  const nextExcluded = prev ? [...excludeCodes, prev.code] : excludeCodes;
  const code = generateRegistrationCode(0, nextExcluded);
  const id = prev?.id ? buildRegistrationId(prev.id) : buildRegistrationId();
  const identity = { id, code };
  if (normKey !== '|') {
    operationIdentityMap.set(normKey, identity);
  }
  return identity;
};

export const generateCertificateHash = (code: string, cpf: string): string => {
  const cleanCpf = cpf.replace(/\D/g, '');
  const suffix = cleanCpf.length >= 4 ? cleanCpf.slice(-4) : code.slice(-4);
  return `SUS-MG-${code}-${suffix}-VERIFIED`.toUpperCase();
};

// O evento encerra em 08 de Dezembro de 2026 às 16h30 (horário de Brasília, UTC-3)
export const EVENT_END_ISO = '2026-12-08T16:30:00-03:00';
export const CERTIFICATE_RELEASE_LABEL = '08/12/2026 após as 16h30';

export const isCertificateAvailableForPublic = (nowMs: number = Date.now()): boolean => {
  return nowMs >= new Date(EVENT_END_ISO).getTime();
};

export const getCertificateDesign = (config: EventConfig): CertificateDesignConfig => {
  const merged: CertificateDesignConfig = {
    ...INITIAL_CERTIFICATE_DESIGN,
    ...(config.certificateDesign || {})
  };

  // Enforce official design directives:
  merged.showBannerImage = false;
  merged.bannerImageUrl = '';
  merged.footerQuote = '';
  merged.badgeLabel = '';
  merged.mainTitle = 'CERTIFICADO';
  merged.primaryColor = '#0a3641';
  merged.accentColor = '#ea7a38';
  merged.secondaryColor = '#028090';
  merged.backgroundColor = '#ffffff';

  return merged;
};

export const getBadgeDesign = (config: EventConfig): BadgeDesignConfig => {
  return {
    ...INITIAL_BADGE_DESIGN,
    ...(config.badgeDesign || {})
  };
};

export const formatCertificateBodyText = (template: string, config: EventConfig): string => {
  const eventFullTitle = `${config.editionTitle} ${config.regionTitle}`.trim();
  const workloadLabel = `${config.certificateWorkload} (${config.certificateWorkload === 8 ? 'oito' : config.certificateWorkload}) horas`;
  return (template || INITIAL_CERTIFICATE_DESIGN.bodyTemplate)
    .replace(/\{evento\}/g, eventFullTitle)
    .replace(/\{data\}/g, config.eventFullDate || '08 de Dezembro de 2026')
    .replace(/\{horario\}/g, config.eventHours || '07h30 às 16h30')
    .replace(/\{local\}/g, config.locationName || 'UEMG Carangola')
    .replace(/\{carga_horaria\}/g, workloadLabel);
};

export const exportToCSV = (filename: string, rows: Record<string, unknown>[]) => {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(';'),
    ...rows.map(row =>
      headers
        .map(header => {
          const val = row[header] === undefined || row[header] === null ? '' : String(row[header]);
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(';')
    )
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToExcel = (filename: string, sheetTitle: string, rows: Record<string, unknown>[]) => {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);

  const tableHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
    <!--[if gte mso 9]>
    <xml>
      <x:ExcelWorkbook>
        <x:ExcelWorksheets>
          <x:ExcelWorksheet>
            <x:Name>${sheetTitle.slice(0, 31)}</x:Name>
            <x:WorksheetOptions>
              <x:DisplayGridlines/>
            </x:WorksheetOptions>
          </x:ExcelWorksheet>
        </x:ExcelWorksheets>
      </x:ExcelWorkbook>
    </xml>
    <![endif]-->
    <style>
      th { background-color: #0a3641; color: #ffffff; font-family: Arial, sans-serif; font-size: 11pt; font-weight: bold; padding: 8px; border: 1px solid #000000; }
      td { font-family: Arial, sans-serif; font-size: 10pt; padding: 6px; border: 1px solid #dddddd; }
      tr:nth-child(even) { background-color: #f7f9fa; }
    </style>
  </head>
  <body>
    <table>
      <thead>
        <tr>
          ${headers.map(h => `<th>${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => `
          <tr>
            ${headers.map(h => {
              const val = row[h] === undefined || row[h] === null ? '' : String(row[h]);
              return `<td>${val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`;
            }).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  </body>
  </html>`;

  const blob = new Blob(['\uFEFF' + tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export interface PDFReportTable {
  title: string;
  headers: string[];
  rows: (string | number)[][];
}

export interface PDFReportOptions {
  title: string;
  subtitle?: string;
  categoryBadge?: string;
  summaryStats?: Array<{ label: string; value: string | number }>;
  tables: PDFReportTable[];
  notes?: string;
}

const escapeReportHtml = (value: string | number): string => {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

export const generatePrintablePDFReport = async (opts: PDFReportOptions) => {
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const slugTitle = (opts.title || 'relatorio_simposio_sus')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  const fileName = `${slugTitle}_${new Date().toISOString().split('T')[0]}.pdf`;

  const reportStyles = `
    @page {
      size: A4 portrait;
      margin: 12mm 14mm 14mm 14mm;
    }
    * {
      box-sizing: border-box;
    }
    .sus-pdf-report {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 4px;
      font-size: 9.5pt;
      line-height: 1.4;
      background: #ffffff;
      width: 100%;
    }
    .sus-pdf-report .header {
      border-bottom: 2px solid #0a3641;
      padding-bottom: 10px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }
    .sus-pdf-report .header-badge {
      display: inline-block;
      background: #ea7a38;
      color: #ffffff;
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 3px 8px;
      border-radius: 4px;
      margin-bottom: 4px;
    }
    .sus-pdf-report .header-title {
      font-size: 13.5pt;
      font-weight: 800;
      color: #0a3641;
      margin: 0;
      line-height: 1.2;
    }
    .sus-pdf-report .header-sub {
      font-size: 8.5pt;
      color: #64748b;
      margin-top: 2px;
    }
    .sus-pdf-report .header-meta {
      text-align: right;
      font-size: 7.5pt;
      color: #64748b;
      line-height: 1.35;
      white-space: nowrap;
    }
    .sus-pdf-report .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }
    .sus-pdf-report .stat-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 7px 9px;
      background: #f8fafc;
    }
    .sus-pdf-report .stat-label {
      font-size: 7pt;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
    }
    .sus-pdf-report .stat-value {
      font-size: 12pt;
      font-weight: 800;
      color: #0a3641;
      margin-top: 2px;
    }
    .sus-pdf-report .section-title {
      font-size: 10pt;
      font-weight: 700;
      color: #0a3641;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      margin-top: 14px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }
    .sus-pdf-report table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.8pt;
      margin-bottom: 12px;
      page-break-inside: auto;
    }
    .sus-pdf-report tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    .sus-pdf-report thead {
      display: table-header-group;
    }
    .sus-pdf-report th {
      background: #0a3641;
      color: #ffffff;
      font-weight: 700;
      text-align: left;
      padding: 5px 7px;
      border: 1px solid #0a3641;
      font-size: 7.2pt;
      text-transform: uppercase;
    }
    .sus-pdf-report td {
      padding: 4px 7px;
      border: 1px solid #e2e8f0;
      word-break: break-word;
    }
    .sus-pdf-report tr:nth-child(even) td {
      background: #f8fafc;
    }
    .sus-pdf-report .footer {
      margin-top: 18px;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
      display: flex;
      justify-content: space-between;
      font-size: 7pt;
      color: #94a3b8;
    }
    .sus-pdf-report .signature-area {
      margin-top: 26px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
      page-break-inside: avoid;
    }
    .sus-pdf-report .signature-box {
      border-top: 1px solid #334155;
      text-align: center;
      padding-top: 5px;
      font-size: 7.8pt;
      color: #334155;
    }
  `;

  const reportBodyHtml = `
    <div class="sus-pdf-report">
      <div class="header">
        <div>
          <span class="header-badge">${escapeReportHtml(opts.categoryBadge || 'Relatório Oficial')}</span>
          <h1 class="header-title">${escapeReportHtml(opts.title)}</h1>
          <div class="header-sub">${escapeReportHtml(opts.subtitle || '1º Simpósio de Saúde Mental da Microrregião de Carangola')}</div>
        </div>
        <div class="header-meta">
          <div><strong>Emissão:</strong> ${escapeReportHtml(currentDate)}</div>
          <div><strong>Gestão:</strong> SUS Carangola / RAPS</div>
          <div><strong>Status:</strong> Documento Oficial</div>
        </div>
      </div>

      ${opts.summaryStats && opts.summaryStats.length > 0 ? `
        <div class="stats-grid">
          ${opts.summaryStats.map(s => `
            <div class="stat-card">
              <div class="stat-label">${escapeReportHtml(s.label)}</div>
              <div class="stat-value">${escapeReportHtml(s.value)}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${opts.tables.map(t => `
        <div class="section-title">${escapeReportHtml(t.title)}</div>
        <table>
          <thead>
            <tr>
              ${t.headers.map(h => `<th>${escapeReportHtml(h)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${t.rows.map(row => `
              <tr>
                ${row.map(cell => `<td>${escapeReportHtml(cell)}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      `).join('')}

      ${opts.notes ? `
        <div style="font-size: 7.5pt; color: #64748b; margin-top: 10px; font-style: italic;">
          * ${escapeReportHtml(opts.notes)}
        </div>
      ` : ''}

      <div class="signature-area">
        <div class="signature-box">
          <strong>Coordenação do 1º Simpósio de Saúde Mental</strong><br>
          Secretaria Municipal de Saúde de Carangola - MG
        </div>
        <div class="signature-box">
          <strong>Representante do Colegiado Gestor da RAPS</strong><br>
          Microrregião de Carangola
        </div>
      </div>

      <div class="footer">
        <div>Sistema Único de Saúde (SUS) · Microrregião de Carangola / MG</div>
        <div>Documento gerado automaticamente pela plataforma oficial do simpósio</div>
      </div>
    </div>
  `;

  // Primary: Direct PDF download using html2pdf.js (popup-free & iframe-safe)
  let hostEl: HTMLDivElement | null = null;
  try {
    hostEl = document.createElement('div');
    hostEl.style.position = 'fixed';
    hostEl.style.left = '-10000px';
    hostEl.style.top = '0';
    hostEl.style.width = '760px';
    hostEl.style.background = '#ffffff';
    hostEl.style.zIndex = '-1';
    hostEl.innerHTML = `<style>${reportStyles}</style>${reportBodyHtml}`;
    document.body.appendChild(hostEl);

    const targetEl = hostEl.querySelector('.sus-pdf-report') as HTMLElement | null;
    const html2pdfModule = await import('html2pdf.js');
    const html2pdfLib = (html2pdfModule as any)?.default || html2pdfModule;
    if (targetEl && typeof html2pdfLib === 'function') {
      await html2pdfLib()
        .set({
          margin: [10, 10, 12, 10],
          filename: fileName,
          image: { type: 'jpeg', quality: 0.96 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        })
        .from(targetEl)
        .save();
      return;
    }
  } catch (err) {
    console.warn('html2pdf report export fallback to hidden print iframe:', err);
  } finally {
    if (hostEl && hostEl.parentNode) {
      hostEl.parentNode.removeChild(hostEl);
    }
  }

  // Fallback: Hidden iframe print (no window.open / no alert)
  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${escapeReportHtml(opts.title)}</title><style>${reportStyles}</style></head><body>${reportBodyHtml}</body></html>`);
      doc.close();
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } finally {
          setTimeout(() => {
            if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
          }, 1500);
        }
      }, 300);
    }
  } catch (fallbackErr) {
    console.error('Erro ao gerar relatório PDF:', fallbackErr);
  }
};

export const sendBrowserNotification = async (title: string, body: string, icon?: string) => {
  if (!('Notification' in window)) {
    return false;
  }
  try {
    let permission = Notification.permission;
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }
    if (permission === 'granted') {
      new Notification(title, {
        body,
        icon: icon || '/assets/aistudio/WhatsApp_Image_2026-11-04_at_4.18.58_PM_260a5969.jpeg',
        badge: '/assets/aistudio/WhatsApp_Image_2026-11-04_at_4.18.58_PM_260a5969.jpeg'
      });
      return true;
    }
  } catch (err) {
    console.warn('Browser notification error:', err);
  }
  return false;
};

// ==========================================
// CALENDAR INTEGRATION (Google, Outlook, iCal/Apple)
// ==========================================

export const escapeIcsText = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\n|\r/g, '\\n');
};

export const getCalendarEventData = (config: EventConfig) => {
  // Event: 08 de Dezembro de 2026, 08:30 às 16:00 BRT (UTC-3)
  // In UTC: 2026-12-08 11:30:00 to 19:00:00 UTC
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return {
    title: `${config.editionTitle} ${config.regionTitle}`,
    description: `${config.subtitle}\n\nEixos Temáticos Estratégicos:\n1. Fluxograma da RAPS (Atenção Básica & CAPS)\n2. Hospital Geral, Leitos de Retaguarda e Urgência\n3. Judicialização da Saúde Mental e Cuidado em Liberdade\n\nCertificado oficial SUS de 8 horas.\nLocal: ${config.locationName} - ${config.locationAddress}\nMais informações e inscrições: ${origin}`,
    location: `${config.locationName}, ${config.locationAddress}`,
    startUtc: '20261208T113000Z',
    endUtc: '20261208T190000Z',
    startIsoLocal: '2026-12-08T08:30:00',
    endIsoLocal: '2026-12-08T16:00:00'
  };
};

export const getGoogleCalendarUrl = (config: EventConfig): string => {
  const ev = getCalendarEventData(config);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${ev.startUtc}/${ev.endUtc}`,
    details: ev.description,
    location: ev.location,
    sf: 'true',
    output: 'xml'
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

export const getOutlookCalendarUrl = (config: EventConfig): string => {
  const ev = getCalendarEventData(config);
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    startdt: ev.startIsoLocal,
    enddt: ev.endIsoLocal,
    subject: ev.title,
    body: ev.description,
    location: ev.location
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
};

export const getYahooCalendarUrl = (config: EventConfig): string => {
  const ev = getCalendarEventData(config);
  const params = new URLSearchParams({
    v: '60',
    view: 'd',
    type: '20',
    title: ev.title,
    st: ev.startUtc,
    et: ev.endUtc,
    desc: ev.description,
    in_loc: ev.location
  });
  return `https://calendar.yahoo.com/?${params.toString()}`;
};

export const generateIcsContent = (config: EventConfig): string => {
  const ev = getCalendarEventData(config);
  const uid = `simposio-saude-mental-carangola-${Date.now()}@sus.mg.gov.br`;
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  // Fully RFC 5545 compliant iCalendar string
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SUS Carangola//1º Simposio de Saude Mental//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:1º Simpósio de Saúde Mental de Carangola',
    'X-WR-TIMEZONE:America/Sao_Paulo',
    'BEGIN:VTIMEZONE',
    'TZID:America/Sao_Paulo',
    'X-LIC-LOCATION:America/Sao_Paulo',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0300',
    'TZOFFSETTO:-0300',
    'TZNAME:BRT',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${ev.startUtc}`,
    `DTEND:${ev.endUtc}`,
    `SUMMARY:${escapeIcsText(ev.title)}`,
    `DESCRIPTION:${escapeIcsText(ev.description)}`,
    `LOCATION:${escapeIcsText(ev.location)}`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Lembrete: O 1º Simpósio de Saúde Mental de Carangola é amanhã!',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Lembrete: O Simpósio de Saúde Mental de Carangola começa em 2 horas!',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
};

export interface CalendarActionResult {
  success: boolean;
  mode: 'shared' | 'downloaded' | 'static' | 'cancelled';
  message: string;
}

export const downloadEventICS = async (
  config: EventConfig,
  preferNativeApp = false
): Promise<CalendarActionResult> => {
  const icsContent = generateIcsContent(config);
  const fileName = 'simposio-saude-mental-carangola.ics';

  // 1. Mobile devices: attempt direct calendar opening via Web Share API with File
  // When available (Samsung, Xiaomi, Apple devices), this directly opens the calendar app!
  if (preferNativeApp && typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      if (typeof File !== 'undefined') {
        const file = new File([icsContent], fileName, {
          type: 'text/calendar;charset=utf-8'
        });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${config.editionTitle} ${config.regionTitle}`,
            text: 'Salvar evento do Simpósio de Saúde Mental na agenda'
          });
          return {
            success: true,
            mode: 'shared',
            message: 'Evento enviado para abertura no aplicativo de agenda do aparelho!'
          };
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return {
          success: false,
          mode: 'cancelled',
          message: 'Abertura cancelada.'
        };
      }
      console.warn('Web Share API calendar failed, falling back to download:', err);
    }
  }

  // 2. Standard Client-Side Blob Download with DELAYED RevokeObjectURL (Fixes silent cancel/abort bug)
  try {
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.setAttribute('target', '_blank');
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    // CRITICAL: Keep object URL alive for 60 seconds so browser download manager has time to stream it
    setTimeout(() => {
      try {
        if (link.parentNode) link.parentNode.removeChild(link);
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    }, 60000);

    return {
      success: true,
      mode: 'downloaded',
      message: 'Arquivo .ICS baixado com sucesso! Abra o arquivo para adicionar à sua agenda.'
    };
  } catch (blobErr) {
    console.warn('Blob download error, trying direct static file:', blobErr);
  }

  // 3. Fallback: Direct download from public static file
  try {
    const link = document.createElement('a');
    link.href = `/${fileName}?t=${Date.now()}`;
    link.download = fileName;
    link.setAttribute('target', '_blank');
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try {
        if (link.parentNode) link.parentNode.removeChild(link);
      } catch {
        // ignore
      }
    }, 10000);

    return {
      success: true,
      mode: 'static',
      message: 'Arquivo .ICS baixado diretamente!'
    };
  } catch (staticErr) {
    console.error('All .ics download methods failed:', staticErr);
    return {
      success: false,
      mode: 'static',
      message: 'Não foi possível baixar o arquivo .ics neste navegador.'
    };
  }
};

// ==========================================
// REGISTRATION SHARING HELPERS
// ==========================================

export const getRegistrationShareUrl = (): string => {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.hash = '#inscricao';
  return url.toString();
};

export const getShareContent = (config: EventConfig) => {
  const shareUrl = getRegistrationShareUrl();
  const title = `Participe do ${config.editionTitle} ${config.regionTitle}!`;
  const message = `🧠 *${config.editionTitle} ${config.regionTitle}* (SUS)\n\n📅 *Data:* ${config.eventDate} de 2026 às 07h30\n📍 *Local:* ${config.locationName} - Carangola/MG\n🎓 *Certificado Oficial:* 8 horas gratuitas\n\n📌 *Eixos Temáticos:*\n• Fluxograma da RAPS (Atenção Básica e CAPS)\n• Hospital Geral, leitos de retaguarda e pronto socorro\n• Judicialização e cuidado em liberdade\n\n👉 *Garanta sua vaga gratuita pelo link:* ${shareUrl}`;

  return {
    shareUrl,
    title,
    message,
    whatsappUrl: `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`,
    telegramUrl: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`,
    linkedinUrl: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    twitterUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${title} Inscrições abertas e gratuitas para trabalhadores do SUS:`)}&url=${encodeURIComponent(shareUrl)}`
  };
};

/**
 * Normaliza URLs do Google Drive para endpoints diretos de imagem.
 * Identifica se a URL fornecida é de uma pasta (diretório) ou arquivo direto.
 */
export const normalizeGoogleDriveImageUrl = (
  rawUrl?: string
): { url: string; isDriveFolder: boolean; isDriveFile: boolean } => {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return { url: '', isDriveFolder: false, isDriveFile: false };
  }

  // Detecta pasta do Google Drive (/drive/folders/ID)
  if (trimmed.includes('drive.google.com/drive/folders/') || trimmed.includes('/folders/')) {
    return { url: trimmed, isDriveFolder: true, isDriveFile: false };
  }

  // Detecta link de arquivo do Google Drive (/file/d/ID)
  const fileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch && fileMatch[1]) {
    return {
      url: `https://lh3.googleusercontent.com/d/${fileMatch[1]}`,
      isDriveFolder: false,
      isDriveFile: true
    };
  }

  // Detecta link de arquivo com parâmetro ?id=ID ou &id=ID
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (trimmed.includes('drive.google.com') && idMatch && idMatch[1]) {
    return {
      url: `https://lh3.googleusercontent.com/d/${idMatch[1]}`,
      isDriveFolder: false,
      isDriveFile: true
    };
  }

  return { url: trimmed, isDriveFolder: false, isDriveFile: false };
};


