/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Registration, EventConfig, ScheduleSession } from '../types.ts';

export type EmailDispatchStatus =
  | 'accepted_by_smtp'
  | 'pending_config'
  | 'failed';

export interface ConfirmationEmailResult {
  success: boolean;
  actuallyDelivered: boolean;
  emailStatus: EmailDispatchStatus;
  errorCode?: string;
  code: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  sentAt: string;
  deliveryMethod: 'smtp' | 'pending_provider';
  deliveryDetail?: string;
  serverReceiptId?: string;
  scheduleUrl: string;
  certificateUrl: string;
}

export interface ServerEmailStatus {
  smtpConfigured: boolean;
  firebaseAdminConfigured?: boolean;
  activeProvider: 'smtp' | 'none';
  hasRealServerDelivery: boolean;
  senderConfigured?: boolean;
}

export async function getServerEmailStatus(): Promise<ServerEmailStatus> {
  try {
    const res = await fetch('/api/email/status');
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch {
    // ignore
  }
  return {
    smtpConfigured: false,
    firebaseAdminConfigured: false,
    activeProvider: 'none',
    hasRealServerDelivery: false
  };
}

/**
 * Helper to get the canonical base origin URL
 */
export function getAppBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://ais-dev-fih2e463fasdfa7qlgxt77-81375963937.europe-west2.run.app';
}

/**
 * Builds the comprehensive HTML and plain-text confirmation email containing:
 * 1. Participant Number / Registration Code (used for Certificate Download)
 * 2. Direct Link to full event schedule & interactive schedule table
 * 3. Step-by-step certificate issuance instructions & direct download link
 * 4. Venue & logistics (UEMG Carangola)
 */
