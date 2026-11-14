import React from 'react';
import { Phone, Mail, MapPin, LifeBuoy } from 'lucide-react';
import { EventConfig } from '../types.ts';
import { CarangolaWavesRibbon } from './VisualAssets.tsx';

interface FooterProps {
  config: EventConfig;
  onOpenAdmin?: () => void;
  onOpenCertificate?: () => void;
  onOpenRegister?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  config,
}) => {
  return (
    <footer className="relative bg-[#07242c] text-stone-300">
      {/* Sinuous Tri-Color Waves Ribbon - Compact Transition */}
      <div className="w-full overflow-hidden bg-[#faf8f5]">
        <CarangolaWavesRibbon className="w-full h-5 sm:h-7" withSkyline={false} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 lg:gap-7 items-start">
          
          {/* Brand & SUS Mission */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center gap-3.5">
              {/* Institutional SUS Logo - Prominently enlarged & visible */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-white shadow-lg border-2 border-sky-300 p-0.5 shrink-0 ring-2 ring-sky-500/30 flex items-center justify-center">
                <img
                  src="/assets/aistudio/Institutional_logo_displayed_ver__4c1d163d_2K__1__2b74545f.jpg"
                  alt="Logo Oficial SUS"
                  className="w-full h-full object-contain rounded-full"
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase tracking-wider bg-[#d96522] text-white shadow-xs">
                    SUS
                  </span>
                  <span className="text-[11px] font-mono text-[#ea7a38] font-bold">
                    Carangola / MG
                  </span>
                </div>
                <span className="text-base sm:text-lg md:text-xl font-black text-white tracking-tight leading-tight block">
                  {config.editionTitle}
                </span>
                <span className="text-xs text-stone-300 font-medium block mt-0.5">
                  Microrregião de Carangola · RAPS
                </span>
              </div>
            </div>
          </div>

          {/* Rede de Apoio à Crise */}
          <div className="lg:col-span-4 space-y-2">
            <div className="flex items-center gap-1.5">
              <LifeBuoy className="w-3.5 h-3.5 text-[#ea7a38]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                Rede de Apoio à Crise
              </h4>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                <span className="text-[10px] uppercase font-bold text-[#ea7a38] font-mono block">CAPS ij</span>
                <a
                  href="tel:03288652993"
                  className="text-white font-semibold font-mono text-[11px] hover:text-[#ea7a38] transition-colors block mt-0.5 whitespace-nowrap"
                >
                  032 8865-2993
                </a>
              </div>
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                <span className="text-[10px] uppercase font-bold text-[#ea7a38] font-mono block">CAPS ad</span>
                <a
                  href="tel:032988652992"
                  className="text-white font-semibold font-mono text-[11px] hover:text-[#ea7a38] transition-colors block mt-0.5 whitespace-nowrap"
                >
                  988652992
                </a>
              </div>
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                <span className="text-[10px] uppercase font-bold text-[#ea7a38] font-mono block">CAPS 1</span>
                <div className="space-y-0.5 mt-0.5">
                  <a
                    href="tel:03237415754"
                    className="text-white font-semibold font-mono text-[11px] hover:text-[#ea7a38] transition-colors block whitespace-nowrap"
                  >
                    3741-5754
                  </a>
                  <a
                    href="tel:032988652991"
                    className="text-stone-200 font-semibold font-mono text-[11px] hover:text-[#ea7a38] transition-colors block whitespace-nowrap"
                  >
                    988652991
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Comissão Organizadora & Painel */}
          <div className="lg:col-span-3 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
              Comissão Organizadora
            </h4>
            <div className="space-y-1.5 text-xs text-stone-400">
              <div className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#d96522] shrink-0 mt-0.5" />
                <span className="leading-snug">{config.locationAddress}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#d96522] shrink-0" />
                <span className="font-mono text-[11px] truncate">{config.contactEmail}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#d96522] shrink-0" />
                <span className="font-mono text-[11px]">{config.contactPhone}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-6 pt-4 border-t border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-stone-400">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <img
              src="/assets/aistudio/Logotipo_Municipal_de_Carangola_em_Branco_564e127a.png"
              alt="Prefeitura de Carangola"
              className="h-8 w-auto object-contain mix-blend-screen opacity-90 hover:opacity-100 transition-opacity"
            />
            <span>
              © 2026 Sistema Único de Saúde (SUS) · Prefeitura Municipal de Carangola - MG.
            </span>
          </div>
          <div className="text-[10px] font-mono text-stone-500">
            RAPS Carangola · SUS-MG
          </div>
        </div>

      </div>
    </footer>
  );
};
