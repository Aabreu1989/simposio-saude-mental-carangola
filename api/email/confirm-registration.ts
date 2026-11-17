import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import nodemailer from 'nodemailer';

export interface ExtendedRequest extends IncomingMessage {
  body?: unknown;
  query?: Record<string, unknown>;
}

export interface ExtendedResponse extends ServerResponse {
  status: (statusCode: number) => ExtendedResponse;
  json: (data: unknown) => void;
  send: (body: unknown) => void;
}

export interface TrustedRegistrationRecord {
  id: string;
  code: string;
  fullName: string;
  email: string;
  city: string;
  professionalRole: string;
  institution: string;
  axisInterest: string;
  status: 'confirmada' | 'presente' | 'cancelada';
}

export type RegistrationLookupResult =
  | { ok: true; record: TrustedRegistrationRecord }
  | {
      ok: false;
      httpStatus: number;
      errorCode:
        | 'REGISTRATION_NOT_FOUND'
        | 'REGISTRATION_CANCELLED'
        | 'REGISTRATION_ID_MISMATCH'
        | 'FIREBASE_ADMIN_NOT_CONFIGURED'
        | 'FIRESTORE_LOOKUP_ERROR';
      error: string;
    };

export type RegistrationLookupFn = (
  code: string,
  registrationId?: string
) => Promise<RegistrationLookupResult>;

export interface SmtpMailResult {
  messageId: string;
  accepted?: string[];
  rejected?: string[];
}

export type SmtpSendFn = (mailOptions: {
  from: { name: string; address: string };
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  html: string;
  encoding: string;
}) => Promise<SmtpMailResult>;

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
}

interface SentIdempotencyEntry {
  code: string;
  emailHash: string;
  messageId: string;
  firstSentAt: number;
  lastSentAt: number;
  sendCount: number;
}

interface PersistentLedgerState {
  rateLimits: Record<string, RateLimitEntry>;
  sentRecords: Record<string, SentIdempotencyEntry>;
}

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS_PER_CODE_WINDOW = 5;
const MAX_ATTEMPTS_PER_IP_WINDOW = 12;
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds minimum between explicit resends
const MAX_TOTAL_SENDS_PER_REGISTRATION = 3;

const LEDGER_FILE_PATH = path.join(os.tmpdir(), 'simposio-sus-carangola-email-ledger.json');

const memoryState: PersistentLedgerState = {
  rateLimits: {},
  sentRecords: {}
};

function loadLedgerState(): PersistentLedgerState {
  try {
    if (fs.existsSync(LEDGER_FILE_PATH)) {
      const raw = fs.readFileSync(LEDGER_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<PersistentLedgerState>;
      if (parsed && typeof parsed === 'object') {
        if (parsed.rateLimits) Object.assign(memoryState.rateLimits, parsed.rateLimits);
        if (parsed.sentRecords) Object.assign(memoryState.sentRecords, parsed.sentRecords);
      }
    }
  } catch {
    // Fallback to in-memory state if /tmp is read-only
  }
  return memoryState;
}

function saveLedgerState(): void {
  try {
    fs.writeFileSync(LEDGER_FILE_PATH, JSON.stringify(memoryState), 'utf-8');
  } catch {
    // Ignore write failure if filesystem is restricted
  }
}

export function resetEmailServerStateForTests(): void {
  memoryState.rateLimits = {};
  memoryState.sentRecords = {};
  try {
    if (fs.existsSync(LEDGER_FILE_PATH)) {
      fs.unlinkSync(LEDGER_FILE_PATH);
    }
  } catch {
    // ignore
  }
}

function checkWindowLimit(key: string, maxAttempts: number, now = Date.now()): boolean {
  const state = loadLedgerState();
  const entry = state.rateLimits[key];
  if (!entry || now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    state.rateLimits[key] = { count: 1, firstAttempt: now };
    saveLedgerState();
    return true;
  }
  if (entry.count >= maxAttempts) {
    return false;
  }
  entry.count += 1;
  saveLedgerState();
  return true;
}

function getClientIp(req: ExtendedRequest): string {
  const xff = req.headers?.['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) {
    return xff.split(',')[0].trim();
  }
  if (Array.isArray(xff) && xff.length > 0) {
    return xff[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown-ip';
}

function hashEmailForLedger(email: string): string {
  return crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 16);
}

export function escapeHtml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Google Service Account OAuth2 Token Cache for Firestore Admin REST Lookup
let cachedAdminToken: { token: string; expiresAt: number } | null = null;

function getServiceAccountCredentials(): { clientEmail: string; privateKey: string } | null {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson) as { client_email?: string; private_key?: string };
      if (parsed.client_email && parsed.private_key) {
        return {
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key.replace(/\\n/g, '\n')
        };
      }
    } catch {
      // invalid JSON
    }
  }
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (clientEmail && privateKey) {
    return {
      clientEmail: clientEmail.trim(),
      privateKey: privateKey.replace(/\\n/g, '\n')
    };
  }
  return null;
}

