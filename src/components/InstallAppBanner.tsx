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
  ChevronRight
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
      className="relative z-30 bg-gradient-to-r from-[#0a3641] via-[#0e4452] to-[#028090] text-white border-b border-[#ea7a38]/80 shadow-sm transition-all animate-in slide-in-from-top duration-300"
      aria-label="Aviso de download do WebApp Oficial"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-1.5 sm:py-2">
        <div className="flex items-center justify-between gap-2">
          
          {/* Information Block - Compacto, sem a logo */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shrink-0 text-emerald-300">
              <Smartphone className="w-3.5 h-3.5" />
            </div>

            <div className="min-w-0 flex items-center gap-2">
              <span className="text-[11px] sm:text-xs font-bold text-white tracking-tight truncate">
                Instale o App do Simpósio
              </span>

              <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                <WifiOff className="w-2.5 h-2.5 text-emerald-400" /> Acesso Offline
              </span>

              <p className="hidden md:block text-[11px] text-teal-100/80 truncate max-w-md">
                Programação, credenciamento e certificado na tela inicial.
              </p>
            </div>
          </div>

          {/* Action Zone - Compacto */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              disabled={isTriggering}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-gradient-to-r from-[#d96522] via-[#ea7a38] to-[#d96522] hover:brightness-110 active:scale-95 text-white text-[11px] sm:text-xs font-bold shadow-sm transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
              title="Instalar ou baixar o WebApp agora"
            >
              <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>{isTriggering ? 'Abrindo...' : 'Baixar App'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-1 sm:p-1.5 text-stone-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Ocultar aviso nesta sessão"
              aria-label="Ocultar aviso de download"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

        </div>
      </div>
    </aside>
  );
};
