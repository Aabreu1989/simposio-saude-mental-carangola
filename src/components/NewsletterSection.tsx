import React, { useState } from 'react';
import { Bell, Mail, CheckCircle2, Phone, Sparkles } from 'lucide-react';
import { NewsletterSubscriber } from '../types.ts';
import { sendBrowserNotification } from '../utils/helpers.ts';

interface NewsletterSectionProps {
  onSubscribe: (sub: NewsletterSubscriber) => void;
}

export const NewsletterSection: React.FC<NewsletterSectionProps> = ({ onSubscribe }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [receiveWhatsapp, setReceiveWhatsapp] = useState(true);
  const [enablePush, setEnablePush] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) return;

    const newSub: NewsletterSubscriber = {
      id: `sub-${Date.now()}`,
      email: email.trim().toLowerCase(),
      name: name.trim() || undefined,
      phone: phone.trim() || undefined,
      receiveWhatsapp,
      subscribedAt: new Date().toISOString().split('T')[0]
    };

    onSubscribe(newSub);

    if (enablePush) {
      await sendBrowserNotification(
        'Inscrição na Newsletter Confirmada!',
        'Você receberá lembretes e boletins do Simpósio de Saúde Mental de Carangola.'
      );
    }

    setIsSubscribed(true);
  };

  return (
    <section className="py-14 bg-gradient-to-b from-white to-[#faf8f5] border-b border-stone-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#0a3641] rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
          {/* Background decorative subtle circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#d96522]/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#2a9d8f]/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative space-y-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#ea7a38] font-mono">
              <Bell className="w-4 h-4 text-[#ea7a38]" />
              <span>Notificações & Lembretes Oficiais</span>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Receba Lembretes do Simpósio & Novos Editais da RAPS
              </h2>
              <p className="mt-2 text-sm text-stone-300 max-w-xl leading-relaxed">
                Cadastre seu contato para receber o aviso de abertura do credenciamento, liberação de certificados, links de transmissão e os próximos eventos de saúde mental da microrregião.
              </p>
            </div>

            {isSubscribed ? (
              <div className="p-4 bg-white/10 rounded-2xl border border-white/20 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-white">Inscrição na lista realizada com sucesso!</h4>
                  <p className="text-xs text-stone-300">
                    Você receberá os avisos em primeira mão. Verifique sua caixa de entrada e WhatsApp.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Seu Nome Completo"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 text-sm bg-white/10 border border-white/20 rounded-xl text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#ea7a38]"
                    />
                  </div>

                  <div>
                    <input
                      type="email"
                      required
                      placeholder="Seu E-mail *"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 text-sm bg-white/10 border border-white/20 rounded-xl text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#ea7a38]"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="WhatsApp (Ex: 32 99999-9999)"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-3 text-sm bg-white/10 border border-white/20 rounded-xl text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#ea7a38]"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                  <div className="flex flex-wrap items-center gap-4 text-xs text-stone-300">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={receiveWhatsapp}
                        onChange={(e) => setReceiveWhatsapp(e.target.checked)}
                        className="rounded border-white/30 text-[#ea7a38] focus:ring-[#ea7a38]"
                      />
                      <span>Receber resumo via WhatsApp</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enablePush}
                        onChange={(e) => setEnablePush(e.target.checked)}
                        className="rounded border-white/30 text-[#ea7a38] focus:ring-[#ea7a38]"
                      />
                      <span>Ativar notificações push no navegador</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-3 text-xs font-bold text-white bg-[#d96522] hover:bg-[#c25516] active:bg-[#a9460e] rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap"
                  >
                    Assinar Notificações Gratuitamente
                  </button>
                </div>
              </form>
            )}

            <div className="text-[11px] text-stone-400">
              Respeitamos sua privacidade. Seus dados serão utilizados estritamente para fins institucionais da Secretaria Municipal de Saúde de Carangola e Colegiado da RAPS.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
