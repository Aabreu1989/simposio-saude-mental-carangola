/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  labelIds: string[];
  isUnread: boolean;
  isStarred: boolean;
  bodyText?: string;
  bodyHtml?: string;
}

export interface SendEmailPayload {
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  fromName?: string;
  replyTo?: string;
}

export interface AutomatedWorkflow {
  id: string;
  title: string;
  description: string;
  triggerEvent: 'on_new_registration' | 'pre_event_24h' | 'checkin_completed' | 'inquiry_auto_responder';
  targetAudience: 'inscritos' | 'presentes' | 'geral';
  templateSubject: string;
  templateBody: string;
  enabled: boolean;
  lastRun?: string;
  executionsCount: number;
}

const GMAIL_BASE_URL = 'https://gmail.googleapis.com/gmail/v1/users/me';

/**
 * Base64 URL-safe encoding supporting UTF-8 accents and special characters
 */
export function base64UrlEncode(str: string): string {
  // UTF-8 encode safe string before btoa
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Creates an RFC 2822 compliant MIME email string
 */
export function createMimeEmail({
  to,
  subject,
  bodyText,
  bodyHtml,
  fromName = '1º Simpósio de Saúde Mental de Carangola - SUS',
  replyTo = 'farmaciademinas.marketing@gmail.com'
}: SendEmailPayload): string {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  
  // Clean subject header for UTF-8
  const encodedSubject = `=?UTF-8?B?${btoa(new TextEncoder().encode(subject).reduce((acc, byte) => acc + String.fromCharCode(byte), ''))}?=`;
  const encodedFromName = `=?UTF-8?B?${btoa(new TextEncoder().encode(fromName).reduce((acc, byte) => acc + String.fromCharCode(byte), ''))}?=`;

  const headers = [
    `From: ${encodedFromName} <farmaciademinas.marketing@gmail.com>`,
    `To: ${to}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`
  ].join('\r\n');

  const textPart = [
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    bodyText,
    ''
  ].join('\r\n');

  const htmlContent = bodyHtml || `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="background-color: #0a3641; padding: 18px 24px; border-radius: 8px 8px 0 0; color: #ffffff; text-align: center;">
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #ea7a38; font-weight: bold; display: block;">SUS · Secretaria Municipal de Saúde de Carangola</span>
        <h2 style="margin: 6px 0 0 0; font-size: 18px; font-weight: 700; color: #ffffff;">1º Simpósio de Saúde Mental da Microrregião</h2>
      </div>
      <div style="padding: 24px 16px; color: #1e293b; line-height: 1.6; font-size: 14px;">
        ${bodyText.replace(/\n/g, '<br/>')}
      </div>
      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #64748b; text-align: center;">
        Este e-mail oficial foi transmitido via Gmail (<strong>farmaciademinas.marketing@gmail.com</strong>) para a Microrregião de Carangola - MG.
      </div>
    </div>
  `;

  const htmlPart = [
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    htmlContent,
    '',
    `--${boundary}--`
  ].join('\r\n');

  return `${headers}\r\n\r\n${textPart}\r\n${htmlPart}`;
}

/**
 * Send an email message using the Gmail API
 */
export async function sendGmailMessage(
  accessToken: string,
  payload: SendEmailPayload
): Promise<{ id: string; threadId: string }> {
  const mimeMessage = createMimeEmail(payload);
  const raw = base64UrlEncode(mimeMessage);

  const response = await fetch(`${GMAIL_BASE_URL}/messages/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Erro ao enviar mensagem pelo Gmail (${response.status}): ${errorBody}`);
  }

  return response.json();
}

/**
 * List / search messages from Gmail account
 */
