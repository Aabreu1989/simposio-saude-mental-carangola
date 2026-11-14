/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Zap,
  Key,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  ExternalLink,
  Code2,
  Copy,
  Check,
  Server
} from 'lucide-react';
import {
  getEmailJsConfig,
  saveEmailJsConfig,
  isEmailJsConfigured,
  sendEmailViaEmailJs,
  EmailJsTemplateParams
} from '../services/emailJsService.ts';
import {
  getAppBaseUrl,
  getServerEmailStatus,
  ServerEmailStatus
} from '../services/confirmationEmailService.ts';
import { EventConfig } from '../types.ts';

interface EmailJsSettingsCardProps {
  isDarkMode?: boolean;
  eventConfig?: EventConfig;
  onUpdateConfig?: (newConfig: EventConfig) => void;
}

export const EmailJsSettingsCard: React.FC<EmailJsSettingsCardProps> = ({
  isDarkMode = false,
  eventConfig,
  onUpdateConfig
}) => {
  const [config, setConfig] = useState(() => getEmailJsConfig(eventConfig));
  const [isSaved, setIsSaved] = useState(false);
  const [testEmail, setTestEmail] = useState('amandasabreu89@gmail.com');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<ServerEmailStatus | null>(null);

  useEffect(() => {
    if (eventConfig?.emailJsConfig) {
      setConfig(getEmailJsConfig(eventConfig));
    }
  }, [eventConfig?.emailJsConfig]);

  useEffect(() => {
    getServerEmailStatus().then(setServerStatus).catch(() => {});
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveEmailJsConfig(config);
    if (eventConfig && onUpdateConfig) {
      onUpdateConfig({
        ...eventConfig,
        emailJsConfig: config
      });
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleSendTest = async () => {
    if (!testEmail) return;
    setIsTesting(true);
    setTestResult(null);

    const baseUrl = getAppBaseUrl();
    const scheduleUrl = `${baseUrl}/#programacao`;
    const certificateUrl = `${baseUrl}/#certificado?code=SM-CAR-2026-TESTE`;

    const sampleParams: EmailJsTemplateParams = {
      to_name: 'Participante de Teste',
      to_email: testEmail.trim(),
      participant_code: 'SM-CAR-2026-TESTE',
      registration_code: 'SM-CAR-2026-TESTE',
      certificate_code: 'SM-CAR-2026-TESTE',
      event_program: '07h30 Credenciamento | 08h00 Café com acolhimento | 08h30 Abertura oficial | 09h30 Mesa 1 (Med. Camila Lima) | 13h00 Mesa 2 (Med. Raquel Pinheiro) | 14h45 Mesa 3 (Med. Christine Vianna) | 16h00 Encerramento',
      schedule_link: scheduleUrl,
      certificate_link: certificateUrl,
      certificate_instructions: `Valide sua presença no dia 08/12 na UEMG Carangola e baixe o certificado de 8 horas no link ${certificateUrl} usando o seu número de participante SM-CAR-2026-TESTE.`,
      event_title: eventConfig?.editionTitle || '1º Simpósio de Saúde Mental',
      event_date: eventConfig?.eventFullDate || '08 de Dezembro de 2026',
      event_location: eventConfig?.locationName || 'UEMG Carangola - Praça Cel. Maximiano, 180',
      event_hours: eventConfig?.eventHours || '07h30 às 16h30',
      participant_role: 'Profissional da Atenção Primária',
      participant_city: 'Carangola',
      participant_institution: 'Secretaria Municipal de Saúde',
      sus_care_level: 'Atenção Primária / RAPS',
      subject: 'Teste de Confirmação de Inscrição [Nº SM-CAR-2026-TESTE] · SUS Carangola',
      message_html: `<div style="font-family: sans-serif; padding: 20px;"><h2>Inscrição Confirmada</h2><p>Número de Participante (mesmo do Certificado): <strong>SM-CAR-2026-TESTE</strong></p><p><strong>Programa:</strong> 07h30 Credenciamento | 08h00 Café com acolhimento | 08h30 Abertura oficial | 09h30 Mesa 1 | 13h00 Mesa 2 | 14h45 Mesa 3 | 16h00 Encerramento</p><p><a href="${scheduleUrl}">Acessar Programa Oficial</a></p><p><a href="${certificateUrl}">Baixar Certificado</a></p></div>`,
      message_text: `Inscrição Confirmada\nNúmero de Participante (mesmo do Certificado): SM-CAR-2026-TESTE\nPrograma: ${scheduleUrl}\nCertificado: ${certificateUrl}`
    };

    try {
      const res = await sendEmailViaEmailJs(sampleParams, config, eventConfig);
      if (res.success) {
        setTestResult({
          success: true,
          message: `E-mail de teste enviado com sucesso via ${res.provider}! Verifique a caixa postal ${testEmail}.`
        });
      } else {
        const backendRes = await fetch('/api/email/confirm-registration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: testEmail.trim(),
            fullName: 'Participante de Teste',
            code: 'SM-CAR-2026-TESTE',
            subject: sampleParams.subject,
            bodyHtml: sampleParams.message_html,
            bodyText: sampleParams.message_text,
            scheduleUrl,
            certificateUrl,
            programSummary: sampleParams.event_program
          })
        });

        const backendData = backendRes.ok ? await backendRes.json() : null;
        if (backendData?.actuallySent) {
          setTestResult({
            success: true,
            message: `Enviado com sucesso via servidor (${backendData.deliveryProvider === 'resend' ? 'Resend API' : 'SMTP'}) para ${testEmail}!`
          });
        } else {
          setTestResult({
            success: false,
            message: `Nenhum provedor real de e-mail entregou a mensagem ainda. Cadastre as chaves do EmailJS acima (e salve) ou defina RESEND_API_KEY / SMTP_HOST nas variáveis de ambiente do servidor.`
          });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult({ success: false, message: `Erro ao enviar teste: ${msg}` });
    } finally {
      setIsTesting(false);
    }
  };

  const copyTemplateVar = (v: string) => {
    navigator.clipboard.writeText(`{{${v}}}`);
    setCopiedVar(v);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  const isEmailJsActive = isEmailJsConfigured({
    ...(eventConfig || ({} as EventConfig)),
    emailJsConfig: config
  });
  const hasAnyRealDelivery = isEmailJsActive || Boolean(serverStatus?.hasRealServerDelivery);

  return (
    <div className={`rounded-2xl border p-5 sm:p-6 transition-all ${
      isDarkMode ? 'bg-[#0b242c] border-[#133540] text-stone-200' : 'bg-white border-stone-200 text-stone-900 shadow-xs'
    }`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 mb-5 border-stone-200 dark:border-[#133540]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ea7a38] to-[#d96522] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-[#0a3641] dark:text-white">
                Integração de E-mail Automático (EmailJS / Servidor)
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                hasAnyRealDelivery
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {isEmailJsActive
                  ? '● EmailJS Conectado (Sincronizado)'
                  : serverStatus?.hasRealServerDelivery
                  ? `● Servidor ${serverStatus.activeProvider.toUpperCase()} Ativo`
                  : '● Aguardando Credenciais Reais'}
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Dispara automaticamente o e-mail de confirmação contendo o <strong>programa completo do evento</strong> e o <strong>número de participante</strong> (o mesmo usado para baixar o certificado). Salvar aqui sincroniza via Firebase para todos os inscritos.
            </p>
          </div>
        </div>

        <a
          href="https://www.emailjs.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-[#028090] hover:text-[#0a3641] font-semibold underline self-start sm:self-center shrink-0"
        >
          <span>Painel EmailJS</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Server Delivery Status Pill */}
      <div className={`mb-4 p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
        hasAnyRealDelivery
          ? isDarkMode
            ? 'bg-emerald-950/30 border-emerald-800 text-emerald-200'
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          : isDarkMode
          ? 'bg-amber-950/30 border-amber-800 text-amber-200'
          : 'bg-amber-50 border-amber-200 text-amber-900'
      }`}>
        <Server className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          {hasAnyRealDelivery ? (
            <span>
              <strong>Entrega em caixa de entrada ativa:</strong>{' '}
              {isEmailJsActive
                ? 'Novas inscrições disparam o e-mail real via EmailJS diretamente ao participante.'
                : `Novas inscrições disparam o e-mail real via servidor (${serverStatus?.activeProvider.toUpperCase()}).`}
            </span>
          ) : (
            <span>
              <strong>Importante para entrega real na caixa de entrada:</strong> Para que os inscritos recebam o e-mail automaticamente na caixa de entrada, preencha abaixo o <em>Service ID</em>, <em>Template ID</em> e <em>Public Key</em> da sua conta EmailJS gratuita (ou configure <code className="font-mono">SMTP_USER</code>/<code className="font-mono">SMTP_PASS</code> ou <code className="font-mono">RESEND_API_KEY</code> nas variáveis do servidor).
            </span>
          )}
        </div>
      </div>

      {/* Form Credentials */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1 font-mono">
              Service ID *
            </label>
            <input
              type="text"
              required
              value={config.serviceId}
              onChange={(e) => setConfig({ ...config, serviceId: e.target.value })}
              placeholder="Ex: service_sus_carangola"
              className="w-full px-3 py-2 text-xs font-mono bg-stone-50 dark:bg-[#102b35] border border-stone-300 dark:border-[#1a414e] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3641]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1 font-mono">
              Template ID *
            </label>
            <input
              type="text"
              required
              value={config.templateId}
              onChange={(e) => setConfig({ ...config, templateId: e.target.value })}
              placeholder="Ex: template_inscricao_sus"
              className="w-full px-3 py-2 text-xs font-mono bg-stone-50 dark:bg-[#102b35] border border-stone-300 dark:border-[#1a414e] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3641]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1 font-mono">
              Public Key (User ID) *
            </label>
            <input
              type="text"
              required
              value={config.publicKey}
              onChange={(e) => setConfig({ ...config, publicKey: e.target.value })}
              placeholder="Ex: user_xyz123abc"
              className="w-full px-3 py-2 text-xs font-mono bg-stone-50 dark:bg-[#102b35] border border-stone-300 dark:border-[#1a414e] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3641]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold select-none">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              className="w-4 h-4 rounded text-[#d96522] focus:ring-[#d96522] border-stone-300"
            />
            <span>Ativar disparo de confirmações via EmailJS em novas inscrições</span>
          </label>

          <div className="flex items-center gap-2">
            {isSaved && (
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Configurações Salvas!
              </span>
            )}
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-[#0a3641] hover:bg-[#028090] rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              Salvar Credenciais
            </button>
          </div>
        </div>
      </form>

      {/* Live Test Sender */}
      <div className="mt-5 pt-4 border-t border-stone-200 dark:border-[#133540] bg-stone-50/70 dark:bg-[#102b35]/40 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 p-5 sm:p-6 rounded-b-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-[#ea7a38]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 font-mono">
              Testar Envio com Modelo Oficial
            </h4>
          </div>
          <span className="text-[11px] text-stone-500">
            Envia um exemplo com o código de teste <code className="bg-stone-200 dark:bg-stone-800 px-1 py-0.5 rounded font-mono font-bold">SM-CAR-2026-TESTE</code>
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="Digite o e-mail de destino do teste..."
            className="flex-1 px-3 py-2 text-xs bg-white dark:bg-[#0b242c] border border-stone-300 dark:border-[#1a414e] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3641]"
          />
          <button
            type="button"
            onClick={handleSendTest}
            disabled={isTesting}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#d96522] hover:bg-[#c25516] rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isTesting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Transmitindo...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Disparar E-mail de Teste</span>
              </>
            )}
          </button>
        </div>

        {testResult && (
          <div className={`mt-3 p-3 rounded-lg text-xs flex items-start gap-2 border ${
            testResult.success
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
          }`}>
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{testResult.message}</span>
          </div>
        )}

        {/* Template Variables Quick Reference */}
        <div className="mt-4 pt-3 border-t border-stone-200/80 dark:border-[#133540]">
          <div className="text-[11px] font-mono text-stone-500 dark:text-stone-400 mb-2 font-bold uppercase">
            Tags disponíveis no seu template EmailJS (clique para copiar):
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              'participant_code',
              'schedule_link',
              'certificate_link',
              'certificate_instructions',
              'to_name',
              'to_email',
              'event_title',
              'event_date',
              'event_location',
              'message_html'
            ].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => copyTemplateVar(v)}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-[#0b242c] hover:bg-stone-100 dark:hover:bg-[#163b46] border border-stone-300 dark:border-[#1a414e] rounded text-[11px] font-mono text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
                title="Clique para copiar a variável"
              >
                <span>{`{{${v}}}`}</span>
                {copiedVar === v ? (
                  <Check className="w-2.5 h-2.5 text-emerald-600" />
                ) : (
                  <Copy className="w-2.5 h-2.5 text-stone-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
