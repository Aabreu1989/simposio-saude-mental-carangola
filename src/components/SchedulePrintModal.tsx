import React from 'react';
import {
  X,
  Printer,
  Download,
  ExternalLink,
  Calendar,
  Clock,
  MapPin,
  Check,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { ScheduleSession, ThematicAxis, EventConfig } from '../types.ts';
import { openSchedulePDFWindow, generateScheduleHTML } from '../utils/schedulePdfGenerator.ts';

interface SchedulePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ScheduleSession[];
  axes: ThematicAxis[];
  config: EventConfig;
}

export const SchedulePrintModal: React.FC<SchedulePrintModalProps> = ({
  isOpen,
  onClose,
  sessions,
  axes,
  config
}) => {
  const [downloaded, setDownloaded] = React.useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    // 1. Try to open the dedicated printable window first (best quality for PDF export)
    const opened = openSchedulePDFWindow(sessions, axes, config);
    if (!opened) {
      // 2. If popup is blocked by browser/iframe, trigger local print
      window.print();
    }
  };

  const handleDownloadHTML = () => {
    const htmlContent = generateScheduleHTML(sessions, axes, config);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `programa_oficial_simposio_saude_mental_carangola.html`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (link.parentNode) link.parentNode.removeChild(link);
      URL.revokeObjectURL(url);
    }, 10000);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 4000);
  };

  const getAxis = (axisId?: string) => {
    if (!axisId) return null;
    return axes.find(a => a.id === axisId);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-stone-300 overflow-hidden my-auto max-h-[94vh] flex flex-col">
        
        {/* Top Control Bar */}
        <div className="px-4 sm:px-6 py-3.5 bg-[#0a3641] text-white flex items-center justify-between gap-3 shrink-0 border-b-2 border-[#ea7a38]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#ea7a38] text-white flex items-center justify-center font-bold shrink-0 shadow-2xs">
              <Printer className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold leading-tight truncate">
                Programa Completo do Evento (PDF)
              </h3>
              <p className="text-[11px] text-teal-200 truncate">
                Grade Horária Diagramada para Impressão e Salvamento em PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#ea7a38] hover:bg-[#d96522] text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              title="Salvar como PDF no seu navegador"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Salvar como PDF / Imprimir</span>
              <span className="xs:hidden">Imprimir</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Secondary Toolbar */}
        <div className="px-4 sm:px-6 py-2.5 bg-stone-100 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600 shrink-0">
          <div className="flex items-center gap-1.5 font-medium">
            <FileText className="w-3.5 h-3.5 text-[#0a3641]" />
            <span>Documento Oficial formatado no padrão A4 (8 Horas de Certificação SUS)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openSchedulePDFWindow(sessions, axes, config)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-[#0a3641] bg-white hover:bg-stone-50 rounded-md border border-stone-300 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3 h-3 text-[#ea7a38]" />
              <span>Abrir em Nova Aba</span>
            </button>

            <button
              onClick={handleDownloadHTML}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-[#028090] bg-white hover:bg-stone-50 rounded-md border border-stone-300 transition-colors cursor-pointer"
            >
              {downloaded ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>Baixado!</span>
                </>
              ) : (
                <>
                  <Download className="w-3 h-3" />
                  <span>Baixar Arquivo</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Scrollable Document Preview Container */}
        <div className="p-4 sm:p-8 overflow-y-auto bg-stone-200/60 flex justify-center">
          
          {/* Printable White Document Sheet */}
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-md border border-stone-300 p-6 sm:p-10 text-stone-800 space-y-6">
            
            {/* Document Header */}
            <div className="border-b-2 border-[#0a3641] pb-4 flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-[#0a3641] text-white mb-1.5">
                  SUS · Secretaria Municipal de Saúde de Carangola - MG
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-[#0a3641] uppercase tracking-tight leading-tight">
                  {config.editionTitle} {config.regionTitle}
                </h1>
                <p className="text-xs sm:text-sm font-bold text-[#ea7a38] uppercase tracking-wide mt-0.5">
                  Caderno Oficial da Programação e Grade Horária
                </p>
              </div>

              <div className="text-left sm:text-right text-[11px] text-stone-600 shrink-0 border-t sm:border-t-0 sm:border-l border-stone-200 pt-2 sm:pt-0 sm:pl-4 space-y-0.5">
                <div><strong>Data:</strong> {config.eventFullDate}</div>
                <div><strong>Horário:</strong> {config.eventHours}</div>
                <div><strong>Carga:</strong> 8 Horas Certificadas</div>
                <div className="text-emerald-700 font-bold">Documento Oficial</div>
              </div>
            </div>

            {/* Logistics Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-lg bg-stone-50 border border-stone-200 text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Local do Evento</span>
                <span className="font-bold text-[#0a3641] block">{config.locationName}</span>
                <span className="text-stone-600 text-[11px] leading-tight block">{config.locationAddress}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Público Prioritário</span>
                <span className="font-bold text-[#0a3641] block">Rede RAPS & Atenção Básica</span>
                <span className="text-stone-600 text-[11px] leading-tight block">Profissionais do SUS, Judiciário e Sociedade</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Realização & Gestão</span>
                <span className="font-bold text-[#0a3641] block">SMS Carangola & RAPS</span>
                <span className="text-stone-600 text-[11px] leading-tight block">Colegiado Gestor Microrregional</span>
              </div>
            </div>

            {/* Thematic Axes Box */}
            <div className="p-3 rounded-lg border-l-4 border-[#ea7a38] bg-orange-50/40 border border-stone-200 space-y-1.5">
              <span className="text-[11px] font-bold text-[#0a3641] uppercase tracking-wide block">
                Eixos Temáticos Estratégicos do Simpósio
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-stone-700">
                {axes.map(ax => (
                  <div key={ax.id} className="leading-snug">
                    <strong className="text-[#0a3641] block">Eixo {ax.number}: {ax.shortTitle || ax.title}</strong>
                    <span className="text-stone-500 text-[10px]">{ax.description.slice(0, 95)}...</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Grade Heading */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0a3641]">
                Grade Minuciosa de Atividades
              </h2>
              <span className="text-[11px] text-stone-500">
                8 Horas de Capacitação e Diálogo Coletivo
              </span>
            </div>

            {/* Schedule Timeline Cards */}
            <div className="space-y-3.5">
              {sessions.map((session) => {
                const ax = getAxis(session.axisId);
                return (
                  <div key={session.id} className="border border-stone-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                    <div className="bg-stone-50 border-b border-stone-200 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs font-black text-[#0a3641] bg-white px-2.5 py-0.5 rounded border border-stone-300">
                        {session.timeStart} – {session.timeEnd}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-teal-100 text-[#0a3641]">
                          {session.type}
                        </span>
                        {ax && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-orange-100 text-orange-900">
                            Eixo {ax.number}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 space-y-2">
                      <h3 className="text-xs sm:text-sm font-extrabold text-[#0a3641] leading-snug">
                        {session.title}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-stone-600 leading-relaxed">
                        {session.description}
                      </p>
                      <div className="text-[11px] text-stone-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#ea7a38]" />
                        <span><strong>Espaço:</strong> {session.location}</span>
                      </div>

                      {/* Mediator */}
                      {session.mediator && (
                        <div className="mt-2 pt-2 border-t border-stone-100 text-[11px] bg-[#eef6f7]/70 px-2.5 py-1.5 rounded">
                          <span className="font-bold text-[#028090] uppercase text-[10px] tracking-wider mr-1.5">Mediação:</span>
                          <span className="font-bold text-[#0a3641]">{session.mediator.name}</span>
                          <span className="text-stone-600"> · {session.mediator.role}</span>
                          <span className="text-stone-500 italic"> ({session.mediator.institution})</span>
                        </div>
                      )}

                      {/* Speakers */}
                      {session.speakers && session.speakers.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-stone-100 bg-stone-50/80 p-2 rounded">
                          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                            Palestrantes e Debatedores:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                            {session.speakers.map((s, idx) => (
                              <div key={idx} className="leading-tight">
                                <span className="font-bold text-[#0a3641]">{s.name}</span>
                                <span className="text-stone-600"> · {s.role}</span>
                                <div className="text-[10px] text-stone-500 italic">{s.institution}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Rules and Signatures */}
            <div className="pt-4 border-t border-stone-200 text-xs text-stone-600 space-y-3">
              <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 text-[11px] leading-relaxed">
                <strong>Orientações de Frequência e Certificação:</strong> O credenciamento é obrigatório na chegada às 07h30. Para a emissão do certificado digital de 8 horas chancelado pela Secretaria Municipal de Saúde de Carangola, é exigida a permanência de no mínimo 75% da carga horária.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-center text-[11px] text-stone-700">
                <div className="border-t border-stone-400 pt-2">
                  <strong>Superintendência de Saúde Mental</strong>
                  <div className="text-[10px] text-stone-500">Coordenação do Simpósio</div>
                </div>
                <div className="border-t border-stone-400 pt-2">
                  <strong>Supervisão Clínico Institucional da RAPS</strong>
                  <div className="text-[10px] text-stone-500">Coordenação do Simpósio</div>
                </div>
                <div className="border-t border-stone-400 pt-2">
                  <strong>Secretaria Municipal de Saúde de Carangola</strong>
                  <div className="text-[10px] text-stone-500">Coordenação do Simpósio</div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 bg-stone-100 border-t border-stone-200 flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-stone-500">
            Dica: Selecione "Salvar como PDF" no destino da impressora para guardar o arquivo digital.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-200 rounded-lg border border-stone-300 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
