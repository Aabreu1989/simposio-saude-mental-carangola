import React, { useState, useMemo, useEffect } from 'react';
import {
  Palette,
  Printer,
  Download,
  CheckCircle2,
  RotateCcw,
  Loader2,
  IdCard
} from 'lucide-react';
import { BadgeDesignConfig, EventConfig, Registration } from '../types.ts';
import { INITIAL_BADGE_DESIGN } from '../data/initialData.ts';
import { getBadgeDesign } from '../utils/helpers.ts';
import { BadgeCardPreview } from './BadgeCardPreview.tsx';
import { printBadgeInIframe, downloadBadgePdf } from '../utils/badgePrintGenerator.ts';

interface AdminBadgeDesignerProps {
  config: EventConfig;
  registrations: Registration[];
  onUpdateConfig: (newConfig: EventConfig) => void;
}

const BADGE_PRESETS: Array<{
  id: string;
  name: string;
  description: string;
  values: Partial<BadgeDesignConfig>;
}> = [
  {
    id: 'sus_lanyard',
    name: 'SUS Carangola Oficial',
    description: 'Cabeçalho azul petróleo, cordão e selo RAPS',
    values: {
      layoutTheme: 'institutional_lanyard',
      primaryColor: '#0a3641',
      accentColor: '#ea7a38',
      secondaryColor: '#028090',
      backgroundColor: '#ffffff',
      textColor: '#0f172a'
    }
  },
  {
    id: 'modern_stripe',
    name: 'Faixa Lateral Moderna',
    description: 'Barra lateral em degradê e gradiente superior',
    values: {
      layoutTheme: 'modern_stripe',
      primaryColor: '#0f4c5c',
      accentColor: '#f97316',
      secondaryColor: '#0d9488',
      backgroundColor: '#ffffff',
      textColor: '#0f172a'
    }
  },
  {
    id: 'minimal_eco',
    name: 'Minimalista Econômico',
    description: 'Fundo claro para economia máxima de toner na impressão',
    values: {
      layoutTheme: 'minimal_card',
      primaryColor: '#0a3641',
      accentColor: '#d96522',
      secondaryColor: '#028090',
      backgroundColor: '#ffffff',
      textColor: '#1e293b'
    }
  },
  {
    id: 'esmeralda_sus',
    name: 'Rede Saúde Esmeralda',
    description: 'Verde institucional SUS com destaque dourado',
    values: {
      layoutTheme: 'institutional_lanyard',
      primaryColor: '#064e3b',
      accentColor: '#d97706',
      secondaryColor: '#059669',
      backgroundColor: '#f8faf8',
      textColor: '#0f172a'
    }
  }
];