export async function listGmailMessages(
  accessToken: string,
  options: {
    q?: string;
    maxResults?: number;
    pageToken?: string;
    includeSpamTrash?: boolean;
  } = {}
): Promise<{ messages: GmailMessageSummary[]; nextPageToken?: string; resultSizeEstimate?: number }> {
  const params = new URLSearchParams();
  if (options.maxResults) params.set('maxResults', options.maxResults.toString());
  else params.set('maxResults', '15');

  if (options.q) params.set('q', options.q);
  if (options.pageToken) params.set('pageToken', options.pageToken);
  if (options.includeSpamTrash) params.set('includeSpamTrash', 'true');

  const listUrl = `${GMAIL_BASE_URL}/messages?${params.toString()}`;
  const response = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Falha ao listar mensagens do Gmail (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawList: Array<{ id: string; threadId: string }> = data.messages || [];

  if (rawList.length === 0) {
    return { messages: [], nextPageToken: data.nextPageToken, resultSizeEstimate: data.resultSizeEstimate || 0 };
  }

  // Fetch summaries for each message in parallel
  const detailPromises = rawList.slice(0, 15).map(async (item) => {
    try {
      return await getGmailMessageDetail(accessToken, item.id);
    } catch {
      return null;
    }
  });

  const detailedResults = (await Promise.all(detailPromises)).filter(Boolean) as GmailMessageSummary[];

  return {
    messages: detailedResults,
    nextPageToken: data.nextPageToken,
    resultSizeEstimate: data.resultSizeEstimate || detailedResults.length
  };
}

/**
 * Get detailed message information including subject, sender, date and body snippet
 */
export async function getGmailMessageDetail(
  accessToken: string,
  messageId: string
): Promise<GmailMessageSummary> {
  const response = await fetch(`${GMAIL_BASE_URL}/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar detalhes da mensagem ${messageId}`);
  }

  const data = await response.json();
  const headers: Array<{ name: string; value: string }> = data.payload?.headers || [];

  const getHeader = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  const subject = getHeader('Subject') || '(Sem Assunto)';
  const from = getHeader('From') || 'Desconhecido';
  const to = getHeader('To') || '';
  const date = getHeader('Date') || new Date().toISOString();
  const labelIds: string[] = data.labelIds || [];

  let bodyText = data.snippet || '';

  // Extract text body from payload parts if available
  const extractText = (part: any): string => {
    if (!part) return '';
    if (part.mimeType === 'text/plain' && part.body?.data) {
      try {
        const decoded = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        return decoded;
      } catch {
        return '';
      }
    }
    if (part.parts && Array.isArray(part.parts)) {
      for (const p of part.parts) {
        const found = extractText(p);
        if (found) return found;
      }
    }
    return '';
  };

  const parsedBody = extractText(data.payload);
  if (parsedBody) {
    bodyText = parsedBody;
  }

  return {
    id: data.id,
    threadId: data.threadId,
    snippet: data.snippet || '',
    from,
    to,
    subject,
    date,
    labelIds,
    isUnread: labelIds.includes('UNREAD'),
    isStarred: labelIds.includes('STARRED'),
    bodyText
  };
}

/**
 * Modify message labels (Organize: add/remove labels such as UNREAD, STARRED, SPAM, INBOX)
 */
export async function modifyMessageLabels(
  accessToken: string,
  messageId: string,
  addLabelIds: string[] = [],
  removeLabelIds: string[] = []
): Promise<void> {
  const response = await fetch(`${GMAIL_BASE_URL}/messages/${messageId}/modify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ addLabelIds, removeLabelIds })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Erro ao modificar marcador da mensagem (${response.status}): ${errorBody}`);
  }
}

/**
 * Archive an email by removing the INBOX label
 */
export async function archiveGmailMessage(accessToken: string, messageId: string): Promise<void> {
  return modifyMessageLabels(accessToken, messageId, [], ['INBOX']);
}

/**
 * Move message to Trash
 */
export async function trashGmailMessage(accessToken: string, messageId: string): Promise<void> {
  const response = await fetch(`${GMAIL_BASE_URL}/messages/${messageId}/trash`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error(`Erro ao mover mensagem para a lixeira`);
  }
}

/**
 * Predefined Automated Workflows for the Symposium
 */
