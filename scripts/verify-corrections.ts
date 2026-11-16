/**
 * Suite Completa de Validação Técnica e Integridade Ponta a Ponta
 * Simpósio de Saúde Mental — SUS Carangola
 */

import fs from 'fs';
import path from 'path';
import {
  generateRegistrationCode,
  getOrCreateParticipantRegistrationIdentity,
  clearParticipantAttemptCache,
  buildRegistrationId,
  loadStoredData,
  saveSpeakersToStorage
} from '../src/utils/helpers.ts';

import {
  isVerifiedAdminUser,
  classifyFirestoreError,
  testFirestoreConnection,
  setFirestoreConnectionProbeForTests,
  getActiveFirebaseConfigSummary,
  savePublicRegistrationToDb,
  setFirestoreRegistrationAdapterForTests,
  synchronizeOfflineRegistrationQueue,
  persistRegistrationAndPermissionInDb,
  deleteRegistrationInDb,
  saveEventConfigInDb
} from '../src/services/firebaseDb.ts';

import emailHandler, {
  resetEmailServerStateForTests,
  setRegistrationLookupForTests,
  setSmtpSendForTests,
  type TrustedRegistrationRecord
} from '../api/email/confirm-registration.ts';
import statusHandler from '../api/email/status.ts';
import mapsHandler from '../api/maps/config.ts';
import vercelConfig from '../vercel.json' with { type: 'json' };
import { INITIAL_EVENT_CONFIG, SPEAKERS_PROFILES } from '../src/data/initialData.ts';
import type { Registration, SpeakerProfile } from '../src/types.ts';

interface TestResult {
  suite: string;
  test: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, test: string, suite: string, detail?: string) {
  if (condition) {
    results.push({ suite, test, passed: true });
    console.log(`  ✓ [${suite}] ${test}`);
  } else {
    results.push({ suite, test, passed: false, error: detail || 'Assertion failed' });
    console.error(`  ✗ [${suite}] ${test}${detail ? ` (${detail})` : ''}`);
  }
}

function makeSampleRegistration(overrides: Partial<Registration> = {}): Registration {
  return {
    id: buildRegistrationId(),
    code: generateRegistrationCode(),
    fullName: 'Maria da Silva',
    cpf: '123.456.789-01',
    email: 'maria.silva@carangola.mg.gov.br',
    phone: '(32) 99999-1111',
    city: 'Carangola',
    professionalRole: 'Psicólogo(a)',
    institution: 'CAPS I Carangola',
    axisInterest: 'Eixo 1: Fluxograma da RAPS',
    status: 'confirmada',
    registeredAt: new Date().toISOString(),
    certificateIssued: false,
    ...overrides
  };
}

function createMockHttp(method: string, body: unknown, ip = '203.0.113.10') {
  let statusCode = 200;
  let responseData: any = null;
  const headers: Record<string, string> = {};

  const req: any = {
    method,
    body,
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip
    },
    socket: { remoteAddress: ip }
  };

  const res: any = {
    setHeader(name: string, value: string) {
      headers[name] = value;
    },
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: any) {
      responseData = data;
      return res;
    },
    send(data: any) {
      responseData = data;
      return res;
    }
  };

  return { req, res, getStatus: () => statusCode, getData: () => responseData, getHeaders: () => headers };
}

