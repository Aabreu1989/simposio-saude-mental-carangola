import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  Calendar,
  Send,
  Bell,
  Download,
  Settings,
  Search,
  Filter,
  FileSpreadsheet,
  Printer,
  Sparkles,
  BarChart3,
  TrendingUp,
  MapPin,
  Briefcase,
  Layers,
  RefreshCw,
  Mail,
  ShieldCheck,
  Smartphone,
  Eye,
  Heart,
  FileText,
  Trash2,
  Image as ImageIcon,
  MessageCircle,
  Activity,
  Accessibility,
  Upload,
  Plus,
  FileUp,
  Instagram,
  Linkedin,
  Copy,
  Check,
  Share2,
  GraduationCap,
  Building2,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Grid,
  ChevronRight,
  LogOut,
  Award,
  Globe,
  Palette,
  Lock,
  Cloud,
  CloudOff,
  IdCard,
  AlertCircle,
  Loader2,
  Link2,
  X
} from 'lucide-react';
import {
  Registration,
  EventConfig,
  PushNotificationItem,
  NewsletterSubscriber,
  DownloadMaterial,
  SocialPost,
  EvaluationFeedback,
  CertificateDownloadRecord
} from '../types.ts';
import { REGIONAL_CITIES, PROFESSIONAL_ROLES, INITIAL_SCHEDULE } from '../data/initialData.ts';
import {
  exportToCSV,
  exportToExcel,
  generatePrintablePDFReport,
  formatCPF,
  formatPhone,
  sendBrowserNotification,
  triggerMaterialDownload
} from '../utils/helpers.ts';
import {
  sendRegistrationConfirmationEmail,
  buildRegistrationConfirmationEmail,
  sendBroadcastEmailToAttendees
} from '../services/confirmationEmailService.ts';
import {
  formatNotificationWhatsAppMessage,
  formatRegistrationWhatsAppMessage,
  createWhatsAppChatUrl,
  createWhatsAppBroadcastUrl
} from '../utils/whatsapp.ts';
import { BadgeModal } from './BadgeModal.tsx';
import { AdminBadgeDesigner } from './AdminBadgeDesigner.tsx';
import { GmailNotificationHub } from './GmailNotificationHub.tsx';
import { EmailJsSettingsCard } from './EmailJsSettingsCard.tsx';
import { GoogleFormsSyncModal } from './GoogleFormsSyncModal.tsx';
import { RechartsVisualDashboard } from './RechartsVisualDashboard.tsx';
import { AdminCertificateManager } from './AdminCertificateManager.tsx';

export interface FirebaseSyncState {
  isConnected: boolean;
  userEmail: string | null;
  isVerifiedAdmin: boolean;
  isSyncing: boolean;
  error: string | null;
}

