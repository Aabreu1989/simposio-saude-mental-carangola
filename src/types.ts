export interface ThematicAxis {
  id: string;
  number: number;
  title: string;
  shortTitle: string;
  description: string;
  icon: 'network' | 'hospital' | 'justice' | 'heart';
  color: string;
  bgColor: string;
}

export interface ScheduleSession {
  id: string;
  timeStart: string;
  timeEnd: string;
  title: string;
  type: 'credenciamento' | 'abertura' | 'mesa' | 'intervalo' | 'plenaria' | 'encerramento';
  axisId?: string;
  location: string;
  mediator?: {
    name: string;
    role: string;
    institution: string;
  };
  speakers?: Array<{
    name: string;
    role: string;
    institution: string;
    avatar?: string;
  }>;
  description: string;
  targetAudience?: string;
}

export interface Registration {
  id: string;
  code: string; // e.g. "CAR-SM-001"
  fullName: string;
  cpf: string;
  cns?: string; // Cartão Nacional de Saúde
  email: string;
  phone: string;
  city: string;
  professionalRole: string;
  institution: string;
  axisInterest: string;
  accessibilityNeeds?: string;
  status: 'confirmada' | 'presente' | 'cancelada';
  registeredAt: string;
  checkedInAt?: string;
  certificateIssued: boolean;
  certificateDownloaded?: boolean;
  certificateDownloadedAt?: string;
  certificateDownloadCount?: number;
  notes?: string;

  // Redes Sociais
  instagram?: string;
  linkedin?: string;
  otherSocial?: string;

  // Métricas do Painel de Gestão
  ageGroup?: string; // ex: '18 a 29 anos', '30 a 39 anos', etc.
  educationLevel?: string; // ex: 'Superior Completo', 'Especialização', etc.
  susCareLevel?: string; // ex: 'Atenção Primária', 'CAPS', 'Hospital Geral', etc.
  referralSource?: string; // ex: 'Secretaria de Saúde', 'WhatsApp', 'Instagram', etc.

  // Preferências de comunicação
  acceptEmailNews?: boolean;
  acceptWhatsappNews?: boolean;

  // Canal de Inscrição (Formulário do Portal vs Google Forms)
  origin?: 'portal' | 'google_forms' | 'presencial';
}

export interface CertificateDownloadRecord {
  id: string;
  registrationId: string;
  code: string;
  fullName: string;
  cpf: string;
  city: string;
  professionalRole: string;
  institution: string;
  downloadedAt: string;
  method: 'pdf' | 'print';
}

export interface CertificateDesignConfig {
  primaryColor: string;
  accentColor: string;
  secondaryColor: string;
  backgroundColor: string;
  borderStyle: 'double' | 'classic' | 'minimal';
  layoutTheme: 'raps_waves' | 'institutional_classic' | 'modern_clean';
  fontFamily: 'sans' | 'serif';
  institutionTopLine: string;
  institutionName: string;
  institutionSub: string;
  badgeLabel: string;
  mainTitle: string;
  preNameText: string;
  bodyTemplate: string;
  footerQuote: string;
  showBannerImage: boolean;
  bannerImageUrl: string;
  showThematicAxes: boolean;
  showBottomWaves: boolean;
  showWatermark: boolean;
  watermarkText: string;
  showQrValidation: boolean;
  signature1Name: string;
  signature1Role: string;
  signature1Org: string;
  signature2Name: string;
  signature2Role: string;
  signature2Org: string;
}

export interface DownloadMaterial {
  id: string;
  title: string;
  category: 'Apostila' | 'Legislação' | 'Apresentação' | 'Fluxograma' | 'Cartilha';
  author: string;
  format: 'PDF' | 'DOCX' | 'ZIP';
  size: string;
  description: string;
  pages: number;
  downloadsCount: number;
  fileUrl: string;
  chunkCount?: number;
  fileName?: string;
  mimeType?: string;
  createdAt?: string;
  updatedAt?: string;
  pendingCloudSync?: boolean;
  deleted?: boolean;
}

export interface SocialPost {
  id: string;
  authorName: string;
  authorRole: string;
  city: string;
  content: string;
  hashtags?: string;
  imageUrl?: string;
  storagePath?: string;
  imageFileName?: string;
  likes: number;
  hasLiked?: boolean;
  createdAt: string;
  timestamp?: number;
  pinned?: boolean;
  status?: 'approved' | 'pending' | 'rejected';
  voterIds?: string[];
  moderatedAt?: string;
  moderatedBy?: string;
}

