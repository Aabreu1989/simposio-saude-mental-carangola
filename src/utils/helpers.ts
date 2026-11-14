import html2pdf from 'html2pdf.js';
import { Registration, EventConfig, DownloadMaterial, SocialPost, PushNotificationItem, NewsletterSubscriber, EvaluationFeedback, CertificateDownloadRecord, CertificateDesignConfig, BadgeDesignConfig } from '../types.ts';
import { INITIAL_EVENT_CONFIG, INITIAL_CERTIFICATE_DESIGN, INITIAL_BADGE_DESIGN, INITIAL_REGISTRATIONS, INITIAL_MATERIALS, INITIAL_SCHEDULE, THEMATIC_AXES, INITIAL_SOCIAL_POSTS, INITIAL_NOTIFICATIONS, INITIAL_SUBSCRIBERS, INITIAL_EVALUATIONS, DEFAULT_EVENT_HASHTAGS } from '../data/initialData.ts';
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
  DELETED_POSTS: 'carangola_sm_deleted_posts'
};

export const getDeletedMaterialIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_MATERIALS);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};

export const addDeletedMaterialId = (id: string): void => {
  try {
    const set = getDeletedMaterialIds();
    set.add(id);
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

export const loadStoredData = () => {
  const getItem = <T>(key: string, defaultValue: T): T => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const loadedConfig = getItem<EventConfig>(STORAGE_KEYS.CONFIG, INITIAL_EVENT_CONFIG);
  let configChanged = false;
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
    configChanged = true;
  }
  if (!loadedConfig.certificateDesign) {
    loadedConfig.certificateDesign = { ...INITIAL_CERTIFICATE_DESIGN };
    configChanged = true;
  } else {
    loadedConfig.certificateDesign = {
      ...INITIAL_CERTIFICATE_DESIGN,
      ...loadedConfig.certificateDesign,
      showBannerImage: false,
      bannerImageUrl: '',
      footerQuote: '',
      badgeLabel: '',
      mainTitle: 'CERTIFICADO',
      primaryColor: '#0a3641',
      accentColor: '#ea7a38',
      secondaryColor: '#028090',
      backgroundColor: '#ffffff'
    };
    configChanged = true;
  }
  if (!loadedConfig.badgeDesign) {
    loadedConfig.badgeDesign = { ...INITIAL_BADGE_DESIGN };
    configChanged = true;
  } else {
    loadedConfig.badgeDesign = {
      ...INITIAL_BADGE_DESIGN,
      ...loadedConfig.badgeDesign
    };
  }
  if (!loadedConfig.bannerImage || loadedConfig.bannerImage.includes('WhatsApp_Image')) {
    loadedConfig.bannerImage = '/assets/banner-oficial-simposio-saude-mental-carangola.jpg';
    configChanged = true;
  }
  if (
    loadedConfig.certificateDesign &&
    (!loadedConfig.certificateDesign.bannerImageUrl ||
      loadedConfig.certificateDesign.bannerImageUrl.includes('WhatsApp_Image'))
  ) {
    loadedConfig.certificateDesign.bannerImageUrl =
      '/assets/banner-oficial-simposio-saude-mental-carangola.jpg';
    configChanged = true;
  }
  if (configChanged) {
    saveToStorage(STORAGE_KEYS.CONFIG, loadedConfig);
  }

  const deletedMatIds = getDeletedMaterialIds();
  const loadedMaterials = getItem<DownloadMaterial[]>(STORAGE_KEYS.MATERIALS, INITIAL_MATERIALS)
    .filter((m) => !deletedMatIds.has(m.id));
  const officialIds = new Set(INITIAL_MATERIALS.map((m) => m.id));
  const countsById = new Map(loadedMaterials.map((m) => [m.id, m.downloadsCount || 0]));

  // Keep any custom documents uploaded via the Admin Panel (unless explicitly deleted)
  const adminMaterials = loadedMaterials.filter(
    (m) =>
      !officialIds.has(m.id) &&
      !deletedMatIds.has(m.id) &&
      m.id !== 'mat-6' &&
      (Boolean(m.createdAt) ||
        m.fileUrl?.startsWith('firestore-chunked://') ||
        Boolean(m.chunkCount && m.chunkCount > 0) ||
        m.id.length > 8)
  );

  const syncedMaterials: DownloadMaterial[] = [
    ...INITIAL_MATERIALS
      .filter((initMat) => !deletedMatIds.has(initMat.id))
      .map((initMat) => ({
        ...initMat,
        downloadsCount: Math.max(initMat.downloadsCount, countsById.get(initMat.id) || 0)
      })),
    ...adminMaterials
  ].filter((m) => !deletedMatIds.has(m.id));

  const hasDiff =
    loadedMaterials.length !== syncedMaterials.length ||
    loadedMaterials.some((m, idx) => {
      const target = syncedMaterials[idx];
      return !target || target.id !== m.id || target.fileUrl !== m.fileUrl || target.title !== m.title;
    });

  if (hasDiff) {
    saveToStorage(STORAGE_KEYS.MATERIALS, syncedMaterials);
  }

  const deletedPostIds = getDeletedPostIds();
  const rawPosts = getItem<SocialPost[]>(STORAGE_KEYS.POSTS, INITIAL_SOCIAL_POSTS)
    .filter((p) => !deletedPostIds.has(p.id));
  const existingIds = new Set(rawPosts.map((p) => p.id));
  const legacyOnly =
    rawPosts.length <= 4 &&
    rawPosts.every((p) => ['post-1', 'post-2', 'post-3', 'post-4'].includes(p.id)) &&
    rawPosts.some((p) => p.pinned);

  let postsChanged = false;
  let mergedPosts: SocialPost[];

  if (legacyOnly) {
    // Upgrade legacy 4-post cache cleanly to the 8 newest-first paginated posts, keeping likes count/state when matched
    const legacyByContent = new Map(rawPosts.map((p) => [p.authorName, p]));
    mergedPosts = INITIAL_SOCIAL_POSTS
      .filter((freshPost) => !deletedPostIds.has(freshPost.id))
      .map((freshPost) => {
        const prev = legacyByContent.get(freshPost.authorName);
        if (prev) {
          return {
            ...freshPost,
            likes: Math.max(freshPost.likes, prev.likes),
            hasLiked: Boolean(prev.hasLiked)
          };
        }
        return freshPost;
      });
    postsChanged = true;
  } else {
    mergedPosts = rawPosts.map((post, index) => {
      const needsHashtags = !post.hashtags || !post.hashtags.trim();
      const needsTimestamp = typeof post.timestamp !== 'number';
      if (needsHashtags || needsTimestamp) {
        postsChanged = true;
      }
      return {
        ...post,
        hashtags: needsHashtags ? DEFAULT_EVENT_HASHTAGS : post.hashtags,
        timestamp: needsTimestamp ? Date.now() - (index + 1) * 600000 : post.timestamp
      };
    });

    // If user didn't add extra initial posts yet and has < 5 posts, append missing seeded posts with older timestamps
    if (existingIds.size < INITIAL_SOCIAL_POSTS.length) {
      const missingSeeds = INITIAL_SOCIAL_POSTS.filter((sp) => !existingIds.has(sp.id) && !deletedPostIds.has(sp.id));
      if (missingSeeds.length > 0 && rawPosts.length <= 5) {
        mergedPosts = [...mergedPosts, ...missingSeeds];
        postsChanged = true;
      }
    }
  }

  mergedPosts = mergedPosts.filter((p) => !deletedPostIds.has(p.id));
  mergedPosts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  if (postsChanged) {
    saveToStorage(STORAGE_KEYS.POSTS, mergedPosts);
  }

  const deletedRegIds = getDeletedRegistrationIds();
  const rawRegistrations = getItem<Registration[]>(STORAGE_KEYS.REGISTRATIONS, INITIAL_REGISTRATIONS)
    .filter((r) => !deletedRegIds.has(r.id));
  let registrationsNormalized = false;
  const normalizedRegistrations = rawRegistrations.map((reg) => {
    // Regra estrita: somente participantes credenciados ('presente') podem ter certificado liberado
    if (reg.status !== 'presente' && reg.certificateIssued) {
      registrationsNormalized = true;
      return {
        ...reg,
        certificateIssued: false
      };
    }
    return reg;
  });
  if (registrationsNormalized) {
    saveToStorage(STORAGE_KEYS.REGISTRATIONS, normalizedRegistrations);
  }

  return {
    config: loadedConfig,
    registrations: normalizedRegistrations,
    materials: syncedMaterials,
    posts: mergedPosts,
    notifications: getItem<PushNotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS),
    subscribers: getItem<NewsletterSubscriber[]>(STORAGE_KEYS.SUBSCRIBERS, INITIAL_SUBSCRIBERS),
    evaluations: getItem<EvaluationFeedback[]>(STORAGE_KEYS.EVALUATIONS, INITIAL_EVALUATIONS),
    offlineQueue: getItem<Registration[]>(STORAGE_KEYS.OFFLINE_QUEUE, []),
    lastRegistered: getItem<Registration | null>(STORAGE_KEYS.LAST_REGISTERED, null),
    certificateDownloads: getItem<CertificateDownloadRecord[]>(STORAGE_KEYS.CERT_DOWNLOADS, [])
  };
};

