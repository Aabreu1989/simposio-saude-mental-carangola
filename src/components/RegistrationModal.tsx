import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle,
  QrCode,
  Printer,
  UserCheck,
  WifiOff,
  Bell,
  Calendar,
  Share2,
  Instagram,
  Linkedin,
  Globe,
  Briefcase,
  GraduationCap,
  Sparkles,
  Building2,
  Send,
  ArrowLeft,
  Mail,
  Eye,
  RefreshCw,
  CheckCircle2,
  Copy,
  Check,
  FileText,
  ExternalLink,
  Lock,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { Registration, EventConfig, NewsletterSubscriber } from '../types.ts';
import { REGIONAL_CITIES, PROFESSIONAL_ROLES, INITIAL_SCHEDULE } from '../data/initialData.ts';
import {
  formatCPF,
  formatPhone,
  generateRegistrationCode,
  getOrCreateParticipantRegistrationIdentity,
  sendBrowserNotification,
  isCertificateAvailableForPublic,
  CERTIFICATE_RELEASE_LABEL
} from '../utils/helpers.ts';
import {
  sendRegistrationConfirmationEmail,
  buildRegistrationConfirmationEmail,
  ConfirmationEmailResult
} from '../services/confirmationEmailService.ts';
import { formatRegistrationWhatsAppMessage, createWhatsAppChatUrl } from '../utils/whatsapp.ts';

