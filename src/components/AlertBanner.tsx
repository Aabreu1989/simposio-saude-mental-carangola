/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  Award,
  FileDown,
  Info,
  X,
  ChevronRight,
  Sparkles,
  Calendar
} from 'lucide-react';
import { PushNotificationItem } from '../types.ts';
import { sendBrowserNotification } from '../utils/helpers.ts';

interface AlertBannerProps {
  notifications: PushNotificationItem[];
  onOpenCertificate?: () => void;
  onOpenRegister?: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  notifications,
  onOpenCertificate,
  onOpenRegister
}) => {
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const stored = sessionStorage.getItem('sus_dismissed_alerts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [hasBrowserPermission, setHasBrowserPermission] = useState<boolean>(() => {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  });

  const [activeIdx, setActiveIdx] = useState(0);

  // Active notifications excluding dismissed ones
  const activeNotifs = notifications.filter((n) => !dismissedIds.includes(n.id));

  useEffect(() => {
    if (activeIdx >= activeNotifs.length && activeNotifs.length > 0) {
      setActiveIdx(0);
    }
  }, [activeNotifs.length, activeIdx]);

  if (activeNotifs.length === 0) {
    return null;
  }

  const current = activeNotifs[activeIdx] || activeNotifs[0];

  const handleDismiss = (id: string) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    try {
      sessionStorage.setItem('sus_dismissed_alerts', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleEnablePush = async () => {
    const granted = await sendBrowserNotification(
      'Notificações Ativadas · SUS Carangola',
      'Você receberá avisos oficiais, lembretes de programação e liberação de certificados em tempo real.'
    );
    if (granted) {
      setHasBrowserPermission(true);
    }
  };

  const handleAction = () => {
    if (current.category === 'certificado') {
      if (onOpenCertificate) {
        onOpenCertificate();
      } else {
        const el = document.querySelector('#downloads') || document.querySelector('#certificado');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (current.category === 'material') {
      const el = document.querySelector('#downloads');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      const el = document.querySelector('#programacao');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Color styles based on notification category
  const categoryStyles: Record<string, { bg: string; border: string; badge: string; icon: typeof Bell }> = {
    urgente: {
      bg: 'bg-gradient-to-r from-rose-900 via-rose-800 to-rose-950 text-white',
      border: 'border-rose-700/50',
      badge: 'bg-rose-500 text-white',
      icon: AlertTriangle
    },
    lembrete: {
      bg: 'bg-gradient-to-r from-[#d96522] via-[#ea7a38] to-[#c25516] text-white',
      border: 'border-[#ea7a38]/60',
      badge: 'bg-white/20 text-white border border-white/30',
      icon: Bell
    },
    certificado: {
      bg: 'bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-950 text-white',
      border: 'border-emerald-600/50',
      badge: 'bg-emerald-500 text-white',
      icon: Award
    },
    material: {
      bg: 'bg-gradient-to-r from-cyan-900 via-teal-900 to-sky-950 text-white',
      border: 'border-teal-600/50',
      badge: 'bg-teal-500 text-white',
      icon: FileDown
    },
    aviso: {
      bg: 'bg-gradient-to-r from-[#0a3641] via-[#103a44] to-[#062027] text-white',
      border: 'border-[#1a4f5b]/60',
      badge: 'bg-sky-500/20 text-sky-200 border border-sky-400/30',
      icon: Info
    }
  };

  const style = categoryStyles[current.category] || categoryStyles.aviso;
  const CategoryIcon = style.icon;

  return (
    <div
      role="region"
      aria-label="Alerta Oficial do Simpósio"
      className={`relative z-30 border-b shadow-sm transition-all duration-300 ${style.bg} ${style.border}`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 sm:gap-4">
          
          {/* Main message */}
          <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
              <CategoryIcon className="w-4 h-4 text-white" />
            </div>

            <div className="min-w-0 flex-1 text-xs sm:text-sm">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <span className={`text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded-full ${style.badge}`}>
                  {current.category}
                </span>
                <span className="font-bold tracking-tight text-white line-clamp-1">
                  {current.title}
                </span>
                <span className="text-[11px] text-white/70 hidden sm:inline">
                  · {new Date(current.sentAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <p className="text-white/90 text-xs leading-relaxed line-clamp-2 md:line-clamp-1">
                {current.body}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-end md:self-center shrink-0 pt-1 md:pt-0">
            {/* Contextual Action Button */}
            <button
              type="button"
              onClick={handleAction}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-[#0a3641] hover:bg-white/90 shadow-2xs transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <span>
                {current.category === 'certificado'
                  ? 'Acessar Certificados'
                  : current.category === 'material'
                    ? 'Ver Materiais'
                    : 'Ver Programação'}
              </span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Enable Web Push Button if not granted */}
            {!hasBrowserPermission && typeof window !== 'undefined' && 'Notification' in window && (
              <button
                type="button"
                onClick={handleEnablePush}
                className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer whitespace-nowrap border border-white/20"
                title="Ativar Notificações no Navegador"
              >
                <Bell className="w-3 h-3" />
                <span>Ativar Alertas</span>
              </button>
            )}

            {/* Pagination if multiple */}
            {activeNotifs.length > 1 && (
              <div className="flex items-center gap-1 text-[11px] text-white/80 font-mono px-1.5">
                <span>
                  {activeIdx + 1}/{activeNotifs.length}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveIdx((prev) => (prev + 1) % activeNotifs.length)}
                  className="p-1 rounded hover:bg-white/20 text-white cursor-pointer"
                  title="Próximo alerta"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Close / Dismiss */}
            <button
              type="button"
              onClick={() => handleDismiss(current.id)}
              className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
              title="Dispensar este aviso"
              aria-label="Dispensar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