export const REALTIME_CHANNEL_NAME = 'simposio_sus_realtime';

export const broadcastRealtimeUpdate = (key: string) => {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(REALTIME_CHANNEL_NAME);
      channel.postMessage({ key, timestamp: Date.now() });
      channel.close();
    }
  } catch {
    // ignore BroadcastChannel errors in restricted contexts
  }
};

export const saveToStorage = (key: string, data: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    broadcastRealtimeUpdate(key);
  } catch (err) {
    console.error('Error saving to localStorage', err);
  }
};

export const saveMaterialsToStorageSafe = (materials: DownloadMaterial[]): { savedFull: boolean; quotaFallback: boolean } => {
  const sanitized = materials.map((mat) => {
    // Materials already stored in Firestore chunks do not need large base64 strings cached locally
    if (mat.fileUrl?.startsWith('data:') && !mat.pendingCloudSync && mat.chunkCount && mat.chunkCount > 0) {
      return {
        ...mat,
        fileUrl: `firestore-chunked://${mat.id}`
      };
    }
    return mat;
  });

  try {
    localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(sanitized));
    broadcastRealtimeUpdate(STORAGE_KEYS.MATERIALS);
    return { savedFull: true, quotaFallback: false };
  } catch {
    // QuotaExceededError fallback: strip large data: payloads so metadata list survives reload
    try {
      const compact = sanitized.map((mat) => {
        if (mat.fileUrl?.startsWith('data:') && mat.fileUrl.length > 200000) {
          return {
            ...mat,
            fileUrl: mat.chunkCount ? `firestore-chunked://${mat.id}` : '#'
          };
        }
        return mat;
      });
      localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(compact));
      broadcastRealtimeUpdate(STORAGE_KEYS.MATERIALS);
    } catch (innerErr) {
      console.error('Error saving compact materials to localStorage', innerErr);
    }
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