interface AdminDashboardProps {
  config: EventConfig;
  onUpdateConfig: (newConfig: EventConfig) => void;
  onResetConfig: () => void;
  registrations: Registration[];
  onToggleCheckIn: (id: string) => void;
  onUpdateRegistrationStatus?: (id: string, newStatus: 'confirmada' | 'presente' | 'cancelada') => void;
  onDeleteRegistration?: (id: string) => void;
  onBatchImportRegistrations?: (imported: Registration[]) => void;
  notifications: PushNotificationItem[];
  onSendNotification: (notif: PushNotificationItem) => void;
  subscribers: NewsletterSubscriber[];
  materials: DownloadMaterial[];
  onAddMaterial?: (
    mat: DownloadMaterial,
    onProgress?: (pct: number) => void
  ) => Promise<{ cloudSynced: boolean; requiresAuth?: boolean; error?: string; material: DownloadMaterial }> | void;
  onDeleteMaterial?: (id: string) => Promise<void> | void;
  socialPosts: SocialPost[];
  onDeletePost?: (id: string) => void;
  evaluations?: EvaluationFeedback[];
  onBackToPublic: () => void;
  onLogout?: () => void;
  certificateDownloads?: CertificateDownloadRecord[];
  onToggleCertificateIssued?: (id: string) => void;
  onReleaseAllPresentCertificates?: () => number;
  onPreviewCertificate?: (attendee: Registration) => void;
  firebaseSyncState?: FirebaseSyncState;
  onConnectFirebaseAdmin?: () => Promise<void>;
  onDisconnectFirebaseAdmin?: () => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  config,
  onUpdateConfig,
  onResetConfig,
  registrations,
  onToggleCheckIn,
  onUpdateRegistrationStatus,
  onDeleteRegistration,
  onBatchImportRegistrations,
  notifications,
  onSendNotification,
  subscribers,
  materials,
  onAddMaterial,
  onDeleteMaterial,
  socialPosts,
  onDeletePost,
  onBackToPublic,
  onLogout,
  certificateDownloads = [],
  onToggleCertificateIssued,
  onReleaseAllPresentCertificates,
  onPreviewCertificate,
  firebaseSyncState,
  onConnectFirebaseAdmin,
  onDisconnectFirebaseAdmin
}) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'attendees' | 'certificates' | 'materials' | 'posts' | 'notifications' | 'subscribers' | 'customizer'>('analytics');
  const [customizerSubView, setCustomizerSubView] = useState<'event' | 'badge'>('event');
  const [isGoogleFormsModalOpen, setIsGoogleFormsModalOpen] = useState(false);
  const [filterOrigin, setFilterOrigin] = useState<'all' | 'portal' | 'google_forms'>('all');
  const [postSearch, setPostSearch] = useState('');
  const [postDeleteNotice, setPostDeleteNotice] = useState<string | null>(null);
  const [postToDelete, setPostToDelete] = useState<SocialPost | null>(null);
  const [attendeeToDelete, setAttendeeToDelete] = useState<Registration | null>(null);
  const [attendeeDeleteNotice, setAttendeeDeleteNotice] = useState<string | null>(null);
  const [analyticsCategoryFilter, setAnalyticsCategoryFilter] = useState<'all' | 'recharts' | 'form_fields' | 'posts'>('all');
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => new Date().toLocaleTimeString('pt-BR'));

  // Materials state
  const [materialSearch, setMaterialSearch] = useState('');
  const [materialCategoryFilter, setMaterialCategoryFilter] = useState('all');
  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<DownloadMaterial | null>(null);
  const [materialNotice, setMaterialNotice] = useState<{ type: 'success' | 'warning'; text: string } | null>(null);
  const [materialError, setMaterialError] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isSavingMaterial, setIsSavingMaterial] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloadingMaterialId, setDownloadingMaterialId] = useState<string | null>(null);

  // New PDF Material Form state
  const [newMaterialForm, setNewMaterialForm] = useState({
    title: '',
    category: 'Fluxograma' as DownloadMaterial['category'],
    format: 'PDF' as DownloadMaterial['format'],
    author: 'Secretaria Municipal de Saúde de Carangola',
    description: '',
    pages: 4,
    size: '1.2 MB',
    fileUrl: '',
    fileName: '',
    externalUrl: ''
  });

  // Light Theme Enforced (Dark theme removed per request)
  const isDarkMode = false;

  // Official SUS styling tokens (Clean, Accessible Light Theme)
  const theme = {
    root: 'bg-[#f7f5f0] text-stone-900',
    header: 'bg-[#0a3641] border-[#0f4b59]',
    card: 'bg-white border-stone-200/90 text-stone-900 shadow-2xs',
    subCard: 'bg-[#faf8f5] border-stone-200 text-stone-800',
    innerTrack: 'bg-stone-100',
    textMuted: 'text-stone-500',
    textHeading: 'text-[#0a3641]',
    tableHead: 'bg-stone-50 border-stone-200 text-stone-600',
    tableRow: 'hover:bg-stone-50 border-stone-100 text-stone-800',
    input: 'bg-white border-stone-300 text-stone-900 focus:ring-[#0a3641]',
    inputModal: 'bg-stone-50 border-stone-300 text-stone-900',
    modalBg: 'bg-white border-stone-200 text-stone-900',
    banner: 'bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-emerald-200/90 text-emerald-950'
  };

  // Search & Filter for Attendees
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [filterCity, setFilterCity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [filterSusCareLevel, setFilterSusCareLevel] = useState('all');

  // Search & Filter for Subscribers (WhatsApp & Newsletter)
  const [subscriberSearch, setSubscriberSearch] = useState('');
  const [subscriberFilter, setSubscriberFilter] = useState<'all' | 'whatsapp' | 'email'>('all');
  const [copiedWhatsappList, setCopiedWhatsappList] = useState(false);
  const [copiedEmailList, setCopiedEmailList] = useState(false);

  // Badge print modal
  const [selectedBadgeAttendee, setSelectedBadgeAttendee] = useState<Registration | null>(null);

  // Resend confirmation email from attendees table
  const [resendingEmailRegId, setResendingEmailRegId] = useState<string | null>(null);
  const [emailResendToast, setEmailResendToast] = useState<{
    success: boolean;
    message: string;
    mailtoHref?: string;
  } | null>(null);

  // Customizer form state
  const [customConfig, setCustomConfig] = useState<EventConfig>({ ...config });
  const [configSavedSuccess, setConfigSavedSuccess] = useState(false);

  // Real-time synchronization when platform data updates in same tab or other tabs
  useEffect(() => {
    setLastSyncTime(new Date().toLocaleTimeString('pt-BR'));
  }, [registrations, socialPosts, materials, subscribers, notifications, certificateDownloads]);

  useEffect(() => {
    setCustomConfig({ ...config });
  }, [config]);

  // Notification composer state
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifCategory, setNotifCategory] = useState<'lembrete' | 'aviso' | 'material' | 'certificado' | 'urgente'>('lembrete');
  const [notifAudience, setNotifAudience] = useState<'todos' | 'inscritos' | 'presentes' | 'profissionais'>('todos');
  const [notifSentNotice, setNotifSentNotice] = useState(false);
  const [notifChannelPortal, setNotifChannelPortal] = useState(true);
  const [notifChannelWhatsapp, setNotifChannelWhatsapp] = useState(true);
  const [notifChannelEmail, setNotifChannelEmail] = useState(false);
  const [isBroadcastingEmail, setIsBroadcastingEmail] = useState(false);
  const [whatsappDispatchModal, setWhatsappDispatchModal] = useState<PushNotificationItem | null>(null);
  const [emailBroadcastNotice, setEmailBroadcastNotice] = useState<string | null>(null);
  const [whatsappSearchFilter, setWhatsappSearchFilter] = useState('');

  // Analytics Math
  const totalRegistrations = registrations.length;
  const checkedInCount = registrations.filter((r) => r.status === 'presente').length;
  const checkInRate = totalRegistrations > 0 ? Math.round((checkedInCount / totalRegistrations) * 100) : 0;
  const totalMaterialsDownloads = materials.reduce((acc, m) => acc + m.downloadsCount, 0);
  const totalSubscribers = subscribers.length;

  // Base microrregion cities (first 9 without 'Outros')
  const microrregionCities = REGIONAL_CITIES.filter((c) => c !== 'Outros');
  const standardRoles = PROFESSIONAL_ROLES.filter((r) => r !== 'Outros');

  // Breakdown by City (guaranteeing 'Outros' option is present)
  const cityCounts = REGIONAL_CITIES.reduce((acc, c) => {
    acc[c] = 0;
    return acc;
  }, {} as Record<string, number>);

  registrations.forEach((reg) => {
    if (microrregionCities.includes(reg.city)) {
      cityCounts[reg.city] = (cityCounts[reg.city] || 0) + 1;
    } else {
      // Any custom municipality outside the 9 microrregion towns or marked 'Outros'
      cityCounts['Outros'] = (cityCounts['Outros'] || 0) + 1;
    }
  });

  const sortedCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]);
  const displayCities = sortedCities.filter(([name, count]) => count > 0 || name === 'Outros');

  // Breakdown by Role (guaranteeing 'Outros' option is present)
  const roleCounts = PROFESSIONAL_ROLES.reduce((acc, r) => {
    acc[r] = 0;
    return acc;
  }, {} as Record<string, number>);

  registrations.forEach((reg) => {
    if (standardRoles.includes(reg.professionalRole)) {
      roleCounts[reg.professionalRole] = (roleCounts[reg.professionalRole] || 0) + 1;
    } else {
      // Any custom professional category or marked 'Outros'
      roleCounts['Outros'] = (roleCounts['Outros'] || 0) + 1;
    }
  });

  const sortedRoles = Object.entries(roleCounts).sort((a, b) => b[1] - a[1]);
  const displayRoles = sortedRoles.filter(([name, count]) => count > 0 || name === 'Outros');

  // Breakdown by Axis
  const axisCounts = registrations.reduce((acc, reg) => {
    acc[reg.axisInterest] = (acc[reg.axisInterest] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Breakdown by Accessibility Needs
  const accessibilityCounts = registrations.reduce((acc, reg) => {
    const need = reg.accessibilityNeeds || 'Nenhuma';
    acc[need] = (acc[need] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Breakdown by SUS Care Level (Nível de Atenção no SUS)
  const SUS_CARE_LEVEL_LIST = [
    'Atenção Primária / Saúde da Família (ESF/UBS/eMulti/ACS)',
    'Atenção Psicossocial Especializada (CAPS I, CAPS II, CAPS AD)',
    'Atenção Farmacêutica',
    'Atenção Hospitalar & Urgência (Hospital Casa de Caridade / PA / SAMU 192)',
    'Gestão Municipal / Secretaria de Saúde / Regulação',
    'Assistência Social (CRAS, CREAS, Acolhimento)',
    'Sistema de Justiça & Direitos Humanos (TJMG / MP / Defensoria)',
    'Academia / Universidade / Estudante / Residente',
    'Usuário(a) do SUS / Familiar / Controle Social',
    'Outro Vínculo'
  ];

  const susCareLevelCounts = registrations.reduce((acc, reg) => {
    const lvl = reg.susCareLevel || 'Atenção Primária / Saúde da Família (ESF/UBS/eMulti/ACS)';
    acc[lvl] = (acc[lvl] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const sortedSusCareLevels = Object.entries(susCareLevelCounts).sort((a, b) => b[1] - a[1]);

  // Breakdown by Age Group (Faixa Etária)
  const AGE_GROUP_LIST = ['18 a 29 anos', '30 a 39 anos', '40 a 49 anos', '50 a 59 anos', '60 anos ou mais'];
  const ageGroupCounts = registrations.reduce((acc, reg) => {
    const grp = reg.ageGroup || '30 a 39 anos';
    acc[grp] = (acc[grp] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Breakdown by Education Level (Escolaridade)
  const EDUCATION_LEVEL_LIST = [
    'Ensino Médio / Técnico',
    'Superior Incompleto',
    'Superior Completo',
    'Especialização / Residência',
    'Mestrado',
    'Doutorado'
  ];
  const educationLevelCounts = registrations.reduce((acc, reg) => {
    const ed = reg.educationLevel || 'Superior Completo';
    acc[ed] = (acc[ed] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Breakdown by Referral Source (Canal de Divulgação)
  const referralSourceCounts = registrations.reduce((acc, reg) => {
    const src = reg.referralSource || 'Grupo de WhatsApp do SUS / Trabalho';
    acc[src] = (acc[src] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const sortedReferralSources = Object.entries(referralSourceCounts).sort((a, b) => b[1] - a[1]);

  // Social Media & Communication Opt-In Stats
  const registrantsWithInstagram = registrations.filter((r) => !!r.instagram).length;
  const registrantsWithLinkedin = registrations.filter((r) => !!(r.linkedin || r.otherSocial)).length;
  const registrantsWithSocial = registrations.filter((r) => !!r.instagram || !!r.linkedin || !!r.otherSocial).length;
  const registrantsAcceptWhatsapp = registrations.filter((r) => r.acceptWhatsappNews !== false).length;
  const registrantsAcceptEmail = registrations.filter((r) => r.acceptEmailNews !== false).length;
  const instagramPct = totalRegistrations > 0 ? Math.round((registrantsWithInstagram / totalRegistrations) * 100) : 0;
  const linkedinPct = totalRegistrations > 0 ? Math.round((registrantsWithLinkedin / totalRegistrations) * 100) : 0;
  const socialPct = totalRegistrations > 0 ? Math.round((registrantsWithSocial / totalRegistrations) * 100) : 0;
  const whatsappOptInPct = totalRegistrations > 0 ? Math.round((registrantsAcceptWhatsapp / totalRegistrations) * 100) : 0;
  const emailOptInPct = totalRegistrations > 0 ? Math.round((registrantsAcceptEmail / totalRegistrations) * 100) : 0;

  // Breakdown by Attendance Status
  const statusCounts = {
    presente: registrations.filter((r) => r.status === 'presente').length,
    confirmada: registrations.filter((r) => r.status === 'confirmada').length,
    cancelada: registrations.filter((r) => r.status === 'cancelada').length
  };

  // Capacity & Enrollment metrics
  const remainingSpots = Math.max(0, config.maxSpots - totalRegistrations);
  const occupancyRate = config.maxSpots > 0 ? Math.min(100, Math.round((totalRegistrations / config.maxSpots) * 100)) : 0;

  // Social Wall (Postagens) Analytics & Metrics
  const totalPosts = socialPosts.length;
  const totalLikes = socialPosts.reduce((acc, p) => acc + (p.likes || 0), 0);
  const postsWithPhoto = socialPosts.filter((p) => !!p.imageUrl).length;
  const postsTextOnly = totalPosts - postsWithPhoto;
  const avgLikesPerPost = totalPosts > 0 ? (totalLikes / totalPosts).toFixed(1) : '0';

  const postCityCounts = socialPosts.reduce((acc, p) => {
    const city = p.city || 'Carangola';
    acc[city] = (acc[city] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const sortedPostCities = Object.entries(postCityCounts).sort((a, b) => b[1] - a[1]);

  // Multichannel Registration Stats
  const googleFormsCount = registrations.filter((r) => r.origin === 'google_forms').length;
  const portalCount = registrations.filter((r) => r.origin !== 'google_forms' && r.origin !== 'presencial').length;
  const presencialCount = registrations.filter((r) => r.origin === 'presencial').length;

  // Breakdown by Major Institutions & Workplaces (Top 10)
  const institutionCounts = registrations.reduce((acc, reg) => {
    const inst = (reg.institution || 'Não informada').trim();
    acc[inst] = (acc[inst] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const sortedInstitutions = Object.entries(institutionCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Certificate Issuance & Public Download Metrics (Estrito: somente Credenciado/Presente)
  const certificateIssuedCount = registrations.filter((r) => r.status === 'presente' && r.certificateIssued).length;
  const certificatePendingCount = Math.max(0, totalRegistrations - certificateIssuedCount);
  const certificateRate = totalRegistrations > 0 ? Math.round((certificateIssuedCount / totalRegistrations) * 100) : 0;
  const certificateDownloadedCount = registrations.filter(
    (r) => r.certificateDownloaded || certificateDownloads.some((d) => d.registrationId === r.id)
  ).length;
  const certificateDownloadedPct = totalRegistrations > 0 ? Math.round((certificateDownloadedCount / totalRegistrations) * 100) : 0;

  // Registration Timeline by Date (registeredAt)
  const registrationDateCounts = registrations.reduce((acc, reg) => {
    const parsed = new Date(reg.registeredAt);
    const key = Number.isNaN(parsed.getTime())
      ? 'Sem data'
      : parsed.toISOString().split('T')[0];
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedRegistrationDates = Object.entries(registrationDateCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([isoDate, count]) => {
      const label = isoDate === 'Sem data'
        ? 'Sem data'
        : isoDate.split('-').reverse().join('/');
      return { isoDate, label, count };
    });

  // Social Posts: Breakdown by Author Role
  const postRoleCounts = socialPosts.reduce((acc, p) => {
    const role = p.authorRole || 'Participante';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const sortedPostRoles = Object.entries(postRoleCounts).sort((a, b) => b[1] - a[1]);

  // Social Posts: Likes / Engagement by City
  const postLikesByCity = socialPosts.reduce((acc, p) => {
    const city = p.city || 'Carangola';
    acc[city] = (acc[city] || 0) + (p.likes || 0);
    return acc;
  }, {} as Record<string, number>);
  const sortedPostLikesByCity = Object.entries(postLikesByCity).sort((a, b) => b[1] - a[1]);

  // Social Posts: Ranking of Most Liked / Supported Posts
  const topLikedPosts = [...socialPosts].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 5);

  // Filtered Attendees
  const filteredAttendees = registrations.filter((reg) => {
    const matchesSearch =
      attendeeSearch.trim() === '' ||
      reg.fullName.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
      reg.code.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
      reg.cpf.includes(attendeeSearch) ||
      reg.institution.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
      reg.city.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
      reg.professionalRole.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
      (reg.instagram && reg.instagram.toLowerCase().includes(attendeeSearch.toLowerCase())) ||
      (reg.linkedin && reg.linkedin.toLowerCase().includes(attendeeSearch.toLowerCase())) ||
      (reg.otherSocial && reg.otherSocial.toLowerCase().includes(attendeeSearch.toLowerCase()));

    const matchesCity =
      filterCity === 'all' ||
      reg.city === filterCity ||
      (filterCity === 'Outros' && (!microrregionCities.includes(reg.city) || reg.city === 'Outros'));

    const matchesStatus = filterStatus === 'all' || reg.status === filterStatus;

    const matchesRole =
      filterRole === 'all' ||
      reg.professionalRole === filterRole ||
      (filterRole.toLowerCase().includes('farmac') && (reg.professionalRole || '').toLowerCase().includes('farmac')) ||
      (filterRole === 'Outros' && (!standardRoles.includes(reg.professionalRole) || reg.professionalRole === 'Outros'));

    const matchesSusCare =
      filterSusCareLevel === 'all' ||
      reg.susCareLevel === filterSusCareLevel ||
      (filterSusCareLevel.toLowerCase().includes('farmac') && (reg.susCareLevel || '').toLowerCase().includes('farmac')) ||
      (!reg.susCareLevel && filterSusCareLevel.includes('Atenção Primária'));

    const matchesOrigin =
      filterOrigin === 'all' ||
      (filterOrigin === 'google_forms' && reg.origin === 'google_forms') ||
      (filterOrigin === 'portal' && reg.origin !== 'google_forms');

    return matchesSearch && matchesCity && matchesStatus && matchesRole && matchesSusCare && matchesOrigin;
  });

  // Filtered Social Posts for Moderation Tab
  const filteredPosts = socialPosts.filter((post) => {
    if (!postSearch.trim()) return true;
    const term = postSearch.toLowerCase();
    return (
      post.authorName.toLowerCase().includes(term) ||
      post.city.toLowerCase().includes(term) ||
      post.content.toLowerCase().includes(term) ||
      post.authorRole.toLowerCase().includes(term)
    );
  });

  // Filtered Materials for Materials Tab
  const filteredMaterials = materials.filter((mat) => {
    const matchesCategory = materialCategoryFilter === 'all' || mat.category === materialCategoryFilter;
    const matchesSearch =
      materialSearch.trim() === '' ||
      mat.title.toLowerCase().includes(materialSearch.toLowerCase()) ||
      mat.description.toLowerCase().includes(materialSearch.toLowerCase()) ||
      mat.author.toLowerCase().includes(materialSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMaterialError(null);

    const maxBytes = 15 * 1024 * 1024; // 15 MB limit for Firestore chunked storage
    if (file.size > maxBytes) {
      setMaterialError(
        `O arquivo "${file.name}" possui ${(file.size / (1024 * 1024)).toFixed(1)} MB e ultrapassa o limite de 15 MB para envio direto. Comprima o PDF ou informe o link direto (Google Drive) abaixo.`
      );
      e.target.value = '';
      return;
    }

    const sizeInMB = file.size / (1024 * 1024);
    const sizeStr = sizeInMB >= 0.1 ? `${sizeInMB.toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`;
    const estPages = Math.max(1, Math.min(200, Math.round(file.size / (100 * 1024))));
    const lowerName = file.name.toLowerCase();
    const detectedFormat: DownloadMaterial['format'] =
      lowerName.endsWith('.docx') || lowerName.endsWith('.doc')
        ? 'DOCX'
        : lowerName.endsWith('.zip') || lowerName.endsWith('.rar')
        ? 'ZIP'
        : 'PDF';

    setIsReadingFile(true);
    const reader = new FileReader();
    reader.onload = () => {
      setNewMaterialForm((prev) => ({
        ...prev,
        title: prev.title.trim() ? prev.title : file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        format: detectedFormat,
        size: sizeStr,
        pages: prev.pages === 4 ? estPages : prev.pages,
        fileUrl: String(reader.result || ''),
        fileName: file.name,
        externalUrl: ''
      }));
      setIsReadingFile(false);
    };
    reader.onerror = () => {
      setIsReadingFile(false);
      setMaterialError('Não foi possível ler o arquivo selecionado. Tente selecionar novamente.');
    };
    reader.readAsDataURL(file);
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadingFile || isSavingMaterial) return;
    setMaterialError(null);

    const trimmedTitle = newMaterialForm.title.trim();
    const trimmedDesc = newMaterialForm.description.trim();
    const chosenUrl = newMaterialForm.fileUrl || newMaterialForm.externalUrl.trim();

    if (!trimmedTitle || !trimmedDesc) {
      setMaterialError('Preencha o título e a descrição técnica do documento.');
      return;
    }

    if (!chosenUrl) {
      setMaterialError('Anexe um arquivo ou cole o link direto do documento antes de publicar.');
      return;
    }

    const chosenFormat = newMaterialForm.format || 'PDF';
    const chosenMime =
      chosenFormat === 'DOCX'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : chosenFormat === 'ZIP'
        ? 'application/zip'
        : 'application/pdf';

    const newMat: DownloadMaterial = {
      id: `mat-${Date.now()}`,
      title: trimmedTitle,
      category: newMaterialForm.category,
      author: newMaterialForm.author.trim() || 'Secretaria Municipal de Saúde de Carangola',
      format: chosenFormat,
      size: newMaterialForm.size || 'Link Externo',
      description: trimmedDesc,
      pages: Number(newMaterialForm.pages) || 4,
      downloadsCount: 0,
      fileUrl: chosenUrl,
      fileName: newMaterialForm.fileName || undefined,
      mimeType: chosenMime,
      createdAt: new Date().toISOString()
    };

    setIsSavingMaterial(true);
    setUploadProgress(5);

    try {
      const result = onAddMaterial ? await onAddMaterial(newMat, (pct) => setUploadProgress(pct)) : undefined;

      if (result && result.cloudSynced) {
        setMaterialNotice({
          type: 'success',
          text: `Documento PDF "${newMat.title}" salvo na nuvem com sucesso! Já está visível e disponível para download em todos os dispositivos e links.`
        });
      } else if (result && !result.cloudSynced) {
        setMaterialNotice({
          type: 'warning',
          text:
            result.error ||
            `Documento "${newMat.title}" adicionado apenas localmente porque a conta Google do gestor (${firebaseSyncState?.userEmail || 'desconectada'}) não está conectada à nuvem. Clique em "Conectar Google" acima para publicar para todos.`
        });
      } else {
        setMaterialNotice({
          type: 'success',
          text: `Documento PDF "${newMat.title}" publicado com sucesso!`
        });
      }

      setTimeout(() => setMaterialNotice(null), 7000);
      setIsAddMaterialModalOpen(false);
      setNewMaterialForm({
        title: '',
        category: 'Fluxograma',
        format: 'PDF',
        author: 'Secretaria Municipal de Saúde de Carangola',
        description: '',
        pages: 4,
        size: '1.2 MB',
        fileUrl: '',
        fileName: '',
        externalUrl: ''
      });
    } catch (err: unknown) {
      setMaterialError(err instanceof Error ? err.message : 'Falha ao publicar documento.');
    } finally {
      setIsSavingMaterial(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteMaterialItem = (material: DownloadMaterial) => {
    setMaterialToDelete(material);
  };

  const handleTestDownloadMaterial = async (material: DownloadMaterial) => {
    setDownloadingMaterialId(material.id);
    try {
      await triggerMaterialDownload(material);
    } catch (err) {
      console.error('Erro ao baixar material no painel:', err);
      setMaterialNotice({
        type: 'warning',
        text: `Não foi possível baixar "${material.title}". Verifique se a sincronização em nuvem foi concluída.`
      });
      setTimeout(() => setMaterialNotice(null), 5000);
    } finally {
      setDownloadingMaterialId(null);
    }
  };

  // EXPORT HANDLERS: Inscritos (Excel, CSV, PDF)
  const getAttendeeExportData = () =>
    registrations.map((r) => ({
      Codigo: r.code,
      Nome_Completo: r.fullName,
      CPF: r.cpf,
      CNS: r.cns || 'Não informado',
      Email: r.email,
      Telefone_WhatsApp: r.phone,
      Instagram: r.instagram || 'Não informado',
      LinkedIn_Curriculo_Site: r.linkedin || r.otherSocial || 'Não informado',
      Municipio: r.city,
      Categoria_Profissional: r.professionalRole,
      Nivel_Atencao_SUS: r.susCareLevel || 'Atenção Primária',
      Instituicao_Lotacao: r.institution,
      Faixa_Etaria: r.ageGroup || 'Não informada',
      Escolaridade: r.educationLevel || 'Superior',
      Como_Soube_Evento: r.referralSource || 'Rede de Saúde',
      Eixo_Interesse: r.axisInterest,
      Acessibilidade: r.accessibilityNeeds || 'Nenhuma',
      Aceita_WhatsApp: r.acceptWhatsappNews !== false ? 'Sim' : 'Não',
      Aceita_Email: r.acceptEmailNews !== false ? 'Sim' : 'Não',
      Status_Presenca:
        r.status === 'presente'
          ? 'Presente / Credenciado'
          : r.status === 'confirmada'
          ? 'Confirmada (Pendente Check-in)'
          : 'Cancelada',
      Data_Inscricao: r.registeredAt,
      Data_Credenciamento: r.checkedInAt || 'Pendente',
      Certificado_Liberado: r.certificateIssued ? 'Sim' : 'Não',
      Certificado_Baixado_Publico: r.certificateDownloaded ? 'Sim' : 'Não',
      Canal_Origem: r.origin === 'google_forms' ? 'Google Forms (Planilha)' : 'Portal Web Oficial'
    }));

  const handleExportAttendeesCSV = () => {
    exportToCSV(`lista_inscritos_simposio_carangola_${new Date().toISOString().split('T')[0]}`, getAttendeeExportData());
  };

  const handleExportAttendeesExcel = () => {
    exportToExcel(`banco_dados_inscritos_simposio_carangola_${new Date().toISOString().split('T')[0]}`, 'Inscritos SUS', getAttendeeExportData());
  };

  const handleExportAttendeesPDF = () => {
    generatePrintablePDFReport({
      title: 'Folha Oficial de Credenciamento e Lista de Presença',
      subtitle: `${config.editionTitle} ${config.regionTitle} · Carangola - MG`,
      categoryBadge: 'Documento Oficial SUS / Credenciamento',
      summaryStats: [
        { label: 'Total Inscritos', value: totalRegistrations },
        { label: 'Vagas do Evento', value: config.maxSpots },
        { label: 'Presentes / Check-in', value: checkedInCount },
        { label: 'Taxa de Presença', value: `${checkInRate}%` }
      ],
      tables: [
        {
          title: `Relação Nominal de Participantes Inscritos (${registrations.length} registros)`,
          headers: ['Nº', 'Código', 'Nome Completo', 'CPF', 'Município', 'Categoria / Lotação', 'Nível Atenção SUS', 'Assinatura do Participante'],
          rows: registrations.map((r, idx) => [
            idx + 1,
            r.code,
            r.fullName,
            r.cpf,
            r.city,
            `${r.professionalRole} - ${r.institution}`,
            r.susCareLevel ? r.susCareLevel.split('/')[0].slice(0, 22) : 'Atenção Básica',
            r.status === 'presente' ? 'CREDENCIADO [X]' : '_______________________'
          ])
        }
      ],
      notes: 'Lista oficial emitida para controle da comissão organizadora do SUS. Participantes com check-in validado terão certificado de 8 horas liberado.'
    });
  };

  // EXPORT HANDLERS: Estatísticas & Análises (Excel, PDF)
  const handleExportAnalyticsExcel = () => {
    const statsRows: Record<string, unknown>[] = [];
    
    // Overview
    statsRows.push({
      Categoria_Analise: 'Visão Geral',
      Indicador: 'Total de Inscritos',
      Valor: totalRegistrations,
      Percentual: '100%'
    });
    statsRows.push({
      Categoria_Analise: 'Visão Geral',
      Indicador: 'Capacidade Total',
      Valor: config.maxSpots,
      Percentual: '-'
    });
    statsRows.push({
      Categoria_Analise: 'Visão Geral',
      Indicador: 'Vagas Restantes',
      Valor: remainingSpots,
      Percentual: `${100 - occupancyRate}%`
    });
    statsRows.push({
      Categoria_Analise: 'Visão Geral',
      Indicador: 'Taxa de Ocupação',
      Valor: `${occupancyRate}%`,
      Percentual: `${occupancyRate}%`
    });
    statsRows.push({
      Categoria_Analise: 'Visão Geral',
      Indicador: 'Credenciados / Presentes',
      Valor: checkedInCount,
      Percentual: `${checkInRate}%`
    });
    statsRows.push({
      Categoria_Analise: 'Visão Geral',
      Indicador: 'Inscritos com Instagram',
      Valor: registrantsWithInstagram,
      Percentual: `${instagramPct}%`
    });
    statsRows.push({
      Categoria_Analise: 'Visão Geral',
      Indicador: 'Inscritos com LinkedIn / Currículo / Site',
      Valor: registrantsWithLinkedin,
      Percentual: `${linkedinPct}%`
    });
    statsRows.push({
      Categoria_Analise: 'Visão Geral',
      Indicador: 'Aceitam WhatsApp (Novidades & Alertas)',
      Valor: registrantsAcceptWhatsapp,
      Percentual: `${whatsappOptInPct}%`
    });
    statsRows.push({
      Categoria_Analise: 'Visão Geral',
      Indicador: 'Aceitam E-mail / Newsletter',
      Valor: registrantsAcceptEmail,
      Percentual: `${emailOptInPct}%`
    });

    // Cities
    displayCities.forEach(([cityName, count]) => {
      statsRows.push({
        Categoria_Analise: 'Distribuição por Município',
        Indicador: cityName,
        Valor: count,
        Percentual: `${totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0}%`
      });
    });

    // SUS Care Levels
    sortedSusCareLevels.forEach(([levelName, count]) => {
      statsRows.push({
        Categoria_Analise: 'Nível de Atenção no SUS / Vínculo RAPS',
        Indicador: levelName,
        Valor: count,
        Percentual: `${totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0}%`
      });
    });

    // Roles
    displayRoles.forEach(([roleName, count]) => {
      statsRows.push({
        Categoria_Analise: 'Distribuição por Categoria Profissional',
        Indicador: roleName,
        Valor: count,
        Percentual: `${totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0}%`
      });
    });

    // Age Groups
    Object.entries(ageGroupCounts).forEach(([ageGroup, count]) => {
      statsRows.push({
        Categoria_Analise: 'Faixa Etária dos Participantes',
        Indicador: ageGroup,
        Valor: count,
        Percentual: `${totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0}%`
      });
    });

    // Education Levels
    Object.entries(educationLevelCounts).forEach(([edLevel, count]) => {
      statsRows.push({
        Categoria_Analise: 'Escolaridade e Formação Acadêmica',
        Indicador: edLevel,
        Valor: count,
        Percentual: `${totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0}%`
      });
    });

    // Referral Sources
    sortedReferralSources.forEach(([src, count]) => {
      statsRows.push({
        Categoria_Analise: 'Canal de Conhecimento do Evento',
        Indicador: src,
        Valor: count,
        Percentual: `${totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0}%`
      });
    });

    // Axes
    Object.entries(axisCounts).forEach(([axisName, count]) => {
      statsRows.push({
        Categoria_Analise: 'Eixo Temático de Interesse',
        Indicador: axisName,
        Valor: count,
        Percentual: `${totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0}%`
      });
    });

    // Accessibility
    Object.entries(accessibilityCounts).forEach(([accNeed, count]) => {
      statsRows.push({
        Categoria_Analise: 'Necessidades de Acessibilidade',
        Indicador: accNeed,
        Valor: count,
        Percentual: `${totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0}%`
      });
    });

    // Status
    statsRows.push({
      Categoria_Analise: 'Status & Credenciamento',
      Indicador: 'Credenciados / Presentes no Evento',
      Valor: statusCounts.presente,
      Percentual: `${checkInRate}%`
    });
    statsRows.push({
      Categoria_Analise: 'Status & Credenciamento',
      Indicador: 'Inscrições Confirmadas (Pendente Check-in)',
      Valor: statusCounts.confirmada,
      Percentual: `${totalRegistrations > 0 ? Math.round((statusCounts.confirmada / totalRegistrations) * 100) : 0}%`
    });
    statsRows.push({
      Categoria_Analise: 'Status & Credenciamento',
      Indicador: 'Inscrições Canceladas',
      Valor: statusCounts.cancelada,
      Percentual: `${totalRegistrations > 0 ? Math.round((statusCounts.cancelada / totalRegistrations) * 100) : 0}%`
    });

    // Origin
    statsRows.push({
      Categoria_Analise: 'Canal de Entrada da Inscrição',
      Indicador: 'Portal Web Oficial SUS',
      Valor: portalCount,
      Percentual: `${totalRegistrations > 0 ? Math.round((portalCount / totalRegistrations) * 100) : 0}%`
    });
    statsRows.push({
      Categoria_Analise: 'Canal de Entrada da Inscrição',
      Indicador: 'Importação Google Forms (.xlsx)',
      Valor: googleFormsCount,
      Percentual: `${totalRegistrations > 0 ? Math.round((googleFormsCount / totalRegistrations) * 100) : 0}%`
    });

    // Certificates
    statsRows.push({
      Categoria_Analise: 'Emissão de Certificados (8 horas)',
      Indicador: 'Certificados Liberados para Download',
      Valor: certificateIssuedCount,
      Percentual: `${certificateRate}%`
    });
    statsRows.push({
      Categoria_Analise: 'Emissão de Certificados (8 horas)',
      Indicador: 'Certificados Pendentes (Sem Check-in)',
      Valor: certificatePendingCount,
      Percentual: `${100 - certificateRate}%`
    });
    statsRows.push({
      Categoria_Analise: 'Emissão de Certificados (8 horas)',
      Indicador: 'Certificados Baixados pelo Público',
      Valor: certificateDownloadedCount,
      Percentual: `${certificateDownloadedPct}%`
    });

    // Daily Registration Evolution
    sortedRegistrationDates.forEach(({ label, count }) => {
      statsRows.push({
        Categoria_Analise: 'Evolução Diária das Inscrições (registeredAt)',
        Indicador: label,
        Valor: count,
        Percentual: `${totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0}%`
      });
    });

    // Top Institutions
    sortedInstitutions.forEach(([inst, count]) => {
      statsRows.push({
        Categoria_Analise: 'Instituição de Lotação / Workplace',
        Indicador: inst,
        Valor: count,
        Percentual: `${totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0}%`
      });
    });

    // Posts
    statsRows.push({
      Categoria_Analise: 'Mural da Comunidade (Postagens)',
      Indicador: 'Total de Posts',
      Valor: totalPosts,
      Percentual: '-'
    });
    statsRows.push({
      Categoria_Analise: 'Mural da Comunidade (Postagens)',
      Indicador: 'Total de Curtidas',
      Valor: totalLikes,
      Percentual: '-'
    });
    statsRows.push({
      Categoria_Analise: 'Mural da Comunidade (Postagens)',
      Indicador: 'Posts com Foto Anexada',
      Valor: postsWithPhoto,
      Percentual: `${totalPosts > 0 ? Math.round((postsWithPhoto / totalPosts) * 100) : 0}%`
    });
    statsRows.push({
      Categoria_Analise: 'Mural da Comunidade (Postagens)',
      Indicador: 'Posts em Texto Puro',
      Valor: postsTextOnly,
      Percentual: `${totalPosts > 0 ? Math.round((postsTextOnly / totalPosts) * 100) : 0}%`
    });
    statsRows.push({
      Categoria_Analise: 'Mural da Comunidade (Postagens)',
      Indicador: 'Média de Curtidas por Post',
      Valor: avgLikesPerPost,
      Percentual: '-'
    });

    // Posts by Author City
    sortedPostCities.forEach(([c, count]) => {
      statsRows.push({
        Categoria_Analise: 'Postagens por Município do Autor',
        Indicador: c,
        Valor: count,
        Percentual: `${totalPosts > 0 ? Math.round((count / totalPosts) * 100) : 0}%`
      });
    });

    // Posts by Author Role
    sortedPostRoles.forEach(([r, count]) => {
      statsRows.push({
        Categoria_Analise: 'Postagens por Categoria do Autor',
        Indicador: r,
        Valor: count,
        Percentual: `${totalPosts > 0 ? Math.round((count / totalPosts) * 100) : 0}%`
      });
    });

    exportToExcel(`estatisticas_completas_simposio_carangola_${new Date().toISOString().split('T')[0]}`, 'Estatísticas Gerais', statsRows);
  };

  const handleExportAnalyticsPDF = () => {
    generatePrintablePDFReport({
      title: 'Dossiê Estatístico e Analítico Oficial do Simpósio',
      subtitle: `${config.editionTitle} ${config.regionTitle} · Relatório Técnico SUS`,
      categoryBadge: 'Relatório Executivo SUS',
      summaryStats: [
        { label: 'Total Inscritos', value: totalRegistrations },
        { label: 'Ocupação Auditório', value: `${occupancyRate}%` },
        { label: 'Adesão WhatsApp', value: `${whatsappOptInPct}%` },
        { label: 'Total de Posts', value: totalPosts }
      ],
      tables: [
        {
          title: '1. Nível de Atenção no SUS / Vínculo com a Rede Psicossocial (RAPS)',
          headers: ['Nível de Atenção no SUS', 'Profissionais', 'Participação (%)'],
          rows: sortedSusCareLevels.map(([lvl, count]) => [
            lvl,
            count,
            `${totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0}%`
          ])
        },
        {
          title: '2. Distribuição Territorial por Município da Microrregião e Adjacências',
          headers: ['Município', 'Total Inscritos', 'Representatividade (%)'],
          rows: displayCities.map(([c, count]) => [
            c,
            count,
            `${totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0}%`
          ])
        },
        {
          title: '3. Perfil das Equipes por Categoria Profissional e Ocupação no SUS',
          headers: ['Categoria Profissional', 'Total Inscritos', 'Proporção (%)'],
          rows: displayRoles.map(([r, count]) => [
            r,
            count,
            `${totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0}%`
          ])
        },
        {
          title: '4. Perfil Etário e Escolaridade / Formação dos Participantes',
          headers: ['Faixa Etária / Escolaridade', 'Participantes', 'Proporção (%)'],
          rows: [
            ...Object.entries(ageGroupCounts).map(([age, count]) => [
              `Idade: ${age}`,
              count,
              `${totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0}%`
            ]),
            ...Object.entries(educationLevelCounts).map(([ed, count]) => [
              `Formação: ${ed}`,
              count,
              `${totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0}%`
            ])
          ]
        },
        {
          title: '5. Canais de Divulgação e Origem do Conhecimento do Evento',
          headers: ['Canal de Divulgação', 'Indicações', 'Eficácia (%)'],
          rows: sortedReferralSources.map(([src, count]) => [
            src,
            count,
            `${totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0}%`
          ])
        },
        {
          title: '6. Adesão aos Eixos Temáticos Estratégicos da RAPS',
          headers: ['Eixo Temático', 'Total Inscritos', 'Adesão (%)'],
          rows: Object.entries(axisCounts).map(([ax, count]) => [
            ax,
            count,
            `${totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0}%`
          ])
        },
        {
          title: '7. Status da Inscrição, Credenciamento e Emissão de Certificados',
          headers: ['Status / Documento', 'Quantidade', 'Percentual (%)'],
          rows: [
            ['Credenciados / Presentes no Local', statusCounts.presente, `${checkInRate}%`],
            ['Inscrições Confirmadas (Pendente Check-in)', statusCounts.confirmada, `${totalRegistrations > 0 ? Math.round((statusCounts.confirmada / totalRegistrations) * 100) : 0}%`],
            ['Inscrições Canceladas', statusCounts.cancelada, `${totalRegistrations > 0 ? Math.round((statusCounts.cancelada / totalRegistrations) * 100) : 0}%`],
            ['Certificados Oficiais de 8h Liberados', certificateIssuedCount, `${certificateRate}%`],
            ['Certificados Baixados pelo Público', certificateDownloadedCount, `${certificateDownloadedPct}%`],
            ['Com LinkedIn / Currículo / Site', registrantsWithLinkedin, `${linkedinPct}%`],
            ['Com Instagram', registrantsWithInstagram, `${instagramPct}%`]
          ]
        },
        {
          title: '8. Evolução Diária das Inscrições (Data de Cadastro)',
          headers: ['Data de Inscrição', 'Novos Inscritos', 'Participação (%)'],
          rows: sortedRegistrationDates.map(({ label, count }) => [
            label,
            count,
            `${totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0}%`
          ])
        },
        {
          title: '9. Principais Instituições e Unidades de Lotação Declaradas',
          headers: ['Instituição / Unidade de Saúde', 'Participantes', 'Proporção (%)'],
          rows: sortedInstitutions.map(([inst, count]) => [
            inst,
            count,
            `${totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0}%`
          ])
        },
        {
          title: '10. Métricas e Interações no Mural da Comunidade (Postagens)',
          headers: ['Indicador de Comunicação', 'Valor Registrado', 'Detalhes'],
          rows: [
            ['Total de Postagens Publicadas', totalPosts, 'Mensagens no mural coletivo'],
            ['Total de Curtidas / Apoios', totalLikes, `Média de ${avgLikesPerPost} por post`],
            ['Postagens com Foto Anexada', postsWithPhoto, `${totalPosts > 0 ? Math.round((postsWithPhoto / totalPosts) * 100) : 0}% do total`],
            ['Postagens em Texto Puro', postsTextOnly, `${totalPosts > 0 ? Math.round((postsTextOnly / totalPosts) * 100) : 0}% do total`]
          ]
        },
        {
          title: '11. Postagens Feitas por Município e Categoria Profissional',
          headers: ['Segmento', 'Postagens', 'Representatividade (%)'],
          rows: [
            ...sortedPostCities.map(([c, count]) => [
              `Município: ${c}`,
              count,
              `${totalPosts > 0 ? Math.round((count / totalPosts) * 100) : 0}%`
            ]),
            ...sortedPostRoles.map(([r, count]) => [
              `Categoria: ${r}`,
              count,
              `${totalPosts > 0 ? Math.round((count / totalPosts) * 100) : 0}%`
            ])
          ]
        }
      ],
      notes: 'Dados agregados para planejamento estratégico do Colegiado Gestor da RAPS e Secretaria de Saúde de Carangola.'
    });
  };

  const handleExportSocialPostsExcel = () => {
    const postRows = socialPosts.map((p, idx) => ({
      ID: p.id,
      Num: idx + 1,
      Autor: p.authorName,
      Cargo_Funcao: p.authorRole,
      Municipio: p.city,
      Curtidas: p.likes || 0,
      Possui_Foto: p.imageUrl ? 'Sim' : 'Não',
      Data_Publicacao: p.createdAt,
      Conteudo_Mensagem: p.content
    }));
    exportToExcel(`mural_postagens_simposio_carangola_${new Date().toISOString().split('T')[0]}`, 'Postagens Mural', postRows);
  };

  const handleExportSocialPostsPDF = () => {
    generatePrintablePDFReport({
      title: 'Relatório Oficial de Interações no Mural da Comunidade',
      subtitle: `${config.editionTitle} ${config.regionTitle} · Gestão Comunitária SUS`,
      categoryBadge: 'Mural Comunitário SUS',
      summaryStats: [
        { label: 'Total de Posts', value: totalPosts },
        { label: 'Total de Curtidas', value: totalLikes },
        { label: 'Média Curtidas/Post', value: avgLikesPerPost },
        { label: 'Posts com Foto', value: `${postsWithPhoto} (${totalPosts > 0 ? Math.round((postsWithPhoto / totalPosts) * 100) : 0}%)` }
      ],
      tables: [
        {
          title: 'Postagens Mais Apoiadas pela Comunidade (Top Ranking)',
          headers: ['Autor(a)', 'Função / Cidade', 'Curtidas', 'Mensagem'],
          rows: topLikedPosts.map((p) => [
            p.authorName,
            `${p.authorRole} (${p.city})`,
            p.likes || 0,
            p.content.slice(0, 90) + (p.content.length > 90 ? '...' : '')
          ])
        },
        {
          title: 'Distribuição das Postagens por Município dos Autores',
          headers: ['Município', 'Total Postagens', 'Representatividade (%)'],
          rows: sortedPostCities.map(([c, count]) => [
            c,
            count,
            `${totalPosts > 0 ? Math.round((count / totalPosts) * 100) : 0}%`
          ])
        },
        {
          title: 'Distribuição das Postagens por Categoria Profissional',
          headers: ['Categoria Profissional', 'Total Postagens', 'Proporção (%)'],
          rows: sortedPostRoles.map(([r, count]) => [
            r,
            count,
            `${totalPosts > 0 ? Math.round((count / totalPosts) * 100) : 0}%`
          ])
        }
      ],
      notes: 'Relatório gerado a partir do mural comunitário público do Simpósio de Saúde Mental.'
    });
  };

  const handleExportSubscribers = () => {
    const data = subscribers.map((s) => ({
      Nome: s.name || '',
      Email: s.email,
      Telefone_WhatsApp: s.phone || '',
      Municipio: s.city || '',
      Recebe_WhatsApp: s.receiveWhatsapp ? 'Sim' : 'Não',
      Data_Inscricao: s.subscribedAt
    }));
    exportToExcel(`newsletter_whatsapp_simposio_carangola_${new Date().toISOString().split('T')[0]}`, 'Assinantes', data);
  };

  // Dispatch Notification
  const handleTriggerNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifBody.trim()) return;

    const newNotif: PushNotificationItem = {
      id: `notif-${Date.now()}`,
      title: notifTitle.trim(),
      body: notifBody.trim(),
      category: notifCategory,
      targetAudience: notifAudience,
      sentAt: new Date().toISOString(),
      readCount: Math.floor(Math.random() * 20) + 15,
      totalSent: totalRegistrations || 150
    };

    // 1. Channel Portal & Web Push
    if (notifChannelPortal) {
      onSendNotification(newNotif);
      await sendBrowserNotification(newNotif.title, newNotif.body);
    }

    // 2. Channel E-mail Broadcast
    if (notifChannelEmail) {
      setIsBroadcastingEmail(true);
      let targetEmails: string[] = [];
      if (notifAudience === 'presentes') {
        targetEmails = registrations.filter(r => r.status === 'presente' && r.email).map(r => r.email);
      } else if (notifAudience === 'profissionais') {
        targetEmails = registrations.filter(r => r.professionalRole !== 'Estudante' && r.professionalRole !== 'Outro' && r.email).map(r => r.email);
      } else {
        targetEmails = registrations.filter(r => r.email).map(r => r.email);
      }

      if (targetEmails.length > 0) {
        const emailRes = await sendBroadcastEmailToAttendees(
          targetEmails,
          `[SUS Carangola] ${newNotif.title}`,
          newNotif.body,
          undefined,
          'farmaciademinas.marketing@gmail.com'
        );
        setEmailBroadcastNotice(emailRes.message);
        setTimeout(() => setEmailBroadcastNotice(null), 6000);
      } else {
        setEmailBroadcastNotice('Nenhum e-mail de participante encontrado para o público selecionado.');
        setTimeout(() => setEmailBroadcastNotice(null), 4000);
      }
      setIsBroadcastingEmail(false);
    }

    // 3. Channel WhatsApp (opens WhatsApp transmission modal)
    if (notifChannelWhatsapp) {
      setWhatsappDispatchModal(newNotif);
    }

    setNotifSentNotice(true);
    setTimeout(() => setNotifSentNotice(false), 3000);
    setNotifTitle('');
    setNotifBody('');
  };

  const applyTemplate = (title: string, body: string, cat: PushNotificationItem['category']) => {
    setNotifTitle(title);
    setNotifBody(body);
    setNotifCategory(cat);
  };

  const handleManagerResendConfirmationEmail = async (reg: Registration) => {
    if (!reg.email) {
      setEmailResendToast({
        success: false,
        message: `O participante ${reg.fullName} (${reg.code}) não possui e-mail cadastrado.`
      });
      return;
    }
    setResendingEmailRegId(reg.id);
    try {
      const res = await sendRegistrationConfirmationEmail(reg, INITIAL_SCHEDULE, config);
      if (res.actuallyDelivered) {
        setEmailResendToast({
          success: true,
          message: `E-mail de confirmação (Programa + Nº ${reg.code}) enviado para ${reg.email} via ${res.deliveryMethod.toUpperCase()}.`
        });
      } else {
        const payload = buildRegistrationConfirmationEmail(reg, INITIAL_SCHEDULE, config);
        const mailtoHref = `mailto:${encodeURIComponent(reg.email)}?subject=${encodeURIComponent(payload.subject)}&body=${encodeURIComponent(payload.bodyText.slice(0, 1800))}`;
        setEmailResendToast({
          success: false,
          message: `E-mail de ${reg.fullName} (${reg.code}) preparado, mas nenhum provedor automático (EmailJS / Gmail OAuth / SMTP / Resend) entregou na caixa de entrada. Configure na aba Disparos ou envie direto pelo seu app:`,
          mailtoHref
        });
      }
    } catch {
      setEmailResendToast({
        success: false,
        message: `Não foi possível enviar o e-mail de confirmação para ${reg.email}.`
      });
    } finally {
      setResendingEmailRegId(null);
    }
  };

  // Save Event Customizer
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      ...customConfig,
      emailJsConfig: config.emailJsConfig,
      certificateDesign: config.certificateDesign,
      badgeDesign: config.badgeDesign
    });
    setConfigSavedSuccess(true);
    setTimeout(() => setConfigSavedSuccess(false), 3000);
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 pb-20 ${theme.root}`}>
      
      {/* Top Admin Header Bar (100% Responsive for Mobile, Tablet & Desktop) */}
      <div className={`text-white border-b shadow-sm ${theme.header}`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full overflow-hidden bg-white shadow-md border-2 border-sky-300/80 flex items-center justify-center p-0.5 shrink-0 ring-2 ring-white/20">
              <img
                src="/assets/aistudio/Institutional_logo_displayed_ver__4c1d163d_2K__1__2b74545f.jpg"
                alt="Logo Oficial SUS"
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-xs uppercase font-mono tracking-wider sm:tracking-widest text-[#ea7a38] font-bold flex flex-wrap items-center gap-1.5">
                <span>Painel do Gestor do Evento · SUS Carangola</span>
                <span className="hidden md:inline text-stone-400">|</span>
                <span className="hidden md:inline-flex items-center gap-1 text-emerald-300 font-semibold text-[10px] bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Gestor Titular: SIMPOSIO CARANGOLA
                </span>
              </div>
              <h1 className="text-base sm:text-xl md:text-2xl font-bold tracking-tight leading-snug">
                Controle, Análises &amp; Notificações
              </h1>
            </div>
          </div>

          {/* Action Buttons: Excel, PDF Oficial & Ver Portal (No CSV, No Dark Theme) */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleExportAttendeesExcel}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
                title="Exportar Banco de Dados de Inscritos no formato Excel (.xls)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
                <span>Excel</span>
              </button>

              <button
                onClick={handleExportAttendeesPDF}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-[#028090] hover:bg-[#0396a8] active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
                title="Gerar Folha Oficial de Credenciamento e Presença em PDF"
              >
                <Printer className="w-3.5 h-3.5 text-teal-100" />
                <span>PDF Oficial</span>
              </button>
            </div>



            {/* Back to Public View Button */}
            <button
              onClick={onBackToPublic}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#0a3641] bg-white hover:bg-stone-100 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-[#d96522]" />
              <span className="hidden sm:inline">Ver Portal do Público</span>
              <span className="sm:hidden">Ver Portal</span>
            </button>

            {/* Logout Button */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-100 hover:text-white bg-red-950/60 hover:bg-red-900 border border-red-400/40 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
                title="Encerrar sessão administrativa"
              >
                <LogOut className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden sm:inline">Encerrar Sessão</span>
                <span className="sm:hidden">Sair</span>
              </button>
            )}
          </div>
        </div>

        {/* Real-time Capacity & Slots Remaining Monitor Bar (Mobile & Desktop Optimized) */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 border-t border-white/10 bg-black/20">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-5 flex items-center gap-2.5 sm:gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#ea7a38]/20 border border-[#ea7a38]/40 flex items-center justify-center text-[#ea7a38] shrink-0">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-stone-300 flex flex-wrap items-center gap-1.5">
                  <span>Capacidade do Auditório:</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    remainingSpots <= 15 ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
                  }`}>
                    {remainingSpots === 0 ? 'Esgotado' : remainingSpots <= 20 ? 'Últimas Vagas' : 'Vagas Abertas'}
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-white flex flex-wrap items-center gap-1.5 mt-0.5">
                  <span className="text-[#ea7a38] font-black">{totalRegistrations}</span> inscritos
                  <span className="text-stone-400">·</span>
                  <span>Restam <strong className="text-amber-300 font-black">{remainingSpots}</strong> vagas</span>
                  <span className="text-stone-400 text-xs">(de {config.maxSpots})</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-7 flex flex-col justify-center gap-1.5">
              <div className="flex items-center justify-between text-[11px] sm:text-xs font-mono text-stone-300">
                <span>Ocupação: <strong className="text-white">{occupancyRate}%</strong></span>
                <span>{checkedInCount} credenciados ({checkInRate}%)</span>
              </div>
              <div className="w-full h-2 sm:h-2.5 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/15">
                <div
                  className={`h-full rounded-full transition-all duration-500 shadow-xs ${
                    occupancyRate >= 95
                      ? 'bg-rose-500'
                      : occupancyRate >= 80
                      ? 'bg-gradient-to-r from-amber-400 to-[#ea7a38]'
                      : 'bg-gradient-to-r from-emerald-400 to-teal-400'
                  }`}
                  style={{ width: `${occupancyRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation: As 8 Opções Oficiais do Painel Gestor */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 border-t border-white/10 pt-3 pb-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2 sm:gap-2.5">
            {/* 1. Análises & Estatísticas */}
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-left transition-all cursor-pointer flex flex-col justify-between border ${
                activeTab === 'analytics'
                  ? 'bg-[#ea7a38] text-white border-[#ea7a38] shadow-md ring-2 ring-white/30'
                  : 'bg-white/5 hover:bg-white/10 text-stone-200 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  activeTab === 'analytics' ? 'bg-white/20 text-white' : 'bg-amber-500 text-white'
                }`}>
                  <BarChart3 className="w-4 h-4" />
                </div>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === 'analytics' ? 'bg-white/25 text-white' : 'bg-white/10 text-amber-300'
                }`}>
                  SUS
                </span>
              </div>
              <div>
                <div className="text-xs sm:text-xs md:text-sm font-bold leading-tight">
                  Análises & Estatísticas
                </div>
                <div className={`text-[10px] sm:text-[11px] leading-tight mt-0.5 ${
                  activeTab === 'analytics' ? 'text-white/85' : 'text-stone-400'
                }`}>
                  Métricas e gráficos
                </div>
              </div>
            </button>

            {/* 2. Inscritos */}
            <button
              type="button"
              onClick={() => setActiveTab('attendees')}
              className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-left transition-all cursor-pointer flex flex-col justify-between border ${
                activeTab === 'attendees'
                  ? 'bg-[#ea7a38] text-white border-[#ea7a38] shadow-md ring-2 ring-white/30'
                  : 'bg-white/5 hover:bg-white/10 text-stone-200 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  activeTab === 'attendees' ? 'bg-white/20 text-white' : 'bg-emerald-600 text-white'
                }`}>
                  <Users className="w-4 h-4" />
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'attendees' ? 'bg-white text-[#ea7a38]' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {registrations.length}
                </span>
              </div>
              <div>
                <div className="text-xs sm:text-xs md:text-sm font-bold leading-tight">
                  Inscritos ({registrations.length})
                </div>
                <div className={`text-[10px] sm:text-[11px] leading-tight mt-0.5 ${
                  activeTab === 'attendees' ? 'text-white/85' : 'text-stone-400'
                }`}>
                  Credenciamento & lista
                </div>
              </div>
            </button>

            {/* 3. Certificados & Design */}
            <button
              type="button"
              onClick={() => setActiveTab('certificates')}
              className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-left transition-all cursor-pointer flex flex-col justify-between border ${
                activeTab === 'certificates'
                  ? 'bg-[#ea7a38] text-white border-[#ea7a38] shadow-md ring-2 ring-white/30'
                  : 'bg-white/5 hover:bg-white/10 text-stone-200 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  activeTab === 'certificates' ? 'bg-white/20 text-white' : 'bg-cyan-600 text-white'
                }`}>
                  <Award className="w-4 h-4" />
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'certificates' ? 'bg-white text-[#ea7a38]' : 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30'
                }`}>
                  {registrations.filter((r) => r.certificateDownloaded).length}
                </span>
              </div>
              <div>
                <div className="text-xs sm:text-xs md:text-sm font-bold leading-tight">
                  Certificados & Design
                </div>
                <div className={`text-[10px] sm:text-[11px] leading-tight mt-0.5 ${
                  activeTab === 'certificates' ? 'text-white/85' : 'text-stone-400'
                }`}>
                  Downloads & layout
                </div>
              </div>
            </button>

            {/* 3. Materiais & PDFs */}
            <button
              type="button"
              onClick={() => setActiveTab('materials')}
              className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-left transition-all cursor-pointer flex flex-col justify-between border ${
                activeTab === 'materials'
                  ? 'bg-[#ea7a38] text-white border-[#ea7a38] shadow-md ring-2 ring-white/30'
                  : 'bg-white/5 hover:bg-white/10 text-stone-200 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  activeTab === 'materials' ? 'bg-white/20 text-white' : 'bg-blue-600 text-white'
                }`}>
                  <FileText className="w-4 h-4" />
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'materials' ? 'bg-white text-[#ea7a38]' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}>
                  {materials.length}
                </span>
              </div>
              <div>
                <div className="text-xs sm:text-xs md:text-sm font-bold leading-tight">
                  Materiais & PDFs ({materials.length})
                </div>
                <div className={`text-[10px] sm:text-[11px] leading-tight mt-0.5 ${
                  activeTab === 'materials' ? 'text-white/85' : 'text-stone-400'
                }`}>
                  Apostilas e downloads
                </div>
              </div>
            </button>

            {/* 4. Mural */}
            <button
              type="button"
              onClick={() => setActiveTab('posts')}
              className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-left transition-all cursor-pointer flex flex-col justify-between border ${
                activeTab === 'posts'
                  ? 'bg-[#ea7a38] text-white border-[#ea7a38] shadow-md ring-2 ring-white/30'
                  : 'bg-white/5 hover:bg-white/10 text-stone-200 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  activeTab === 'posts' ? 'bg-white/20 text-white' : 'bg-purple-600 text-white'
                }`}>
                  <MessageCircle className="w-4 h-4" />
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'posts' ? 'bg-white text-[#ea7a38]' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                }`}>
                  {socialPosts.length}
                </span>
              </div>
              <div>
                <div className="text-xs sm:text-xs md:text-sm font-bold leading-tight">
                  Mural ({socialPosts.length})
                </div>
                <div className={`text-[10px] sm:text-[11px] leading-tight mt-0.5 ${
                  activeTab === 'posts' ? 'text-white/85' : 'text-stone-400'
                }`}>
                  Moderação e fotos
                </div>
              </div>
            </button>

            {/* 5. Notificações & Gmail */}
            <button
              type="button"
              onClick={() => setActiveTab('notifications')}
              className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-left transition-all cursor-pointer flex flex-col justify-between border ${
                activeTab === 'notifications'
                  ? 'bg-[#ea7a38] text-white border-[#ea7a38] shadow-md ring-2 ring-white/30'
                  : 'bg-white/5 hover:bg-white/10 text-stone-200 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  activeTab === 'notifications' ? 'bg-white/20 text-white' : 'bg-rose-600 text-white'
                }`}>
                  <Mail className="w-4 h-4" />
                </div>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === 'notifications' ? 'bg-white/25 text-white' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  Alertas
                </span>
              </div>
              <div>
                <div className="text-xs sm:text-xs md:text-sm font-bold leading-tight">
                  Notificações & Gmail
                </div>
                <div className={`text-[10px] sm:text-[11px] leading-tight mt-0.5 ${
                  activeTab === 'notifications' ? 'text-white/85' : 'text-stone-400'
                }`}>
                  Envio e comunicados
                </div>
              </div>
            </button>

            {/* 6. Assinantes */}
            <button
              type="button"
              onClick={() => setActiveTab('subscribers')}
              className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-left transition-all cursor-pointer flex flex-col justify-between border ${
                activeTab === 'subscribers'
                  ? 'bg-[#ea7a38] text-white border-[#ea7a38] shadow-md ring-2 ring-white/30'
                  : 'bg-white/5 hover:bg-white/10 text-stone-200 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  activeTab === 'subscribers' ? 'bg-white/20 text-white' : 'bg-teal-600 text-white'
                }`}>
                  <Smartphone className="w-4 h-4" />
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'subscribers' ? 'bg-white text-[#ea7a38]' : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                }`}>
                  {subscribers.length}
                </span>
              </div>
              <div>
                <div className="text-xs sm:text-xs md:text-sm font-bold leading-tight">
                  Assinantes ({subscribers.length})
                </div>
                <div className={`text-[10px] sm:text-[11px] leading-tight mt-0.5 ${
                  activeTab === 'subscribers' ? 'text-white/85' : 'text-stone-400'
                }`}>
                  WhatsApp & E-mail
                </div>
              </div>
            </button>

            {/* 7. Configurar Evento */}
            <button
              type="button"
              onClick={() => setActiveTab('customizer')}
              className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-left transition-all cursor-pointer flex flex-col justify-between border ${
                activeTab === 'customizer'
                  ? 'bg-[#ea7a38] text-white border-[#ea7a38] shadow-md ring-2 ring-white/30'
                  : 'bg-white/5 hover:bg-white/10 text-stone-200 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  activeTab === 'customizer' ? 'bg-white/20 text-white' : 'bg-stone-600 text-white'
                }`}>
                  <Settings className="w-4 h-4" />
                </div>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === 'customizer' ? 'bg-white/25 text-white' : 'bg-stone-500/30 text-stone-300'
                }`}>
                  Ajustes
                </span>
              </div>
              <div>
                <div className="text-xs sm:text-xs md:text-sm font-bold leading-tight">
                  Configurar Evento
                </div>
                <div className={`text-[10px] sm:text-[11px] leading-tight mt-0.5 ${
                  activeTab === 'customizer' ? 'text-white/85' : 'text-stone-400'
                }`}>
                  Vagas, data e local
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Admin Content Container */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-28 lg:pb-12">

        {/* Firestore Cloud Persistence & Permission Sync Banner */}
        {firebaseSyncState && (
          <div
            className={`mb-6 rounded-2xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              firebaseSyncState.isConnected && firebaseSyncState.isVerifiedAdmin
                ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/90 border-amber-300 text-amber-950'
            }`}
          >
            <div className="flex items-start sm:items-center gap-3 text-xs">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  firebaseSyncState.isConnected && firebaseSyncState.isVerifiedAdmin
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-500 text-white'
                }`}
              >
                {firebaseSyncState.isConnected && firebaseSyncState.isVerifiedAdmin ? (
                  <Cloud className="w-4 h-4" />
                ) : (
                  <CloudOff className="w-4 h-4" />
                )}
              </div>
              <div>
                <div className="font-extrabold flex flex-wrap items-center gap-2">
                  <span>
                    {firebaseSyncState.isConnected && firebaseSyncState.isVerifiedAdmin
                      ? 'Banco de Dados e Gestão Ativos (farmaciademinas.marketing@gmail.com)'
                      : 'Sincronização em Nuvem Pendente de Autenticação do Gestor'}
                  </span>
                  {firebaseSyncState.isSyncing && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/80 text-teal-800 border border-teal-200">
                      Sincronizando...
                    </span>
                  )}
                </div>
                <div className="text-[11px] opacity-85 mt-0.5">
                  {firebaseSyncState.isConnected && firebaseSyncState.isVerifiedAdmin
                    ? `Conectado como ${firebaseSyncState.userEmail || 'farmaciademinas.marketing@gmail.com'} · Alterações em Status & Presença, Certificados e Materiais são persistidas em tempo real.`
                    : firebaseSyncState.error ||
                      'Conecte com a conta autorizada (farmaciademinas.marketing@gmail.com) para sincronizar diretamente com o banco de dados Firebase.'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {firebaseSyncState.isConnected && firebaseSyncState.isVerifiedAdmin ? (
                onDisconnectFirebaseAdmin && (
                  <button
                    type="button"
                    onClick={onDisconnectFirebaseAdmin}
                    className="px-3 py-1.5 text-[11px] font-bold text-emerald-900 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-colors cursor-pointer"
                  >
                    Encerrar Sessão do Gestor
                  </button>
                )
              ) : (
                onConnectFirebaseAdmin && (
                  <button
                    type="button"
                    onClick={onConnectFirebaseAdmin}
                    className="px-4 py-2 text-xs font-extrabold text-white bg-[#0a3641] hover:bg-[#0f4b59] rounded-xl shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Conectar com farmaciademinas.marketing@gmail.com
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* TAB CERTIFICADOS & DESIGN */}
        {activeTab === 'certificates' && (
          <AdminCertificateManager
            config={config}
            onUpdateConfig={onUpdateConfig}
            registrations={registrations}
            certificateDownloads={certificateDownloads}
            onToggleCertificateIssued={onToggleCertificateIssued || (() => {})}
            onReleaseAllPresentCertificates={onReleaseAllPresentCertificates || (() => 0)}
            onPreviewCertificate={onPreviewCertificate || (() => {})}
          />
        )}

        {/* TAB 1: GRÁFICOS & ANÁLISES DO PÚBLICO */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            
            {/* Dedicated SUS Manager Export Callout */}
            <div className={`rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 border transition-colors ${theme.banner}`}>
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-emerald-950">
                      Central Executiva de Relatórios e Exportação do SUS (Excel & PDF)
                    </h3>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded font-mono bg-emerald-200/80 text-emerald-800">
                      Formatos Oficiais
                    </span>
                  </div>
                  <p className="text-xs mt-1 leading-relaxed max-w-2xl text-emerald-800/90">
                    Exporte o dossiê analítico consolidado (com todos os campos da ficha e métricas das postagens) ou o relatório exclusivo do mural comunitário em Excel e PDF.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full lg:w-auto shrink-0">
                <button
                  onClick={handleExportAnalyticsExcel}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap"
                  title="Exportar todas as tabelas estatísticas em formato Microsoft Excel (.xls)"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                  <span>Estatísticas em Excel (.xls)</span>
                </button>

                <button
                  onClick={handleExportAnalyticsPDF}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-[#028090] hover:bg-[#0396a8] active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap"
                  title="Gerar Dossiê Estatístico Oficial em PDF com cabeçalho SUS"
                >
                  <Printer className="w-4 h-4 text-teal-100" />
                  <span>Dossiê Estatístico (PDF)</span>
                </button>

                <button
                  onClick={handleExportSocialPostsExcel}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap"
                  title="Exportar dados do Mural e engajamento em formato Excel"
                >
                  <MessageCircle className="w-4 h-4 text-[#ea7a38]" />
                  <span>Posts Mural (Excel)</span>
                </button>

                <button
                  onClick={handleExportSocialPostsPDF}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap"
                  title="Exportar relatório do Mural Social em PDF"
                >
                  <Printer className="w-4 h-4 text-purple-600" />
                  <span>Posts Mural (PDF)</span>
                </button>
              </div>
            </div>

            {/* Real-time Status & Sync Bar */}
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${theme.card}`}>
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <div>
                  <div className="text-xs font-bold text-[#0a3641] flex items-center gap-1.5">
                    <span>Sincronização em Tempo Real Ativa</span>
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.2 rounded-full font-bold">
                      LIVE
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500">
                    Os gráficos atualizam instantaneamente conforme o uso da plataforma (novas inscrições, exclusões e postagens no mural).
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <span className="text-[11px] font-mono text-stone-400">
                  Atualizado: {lastSyncTime}
                </span>
                <button
                  onClick={() => setLastSyncTime(new Date().toLocaleTimeString('pt-BR'))}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#0a3641] bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                  title="Forçar atualização das métricas agora"
                >
                  <RefreshCw className="w-3 h-3 text-[#ea7a38]" />
                  <span>Atualizar Agora</span>
                </button>
              </div>
            </div>

            {/* KPI Cards Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`p-5 rounded-2xl border transition-colors ${theme.card}`}>
                <div className={`flex items-center justify-between text-xs font-medium mb-1 ${theme.textMuted}`}>
                  <span>Total de Inscrições</span>
                  <Users className="w-4 h-4 text-[#0a3641]" />
                </div>
                <div className="text-3xl font-extrabold tabular-nums text-[#0a3641]">
                  {totalRegistrations}
                </div>
                <div className={`text-xs mt-1 flex items-center gap-1 ${theme.textMuted}`}>
                  <span>Capacidade: <strong>{config.maxSpots}</strong></span>
                  <span className="opacity-40">·</span>
                  <span className="text-[#ea7a38] font-semibold">{remainingSpots} vagas livres</span>
                </div>
              </div>

              <div className={`p-5 rounded-2xl border transition-colors ${theme.card}`}>
                <div className={`flex items-center justify-between text-xs font-medium mb-1 ${theme.textMuted}`}>
                  <span>Credenciamento</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-3xl font-extrabold text-emerald-500 tabular-nums">
                  {checkedInCount}
                </div>
                <div className={`text-xs mt-1 ${theme.textMuted}`}>
                  Taxa de presença: <strong>{checkInRate}%</strong> ({totalRegistrations - checkedInCount} pendentes)
                </div>
              </div>

              <div className={`p-5 rounded-2xl border transition-colors ${theme.card}`}>
                <div className={`flex items-center justify-between text-xs font-medium mb-1 ${theme.textMuted}`}>
                  <span>Mural da Comunidade</span>
                  <MessageCircle className="w-4 h-4 text-[#ea7a38]" />
                </div>
                <div className="text-3xl font-extrabold text-[#ea7a38] tabular-nums">
                  {totalPosts}
                </div>
                <div className={`text-xs mt-1 ${theme.textMuted}`}>
                  {totalLikes} curtidas · {postsWithPhoto} com foto ({avgLikesPerPost}/post)
                </div>
              </div>

              <div className={`p-5 rounded-2xl border transition-colors ${theme.card}`}>
                <div className={`flex items-center justify-between text-xs font-medium mb-1 ${theme.textMuted}`}>
                  <span>Downloads da RAPS</span>
                  <Download className="w-4 h-4 text-[#2a9d8f]" />
                </div>
                <div className="text-3xl font-extrabold text-[#2a9d8f] tabular-nums">
                  {totalMaterialsDownloads}
                </div>
                <div className={`text-xs mt-1 ${theme.textMuted}`}>
                  Materiais técnicos baixados ({materials.length} PDFs disponíveis)
                </div>
              </div>
            </div>

            {/* Category Filter for Analytics Tabs */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 bg-stone-100 rounded-xl border border-stone-200">
              <button
                type="button"
                onClick={() => setAnalyticsCategoryFilter('all')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  analyticsCategoryFilter === 'all'
                    ? 'bg-white text-[#0a3641] shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Todos os Gráficos ({totalRegistrations} inscritos · {totalPosts} posts)
              </button>
              <button
                type="button"
                onClick={() => setAnalyticsCategoryFilter('recharts')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  analyticsCategoryFilter === 'recharts'
                    ? 'bg-white text-[#0a3641] shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-[#0a3641]" />
                <span>Dashboard Visual Recharts (Destaque)</span>
              </button>
              <button
                type="button"
                onClick={() => setAnalyticsCategoryFilter('form_fields')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  analyticsCategoryFilter === 'form_fields'
                    ? 'bg-white text-[#0a3641] shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-[#028090]" />
                <span>Campos da Ficha de Inscrição (14 Gráficos)</span>
              </button>
              <button
                type="button"
                onClick={() => setAnalyticsCategoryFilter('posts')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  analyticsCategoryFilter === 'posts'
                    ? 'bg-white text-[#0a3641] shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5 text-[#ea7a38]" />
                <span>Mural Comunitário & Postagens (5 Gráficos)</span>
              </button>
            </div>

            {/* SECTION 0: DASHBOARD VISUAL RECHARTS (CATEGORIA PROFISSIONAL, NÍVEL SUS, EVOLUÇÃO & POSTAGENS) */}
            {(analyticsCategoryFilter === 'all' || analyticsCategoryFilter === 'recharts') && (
              <RechartsVisualDashboard
                registrations={registrations}
                socialPosts={socialPosts}
                maxSpots={config.maxSpots}
              />
            )}

            {/* SECTION 1: GRÁFICOS SOBRE TODOS OS CAMPOS DA FICHA DE INSCRIÇÃO */}
            {(analyticsCategoryFilter === 'all' || analyticsCategoryFilter === 'form_fields') && (
              <div className="space-y-6">
                <div className="border-b pb-2 border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#028090] shrink-0" />
                    <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-stone-700">
                      Gráficos Analíticos: Todos os Campos da Ficha de Inscrição
                    </h3>
                  </div>
                  <span className="text-xs text-stone-500 font-mono">
                    Base: {totalRegistrations} participantes cadastrados
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* 1. Município de Atuação / Residência */}
                  <div className={`p-6 rounded-2xl border transition-colors space-y-4 ${theme.card}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#d96522]" />
                        <h3 className={`text-base font-bold ${theme.textHeading}`}>
                          1. Município de Atuação / Residência
                        </h3>
                      </div>
                      <span className={`text-xs font-mono ${theme.textMuted}`}>Campo: city</span>
                    </div>

                    <div className="space-y-3 pt-2">
                      {displayCities.map(([cityName, count]) => {
                        const percentage = totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0;
                        return (
                          <div key={cityName} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-stone-800">{cityName}</span>
                              <span className={`font-mono ${theme.textMuted}`}>{count} inscritos ({percentage}%)</span>
                            </div>
                            <div className={`w-full h-2 rounded-full overflow-hidden ${theme.innerTrack}`}>
                              <div
                                className="h-full rounded-full transition-all duration-300 bg-[#0a3641]"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Categoria Profissional / Ocupação */}
                  <div className={`p-6 rounded-2xl border transition-colors space-y-4 ${theme.card}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-[#0a3641]" />
                        <h3 className={`text-base font-bold ${theme.textHeading}`}>
                          2. Categoria Profissional & Ocupações
                        </h3>
                      </div>
                      <span className={`text-xs font-mono ${theme.textMuted}`}>Campo: professionalRole</span>
                    </div>

                    <div className="space-y-3 pt-2">
                      {displayRoles.map(([roleName, count]) => {
                        const percentage = totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0;
                        return (
                          <div key={roleName} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold truncate pr-2 text-stone-800">{roleName}</span>
                              <span className={`font-mono shrink-0 ${theme.textMuted}`}>{count} ({percentage}%)</span>
                            </div>
                            <div className={`w-full h-2 rounded-full overflow-hidden ${theme.innerTrack}`}>
                              <div
                                className="h-full bg-gradient-to-r from-[#d96522] to-[#ea7a38] rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Nível de Atenção no SUS / Vínculo com a RAPS */}
                  <div className={`p-6 rounded-2xl border transition-colors space-y-4 lg:col-span-2 ${theme.card}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#028090]" />
                        <h3 className={`text-base font-bold ${theme.textHeading}`}>
                          3. Nível de Atenção no SUS & Vínculo com a RAPS
                        </h3>
                      </div>
                      <span className={`text-xs font-mono ${theme.textMuted}`}>Campo: susCareLevel</span>
                    </div>

                    <div className="space-y-3 pt-2">
                      {sortedSusCareLevels.map(([lvl, count]) => {
                        const percentage = totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0;
                        return (
                          <div key={lvl} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-stone-800">{lvl}</span>
                              <span className={`font-mono ${theme.textMuted}`}>{count} profissionais ({percentage}%)</span>
                            </div>
                            <div className={`w-full h-2 rounded-full overflow-hidden ${theme.innerTrack}`}>
                              <div
                                className="h-full bg-gradient-to-r from-[#028090] via-[#2a9d8f] to-[#ea7a38] rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4. Eixo Temático de Interesse */}
                  <div className={`p-6 rounded-2xl border transition-colors space-y-4 ${theme.card}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#2a9d8f]" />
                        <h3 className={`text-base font-bold ${theme.textHeading}`}>
                          4. Eixo Temático de Maior Interesse
                        </h3>
                      </div>
                      <span className={`text-xs font-mono ${theme.textMuted}`}>Campo: axisInterest</span>
                    </div>

                    <div className="space-y-3 pt-2">
                      {Object.entries(axisCounts).map(([axisTitle, count]) => {
                        const pct = totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0;
                        return (
                          <div key={axisTitle} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-stone-800 line-clamp-1">{axisTitle}</span>
                              <span className="font-mono text-stone-500 shrink-0">{count} ({pct}%)</span>
                            </div>
                            <div className="w-full h-2.5 rounded-full overflow-hidden bg-stone-100">
                              <div
                                className="h-full bg-gradient-to-r from-[#028090] to-[#2a9d8f] rounded-full transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 5. Status da Inscrição & Credenciamento */}
                  <div className={`p-6 rounded-2xl border transition-colors space-y-4 ${theme.card}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <h3 className={`text-base font-bold ${theme.textHeading}`}>
                          5. Status da Inscrição & Presença
                        </h3>
                      </div>
                      <span className={`text-xs font-mono ${theme.textMuted}`}>Campo: status</span>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-emerald-800">Credenciado / Presente no Local</span>
                          <span className="font-mono text-emerald-700 font-bold">{statusCounts.presente} ({checkInRate}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden bg-stone-100">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${checkInRate}%` }} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-amber-800">Confirmada (Pendente Check-in)</span>
                          <span className="font-mono text-amber-700 font-bold">
                            {statusCounts.confirmada} ({totalRegistrations > 0 ? Math.round((statusCounts.confirmada / totalRegistrations) * 100) : 0}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden bg-stone-100">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${totalRegistrations > 0 ? (statusCounts.confirmada / totalRegistrations) * 100 : 0}%` }} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-rose-800">Cancelada</span>
                          <span className="font-mono text-rose-700 font-bold">
                            {statusCounts.cancelada} ({totalRegistrations > 0 ? Math.round((statusCounts.cancelada / totalRegistrations) * 100) : 0}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden bg-stone-100">
                          <div className="h-full bg-rose-400 rounded-full" style={{ width: `${totalRegistrations > 0 ? (statusCounts.cancelada / totalRegistrations) * 100 : 0}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 6. Perfil Etário (Faixa Etária) */}
                  <div className={`p-6 rounded-2xl border transition-colors space-y-4 ${theme.card}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#ea7a38]" />
                        <h3 className={`text-base font-bold ${theme.textHeading}`}>
                          6. Perfil Demográfico por Faixa Etária
                        </h3>
                      </div>
                      <span className={`text-xs font-mono ${theme.textMuted}`}>Campo: ageGroup</span>
                    </div>

                    <div className="space-y-3 pt-2">
                      {Object.entries(ageGroupCounts).map(([ageGroup, count]) => {
                        const percentage = totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0;
                        return (
                          <div key={ageGroup} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-stone-800">{ageGroup}</span>
                              <span className={`font-mono ${theme.textMuted}`}>{count} ({percentage}%)</span>
                            </div>
                            <div className={`w-full h-2 rounded-full overflow-hidden ${theme.innerTrack}`}>
                              <div
                                className="h-full bg-gradient-to-r from-[#0a3641] to-[#028090] rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 7. Escolaridade & Formação Acadêmica */}
                  <div className={`p-6 rounded-2xl border transition-colors space-y-4 ${theme.card}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-[#028090]" />
                        <h3 className={`text-base font-bold ${theme.textHeading}`}>
                          7. Nível de Escolaridade & Formação
                        </h3>
                      </div>
                      <span className={`text-xs font-mono ${theme.textMuted}`}>Campo: educationLevel</span>
                    </div>

                    <div className="space-y-3 pt-2">
                      {Object.entries(educationLevelCounts).map(([edLevel, count]) => {
                        const percentage = totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0;
                        return (
                          <div key={edLevel} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-stone-800">{edLevel}</span>
                              <span className={`font-mono ${theme.textMuted}`}>{count} ({percentage}%)</span>
                            </div>
                            <div className={`w-full h-2 rounded-full overflow-hidden ${theme.innerTrack}`}>
                              <div
                                className="h-full bg-gradient-to-r from-[#d96522] to-[#ea7a38] rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 8. Eficácia dos Canais de Divulgação */}
                  <div className={`p-6 rounded-2xl border transition-colors space-y-4 ${theme.card}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Send className="w-4 h-4 text-[#ea7a38]" />
                        <h3 className={`text-base font-bold ${theme.textHeading}`}>
                          8. Canais de Divulgação Mais Eficazes
                        </h3>
                      </div>
                      <span className={`text-xs font-mono ${theme.textMuted}`}>Campo: referralSource</span>
                    </div>

                    <div className="space-y-3 pt-2">
                      {sortedReferralSources.map(([src, count]) => {
                        const percentage = totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0;
                        return (
                          <div key={src} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold truncate pr-2 text-stone-800">{src}</span>
                              <span className={`font-mono shrink-0 ${theme.textMuted}`}>{count} ({percentage}%)</span>
                            </div>
                            <div className={`w-full h-2 rounded-full overflow-hidden ${theme.innerTrack}`}>
                              <div
                                className="h-full bg-gradient-to-r from-[#2a9d8f] to-[#028090] rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 9. Demandas de Acessibilidade & Inclusão */}
                  <div className={`p-6 rounded-2xl border transition-colors space-y-4 ${theme.card}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Accessibility className="w-4 h-4 text-[#028090]" />
                        <h3 className={`text-base font-bold ${theme.textHeading}`}>
                          9. Demandas de Acessibilidade & Inclusão
                        </h3>
                      </div>
                      <span className={`text-xs font-mono ${theme.textMuted}`}>Campo: accessibilityNeeds</span>
                    </div>

                    <div className="space-y-3 pt-2">
                      {Object.entries(accessibilityCounts).map(([accNeed, count]) => {
                        const percentage = totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0;
                        return (
                          <div key={accNeed} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-stone-800">
                                {accNeed === 'Nenhuma' ? 'Sem necessidade declarada' : accNeed}
                              </span>
                              <span className={`font-mono ${theme.textMuted}`}>{count} ({percentage}%)</span>
                            </div>
                            <div className={`w-full h-2 rounded-full overflow-hidden ${theme.innerTrack}`}>
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  accNeed === 'Nenhuma' ? 'bg-[#028090]' : 'bg-[#ea7a38]'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 10. Canal de Entrada da Inscrição */}
                  <div className={`p-6 rounded-2xl border transition-colors space-y-4 ${theme.card}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                        <h3 className={`text-base font-bold ${theme.textHeading}`}>
                          10. Canal de Entrada da Inscrição
                        </h3>
                      </div>
                      <span className={`text-xs font-mono ${theme.textMuted}`}>Campo: origin</span>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-emerald-800">Portal Web Oficial SUS</span>
                          <span className="font-mono text-emerald-700 font-bold">
                            {portalCount} ({totalRegistrations > 0 ? Math.round((portalCount / totalRegistrations) * 100) : 0}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden bg-stone-100">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${totalRegistrations > 0 ? (portalCount / totalRegistrations) * 100 : 0}%` }} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-purple-800">Google Forms / Planilha Excel</span>
                          <span className="font-mono text-purple-700 font-bold">
                            {googleFormsCount} ({totalRegistrations > 0 ? Math.round((googleFormsCount / totalRegistrations) * 100) : 0}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden bg-stone-100">
                          <div className="h-full bg-purple-600 rounded-full" style={{ width: `${totalRegistrations > 0 ? (googleFormsCount / totalRegistrations) * 100 : 0}%` }} />
                        </div>
                      </div>

                      {presencialCount > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-stone-800">Inscrição Presencial</span>
                            <span className="font-mono text-stone-700 font-bold">
                              {presencialCount} ({totalRegistrations > 0 ? Math.round((presencialCount / totalRegistrations) * 100) : 0}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full overflow-hidden bg-stone-100">
                            <div className="h-full bg-stone-500 rounded-full" style={{ width: `${totalRegistrations > 0 ? (presencialCount / totalRegistrations) * 100 : 0}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 11. Redes Sociais & Adesão aos Canais Oficiais */}
                  <div className={`p-6 rounded-2xl border transition-colors space-y-4 ${theme.card}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Instagram className="w-4 h-4 text-pink-600" />
                        <h3 className={`text-base font-bold ${theme.textHeading}`}>
                          11. Redes Sociais & Preferências de Contato
                        </h3>
                      </div>
                      <span className={`text-xs font-mono ${theme.textMuted}`}>Campos: instagram, whatsapp</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className={`p-3 rounded-xl border ${theme.subCard}`}>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-pink-600">
                          <Instagram className="w-4 h-4" />
                          <span>Com Instagram</span>
                        </div>
                        <div className="text-2xl font-black mt-1 font-mono text-[#0a3641]">{registrantsWithInstagram}</div>
                        <div className="text-[11px] text-stone-500 mt-0.5">{instagramPct}% dos inscritos</div>
                      </div>

                      <div className={`p-3 rounded-xl border ${theme.subCard}`}>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700">
                          <Globe className="w-4 h-4 shrink-0" />
                          <span>LinkedIn / Currículo / Site</span>
                        </div>
                        <div className="text-2xl font-black mt-1 font-mono text-[#0a3641]">{registrantsWithLinkedin}</div>
                        <div className="text-[11px] text-stone-500 mt-0.5">{linkedinPct}% dos inscritos</div>
                      </div>

                      <div className={`p-3 rounded-xl border ${theme.subCard}`}>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                          <MessageCircle className="w-4 h-4" />
                          <span>Aceitam WhatsApp</span>
                        </div>
                        <div className="text-2xl font-black mt-1 font-mono text-emerald-600">{registrantsAcceptWhatsapp}</div>
                        <div className="text-[11px] text-stone-500 mt-0.5">{whatsappOptInPct}% da base</div>
                      </div>

                      <div className={`p-3 rounded-xl border ${theme.subCard}`}>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#0a3641]">
                          <Mail className="w-4 h-4" />
                          <span>Aceitam E-mail</span>
                        </div>
                        <div className="text-2xl font-black mt-1 font-mono text-[#0a3641]">{registrantsAcceptEmail}</div>
                        <div className="text-[11px] text-stone-500 mt-0.5">{emailOptInPct}% da base</div>
                      </div>
                    </div>
                  </div>

                  {/* 12. Emissão e Downloads de Certificados de 8 horas */}
                  <div className={`p-6 rounded-2xl border transition-colors space-y-4 ${theme.card}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-emerald-600 shrink-0" />
                        <h3 className={`text-base font-bold ${theme.textHeading}`}>
                          12. Emissão &amp; Downloads de Certificados (8h)
                        </h3>
                      </div>
                      <span className={`text-xs font-mono shrink-0 ${theme.textMuted}`}>Campos: certificateIssued/Downloaded</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div className={`p-3.5 rounded-xl border ${theme.subCard}`}>
                        <div className="text-[11px] font-bold text-emerald-700">Liberados</div>
                        <div className="text-2xl font-black mt-1 font-mono text-emerald-600">{certificateIssuedCount}</div>
                        <div className="text-[11px] text-stone-500 mt-0.5">{certificateRate}% credenciados</div>
                      </div>

                      <div className={`p-3.5 rounded-xl border ${theme.subCard}`}>
                        <div className="text-[11px] font-bold text-amber-700">Aguardando</div>
                        <div className="text-2xl font-black mt-1 font-mono text-amber-600">{certificatePendingCount}</div>
                        <div className="text-[11px] text-stone-500 mt-0.5">{100 - certificateRate}% pendentes</div>
                      </div>

                      <div className={`p-3.5 rounded-xl border ${theme.subCard}`}>
                        <div className="text-[11px] font-bold text-cyan-700">Baixados</div>
                        <div className="text-2xl font-black mt-1 font-mono text-cyan-600">{certificateDownloadedCount}</div>
                        <div className="text-[11px] text-stone-500 mt-0.5">{certificateDownloadedPct}% emitidos</div>
                      </div>
                    </div>

                    <div className="w-full h-2 rounded-full overflow-hidden bg-stone-100 flex">
                      <div className="h-full bg-emerald-500" style={{ width: `${certificateRate}%` }} />
                      <div className="h-full bg-amber-300" style={{ width: `${100 - certificateRate}%` }} />
                    </div>
                  </div>

                  {/* 13. Principais Instituições e Lotações */}
                  <div className={`p-6 rounded-2xl border transition-colors space-y-4 ${theme.card}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#0a3641] shrink-0" />
                        <h3 className={`text-base font-bold ${theme.textHeading}`}>
                          13. Principais Instituições e Lotações (Top 10)
                        </h3>
                      </div>
                      <span className={`text-xs font-mono shrink-0 ${theme.textMuted}`}>Campo: institution</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {sortedInstitutions.map(([inst, count]) => {
                        const pct = totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0;
                        return (
                          <div key={inst} className={`p-3 rounded-xl border flex items-center justify-between ${theme.subCard}`}>
                            <div className="min-w-0 pr-2">
                              <div className="font-bold text-xs text-stone-900 truncate">{inst}</div>
                              <div className="text-[10px] text-stone-500">{pct}% do público inscrito</div>
                            </div>
                            <span className="font-mono font-bold text-xs text-[#ea7a38] shrink-0 bg-white px-2 py-0.5 rounded border border-stone-200">
                              {count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 14. Evolução Diária das Inscrições */}
                  <div className={`p-6 rounded-2xl border transition-colors space-y-4 lg:col-span-2 ${theme.card}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#028090] shrink-0" />
                        <h3 className={`text-base font-bold ${theme.textHeading}`}>
                          14. Ritmo Diário das Inscrições (Por Data)
                        </h3>
                      </div>
                      <span className={`text-xs font-mono shrink-0 ${theme.textMuted}`}>Campo: registeredAt</span>
                    </div>

                    <div className="space-y-3 pt-2">
                      {sortedRegistrationDates.map(({ isoDate, label, count }) => {
                        const pct = totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0;
                        return (
                          <div key={isoDate} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono font-semibold text-stone-800">{label}</span>
                              <span className={`font-mono ${theme.textMuted}`}>{count} inscrições ({pct}%)</span>
                            </div>
                            <div className={`w-full h-2 rounded-full overflow-hidden ${theme.innerTrack}`}>
                              <div
                                className="h-full bg-gradient-to-r from-[#028090] to-emerald-500 rounded-full transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* SECTION 2: GRÁFICOS SOBRE POSTAGENS FEITAS (MURAL SOCIAL) */}
            {(analyticsCategoryFilter === 'all' || analyticsCategoryFilter === 'posts') && (
              <div className="space-y-6 pt-4">
                <div className="border-b pb-2 border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ea7a38]" />
                    <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-stone-700">
                      Métricas & Gráficos: Postagens Feitas no Mural da Comunidade
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportSocialPostsExcel}
                      className="px-3 py-1 text-xs font-bold text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Exportar Posts (Excel)</span>
                    </button>
                    <button
                      onClick={handleExportSocialPostsPDF}
                      className="px-3 py-1 text-xs font-bold text-white bg-[#0a3641] hover:bg-[#0f4b59] rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#ea7a38]" />
                      <span>Relatório Posts (PDF)</span>
                    </button>
                  </div>
                </div>

                <div className={`p-6 rounded-2xl border transition-colors space-y-6 ${theme.card}`}>
                  
                  {/* KPI Cards Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className={`p-3.5 rounded-xl border ${theme.subCard}`}>
                      <div className="text-[11px] font-medium text-stone-500">Total de Postagens</div>
                      <div className="text-2xl font-black font-mono mt-1 text-[#0a3641]">{totalPosts}</div>
                      <div className="text-[11px] text-stone-400 mt-0.5">Mensagens publicadas</div>
                    </div>

                    <div className={`p-3.5 rounded-xl border ${theme.subCard}`}>
                      <div className="text-[11px] font-medium text-stone-500">Total de Curtidas / Apoios</div>
                      <div className="text-2xl font-black font-mono mt-1 text-rose-500">{totalLikes}</div>
                      <div className="text-[11px] text-stone-400 mt-0.5">{avgLikesPerPost} por publicação</div>
                    </div>

                    <div className={`p-3.5 rounded-xl border ${theme.subCard}`}>
                      <div className="text-[11px] font-medium text-stone-500">Posts com Fotos</div>
                      <div className="text-2xl font-black font-mono mt-1 text-[#028090]">{postsWithPhoto}</div>
                      <div className="text-[11px] text-stone-400 mt-0.5">
                        {totalPosts > 0 ? Math.round((postsWithPhoto / totalPosts) * 100) : 0}% com anexo visual
                      </div>
                    </div>

                    <div className={`p-3.5 rounded-xl border ${theme.subCard}`}>
                      <div className="text-[11px] font-medium text-stone-500">Posts em Texto Puro</div>
                      <div className="text-2xl font-black font-mono mt-1 text-amber-600">{postsTextOnly}</div>
                      <div className="text-[11px] text-stone-400 mt-0.5">Depoimentos reflexivos</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                    
                    {/* Gráfico 1: Postagens por Município do Autor */}
                    <div className={`p-5 rounded-xl border space-y-3 ${theme.subCard}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-[#ea7a38]" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 font-mono">
                            Postagens por Município dos Autores
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono text-stone-500">Território</span>
                      </div>

                      <div className="space-y-2 pt-1">
                        {sortedPostCities.map(([c, count]) => {
                          const pct = totalPosts > 0 ? Math.round((count / totalPosts) * 100) : 0;
                          return (
                            <div key={c} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-stone-800">{c}</span>
                                <span className="font-mono text-stone-500 font-bold">{count} posts ({pct}%)</span>
                              </div>
                              <div className="w-full h-2 rounded-full overflow-hidden bg-stone-200">
                                <div className="h-full bg-[#ea7a38] rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Gráfico 2: Postagens por Categoria Profissional do Autor */}
                    <div className={`p-5 rounded-xl border space-y-3 ${theme.subCard}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-[#028090]" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 font-mono">
                            Postagens por Categoria Profissional
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono text-stone-500">Ocupações</span>
                      </div>

                      <div className="space-y-2 pt-1">
                        {sortedPostRoles.slice(0, 6).map(([r, count]) => {
                          const pct = totalPosts > 0 ? Math.round((count / totalPosts) * 100) : 0;
                          return (
                            <div key={r} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold truncate pr-2 text-stone-800">{r}</span>
                                <span className="font-mono text-stone-500 font-bold shrink-0">{count} posts ({pct}%)</span>
                              </div>
                              <div className="w-full h-2 rounded-full overflow-hidden bg-stone-200">
                                <div className="h-full bg-[#028090] rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Gráfico 3: Formato de Conteúdo (Foto vs Texto) */}
                    <div className={`p-5 rounded-xl border space-y-3 lg:col-span-2 ${theme.subCard}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-purple-600" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 font-mono">
                            Proporção de Conteúdo: Fotos vs Texto
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono text-stone-500">Formato</span>
                      </div>

                      <div className="pt-2 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#028090]">Com Fotos Anexadas: {postsWithPhoto} ({totalPosts > 0 ? Math.round((postsWithPhoto / totalPosts) * 100) : 0}%)</span>
                          <span className="font-bold text-amber-700">Texto Puro: {postsTextOnly} ({totalPosts > 0 ? Math.round((postsTextOnly / totalPosts) * 100) : 0}%)</span>
                        </div>

                        <div className="w-full h-3.5 rounded-full overflow-hidden bg-stone-200 flex">
                          <div
                            className="h-full bg-gradient-to-r from-[#028090] to-teal-500"
                            style={{ width: `${totalPosts > 0 ? (postsWithPhoto / totalPosts) * 100 : 0}%` }}
                          />
                          <div
                            className="h-full bg-gradient-to-r from-amber-400 to-[#ea7a38]"
                            style={{ width: `${totalPosts > 0 ? (postsTextOnly / totalPosts) * 100 : 0}%` }}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                          <div className="p-2 rounded-lg bg-teal-50 border border-teal-200 text-teal-900">
                            <strong>{postsWithPhoto} posts</strong> trazem registros fotográficos das equipes e unidades do SUS.
                          </div>
                          <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                            <strong>{postsTextOnly} posts</strong> são reflexões e depoimentos textuais sobre a Saúde Mental.
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Gráfico 4: Ranking das 5 Postagens Mais Curtidas / Apoiadas */}
                  <div className="space-y-3 pt-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 font-mono">
                          4. Ranking: Postagens Mais Apoiadas da Comunidade
                        </h4>
                      </div>
                      <button
                        onClick={() => setActiveTab('posts')}
                        className="text-xs text-[#d96522] hover:underline font-bold cursor-pointer"
                      >
                        Ver todas as postagens &rarr;
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {topLikedPosts.map((p, idx) => (
                        <div key={p.id} className="p-3.5 rounded-xl border border-stone-200 bg-white shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-[#0a3641] text-white flex items-center justify-center text-[10px] font-black">
                                {idx + 1}
                              </span>
                              <span className="font-bold text-xs text-stone-900 truncate max-w-[130px]">{p.authorName}</span>
                            </div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-50 text-rose-600 border border-rose-200">
                              <Heart className="w-3 h-3 fill-rose-500" /> {p.likes}
                            </span>
                          </div>

                          <p className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed italic">
                            "{p.content}"
                          </p>

                          <div className="text-[10px] text-stone-400 flex items-center justify-between pt-1 border-t border-stone-100">
                            <span>{p.city} · {p.authorRole}</span>
                            <span>{p.createdAt}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Gráfico 5: Engajamento / Curtidas por Município */}
                  <div className={`p-5 rounded-xl border space-y-3 ${theme.subCard}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-rose-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 font-mono">
                          5. Engajamento (Total de Curtidas por Município)
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-stone-500">Interações</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                      {sortedPostLikesByCity.map(([c, likesSum]) => {
                        const pct = totalLikes > 0 ? Math.round((likesSum / totalLikes) * 100) : 0;
                        return (
                          <div key={c} className="p-3 rounded-lg bg-white border border-stone-200 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-stone-800">{c}</span>
                              <span className="font-mono text-rose-600 font-bold">{likesSum} curtidas ({pct}%)</span>
                            </div>
                            <div className="w-full h-2 rounded-full overflow-hidden bg-stone-100">
                              <div className="h-full bg-gradient-to-r from-rose-500 to-[#ea7a38] rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 2: INSCRIÇÕES & BANCO DE DADOS */}
        {activeTab === 'attendees' && (
          <div className={`rounded-2xl border p-6 space-y-6 transition-colors ${theme.card}`}>
            
            {/* Delete Notice Banner */}
            {attendeeDeleteNotice && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{attendeeDeleteNotice}</span>
              </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-[#ea7a38] uppercase tracking-wider mb-1 font-mono flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#ea7a38]" />
                  <span>Base Oficial SUS · Microrregião de Carangola</span>
                </div>
                <h3 className={`text-lg font-bold ${theme.textHeading}`}>
                  Banco de Dados de Inscrição de Participantes (Modelo Excel & PDF)
                </h3>
                <p className={`text-xs ${theme.textMuted}`}>
                  Controle cadastral completo com todos os {totalRegistrations} inscritos, validação de presença na portaria e emissão de certificados.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('customizer');
                    setCustomizerSubView('badge');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#0a3641] bg-[#faeee5] hover:bg-[#f6dfd0] border border-[#ea7a38]/40 active:scale-95 rounded-lg shadow-xs transition-all cursor-pointer"
                  title="Alterar layout, cores e campos do Crachá Oficial"
                >
                  <Palette className="w-4 h-4 text-[#d96522]" />
                  <span>Design do Crachá</span>
                </button>

                <button
                  onClick={() => setIsGoogleFormsModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-black text-white bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 hover:brightness-110 active:scale-95 rounded-lg shadow-sm transition-all cursor-pointer"
                  title="Importar respostas do Google Forms (Arquivo Excel / CSV ou link)"
                >
                  <FileSpreadsheet className="w-4 h-4 text-purple-200" />
                  <span>Integrar Google Forms (.xlsx)</span>
                </button>

                <button
                  onClick={handleExportAttendeesExcel}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 active:scale-95 rounded-lg shadow-xs transition-all cursor-pointer"
                  title="Baixar banco de dados completo de inscritos em formato Microsoft Excel (.xls)"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                  <span>Modelo Excel (.xls)</span>
                </button>

                <button
                  onClick={handleExportAttendeesPDF}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#028090] hover:bg-[#0396a8] active:scale-95 rounded-lg shadow-xs transition-all cursor-pointer"
                  title="Gerar Folha Oficial de Presença e Credenciamento em PDF"
                >
                  <Printer className="w-4 h-4 text-teal-100" />
                  <span>Lista Oficial em PDF</span>
                </button>

                <button
                  onClick={handleExportAttendeesCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 dark:bg-[#12303a] dark:text-stone-200 dark:hover:bg-[#183d4a] rounded-lg transition-colors cursor-pointer"
                  title="Exportar CSV padrão"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {/* Multichannel Banner: Portal + Google Forms */}
            <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent border-purple-300/40`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-bold text-[#0a3641] dark:text-stone-100">
                      Unificação de Participantes (Portal Oficial + Importação de Planilhas / Google Forms)
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200">
                      {googleFormsCount} vindos do Google Forms
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                      {portalCount} pelo Portal Web
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                    Os participantes inscritos no Google Forms e no portal oficial são unificados automaticamente na mesma lista para credenciamento, crachás e certificados.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
                <button
                  onClick={() => setIsGoogleFormsModalOpen(true)}
                  className="w-full md:w-auto px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Importar Excel / Sincronizar Google Forms</span>
                </button>
              </div>
            </div>

            {/* Filters Row */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 p-3.5 rounded-xl border transition-colors ${theme.subCard}`}>
              <div className="relative">
                <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${theme.textMuted}`} />
                <input
                  type="text"
                  value={attendeeSearch}
                  onChange={(e) => setAttendeeSearch(e.target.value)}
                  placeholder="Buscar por nome, CPF, redes..."
                  className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-md border focus:outline-none focus:ring-1 transition-colors ${theme.input}`}
                />
              </div>

              <div>
                <select
                  value={filterCity}
                  onChange={(e) => setFilterCity(e.target.value)}
                  className={`w-full px-3 py-1.5 text-xs rounded-md border focus:outline-none focus:ring-1 transition-colors ${theme.input}`}
                >
                  <option value="all">Todos os Municípios</option>
                  {REGIONAL_CITIES.map((c) => (
                    <option key={c} value={c} className={isDarkMode ? 'bg-[#06151c] text-stone-100' : 'bg-white text-stone-900'}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className={`w-full px-3 py-1.5 text-xs rounded-md border focus:outline-none focus:ring-1 transition-colors ${theme.input}`}
                >
                  <option value="all">Todos os Status</option>
                  <option value="confirmada" className={isDarkMode ? 'bg-[#06151c] text-stone-100' : 'bg-white text-stone-900'}>Fazer Check-in (Pendente)</option>
                  <option value="presente" className={isDarkMode ? 'bg-[#06151c] text-stone-100' : 'bg-white text-stone-900'}>Credenciado (Presente)</option>
                  <option value="cancelada" className={isDarkMode ? 'bg-[#06151c] text-stone-100' : 'bg-white text-stone-900'}>Cancelada</option>
                </select>
              </div>

              <div>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className={`w-full px-3 py-1.5 text-xs rounded-md border focus:outline-none focus:ring-1 transition-colors ${theme.input}`}
                >
                  <option value="all">Todas as Funções</option>
                  {PROFESSIONAL_ROLES.map((r) => (
                    <option key={r} value={r} className={isDarkMode ? 'bg-[#06151c] text-stone-100' : 'bg-white text-stone-900'}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={filterSusCareLevel}
                  onChange={(e) => setFilterSusCareLevel(e.target.value)}
                  className={`w-full px-3 py-1.5 text-xs rounded-md border focus:outline-none focus:ring-1 transition-colors ${theme.input}`}
                >
                  <option value="all">Todos os Vínculos SUS</option>
                  {SUS_CARE_LEVEL_LIST.map((lvl) => (
                    <option key={lvl} value={lvl} className={isDarkMode ? 'bg-[#06151c] text-stone-100' : 'bg-white text-stone-900'}>
                      {lvl.split('/')[0]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={filterOrigin}
                  onChange={(e) => setFilterOrigin(e.target.value as any)}
                  className={`w-full px-3 py-1.5 text-xs rounded-md border focus:outline-none focus:ring-1 transition-colors ${theme.input}`}
                >
                  <option value="all">Todas as Origens ({totalRegistrations})</option>
                  <option value="portal">Apenas Portal Oficial ({portalCount})</option>
                  <option value="google_forms">Apenas Google Forms ({googleFormsCount})</option>
                </select>
              </div>
            </div>

            {emailResendToast && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                  emailResendToast.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{emailResendToast.message}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {emailResendToast.mailtoHref && (
                    <a
                      href={emailResendToast.mailtoHref}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0a3641] text-white font-bold hover:bg-[#028090] transition-colors"
                    >
                      <Send className="w-3 h-3" />
                      <span>Abrir App de E-mail</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setEmailResendToast(null)}
                    className="px-2 py-1 text-[11px] font-bold rounded-md hover:bg-black/5 cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}

            {/* Mobile & Tablet View: Responsive Attendee Cards (Smartphones & Tablets) */}
            <div className="block xl:hidden space-y-3">
              {filteredAttendees.length === 0 ? (
                <div className={`p-8 text-center text-xs rounded-xl border ${theme.subCard} ${theme.textMuted}`}>
                  Nenhum participante encontrado com os filtros atuais.
                </div>
              ) : (
                filteredAttendees.map((reg) => (
                  <div
                    key={reg.id}
                    className="p-4 rounded-xl border border-stone-200 bg-white shadow-2xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                      <div className="min-w-0">
                        <span className="font-mono text-[10px] font-bold text-[#ea7a38] uppercase block">
                          Código: {reg.code}
                        </span>
                        <h4 className="text-sm font-bold text-[#0a3641] leading-tight break-words">
                          {reg.fullName}
                        </h4>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] font-mono text-stone-500">
                            CPF: {reg.cpf}
                          </span>
                          {reg.origin === 'google_forms' ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200" title="Inscrição originada via Google Forms">
                              <FileSpreadsheet className="w-2.5 h-2.5" />
                              Google Forms
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200" title="Inscrição direta via Portal Web">
                              Portal SUS
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        {reg.phone && (
                          <a
                            href={createWhatsAppChatUrl(
                              reg.phone,
                              formatRegistrationWhatsAppMessage(reg, config)
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-800 cursor-pointer transition-colors"
                            title="Disparar Comprovante e Lembrete no WhatsApp do Participante"
                          >
                            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WhatsApp</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => handleManagerResendConfirmationEmail(reg)}
                          disabled={resendingEmailRegId === reg.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-xs font-semibold text-[#0a3641] cursor-pointer disabled:opacity-60"
                          title="Reenviar E-mail de Confirmação (Programa + Nº de Participante)"
                        >
                          <Mail className={`w-3.5 h-3.5 text-[#028090] ${resendingEmailRegId === reg.id ? 'animate-pulse' : ''}`} />
                          <span>{resendingEmailRegId === reg.id ? 'Enviando...' : 'E-mail'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedBadgeAttendee(reg)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-xs font-semibold text-stone-700 cursor-pointer"
                          title="Imprimir Crachá Oficial"
                        >
                          <Printer className="w-3.5 h-3.5 text-[#0a3641]" />
                          <span>Crachá</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAttendeeToDelete(reg)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 cursor-pointer transition-colors"
                          title="Deletar Participante (mesmo que tenha se inscrito pelo portal)"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Deletar</span>
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-lg border border-stone-100 space-y-1">
                      <div><strong className="text-stone-800">Município:</strong> {reg.city}</div>
                      <div><strong className="text-stone-800">Ocupação:</strong> {reg.professionalRole}</div>
                      <div className="break-words"><strong className="text-stone-800">Instituição:</strong> {reg.institution}</div>
                      {reg.susCareLevel && (
                        <div><strong className="text-stone-800">Vínculo:</strong> <span className="text-[#0a3641] font-medium">{reg.susCareLevel.split('/')[0]}</span></div>
                      )}
                      {(reg.instagram || reg.linkedin || reg.otherSocial) && (
                        <div className="flex flex-wrap items-center gap-2 pt-1 mt-1 border-t border-stone-200/60">
                          {reg.instagram && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-pink-700 bg-pink-50 px-2 py-0.5 rounded">
                              <Instagram className="w-3 h-3" /> {reg.instagram}
                            </span>
                          )}
                          {(reg.linkedin || reg.otherSocial) && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded break-all">
                              <Globe className="w-3 h-3 shrink-0" /> {reg.linkedin || reg.otherSocial}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-col gap-1">
                        <select
                          value={reg.status}
                          onChange={(e) => {
                            const newStatus = e.target.value as 'confirmada' | 'presente' | 'cancelada';
                            if (onUpdateRegistrationStatus) {
                              onUpdateRegistrationStatus(reg.id, newStatus);
                            } else {
                              onToggleCheckIn(reg.id);
                            }
                          }}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg border cursor-pointer focus:outline-none transition-colors ${
                            reg.status === 'presente'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : reg.status === 'cancelada'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                        >
                          <option value="confirmada">Fazer Check-in (Pendente)</option>
                          <option value="presente">Credenciado (Presente)</option>
                          <option value="cancelada">Cancelada</option>
                        </select>

                        {reg.status === 'presente' && reg.certificateIssued ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                            <Award className="w-3 h-3 shrink-0" />
                            <span>Certificado Liberado</span>
                          </span>
                        ) : reg.status === 'presente' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700">
                            <Lock className="w-3 h-3 shrink-0" />
                            <span>Presente · Certificado não liberado</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700">
                            <Lock className="w-3 h-3 shrink-0" />
                            <span>Certificado Bloqueado (Requer Check-in)</span>
                          </span>
                        )}
                      </div>

                      {reg.checkedInAt && reg.status === 'presente' && (
                        <div className="text-[10px] font-mono text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Check-in: {new Date(reg.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop View: Complete Formal Table */}
            <div className="hidden xl:block overflow-x-auto rounded-xl border border-stone-200">
              <table className="w-full text-left text-xs">
                <thead className={`border-b font-bold uppercase tracking-wider font-mono ${theme.tableHead}`}>
                  <tr>
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Participante & Redes</th>
                    <th className="py-3 px-4">Município</th>
                    <th className="py-3 px-4">Cargo / Instituição</th>
                    <th className="py-3 px-4">Nível de Atenção SUS</th>
                    <th className="py-3 px-4">Status & Presença</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredAttendees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={`py-8 text-center ${theme.textMuted}`}>
                        Nenhum participante encontrado com os filtros atuais.
                      </td>
                    </tr>
                  ) : (
                    filteredAttendees.map((reg) => {
                      return (
                        <tr key={reg.id} className="hover:bg-stone-50 border-stone-100 text-stone-800 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-[#0a3641]">
                            {reg.code}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-stone-900">{reg.fullName}</span>
                              {reg.origin === 'google_forms' ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200" title="Inscrição originada via Google Forms">
                                  <FileSpreadsheet className="w-2.5 h-2.5" />
                                  Google Forms
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200" title="Inscrição direta via Portal Web">
                                  Portal SUS
                                </span>
                              )}
                            </div>
                            <div className={`text-[11px] font-mono ${theme.textMuted}`}>CPF: {reg.cpf}</div>
                            {/* Redes Sociais */}
                            {(reg.instagram || reg.linkedin || reg.otherSocial) && (
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                {reg.instagram && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-mono font-medium text-pink-700 bg-pink-50 px-1.5 py-0.2 rounded border border-pink-200">
                                    <Instagram className="w-2.5 h-2.5" />
                                    <span>{reg.instagram}</span>
                                  </span>
                                )}
                                {(reg.linkedin || reg.otherSocial) && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                    <Globe className="w-2.5 h-2.5" />
                                    <span>Currículo / Rede / Site</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-medium text-stone-700">
                            {reg.city}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-stone-800">{reg.professionalRole}</div>
                            <div className={`text-[11px] truncate max-w-xs ${theme.textMuted}`}>{reg.institution}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#e2f0f2] text-[#0a3641] border border-[#028090]/20">
                              {reg.susCareLevel ? reg.susCareLevel.split('/')[0] : 'Atenção Primária'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-1.5">
                              <select
                                value={reg.status}
                                onChange={(e) => {
                                  const newStatus = e.target.value as 'confirmada' | 'presente' | 'cancelada';
                                  if (onUpdateRegistrationStatus) {
                                    onUpdateRegistrationStatus(reg.id, newStatus);
                                  } else {
                                    onToggleCheckIn(reg.id);
                                  }
                                }}
                                aria-label="Editar status e presença do participante"
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg border cursor-pointer focus:outline-none transition-colors ${
                                  reg.status === 'presente'
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                                    : reg.status === 'cancelada'
                                    ? 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200'
                                    : 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                                }`}
                              >
                                <option value="confirmada">Fazer Check-in (Pendente)</option>
                                <option value="presente">Credenciado (Presente)</option>
                                <option value="cancelada">Cancelada</option>
                              </select>

                              {reg.status === 'presente' && reg.certificateIssued ? (
                                <div className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                                  <Award className="w-3 h-3 shrink-0" />
                                  <span>Certificado Liberado</span>
                                </div>
                              ) : reg.status === 'presente' ? (
                                <div className="text-[10px] font-bold text-amber-700 flex items-center gap-1">
                                  <Lock className="w-3 h-3 shrink-0" />
                                  <span>Presente · Certificado pendente</span>
                                </div>
                              ) : (
                                <div className="text-[10px] font-bold text-rose-700 flex items-center gap-1">
                                  <Lock className="w-3 h-3 shrink-0" />
                                  <span>Certificado Bloqueado</span>
                                </div>
                              )}

                              {reg.checkedInAt && reg.status === 'presente' && (
                                <div className={`text-[10px] font-mono flex items-center gap-1 ${theme.textMuted}`}>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                  <span>Check-in: {new Date(reg.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {reg.phone && (
                                <a
                                  href={createWhatsAppChatUrl(
                                    reg.phone,
                                    formatRegistrationWhatsAppMessage(reg, config)
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                                  title="Disparar Comprovante e Lembrete via WhatsApp"
                                >
                                  <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>WhatsApp</span>
                                </a>
                              )}

                              <button
                                type="button"
                                onClick={() => handleManagerResendConfirmationEmail(reg)}
                                disabled={resendingEmailRegId === reg.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-xs font-semibold text-[#0a3641] bg-teal-50 hover:bg-teal-100 border border-teal-200 disabled:opacity-60"
                                title="Reenviar E-mail de Confirmação (Programa + Nº de Participante)"
                              >
                                <Mail className={`w-3.5 h-3.5 text-[#028090] ${resendingEmailRegId === reg.id ? 'animate-pulse' : ''}`} />
                                <span>{resendingEmailRegId === reg.id ? '...' : 'E-mail'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedBadgeAttendee(reg)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-xs font-semibold text-stone-700 hover:text-[#0a3641] bg-stone-100 hover:bg-stone-200"
                                title="Imprimir Crachá"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Crachá</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setAttendeeToDelete(reg)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200"
                                title="Deletar Participante (mesmo que tenha se inscrito pelo portal)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Deletar</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* TAB: MATERIAIS DE APOIO & PDFS */}
        {activeTab === 'materials' && (
          <div className="space-y-6">
            
            {/* Cloud Sync Status Banner for Materials */}
            {firebaseSyncState?.isVerifiedAdmin ? (
              <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/90 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2.5">
                  <Cloud className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Armazenamento em Nuvem Ativo:</strong> todos os PDFs enviados são salvos no Firebase e ficam visíveis automaticamente em outros celulares, computadores e no link compartilhado.
                  </span>
                </div>
                {materials.some((m) => m.pendingCloudSync) && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px] shrink-0">
                    Sincronizando pendentes...
                  </span>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-2xl border border-amber-300 bg-amber-50 text-amber-950 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <CloudOff className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-amber-900">Conecte a conta Google do gestor para publicar PDFs em todos os dispositivos</strong>
                    <span className="text-amber-800/90">
                      Sem conexão oficial (<span className="font-mono">farmaciademinas.marketing@gmail.com</span>), PDFs enviados ficam apenas neste navegador e não aparecem no link compartilhado nem em outros aparelhos.
                    </span>
                  </div>
                </div>
                {onConnectFirebaseAdmin && (
                  <button
                    type="button"
                    onClick={onConnectFirebaseAdmin}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0a3641] hover:bg-[#0f4b59] rounded-xl shadow-xs cursor-pointer shrink-0"
                  >
                    <Cloud className="w-3.5 h-3.5 text-[#ea7a38]" />
                    <span>Conectar Google Agora</span>
                  </button>
                )}
              </div>
            )}

            {/* Notice Toast */}
            {materialNotice && (
              <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-medium animate-fade-in ${
                materialNotice.type === 'warning'
                  ? 'bg-amber-50 border border-amber-300 text-amber-900'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              }`}>
                {materialNotice.type === 'warning' ? (
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                )}
                <span>{materialNotice.text}</span>
              </div>
            )}

            {/* Top Bar */}
            <div className={`rounded-2xl border p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${theme.card}`}>
              <div>
                <div className="text-xs font-bold text-[#ea7a38] uppercase tracking-wider mb-1 font-mono flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#ea7a38]" />
                  <span>Repositório Técnico · Microrregião de Carangola</span>
                </div>
                <h3 className={`text-xl font-bold ${theme.textHeading}`}>
                  Gerenciamento de Materiais de Apoio & PDFs
                </h3>
                <p className={`text-xs mt-0.5 ${theme.textMuted}`}>
                  Adicione e organize fluxogramas, legislações e cadernos em PDF (até 15 MB por arquivo). Os arquivos são salvos na nuvem e exibidos imediatamente no portal público.
                </p>
              </div>

              <button
                onClick={() => {
                  setMaterialError(null);
                  setIsAddMaterialModalOpen(true);
                }}
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4.5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#d96522] to-[#ea7a38] hover:brightness-105 active:scale-95 rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>Adicionar Novo Documento PDF</span>
              </button>
            </div>

            {/* Filters Row */}
            <div className={`grid grid-cols-1 sm:grid-cols-12 gap-3 p-3.5 rounded-xl border transition-colors ${theme.subCard}`}>
              <div className="sm:col-span-8 relative">
                <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${theme.textMuted}`} />
                <input
                  type="text"
                  value={materialSearch}
                  onChange={(e) => setMaterialSearch(e.target.value)}
                  placeholder="Buscar documento por título, conteúdo ou órgão expedidor..."
                  className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-md border focus:outline-none focus:ring-1 transition-colors ${theme.input}`}
                />
              </div>

              <div className="sm:col-span-4">
                <select
                  value={materialCategoryFilter}
                  onChange={(e) => setMaterialCategoryFilter(e.target.value)}
                  className={`w-full px-3 py-1.5 text-xs rounded-md border focus:outline-none focus:ring-1 transition-colors ${theme.input}`}
                >
                  <option value="all">Todas as Categorias</option>
                  <option value="Fluxograma">Fluxogramas</option>
                  <option value="Apostila">Apostilas</option>
                  <option value="Legislação">Legislações & Portarias</option>
                  <option value="Apresentação">Apresentações & Slides</option>
                  <option value="Cartilha">Cartilhas Informativas</option>
                </select>
              </div>
            </div>

            {/* Grid of Materials */}
            {filteredMaterials.length === 0 ? (
              <div className={`p-12 text-center rounded-2xl border space-y-3 ${theme.card}`}>
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className={`text-sm font-bold ${theme.textHeading}`}>Nenhum material encontrado</h4>
                <p className={`text-xs max-w-md mx-auto ${theme.textMuted}`}>
                  Nenhum documento corresponde aos termos pesquisados. Você pode adicionar um novo PDF agora mesmo.
                </p>
                <button
                  onClick={() => {
                    setMaterialError(null);
                    setIsAddMaterialModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0a3641] hover:bg-[#0f4b59] rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cadastrar PDF</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMaterials.map((mat) => {
                  const isDownloadingMat = downloadingMaterialId === mat.id;
                  return (
                    <div
                      key={mat.id}
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${theme.card}`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/15 text-rose-600 border border-rose-500/30 uppercase">
                              {mat.format || 'PDF'}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              mat.category === 'Fluxograma'
                                ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30'
                                : mat.category === 'Legislação'
                                ? 'bg-blue-500/15 text-blue-700 border border-blue-500/30'
                                : 'bg-amber-500/15 text-amber-700 border border-amber-500/30'
                            }`}>
                              {mat.category}
                            </span>
                            {mat.pendingCloudSync ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <CloudOff className="w-3 h-3" />
                                Local
                              </span>
                            ) : (mat.fileUrl?.startsWith('firestore-chunked://') || mat.fileUrl?.startsWith('/assets/') || mat.fileUrl?.startsWith('http')) ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Cloud className="w-3 h-3" />
                                Publicado
                              </span>
                            ) : null}
                          </div>

                          <span className={`text-[11px] font-mono shrink-0 ${theme.textMuted}`}>
                            {mat.size || '1.5 MB'} · {mat.pages} págs
                          </span>
                        </div>

                        <div>
                          <h4 className={`text-sm font-bold leading-snug ${theme.textHeading}`}>
                            {mat.title}
                          </h4>
                          <div className={`text-[11px] font-medium mt-1 text-[#0a3641]`}>
                            {mat.author}
                          </div>
                        </div>

                        <p className={`text-xs line-clamp-2 leading-relaxed ${theme.textMuted}`}>
                          {mat.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t flex items-center justify-between gap-2 border-stone-100">
                        <div className={`text-[11px] font-mono ${theme.textMuted}`}>
                          <span>{mat.downloadsCount} downloads</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTestDownloadMaterial(mat)}
                            disabled={isDownloadingMat}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200 disabled:opacity-60"
                            title="Baixar ou testar este documento PDF"
                          >
                            {isDownloadingMat ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ea7a38]" />
                            ) : (
                              <Download className="w-3.5 h-3.5 text-[#ea7a38]" />
                            )}
                            <span>{isDownloadingMat ? 'Baixando...' : 'Baixar PDF'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMaterialItem(mat);
                            }}
                            className="p-1.5 rounded-lg border transition-colors cursor-pointer border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300"
                            title="Excluir este documento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* TAB: MURAL & MODERAÇÃO DE POSTS */}
        {activeTab === 'posts' && (
          <div className="space-y-6">
            
            {/* Top Bar */}
            <div className={`rounded-2xl border p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${theme.card}`}>
              <div>
                <div className="text-xs font-bold text-[#ea7a38] uppercase tracking-wider mb-1 font-mono flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-[#ea7a38]" />
                  <span>Moderação Comunitária · SUS Carangola</span>
                </div>
                <h3 className={`text-xl font-bold ${theme.textHeading}`}>
                  Gerenciamento de Postagens do Mural da Comunidade
                </h3>
                <p className={`text-xs mt-0.5 ${theme.textMuted}`}>
                  Audite as interações sociais do público, visualize fotos anexadas e exclua publicações se necessário.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative w-full md:w-72">
                  <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${theme.textMuted}`} />
                  <input
                    type="text"
                    value={postSearch}
                    onChange={(e) => setPostSearch(e.target.value)}
                    placeholder="Buscar postagem por autor, cidade ou texto..."
                    className={`pl-9 pr-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 transition-colors w-full ${theme.input}`}
                  />
                </div>
              </div>
            </div>

            {/* Post Deleted Toast Notice */}
            {postDeleteNotice && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-900 dark:text-emerald-200 text-xs font-medium animate-fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{postDeleteNotice}</span>
              </div>
            )}

            {/* Posts Grid & Management List */}
            {filteredPosts.length === 0 ? (
              <div className={`p-12 text-center rounded-2xl border ${theme.card} space-y-2`}>
                <MessageCircle className="w-8 h-8 text-stone-400 mx-auto" />
                <h4 className={`text-sm font-bold ${theme.textHeading}`}>Nenhuma postagem encontrada</h4>
                <p className={`text-xs ${theme.textMuted}`}>Tente alterar os termos de busca.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredPosts.map((post) => (
                  <div
                    key={post.id}
                    className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 transition-all hover:shadow-md ${theme.card}`}
                  >
                    <div className="space-y-3">
                      {/* Author Header */}
                      <div className="flex items-start justify-between gap-2 border-b pb-3 border-stone-200/50">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0a3641] to-[#028090] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                            {post.authorName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className={`text-xs font-bold leading-tight ${isDarkMode ? 'text-stone-100' : 'text-stone-900'}`}>
                              {post.authorName}
                            </div>
                            <div className={`text-[11px] leading-tight mt-0.5 ${theme.textMuted}`}>
                              {post.authorRole} · <span className="text-[#ea7a38] font-medium">{post.city}</span>
                            </div>
                          </div>
                        </div>

                        <span className={`text-[10px] font-mono shrink-0 ${theme.textMuted}`}>
                          {post.createdAt}
                        </span>
                      </div>

                      {/* Content */}
                      <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-stone-200' : 'text-stone-700'}`}>
                        "{post.content}"
                      </p>

                      {/* Attached Photo */}
                      {post.imageUrl && (
                        <div className="relative rounded-xl overflow-hidden border border-stone-200/80 dark:border-stone-700/60 bg-stone-100 dark:bg-stone-800/60 max-h-36 flex items-center justify-center p-1 group">
                          <img
                            src={post.imageUrl}
                            alt="Foto anexada pelo participante"
                            className="w-full max-h-36 object-contain object-center group-hover:scale-102 transition-transform duration-300"
                          />
                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold bg-black/60 text-white backdrop-blur-xs flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" />
                            <span>Foto</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className={`pt-3 border-t flex items-center justify-between gap-2 ${
                      isDarkMode ? 'border-[#133540]' : 'border-stone-200/70'
                    }`}>
                      <div className="flex items-center gap-1.5 text-xs text-rose-500 font-semibold font-mono">
                        <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                        <span>{post.likes} {post.likes === 1 ? 'curtida' : 'curtidas'}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setPostToDelete(post)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer transition-colors"
                        title="Remover esta publicação do mural comunitário público"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir Post</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* TAB 4: DISPARO DE PUSH & LEMBRETES */}
        {activeTab === 'notifications' && (
          <div className="space-y-8">
            
            {/* EmailJS API Settings & Live Tester */}
            <EmailJsSettingsCard
              isDarkMode={isDarkMode}
              eventConfig={config}
              onUpdateConfig={onUpdateConfig}
            />

            {/* Programmatic Gmail Automation Hub */}
            <GmailNotificationHub
              registrations={registrations}
              config={config}
              isDarkMode={isDarkMode}
            />

            {/* Composer Card */}
            <div className={`rounded-2xl border p-6 space-y-6 transition-colors ${theme.card}`}>
              <div className={`flex items-center justify-between border-b pb-4 ${isDarkMode ? 'border-[#133540]' : 'border-stone-200'}`}>
                <div>
                  <h3 className={`text-lg font-bold flex items-center gap-2 ${theme.textHeading}`}>
                    <Send className="w-5 h-5 text-[#d96522]" />
                    <span>Central de Envio de Notificações Push & Lembretes</span>
                  </h3>
                  <p className={`text-xs mt-1 ${theme.textMuted}`}>
                    Envie alertas customizados em tempo real aos participantes e acompanhe o engajamento e taxa de abertura.
                  </p>
                </div>

                {notifSentNotice && (
                  <div className="bg-emerald-100 text-emerald-800 text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 animate-bounce">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Notificação Disparada com Sucesso!</span>
                  </div>
                )}
              </div>

              {/* Fast Templates */}
              <div>
                <span className={`text-xs font-bold uppercase tracking-wider block mb-2 font-mono ${theme.textMuted}`}>
                  Modelos Rápidos Pré-configurados:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      applyTemplate(
                        'Lembrete: Simpósio Acontece Amanhã!',
                        'Tudo pronto para o 1º Simpósio de Saúde Mental da Microrregião de Carangola. Credenciamento inicia às 08h30. Não se esqueça do seu documento com foto!',
                        'lembrete'
                      )
                    }
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                      isDarkMode
                        ? 'bg-[#102a33] hover:bg-[#163742] text-stone-200 border border-[#1a414e]'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                    }`}
                  >
                    Lembrete de Véspera
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      applyTemplate(
                        'Credenciamento Aberto com Café Regional',
                        'A equipe do SUS está recebendo os profissionais no hall de entrada. Retire seu crachá e sua pasta de materiais.',
                        'aviso'
                      )
                    }
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                      isDarkMode
                        ? 'bg-[#102a33] hover:bg-[#163742] text-stone-200 border border-[#1a414e]'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                    }`}
                  >
                    Abertura da Portaria
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      applyTemplate(
                        'Certificados Oficiais Liberados no Portal!',
                        'Seu certificado de 8 horas do Simpósio já pode ser emitido na Área de Downloads informando seu CPF ou código de inscrição.',
                        'certificado'
                      )
                    }
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                      isDarkMode
                        ? 'bg-[#102a33] hover:bg-[#163742] text-stone-200 border border-[#1a414e]'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                    }`}
                  >
                    Liberação de Certificados
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      applyTemplate(
                        'Plenária Final: Participe da Carta de Carangola',
                        'Estamos iniciando a redação coletiva da Carta de Carangola em Defesa da RAPS. Sua contribuição é fundamental.',
                        'urgente'
                      )
                    }
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                      isDarkMode
                        ? 'bg-[#102a33] hover:bg-[#163742] text-stone-200 border border-[#1a414e]'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                    }`}
                  >
                    Chamada para Plenária
                  </button>
                </div>
              </div>

              {/* Composer Form */}
              <form onSubmit={handleTriggerNotification} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-stone-300' : 'text-stone-700'}`}>
                      Título da Notificação *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Lembrete Importante: Credenciamento às 8h30"
                      value={notifTitle}
                      onChange={(e) => setNotifTitle(e.target.value)}
                      className={`w-full px-3.5 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 transition-colors ${theme.input}`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-stone-300' : 'text-stone-700'}`}>
                        Público-Alvo
                      </label>
                      <select
                        value={notifAudience}
                        onChange={(e) => setNotifAudience(e.target.value as any)}
                        className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-1 transition-colors ${theme.input}`}
                      >
                        <option value="todos" className={isDarkMode ? 'bg-[#06151c] text-stone-100' : 'bg-white text-stone-900'}>Todos os Usuários & Inscritos</option>
                        <option value="inscritos" className={isDarkMode ? 'bg-[#06151c] text-stone-100' : 'bg-white text-stone-900'}>Apenas Inscritos Confirmados</option>
                        <option value="presentes" className={isDarkMode ? 'bg-[#06151c] text-stone-100' : 'bg-white text-stone-900'}>Apenas Presentes no Local</option>
                        <option value="profissionais" className={isDarkMode ? 'bg-[#06151c] text-stone-100' : 'bg-white text-stone-900'}>Profissionais de Saúde</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-stone-300' : 'text-stone-700'}`}>
                        Categoria
                      </label>
                      <select
                        value={notifCategory}
                        onChange={(e) => setNotifCategory(e.target.value as any)}
                        className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-1 transition-colors ${theme.input}`}
                      >
                        <option value="lembrete" className={isDarkMode ? 'bg-[#06151c] text-stone-100' : 'bg-white text-stone-900'}>Lembrete</option>
                        <option value="aviso" className={isDarkMode ? 'bg-[#06151c] text-stone-100' : 'bg-white text-stone-900'}>Aviso Geral</option>
                        <option value="material" className={isDarkMode ? 'bg-[#06151c] text-stone-100' : 'bg-white text-stone-900'}>Material Disponível</option>
                        <option value="certificado" className={isDarkMode ? 'bg-[#06151c] text-stone-100' : 'bg-white text-stone-900'}>Certificado</option>
                        <option value="urgente" className={isDarkMode ? 'bg-[#06151c] text-stone-100' : 'bg-white text-stone-900'}>Urgente</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-stone-300' : 'text-stone-700'}`}>
                    Mensagem da Notificação / Lembrete *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Escreva a mensagem que aparecerá no celular/navegador dos participantes..."
                    value={notifBody}
                    onChange={(e) => setNotifBody(e.target.value)}
                    className={`w-full px-3.5 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 transition-colors ${theme.input}`}
                  />
                </div>

                {/* Multi-Channel Selection */}
                <div className={`p-4 rounded-xl border space-y-2.5 ${isDarkMode ? 'bg-[#06151c]/60 border-[#1a414e]' : 'bg-stone-50 border-stone-200'}`}>
                  <span className={`text-xs font-bold uppercase tracking-wider block font-mono ${theme.textMuted}`}>
                    Canais de Disparo Ativos:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Canal 1: Alerta no Portal & Push Web */}
                    <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      notifChannelPortal
                        ? (isDarkMode ? 'bg-[#102a33] border-sky-500/50 text-white' : 'bg-sky-50 border-sky-300 text-[#0a3641]')
                        : (isDarkMode ? 'bg-transparent border-white/10 text-stone-400' : 'bg-white border-stone-200 text-stone-500')
                    }`}>
                      <input
                        type="checkbox"
                        checked={notifChannelPortal}
                        onChange={(e) => setNotifChannelPortal(e.target.checked)}
                        className="rounded text-[#0a3641]"
                      />
                      <div className="text-xs">
                        <div className="font-bold flex items-center gap-1">
                          <Bell className="w-3.5 h-3.5 text-sky-500" />
                          <span>Portal & Push Web</span>
                        </div>
                        <div className="text-[10px] opacity-80">Banner ao vivo & sino</div>
                      </div>
                    </label>

                    {/* Canal 2: WhatsApp */}
                    <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      notifChannelWhatsapp
                        ? (isDarkMode ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200' : 'bg-emerald-50 border-emerald-300 text-emerald-950')
                        : (isDarkMode ? 'bg-transparent border-white/10 text-stone-400' : 'bg-white border-stone-200 text-stone-500')
                    }`}>
                      <input
                        type="checkbox"
                        checked={notifChannelWhatsapp}
                        onChange={(e) => setNotifChannelWhatsapp(e.target.checked)}
                        className="rounded text-emerald-600"
                      />
                      <div className="text-xs">
                        <div className="font-bold flex items-center gap-1">
                          <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                          <span>WhatsApp</span>
                        </div>
                        <div className="text-[10px] opacity-80">Transmissão & Contatos</div>
                      </div>
                    </label>

                    {/* Canal 3: E-mail Broadcast */}
                    <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      notifChannelEmail
                        ? (isDarkMode ? 'bg-amber-950/40 border-amber-500/50 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-950')
                        : (isDarkMode ? 'bg-transparent border-white/10 text-stone-400' : 'bg-white border-stone-200 text-stone-500')
                    }`}>
                      <input
                        type="checkbox"
                        checked={notifChannelEmail}
                        onChange={(e) => setNotifChannelEmail(e.target.checked)}
                        className="rounded text-[#ea7a38]"
                      />
                      <div className="text-xs">
                        <div className="font-bold flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-[#ea7a38]" />
                          <span>E-mail Broadcast</span>
                        </div>
                        <div className="text-[10px] opacity-80">Disparo para inscritos</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Email broadcast status feedback */}
                {emailBroadcastNotice && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#ea7a38]" />
                    <span>{emailBroadcastNotice}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className={`text-xs ${theme.textMuted}`}>
                    O disparo sincronizará os canais selecionados com a infraestrutura oficial do SUS Carangola.
                  </div>

                  <button
                    type="submit"
                    disabled={isBroadcastingEmail}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#d96522] hover:bg-[#c25516] rounded-xl shadow-sm transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <Send className={`w-3.5 h-3.5 ${isBroadcastingEmail ? 'animate-spin' : ''}`} />
                    <span>{isBroadcastingEmail ? 'Disparando E-mails...' : 'Disparar Notificação Agora'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Notification History & Engagement Metrics */}
            <div className={`rounded-2xl border p-6 space-y-4 transition-colors ${theme.card}`}>
              <h4 className={`text-base font-bold ${theme.textHeading}`}>
                Histórico de Disparos & Métricas de Desempenho
              </h4>

              <div className={`divide-y transition-colors ${isDarkMode ? 'divide-[#0e2730]' : 'divide-stone-100'}`}>
                {notifications.map((n) => {
                  const openRate = Math.min(100, Math.round((n.readCount / n.totalSent) * 100));

                  return (
                    <div key={n.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded ${
                            isDarkMode ? 'bg-[#102a33] text-teal-300 border border-[#1a414e]' : 'bg-stone-100 text-stone-700'
                          }`}>
                            {n.category}
                          </span>
                          <span className={`text-xs font-mono ${theme.textMuted}`}>
                            {new Date(n.sentAt).toLocaleDateString('pt-BR')} às{' '}
                            {new Date(n.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className={`text-xs ${theme.textMuted}`}>· Destino: {n.targetAudience}</span>
                        </div>
                        <h5 className={`text-sm font-bold ${isDarkMode ? 'text-stone-100' : 'text-stone-900'}`}>{n.title}</h5>
                        <p className={`text-xs max-w-2xl ${isDarkMode ? 'text-stone-300' : 'text-stone-600'}`}>{n.body}</p>

                        {/* Quick Action buttons for history */}
                        <div className="flex items-center gap-2 pt-1.5">
                          <button
                            type="button"
                            onClick={() => setWhatsappDispatchModal(n)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-[11px] font-bold text-emerald-800 transition-colors cursor-pointer"
                          >
                            <Smartphone className="w-3 h-3 text-emerald-600" />
                            <span>Transmitir no WhatsApp</span>
                          </button>
                        </div>
                      </div>

                      <div className={`flex items-center gap-4 text-xs shrink-0 p-2.5 rounded-xl border transition-colors ${theme.subCard}`}>
                        <div>
                          <div className={`text-[10px] uppercase ${theme.textMuted}`}>Enviados</div>
                          <div className={`font-mono font-bold ${isDarkMode ? 'text-stone-100' : 'text-stone-900'}`}>{n.totalSent}</div>
                        </div>
                        <div>
                          <div className={`text-[10px] uppercase ${theme.textMuted}`}>Aberturas</div>
                          <div className="font-mono font-bold text-emerald-500">{n.readCount}</div>
                        </div>
                        <div>
                          <div className={`text-[10px] uppercase ${theme.textMuted}`}>Engajamento</div>
                          <div className="font-mono font-bold text-[#ea7a38]">{openRate}%</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* WHATSAPP DISPATCH MODAL */}
            {whatsappDispatchModal && (() => {
              const notif = whatsappDispatchModal;
              const formattedMessage = formatNotificationWhatsAppMessage(notif, config);

              // Filter participants based on notification audience
              const eligibleAttendees = registrations.filter((r) => {
                if (!r.phone) return false;
                if (notif.targetAudience === 'presentes') return r.status === 'presente';
                if (notif.targetAudience === 'profissionais') return r.professionalRole !== 'Estudante' && r.professionalRole !== 'Outro';
                return true;
              });

              const filteredAttendees = eligibleAttendees.filter((r) => {
                if (!whatsappSearchFilter.trim()) return true;
                const q = whatsappSearchFilter.toLowerCase();
                return (
                  r.fullName.toLowerCase().includes(q) ||
                  r.phone.includes(q) ||
                  r.city.toLowerCase().includes(q)
                );
              });

              const handleCopyMessage = () => {
                navigator.clipboard.writeText(formattedMessage);
                alert('Mensagem formatada para o WhatsApp copiada para a área de transferência!');
              };

              const handleCopyPhones = () => {
                const phones = eligibleAttendees.map((r) => r.phone).filter(Boolean).join('; ');
                navigator.clipboard.writeText(phones);
                alert(`${eligibleAttendees.length} telefones copiados para criar Lista de Transmissão no WhatsApp!`);
              };

              return (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                  <div className={`w-full max-w-2xl rounded-2xl shadow-2xl border overflow-hidden my-6 ${isDarkMode ? 'bg-[#0a232c] border-[#163f4c]' : 'bg-white border-stone-200'}`}>
                    {/* Header */}
                    <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                          <Smartphone className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm sm:text-base leading-tight">
                            Central de Disparo Oficial via WhatsApp
                          </h3>
                          <p className="text-[11px] text-white/80">
                            {eligibleAttendees.length} participantes elegíveis com telefone cadastrado
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWhatsappDispatchModal(null)}
                        className="p-1.5 rounded-lg hover:bg-white/20 text-white cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="p-4 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                      {/* Message Preview */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider font-mono text-emerald-600">
                            Mensagem Formatada (Visualização WhatsApp):
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyMessage}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar Texto</span>
                          </button>
                        </div>
                        <div className={`p-3.5 rounded-xl border font-mono text-xs whitespace-pre-wrap leading-relaxed ${isDarkMode ? 'bg-[#06151c] border-[#133540] text-stone-200' : 'bg-stone-50 border-stone-200 text-stone-800'}`}>
                          {formattedMessage}
                        </div>
                      </div>

                      {/* Broadcast Trigger Actions */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <a
                          href={createWhatsAppBroadcastUrl(formattedMessage)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer text-center"
                        >
                          <Send className="w-4 h-4" />
                          <span>Abrir no WhatsApp Web / Celular</span>
                        </a>

                        <button
                          type="button"
                          onClick={handleCopyPhones}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl border border-stone-300 transition-colors cursor-pointer text-center"
                        >
                          <Copy className="w-4 h-4" />
                          <span>Copiar Lista para Transmissão ({eligibleAttendees.length})</span>
                        </button>
                      </div>

                      {/* Individual Participant Fast Transmission List */}
                      <div className="space-y-3 pt-2 border-t border-stone-200">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                            Disparo Individual em 1 Clique aos Participantes:
                          </h4>
                          <input
                            type="text"
                            placeholder="Filtrar por nome ou cidade..."
                            value={whatsappSearchFilter}
                            onChange={(e) => setWhatsappSearchFilter(e.target.value)}
                            className="text-xs px-3 py-1.5 rounded-lg border border-stone-300 focus:outline-none w-full sm:w-56"
                          />
                        </div>

                        <div className="divide-y divide-stone-100 max-h-56 overflow-y-auto border border-stone-200 rounded-xl">
                          {filteredAttendees.length === 0 ? (
                            <div className="p-4 text-center text-xs text-stone-500">
                              Nenhum participante com telefone encontrado para este filtro.
                            </div>
                          ) : (
                            filteredAttendees.map((att) => (
                              <div key={att.id} className="p-2.5 flex items-center justify-between gap-3 hover:bg-stone-50 transition-colors">
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-stone-900 truncate">
                                    {att.fullName}
                                  </div>
                                  <div className="text-[11px] text-stone-500 font-mono">
                                    {att.phone} · {att.city} ({att.professionalRole})
                                  </div>
                                </div>

                                <a
                                  href={createWhatsAppChatUrl(att.phone, formattedMessage)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold rounded-lg shrink-0 cursor-pointer transition-colors"
                                  title={`Enviar comunicado para ${att.fullName}`}
                                >
                                  <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Enviar</span>
                                </a>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                    </div>

                    <div className="p-3 bg-stone-50 border-t border-stone-200 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setWhatsappDispatchModal(null)}
                        className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-800 bg-stone-200 hover:bg-stone-300 rounded-xl cursor-pointer"
                      >
                        Fechar Janela
                      </button>
                    </div>

                  </div>
                </div>
              );
            })()}

          </div>
        )}

        {/* TAB 4: ASSINANTES DA NEWSLETTER & WHATSAPP (Alimentado pelo Formulário de Inscrição) */}
        {activeTab === 'subscribers' && (() => {
          const whatsappSubscribers = subscribers.filter((s) => s.receiveWhatsapp && !!s.phone);
          const emailSubscribers = subscribers.filter((s) => s.receiveEmail !== false);
          const registrationOriginSubscribers = subscribers.filter((s) => s.origin === 'inscricao' || !!s.role);

          const filteredSubList = subscribers.filter((s) => {
            const matchesSearch =
              !subscriberSearch.trim() ||
              (s.name && s.name.toLowerCase().includes(subscriberSearch.toLowerCase())) ||
              s.email.toLowerCase().includes(subscriberSearch.toLowerCase()) ||
              (s.phone && s.phone.includes(subscriberSearch)) ||
              (s.city && s.city.toLowerCase().includes(subscriberSearch.toLowerCase()));

            const matchesType =
              subscriberFilter === 'all' ||
              (subscriberFilter === 'whatsapp' && s.receiveWhatsapp && !!s.phone) ||
              (subscriberFilter === 'email' && s.receiveEmail !== false);

            return matchesSearch && matchesType;
          });

          const handleCopyWhatsappBroadcast = () => {
            const phoneList = whatsappSubscribers.map((s) => s.phone).filter(Boolean).join('; ');
            navigator.clipboard.writeText(phoneList);
            setCopiedWhatsappList(true);
            setTimeout(() => setCopiedWhatsappList(false), 3000);
          };

          const handleCopyEmailBroadcast = () => {
            const emailList = subscribers.map((s) => s.email).filter(Boolean).join(', ');
            navigator.clipboard.writeText(emailList);
            setCopiedEmailList(true);
            setTimeout(() => setCopiedEmailList(false), 3000);
          };

          return (
            <div className={`rounded-2xl border p-6 space-y-6 transition-colors ${theme.card}`}>
              
              {/* Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-[#ea7a38] uppercase tracking-wider mb-1 font-mono flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4 text-[#ea7a38]" />
                    <span>Comunicação Direta com os Profissionais da RAPS</span>
                  </div>
                  <h3 className={`text-lg font-bold ${theme.textHeading}`}>
                    Base de Assinantes de Newsletter & WhatsApp (Alimentada pela Inscrição)
                  </h3>
                  <p className={`text-xs ${theme.textMuted}`}>
                    Participantes que aceitaram receber novidades, avisos urgentes e informativos oficiais da RAPS microrregional.
                  </p>
                </div>

                {/* Quick Broadcast Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyWhatsappBroadcast}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 ${
                      copiedWhatsappList
                        ? 'bg-emerald-700 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                    title="Copiar telefones com DDD formatados para colar na lista de transmissão do WhatsApp"
                  >
                    {copiedWhatsappList ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Telefones Copiados!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar Telefones WhatsApp</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyEmailBroadcast}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 ${
                      copiedEmailList
                        ? 'bg-[#0f4b59] text-white'
                        : 'bg-[#0a3641] hover:bg-[#0f4b59] text-white'
                    }`}
                    title="Copiar e-mails de todos os contatos para colar no cliente de e-mail institucional"
                  >
                    {copiedEmailList ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>E-mails Copiados!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar E-mails</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleExportSubscribers}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95 border border-stone-200"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Exportar Excel</span>
                  </button>
                </div>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`p-4 rounded-xl border ${theme.subCard}`}>
                  <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider font-mono">Total de Assinantes</div>
                  <div className={`text-2xl font-black mt-1 font-mono ${theme.textHeading}`}>{subscribers.length}</div>
                  <div className="text-[11px] text-stone-400 mt-0.5">Contatos cadastrados</div>
                </div>

                <div className={`p-4 rounded-xl border ${theme.subCard}`}>
                  <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider font-mono flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp Ativo</span>
                  </div>
                  <div className="text-2xl font-black mt-1 font-mono text-emerald-600">{whatsappSubscribers.length}</div>
                  <div className="text-[11px] text-stone-400 mt-0.5">Aptos para lista de transmissão</div>
                </div>

                <div className={`p-4 rounded-xl border ${theme.subCard}`}>
                  <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider font-mono flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    <span>E-mail / Boletim</span>
                  </div>
                  <div className="text-2xl font-black mt-1 font-mono text-blue-600">{emailSubscribers.length}</div>
                  <div className="text-[11px] text-stone-400 mt-0.5">Recebem comunicados e PDFs</div>
                </div>

                <div className={`p-4 rounded-xl border ${theme.subCard}`}>
                  <div className="text-[11px] font-bold text-[#ea7a38] uppercase tracking-wider font-mono flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Via Inscrição SUS</span>
                  </div>
                  <div className="text-2xl font-black mt-1 font-mono text-[#ea7a38]">{registrationOriginSubscribers.length}</div>
                  <div className="text-[11px] text-stone-400 mt-0.5">Alimentados pelo formulário</div>
                </div>
              </div>

              {/* Search & Filter Toolbar */}
              <div className={`grid grid-cols-1 sm:grid-cols-12 gap-3 p-3.5 rounded-xl border transition-colors ${theme.subCard}`}>
                <div className="sm:col-span-8 relative">
                  <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${theme.textMuted}`} />
                  <input
                    type="text"
                    value={subscriberSearch}
                    onChange={(e) => setSubscriberSearch(e.target.value)}
                    placeholder="Pesquisar por nome, e-mail, telefone ou município..."
                    className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-md border focus:outline-none focus:ring-1 transition-colors ${theme.input}`}
                  />
                </div>

                <div className="sm:col-span-4">
                  <select
                    value={subscriberFilter}
                    onChange={(e) => setSubscriberFilter(e.target.value as any)}
                    className={`w-full px-3 py-1.5 text-xs rounded-md border focus:outline-none focus:ring-1 transition-colors ${theme.input}`}
                  >
                    <option value="all">Todos os Assinantes ({subscribers.length})</option>
                    <option value="whatsapp">Apenas WhatsApp Ativo ({whatsappSubscribers.length})</option>
                    <option value="email">Apenas E-mail / Boletim ({emailSubscribers.length})</option>
                  </select>
                </div>
              </div>

              {/* Mobile & Tablet View: Subscriber Cards */}
              <div className="block lg:hidden space-y-3">
                {filteredSubList.length === 0 ? (
                  <div className={`p-8 text-center text-xs rounded-xl border ${theme.subCard} ${theme.textMuted}`}>
                    Nenhum assinante encontrado.
                  </div>
                ) : (
                  filteredSubList.map((s) => {
                    const cleanPhone = s.phone ? s.phone.replace(/\D/g, '') : '';
                    return (
                      <div key={s.id} className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-sm text-[#0a3641]">{s.name || 'Nome não informado'}</div>
                            {s.role && <div className="text-[11px] text-stone-500">{s.role}</div>}
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.receiveWhatsapp ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'
                          }`}>
                            {s.receiveWhatsapp ? 'WhatsApp Ativo' : 'Apenas E-mail'}
                          </span>
                        </div>

                        <div className="text-xs font-mono text-stone-600 space-y-0.5">
                          <div><strong>E-mail:</strong> {s.email}</div>
                          <div><strong>Tel / WhatsApp:</strong> {s.phone || 'Não informado'}</div>
                          <div><strong>Município:</strong> {s.city || 'Carangola'}</div>
                        </div>

                        <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
                          <span className="text-[10px] font-mono text-stone-400">
                            Cadastrado em: {s.subscribedAt}
                          </span>
                          {cleanPhone && (
                            <a
                              href={`https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(`Olá ${s.name || ''}! Entramos em contato da organização do 1º Simpósio de Saúde Mental da Microrregião de Carangola.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors cursor-pointer"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>Conversar</span>
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Desktop View: Full Table */}
              <div className="hidden lg:block overflow-x-auto rounded-xl border border-stone-200">
                <table className="w-full text-left text-xs">
                  <thead className={`border-b font-bold uppercase tracking-wider font-mono ${theme.tableHead}`}>
                    <tr>
                      <th className="py-3 px-4">Nome & Função</th>
                      <th className="py-3 px-4">E-mail</th>
                      <th className="py-3 px-4">WhatsApp / Telefone</th>
                      <th className="py-3 px-4">Município</th>
                      <th className="py-3 px-4">Canais Aceitos</th>
                      <th className="py-3 px-4">Origem</th>
                      <th className="py-3 px-4 text-right">Ação Direta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredSubList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className={`py-8 text-center ${theme.textMuted}`}>
                          Nenhum assinante encontrado para a pesquisa.
                        </td>
                      </tr>
                    ) : (
                      filteredSubList.map((s) => {
                        const cleanPhone = s.phone ? s.phone.replace(/\D/g, '') : '';
                        return (
                          <tr key={s.id} className="hover:bg-stone-50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-stone-900">{s.name || 'Não informado'}</div>
                              {s.role && <div className={`text-[11px] ${theme.textMuted}`}>{s.role}</div>}
                            </td>
                            <td className="py-3 px-4 font-mono text-stone-600">{s.email}</td>
                            <td className="py-3 px-4 font-mono font-medium text-stone-800">{s.phone || '-'}</td>
                            <td className="py-3 px-4 text-stone-700">{s.city || 'Carangola'}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                {s.receiveWhatsapp && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    <MessageCircle className="w-2.5 h-2.5" />
                                    <span>WhatsApp</span>
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                  <Mail className="w-2.5 h-2.5" />
                                  <span>E-mail</span>
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200">
                                {s.origin === 'inscricao' || s.role ? 'Ficha de Inscrição' : 'Boletim do Portal'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {cleanPhone ? (
                                <a
                                  href={`https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(`Olá ${s.name || ''}! Entramos em contato da organização do 1º Simpósio de Saúde Mental da Microrregião de Carangola.`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                                  title="Iniciar conversa no WhatsApp com o assinante"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>WhatsApp</span>
                                </a>
                              ) : (
                                <span className="text-stone-400 text-[11px]">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          );
        })()}

        {/* TAB 5: CUSTOMIZADOR PARA PRÓXIMOS EVENTOS & DESIGN DO CRACHÁ */}
        {activeTab === 'customizer' && (
          <div className="space-y-6">
            {/* Segmented Sub-view Switch inside Configurar Evento */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#0a3641] flex items-center gap-2">
                  <Settings className="w-4 h-4 text-[#d96522]" />
                  <span>Personalização da Plataforma & Credenciais</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Configure os dados do evento ou edite o design oficial do crachá dos participantes.
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl border border-stone-200 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setCustomizerSubView('event')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    customizerSubView === 'event'
                      ? 'bg-[#0a3641] text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Configurações do Evento</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCustomizerSubView('badge')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    customizerSubView === 'badge'
                      ? 'bg-[#ea7a38] text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <IdCard className="w-3.5 h-3.5" />
                  <span>Design do Crachá</span>
                </button>
              </div>
            </div>

            {customizerSubView === 'badge' ? (
              <AdminBadgeDesigner
                config={config}
                registrations={registrations}
                onUpdateConfig={onUpdateConfig}
              />
            ) : (
              <div className={`rounded-2xl border p-6 space-y-6 transition-colors ${theme.card}`}>
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${isDarkMode ? 'border-[#133540]' : 'border-stone-200'}`}>
                  <div>
                    <h3 className={`text-lg font-bold flex items-center gap-2 ${theme.textHeading}`}>
                      <Settings className="w-5 h-5 text-[#d96522]" />
                      <span>Customizador para Próximos Eventos do SUS</span>
                    </h3>
                    <p className={`text-xs mt-1 ${theme.textMuted}`}>
                      Reutilize esta mesma plataforma para futuros simpósios, conferências de saúde ou jornadas microrregionais. Altere título, data, local e carga horária com 1 clique!
                    </p>
                  </div>

                  {configSavedSuccess && (
                    <div className="bg-emerald-100 text-emerald-800 text-xs px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 animate-pulse">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Configurações Salvas com Sucesso!</span>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-stone-300' : 'text-stone-700'}`}>
                    Título Principal do Evento *
                  </label>
                  <input
                    type="text"
                    required
                    value={customConfig.editionTitle}
                    onChange={(e) => setCustomConfig({ ...customConfig, editionTitle: e.target.value })}
                    className={`w-full px-3.5 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 transition-colors ${theme.input}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-stone-300' : 'text-stone-700'}`}>
                    Subtítulo / Região *
                  </label>
                  <input
                    type="text"
                    required
                    value={customConfig.regionTitle}
                    onChange={(e) => setCustomConfig({ ...customConfig, regionTitle: e.target.value })}
                    className={`w-full px-3.5 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 transition-colors ${theme.input}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-stone-300' : 'text-stone-700'}`}>
                  Lema / Descrição do Tema *
                </label>
                <textarea
                  rows={2}
                  required
                  value={customConfig.subtitle}
                  onChange={(e) => setCustomConfig({ ...customConfig, subtitle: e.target.value })}
                  className={`w-full px-3.5 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 transition-colors ${theme.input}`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-stone-300' : 'text-stone-700'}`}>
                    Data Resumida *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 08 de dezembro"
                    value={customConfig.eventDate}
                    onChange={(e) => setCustomConfig({ ...customConfig, eventDate: e.target.value })}
                    className={`w-full px-3.5 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 transition-colors ${theme.input}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-stone-300' : 'text-stone-700'}`}>
                    Horário do Evento *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 8h30 às 16h"
                    value={customConfig.eventHours}
                    onChange={(e) => setCustomConfig({ ...customConfig, eventHours: e.target.value })}
                    className={`w-full px-3.5 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 transition-colors ${theme.input}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-stone-300' : 'text-stone-700'}`}>
                    Carga Horária no Certificado (Horas) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={120}
                    value={customConfig.certificateWorkload}
                    onChange={(e) => setCustomConfig({ ...customConfig, certificateWorkload: parseInt(e.target.value) || 8 })}
                    className={`w-full px-3.5 py-2 text-sm font-mono rounded-lg border focus:outline-none focus:ring-1 transition-colors ${theme.input}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-stone-300' : 'text-stone-700'}`}>
                    Nome do Local / Auditório *
                  </label>
                  <input
                    type="text"
                    required
                    value={customConfig.locationName}
                    onChange={(e) => setCustomConfig({ ...customConfig, locationName: e.target.value })}
                    className={`w-full px-3.5 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 transition-colors ${theme.input}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-stone-300' : 'text-stone-700'}`}>
                    Endereço Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={customConfig.locationAddress}
                    onChange={(e) => setCustomConfig({ ...customConfig, locationAddress: e.target.value })}
                    className={`w-full px-3.5 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 transition-colors ${theme.input}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-stone-300' : 'text-stone-700'}`}>
                    Limite Máximo de Vagas *
                  </label>
                  <input
                    type="number"
                    required
                    min={10}
                    value={customConfig.maxSpots}
                    onChange={(e) => setCustomConfig({ ...customConfig, maxSpots: parseInt(e.target.value) || 200 })}
                    className={`w-full px-3.5 py-2 text-sm font-mono rounded-lg border focus:outline-none focus:ring-1 transition-colors ${theme.input}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-stone-300' : 'text-stone-700'}`}>
                    E-mail Oficial de Contato
                  </label>
                  <input
                    type="email"
                    value={customConfig.contactEmail}
                    onChange={(e) => setCustomConfig({ ...customConfig, contactEmail: e.target.value })}
                    className={`w-full px-3.5 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 transition-colors ${theme.input}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-stone-300' : 'text-stone-700'}`}>
                    Telefone da Organização
                  </label>
                  <input
                    type="text"
                    value={customConfig.contactPhone}
                    onChange={(e) => setCustomConfig({ ...customConfig, contactPhone: e.target.value })}
                    className={`w-full px-3.5 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 transition-colors ${theme.input}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-stone-300' : 'text-stone-700'}`}>
                  Organização Responsável *
                </label>
                <input
                  type="text"
                  required
                  value={customConfig.organizer}
                  onChange={(e) => setCustomConfig({ ...customConfig, organizer: e.target.value })}
                  className={`w-full px-3.5 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 transition-colors ${theme.input}`}
                />
              </div>

              {/* Integração com Google Forms & Planilhas */}
              <div className="p-4 rounded-xl border border-purple-200/80 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider">
                      Integração de Inscrições: Google Forms & Excel
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsGoogleFormsModalOpen(true)}
                    className="text-xs font-bold text-purple-700 hover:text-purple-900 dark:text-purple-300 underline underline-offset-2 cursor-pointer"
                  >
                    Abrir Central de Sincronização (.xlsx)
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-stone-300' : 'text-stone-700'}`}>
                      Link Público do Google Forms (Divulgação)
                    </label>
                    <input
                      type="url"
                      placeholder="https://forms.gle/..."
                      value={customConfig.googleFormsUrl || ''}
                      onChange={(e) => setCustomConfig({ ...customConfig, googleFormsUrl: e.target.value })}
                      className={`w-full px-3.5 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 transition-colors ${theme.input}`}
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-[#06151c] border border-stone-200 dark:border-[#1a414e] mt-auto">
                    <div className="text-xs font-bold text-stone-800 dark:text-stone-200">
                      Fluxo Unificado para o Participante
                    </div>
                    <div className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                      O usuário final visualiza apenas o formulário oficial do Simpósio. A unificação das respostas do Google Forms/Excel é 100% gerenciada aqui pelo gestor.
                    </div>
                  </div>
                </div>
              </div>

              <div className={`flex flex-wrap items-center justify-between gap-4 pt-4 border-t transition-colors ${isDarkMode ? 'border-[#133540]' : 'border-stone-200'}`}>
                <button
                  type="button"
                  onClick={onResetConfig}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    isDarkMode
                      ? 'bg-[#102a33] hover:bg-[#163742] text-stone-200 border border-[#1a414e]'
                      : 'text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Restaurar Padrão do 1º Simpósio</span>
                </button>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-[#0a3641] hover:bg-[#0f4b59] rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#ea7a38]" />
                  <span>Salvar Alterações para o Evento</span>
                </button>
              </div>

            </form>
              </div>
            )}
          </div>
        )}



      </div>

      {/* Crachá Modal */}
      <BadgeModal
        registration={selectedBadgeAttendee}
        config={config}
        onClose={() => setSelectedBadgeAttendee(null)}
        onOpenBadgeDesigner={() => {
          setActiveTab('customizer');
          setCustomizerSubView('badge');
        }}
      />

      {/* Modal: Adicionar Novo Documento PDF */}
      {isAddMaterialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
          <div className={`relative w-full max-w-lg rounded-2xl shadow-2xl border p-6 space-y-4 my-8 ${theme.modalBg}`}>
            <div className="flex items-center justify-between border-b pb-3 border-stone-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#ea7a38]/20 flex items-center justify-center text-[#ea7a38]">
                  <FileUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${theme.textHeading}`}>
                    Adicionar Novo Documento PDF
                  </h3>
                  <p className={`text-[11px] ${theme.textMuted}`}>
                    Publicar material de apoio na Área de Downloads
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isSavingMaterial}
                onClick={() => setIsAddMaterialModalOpen(false)}
                className={`text-sm font-bold cursor-pointer ${theme.textMuted} hover:text-rose-500 disabled:opacity-40`}
              >
                ✕
              </button>
            </div>

            {!firebaseSyncState?.isVerifiedAdmin && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-center justify-between gap-2">
                <span>
                  <strong>Aviso:</strong> Conecte sua conta oficial (<span className="font-mono">farmaciademinas.marketing@gmail.com</span>) para que o PDF apareça em outros celulares e no link compartilhado.
                </span>
                {onConnectFirebaseAdmin && (
                  <button
                    type="button"
                    onClick={onConnectFirebaseAdmin}
                    className="px-2.5 py-1.5 rounded-lg bg-[#0a3641] text-white font-bold shrink-0 cursor-pointer hover:bg-[#0f4b59]"
                  >
                    Conectar
                  </button>
                )}
              </div>
            )}

            {materialError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{materialError}</span>
              </div>
            )}

            <form onSubmit={handleCreateMaterial} className="space-y-3.5">
              
              {/* File Upload Drop Area */}
              <div>
                <label className="block text-xs font-bold mb-1.5 text-stone-700">
                  Arquivo (PDF, DOCX até 15 MB) *
                </label>
                <div className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                  newMaterialForm.fileName
                    ? 'border-emerald-500/70 bg-emerald-50/50'
                    : 'border-stone-300 hover:border-[#0a3641] bg-stone-50/60'
                }`}>
                  <input
                    type="file"
                    accept=".pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.zip,application/zip"
                    disabled={isSavingMaterial}
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  {isReadingFile ? (
                    <div className="space-y-1.5 py-2">
                      <Loader2 className="w-6 h-6 mx-auto animate-spin text-[#0a3641]" />
                      <div className="text-xs font-bold text-[#0a3641]">
                        Lendo arquivo...
                      </div>
                    </div>
                  ) : newMaterialForm.fileName ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-2">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Arquivo Carregado ({newMaterialForm.format})!</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewMaterialForm({
                              ...newMaterialForm,
                              fileUrl: '',
                              fileName: '',
                              size: '1.2 MB'
                            });
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-300 transition-colors cursor-pointer z-10"
                          title="Remover anexo selecionado"
                        >
                          <Trash2 className="w-3 h-3 text-rose-600" />
                          <span>Remover anexo</span>
                        </button>
                      </div>
                      <div className={`text-xs font-semibold truncate px-2 ${theme.textHeading}`}>
                        {newMaterialForm.fileName}
                      </div>
                      <div className={`text-[11px] font-mono ${theme.textMuted}`}>
                        Formato: <strong>{newMaterialForm.format}</strong> · Tamanho: <strong>{newMaterialForm.size}</strong> · Clique para trocar
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 py-2">
                      <Upload className="w-7 h-7 mx-auto text-[#0a3641]" />
                      <div className={`text-xs font-bold ${theme.textHeading}`}>
                        Clique ou arraste seu arquivo PDF ou DOCX aqui
                      </div>
                      <div className={`text-[11px] ${theme.textMuted}`}>
                        Suporta arquivos no formato PDF e DOCX até 15 MB (salvos na nuvem com pré-visualização pública)
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Optional External URL Alternative */}
              <div>
                <label className="block text-[11px] font-bold mb-1 text-stone-600 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-[#0a3641]" />
                  <span>Ou cole um Link Direto do Documento (opcional, ex.: Google Drive / Portal SUS)</span>
                </label>
                <input
                  type="url"
                  disabled={isSavingMaterial}
                  placeholder="https://..."
                  value={newMaterialForm.externalUrl}
                  onChange={(e) =>
                    setNewMaterialForm({
                      ...newMaterialForm,
                      externalUrl: e.target.value,
                      fileUrl: e.target.value ? '' : newMaterialForm.fileUrl,
                      fileName: e.target.value ? '' : newMaterialForm.fileName,
                      size: e.target.value ? 'Link Externo' : newMaterialForm.size
                    })
                  }
                  className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#ea7a38] ${theme.inputModal}`}
                />
              </div>

              {/* Título do Documento */}
              <div>
                <label className="block text-xs font-bold mb-1 text-stone-700">
                  Título do Documento *
                </label>
                <input
                  type="text"
                  required
                  disabled={isSavingMaterial}
                  placeholder="Ex: Fluxograma Microrregional de Urgências e Emergências da RAPS"
                  value={newMaterialForm.title}
                  onChange={(e) => setNewMaterialForm({ ...newMaterialForm, title: e.target.value })}
                  className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#ea7a38] ${theme.inputModal}`}
                />
              </div>

              {/* Categoria, Formato e Páginas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1 text-stone-700">
                    Categoria *
                  </label>
                  <select
                    disabled={isSavingMaterial}
                    value={newMaterialForm.category}
                    onChange={(e) => setNewMaterialForm({ ...newMaterialForm, category: e.target.value as DownloadMaterial['category'] })}
                    className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#ea7a38] ${theme.inputModal}`}
                  >
                    <option value="Fluxograma">Fluxograma</option>
                    <option value="Apostila">Apostila</option>
                    <option value="Legislação">Legislação / Portaria</option>
                    <option value="Apresentação">Apresentação / Slides</option>
                    <option value="Cartilha">Cartilha</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-stone-700">
                    Formato *
                  </label>
                  <select
                    disabled={isSavingMaterial}
                    value={newMaterialForm.format}
                    onChange={(e) => setNewMaterialForm({ ...newMaterialForm, format: e.target.value as DownloadMaterial['format'] })}
                    className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#ea7a38] ${theme.inputModal}`}
                  >
                    <option value="PDF">PDF (Portátil)</option>
                    <option value="DOCX">DOCX (Word Editável)</option>
                    <option value="ZIP">ZIP (Arquivo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-stone-700">
                    Nº de Páginas *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={2000}
                    required
                    disabled={isSavingMaterial}
                    value={newMaterialForm.pages}
                    onChange={(e) => setNewMaterialForm({ ...newMaterialForm, pages: parseInt(e.target.value) || 1 })}
                    className={`w-full px-3 py-2 text-xs font-mono rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#ea7a38] ${theme.inputModal}`}
                  />
                </div>
              </div>

              {/* Autoria / Órgão */}
              <div>
                <label className="block text-xs font-bold mb-1 text-stone-700">
                  Autoria / Órgão Expedidor *
                </label>
                <input
                  type="text"
                  required
                  disabled={isSavingMaterial}
                  placeholder="Ex: Colegiado Gestor da RAPS / Secretaria de Saúde de Carangola"
                  value={newMaterialForm.author}
                  onChange={(e) => setNewMaterialForm({ ...newMaterialForm, author: e.target.value })}
                  className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#ea7a38] ${theme.inputModal}`}
                />
              </div>

              {/* Descrição / Resumo */}
              <div>
                <label className="block text-xs font-bold mb-1 text-stone-700">
                  Descrição e Resumo Técnico *
                </label>
                <textarea
                  required
                  rows={3}
                  disabled={isSavingMaterial}
                  placeholder="Descreva o objetivo do documento, principais protocolos abordados e para quais equipes da microrregião ele é direcionado..."
                  value={newMaterialForm.description}
                  onChange={(e) => setNewMaterialForm({ ...newMaterialForm, description: e.target.value })}
                  className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#ea7a38] ${theme.inputModal}`}
                />
              </div>

              {/* Cloud Upload Progress */}
              {isSavingMaterial && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#0a3641]">
                    <span>Enviando documento para a nuvem...</span>
                    <span className="font-mono">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#ea7a38] transition-all duration-200"
                      style={{ width: `${Math.max(8, uploadProgress)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  disabled={isSavingMaterial}
                  onClick={() => setIsAddMaterialModalOpen(false)}
                  className={`px-3.5 py-2 text-xs cursor-pointer ${theme.textMuted} hover:text-stone-900 disabled:opacity-40`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isReadingFile || isSavingMaterial}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#d96522] to-[#ea7a38] hover:brightness-105 active:scale-95 rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSavingMaterial ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando na Nuvem...</span>
                    </>
                  ) : (
                    <>
                      <FileUp className="w-3.5 h-3.5" />
                      <span>Publicar Documento PDF</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Google Forms & Excel Integration Modal */}
      <GoogleFormsSyncModal
        isOpen={isGoogleFormsModalOpen}
        onClose={() => setIsGoogleFormsModalOpen(false)}
        config={config}
        onUpdateConfig={onUpdateConfig}
        registrations={registrations}
        onBatchImportRegistrations={onBatchImportRegistrations || (() => {})}
      />

      {/* Delete Attendee Confirmation Modal */}
      {attendeeToDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900 leading-tight">
                  Excluir Inscrição de Participante
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Ação administrativa do Gestor do SUS
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1.5">
              <div><strong className="text-stone-700">Nome:</strong> <span className="font-semibold text-stone-900">{attendeeToDelete.fullName}</span></div>
              <div><strong className="text-stone-700">Código:</strong> <span className="font-mono text-[#0a3641] font-bold">{attendeeToDelete.code}</span></div>
              <div><strong className="text-stone-700">CPF:</strong> <span className="font-mono">{attendeeToDelete.cpf}</span></div>
              <div><strong className="text-stone-700">Município:</strong> {attendeeToDelete.city}</div>
              <div><strong className="text-stone-700">Categoria:</strong> {attendeeToDelete.professionalRole}</div>
              <div><strong className="text-stone-700">Instituição:</strong> {attendeeToDelete.institution}</div>
            </div>

            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200/80 text-xs text-rose-800 leading-relaxed font-medium">
              ⚠️ <strong>Atenção:</strong> O gestor tem autorização para deletar qualquer participante, mesmo que ele tenha se cadastrado pelo portal. Esta exclusão remove os dados da listagem e <strong>libera imediatamente 1 vaga</strong> na contagem oficial do auditório.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setAttendeeToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = attendeeToDelete.id;
                  const name = attendeeToDelete.fullName;
                  const code = attendeeToDelete.code;
                  if (onDeleteRegistration) {
                    onDeleteRegistration(id);
                  }
                  setAttendeeToDelete(null);
                  setAttendeeDeleteNotice(`A inscrição de "${name}" (${code}) foi excluída com sucesso! 1 vaga foi liberada no auditório.`);
                  setTimeout(() => setAttendeeDeleteNotice(null), 4500);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Deletar Participante</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Post Confirmation Modal */}
      {postToDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">Excluir Postagem do Mural</h3>
                <p className="text-xs text-stone-500">Moderação do Mural Comunitário SUS</p>
              </div>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200">
              Deseja remover a publicação de <strong>{postToDelete.authorName}</strong> ({postToDelete.city})? Os gráficos de postagens serão atualizados em tempo real.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setPostToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = postToDelete;
                  onDeletePost?.(target.id);
                  setPostToDelete(null);
                  setPostDeleteNotice(`A postagem de "${target.authorName}" foi removida com sucesso do mural.`);
                  setTimeout(() => setPostDeleteNotice(null), 4000);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmar Exclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Material Confirmation Modal */}
      {materialToDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">Remover Documento PDF</h3>
                <p className="text-xs text-stone-500">Biblioteca Técnica SUS</p>
              </div>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200">
              Deseja realmente remover o documento <strong>"{materialToDelete.title}"</strong>? Ele deixará de ficar disponível para download público.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setMaterialToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = materialToDelete;
                  await onDeleteMaterial?.(target.id);
                  setMaterialToDelete(null);
                  setMaterialNotice({
                    type: 'success',
                    text: `Documento "${target.title}" removido com sucesso.`
                  });
                  setTimeout(() => setMaterialNotice(null), 4000);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmar Remoção</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