async function runTests() {
  console.log('\n======================================================');
  console.log('EXECUTANDO SUITE COMPLETA DE VALIDAÇÃO TÉCNICA');
  console.log('======================================================\n');

  // ----------------------------------------------------
  // SUITE 1: UNICIDADE, CONCORRÊNCIA E PRIVACIDADE DE IDs
  // ----------------------------------------------------
  const suite1 = 'Inscrições, Concorrência & Firestore';

  clearParticipantAttemptCache();
  const codeA = generateRegistrationCode();
  const codeB = generateRegistrationCode();
  assert(codeA !== codeB, 'Dois navegadores sem dados locais geram códigos diferentes', suite1);

  const codeRegex = /^[A-Z0-9_-]{3,32}$/;
  assert(
    codeRegex.test(codeA) && codeRegex.test(codeB),
    'Códigos gerados respeitam a regex estrita do firestore.rules (^[A-Z0-9_-]{3,32}$)',
    suite1
  );

  // Amostragem de 200 códigos
  const sampled = new Set<string>();
  for (let i = 0; i < 200; i += 1) {
    sampled.add(generateRegistrationCode());
  }
  assert(sampled.size === 200, '200 gerações criptográficas consecutivas produzem 200 códigos únicos', suite1);

  // Verificar que buildRegistrationId não contém CPF, e-mail nem hash de dados pessoais
  const idSample = getOrCreateParticipantRegistrationIdentity('123.456.789-01', 'segredo@carangola.gov.br');
  assert(
    !idSample.id.includes('123456') &&
      !idSample.id.includes('segredo') &&
      /^reg-[a-z0-9]+-[a-z0-9]{10}$/.test(idSample.id),
    'Identificador de inscrição não expõe CPF, e-mail ou hashes públicos de dados pessoais',
    suite1,
    idSample.id
  );

  const idRepeat = getOrCreateParticipantRegistrationIdentity('123.456.789-01', 'segredo@carangola.gov.br');
  assert(
    idSample.id === idRepeat.id && idSample.code === idRepeat.code,
    'Repetição da mesma operação reutiliza identificador e código estáveis',
    suite1
  );

  // Simular banco Firestore em memória para testar atomicidade, colisão, concorrência e idempotência
  const mockFirestoreRegs = new Map<string, Record<string, unknown>>();
  const mockFirestorePerms = new Map<string, Record<string, unknown>>();

  setFirestoreRegistrationAdapterForTests({
    async getPermissionDoc(code: string) {
      const existing = mockFirestorePerms.get(code);
      return { exists: Boolean(existing), data: existing };
    },
    async commitRegistrationBatch(regId, regPayload, permCode, permPayload) {
      // Regra real do Firestore: escrita pública só é permitida se o documento ainda NÃO existir (allow create)
      if (mockFirestorePerms.has(permCode) || mockFirestoreRegs.has(regId)) {
        throw new Error('Missing or insufficient permissions (PERMISSION_DENIED)');
      }
      mockFirestoreRegs.set(regId, regPayload);
      mockFirestorePerms.set(permCode, permPayload);
    }
  });

  // Pré-popular CAR-SM-001 (como existe em produção)
  mockFirestorePerms.set('CAR-SM-001', {
    code: 'CAR-SM-001',
    registrationId: 'reg-legacy-001',
    status: 'confirmada',
    certificateIssued: false
  });

  // 1. Teste de colisão com CAR-SM-001: não sobrescreve CAR-SM-001 e gera novo código automaticamente
  const collidingReg = makeSampleRegistration({
    id: 'reg-new-participant-01',
    code: 'CAR-SM-001'
  });
  const collisionSaveRes = await savePublicRegistrationToDb(collidingReg);
  assert(
    collisionSaveRes.success &&
      collisionSaveRes.code !== 'CAR-SM-001' &&
      mockFirestorePerms.get('CAR-SM-001')?.registrationId === 'reg-legacy-001',
    'Colisão com CAR-SM-001 é tratada com novo código sem sobrescrever documento existente',
    suite1,
    `Novo código: ${collisionSaveRes.code}`
  );

  // 2. Teste de idempotência: repetir o envio da mesma inscrição (mesmo id e código) não duplica nem falha
  const savedReg: Registration = {
    ...collidingReg,
    id: collisionSaveRes.id,
    code: collisionSaveRes.code
  };
  const countBeforeRepeat = mockFirestoreRegs.size;
  const repeatSaveRes = await savePublicRegistrationToDb(savedReg);
  assert(
    repeatSaveRes.success &&
      repeatSaveRes.alreadyExisted === true &&
      repeatSaveRes.code === savedReg.code &&
      mockFirestoreRegs.size === countBeforeRepeat,
    'Repetição do mesmo pedido é idempotente e não cria inscrição duplicada no Firestore',
    suite1
  );

  // 3. Teste de concorrência simultânea: duas inscrições distintas tentando o mesmo código inicial ao mesmo tempo
  const sharedRaceCode = 'CAR-SM-RACE9999';
  let raceReads = 0;
  setFirestoreRegistrationAdapterForTests({
    async getPermissionDoc(code: string) {
      raceReads += 1;
      // Nas duas primeiras leituras simultâneas (antes do commit), ambas veem exists=false
      if (code === sharedRaceCode && raceReads <= 2 && !mockFirestorePerms.has(code)) {
        return { exists: false };
      }
      const existing = mockFirestorePerms.get(code);
      return { exists: Boolean(existing), data: existing };
    },
    async commitRegistrationBatch(regId, regPayload, permCode, permPayload) {
      if (mockFirestorePerms.has(permCode) || mockFirestoreRegs.has(regId)) {
        throw new Error('Missing or insufficient permissions (PERMISSION_DENIED)');
      }
      mockFirestoreRegs.set(regId, regPayload);
      mockFirestorePerms.set(permCode, permPayload);
    }
  });

  const concurrentReg1 = makeSampleRegistration({ id: 'reg-concurrent-001', code: sharedRaceCode });
  const concurrentReg2 = makeSampleRegistration({ id: 'reg-concurrent-002', code: sharedRaceCode });
  const [concRes1, concRes2] = await Promise.all([
    savePublicRegistrationToDb(concurrentReg1),
    savePublicRegistrationToDb(concurrentReg2)
  ]);
  assert(
    concRes1.success &&
      concRes2.success &&
      concRes1.code !== concRes2.code &&
      mockFirestoreRegs.has('reg-concurrent-001') &&
      mockFirestoreRegs.has('reg-concurrent-002'),
    'Inscrições concorrentes simultâneas resolvem corrida de escrita sem sobrescrever documentos',
    suite1,
    `Codes: ${concRes1.code} vs ${concRes2.code}`
  );

  // 4. Teste de falha real de Firestore (indisponível/offline): propaga erro real e não reporta sucesso
  setFirestoreRegistrationAdapterForTests({
    async getPermissionDoc() {
      throw new Error('Failed to fetch (client is offline)');
    },
    async commitRegistrationBatch() {
      throw new Error('Failed to fetch (client is offline)');
    }
  });

  let offlineSaveFailed = false;
  try {
    await savePublicRegistrationToDb(makeSampleRegistration({ id: 'reg-offline-fail-01' }));
  } catch (err: any) {
    offlineSaveFailed = err?.message?.includes('"category":"offline"');
  }
  assert(
    offlineSaveFailed && !mockFirestoreRegs.has('reg-offline-fail-01'),
    'Falha de gravação no Firestore propaga erro classificado e nunca confirma inscrição falsa',
    suite1
  );

  // ----------------------------------------------------
  // SUITE 2: FILA OFFLINE REAL E IDEMPOTENTE
  // ----------------------------------------------------
  const suite2 = 'Fila Offline & Sincronização';

  const failRegId = 'reg-queue-fail-02';
  setFirestoreRegistrationAdapterForTests({
    async getPermissionDoc(code: string) {
      const existing = mockFirestorePerms.get(code);
      return { exists: Boolean(existing), data: existing };
    },
    async commitRegistrationBatch(regId, regPayload, permCode, permPayload) {
      if (regId === failRegId) {
        throw new Error('Service temporarily unavailable');
      }
      mockFirestoreRegs.set(regId, regPayload);
      mockFirestorePerms.set(permCode, permPayload);
    }
  });

  const qItem1 = makeSampleRegistration({ id: 'reg-queue-ok-01', code: 'CAR-SM-QOK00001' });
  const qItem2 = makeSampleRegistration({ id: failRegId, code: 'CAR-SM-QFAIL002' });
  const qItem3 = makeSampleRegistration({ id: 'reg-queue-ok-03', code: 'CAR-SM-QOK00003' });

  const syncOutcome1 = await synchronizeOfflineRegistrationQueue([qItem1, qItem2, qItem3], []);
  assert(
    syncOutcome1.synced.length === 2 &&
      syncOutcome1.remainingQueue.length === 1 &&
      syncOutcome1.remainingQueue[0].id === failRegId &&
      !syncOutcome1.allSucceeded,
    'Fila offline envia pendentes, remove apenas confirmados e preserva itens com falha',
    suite2
  );

  // Executar sincronização novamente com os itens já confirmados: não duplica dados
  const syncOutcome2 = await synchronizeOfflineRegistrationQueue(
    [qItem1, qItem3],
    syncOutcome1.mergedRegistrations
  );
  assert(
    syncOutcome2.mergedRegistrations.length === 2 && syncOutcome2.remainingQueue.length === 0,
    'Repetir a sincronização da fila offline é idempotente e não duplica inscrições',
    suite2
  );

  setFirestoreRegistrationAdapterForTests(null);

  // ----------------------------------------------------
  // SUITE 3: FIREBASE & AUTENTICAÇÃO ADMINISTRATIVA REAL
  // ----------------------------------------------------
  const suite3 = 'Firebase & Segurança Administrativa';

  assert(
    !isVerifiedAdminUser(null) && !isVerifiedAdminUser(undefined),
    'isVerifiedAdminUser rejeita sessões nulas ou indefinidas',
    suite3
  );

  assert(
    !isVerifiedAdminUser({
      uid: 'gestor-carangola-local',
      email: 'farmaciademinas.marketing@gmail.com',
      emailVerified: true,
      isLocalFallback: true
    } as any),
    'isVerifiedAdminUser rejeita sessões locais simuladas (isLocalFallback)',
    suite3
  );

  assert(
    !isVerifiedAdminUser({
      uid: 'uid-nao-autorizado',
      email: 'intruso@exemplo.com',
      emailVerified: true
    } as any),
    'isVerifiedAdminUser rejeita utilizadores autenticados fora da lista de gestores',
    suite3
  );

  // Operações administrativas bloqueadas para utilizador não autenticado
  let unauthWriteBlocked = false;
  let unauthDeleteBlocked = false;
  let unauthConfigBlocked = false;

  try {
    await persistRegistrationAndPermissionInDb(makeSampleRegistration());
  } catch (err: any) {
    unauthWriteBlocked = err?.message === 'ADMIN_AUTH_REQUIRED';
  }
  try {
    await deleteRegistrationInDb(makeSampleRegistration());
  } catch (err: any) {
    unauthDeleteBlocked = err?.message === 'ADMIN_AUTH_REQUIRED';
  }
  try {
    await saveEventConfigInDb(INITIAL_EVENT_CONFIG);
  } catch (err: any) {
    unauthConfigBlocked = err?.message === 'ADMIN_AUTH_REQUIRED';
  }

  assert(
    unauthWriteBlocked && unauthDeleteBlocked && unauthConfigBlocked,
    'Utilizador não autenticado é bloqueado em todas as operações administrativas (persist/delete/config)',
    suite3
  );

  setFirestoreConnectionProbeForTests(async () => {
    throw new Error('PERMISSION_DENIED: Missing or insufficient permissions');
  });
  const connRes = await testFirestoreConnection();
  setFirestoreConnectionProbeForTests(null);
  assert(
    connRes.ok === false && connRes.category === 'permission_denied',
    'testFirestoreConnection reporta erro real (ok: false) quando ocorre erro de autorização',
    suite3
  );

  const cfgSummary = getActiveFirebaseConfigSummary();
  assert(
    cfgSummary.projectId === 'gen-lang-client-0461787389',
    'Configuração Firebase utiliza consistentemente o projeto oficial ativo (gen-lang-client-0461787389)',
    suite3
  );

  // ----------------------------------------------------
  // SUITE 4: SEGURANÇA DO ENDPOINT SMTP, IDEMPOTÊNCIA E RATE LIMIT
  // ----------------------------------------------------
  const suite4 = 'API Gmail SMTP, Anti-Relay & Idempotência';

  resetEmailServerStateForTests();
  const prevSmtpUser = process.env.SMTP_USER;
  const prevSmtpPass = process.env.SMTP_PASS;
  process.env.SMTP_USER = 'farmaciademinas.marketing@gmail.com';
  process.env.SMTP_PASS = 'mock-app-password-16c';

  const trustedDbRecords = new Map<string, TrustedRegistrationRecord>();
  trustedDbRecords.set('CAR-SM-VALID100', {
    id: 'reg-valid-100',
    code: 'CAR-SM-VALID100',
    fullName: 'Dr. João Souza',
    email: 'joao.souza@sus.carangola.mg.gov.br',
    city: 'Carangola',
    professionalRole: 'Médico(a)',
    institution: 'Hospital Casa de Caridade',
    axisInterest: 'Eixo 2: Manejo de Crises',
    status: 'confirmada'
  });

  setRegistrationLookupForTests(async (code: string, registrationId?: string) => {
    const rec = trustedDbRecords.get(code);
    if (!rec) {
      return {
        ok: false,
        httpStatus: 404,
        errorCode: 'REGISTRATION_NOT_FOUND',
        error: 'Inscrição não encontrada no banco de dados oficial.'
      };
    }
    if (registrationId && registrationId !== rec.id) {
      return {
        ok: false,
        httpStatus: 403,
        errorCode: 'REGISTRATION_ID_MISMATCH',
        error: 'ID divergente.'
      };
    }
    return { ok: true, record: rec };
  });

  let smtpCallCount = 0;
  let lastSentMailTo = '';
  setSmtpSendForTests(async (mailOpts) => {
    smtpCallCount += 1;
    lastSentMailTo = mailOpts.to;
    return {
      messageId: `<mock-msg-${smtpCallCount}@gmail.com>`,
      accepted: [mailOpts.to],
      rejected: []
    };
  });

  // 4.1 Rejeita tentativa de o cliente definir o destinatário (`to`)
  const relayAttemptTo = createMockHttp('POST', {
    code: 'CAR-SM-VALID100',
    to: 'vitima@qualquerdominio.com'
  });
  await emailHandler(relayAttemptTo.req, relayAttemptTo.res);
  assert(
    relayAttemptTo.getStatus() === 400 &&
      relayAttemptTo.getData()?.errorCode === 'FORBIDDEN_CLIENT_PARAMETERS' &&
      smtpCallCount === 0,
    'API rejeita tentativa de alterar ou informar destinatário arbitrário pelo cliente (HTTP 400)',
    suite4
  );

  // 4.2 Rejeita tentativa de o cliente enviar HTML ou assunto arbitrário
  const relayAttemptHtml = createMockHttp('POST', {
    code: 'CAR-SM-VALID100',
    bodyHtml: '<h1>Phishing</h1>'
  });
  await emailHandler(relayAttemptHtml.req, relayAttemptHtml.res);
  assert(
    relayAttemptHtml.getStatus() === 400 &&
      relayAttemptHtml.getData()?.errorCode === 'FORBIDDEN_CLIENT_PARAMETERS' &&
      smtpCallCount === 0,
    'API rejeita tentativa de enviar HTML ou assunto arbitrário pelo cliente (HTTP 400)',
    suite4
  );

  // 4.3 Rejeita inscrição inexistente com HTTP 404 sem enviar e-mail
  const unknownCodeReq = createMockHttp('POST', {
    code: 'CAR-SM-NAOEXISTE',
    registrationId: 'reg-inexistente'
  });
  await emailHandler(unknownCodeReq.req, unknownCodeReq.res);
  assert(
    unknownCodeReq.getStatus() === 404 &&
      unknownCodeReq.getData()?.errorCode === 'REGISTRATION_NOT_FOUND' &&
      smtpCallCount === 0,
    'Inscrição inexistente no Firestore retorna HTTP 404 e não envia e-mail',
    suite4
  );

  // 4.4 Envio legítimo: recupera destinatário diretamente do registo confiável e envia via SMTP
  const validSendReq = createMockHttp('POST', {
    code: 'CAR-SM-VALID100',
    registrationId: 'reg-valid-100'
  });
  await emailHandler(validSendReq.req, validSendReq.res);
  assert(
    validSendReq.getStatus() === 200 &&
      validSendReq.getData()?.actuallySent === true &&
      validSendReq.getData()?.emailStatus === 'accepted_by_smtp' &&
      smtpCallCount === 1 &&
      lastSentMailTo === 'joao.souza@sus.carangola.mg.gov.br',
    'Envio legítimo recupera destinatário do Firestore e confirma aceitação pelo servidor SMTP',
    suite4
  );

  // 4.5 Idempotência persistente: repetição automática do pedido não envia segundo e-mail
  const duplicateSendReq = createMockHttp('POST', {
    code: 'CAR-SM-VALID100',
    registrationId: 'reg-valid-100'
  });
  await emailHandler(duplicateSendReq.req, duplicateSendReq.res);
  assert(
    duplicateSendReq.getStatus() === 200 &&
      duplicateSendReq.getData()?.idempotent === true &&
      smtpCallCount === 1,
    'Repetição de pedido para a mesma inscrição é idempotente e não gera e-mail duplicado',
    suite4
  );

  // 4.6 Cooldown de reenvio explícito: bloqueia reenvio imediato (<60s) com HTTP 429
  const immediateResendReq = createMockHttp('POST', {
    code: 'CAR-SM-VALID100',
    registrationId: 'reg-valid-100',
    resend: true
  });
  await emailHandler(immediateResendReq.req, immediateResendReq.res);
  assert(
    immediateResendReq.getStatus() === 429 &&
      immediateResendReq.getData()?.errorCode === 'RESEND_COOLDOWN' &&
      smtpCallCount === 1,
    'Reenvio explícito imediato respeita janela de cooldown e bloqueia abuso (HTTP 429)',
    suite4
  );

  // 4.7 Rate limiting por código de inscrição (máx 5 tentativas por janela)
  for (let i = 0; i < 5; i += 1) {
    const attemptReq = createMockHttp('POST', { code: 'CAR-SM-FLOOD999' }, `198.51.100.${i + 1}`);
    await emailHandler(attemptReq.req, attemptReq.res);
  }
  const sixthAttemptReq = createMockHttp('POST', { code: 'CAR-SM-FLOOD999' }, '198.51.100.99');
  await emailHandler(sixthAttemptReq.req, sixthAttemptReq.res);
  assert(
    sixthAttemptReq.getStatus() === 429 &&
      sixthAttemptReq.getData()?.errorCode === 'RATE_LIMIT_EXCEEDED',
    'Rate limiting bloqueia excesso de tentativas para o mesmo código com HTTP 429',
    suite4
  );

  // 4.8 Falha do servidor SMTP retorna HTTP 502 com actuallySent: false
  trustedDbRecords.set('CAR-SM-SMTPFAIL', {
    id: 'reg-smtp-fail',
    code: 'CAR-SM-SMTPFAIL',
    fullName: 'Ana Costa',
    email: 'ana.costa@carangola.mg.gov.br',
    city: 'Carangola',
    professionalRole: 'Enfermeiro(a)',
    institution: 'UBS Centro',
    axisInterest: 'Eixo 1',
    status: 'confirmada'
  });
  setSmtpSendForTests(async () => {
    throw new Error('535-5.7.8 Username and Password not accepted');
  });

  const smtpFailReq = createMockHttp('POST', {
    code: 'CAR-SM-SMTPFAIL',
    registrationId: 'reg-smtp-fail'
  });
  await emailHandler(smtpFailReq.req, smtpFailReq.res);
  assert(
    smtpFailReq.getStatus() === 502 &&
      smtpFailReq.getData()?.actuallySent === false &&
      smtpFailReq.getData()?.emailStatus === 'failed',
    'Falha de autenticação/conexão SMTP retorna HTTP 502 e nunca reporta sucesso falso',
    suite4
  );

  // 4.9 Ausência de credenciais SMTP retorna HTTP 503 com emailStatus: pending_config
  delete process.env.SMTP_PASS;
  trustedDbRecords.set('CAR-SM-NOCONFIG', {
    id: 'reg-no-config',
    code: 'CAR-SM-NOCONFIG',
    fullName: 'Carlos Lima',
    email: 'carlos@carangola.mg.gov.br',
    city: 'Carangola',
    professionalRole: 'Assistente Social',
    institution: 'CRAS',
    axisInterest: 'Eixo 3',
    status: 'confirmada'
  });
  const noSmtpReq = createMockHttp('POST', {
    code: 'CAR-SM-NOCONFIG',
    registrationId: 'reg-no-config'
  });
  await emailHandler(noSmtpReq.req, noSmtpReq.res);
  assert(
    noSmtpReq.getStatus() === 503 &&
      noSmtpReq.getData()?.actuallySent === false &&
      noSmtpReq.getData()?.emailStatus === 'pending_config',
    'SMTP não configurado retorna HTTP 503 com estado pending_config',
    suite4
  );

  // Restaurar ambiente
  if (prevSmtpUser !== undefined) process.env.SMTP_USER = prevSmtpUser;
  else delete process.env.SMTP_USER;
  if (prevSmtpPass !== undefined) process.env.SMTP_PASS = prevSmtpPass;
  else delete process.env.SMTP_PASS;
  setRegistrationLookupForTests(null);
  setSmtpSendForTests(null);
  resetEmailServerStateForTests();

  // ----------------------------------------------------
  // SUITE 5: VERCEL CONFIG & AUDITORIA DE SEGREDOS NO BUNDLE
  // ----------------------------------------------------
  const suite5 = 'Vercel Routing & Bundle Security';

  const statusMock = createMockHttp('GET', {});
  await statusHandler(statusMock.req, statusMock.res);
  assert(
    statusMock.getStatus() === 200 &&
      typeof statusMock.getData()?.smtpConfigured === 'boolean' &&
      !('smtpPass' in (statusMock.getData() || {})),
    'Endpoint /api/email/status reporta prontidão sem expor segredos',
    suite5
  );

  const mapsMock = createMockHttp('GET', {});
  await mapsHandler(mapsMock.req, mapsMock.res);
  assert(
    mapsMock.getStatus() === 200 && 'apiKey' in (mapsMock.getData() || {}),
    'Endpoint /api/maps/config responde com JSON válido',
    suite5
  );

  const rewrites = vercelConfig.rewrites || [];
  const spaRewrite = rewrites.find((r: any) => r.destination === '/index.html');
  assert(
    Boolean(spaRewrite && spaRewrite.source === '/((?!api/).*)'),
    'vercel.json preserva rotas /api/* fora do rewrite da SPA',
    suite5
  );

  // Inspecionar bundle dist/ se já compilado
  const distAssetsDir = path.resolve(process.cwd(), 'dist', 'assets');
  if (fs.existsSync(distAssetsDir)) {
    const jsFiles = fs.readdirSync(distAssetsDir).filter((f) => f.endsWith('.js'));
    let hasDemoEmailJs = false;
    let hasFakeLocalAdmin = false;
    let hasSmtpPassSecret = false;
    const rawEnvPass = process.env.SMTP_PASS || '';

    for (const file of jsFiles) {
      const content = fs.readFileSync(path.join(distAssetsDir, file), 'utf-8');
      if (
        content.includes('service_sus_carangola') ||
        content.includes('template_inscricao_sus')
      ) {
        hasDemoEmailJs = true;
      }
      if (content.includes('gestor-carangola-local')) {
        hasFakeLocalAdmin = true;
      }
      if (rawEnvPass && rawEnvPass.length >= 8 && content.includes(rawEnvPass)) {
        hasSmtpPassSecret = true;
      }
    }

    assert(
      !hasDemoEmailJs,
      'Bundle de produção (dist/) não contém identificadores demonstrativos do EmailJS',
      suite5
    );
    assert(
      !hasFakeLocalAdmin,
      'Bundle de produção (dist/) não contém sessão administrativa local simulada',
      suite5
    );
    assert(
      !hasSmtpPassSecret,
      'Bundle de produção (dist/) não expõe credenciais SMTP do servidor',
      suite5
    );
  }

  // 6. Palestrantes & Gestão Editável
  const suite6 = 'Palestrantes & Gestão Editável';
  const mockStorageMap = new Map<string, string>();
  (globalThis as unknown as { localStorage: unknown }).localStorage = {
    getItem: (k: string) => mockStorageMap.get(k) || null,
    setItem: (k: string, v: string) => mockStorageMap.set(k, v),
    removeItem: (k: string) => mockStorageMap.delete(k),
    clear: () => mockStorageMap.clear()
  };

  const storedSpeakersData = loadStoredData();
  assert(
    Array.isArray(storedSpeakersData.speakers) && storedSpeakersData.speakers.length > 0,
    'loadStoredData inicializa e disponibiliza a lista de palestrantes',
    suite6
  );

  const customTestSpeaker: SpeakerProfile = {
    id: 'spk-test-custom-1',
    name: 'Dr. Teste Palestrante SUS',
    role: 'Psiquiatra Convidado',
    institution: 'SMS Carangola',
    sessionGroup: 'mesa-1',
    sessionLabel: 'Mesa 1 · RAPS',
    sessionTime: '10h00',
    bio: 'Biografia resumida de teste.',
    socials: {
      instagramUrl: 'https://instagram.com/teste',
      linkedinUrl: 'https://linkedin.com/in/teste',
      lattesUrl: 'http://lattes.cnpq.br/0000000000'
    }
  };
  saveSpeakersToStorage([customTestSpeaker]);
  const reloadedSpeakers = loadStoredData();
  assert(
    reloadedSpeakers.speakers.some((s) => s.id === 'spk-test-custom-1' && s.socials?.instagramUrl === 'https://instagram.com/teste'),
    'saveSpeakersToStorage persiste palestrantes customizados e links sociais no storage',
    suite6
  );

  console.log('\n======================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`TOTAL DE TESTES EXECUTADOS: ${totalCount}`);
  console.log(`TESTES APROVADOS: ${passedCount}`);
  console.log(`TESTES COM FALHA: ${totalCount - passedCount}`);
  console.log('======================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Falha fatal na execução dos testes:', err);
  process.exit(1);
});