export const generateRegistrationCode = (
  count: number,
  existingCodes: string[] = []
): string => {
  const knownCodes = new Set<string>(existingCodes.map((c) => c.toUpperCase()));
  try {
    const storedRegs = localStorage.getItem(STORAGE_KEYS.REGISTRATIONS);
    if (storedRegs) {
      (JSON.parse(storedRegs) as Array<{ code?: string }>).forEach((r) => {
        if (r?.code) knownCodes.add(r.code.toUpperCase());
      });
    }
    const storedQueue = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    if (storedQueue) {
      (JSON.parse(storedQueue) as Array<{ code?: string }>).forEach((r) => {
        if (r?.code) knownCodes.add(r.code.toUpperCase());
      });
    }
  } catch {
    // ignore storage read error
  }

  let maxNum = count;
  knownCodes.forEach((code) => {
    const match = code.match(/(\d+)$/);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (!Number.isNaN(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    }
  });

  let nextNum = maxNum + 1;
  let candidate = `CAR-SM-${nextNum.toString().padStart(3, '0')}`;
  while (knownCodes.has(candidate)) {
    nextNum += 1;
    candidate = `CAR-SM-${nextNum.toString().padStart(3, '0')}`;
  }
  return candidate;
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
    const html2pdfLib = (html2pdf as any)?.default || html2pdf;
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