async function getGoogleAdminAccessToken(): Promise<string | null> {
  const creds = getServiceAccountCredentials();
  if (!creds) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  if (cachedAdminToken && cachedAdminToken.expiresAt - 60 > nowSec) {
    return cachedAdminToken.token;
  }

  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iss: creds.clientEmail,
      scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/userinfo.email',
      aud: 'https://oauth2.googleapis.com/token',
      iat: nowSec,
      exp: nowSec + 3600
    })
  ).toString('base64url');

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  signer.end();
  const signature = signer.sign(creds.privateKey, 'base64url');
  const assertion = `${header}.${payload}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    }).toString()
  });

  if (!tokenRes.ok) {
    throw new Error(`Falha ao autenticar Service Account Google OAuth2 (HTTP ${tokenRes.status})`);
  }

  const tokenData = (await tokenRes.json()) as { access_token: string; expires_in?: number };
  cachedAdminToken = {
    token: tokenData.access_token,
    expiresAt: nowSec + (tokenData.expires_in || 3600)
  };
  return cachedAdminToken.token;
}

const DEFAULT_FIREBASE_PROJECT_ID = 'simposio-carangola';
const DEFAULT_FIRESTORE_DB_ID = '(default)';

function readFirestoreString(fields: Record<string, any> | undefined, key: string, fallback = ''): string {
  const val = fields?.[key]?.stringValue;
  return typeof val === 'string' ? val : fallback;
}

const STRICT_SINGLE_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function isValidSingleRecipientEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length > 160) return false;
  if (/[\s,;<>()]/.test(trimmed)) return false;
  if ((trimmed.match(/@/g) || []).length !== 1) return false;
  return STRICT_SINGLE_EMAIL_REGEX.test(trimmed);
}

const defaultFirestoreLookup: RegistrationLookupFn = async (
  code: string,
  registrationId?: string
): Promise<RegistrationLookupResult> => {
  const projectId = process.env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID;
  const databaseId = process.env.FIRESTORE_DATABASE_ID || DEFAULT_FIRESTORE_DB_ID;
  const baseDocsUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(databaseId)}/documents`;

  // 1. Obtain admin credentials first for authoritative Firestore access
  let adminToken: string | null = null;
  try {
    adminToken = await getGoogleAdminAccessToken();
  } catch (err: any) {
    return {
      ok: false,
      httpStatus: 502,
      errorCode: 'FIRESTORE_LOOKUP_ERROR',
      error: `Erro ao autenticar credenciais administrativas do Firebase: ${err?.message || String(err)}`
    };
  }

  if (!adminToken) {
    return {
      ok: false,
      httpStatus: 503,
      errorCode: 'FIREBASE_ADMIN_NOT_CONFIGURED',
      error:
        'Credenciais privadas Firebase Admin (FIREBASE_SERVICE_ACCOUNT_JSON) não configuradas no servidor para recuperar o endereço de e-mail registado com segurança.'
    };
  }

  const adminHeaders = {
    Authorization: `Bearer ${adminToken}`
  };

  // 2. Validate existence of registration permission document in Firestore
  let permFields: Record<string, any>;
  try {
    const permRes = await fetch(`${baseDocsUrl}/certificate_permissions/${encodeURIComponent(code)}`, {
      headers: adminHeaders
    });
    if (permRes.status === 404) {
      return {
        ok: false,
        httpStatus: 404,
        errorCode: 'REGISTRATION_NOT_FOUND',
        error: 'Inscrição não encontrada no banco de dados oficial do Simpósio.'
      };
    }
    if (!permRes.ok) {
      return {
        ok: false,
        httpStatus: 502,
        errorCode: 'FIRESTORE_LOOKUP_ERROR',
        error: `Falha ao validar inscrição no Firestore (HTTP ${permRes.status}).`
      };
    }
    const permJson = (await permRes.json()) as { fields?: Record<string, any> };
    permFields = permJson.fields || {};
  } catch (err: any) {
    return {
      ok: false,
      httpStatus: 502,
      errorCode: 'FIRESTORE_LOOKUP_ERROR',
      error: `Erro de comunicação ao consultar inscrição no Firestore: ${err?.message || String(err)}`
    };
  }

  const authoritativeRegId = readFirestoreString(permFields, 'registrationId');
  const permStatus = readFirestoreString(permFields, 'status', 'confirmada') as
    | 'confirmada'
    | 'presente'
    | 'cancelada';

  if (permStatus === 'cancelada') {
    return {
      ok: false,
      httpStatus: 403,
      errorCode: 'REGISTRATION_CANCELLED',
      error: 'Esta inscrição consta como cancelada e não pode receber confirmação.'
    };
  }

  if (registrationId && authoritativeRegId && registrationId !== authoritativeRegId) {
    return {
      ok: false,
      httpStatus: 403,
      errorCode: 'REGISTRATION_ID_MISMATCH',
      error: 'O identificador da inscrição não corresponde ao código registado no servidor.'
    };
  }

  const targetRegId = authoritativeRegId || registrationId || '';
  if (!targetRegId) {
    return {
      ok: false,
      httpStatus: 404,
      errorCode: 'REGISTRATION_NOT_FOUND',
      error: 'Registro de permissão incompleto no Firestore (registrationId ausente).'
    };
  }

  // 3. Retrieve PII registration record using Admin credentials
  try {
    const regRes = await fetch(`${baseDocsUrl}/registrations/${encodeURIComponent(targetRegId)}`, {
      headers: adminHeaders
    });

    if (regRes.status === 404) {
      return {
        ok: false,
        httpStatus: 404,
        errorCode: 'REGISTRATION_NOT_FOUND',
        error: 'Documento principal da inscrição não encontrado no Firestore.'
      };
    }

    if (!regRes.ok) {
      return {
        ok: false,
        httpStatus: 502,
        errorCode: 'FIRESTORE_LOOKUP_ERROR',
        error: `Erro ao recuperar dados da inscrição no Firestore (HTTP ${regRes.status}).`
      };
    }

    const regJson = (await regRes.json()) as { fields?: Record<string, any> };
    const regFields = regJson.fields || {};
    const email = readFirestoreString(regFields, 'email').trim().toLowerCase();
    const regCode = readFirestoreString(regFields, 'code', code).trim().toUpperCase();

    if (!isValidSingleRecipientEmail(email)) {
      return {
        ok: false,
        httpStatus: 422,
        errorCode: 'FIRESTORE_LOOKUP_ERROR',
        error: 'A inscrição encontrada no Firestore não possui um endereço de e-mail único e válido.'
      };
    }

    if (regCode !== code) {
      return {
        ok: false,
        httpStatus: 403,
        errorCode: 'REGISTRATION_ID_MISMATCH',
        error: 'Divergência de código entre o documento de inscrição e a permissão.'
      };
    }

    return {
      ok: true,
      record: {
        id: targetRegId,
        code: regCode,
        fullName:
          readFirestoreString(regFields, 'fullName') ||
          readFirestoreString(permFields, 'participantName') ||
          'Participante',
        email,
        city:
          readFirestoreString(regFields, 'city') ||
          readFirestoreString(permFields, 'city') ||
          'Carangola',
        professionalRole:
          readFirestoreString(regFields, 'professionalRole') ||
          readFirestoreString(permFields, 'professionalRole') ||
          'Profissional da Saúde',
        institution:
          readFirestoreString(regFields, 'institution') ||
          readFirestoreString(permFields, 'institution') ||
          'SUS',
        axisInterest:
          readFirestoreString(regFields, 'axisInterest') ||
          'Eixo 1: Fluxograma da RAPS',
        status: permStatus
      }
    };
  } catch (err: any) {
    return {
      ok: false,
      httpStatus: 502,
      errorCode: 'FIRESTORE_LOOKUP_ERROR',
      error: `Falha ao ler documento de inscrição no Firestore: ${err?.message || String(err)}`
    };
  }
};