// Strategic choices for SUS Management Dashboard metrics
export const SUS_CARE_LEVELS = [
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

export const AGE_GROUPS = [
  '18 a 29 anos',
  '30 a 39 anos',
  '40 a 49 anos',
  '50 a 59 anos',
  '60 anos ou mais'
];

export const EDUCATION_LEVELS = [
  'Ensino Médio / Técnico',
  'Superior Incompleto',
  'Superior Completo',
  'Especialização / Residência',
  'Mestrado',
  'Doutorado',
  'Pós Doutorado'
];

export const REFERRAL_SOURCES = [
  'Ofício / Comunicado da Secretaria de Saúde',
  'Grupo de WhatsApp do SUS / Trabalho',
  'Colega de Equipe / Indicação de Amigo',
  'Instagram / Redes Sociais',
  'Cartaz impresso na Unidade de Saúde',
  'Mural Social da Plataforma',
  'Outro Canal'
];

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveRegistration: (
    reg: Registration,
    isOfflineQueued: boolean
  ) =>
    | Promise<{
        status: 'persisted' | 'already_exists' | 'queued' | 'error';
        registration: Registration;
        error?: string;
      }>
    | void;
  onSubscribeNewsletter?: (sub: NewsletterSubscriber) => void;
  totalRegistered: number;
  existingCodes?: string[];
  config: EventConfig;
  isOnline: boolean;
  existingRegistration?: Registration | null;
  onOpenShare?: () => void;
  onOpenCalendar?: () => void;
  isStandalone?: boolean;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  onSaveRegistration,
  onSubscribeNewsletter,
  totalRegistered,
  existingCodes = [],
  config,
  isOnline,
  existingRegistration,
  onOpenShare,
  onOpenCalendar,
  isStandalone = false
}) => {
  const [submittedVoucher, setSubmittedVoucher] = useState<Registration | null>(existingRegistration || null);
  const [registrationStatus, setRegistrationStatus] = useState<
    'idle' | 'confirmed' | 'already_exists' | 'pending_sync' | 'error'
  >(existingRegistration ? 'confirmed' : 'idle');
  const [isQueuedOffline, setIsQueuedOffline] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmationEmailResult, setConfirmationEmailResult] = useState<ConfirmationEmailResult | null>(null);
  const [isEmailPreviewOpen, setIsEmailPreviewOpen] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [emailResentSuccess, setEmailResentSuccess] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Sincroniza em tempo real se o gestor deletar a inscrição atual ou houver atualização externa
  useEffect(() => {
    if (existingRegistration === null) {
      setSubmittedVoucher(null);
      setRegistrationStatus('idle');
      setConfirmationEmailResult(null);
    } else if (existingRegistration && !submittedVoucher) {
      setSubmittedVoucher(existingRegistration);
      setRegistrationStatus('confirmed');
    }
  }, [existingRegistration]);

  const handleResendEmail = async () => {
    if (!submittedVoucher || isQueuedOffline) return;
    setIsResendingEmail(true);
    try {
      const res = await sendRegistrationConfirmationEmail(
        submittedVoucher,
        INITIAL_SCHEDULE,
        config,
        { resend: true }
      );
      setConfirmationEmailResult(res);
      setEmailResentSuccess(res.actuallyDelivered);
      setTimeout(() => setEmailResentSuccess(false), 3000);
    } catch (err) {
      console.warn('Erro ao reenviar e-mail de confirmação:', err);
    } finally {
      setIsResendingEmail(false);
    }
  };

  const handleCopyEmailText = () => {
    if (!submittedVoucher) return;
    const { bodyText } = buildRegistrationConfirmationEmail(submittedVoucher, INITIAL_SCHEDULE, config);
    navigator.clipboard.writeText(bodyText);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const [formData, setFormData] = useState({
    fullName: '',
    cpf: '',
    email: '',
    phone: '',
    city: '',
    customCity: '',
    professionalRole: '',
    customRole: '',
    institution: '',
    axisInterest: '',
    accessibilityNeeds: '',

    // Redes Sociais (Requisito 1)
    instagram: '',
    linkedin: '',

    // Métricas Estratégicas do Painel de Gestão (Requisito 2)
    susCareLevel: '',
    ageGroup: '',
    educationLevel: '',
    referralSource: '',

    // Aceite de Novidades por E-mail e WhatsApp (Requisito 4)
    notifyWhatsapp: true,
    notifyEmail: true,
    notifyPush: false,
    acceptTerms: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen && !isStandalone) return null;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.fullName.trim()) errs.fullName = 'Nome completo é obrigatório';
    if (!formData.cpf.trim() || formData.cpf.replace(/\D/g, '').length < 11) {
      errs.cpf = 'CPF válido com 11 dígitos é obrigatório para emissão do certificado';
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      errs.email = 'E-mail válido é obrigatório';
    }
    if (!formData.phone.trim() || formData.phone.replace(/\D/g, '').length < 10) {
      errs.phone = 'Telefone/WhatsApp com DDD é obrigatório';
    }
    if (!formData.city) {
      errs.city = 'Selecione seu município';
    }
    if (!formData.professionalRole) {
      errs.professionalRole = 'Selecione sua categoria profissional/ocupação';
    }
    if (formData.professionalRole === 'Outros' && !formData.customRole.trim()) {
      errs.customRole = 'Por favor, especifique sua categoria profissional/ocupação';
    }
    if ((formData.city === 'Outros' || formData.city === 'Outro Município de MG') && !formData.customCity.trim()) {
      errs.customCity = 'Por favor, informe seu município';
    }
    if (!formData.susCareLevel) {
      errs.susCareLevel = 'Selecione seu nível de atenção no SUS / vínculo';
    }
    if (!formData.institution.trim()) {
      errs.institution = 'Instituição ou local de trabalho é obrigatório';
    }
    if (!formData.ageGroup) {
      errs.ageGroup = 'Selecione sua faixa etária';
    }
    if (!formData.educationLevel) {
      errs.educationLevel = 'Selecione sua escolaridade';
    }
    if (!formData.referralSource) {
      errs.referralSource = 'Selecione como tomou conhecimento do simpósio';
    }
    if (!formData.axisInterest) {
      errs.axisInterest = 'Selecione o eixo temático de maior interesse';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    setIsSubmitting(true);

    const { id: regId, code } = getOrCreateParticipantRegistrationIdentity(
      formData.cpf,
      formData.email,
      existingCodes
    );

    const isOtherCity = formData.city === 'Outros' || formData.city === 'Outro Município de MG';
    const resolvedCity = isOtherCity && formData.customCity.trim()
      ? formData.customCity.trim()
      : formData.city;

    const resolvedRole = formData.professionalRole === 'Outros' && formData.customRole.trim()
      ? formData.customRole.trim()
      : formData.professionalRole;

    // Normalizing social media handle
    let cleanInstagram = formData.instagram.trim();
    if (cleanInstagram && !cleanInstagram.startsWith('@') && !cleanInstagram.includes('http')) {
      cleanInstagram = `@${cleanInstagram}`;
    }

    const newReg: Registration = {
      id: regId,
      code,
      fullName: formData.fullName.trim(),
      cpf: formData.cpf.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim(),
      city: resolvedCity,
      professionalRole: resolvedRole,
      institution: formData.institution.trim(),
      axisInterest: formData.axisInterest,
      accessibilityNeeds: formData.accessibilityNeeds || 'Nenhuma',
      status: 'confirmada',
      registeredAt: new Date().toISOString(),
      certificateIssued: false,

      // Redes sociais
      instagram: cleanInstagram || undefined,
      linkedin: formData.linkedin.trim() || undefined,

      // Métricas de gestão
      susCareLevel: formData.susCareLevel,
      ageGroup: formData.ageGroup,
      educationLevel: formData.educationLevel,
      referralSource: formData.referralSource,

      // Aceite de novidades
      acceptEmailNews: formData.notifyEmail,
      acceptWhatsappNews: formData.notifyWhatsapp
    };

    if (formData.notifyPush) {
      sendBrowserNotification(
        'Notificações do Simpósio Ativadas!',
        'Você receberá comunicados oficiais da RAPS e lembretes da programação neste dispositivo.'
      );
    }

    const queued = !isOnline;

    try {
      const outcome = await onSaveRegistration(newReg, queued);

      if (outcome && outcome.status === 'error') {
        setRegistrationStatus('error');
        setSubmitError(
          outcome.error ||
            'Não foi possível confirmar a inscrição no banco de dados Firestore. Seus dados foram preservados abaixo para você tentar novamente.'
        );
        setIsSubmitting(false);
        return;
      }

      // Alimenta base de assinantes de newsletter e whatsapp no painel do gestor apenas após confirmação
      if (onSubscribeNewsletter && (formData.notifyWhatsapp || formData.notifyEmail)) {
        onSubscribeNewsletter({
          id: `sub-${Date.now()}`,
          email: formData.email.trim().toLowerCase(),
          name: formData.fullName.trim(),
          phone: formData.phone.trim(),
          city: resolvedCity,
          role: resolvedRole,
          institution: formData.institution.trim(),
          receiveWhatsapp: formData.notifyWhatsapp,
          receiveEmail: formData.notifyEmail,
          origin: 'inscricao',
          subscribedAt: new Date().toISOString().split('T')[0]
        });
      }

      const confirmedRegistration =
        outcome && outcome.registration ? outcome.registration : newReg;

      const isOfflineQueuedResult = outcome ? outcome.status === 'queued' : queued;
      setIsQueuedOffline(isOfflineQueuedResult);
      setRegistrationStatus(
        isOfflineQueuedResult
          ? 'pending_sync'
          : outcome?.status === 'already_exists'
          ? 'already_exists'
          : 'confirmed'
      );
      setSubmittedVoucher(confirmedRegistration);
      setIsSubmitting(false);

      // Dispara envio do e-mail oficial apenas após confirmação real no Firestore
      if (!isOfflineQueuedResult) {
        setIsSendingEmail(true);
        sendRegistrationConfirmationEmail(confirmedRegistration, INITIAL_SCHEDULE, config)
          .then((res) => {
            setConfirmationEmailResult(res);
          })
          .catch((err) => {
            console.warn('Erro ao disparar e-mail de confirmação:', err);
          })
          .finally(() => {
            setIsSendingEmail(false);
          });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setRegistrationStatus('error');
      setSubmitError(`Erro durante o processamento da inscrição: ${msg}`);
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    const el = document.getElementById('comprovante-voucher');
    if (!el) {
      window.print();
      return;
    }
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.opacity = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      window.print();
      return;
    }
    doc.open();
    doc.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Comprovante ${submittedVoucher?.code || ''}</title><style>body{font-family:sans-serif;padding:24px;color:#0f172a;} .voucher-box{border:2px solid #0a3641;border-radius:12px;padding:20px;max-width:640px;margin:0 auto;}</style></head><body><div class="voucher-box">${el.innerHTML}</div></body></html>`);
    doc.close();
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 2000);
      }
    }, 250);
  };

  const modalContent = (
    <div className={`relative w-full ${isStandalone ? 'max-w-3xl mx-auto my-0' : 'max-w-2xl my-8'} bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-stone-200 overflow-hidden`}>
      
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 bg-[#0a3641] text-white flex items-center justify-between gap-3 border-b-2 border-[#ea7a38]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#d96522] to-[#ea7a38] flex items-center justify-center text-white shrink-0 shadow-xs">
            <UserCheck className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm xs:text-base sm:text-lg font-black leading-tight text-white tracking-tight">
              1º Simpósio de Saúde Mental
            </h2>
            <p className="text-[11px] sm:text-xs text-stone-300 mt-0.5">
              Inscrição Gratuita · Certificado Oficial SUS (8 Horas)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onOpenShare && (
            <button
              type="button"
              onClick={onOpenShare}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-[#ea7a38] hover:text-white rounded-xl transition-colors cursor-pointer"
              title="Divulgar link direto de inscrição"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Divulgar</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-stone-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-xs font-bold border border-white/20"
            aria-label={isStandalone ? 'Voltar ao Portal Completo' : 'Fechar'}
          >
            {isStandalone ? (
              <>
                <ArrowLeft className="w-3.5 h-3.5 text-[#ea7a38]" />
                <span className="hidden xs:inline">Voltar ao Portal</span>
              </>
            ) : (
              <X className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Offline Warning Banner */}
      {!isOnline && (
        <div className="bg-amber-50 px-6 py-2.5 border-b border-amber-200 flex items-center gap-2 text-xs text-amber-800">
          <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Modo Offline Ativo:</strong> Você pode preencher agora. O voucher será gerado imediatamente no dispositivo e sincronizado com os servidores do SUS quando voltar a ter conexão.
          </span>
        </div>
      )}

      <div className={isStandalone ? "p-4 sm:p-8" : "p-6 max-h-[80vh] overflow-y-auto"}>
          {submittedVoucher ? (
            /* Confirmation / Pending Sync Voucher Screen */
            <div className="space-y-6">
              {isQueuedOffline || registrationStatus === 'pending_sync' ? (
                <div className="p-6 bg-amber-50 border-2 border-amber-300 rounded-2xl text-center space-y-3">
                  <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto shadow-2xs">
                    <WifiOff className="w-8 h-8" />
                  </div>
                  <h4 className="text-2xl font-extrabold text-amber-950">
                    Inscrição Pendente de Sincronização
                  </h4>
                  <p className="text-sm text-amber-900 max-w-md mx-auto">
                    Seus dados foram preservados localmente neste dispositivo, mas a gravação remota no Firestore ainda não foi confirmada. A sua vaga no <strong>{config.editionTitle}</strong> somente estará confirmada após a sincronização com o servidor.
                  </p>
                  <div className="inline-block bg-amber-200/80 text-amber-950 text-xs px-3 py-1 rounded-full font-bold">
                    Aguardando conexão para confirmar inscrição remota
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-[#f5faf8] border-2 border-[#2a9d8f]/30 rounded-2xl text-center space-y-3">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-2xs">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h4 className="text-2xl font-extrabold text-[#0a3641]">
                    {registrationStatus === 'already_exists'
                      ? 'Inscrição Já Confirmada no Sistema!'
                      : 'Inscrição Confirmada com Sucesso!'}
                  </h4>
                  <p className="text-sm text-stone-600 max-w-md mx-auto">
                    Sua inscrição no <strong>{config.editionTitle}</strong> foi gravada e confirmada no banco de dados oficial. Apresente este comprovante no credenciamento em <strong>{config.eventDate}</strong> às 07h30.
                  </p>
                </div>
              )}

              {/* Printable Voucher Card */}
              <div id="comprovante-voucher" className="p-5 bg-white border border-stone-300 rounded-xl shadow-xs space-y-4">
                <div className="flex items-start justify-between border-b border-stone-200 pb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#d96522] font-bold">
                      Nº de Participante (Mesmo do Certificado)
                    </span>
                    <div className="text-2xl font-mono font-extrabold text-[#0a3641]">
                      {submittedVoucher.code}
                    </div>
                  </div>
                  <div className="text-right">
                    {isQueuedOffline || registrationStatus === 'pending_sync' ? (
                      <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                        Pendente de Sincronização
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                        Inscrição Confirmada
                      </span>
                    )}
                    <div className="text-xs text-stone-500 mt-1">Carangola - MG</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <span className="text-stone-500 block">Participante:</span>
                    <strong className="text-stone-900 text-sm break-words">{submittedVoucher.fullName}</strong>
                  </div>
                  <div>
                    <span className="text-stone-500 block">CPF:</span>
                    <strong className="font-mono text-stone-900">{submittedVoucher.cpf}</strong>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Função / Categoria:</span>
                    <span className="text-stone-900 break-words">{submittedVoucher.professionalRole}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Município:</span>
                    <span className="text-stone-900 font-semibold">{submittedVoucher.city}</span>
                  </div>
                  <div className="col-span-1 sm:col-span-2">
                    <span className="text-stone-500 block">Instituição / Lotação:</span>
                    <span className="text-stone-900 break-words">{submittedVoucher.institution}</span>
                  </div>
                  {submittedVoucher.susCareLevel && (
                    <div className="col-span-1 sm:col-span-2">
                      <span className="text-stone-500 block">Nível de Atenção / Vínculo:</span>
                      <span className="text-stone-800 font-medium break-words">{submittedVoucher.susCareLevel}</span>
                    </div>
                  )}
                  <div className="col-span-1 sm:col-span-2">
                    <span className="text-stone-500 block">Eixo Principal Escolhido:</span>
                    <span className="text-[#0a3641] font-medium break-words">{submittedVoucher.axisInterest}</span>
                  </div>

                  {/* Social media if available */}
                  {(submittedVoucher.instagram || submittedVoucher.linkedin) && (
                    <div className="col-span-1 sm:col-span-2 pt-2 border-t border-stone-100 flex flex-wrap items-center gap-3">
                      {submittedVoucher.instagram && (
                        <div className="flex items-center gap-1.5 text-xs text-stone-700">
                          <Instagram className="w-3.5 h-3.5 text-pink-600" />
                          <span className="font-medium font-mono">{submittedVoucher.instagram}</span>
                        </div>
                      )}
                      {submittedVoucher.linkedin && (
                        <div className="flex items-center gap-1.5 text-xs text-stone-700">
                          <Linkedin className="w-3.5 h-3.5 text-blue-700" />
                          <span className="font-medium truncate max-w-xs">{submittedVoucher.linkedin}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Rodapé do comprovante */}
                <div className="pt-3 border-t border-stone-200 flex items-center justify-end">
                  <div className="text-right text-[11px] font-mono text-stone-400">
                    SUS Carangola · 2026
                  </div>
                </div>
              </div>

              {/* Call-to-action cards: Calendar & Sharing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Adicionar ao Calendário (Requisito 3) */}
                <button
                  type="button"
                  onClick={onOpenCalendar}
                  className="p-3.5 rounded-xl border border-[#028090]/30 bg-[#e2f0f2]/40 hover:bg-[#e2f0f2] transition-colors flex items-center gap-3 text-left cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#028090] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#0a3641] group-hover:text-[#028090]">
                      Adicionar ao Calendário
                    </div>
                    <div className="text-[11px] text-stone-500">
                      Google, Apple ou Outlook
                    </div>
                  </div>
                </button>

                {/* Compartilhar Inscrição com a Equipe (Requisito 5) */}
                <button
                  type="button"
                  onClick={onOpenShare}
                  className="p-3.5 rounded-xl border border-[#ea7a38]/30 bg-[#faeee5]/50 hover:bg-[#faeee5] transition-colors flex items-center gap-3 text-left cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#ea7a38] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#0a3641] group-hover:text-[#ea7a38]">
                      Divulgar para Minha Equipe
                    </div>
                    <div className="text-[11px] text-stone-500">
                      Link direto e mensagem WhatsApp
                    </div>
                  </div>
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedVoucher(null);
                    setConfirmationEmailResult(null);
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-[#028090] bg-[#e2f0f2]/60 hover:bg-[#e2f0f2] rounded-xl transition-colors cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Inscrever Outro Participante</span>
                </button>

                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir Comprovante</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedVoucher(null);
                      onClose();
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-[#0a3641] hover:bg-[#0f4b59] rounded-xl transition-colors cursor-pointer"
                  >
                    <span>Concluir</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Registration Form */
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Submit Error Banner */}
              {submitError && (
                <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-800 text-xs flex items-start gap-3 animate-in fade-in duration-200">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold text-sm text-rose-900">Falha ao Confirmar Inscrição</div>
                    <div className="leading-relaxed">{submitError}</div>
                  </div>
                </div>
              )}

              {/* SECTION 1: DADOS PESSOAIS */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-[#0a3641] uppercase tracking-wider font-mono border-b pb-1 border-stone-200">
                  1. Dados Pessoais do Participante
                </div>

                {/* Nome Completo */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Amanda Silveira de Abreu"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3641]"
                  />
                  {errors.fullName && <p className="text-xs text-red-600 mt-1">{errors.fullName}</p>}
                </div>

                {/* CPF */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    CPF (Para Emissão do Certificado Oficial SUS de 8h) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={14}
                    placeholder="000.000.000-00"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3641]"
                  />
                  {errors.cpf && <p className="text-xs text-red-600 mt-1">{errors.cpf}</p>}
                </div>

                {/* E-mail and Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      E-mail Institucional ou Pessoal *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="seu.email@exemplo.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3641]"
                    />
                    {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      WhatsApp / Telefone com DDD *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={15}
                      placeholder="(32) 99999-9999"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3641]"
                    />
                    {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
                  </div>
                </div>
              </div>

              {/* SECTION 2: REDES SOCIAIS (Requisito 1) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b pb-1 border-stone-200">
                  <div className="text-xs font-bold text-[#0a3641] uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Instagram className="w-4 h-4 text-[#ea7a38]" />
                    <span>2. Redes Sociais & Contato Profissional</span>
                  </div>
                  <span className="text-[11px] text-stone-400 font-mono">Opcional</span>
                </div>
                <p className="text-xs text-stone-500">
                  Compartilhe suas redes para fortalecer a conexão entre profissionais da RAPS e palestrantes do simpósio:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Instagram */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Instagram className="w-3.5 h-3.5 text-pink-600" />
                      <span>Instagram</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="@seu.perfil"
                        value={formData.instagram}
                        onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3641]"
                      />
                    </div>
                  </div>

                  {/* LinkedIn, Currículo Lattes, Site ou Outra Rede Social (Campo Unificado) */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-[#028090]" />
                      <span>LinkedIn, Currículo Lattes, Site ou Outra Rede</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: linkedin.com/in/seunome, lattes.cnpq.br/... ou site"
                      value={formData.linkedin}
                      onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3641]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: ATUAÇÃO PROFISSIONAL & MÉTRICAS ESTRATÉGICAS (Requisito 2) */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold text-[#0a3641] uppercase tracking-wider font-mono border-b pb-1 border-stone-200 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-[#ea7a38]" />
                  <span>3. Atuação Profissional & Métricas da Microrregião</span>
                </div>

                {/* Município and Custom City */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Município de Atuação / Residência *
                    </label>
                    <select
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3641]"
                    >
                      <option value="">Selecione seu município...</option>
                      {REGIONAL_CITIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    {errors.city && <p className="text-xs text-red-600 mt-1">{errors.city}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Categoria Profissional / Ocupação *
                    </label>
                    <select
                      required
                      value={formData.professionalRole}
                      onChange={(e) => setFormData({ ...formData, professionalRole: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3641]"
                    >
                      <option value="">Selecione sua categoria profissional...</option>
                      {PROFESSIONAL_ROLES.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                    {errors.professionalRole && <p className="text-xs text-red-600 mt-1">{errors.professionalRole}</p>}
                  </div>

                  {(formData.city === 'Outros' || formData.city === 'Outro Município de MG') && (
                    <div className="sm:col-span-1">
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                        Especifique seu Município *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Muriaé, Manhuaçu, Belo Horizonte..."
                        value={formData.customCity}
                        onChange={(e) => setFormData({ ...formData, customCity: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3641]"
                      />
                      {errors.customCity && <p className="text-xs text-red-600 mt-1">{errors.customCity}</p>}
                    </div>
                  )}

                  {formData.professionalRole === 'Outros' && (
                    <div className={formData.city === 'Outros' || formData.city === 'Outro Município de MG' ? 'sm:col-span-1' : 'col-span-full'}>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                        Especifique sua Categoria Profissional / Ocupação *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Educador(a) Físico(a), Nutricionista, Sociólogo(a), Gestor(a)..."
                        value={formData.customRole}
                        onChange={(e) => setFormData({ ...formData, customRole: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3641]"
                      />
                      {errors.customRole && <p className="text-xs text-red-600 mt-1">{errors.customRole}</p>}
                    </div>
                  )}
                </div>

                {/* Vínculo / Nível de Atenção no SUS */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Nível de Atenção no SUS / Vínculo Institucional *
                  </label>
                  <select
                    required
                    value={formData.susCareLevel}
                    onChange={(e) => setFormData({ ...formData, susCareLevel: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3641]"
                  >
                    <option value="">Selecione o nível de atenção / vínculo...</option>
                    {SUS_CARE_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                  {errors.susCareLevel && <p className="text-xs text-red-600 mt-1">{errors.susCareLevel}</p>}
                </div>

                {/* Instituição / Lotação */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Instituição / Unidade de Lotação *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: CAPS I Carangola, UBS Central, Farmácia de Minas, Casa de Caridade, CRAS..."
                    value={formData.institution}
                    onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3641]"
                  />
                  {errors.institution && <p className="text-xs text-red-600 mt-1">{errors.institution}</p>}
                </div>

                {/* Faixa Etária e Escolaridade (Novos campos para gráficos) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Faixa Etária *
                    </label>
                    <select
                      required
                      value={formData.ageGroup}
                      onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3641]"
                    >
                      <option value="">Selecione sua faixa etária...</option>
                      {AGE_GROUPS.map((grp) => (
                        <option key={grp} value={grp}>{grp}</option>
                      ))}
                    </select>
                    {errors.ageGroup && <p className="text-xs text-red-600 mt-1">{errors.ageGroup}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Escolaridade / Nível de Formação *
                    </label>
                    <select
                      required
                      value={formData.educationLevel}
                      onChange={(e) => setFormData({ ...formData, educationLevel: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3641]"
                    >
                      <option value="">Selecione sua escolaridade...</option>
                      {EDUCATION_LEVELS.map((ed) => (
                        <option key={ed} value={ed}>{ed}</option>
                      ))}
                    </select>
                    {errors.educationLevel && <p className="text-xs text-red-600 mt-1">{errors.educationLevel}</p>}
                  </div>
                </div>

                {/* Como soube do Simpósio */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Como tomou conhecimento do Simpósio? *
                  </label>
                  <select
                    required
                    value={formData.referralSource}
                    onChange={(e) => setFormData({ ...formData, referralSource: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3641]"
                  >
                    <option value="">Selecione como soube do simpósio...</option>
                    {REFERRAL_SOURCES.map((src) => (
                      <option key={src} value={src}>{src}</option>
                    ))}
                  </select>
                  {errors.referralSource && <p className="text-xs text-red-600 mt-1">{errors.referralSource}</p>}
                </div>
              </div>

              {/* SECTION 4: EIXO TEMÁTICO & ACESSIBILIDADE */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold text-[#0a3641] uppercase tracking-wider font-mono border-b pb-1 border-stone-200">
                  4. Eixo de Interesse & Acessibilidade
                </div>

                {/* Eixo de Maior Interesse */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Eixo Temático de Maior Interesse *
                  </label>
                  <select
                    required
                    value={formData.axisInterest}
                    onChange={(e) => setFormData({ ...formData, axisInterest: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3641]"
                  >
                    <option value="">Selecione o eixo temático de interesse...</option>
                    <option value="Eixo 1: Fluxograma da RAPS">Eixo 1: Fluxograma da RAPS</option>
                    <option value="Eixo 2: Hospital Geral & Leitos de Retaguarda">Eixo 2: Hospital Geral & Leitos de Retaguarda</option>
                    <option value="Eixo 3: Judicialização & Cuidado em Liberdade">Eixo 3: Judicialização & Cuidado em Liberdade</option>
                    <option value="Todos os Eixos (Interesse Geral)">Todos os Eixos (Interesse Geral)</option>
                  </select>
                  {errors.axisInterest && <p className="text-xs text-red-600 mt-1">{errors.axisInterest}</p>}
                </div>

                {/* Acessibilidade */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Necessidade de Acessibilidade
                  </label>
                  <select
                    value={formData.accessibilityNeeds}
                    onChange={(e) => setFormData({ ...formData, accessibilityNeeds: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3641]"
                  >
                    <option value="">Selecione se houver necessidade (opcional)...</option>
                    <option value="Nenhuma">Nenhuma necessidade específica</option>
                    <option value="Intérprete de Libras">Intérprete de Libras</option>
                    <option value="Acesso para Cadeira de Rodas / Mobilidade">Acesso para Cadeira de Rodas / Mobilidade Reduzida</option>
                    <option value="Material em Fonte Ampliada">Material em Fonte Ampliada</option>
                    <option value="Outra necessidade">Outra necessidade (informar à organização)</option>
                  </select>
                </div>
              </div>

              {/* SECTION 5: ACEITE DE NOVIDADES POR E-MAIL E WHATSAPP (Requisito 4) */}
              <div className="p-4 bg-stone-50 border border-stone-200/90 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0a3641] uppercase tracking-wider font-mono">
                  <Bell className="w-4 h-4 text-[#ea7a38]" />
                  <span>Receba Novidades & Notificações Oficiais (E-mail & WhatsApp)</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Mantenha-se informado sobre novos boletins da RAPS, liberação de materiais e alertas de véspera. Seus dados abastecem o canal de comunicação dos gestores do SUS:
                </p>

                <div className="space-y-2 pt-1 text-xs text-stone-700">
                  {/* WhatsApp Opt-in */}
                  <label className="flex items-start gap-2.5 cursor-pointer select-none p-2 rounded-lg hover:bg-stone-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.notifyWhatsapp}
                      onChange={(e) => setFormData({ ...formData, notifyWhatsapp: e.target.checked })}
                      className="mt-0.5 w-4 h-4 rounded text-[#d96522] focus:ring-[#d96522] border-stone-300 cursor-pointer"
                    />
                    <span>
                      <strong className="text-[#0a3641]">WhatsApp:</strong> Aceito receber avisos urgentes, lembretes de véspera e novidades no número de WhatsApp informado.
                    </span>
                  </label>

                  {/* Email Opt-in */}
                  <label className="flex items-start gap-2.5 cursor-pointer select-none p-2 rounded-lg hover:bg-stone-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.notifyEmail}
                      onChange={(e) => setFormData({ ...formData, notifyEmail: e.target.checked })}
                      className="mt-0.5 w-4 h-4 rounded text-[#d96522] focus:ring-[#d96522] border-stone-300 cursor-pointer"
                    />
                    <span>
                      <strong className="text-[#0a3641]">E-mail / Newsletter:</strong> Aceito receber comunicados oficiais, apostilas técnicas, novidades e aviso de liberação do certificado por e-mail.
                    </span>
                  </label>
                </div>
              </div>

              <div className="pt-1 text-xs text-stone-500">
                Ao se inscrever, você declara a veracidade dos dados informados para fins de emissão do certificado oficial SUS de 8 horas e participação no simpósio.
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-4 border-t border-stone-200">
                {onOpenShare ? (
                  <button
                    type="button"
                    onClick={onOpenShare}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-600 hover:text-[#ea7a38] transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Divulgar Link da Inscrição</span>
                  </button>
                ) : <div />}

                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors cursor-pointer text-center"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`px-6 py-3 sm:py-2.5 text-xs sm:text-sm font-bold text-white rounded-xl shadow-sm transition-all text-center inline-flex items-center justify-center gap-2 ${
                      isSubmitting
                        ? 'bg-stone-400 cursor-not-allowed opacity-80'
                        : 'bg-[#d96522] hover:bg-[#c25516] active:scale-98 cursor-pointer'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Confirmando no Firestore...</span>
                      </>
                    ) : (
                      <span>Confirmar Inscrição Gratuita</span>
                    )}
                  </button>
                </div>
              </div>

            </form>
          )}
        </div>

        {/* Modal de Pré-visualização do E-mail de Confirmação com Programa e Código */}
        {isEmailPreviewOpen && submittedVoucher && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-stone-900/70 backdrop-blur-xs overflow-y-auto">
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-300 overflow-hidden my-4 max-h-[90vh] flex flex-col">
              <div className="px-4 sm:px-6 py-3.5 bg-[#0a3641] text-white flex items-center justify-between border-b-2 border-[#ea7a38] shrink-0">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#ea7a38]" />
                  <h3 className="text-xs sm:text-sm font-bold truncate">
                    E-mail Oficial de Confirmação de Inscrição
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEmailPreviewOpen(false)}
                  className="p-1 hover:bg-white/10 rounded-lg text-stone-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-4 sm:px-6 py-2.5 bg-stone-100 border-b border-stone-200 text-xs text-stone-600 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div>
                  <strong>Destinatário:</strong> {submittedVoucher.email}
                </div>
                <div>
                  <strong>Nº Participante:</strong> <span className="font-mono font-bold text-[#d96522]">{submittedVoucher.code}</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-[#f1f5f9]">
                <div
                  className="bg-white rounded-xl shadow-xs border border-stone-200 overflow-hidden"
                  dangerouslySetInnerHTML={{
                    __html: buildRegistrationConfirmationEmail(submittedVoucher, INITIAL_SCHEDULE, config).bodyHtml
                  }}
                />
              </div>

              <div className="p-3.5 bg-white border-t border-stone-200 flex items-center justify-between gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyEmailText}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
                >
                  {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-stone-500" />}
                  <span>{copiedEmail ? 'Texto Copiado!' : 'Copiar Texto Completo'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEmailPreviewOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0a3641] hover:bg-[#028090] transition-colors cursor-pointer"
                >
                  Fechar Visualização
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );

  if (isStandalone) {
    return (
      <div className="min-h-screen bg-[#faf8f5] py-4 sm:py-8 px-3 sm:px-6">
        {modalContent}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      {modalContent}
    </div>
  );
};
