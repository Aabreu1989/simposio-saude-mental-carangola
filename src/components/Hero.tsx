import React from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  ArrowRight,
  Network,
  Building2,
  Scale,
  Share2,
  CalendarPlus,
  Play,
  Pause
} from 'lucide-react';
import { EventConfig } from '../types.ts';

interface HeroProps {
  config: EventConfig;
  totalRegistered: number;
  onOpenRegister: () => void;
  onShare?: () => void;
  onOpenCalendar?: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  config,
  totalRegistered,
  onOpenRegister,
  onShare,
  onOpenCalendar
}) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [isVideoLoaded, setIsVideoLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const [shouldLoadVideo, setShouldLoadVideo] = React.useState(false);

  // 1. Carregamento deferido: aguarda o primeiro paint crítico da página para não competir com fontes, CSS e bundles JS
  React.useEffect(() => {
    // Respeita acessibilidade de movimento reduzido ou economia de dados móveis
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const isSaveData = typeof navigator !== 'undefined' && (navigator as unknown as { connection?: { saveData?: boolean } })?.connection?.saveData;

    if (prefersReducedMotion || isSaveData) {
      return; // Mantém a imagem estática de alta performance
    }

    // Aciona a montagem do vídeo de forma assíncrona após a thread principal estar desimpedida
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const handle = (window as unknown as { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(() => {
        setShouldLoadVideo(true);
      });
      return () => {
        if ('cancelIdleCallback' in window) {
          (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(handle);
        }
      };
    } else {
      const timer = setTimeout(() => setShouldLoadVideo(true), 120);
      return () => clearTimeout(timer);
    }
  }, []);

  // 2. IntersectionObserver: Pausa o vídeo automaticamente ao rolar a página para economizar CPU, GPU e bateria
  React.useEffect(() => {
    if (!containerRef.current || !videoRef.current || !shouldLoadVideo) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        const video = videoRef.current;
        if (!video) return;

        if (entry.isIntersecting) {
          if (isPlaying) {
            video.play().catch(() => {});
          }
        } else {
          video.pause();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [shouldLoadVideo, isPlaying]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };
  return (
    <section className="relative overflow-hidden pt-6 pb-0 bg-gradient-to-b from-[#faf5ee] via-[#faf7f2] to-[#f4eee4]">
      {/* High-Tech Background Synapse Ambient Glows */}
      <div className="absolute top-12 right-1/4 w-[480px] h-[480px] rounded-full bg-[#ea7a38]/10 blur-[90px] pointer-events-none" />
      <div className="absolute top-24 left-10 w-[420px] h-[420px] rounded-full bg-[#028090]/10 blur-[80px] pointer-events-none" />

      {/* Subtle Tech Circuit Grid lines in background */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#0a3641 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-4 sm:pt-6">
        
        {/* Main Hero Layout */}
        <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6 pb-8">
          
          {/* Selo Institucional SUS + Título acessível para leitores de tela */}
          <h1 className="sr-only">
            {config.editionTitle} {config.regionTitle} · RAPS e Saúde Pública
          </h1>
          <div className="text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0a3641]/5 border border-[#0a3641]/15 text-[#0a3641] text-xs sm:text-sm font-bold font-mono shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ea7a38] animate-pulse" />
              <span>SUS · Carangola / Minas Gerais</span>
              <span className="hidden xs:inline text-stone-300">|</span>
              <span className="hidden xs:inline text-[#028090]">Cuidado em Liberdade</span>
            </div>
          </div>

          {/* Banner Oficial em Motion Design com Fallback Estático e Carregamento Ultraleve */}
          <div className="w-full" ref={containerRef}>
            <div className="relative aspect-[1024/428] w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm border border-stone-200/90 bg-white group">
              {/* Poster instantâneo de carregamento prioritário (LCP imediato sem Cumulative Layout Shift) */}
              {(!isVideoLoaded || hasError || !shouldLoadVideo) && (
                <img
                  src={config.bannerImage || '/assets/banner-oficial-simposio-saude-mental-carangola.jpg'}
                  alt="1º Simpósio de Saúde Mental da Microrregião de Carangola"
                  className="w-full h-full object-cover object-center block"
                  loading="eager"
                  fetchPriority="high"
                />
              )}

              {/* Elemento de Vídeo HTML5 assíncrono e leve */}
              {shouldLoadVideo && !hasError && (
                <video
                  ref={videoRef}
                  src="/assets/simposio-banner-animated.mp4"
                  poster={config.bannerImage || '/assets/banner-oficial-simposio-saude-mental-carangola.jpg'}
                  autoPlay
                  loop
                  muted
                  playsInline
                  disablePictureInPicture
                  controls={false}
                  preload="metadata"
                  onLoadedData={() => setIsVideoLoaded(true)}
                  onError={() => setHasError(true)}
                  className={`w-full h-full object-cover object-center scale-[1.015] transition-opacity duration-500 ${
                    isVideoLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'
                  }`}
                  aria-label="Animação visual oficial do 1º Simpósio de Saúde Mental de Carangola"
                >
                  <source src="/assets/simposio-banner-animated.mp4" type="video/mp4" />
                  <img
                    src={config.bannerImage || '/assets/banner-oficial-simposio-saude-mental-carangola.jpg'}
                    alt="1º Simpósio de Saúde Mental da Microrregião de Carangola"
                    className="w-full h-full object-cover object-center block"
                  />
                </video>
              )}

              {/* Controles discretos e elegantes para pausar/reproduzir animação */}
              {isVideoLoaded && !hasError && (
                <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20 flex items-center gap-2 pointer-events-auto">
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-900/60 backdrop-blur-md text-white text-[11px] font-medium border border-white/10 shadow-xs pointer-events-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ea7a38] animate-pulse" />
                    Motion Design Oficial
                  </span>
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="p-2 sm:p-2.5 rounded-full bg-stone-900/70 hover:bg-stone-900/90 backdrop-blur-md text-white border border-white/20 shadow-md transition-all active:scale-95 cursor-pointer"
                    aria-label={isPlaying ? 'Pausar animação do banner' : 'Reproduzir animação do banner'}
                    title={isPlaying ? 'Pausar animação' : 'Reproduzir animação'}
                  >
                    {isPlaying ? (
                      <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                    ) : (
                      <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white fill-white ml-0.5" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tagline with thick left accent bar */}
          <div className="border-l-4 border-[#028090] pl-3.5 sm:pl-4 py-2 bg-white/70 backdrop-blur-xs rounded-r-xl border-y border-r border-stone-200/60 shadow-2xs">
            <p className="text-sm sm:text-lg text-stone-800 leading-relaxed font-medium break-words">
              "{config.subtitle}"
            </p>
          </div>

          {/* Layout Grid: Eixos Temáticos & Logistics Badges */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 pt-2">
            
            {/* Eixos Temáticos Box (Left 7 cols) */}
            <div className="md:col-span-7 bg-white/95 rounded-2xl border border-stone-200/90 shadow-sm p-4 sm:p-5 relative group hover:border-[#0a3641]/30 transition-all">
              <div className="inline-block bg-[#0a3641] text-white text-[11px] sm:text-xs font-bold px-3 py-1 rounded-lg mb-3 shadow-2xs font-sans tracking-wide">
                Eixos Temáticos Estratégicos
              </div>

              <div className="space-y-3">
                {/* Eixo 1 */}
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#e2f0f2] flex items-center justify-center shrink-0 border border-[#028090]/20 shadow-2xs mt-0.5 sm:mt-0">
                    <Network className="w-4 h-4 sm:w-5 sm:h-5 text-[#028090]" />
                  </div>
                  <div className="border-l-2 border-stone-200 pl-2.5 sm:pl-3 min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-[#0a3641] leading-snug break-words">
                      Fluxograma da RAPS
                    </div>
                    <div className="text-[11px] text-stone-500 leading-snug">Atenção Primária à Saúde & CAPS</div>
                  </div>
                </div>

                {/* Eixo 2 */}
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#faeee5] flex items-center justify-center shrink-0 border border-[#ea7a38]/20 shadow-2xs mt-0.5 sm:mt-0">
                    <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#ea7a38]" />
                  </div>
                  <div className="border-l-2 border-stone-200 pl-2.5 sm:pl-3 min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-[#0a3641] leading-snug break-words">
                      Hospital Geral, leitos de retaguarda e pronto socorro
                    </div>
                    <div className="text-[11px] text-stone-500 leading-snug">A realidade do nosso território</div>
                  </div>
                </div>

                {/* Eixo 3 */}
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#f1edf8] flex items-center justify-center shrink-0 border border-[#5a3e85]/20 shadow-2xs mt-0.5 sm:mt-0">
                    <Scale className="w-4 h-4 sm:w-5 sm:h-5 text-[#5a3e85]" />
                  </div>
                  <div className="border-l-2 border-stone-200 pl-2.5 sm:pl-3 min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-[#0a3641] leading-snug break-words">
                      Judicialização da Saúde Mental
                    </div>
                    <div className="text-[11px] text-stone-500 leading-snug">E o cuidado em liberdade</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Logistics & Capacity Badges (Right 5 cols) */}
            <div className="md:col-span-5 flex flex-col justify-between gap-2.5 sm:gap-3 min-w-0">
              
              {/* Date module */}
              <div className="@container bg-white/95 p-3 sm:p-3.5 rounded-2xl border border-stone-200/90 shadow-2xs group hover:border-[#ea7a38]/40 transition-all">
                <div className="flex flex-col @[370px]:flex-row @[370px]:items-center justify-between gap-2.5 sm:gap-3">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#fef1e8] flex items-center justify-center shrink-0 text-[#ea7a38]">
                      <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-base xl:text-lg font-black text-[#0a3641] tracking-tight leading-snug break-words">
                        {config.eventDate}
                      </div>
                      <div className="text-[11px] font-medium text-stone-500 mt-0.5 leading-snug">
                        Terça-feira · 2026
                      </div>
                    </div>
                  </div>

                  {onOpenCalendar && (
                    <button
                      type="button"
                      onClick={onOpenCalendar}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 @[370px]:px-2.5 @[370px]:py-1.5 w-full @[370px]:w-auto text-xs font-bold text-[#0a3641] bg-stone-100 hover:bg-[#ea7a38]/15 hover:text-[#d96522] rounded-xl transition-colors cursor-pointer shrink-0 border border-stone-200 whitespace-nowrap"
                      title="Adicionar o evento ao seu Google Calendar, Apple Calendar ou Outlook"
                    >
                      <CalendarPlus className="w-3.5 h-3.5 text-[#ea7a38] shrink-0" />
                      <span>Adicionar à Agenda</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Hours module */}
              <div className="bg-white/95 p-3 sm:p-3.5 rounded-2xl border border-stone-200/90 shadow-2xs flex items-center gap-2.5 sm:gap-3 group hover:border-[#028090]/40 transition-all">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#e2f0f2] flex items-center justify-center shrink-0 text-[#028090]">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-base xl:text-lg font-black text-[#0a3641] tracking-tight leading-snug break-words">
                    {config.eventHours}
                  </div>
                  <div className="text-[11px] font-medium text-stone-500 mt-0.5 leading-snug">
                    Credenciamento a partir das 7h30
                  </div>
                </div>
              </div>

              {/* Location module */}
              <div className="bg-white/95 p-3 sm:p-3.5 rounded-2xl border border-stone-200/90 shadow-2xs flex items-center gap-2.5 sm:gap-3 group hover:border-[#0a3641]/40 transition-all">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#0a3641] flex items-center justify-center shrink-0 text-white shadow-2xs">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-sm font-bold text-[#0a3641] leading-tight break-words">
                    {config.locationName}
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                    Carangola - MG
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* Action CTAs - Registration as supreme visual centerpiece */}
          <div className="pt-3 sm:pt-4 space-y-3">
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
              
              {/* PRIMARY HERO ACTION: Inscrição com máxima importância visual */}
              <button
                onClick={onOpenRegister}
                className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 sm:py-5 text-sm sm:text-base lg:text-lg font-black text-white bg-gradient-to-r from-[#d96522] via-[#ea7a38] to-[#d96522] bg-[length:200%_auto] hover:bg-right active:scale-[0.98] rounded-2xl shadow-xl shadow-[#ea7a38]/30 ring-3 sm:ring-4 ring-[#ea7a38]/30 hover:ring-[#ea7a38]/50 transition-all duration-300 cursor-pointer text-center"
                aria-label="Fazer inscrição gratuita no 1º Simpósio de Saúde Mental"
              >
                {/* Clean indicator dot */}
                <span className="flex h-2.5 w-2.5 sm:h-3 sm:w-3 relative shrink-0">
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-white" />
                </span>

                <span className="tracking-wide uppercase drop-shadow-xs whitespace-normal sm:whitespace-nowrap">
                  Garantir Inscrição Gratuita
                </span>

                <ArrowRight className="w-4 h-4 sm:w-6 sm:h-6 shrink-0 transition-transform group-hover:translate-x-1" />
              </button>

              {/* SECONDARY ACTION: Divulgar Inscrição (Requisito 5) */}
              {onShare && (
                <button
                  type="button"
                  onClick={onShare}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3.5 sm:py-4 text-xs sm:text-base font-bold text-stone-700 bg-white hover:bg-stone-50 active:scale-[0.98] rounded-2xl shadow-sm border-2 border-stone-300 hover:border-[#ea7a38] hover:text-[#0a3641] transition-all cursor-pointer text-center"
                  title="Compartilhar link de inscrição via WhatsApp, redes e QR Code"
                >
                  <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#ea7a38]" />
                  <span>Divulgar Inscrição</span>
                </button>
              )}

              {/* TERTIARY ACTION: Programa do Evento */}
              <a
                href="#programacao"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3.5 sm:py-4 text-xs sm:text-base font-bold text-[#0a3641] bg-white hover:bg-stone-50 active:scale-[0.98] rounded-2xl shadow-sm border border-[#0a3641]/25 hover:border-[#0a3641] transition-all cursor-pointer text-center"
              >
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[#028090]" />
                <span>Ver Programa Completo</span>
              </a>

            </div>

            {/* Quick trust microcopy for mobile and tablet users */}
            <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-[11px] sm:text-xs text-stone-600 font-medium pt-1">
              <span className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Vagas 100% Gratuitas
              </span>
              <span className="text-stone-300 hidden sm:inline">·</span>
              <span>Certificado Oficial SUS (8 horas)</span>
              <span className="text-stone-300 hidden sm:inline">·</span>
              <span className="text-[#0a3641]">Credenciamento com QR Code</span>
            </div>
          </div>

        </div>

      </div>

    </section>
  );
};
