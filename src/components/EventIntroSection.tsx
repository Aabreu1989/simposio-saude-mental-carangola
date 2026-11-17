import React from 'react';
import { HeartHandshake, Quote } from 'lucide-react';

export const EventIntroSection: React.FC = () => {
  return (
    <section
      id="introducao"
      aria-labelledby="introducao-titulo"
      className="py-12 sm:py-16 bg-white border-b border-stone-200/80 relative overflow-hidden"
    >
      {/* Subtle decorative radial accent */}
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#028090]/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-[#ea7a38]/5 blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="bg-[#faf8f5] rounded-3xl border border-stone-200/90 shadow-xs p-6 sm:p-10 space-y-6">
          
          {/* Section Label */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0a3641] text-[#ea7a38] flex items-center justify-center shrink-0 shadow-2xs">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#028090] block">
                Apresentação Institucional
              </span>
              <h2
                id="introducao-titulo"
                className="text-xl sm:text-2xl font-extrabold text-[#0a3641] tracking-tight"
              >
                Introdução ao Simpósio
              </h2>
            </div>
          </div>

          {/* Official Event Introduction Text */}
          <div className="space-y-4 text-sm sm:text-base text-stone-700 leading-relaxed sm:leading-loose font-normal">
            <p>
              Fortalecer a <strong className="text-[#0a3641]">Rede de Atenção Psicossocial (RAPS)</strong> é compreender que nenhum serviço cuida sozinho. Os desafios que envolvem os fluxos da rede, a relação com o Hospital Geral, os leitos de retaguarda, o Pronto-Socorro e a judicialização da saúde mental nos convocam a construir caminhos coletivos e compartilhados de cuidado.
            </p>

            <p>
              Precisamos estreitar a comunicação entre os diferentes setores, fortalecer as articulações intersetoriais, potencializar os trabalhadores e construir <strong className="text-[#0a3641]">Projetos Terapêuticos Singulares (PTS)</strong> que ultrapassem os muros dos CAPS, envolvendo os diversos dispositivos do município, os usuários, suas famílias e seus territórios.
            </p>

            <p>
              Uma rede que não apenas encaminha, mas acolhe, acompanha, compartilha responsabilidades e constrói possibilidades. Uma rede viva, que se movimenta e se fortalece nos encontros, tendo como compromisso a garantia de direitos, a autonomia e o cuidado em liberdade.
            </p>

            <p>
              Que o <strong className="text-[#0a3641]">I Simpósio de Saúde Mental de Carangola</strong> seja um espaço de encontro, troca e fortalecimento dos trabalhadores, despertando o compromisso de cada um com a construção de uma Rede viva, participativa e corresponsável, onde o cuidado se fortalece quando caminhamos juntos!
            </p>

            <p>
              Fortalecer a RAPS é compreender que nenhum serviço cuida sozinho. É na articulação, no diálogo, na corresponsabilização e na construção coletiva que fazemos da rede um território de cuidado, direitos e liberdade.
            </p>
          </div>

          {/* Coordenação do Simpósio */}
          <div className="rounded-2xl bg-white border border-stone-200/90 p-5 shadow-2xs space-y-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#028090] block">
              A Coordenação do Simpósio
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs sm:text-sm font-semibold text-[#0a3641]">
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#028090] shrink-0" />
                <span>Superintendência de Saúde Mental</span>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#ea7a38] shrink-0" />
                <span>Supervisão clínico institucional da RAPS</span>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0a3641] shrink-0" />
                <span>Secretaria Municipal de Saúde de Carangola</span>
              </div>
            </div>
          </div>

          {/* Highlighted Closing Manifesto */}
          <div className="pt-2">
            <div className="relative rounded-2xl bg-gradient-to-r from-[#0a3641] to-[#0d4654] text-white p-5 sm:p-6 shadow-sm overflow-hidden">
              <Quote className="w-8 h-8 text-[#ea7a38]/30 absolute top-3 right-4 pointer-events-none" />
              <p className="text-base sm:text-lg font-extrabold tracking-tight leading-snug text-white pr-8">
                Porque fortalecer a RAPS é construir juntos:{' '}
                <span className="text-[#ea7a38]">ninguém cuida sozinho!</span>
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
