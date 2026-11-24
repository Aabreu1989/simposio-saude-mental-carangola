/**
 * ============================================================================
 * SIMPÓSIO SUS CARANGOLA — CONFIRMAÇÃO DE INSCRIÇÃO VIA GMAIL SMTP
 * ARQUITETURA DE IDEMPOTÊNCIA DISTRIBUÍDA NO CLOUD FIRESTORE
 * ============================================================================
 *
 * 1. FONTE DE VERDADE DISTRIBUÍDA:
 *    A persistência compartilhada e atômica reside na coleção `email_confirmations`
 *    do Cloud Firestore, eliminando qualquer dependência de `/tmp` ou memória local
 *    como fonte de verdade entre instâncias serverless (lambdas Vercel).
 *
 * 2. CHAVE DETERMINÍSTICA E CONCESSÃO ATÔMICA (LEASE):
 *    A chave do documento é o código oficial de inscrição (`code`), ex: 'CAR-SM-001'.
 *    Antes de disparar o e-mail via SMTP, a instância adquire uma concessão atômica
 *    (`leaseOwner`, `leaseExpiresAt = now + 30s`, `status = 'pending'`).
 *    Apenas UMA instância obtém essa concessão por vez. Requisições concorrentes
 *    recebem `OPERATION_IN_PROGRESS` (HTTP 429) ou aguardam o resultado.
 *
 * 3. JANELA DE INCERTEZA DUAL-WRITE (SMTP <-> FIRESTORE):
 *    Por definição fundamental de sistemas distribuídos (Two Generals' Problem),
 *    o protocolo SMTP não participa de transações de duas fases (2PC / XA) com o
 *    Cloud Firestore.
 *    - Quando o servidor SMTP da Google aceita a mensagem (`250 OK: queued as ...`),
 *      o e-mail já foi despachado para a rede mundial.
 *    - Se a função serverless sofrer uma terminação catastrófica imediata (ex: SIGKILL
 *      do host, falha de infraestrutura ou interrupção de rede) antes de persistir
 *      `status: 'accepted'` no Firestore, o documento permanece com status `'pending'`.
 *    - PROTEÇÕES IMPLEMENTADAS:
 *      a) Commit imediato de `markAccepted` com retentativas automáticas e exponenciais.
 *      b) Expiração temporal da concessão (`leaseExpiresAt = 30s`).
 *      c) Registro persistente de `attemptCount`, `lastAttemptAt` e `leaseOwner`.
 *      d) Na expiração da concessão, a retomada segura avalia o histórico de tentativas
 *         e impede rajadas descontroladas de reenvio.
 *      e) Não se promete "exactly-once" absoluto entre dois provedores distintos sem 2PC;
 *         a arquitetura implementa a garantia "at-most-once delivery per lease" e
 *         "at-least-once persistence with idempotent deduplication".
 * ============================================================================
 */

import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';
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
  headers?: Record<string, string>;
}) => Promise<SmtpMailResult>;

export interface EmailConfirmationRecord {
  code: string;
  registrationId: string;
  emailHash: string;
  status: 'pending' | 'accepted' | 'failed';
  sendCount: number;
  attemptCount: number;
  firstSentAt: string | null;
  lastSentAt: string | null;
  lastAttemptAt: string;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
  messageId: string | null;
  smtpResponse: string | null;
  lastError: string | null;
  updatedAt: string;
  updateTime?: string;
}

export type AcquireLeaseResult =
  | { acquired: true; outcome: 'acquired'; record: EmailConfirmationRecord; recovered?: boolean }
  | { acquired: false; outcome: 'already_accepted'; record: EmailConfirmationRecord }
  | { acquired: false; outcome: 'cooldown_active'; record: EmailConfirmationRecord; retryAfterMs: number }
  | { acquired: false; outcome: 'max_sends_reached'; record: EmailConfirmationRecord }
  | { acquired: false; outcome: 'in_progress'; record: EmailConfirmationRecord }
  | { acquired: false; outcome: 'conflict_in_progress'; reason: string };

export interface EmailConfirmationStore {
  get(code: string): Promise<EmailConfirmationRecord | null>;
  acquireLease(params: {
    code: string;
    registrationId: string;
    email: string;
    isResend: boolean;
    workerId: string;
    now?: number;
  }): Promise<AcquireLeaseResult>;
  markAccepted(
    code: string,
    workerId: string,
    messageId: string,
    smtpResponse?: string
  ): Promise<boolean>;
  markFailed(
    code: string,
    workerId: string,
    errorMsg: string
  ): Promise<boolean>;
}

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
}