export interface SpeakerProfile {
  id: string;
  name: string;
  role: string;
  institution: string;
  sessionGroup: 'abertura' | 'mesa-1' | 'mesa-2' | 'mesa-3';
  sessionLabel: string;
  sessionTime: string;
  photoUrl?: string;
  photoPosition?: string;
  bio: string;
  socials: {
    instagram?: string;
    instagramUrl?: string;
    linkedin?: string;
    linkedinUrl?: string;
    lattesUrl?: string;
  };
}

export interface PushNotificationItem {
  id: string;
  title: string;
  body: string;
  category: 'lembrete' | 'aviso' | 'material' | 'certificado' | 'urgente';
  targetAudience: 'todos' | 'inscritos' | 'presentes' | 'profissionais';
  sentAt: string;
  readCount: number;
  totalSent: number;
  clickedUrl?: string;
  createdAt?: string;
  active?: boolean;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  name?: string;
  role?: string;
  city?: string;
  subscribedAt: string;
  receiveWhatsapp: boolean;
  receiveEmail?: boolean;
  phone?: string;
  institution?: string;
  origin?: 'inscricao' | 'newsletter_form';
  status?: 'active' | 'unsubscribed';
  unsubscribedAt?: string;
  consent?: boolean;
  emailHash?: string;
  unsubscribeTokenHash?: string;
  unsubscribeTokenExpiresAt?: string;
  unsubscribeTokenExpiresAtMillis?: number;
  tokenProof?: string;
  updatedAt?: string;
}

export interface BadgeDesignConfig {
  layoutTheme: 'institutional_lanyard' | 'modern_stripe' | 'minimal_card';
  primaryColor: string;
  accentColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  headerLabel: string;
  subHeaderLabel: string;
  footerLabel: string;
  accreditedBadgeLabel: string;
  pendingBadgeLabel: string;
  showLogo: boolean;
  showQrCode: boolean;
  showCity: boolean;
  showInstitution: boolean;
  showAxisInterest: boolean;
  showCareLevel: boolean;
  showLanyardSlot: boolean;
  paperFormat: 'a6' | 'card';
}

export interface EmailJsPublicConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
  enabled: boolean;
}

export interface EventConfig {
  editionTitle: string; // "1º Simpósio de Saúde Mental"
  regionTitle: string; // "da Microrregião de Carangola"
  subtitle: string; // "Um espaço de diálogo, reflexão e construção coletiva..."
  eventDate: string; // "08 de dezembro"
  eventFullDate: string; // "08 de Dezembro de 2026"
  eventHours: string; // "8h30 às 16h"
  locationName: string; // "UEMG Carangola"
  locationAddress: string; // "Praça Cel. Maximiano, 180 - Centro, Carangola - MG, 36800-000"
  contactEmail: string; // "saudemental.carangola@sus.mg.gov.br"
  contactPhone: string; // "(32) 3741-9900"
  maxSpots: number; // 250
  certificateWorkload: number; // 8 horas
  bannerImage: string; // poster asset
  isRegistrationOpen: boolean;
  organizer: string; // "Secretaria Municipal de Saúde de Carangola e Colegiado Gestor da RAPS"

  // Integração com Google Forms & Planilhas
  googleFormsUrl?: string; // URL do formulário externo Google Forms
  googleSheetsSyncUrl?: string; // URL de exportação CSV ou link da planilha Google Forms
  enableGoogleFormsOption?: boolean; // Se deve exibir botão/opção do Google Forms na inscrição pública

  // Design customizável do Certificado Oficial
  certificateDesign?: CertificateDesignConfig;

  // Design customizável do Crachá Oficial
  badgeDesign?: BadgeDesignConfig;

  // Configuração pública do EmailJS sincronizada via Firestore
  emailJsConfig?: EmailJsPublicConfig;
}

export interface EvaluationFeedback {
  id: string;
  respondentName?: string;
  respondentRole?: string;
  city?: string;
  npsScore: number; // 0 to 10
  ratingOrganization: number; // 1 to 5
  ratingSpeakers: number; // 1 to 5
  ratingRelevance: number; // 1 to 5
  ratingVenue: number; // 1 to 5
  favoriteSession: string;
  comment: string;
  createdAt: string;
}
