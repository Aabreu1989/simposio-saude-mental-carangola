import React, { useState, useEffect } from 'react';
import {
  X,
  Award,
  Search,
  Printer,
  Download,
  Check,
  CheckCircle,
  ShieldAlert,
  Eye,
  RotateCcw,
  Loader2,
  Lock
} from 'lucide-react';
import { Registration, EventConfig } from '../types.ts';
import {
  isCertificateAvailableForPublic,
  CERTIFICATE_RELEASE_LABEL
} from '../utils/helpers.ts';
import { openCertificatePrintWindow, downloadCertificateHTML } from '../utils/certificatePdfGenerator.ts';
import { fetchCertificatePermissionByCode, CertificatePermissionRecord } from '../services/firebaseDb.ts';
import { CertificateSheet } from './CertificateSheet.tsx';
import html2pdf from 'html2pdf.js';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  registrations: Registration[];
  config: EventConfig;
  initialAttendee?: Registration | null;
  initialSearchCode?: string | null;
  allowManagerAccess?: boolean;
  onRecordDownload?: (attendee: Registration, method: 'pdf' | 'print') => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  registrations,
  config,
  initialAttendee = null,
  initialSearchCode = null,
  allowManagerAccess = false,
  onRecordDownload
}) => {
  const [query, setQuery] = useState('');
  const demoAttendee =
    registrations.find((r) => r.status === 'presente' && r.certificateIssued) ||
    registrations.find((r) => r.code === 'CAR-SM-001') ||
    registrations[0] ||
    null;
  const [foundAttendee, setFoundAttendee] = useState<Registration | null>(
    initialAttendee || demoAttendee
  );
  const [livePermission, setLivePermission] = useState<CertificatePermissionRecord | null>(null);
  const [isCheckingDbPermission, setIsCheckingDbPermission] = useState(false);
  const [searched, setSearched] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [actionStatus, setActionStatus] = useState<string>('');

  const performLookup = async (rawQuery: string) => {
    const trimmed = rawQuery.trim();
    if (!trimmed) return;
    setSearched(true);
    setLivePermission(null);
    const cleanQuery = trimmed.replace(/\D/g, '');
    const cleanSearchStr = trimmed.toLowerCase();

    const localAttendee = registrations.find((reg) => {
      const regCpfClean = (reg.cpf || '').replace(/\D/g, '');
      const regCodeMatch = reg.code.toLowerCase() === cleanSearchStr;
      const regCpfMatch = cleanQuery.length >= 6 && regCpfClean.includes(cleanQuery);
      const regNameMatch = reg.fullName.toLowerCase().includes(cleanSearchStr);
      return regCodeMatch || regCpfMatch || regNameMatch;
    });

    if (localAttendee) {
      setFoundAttendee(localAttendee);
      return;
    }

    // Busca cruzada entre dispositivos no Firestore por Número de Participante (código)
    const looksLikeParticipantCode = trimmed.length >= 3 && /^[a-zA-Z0-9_-]+$/.test(trimmed);
    if (looksLikeParticipantCode) {
      setIsCheckingDbPermission(true);
      try {
        const perm = await fetchCertificatePermissionByCode(trimmed);
        if (perm) {
          const remoteAttendee: Registration = {
            id: perm.registrationId || `remote-${perm.code}`,
            code: perm.code,
            fullName: perm.participantName || `Participante ${perm.code}`,
            cpf: 'VALIDADO',
            email: '',
            phone: '',
            city: perm.city || 'Carangola',
            professionalRole: perm.professionalRole || 'Participante SUS',
            institution: perm.institution || 'SUS Microrregião de Carangola',
            axisInterest: 'Todos os Eixos',
            accessibilityNeeds: 'Nenhuma',
            status: perm.status,
            registeredAt: perm.updatedAt || new Date().toISOString(),
            checkedInAt: perm.checkedInAt,
            certificateIssued: perm.certificateIssued,
            certificateDownloaded: perm.certificateDownloaded,
            certificateDownloadCount: perm.certificateDownloadCount
          };
          setLivePermission(perm);
          setFoundAttendee(remoteAttendee);
          return;
        }
      } catch {
        // fallback below
      } finally {
        setIsCheckingDbPermission(false);
      }
    }

    setFoundAttendee(null);
  };

  useEffect(() => {
    if (isOpen) {
      if (initialSearchCode) {
        setQuery(initialSearchCode);
        performLookup(initialSearchCode);
      } else if (initialAttendee) {
        setFoundAttendee(initialAttendee);
        setSearched(false);
        setQuery('');
      } else if (!foundAttendee && demoAttendee) {
        setFoundAttendee(demoAttendee);
      }
    }
  }, [isOpen, initialAttendee, initialSearchCode]);

  // Keep foundAttendee synchronized with latest registrations prop updates
  useEffect(() => {
    if (!foundAttendee) return;
    const updated = registrations.find(
      (r) => r.id === foundAttendee.id || r.code.toLowerCase() === foundAttendee.code.toLowerCase()
    );
    if (updated) {
      setFoundAttendee(updated);
    }
  }, [registrations]);

  // Check Firestore certificate_permissions/{code} for authoritative real-time presence & certificate permission
  useEffect(() => {
    let active = true;
    if (!isOpen || !foundAttendee?.code) {
      setLivePermission(null);
      return;
    }

    setIsCheckingDbPermission(true);
    fetchCertificatePermissionByCode(foundAttendee.code)
      .then((perm) => {
        if (active) {
          setLivePermission(perm);
        }
      })
      .catch(() => {
        if (active) setLivePermission(null);
      })
      .finally(() => {
        if (active) setIsCheckingDbPermission(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, foundAttendee?.code, foundAttendee?.status, foundAttendee?.certificateIssued]);

  const effectiveStatus = livePermission ? livePermission.status : foundAttendee?.status;
  const effectiveCertificateIssued = livePermission
    ? livePermission.certificateIssued
    : foundAttendee?.certificateIssued;

  // Regra estrita: Somente participantes credenciados ('presente') podem ter certificado liberado e impresso
  const isAccredited = effectiveStatus === 'presente';
  const certificateAvailableForPublic = isCertificateAvailableForPublic();
  const canDownloadNow = Boolean(
    foundAttendee &&
      isAccredited &&
      (allowManagerAccess || (certificateAvailableForPublic && Boolean(effectiveCertificateIssued)))
  );

  if (!isOpen) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performLookup(query);
  };

  const handlePrint = () => {
    if (!foundAttendee || !isAccredited || !canDownloadNow) return;
    setActionStatus('Preparando janela oficial de impressão do certificado...');
    const opened = openCertificatePrintWindow(foundAttendee, config);
    if (!opened) {
      window.print();
    }
    onRecordDownload?.(foundAttendee, 'print');
    setTimeout(() => setActionStatus(''), 5000);
  };

  const handleDownload = async () => {
    if (!foundAttendee || isGeneratingPdf || !isAccredited || !canDownloadNow) return;

    const certElement = document.getElementById('certificado-oficial-impressao');
    if (!certElement) {
      downloadCertificateHTML(foundAttendee, config);
      onRecordDownload?.(foundAttendee, 'pdf');
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 4000);
      return;
    }

    try {
      setIsGeneratingPdf(true);
      setActionStatus('Renderizando certificado em arquivo PDF de alta definição...');

      const cleanName = foundAttendee.fullName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_');

      const filename = `certificado_sus_${cleanName}_${foundAttendee.code}.pdf`;

      const options = {
        margin: [0, 0, 0, 0],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true,
          backgroundColor: config.certificateDesign?.backgroundColor || '#ffffff',
          scrollY: 0,
          scrollX: 0,
          windowWidth: 1122, // 297mm @ 96 DPI
          windowHeight: 794  // 210mm @ 96 DPI
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'landscape'
        },
        pagebreak: { mode: ['avoid-all', 'css'] }
      };

      const html2pdfLib = (html2pdf as any).default || html2pdf;
      await html2pdfLib().set(options).from(certElement).save();

      onRecordDownload?.(foundAttendee, 'pdf');
      setDownloaded(true);
      setActionStatus(`Certificado PDF (${filename}) exportado com sucesso!`);
      setTimeout(() => {
        setDownloaded(false);
        setActionStatus('');
      }, 5000);
    } catch (err) {
      console.warn('html2pdf falhou, utilizando gerador oficial de contingência:', err);
      downloadCertificateHTML(foundAttendee, config);
      onRecordDownload?.(foundAttendee, 'pdf');
      setDownloaded(true);
      setActionStatus('Arquivo oficial do certificado baixado com sucesso!');
      setTimeout(() => {
        setDownloaded(false);
        setActionStatus('');
      }, 4000);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleLoadDemo = () => {
    if (demoAttendee) {
      setFoundAttendee(demoAttendee);
      setSearched(false);
      setQuery('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <style>{`
        @media print {
          @page {
            size: A4 landscape !important;
            margin: 0 !important;
          }
          html, body {
            width: 297mm !important;
            height: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            overflow: hidden !important;
          }
          body * {
            visibility: hidden !important;
          }
          #certificado-oficial-impressao,
          #certificado-oficial-impressao * {
            visibility: visible !important;
          }
          #certificado-oficial-impressao {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 297mm !important;
            height: 210mm !important;
            max-width: 297mm !important;
            max-height: 210mm !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      <div className="relative w-full max-w-5xl bg-[#faf8f5] rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-3 sm:my-6">
        {/* Modal Toolbar (no-print) */}
        <div className="no-print px-5 py-3.5 sm:px-6 sm:py-4 bg-[#0a3641] text-white flex items-center justify-between border-b border-[#0f4b59]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ea7a38] to-[#028090] p-[2px] flex items-center justify-center shadow-sm">
              <div className="w-full h-full bg-[#0a3641] rounded-[9px] flex items-center justify-center">
                <Award className="w-5 h-5 text-[#ea7a38]" />
              </div>
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold leading-tight tracking-tight">
                {allowManagerAccess
                  ? 'Pré-visualização e Emissão do Gestor · Certificado SUS'
                  : 'Certificado Oficial de Participação'}
              </h3>
              <p className="text-[11px] sm:text-xs text-stone-300">
                {config.editionTitle} {config.regionTitle} · SUS/MG
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 sm:p-6 max-h-[88vh] overflow-y-auto">
          {/* Search & Actions Bar (no-print) */}
          <div className="no-print mb-5 bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/90 shadow-xs">
            <form onSubmit={handleSearch} className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#0a3641] uppercase tracking-wider font-mono">
                  Buscar Participante Credenciado:
                </label>
                <button
                  type="button"
                  onClick={handleLoadDemo}
                  className="text-xs font-bold text-[#028090] hover:text-[#0a3641] hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver Modelo Credenciado (Amanda Silveira)</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Digite seu Nº de Participante (ex: CAR-SM-001), CPF ou Nome"
                    className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0a3641] focus:bg-white transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isCheckingDbPermission}
                  className="w-full sm:w-auto px-6 py-2.5 text-xs font-extrabold text-white bg-[#0a3641] hover:bg-[#0f4b59] active:scale-[0.99] rounded-xl transition-all cursor-pointer text-center justify-center whitespace-nowrap shadow-sm disabled:opacity-70"
                >
                  {isCheckingDbPermission ? 'Consultando...' : 'Localizar Certificado'}
                </button>
              </div>
            </form>

            <div className="mt-2.5 pt-2.5 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-stone-700">Regra de Emissão:</span>
                <span>
                  Liberado exclusivamente para inscritos com status{' '}
                  <strong className="text-emerald-700">Credenciado (Presente)</strong>.
                </span>
              </div>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                {isCheckingDbPermission ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verificando banco de dados...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" /> Autenticação Digital ICP-SUS
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Not Found Screen (no-print) */}
          {searched && !foundAttendee && (
            <div className="no-print p-8 text-center bg-white rounded-2xl border border-dashed border-stone-300 space-y-3 mb-6">
              <ShieldAlert className="w-10 h-10 text-amber-600 mx-auto" />
              <h4 className="text-base font-bold text-stone-800">
                Nenhum certificado localizado para "{query}"
              </h4>
              <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
                Verifique se os dígitos do CPF ou o código de inscrição foram preenchidos
                corretamente. Você também pode clicar no botão{' '}
                <strong>"Ver Modelo Credenciado"</strong> acima para visualizar o certificado.
              </p>
              <button
                type="button"
                onClick={handleLoadDemo}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-[#0a3641] bg-[#e2f0f2] hover:bg-[#d0e8eb] rounded-xl transition-colors cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Carregar Modelo de Exemplo</span>
              </button>
            </div>
          )}

          {/* Found Attendee Certificate */}
          {foundAttendee && (
            <div className="space-y-5">
              {/* Action Toolbar (no-print) */}
              {!isAccredited ? (
                <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl">
                  <div className="flex items-start sm:items-center gap-3 text-xs text-rose-950 font-medium">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-300 flex items-center justify-center shrink-0">
                      <Lock className="w-5 h-5 text-rose-700" />
                    </div>
                    <div>
                      <span className="font-extrabold text-sm block text-rose-950">
                        Certificado Bloqueado · Participante ainda não Credenciado
                      </span>
                      <span className="text-rose-800 leading-relaxed block mt-0.5">
                        O registro de <strong>{foundAttendee.fullName}</strong> ({foundAttendee.code}) consta atualmente como{' '}
                        <strong>
                          {effectiveStatus === 'cancelada'
                            ? 'Cancelada'
                            : 'Fazer Check-in (Pendente)'}
                        </strong>
                        . Somente participantes marcados como{' '}
                        <strong>Credenciado (Presente)</strong> têm acesso liberado para imprimir ou baixar o certificado.
                      </span>
                    </div>
                  </div>
                  <div className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-rose-800 bg-rose-100 border border-rose-300 rounded-xl shrink-0 cursor-not-allowed">
                    <Lock className="w-4 h-4" />
                    <span>Impressão Bloqueada</span>
                  </div>
                </div>
              ) : canDownloadNow ? (
                <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-emerald-50/90 border border-emerald-200/90 rounded-2xl">
                  <div className="flex items-center gap-2.5 text-xs text-emerald-950 font-medium">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-sm block text-emerald-950">
                        {allowManagerAccess && !certificateAvailableForPublic
                          ? 'Credenciado (Presente) · Emissão do Gestor Liberada'
                          : 'Certificado Autenticado · Participante Credenciado'}
                      </span>
                      <span className="text-emerald-800">
                        Emitido para <strong>{foundAttendee.fullName}</strong> (
                        {foundAttendee.code}) · Carga Horária: {config.certificateWorkload}h ·{' '}
                        {config.locationName}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-extrabold text-white bg-gradient-to-r from-[#0a3641] via-[#028090] to-[#0a3641] hover:brightness-110 active:scale-[0.98] rounded-xl shadow-md transition-all cursor-pointer text-center"
                      title="Imprimir ou salvar em PDF em alta resolução"
                    >
                      <Printer className="w-4 h-4 text-[#ea7a38]" />
                      <span>Imprimir / Salvar PDF Oficial</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownload}
                      disabled={isGeneratingPdf}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-extrabold text-[#0a3641] bg-white hover:bg-stone-50 border border-stone-300 rounded-xl shadow-xs transition-all cursor-pointer text-center disabled:opacity-60"
                      title="Baixar layout atual do certificado diretamente em arquivo PDF"
                    >
                      {isGeneratingPdf ? (
                        <>
                          <Loader2 className="w-4 h-4 text-[#ea7a38] animate-spin" />
                          <span>Gerando PDF...</span>
                        </>
                      ) : downloaded ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>PDF Baixado!</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 text-[#ea7a38]" />
                          <span>Baixar Certificado (PDF)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : !certificateAvailableForPublic ? (
                <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-50 border border-amber-300 rounded-2xl">
                  <div className="flex items-start sm:items-center gap-3 text-xs text-amber-950 font-medium">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
                      <Lock className="w-4 h-4 text-amber-700" />
                    </div>
                    <div>
                      <span className="font-bold text-sm block text-amber-950">
                        Download do Certificado Bloqueado até o Término do Evento
                      </span>
                      <span className="text-amber-800">
                        Presença confirmada! Por norma do evento, o download público estará disponível após o encerramento em{' '}
                        <strong>{CERTIFICATE_RELEASE_LABEL}</strong>.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-stone-500 bg-stone-200 border border-stone-300 rounded-xl cursor-not-allowed shrink-0"
                  >
                    <Lock className="w-4 h-4 text-stone-400" />
                    <span>Disponível após {CERTIFICATE_RELEASE_LABEL}</span>
                  </button>
                </div>
              ) : (
                <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl">
                  <div className="flex items-start sm:items-center gap-3 text-xs text-rose-950 font-medium">
                    <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                    <div>
                      <span className="font-bold text-sm block text-rose-950">
                        Certificado Pendente de Liberação pelo Gestor
                      </span>
                      <span className="text-rose-800">
                        O registro de <strong>{foundAttendee.fullName}</strong> (
                        {foundAttendee.code}) possui presença registrada, mas a emissão ainda não foi autorizada pela organização.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {actionStatus && (
                <div className="no-print p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs font-semibold text-teal-900 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>{actionStatus}</span>
                </div>
              )}

              {/* Shared Live Certificate Sheet — blocked from printing if participant is not accredited */}
              {isAccredited ? (
                <CertificateSheet
                  attendee={foundAttendee}
                  config={config}
                  id="certificado-oficial-impressao"
                />
              ) : (
                <div className="no-print relative rounded-2xl overflow-hidden border border-rose-200 bg-white">
                  <div className="pointer-events-none select-none blur-[4px] opacity-40">
                    <CertificateSheet
                      attendee={foundAttendee}
                      config={config}
                      id="certificado-bloqueado-preview"
                    />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center p-6 bg-stone-900/20 backdrop-blur-[1px]">
                    <div className="max-w-md bg-white/95 border-2 border-rose-300 rounded-2xl p-6 text-center shadow-xl space-y-2.5">
                      <div className="w-12 h-12 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center mx-auto">
                        <Lock className="w-6 h-6 text-rose-600" />
                      </div>
                      <h4 className="text-base font-extrabold text-[#0a3641]">
                        Emissão e Impressão Bloqueadas
                      </h4>
                      <p className="text-xs text-stone-600 leading-relaxed">
                        <strong>{foundAttendee.fullName}</strong> ({foundAttendee.code}) está com o status{' '}
                        <span className="font-bold text-amber-700">
                          {effectiveStatus === 'cancelada'
                            ? 'Cancelada'
                            : 'Fazer Check-in'}
                        </span>
                        . A liberação e impressão do certificado só ocorrem após a confirmação do status{' '}
                        <strong className="text-emerald-700">Credenciado (Presente)</strong> no Painel do Gestor.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Helpers (no-print) */}
              <div className="no-print flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500 pt-2">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-stone-400" />
                  <span>
                    {isAccredited
                      ? 'Dica: Use o botão acima para imprimir ou baixar em folha A4 no formato paisagem (landscape).'
                      : 'Para liberar este certificado, altere Status & Presença para Credenciado (Presente) na aba Inscritos.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFoundAttendee(null);
                    setSearched(false);
                    setQuery('');
                  }}
                  className="text-stone-600 hover:text-[#0a3641] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Consultar outro participante</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