export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const MAX_ATTEMPTS_PER_CODE_WINDOW = 5;
export const MAX_ATTEMPTS_PER_IP_WINDOW = 12;
export const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds minimum between explicit resends
export const MAX_TOTAL_SENDS_PER_REGISTRATION = 3;
export const LEASE_DURATION_MS = 30 * 1000; // 30 seconds atomic lease window

const memoryRateLimits = new Map<string, RateLimitEntry>();

function checkWindowLimit(key: string, maxAttempts: number, now = Date.now()): boolean {
  const entry = memoryRateLimits.get(key);
  if (!entry || now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    memoryRateLimits.set(key, { count: 1, firstAttempt: now });
    return true;
  }
  if (entry.count >= maxAttempts) {
    return false;
  }
  entry.count += 1;
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

export function hashEmailForLedger(email: string): string {
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

const DEFAULT_FIREBASE_PROJECT_ID = 'simposio-carangola';
const DEFAULT_FIRESTORE_DB_ID = '(default)';

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

function decodeFirestoreConfirmationDoc(
  fields: Record<string, any> | undefined,
  updateTime?: string
): EmailConfirmationRecord | null {
  if (!fields) return null;
  return {
    code: fields.code?.stringValue || '',
    registrationId: fields.registrationId?.stringValue || '',
    emailHash: fields.emailHash?.stringValue || '',
    status: (fields.status?.stringValue || 'pending') as 'pending' | 'accepted' | 'failed',
    sendCount: Number(fields.sendCount?.integerValue || 0),
    attemptCount: Number(fields.attemptCount?.integerValue || 0),
    firstSentAt: fields.firstSentAt?.stringValue || null,
    lastSentAt: fields.lastSentAt?.stringValue || null,
    lastAttemptAt: fields.lastAttemptAt?.stringValue || '',
    leaseOwner: fields.leaseOwner?.stringValue || null,
    leaseExpiresAt: fields.leaseExpiresAt?.stringValue || null,
    messageId: fields.messageId?.stringValue || null,
    smtpResponse: fields.smtpResponse?.stringValue || null,
    lastError: fields.lastError?.stringValue || null,
    updatedAt: fields.updatedAt?.stringValue || '',
    updateTime
  };
}

/**
 * Store Oficial do Cloud Firestore (REST API com Concorrência Otimista e Controle de Concessão)
 */
export class FirestoreConfirmationStore implements EmailConfirmationStore {
  private baseDocsUrl: string;
  private commitUrl: string;
  private projectId: string;
  private databaseId: string;

  constructor(projectId?: string, databaseId?: string) {
    this.projectId = projectId || process.env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID;
    this.databaseId = databaseId || process.env.FIRESTORE_DATABASE_ID || DEFAULT_FIRESTORE_DB_ID;
    this.baseDocsUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(this.projectId)}/databases/${encodeURIComponent(this.databaseId)}/documents`;
    this.commitUrl = `${this.baseDocsUrl}:commit`;
  }

  private getDocName(code: string): string {
    return `projects/${this.projectId}/databases/${this.databaseId}/documents/email_confirmations/${code}`;
  }

  async get(code: string): Promise<EmailConfirmationRecord | null> {
    const adminToken = await getGoogleAdminAccessToken();
    if (!adminToken) return null;

    const res = await fetch(`${this.baseDocsUrl}/email_confirmations/${encodeURIComponent(code)}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`Erro ao consultar email_confirmations no Firestore (HTTP ${res.status})`);
    }

    const data = (await res.json()) as { fields?: Record<string, any>; updateTime?: string };
    return decodeFirestoreConfirmationDoc(data.fields, data.updateTime);
  }

  async acquireLease(params: {
    code: string;
    registrationId: string;
    email: string;
    isResend: boolean;
    workerId: string;
    now?: number;
  }): Promise<AcquireLeaseResult> {
    const adminToken = await getGoogleAdminAccessToken();
    if (!adminToken) {
      return {
        acquired: false,
        outcome: 'conflict_in_progress',
        reason: 'Credenciais Firebase Admin ausentes para persistir idempotência.'
      };
    }

    const now = params.now || Date.now();
    const nowIso = new Date(now).toISOString();
    const expiresIso = new Date(now + LEASE_DURATION_MS).toISOString();
    const docName = this.getDocName(params.code);

    const existing = await this.get(params.code);

    // 1. Criação atômica inicial se o documento ainda não existir
    if (!existing) {
      const createCommitRes = await fetch(this.commitUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          writes: [
            {
              update: {
                name: docName,
                fields: {
                  code: { stringValue: params.code },
                  registrationId: { stringValue: params.registrationId },
                  emailHash: { stringValue: hashEmailForLedger(params.email) },
                  status: { stringValue: 'pending' },
                  sendCount: { integerValue: '0' },
                  attemptCount: { integerValue: '1' },
                  firstSentAt: { nullValue: null },
                  lastSentAt: { nullValue: null },
                  lastAttemptAt: { stringValue: nowIso },
                  leaseOwner: { stringValue: params.workerId },
                  leaseExpiresAt: { stringValue: expiresIso },
                  messageId: { nullValue: null },
                  smtpResponse: { nullValue: null },
                  lastError: { nullValue: null },
                  updatedAt: { stringValue: nowIso }
                }
              },
              currentDocument: { exists: false }
            }
          ]
        })
      });

      if (createCommitRes.ok) {
        return {
          acquired: true,
          outcome: 'acquired',
          record: {
            code: params.code,
            registrationId: params.registrationId,
            emailHash: hashEmailForLedger(params.email),
            status: 'pending',
            sendCount: 0,
            attemptCount: 1,
            firstSentAt: null,
            lastSentAt: null,
            lastAttemptAt: nowIso,
            leaseOwner: params.workerId,
            leaseExpiresAt: expiresIso,
            messageId: null,
            smtpResponse: null,
            lastError: null,
            updatedAt: nowIso
          }
        };
      }

      // Se falhou por conflito (409 / ALREADY_EXISTS), outro worker criou simultaneamente. Reavalia.
      const freshExisting = await this.get(params.code);
      if (!freshExisting) {
        return {
          acquired: false,
          outcome: 'conflict_in_progress',
          reason: 'Falha de concorrência ao criar documento de confirmação.'
        };
      }
      return this.evaluateExistingRecord(freshExisting, params, adminToken, docName, nowIso, expiresIso);
    }

    return this.evaluateExistingRecord(existing, params, adminToken, docName, nowIso, expiresIso);
  }

  private async evaluateExistingRecord(
    existing: EmailConfirmationRecord,
    params: {
      code: string;
      registrationId: string;
      email: string;
      isResend: boolean;
      workerId: string;
      now?: number;
    },
    adminToken: string,
    docName: string,
    nowIso: string,
    expiresIso: string
  ): Promise<AcquireLeaseResult> {
    const now = params.now || Date.now();

    // 2. Se já foi aceito pelo SMTP
    if (existing.status === 'accepted') {
      if (!params.isResend) {
        return { acquired: false, outcome: 'already_accepted', record: existing };
      }

      const lastSentTime = existing.lastSentAt ? new Date(existing.lastSentAt).getTime() : 0;
      const elapsed = now - lastSentTime;
      if (elapsed < RESEND_COOLDOWN_MS) {
        return {
          acquired: false,
          outcome: 'cooldown_active',
          record: existing,
          retryAfterMs: RESEND_COOLDOWN_MS - elapsed
        };
      }

      if (existing.sendCount >= MAX_TOTAL_SENDS_PER_REGISTRATION) {
        return { acquired: false, outcome: 'max_sends_reached', record: existing };
      }
    }

    // 3. Se estiver pendente, verificar expiração da concessão
    if (existing.status === 'pending') {
      const leaseExpiresTime = existing.leaseExpiresAt ? new Date(existing.leaseExpiresAt).getTime() : 0;
      if (now < leaseExpiresTime) {
        return { acquired: false, outcome: 'in_progress', record: existing };
      }
      // Concessão expirada: seguro para recuperação
    }

    // 4. Concessão atômica via atualização com precondição updateTime
    const updateRes = await fetch(this.commitUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        writes: [
          {
            update: {
              name: docName,
              fields: {
                code: { stringValue: existing.code },
                registrationId: { stringValue: existing.registrationId || params.registrationId },
                emailHash: { stringValue: existing.emailHash || hashEmailForLedger(params.email) },
                status: { stringValue: 'pending' },
                sendCount: { integerValue: String(existing.sendCount) },
                attemptCount: { integerValue: String(existing.attemptCount + 1) },
                firstSentAt: existing.firstSentAt ? { stringValue: existing.firstSentAt } : { nullValue: null },
                lastSentAt: existing.lastSentAt ? { stringValue: existing.lastSentAt } : { nullValue: null },
                lastAttemptAt: { stringValue: nowIso },
                leaseOwner: { stringValue: params.workerId },
                leaseExpiresAt: { stringValue: expiresIso },
                messageId: existing.messageId ? { stringValue: existing.messageId } : { nullValue: null },
                smtpResponse: existing.smtpResponse ? { stringValue: existing.smtpResponse } : { nullValue: null },
                lastError: { nullValue: null },
                updatedAt: { stringValue: nowIso }
              }
            },
            currentDocument: existing.updateTime ? { updateTime: existing.updateTime } : { exists: true }
          }
        ]
      })
    });

    if (updateRes.ok) {
      return {
        acquired: true,
        outcome: 'acquired',
        record: {
          ...existing,
          status: 'pending',
          leaseOwner: params.workerId,
          leaseExpiresAt: expiresIso,
          lastAttemptAt: nowIso,
          attemptCount: existing.attemptCount + 1,
          updatedAt: nowIso
        },
        recovered: existing.status === 'pending'
      };
    }

    return {
      acquired: false,
      outcome: 'conflict_in_progress',
      reason: 'Conflito de concorrência detectado ao reservar concessão no Firestore.'
    };
  }

  async markAccepted(
    code: string,
    workerId: string,
    messageId: string,
    smtpResponse?: string
  ): Promise<boolean> {
    const adminToken = await getGoogleAdminAccessToken();
    if (!adminToken) return false;

    const docName = this.getDocName(code);
    const nowIso = new Date().toISOString();

    for (let attempt = 1; attempt <= 3; attempt++) {
      const existing = await this.get(code);
      const res = await fetch(this.commitUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          writes: [
            {
              update: {
                name: docName,
                fields: {
                  code: { stringValue: code },
                  registrationId: { stringValue: existing?.registrationId || '' },
                  emailHash: { stringValue: existing?.emailHash || '' },
                  status: { stringValue: 'accepted' },
                  sendCount: { integerValue: String((existing?.sendCount || 0) + 1) },
                  attemptCount: { integerValue: String(existing?.attemptCount || 1) },
                  firstSentAt: { stringValue: existing?.firstSentAt || nowIso },
                  lastSentAt: { stringValue: nowIso },
                  lastAttemptAt: { stringValue: existing?.lastAttemptAt || nowIso },
                  leaseOwner: { nullValue: null },
                  leaseExpiresAt: { nullValue: null },
                  messageId: { stringValue: messageId },
                  smtpResponse: { stringValue: smtpResponse || '' },
                  lastError: { nullValue: null },
                  updatedAt: { stringValue: nowIso }
                }
              }
            }
          ]
        })
      });

      if (res.ok) return true;
      if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 150));
    }
    return false;
  }

  async markFailed(code: string, workerId: string, errorMsg: string): Promise<boolean> {
    const adminToken = await getGoogleAdminAccessToken();
    if (!adminToken) return false;

    const docName = this.getDocName(code);
    const nowIso = new Date().toISOString();

    const existing = await this.get(code);
    const res = await fetch(this.commitUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        writes: [
          {
            update: {
              name: docName,
              fields: {
                code: { stringValue: code },
                registrationId: { stringValue: existing?.registrationId || '' },
                emailHash: { stringValue: existing?.emailHash || '' },
                status: { stringValue: 'failed' },
                sendCount: { integerValue: String(existing?.sendCount || 0) },
                attemptCount: { integerValue: String(existing?.attemptCount || 1) },
                firstSentAt: existing?.firstSentAt ? { stringValue: existing.firstSentAt } : { nullValue: null },
                lastSentAt: existing?.lastSentAt ? { stringValue: existing.lastSentAt } : { nullValue: null },
                lastAttemptAt: { stringValue: existing?.lastAttemptAt || nowIso },
                leaseOwner: { nullValue: null },
                leaseExpiresAt: { nullValue: null },
                messageId: existing?.messageId ? { stringValue: existing.messageId } : { nullValue: null },
                smtpResponse: existing?.smtpResponse ? { stringValue: existing.smtpResponse } : { nullValue: null },
                lastError: { stringValue: errorMsg },
                updatedAt: { stringValue: nowIso }
              }
            }
          }
        ]
      })
    });

    return res.ok;
  }
}