export const DEFAULT_GMAIL_WORKFLOWS: AutomatedWorkflow[] = [
  {
    id: 'wf-lembrete-24h',
    title: 'Lembrete de Véspera (24h antes do Simpósio)',
    description: 'Envia e-mail automático a todos os inscritos confirmando auditório, horário de início às 08h30 e documentos necessários.',
    triggerEvent: 'pre_event_24h',
    targetAudience: 'inscritos',
    templateSubject: 'Lembrete: O 1º Simpósio de Saúde Mental de Carangola acontece amanhã!',
    templateBody: 'Prezado(a) participante,\n\nConfirmamos a sua vaga para o 1º Simpósio de Saúde Mental da Microrregião de Carangola - SUS.\n\nLocal: UEMG Carangola (Praça Cel. Maximiano, 180 - Centro, Carangola - MG)\nHorário de credenciamento: 08h30\n\nPor favor, apresente seu documento com foto e o código de inscrição no momento da chegada para retirada do crachá.\n\nAtenciosamente,\nCoordenação do Simpósio e RAPS Microrregional',
    enabled: true,
    executionsCount: 38
  },
  {
    id: 'wf-confirmacao-imediata',
    title: 'Boas-vindas & Confirmação Imediata de Inscrição',
    description: 'Dispara automaticamente o comprovante com o Número de Participante (usado para baixar o certificado) e o programa completo do evento.',
    triggerEvent: 'on_new_registration',
    targetAudience: 'inscritos',
    templateSubject: 'Inscrição Confirmada [Nº {codigo}]: 1º Simpósio de Saúde Mental de Carangola - SUS',
    templateBody: 'Olá {nome},\n\nSua inscrição para o 1º Simpósio de Saúde Mental da Microrregião de Carangola foi confirmada com sucesso no sistema do SUS!\n\nSEU NÚMERO DE PARTICIPANTE (MESMO NÚMERO PARA BAIXAR O CERTIFICADO): {codigo}\nGuarde este número com atenção — ele identifica você no credenciamento presencial e é o mesmo número usado para emitir e baixar o seu certificado oficial de 8 horas.\n\nPROGRAMA OFICIAL DO EVENTO (08 de Dezembro de 2026 · UEMG Carangola):\n• 07h30 - 08h00: Credenciamento (Hall de Entrada)\n• 08h00 - 08h30: Café com acolhimento\n• 08h30 - 09h15: Abertura oficial: Quando nos encontramos, a Rede ganha vida!\n• 09h15 - 09h30: A arte que nos conecta (Apresentação cultural)\n• 09h30 - 11h30: Mesa 1: Encontros, afetos e redes que produzem cuidado e liberdade (Eixo 1: Fluxograma da RAPS)\n• 11h30 - 13h00: Intervalo para almoço\n• 13h00 - 14h30: Mesa 2: Palavras que cuidam, histórias que transformam (Eixo 2: Hospital Geral e Urgência)\n• 14h30 - 14h45: Apresentação Centro de Convivência\n• 14h45 - 16h00: Mesa 3: Redes que se encontram, cuidados que se constroem (Eixo 3: Judicialização e Cuidado em Liberdade)\n• 16h00 - 16h30: Encerramento e Café de despedida\n\nComissão Organizadora do SUS · Secretaria Municipal de Saúde de Carangola',
    enabled: true,
    executionsCount: 142
  },
  {
    id: 'wf-liberacao-certificados',
    title: 'Notificação de Liberação de Certificados Oficiais (8h)',
    description: 'Envia aos participantes com presença validada o link direto e instruções para download do certificado com código autenticador.',
    triggerEvent: 'checkin_completed',
    targetAudience: 'presentes',
    templateSubject: 'Seu Certificado Oficial do 1º Simpósio de Saúde Mental está disponível!',
    templateBody: 'Prezado(a) profissional,\n\nAgradecemos imensamente pela sua participação ativa na construção das diretrizes da Saúde Mental em nossa microrregião.\n\nSeu certificado de participação (8 horas) já se encontra autenticado e disponível para download na Área do Participante informando seu CPF ou código de inscrição.\n\nSecretaria Municipal de Saúde de Carangola',
    enabled: true,
    executionsCount: 95
  },
  {
    id: 'wf-faq-auto-responder',
    title: 'Auto-Resposta Inteligente para Dúvidas Recebidas via Gmail',
    description: 'Detecta palavras-chave em e-mails recebidos (local, horário, inscrição, certificado) e responde instantaneamente com informações oficiais da RAPS.',
    triggerEvent: 'inquiry_auto_responder',
    targetAudience: 'geral',
    templateSubject: 'Informações Oficiais · 1º Simpósio de Saúde Mental de Carangola (SUS)',
    templateBody: 'Olá! Recebemos sua mensagem em farmaciademinas.marketing@gmail.com.\n\nResumo rápido do Simpósio:\n- Data e Horário: 08 de dezembro, das 08h30 às 16h\n- Local: UEMG Carangola (Praça Cel. Maximiano, 180 - Centro, Carangola - MG)\n- Inscrições: Gratuitas via portal oficial\n- Certificados: Emitidos após check-in para todos os participantes credenciados.\n\nSe precisar de atendimento individualizado, nossa equipe responderá em breve.\n\nAtenciosamente,\nSecretaria de Saúde de Carangola',
    enabled: true,
    executionsCount: 19
  }
];
