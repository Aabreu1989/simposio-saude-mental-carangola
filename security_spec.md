# Security Specification — Simpósio de Saúde Mental Carangola (Firestore)

## 1. Data Invariants
1. **Acreditação obrigatória para certificado**: Um certificado só pode constar como liberado (`certificateIssued == true`) quando o status do participante for estritamente `'presente'` (Credenciado). Registros com status `'confirmada'` ("Fazer Check-in") ou `'cancelada'` nunca podem ter `certificateIssued == true` em criações públicas nem em atualizações.
2. **Criação pública restrita**: Qualquer novo cadastro público em `/registrations/{registrationId}` deve iniciar obrigatoriamente com `status == 'confirmada'` e `certificateIssued == false`. Nenhuma inscrição pública pode se auto-declarar `'presente'` ou com certificado liberado.
3. **Isolamento de PII**: Dados pessoais sensíveis (`cpf`, `cns`, `email`, `phone`) permanecem exclusivamente em `/registrations/{registrationId}`, cuja leitura (`get`, `list`) e alteração (`update`, `delete`) exigem gestor autenticado e verificado (`isAdmin()`). O portal público consulta elegibilidade em `/certificate_permissions/{permissionId}` (somente `get`, sem dados pessoais).
4. **Admin Bootstrapped + Verificação de E-mail**: O acesso administrativo requer `request.auth != null`, `request.auth.token.email_verified == true`, e correspondência com `farmaciademinas.marketing@gmail.com` ou documento em `/admins/$(request.auth.uid)`.

## 2. Dirty Dozen Payloads (Negation Tests -> PERMISSION_DENIED)
1. **Self-accreditation on create**: `POST /registrations/reg-x` (sem admin) com `{ status: 'presente', certificateIssued: true }` -> `PERMISSION_DENIED`.
2. **Shadow field on registration create**: `POST /registrations/reg-x` com `{ ..., isAdmin: true }` -> `PERMISSION_DENIED`.
3. **Public blanket list of PII**: `LIST /registrations` sem admin -> `PERMISSION_DENIED`.
4. **Public read of PII doc**: `GET /registrations/reg-001` sem admin -> `PERMISSION_DENIED`.
5. **Unauthenticated check-in tamper**: `UPDATE /registrations/reg-001` `{ status: 'presente', certificateIssued: true }` sem admin -> `PERMISSION_DENIED`.
6. **Spoofed unverified admin email**: Admin email `farmaciademinas.marketing@gmail.com` com `email_verified: false` tentando `LIST /registrations` -> `PERMISSION_DENIED`.
7. **ID poisoning (>128 chars or invalid chars)**: `POST /registrations/../../evil` ou ID com 300 caracteres -> `PERMISSION_DENIED`.
8. **Type poisoning on certificateIssued**: `UPDATE /registrations/reg-001` com `certificateIssued: "true"` (string) -> `PERMISSION_DENIED`.
9. **Inconsistent certificateIssued with non-present status**: `UPDATE /certificate_permissions/CAR-SM-002` com `{ status: 'confirmada', certificateIssued: true }` -> `PERMISSION_DENIED`.
10. **Public write to event_config / badgeDesign**: `UPDATE /event_config/main` sem admin -> `PERMISSION_DENIED`.
11. **Public write to admins**: `CREATE /admins/attacker` `{ email: 'attacker@x.com', role: 'admin' }` -> `PERMISSION_DENIED`.
12. **Certificate download audit log for non-accredited code**: `CREATE /certificate_downloads/dl-1` quando `/certificate_permissions/$(code).data.certificateIssued != true` (sem admin) -> `PERMISSION_DENIED`.
