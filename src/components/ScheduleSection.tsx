import React, { useState } from 'react';
import {
  Clock,
  MapPin,
  User,
  Search,
  Printer,
  Calendar,
  Sparkles,
  Sun,
  Sunset,
  Layers,
  Download,
  X,
  Filter
} from 'lucide-react';
import { ScheduleSession, ThematicAxis, EventConfig } from '../types.ts';
import { INITIAL_EVENT_CONFIG } from '../data/initialData.ts';
import { SchedulePrintModal } from './SchedulePrintModal.tsx';
import { openSchedulePDFWindow } from '../utils/schedulePdfGenerator.ts';

interface ScheduleProps {
  sessions: ScheduleSession[];
  axes: ThematicAxis[];
  selectedAxisId?: string;
  onClearAxisFilter: () => void;
  eventTitle: string;
  eventDate: string;
  config?: EventConfig;
}

export const ScheduleSection: React.FC<ScheduleProps> = ({
  sessions,
  axes,
  selectedAxisId,
  onClearAxisFilter,
  eventTitle,
  eventDate,
  config
}) => {
  const effectiveConfig = config || INITIAL_EVENT_CONFIG;
  const [searchTerm, setSearchTerm] = useState('');
  const [shiftFilter, setShiftFilter] = useState<'all' | 'morning' | 'afternoon'>('all');
  const [activeAxis, setActiveAxis] = useState<string>(selectedAxisId || 'all');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Sync prop changes
  React.useEffect(() => {
    if (selectedAxisId) {
      setActiveAxis(selectedAxisId);
    }
  }, [selectedAxisId]);

  const filteredSessions = sessions.filter((session) => {
    // Search filter
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      term === '' ||
      session.title.toLowerCase().includes(term) ||
      session.description.toLowerCase().includes(term) ||
      session.location.toLowerCase().includes(term) ||
      (session.mediator &&
        (session.mediator.name.toLowerCase().includes(term) ||
          session.mediator.role.toLowerCase().includes(term) ||
          session.mediator.institution.toLowerCase().includes(term))) ||
      session.speakers?.some(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.role.toLowerCase().includes(term) ||
          s.institution.toLowerCase().includes(term)
      );

    // Axis filter
    const matchesAxis =
      activeAxis === 'all' || session.axisId === activeAxis;

    // Shift filter (morning vs afternoon)
    const hour = parseInt(session.timeStart.split(':')[0], 10);
    const matchesShift =
      shiftFilter === 'all' ||
      (shiftFilter === 'morning' && hour < 13) ||
      (shiftFilter === 'afternoon' && hour >= 13);

    return matchesSearch && matchesAxis && matchesShift;
  });

  const handlePrintSchedule = () => {
    setIsPrintModalOpen(true);
    // Also attempt opening dedicated printable window with auto-print
    openSchedulePDFWindow(sessions, axes, effectiveConfig);
  };

  return (
    <section id="programacao" className="scroll-mt-20 py-16 sm:py-20 bg-white border-b border-stone-200 relative overflow-hidden">
      
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-10 w-96 h-96 bg-[#028090]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-[#ea7a38]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Prominent Header Banner */}
        <div className="bg-gradient-to-r from-[#0a3641] via-[#08303a] to-[#028090] text-white p-6 sm:p-10 rounded-3xl shadow-xl mb-12 relative overflow-hidden">
          {/* Subtle circuit lines */}
          <div
            className="absolute inset-0 opacity-[0.05] pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
              backgroundSize: '20px 20px'
            }}
          />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#ea7a38] bg-white/10 px-3 py-1 rounded-md backdrop-blur-xs">
                <Calendar className="w-3.5 h-3.5 text-[#ea7a38]" />
                <span>Grade Oficial · 08 de Dezembro · 7h30 às 16h30</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                Programa Completo do Evento
              </h2>
              <p className="text-sm sm:text-base text-stone-200 leading-relaxed">
                Confira a programação minuciosa de cada mesa redonda, temas de debate, palestrantes convidados e a plenária final deliberativa da Carta de Carangola.
              </p>
            </div>

            {/* Quick Action Buttons in Banner */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto shrink-0">
              <button
                type="button"
                onClick={handlePrintSchedule}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold text-white bg-[#ea7a38] hover:bg-[#d96522] rounded-xl transition-all border border-[#ea7a38] cursor-pointer whitespace-nowrap active:scale-95 shadow-md hover:shadow-lg group"
                title="Visualizar, imprimir ou baixar o programa completo diagramado em PDF"
              >
                <Printer className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                <span>Imprimir Programa (PDF)</span>
              </button>
            </div>
          </div>

          {/* Quick Schedule Sequence Navigator */}
          <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs font-mono text-stone-200">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[#ea7a38] font-bold block">07:30 – 09:30</span>
              <span className="text-white font-sans font-semibold">Credenciamento, Café, Abertura & Arte</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[#028090] font-bold block">09:30 – 11:30</span>
              <span className="text-white font-sans font-semibold">Mesa 1 · Fluxograma da RAPS</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-amber-400 font-bold block">11:30 – 13:00</span>
              <span className="text-white font-sans font-semibold">Intervalo para Almoço</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-emerald-400 font-bold block">13:00 – 16:30</span>
              <span className="text-white font-sans font-semibold">Mesas 2 e 3, Cultural & Encerramento</span>
            </div>
          </div>
        </div>

        {/* Dedicated Prominent Search Bar for Speakers and Topics */}
        <div className="bg-[#faf7f2] p-5 sm:p-6 rounded-3xl border border-stone-200/90 mb-8 space-y-4 shadow-sm">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-1">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#0a3641] uppercase tracking-wider">
              <Search className="w-4 h-4 text-[#ea7a38]" />
              <span>Pesquisa Rápida de Palestras, Temas e Palestrantes</span>
            </div>
            
            {/* Real-time result count badge */}
            <div className="text-xs font-medium text-stone-500 flex items-center gap-2">
              <span className="font-mono bg-white px-2.5 py-1 rounded-lg border border-stone-200 text-[#0a3641] font-bold">
                {filteredSessions.length} {filteredSessions.length === 1 ? 'atividade' : 'atividades'} {searchTerm ? 'encontrada(s)' : 'na grade'}
              </span>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-xs font-bold text-[#d96522] hover:text-[#0a3641] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Limpar busca</span>
                </button>
              )}
            </div>
          </div>

          {/* Large High-Tech Search Input */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por palestrante, mediadora ou tema (ex: Raquel, Christine, Camila, Gisella)..."
              className="w-full pl-11 pr-10 py-3.5 text-sm sm:text-base bg-white border-2 border-stone-200 rounded-2xl focus:outline-none focus:border-[#0a3641] focus:ring-4 focus:ring-[#0a3641]/10 text-stone-800 placeholder-stone-400 shadow-2xs transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                title="Limpar pesquisa"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick-filter Suggestion Chips: Palestrantes e Mediadoras Oficiais */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-stone-500 font-semibold text-[11px] uppercase tracking-wider font-mono">
              Sugestões Rápidas:
            </span>

            {[
              { label: 'Mesa 1 (Fluxograma da RAPS · Camila Lima)', query: 'Mesa 1' },
              { label: 'Mesa 2 (Hospital Geral & Urgência · Raquel Pinheiro)', query: 'Mesa 2' },
              { label: 'Mesa 3 (Judicialização & Direitos · Christine Vianna)', query: 'Mesa 3' },
              { label: 'Gisella Loiola Consensa (Abertura Oficial)', query: 'Gisella' }
            ].map((chip) => {
              const isSelected = searchTerm.toLowerCase().includes(chip.query.toLowerCase());
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => setSearchTerm(isSelected ? '' : chip.query)}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer text-xs flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#0a3641] text-white shadow-2xs'
                      : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200/90'
                  }`}
                >
                  <span>{chip.label}</span>
                  {isSelected && <X className="w-3 h-3 text-[#ea7a38]" />}
                </button>
              );
            })}
          </div>

          {/* Secondary Shift & Axis Filter Controls */}
          <div className="pt-3 border-t border-stone-200/70 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            
            {/* Shift Filter (Manhã vs Tarde) */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-1 bg-stone-200/70 p-1 rounded-xl">
              <button
                onClick={() => setShiftFilter('all')}
                className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg text-center transition-colors cursor-pointer ${
                  shiftFilter === 'all'
                    ? 'bg-white text-[#0a3641] shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Todos
              </button>

              <button
                onClick={() => setShiftFilter('morning')}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  shiftFilter === 'morning'
                    ? 'bg-white text-[#0a3641] shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Manhã</span>
                <span className="hidden sm:inline">(07h30 - 11h30)</span>
              </button>

              <button
                onClick={() => setShiftFilter('afternoon')}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  shiftFilter === 'afternoon'
                    ? 'bg-white text-[#0a3641] shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Sunset className="w-3.5 h-3.5 text-[#ea7a38] shrink-0" />
                <span>Tarde</span>
                <span className="hidden sm:inline">(13h00 - 16h30)</span>
              </button>
            </div>

            {/* Axis Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
              <button
                onClick={() => {
                  setActiveAxis('all');
                  onClearAxisFilter();
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  activeAxis === 'all'
                    ? 'bg-[#0a3641] text-white shadow-2xs'
                    : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                Todos os Eixos
              </button>
              {axes.map((ax) => (
                <button
                  key={ax.id}
                  onClick={() => setActiveAxis(ax.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                    activeAxis === ax.id
                      ? 'bg-[#0a3641] text-white shadow-2xs'
                      : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                  }`}
                >
                  Eixo {ax.number}
                </button>
              ))}
            </div>

          </div>

        </div>

        {/* Sessions List */}
        <div className="space-y-5">
          {filteredSessions.length === 0 ? (
            <div className="p-12 text-center bg-stone-50 rounded-3xl border-2 border-dashed border-stone-200 text-stone-500 space-y-3">
              <Search className="w-10 h-10 text-stone-400 mx-auto" />
              <div className="font-bold text-base text-stone-800">
                Nenhuma atividade encontrada para "{searchTerm}"
              </div>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Tente buscar pelo nome das palestrantes e mediadoras como "Raquel", "Christine", "Camila" ou "Gisella", ou limpe os filtros para ver a grade completa.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setShiftFilter('all');
                  setActiveAxis('all');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#0a3641] bg-white border border-stone-300 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer shadow-2xs"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpar Filtros e Ver Todas as Palestras</span>
              </button>
            </div>
          ) : (
            filteredSessions.map((session, index) => {
              const relatedAxis = axes.find((a) => a.id === session.axisId);
              const isBreak = session.type === 'intervalo' || session.type === 'credenciamento';
              const isMajor = session.type === 'mesa' || session.type === 'plenaria';

              return (
                <div
                  key={session.id}
                  className={`rounded-2xl p-6 border transition-all ${
                    isMajor
                      ? 'bg-white border-stone-200/90 shadow-sm hover:shadow-md hover:border-[#028090]/40'
                      : isBreak
                      ? 'bg-gradient-to-r from-[#faf6f0] to-[#f5f8f8] border-stone-200/70'
                      : 'bg-white border-stone-200 shadow-2xs'
                  }`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                    
                    {/* Time & Session Badge */}
                    <div className="md:col-span-3 space-y-2">
                      <div className="inline-flex items-center gap-2 text-[#0a3641] font-mono font-black text-lg tabular-nums bg-stone-100/80 px-3 py-1 rounded-xl">
                        <Clock className="w-4 h-4 text-[#ea7a38]" />
                        <span>{session.timeStart} – {session.timeEnd}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-stone-500 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>{session.location}</span>
                      </div>

                      {relatedAxis && (
                        <div className="pt-1">
                          <span className="text-[11px] font-bold text-[#0a3641] bg-[#eef6f7] px-2.5 py-1 rounded-lg border border-[#028090]/20 inline-block font-mono">
                            Eixo {relatedAxis.number} · {relatedAxis.shortTitle}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content, Description & Speakers */}
                    <div className="md:col-span-9 space-y-2.5">
                      <h3 className="text-lg sm:text-xl font-black text-[#0a3641] leading-snug">
                        {session.title}
                      </h3>

                      <p className="text-sm text-stone-600 leading-relaxed font-normal">
                        {session.description}
                      </p>

                      {/* Mediator Callout if any */}
                      {session.mediator && (
                        <div className="pt-2">
                          <div
                            className={`inline-flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 px-3.5 py-2.5 rounded-xl border text-xs ${
                              searchTerm.trim() !== '' &&
                              session.mediator.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
                                ? 'bg-[#fffaf5] border-[#ea7a38] ring-2 ring-[#ea7a38]/20'
                                : 'bg-[#eef6f7]/80 border-[#028090]/30'
                            }`}
                          >
                            <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-[#028090]">
                              Mediação:
                            </span>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className="font-bold text-[#0a3641] text-sm">
                                {session.mediator.name}
                              </span>
                              <span className="text-stone-500">·</span>
                              <span className="text-stone-700 font-medium">
                                {session.mediator.role}
                              </span>
                              <span className="text-stone-400 hidden sm:inline">·</span>
                              <span className="text-stone-500 text-[11px]">
                                {session.mediator.institution}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Speakers Grid if any */}
                      {session.speakers && session.speakers.length > 0 && (
                        <div className="pt-4 border-t border-stone-100 mt-3">
                          <div className="text-[11px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-[#ea7a38]" />
                            <span>Palestrantes e Debatedores Confirmados:</span>
                          </div>

                          <div
                            className={`grid grid-cols-1 gap-3 ${
                              session.speakers.length === 4
                                ? 'sm:grid-cols-2 lg:grid-cols-4'
                                : session.speakers.length >= 5
                                ? 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                                : 'sm:grid-cols-2 md:grid-cols-3'
                            }`}
                          >
                            {session.speakers.map((spk, idx) => {
                              const isSpeakerMatch =
                                searchTerm.trim() !== '' &&
                                spk.name.toLowerCase().includes(searchTerm.toLowerCase().trim());

                              return (
                                <div
                                  key={idx}
                                  className={`p-3 rounded-xl border text-xs transition-all ${
                                    isSpeakerMatch
                                      ? 'bg-[#fffaf5] border-[#ea7a38] ring-2 ring-[#ea7a38]/20 shadow-xs'
                                      : 'bg-[#faf8f5] border-stone-200/90 hover:border-[#0a3641]/30'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <div className="font-bold text-[#0a3641] text-sm">{spk.name}</div>
                                    {isSpeakerMatch && (
                                      <span className="text-[9px] font-mono font-bold text-[#d96522] bg-[#fef1e8] px-1.5 py-0.5 rounded">
                                        Palestrante
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-stone-600 text-xs mt-0.5">{spk.role}</div>
                                  <div className="text-stone-500 text-[11px] leading-tight break-words mt-0.5">
                                    {spk.institution}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Dedicated Printable & Structured Schedule PDF Modal */}
      <SchedulePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        sessions={sessions}
        axes={axes}
        config={effectiveConfig}
      />
    </section>
  );
};
