import React from 'react';
import { MapPin, LifeBuoy, Smartphone } from 'lucide-react';
import { EventConfig } from '../types.ts';
import { CarangolaWavesRibbon } from './VisualAssets.tsx';

interface FooterProps {
  config: EventConfig;
  onOpenAdmin?: () => void;
  onOpenCertificate?: () => void;
  onOpenRegister?: () => void;
  onOpenInstallApp?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  config,
  onOpenInstallApp,
}) => {
  return (
    <footer className="relative bg-[#07242c] text-stone-300">
      {/* Sinuous Tri-Color Waves Ribbon - Compact Transition */}
      <div className="w-full overflow-hidden bg-[#faf8f5]">
        <CarangolaWavesRibbon className="w-full h-5 sm:h-7" withSkyline={false} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 lg:gap-7 items-start">
          
          {/* Event Identity */}
          <div className="lg:col-span-5 space-y-1.5">
            <span className="text-base sm:text-lg md:text-xl font-black text-white tracking-tight leading-tight block">
              {config.editionTitle}
            </span>
            <span className="text-xs text-stone-300 font-medium block">
              Microrregião de Carangola · RAPS
            </span>
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

          {/* Coordenação do Simpósio */}
          <div className="lg:col-span-3 space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
              Coordenação do Simpósio
            </h4>
            <div className="space-y-1 text-xs text-stone-200">
              <p className="font-semibold text-white">Superintendência de Saúde Mental</p>
              <p className="font-semibold text-white">Supervisão clínico institucional da RAPS</p>
              <p className="font-semibold text-white">Secretaria Municipal de Saúde de Carangola</p>
            </div>
            <div className="pt-1.5 space-y-1 text-xs text-stone-400">
              <div className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#d96522] shrink-0 mt-0.5" />
                <span className="leading-snug">{config.locationAddress}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Apoio Institucional e Serviços da RAPS */}
        <div className="mt-6 pt-5 border-t border-stone-800/80">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-300 font-mono mb-3 text-center sm:text-left">
            APOIO:
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            <div className="bg-[#07242c] rounded-xl p-2 border border-white/10 flex flex-col items-center justify-center gap-1">
              <img
                src="/assets/logo-caps-1.jpg"
                alt="CAPS 1 - Centro de Atenção Psicossocial I Livre Mente"
                loading="lazy"
                className="h-10 sm:h-12 w-auto max-w-full object-contain rounded-md"
              />
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-stone-200 text-center leading-tight">
                CAPS 1
              </span>
            </div>

            <div className="bg-[#07242c] rounded-xl p-2 border border-white/10 flex flex-col items-center justify-center gap-1">
              <img
                src="/assets/logo-ceco-carangola.png"
                alt="Centro de Convivência e Cultura de Carangola"
                loading="lazy"
                className="h-10 sm:h-12 w-auto max-w-full object-contain rounded-md"
              />
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-stone-200 text-center leading-tight">
                Centro de Convivência e Cultura de Carangola
              </span>
            </div>

            <div className="bg-[#07242c] rounded-xl p-2 border border-white/10 flex flex-col items-center justify-center gap-1">
              <img
                src="/assets/logo-caps-ij.png"
                alt="CAPS Infanto Juvenil Tucurupi"
                loading="lazy"
                className="h-10 sm:h-12 w-auto max-w-full object-contain rounded-md"
              />
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-stone-200 text-center leading-tight">
                CAPS Infanto Juvenil
              </span>
            </div>

            <div className="bg-[#07242c] rounded-xl p-2 border border-white/10 flex flex-col items-center justify-center gap-1">
              <div className="h-10 sm:h-12 w-full flex items-center justify-center">
                <div className="bg-white rounded-md px-2 py-1 inline-flex items-center justify-center max-w-full max-h-full">
                  <img
                    src="/assets/logo-camara-carangola.png"
                    alt="Câmara Municipal de Carangola - Poder Legislativo"
                    loading="lazy"
                    className="h-8 sm:h-10 w-auto max-w-full object-contain"
                  />
                </div>
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-stone-200 text-center leading-tight">
                Câmara Municipal de Carangola
              </span>
            </div>

            <div className="bg-[#07242c] rounded-xl p-2 border border-white/10 flex flex-col items-center justify-center gap-1">
              <div className="h-10 sm:h-12 w-full flex items-center justify-center">
                <div className="bg-white rounded-md px-2 py-1 inline-flex items-center justify-center max-w-full max-h-full">
                  <img
                    src="/assets/logo-secretaria-saude-carangola.jpg"
                    alt="Secretaria Municipal de Saúde de Carangola - SUS"
                    loading="lazy"
                    className="h-8 sm:h-10 w-auto max-w-full object-contain"
                  />
                </div>
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-stone-200 text-center leading-tight">
                Secretaria Municipal de Saúde de Carangola
              </span>
            </div>

            <div className="bg-[#07242c] rounded-xl p-2 border border-white/10 flex flex-col items-center justify-center gap-1">
              <div className="h-10 sm:h-12 w-full flex items-center justify-center">
                <div className="bg-white rounded-md px-2 py-1 inline-flex items-center justify-center max-w-full max-h-full">
                  <img
                    src="/assets/logo-unicafes-de-origem.png"
                    alt="UNICAFES MG - de origem"
                    loading="lazy"
                    className="h-8 sm:h-10 w-auto max-w-full object-contain"
                  />
                </div>
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-stone-200 text-center leading-tight">
                UNICAFES MG · de origem
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-6 pt-4 border-t border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-stone-400">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <img
              src="/assets/aistudio/Logotipo_Municipal_de_Carangola_em_Branco_564e127a.png"
              alt="Prefeitura de Carangola"
              className="h-14 sm:h-16 md:h-20 w-auto object-contain mix-blend-screen opacity-100 hover:scale-105 transition-transform shrink-0"
            />
            <span>
              © 2026 Sistema Único de Saúde (SUS) · Prefeitura Municipal de Carangola - MG.
            </span>
          </div>

          {onOpenInstallApp && (
            <button
              type="button"
              onClick={onOpenInstallApp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-teal-200 hover:text-white transition-colors cursor-pointer text-xs font-semibold border border-white/10"
              title="Baixar ou instalar o WebApp no celular ou computador"
            >
              <Smartphone className="w-3.5 h-3.5 text-teal-400" />
              <span>Baixar WebApp (PWA)</span>
            </button>
          )}
        </div>

      </div>
    </footer>
  );
};
