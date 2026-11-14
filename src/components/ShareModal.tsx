import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  QrCode,
  MessageCircle,
  Send,
  Linkedin,
  Twitter,
  Smartphone,
  ExternalLink,
  Instagram
} from 'lucide-react';
import { EventConfig } from '../types.ts';
import { getShareContent } from '../utils/helpers.ts';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: EventConfig;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  config
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedInstagram, setCopiedInstagram] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);

  if (!isOpen) return null;

  const shareData = getShareContent(config);

  const handleShareInstagram = async () => {
    try {
      await navigator.clipboard.writeText(
        `🧠 1º Simpósio de Saúde Mental da Microrregião de Carangola - SUS\nData: ${config.eventDate} de 2026 às 08h30\n📍 ${config.locationName} · Certificado 8h Gratuito\n\nGaranta sua inscrição pelo link:\n${shareData.shareUrl}`
      );
      setCopiedInstagram(true);
      setTimeout(() => setCopiedInstagram(false), 3000);
    } catch {
      setCopiedInstagram(true);
      setTimeout(() => setCopiedInstagram(false), 3000);
    }
    window.open('https://www.instagram.com/', '_blank');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareData.shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(shareData.message);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    } catch {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareData.title,
          text: `${config.editionTitle} ${config.regionTitle} - ${config.subtitle}`,
          url: shareData.shareUrl
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#0a3641] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#ea7a38] text-white flex items-center justify-center shadow-xs">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-none">
                Divulgar Inscrição no Simpósio
              </h3>
              <p className="text-xs text-stone-300 mt-1">
                Compartilhe com as equipes de saúde e grupos da região
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          
          {/* Quick Copy Link Box */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider font-mono">
              Link Direto para Inscrição:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareData.shareUrl}
                className="w-full px-3 py-2 text-xs font-mono bg-stone-50 border border-stone-300 rounded-xl select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 shadow-2xs ${
                  copiedLink
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#ea7a38] hover:bg-[#d96522] text-white'
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Link</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-stone-500">
              Ao abrir este link, o participante entra direto no formulário oficial de inscrição (sem passar pelo site todo).
            </p>
          </div>

          {/* Social Share Buttons Grid */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-stone-700 uppercase tracking-wider font-mono">
              Compartilhar Diretamente:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* WhatsApp Button */}
              <a
                href={shareData.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-300 hover:bg-emerald-100/80 text-emerald-900 font-bold text-xs transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <span>Grupos de WhatsApp</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
              </a>

              {/* Instagram Button */}
              <button
                type="button"
                onClick={handleShareInstagram}
                className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-pink-50 via-purple-50 to-amber-50 border border-pink-300 hover:border-pink-400 text-stone-900 font-bold text-xs transition-all cursor-pointer group text-left"
                title="Copiar texto de divulgação e abrir o Instagram para compartilhar nos Stories ou Direct"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Instagram className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate">Instagram (Stories / Direct)</div>
                    <div className="text-[10px] text-pink-700 font-medium truncate">
                      {copiedInstagram ? '✓ Link copiado para colar!' : 'Copia link e abre Instagram'}
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-pink-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>

              {/* Native Mobile Share */}
              {'share' in navigator && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="flex items-center justify-between p-3 rounded-xl bg-teal-50 border border-teal-300 hover:bg-teal-100/80 text-teal-900 font-bold text-xs transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#028090] text-white flex items-center justify-center shrink-0">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <span>Compartilhar no Celular</span>
                  </div>
                  <Share2 className="w-3.5 h-3.5 text-[#028090] group-hover:scale-110 transition-transform" />
                </button>
              )}

              {/* Telegram */}
              <a
                href={shareData.telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-sky-50 border border-sky-300 hover:bg-sky-100/80 text-sky-900 font-bold text-xs transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center shrink-0">
                    <Send className="w-3.5 h-3.5" />
                  </div>
                  <span>Telegram</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-sky-600 group-hover:translate-x-0.5 transition-transform" />
              </a>

              {/* LinkedIn */}
              <a
                href={shareData.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-300 hover:bg-blue-100/80 text-blue-900 font-bold text-xs transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0">
                    <Linkedin className="w-3.5 h-3.5" />
                  </div>
                  <span>LinkedIn</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
              </a>

              {/* X / Twitter */}
              <a
                href={shareData.twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-stone-100 border border-stone-300 hover:bg-stone-200 text-stone-900 font-bold text-xs transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center shrink-0">
                    <Twitter className="w-3.5 h-3.5" />
                  </div>
                  <span>X / Twitter</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-stone-600 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
          </div>

          {/* Pre-written Invitation Text for Health Units & Teams */}
          <div className="space-y-2 pt-1 border-t border-stone-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700 uppercase tracking-wider font-mono">
                Texto Pronto para Grupos de WhatsApp:
              </span>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#ea7a38] hover:text-[#d96522] cursor-pointer"
              >
                {copiedText ? (
                  <span className="text-emerald-600 flex items-center gap-1 font-bold">
                    <Check className="w-3 h-3" /> Texto copiado!
                  </span>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copiar Mensagem
                  </>
                )}
              </button>
            </div>

            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 leading-relaxed font-sans whitespace-pre-line max-h-36 overflow-y-auto">
              {shareData.message}
            </div>
          </div>

          {/* QR Code Toggle */}
          <div className="pt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setShowQrCode(!showQrCode)}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-[#0a3641] bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-[#ea7a38]" />
              <span>{showQrCode ? 'Ocultar QR Code' : 'Exibir QR Code para Apresentação ou Cartaz'}</span>
            </button>

            {showQrCode && (
              <div className="mt-3 p-4 bg-stone-50 border border-stone-200 rounded-2xl flex flex-col items-center text-center space-y-2 animate-fade-in">
                <div className="p-3 bg-white rounded-xl shadow-xs border border-stone-200">
                  {/* Generated QR Code SVG */}
                  <div className="w-44 h-44 flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-full h-full text-[#0a3641]">
                      {/* Stylized QR pattern */}
                      <rect width="100" height="100" fill="#ffffff" rx="4" />
                      {/* Corners */}
                      <rect x="8" y="8" width="24" height="24" fill="#0a3641" rx="3" />
                      <rect x="12" y="12" width="16" height="16" fill="#ffffff" rx="2" />
                      <rect x="16" y="16" width="8" height="8" fill="#ea7a38" />

                      <rect x="68" y="8" width="24" height="24" fill="#0a3641" rx="3" />
                      <rect x="72" y="12" width="16" height="16" fill="#ffffff" rx="2" />
                      <rect x="76" y="16" width="8" height="8" fill="#ea7a38" />

                      <rect x="8" y="68" width="24" height="24" fill="#0a3641" rx="3" />
                      <rect x="12" y="72" width="16" height="16" fill="#ffffff" rx="2" />
                      <rect x="16" y="76" width="8" height="8" fill="#ea7a38" />

                      {/* Random aesthetic data points */}
                      <rect x="36" y="12" width="6" height="6" fill="#0a3641" />
                      <rect x="46" y="12" width="6" height="6" fill="#0a3641" />
                      <rect x="56" y="12" width="6" height="6" fill="#0a3641" />
                      <rect x="36" y="24" width="6" height="6" fill="#0a3641" />
                      <rect x="48" y="20" width="8" height="8" fill="#0a3641" />
                      <rect x="40" y="36" width="20" height="20" fill="#ea7a38" rx="2" />
                      <circle cx="50" cy="46" r="4" fill="#ffffff" />
                      <rect x="12" y="44" width="6" height="6" fill="#0a3641" />
                      <rect x="22" y="44" width="6" height="6" fill="#0a3641" />
                      <rect x="16" y="54" width="8" height="6" fill="#0a3641" />
                      <rect x="68" y="38" width="6" height="6" fill="#0a3641" />
                      <rect x="78" y="38" width="6" height="6" fill="#0a3641" />
                      <rect x="74" y="48" width="8" height="8" fill="#0a3641" />
                      <rect x="86" y="48" width="6" height="6" fill="#0a3641" />
                      <rect x="38" y="68" width="6" height="6" fill="#0a3641" />
                      <rect x="48" y="68" width="6" height="6" fill="#0a3641" />
                      <rect x="58" y="68" width="6" height="6" fill="#0a3641" />
                      <rect x="42" y="78" width="8" height="8" fill="#0a3641" />
                      <rect x="54" y="80" width="6" height="6" fill="#0a3641" />
                      <rect x="68" y="68" width="8" height="8" fill="#0a3641" />
                      <rect x="80" y="72" width="6" height="6" fill="#0a3641" />
                      <rect x="72" y="80" width="8" height="8" fill="#0a3641" />
                      <rect x="84" y="84" width="6" height="6" fill="#0a3641" />
                    </svg>
                  </div>
                </div>
                <div className="text-[11px] text-stone-500 max-w-xs">
                  Aponte a câmera do celular para este QR Code para abrir o formulário de inscrição diretamente.
                </div>
              </div>
            )}
          </div>

          {/* Close button */}
          <div className="pt-2">
            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
            >
              Concluir
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
