# Especificação de Segurança Firestore — el Ciruelo

## 1. Invariantes de Dados (Data Invariants)
1. **Autenticação Sem Login Gmail**: Todos os dispositivos clientes autenticam-se via Firebase Authentication (`signInAnonymously` ou Google Auth opcional para Administrador). Nenhum acesso não autenticado (`request.auth == null`) é permitido em nenhuma coleção.
2. **Integridade de ID de Caminho**: Todo ID de documento (`checklistId`, `workOrderId`, `fuelLogId`, etc.) deve atender `^[a-zA-Z0-9_-]+$` com tamanho entre 1 e 128 caracteres.
3. **Zero Shadow Fields (hasAll + hasOnly)**: Toda criação de documento exige todas as chaves obrigatórias (`hasAll`) e proíbe qualquer chave desconhecida (`hasOnly`).
4. **Imutabilidade Temporal e de Chave**: Em toda atualização (`update`), `id` e `createdAt` são imutáveis (`incoming().id == existing().id`), e `serverUpdatedAt` deve coincidir estritamente com `request.time`.
5. **Travamento de Estado Terminal**: Ordens de Serviço (`CONCLUIDA` ou `CANCELADA`) e Solicitações de Serviço (`CONCLUIDA` ou `CANCELADA`) não podem sofrer novas alterações por sessões padrão após atingirem o estado terminal (exceto override por `isAdmin()`).
6. **Limites Volumétricos Estritos**: Todo campo `string` possui verificação explícita de `.size()` e toda lista possui limite máximo de elementos para prevenir exaustão de armazenamento e documentos acima de 1 MB.
7. **Sem Leituras ou Escritas Abertas**: Nenhuma regra utiliza `allow read: if true` ou `allow write: if true`, e todo `allow list` valida atributos de `resource.data`.

## 2. "Dirty Dozen" — 12 Payloads Adversariais (Todos devem retornar PERMISSION_DENIED)
1. **Unauthenticated Read (`checklists`)**: Requisição `get`/`list` sem `request.auth`.
2. **Unauthenticated Write (`fuelLogs`)**: Criação de abastecimento com `request.auth == null`.
3. **Invalid Document ID Poisoning (`workOrders`)**: ID contendo `/`, `.` ou >128 caracteres (`bad.id/inject`).
4. **Shadow / Ghost Field Injection (`fuelConsumptionRules`)**: Payload válido contendo campo extra `"isAdminOverride": true`.
5. **Type Poisoning (`fuelLogs`)**: Campo `liters` enviado como string `"50"` em vez de `number`.
6. **Boundary Exhaustion (`serviceRequests`)**: Campo `problemDescription` com string > 4000 caracteres.
7. **Array Overflow (`workOrders`)**: Campo `materials` com lista > 100 itens.
8. **Immutable ID / CreatedAt Tampering (`checklists`)**: `update` tentando alterar `id` ou `createdAt` do documento existente.
9. **Client Timestamp Forgery (`fuelLogs`)**: `create` ou `update` enviando `serverUpdatedAt` diferente de `request.time`.
10. **Terminal State Bypass (`workOrders`)**: `update` tentando reabrir uma OS já `CONCLUIDA` sem privilégio `isAdmin()`.
11. **Invalid Enum Value (`fuelLogs`)**: `fuelType` enviado como `"Querosene"` fora de `['Gasolina', 'Diesel Comum', 'Diesel S10']`.
12. **Self-Assigned Admin Escalation (`admins`)**: Usuário comum tentando escrever documento próprio em `/admins/{uid}`.