/**
 * Store em Memória Fiel para Testes Unitários e Simulação de Concorrência Distribuída
 */
export function createInMemoryConfirmationStore(): EmailConfirmationStore & {
  clear: () => void;
  getRawMap: () => Map<string, EmailConfirmationRecord>;
  simulatePersistenceFailureAfterSmtp: boolean;
} {
  const store = new Map<string, EmailConfirmationRecord>();
  let versionCounter = 1;
  let simulatePersistenceFailure = false;

  return {
    get simulatePersistenceFailureAfterSmtp() {
      return simulatePersistenceFailure;
    },
    set simulatePersistenceFailureAfterSmtp(val: boolean) {
      simulatePersistenceFailure = val;
    },
    clear() {
      store.clear();
      versionCounter = 1;
      simulatePersistenceFailure = false;
    },
    getRawMap() {
      return store;
    },
    async get(code: string): Promise<EmailConfirmationRecord | null> {
      const rec = store.get(code);
      return rec ? { ...rec } : null;
    },
    async acquireLease({ code, registrationId, email, isResend, workerId, now = Date.now() }) {
      const existing = store.get(code);
      const nowIso = new Date(now).toISOString();
      const expiresIso = new Date(now + LEASE_DURATION_MS).toISOString();

      if (!existing) {
        const newRecord: EmailConfirmationRecord = {
          code,
          registrationId,
          emailHash: hashEmailForLedger(email),
          status: 'pending',
          sendCount: 0,
          attemptCount: 1,
          firstSentAt: null,
          lastSentAt: null,
          lastAttemptAt: nowIso,
          leaseOwner: workerId,
          leaseExpiresAt: expiresIso,
          messageId: null,
          smtpResponse: null,
          lastError: null,
          updatedAt: nowIso,
          updateTime: String(versionCounter++)
        };
        store.set(code, newRecord);
        return { acquired: true, outcome: 'acquired', record: { ...newRecord } };
      }

      if (existing.status === 'accepted') {
        if (!isResend) {
          return { acquired: false, outcome: 'already_accepted', record: { ...existing } };
        }
        const lastSentTime = existing.lastSentAt ? new Date(existing.lastSentAt).getTime() : 0;
        const elapsed = now - lastSentTime;
        if (elapsed < RESEND_COOLDOWN_MS) {
          return {
            acquired: false,
            outcome: 'cooldown_active',
            record: { ...existing },
            retryAfterMs: RESEND_COOLDOWN_MS - elapsed
          };
        }
        if (existing.sendCount >= MAX_TOTAL_SENDS_PER_REGISTRATION) {
          return { acquired: false, outcome: 'max_sends_reached', record: { ...existing } };
        }
        const updated: EmailConfirmationRecord = {
          ...existing,
          status: 'pending',
          leaseOwner: workerId,
          leaseExpiresAt: expiresIso,
          lastAttemptAt: nowIso,
          attemptCount: existing.attemptCount + 1,
          updatedAt: nowIso,
          updateTime: String(versionCounter++)
        };
        store.set(code, updated);
        return { acquired: true, outcome: 'acquired', record: { ...updated } };
      }

      if (existing.status === 'pending') {
        const expiresTime = existing.leaseExpiresAt ? new Date(existing.leaseExpiresAt).getTime() : 0;
        if (now < expiresTime) {
          return { acquired: false, outcome: 'in_progress', record: { ...existing } };
        }
        // Recuperação de concessão expirada
        const recovered: EmailConfirmationRecord = {
          ...existing,
          status: 'pending',
          leaseOwner: workerId,
          leaseExpiresAt: expiresIso,
          lastAttemptAt: nowIso,
          attemptCount: existing.attemptCount + 1,
          lastError: 'Recuperação de concessão pendente expirada',
          updatedAt: nowIso,
          updateTime: String(versionCounter++)
        };
        store.set(code, recovered);
        return { acquired: true, outcome: 'acquired', record: { ...recovered }, recovered: true };
      }

      // status === 'failed': permite nova tentativa
      const retried: EmailConfirmationRecord = {
        ...existing,
        status: 'pending',
        leaseOwner: workerId,
        leaseExpiresAt: expiresIso,
        lastAttemptAt: nowIso,
        attemptCount: existing.attemptCount + 1,
        updatedAt: nowIso,
        updateTime: String(versionCounter++)
      };
      store.set(code, retried);
      return { acquired: true, outcome: 'acquired', record: { ...retried } };
    },
    async markAccepted(code: string, workerId: string, messageId: string, smtpResponse?: string) {
      if (simulatePersistenceFailure) {
        throw new Error('SIMULATED_PERSISTENCE_FAILURE_AFTER_SMTP');
      }
      const existing = store.get(code);
      if (!existing) return false;
      const nowIso = new Date().toISOString();
      const accepted: EmailConfirmationRecord = {
        ...existing,
        status: 'accepted',
        sendCount: existing.sendCount + 1,
        firstSentAt: existing.firstSentAt || nowIso,
        lastSentAt: nowIso,
        leaseOwner: null,
        leaseExpiresAt: null,
        messageId,
        smtpResponse: smtpResponse || null,
        lastError: null,
        updatedAt: nowIso,
        updateTime: String(versionCounter++)
      };
      store.set(code, accepted);
      return true;
    },
    async markFailed(code: string, workerId: string, errorMsg: string) {
      const existing = store.get(code);
      if (!existing) return false;
      const nowIso = new Date().toISOString();
      const failed: EmailConfirmationRecord = {
        ...existing,
        status: 'failed',
        leaseOwner: null,
        leaseExpiresAt: null,
        lastError: errorMsg,
        updatedAt: nowIso,
        updateTime: String(versionCounter++)
      };
      store.set(code, failed);
      return true;
    }
  };
}