export const AdminBadgeDesigner: React.FC<AdminBadgeDesignerProps> = ({
  config,
  registrations,
  onUpdateConfig
}) => {
  const [draftDesign, setDraftDesign] = useState<BadgeDesignConfig>(() => getBadgeDesign(config));
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [isPrintingTest, setIsPrintingTest] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [previewAttendeeId, setPreviewAttendeeId] = useState<string>(
    registrations.find((r) => r.status === 'presente')?.id || registrations[0]?.id || ''
  );

  useEffect(() => {
    setDraftDesign(getBadgeDesign(config));
  }, [config]);

  const previewAttendee: Registration = useMemo(() => {
    return (
      registrations.find((r) => r.id === previewAttendeeId) ||
      registrations[0] || {
        id: 'preview-badge',
        code: 'CAR-SM-001',
        fullName: 'Amanda Silveira Abreu',
        cpf: '102.345.678-90',
        email: 'participante@sus.mg.gov.br',
        phone: '(32) 99841-2233',
        city: 'Carangola',
        professionalRole: 'Psicólogo(a)',
        institution: 'CAPS I Carangola - SMS',
        axisInterest: 'Eixo 1: Fluxograma da RAPS',
        status: 'presente',
        registeredAt: new Date().toISOString(),
        certificateIssued: true
      }
    );
  }, [registrations, previewAttendeeId]);

  const handleSaveBadgeDesign = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      ...config,
      badgeDesign: draftDesign
    });
    setSavedNotice('Novo design do crachá salvo e aplicado a todos os participantes!');
    setTimeout(() => setSavedNotice(null), 4000);
  };

  const handleResetBadgeDesign = () => {
    const reset = { ...INITIAL_BADGE_DESIGN };
    setDraftDesign(reset);
    onUpdateConfig({
      ...config,
      badgeDesign: reset
    });
    setSavedNotice('Design padrão do crachá restaurado.');
    setTimeout(() => setSavedNotice(null), 3500);
  };

  const handlePrintTest = async () => {
    setIsPrintingTest(true);
    await printBadgeInIframe(previewAttendee, config, draftDesign);
    setIsPrintingTest(false);
  };

  const handleDownloadTestPdf = async () => {
    setIsExportingPdf(true);
    try {
      const filename = await downloadBadgePdf(previewAttendee, config, draftDesign);
      setSavedNotice(`Crachá de teste salvo em PDF (${filename}).`);
      setTimeout(() => setSavedNotice(null), 4000);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-[#ea7a38] uppercase tracking-wider font-mono flex items-center gap-1.5 mb-1">
            <IdCard className="w-4 h-4" />
            <span>Personalização de Credencial · Painel do Gestor</span>
          </div>
          <h3 className="text-lg font-bold text-[#0a3641]">
            Editor Visual & Impressão do Crachá Oficial
          </h3>
          <p className="text-xs text-stone-600 mt-0.5">
            Personalize o modelo, cores, textos e campos exibidos no crachá. O design salvo será usado ao clicar em "Crachá" para qualquer inscrito.
          </p>
        </div>

        {savedNotice && (
          <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{savedNotice}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Controls */}
        <form
          onSubmit={handleSaveBadgeDesign}
          className="xl:col-span-7 bg-white rounded-2xl border border-stone-200 p-5 space-y-5"
        >
          {/* Presets */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-700">
              Modelos Prontos de Crachá
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {BADGE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setDraftDesign((prev) => ({ ...prev, ...preset.values }))}
                  className="p-2.5 text-left rounded-xl border border-stone-200 hover:border-[#0a3641] bg-stone-50 hover:bg-white transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#0a3641]">{preset.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        className="w-3 h-3 rounded-full border border-black/10"
                        style={{ backgroundColor: preset.values.primaryColor }}
                      />
                      <span
                        className="w-3 h-3 rounded-full border border-black/10"
                        style={{ backgroundColor: preset.values.accentColor }}
                      />
                      <span
                        className="w-3 h-3 rounded-full border border-black/10"
                        style={{ backgroundColor: preset.values.secondaryColor }}
                      />
                    </div>
                  </div>
                  <div className="text-[10px] text-stone-500 mt-0.5 leading-tight">
                    {preset.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Layout & Paper Format */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-100">
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                Estrutura do Crachá
              </label>
              <select
                value={draftDesign.layoutTheme}
                onChange={(e) =>
                  setDraftDesign({
                    ...draftDesign,
                    layoutTheme: e.target.value as BadgeDesignConfig['layoutTheme']
                  })
                }
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white"
              >
                <option value="institutional_lanyard">Cordão Institucional Clássico</option>
                <option value="modern_stripe">Faixa Lateral Moderna</option>
                <option value="minimal_card">Minimalista Econômico (Fundo Claro)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                Tamanho de Impressão
              </label>
              <select
                value={draftDesign.paperFormat}
                onChange={(e) =>
                  setDraftDesign({
                    ...draftDesign,
                    paperFormat: e.target.value as BadgeDesignConfig['paperFormat']
                  })
                }
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white"
              >
                <option value="a6">Formato A6 (105 × 148 mm)</option>
                <option value="card">Cartão Credencial (90 × 125 mm)</option>
              </select>
            </div>
          </div>

          {/* Colors */}
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <label className="block text-xs font-bold text-stone-700">Paleta de Cores</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { key: 'primaryColor' as const, label: 'Principal' },
                { key: 'accentColor' as const, label: 'Destaque' },
                { key: 'secondaryColor' as const, label: 'Secundária' },
                { key: 'backgroundColor' as const, label: 'Fundo' },
                { key: 'textColor' as const, label: 'Texto' }
              ].map((c) => (
                <div key={c.key}>
                  <span className="block text-[10px] text-stone-500 mb-1">{c.label}</span>
                  <div className="flex items-center gap-1.5 border border-stone-300 rounded-lg p-1 bg-stone-50">
                    <input
                      type="color"
                      value={draftDesign[c.key]}
                      onChange={(e) =>
                        setDraftDesign({ ...draftDesign, [c.key]: e.target.value })
                      }
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                    />
                    <span className="text-[10px] font-mono text-stone-700 truncate">
                      {draftDesign[c.key]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Editable Text Labels */}
          <div className="space-y-3 pt-2 border-t border-stone-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Cabeçalho Superior
                </label>
                <input
                  type="text"
                  value={draftDesign.headerLabel}
                  onChange={(e) =>
                    setDraftDesign({ ...draftDesign, headerLabel: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Subtítulo / Município
                </label>
                <input
                  type="text"
                  value={draftDesign.subHeaderLabel}
                  onChange={(e) =>
                    setDraftDesign({ ...draftDesign, subHeaderLabel: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Rodapé do Crachá
                </label>
                <input
                  type="text"
                  value={draftDesign.footerLabel}
                  onChange={(e) =>
                    setDraftDesign({ ...draftDesign, footerLabel: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Etiqueta Credenciado
                </label>
                <input
                  type="text"
                  value={draftDesign.accreditedBadgeLabel}
                  onChange={(e) =>
                    setDraftDesign({
                      ...draftDesign,
                      accreditedBadgeLabel: e.target.value
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Etiqueta Check-in Pendente
                </label>
                <input
                  type="text"
                  value={draftDesign.pendingBadgeLabel}
                  onChange={(e) =>
                    setDraftDesign({ ...draftDesign, pendingBadgeLabel: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Field Toggles */}
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <label className="block text-xs font-bold text-stone-700">
              Campos Visíveis no Crachá
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {[
                { key: 'showLogo' as const, label: 'Logotipo Oficial SUS' },
                { key: 'showQrCode' as const, label: 'QR Code de Validação' },
                { key: 'showCity' as const, label: 'Município de Origem' },
                { key: 'showInstitution' as const, label: 'Instituição / Lotação' },
                { key: 'showAxisInterest' as const, label: 'Eixo Temático' },
                { key: 'showCareLevel' as const, label: 'Nível Atenção SUS' },
                { key: 'showLanyardSlot' as const, label: 'Marcador de Cordão' }
              ].map((toggle) => (
                <label
                  key={toggle.key}
                  className="flex items-center gap-2 p-2 rounded-lg border border-stone-200 bg-stone-50 cursor-pointer hover:bg-white transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={draftDesign[toggle.key]}
                    onChange={(e) =>
                      setDraftDesign({ ...draftDesign, [toggle.key]: e.target.checked })
                    }
                    className="rounded text-[#0a3641]"
                  />
                  <span className="font-medium text-stone-700">{toggle.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Save & Reset Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={handleResetBadgeDesign}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Padrão</span>
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-extrabold text-white bg-[#0a3641] hover:bg-[#0f4b59] rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <Palette className="w-4 h-4 text-[#ea7a38]" />
              <span>Salvar Design do Crachá</span>
            </button>
          </div>
        </form>

        {/* Right Column: Live Preview & Direct Test Print */}
        <div className="xl:col-span-5 bg-white rounded-2xl border border-stone-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
            <div>
              <span className="text-xs font-bold text-[#0a3641] block">
                Pré-visualização em Tempo Real
              </span>
              <span className="text-[11px] text-stone-500">
                Selecione um participante para testar a impressão
              </span>
            </div>

            <select
              value={previewAttendee.id}
              onChange={(e) => setPreviewAttendeeId(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-stone-50 max-w-[220px]"
            >
              {registrations.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} · {r.fullName.split(' ').slice(0, 2).join(' ')} (
                  {r.status === 'presente' ? 'Presente' : 'Pendente'})
                </option>
              ))}
            </select>
          </div>

          <div className="p-4 rounded-2xl bg-stone-100 border border-stone-200 flex justify-center">
            <BadgeCardPreview
              registration={previewAttendee}
              config={config}
              designOverride={draftDesign}
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleDownloadTestPdf}
              disabled={isExportingPdf}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-[#0a3641] bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
            >
              {isExportingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#ea7a38]" />
              ) : (
                <Download className="w-4 h-4 text-[#ea7a38]" />
              )}
              <span>Baixar PDF Teste</span>
            </button>

            <button
              type="button"
              onClick={handlePrintTest}
              disabled={isPrintingTest}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-extrabold text-white bg-[#ea7a38] hover:bg-[#d96522] rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              {isPrintingTest ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              <span>{isPrintingTest ? 'Imprimindo...' : 'Imprimir Crachá de Teste'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
