/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Network, Building2, Scale, ArrowRight, HeartHandshake, Compass } from 'lucide-react';
import { ThematicAxis } from '../types.ts';

interface ThematicAxesProps {
  axes: ThematicAxis[];
  onSelectAxis: (axisId: string) => void;
}

export const ThematicAxesSection: React.FC<ThematicAxesProps> = ({ axes, onSelectAxis }) => {
  const getAxisData = (number: number) => {
    switch (number) {
      case 1:
        return {
          icon: <Network className="w-5 h-5 text-teal-300" />,
          iconBg: 'bg-teal-500/20 border-teal-400/40 text-teal-300',
          accentColor: '#14b8a6',
          borderHover: 'hover:border-teal-400/70',
          badgeBg: 'bg-teal-500/20 text-teal-200 border-teal-400/30',
          buttonStyle: 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-900/40',
          numeral: '01',
          techTag: 'REDE & ATENÇÃO PRIMÁRIA',
          metric: 'Integração dos 9 Municípios'
        };
      case 2:
        return {
          icon: <Building2 className="w-5 h-5 text-amber-300" />,
          iconBg: 'bg-amber-500/20 border-amber-400/40 text-amber-300',
          accentColor: '#f59e0b',
          borderHover: 'hover:border-amber-400/70',
          badgeBg: 'bg-amber-500/20 text-amber-200 border-amber-400/30',
          buttonStyle: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/40',
          numeral: '02',
          techTag: 'URGÊNCIA & RETAGUARDA',
          metric: 'Hospital Casa de Caridade'
        };
      case 3:
        return {
          icon: <Scale className="w-5 h-5 text-purple-300" />,
          iconBg: 'bg-purple-500/20 border-purple-400/40 text-purple-300',
          accentColor: '#a855f7',
          borderHover: 'hover:border-purple-400/70',
          badgeBg: 'bg-purple-500/20 text-purple-200 border-purple-400/30',
          buttonStyle: 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/40',
          numeral: '03',
          techTag: 'DIREITOS & DESINSTITUCIONALIZAÇÃO',
          metric: 'Garantia da Lei 10.216/2001'
        };
      default:
        return {
          icon: <HeartHandshake className="w-5 h-5 text-emerald-300" />,
          iconBg: 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300',
          accentColor: '#10b981',
          borderHover: 'hover:border-emerald-400/70',
          badgeBg: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30',
          buttonStyle: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40',
          numeral: '00',
          techTag: 'SAÚDE MENTAL SUS',
          metric: 'Cuidado em Liberdade'
        };
    }
  };

  return (
    <section
      id="eixos"
      className="scroll-mt-16 py-8 sm:py-12 bg-gradient-to-b from-[#0a3641] via-[#072a33] to-[#062027] text-white relative overflow-hidden border-y-4 border-[#ea7a38]/40 shadow-inner"
    >
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-0 right-10 w-96 h-96 rounded-full bg-teal-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-96 h-96 rounded-full bg-[#ea7a38]/10 blur-[100px] pointer-events-none" />
      
      {/* Subtle Geometric Overlay */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
          backgroundSize: '28px 28px'
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Distinct Strategic Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6 sm:mb-8 border-b border-white/10 pb-5">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ea7a38] text-white text-[11px] font-mono font-bold uppercase tracking-wider mb-2.5 shadow-sm max-w-full">
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span className="leading-snug">Diretrizes Políticas & Territoriais do SUS</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
              Eixos Temáticos Estratégicos
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 max-w-2xl mt-1.5 leading-relaxed">
              Os 3 pilares de debate, diagnóstico territorial e pactuação deliberativa entre as equipes da RAPS dos 9 municípios da Microrregião de Carangola.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-teal-300 shrink-0 self-start lg:self-auto max-w-full">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse shrink-0" />
            <span className="leading-snug">3 Mesas Deliberativas com Especialistas</span>
          </div>
        </div>

        {/* 3 Prominent Pillar Cards (100% responsive on mobile, tablet, and desktop) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 xl:gap-6">
          {axes.map((axis) => {
            const data = getAxisData(axis.number);

            return (
              <div
                key={axis.id}
                className={`@container rounded-2xl p-5 sm:p-6 bg-white/[0.07] backdrop-blur-md border border-white/15 ${data.borderHover} transition-all duration-300 flex flex-col justify-between group relative overflow-hidden shadow-xl hover:shadow-2xl hover:translate-y-[-2px] min-w-0`}
              >
                {/* Large Background Numeral Watermark */}
                <div className="absolute top-2 right-4 font-black font-mono text-6xl sm:text-7xl text-white/[0.04] select-none pointer-events-none group-hover:text-white/[0.08] transition-colors">
                  {data.numeral}
                </div>

                {/* Top Glowing Color Accent Line */}
                <div
                  className="absolute top-0 left-0 right-0 h-1.5 transition-all group-hover:h-2"
                  style={{ backgroundColor: data.accentColor }}
                />

                <div className="space-y-3.5 relative z-10 min-w-0">
                  {/* Card Header: Icon Medallion + Pillar Badge */}
                  <div className="flex items-start sm:items-center gap-3 min-w-0 pr-8">
                    <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${data.iconBg} flex items-center justify-center border shadow-md shrink-0 transition-transform group-hover:scale-105`}>
                      {data.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-mono font-bold tracking-widest text-[#ea7a38] uppercase block leading-snug">
                        Pilar Estratégico {data.numeral}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-white block leading-snug break-words">
                        {data.techTag}
                      </span>
                    </div>
                  </div>

                  {/* Axis Title */}
                  <h3 className="text-base sm:text-lg font-extrabold text-white leading-snug group-hover:text-teal-200 transition-colors pt-1 break-words">
                    {axis.title}
                  </h3>

                  {/* Axis Description */}
                  <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-normal break-words">
                    {axis.description}
                  </p>
                </div>

                {/* Card Footer: Territory Focus & Direct Jump Button */}
                <div className="pt-4 mt-4 border-t border-white/10 flex flex-col @[320px]:flex-row @[320px]:items-center justify-between gap-3 relative z-10">
                  <div className="text-[11px] font-mono text-stone-400 flex items-center gap-1.5 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                    <span className="leading-snug break-words">{data.metric}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectAxis(axis.id)}
                    className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 w-full @[320px]:w-auto text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md active:scale-95 ${data.buttonStyle} shrink-0 whitespace-nowrap`}
                  >
                    <span>Ver no Programa</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform shrink-0" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