let customRegistrationLookupForTests: RegistrationLookupFn | null = null;
let customSmtpSendForTests: SmtpSendFn | null = null;

export function setRegistrationLookupForTests(fn: RegistrationLookupFn | null): void {
  customRegistrationLookupForTests = fn;
}

export function setSmtpSendForTests(fn: SmtpSendFn | null): void {
  customSmtpSendForTests = fn;
}

export function buildServerInstitutionalEmail(record: TrustedRegistrationRecord): {
  subject: string;
  bodyText: string;
  bodyHtml: string;
} {
  const safeName = escapeHtml(record.fullName);
  const safeCode = escapeHtml(record.code);
  const safeCity = escapeHtml(record.city);
  const safeRole = escapeHtml(record.professionalRole);
  const safeInst = escapeHtml(record.institution);
  const safeAxis = escapeHtml(record.axisInterest);

  const subject = `Inscrição Confirmada [Nº ${record.code}] · 1º Simpósio de Saúde Mental de Carangola - SUS`;
  const baseUrl = 'https://simposio-saude-mental-carangola.vercel.app';
  const certUrl = `${baseUrl}/#certificado?code=${encodeURIComponent(record.code)}`;
  const scheduleUrl = `${baseUrl}/#programacao`;

  const bodyHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6;">
  <div style="max-width: 620px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
    <div style="background-color: #0a3641; padding: 28px 24px; text-align: center; border-bottom: 4px solid #ea7a38;">
      <span style="display: inline-block; background-color: rgba(234, 122, 56, 0.2); color: #ea7a38; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; padding: 4px 12px; border-radius: 9999px; margin-bottom: 8px;">
        SUS · Microrregião de Carangola MG
      </span>
      <h1 style="color: #ffffff; margin: 0 0 6px 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">
        1º Simpósio de Saúde Mental
      </h1>
      <p style="color: #cbd5e1; margin: 0; font-size: 13px;">
        Comprovante Oficial de Inscrição e Instruções do Participante
      </p>
    </div>
    <div style="padding: 28px 24px;">
      <p style="font-size: 15px; margin-top: 0;">Olá, <strong>${safeName}</strong>!</p>
      <p style="font-size: 14px; color: #334155;">
        Sua inscrição para o <strong>1º Simpósio de Saúde Mental da Microrregião de Carangola</strong> está registada no banco de dados oficial do evento.
      </p>
      <div style="margin: 24px 0; padding: 20px; background-color: #f8fafc; border: 2px solid #028090; border-radius: 12px; text-align: center;">
        <span style="display: block; font-size: 11px; font-weight: 700; color: #ea7a38; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">
          Seu Número Oficial de Participante
        </span>
        <div style="font-size: 26px; font-weight: 900; color: #0a3641; letter-spacing: 1px; font-family: 'Courier New', monospace;">
          ${safeCode}
        </div>
        <span style="display: inline-block; margin-top: 8px; font-size: 12px; color: #0f766e; background-color: #ccfbf1; padding: 2px 10px; border-radius: 6px; font-weight: 600;">
          Inscrição Confirmada
        </span>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; width: 35%;">Município:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${safeCity}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b;">Função / Ocupação:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${safeRole}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b;">Instituição:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${safeInst}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b;">Eixo de Interesse:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${safeAxis}</td>
        </tr>
      </table>
      <div style="background-color: #fdfaf6; border-left: 4px solid #ea7a38; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
        <div style="font-weight: 800; color: #0a3641; font-size: 14px; margin-bottom: 4px;">Informações do Evento</div>
        <div style="font-size: 13px; color: #475569;">
          <strong>Data:</strong> 08 de Dezembro de 2026 (Terça-feira)<br />
          <strong>Horário:</strong> 07h30 às 16h30 (Credenciamento às 07h30)<br />
          <strong>Local:</strong> UEMG Carangola — Praça Cel. Maximiano, 180, Centro, Carangola - MG
        </div>
      </div>
      <div style="background-color: #ecfeff; border-left: 4px solid #028090; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
        <div style="font-weight: 800; color: #0a3641; font-size: 14px; margin-bottom: 4px;">Emissão do Certificado Oficial de 8 Horas</div>
        <div style="font-size: 13px; color: #475569;">
          Após sua participação presencial no dia 08/12, acesse o link abaixo e informe seu Número de Participante (<strong>${safeCode}</strong>) para validação e download:
        </div>
        <div style="margin-top: 10px;">
          <a href="${certUrl}" style="display: inline-block; background-color: #028090; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 700; padding: 8px 16px; border-radius: 8px;">
            Acessar Validação de Certificado
          </a>
        </div>
      </div>
      <p style="font-size: 13px; color: #64748b; text-align: center; margin: 20px 0 0 0;">
        Programação completa: <a href="${scheduleUrl}" style="color: #028090; font-weight: 600;">${scheduleUrl}</a>
      </p>
    </div>
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8;">
      1º Simpósio de Saúde Mental da Microrregião de Carangola · SUS Carangola MG
    </div>
  </div>
</body>
</html>`.trim();

  const bodyText = [
    '1º Simpósio de Saúde Mental da Microrregião de Carangola - SUS',
    'Comprovante Oficial de Inscrição',
    '',
    `Olá, ${record.fullName}!`,
    '',
    `NÚMERO DE PARTICIPANTE: ${record.code}`,
    '(Apresente este código no credenciamento em 08/12/2026 às 07h30)',
    '',
    'DADOS DA INSCRIÇÃO:',
    `- Participante: ${record.fullName}`,
    `- Município: ${record.city}`,
    `- Função/Ocupação: ${record.professionalRole}`,
    `- Instituição: ${record.institution}`,
    `- Eixo: ${record.axisInterest}`,
    '',
    'LOCAL E DATA:',
    '- Data: 08 de Dezembro de 2026 (Terça-feira)',
    '- Horário: 07h30 às 16h30',
    '- Local: UEMG Carangola (Praça Cel. Maximiano, 180, Centro, Carangola - MG)',
    '',
    'CERTIFICADO OFICIAL (8 HORAS):',
    `Após o evento, acesse ${certUrl} e informe seu código ${record.code}.`,
    '',
    `Programação completa: ${scheduleUrl}`
  ].join('\n');

  return { subject, bodyText, bodyHtml };
}

const FORBIDDEN_CLIENT_KEYS = [
  'to',
  'recipient',
  'email',
  'subject',
  'bodyHtml',
  'bodyText',
  'html',
  'text',
  'replyTo',
  'from',
  'cc',
  'bcc',
  'axisInterest'
] as const;

export default async function handler(req: ExtendedRequest, res: ExtendedResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      success: false,
      actuallySent: false,
      emailStatus: 'failed',
      errorCode: 'METHOD_NOT_ALLOWED',
      error: 'Método não permitido. Utilize POST para solicitar o envio de confirmação.'
    });
  }

  let body: Record<string, unknown> = {};
  if (req.body && typeof req.body === 'object') {
    body = req.body as Record<string, unknown>;
  } else if (typeof req.body === 'string' && req.body.trim()) {
    try {
      body = JSON.parse(req.body);
    } catch {
      return res.status(400).json({
        success: false,
        actuallySent: false,
        emailStatus: 'failed',
        errorCode: 'INVALID_JSON',
        error: 'Corpo da requisição JSON inválido.'
      });
    }
  } else if (!req.body && typeof req.on === 'function') {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const raw = Buffer.concat(chunks).toString('utf-8');
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return res.status(400).json({
        success: false,
        actuallySent: false,
        emailStatus: 'failed',
        errorCode: 'INVALID_JSON',
        error: 'Corpo da requisição JSON inválido.'
      });
    }
  }

  // 1. Block open-relay attempts: reject any request supplying recipient, subject, or HTML/text body from client
  for (const key of FORBIDDEN_CLIENT_KEYS) {
    if (key in body && body[key] !== undefined) {
      return res.status(400).json({
        success: false,
        actuallySent: false,
        emailStatus: 'failed',
        errorCode: 'FORBIDDEN_CLIENT_PARAMETERS',
        error: `Parâmetro não permitido no cliente (${key}). O destinatário e o conteúdo institucional são obtidos exclusivamente no servidor.`
      });
    }
  }

  const rawCode = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  const rawRegId = typeof body.registrationId === 'string' ? body.registrationId.trim() : undefined;
  const isResend = Boolean(body.resend);

  if (!rawCode || !/^[A-Z0-9_-]{3,32}$/.test(rawCode)) {
    return res.status(400).json({
      success: false,
      actuallySent: false,
      emailStatus: 'failed',
      errorCode: 'INVALID_CODE',
      error: 'Código de inscrição inválido ou ausente.'
    });
  }

  if (rawRegId !== undefined && (!rawRegId || !/^[a-zA-Z0-9_-]{1,128}$/.test(rawRegId))) {
    return res.status(400).json({
      success: false,
      actuallySent: false,
      emailStatus: 'failed',
      errorCode: 'INVALID_REGISTRATION_ID',
      error: 'Identificador de inscrição inválido.'
    });
  }

  // 2. Serverless-aware Rate Limiting (per IP and per registration code)
  const clientIp = getClientIp(req);
  if (!checkWindowLimit(`ip:${clientIp}`, MAX_ATTEMPTS_PER_IP_WINDOW)) {
    return res.status(429).json({
      success: false,
      actuallySent: false,
      emailStatus: 'failed',
      errorCode: 'RATE_LIMIT_EXCEEDED',
      error: 'Limite de solicitações excedido para este endereço IP. Aguarde 15 minutos.'
    });
  }

  if (!checkWindowLimit(`code:${rawCode}`, MAX_ATTEMPTS_PER_CODE_WINDOW)) {
    return res.status(429).json({
      success: false,
      actuallySent: false,
      emailStatus: 'failed',
      errorCode: 'RATE_LIMIT_EXCEEDED',
      error: 'Limite de solicitações de e-mail excedido para esta inscrição. Aguarde 15 minutos.'
    });
  }

  // 3. Validate registration & retrieve trusted email directly from Firestore
  const lookupFn: RegistrationLookupFn = customRegistrationLookupForTests || defaultFirestoreLookup;
  const lookupResult = await lookupFn(rawCode, rawRegId);

  if (!lookupResult.ok) {
    const failedResult = lookupResult as Extract<RegistrationLookupResult, { ok: false }>;
    const emailStatus =
      failedResult.errorCode === 'FIREBASE_ADMIN_NOT_CONFIGURED' ? 'pending_config' : 'failed';
    return res.status(failedResult.httpStatus).json({
      success: false,
      actuallySent: false,
      emailStatus,
      errorCode: failedResult.errorCode,
      error: failedResult.error
    });
  }

  const trustedRecord = lookupResult.record;
  if (!isValidSingleRecipientEmail(trustedRecord.email)) {
    return res.status(422).json({
      success: false,
      actuallySent: false,
      emailStatus: 'failed',
      errorCode: 'FIRESTORE_LOOKUP_ERROR',
      error: 'A inscrição encontrada no Firestore não possui um endereço de e-mail único e válido.'
    });
  }
  const ledgerKey = `sent:${trustedRecord.code}`;
  const state = loadLedgerState();
  const existingSent = state.sentRecords[ledgerKey];
  const now = Date.now();

  // 4. Persistent Idempotency & Duplicate Send Protection
  if (existingSent) {
    if (!isResend) {
      return res.status(200).json({
        success: true,
        actuallySent: true,
        idempotent: true,
        emailStatus: 'accepted_by_smtp',
        deliveryProvider: 'smtp',
        code: trustedRecord.code,
        messageId: existingSent.messageId,
        message: 'O envio de confirmação para esta inscrição já foi processado e aceito pelo servidor SMTP.'
      });
    }

    if (now - existingSent.lastSentAt < RESEND_COOLDOWN_MS) {
      return res.status(429).json({
        success: false,
        actuallySent: false,
        emailStatus: 'failed',
        errorCode: 'RESEND_COOLDOWN',
        error: 'Aguarde pelo menos 60 segundos antes de solicitar um novo reenvio para esta inscrição.'
      });
    }

    if (existingSent.sendCount >= MAX_TOTAL_SENDS_PER_REGISTRATION) {
      return res.status(429).json({
        success: false,
        actuallySent: false,
        emailStatus: 'failed',
        errorCode: 'MAX_RESENDS_REACHED',
        error: 'Número máximo de reenvios atingido para esta inscrição.'
      });
    }
  }

  // 5. Check SMTP credentials
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT) || 465;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    return res.status(503).json({
      success: false,
      actuallySent: false,
      emailStatus: 'pending_config',
      deliveryProvider: 'none',
      errorCode: 'SMTP_NOT_CONFIGURED',
      error: 'Credenciais Gmail SMTP (SMTP_USER / SMTP_PASS) não configuradas no servidor.'
    });
  }

  // 6. Build institutional content on the server and dispatch via Gmail SMTP
  const { subject, bodyText, bodyHtml } = buildServerInstitutionalEmail(trustedRecord);

  try {
    const sendFn: SmtpSendFn =
      customSmtpSendForTests ||
      (async (mailOpts) => {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });
        return await transporter.sendMail(mailOpts);
      });

    const info = await sendFn({
      from: {
        name: '1º Simpósio de Saúde Mental - SUS Carangola',
        address: smtpUser
      },
      to: trustedRecord.email,
      replyTo: smtpUser,
      subject,
      text: bodyText,
      html: bodyHtml,
      encoding: 'utf-8'
    });

    const hasAccepted =
      Boolean(info?.messageId) &&
      (!Array.isArray(info.accepted) || info.accepted.length > 0) &&
      (!Array.isArray(info.rejected) || info.rejected.length === 0 || (info.accepted?.length ?? 0) > 0);

    if (!hasAccepted) {
      return res.status(502).json({
        success: false,
        actuallySent: false,
        emailStatus: 'failed',
        deliveryProvider: 'smtp',
        errorCode: 'SMTP_REJECTED',
        error: 'O servidor SMTP não aceitou o destinatário para envio.'
      });
    }

    state.sentRecords[ledgerKey] = {
      code: trustedRecord.code,
      emailHash: hashEmailForLedger(trustedRecord.email),
      messageId: info.messageId,
      firstSentAt: existingSent ? existingSent.firstSentAt : now,
      lastSentAt: now,
      sendCount: existingSent ? existingSent.sendCount + 1 : 1
    };
    saveLedgerState();

    console.info(
      `[SMTP Confirmation] Accepted by SMTP for code=${trustedRecord.code} msgId=${info.messageId}`
    );

    return res.status(200).json({
      success: true,
      actuallySent: true,
      emailStatus: 'accepted_by_smtp',
      deliveryProvider: 'smtp',
      code: trustedRecord.code,
      messageId: info.messageId,
      message: 'E-mail de confirmação aceito para envio pelo servidor Gmail SMTP.'
    });
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.error(`[SMTP Send Failure] code=${trustedRecord.code} error=${errorMsg}`);
    return res.status(502).json({
      success: false,
      actuallySent: false,
      emailStatus: 'failed',
      deliveryProvider: 'smtp',
      errorCode: 'SMTP_SEND_FAILED',
      error: `Falha na comunicação com o servidor Gmail SMTP: ${errorMsg}`
    });
  }
}
