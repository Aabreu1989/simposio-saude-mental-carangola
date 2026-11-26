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

        {/* Hierarquia Institucional: Realização, Apoio e Parceiro */}
        <div className="mt-6 pt-5 border-t border-stone-800/80 space-y-5">
          {/* Nível 1: Realização */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3.5 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="bg-white rounded-xl px-2.5 py-1.5 shadow-sm shrink-0 inline-flex items-center justify-center">
                  <img
                    src="/assets/logo-saude-mental-carangola.png"
                    alt="Saúde Mental de Carangola - Superintendência de Saúde Mental"
                    loading="lazy"
                    className="h-14 sm:h-16 w-auto object-contain"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#ea7a38] font-mono block">
                    Realização
                  </span>
                  <h4 className="text-sm sm:text-base font-extrabold text-white tracking-tight mt-0.5">
                    Superintendência de Saúde Mental de Carangola
                  </h4>
                </div>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-stone-400 font-mono sm:self-end">
                Serviços da RAPS
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
              <div className="bg-[#07242c] rounded-xl px-2 py-1.5 border border-white/10 flex flex-col items-center justify-center gap-1 min-h-[76px] md:h-20">
                <img
                  src="/assets/logo-caps-1.jpg"
                  alt="CAPS 1 - Centro de Atenção Psicossocial I Livre Mente"
                  loading="lazy"
                  className="h-9 sm:h-10 w-auto max-w-full object-contain rounded-md"
                />
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-stone-200 text-center leading-tight">
                  CAPS 1
                </span>
              </div>

              <div className="bg-[#07242c] rounded-xl px-2 py-1.5 border border-white/10 flex flex-col items-center justify-center gap-1 min-h-[76px] md:h-20">
                <img
                  src="/assets/logo-ceco-carangola.png"
                  alt="Centro de Convivência e Cultura de Carangola"
                  loading="lazy"
                  className="h-9 sm:h-10 w-auto max-w-full object-contain rounded-md"
                />
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-stone-200 text-center leading-tight">
                  Centro de Convivência e Cultura de Carangola
                </span>
              </div>

              <div className="bg-[#07242c] rounded-xl px-2 py-1.5 border border-white/10 flex flex-col items-center justify-center gap-1 min-h-[76px] md:h-20">
                <img
                  src="/assets/logo-caps-ij.png"
                  alt="CAPS Infanto Juvenil Tucurupi"
                  loading="lazy"
                  className="h-9 sm:h-10 w-auto max-w-full object-contain rounded-md"
                />
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-stone-200 text-center leading-tight">
                  CAPS Infanto Juvenil
                </span>
              </div>

              <div className="bg-[#07242c] rounded-xl px-2 py-1.5 border border-white/10 flex flex-col items-center justify-center gap-1 min-h-[76px] md:h-20">
                <div className="h-9 sm:h-10 w-full flex items-center justify-center">
                  <div className="bg-white rounded-md px-2 py-0.5 inline-flex items-center justify-center max-w-full max-h-full">
                    <img
                      src="/assets/logo-caps-ad-ataru.png"
                      alt="CAPS AD Ataru - Centro de Atenção Psicossocial Álcool e Outras Drogas"
                      loading="lazy"
                      className="h-8 sm:h-9 w-auto max-w-full object-contain"
                    />
                  </div>
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-stone-200 text-center leading-tight">
                  CAPS AD Ataru
                </span>
              </div>
            </div>
          </div>

          {/* Nível 2 (Apoio) e Nível 3 (Parceiro) */}
          <div>
            <div className="md:hidden mb-2.5 text-center sm:text-left">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-300 font-mono">
                Apoio
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 font-mono">
                {' '}· Parceiro
              </span>
            </div>

            <div className="hidden md:grid md:grid-cols-4 gap-3 mb-2.5">
              <h4 className="md:col-span-3 text-[11px] font-bold uppercase tracking-wider text-teal-300 font-mono">
                Apoio
              </h4>
              <h4 className="md:col-span-1 md:border-l md:border-stone-800/80 md:pl-3 text-[11px] font-bold uppercase tracking-wider text-stone-400 font-mono">
                Parceiro
              </h4>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
              <div className="bg-[#07242c] rounded-xl px-2 py-1.5 border border-white/10 flex flex-col items-center justify-center gap-1 min-h-[82px] md:h-20">
                <img
                  src="/assets/aistudio/Logotipo_Municipal_de_Carangola_em_Branco_564e127a.png"
                  alt="Prefeitura Municipal de Carangola"
                  loading="lazy"
                  className="h-9 sm:h-10 w-auto max-w-full object-contain mix-blend-screen"
                />
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-stone-200 text-center leading-tight">
                  Prefeitura Municipal de Carangola
                </span>
              </div>

              <div className="bg-[#07242c] rounded-xl px-2 py-1.5 border border-white/10 flex flex-col items-center justify-center gap-1 min-h-[82px] md:h-20">
                <div className="h-9 sm:h-10 w-full flex items-center justify-center">
                  <div className="bg-white rounded-md px-2 py-1 inline-flex items-center justify-center max-w-full max-h-full">
                    <img
                      src="/assets/logo-secretaria-saude-carangola.jpg"
                      alt="Secretaria Municipal de Saúde de Carangola - SUS"
                      loading="lazy"
                      className="h-7 sm:h-8 w-auto max-w-full object-contain"
                    />
                  </div>
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-stone-200 text-center leading-tight">
                  Secretaria de Saúde de Carangola
                </span>
              </div>

              <div className="bg-[#07242c] rounded-xl px-2 py-1.5 border border-white/10 flex flex-col items-center justify-center gap-1 min-h-[82px] md:h-20">
                <div className="h-9 sm:h-10 w-full flex items-center justify-center">
                  <div className="bg-white rounded-md px-2 py-1 inline-flex items-center justify-center max-w-full max-h-full">
                    <img
                      src="/assets/logo-camara-carangola.png"
                      alt="Câmara Municipal de Carangola - Poder Legislativo"
                      loading="lazy"
                      className="h-7 sm:h-8 w-auto max-w-full object-contain"
                    />
                  </div>
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-stone-200 text-center leading-tight">
                  Câmara Municipal de Carangola
                </span>
              </div>

              <div className="flex md:border-l md:border-stone-800/80 md:pl-3">
                <div className="w-full bg-[#07242c] rounded-xl px-2 py-1.5 border border-white/10 flex flex-col items-center justify-center gap-1 min-h-[82px] md:h-20">
                  <span className="md:hidden text-[8px] font-bold uppercase tracking-widest text-[#ea7a38] font-mono leading-none">
                    Parceiro
                  </span>
                  <div className="h-9 sm:h-10 w-full flex items-center justify-center">
                    <div className="bg-white rounded-md px-2 py-1 inline-flex items-center justify-center max-w-full max-h-full">
                      <img
                        src="/assets/logo-unicafes-de-origem.png"
                        alt="Café de Origem - UNICAFES MG"
                        loading="lazy"
                        className="h-7 sm:h-8 w-auto max-w-full object-contain"
                      />
                    </div>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-stone-200 text-center leading-tight">
                    Café de Origem
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-6 pt-4 border-t border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-stone-400">
          <span className="text-center sm:text-left">
            © 2026 Sistema Único de Saúde (SUS) · Prefeitura Municipal de Carangola - MG.
          </span>

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
