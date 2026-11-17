/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  X,
  Sparkles,
  WifiOff,
  ChevronRight,
  Info
} from 'lucide-react';

interface InstallAppBannerProps {
  onOpenInstallModal: () => void;
  deferredPrompt?: any;
  onInstallSuccess?: () => void;
}

export const InstallAppBanner: React.FC<InstallAppBannerProps> = ({
  onOpenInstallModal,
  deferredPrompt,
  onInstallSuccess
}) => {
  // Session-only dismissal: reset every time user opens / enters the platform
  const [isDismissed, setIsDismissed] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      setIsTriggering(true);
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          if (onInstallSuccess) onInstallSuccess();
          setIsDismissed(true);
        }
      } catch (err) {
        console.warn('Erro ao disparar prompt nativo:', err);
        onOpenInstallModal();
      } finally {
        setIsTriggering(false);
      }
    } else {
      // If browser has no native prompt ready (iOS Safari, Firefox, or already prompted), open guide modal
      onOpenInstallModal();
    }
  };

  if (isDismissed) {
    // When dismissed during this session, keep a sleek, persistent floating pill in bottom-right so the user never loses the option
    return (
      <div className="fixed bottom-4 right-4 z-40 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <button
          type="button"
          onClick={handleInstallClick}
          className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-gradient-to-r from-[#0a3641] to-[#028090] text-white text-xs font-bold shadow-xl border border-teal-300/40 hover:brightness-110 active:scale-95 transition-all cursor-pointer ring-2 ring-teal-500/20 group"
          title="Baixar ou instalar o WebApp do Simpósio no seu celular ou computador"
        >
          <div className="w-5 h-5 rounded-full bg-[#ea7a38] text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Download className="w-3 h-3" />
          </div>
          <span>Baixar WebApp SUS</span>
        </button>
      </div>
    );
  }

  return (
    <aside
      className="relative z-30 bg-gradient-to-r from-[#0a3641] via-[#0e4452] to-[#028090] text-white border-b-2 border-[#ea7a38] shadow-md transition-all animate-in slide-in-from-top duration-300"
      aria-label="Aviso de download do WebApp Oficial"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Information Block */}
          <div className="flex items-center gap-3 min-w-0">
            {/* App Icon / Logo */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white p-0.5 shadow-md ring-2 ring-sky-300/40 shrink-0 flex items-center justify-center">
              <img
                src="/assets/aistudio/Institutional_logo_displayed_ver__4c1d163d_2K__1__2b74545f.jpg"
                alt="Logo Simpósio SUS"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-bold bg-[#ea7a38] text-white uppercase tracking-wider font-mono">
                  <Sparkles className="w-2.5 h-2.5" /> WebApp Oficial
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-teal-200 font-semibold">
                  <WifiOff className="w-3 h-3 text-emerald-400" /> Acesso Offline
                </span>
              </div>

              <h2 className="text-xs sm:text-sm font-black text-white tracking-tight leading-snug mt-0.5 break-words">
                Baixe o WebApp no seu Celular ou Computador
              </h2>

              <p className="text-[11px] text-stone-200 line-clamp-1 sm:line-clamp-none">
                Instale para ter acesso instantâneo à programação, credenciamento e certificado direto na sua tela inicial!
              </p>
            </div>
          </div>

          {/* Action Zone */}
          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
            <button
              type="button"
              onClick={handleInstallClick}
              disabled={isTriggering}
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-[#d96522] via-[#ea7a38] to-[#d96522] hover:brightness-110 active:scale-95 text-white text-xs sm:text-xs font-black shadow-sm transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
              title="Instalar ou baixar o WebApp agora"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isTriggering ? 'Abrindo...' : 'Baixar WebApp'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenInstallModal}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold border border-white/20 transition-all cursor-pointer whitespace-nowrap"
              title="Ver instruções de instalação para iPhone, Android e Computador"
            >
              <Info className="w-3.5 h-3.5 text-teal-300" />
              <span className="hidden sm:inline">Como Instalar</span>
              <span className="sm:hidden">Instruções</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-1.5 sm:p-2 text-stone-300 hover:text-white bg-white/5 hover:bg-white/15 rounded-xl transition-colors cursor-pointer"
              title="Ocultar barra nesta sessão"
              aria-label="Ocultar aviso de download"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </aside>
  );
};
