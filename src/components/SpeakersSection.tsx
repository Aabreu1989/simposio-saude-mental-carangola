import React, { useMemo, useState } from 'react';
import { FileDown, GraduationCap, Search, Users, ExternalLink, CheckCircle2, Clock } from 'lucide-react';
import { EventConfig, SpeakerProfile } from '../types.ts';
import { exportSpeakersPdf } from '../utils/speakersPdfGenerator.ts';
import { normalizeGoogleDriveImageUrl } from '../utils/helpers.ts';

interface SpeakersSectionProps {
  speakers: SpeakerProfile[];
  config: EventConfig;
}

const InstagramGlyph = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const LinkedInGlyph = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const FILTER_TABS: Array<{ id: 'todos' | SpeakerProfile['sessionGroup']; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'mesa-1', label: 'Mesa 1 · RAPS' },
  { id: 'mesa-2', label: 'Mesa 2 · Hospital & Urgência' },
  { id: 'mesa-3', label: 'Mesa 3 · Justiça & Direitos' }
];

const getInitials = (name: string): string => {
  const clean = name.replace(/^(Dra?\.ª?|Dr\.|Enf\.|Psic\.)\s+/i, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'SM';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const getMonogramTone = (group: SpeakerProfile['sessionGroup']): string => {
  switch (group) {
    case 'mesa-1':
      return 'from-[#028090] to-[#0a3641]';
    case 'mesa-2':
      return 'from-[#d96522] to-[#9a3412]';
    case 'mesa-3':
      return 'from-indigo-700 to-[#0a3641]';
    default:
      return 'from-[#0a3641] to-[#134e5e]';
  }
};

const getGroupBadge = (group: SpeakerProfile['sessionGroup']) => {
  switch (group) {
    case 'mesa-1':
      return { label: 'Mesa 1 · RAPS', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    case 'mesa-2':
      return { label: 'Mesa 2 · Urgência & Hospital', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
    case 'mesa-3':
      return { label: 'Mesa 3 · Justiça & Direitos', bg: 'bg-indigo-50 text-indigo-800 border-indigo-200' };
    default:
      return { label: 'Abertura & Mediação', bg: 'bg-teal-50 text-teal-800 border-teal-200' };
  }
};

export const SpeakersSection: React.FC<SpeakersSectionProps> = ({ speakers, config }) => {
  const [selectedGroup, setSelectedGroup] = useState<'todos' | SpeakerProfile['sessionGroup']>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const filteredSpeakers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return speakers.filter((spk) => {
      const matchesGroup =
        selectedGroup === 'todos' ||
        spk.sessionGroup === selectedGroup ||
        (selectedGroup === 'abertura' && spk.sessionLabel.toLowerCase().includes('abertura'));
      if (!matchesGroup) return false;
      if (!q) return true;
      return (
        spk.name.toLowerCase().includes(q) ||
        spk.role.toLowerCase().includes(q) ||
        spk.institution.toLowerCase().includes(q) ||
        spk.sessionLabel.toLowerCase().includes(q) ||
        spk.bio.toLowerCase().includes(q)
      );
    });
  }, [speakers, selectedGroup, searchQuery]);

  const handleDownloadPdf = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await exportSpeakersPdf(speakers, config);
      setExportDone(true);
      setTimeout(() => setExportDone(false), 3500);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section id="palestrantes" className="py-16 bg-[#faf8f5] border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <div className="text-xs font-bold text-[#d96522] uppercase tracking-wider mb-2 font-mono">
              Corpo Técnico & Convidados
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0a3641] tracking-tight">
              Palestrantes e Mediadores
            </h2>
            <p className="mt-2 text-stone-600 text-sm max-w-2xl leading-relaxed">
              Conheça os especialistas, gestores, supervisores clínico-institucionais e representantes do Sistema de Justiça que conduzem os debates desta edição.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#0a3641] hover:bg-[#028090] active:scale-95 transition-all shadow-sm cursor-pointer disabled:opacity-70 whitespace-nowrap"
            >
              {exportDone ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span>PDF dos Palestrantes Baixado</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4 text-[#ea7a38] shrink-0" />
                  <span>{isExporting ? 'Gerando PDF...' : 'Baixar PDF com Todos os Palestrantes'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white border border-stone-200 rounded-2xl p-3 sm:p-4 mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-2xs">
          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Filtrar palestrantes por mesa">
            {FILTER_TABS.map((tab) => {
              const active = selectedGroup === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedGroup(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[#0a3641] text-white shadow-2xs'
                      : 'text-stone-600 hover:text-[#0a3641] hover:bg-stone-100'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-72 shrink-0">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar nome, instituição ou área..."
              aria-label="Buscar palestrante"
              className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#028090]"
            />
          </div>
        </div>

        {/* Speakers Grid */}
        {filteredSpeakers.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center text-stone-500 text-sm">
            Nenhum palestrante encontrado para os filtros aplicados.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSpeakers.map((speaker) => {
              const badge = getGroupBadge(speaker.sessionGroup);

              return (
                <article
                  key={speaker.id}
                  className="bg-white rounded-2xl border border-stone-200 p-5 flex flex-col justify-between shadow-2xs hover:shadow-md hover:border-stone-300 transition-all group"
                >
                  <div>
                    {/* Headshot + Identity */}
                    <div className="flex items-start gap-4 mb-3.5">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-stone-200 bg-stone-100 shadow-2xs">
                        {speaker.photoUrl && !imgErrors[speaker.id] ? (
                          <img
                            src={normalizeGoogleDriveImageUrl(speaker.photoUrl).url}
                            alt={`Retrato de ${speaker.name}`}
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            onError={() => setImgErrors((prev) => ({ ...prev, [speaker.id]: true }))}
                            style={{ objectPosition: speaker.photoPosition || 'center 18%' }}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div
                            className={`w-full h-full bg-gradient-to-br ${getMonogramTone(speaker.sessionGroup)} text-white flex flex-col items-center justify-center`}
                            aria-hidden="true"
                          >
                            <span className="text-xl font-black tracking-tight font-mono">
                              {getInitials(speaker.name)}
                            </span>
                            <span className="text-[9px] uppercase tracking-widest text-white/75 mt-0.5">
                              SUS · MG
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-base sm:text-lg font-black text-[#0a3641] leading-snug">
                          {speaker.name}
                        </h3>
                        <p className="text-xs font-semibold text-[#d96522] mt-0.5 leading-snug">
                          {speaker.role}
                        </p>
                        <p className="text-xs text-stone-500 mt-0.5 leading-snug">
                          {speaker.institution}
                        </p>
                      </div>
                    </div>

                    {/* Session Info Badges (Exatamente como no Painel do Gestor) */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-bold rounded-lg border ${badge.bg}`}>
                        {badge.label}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-lg bg-stone-100 text-stone-700 border border-stone-200">
                        <Clock className="w-3 h-3 text-stone-500" />
                        <span>{speaker.sessionTime || 'Horário oficial'}</span>
                      </span>
                    </div>

                    {/* Session Title / Faixa de Atividade na Grade */}
                    <div className="text-xs font-bold text-[#0a3641] mb-3 bg-stone-50 border border-stone-200/90 px-3 py-1.5 rounded-xl flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#028090] shrink-0" />
                      <span className="line-clamp-1">{speaker.sessionLabel}</span>
                    </div>

                    {/* Short Bio */}
                    {speaker.bio ? (
                      <p className="text-xs sm:text-[13px] text-stone-700 leading-relaxed whitespace-pre-line mb-4">
                        {speaker.bio}
                      </p>
                    ) : null}
                  </div>

                  {/* Social Links Footer */}
                  {Boolean(
                    speaker.socials?.instagramUrl ||
                      speaker.socials?.instagram ||
                      speaker.socials?.linkedinUrl ||
                      speaker.socials?.linkedin ||
                      speaker.socials?.lattesUrl
                  ) && (
                    <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-3">
                        {(speaker.socials?.instagramUrl || speaker.socials?.instagram) && (
                          <a
                            href={
                              speaker.socials?.instagramUrl ||
                              `https://www.instagram.com/${(speaker.socials?.instagram || '').replace(/^@/, '')}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-stone-600 hover:text-[#c13584] font-semibold transition-colors"
                            title={`Instagram de ${speaker.name}`}
                          >
                            <InstagramGlyph className="w-3.5 h-3.5 text-[#c13584]" />
                            <span className="truncate max-w-[140px]">
                              {speaker.socials?.instagram || 'Instagram'}
                            </span>
                          </a>
                        )}
                        {(speaker.socials?.linkedinUrl || speaker.socials?.linkedin) && (
                          <a
                            href={speaker.socials?.linkedinUrl || 'https://www.linkedin.com/'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-stone-600 hover:text-[#0a66c2] font-semibold transition-colors"
                            title={`LinkedIn de ${speaker.name}`}
                          >
                            <LinkedInGlyph className="w-3.5 h-3.5 text-[#0a66c2]" />
                            <span>LinkedIn</span>
                          </a>
                        )}
                        {speaker.socials?.lattesUrl && (
                          <a
                            href={speaker.socials.lattesUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-stone-600 hover:text-[#0a3641] font-semibold transition-colors"
                            title={`Currículo Lattes de ${speaker.name}`}
                          >
                            <GraduationCap className="w-3.5 h-3.5 text-[#028090]" />
                            <span>Lattes</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* Summary footer strip */}
        <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-500 pt-4 border-t border-stone-200/80">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#028090] shrink-0" />
            <span>
              Exibindo <strong className="text-[#0a3641]">{filteredSpeakers.length}</strong> de{' '}
              <strong className="text-[#0a3641]">{speakers.length}</strong> palestrantes e mediadores confirmados.
            </span>
          </div>
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 font-bold text-[#0a3641] hover:text-[#d96522] transition-colors cursor-pointer self-start sm:self-auto"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Baixar catálogo completo em PDF ({speakers.length} perfis)</span>
          </button>
        </div>
      </div>
    </section>
  );
};