export function buildRegistrationConfirmationEmail(
  reg: Registration,
  schedule: ScheduleSession[],
  config: EventConfig
): {
  subject: string;
  bodyText: string;
  bodyHtml: string;
  scheduleUrl: string;
  certificateUrl: string;
} {
  const eventTitle = config.editionTitle || '1º Simpósio de Saúde Mental';
  const regionTitle = config.regionTitle || 'da Microrregião de Carangola';
  const eventDate = config.eventDate || '08 de Dezembro';
  const eventFullDate = config.eventFullDate || `${eventDate} de 2026`;
  const eventHours = config.eventHours || '7h30 às 16h30';
  const locationName = config.locationName || 'UEMG Carangola';
  const locationAddress = config.locationAddress || 'Praça Cel. Maximiano, 180 - Centro, Carangola - MG, 36800-000';

  const baseUrl = getAppBaseUrl();
  const scheduleUrl = `${baseUrl}/#programacao`;
  const certificateUrl = `${baseUrl}/#certificado?code=${encodeURIComponent(reg.code)}`;

  const subject = `Inscrição Confirmada [Nº ${reg.code}] · ${eventTitle} ${regionTitle} - SUS`;

  // Format schedule items for plain text and HTML
  const scheduleTextList = schedule
    .map(
      (s) =>
        `• ${s.timeStart} às ${s.timeEnd}: ${s.title}\n  Local: ${s.location}${s.mediator ? ` | Mediadora: ${s.mediator.name}` : ''}${s.speakers?.length ? ` | Palestrantes: ${s.speakers.map((sp) => sp.name).join(', ')}` : ''}`
    )
    .join('\n\n');

  const scheduleHtmlList = schedule
    .map((s) => {
      const isAbertura = s.type === 'abertura' || s.type === 'credenciamento';
      const isPlenaria = s.type === 'plenaria';
      const badgeBg = isAbertura ? '#0a3641' : isPlenaria ? '#d96522' : '#028090';

      return `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 10px; vertical-align: top; width: 110px; font-family: 'Courier New', monospace; font-size: 13px; font-weight: 700; color: #0a3641; white-space: nowrap;">
          <span style="background-color: #f1f5f9; padding: 4px 8px; border-radius: 6px; border: 1px solid #cbd5e1; display: inline-block;">
            ${s.timeStart} - ${s.timeEnd}
          </span>
        </td>
        <td style="padding: 12px 10px; vertical-align: top;">
          <div style="font-size: 14px; font-weight: 800; color: #0a3641; line-height: 1.3; margin-bottom: 4px;">
            ${s.title}
          </div>
          <div style="font-size: 12px; color: #64748b; line-height: 1.4; margin-bottom: 4px;">
            ${s.description}
          </div>
          <div style="font-size: 11px; color: #0f172a;">
            <strong style="color: #475569;">Local:</strong> ${s.location}
            ${
              s.mediator
                ? `<br/><strong style="color: #028090;">Mediação:</strong> <strong>${s.mediator.name}</strong> (${s.mediator.role})`
                : ''
            }
            ${
              s.speakers && s.speakers.length > 0
                ? `<br/><strong style="color: #475569;">Participantes / Palestrantes:</strong> ${s.speakers.map((sp) => `<strong>${sp.name}</strong> (${sp.role} - ${sp.institution})`).join('; ')}`
                : ''
            }
          </div>
        </td>
      </tr>
    `;
    })
    .join('');

  // Plain Text Version
  const bodyText = `
======================================================================
1º SIMPÓSIO DE SAÚDE MENTAL DA MICRORREGIÃO DE CARANGOLA · SUS/MG
COMPROVANTE OFICIAL DE INSCRIÇÃO CONFIRMADA
======================================================================

Olá, ${reg.fullName}!

Sua inscrição para o ${eventTitle} ${regionTitle} foi CONFIRMADA com sucesso no sistema oficial da Secretaria Municipal de Saúde de Carangola e Colegiado Gestor da RAPS.

----------------------------------------------------------------------
SEU NÚMERO DE PARTICIPANTE (MESMO CÓDIGO PARA BAIXAR O CERTIFICADO):
>>>  ${reg.code}  <<<
----------------------------------------------------------------------
IMPORTANTE: Guarde este número com atenção!
Este número de participante (${reg.code}) é a sua identificação oficial no credenciamento E o MESMO NÚMERO utilizado para emitir e baixar o seu CERTIFICADO OFICIAL DE 8 HORAS no portal após o encerramento do evento.

======================================================================
LINKS OFICIAIS DE ACESSO RÁPIDO:
======================================================================
📅 LINK DO CRONOGRAMA COMPLETO E ATUALIZADO:
${scheduleUrl}

🎓 LINK DIRETO PARA EMISSÃO / DOWNLOAD DO CERTIFICADO:
${certificateUrl}

DADOS DA SUA INSCRIÇÃO:
• Nome Completo: ${reg.fullName}
• CPF: ${reg.cpf}
• Categoria Profissional: ${reg.professionalRole}
• Nível de Atenção no SUS: ${reg.susCareLevel || 'Atenção Primária / RAPS'}
• Município de Atuação: ${reg.city}
• Instituição / Lotação: ${reg.institution}
• Eixo Temático Escolhido: ${reg.axisInterest || 'Geral / Todos os Eixos'}
• Data de Inscrição: ${reg.registeredAt ? new Date(reg.registeredAt).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}

LOCAL E LOGÍSTICA DO EVENTO:
• Data: ${eventFullDate} · Horário: ${eventHours}
• Horário de Início do Credenciamento: Pontualmente às 07h30
• Carga Horária Certificada: ${config.certificateWorkload || 8} Horas presenciais (Certificado Gratuito emitido pelo SUS)
• Local: ${locationName}
• Endereço: ${locationAddress}

======================================================================
PROGRAMA COMPLETO OFICIAL DO EVENTO (7h30 às 16h30)
======================================================================

${scheduleTextList}

======================================================================
INSTRUÇÕES PARA DOWNLOAD DO CERTIFICADO OFICIAL (8 HORAS)
======================================================================
1. No dia do evento (${eventFullDate}), compareça à ${locationName} a partir das 07h30 para realização do credenciamento e retirada de seu crachá.
2. A presença será validada eletronicamente pelos monitores e coordenadores do SUS.
3. Após o encerramento oficial do evento (${eventFullDate} após as 16h30), acesse o portal pelo link:
   ${certificateUrl}
4. Ou acesse a página inicial do simpósio e clique em "Baixar Certificado".
5. Informe o seu NÚMERO DE PARTICIPANTE (${reg.code}) — o mesmo código recebido neste e-mail — ou o seu CPF (${reg.cpf}).
6. O seu certificado oficial em PDF de 8 horas, autenticado com selo digital e QR-Code do SUS, estará disponível para impressão e download.

Se tiver qualquer dúvida, entre em contato com a equipe organizadora através do e-mail oficial: farmaciademinas.marketing@gmail.com

Atenciosamente,
Comissão Organizadora do 1º Simpósio de Saúde Mental
Secretaria Municipal de Saúde de Carangola
Colegiado Gestor da RAPS - Microrregião de Carangola / SUS-MG
`.trim();

  // Polished Responsive HTML Version
  const bodyHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; padding: 24px 12px;">
    <tr>
      <td align="center">
        
        <!-- Main Card Container -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 660px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #0a3641; padding: 28px 24px; text-align: center; border-bottom: 4px solid #ea7a38;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <span style="display: inline-block; padding: 4px 12px; background-color: #d96522; color: #ffffff; font-family: monospace; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; border-radius: 6px; margin-bottom: 10px;">
                      SUS · Microrregião de Carangola / MG
                    </span>
                    <h1 style="color: #ffffff; margin: 4px 0 0 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px; line-height: 1.2;">
                      ${eventTitle}
                    </h1>
                    <div style="color: #ea7a38; font-size: 14px; font-weight: 700; margin-top: 4px;">
                      ${regionTitle}
                    </div>
                    <div style="color: #94a3b8; font-size: 12px; margin-top: 6px;">
                      Comprovante Oficial de Confirmação de Vaga
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Welcome Message -->
          <tr>
            <td style="padding: 24px 24px 12px 24px;">
              <p style="font-size: 16px; color: #0f172a; margin: 0 0 12px 0;">
                Olá, <strong>${reg.fullName}</strong>!
              </p>
              <p style="font-size: 14px; color: #334155; margin: 0 0 16px 0; line-height: 1.6;">
                Sua inscrição para o <strong>${eventTitle}</strong> foi confirmada com sucesso no sistema oficial da Secretaria Municipal de Saúde de Carangola e Colegiado Gestor da RAPS.
              </p>
            </td>
          </tr>

          <!-- PROMINENT PARTICIPANT NUMBER BOX (Key Requirement) -->
          <tr>
            <td style="padding: 0 24px 20px 24px;">
              <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 2px dashed #0a3641; border-radius: 14px; padding: 22px; text-align: center;">
                <span style="font-family: monospace; font-size: 11px; text-transform: uppercase; color: #d96522; font-weight: 900; letter-spacing: 2px; display: block; margin-bottom: 6px;">
                  SEU NÚMERO DE PARTICIPANTE (MESMO CÓDIGO DO CERTIFICADO)
                </span>
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 900; color: #0a3641; letter-spacing: 3px; padding: 8px 0; text-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                  ${reg.code}
                </div>
                <div style="margin-top: 10px; padding: 10px 14px; background-color: #ffffff; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px; color: #334155; line-height: 1.5; text-align: left;">
                  <strong style="color: #0a3641;">📌 Guarde este código — ele tem dupla função oficial:</strong><br/>
                  1. <strong>Credenciamento Presencial:</strong> Apresente o número <strong>${reg.code}</strong> na portaria em ${eventFullDate} a partir das 07h30 na ${locationName}.<br/>
                  2. <strong>Mesmo Número para Baixar o Certificado (8 Horas):</strong> Utilize exatamente este número <strong>${reg.code}</strong> no portal após o encerramento do evento para baixar seu certificado autenticado pelo SUS.
                </div>
              </div>
            </td>
          </tr>

          <!-- INTERACTIVE ACTION BUTTONS: SCHEDULE LINK & CERTIFICATE LINK (User Requirement) -->
          <tr>
            <td style="padding: 0 24px 20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 16px;">
                <tr>
                  <td>
                    <div style="font-size: 12px; font-weight: 800; color: #0a3641; text-transform: uppercase; font-family: monospace; letter-spacing: 1px; margin-bottom: 10px;">
                      Acesso Rápido aos Módulos Online
                    </div>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="padding-bottom: 8px;">
                          <a href="${scheduleUrl}" target="_blank" style="display: block; background-color: #028090; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 12px 18px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            📅 Acessar Cronograma Completo e Palestrantes
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td align="center">
                          <a href="${certificateUrl}" target="_blank" style="display: block; background-color: #d96522; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 12px 18px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            🎓 Acessar Emissão do Certificado Oficial (SUS)
                          </a>
                        </td>
                      </tr>
                    </table>
                    <div style="font-size: 11px; color: #64748b; text-align: center; margin-top: 8px;">
                      Link direto do cronograma: <a href="${scheduleUrl}" style="color: #028090;">${scheduleUrl}</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Participant Summary Table -->
          <tr>
            <td style="padding: 0 24px 24px 24px;">
              <div style="background-color: #fafaf9; border-radius: 12px; padding: 18px; border: 1px solid #e7e5e4;">
                <div style="font-size: 12px; font-weight: 800; color: #0a3641; text-transform: uppercase; font-family: monospace; letter-spacing: 1px; margin-bottom: 12px; border-bottom: 1px solid #e7e5e4; padding-bottom: 6px;">
                  Resumo dos Dados Cadastrados
                </div>
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px; line-height: 1.6;">
                  <tr>
                    <td style="padding: 4px 0; color: #64748b; width: 40%;">Participante:</td>
                    <td style="padding: 4px 0; color: #0f172a; font-weight: 700;">${reg.fullName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #64748b;">CPF:</td>
                    <td style="padding: 4px 0; color: #0f172a; font-family: monospace; font-weight: 700;">${reg.cpf}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #64748b;">Função / Categoria:</td>
                    <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${reg.professionalRole}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #64748b;">Nível no SUS / Vínculo:</td>
                    <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${reg.susCareLevel || 'Atenção Primária / RAPS'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #64748b;">Município:</td>
                    <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${reg.city}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #64748b;">Instituição:</td>
                    <td style="padding: 4px 0; color: #0f172a;">${reg.institution}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #64748b;">Eixo de Interesse:</td>
                    <td style="padding: 4px 0; color: #0a3641; font-weight: 600;">${reg.axisInterest || 'Todos os Eixos'}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Date & Location Card -->
          <tr>
            <td style="padding: 0 24px 24px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #e2f0f2; border-radius: 12px; border: 1px solid #bce1e5; padding: 16px;">
                <tr>
                  <td>
                    <div style="font-size: 13px; font-weight: 800; color: #0a3641; margin-bottom: 6px;">
                      📍 Informações de Local e Data
                    </div>
                    <div style="font-size: 13px; color: #0a3641; line-height: 1.5;">
                      <strong>Data:</strong> ${eventFullDate} · Horário: ${eventHours}<br/>
                      <strong>Local:</strong> ${locationName}<br/>
                      <strong>Endereço:</strong> ${locationAddress}<br/>
                      <strong>Carga Horária:</strong> ${config.certificateWorkload || 8} Horas presenciais (Certificado Gratuito SUS)
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FULL EVENT PROGRAM / SCHEDULE (Key Requirement) -->
          <tr>
            <td style="padding: 0 24px 24px 24px;">
              <div style="border: 1px solid #cbd5e1; border-radius: 14px; overflow: hidden;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0a3641; color: #ffffff;">
                  <tr>
                    <td style="padding: 14px 18px;">
                      <div style="font-family: monospace; font-size: 11px; text-transform: uppercase; color: #ea7a38; font-weight: 800; letter-spacing: 1px;">
                        Grade Completa do Simpósio (7h30 às 16h30)
                      </div>
                      <h3 style="margin: 4px 0 0 0; font-size: 16px; font-weight: 900; color: #ffffff;">
                        Programa Oficial do Evento
                      </h3>
                    </td>
                  </tr>
                </table>

                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">
                  ${scheduleHtmlList}
                </table>
              </div>
            </td>
          </tr>

          <!-- HOW TO DOWNLOAD CERTIFICATE INSTRUCTIONS (Key Requirement) -->
          <tr>
            <td style="padding: 0 24px 24px 24px;">
              <div style="background-color: #fef8ee; border: 1px solid #fae1b9; border-radius: 12px; padding: 18px;">
                <div style="font-size: 13px; font-weight: 800; color: #b45309; margin-bottom: 8px;">
                  🎓 Como Baixar seu Certificado Oficial de 8 Horas
                </div>
                <ol style="margin: 0; padding-left: 20px; font-size: 12px; color: #78350f; line-height: 1.7;">
                  <li>Compareça ao simpósio no dia <strong>${eventFullDate}</strong> e valide sua presença no credenciamento a partir das 07h30.</li>
                  <li>Após o encerramento do evento (${eventFullDate} após as 16h30), acesse o portal pelo link: <a href="${certificateUrl}" style="color: #b45309; font-weight: 700; text-decoration: underline;">${certificateUrl}</a></li>
                  <li>Ou clique no botão <strong>"Baixar Certificado"</strong> na página inicial do portal.</li>
                  <li>Informe o seu <strong>Número de Participante (${reg.code})</strong> — o mesmo código deste comprovante — ou o seu <strong>CPF (${reg.cpf})</strong>.</li>
                  <li>O seu certificado digital oficial de 8 horas, autenticado pelo SUS e com QR-Code de validação, será gerado em PDF para impressão e download.</li>
                </ol>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; line-height: 1.5;">
              <p style="margin: 0 0 6px 0; font-weight: 700; color: #334155;">
                Prefeitura Municipal de Carangola · Secretaria Municipal de Saúde
              </p>
              <p style="margin: 0 0 10px 0;">
                Colegiado Gestor da Rede de Atenção Psicossocial (RAPS) · Microrregião de Carangola / SUS-MG
              </p>
              <p style="margin: 0; font-size: 10px; color: #94a3b8;">
                Dúvidas ou alterações cadastrais: <a href="mailto:farmaciademinas.marketing@gmail.com" style="color: #028090; text-decoration: underline;">farmaciademinas.marketing@gmail.com</a>
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `.trim();

  return { subject, bodyText, bodyHtml, scheduleUrl, certificateUrl };
}

/**
 * Sends the official registration confirmation email strictly via the serverless
 * Gmail SMTP provider (/api/email/confirm-registration).
 * Sends only the registration identifiers; the server validates the registration
 * and retrieves the recipient address directly from the trusted Firestore record.
 */
export async function sendRegistrationConfirmationEmail(
  reg: Registration,
  schedule: ScheduleSession[],
  config: EventConfig,
  options?: { resend?: boolean }
): Promise<ConfirmationEmailResult> {
  const { subject, bodyText, bodyHtml, scheduleUrl, certificateUrl } = buildRegistrationConfirmationEmail(reg, schedule, config);
  const recipientEmail = reg.email.trim().toLowerCase();
  const recipientName = reg.fullName.trim();
  const sentAt = new Date().toISOString();

  let deliveryMethod: ConfirmationEmailResult['deliveryMethod'] = 'pending_provider';
  let actuallyDelivered = false;
  let emailStatus: EmailDispatchStatus = 'failed';
  let errorCode: string | undefined = undefined;
  let deliveryDetail: string | undefined = undefined;
  let serverReceiptId: string | undefined = undefined;

  try {
    const serverResponse = await fetch('/api/email/confirm-registration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: reg.code,
        registrationId: reg.id,
        resend: Boolean(options?.resend)
      })
    });

    const contentType = serverResponse.headers.get('content-type') || '';
    const serverData = contentType.includes('application/json')
      ? await serverResponse.json().catch(() => null)
      : null;

    if (!contentType.includes('application/json')) {
      emailStatus = 'failed';
      errorCode = 'INVALID_SERVER_RESPONSE';
      deliveryDetail = 'A rota /api/email/confirm-registration não respondeu em formato JSON.';
    } else if (serverResponse.ok && serverData?.actuallySent === true) {
      actuallyDelivered = true;
      emailStatus = 'accepted_by_smtp';
      deliveryMethod = 'smtp';
      serverReceiptId = serverData?.messageId;
      deliveryDetail =
        serverData?.message ||
        'E-mail de confirmação aceito para envio pelo servidor Gmail SMTP.';
    } else {
      errorCode = serverData?.errorCode;
      emailStatus =
        serverResponse.status === 503 || serverData?.emailStatus === 'pending_config'
          ? 'pending_config'
          : 'failed';
      deliveryMethod = 'pending_provider';
      deliveryDetail =
        serverData?.error ||
        serverData?.message ||
        `Servidor de e-mail retornou status ${serverResponse.status}.`;
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    emailStatus = 'failed';
    errorCode = 'NETWORK_ERROR';
    deliveryMethod = 'pending_provider';
    deliveryDetail = `Falha de conexão com o servidor de e-mail: ${errorMsg}`;
  }

  const result: ConfirmationEmailResult = {
    success: actuallyDelivered,
    actuallyDelivered,
    emailStatus,
    errorCode,
    code: reg.code,
    recipientEmail,
    recipientName,
    subject,
    bodyText,
    bodyHtml,
    sentAt,
    deliveryMethod,
    deliveryDetail,
    serverReceiptId,
    scheduleUrl,
    certificateUrl
  };

  // Store in local confirmation history so manager and participant can inspect
  try {
    const existing = localStorage.getItem('sus_sent_confirmation_emails');
    const list: ConfirmationEmailResult[] = existing ? JSON.parse(existing) : [];
    list.unshift(result);
    localStorage.setItem('sus_sent_confirmation_emails', JSON.stringify(list.slice(0, 50)));
  } catch {
    // ignore storage failures
  }

  return result;
}

export interface BroadcastEmailResult {
  success: boolean;
  deliveryProvider: string;
  successfulSends: number;
  failedSends: number;
  totalRecipients: number;
  message: string;
  deliveryError?: string;
}

/**
 * Dispatches a broadcast email to multiple recipients via server (Resend/SMTP)
 */
export async function sendBroadcastEmailToAttendees(
  recipients: string[],
  subject: string,
  bodyText: string,
  bodyHtml?: string,
  replyTo?: string
): Promise<BroadcastEmailResult> {
  try {
    const res = await fetch('/api/email/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipients,
        subject,
        bodyText,
        bodyHtml: bodyHtml || `<div style="font-family:sans-serif;line-height:1.6;color:#1e293b;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px;"><h2 style="color:#0a3641;margin-top:0;">${subject}</h2><p style="white-space:pre-wrap;">${bodyText}</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/><p style="font-size:12px;color:#64748b;">1º Simpósio de Saúde Mental da Microrregião de Carangola · SUS</p></div>`,
        replyTo: replyTo || 'farmaciademinas.marketing@gmail.com'
      })
    });

    if (res.ok) {
      return await res.json();
    }
    const errText = await res.text();
    return {
      success: false,
      deliveryProvider: 'none',
      successfulSends: 0,
      failedSends: recipients.length,
      totalRecipients: recipients.length,
      message: `Erro no servidor: ${errText}`,
      deliveryError: errText
    };
  } catch (err: any) {
    return {
      success: false,
      deliveryProvider: 'none',
      successfulSends: 0,
      failedSends: recipients.length,
      totalRecipients: recipients.length,
      message: err?.message || 'Falha na conexão com o servidor de e-mail.',
      deliveryError: String(err)
    };
  }
}
