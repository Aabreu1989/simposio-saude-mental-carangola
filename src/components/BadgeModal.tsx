import React, { useState } from 'react';
import { X, Printer, Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Registration, EventConfig } from '../types.ts';
import { BadgeCardPreview } from './BadgeCardPreview.tsx';
import { printBadgeInIframe, downloadBadgePdf } from '../utils/badgePrintGenerator.ts';

interface BadgeModalProps {
  registration: Registration | null;
  config: EventConfig;
  onClose: () => void;
}

export const BadgeModal: React.FC<BadgeModalProps> = ({
  registration,
  config,
  onClose
}) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!registration) return null;

  const handlePrint = async () => {
    setIsPrinting(true);
    setFeedback(null);
    const ok = await printBadgeInIframe(registration, config);
    setIsPrinting(false);
    if (ok) {
      setFeedback({
        type: 'success',
        message: `Crachá de ${registration.fullName} enviado para a fila de impressão.`
      });
    } else {
      setFeedback({
        type: 'error',
        message: 'Não foi possível abrir o diálogo de impressão neste navegador. Use "Baixar PDF" ao lado.'
      });
    }
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    setFeedback(null);
    try {
      const filename = await downloadBadgePdf(registration, config);
      setFeedback({
        type: 'success',
        message: `Crachá salvo em PDF (${filename})!`
      });
    } catch (err) {
      console.error('Erro ao exportar crachá em PDF:', err);
      setFeedback({
        type: 'error',
        message: 'Falha ao gerar o arquivo PDF do crachá. Tente novamente.'
      });
    } finally {
      setIsDownloadingPdf(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-4">
        {/* Header */}
        <div className="px-4 py-3 bg-[#0a3641] text-white flex items-center justify-between border-b border-[#0f4b59]">
          <div>
            <span className="text-xs font-extrabold block leading-tight">
              Crachá Oficial do Participante
            </span>
            <span className="text-[10px] text-stone-300 font-mono">
              {registration.code} · {registration.status === 'presente' ? 'Credenciado (Presente)' : 'Check-in Pendente'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Fechar crachá"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Badge Visual Surface */}
        <div className="p-4 sm:p-5 bg-stone-100/90 flex flex-col items-center gap-3">
          <BadgeCardPreview registration={registration} config={config} />

          {feedback && (
            <div
              className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#0a3641] bg-white hover:bg-stone-100 border border-stone-300 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ea7a38]" />
              ) : (
                <Download className="w-3.5 h-3.5 text-[#ea7a38]" />
              )}
              <span>Baixar PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold text-white bg-[#0a3641] hover:bg-[#0f4b59] active:scale-[0.98] rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-60"
            >
              {isPrinting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ea7a38]" />
              ) : (
                <Printer className="w-3.5 h-3.5 text-[#ea7a38]" />
              )}
              <span>{isPrinting ? 'Preparando...' : 'Imprimir Crachá'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
