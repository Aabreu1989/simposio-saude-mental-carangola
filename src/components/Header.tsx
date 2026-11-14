/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar,
  UserCheck,
  Shield,
  Menu,
  X,
  FileDown,
  Layers,
  MessageSquare,
  ArrowLeft,
  Share2,
  Award,
  Lock,
  Users
} from 'lucide-react';
import { isCertificateAvailableForPublic, CERTIFICATE_RELEASE_LABEL } from '../utils/helpers.ts';

interface HeaderProps {
  currentView: 'public' | 'admin' | 'inscricao';
  setCurrentView: (view: 'public' | 'admin' | 'inscricao') => void;
  onOpenRegister: () => void;
  editionTitle: string;
  onShare?: () => void;
  onOpenCalendar?: () => void;
  onOpenCertificate?: () => void;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  onOpenRegister,
  editionTitle,
  onShare,
  onOpenCalendar,
  onOpenCertificate,
  isMobileMenuOpen: externalMenuOpen,
  setIsMobileMenuOpen: setExternalMenuOpen
}) => {
  // Support either controlled state from parent or internal state
  const [internalMenuOpen, setInternalMenuOpen] = useState(false);
  const isMenuOpen = externalMenuOpen !== undefined ? externalMenuOpen : internalMenuOpen;
  const setMenuOpen = setExternalMenuOpen !== undefined ? setExternalMenuOpen : setInternalMenuOpen;
  const certificateAvailable = isCertificateAvailableForPublic();

  // Prevent background scrolling when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  // Close menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen, setMenuOpen]);

  const handleNavClick = (href: string) => {
    setMenuOpen(false);
    if (currentView !== 'public') {
      setCurrentView('public');
      // Allow DOM to update before smooth scrolling
      setTimeout(() => {
        const el = document.querySelector(href);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 120);
    } else {
      const el = document.querySelector(href);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleBrandClick = () => {
    setCurrentView('public');
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2 sm:gap-4 h-16 sm:h-20 lg:h-22">
            
            {/* Brand Wordmark - 100% Responsive on Mobile, Tablet & Desktop */}
            <div className="flex items-center gap-2 sm:gap-3.5 min-w-0 flex-1">
              <button
                type="button"
                onClick={handleBrandClick}
                className="text-left group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a3641] rounded-xl flex items-center gap-2 sm:gap-3.5 min-w-0"
                aria-label="Ir para página inicial do Simpósio"
              >
                {/* Institutional SUS Logo - Prominently sized & responsive */}
                <div className="w-10 h-10 xs:w-11 xs:h-11 sm:w-13 sm:h-13 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full overflow-hidden bg-white shadow-md border-2 border-sky-300/80 shrink-0 flex items-center justify-center p-0.5 group-hover:scale-105 transition-transform ring-2 ring-sky-500/20">
                  <img
                    src="/assets/aistudio/Institutional_logo_displayed_ver__4c1d163d_2K__1__2b74545f.jpg"
                    alt="Logo Oficial SUS"
                    className="w-full h-full object-contain rounded-full"
                    loading="eager"
                  />
                </div>

                {/* Title: 100% responsive, never clamped or cut off on tablet or desktop */}
                <div className="min-w-0 flex flex-col justify-center">
                  <span className="text-[9px] xs:text-[10px] sm:text-xs font-mono font-extrabold text-[#d96522] uppercase tracking-wider leading-none block mb-0.5 sm:mb-1">
                    SUS · Carangola / MG
                  </span>
                  <span className="text-xs xs:text-sm sm:text-base md:text-base lg:text-lg xl:text-xl font-black text-[#0a3641] tracking-tight leading-tight group-hover:text-[#ea7a38] transition-colors block break-words xl:whitespace-nowrap">
                    {editionTitle}
                  </span>
                  <span className="hidden sm:block text-[10px] md:text-[11px] lg:text-xs font-semibold text-stone-500 leading-none mt-0.5 truncate">
                    Microrregião de Carangola · RAPS
                  </span>
                </div>
              </button>
            </div>

            {/* Desktop Navigation Links (Visible on xl: 1280px and up so tablets never overflow) */}
            <nav className="hidden xl:flex items-center gap-1.5 p-1 bg-stone-100/90 rounded-2xl border border-stone-200/80 shadow-2xs shrink-0">
              <button
                type="button"
                onClick={() => handleNavClick('#programacao')}
                className="px-2.5 xl:px-3 py-1.5 rounded-xl font-bold text-xs xl:text-sm text-[#0a3641] hover:text-[#d96522] hover:bg-white hover:shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Calendar className="w-3.5 h-3.5 text-[#ea7a38] shrink-0" />
                <span>Programação</span>
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('#palestrantes')}
                className="px-2.5 xl:px-3 py-1.5 rounded-xl font-bold text-xs xl:text-sm text-stone-600 hover:text-[#0a3641] hover:bg-white hover:shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Users className="w-3.5 h-3.5 text-[#028090] shrink-0" />
                <span>Palestrantes</span>
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('#eixos')}
                className="px-2.5 xl:px-3 py-1.5 rounded-xl font-bold text-xs xl:text-sm text-stone-600 hover:text-[#0a3641] hover:bg-white hover:shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Layers className="w-3.5 h-3.5 text-[#028090] shrink-0" />
                <span>Eixos</span>
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('#downloads')}
                className="px-2.5 xl:px-3 py-1.5 rounded-xl font-bold text-xs xl:text-sm text-stone-600 hover:text-[#0a3641] hover:bg-white hover:shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <FileDown className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Materiais</span>
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('#mural')}
                className="px-2.5 xl:px-3 py-1.5 rounded-xl font-bold text-xs xl:text-sm text-stone-600 hover:text-[#0a3641] hover:bg-white hover:shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Mural</span>
              </button>
            </nav>

            {/* Action Zone / Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              {currentView === 'public' ? (
                <>
                  {/* Desktop & Landscape Tablet Admin Panel Button */}
                  <button
                    type="button"
                    onClick={() => setCurrentView('admin')}
                    className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#0a3641] hover:bg-[#0a3641]/5 rounded-xl border border-stone-300 transition-colors whitespace-nowrap cursor-pointer"
                    title="Acessar Painel de Controle dos Gestores do SUS"
                  >
                    <Shield className="w-3.5 h-3.5 text-[#ea7a38]" />
                    <span>Painel do Gestor</span>
                  </button>

                  {/* Registration Action: ALWAYS PRESENT ON ALL SCREENS - NEVER REMOVED */}
                  <button
                    type="button"
                    onClick={onOpenRegister}
                    className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-black text-white bg-gradient-to-r from-[#d96522] via-[#ea7a38] to-[#d96522] hover:brightness-105 active:scale-95 rounded-xl shadow-xs transition-all whitespace-nowrap cursor-pointer shrink-0"
                    title="Fazer Inscrição Gratuita no Simpósio"
                    aria-label="Fazer Inscrição Gratuita"
                  >
                    <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white shrink-0" />
                    <span className="hidden sm:inline">Inscrição Gratuita</span>
                    <span className="sm:hidden font-extrabold">Inscrição</span>
                  </button>

                  {/* Mobile & Tablet MENU Button: High contrast, dark navy, highly prominent */}
                  <button
                    type="button"
                    onClick={() => setMenuOpen(!isMenuOpen)}
                    className={`xl:hidden flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl transition-all cursor-pointer border shrink-0 text-xs font-bold active:scale-95 shadow-xs ${
                      isMenuOpen
                        ? 'bg-[#ea7a38] text-white border-[#ea7a38]'
                        : 'bg-[#0a3641] hover:bg-[#028090] text-white border-[#0a3641]'
                    }`}
                    aria-label={isMenuOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
                    aria-expanded={isMenuOpen}
                  >
                    {isMenuOpen ? (
                      <>
                        <X className="w-3.5 h-3.5 text-white shrink-0" />
                        <span className="font-black text-[10px] sm:text-[11px] tracking-wide uppercase">Fechar</span>
                      </>
                    ) : (
                      <>
                        <Menu className="w-3.5 h-3.5 text-white shrink-0" />
                        <span className="font-black text-[10px] sm:text-[11px] tracking-wide uppercase">Menu</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView('public');
                    if (window.location.hash === '#inscricao') {
                      history.pushState(null, '', window.location.pathname + window.location.search);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-[#0a3641] bg-stone-100 hover:bg-stone-200 rounded-xl transition-all whitespace-nowrap cursor-pointer border border-stone-200"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#ea7a38]" />
                  <span className="hidden sm:inline">Voltar ao Portal Completo</span>
                  <span className="sm:hidden">Ver Portal</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 
        Mobile Navigation Drawer rendered via React Portal directly into document.body.
        This guarantees the drawer is NEVER trapped inside the header's backdrop-filter containing block!
      */}
      {typeof document !== 'undefined' && isMenuOpen && createPortal(
        <div
          className="xl:hidden fixed inset-0 z-[9999] bg-stone-900/60 backdrop-blur-xs flex justify-end"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMenuOpen(false);
          }}
          role="presentation"
        >
          <div
            className="w-full max-w-[340px] xs:max-w-sm sm:max-w-[440px] md:max-w-[480px] h-dvh max-h-dvh bg-white shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200"
            role="dialog"
            aria-modal="true"
            aria-label="Menu de Navegação Principal"
          >
            {/* Drawer Top Header */}
            <div className="p-4 bg-[#0a3641] text-white flex items-center justify-between border-b-2 border-[#ea7a38] shrink-0 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-11 h-11 rounded-full bg-white overflow-hidden p-0.5 border-2 border-sky-300 shrink-0 flex items-center justify-center shadow-md">
                  <img
                    src="/assets/aistudio/Institutional_logo_displayed_ver__4c1d163d_2K__1__2b74545f.jpg"
                    alt="Logo Oficial SUS"
                    className="w-full h-full object-contain rounded-full"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold leading-tight text-white truncate">
                    Menu do Simpósio
                  </div>
                  <div className="text-[10px] text-stone-300 truncate">
                    Carangola · Zona da Mata MG
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="p-1.5 px-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold border border-white/20 shrink-0"
                aria-label="Fechar menu"
              >
                <X className="w-4 h-4" />
                <span>Fechar</span>
              </button>
            </div>

            {/* Scrollable Navigation Body */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
              
              {/* Navigation Links Grid */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-wider px-1">
                  Seções do Portal
                </div>

                <button
                  type="button"
                  onClick={() => handleNavClick('#programacao')}
                  className="w-full text-left p-2.5 sm:p-3 rounded-xl bg-stone-50 hover:bg-[#ea7a38]/10 text-stone-800 text-xs sm:text-sm font-bold flex items-center gap-3 transition-colors cursor-pointer border border-stone-200/80 hover:border-[#ea7a38]/30 group"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#ea7a38]/15 text-[#ea7a38] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-stone-900 group-hover:text-[#ea7a38] leading-snug break-words">Programação Oficial</div>
                    <div className="text-[11px] text-stone-500 font-normal leading-snug break-words">Mesas, palestras e horários</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('#palestrantes')}
                  className="w-full text-left p-2.5 sm:p-3 rounded-xl bg-stone-50 hover:bg-[#028090]/10 text-stone-800 text-xs sm:text-sm font-bold flex items-center gap-3 transition-colors cursor-pointer border border-stone-200/80 hover:border-[#028090]/30 group"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#028090]/15 text-[#028090] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-stone-900 group-hover:text-[#028090] leading-snug break-words">Palestrantes e Mediadores</div>
                    <div className="text-[11px] text-stone-500 font-normal leading-snug break-words">Mini-bios, redes sociais e PDF completo</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('#eixos')}
                  className="w-full text-left p-2.5 sm:p-3 rounded-xl bg-stone-50 hover:bg-[#028090]/10 text-stone-800 text-xs sm:text-sm font-bold flex items-center gap-3 transition-colors cursor-pointer border border-stone-200/80 hover:border-[#028090]/30 group"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#028090]/15 text-[#028090] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-stone-900 group-hover:text-[#028090] leading-snug break-words">Eixos Temáticos Estratégicos</div>
                    <div className="text-[11px] text-stone-500 font-normal leading-snug break-words">RAPS, Hospital Geral e Desafios</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('#downloads')}
                  className="w-full text-left p-2.5 sm:p-3 rounded-xl bg-stone-50 hover:bg-emerald-500/10 text-stone-800 text-xs sm:text-sm font-bold flex items-center gap-3 transition-colors cursor-pointer border border-stone-200/80 hover:border-emerald-500/30 group"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <FileDown className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-stone-900 group-hover:text-emerald-700 leading-snug break-words">Materiais & Certificados</div>
                    <div className="text-[11px] text-stone-500 font-normal leading-snug break-words">PDFs oficiais e consulta de 8h</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('#mural')}
                  className="w-full text-left p-2.5 sm:p-3 rounded-xl bg-stone-50 hover:bg-amber-500/10 text-stone-800 text-xs sm:text-sm font-bold flex items-center gap-3 transition-colors cursor-pointer border border-stone-200/80 hover:border-amber-500/30 group"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-stone-900 group-hover:text-amber-700 leading-snug break-words">Mural Comunitário</div>
                    <div className="text-[11px] text-stone-500 font-normal leading-snug break-words">Fotos e mensagens dos participantes</div>
                  </div>
                </button>

                {/* Validação de Certificado */}
                {onOpenCertificate && (
                  certificateAvailable ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenCertificate();
                      }}
                      className="w-full text-left p-2.5 sm:p-3 rounded-xl bg-stone-50 hover:bg-teal-500/10 text-stone-800 text-xs sm:text-sm font-bold flex items-center gap-3 transition-colors cursor-pointer border border-stone-200/80 hover:border-teal-500/30 group"
                    >
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-teal-500/15 text-teal-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Award className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-stone-900 group-hover:text-teal-700 leading-snug break-words">Baixar Certificado SUS</div>
                        <div className="text-[11px] text-stone-500 font-normal leading-snug break-words">Emissão e autenticidade (8 horas)</div>
                      </div>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      title={`Disponível somente após o encerramento do evento (${CERTIFICATE_RELEASE_LABEL}).`}
                      className="w-full text-left p-2.5 sm:p-3 rounded-xl bg-stone-100 text-stone-500 text-xs sm:text-sm font-bold flex items-center gap-3 border border-stone-200 cursor-not-allowed opacity-85"
                    >
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-stone-200 text-stone-500 flex items-center justify-center shrink-0">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-stone-600 leading-snug break-words">Certificado SUS (Bloqueado)</div>
                        <div className="text-[11px] text-stone-500 font-normal leading-snug break-words">Liberado em {CERTIFICATE_RELEASE_LABEL}</div>
                      </div>
                    </button>
                  )
                )}

                {/* Painel do Gestor Link */}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setCurrentView('admin');
                  }}
                  className="w-full text-left p-2.5 sm:p-3 rounded-xl bg-stone-100 hover:bg-[#0a3641]/10 text-stone-800 text-xs sm:text-sm font-bold flex items-center gap-3 transition-colors cursor-pointer border border-stone-300 group"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#0a3641] text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Shield className="w-4 h-4 text-[#ea7a38]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[#0a3641] leading-snug break-words">Painel do Gestor SUS</div>
                    <div className="text-[11px] text-stone-500 font-normal leading-snug break-words">Controle de inscritos, presença e dados</div>
                  </div>
                </button>
              </div>

              {/* Extra Utilities */}
              {(onOpenCalendar || onShare) && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {onOpenCalendar && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenCalendar();
                      }}
                      className="flex-1 min-w-[130px] p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:bg-stone-100 active:scale-95"
                    >
                      <Calendar className="w-3.5 h-3.5 text-[#028090] shrink-0" />
                      <span className="whitespace-nowrap">Salvar Agenda</span>
                    </button>
                  )}

                  {onShare && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onShare();
                      }}
                      className="flex-1 min-w-[130px] p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:bg-stone-100 active:scale-95"
                    >
                      <Share2 className="w-3.5 h-3.5 text-[#ea7a38] shrink-0" />
                      <span className="whitespace-nowrap">Divulgar</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Drawer Bottom CTA */}
            <div className="p-4 bg-stone-50 border-t border-stone-200 shrink-0 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenRegister();
                }}
                className="w-full py-3.5 px-4 text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-[#d96522] via-[#ea7a38] to-[#d96522] rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98"
              >
                <UserCheck className="w-4 h-4 text-white" />
                <span>Fazer Inscrição Gratuita</span>
              </button>

              <div className="text-center text-[10px] text-stone-500 font-medium">
                100% Gratuito · Certificado Oficial SUS de 8 Horas
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