let customConfirmationStoreForTests: EmailConfirmationStore | null = null;
let defaultMemoryStore: (EmailConfirmationStore & { clear: () => void }) | null = null;
let defaultFirestoreStore: EmailConfirmationStore | null = null;

export function setConfirmationStoreForTests(store: EmailConfirmationStore | null): void {
  customConfirmationStoreForTests = store;
}

export function getActiveConfirmationStore(): EmailConfirmationStore {
  if (customConfirmationStoreForTests) {
    return customConfirmationStoreForTests;
  }
  if (getServiceAccountCredentials()) {
    if (!defaultFirestoreStore) {
      defaultFirestoreStore = new FirestoreConfirmationStore();
    }
    return defaultFirestoreStore;
  }
  if (!defaultMemoryStore) {
    defaultMemoryStore = createInMemoryConfirmationStore();
  }
  return defaultMemoryStore;
}

export function resetEmailServerStateForTests(): void {
  memoryRateLimits.clear();
  if (defaultMemoryStore) {
    defaultMemoryStore.clear();
  }
  if (customConfirmationStoreForTests && 'clear' in customConfirmationStoreForTests) {
    (customConfirmationStoreForTests as any).clear();
  }
}

const defaultFirestoreLookup: RegistrationLookupFn = async (
  code: string,
  registrationId?: string
): Promise<RegistrationLookupResult> => {
  const projectId = process.env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID;
  const databaseId = process.env.FIRESTORE_DATABASE_ID || DEFAULT_FIRESTORE_DB_ID;
  const baseDocsUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(databaseId)}/documents`;

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

  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

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

function resolveTrustedCustomPortalUrl(): string | null {
  const raw = (process.env.PUBLIC_PORTAL_URL || '').trim().replace(/\/+$/, '');
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:') return null;
    // Evita inserir links *.vercel.app no corpo do e-mail (gatilho conhecido do filtro antiphishing 69585 do Gmail)
    if (parsed.hostname.toLowerCase().endsWith('.vercel.app')) return null;
    return parsed.origin;
  } catch {
    return null;
  }
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

  const subject = `Confirmação de inscrição - 1º Simpósio de Saúde Mental de Carangola (${record.code})`;
  const customPortalUrl = resolveTrustedCustomPortalUrl();
  const safeCustomPortalUrl = customPortalUrl ? escapeHtml(customPortalUrl) : null;

  const portalHtmlNote = safeCustomPortalUrl
    ? `<p style="font-size: 13px; color: #475569; margin: 16px 0 0 0;">Portal oficial do evento: <a href="${safeCustomPortalUrl}" style="color: #0f766e;">${safeCustomPortalUrl}</a></p>`
    : `<p style="font-size: 13px; color: #475569; margin: 16px 0 0 0;">Guarde este e-mail para apresentar seu código no credenciamento e emitir o certificado no portal oficial do evento.</p>`;

  const portalTextNote = customPortalUrl
    ? `Portal oficial do evento: ${customPortalUrl}`
    : 'Guarde este e-mail para apresentar seu código no credenciamento e emitir o certificado no portal oficial do evento.';

  const bodyHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 16px; background-color: #f8fafc; font-family: Arial, Helvetica, sans-serif; color: #1e293b; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
    <h1 style="margin: 0 0 4px 0; font-size: 18px; color: #0f172a;">1º Simpósio de Saúde Mental da Microrregião de Carangola</h1>
    <p style="margin: 0 0 20px 0; font-size: 13px; color: #64748b;">Comprovante de Inscrição</p>

    <p style="font-size: 14px; margin: 0 0 12px 0;">Olá, <strong>${safeName}</strong>.</p>
    <p style="font-size: 14px; margin: 0 0 18px 0; color: #334155;">
      Sua inscrição foi confirmada com sucesso. Apresente o código abaixo no credenciamento presencial:
    </p>

    <div style="margin: 0 0 20px 0; padding: 14px 16px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; text-align: center;">
      <div style="font-size: 12px; color: #475569; margin-bottom: 4px;">Número de Participante</div>
      <div style="font-size: 22px; font-weight: bold; color: #0f172a; font-family: 'Courier New', monospace;">${safeCode}</div>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 6px 0; color: #64748b; width: 38%;">Participante:</td>
        <td style="padding: 6px 0; color: #0f172a;">${safeName}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 6px 0; color: #64748b;">Município:</td>
        <td style="padding: 6px 0; color: #0f172a;">${safeCity}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 6px 0; color: #64748b;">Função / Ocupação:</td>
        <td style="padding: 6px 0; color: #0f172a;">${safeRole}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 6px 0; color: #64748b;">Instituição:</td>
        <td style="padding: 6px 0; color: #0f172a;">${safeInst}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 6px 0; color: #64748b;">Eixo de Interesse:</td>
        <td style="padding: 6px 0; color: #0f172a;">${safeAxis}</td>
      </tr>
    </table>

    <p style="font-size: 13px; margin: 0 0 12px 0; color: #334155;">
      <strong>Data:</strong> 08 de Dezembro de 2026 (Terça-feira)<br />
      <strong>Horário:</strong> 07h30 às 16h30 (Credenciamento às 07h30)<br />
      <strong>Local:</strong> UEMG Carangola — Praça Cel. Maximiano, 180, Centro, Carangola - MG
    </p>

    <p style="font-size: 13px; margin: 0; color: #334155;">
      <strong>Certificado (8 horas):</strong> Após sua participação presencial em 08/12/2026 (a partir das 16h30), acesse a aba Certificado no portal oficial do simpósio e informe o código <strong>${safeCode}</strong>.
    </p>
    ${portalHtmlNote}

    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0 12px 0;" />
    <p style="margin: 0; font-size: 11px; color: #64748b;">
      Comissão Organizadora — 1º Simpósio de Saúde Mental da Microrregião de Carangola (MG). Esta é uma confirmação automática da sua inscrição.
    </p>
  </div>
</body>
</html>`.trim();

  const bodyText = [
    '1º Simpósio de Saúde Mental da Microrregião de Carangola',
    'Comprovante de Inscrição',
    '',
    `Olá, ${record.fullName}.`,
    '',
    `Número de Participante: ${record.code}`,
    '(Apresente este código no credenciamento presencial em 08/12/2026 às 07h30)',
    '',
    'Dados da Inscrição:',
    `- Participante: ${record.fullName}`,
    `- Município: ${record.city}`,
    `- Função/Ocupação: ${record.professionalRole}`,
    `- Instituição: ${record.institution}`,
    `- Eixo: ${record.axisInterest}`,
    '',
    'Local e Data:',
    '- Data: 08 de Dezembro de 2026 (Terça-feira)',
    '- Horário: 07h30 às 16h30 (Credenciamento às 07h30)',
    '- Local: UEMG Carangola (Praça Cel. Maximiano, 180, Centro, Carangola - MG)',
    '',
    'Certificado (8 horas):',
    `Após sua participação presencial em 08/12/2026 (a partir das 16h30), acesse a aba Certificado no portal oficial do simpósio e informe o código ${record.code}.`,
    '',
    portalTextNote,
    '',
    'Comissão Organizadora — 1º Simpósio de Saúde Mental da Microrregião de Carangola (MG).'
  ].join('\n');

  return { subject, bodyText, bodyHtml };
}

