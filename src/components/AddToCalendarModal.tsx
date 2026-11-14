import React from 'react';
import {
  X,
  Calendar,
  ExternalLink,
  Clock,
  MapPin,
  CalendarCheck,
  ShieldCheck
} from 'lucide-react';
import { EventConfig } from '../types.ts';
import {
  getGoogleCalendarUrl,
  getOutlookCalendarUrl,
  getYahooCalendarUrl
} from '../utils/helpers.ts';

interface AddToCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: EventConfig;
}

export const AddToCalendarModal: React.FC<AddToCalendarModalProps> = ({
  isOpen,
  onClose,
  config
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Compact Header */}
        <div className="px-4 sm:px-5 py-3 sm:py-3.5 bg-[#0a3641] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#ea7a38] text-white flex items-center justify-center shrink-0 shadow-2xs">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0 truncate">
              <h3 className="text-sm sm:text-base font-bold leading-tight truncate">
                Salvar no Calendário
              </h3>
              <p className="text-[11px] text-teal-200/80 leading-none truncate mt-0.5">
                Lembrete oficial do Simpósio de Saúde Mental
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0 ml-2"
            aria-label="Fechar janela"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 sm:space-y-4 text-stone-800">
          
          {/* Compact Event Banner Strip */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-stone-50 via-teal-50/40 to-stone-50 border border-stone-200/90 shadow-2xs space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#ea7a38] flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Simpósio SUS · Carangola</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                8 Horas · Gratuito
              </span>
            </div>

            <div className="text-xs sm:text-sm font-extrabold text-[#0a3641] leading-snug">
              {config.editionTitle} {config.regionTitle}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5 text-[11px] sm:text-xs text-stone-600">
              <div className="flex items-center gap-1.5 min-w-0">
                <Calendar className="w-3.5 h-3.5 text-[#ea7a38] shrink-0" />
                <span className="truncate"><strong>Data:</strong> {config.eventFullDate}</span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <Clock className="w-3.5 h-3.5 text-[#028090] shrink-0" />
                <span className="truncate"><strong>Horário:</strong> {config.eventHours}</span>
              </div>
              <div className="flex items-start gap-1.5 min-w-0 sm:col-span-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span className="leading-snug"><strong>Local:</strong> {config.locationName} · {config.locationAddress}</span>
              </div>
            </div>
          </div>

          {/* Quick Choice Section */}
          <div>
            <div className="text-[11px] sm:text-xs font-bold uppercase font-mono tracking-wider text-stone-500 mb-2">
              Escolha seu aplicativo de agenda:
            </div>

            {/* 2x2 Responsive Providers Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              
              {/* 1. Google Calendar */}
              <a
                href={getGoogleCalendarUrl(config)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl border border-stone-200 hover:border-blue-500 bg-white hover:bg-blue-50/40 transition-all flex items-center justify-between gap-2.5 group cursor-pointer shadow-2xs"
                title="Salvar instantaneamente no Google Agenda"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                    G
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-xs sm:text-sm font-bold text-stone-900 group-hover:text-blue-700 truncate leading-tight">
                      Google Agenda
                    </div>
                    <div className="text-[10px] text-stone-500 truncate mt-0.5">
                      Android, Gmail & Web
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-stone-400 group-hover:text-blue-600 shrink-0" />
              </a>

              {/* 2. Apple Calendar / iOS */}
              <a
                href="/simposio-saude-mental-carangola.ics"
                download="simposio-saude-mental-carangola.ics"
                className="p-3 rounded-xl border border-stone-200 hover:border-[#ea7a38] bg-white hover:bg-orange-50/40 transition-all flex items-center justify-between gap-2.5 group cursor-pointer shadow-2xs text-left"
                title="Salvar no Apple Calendar (iPhone, iPad, Mac)"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#ea7a38] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                    🍎
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-stone-900 group-hover:text-[#ea7a38] truncate leading-tight">
                      Apple Calendar
                    </div>
                    <div className="text-[10px] text-stone-500 truncate mt-0.5">
                      iPhone, iPad & Mac
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-stone-400 group-hover:text-[#ea7a38] shrink-0" />
              </a>

              {/* 3. Microsoft Outlook */}
              <a
                href={getOutlookCalendarUrl(config)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl border border-stone-200 hover:border-sky-600 bg-white hover:bg-sky-50/40 transition-all flex items-center justify-between gap-2.5 group cursor-pointer shadow-2xs"
                title="Salvar no Outlook / Microsoft 365"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#0078d4] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                    O
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-xs sm:text-sm font-bold text-stone-900 group-hover:text-[#0078d4] truncate leading-tight">
                      Outlook / 365
                    </div>
                    <div className="text-[10px] text-stone-500 truncate mt-0.5">
                      Contas Corporativas
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-stone-400 group-hover:text-[#0078d4] shrink-0" />
              </a>

              {/* 4. Yahoo Calendar */}
              <a
                href={getYahooCalendarUrl(config)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl border border-stone-200 hover:border-purple-600 bg-white hover:bg-purple-50/40 transition-all flex items-center justify-between gap-2.5 group cursor-pointer shadow-2xs"
                title="Salvar no Yahoo Agenda"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                    Y
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-xs sm:text-sm font-bold text-stone-900 group-hover:text-purple-700 truncate leading-tight">
                      Yahoo Agenda
                    </div>
                    <div className="text-[10px] text-stone-500 truncate mt-0.5">
                      Web & Celular
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-stone-400 group-hover:text-purple-600 shrink-0" />
              </a>

            </div>
          </div>

        </div>

        {/* Compact Footer */}
        <div className="px-4 sm:px-5 py-2.5 sm:py-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[10px] text-stone-500 font-mono">
            SUS Carangola · Lembretes 24h e 2h antes inclusos
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-100 rounded-lg border border-stone-300 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
