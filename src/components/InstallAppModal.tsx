/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Download,
  Laptop,
  CheckCircle2,
  Share2,
  PlusSquare,
  MoreVertical,
  X,
  Sparkles,
  WifiOff,
  Zap,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: any;
  onInstallSuccess?: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallSuccess
}) => {
  // Device detection for automatic initial tab
  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'desktop'>('android');
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent || '';
      const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
      const isAndroid = /Android/.test(ua);
      if (isIOS) {
        setActiveTab('ios');
      } else if (isAndroid) {
        setActiveTab('android');
      } else {
        setActiveTab('desktop');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return;
    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        if (onInstallSuccess) onInstallSuccess();
        onClose();
      }
    } catch (err) {
      console.warn('Erro ao solicitar instalação nativa:', err);
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-app-title"
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto animate-in zoom-in-95 duration-200">
        
        {/* Header with official branding */}
        <div className="bg-gradient-to-r from-[#0a3641] via-[#0e4452] to-[#028090] text-white p-5 sm:p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all cursor-pointer"
            aria-label="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5 pr-8">
            <div className="w-12 h-12 rounded-2xl bg-white p-1 shadow-lg ring-2 ring-sky-300/40 shrink-0 flex items-center justify-center">
              <img
                src="/assets/aistudio/Institutional_logo_displayed_ver__4c1d163d_2K__1__2b74545f.jpg"
                alt="Logo SUS"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ea7a38] text-white uppercase tracking-wider font-mono">
                <Sparkles className="w-2.5 h-2.5" /> WebApp Oficial SUS
              </span>
              <h2 id="install-app-title" className="text-base sm:text-lg font-black tracking-tight leading-snug mt-0.5">
                Baixar WebApp no seu Aparelho
              </h2>
              <p className="text-xs text-stone-200">
                1º Simpósio de Saúde Mental da Microrregião de Carangola
              </p>
            </div>
          </div>
        </div>

        {/* Benefits Quick Bar */}
        <div className="grid grid-cols-3 divide-x divide-stone-100 bg-stone-50 border-b border-stone-200 text-center py-2.5 px-2">
          <div className="flex flex-col items-center gap-0.5">
            <WifiOff className="w-4 h-4 text-teal-600" />
            <span className="text-[10px] font-bold text-stone-700">Funciona Offline</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <Zap className="w-4 h-4 text-[#ea7a38]" />
            <span className="text-[10px] font-bold text-stone-700">Acesso Instantâneo</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-[10px] font-bold text-stone-700">Sem Ocupar Memória</span>
          </div>
        </div>

        {/* Platform Selection Tabs */}
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex rounded-2xl bg-stone-100 p-1 border border-stone-200">
            <button
              type="button"
              onClick={() => setActiveTab('android')}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'android'
                  ? 'bg-white text-[#0a3641] shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Android</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ios')}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'ios'
                  ? 'bg-white text-[#0a3641] shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-sky-600" />
              <span>iPhone / iPad</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('desktop')}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'desktop'
                  ? 'bg-white text-[#0a3641] shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Laptop className="w-3.5 h-3.5 text-[#ea7a38]" />
              <span>Computador</span>
            </button>
          </div>

          {/* Android Tab Content */}
          {activeTab === 'android' && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              {deferredPrompt && (
                <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-teal-950">Instalação Direta Pronta!</div>
                    <div className="text-[11px] text-teal-800">Seu navegador suporta instalação com 1 toque.</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleNativeInstall}
                    disabled={isInstalling}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#028090] to-[#0a3641] hover:brightness-105 active:scale-95 text-white text-xs font-black shadow-xs transition-all cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isInstalling ? 'Instalando...' : 'Instalar Agora'}</span>
                  </button>
                </div>
              )}

              <div className="space-y-2.5">
                <div className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <span>Passo a passo no Google Chrome ou Samsung Internet:</span>
                </div>

                <ol className="space-y-2.5 text-xs text-stone-700">
                  <li className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="w-5 h-5 rounded-full bg-[#0a3641] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <div className="min-w-0">
                      Toque no menu de <strong>três pontinhos verticais</strong> (<MoreVertical className="w-3.5 h-3.5 inline text-stone-800" />) no canto superior direito do seu navegador.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="w-5 h-5 rounded-full bg-[#0a3641] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <div className="min-w-0">
                      Procure e toque em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="w-5 h-5 rounded-full bg-[#0a3641] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <div className="min-w-0">
                      Confirme clicando em <strong>"Instalar"</strong>. O ícone oficial do Simpósio aparecerá direto na tela do seu celular!
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* iOS Tab Content */}
          {activeTab === 'ios' && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-sky-950">
                <p className="font-semibold">
                  No iPhone e iPad, o Safari permite adicionar o aplicativo à sua tela de início em apenas 3 passos:
                </p>
              </div>

              <ol className="space-y-2.5 text-xs text-stone-700">
                <li className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <div className="min-w-0">
                    Na barra inferior do Safari, toque no botão de <strong>Compartilhar</strong> (<Share2 className="w-3.5 h-3.5 inline text-sky-600" /> ícone do quadrado com a seta para cima).
                  </div>
                </li>
                <li className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <div className="min-w-0">
                    Role a lista de ações para baixo e toque em <strong>"Adicionar à Tela de Início"</strong> (<PlusSquare className="w-3.5 h-3.5 inline text-stone-800" />).
                  </div>
                </li>
                <li className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <div className="min-w-0">
                    Toque em <strong>"Adicionar"</strong> no canto superior direito. Pronto! O app funcionará como se fosse baixado da App Store!
                  </div>
                </li>
              </ol>
            </div>
          )}

          {/* Desktop Tab Content */}
          {activeTab === 'desktop' && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              {deferredPrompt && (
                <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-teal-950">Instalação Direta no Computador</div>
                    <div className="text-[11px] text-teal-800">Abra o app direto pelo Menu Iniciar ou Dock.</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleNativeInstall}
                    disabled={isInstalling}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#028090] to-[#0a3641] hover:brightness-105 active:scale-95 text-white text-xs font-black shadow-xs transition-all cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isInstalling ? 'Instalando...' : 'Instalar no PC'}</span>
                  </button>
                </div>
              )}

              <ol className="space-y-2.5 text-xs text-stone-700">
                <li className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="w-5 h-5 rounded-full bg-[#ea7a38] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <div className="min-w-0">
                    No Google Chrome ou Microsoft Edge, olhe para a <strong>barra de endereços</strong> no topo (ao lado da estrela de favoritos).
                  </div>
                </li>
                <li className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="w-5 h-5 rounded-full bg-[#ea7a38] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <div className="min-w-0">
                    Clique no ícone de <strong>instalação</strong> (ícone de computador com seta para baixo ou símbolo <strong>[+]</strong>).
                  </div>
                </li>
                <li className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="w-5 h-5 rounded-full bg-[#ea7a38] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <div className="min-w-0">
                    Clique em <strong>"Instalar"</strong>. O Simpósio abrirá em uma janela própria dedicada, sem abas de navegador.
                  </div>
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
          <div className="text-[11px] text-stone-500 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Compatível com Android, iOS, Windows e Mac.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#0a3641] hover:bg-[#028090] text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Entendi
          </button>
        </div>

      </div>
    </div>
  );
};
