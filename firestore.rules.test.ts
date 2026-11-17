/**
 * Verification Suite for Firestore Security Rules (Phase 0 Security TDD)
 * Evaluates the "Dirty Dozen" adversarial payloads against the Eight Pillars specification.
 */

export interface DirtyDozenCase {
  id: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email?: string; email_verified?: boolean } | null;
  docId: string;
  payload?: Record<string, unknown>;
  existing?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
  pillarViolated: string;
}

export const DIRTY_DOZEN_PAYLOADS: DirtyDozenCase[] = [
  {
    id: 'DD-01-unauth-read',
    collection: 'checklists',
    operation: 'list',
    auth: null,
    docId: 'chk_1',
    expectedResult: 'PERMISSION_DENIED',
    pillarViolated: 'Authentication Gate'
  },
  {
    id: 'DD-02-unauth-write',
    collection: 'fuelLogs',
    operation: 'create',
    auth: null,
    docId: 'fuel_1',
    payload: { id: 'fuel_1', plate: 'AAA0A00', liters: 40 },
    expectedResult: 'PERMISSION_DENIED',
    pillarViolated: 'Authentication Gate'
  },
  {
    id: 'DD-03-id-poisoning',
    collection: 'workOrders',
    operation: 'create',
    auth: { uid: 'anon_user_1' },
    docId: 'invalid.doc$id!',
    payload: { id: 'invalid.doc$id!' },
    expectedResult: 'PERMISSION_DENIED',
    pillarViolated: 'Path Variable Hardening (isValidId)'
  },
  {
    id: 'DD-04-shadow-field',
    collection: 'fuelConsumptionRules',
    operation: 'create',
    auth: { uid: 'anon_user_1' },
    docId: 'fcr_test',
    payload: {
      id: 'fcr_test',
      plate: 'TYY7F10',
      minConsumption: 5,
      avgConsumption: 10,
      maxConsumption: 16,
      ghostAdminFlag: true
    },
    expectedResult: 'PERMISSION_DENIED',
    pillarViolated: 'Validation Blueprint (hasOnly)'
  },
  {
    id: 'DD-05-type-poisoning',
    collection: 'fuelLogs',
    operation: 'create',
    auth: { uid: 'anon_user_1' },
    docId: 'fuel_bad_type',
    payload: {
      id: 'fuel_bad_type',
      code: 'ABT-2026-001',
      date: '2026-11-16',
      driver: 'João',
      plate: 'AAA0A00',
      fuelType: 'Gasolina',
      liters: '40',
      km: 0,
      location: 'Posto L3',
      createdAt: '2026-11-16T10:00:00Z'
    },
    expectedResult: 'PERMISSION_DENIED',
    pillarViolated: 'Type Safety'
  },
  {
    id: 'DD-06-string-exhaustion',
    collection: 'serviceRequests',
    operation: 'create',
    auth: { uid: 'anon_user_1' },
    docId: 'ss_huge',
    payload: {
      id: 'ss_huge',
      code: 'SS-2026-999',
      date: '2026-11-16',
      time: '10:00',
      requesterName: 'Teste',
      farm: 'Matriz',
      location: 'Oficina',
      equipment: 'Bomba',
      problemDescription: 'A'.repeat(5000),
      status: 'PENDENTE',
      createdAt: '2026-11-16T10:00:00Z'
    },
    expectedResult: 'PERMISSION_DENIED',
    pillarViolated: 'Mandatory Size Enforcement'
  },
  {
    id: 'DD-07-array-overflow',
    collection: 'workOrders',
    operation: 'create',
    auth: { uid: 'anon_user_1' },
    docId: 'os_arr',
    payload: {
      id: 'os_arr',
      materials: new Array(150).fill({ id: 'm', name: 'Parafuso', quantity: 1, unit: 'un' })
    },
    expectedResult: 'PERMISSION_DENIED',
    pillarViolated: 'Total Array Guarding'
  },
  {
    id: 'DD-08-immutable-tamper',
    collection: 'checklists',
    operation: 'update',
    auth: { uid: 'anon_user_1' },
    docId: 'chk_1',
    existing: { id: 'chk_1', createdAt: '2026-01-01T00:00:00Z' },
    payload: { id: 'chk_1', createdAt: '2026-11-16T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
    pillarViolated: 'Immortal Field Rule'
  },
  {
    id: 'DD-09-timestamp-forgery',
    collection: 'fuelLogs',
    operation: 'create',
    auth: { uid: 'anon_user_1' },
    docId: 'fuel_time_forge',
    payload: {
      id: 'fuel_time_forge',
      serverUpdatedAt: '1999-01-01T00:00:00Z'
    },
    expectedResult: 'PERMISSION_DENIED',
    pillarViolated: 'Temporal Integrity (request.time)'
  },
  {
    id: 'DD-10-terminal-state-bypass',
    collection: 'workOrders',
    operation: 'update',
    auth: { uid: 'anon_user_1' },
    docId: 'os_done',
    existing: { id: 'os_done', status: 'CONCLUIDA', createdAt: '2026-01-01T00:00:00Z' },
    payload: { id: 'os_done', status: 'ABERTA', createdAt: '2026-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
    pillarViolated: 'Terminal State Locking'
  },
  {
    id: 'DD-11-invalid-enum',
    collection: 'fuelLogs',
    operation: 'create',
    auth: { uid: 'anon_user_1' },
    docId: 'fuel_enum_bad',
    payload: {
      id: 'fuel_enum_bad',
      fuelType: 'Querosene'
    },
    expectedResult: 'PERMISSION_DENIED',
    pillarViolated: 'Validation Blueprint Enum Guard'
  },
  {
    id: 'DD-12-admin-escalation',
    collection: 'admins',
    operation: 'create',
    auth: { uid: 'anon_user_1' },
    docId: 'anon_user_1',
    payload: { uid: 'anon_user_1', createdAt: '2026-11-16T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
    pillarViolated: 'Privilege Escalation Guard'
  }
];
