import React from 'react';
import { MapPin, Navigation, ExternalLink, Building2, Clock } from 'lucide-react';

const EVENT_LOCATION = {
  name: 'UEMG Carangola — Unidade Carangola',
  subtitle: 'Local Oficial do 1º Simpósio de Saúde Mental da Microrregião de Carangola',
  address: 'Praça Cel. Maximiano, 180 - Centro, Carangola - MG, 36800-000',
  reference: 'Centro · Próximo à Praça da Matriz · Carangola / MG',
  hours: '08 de Dezembro de 2026 · Credenciamento às 07h30 (Evento das 07h30 às 16h30)',
  mapsSearchUrl:
    'https://www.google.com/maps/search/?api=1&query=UEMG+Carangola+Pra%C3%A7a+Cel.+Maximiano+180+Centro+Carangola+MG',
  directionsUrl:
    'https://www.google.com/maps/dir/?api=1&destination=UEMG+Carangola+Pra%C3%A7a+Cel.+Maximiano+180+Carangola+MG'
};

export const EventLocationMap: React.FC = () => {
  return (
    <section id="mapa-territorial" className="py-6 sm:py-8 bg-white border-t border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-stone-200/90 bg-gradient-to-br from-[#faf8f5] via-white to-[#f0f7f7] p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-[#0a3641] text-[#ea7a38] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="space-y-1.5 min-w-0">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-[#028090]">
                <Building2 className="w-3.5 h-3.5" />
                <span>Local Presencial do Simpósio</span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#0a3641] tracking-tight">
                {EVENT_LOCATION.name}
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-stone-700">
                {EVENT_LOCATION.address}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-[11px] sm:text-xs text-stone-500">
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#ea7a38]" />
                  {EVENT_LOCATION.hours}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <a
              href={EVENT_LOCATION.mapsSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#0a3641]/20 bg-white hover:bg-stone-50 text-[#0a3641] text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <MapPin className="w-4 h-4 text-[#028090]" />
              <span>Ver no Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>

            <a
              href={EVENT_LOCATION.directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0a3641] hover:bg-[#0f4b59] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Navigation className="w-4 h-4 text-[#ea7a38]" />
              <span>Traçar Rota no Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
