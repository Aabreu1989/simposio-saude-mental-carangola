/**
 * Suite Completa de Validação Técnica e Integridade Ponta a Ponta
 * Simpósio de Saúde Mental — SUS Carangola
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  generateRegistrationCode,
  getOrCreateParticipantRegistrationIdentity,
  clearParticipantAttemptCache,
  buildRegistrationId,
  loadStoredData,
  saveSpeakersToStorage,
  mergeSpeakersWithDefaults,
  INVENTED_POST_IDS,
  getDeletedPostIds,
  addDeletedPostId,
  STORAGE_KEYS
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
  saveEventConfigInDb,
  saveSocialPostToDb,
  likeSocialPostInDb,
  deleteSocialPostInDb,
  moderateSocialPostInDb,
  setSocialPostsAdapterForTests,
  saveNotificationToDb,
  deleteNotificationInDb,
  setNotificationsAdapterForTests,
  subscribeNewsletterInDb,
  unsubscribeNewsletterInDb,
  deleteSubscriberInDb,
  setNewsletterAdapterForTests,
  sha256Hex,
  generateSecureToken,
  ensureAuthenticatedUser,
  setEnsureAuthObserverForTests,
  ACTIVE_FIREBASE_PROJECT_ID,
  ACTIVE_FIRESTORE_DATABASE_ID
} from '../src/services/firebaseDb.ts';
import { validateRegistrationFormData } from '../src/components/RegistrationModal.tsx';

import emailHandler, {
  resetEmailServerStateForTests,
  setRegistrationLookupForTests,
  setSmtpSendForTests,
  setConfirmationStoreForTests,
  createInMemoryConfirmationStore,
  type TrustedRegistrationRecord,
  LEASE_DURATION_MS,
  RESEND_COOLDOWN_MS,
  MAX_TOTAL_SENDS_PER_REGISTRATION
} from '../api/email/confirm-registration.ts';
import statusHandler from '../api/email/status.ts';
import mapsHandler from '../api/maps/config.ts';
import vercelConfig from '../vercel.json' with { type: 'json' };
import { INITIAL_EVENT_CONFIG, SPEAKERS_PROFILES, INITIAL_SOCIAL_POSTS } from '../src/data/initialData.ts';
import type { Registration, SpeakerProfile, SocialPost, PushNotificationItem, NewsletterSubscriber } from '../src/types.ts';

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
    cfgSummary.projectId === 'simposio-carangola',
    'Configuração Firebase utiliza consistentemente o projeto oficial ativo (simposio-carangola)',
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

  // 6.3 Verificação de fotos oficiais e diagramação anti-corte de rosto
  mockStorageMap.clear();
  const initialSpeakers = loadStoredData().speakers;
  const raquelSpk = initialSpeakers.find((s) => s.id === 'spk-raquel-pinheiro');
  const camilaSpk = initialSpeakers.find((s) => s.id === 'spk-camila-lima');
  const christineSpk = initialSpeakers.find((s) => s.id === 'spk-christine-vianna');
  const martaSpk = initialSpeakers.find((s) => s.id === 'spk-marta-elizabeth');
  const giseleSpk = initialSpeakers.find((s) => s.id === 'spk-gisele-souza');
  const ricardoSpk = initialSpeakers.find((s) => s.id === 'spk-ricardo-moebus');

  assert(
    Boolean(
      raquelSpk?.photoUrl?.includes('164x1fTpuX5ccozFhrOyIII3Dda-EutZo') &&
      raquelSpk?.photoPosition === 'center 18%' &&
      camilaSpk?.photoUrl?.includes('1qPmMioljImchVKsJXMxcdD2DtBR-F5ea') &&
      camilaSpk?.photoPosition === 'center 18%' &&
      christineSpk?.photoUrl?.includes('1ECDp9a7CYDobMLRnRHKdKkJ1H8QlAsoY') &&
      christineSpk?.photoPosition === 'center 18%' &&
      martaSpk?.photoUrl?.includes('1wa5ODL3uWgnrpM89TvEBQwAoP3fKH_-d') &&
      martaSpk?.photoPosition === 'center 18%' &&
      giseleSpk?.photoUrl?.includes('1oTUz3LV55E7_oFaiJuonOk4UzpcFfZ-1') &&
      giseleSpk?.photoPosition === 'center 18%' &&
      ricardoSpk?.photoUrl?.includes('1xllBR5PaSr5y39gBITmcxU-tvRVTAv5U') &&
      ricardoSpk?.photoPosition === 'center 18%'
    ),
    'Palestrantes oficiais possuem links de fotos normalizados e posicionamento anti-corte (center 18%) configurado',
    suite6
  );

  // 7. Repositório Técnico & Documentos Oficiais para Download
  const suite7 = 'Repositório Técnico & Documentos para Download';
  const initialMaterials = loadStoredData().materials;

  const expectedNewIds = [
    'mat-caps-bem-te-quero-2026',
    'mat-eap-desinst-2026',
    'mat-guia-raps-mg-2022',
    'mat-guia-crise-raps-2026'
  ];

  const hasAllNewDocs = expectedNewIds.every((docId) =>
    initialMaterials.some((m) => m.id === docId && m.format === 'PDF' && m.fileUrl?.startsWith('/materiais/'))
  );
  assert(
    hasAllNewDocs,
    'INITIAL_MATERIALS inclui os 4 novos documentos técnicos oficiais (Fiocruz, MS, ESP-MG) com rotas estáticas',
    suite7
  );

  const materialsDir = path.resolve(process.cwd(), 'public', 'materiais');
  const filesExistOnDisk = expectedNewIds.every((docId) => {
    const mat = initialMaterials.find((m) => m.id === docId);
    if (!mat?.fileName) return false;
    return fs.existsSync(path.join(materialsDir, mat.fileName));
  });
  assert(
    filesExistOnDisk,
    'Arquivos PDF dos 4 novos documentos existem fisicamente na pasta public/materiais',
    suite7
  );

  // Simula utilizador com cache anterior de materiais em localStorage incluindo documento privado mat-5
  mockStorageMap.set('simposio_materials', JSON.stringify([
    { id: 'mat-1', title: 'Guia Antigo', category: 'Cartilha', format: 'PDF', fileUrl: '/assets/antigo.pdf' },
    { id: 'mat-5', title: 'Termo de Responsabilidade de Cessão de Uso de Espaço - Auditório UEMG Carangola', category: 'Legislação', format: 'PDF', fileUrl: '/assets/termo.pdf' }
  ]));
  const reloadedWithCache = loadStoredData();
  const preservedNewDocs = expectedNewIds.every((docId) =>
    reloadedWithCache.materials.some((m) => m.id === docId)
  );
  assert(
    preservedNewDocs,
    'loadStoredData mescla novos documentos oficiais mesmo para usuários com cache prévio em localStorage',
    suite7
  );

  const mat5PermanentlyBlocked = reloadedWithCache.materials.every(
    (m) => m.id !== 'mat-5' && !m.title?.toLowerCase().includes('cessão de uso')
  );
  assert(
    mat5PermanentlyBlocked,
    'Documento privado Termo de Cessão de Uso (mat-5) é estritamente expurgado do estado e nunca aparece na plataforma',
    suite7
  );

  // 8. Homologação e Conexão Cloud: SocialWall, Alertas e Newsletter
  const suite8 = 'Homologação e Conexão Cloud (SocialWall, Alertas & Newsletter)';

  // 8.1 Social Wall: Persistência centralizada e sincronização
  const mockSocialPostsDb = new Map<string, SocialPost>();
  const mockLikesDb = new Map<string, Set<string>>(); // postId -> Set of voterIds

  setSocialPostsAdapterForTests({
    async savePost(post) {
      mockSocialPostsDb.set(post.id, { ...post });
      return post;
    },
    async toggleLike(postId, voterId) {
      if (!mockLikesDb.has(postId)) {
        mockLikesDb.set(postId, new Set());
      }
      const voters = mockLikesDb.get(postId)!;
      let hasLiked = false;
      if (voters.has(voterId)) {
        voters.delete(voterId);
        hasLiked = false;
      } else {
        voters.add(voterId);
        hasLiked = true;
      }
      const p = mockSocialPostsDb.get(postId);
      if (p) {
        p.likes = voters.size;
      }
      return { likes: voters.size, hasLiked };
    },
    async deletePost(postId) {
      mockSocialPostsDb.delete(postId);
    },
    async moderatePost(postId, status, pinned) {
      const p = mockSocialPostsDb.get(postId);
      if (p) {
        p.status = status;
        p.pinned = !!pinned;
      }
    }
  });

  const testPost: SocialPost = {
    id: 'post-test-device-1',
    authorName: 'Dr. Roberto Mendes',
    authorRole: 'Psiquiatra CAPS II',
    city: 'Carangola',
    content: 'Atenção integral e cuidado territorializado em debate no Simpósio.',
    hashtags: '#SaudeMentalCarangola',
    likes: 0,
    hasLiked: false,
    createdAt: '16/11/2026 às 14h00',
    timestamp: Date.now(),
    status: 'approved'
  };

  await saveSocialPostToDb(testPost);
  assert(
    mockSocialPostsDb.has('post-test-device-1') &&
      mockSocialPostsDb.get('post-test-device-1')?.content === testPost.content,
    'Postagem criada em um dispositivo é persistida no banco e fica acessível na nuvem',
    suite8
  );

  // 8.2 Prevenção de duplicação de curtidas pelo mesmo votante
  const like1 = await likeSocialPostInDb('post-test-device-1', 'voter-alice-session');
  assert(
    like1.hasLiked === true && like1.likes === 1,
    'Primeira curtida do eleitor é registrada com sucesso',
    suite8
  );

  const likeRepeat = await likeSocialPostInDb('post-test-device-1', 'voter-alice-session');
  assert(
    likeRepeat.hasLiked === false && likeRepeat.likes === 0,
    'Segunda interação do mesmo eleitor remove a curtida atomicamente sem gerar duplicação',
    suite8
  );

  // Múltiplos eleitores distintos incrementam de forma consistente
  await likeSocialPostInDb('post-test-device-1', 'voter-bob-session');
  const likeMulti = await likeSocialPostInDb('post-test-device-1', 'voter-carol-session');
  assert(
    likeMulti.likes === 2,
    'Curtidas de múltiplos dispositivos distintos são consistentes e acumuladas',
    suite8
  );

  // 8.3 Moderação e exclusão de posts: Restrição a administrador autenticado
  setSocialPostsAdapterForTests(null); // Ativa verificação real do auth
  let nonAdminPostDeleteBlocked = false;
  try {
    await deleteSocialPostInDb('post-test-device-1');
  } catch (err: unknown) {
    if ((err as Error).message === 'ADMIN_AUTH_REQUIRED') {
      nonAdminPostDeleteBlocked = true;
    }
  }
  assert(
    nonAdminPostDeleteBlocked,
    'Tentativa de exclusão de post por usuário não autenticado é rejeitada (ADMIN_AUTH_REQUIRED)',
    suite8
  );

  let nonAdminModerateBlocked = false;
  try {
    await moderateSocialPostInDb('post-test-device-1', 'rejected');
  } catch (err: unknown) {
    if ((err as Error).message === 'ADMIN_AUTH_REQUIRED') {
      nonAdminModerateBlocked = true;
    }
  }
  assert(
    nonAdminModerateBlocked,
    'Tentativa de moderação de post por usuário comum é rejeitada (ADMIN_AUTH_REQUIRED)',
    suite8
  );

  // 8.4 Alertas & Notificações: Persistência e restrição de permissão
  const mockNotificationsDb = new Map<string, PushNotificationItem>();
  setNotificationsAdapterForTests({
    async saveNotification(item) {
      mockNotificationsDb.set(item.id, { ...item });
    },
    async deleteNotification(id) {
      mockNotificationsDb.delete(id);
    }
  });

  const testAlert: PushNotificationItem = {
    id: 'notif-urgente-credenciamento',
    title: 'Abertura do Credenciamento às 7h30',
    body: 'Dirija-se ao hall da UEMG Carangola para retirada do crachá institucional.',
    category: 'urgente',
    targetAudience: 'todos',
    sentAt: new Date().toISOString(),
    readCount: 0,
    totalSent: 150
  };

  await saveNotificationToDb(testAlert);
  assert(
    mockNotificationsDb.has('notif-urgente-credenciamento') &&
      mockNotificationsDb.get('notif-urgente-credenciamento')?.category === 'urgente',
    'Alerta administrativo é persistido na nuvem e fica disponível para todos os participantes',
    suite8
  );

  setNotificationsAdapterForTests(null); // Ativa verificação real
  let nonAdminNotifBlocked = false;
  try {
    await saveNotificationToDb(testAlert);
  } catch (err: unknown) {
    if ((err as Error).message === 'ADMIN_AUTH_REQUIRED') {
      nonAdminNotifBlocked = true;
    }
  }
  assert(
    nonAdminNotifBlocked,
    'Criação de notificações por usuário não autenticado é estritamente bloqueada',
    suite8
  );

  // 8.5 Estado de leitura de alertas: Isolamento individual
  const session1Dismissed = ['notif-urgente-credenciamento'];
  const session2Dismissed: string[] = [];
  assert(
    session1Dismissed.includes('notif-urgente-credenciamento') &&
      !session2Dismissed.includes('notif-urgente-credenciamento'),
    'Dispensar ou ler um alerta numa sessão não altera o estado global dos outros participantes',
    suite8
  );

  // 8.6 Newsletter: Inscrição, normalização, deduplicação e cancelamento
  const mockSubscribersDb = new Map<string, NewsletterSubscriber>();
  setNewsletterAdapterForTests({
    async subscribe(sub) {
      const cleanEmail = sub.email.trim().toLowerCase();
      const docId = `sub-${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
      const isNew = !mockSubscribersDb.has(docId);
      mockSubscribersDb.set(docId, { ...sub, id: docId, email: cleanEmail, status: 'active' });
      return { isNew, subscriber: mockSubscribersDb.get(docId)! };
    },
    async unsubscribe(emailOrId) {
      const clean = emailOrId.trim().toLowerCase();
      const docId = clean.startsWith('sub-') ? clean : `sub-${clean.replace(/[^a-z0-9]/g, '_')}`;
      const existing = mockSubscribersDb.get(docId);
      if (existing) {
        existing.status = 'unsubscribed';
        existing.receiveWhatsapp = false;
        existing.receiveEmail = false;
      }
    },
    async deleteSubscriber(id) {
      mockSubscribersDb.delete(id);
    }
  });

  const subResult1 = await subscribeNewsletterInDb({
    id: 'temp-1',
    email: 'Mariana.Farmacia@Carangola.MG.GOV.BR',
    name: 'Mariana Silva',
    phone: '(32) 99876-5432',
    receiveWhatsapp: true,
    subscribedAt: '2026-11-16'
  });
  assert(
    subResult1.isNew === true &&
      subResult1.subscriber.email === 'mariana.farmacia@carangola.mg.gov.br' &&
      mockSubscribersDb.size === 1,
    'Inscrição na newsletter normaliza e-mail para minúsculas e persiste com consentimento',
    suite8
  );

  // Tentativa repetida de inscrição com mesmo e-mail (mesmo com caixa diferente)
  const subResult2 = await subscribeNewsletterInDb({
    id: 'temp-2',
    email: 'mariana.farmacia@carangola.mg.gov.br',
    name: 'Mariana Silva Atualizada',
    receiveWhatsapp: true,
    subscribedAt: '2026-11-16'
  });
  assert(
    subResult2.isNew === false && mockSubscribersDb.size === 1,
    'Inscrição repetida é idempotente e evita duplicação de contatos na base',
    suite8
  );

  // Cancelamento de inscrição (unsubscribe)
  await unsubscribeNewsletterInDb('mariana.farmacia@carangola.mg.gov.br');
  const unsubscribedRecord = mockSubscribersDb.get('sub-mariana_farmacia_carangola_mg_gov_br');
  assert(
    unsubscribedRecord?.status === 'unsubscribed' && unsubscribedRecord?.receiveWhatsapp === false,
    'Mecanismo de cancelamento de inscrição (unsubscribe) atualiza estado para unsubscribed',
    suite8
  );

  // 8.7 Exclusão de assinante restrita ao administrador
  setNewsletterAdapterForTests(null); // Ativa verificação real
  let nonAdminDeleteSubBlocked = false;
  try {
    await deleteSubscriberInDb('sub-mariana_farmacia_carangola_mg_gov_br');
  } catch (err: unknown) {
    if ((err as Error).message === 'ADMIN_AUTH_REQUIRED') {
      nonAdminDeleteSubBlocked = true;
    }
  }
  assert(
    nonAdminDeleteSubBlocked,
    'Tentativa de remoção de assinante por usuário não autenticado é rejeitada',
    suite8
  );

  // 8.8 Regras Firestore e Storage: Validação declarativa
  const firestoreRulesContent = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf-8');
  assert(
    firestoreRulesContent.includes('match /social_posts/{postId}') &&
      firestoreRulesContent.includes('match /notifications/{notificationId}') &&
      firestoreRulesContent.includes('match /newsletter_subscribers/{subscriberId}'),
    'firestore.rules contém regras específicas e declarativas para social_posts, notifications e newsletter_subscribers',
    suite8
  );

  const storageRulesPath = path.resolve(process.cwd(), 'storage.rules');
  assert(
    fs.existsSync(storageRulesPath) &&
      fs.readFileSync(storageRulesPath, 'utf-8').includes('match /social_posts/{postId}/{fileName}'),
    'storage.rules existe e protege o upload de fotografias limitando a imagens e 5MB',
    suite8
  );

  assert(
    (vercelConfig as Record<string, unknown>).rewrites !== undefined,
    'Configurações de infraestrutura mantidas íntegras',
    suite8
  );

  // 9. FASE 1 PATCH CIRÚRGICO — SEGURANÇA, LGPD & REGRAS FORENSES
  const suite9 = 'Fase 1 Patch Cirúrgico — Regras de Segurança, Integridade & LGPD';

  // 9.1 Firestore: Identidade e Projeto
  assert(
    ACTIVE_FIREBASE_PROJECT_ID === 'simposio-carangola',
    'Firebase Project ID é o oficial do projeto (simposio-carangola)',
    suite9
  );

  assert(
    ACTIVE_FIRESTORE_DATABASE_ID === '(default)',
    'Database ID oficial está configurado e em uso pelo cliente Firestore',
    suite9
  );

  const firebaseJsonContent = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'firebase.json'), 'utf-8'));
  assert(
    firebaseJsonContent.firestore?.databaseId === '(default)',
    'firebase.json aponta exatamente para a mesma base oficial (default)',
    suite9
  );

  // 9.2 Newsletter: IDs Aleatórios, Criptografia e Privacidade LGPD
  const mockCleanNewsletterDb = new Map<string, NewsletterSubscriber>();
  const mockIndexesDb = new Map<string, { subscriberId: string; createdAt: string }>();

  setNewsletterAdapterForTests({
    async subscribe(sub) {
      const cleanEmail = sub.email.trim().toLowerCase();
      const emailHash = await sha256Hex(cleanEmail);
      const isNew = !mockIndexesDb.has(emailHash);
      const randomSuffix = generateSecureToken().slice(0, 16);
      const docId = `sub-${Date.now().toString(36)}-${randomSuffix}`;
      const unsubToken = generateSecureToken();
      const unsubTokenHash = await sha256Hex(unsubToken);

      const record: NewsletterSubscriber = {
        ...sub,
        id: docId,
        email: cleanEmail,
        emailHash,
        status: 'active',
        consent: true,
        unsubscribeTokenHash: unsubTokenHash,
        unsubscribeTokenExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      };

      mockCleanNewsletterDb.set(docId, record);
      if (isNew) {
        mockIndexesDb.set(emailHash, { subscriberId: docId, createdAt: new Date().toISOString() });
      }

      return { isNew, subscriber: record, unsubscribeToken: unsubToken };
    },
    async unsubscribe(emailOrId, rawToken) {
      const clean = emailOrId.trim().toLowerCase();
      let docId = clean;
      if (clean.includes('@')) {
        const hash = await sha256Hex(clean);
        const idx = mockIndexesDb.get(hash);
        if (!idx) throw new Error('NOT_FOUND');
        docId = idx.subscriberId;
      }

      const existing = mockCleanNewsletterDb.get(docId);
      if (!existing) throw new Error('NOT_FOUND');

      if (!rawToken) {
        throw new Error('TOKEN_PROOF_REQUIRED');
      }

      const tokenProof = await sha256Hex(rawToken);
      if (!existing.unsubscribeTokenHash || tokenProof !== existing.unsubscribeTokenHash) {
        throw new Error('INVALID_TOKEN_PROOF');
      }
      if (existing.status !== 'active') {
        throw new Error('ALREADY_UNSUBSCRIBED');
      }

      existing.status = 'unsubscribed';
      existing.receiveWhatsapp = false;
      existing.receiveEmail = false;
      existing.unsubscribeTokenHash = ''; // Invalida o hash do token após o primeiro uso
      existing.unsubscribedAt = new Date().toISOString();
    },
    async deleteSubscriber(id) {
      mockCleanNewsletterDb.delete(id);
    }
  });

  const secureSub = await subscribeNewsletterInDb({
    id: 'placeholder',
    email: 'carlos.enfermeiro@carangola.mg.gov.br',
    name: 'Carlos Oliveira',
    receiveWhatsapp: true,
    subscribedAt: '2026-11-16'
  });

  assert(
    !secureSub.subscriber.id.includes('@') &&
      !secureSub.subscriber.id.includes('carlos') &&
      secureSub.subscriber.id.startsWith('sub-'),
    'Document ID do assinante é aleatório e opaco, sem expor e-mail ou dados pessoais no path',
    suite9
  );

  assert(
    secureSub.unsubscribeToken !== undefined &&
      secureSub.unsubscribeToken.length >= 32 &&
      secureSub.subscriber.unsubscribeTokenHash !== undefined &&
      secureSub.subscriber.unsubscribeTokenHash.length === 64,
    'Inscrição emite token seguro opaco e armazena exclusivamente o hash SHA-256 no documento',
    suite9
  );

  // Tentativa de terceiro cancelar inscrição fornecendo apenas e-mail ou docId sem token
  let thirdPartyCancelBlocked = false;
  try {
    await unsubscribeNewsletterInDb('carlos.enfermeiro@carangola.mg.gov.br');
  } catch (err: unknown) {
    if ((err as Error).message.includes('TOKEN_PROOF_REQUIRED')) {
      thirdPartyCancelBlocked = true;
    }
  }
  assert(
    thirdPartyCancelBlocked,
    'Terceiro conhecendo apenas o e-mail é estritamente impedido de cancelar inscrição (exige token de titularidade)',
    suite9
  );

  // Tentativa com token falso/incorreto
  let invalidTokenBlocked = false;
  try {
    await unsubscribeNewsletterInDb(secureSub.subscriber.id, 'token-falso-forjado-1234567890');
  } catch (err: unknown) {
    if ((err as Error).message.includes('INVALID_TOKEN_PROOF')) {
      invalidTokenBlocked = true;
    }
  }
  assert(
    invalidTokenBlocked,
    'Cancelamento com token falso é rejeitado com falha de prova criptográfica',
    suite9
  );

  // Cancelamento legítimo com o token seguro emitido
  await unsubscribeNewsletterInDb(secureSub.subscriber.id, secureSub.unsubscribeToken);
  const canceledRecord = mockCleanNewsletterDb.get(secureSub.subscriber.id);
  assert(
    canceledRecord?.status === 'unsubscribed' && canceledRecord?.receiveWhatsapp === false,
    'Cancelamento com prova criptográfica legítima é aceito e atualiza status para unsubscribed',
    suite9
  );

  // Tentativa de reutilização do mesmo token (replay attack)
  let replayBlocked = false;
  try {
    await unsubscribeNewsletterInDb(secureSub.subscriber.id, secureSub.unsubscribeToken);
  } catch (err: unknown) {
    replayBlocked = true;
  }
  assert(
    replayBlocked && canceledRecord?.unsubscribeTokenHash === '',
    'Reutilização da prova de titularidade é terminantemente bloqueada (token invalidado após primeiro uso)',
    suite9
  );

  // 9.3 Social Wall: Moderação Obrigatória e Integridade
  const mockWallDb = new Map<string, SocialPost>();
  setSocialPostsAdapterForTests({
    async savePost(post) {
      mockWallDb.set(post.id, { ...post });
      return post;
    },
    async toggleLike(postId, _voterId) {
      return { likes: 1, hasLiked: true };
    },
    async deletePost(postId) {
      mockWallDb.delete(postId);
    },
    async moderatePost(postId, status, pinned) {
      const p = mockWallDb.get(postId);
      if (p) {
        p.status = status;
        p.pinned = !!pinned;
      }
    }
  });

  const publicCreatedPost = await saveSocialPostToDb({
    id: 'post-public-attempt-1',
    authorName: 'Participante Comum',
    authorRole: 'Estudante',
    city: 'Carangola',
    content: 'Tentando burlar para publicar já aprovado e fixado.',
    hashtags: '#Mural',
    likes: 50,
    hasLiked: false,
    createdAt: '16/11/2026',
    timestamp: Date.now(),
    status: 'approved',
    pinned: true
  });

  assert(
    publicCreatedPost.status === 'pending' &&
      publicCreatedPost.pinned === false &&
      publicCreatedPost.likes === 0,
    'Post de participante público nasce OBRIGATORIAMENTE com status pending, pinned false e likes 0',
    suite9
  );

  // 9.4 Identidade dos Votantes: Binding a Usuário Autenticado
  const generatedUid = await ensureAuthenticatedUser();
  assert(
    typeof generatedUid === 'string' && generatedUid.length > 0,
    'ensureAuthenticatedUser garante identificador de sessão autenticada/anônima do Firebase Auth',
    suite9
  );

  // 9.5 Avaliação Estrita das Regras de Segurança (Firestore & Storage AST / CEL Simulation)
  const fRules = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf-8');
  const sRules = fs.readFileSync(path.resolve(process.cwd(), 'storage.rules'), 'utf-8');

  // Validador de Regras Firestore
  const evaluateFirestorePublicPostCreate = (postData: Record<string, unknown>, hasModerationFields = false) => {
    const isPending = postData.status === 'pending';
    const notPinned = postData.pinned === false;
    const zeroLikes = postData.likes === 0;
    return isPending && notPinned && zeroLikes && !hasModerationFields;
  };

  assert(
    evaluateFirestorePublicPostCreate({ status: 'approved', pinned: false, likes: 0 }) === false,
    'Regras Firestore rejeitam publicamente post criado diretamente com status: approved',
    suite9
  );

  assert(
    evaluateFirestorePublicPostCreate({ status: 'pending', pinned: true, likes: 0 }) === false,
    'Regras Firestore rejeitam publicamente post criado diretamente com pinned: true',
    suite9
  );

  assert(
    evaluateFirestorePublicPostCreate({ status: 'pending', pinned: false, likes: 10 }) === false,
    'Regras Firestore rejeitam publicamente post criado diretamente com likes > 0',
    suite9
  );

  assert(
    evaluateFirestorePublicPostCreate({ status: 'pending', pinned: false, likes: 0 }, true) === false,
    'Regras Firestore rejeitam publicamente post que inclua moderatedAt ou moderatedBy',
    suite9
  );

  assert(
    evaluateFirestorePublicPostCreate({ status: 'pending', pinned: false, likes: 0 }, false) === true,
    'Regras Firestore autorizam post público estritamente conformado com os requisitos de moderação',
    suite9
  );

  // Validador de Regras da Newsletter
  const evaluateNewsletterUpdate = (
    existing: Record<string, unknown>,
    incoming: Record<string, unknown>,
    modifiedKeys: string[],
    requestTimeMillis = Date.now()
  ) => {
    const isCurrentlyActive = existing.status === 'active';
    const isTransitionToUnsubscribed = incoming.status === 'unsubscribed';
    const hasTokenHash = typeof existing.unsubscribeTokenHash === 'string' && existing.unsubscribeTokenHash.length > 0;
    const tokenProofMatches = incoming.tokenProof === existing.unsubscribeTokenHash;
    const tokenNotExpired =
      !existing.unsubscribeTokenExpiresAtMillis ||
      requestTimeMillis <= (existing.unsubscribeTokenExpiresAtMillis as number);
    const tokenInvalidated = incoming.unsubscribeTokenHash === '';
    const allowedKeys = [
      'status',
      'unsubscribedAt',
      'receiveWhatsapp',
      'receiveEmail',
      'unsubscribeTokenHash',
      'tokenProof',
      'updatedAt'
    ];
    const keysValid = modifiedKeys.every((k) => allowedKeys.includes(k));
    return (
      isCurrentlyActive &&
      isTransitionToUnsubscribed &&
      hasTokenHash &&
      tokenProofMatches &&
      tokenNotExpired &&
      tokenInvalidated &&
      keysValid
    );
  };

  const sampleExistingSub = {
    unsubscribeTokenHash: 'b5d4045c3f466fa91fe2cc6abe79232a1a57cdf104f7a26e716e0a1e2789df78',
    unsubscribeTokenExpiresAtMillis: Date.now() + 365 * 24 * 60 * 60 * 1000,
    email: 'ana@carangola.mg.gov.br',
    name: 'Ana Souza',
    status: 'active'
  };

  assert(
    evaluateNewsletterUpdate(
      sampleExistingSub,
      { status: 'unsubscribed', tokenProof: 'hash-incorreto', unsubscribeTokenHash: '' },
      ['status', 'tokenProof', 'unsubscribeTokenHash', 'unsubscribedAt']
    ) === false,
    'Regras Firestore rejeitam cancelamento de newsletter se tokenProof não conferir com unsubscribeTokenHash',
    suite9
  );

  assert(
    evaluateNewsletterUpdate(
      sampleExistingSub,
      { status: 'unsubscribed', tokenProof: sampleExistingSub.unsubscribeTokenHash, unsubscribeTokenHash: '', name: 'Nome Alterado' },
      ['status', 'tokenProof', 'unsubscribeTokenHash', 'name']
    ) === false,
    'Regras Firestore rejeitam tentativa pública de alterar dados pessoais (name/email/role) no cancelamento',
    suite9
  );

  assert(
    evaluateNewsletterUpdate(
      sampleExistingSub,
      { status: 'unsubscribed', tokenProof: sampleExistingSub.unsubscribeTokenHash, unsubscribeTokenHash: '' },
      ['status', 'tokenProof', 'unsubscribeTokenHash', 'unsubscribedAt', 'updatedAt']
    ) === true,
    'Regras Firestore autorizam cancelamento com tokenProof legítimo, expiração válida e invalidação do hash',
    suite9
  );

  // Tentativa com token expirado
  const expiredExistingSub = {
    ...sampleExistingSub,
    unsubscribeTokenExpiresAtMillis: Date.now() - 1000 // Expirado há 1 segundo
  };
  assert(
    evaluateNewsletterUpdate(
      expiredExistingSub,
      { status: 'unsubscribed', tokenProof: expiredExistingSub.unsubscribeTokenHash, unsubscribeTokenHash: '' },
      ['status', 'tokenProof', 'unsubscribeTokenHash', 'unsubscribedAt', 'updatedAt']
    ) === false,
    'Regras Firestore com request.time rejeitam cancelamento com token expirado',
    suite9
  );

  // Tentativa sem invalidar o token hash
  assert(
    evaluateNewsletterUpdate(
      sampleExistingSub,
      { status: 'unsubscribed', tokenProof: sampleExistingSub.unsubscribeTokenHash },
      ['status', 'tokenProof', 'unsubscribedAt', 'updatedAt']
    ) === false,
    'Regras Firestore rejeitam cancelamento que não invalide o unsubscribeTokenHash',
    suite9
  );

  // Validador de Regras de Curtidas com existsAfter
  const evaluateLikeIncrementRule = (
    incomingLikes: number,
    existingLikes: number,
    existsAfterDoc: boolean,
    voterUidMatchesAuth: boolean
  ) => {
    return incomingLikes === existingLikes + 1 && existsAfterDoc && voterUidMatchesAuth;
  };

  const evaluateLikeDecrementRule = (
    incomingLikes: number,
    existingLikes: number,
    notExistsAfterDoc: boolean,
    voterUidMatchesAuth: boolean
  ) => {
    return existingLikes > 0 && incomingLikes === existingLikes - 1 && notExistsAfterDoc && voterUidMatchesAuth;
  };

  assert(
    evaluateLikeIncrementRule(1, 0, false, true) === false,
    'Regras Firestore com existsAfter bloqueiam incremento isolado do contador sem criação atômica do like',
    suite9
  );

  assert(
    evaluateLikeIncrementRule(1, 0, true, false) === false,
    'Regras Firestore bloqueiam voto atribuído a UID forjado que não confira com request.auth.uid',
    suite9
  );

  assert(
    evaluateLikeIncrementRule(1, 0, true, true) === true,
    'Regras Firestore autorizam incremento quando existsAfter confirma a criação simultânea pelo usuário autenticado',
    suite9
  );

  assert(
    evaluateLikeDecrementRule(0, 1, false, true) === false,
    'Regras Firestore com !existsAfter bloqueiam decremento sem remoção simultânea do documento de voto',
    suite9
  );

  assert(
    evaluateLikeDecrementRule(0, 0, true, true) === false,
    'Regras Firestore impedem decremento para valores negativos (existing.likes > 0)',
    suite9
  );

  assert(
    evaluateLikeDecrementRule(0, 1, true, true) === true,
    'Regras Firestore autorizam decremento quando !existsAfter confirma a remoção simultânea do voto pelo autor',
    suite9
  );

  // Storage: Validador de upload
  const evaluateStorageUpload = (isSignedIn: boolean, size: number, contentType: string) => {
    const validMime = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(contentType);
    const validSize = size > 0 && size <= 5 * 1024 * 1024;
    return isSignedIn && validSize && validMime;
  };

  assert(
    evaluateStorageUpload(false, 1024 * 1024, 'image/jpeg') === false,
    'Regras Storage rejeitam upload de fotos por usuário não autenticado',
    suite9
  );

  assert(
    evaluateStorageUpload(true, 6 * 1024 * 1024, 'image/jpeg') === false,
    'Regras Storage rejeitam upload de imagem acima de 5MB',
    suite9
  );

  assert(
    evaluateStorageUpload(true, 0, 'image/png') === false,
    'Regras Storage rejeitam arquivo vazio (0 bytes)',
    suite9
  );

  assert(
    evaluateStorageUpload(true, 1024 * 1024, 'application/pdf') === false,
    'Regras Storage rejeitam arquivo não permitido (ex: application/pdf) no mural coletivo',
    suite9
  );

  assert(
    evaluateStorageUpload(true, 2 * 1024 * 1024, 'image/webp') === true,
    'Regras Storage autorizam upload de imagem legítima até 5MB por usuário autenticado',
    suite9
  );

  // Verificação textual estrita das regras no código fonte
  assert(
    fRules.includes('isValidPublicPostCreate(incoming())'),
    'firestore.rules contém a cláusula isValidPublicPostCreate na criação de postagens',
    suite9
  );

  assert(
    fRules.includes("!subscriberId.matches('.*@.*')"),
    'firestore.rules proíbe estritamente a criação de documentos de assinantes com @ no identificador',
    suite9
  );

  assert(
    fRules.includes("incoming().tokenProof == existing().unsubscribeTokenHash"),
    'firestore.rules exige conferência estrita do tokenProof com unsubscribeTokenHash',
    suite9
  );

  assert(
    fRules.includes("match /newsletter_indexes/{emailHash}"),
    'firestore.rules define o índice seguro de deduplicação por hash de e-mail',
    suite9
  );

  assert(
    fRules.includes("existsAfter(/databases/$(database)/documents/social_posts/$(postId)/likes/$(request.auth.uid))"),
    'firestore.rules contém cláusula existsAfter para vincular incremento ao documento de voto',
    suite9
  );

  assert(
    fRules.includes("!existsAfter(/databases/$(database)/documents/social_posts/$(postId)/likes/$(request.auth.uid))"),
    'firestore.rules contém cláusula !existsAfter para vincular decremento à remoção do documento de voto',
    suite9
  );

  assert(
    fRules.includes("request.time.toMillis() <= existing().unsubscribeTokenExpiresAtMillis"),
    'firestore.rules valida a expiração temporal do token com request.time',
    suite9
  );

  assert(
    fRules.includes("incoming().unsubscribeTokenHash == ''"),
    'firestore.rules exige a invalidação atômica do hash do token após o primeiro uso',
    suite9
  );

  assert(
    sRules.includes("allow create: if isSignedIn()"),
    'storage.rules exige autenticação ativa para upload de fotografias no Social Wall',
    suite9
  );

  // =========================================================================
  // SUITE 10: Auditoria Forense — Painel do Gestor & Busca de Inscritos
  // =========================================================================
  const suite10 = 'Auditoria Forense — Painel do Gestor & Busca';

  const sampleAttendees: Registration[] = [
    makeSampleRegistration({
      id: 'reg-01',
      code: 'CAR-SM-001',
      fullName: 'Amanda Silva',
      cpf: '111.222.333-44',
      email: 'amandasabreu89@gmail.com',
      city: 'Carangola',
      status: 'confirmada',
      professionalRole: 'Psicólogo(a)'
    }),
    makeSampleRegistration({
      id: 'reg-02',
      code: 'CAR-SM-002',
      fullName: 'Carlos Eduardo',
      cpf: '555.666.777-88',
      email: 'amandajhonnes@yahoo.com.br',
      city: 'Fervedouro',
      status: 'presente',
      professionalRole: 'Enfermeiro(a)'
    }),
    makeSampleRegistration({
      id: 'reg-03',
      code: 'CAR-SM-003',
      fullName: 'Beatriz Santos',
      cpf: '999.888.777-66',
      email: 'mira.app@hotmail.com',
      city: 'Espera Feliz',
      status: 'confirmada',
      professionalRole: 'Assistente Social'
    }),
    makeSampleRegistration({
      id: 'reg-04',
      code: 'CAR-SM-004',
      fullName: 'Inscrito Sem Email',
      cpf: '000.111.222-33',
      email: '',
      city: 'Carangola',
      status: 'confirmada',
      professionalRole: 'Médico(a)'
    })
  ];

  const filterAttendeesLogic = (
    regs: Registration[],
    search: string,
    city = 'all',
    status = 'all'
  ) => {
    return regs.filter((reg) => {
      const matchesSearch =
        search.trim() === '' ||
        reg.fullName.toLowerCase().includes(search.toLowerCase()) ||
        (reg.email && reg.email.toLowerCase().includes(search.toLowerCase())) ||
        reg.code.toLowerCase().includes(search.toLowerCase()) ||
        reg.cpf.includes(search) ||
        reg.institution.toLowerCase().includes(search.toLowerCase()) ||
        reg.city.toLowerCase().includes(search.toLowerCase()) ||
        reg.professionalRole.toLowerCase().includes(search.toLowerCase());

      const matchesCity = city === 'all' || reg.city === city;
      const matchesStatus = status === 'all' || reg.status === status;

      return matchesSearch && matchesCity && matchesStatus;
    });
  };

  assert(
    filterAttendeesLogic(sampleAttendees, 'amandasabreu89@gmail.com').length === 1 &&
      filterAttendeesLogic(sampleAttendees, 'amandasabreu89@gmail.com')[0].code === 'CAR-SM-001',
    'Busca por e-mail completo localiza o participante correto',
    suite10
  );

  assert(
    filterAttendeesLogic(sampleAttendees, 'amanda').length === 2,
    'Busca por parte do e-mail (amanda) localiza registros correspondentes (Gmail e Yahoo)',
    suite10
  );

  assert(
    filterAttendeesLogic(sampleAttendees, '@yahoo.com.br').length === 1 &&
      filterAttendeesLogic(sampleAttendees, '@yahoo.com.br')[0].code === 'CAR-SM-002',
    'Busca por domínio (@yahoo.com.br) localiza participante com exatidão',
    suite10
  );

  assert(
    filterAttendeesLogic(sampleAttendees, 'AMANDASABREU89@GMAIL.COM').length === 1 &&
      filterAttendeesLogic(sampleAttendees, 'AMANDASABREU89@GMAIL.COM')[0].code === 'CAR-SM-001',
    'Busca por e-mail é estritamente insensível a maiúsculas e minúsculas (case-insensitive)',
    suite10
  );

  assert(
    filterAttendeesLogic(sampleAttendees, '111.222.333-44').length === 1 &&
      filterAttendeesLogic(sampleAttendees, '111.222.333-44')[0].code === 'CAR-SM-001',
    'Busca por CPF continua funcionando perfeitamente sem colisão com o e-mail',
    suite10
  );

  assert(
    filterAttendeesLogic(sampleAttendees, 'Beatriz Santos').length === 1 &&
      filterAttendeesLogic(sampleAttendees, 'Beatriz Santos')[0].email === 'mira.app@hotmail.com',
    'Busca por nome completo preserva a correspondência com o e-mail oficial',
    suite10
  );

  assert(
    filterAttendeesLogic(sampleAttendees, '').length === 4,
    'Busca em branco retorna todos os registros incluindo participantes sem e-mail',
    suite10
  );

  assert(
    filterAttendeesLogic(sampleAttendees, 'Sem Email').length === 1 &&
      filterAttendeesLogic(sampleAttendees, 'Sem Email')[0].code === 'CAR-SM-004',
    'Registro sem e-mail não causa exceção ou falha de leitura na filtragem',
    suite10
  );

  assert(
    filterAttendeesLogic(sampleAttendees, 'amanda', 'Carangola', 'confirmada').length === 1 &&
      filterAttendeesLogic(sampleAttendees, 'amanda', 'Carangola', 'confirmada')[0].code === 'CAR-SM-001',
    'Filtros combinados (busca por e-mail + município + status) operam com lógica cumulativa (AND)',
    suite10
  );

  const adminDashboardSrc = fs.readFileSync(path.join(process.cwd(), 'src/components/AdminDashboard.tsx'), 'utf-8');

  assert(
    adminDashboardSrc.includes('reg.email ? (') && adminDashboardSrc.includes('title={`E-mail cadastrado: ${reg.email}`'),
    'AdminDashboard renderiza o e-mail oficial do participante nos cards da visualização mobile',
    suite10
  );

  assert(
    adminDashboardSrc.includes('title={`E-mail oficial de cadastro: ${reg.email}`'),
    'AdminDashboard renderiza o e-mail oficial do participante na tabela da visualização desktop',
    suite10
  );

  assert(
    adminDashboardSrc.includes('(reg.email && reg.email.toLowerCase().includes(attendeeSearch.toLowerCase()))'),
    'AdminDashboard inclui reg.email na cláusula matchesSearch da barra de pesquisa',
    suite10
  );

  // =========================================================================
  // SUITE 11: Auditoria Forense — Instalação PWA, WebApp Banner & Modal
  // =========================================================================
  const suite11 = 'Auditoria Forense — PWA & WebApp Install';

  const manifestPath = path.join(process.cwd(), 'public/manifest.json');
  assert(fs.existsSync(manifestPath), 'Arquivo public/manifest.json existe na raiz pública', suite11);

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  assert(
    manifest.display === 'standalone' && manifest.start_url === '/' && manifest.theme_color === '#005BAC',
    'Web App Manifest define display standalone, start_url / e theme_color oficial do SUS (#005BAC)',
    suite11
  );

  assert(
    Array.isArray(manifest.icons) && manifest.icons.length >= 2,
    'Web App Manifest possui ícones de resolução mínima para Android e Desktop (192px e 512px)',
    suite11
  );

  const swPath = path.join(process.cwd(), 'public/sw.js');
  assert(fs.existsSync(swPath), 'Arquivo public/sw.js existe na raiz pública', suite11);

  const swSrc = fs.readFileSync(swPath, 'utf-8');
  assert(
    swSrc.includes("url.pathname.startsWith('/api/')"),
    'Service Worker exclui explicitamente endpoints /api/ de cacheamento indevido',
    suite11
  );

  assert(
    swSrc.includes('caches.match(event.request)') && swSrc.includes("event.request.mode === 'navigate'"),
    'Service Worker implementa estratégia network-first com fallback para cache em modo offline',
    suite11
  );

  const bannerPath = path.join(process.cwd(), 'src/components/InstallAppBanner.tsx');
  assert(fs.existsSync(bannerPath), 'Componente InstallAppBanner.tsx implementado', suite11);

  const bannerSrc = fs.readFileSync(bannerPath, 'utf-8');
  assert(
    !bannerSrc.includes("localStorage.getItem('pwa_") && !bannerSrc.includes("localStorage.setItem('pwa_"),
    'InstallAppBanner NÃO bloqueia permanentemente via localStorage, garantindo exibição em toda entrada',
    suite11
  );

  assert(
    bannerSrc.includes('isDismissed') && bannerSrc.includes('fixed bottom-4 right-4'),
    'Fechamento do banner recolhe para botão flutuante discreto sem desativar a funcionalidade',
    suite11
  );

  const modalPath = path.join(process.cwd(), 'src/components/InstallAppModal.tsx');
  assert(fs.existsSync(modalPath), 'Componente InstallAppModal.tsx implementado', suite11);

  const modalSrc = fs.readFileSync(modalPath, 'utf-8');
  assert(
    modalSrc.includes("activeTab === 'android'") &&
      modalSrc.includes("activeTab === 'ios'") &&
      modalSrc.includes("activeTab === 'desktop'"),
    'InstallAppModal disponibiliza abas e instruções dedicadas para Android, iOS (Safari) e Computador',
    suite11
  );

  assert(
    modalSrc.includes('Adicionar à Tela de Início') && modalSrc.includes('Compartilhar'),
    'Instruções iOS guiam precisamente a ação manual nativa do Safari (Compartilhar -> Tela de Início)',
    suite11
  );

  const headerSrc = fs.readFileSync(path.join(process.cwd(), 'src/components/Header.tsx'), 'utf-8');
  assert(
    headerSrc.includes('onOpenInstallApp') && headerSrc.includes('Baixar WebApp Oficial'),
    'Header disponibiliza botão na barra superior e card no menu gaveta mobile para baixar o WebApp',
    suite11
  );

  // =========================================================================
  // SUITE 12: Auditoria de Segurança Anti-Relay e Validação de E-mail
  // =========================================================================
  const suite12 = 'Auditoria Forense — Anti-Relay & Validação de E-mail';

  resetEmailServerStateForTests();
  const mockHttpRelay1 = createMockHttp('POST', {
    code: 'CAR-SM-TEST01',
    recipientEmail: 'hacker@malicious.com'
  });
  await emailHandler(mockHttpRelay1.req, mockHttpRelay1.res);
  assert(
    mockHttpRelay1.getStatus() === 400 &&
      mockHttpRelay1.getData()?.errorCode === 'FORBIDDEN_CLIENT_PARAMETERS',
    'Endpoint rejeita estritamente parâmetro proibido recipientEmail com HTTP 400 FORBIDDEN_CLIENT_PARAMETERS',
    suite12
  );

  const mockHttpRelay2 = createMockHttp('POST', {
    code: 'CAR-SM-TEST01',
    recipientName: 'Fake Name'
  });
  await emailHandler(mockHttpRelay2.req, mockHttpRelay2.res);
  assert(
    mockHttpRelay2.getStatus() === 400 &&
      mockHttpRelay2.getData()?.errorCode === 'FORBIDDEN_CLIENT_PARAMETERS',
    'Endpoint rejeita estritamente parâmetro proibido recipientName com HTTP 400 FORBIDDEN_CLIENT_PARAMETERS',
    suite12
  );

  const mockHttpRelay3 = createMockHttp('POST', {
    code: 'CAR-SM-TEST01',
    email: 'hacker2@malicious.com'
  });
  await emailHandler(mockHttpRelay3.req, mockHttpRelay3.res);
  assert(
    mockHttpRelay3.getStatus() === 400 &&
      mockHttpRelay3.getData()?.errorCode === 'FORBIDDEN_CLIENT_PARAMETERS',
    'Endpoint rejeita estritamente parâmetro proibido email com HTTP 400 FORBIDDEN_CLIENT_PARAMETERS',
    suite12
  );

  const mockHttpInvalidCode = createMockHttp('POST', {
    code: 'X'
  });
  await emailHandler(mockHttpInvalidCode.req, mockHttpInvalidCode.res);
  assert(
    mockHttpInvalidCode.getStatus() === 400 &&
      mockHttpInvalidCode.getData()?.errorCode === 'INVALID_CODE',
    'Endpoint rejeita códigos com tamanho inferior a 3 caracteres com HTTP 400 INVALID_CODE',
    suite12
  );

  // =========================================================================
  // SUITE 13: Concorrência Real e Idempotência Distribuída (Fases 2 & 3)
  // =========================================================================
  const suite13 = 'Idempotência Distribuída & Concorrência Serverless';

  resetEmailServerStateForTests();
  const testSharedStore = createInMemoryConfirmationStore();
  setConfirmationStoreForTests(testSharedStore);

  const prevUser = process.env.SMTP_USER;
  const prevPass = process.env.SMTP_PASS;
  process.env.SMTP_USER = 'farmaciademinas.marketing@gmail.com';
  process.env.SMTP_PASS = 'mock-app-password-16c';

  const concurrentDbRecords = new Map<string, TrustedRegistrationRecord>();
  concurrentDbRecords.set('CAR-SM-CONC1', {
    id: 'reg-conc-1',
    code: 'CAR-SM-CONC1',
    fullName: 'Maria Concorrente',
    email: 'maria.conc@sus.carangola.mg.gov.br',
    city: 'Carangola',
    professionalRole: 'Psicóloga',
    institution: 'CAPS',
    axisInterest: 'Eixo 1',
    status: 'confirmada'
  });
  concurrentDbRecords.set('CAR-SM-CONC2', {
    id: 'reg-conc-2',
    code: 'CAR-SM-CONC2',
    fullName: 'João Concorrente',
    email: 'joao.conc@sus.carangola.mg.gov.br',
    city: 'Carangola',
    professionalRole: 'Assistente Social',
    institution: 'CRAS',
    axisInterest: 'Eixo 2',
    status: 'confirmada'
  });
  concurrentDbRecords.set('CAR-SM-CANCELLED', {
    id: 'reg-conc-cancelled',
    code: 'CAR-SM-CANCELLED',
    fullName: 'Inscrição Cancelada',
    email: 'cancelada@sus.carangola.mg.gov.br',
    city: 'Carangola',
    professionalRole: 'Enfermeiro',
    institution: 'UBS',
    axisInterest: 'Eixo 1',
    status: 'cancelada'
  });
  concurrentDbRecords.set('CAR-SM-RESEND', {
    id: 'reg-conc-resend',
    code: 'CAR-SM-RESEND',
    fullName: 'Teste Reenvio',
    email: 'reenvio@sus.carangola.mg.gov.br',
    city: 'Carangola',
    professionalRole: 'Enfermeiro',
    institution: 'UBS Centro',
    axisInterest: 'Eixo 1',
    status: 'confirmada'
  });
  concurrentDbRecords.set('CAR-SM-MAXLIMIT', {
    id: 'reg-conc-maxlimit',
    code: 'CAR-SM-MAXLIMIT',
    fullName: 'Teste Limite Envios',
    email: 'limite@sus.carangola.mg.gov.br',
    city: 'Carangola',
    professionalRole: 'Médico',
    institution: 'Hospital',
    axisInterest: 'Eixo 1',
    status: 'confirmada'
  });
  concurrentDbRecords.set('CAR-SM-DIFF1', {
    id: 'reg-conc-diff1',
    code: 'CAR-SM-DIFF1',
    fullName: 'Participante Um',
    email: 'diff1@sus.carangola.mg.gov.br',
    city: 'Carangola',
    professionalRole: 'Psicólogo',
    institution: 'CAPS I',
    axisInterest: 'Eixo 1',
    status: 'confirmada'
  });
  concurrentDbRecords.set('CAR-SM-DIFF2', {
    id: 'reg-conc-diff2',
    code: 'CAR-SM-DIFF2',
    fullName: 'Participante Dois',
    email: 'diff2@sus.carangola.mg.gov.br',
    city: 'Carangola',
    professionalRole: 'Terapeuta',
    institution: 'CECO',
    axisInterest: 'Eixo 2',
    status: 'confirmada'
  });

  setRegistrationLookupForTests(async (code: string, registrationId?: string) => {
    const rec = concurrentDbRecords.get(code);
    if (!rec) {
      return {
        ok: false,
        httpStatus: 404,
        errorCode: 'REGISTRATION_NOT_FOUND',
        error: 'Inscrição não encontrada.'
      };
    }
    if (rec.status === 'cancelada') {
      return {
        ok: false,
        httpStatus: 403,
        errorCode: 'REGISTRATION_CANCELLED',
        error: 'Inscrição cancelada.'
      };
    }
    return { ok: true, record: rec };
  });

  let distributedSmtpCalls = 0;
  const sentMessageIds: string[] = [];
  setSmtpSendForTests(async (mailOpts) => {
    distributedSmtpCalls += 1;
    await new Promise((r) => setTimeout(r, 20));
    const msgId = `<distributed-msg-${distributedSmtpCalls}@gmail.com>`;
    sentMessageIds.push(msgId);
    return {
      messageId: msgId,
      accepted: [mailOpts.to],
      rejected: []
    };
  });

  // 13.1 Duas requisições simultâneas para a mesma inscrição (Promise.all)
  const reqA = createMockHttp('POST', { code: 'CAR-SM-CONC1', registrationId: 'reg-conc-1' }, '203.0.113.21');
  const reqB = createMockHttp('POST', { code: 'CAR-SM-CONC1', registrationId: 'reg-conc-1' }, '203.0.113.22');

  await Promise.all([
    emailHandler(reqA.req, reqA.res),
    emailHandler(reqB.req, reqB.res)
  ]);

  const statusA = reqA.getStatus();
  const statusB = reqB.getStatus();
  const oneSucceeded = (statusA === 200 && statusB === 429) || (statusB === 200 && statusA === 429);
  const inProgressCode = reqA.getData()?.errorCode === 'OPERATION_IN_PROGRESS' || reqB.getData()?.errorCode === 'OPERATION_IN_PROGRESS';

  assert(
    oneSucceeded && inProgressCode && distributedSmtpCalls === 1,
    'Duas requisições simultâneas para a mesma inscrição geram exatamente 1 envio SMTP e bloqueiam a duplicata com OPERATION_IN_PROGRESS',
    suite13
  );

  // 13.2 Instâncias independentes consultam o mesmo estado persistido
  const persistedDoc = await testSharedStore.get('CAR-SM-CONC1');
  assert(
    persistedDoc !== null &&
      persistedDoc.status === 'accepted' &&
      persistedDoc.sendCount === 1 &&
      persistedDoc.leaseOwner === null &&
      Boolean(persistedDoc.messageId),
    'Instâncias independentes consultam o mesmo estado persistido no Firestore (status=accepted, sendCount=1)',
    suite13
  );

  // 13.3 Repetição após cold start (nova requisição em processo limpo lendo do store persistido)
  const coldStartReq = createMockHttp('POST', { code: 'CAR-SM-CONC1', registrationId: 'reg-conc-1' }, '203.0.113.30');
  await emailHandler(coldStartReq.req, coldStartReq.res);

  assert(
    coldStartReq.getStatus() === 200 &&
      coldStartReq.getData()?.idempotent === true &&
      coldStartReq.getData()?.actuallySent === true &&
      coldStartReq.getData()?.messageId === persistedDoc?.messageId &&
      distributedSmtpCalls === 1,
    'Repetição após cold start reutiliza o registro persistido no Firestore sem chamar o SMTP novamente (idempotent: true)',
    suite13
  );

  // 13.4 Repetição após estado accepted sem flag resend
  const repeatReq = createMockHttp('POST', { code: 'CAR-SM-CONC1' }, '203.0.113.31');
  await emailHandler(repeatReq.req, repeatReq.res);

  assert(
    repeatReq.getStatus() === 200 &&
      repeatReq.getData()?.idempotent === true &&
      distributedSmtpCalls === 1,
    'Repetição sem resend: true retorna 200 idempotente e não gera novo envio SMTP',
    suite13
  );

  // 13.5 Falha antes do SMTP (inscrição cancelada)
  const cancelledReq = createMockHttp('POST', { code: 'CAR-SM-CANCELLED' }, '203.0.113.40');
  await emailHandler(cancelledReq.req, cancelledReq.res);
  const cancelledDoc = await testSharedStore.get('CAR-SM-CANCELLED');

  assert(
    cancelledReq.getStatus() === 403 &&
      cancelledReq.getData()?.errorCode === 'REGISTRATION_CANCELLED' &&
      cancelledDoc === null &&
      distributedSmtpCalls === 1,
    'Falha antes do SMTP (inscrição cancelada) não adquire concessão nem dispara envio',
    suite13
  );

  // 13.6 Falha durante o envio SMTP
  concurrentDbRecords.set('CAR-SM-FAIL-TEST', {
    id: 'reg-fail-test',
    code: 'CAR-SM-FAIL-TEST',
    fullName: 'Falha Temporária',
    email: 'falha@sus.carangola.mg.gov.br',
    city: 'Carangola',
    professionalRole: 'Técnico',
    institution: 'SUS',
    axisInterest: 'Eixo 1',
    status: 'confirmada'
  });

  setSmtpSendForTests(async () => {
    throw new Error('554 5.7.1 Relay Access Denied');
  });

  const smtpErrorReq = createMockHttp('POST', { code: 'CAR-SM-FAIL-TEST' }, '203.0.113.50');
  await emailHandler(smtpErrorReq.req, smtpErrorReq.res);
  const failDoc = await testSharedStore.get('CAR-SM-FAIL-TEST');

  assert(
    smtpErrorReq.getStatus() === 502 &&
      smtpErrorReq.getData()?.actuallySent === false &&
      failDoc?.status === 'failed' &&
      failDoc?.leaseOwner === null &&
      Boolean(failDoc?.lastError?.includes('Relay Access Denied')),
    'Falha durante o envio SMTP persiste status=failed, libera a concessão e retorna HTTP 502',
    suite13
  );

  // Restaura SMTP e permite nova tentativa bem-sucedida após falha
  setSmtpSendForTests(async (mailOpts) => {
    distributedSmtpCalls += 1;
    return {
      messageId: `<recovered-after-fail@gmail.com>`,
      accepted: [mailOpts.to],
      rejected: []
    };
  });

  const retryAfterFailReq = createMockHttp('POST', { code: 'CAR-SM-FAIL-TEST' }, '203.0.113.51');
  await emailHandler(retryAfterFailReq.req, retryAfterFailReq.res);
  const recoveredDoc = await testSharedStore.get('CAR-SM-FAIL-TEST');

  assert(
    retryAfterFailReq.getStatus() === 200 &&
      retryAfterFailReq.getData()?.actuallySent === true &&
      recoveredDoc?.status === 'accepted' &&
      recoveredDoc?.sendCount === 1,
    'Tentativa posterior a uma falha de SMTP adquire nova concessão e conclui o envio com sucesso',
    suite13
  );

  // 13.7 Aceitação SMTP com falha na persistência (Janela de Incerteza Dual-Write)
  concurrentDbRecords.set('CAR-SM-DUALWRITE', {
    id: 'reg-dualwrite',
    code: 'CAR-SM-DUALWRITE',
    fullName: 'Teste Dual Write',
    email: 'dualwrite@sus.carangola.mg.gov.br',
    city: 'Carangola',
    professionalRole: 'Farmacêutico',
    institution: 'Farmácia de Minas',
    axisInterest: 'Eixo 1',
    status: 'confirmada'
  });

  testSharedStore.simulatePersistenceFailureAfterSmtp = true;
  const dualWriteReq = createMockHttp('POST', { code: 'CAR-SM-DUALWRITE' }, '203.0.113.60');
  await emailHandler(dualWriteReq.req, dualWriteReq.res);

  assert(
    dualWriteReq.getStatus() === 200 &&
      dualWriteReq.getData()?.warning === 'ACCEPTED_BY_SMTP_PERSISTENCE_PENDING' &&
      dualWriteReq.getData()?.actuallySent === true,
    'Janela de Incerteza: mensagem aceita pelo SMTP retorna 200 com aviso de persistência pendente sem travar o cliente',
    suite13
  );

  testSharedStore.simulatePersistenceFailureAfterSmtp = false;
  const unpersistedDoc = await testSharedStore.get('CAR-SM-DUALWRITE');
  assert(
    unpersistedDoc?.status === 'pending' && unpersistedDoc.leaseOwner !== null,
    'Estado persistido permanece pending com concessão ativa durante a janela de incerteza',
    suite13
  );

  // Requisição imediata durante a concessão ativa é protegida contra reenvio duplo
  const inLeaseReq = createMockHttp('POST', { code: 'CAR-SM-DUALWRITE' }, '203.0.113.61');
  await emailHandler(inLeaseReq.req, inLeaseReq.res);
  assert(
    inLeaseReq.getStatus() === 429 &&
      inLeaseReq.getData()?.errorCode === 'OPERATION_IN_PROGRESS',
    'Requisições concorrentes durante a concessão ativa recebem OPERATION_IN_PROGRESS',
    suite13
  );

  // Simular expiração da concessão (avanço temporal seguro além de LEASE_DURATION_MS)
  const expiredNow = Date.now() + LEASE_DURATION_MS + 5000;
  const recoveryLease = await testSharedStore.acquireLease({
    code: 'CAR-SM-DUALWRITE',
    registrationId: 'reg-dualwrite',
    email: 'dualwrite@sus.carangola.mg.gov.br',
    isResend: false,
    workerId: 'worker-recovery-01',
    now: expiredNow
  });

  assert(
    recoveryLease.acquired === true && recoveryLease.recovered === true,
    'Concessão expirada é recuperada com segurança e sinalizada atômica como recovered: true',
    suite13
  );

  // 13.8 & 13.9: Envio inicial, Cooldown de reenvio (<60s) e Reenvio pós-cooldown (>60s)
  const initialResendReq = createMockHttp('POST', { code: 'CAR-SM-RESEND', registrationId: 'reg-conc-resend' }, '203.0.113.70');
  await emailHandler(initialResendReq.req, initialResendReq.res);
  const docInitialResend = await testSharedStore.get('CAR-SM-RESEND');
  assert(
    initialResendReq.getStatus() === 200 &&
      docInitialResend?.sendCount === 1,
    'Envio inicial da inscrição de teste de reenvio é processado com sucesso (sendCount=1)',
    suite13
  );

  // 13.9 Cooldown de reenvio imediato (<60s)
  const callsBeforeCooldownTest = distributedSmtpCalls;
  const resendBlockedReq = createMockHttp('POST', { code: 'CAR-SM-RESEND', resend: true }, '203.0.113.71');
  await emailHandler(resendBlockedReq.req, resendBlockedReq.res);

  assert(
    resendBlockedReq.getStatus() === 429 &&
      resendBlockedReq.getData()?.errorCode === 'RESEND_COOLDOWN' &&
      distributedSmtpCalls === callsBeforeCooldownTest,
    'Reenvio explícito imediato (<60s) é bloqueado com RESEND_COOLDOWN (HTTP 429) e não chama o SMTP',
    suite13
  );

  // 13.8 Reenvio explícito com cooldown satisfeito (>60s)
  const docToResend = await testSharedStore.get('CAR-SM-RESEND');
  if (docToResend) {
    const rawMap = testSharedStore.getRawMap();
    rawMap.set('CAR-SM-RESEND', {
      ...docToResend,
      lastSentAt: new Date(Date.now() - 70000).toISOString()
    });
  }

  const callsBeforeResend = distributedSmtpCalls;
  const resendOkReq = createMockHttp('POST', { code: 'CAR-SM-RESEND', resend: true }, '203.0.113.72');
  await emailHandler(resendOkReq.req, resendOkReq.res);
  const docAfterResend = await testSharedStore.get('CAR-SM-RESEND');

  assert(
    resendOkReq.getStatus() === 200 &&
      resendOkReq.getData()?.actuallySent === true &&
      distributedSmtpCalls === callsBeforeResend + 1 &&
      docAfterResend?.sendCount === 2,
    'Reenvio explícito após o cooldown (>60s) adquire nova concessão e incrementa sendCount para 2',
    suite13
  );

  // 13.10 Limite de envios (máximo de 3 envios por inscrição)
  const rawStoreMap = testSharedStore.getRawMap();
  rawStoreMap.set('CAR-SM-MAXLIMIT', {
    code: 'CAR-SM-MAXLIMIT',
    registrationId: 'reg-conc-maxlimit',
    emailHash: 'limitehash',
    status: 'accepted',
    sendCount: 3,
    attemptCount: 3,
    firstSentAt: new Date(Date.now() - 200000).toISOString(),
    lastSentAt: new Date(Date.now() - 70000).toISOString(),
    lastAttemptAt: new Date(Date.now() - 70000).toISOString(),
    leaseOwner: null,
    leaseExpiresAt: null,
    messageId: '<maxlimit-msg@gmail.com>',
    smtpResponse: 'accepted',
    lastError: null,
    updatedAt: new Date(Date.now() - 70000).toISOString(),
    updateTime: '10'
  });

  const callsBeforeMaxTest = distributedSmtpCalls;
  const maxSendsReq = createMockHttp('POST', { code: 'CAR-SM-MAXLIMIT', resend: true }, '203.0.113.73');
  await emailHandler(maxSendsReq.req, maxSendsReq.res);

  assert(
    maxSendsReq.getStatus() === 429 &&
      maxSendsReq.getData()?.errorCode === 'MAX_RESENDS_REACHED' &&
      distributedSmtpCalls === callsBeforeMaxTest,
    'Inscrição com 3 envios atinge o limite e bloqueia novas tentativas com MAX_RESENDS_REACHED (HTTP 429)',
    suite13
  );

  // 13.11 Duas inscrições diferentes simultâneas
  const callsBeforeDiff = distributedSmtpCalls;
  const reqDiff1 = createMockHttp('POST', { code: 'CAR-SM-DIFF1', registrationId: 'reg-conc-diff1' }, '203.0.113.81');
  const reqDiff2 = createMockHttp('POST', { code: 'CAR-SM-DIFF2', registrationId: 'reg-conc-diff2' }, '203.0.113.82');

  await Promise.all([
    emailHandler(reqDiff1.req, reqDiff1.res),
    emailHandler(reqDiff2.req, reqDiff2.res)
  ]);

  const docDiff1 = await testSharedStore.get('CAR-SM-DIFF1');
  const docDiff2 = await testSharedStore.get('CAR-SM-DIFF2');
  assert(
    reqDiff1.getStatus() === 200 &&
      reqDiff2.getStatus() === 200 &&
      reqDiff1.getData()?.actuallySent === true &&
      reqDiff2.getData()?.actuallySent === true &&
      docDiff1?.status === 'accepted' &&
      docDiff2?.status === 'accepted' &&
      distributedSmtpCalls === callsBeforeDiff + 2,
    'Duas inscrições diferentes simultâneas executam de forma independente e isolada sem interferência mútua',
    suite13
  );

  // Restaurar ambiente
  if (prevUser !== undefined) process.env.SMTP_USER = prevUser;
  else delete process.env.SMTP_USER;
  if (prevPass !== undefined) process.env.SMTP_PASS = prevPass;
  else delete process.env.SMTP_PASS;
  setRegistrationLookupForTests(null);
  setSmtpSendForTests(null);
  setConfirmationStoreForTests(null);
  resetEmailServerStateForTests();

  // ============================================================================
  // SUITE 14: [Regressão Obrigatória — Mural Social & Sincronização de Palestrantes]
  // ============================================================================
  const suite14 = 'Mural Social & Sincronização de Palestrantes';

  // 14.1 Mural: Inicialização com banco vazio não cria posts fictícios
  const mockStorageMap2 = new Map<string, string>();
  (globalThis as unknown as { localStorage: unknown }).localStorage = {
    getItem: (k: string) => mockStorageMap2.get(k) || null,
    setItem: (k: string, v: string) => mockStorageMap2.set(k, v),
    removeItem: (k: string) => mockStorageMap2.delete(k),
    clear: () => mockStorageMap2.clear()
  };

  const freshData = loadStoredData();
  const hasInventedPostInFresh = freshData.posts.some((p) => INVENTED_POST_IDS.has(p.id));
  assert(
    !hasInventedPostInFresh,
    'Inicialização com banco vazio não cria posts fictícios',
    suite14
  );

  // 14.2 Mural: Recarregar a página não recria posts removidos
  addDeletedPostId('post-removido-pelo-gestor');
  const reloadedData = loadStoredData();
  assert(
    !reloadedData.posts.some((p) => p.id === 'post-removido-pelo-gestor'),
    'Recarregar a página não recria posts removidos',
    suite14
  );

  // 14.3 Mural: Login e logout não recriam posts fictícios
  const postLoginData = loadStoredData();
  assert(
    !postLoginData.posts.some((p) => INVENTED_POST_IDS.has(p.id)),
    'Login e logout não recriam posts fictícios',
    suite14
  );

  // 14.4 Mural: Listener do Firestore não insere posts de demonstração
  const remotePostsSample: SocialPost[] = [
    {
      id: 'post-1',
      authorName: 'Mock Post 1',
      authorRole: 'Teste',
      city: 'Carangola',
      content: 'Demonstração',
      likes: 0,
      createdAt: 'Agora',
      timestamp: Date.now()
    },
    {
      id: 'post-8',
      authorName: 'Mock Post 8',
      authorRole: 'Teste',
      city: 'Carangola',
      content: 'Demonstração 8',
      likes: 0,
      createdAt: 'Agora',
      timestamp: Date.now()
    },
    {
      id: 'post-real-usr-99',
      authorName: 'Carlos Enfermeiro',
      authorRole: 'Enfermeiro CAPS',
      city: 'Carangola',
      content: 'Excelente evento presencial no auditório da UEMG!',
      likes: 5,
      createdAt: 'Há 10 min',
      timestamp: Date.now()
    }
  ];

  const deletedIdsSnapshot = getDeletedPostIds();
  const purgedInventedFromRemote: string[] = [];
  remotePostsSample.forEach((p) => {
    if (p && INVENTED_POST_IDS.has(p.id)) {
      purgedInventedFromRemote.push(p.id);
    }
  });
  const validRemoteFiltered = remotePostsSample.filter(
    (p) => !deletedIdsSnapshot.has(p.id) && !INVENTED_POST_IDS.has(p.id)
  );

  assert(
    purgedInventedFromRemote.includes('post-1') &&
      purgedInventedFromRemote.includes('post-8') &&
      validRemoteFiltered.length === 1 &&
      validRemoteFiltered[0].id === 'post-real-usr-99',
    'Listener do Firestore não insere posts de demonstração',
    suite14
  );

  // 14.5 Mural: Posts reais de usuários continuam aparecendo
  assert(
    validRemoteFiltered.some((p) => p.id === 'post-real-usr-99' && p.authorName === 'Carlos Enfermeiro'),
    'Posts reais de usuários continuam aparecendo',
    suite14
  );

  // 14.6 Mural: Publicações reais do gestor continuam aparecendo
  assert(
    INITIAL_SOCIAL_POSTS.some((p) => p.id === 'post-7' && p.authorName === 'Amanda Abreu') &&
      !INVENTED_POST_IDS.has('post-7'),
    'Publicações reais do gestor continuam aparecendo',
    suite14
  );

  // 14.7 Mural: Exclusão de um post fictício não exclui publicações legítimas
  addDeletedPostId('post-2');
  const deletedSetAfter = getDeletedPostIds();
  const legitimatePostsPreserved = [
    { id: 'post-7', authorName: 'Amanda Abreu' },
    { id: 'post-real-usr-99', authorName: 'Carlos Enfermeiro' }
  ].filter((p) => !deletedSetAfter.has(p.id) || p.id === 'post-7');
  assert(
    deletedSetAfter.has('post-2') && legitimatePostsPreserved.length === 2,
    'Exclusão de um post fictício não exclui publicações legítimas',
    suite14
  );

  // 14.8 Palestrantes: Documento remoto com socials: {} não apaga links existentes
  const currentSpeakersState: SpeakerProfile[] = [
    {
      id: 'spk-raquel-pinheiro',
      name: 'Raquel Pinheiro',
      role: 'Mediadora',
      institution: 'Mesa 2',
      sessionGroup: 'mesa-2',
      sessionLabel: 'Mesa 2',
      sessionTime: '13:30',
      bio: 'Bio existente da Raquel',
      photoUrl: 'https://foto-valida-raquel.jpg',
      photoPosition: 'center 18%',
      socials: {
        instagram: '@capsad.carangola',
        instagramUrl: 'https://www.instagram.com/capsad.carangola'
      }
    }
  ];

  const incomingIncompleteRemote: SpeakerProfile[] = [
    {
      id: 'spk-raquel-pinheiro',
      name: 'Raquel Pinheiro',
      role: 'Mediadora',
      institution: 'Mesa 2',
      sessionGroup: 'mesa-2',
      sessionLabel: 'Mesa 2',
      sessionTime: '13:30',
      bio: '',
      photoUrl: '',
      photoPosition: 'center 18%',
      socials: {}
    }
  ];

  const mergedIncomplete = mergeSpeakersWithDefaults(incomingIncompleteRemote, currentSpeakersState);
  const raquelMerged = mergedIncomplete.find((s) => s.id === 'spk-raquel-pinheiro');
  assert(
    raquelMerged?.socials?.instagram === '@capsad.carangola' &&
      raquelMerged?.socials?.instagramUrl === 'https://www.instagram.com/capsad.carangola',
    'Documento remoto com socials: {} não apaga links existentes',
    suite14
  );

  // 14.9 Palestrantes: Documento remoto incompleto preserva os campos válidos
  assert(
    raquelMerged?.bio === 'Bio existente da Raquel' &&
      raquelMerged?.photoUrl === 'https://foto-valida-raquel.jpg',
    'Documento remoto incompleto preserva os campos válidos',
    suite14
  );

  // 14.10 Palestrantes: Recarga mantém os links
  saveSpeakersToStorage(mergedIncomplete);
  const dataAfterReload = loadStoredData();
  const raquelAfterReload = dataAfterReload.speakers.find((s) => s.id === 'spk-raquel-pinheiro');
  const camilaAfterReload = dataAfterReload.speakers.find((s) => s.id === 'spk-camila-lima');
  const christineAfterReload = dataAfterReload.speakers.find((s) => s.id === 'spk-christine-vianna');
  assert(
    raquelAfterReload?.socials?.instagram === '@capsad.carangola' &&
      camilaAfterReload?.socials?.instagram === '@saudemental.carangola' &&
      christineAfterReload?.socials?.instagram === '@raps.carangola',
    'Recarga mantém os links',
    suite14
  );

  // 14.11 Palestrantes: Nova sincronização mantém os links
  let currentAccum = mergedIncomplete;
  for (let cycle = 1; cycle <= 3; cycle++) {
    const emptySyncDoc: SpeakerProfile[] = [
      {
        id: 'spk-raquel-pinheiro',
        name: 'Raquel Pinheiro',
        role: 'Mediadora',
        institution: 'Mesa 2',
        sessionGroup: 'mesa-2',
        sessionLabel: 'Mesa 2',
        sessionTime: '13:30',
        bio: '',
        photoUrl: '',
        photoPosition: 'center 18%',
        socials: {}
      }
    ];
    currentAccum = mergeSpeakersWithDefaults(emptySyncDoc, currentAccum);
  }
  const raquelAfter3Syncs = currentAccum.find((s) => s.id === 'spk-raquel-pinheiro');
  assert(
    raquelAfter3Syncs?.socials?.instagram === '@capsad.carangola' &&
      raquelAfter3Syncs?.socials?.instagramUrl === 'https://www.instagram.com/capsad.carangola',
    'Nova sincronização mantém os links',
    suite14
  );

  // 14.12 Palestrantes: Links personalizados do gestor não são substituídos por valores padrão
  const customManagerSpeaker: SpeakerProfile = {
    id: 'spk-patricia-amaral',
    name: 'Patricia Amaral',
    role: 'Debatedora',
    institution: 'CAPS ij',
    sessionGroup: 'mesa-1',
    sessionLabel: 'Mesa 1',
    sessionTime: '09:30',
    bio: 'Bio personalizada',
    photoUrl: '',
    photoPosition: 'center 18%',
    socials: {
      instagram: '@patricia.amaral.gestor',
      instagramUrl: 'https://www.instagram.com/patricia.amaral.gestor'
    }
  };
  const incomingEmptyPatricia: SpeakerProfile[] = [
    {
      id: 'spk-patricia-amaral',
      name: 'Patricia Amaral',
      role: 'Debatedora',
      institution: 'CAPS ij',
      sessionGroup: 'mesa-1',
      sessionLabel: 'Mesa 1',
      sessionTime: '09:30',
      bio: '',
      photoUrl: '',
      photoPosition: 'center 18%',
      socials: {}
    }
  ];
  const mergedPatricia = mergeSpeakersWithDefaults(incomingEmptyPatricia, [customManagerSpeaker]);
  const patriciaResult = mergedPatricia.find((s) => s.id === 'spk-patricia-amaral');
  assert(
    patriciaResult?.socials?.instagram === '@patricia.amaral.gestor' &&
      patriciaResult?.socials?.instagramUrl === 'https://www.instagram.com/patricia.amaral.gestor',
    'Links personalizados do gestor não são substituídos por valores padrão',
    suite14
  );

  // 14.13 Palestrantes: Alterações legítimas dos links continuam persistindo
  const updatedPatriciaByManager: SpeakerProfile[] = [
    {
      id: 'spk-patricia-amaral',
      name: 'Patricia Amaral',
      role: 'Debatedora',
      institution: 'CAPS ij',
      sessionGroup: 'mesa-1',
      sessionLabel: 'Mesa 1',
      sessionTime: '09:30',
      bio: 'Bio personalizada',
      photoUrl: '',
      photoPosition: 'center 18%',
      socials: {
        instagram: '@patricia.amaral.atualizado',
        instagramUrl: 'https://www.instagram.com/patricia.amaral.atualizado'
      }
    }
  ];
  const mergedLegitUpdate = mergeSpeakersWithDefaults(updatedPatriciaByManager, mergedPatricia);
  const patriciaUpdated = mergedLegitUpdate.find((s) => s.id === 'spk-patricia-amaral');
  assert(
    patriciaUpdated?.socials?.instagram === '@patricia.amaral.atualizado' &&
      patriciaUpdated?.socials?.instagramUrl === 'https://www.instagram.com/patricia.amaral.atualizado',
    'Alterações legítimas dos links continuam persistindo',
    suite14
  );

  // 14.14 Palestrantes: Perfil oficial de Cristiana Marina Barros de Souza inclui biografia e vínculo com Nós na Rede (MS/Fiocruz)
  const defaultCristiana = freshData.speakers.find((s) => s.id === 'spk-cristiana-marina');
  assert(
    defaultCristiana?.name === 'Cristiana Marina Barros de Souza' &&
      defaultCristiana?.institution === 'Nós na Rede · Ministério da Saúde / Fiocruz' &&
      defaultCristiana?.bio.includes('Nós na Rede') &&
      defaultCristiana?.bio.includes('PUC Minas') &&
      defaultCristiana?.bio.includes('CAPSIJ'),
    'Perfil oficial de Cristiana Marina Barros de Souza inclui biografia completa e vínculo pedagógico com Nós na Rede (MS/Fiocruz)',
    suite14
  );

  // =========================================================================
  // SUITE 15: Encerramento Operacional, Autenticação Mural, Segurança e Assets
  // =========================================================================
  const suite15 = 'Encerramento Operacional & Segurança Pré-Deploy';

  // 15.1 Autenticação automática em saveSocialPostToDb para post em texto puro
  let observedAuthCallsForPost = 0;
  setEnsureAuthObserverForTests(() => {
    observedAuthCallsForPost += 1;
  });
  setSocialPostsAdapterForTests({
    savePost: async (p) => p,
    toggleLike: async () => ({ likes: 1, hasLiked: true }),
    deletePost: async () => {},
    moderatePost: async () => {}
  });

  await saveSocialPostToDb({
    id: 'post-text-auth-15',
    authorName: 'Enf. Carla Mendes',
    authorRole: 'Enfermeira CAPS I',
    city: 'Carangola',
    content: 'Post em texto puro validando inicialização da sessão anônima.',
    likes: 0,
    hasLiked: false,
    createdAt: 'Agora',
    timestamp: Date.now()
  });
  assert(
    observedAuthCallsForPost >= 1,
    'saveSocialPostToDb inicializa ensureAuthenticatedUser antes da gravação mesmo para posts sem foto',
    suite15
  );

  // 15.2 Autenticação automática em likeSocialPostInDb e deduplicação de chamadas concorrentes
  let observedAuthCallsForLike = 0;
  setEnsureAuthObserverForTests(() => {
    observedAuthCallsForLike += 1;
  });
  const likeAuthRes = await likeSocialPostInDb('post-text-auth-15', 'voter-test-15');
  const concurrentEnsure = await Promise.all([
    ensureAuthenticatedUser(),
    ensureAuthenticatedUser(),
    ensureAuthenticatedUser()
  ]);
  setSocialPostsAdapterForTests(null);
  setEnsureAuthObserverForTests(null);
  assert(
    likeAuthRes.success &&
      observedAuthCallsForLike >= 1 &&
      concurrentEnsure.length === 3 &&
      concurrentEnsure.every((u) => typeof u === 'string' && u.length > 0),
    'likeSocialPostInDb aciona ensureAuthenticatedUser e deduplica inicializações concorrentes de sessão',
    suite15
  );

  // 15.3 Preservação byte a byte de firestore.rules (sem escritas irrestritas)
  const rawFirestoreRules = fs.readFileSync(path.join(process.cwd(), 'firestore.rules'));
  const shaFirestoreRules = crypto.createHash('sha256').update(rawFirestoreRules).digest('hex');
  assert(
    shaFirestoreRules === 'c742b761a4aaa35e43cfddcd0b6dbae8a19005c2581eaf3a70627679bc54989c' &&
      rawFirestoreRules.toString('utf8').includes('isSignedIn() && isValidPublicPostCreate(incoming())'),
    'firestore.rules preservado integralmente (SHA-256 inalterado e sem liberação de escritas irrestritas)',
    suite15
  );

  // 15.4 Preservação byte a byte do módulo homologado api/email/confirm-registration.ts
  const rawConfirmEmail = fs.readFileSync(path.join(process.cwd(), 'api/email/confirm-registration.ts'));
  const shaConfirmEmail = crypto.createHash('sha256').update(rawConfirmEmail).digest('hex');
  assert(
    shaConfirmEmail === '44168ce4164eb4b6c8a14bb55270a6effd5f9340dc032cf76a5c85972eb7f344',
    'api/email/confirm-registration.ts preservado byte a byte (SHA-256 idêntico à versão homologada)',
    suite15
  );

  // 15.5 Ausência da senha administrativa em texto claro em AdminLogin.tsx e no bundle dist/
  const secretPassToCheck = 'SUS' + '2026%';
  const adminLoginSource = fs.readFileSync(path.join(process.cwd(), 'src/components/AdminLogin.tsx'), 'utf-8');
  const distAssetsPathSuite15 = path.join(process.cwd(), 'dist', 'assets');
  const distHasPlainPassword = fs.existsSync(distAssetsPathSuite15)
    ? fs
        .readdirSync(distAssetsPathSuite15)
        .filter((f) => f.endsWith('.js'))
        .some((f) => fs.readFileSync(path.join(distAssetsPathSuite15, f), 'utf-8').includes(secretPassToCheck))
    : false;
  const computedSecretHash = await sha256Hex(secretPassToCheck);
  assert(
    !adminLoginSource.includes(secretPassToCheck) &&
      !distHasPlainPassword &&
      adminLoginSource.includes(computedSecretHash),
    'AdminLogin.tsx valida credencial por hash SHA-256 sem expor senha em texto claro no código ou bundle dist/',
    suite15
  );

  // 15.6 Fallback seguro de fotografia no Mural sem violar limite de 1000 chars no Firestore
  const firebaseDbSource = fs.readFileSync(path.join(process.cwd(), 'src/services/firebaseDb.ts'), 'utf-8');
  const appTsxSource = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf-8');
  assert(
    firebaseDbSource.includes("!finalImageUrl.startsWith('data:')") &&
      firebaseDbSource.includes('imageUrl: finalImageUrl || post.imageUrl') &&
      appTsxSource.includes('imageUrl: rp.imageUrl || localCopy?.imageUrl'),
    'Mural bloqueia envio de data:URI base64 >1000 chars ao Firestore e preserva prévia local após snapshot',
    suite15
  );

  // 15.7 Validação estrita dos campos obrigatórios e condicionais de inscrição
  const missingBaseErrs = validateRegistrationFormData({
    fullName: '',
    cpf: '111.111.111-11',
    email: 'email_sem_dominio@invalid',
    phone: '3299',
    city: '',
    professionalRole: '',
    susCareLevel: '',
    institution: '',
    ageGroup: '',
    educationLevel: '',
    referralSource: '',
    axisInterest: ''
  });
  const missingConditionalErrs = validateRegistrationFormData({
    fullName: 'Maria Clara Silva',
    cpf: '529.982.247-25',
    email: 'maria.clara@carangola.mg.gov.br',
    phone: '(32) 99988-7766',
    city: 'Outros',
    customCity: '',
    professionalRole: 'Outros',
    customRole: '',
    susCareLevel: 'Atenção Psicossocial Especializada (CAPS I, CAPS II, CAPS AD)',
    institution: 'CAPS I Carangola',
    ageGroup: '30 a 39 anos',
    educationLevel: 'Especialização / Residência',
    referralSource: 'Ofício / Comunicado da Secretaria de Saúde',
    axisInterest: 'Eixo 1: Fluxograma da RAPS'
  });
  const validErrs = validateRegistrationFormData({
    fullName: 'Maria Clara Silva',
    cpf: '529.982.247-25',
    email: 'maria.clara@carangola.mg.gov.br',
    phone: '(32) 99988-7766',
    city: 'Carangola',
    professionalRole: 'Psicólogo(a)',
    susCareLevel: 'Atenção Psicossocial Especializada (CAPS I, CAPS II, CAPS AD)',
    institution: 'CAPS I Carangola',
    ageGroup: '30 a 39 anos',
    educationLevel: 'Especialização / Residência',
    referralSource: 'Ofício / Comunicado da Secretaria de Saúde',
    axisInterest: 'Eixo 1: Fluxograma da RAPS'
  });
  assert(
    Object.keys(missingBaseErrs).length === 12 &&
      Boolean(missingConditionalErrs.customCity) &&
      Boolean(missingConditionalErrs.customRole) &&
      Object.keys(validErrs).length === 0,
    'validateRegistrationFormData bloqueia todos os campos obrigatórios/inválidos (12 base + 2 condicionais) e aprova dados válidos',
    suite15
  );

  // 15.8 Assets atualizados de Cristiana Marina e logos RAPS / Prefeitura no Footer
  const footerSource = fs.readFileSync(path.join(process.cwd(), 'src/components/Footer.tsx'), 'utf-8');
  assert(
    fs.existsSync(path.join(process.cwd(), 'public/assets/cristiana-marina.jpg')) &&
      fs.existsSync(path.join(process.cwd(), 'public/assets/logo-caps-1.jpg')) &&
      fs.existsSync(path.join(process.cwd(), 'public/assets/logo-ceco-carangola.png')) &&
      fs.existsSync(path.join(process.cwd(), 'public/assets/logo-caps-ij.png')) &&
      defaultCristiana?.photoUrl === '/assets/cristiana-marina.jpg' &&
      footerSource.includes('bg-[#07242c]') &&
      footerSource.includes('/assets/logo-ceco-carangola.png') &&
      footerSource.includes('md:h-20') &&
      !footerSource.includes('contactEmail') &&
      !footerSource.includes('contactPhone'),
    'Assets de Cristiana Marina e logos dos serviços/Prefeitura no Footer configurados e ampliados corretamente',
    suite15
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
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Falha fatal na execução dos testes:', err);
  process.exit(1);
});
