import React, { useState, useMemo } from 'react';
import {
  Award,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Lock,
  Unlock,
  Palette,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
  Eye,
  Clock,
  Users,
  FileText,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import {
  Registration,
  EventConfig,
  CertificateDownloadRecord,
  CertificateDesignConfig
} from '../types.ts';
import { INITIAL_CERTIFICATE_DESIGN } from '../data/initialData.ts';
import {
  exportToCSV,
  exportToExcel,
  generatePrintablePDFReport,
  getCertificateDesign,
  isCertificateAvailableForPublic,
  CERTIFICATE_RELEASE_LABEL
} from '../utils/helpers.ts';
import { CertificateSheet } from './CertificateSheet.tsx';

interface AdminCertificateManagerProps {
  config: EventConfig;
  onUpdateConfig: (newConfig: EventConfig) => void;
  registrations: Registration[];
  certificateDownloads: CertificateDownloadRecord[];
  onToggleCertificateIssued: (regId: string) => void;
  onReleaseAllPresentCertificates: () => number;
  onPreviewCertificate: (attendee: Registration) => void;
}

const DESIGN_PRESETS: Array<{
  id: string;
  name: string;
  description: string;
  values: Partial<CertificateDesignConfig>;
}> = [
  {
    id: 'sus_carangola',
    name: 'SUS Carangola Padrão',
    description: 'Azul petróleo, laranja acolhedor e turquesa RAPS',
    values: {
      primaryColor: '#0a3641',
      accentColor: '#ea7a38',
      secondaryColor: '#028090',
      backgroundColor: '#faf8f5',
      borderStyle: 'double',
      layoutTheme: 'raps_waves',
      fontFamily: 'sans'
    }
  },
  {
    id: 'saude_esmeralda',
    name: 'Saúde Pública Esmeralda',
    description: 'Verde institucional SUS com detalhes em âmbar',
    values: {
      primaryColor: '#064e3b',
      accentColor: '#d97706',
      secondaryColor: '#0d9488',
      backgroundColor: '#f8faf8',
      borderStyle: 'double',
      layoutTheme: 'raps_waves',
      fontFamily: 'sans'
    }
  },
  {
    id: 'classico_solene',
    name: 'Clássico Solene',
    description: 'Tipografia serifada editorial e moldura formal',
    values: {
      primaryColor: '#1e293b',
      accentColor: '#b45309',
      secondaryColor: '#334155',
      backgroundColor: '#fcfbf7',
      borderStyle: 'classic',
      layoutTheme: 'institutional_classic',
      fontFamily: 'serif'
    }
  },
  {
    id: 'azul_minimal',
    name: 'Moderno Minimalista',
    description: 'Visual limpo de alto contraste para impressão econômica',
    values: {
      primaryColor: '#0f172a',
      accentColor: '#0284c7',
      secondaryColor: '#0369a1',
      backgroundColor: '#ffffff',
      borderStyle: 'minimal',
      layoutTheme: 'modern_clean',
      fontFamily: 'sans'
    }
  }
];

export const AdminCertificateManager: React.FC<AdminCertificateManagerProps> = ({
  config,
  onUpdateConfig,
  registrations,
  certificateDownloads,
  onToggleCertificateIssued,
  onReleaseAllPresentCertificates,
  onPreviewCertificate
}) => {
  const [subView, setSubView] = useState<'tracking' | 'design'>('tracking');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'downloaded' | 'issued_not_downloaded' | 'pending'>('all');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Design Editor State
  const [draftDesign, setDraftDesign] = useState<CertificateDesignConfig>(() => getCertificateDesign(config));
  const [designSaved, setDesignSaved] = useState(false);
  const [previewAttendeeId, setPreviewAttendeeId] = useState<string>(
    registrations.find((r) => r.code === 'CAR-SM-001')?.id || registrations[0]?.id || ''
  );

  const publicAvailable = isCertificateAvailableForPublic();

  // Compute download stats per registration combining Registration fields + certificateDownloads log
  const downloadSummary = useMemo(() => {
    const byRegId = new Map<
      string,
      { count: number; lastAt?: string; lastMethod?: 'pdf' | 'print' }
    >();

    certificateDownloads.forEach((rec) => {
      const prev = byRegId.get(rec.registrationId);
      if (!prev) {
        byRegId.set(rec.registrationId, {
          count: 1,
          lastAt: rec.downloadedAt,
          lastMethod: rec.method
        });
      } else {
        const isNewer = new Date(rec.downloadedAt).getTime() >= new Date(prev.lastAt || 0).getTime();
        byRegId.set(rec.registrationId, {
          count: prev.count + 1,
          lastAt: isNewer ? rec.downloadedAt : prev.lastAt,
          lastMethod: isNewer ? rec.method : prev.lastMethod
        });
      }
    });

    let uniqueDownloaders = 0;
    let totalDownloadEvents = 0;
    let issuedCount = 0;
    let issuedNotDownloaded = 0;

    registrations.forEach((reg) => {
      const logEntry = byRegId.get(reg.id);
      const count = Math.max(reg.certificateDownloadCount || 0, logEntry?.count || 0);
      const hasDownloaded = Boolean(reg.certificateDownloaded || count > 0);
      const isEligibleIssued = reg.status === 'presente' && Boolean(reg.certificateIssued);
      if (isEligibleIssued) issuedCount += 1;
      if (hasDownloaded) {
        uniqueDownloaders += 1;
        totalDownloadEvents += count;
      } else if (isEligibleIssued) {
        issuedNotDownloaded += 1;
      }
    });

    return {
      byRegId,
      uniqueDownloaders,
      totalDownloadEvents,
      issuedCount,
      issuedNotDownloaded
    };
  }, [registrations, certificateDownloads]);

  const filteredRegistrations = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const cleanCpf = q.replace(/\D/g, '');

    return registrations.filter((reg) => {
      const logInfo = downloadSummary.byRegId.get(reg.id);
      const count = Math.max(reg.certificateDownloadCount || 0, logInfo?.count || 0);
      const hasDownloaded = Boolean(reg.certificateDownloaded || count > 0);
      const isEligibleIssued = reg.status === 'presente' && Boolean(reg.certificateIssued);

      if (statusFilter === 'downloaded' && !hasDownloaded) return false;
      if (statusFilter === 'issued_not_downloaded' && !(isEligibleIssued && !hasDownloaded)) return false;
      if (statusFilter === 'pending' && isEligibleIssued) return false;

      if (!q) return true;
      return (
        reg.fullName.toLowerCase().includes(q) ||
        reg.code.toLowerCase().includes(q) ||
        reg.city.toLowerCase().includes(q) ||
        reg.professionalRole.toLowerCase().includes(q) ||
        (cleanCpf.length >= 3 && reg.cpf.replace(/\D/g, '').includes(cleanCpf))
      );
    });
  }, [registrations, searchTerm, statusFilter, downloadSummary]);

  const downloadersList = useMemo(() => {
    return registrations
      .map((reg) => {
        const logInfo = downloadSummary.byRegId.get(reg.id);
        const count = Math.max(reg.certificateDownloadCount || 0, logInfo?.count || 0);
        const lastAt = logInfo?.lastAt || reg.certificateDownloadedAt;
        return {
          reg,
          hasDownloaded: Boolean(reg.certificateDownloaded || count > 0),
          count,
          lastAt,
          lastMethod: logInfo?.lastMethod || 'pdf'
        };
      })
      .filter((item) => item.hasDownloaded)
      .sort((a, b) => new Date(b.lastAt || 0).getTime() - new Date(a.lastAt || 0).getTime());
  }, [registrations, downloadSummary]);

  const showTempNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4500);
  };

  const handleReleaseAllPresent = () => {
    const updatedCount = onReleaseAllPresentCertificates();
    if (updatedCount > 0) {
      showTempNotice(`${updatedCount} certificado(s) liberado(s) para participantes credenciados.`);
    } else {
      showTempNotice('Todos os participantes credenciados já possuem certificado liberado.');
    }
  };

  const handleExportDownloadersExcel = () => {
    const rows = downloadersList.map((item, idx) => ({
      '#': idx + 1,
      Nome_Completo: item.reg.fullName,
      Codigo: item.reg.code,
      CPF: item.reg.cpf,
      Municipio: item.reg.city,
      Funcao: item.reg.professionalRole,
      Instituicao: item.reg.institution,
      Quantidade_Downloads: item.count,
      Ultimo_Download: item.lastAt ? new Date(item.lastAt).toLocaleString('pt-BR') : '-',
      Formato: item.lastMethod === 'print' ? 'Impressão / PDF' : 'PDF Direto'
    }));

    if (rows.length === 0) {
      showTempNotice('Ainda não há registros de download de certificados para exportar.');
      return;
    }

    exportToExcel(
      `certificados_baixados_carangola_${new Date().toISOString().split('T')[0]}`,
      'Downloads Certificados',
      rows
    );
  };

  const handleExportDownloadersCSV = () => {
    const rows = downloadersList.map((item, idx) => ({
      Ordem: idx + 1,
      Nome: item.reg.fullName,
      Codigo: item.reg.code,
      CPF: item.reg.cpf,
      Municipio: item.reg.city,
      Categoria: item.reg.professionalRole,
      Downloads: item.count,
      Data_Ultimo_Download: item.lastAt ? new Date(item.lastAt).toLocaleString('pt-BR') : '-'
    }));

    if (rows.length === 0) {
      showTempNotice('Ainda não há registros de download de certificados para exportar.');
      return;
    }

    exportToCSV(`certificados_baixados_${new Date().toISOString().split('T')[0]}`, rows);
  };

  const handleExportDownloadersPDF = () => {
    generatePrintablePDFReport({
      title: 'Relatório Oficial de Emissão e Downloads de Certificados',
      subtitle: `${config.editionTitle} ${config.regionTitle} · Controle SUS`,
      categoryBadge: 'Auditoria de Certificação',
      summaryStats: [
        { label: 'Pessoas que Baixaram', value: downloadSummary.uniqueDownloaders },
        { label: 'Total de Downloads', value: downloadSummary.totalDownloadEvents },
        { label: 'Certificados Liberados', value: downloadSummary.issuedCount },
        { label: 'Aguardando Download', value: downloadSummary.issuedNotDownloaded }
      ],
      tables: [
        {
          title: 'Relação Nominal de Participantes que Baixaram o Certificado',
          headers: ['Nome Completo', 'Código', 'Município', 'Função', 'Qtd.', 'Último Download'],
          rows:
            downloadersList.length > 0
              ? downloadersList.map((item) => [
                  item.reg.fullName,
                  item.reg.code,
                  item.reg.city,
                  item.reg.professionalRole,
                  item.count,
                  item.lastAt ? new Date(item.lastAt).toLocaleString('pt-BR') : '-'
                ])
              : [['Nenhum download registrado até o momento', '-', '-', '-', 0, '-']]
        }
      ],
      notes: 'Relatório emitido pelo Painel de Gestão do SUS Microrregião de Carangola.'
    });
  };

  const handleSaveDesign = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      ...config,
      certificateDesign: draftDesign
    });
    setDesignSaved(true);
    setTimeout(() => setDesignSaved(false), 3500);
  };

  const handleResetDesign = () => {
    const reset = { ...INITIAL_CERTIFICATE_DESIGN };
    setDraftDesign(reset);
    onUpdateConfig({
      ...config,
      certificateDesign: reset
    });
    showTempNotice('Design padrão do certificado restaurado com sucesso.');
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      showTempNotice('A imagem deve ter no máximo 3 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setDraftDesign((prev) => ({
          ...prev,
          showBannerImage: true,
          bannerImageUrl: reader.result as string
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const insertToken = (token: string) => {
    setDraftDesign((prev) => ({
      ...prev,
      bodyTemplate: `${prev.bodyTemplate} ${token}`.trim()
    }));
  };

  const previewAttendee: Registration = useMemo(() => {
    return (
      registrations.find((r) => r.id === previewAttendeeId) ||
      registrations[0] || {
        id: 'preview',
        code: 'CAR-SM-001',
        fullName: 'Amanda Silveira Abreu',
        cpf: '102.345.678-90',
        email: 'participante@sus.mg.gov.br',
        phone: '(32) 99999-0000',
        city: 'Carangola',
        professionalRole: 'Psicólogo(a)',
        institution: 'CAPS I Carangola',
        axisInterest: 'Eixo 1',
        status: 'presente',
        registeredAt: new Date().toISOString(),
        certificateIssued: true
      }
    );
  }, [registrations, previewAttendeeId]);

  const downloadRate =
    downloadSummary.issuedCount > 0
      ? Math.round((downloadSummary.uniqueDownloaders / downloadSummary.issuedCount) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header + Sub-navigation */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
            <span>Gestão de Certificação</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{config.certificateWorkload}h Oficiais</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-[#0a3641] flex items-center gap-2">
            <Award className="w-5 h-5 text-[#ea7a38]" />
            <span>Gestão de Certificados & Editor de Design</span>
          </h3>
          <p className="text-xs text-stone-600 mt-0.5">
            Acompanhe quantas pessoas baixaram, consulte a lista nominal de quem emitiu e personalize o layout oficial do certificado.
          </p>
        </div>

        {/* Segmented Sub-view Switch */}
        <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl border border-stone-200 shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setSubView('tracking')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              subView === 'tracking'
                ? 'bg-[#0a3641] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Emissões & Quem Baixou</span>
          </button>
          <button
            type="button"
            onClick={() => setSubView('design')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              subView === 'design'
                ? 'bg-[#ea7a38] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Design do Certificado</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* SUBVIEW 1: TRACKING & MANAGEMENT */}
      {subView === 'tracking' && (
        <div className="space-y-6">
          {/* 4 KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-stone-200 p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span className="font-semibold">Pessoas que Baixaram</span>
                <Download className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-[#0a3641] font-mono tabular-nums">
                  {downloadSummary.uniqueDownloaders}
                </span>
                <span className="text-xs font-mono text-emerald-700 font-bold">
                  ({downloadRate}% dos aptos)
                </span>
              </div>
              <div className="mt-1.5 text-[11px] text-stone-500 font-mono tabular-nums">
                {downloadSummary.totalDownloadEvents} download(s) realizados no total
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span className="font-semibold">Certificados Liberados</span>
                <ShieldCheck className="w-4 h-4 text-[#028090]" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-[#0a3641] font-mono tabular-nums">
                  {downloadSummary.issuedCount}
                </span>
                <span className="text-xs text-stone-500 font-mono">
                  de {registrations.length} inscritos
                </span>
              </div>
              <div className="mt-1.5 text-[11px] text-stone-500">
                Aptos por credenciamento ou liberação manual
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span className="font-semibold">Aptos sem Download</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-[#0a3641] font-mono tabular-nums">
                  {downloadSummary.issuedNotDownloaded}
                </span>
                <span className="text-xs text-stone-500">participantes</span>
              </div>
              <div className="mt-1.5 text-[11px] text-stone-500">
                Com presença validada, aguardando emissão
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span className="font-semibold">Janela para o Público</span>
                {publicAvailable ? (
                  <Unlock className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Lock className="w-4 h-4 text-amber-600" />
                )}
              </div>
              <div className="mt-2">
                <span className={`text-sm font-extrabold ${publicAvailable ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {publicAvailable ? 'Liberado ao Público' : 'Bloqueado até o Término'}
                </span>
              </div>
              <div className="mt-1.5 text-[11px] text-stone-500">
                Liberação pública: {CERTIFICATE_RELEASE_LABEL}
              </div>
            </div>
          </div>

          {/* Nominal List of People Who Downloaded + Export Actions */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-stone-100 pb-4">
              <div>
                <h4 className="text-base font-bold text-[#0a3641] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#ea7a38]" />
                  <span>Pessoas que Baixaram o Certificado ({downloadSummary.uniqueDownloaders})</span>
                </h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  Relação nominal com data, horário e formato de cada participante que já emitiu o certificado.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportDownloadersExcel}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel (.xls)</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportDownloadersCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportDownloadersPDF}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#0a3641] hover:bg-[#0f4b59] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Printer className="w-3.5 h-3.5 text-[#ea7a38]" />
                  <span>Relatório PDF</span>
                </button>
              </div>
            </div>

            {downloadersList.length === 0 ? (
              <div className="p-6 text-center bg-stone-50 rounded-xl border border-dashed border-stone-300 space-y-2">
                <Download className="w-7 h-7 text-stone-400 mx-auto" />
                <div className="text-sm font-bold text-stone-700">
                  Nenhum download registrado até o momento
                </div>
                <p className="text-xs text-stone-500 max-w-lg mx-auto">
                  Assim que os participantes acessarem e baixarem seus certificados após o encerramento do evento ({CERTIFICATE_RELEASE_LABEL}) — ou quando você realizar um download de teste abaixo — os nomes, horários e contadores aparecerão aqui automaticamente.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-500 uppercase font-mono text-[10px]">
                      <th className="py-2.5 px-3">Nome Completo</th>
                      <th className="py-2.5 px-3">Código / CPF</th>
                      <th className="py-2.5 px-3">Município</th>
                      <th className="py-2.5 px-3">Função</th>
                      <th className="py-2.5 px-3 text-right">Downloads</th>
                      <th className="py-2.5 px-3">Último Download</th>
                      <th className="py-2.5 px-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {downloadersList.map(({ reg, count, lastAt, lastMethod }) => (
                      <tr key={reg.id} className="hover:bg-stone-50 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-[#0a3641]">{reg.fullName}</td>
                        <td className="py-2.5 px-3 font-mono text-stone-600">
                          {reg.code} · {reg.cpf}
                        </td>
                        <td className="py-2.5 px-3 text-stone-700">{reg.city}</td>
                        <td className="py-2.5 px-3 text-stone-600">{reg.professionalRole}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 tabular-nums">
                          {count}x
                        </td>
                        <td className="py-2.5 px-3 font-mono text-stone-600 tabular-nums">
                          {lastAt ? new Date(lastAt).toLocaleString('pt-BR') : '-'} ({lastMethod === 'print' ? 'Impressão' : 'PDF'})
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => onPreviewCertificate(reg)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-[#0a3641] bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Abrir</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* All Participants Certificate Control Table */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-bold text-[#0a3641]">
                  Controle Individual de Certificados ({registrations.length} inscritos)
                </h4>
                <p className="text-xs text-stone-500">
                  Autorize, revogue ou emita em modo gestor o certificado de qualquer participante.
                </p>
              </div>

              <button
                type="button"
                onClick={handleReleaseAllPresent}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 rounded-xl transition-colors cursor-pointer whitespace-nowrap self-start lg:self-auto"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Liberar Certificados para Todos os Presentes</span>
              </button>
            </div>

            {/* Search & Filter Row */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between pt-2 border-t border-stone-100">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nome, CPF, código ou município..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0a3641]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-100 rounded-xl border border-stone-200">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    statusFilter === 'all' ? 'bg-white text-[#0a3641] shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Todos ({registrations.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('downloaded')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    statusFilter === 'downloaded' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Já Baixaram ({downloadSummary.uniqueDownloaders})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('issued_not_downloaded')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    statusFilter === 'issued_not_downloaded' ? 'bg-white text-[#028090] shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Aptos sem Download ({downloadSummary.issuedNotDownloaded})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('pending')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    statusFilter === 'pending' ? 'bg-white text-amber-700 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Não Liberados ({registrations.length - downloadSummary.issuedCount})
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 uppercase font-mono text-[10px]">
                    <th className="py-2.5 px-3">Participante</th>
                    <th className="py-2.5 px-3">Código / CPF</th>
                    <th className="py-2.5 px-3">Município</th>
                    <th className="py-2.5 px-3">Status Certificado</th>
                    <th className="py-2.5 px-3 text-right">Downloads</th>
                    <th className="py-2.5 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredRegistrations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-stone-500">
                        Nenhum participante encontrado para este filtro.
                      </td>
                    </tr>
                  ) : (
                    filteredRegistrations.map((reg) => {
                      const logInfo = downloadSummary.byRegId.get(reg.id);
                      const dlCount = Math.max(reg.certificateDownloadCount || 0, logInfo?.count || 0);
                      const lastAt = logInfo?.lastAt || reg.certificateDownloadedAt;
                      const hasDownloaded = Boolean(reg.certificateDownloaded || dlCount > 0);
                      const isPresent = reg.status === 'presente';
                      const isIssuedAndPresent = isPresent && Boolean(reg.certificateIssued);

                      return (
                        <tr key={reg.id} className="hover:bg-stone-50 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-[#0a3641]">{reg.fullName}</div>
                            <div className="text-[11px] text-stone-500">
                              {reg.professionalRole} · {reg.institution}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-stone-600">
                            <div className="font-bold text-stone-800">{reg.code}</div>
                            <div className="text-[11px]">{reg.cpf}</div>
                          </td>
                          <td className="py-2.5 px-3 text-stone-700">{reg.city}</td>
                          <td className="py-2.5 px-3">
                            {isIssuedAndPresent ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                                <CheckCircle2 className="w-3 h-3" />
                                Liberado (Credenciado)
                              </span>
                            ) : isPresent ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px]">
                                Presente · Aguardando liberação
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px]">
                                <Lock className="w-3 h-3" />
                                {reg.status === 'cancelada' ? 'Cancelada (Bloqueado)' : 'Fazer Check-in (Bloqueado)'}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                            {hasDownloaded ? (
                              <div>
                                <div className="font-bold text-emerald-700">{dlCount}x baixado</div>
                                <div className="text-[10px] text-stone-500">
                                  {lastAt ? new Date(lastAt).toLocaleDateString('pt-BR') : ''}
                                </div>
                              </div>
                            ) : (
                              <span className="text-stone-400">0</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={!isPresent}
                                onClick={() => isPresent && onToggleCertificateIssued(reg.id)}
                                title={
                                  !isPresent
                                    ? 'Somente participantes com status Credenciado (Presente) podem ter certificado liberado.'
                                    : isIssuedAndPresent
                                    ? 'Revogar acesso ao certificado'
                                    : 'Liberar certificado para participante presente'
                                }
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors whitespace-nowrap ${
                                  !isPresent
                                    ? 'text-stone-400 bg-stone-100 border-stone-200 cursor-not-allowed'
                                    : isIssuedAndPresent
                                    ? 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200 cursor-pointer'
                                    : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 cursor-pointer'
                                }`}
                              >
                                {!isPresent ? 'Requer Check-in' : isIssuedAndPresent ? 'Revogar' : 'Liberar'}
                              </button>
                              <button
                                type="button"
                                onClick={() => onPreviewCertificate(reg)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                                  isPresent
                                    ? 'text-white bg-[#0a3641] hover:bg-[#0f4b59]'
                                    : 'text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200'
                                }`}
                                title={
                                  isPresent
                                    ? 'Pré-visualizar ou baixar certificado em PDF'
                                    : 'Impressão bloqueada até o participante realizar check-in'
                                }
                              >
                                {isPresent ? (
                                  <Eye className="w-3 h-3 text-[#ea7a38]" />
                                ) : (
                                  <Lock className="w-3 h-3 text-rose-600" />
                                )}
                                <span>{isPresent ? 'Visualizar / PDF' : 'Bloqueado'}</span>
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
        </div>
      )}

      {/* SUBVIEW 2: DESIGN EDITOR */}
      {subView === 'design' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left Column: Controls */}
          <form
            onSubmit={handleSaveDesign}
            className="xl:col-span-5 bg-white rounded-2xl border border-stone-200 p-5 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h4 className="text-base font-bold text-[#0a3641] flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[#ea7a38]" />
                  <span>Personalizar Design do Certificado</span>
                </h4>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Todas as alterações refletem no preview e no PDF oficial gerado.
                </p>
              </div>
              {designSaved && (
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Salvo!
                </span>
              )}
            </div>

            {/* Presets */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-700">
                Estilos Prontos (Paletas Institucionais)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DESIGN_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setDraftDesign((prev) => ({ ...prev, ...preset.values }))}
                    className="p-2.5 text-left rounded-xl border border-stone-200 hover:border-[#0a3641] bg-stone-50 hover:bg-white transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#0a3641]">{preset.name}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: preset.values.primaryColor }} />
                        <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: preset.values.accentColor }} />
                        <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: preset.values.secondaryColor }} />
                      </div>
                    </div>
                    <div className="text-[10px] text-stone-500 mt-0.5 leading-tight">{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Colors */}
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <label className="block text-xs font-bold text-stone-700">Cores Personalizadas</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <span className="block text-[10px] text-stone-500 mb-1">Principal</span>
                  <div className="flex items-center gap-1.5 border border-stone-300 rounded-lg p-1 bg-stone-50">
                    <input
                      type="color"
                      value={draftDesign.primaryColor}
                      onChange={(e) => setDraftDesign({ ...draftDesign, primaryColor: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                    />
                    <span className="text-[10px] font-mono text-stone-700">{draftDesign.primaryColor}</span>
                  </div>
                </div>
                <div>
                  <span className="block text-[10px] text-stone-500 mb-1">Destaque</span>
                  <div className="flex items-center gap-1.5 border border-stone-300 rounded-lg p-1 bg-stone-50">
                    <input
                      type="color"
                      value={draftDesign.accentColor}
                      onChange={(e) => setDraftDesign({ ...draftDesign, accentColor: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                    />
                    <span className="text-[10px] font-mono text-stone-700">{draftDesign.accentColor}</span>
                  </div>
                </div>
                <div>
                  <span className="block text-[10px] text-stone-500 mb-1">Secundária</span>
                  <div className="flex items-center gap-1.5 border border-stone-300 rounded-lg p-1 bg-stone-50">
                    <input
                      type="color"
                      value={draftDesign.secondaryColor}
                      onChange={(e) => setDraftDesign({ ...draftDesign, secondaryColor: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                    />
                    <span className="text-[10px] font-mono text-stone-700">{draftDesign.secondaryColor}</span>
                  </div>
                </div>
                <div>
                  <span className="block text-[10px] text-stone-500 mb-1">Fundo Folha</span>
                  <div className="flex items-center gap-1.5 border border-stone-300 rounded-lg p-1 bg-stone-50">
                    <input
                      type="color"
                      value={draftDesign.backgroundColor}
                      onChange={(e) => setDraftDesign({ ...draftDesign, backgroundColor: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                    />
                    <span className="text-[10px] font-mono text-stone-700">{draftDesign.backgroundColor}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Layout, Border & Font */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-stone-100">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Tema Visual</label>
                <select
                  value={draftDesign.layoutTheme}
                  onChange={(e) =>
                    setDraftDesign({
                      ...draftDesign,
                      layoutTheme: e.target.value as CertificateDesignConfig['layoutTheme']
                    })
                  }
                  className="w-full px-2.5 py-2 text-xs border border-stone-300 rounded-lg bg-white"
                >
                  <option value="raps_waves">Aquarela RAPS</option>
                  <option value="institutional_classic">Clássico Formal</option>
                  <option value="modern_clean">Limpo Moderno</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Moldura</label>
                <select
                  value={draftDesign.borderStyle}
                  onChange={(e) =>
                    setDraftDesign({
                      ...draftDesign,
                      borderStyle: e.target.value as CertificateDesignConfig['borderStyle']
                    })
                  }
                  className="w-full px-2.5 py-2 text-xs border border-stone-300 rounded-lg bg-white"
                >
                  <option value="double">Dupla Clássica</option>
                  <option value="classic">Borda Sólida</option>
                  <option value="minimal">Fina Minimalista</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Tipografia</label>
                <select
                  value={draftDesign.fontFamily}
                  onChange={(e) =>
                    setDraftDesign({
                      ...draftDesign,
                      fontFamily: e.target.value as CertificateDesignConfig['fontFamily']
                    })
                  }
                  className="w-full px-2.5 py-2 text-xs border border-stone-300 rounded-lg bg-white"
                >
                  <option value="sans">Sans Moderna</option>
                  <option value="serif">Serifada Solene</option>
                </select>
              </div>
            </div>

            {/* Texts & Institutional Header */}
            <div className="space-y-3 pt-2 border-t border-stone-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Linha Superior (Estado/País)</label>
                  <input
                    type="text"
                    value={draftDesign.institutionTopLine}
                    onChange={(e) => setDraftDesign({ ...draftDesign, institutionTopLine: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Etiqueta do Título</label>
                  <input
                    type="text"
                    value={draftDesign.badgeLabel}
                    onChange={(e) => setDraftDesign({ ...draftDesign, badgeLabel: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Órgão / Instituição Principal</label>
                <input
                  type="text"
                  value={draftDesign.institutionName}
                  onChange={(e) => setDraftDesign({ ...draftDesign, institutionName: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Subtítulo do Órgão</label>
                <input
                  type="text"
                  value={draftDesign.institutionSub}
                  onChange={(e) => setDraftDesign({ ...draftDesign, institutionSub: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Título Principal</label>
                  <input
                    type="text"
                    value={draftDesign.mainTitle}
                    onChange={(e) => setDraftDesign({ ...draftDesign, mainTitle: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Texto Antes do Nome</label>
                  <input
                    type="text"
                    value={draftDesign.preNameText}
                    onChange={(e) => setDraftDesign({ ...draftDesign, preNameText: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-stone-700">Texto da Declaração</label>
                  <span className="text-[10px] text-stone-400">Clique nas variáveis para inserir</span>
                </div>
                <textarea
                  rows={3}
                  value={draftDesign.bodyTemplate}
                  onChange={(e) => setDraftDesign({ ...draftDesign, bodyTemplate: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
                />
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {['{evento}', '{data}', '{horario}', '{local}', '{carga_horaria}'].map((token) => (
                    <button
                      key={token}
                      type="button"
                      onClick={() => insertToken(token)}
                      className="px-2 py-0.5 text-[10px] font-mono font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 rounded border border-stone-300 cursor-pointer"
                    >
                      + {token}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Frase / Lema Abaixo do Banner</label>
                <input
                  type="text"
                  value={draftDesign.footerQuote}
                  onChange={(e) => setDraftDesign({ ...draftDesign, footerQuote: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg"
                />
              </div>
            </div>

            {/* Visual Elements & Banner Upload */}
            <div className="space-y-3 pt-2 border-t border-stone-100">
              <label className="block text-xs font-bold text-stone-700">Elementos Visuais & Banner</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 p-2 rounded-lg border border-stone-200 bg-stone-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftDesign.showBannerImage}
                    onChange={(e) => setDraftDesign({ ...draftDesign, showBannerImage: e.target.checked })}
                  />
                  <span>Exibir Banner Superior</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg border border-stone-200 bg-stone-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftDesign.showThematicAxes}
                    onChange={(e) => setDraftDesign({ ...draftDesign, showThematicAxes: e.target.checked })}
                  />
                  <span>Exibir 3 Eixos Temáticos</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg border border-stone-200 bg-stone-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftDesign.showBottomWaves}
                    onChange={(e) => setDraftDesign({ ...draftDesign, showBottomWaves: e.target.checked })}
                  />
                  <span>Exibir Ondas no Rodapé</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg border border-stone-200 bg-stone-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftDesign.showQrValidation}
                    onChange={(e) => setDraftDesign({ ...draftDesign, showQrValidation: e.target.checked })}
                  />
                  <span>Exibir QR / Autenticação</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg border border-stone-200 bg-stone-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftDesign.showWatermark}
                    onChange={(e) => setDraftDesign({ ...draftDesign, showWatermark: e.target.checked })}
                  />
                  <span>Exibir Marca d'Água</span>
                </label>
                {draftDesign.showWatermark && (
                  <input
                    type="text"
                    value={draftDesign.watermarkText}
                    onChange={(e) => setDraftDesign({ ...draftDesign, watermarkText: e.target.value })}
                    placeholder="Texto marca d'água"
                    className="px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg"
                  />
                )}
              </div>

              {/* Banner Image Upload */}
              {draftDesign.showBannerImage && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#0a3641] bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Trocar Imagem / Logo do Banner</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setDraftDesign({
                        ...draftDesign,
                        bannerImageUrl: INITIAL_CERTIFICATE_DESIGN.bannerImageUrl
                      })
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Usar Flyer Padrão</span>
                  </button>
                </div>
              )}
            </div>

            {/* Signatures */}
            <div className="space-y-3 pt-2 border-t border-stone-100">
              <label className="block text-xs font-bold text-stone-700">Assinaturas Oficiais</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                  <span className="text-[10px] font-mono font-bold text-stone-500 uppercase">Assinatura 1</span>
                  <input
                    type="text"
                    value={draftDesign.signature1Name}
                    onChange={(e) => setDraftDesign({ ...draftDesign, signature1Name: e.target.value })}
                    placeholder="Nome"
                    className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={draftDesign.signature1Role}
                    onChange={(e) => setDraftDesign({ ...draftDesign, signature1Role: e.target.value })}
                    placeholder="Cargo"
                    className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={draftDesign.signature1Org}
                    onChange={(e) => setDraftDesign({ ...draftDesign, signature1Org: e.target.value })}
                    placeholder="Órgão / Setor"
                    className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white"
                  />
                </div>

                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                  <span className="text-[10px] font-mono font-bold text-stone-500 uppercase">Assinatura 2</span>
                  <input
                    type="text"
                    value={draftDesign.signature2Name}
                    onChange={(e) => setDraftDesign({ ...draftDesign, signature2Name: e.target.value })}
                    placeholder="Nome"
                    className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={draftDesign.signature2Role}
                    onChange={(e) => setDraftDesign({ ...draftDesign, signature2Role: e.target.value })}
                    placeholder="Cargo"
                    className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={draftDesign.signature2Org}
                    onChange={(e) => setDraftDesign({ ...draftDesign, signature2Org: e.target.value })}
                    placeholder="Órgão / Setor"
                    className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Submit & Reset Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={handleResetDesign}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restaurar Padrão</span>
              </button>

              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#0a3641] hover:bg-[#0f4b59] rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#ea7a38]" />
                <span>Salvar Design do Certificado</span>
              </button>
            </div>
          </form>

          {/* Right Column: Live Certificate Preview */}
          <div className="xl:col-span-7 space-y-3">
            <div className="bg-white rounded-2xl border border-stone-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-[#0a3641]">
                  Pré-visualização ao Vivo (Formato A4 Paisagem)
                </h4>
                <p className="text-[11px] text-stone-500">
                  Visualize em tempo real como o participante receberá o documento.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={previewAttendee.id}
                  onChange={(e) => setPreviewAttendeeId(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-stone-300 rounded-lg bg-stone-50 max-w-[200px]"
                  aria-label="Selecionar participante para pré-visualização"
                >
                  {registrations.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.fullName} ({r.code})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateConfig({ ...config, certificateDesign: draftDesign });
                    onPreviewCertificate(previewAttendee);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#ea7a38] hover:bg-[#d96522] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Testar PDF</span>
                </button>
              </div>
            </div>

            <div className="bg-stone-200/60 rounded-2xl p-2 sm:p-4 border border-stone-300 overflow-hidden">
              <CertificateSheet
                attendee={previewAttendee}
                config={config}
                designOverride={draftDesign}
                id="certificado-design-preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