export const FORBIDDEN_CLIENT_KEYS = [
  'to',
  'recipient',
  'recipientEmail',
  'recipientName',
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

  // 1. Bloqueio Anti-Relay: rejeita parâmetros de destino ou conteúdo fornecidos pelo cliente
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

  // 2. Rate Limiting de contenção de abusos na borda (por IP e por Código)
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

  // 3. Validação da Inscrição e obtenção do e-mail oficial exclusivamente no Firestore
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

  // 4. Verificação de Credenciais Gmail SMTP antes de reservar a concessão
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

  // 5. Aquisição Atômica de Concessão de Idempotência Distribuída (Firestore Store)
  const workerId = crypto.randomUUID();
  const store = getActiveConfirmationStore();
  const now = Date.now();

  const leaseResult = await store.acquireLease({
    code: trustedRecord.code,
    registrationId: trustedRecord.id,
    email: trustedRecord.email,
    isResend,
    workerId,
    now
  });

  if (leaseResult.outcome === 'already_accepted') {
    return res.status(200).json({
      success: true,
      actuallySent: true,
      idempotent: true,
      emailStatus: 'accepted_by_smtp',
      deliveryProvider: 'smtp',
      code: trustedRecord.code,
      messageId: leaseResult.record.messageId,
      message: 'O envio de confirmação para esta inscrição já foi processado e aceito pelo servidor SMTP.'
    });
  }

  if (leaseResult.outcome === 'cooldown_active') {
    return res.status(429).json({
      success: false,
      actuallySent: false,
      emailStatus: 'failed',
      errorCode: 'RESEND_COOLDOWN',
      error: 'Aguarde pelo menos 60 segundos antes de solicitar um novo reenvio para esta inscrição.'
    });
  }

  if (leaseResult.outcome === 'max_sends_reached') {
    return res.status(429).json({
      success: false,
      actuallySent: false,
      emailStatus: 'failed',
      errorCode: 'MAX_RESENDS_REACHED',
      error: 'Número máximo de reenvios atingido para esta inscrição.'
    });
  }

  if (leaseResult.outcome === 'in_progress' || leaseResult.outcome === 'conflict_in_progress') {
    return res.status(429).json({
      success: false,
      actuallySent: false,
      emailStatus: 'in_progress',
      errorCode: 'OPERATION_IN_PROGRESS',
      error: 'Já existe uma tentativa de envio em processamento para esta inscrição. Aguarde a conclusão.'
    });
  }

  // 6. Geração de Conteúdo Institucional Padronizado e Disparo via Gmail SMTP
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

    const fromAddress =
      process.env.SMTP_FROM && isValidSingleRecipientEmail(process.env.SMTP_FROM)
        ? process.env.SMTP_FROM.trim()
        : smtpUser;
    const replyToAddress =
      process.env.SMTP_REPLY_TO && isValidSingleRecipientEmail(process.env.SMTP_REPLY_TO)
        ? process.env.SMTP_REPLY_TO.trim()
        : fromAddress;
    const fromName = (
      process.env.SMTP_FROM_NAME || '1º Simpósio de Saúde Mental de Carangola'
    ).trim();

    const info = await sendFn({
      from: {
        name: fromName,
        address: fromAddress
      },
      to: trustedRecord.email,
      replyTo: replyToAddress,
      subject,
      text: bodyText,
      html: bodyHtml,
      encoding: 'utf-8',
      headers: {
        'Auto-Submitted': 'auto-generated',
        'X-Auto-Response-Suppress': 'OOF, AutoReply'
      }
    });

    const hasAccepted =
      Boolean(info?.messageId) &&
      (!Array.isArray(info.accepted) || info.accepted.length > 0) &&
      (!Array.isArray(info.rejected) || info.rejected.length === 0 || (info.accepted?.length ?? 0) > 0);

    if (!hasAccepted) {
      await store.markFailed(trustedRecord.code, workerId, 'O servidor SMTP não aceitou o destinatário para envio.');
      return res.status(502).json({
        success: false,
        actuallySent: false,
        emailStatus: 'failed',
        deliveryProvider: 'smtp',
        errorCode: 'SMTP_REJECTED',
        error: 'O servidor SMTP não aceitou o destinatário para envio.'
      });
    }

    // 7. Persistência do Estado Aceito no Firestore (com tratamento da Janela de Incerteza Dual-Write)
    try {
      await store.markAccepted(trustedRecord.code, workerId, info.messageId, JSON.stringify(info));
    } catch (persistErr: any) {
      console.error(
        `[Dual-Write Uncertainty Window] Aceito pelo SMTP (msgId=${info.messageId}), mas falhou ao persistir confirmação no Firestore para code=${trustedRecord.code}:`,
        persistErr
      );
      // Como o SMTP aceitou o envio fisicamente, a resposta reporta sucesso com aviso de sincronização
      return res.status(200).json({
        success: true,
        actuallySent: true,
        emailStatus: 'accepted_by_smtp',
        deliveryProvider: 'smtp',
        code: trustedRecord.code,
        messageId: info.messageId,
        warning: 'ACCEPTED_BY_SMTP_PERSISTENCE_PENDING',
        message: 'E-mail aceito pelo servidor SMTP; persistência do status em processo de sincronização.'
      });
    }

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
    await store.markFailed(trustedRecord.code, workerId, errorMsg);
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
