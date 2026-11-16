import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  ActiveTab,
  ChecklistRecord,
  ChecklistType,
  Farm,
  FARMS,
  UserRole,
  Vehicle,
  DroneAsset,
  VehicleMonthlyUpdate,
  WorkOrder,
  NR13InspectionReport,
  NR13VesselMaster,
  ValveCalibrationRecord,
  GaugeCalibrationRecord,
  UltrassomEquipmentRecord,
  ServiceRequest,
  OperatorServiceRelease,
  AccessModule,
  ALL_ACCESS_MODULES,
  FuelLogRecord,
  FuelConsumptionRule
} from '../types';
import { DEFAULT_FALLBACK_RULE } from '../utils/fuelConsumptionHelper';
import { INITIAL_CHECKLISTS, INITIAL_WORK_ORDERS, INITIAL_VEHICLES, INITIAL_DRONES, INITIAL_FLEET_UPDATES } from '../data/initialData';
import {
  INITIAL_NR13_REPORTS,
  INITIAL_NR13_VESSELS,
  INITIAL_VALVE_CALIBRATIONS,
  INITIAL_GAUGE_CALIBRATIONS,
  INITIAL_ULTRASSOM_EQUIPMENTS,
  LEGACY_SAMPLE_VESSEL_IDS,
  LEGACY_SAMPLE_VALVE_IDS,
  LEGACY_SAMPLE_GAUGE_IDS,
  INSPECIONE_TEST_GAUGE_STANDARD,
  INSPECIONE_TEST_GAUGE_CERT
} from '../data/nr13InitialData';
import { api } from '../api/client';
import { safeLocalStorageSet } from '../utils/imageCompressor';
import { syncManager, decodeSyncPayload, SyncPayload, PeerStatus } from '../utils/syncManager';
import { cloudLiveSync } from '../utils/cloudLiveSync';

interface DeleteModalState {
  isOpen: boolean;
  type: 'checklist' | 'work-order' | 'fleet-update' | 'service-request' | 'fuel-log';
  id: string;
  code: string;
  description?: string;
}

interface AppContextType {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  selectedFarmFilter: Farm | 'TODAS';
  setSelectedFarmFilter: (farm: Farm | 'TODAS') => void;
  lockedFarm: Farm | null;
  setLockedFarm: (farm: Farm | null) => void;
  isFarmLocked: boolean;
  isRoleLocked: boolean;
  allowedModules: AccessModule[];
  hasModuleAccess: (mod: AccessModule) => boolean;
  unlockFarm: () => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  
  checklists: ChecklistRecord[];
  addChecklist: (checklist: Omit<ChecklistRecord, 'id' | 'code' | 'createdAt'> & { id?: string; code?: string; createdAt?: string }) => ChecklistRecord;
  deleteChecklist: (id: string) => Promise<void>;
  acknowledgeChecklistItem: (checklistId: string, itemId: string, justification?: string) => Promise<void>;
  unacknowledgeChecklistItem: (checklistId: string, itemId: string) => Promise<void>;
  acknowledgeAllChecklistNCs: (checklistId: string, justification?: string) => Promise<void>;
  
  workOrders: WorkOrder[];
  addWorkOrder: (workOrder: Omit<WorkOrder, 'id' | 'code' | 'createdAt' | 'updatedAt'> & { id?: string; code?: string; createdAt?: string }) => WorkOrder;
  updateWorkOrder: (id: string, updates: Partial<WorkOrder>) => Promise<void>;
  deleteWorkOrder: (id: string) => Promise<void>;
  
  generateWorkOrderFromChecklistNC: (
    checklist: ChecklistRecord,
    itemDescription: string,
    notes?: string,
    photoUrl?: string
  ) => void;
  
  // Realtime Sync & Offline Status
  isSyncing: boolean;
  lastSyncTime: string | null;
  syncNow: (forceFull?: boolean) => Promise<void>;
  isOnline: boolean;
  pendingOfflineCount: number;
  flushOfflineQueue: () => Promise<void>;
  
  // Auto-save drafts
  autoSaveDraft: (type: 'checklist' | 'work-order', data: any) => Promise<void>;

  // Clear tests or restore
  resetToDefaults: () => Promise<void>;
  clearTestRecords: () => Promise<void>;
  restoreItemIndividually: (type: 'checklist' | 'work-order', id: string) => Promise<void>;

  // Complete History Export & Import / Anti-Loss Backup
  exportBackupJson: () => void;
  importBackupJson: (file: File) => Promise<{ success: boolean; message: string }>;

  // Modals & Navigation state
  showDataManagementModal: boolean;
  setShowDataManagementModal: (open: boolean) => void;
  showSyncModal: boolean;
  setShowSyncModal: (open: boolean) => void;
  peerStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  peerMessage: string;
  importSyncPayload: (payload: any) => void;
  syncToast: { isOpen: boolean; message: string } | null;
  setSyncToast: (toast: { isOpen: boolean; message: string } | null) => void;
  viewChecklistDetail: ChecklistRecord | null;
  setViewChecklistDetail: (c: ChecklistRecord | null) => void;
  viewWorkOrderDetail: WorkOrder | null;
  setViewWorkOrderDetail: (wo: WorkOrder | null) => void;
  previewImage: { url: string; title?: string } | null;
  setPreviewImage: (data: { url: string; title?: string } | null) => void;
  
  // Mobile operator access modal
  showMobileAccessModal: boolean;
  setShowMobileAccessModal: (open: boolean) => void;

  // In-app Delete Confirmation Modal State
  deleteModalState: DeleteModalState;
  requestDelete: (params: { type: 'checklist' | 'work-order' | 'fleet-update' | 'service-request' | 'fuel-log'; id: string; code: string; description?: string }) => void;
  cancelDelete: () => void;
  confirmDelete: () => Promise<void>;

  // New checklist creation flow
  selectedChecklistTypeForCreation: ChecklistType;
  setSelectedChecklistTypeForCreation: (type: ChecklistType) => void;
  startNewChecklist: (type?: ChecklistType) => void;

  // Vehicle Management
  vehicles: Vehicle[];
  addVehicle: (v: Omit<Vehicle, 'id'>) => Vehicle;
  deleteVehicle: (id: string) => void;
  showVehicleModal: boolean;
  setShowVehicleModal: (open: boolean) => void;

  // Drone Management
  drones: DroneAsset[];
  addDrone: (d: { name: string; model: string; farm?: Farm }) => DroneAsset;
  deleteDrone: (id: string) => void;
  showDroneModal: boolean;
  setShowDroneModal: (open: boolean) => void;

  // Monthly Fleet Updates ("Atualizações Mensais Veículos da Frota")
  fleetMonthlyUpdates: VehicleMonthlyUpdate[];
  viewFleetUpdateDetail: VehicleMonthlyUpdate | null;
  setViewFleetUpdateDetail: (u: VehicleMonthlyUpdate | null) => void;
  showFleetUpdateFormModal: boolean;
  setShowFleetUpdateFormModal: (open: boolean) => void;
  fleetFormMode: 'UPDATE' | 'CHECKLIST' | 'DRONE' | 'FUEL';
  setFleetFormMode: (mode: 'UPDATE' | 'CHECKLIST' | 'DRONE' | 'FUEL') => void;
  fleetListTab: 'UPDATES' | 'CHECKLISTS' | 'DRONES' | 'FUEL';
  setFleetListTab: (tab: 'UPDATES' | 'CHECKLISTS' | 'DRONES' | 'FUEL') => void;
  startNewFleetAction: (mode?: 'UPDATE' | 'CHECKLIST' | 'DRONE' | 'FUEL') => void;
  addFleetMonthlyUpdate: (update: Omit<VehicleMonthlyUpdate, 'id' | 'code' | 'createdAt'> & { id?: string; code?: string; createdAt?: string }) => VehicleMonthlyUpdate;
  deleteFleetMonthlyUpdate: (id: string) => Promise<void>;
  acknowledgeFleetSinistro: (updateId: string, justification?: string) => Promise<void>;
  unacknowledgeFleetSinistro: (updateId: string) => Promise<void>;

  // Fueling & Consumption Targets (Abastecimentos da Frota)
  fuelLogs: FuelLogRecord[];
  fuelConsumptionRules: FuelConsumptionRule[];
  saveFuelLog: (log: Omit<FuelLogRecord, 'id' | 'code' | 'createdAt'> & { id?: string; code?: string; createdAt?: string }) => FuelLogRecord;
  deleteFuelLog: (id: string) => Promise<void>;
  saveFuelConsumptionRule: (rule: Omit<FuelConsumptionRule, 'id'> & { id?: string }) => FuelConsumptionRule;
  saveFuelConsumptionRulesBatch: (payload: {
    rules: Array<Omit<FuelConsumptionRule, 'id'> & { id?: string }>;
    deleteRuleIds?: string[];
  }) => FuelConsumptionRule[];
  deleteFuelConsumptionRule: (id: string) => Promise<void>;

  // NR-13 & Metrologia (Laudos e Calibrações)
  nr13Reports: NR13InspectionReport[];
  saveNR13Report: (rep: NR13InspectionReport) => Promise<void>;
  deleteNR13Report: (id: string) => Promise<void>;
  nr13Vessels: NR13VesselMaster[];
  saveNR13Vessel: (vessel: NR13VesselMaster) => Promise<void>;
  deleteNR13Vessel: (id: string) => Promise<void>;
  valveCalibrations: ValveCalibrationRecord[];
  saveValveCalibration: (record: ValveCalibrationRecord) => Promise<void>;
  deleteValveCalibration: (id: string) => Promise<void>;
  gaugeCalibrations: GaugeCalibrationRecord[];
  saveGaugeCalibration: (record: GaugeCalibrationRecord) => Promise<void>;
  deleteGaugeCalibration: (id: string) => Promise<void>;
  ultrassomEquipments: UltrassomEquipmentRecord[];
  saveUltrassomEquipment: (record: UltrassomEquipmentRecord) => Promise<void>;
  deleteUltrassomEquipment: (id: string) => Promise<void>;

  // Solicitações de Serviço & Liberação Exclusiva de Operadores
  serviceRequests: ServiceRequest[];
  addServiceRequest: (req: Omit<ServiceRequest, 'id' | 'code' | 'createdAt' | 'status'> & { id?: string; code?: string; createdAt?: string; status?: ServiceRequest['status'] }) => Promise<ServiceRequest>;
  updateServiceRequest: (id: string, updates: Partial<ServiceRequest>) => Promise<void>;
  deleteServiceRequest: (id: string) => Promise<void>;
  viewServiceRequestDetail: ServiceRequest | null;
  setViewServiceRequestDetail: (sr: ServiceRequest | null) => void;
  generateWorkOrderFromServiceRequest: (sr: ServiceRequest) => void;
  linkWorkOrderToServiceRequest: (serviceRequestId: string, wo: WorkOrder) => Promise<void>;
  mySubmittedRequestIds: string[];

  operatorServiceReleases: OperatorServiceRelease[];
  operatorReleaseKey: string | null;
  activeOperatorRelease: OperatorServiceRelease | null;
  hasServiceRequestAccess: boolean;
  serviceRequestFarmScope: Farm | 'TODAS';
  redeemOperatorReleaseKey: (token: string) => { success: boolean; message: string };
  saveOperatorRelease: (data: Partial<OperatorServiceRelease> & { operatorName: string }) => Promise<OperatorServiceRelease | null>;
  toggleOperatorRelease: (id: string) => Promise<void>;
  deleteOperatorRelease: (id: string) => Promise<void>;

  // Pending quick creation from checklist or service request
  prefilledWorkOrder: Partial<WorkOrder> | null;
  setPrefilledWorkOrder: (wo: Partial<WorkOrder> | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  FARM_FILTER: 'agrocheck_farm_filter',
  CHECKLISTS: 'agrocheck_checklists_v3',
  WORK_ORDERS: 'agrocheck_work_orders_v3',
  USER_ROLE: 'agrocheck_user_role',
  DELETED_IDS: 'agrocheck_deleted_ids_v2',
  VEHICLES: 'agrocheck_vehicles_v1',
  DRONES: 'elciruelo_drones_v1',
  FLEET_MONTHLY_UPDATES: 'agrocheck_fleet_monthly_updates_v1',
  NR13_REPORTS: 'elciruelo_nr13_reports_v1',
  NR13_VESSELS: 'elciruelo_nr13_vessels_v2',
  VALVE_CALIBRATIONS: 'elciruelo_valve_calibrations_v2',
  GAUGE_CALIBRATIONS: 'elciruelo_gauge_calibrations_v2',
  ULTRASSOM_EQUIPMENTS: 'elciruelo_ultrassom_equipments_v1',
  SERVICE_REQUESTS: 'elciruelo_service_requests_v1',
  OPERATOR_RELEASES: 'elciruelo_operator_releases_v1',
  OPERATOR_SS_KEY: 'elciruelo_operator_ss_key',
  MY_REQUEST_IDS: 'elciruelo_my_service_requests_v1',
  ALLOWED_MODULES: 'elciruelo_allowed_modules_v1',
  FUEL_LOGS: 'elciruelo_fuel_logs_v1',
  FUEL_RULES: 'elciruelo_fuel_rules_v1'
};

const parseModulesParam = (raw: string | null): AccessModule[] | null => {
  if (!raw) return null;
  const parts = raw
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter((s): s is AccessModule => ALL_ACCESS_MODULES.includes(s as AccessModule));
  return parts.length > 0 ? Array.from(new Set(parts)) : null;
};

const safeStorageGet = (key: string): string | null => {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
};

const safeStorageSet = (key: string, value: string): void => {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage restriction on iOS Private Browsing / restricted Android WebView
  }
};

const safeStorageRemove = (key: string): void => {
  try {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
  } catch {
    // Ignore
  }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Resolve initial role, lock state, and allowed modules deterministically.
  // Explicit URL query params ALWAYS override stale localStorage locks so opening a new QR/link switches cleanly.
  const [initialAccess] = useState<{ role: UserRole; locked: boolean; modules: AccessModule[] }>(() => {
    const defaultOpModules: AccessModule[] = ['fleet_update', 'checklist', 'work_order'];
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const perfilParam = (params.get('perfil') || params.get('acesso'))?.toLowerCase();
      const lockRole = params.get('lock_role');
      const somenteOperador = params.get('somente_operador');
      const somenteSolicitante = params.get('somente_solicitante');
      const urlModules = parseModulesParam(params.get('mods'));
      const ssKey = params.get('ss_key');
      const hasValidSsKey = Boolean(ssKey && ssKey !== 'none');

      // 1. Explicit ADMIN link
      if (perfilParam === 'admin') {
        safeStorageRemove('agrocheck_operator_role_locked');
        safeStorageRemove('agrocheck_solicitante_role_locked');
        safeStorageRemove('elciruelo_operator_ss_key');
        safeStorageRemove(STORAGE_KEYS.ALLOWED_MODULES);
        safeStorageSet('agrocheck_user_role', 'ADMIN');
        return { role: 'ADMIN', locked: false, modules: ALL_ACCESS_MODULES };
      }

      // 2. Explicit OPERADOR link (must check BEFORE stale savedSolLocked!)
      if (perfilParam === 'operador' || somenteOperador === 'true') {
        safeStorageRemove('agrocheck_solicitante_role_locked');
        safeStorageSet('agrocheck_operator_role_locked', 'true');
        safeStorageSet('agrocheck_user_role', 'OPERADOR');
        const resolvedMods: AccessModule[] = urlModules
          ? (hasValidSsKey && !urlModules.includes('service_request') ? [...urlModules, 'service_request'] : urlModules)
          : (hasValidSsKey ? [...defaultOpModules, 'service_request'] : defaultOpModules);
        if (urlModules) {
          safeStorageSet(STORAGE_KEYS.ALLOWED_MODULES, JSON.stringify(resolvedMods));
        } else {
          safeStorageRemove(STORAGE_KEYS.ALLOWED_MODULES);
        }
        return { role: 'OPERADOR', locked: true, modules: resolvedMods };
      }

      // 3. Explicit SOLICITANTE link
      if (perfilParam === 'solicitante' || somenteSolicitante === 'true') {
        safeStorageRemove('agrocheck_operator_role_locked');
        safeStorageRemove('elciruelo_operator_ss_key');
        safeStorageSet('agrocheck_solicitante_role_locked', 'true');
        safeStorageSet('agrocheck_user_role', 'SOLICITANTE');
        const resolvedMods: AccessModule[] = urlModules || ['service_request'];
        safeStorageSet(STORAGE_KEYS.ALLOWED_MODULES, JSON.stringify(resolvedMods));
        return { role: 'SOLICITANTE', locked: true, modules: resolvedMods };
      }

      // 4. Generic locked link or mods-only link
      if (lockRole === 'true' || urlModules) {
        const isOnlyLean =
          urlModules &&
          !urlModules.includes('checklist') &&
          !urlModules.includes('work_order') &&
          !hasValidSsKey;
        if (isOnlyLean) {
          safeStorageRemove('agrocheck_operator_role_locked');
          safeStorageSet('agrocheck_solicitante_role_locked', 'true');
          safeStorageSet('agrocheck_user_role', 'SOLICITANTE');
          safeStorageSet(STORAGE_KEYS.ALLOWED_MODULES, JSON.stringify(urlModules));
          return { role: 'SOLICITANTE', locked: true, modules: urlModules };
        }
        safeStorageRemove('agrocheck_solicitante_role_locked');
        safeStorageSet('agrocheck_operator_role_locked', 'true');
        safeStorageSet('agrocheck_user_role', 'OPERADOR');
        const resolvedMods = urlModules || defaultOpModules;
        if (urlModules) {
          safeStorageSet(STORAGE_KEYS.ALLOWED_MODULES, JSON.stringify(resolvedMods));
        }
        return { role: 'OPERADOR', locked: true, modules: resolvedMods };
      }

      // 5. No URL role params -> restore saved session lock / preferences
      const savedOpLocked = safeStorageGet('agrocheck_operator_role_locked');
      const savedSolLocked = safeStorageGet('agrocheck_solicitante_role_locked');
      let savedMods: AccessModule[] | null = null;
      try {
        const rawMods = safeStorageGet(STORAGE_KEYS.ALLOWED_MODULES);
        if (rawMods) {
          const parsed = JSON.parse(rawMods);
          if (Array.isArray(parsed)) {
            const valid = parsed.filter((m: any) => ALL_ACCESS_MODULES.includes(m));
            if (valid.length > 0) savedMods = valid;
          }
        }
      } catch {}

      if (savedOpLocked === 'true') {
        return { role: 'OPERADOR', locked: true, modules: savedMods || defaultOpModules };
      }
      if (savedSolLocked === 'true') {
        return { role: 'SOLICITANTE', locked: true, modules: savedMods || ['service_request'] };
      }
      const saved = safeStorageGet('agrocheck_user_role');
      if (saved === 'OPERADOR') {
        return { role: 'OPERADOR', locked: false, modules: savedMods || defaultOpModules };
      }
      if (saved === 'SOLICITANTE') {
        return { role: 'SOLICITANTE', locked: false, modules: savedMods || ['service_request'] };
      }
    }
    return { role: 'ADMIN', locked: false, modules: ALL_ACCESS_MODULES };
  });

  const [isRoleLocked] = useState<boolean>(initialAccess.locked);
  const [userRole, setUserRole] = useState<UserRole>(initialAccess.role);
  const [allowedModules] = useState<AccessModule[]>(initialAccess.modules);

  // Exclusive Operator Service Request Release Key (?ss_key=...)
  const [operatorReleaseKey, setOperatorReleaseKey] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const ssKey = params.get('ss_key');
      const perfilParam = (params.get('perfil') || params.get('acesso'))?.toLowerCase();
      if (ssKey && ssKey !== 'none') {
        safeStorageSet('elciruelo_operator_ss_key', ssKey);
        return ssKey;
      }
      if (perfilParam === 'operador' && !ssKey) {
        // Explicit standard operator link without ss_key clears prior key
        safeStorageRemove('elciruelo_operator_ss_key');
        return null;
      }
      return safeStorageGet('elciruelo_operator_ss_key');
    }
    return null;
  });

  const [lockedFarm, setLockedFarmState] = useState<Farm | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const farmParam = params.get('fazenda');
      const todasParam = params.get('todas_fazendas');

      // Explicit unlock for all farms
      if (farmParam?.toUpperCase() === 'TODAS' || todasParam === 'true') {
        safeStorageRemove('agrocheck_locked_farm');
        return null;
      }

      if (farmParam) {
        const found = FARMS.find(
          f => f.toLowerCase() === farmParam.toLowerCase() || f.replace(/\s+/g, '_').toLowerCase() === farmParam.toLowerCase()
        );
        if (found) {
          safeStorageSet('agrocheck_locked_farm', found);
          return found as Farm;
        }
      }

      // If user scanned a QR code that specifies perfil without a specific fazenda, unlock all farms
      if (params.has('perfil') && !farmParam) {
        safeStorageRemove('agrocheck_locked_farm');
        return null;
      }

      const savedLocked = safeStorageGet('agrocheck_locked_farm');
      const perfilParam = params.get('perfil')?.toLowerCase();
      const savedRole = safeStorageGet('agrocheck_user_role');
      if (
        (perfilParam === 'operador' ||
          perfilParam === 'solicitante' ||
          savedRole === 'OPERADOR' ||
          savedRole === 'SOLICITANTE') &&
        savedLocked
      ) {
        return savedLocked as Farm;
      }
    }
    return null;
  });

  const [selectedFarmFilter, setSelectedFarmFilterState] = useState<Farm | 'TODAS'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const farmParam = params.get('fazenda');
      const todasParam = params.get('todas_fazendas');

      if (farmParam?.toUpperCase() === 'TODAS' || todasParam === 'true') {
        return 'TODAS';
      }

      if (farmParam) {
        const found = FARMS.find(
          f => f.toLowerCase() === farmParam.toLowerCase() || f.replace(/\s+/g, '_').toLowerCase() === farmParam.toLowerCase()
        );
        if (found) return found as Farm;
      }
      const savedLocked = safeStorageGet('agrocheck_locked_farm');
      if (savedLocked) return savedLocked as Farm;
    }
    const saved = safeStorageGet(STORAGE_KEYS.FARM_FILTER);
    return (saved as Farm | 'TODAS') || 'TODAS';
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (userRole === 'SOLICITANTE') {
      return initialAccess.modules.includes('service_request') ? 'new-service-request' : 'new-fleet-update';
    }
    if (userRole === 'OPERADOR' && !initialAccess.modules.includes('checklist') && !initialAccess.modules.includes('work_order')) {
      if (initialAccess.modules.includes('fleet_update')) return 'new-fleet-update';
      if (initialAccess.modules.includes('service_request')) return 'new-service-request';
    }
    return 'dashboard';
  });

  const [checklists, setChecklists] = useState<ChecklistRecord[]>(() => {
    try {
      const keysToCheck = [
        STORAGE_KEYS.CHECKLISTS,
        'agrocheck_permanent_vault_checklists',
        'agrocheck_checklists_v3',
        'agrocheck_checklists_v2',
        'agrocheck_checklists_v1',
        'agrocheck_checklists'
      ];
      for (const k of keysToCheck) {
        const saved = localStorage.getItem(k);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const valid = parsed.filter((c: any) => c && c.id && Array.isArray(c.items));
            if (valid.length > 0) return valid;
          }
        }
      }
    } catch {
      // fallback
    }
    return INITIAL_CHECKLISTS;
  });

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(() => {
    try {
      const keysToCheck = [
        STORAGE_KEYS.WORK_ORDERS,
        'agrocheck_permanent_vault_workorders',
        'agrocheck_work_orders_v3',
        'agrocheck_work_orders_v2',
        'agrocheck_work_orders_v1',
        'agrocheck_work_orders'
      ];
      for (const k of keysToCheck) {
        const saved = localStorage.getItem(k);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const valid = parsed.filter((w: any) => w && w.id);
            if (valid.length > 0) return valid;
          }
        }
      }
    } catch {
      // fallback
    }
    return INITIAL_WORK_ORDERS;
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Offline detection and background queue
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  interface OfflineQueueItem {
    id: string;
    type: 'checklist' | 'work-order' | 'fleet-update' | 'service-request' | 'fuel-log' | 'fuel-rule';
    action: 'save' | 'delete';
    data: any;
    timestamp: number;
  }

  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>(() => {
    try {
      const saved = localStorage.getItem('agrocheck_offline_queue_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync modal and peer states
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [peerStatus, setPeerStatus] = useState<PeerStatus>('disconnected');
  const [peerMessage, setPeerMessage] = useState('');
  const [syncToast, setSyncToast] = useState<{ isOpen: boolean; message: string; type?: 'success' | 'info' | 'error' } | null>(null);

  const [viewChecklistDetail, setViewChecklistDetail] = useState<ChecklistRecord | null>(null);
  const [viewWorkOrderDetail, setViewWorkOrderDetail] = useState<WorkOrder | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title?: string } | null>(null);
  const [showMobileAccessModal, setShowMobileAccessModal] = useState(false);
  const [showDataManagementModal, setShowDataManagementModal] = useState(false);
  const [selectedChecklistTypeForCreation, setSelectedChecklistTypeForCreation] = useState<ChecklistType>('SALA_DE_MAQUINAS');
  const [prefilledWorkOrder, setPrefilledWorkOrder] = useState<Partial<WorkOrder> | null>(null);

  // Vehicle Management
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const tempVehicleSeed: Vehicle = {
      id: 'v_temp_aaa0a00',
      model: 'VEÍCULO TEMPORÁRIO',
      plate: 'AAA0A00',
      isTemporary: true
    };
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.VEHICLES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasTemp = parsed.some(
            (v: Vehicle) => String(v?.plate || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '') === 'AAA0A00'
          );
          if (!hasTemp) {
            return [...parsed, tempVehicleSeed];
          }
          return parsed.map((v: Vehicle) =>
            String(v?.plate || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '') === 'AAA0A00'
              ? { ...v, isTemporary: true }
              : v
          );
        }
      }
    } catch {}
    return INITIAL_VEHICLES;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles));
    } catch {}
  }, [vehicles]);

  const addVehicle = useCallback((v: Omit<Vehicle, 'id'>) => {
    const cleanPlate = v.plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const newV: Vehicle = {
      id: `v_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      model: v.model.trim().toUpperCase(),
      plate: cleanPlate,
      farm: v.farm,
      isTemporary: Boolean(v.isTemporary || cleanPlate === 'AAA0A00')
    };
    setVehicles(prev => [newV, ...prev]);
    return newV;
  }, []);

  const deleteVehicle = useCallback((id: string) => {
    setVehicles(prev => prev.filter(v => v.id !== id));
  }, []);

  // Drone Management
  const [showDroneModal, setShowDroneModal] = useState(false);
  const [drones, setDrones] = useState<DroneAsset[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DRONES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const deletedRaw = localStorage.getItem(STORAGE_KEYS.DELETED_IDS);
          const dSet = new Set(deletedRaw ? JSON.parse(deletedRaw) : []);
          const valid = parsed.filter((d: any) => d && d.id && d.label && !dSet.has(d.id));
          if (valid.length > 0) return valid;
        }
      }
    } catch {}
    return INITIAL_DRONES;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DRONES, JSON.stringify(drones));
    } catch {}
  }, [drones]);

  const addDrone = useCallback((d: { name: string; model: string; farm?: Farm }): DroneAsset => {
    const cleanName = d.name.trim();
    const cleanModel = d.model.trim().toUpperCase();
    const label = cleanModel ? `${cleanName} (${cleanModel})` : cleanName;
    const newDrone: DroneAsset = {
      id: `dr_asset_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: cleanName,
      model: cleanModel,
      label,
      farm: d.farm,
      createdAt: new Date().toISOString()
    };
    setDrones(prev => {
      const exists = prev.find(item => item.label.toLowerCase() === label.toLowerCase());
      if (exists) return prev;
      const next = [...prev, newDrone];
      safeLocalStorageSet(STORAGE_KEYS.DRONES, JSON.stringify(next));
      return next;
    });
    api.saveDrone(newDrone).catch(() => {});
    cloudLiveSync.publish('DRONE_SAVED', newDrone);
    return newDrone;
  }, []);

  const deleteDrone = useCallback((id: string) => {
    setDrones(prev => {
      const next = prev.filter(d => d.id !== id);
      safeLocalStorageSet(STORAGE_KEYS.DRONES, JSON.stringify(next));
      return next;
    });
    api.deleteDrone(id).catch(() => {});
    cloudLiveSync.publish('DRONE_DELETED', { id });
  }, []);

  // Monthly Fleet Updates ("Atualizações Mensais Veículos da Frota")
  const [fleetMonthlyUpdates, setFleetMonthlyUpdates] = useState<VehicleMonthlyUpdate[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FLEET_MONTHLY_UPDATES);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const deletedRaw = localStorage.getItem(STORAGE_KEYS.DELETED_IDS);
          const dSet = new Set(deletedRaw ? JSON.parse(deletedRaw) : []);
          return parsed.filter(u => u && u.id && !dSet.has(u.id));
        }
      }
    } catch {}
    const deletedRaw = localStorage.getItem(STORAGE_KEYS.DELETED_IDS);
    const dSet = new Set(deletedRaw ? JSON.parse(deletedRaw) : []);
    return INITIAL_FLEET_UPDATES.filter(u => u && u.id && !dSet.has(u.id));
  });

  // Fuel Logs & Consumption Rules State
  const [fuelLogs, setFuelLogs] = useState<FuelLogRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FUEL_LOGS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const deletedRaw = localStorage.getItem(STORAGE_KEYS.DELETED_IDS);
          const dSet = new Set(deletedRaw ? JSON.parse(deletedRaw) : []);
          return parsed.filter(f => f && f.id && !dSet.has(f.id));
        }
      }
    } catch {}
    return [];
  });

  const [fuelConsumptionRules, setFuelConsumptionRules] = useState<FuelConsumptionRule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FUEL_RULES);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const deletedRaw = localStorage.getItem(STORAGE_KEYS.DELETED_IDS);
          const dSet = new Set(deletedRaw ? JSON.parse(deletedRaw) : []);
          const valid = parsed.filter(r => r && r.id && !dSet.has(r.id));
          if (valid.length > 0) return valid;
        }
      }
    } catch {}
    return [DEFAULT_FALLBACK_RULE];
  });

  // NR-13 Reports State
  const [nr13Reports, setNr13Reports] = useState<NR13InspectionReport[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NR13_REPORTS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const deletedRaw = localStorage.getItem(STORAGE_KEYS.DELETED_IDS);
          const dSet = new Set(deletedRaw ? JSON.parse(deletedRaw) : []);
          return parsed.filter(r => r && r.id && !dSet.has(r.id));
        }
      }
    } catch {}
    const deletedRaw = localStorage.getItem(STORAGE_KEYS.DELETED_IDS);
    const dSet = new Set(deletedRaw ? JSON.parse(deletedRaw) : []);
    return INITIAL_NR13_REPORTS.filter(r => r && r.id && !dSet.has(r.id));
  });

  // NR-13 Vessel Master Registry State (Cadastro Fixo de Vasos por Fazenda)
  const [nr13Vessels, setNr13Vessels] = useState<NR13VesselMaster[]>(() => {
    const deletedRaw = localStorage.getItem(STORAGE_KEYS.DELETED_IDS);
    const dSet = new Set<string>(deletedRaw ? JSON.parse(deletedRaw) : []);
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NR13_VESSELS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(v => v && v.id && !dSet.has(v.id) && !LEGACY_SAMPLE_VESSEL_IDS.includes(v.id));
          const ids = new Set(valid.map(v => v.id));
          return [...valid, ...INITIAL_NR13_VESSELS.filter(v => !ids.has(v.id) && !dSet.has(v.id))];
        }
      }
    } catch {}
    return INITIAL_NR13_VESSELS.filter(v => v && v.id && !dSet.has(v.id));
  });

  // Valve Calibrations State
  const [valveCalibrations, setValveCalibrations] = useState<ValveCalibrationRecord[]>(() => {
    const deletedRaw = localStorage.getItem(STORAGE_KEYS.DELETED_IDS);
    const dSet = new Set<string>(deletedRaw ? JSON.parse(deletedRaw) : []);
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.VALVE_CALIBRATIONS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const valid = parsed
            .filter(v => v && v.id && !dSet.has(v.id) && !LEGACY_SAMPLE_VALVE_IDS.includes(v.id))
            .map(v =>
              v.standardCertNumber === 'Laudo Inspecione Engenharia' || v.testBenchStandard === 'Bancada Pneumática / Hidrostática'
                ? { ...v, testBenchStandard: INSPECIONE_TEST_GAUGE_STANDARD, standardCertNumber: INSPECIONE_TEST_GAUGE_CERT }
                : v
            );
          const ids = new Set(valid.map(v => v.id));
          return [...valid, ...INITIAL_VALVE_CALIBRATIONS.filter(v => !ids.has(v.id) && !dSet.has(v.id))];
        }
      }
    } catch {}
    return INITIAL_VALVE_CALIBRATIONS.filter(v => v && v.id && !dSet.has(v.id));
  });

  // Gauge Calibrations State
  const [gaugeCalibrations, setGaugeCalibrations] = useState<GaugeCalibrationRecord[]>(() => {
    const deletedRaw = localStorage.getItem(STORAGE_KEYS.DELETED_IDS);
    const dSet = new Set<string>(deletedRaw ? JSON.parse(deletedRaw) : []);
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GAUGE_CALIBRATIONS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(g => g && g.id && !dSet.has(g.id) && !LEGACY_SAMPLE_GAUGE_IDS.includes(g.id));
          const ids = new Set(valid.map(g => g.id));
          return [...valid, ...INITIAL_GAUGE_CALIBRATIONS.filter(g => !ids.has(g.id) && !dSet.has(g.id))];
        }
      }
    } catch {}
    return INITIAL_GAUGE_CALIBRATIONS.filter(g => g && g.id && !dSet.has(g.id));
  });

  // Ultrassom Equipments State (Equipamentos de Aferição / Ultrassom)
  const [ultrassomEquipments, setUltrassomEquipments] = useState<UltrassomEquipmentRecord[]>(() => {
    const deletedRaw = localStorage.getItem(STORAGE_KEYS.DELETED_IDS);
    const dSet = new Set<string>(deletedRaw ? JSON.parse(deletedRaw) : []);
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ULTRASSOM_EQUIPMENTS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(u => u && u.id && !dSet.has(u.id));
          const ids = new Set(valid.map(u => u.id));
          return [...valid, ...INITIAL_ULTRASSOM_EQUIPMENTS.filter(u => !ids.has(u.id) && !dSet.has(u.id))];
        }
      }
    } catch {}
    return INITIAL_ULTRASSOM_EQUIPMENTS.filter(u => u && u.id && !dSet.has(u.id));
  });

  // Service Requests & Exclusive Operator Releases State
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SERVICE_REQUESTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const deletedRaw = localStorage.getItem(STORAGE_KEYS.DELETED_IDS);
          const dSet = new Set(deletedRaw ? JSON.parse(deletedRaw) : []);
          return parsed.filter(s => s && s.id && !dSet.has(s.id));
        }
      }
    } catch {}
    return [];
  });

  const [operatorServiceReleases, setOperatorServiceReleases] = useState<OperatorServiceRelease[]>(() => {
    let list: OperatorServiceRelease[] = [];
    let dSet = new Set<string>();
    try {
      const deletedRaw = localStorage.getItem(STORAGE_KEYS.DELETED_IDS);
      dSet = new Set(deletedRaw ? JSON.parse(deletedRaw) : []);
      const saved = localStorage.getItem(STORAGE_KEYS.OPERATOR_RELEASES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          list = parsed.filter(o => o && o.id && !dSet.has(o.id));
        }
      }
    } catch {}

    // Bootstrap release metadata from URL on first open across containers (ais-dev -> ais-pre)
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const ssKey = params.get('ss_key');
        const ssOp = params.get('ss_op');
        const ssFarmRaw = params.get('ss_farm') || params.get('fazenda');
        const ssRid = params.get('ss_rid');
        if (ssKey && ssKey !== 'none' && ssOp) {
          const alreadyExists = list.some(o => o.token === ssKey || (ssRid && o.id === ssRid));
          const isDeleted = ssRid ? dSet.has(ssRid) : false;
          if (!alreadyExists && !isDeleted) {
            const matchedFarm = ssFarmRaw
              ? FARMS.find(f => f.toLowerCase() === ssFarmRaw.toLowerCase() || f.replace(/\s+/g, '_').toLowerCase() === ssFarmRaw.toLowerCase())
              : undefined;
            const bootstrapped: OperatorServiceRelease = {
              id: ssRid || `rel_url_${ssKey}`,
              token: ssKey,
              operatorName: ssOp,
              farm: (matchedFarm || 'TODAS') as Farm | 'TODAS',
              active: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            list = [bootstrapped, ...list];
            safeLocalStorageSet(STORAGE_KEYS.OPERATOR_RELEASES, JSON.stringify(list));
          }
        }
      } catch {}
    }

    return list;
  });

  const serviceRequestsRef = useRef<ServiceRequest[]>(serviceRequests);
  useEffect(() => {
    serviceRequestsRef.current = serviceRequests;
  }, [serviceRequests]);

  const operatorReleasesRef = useRef<OperatorServiceRelease[]>(operatorServiceReleases);
  useEffect(() => {
    operatorReleasesRef.current = operatorServiceReleases;
  }, [operatorServiceReleases]);

  const [mySubmittedRequestIds, setMySubmittedRequestIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MY_REQUEST_IDS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [viewServiceRequestDetail, setViewServiceRequestDetail] = useState<ServiceRequest | null>(null);

  const [viewFleetUpdateDetail, setViewFleetUpdateDetail] = useState<VehicleMonthlyUpdate | null>(null);
  const [showFleetUpdateFormModal, setShowFleetUpdateFormModal] = useState(false);

  // In-app Delete Confirmation Modal State
  const [deleteModalState, setDeleteModalState] = useState<DeleteModalState>({
    isOpen: false,
    type: 'checklist',
    id: '',
    code: '',
    description: ''
  });

  const [fleetFormMode, setFleetFormMode] = useState<'UPDATE' | 'CHECKLIST' | 'DRONE' | 'FUEL'>('UPDATE');
  const [fleetListTab, setFleetListTab] = useState<'UPDATES' | 'CHECKLISTS' | 'DRONES' | 'FUEL'>('UPDATES');

  const startNewFleetAction = useCallback((mode: 'UPDATE' | 'CHECKLIST' | 'DRONE' | 'FUEL' = 'UPDATE') => {
    setFleetFormMode(mode);
    if (mode === 'FUEL') setFleetListTab('FUEL');
    else if (mode === 'CHECKLIST') setFleetListTab('CHECKLISTS');
    else if (mode === 'DRONE') setFleetListTab('DRONES');
    else setFleetListTab('UPDATES');
    setActiveTab('new-fleet-update');
  }, []);

  const startNewChecklist = (type: ChecklistType = 'SALA_DE_MAQUINAS') => {
    if (type === 'VEICULO') {
      startNewFleetAction('CHECKLIST');
      return;
    }
    if (type === 'DRONE') {
      startNewFleetAction('DRONE');
      return;
    }
    setSelectedChecklistTypeForCreation(type);
    setActiveTab('new-checklist');
  };

  // Safe sync to localStorage backup for lightweight preferences
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FARM_FILTER, selectedFarmFilter);
  }, [selectedFarmFilter]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USER_ROLE, userRole);
  }, [userRole]);

  const addToOfflineQueue = useCallback((item: OfflineQueueItem) => {
    setOfflineQueue(prev => {
      const filtered = prev.filter(q => !(q.id === item.id && q.action === item.action));
      const next = [...filtered, item];
      try {
        localStorage.setItem('agrocheck_offline_queue_v1', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const flushOfflineQueue = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }
    const saved = localStorage.getItem('agrocheck_offline_queue_v1');
    if (!saved) return;
    let queue: OfflineQueueItem[] = [];
    try {
      queue = JSON.parse(saved);
    } catch {
      return;
    }
    if (!queue || queue.length === 0) return;

    const successfulIds: string[] = [];
    for (const item of queue) {
      try {
        if (item.action === 'save') {
          if (item.type === 'checklist') {
            await api.saveChecklist(item.data);
            cloudLiveSync.publish('CHECKLIST_SAVED', item.data);
          } else if (item.type === 'fleet-update') {
            await api.saveFleetMonthlyUpdate(item.data);
            cloudLiveSync.publish('FLEET_UPDATE_SAVED', item.data);
          } else if (item.type === 'service-request') {
            await api.saveServiceRequest(item.data);
            cloudLiveSync.publish('SERVICE_REQUEST_SAVED', item.data);
          } else if (item.type === 'fuel-log') {
            await api.saveFuelLog(item.data);
            cloudLiveSync.publish('FUEL_LOG_SAVED', item.data);
          } else if (item.type === 'fuel-rule') {
            await api.saveFuelConsumptionRule(item.data);
            cloudLiveSync.publish('FUEL_RULE_SAVED', item.data);
          } else {
            await api.saveWorkOrder(item.data);
            cloudLiveSync.publish('WORK_ORDER_SAVED', item.data);
          }
        } else if (item.action === 'delete') {
          if (item.type === 'checklist') {
            await api.deleteChecklist(item.id);
            cloudLiveSync.publish('CHECKLIST_DELETED', { id: item.id });
          } else if (item.type === 'fleet-update') {
            await api.deleteFleetMonthlyUpdate(item.id);
            cloudLiveSync.publish('FLEET_UPDATE_DELETED', { id: item.id });
          } else if (item.type === 'service-request') {
            await api.deleteServiceRequest(item.id);
            cloudLiveSync.publish('SERVICE_REQUEST_DELETED', { id: item.id });
          } else if (item.type === 'fuel-log') {
            await api.deleteFuelLog(item.id);
            cloudLiveSync.publish('FUEL_LOG_DELETED', { id: item.id });
          } else if (item.type === 'fuel-rule') {
            await api.deleteFuelConsumptionRule(item.id);
            cloudLiveSync.publish('FUEL_RULE_DELETED', { id: item.id });
          } else {
            await api.deleteWorkOrder(item.id);
            cloudLiveSync.publish('WORK_ORDER_DELETED', { id: item.id });
          }
        }
        successfulIds.push(item.id);
      } catch (e) {
        console.warn('[OfflineQueue] Retrying item later:', item.id, e);
      }
    }

    if (successfulIds.length > 0) {
      setOfflineQueue(prev => {
        const remaining = prev.filter(q => !successfulIds.includes(q.id));
        try {
          localStorage.setItem('agrocheck_offline_queue_v1', JSON.stringify(remaining));
        } catch {}
        return remaining;
      });

      setSyncToast({
        isOpen: true,
        message: `📶 Conexão restabelecida! ${successfulIds.length} registro(s) salvos no aparelho foram sincronizados com a base do computador!`,
        type: 'success'
      });
    }
  }, []);

  const [deletedIds, setDeletedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DELETED_IDS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const deletedIdsRef = useRef<string[]>([]);
  useEffect(() => {
    deletedIdsRef.current = deletedIds;
    safeLocalStorageSet(STORAGE_KEYS.DELETED_IDS, JSON.stringify(deletedIds));
  }, [deletedIds]);

  const recordDeletedId = useCallback((id: string) => {
    setDeletedIds(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      deletedIdsRef.current = next;
      safeLocalStorageSet(STORAGE_KEYS.DELETED_IDS, JSON.stringify(next));
      return next;
    });

    // Remove from offlineQueue if it had a pending save
    setOfflineQueue(prev => {
      const filtered = prev.filter(q => q.id !== id);
      try {
        localStorage.setItem('agrocheck_offline_queue_v1', JSON.stringify(filtered));
      } catch {}
      return filtered;
    });
  }, []);

  // Central Server Synchronization with Smart Merging
  const isSyncingRef = useRef(false);
  const lastKnownServerTimestampRef = useRef<string>('');
  const hasSyncedOnceRef = useRef(false);

  const syncNow = useCallback(async (forceFull = false) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    try {
      const since = forceFull ? undefined : lastKnownServerTimestampRef.current;
      const data = await api.fetchAll(since);

      // If server confirms no data has changed since our last timestamp,
      // skip heavy JSON reconciliation and localStorage writes entirely!
      // This eliminates 3MB of base64 transfer, parsing, and disk writes on mobile devices!
      if (data.changed === false) {
        return;
      }

      setIsSyncing(true);

      if (data.lastUpdated) {
        lastKnownServerTimestampRef.current = data.lastUpdated;
      }

      if (Array.isArray(data.checklists) && Array.isArray(data.workOrders)) {
        // 1. Reconcile deleted tombstones
        const serverDeleted = Array.isArray(data.deletedIds) ? data.deletedIds : [];
        const mergedDeleted = Array.from(new Set([...deletedIdsRef.current, ...serverDeleted]));
        setDeletedIds(mergedDeleted);
        deletedIdsRef.current = mergedDeleted;
        safeLocalStorageSet(STORAGE_KEYS.DELETED_IDS, JSON.stringify(mergedDeleted));
        const deletedSet = new Set(mergedDeleted);

        // Domain-specific comparison helpers to accurately detect status, acknowledgment and field changes
        const areChecklistsIdentical = (a: ChecklistRecord[], b: ChecklistRecord[]) => {
          if (a === b) return true;
          if (a.length !== b.length) return false;
          for (let i = 0; i < a.length; i++) {
            if (!a[i] || !b[i]) return false;
            if (a[i].id !== b[i].id || (a[i].workOrderIds?.length || 0) !== (b[i].workOrderIds?.length || 0)) return false;
            const aItems = Array.isArray(a[i].items) ? a[i].items : [];
            const bItems = Array.isArray(b[i].items) ? b[i].items : [];
            if (aItems.length !== bItems.length) return false;
            for (let j = 0; j < aItems.length; j++) {
              if (
                !aItems[j] || !bItems[j] ||
                aItems[j].status !== bItems[j].status ||
                aItems[j].adminAcknowledged !== bItems[j].adminAcknowledged ||
                aItems[j].generatedWorkOrderId !== bItems[j].generatedWorkOrderId
              ) {
                return false;
              }
            }
          }
          return true;
        };

        const areWorkOrdersIdentical = (a: WorkOrder[], b: WorkOrder[]) => {
          if (a === b) return true;
          if (a.length !== b.length) return false;
          for (let i = 0; i < a.length; i++) {
            if (!a[i] || !b[i]) return false;
            if (a[i].id !== b[i].id || a[i].status !== b[i].status || a[i].updatedAt !== b[i].updatedAt) return false;
          }
          return true;
        };

        const areFleetUpdatesIdentical = (a: VehicleMonthlyUpdate[], b: VehicleMonthlyUpdate[]) => {
          if (a === b) return true;
          if (a.length !== b.length) return false;
          for (let i = 0; i < a.length; i++) {
            if (!a[i] || !b[i]) return false;
            if (
              a[i].id !== b[i].id ||
              a[i].adminAcknowledged !== b[i].adminAcknowledged ||
              a[i].acknowledgedAt !== b[i].acknowledgedAt ||
              a[i].hasIncidentLast30Days !== b[i].hasIncidentLast30Days ||
              a[i].preventiveMaintenanceLast30Days !== b[i].preventiveMaintenanceLast30Days ||
              a[i].mileage !== b[i].mileage ||
              a[i].updatedAt !== b[i].updatedAt
            ) {
              return false;
            }
          }
          return true;
        };

        let didDataChange = false;

        // 2. Reconcile checklists (NEVER DISCARD ANY NON-DELETED USER CHECKLIST)
        setChecklists(prev => {
          const cleanPrev = prev.filter(c => c && c.id && Array.isArray(c.items) && !deletedSet.has(c.id));
          const serverValid = (data.checklists || []).filter(c => c && c.id && Array.isArray(c.items) && !deletedSet.has(c.id));
          const serverMap = new Map(serverValid.map(c => [c.id, c]));

          const missingOnServer: ChecklistRecord[] = [];
          const merged = [...serverValid];

          for (const localItem of cleanPrev) {
            if (!serverMap.has(localItem.id)) {
              merged.unshift(localItem);
              missingOnServer.push(localItem);
            }
          }

          if (missingOnServer.length > 0) {
            api.batchSync({ checklists: missingOnServer }).catch(() => {});
          }

          if (areChecklistsIdentical(prev, merged)) {
            return prev;
          }
          didDataChange = true;
          safeLocalStorageSet(STORAGE_KEYS.CHECKLISTS, JSON.stringify(merged));
          setViewChecklistDetail(curr => curr ? (merged.find(c => c.id === curr.id) || curr) : null);
          return merged;
        });

        // 3. Reconcile work orders (NEVER DISCARD ANY NON-DELETED USER WORK ORDER)
        setWorkOrders(prev => {
          const cleanPrev = prev.filter(w => w && w.id && !deletedSet.has(w.id));
          const serverValid = (data.workOrders || []).filter(w => w && w.id && !deletedSet.has(w.id));
          const serverMap = new Map(serverValid.map(w => [w.id, w]));

          const missingOnServer: WorkOrder[] = [];
          const merged = [...serverValid];

          for (const localItem of cleanPrev) {
            if (!serverMap.has(localItem.id)) {
              merged.unshift(localItem);
              missingOnServer.push(localItem);
            }
          }

          if (missingOnServer.length > 0) {
            api.batchSync({ workOrders: missingOnServer }).catch(() => {});
          }

          if (areWorkOrdersIdentical(prev, merged)) {
            return prev;
          }
          didDataChange = true;
          safeLocalStorageSet(STORAGE_KEYS.WORK_ORDERS, JSON.stringify(merged));
          setViewWorkOrderDetail(curr => curr ? (merged.find(w => w.id === curr.id) || curr) : null);
          return merged;
        });

        // 4. Reconcile monthly fleet updates
        if (Array.isArray(data.fleetMonthlyUpdates)) {
          setFleetMonthlyUpdates(prev => {
            const cleanPrev = prev.filter(u => u && u.id && !deletedSet.has(u.id));
            const serverValid = data.fleetMonthlyUpdates!.filter(u => u && u.id && !deletedSet.has(u.id));
            const serverMap = new Map(serverValid.map(u => [u.id, u]));

            const missingOnServer: VehicleMonthlyUpdate[] = [];
            const merged = [...serverValid];

            for (const localItem of cleanPrev) {
              if (!serverMap.has(localItem.id)) {
                merged.unshift(localItem);
                missingOnServer.push(localItem);
              }
            }

            if (missingOnServer.length > 0) {
              api.batchSync({ fleetMonthlyUpdates: missingOnServer }).catch(() => {});
            }

            if (areFleetUpdatesIdentical(prev, merged)) {
              return prev;
            }
            didDataChange = true;
            safeLocalStorageSet(STORAGE_KEYS.FLEET_MONTHLY_UPDATES, JSON.stringify(merged));
            setViewFleetUpdateDetail(curr => curr ? (merged.find(u => u.id === curr.id) || curr) : null);
            return merged;
          });
        }

        // 5. Reconcile NR-13 reports and Calibrations
        if (Array.isArray(data.nr13Reports)) {
          setNr13Reports(prev => {
            const cleanPrev = prev.filter(r => r && r.id && !deletedSet.has(r.id));
            const serverValid = data.nr13Reports!.filter(r => r && r.id && !deletedSet.has(r.id));
            const serverMap = new Map(serverValid.map(r => [r.id, r]));
            const merged = [...serverValid];
            for (const local of cleanPrev) {
              if (!serverMap.has(local.id)) merged.unshift(local);
            }
            safeLocalStorageSet(STORAGE_KEYS.NR13_REPORTS, JSON.stringify(merged));
            return merged;
          });
        }

        if (Array.isArray(data.nr13Vessels)) {
          setNr13Vessels(prev => {
            const cleanPrev = prev.filter(v => v && v.id && !deletedSet.has(v.id));
            const serverValid = data.nr13Vessels!.filter(v => v && v.id && !deletedSet.has(v.id));
            const serverMap = new Map(serverValid.map(v => [v.id, v]));
            const missingOnServer: NR13VesselMaster[] = [];
            const merged = [...serverValid];
            for (const local of cleanPrev) {
              if (!serverMap.has(local.id)) {
                merged.unshift(local);
                missingOnServer.push(local);
              }
            }
            if (missingOnServer.length > 0) {
              api.batchSync({ nr13Vessels: missingOnServer }).catch(() => {});
            }
            safeLocalStorageSet(STORAGE_KEYS.NR13_VESSELS, JSON.stringify(merged));
            return merged;
          });
        }

        if (Array.isArray(data.valveCalibrations)) {
          setValveCalibrations(prev => {
            const cleanPrev = prev.filter(v => v && v.id && !deletedSet.has(v.id) && !LEGACY_SAMPLE_VALVE_IDS.includes(v.id));
            const serverValid = data.valveCalibrations!.filter(v => v && v.id && !deletedSet.has(v.id) && !LEGACY_SAMPLE_VALVE_IDS.includes(v.id));
            const serverMap = new Map(serverValid.map(v => [v.id, v]));
            const merged = [...serverValid];
            for (const local of cleanPrev) {
              if (!serverMap.has(local.id)) merged.unshift(local);
            }
            const mergedIds = new Set(merged.map(v => v.id));
            for (const initV of INITIAL_VALVE_CALIBRATIONS) {
              if (!mergedIds.has(initV.id) && !deletedSet.has(initV.id)) merged.push(initV);
            }
            safeLocalStorageSet(STORAGE_KEYS.VALVE_CALIBRATIONS, JSON.stringify(merged));
            return merged;
          });
        }

        if (Array.isArray(data.gaugeCalibrations)) {
          setGaugeCalibrations(prev => {
            const cleanPrev = prev.filter(g => g && g.id && !deletedSet.has(g.id) && !LEGACY_SAMPLE_GAUGE_IDS.includes(g.id));
            const serverValid = data.gaugeCalibrations!.filter(g => g && g.id && !deletedSet.has(g.id) && !LEGACY_SAMPLE_GAUGE_IDS.includes(g.id));
            const serverMap = new Map(serverValid.map(g => [g.id, g]));
            const merged = [...serverValid];
            for (const local of cleanPrev) {
              if (!serverMap.has(local.id)) merged.unshift(local);
            }
            const mergedIds = new Set(merged.map(g => g.id));
            for (const initG of INITIAL_GAUGE_CALIBRATIONS) {
              if (!mergedIds.has(initG.id) && !deletedSet.has(initG.id)) merged.push(initG);
            }
            safeLocalStorageSet(STORAGE_KEYS.GAUGE_CALIBRATIONS, JSON.stringify(merged));
            return merged;
          });
        }

        if (Array.isArray(data.ultrassomEquipments)) {
          setUltrassomEquipments(prev => {
            const cleanPrev = prev.filter(u => u && u.id && !deletedSet.has(u.id));
            const serverValid = data.ultrassomEquipments!.filter(u => u && u.id && !deletedSet.has(u.id));
            const serverMap = new Map(serverValid.map(u => [u.id, u]));
            const merged = [...serverValid];
            for (const local of cleanPrev) {
              if (!serverMap.has(local.id)) merged.unshift(local);
            }
            const mergedIds = new Set(merged.map(u => u.id));
            for (const initU of INITIAL_ULTRASSOM_EQUIPMENTS) {
              if (!mergedIds.has(initU.id) && !deletedSet.has(initU.id)) merged.push(initU);
            }
            safeLocalStorageSet(STORAGE_KEYS.ULTRASSOM_EQUIPMENTS, JSON.stringify(merged));
            return merged;
          });
        }

        // 6. Reconcile Service Requests & Exclusive Operator Releases
        if (Array.isArray(data.serviceRequests)) {
          setServiceRequests(prev => {
            const cleanPrev = prev.filter(s => s && s.id && !deletedSet.has(s.id));
            const serverValid = data.serviceRequests!.filter(s => s && s.id && !deletedSet.has(s.id));
            const mergedMap = new Map<string, ServiceRequest>();
            serverValid.forEach(s => mergedMap.set(s.id, s));

            const missingOrNewerOnLocal: ServiceRequest[] = [];
            for (const local of cleanPrev) {
              const srv = mergedMap.get(local.id);
              if (!srv) {
                mergedMap.set(local.id, local);
                missingOrNewerOnLocal.push(local);
              } else {
                const localTime = new Date(local.updatedAt || local.createdAt || 0).getTime();
                const srvTime = new Date(srv.updatedAt || srv.createdAt || 0).getTime();
                if (localTime > srvTime) {
                  mergedMap.set(local.id, local);
                  missingOrNewerOnLocal.push(local);
                }
              }
            }

            if (missingOrNewerOnLocal.length > 0) {
              api.batchSync({ serviceRequests: missingOrNewerOnLocal }).catch(() => {});
            }

            const merged = Array.from(mergedMap.values()).sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            const isSame =
              prev.length === merged.length &&
              prev.every((p, idx) =>
                p.id === merged[idx].id &&
                p.status === merged[idx].status &&
                p.linkedWorkOrderId === merged[idx].linkedWorkOrderId &&
                p.updatedAt === merged[idx].updatedAt
              );
            if (isSame) return prev;

            didDataChange = true;
            safeLocalStorageSet(STORAGE_KEYS.SERVICE_REQUESTS, JSON.stringify(merged));
            setViewServiceRequestDetail(curr => curr ? (merged.find(s => s.id === curr.id) || curr) : null);
            return merged;
          });
        }

        if (Array.isArray(data.operatorServiceReleases)) {
          setOperatorServiceReleases(prev => {
            const cleanPrev = prev.filter(o => o && o.id && !deletedSet.has(o.id));
            const serverValid = data.operatorServiceReleases!.filter(o => o && o.id && !deletedSet.has(o.id));
            const mergedMap = new Map<string, OperatorServiceRelease>();
            serverValid.forEach(o => mergedMap.set(o.id, o));

            const missingOrNewerOnLocal: OperatorServiceRelease[] = [];
            for (const local of cleanPrev) {
              const srv = mergedMap.get(local.id);
              if (!srv) {
                mergedMap.set(local.id, local);
                missingOrNewerOnLocal.push(local);
              } else {
                const localTime = new Date(local.updatedAt || local.createdAt || 0).getTime();
                const srvTime = new Date(srv.updatedAt || srv.createdAt || 0).getTime();
                if (localTime > srvTime) {
                  mergedMap.set(local.id, local);
                  missingOrNewerOnLocal.push(local);
                }
              }
            }

            if (missingOrNewerOnLocal.length > 0) {
              api.batchSync({ operatorServiceReleases: missingOrNewerOnLocal }).catch(() => {});
            }

            const merged = Array.from(mergedMap.values()).sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            const isSame =
              prev.length === merged.length &&
              prev.every((p, idx) =>
                p.id === merged[idx].id &&
                p.active === merged[idx].active &&
                p.farm === merged[idx].farm &&
                p.updatedAt === merged[idx].updatedAt
              );
            if (isSame) return prev;

            didDataChange = true;
            safeLocalStorageSet(STORAGE_KEYS.OPERATOR_RELEASES, JSON.stringify(merged));
            return merged;
          });
        }

        if (Array.isArray(data.drones)) {
          setDrones(prev => {
            const cleanPrev = prev.filter(d => d && d.id && !deletedSet.has(d.id));
            const serverValid = data.drones!.filter(d => d && d.id && !deletedSet.has(d.id));
            const mergedMap = new Map<string, DroneAsset>();
            serverValid.forEach(d => mergedMap.set(d.id, d));

            const missingOnServer: DroneAsset[] = [];
            for (const local of cleanPrev) {
              const byIdOrLabel = Array.from(mergedMap.values()).find(
                s => s.id === local.id || s.label.toLowerCase() === local.label.toLowerCase()
              );
              if (!byIdOrLabel) {
                mergedMap.set(local.id, local);
                missingOnServer.push(local);
              }
            }

            if (missingOnServer.length > 0) {
              api.batchSync({ drones: missingOnServer }).catch(() => {});
            }

            const merged = Array.from(mergedMap.values());
            const isSame =
              prev.length === merged.length &&
              prev.every((p, idx) => p.id === merged[idx].id && p.label === merged[idx].label);
            if (isSame) return prev;

            didDataChange = true;
            safeLocalStorageSet(STORAGE_KEYS.DRONES, JSON.stringify(merged));
            return merged;
          });
        }

        // 7. Reconcile Fuel Logs & Consumption Rules
        if (Array.isArray(data.fuelLogs)) {
          setFuelLogs(prev => {
            const cleanPrev = prev.filter(f => f && f.id && !deletedSet.has(f.id));
            const serverValid = data.fuelLogs!.filter(f => f && f.id && !deletedSet.has(f.id));
            const mergedMap = new Map<string, FuelLogRecord>();
            serverValid.forEach(f => mergedMap.set(f.id, f));

            const missingOrNewerOnLocal: FuelLogRecord[] = [];
            for (const local of cleanPrev) {
              const srv = mergedMap.get(local.id);
              if (!srv) {
                mergedMap.set(local.id, local);
                missingOrNewerOnLocal.push(local);
              } else {
                const localTime = new Date(local.updatedAt || local.createdAt || 0).getTime();
                const srvTime = new Date(srv.updatedAt || srv.createdAt || 0).getTime();
                if (localTime > srvTime) {
                  mergedMap.set(local.id, local);
                  missingOrNewerOnLocal.push(local);
                }
              }
            }

            if (missingOrNewerOnLocal.length > 0) {
              api.batchSync({ fuelLogs: missingOrNewerOnLocal }).catch(() => {});
            }

            const merged = Array.from(mergedMap.values()).sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            const isSame =
              prev.length === merged.length &&
              prev.every((p, idx) =>
                p.id === merged[idx].id &&
                p.km === merged[idx].km &&
                p.liters === merged[idx].liters &&
                p.date === merged[idx].date &&
                p.updatedAt === merged[idx].updatedAt
              );
            if (isSame) return prev;

            didDataChange = true;
            safeLocalStorageSet(STORAGE_KEYS.FUEL_LOGS, JSON.stringify(merged));
            return merged;
          });
        }

        if (Array.isArray(data.fuelConsumptionRules)) {
          setFuelConsumptionRules(prev => {
            const cleanPrev = prev.filter(r => r && r.id && !deletedSet.has(r.id));
            const serverValid = data.fuelConsumptionRules!.filter(r => r && r.id && !deletedSet.has(r.id));
            const mergedMap = new Map<string, FuelConsumptionRule>();
            serverValid.forEach(r => mergedMap.set(r.plate, r));

            const missingOrNewerOnLocal: FuelConsumptionRule[] = [];
            for (const local of cleanPrev) {
              const srv = mergedMap.get(local.plate);
              if (!srv) {
                mergedMap.set(local.plate, local);
                missingOrNewerOnLocal.push(local);
              } else {
                const localTime = new Date(local.updatedAt || 0).getTime();
                const srvTime = new Date(srv.updatedAt || 0).getTime();
                if (localTime > srvTime) {
                  mergedMap.set(local.plate, local);
                  missingOrNewerOnLocal.push(local);
                }
              }
            }

            if (missingOrNewerOnLocal.length > 0) {
              api.batchSync({ fuelConsumptionRules: missingOrNewerOnLocal }).catch(() => {});
            }

            const merged = Array.from(mergedMap.values());
            if (merged.length === 0) merged.push(DEFAULT_FALLBACK_RULE);

            const isSame =
              prev.length === merged.length &&
              prev.every((p, idx) =>
                p.id === merged[idx].id &&
                p.minConsumption === merged[idx].minConsumption &&
                p.avgConsumption === merged[idx].avgConsumption &&
                p.maxConsumption === merged[idx].maxConsumption &&
                p.updatedAt === merged[idx].updatedAt
              );
            if (isSame) return prev;

            didDataChange = true;
            safeLocalStorageSet(STORAGE_KEYS.FUEL_RULES, JSON.stringify(merged));
            return merged;
          });
        }

        if (didDataChange || !hasSyncedOnceRef.current) {
          hasSyncedOnceRef.current = true;
          setLastSyncTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      }
    } catch (err) {
      console.warn('[Sync] Offline or backend unreachable, using local cache:', err);
    } finally {
      setIsSyncing(false);
      isSyncingRef.current = false;
    }
  }, []);

  // Listen for online / offline window events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      flushOfflineQueue();
      syncNow(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [flushOfflineQueue, syncNow]);

  // Intelligent, battery-friendly poll: only when visible and online
  useEffect(() => {
    syncNow(true); // initial fetch

    const interval = setInterval(() => {
      // Don't poll if app/screen is in background or device is offline
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      syncNow(false);
    }, 8000);

    const handleFocusOrVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && navigator.onLine) {
        syncNow(false);
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, [syncNow]);

  const isFarmLocked = Boolean(lockedFarm && (userRole === 'OPERADOR' || userRole === 'SOLICITANTE'));

  const setLockedFarm = (farm: Farm | null) => {
    setLockedFarmState(farm);
    if (farm) {
      localStorage.setItem('agrocheck_locked_farm', farm);
      setSelectedFarmFilterState(farm);
    } else {
      localStorage.removeItem('agrocheck_locked_farm');
    }
  };

  const unlockFarm = () => {
    // Somente o Administrador no PC pode desbloquear restrições
    if (userRole !== 'ADMIN') {
      console.warn('[Permissão] Somente o Administrador no PC pode desbloquear restrições de fazenda.');
      return;
    }
    setLockedFarm(null);
    setSelectedFarmFilterState('TODAS');
  };

  const handleSetUserRole = (newRole: UserRole) => {
    // Operadores e Solicitantes restritos não podem trocar de perfil no celular
    if ((isRoleLocked || userRole === 'OPERADOR' || userRole === 'SOLICITANTE') && newRole !== userRole) {
      console.warn('[Permissão] Acesso restrito. Proibida alteração de perfil no dispositivo.');
      return;
    }
    setUserRole(newRole);
  };

  // Liberação Exclusiva de Solicitações de Serviço para Operadores específicos
  const activeOperatorRelease = userRole === 'OPERADOR' && operatorReleaseKey
    ? (operatorServiceReleases.find(r => r.token === operatorReleaseKey && r.active) || null)
    : null;

  const hasServiceRequestAccess = userRole === 'ADMIN' || (userRole === 'OPERADOR' && Boolean(activeOperatorRelease));

  const hasModuleAccess = useCallback((mod: AccessModule): boolean => {
    if (userRole === 'ADMIN') return true;
    if ((mod === 'service_request' || mod === 'work_order') && userRole === 'OPERADOR' && Boolean(activeOperatorRelease)) {
      return true;
    }
    return allowedModules.includes(mod);
  }, [userRole, allowedModules, activeOperatorRelease]);

  // Fazenda de escopo dos alertas e solicitações de serviço:
  // Operador vê apenas a fazenda em que está cadastrado na liberação exclusiva (ou sua fazenda travada)
  const serviceRequestFarmScope: Farm | 'TODAS' =
    userRole === 'OPERADOR'
      ? (activeOperatorRelease && activeOperatorRelease.farm !== 'TODAS'
          ? activeOperatorRelease.farm
          : (lockedFarm || selectedFarmFilter))
      : userRole === 'SOLICITANTE'
      ? (lockedFarm || selectedFarmFilter)
      : selectedFarmFilter;

  const redeemOperatorReleaseKey = useCallback((token: string): { success: boolean; message: string } => {
    const clean = token.trim();
    if (!clean) {
      return { success: false, message: 'Informe a chave de liberação fornecida pelo Administrador.' };
    }
    const found = operatorServiceReleases.find(r => r.token === clean);
    if (!found) {
      return { success: false, message: 'Chave de liberação não encontrada. Verifique o código ou solicite um novo link ao Administrador.' };
    }
    if (!found.active) {
      return { success: false, message: 'Esta liberação está temporariamente suspensa pelo Administrador.' };
    }
    localStorage.setItem(STORAGE_KEYS.OPERATOR_SS_KEY, clean);
    setOperatorReleaseKey(clean);
    setSyncToast({
      isOpen: true,
      message: `🔓 Liberação Exclusiva ativada para ${found.operatorName}! Alertas e Solicitações de Serviço habilitados.`,
      type: 'success'
    });
    return { success: true, message: `Liberação ativada para ${found.operatorName}!` };
  }, [operatorServiceReleases]);

  const setSelectedFarmFilter = (farm: Farm | 'TODAS') => {
    if (isFarmLocked) {
      // Locked farm mode: Operator cannot switch farm
      return;
    }
    setSelectedFarmFilterState(farm);
  };

  // Import payload from QR code, WhatsApp link, or P2P
  const importSyncPayload = useCallback((payload: SyncPayload) => {
    if (!payload) return;

    if (Array.isArray(payload.checklists) && payload.checklists.length > 0) {
      setChecklists(prev => {
        const map = new Map(prev.map(c => [c.id, c]));
        payload.checklists!.forEach(incoming => {
          if (!map.has(incoming.id) || incoming.isDraft === false) {
            map.set(incoming.id, incoming);
          }
        });
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        safeLocalStorageSet(STORAGE_KEYS.CHECKLISTS, JSON.stringify(merged));
        return merged;
      });
    }

    if (Array.isArray(payload.workOrders) && payload.workOrders.length > 0) {
      setWorkOrders(prev => {
        const map = new Map(prev.map(w => [w.id, w]));
        payload.workOrders!.forEach(incoming => {
          map.set(incoming.id, incoming);
        });
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        safeLocalStorageSet(STORAGE_KEYS.WORK_ORDERS, JSON.stringify(merged));
        return merged;
      });
    }

    if (Array.isArray(payload.fleetMonthlyUpdates) && payload.fleetMonthlyUpdates.length > 0) {
      setFleetMonthlyUpdates(prev => {
        const map = new Map(prev.map(u => [u.id, u]));
        payload.fleetMonthlyUpdates!.forEach(incoming => {
          map.set(incoming.id, incoming);
        });
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        safeLocalStorageSet(STORAGE_KEYS.FLEET_MONTHLY_UPDATES, JSON.stringify(merged));
        return merged;
      });
    }

    api.batchSync({
      checklists: payload.checklists,
      workOrders: payload.workOrders,
      fleetMonthlyUpdates: payload.fleetMonthlyUpdates
    }).catch(err => {
      console.warn('[Sync] Could not push batch to server:', err);
    });

    setSyncToast({
      isOpen: true,
      message: `🎉 Sincronização concluída com sucesso! (${payload.checklists?.length || 0} checklists, ${payload.workOrders?.length || 0} OS, ${payload.fleetMonthlyUpdates?.length || 0} atualizações de frota).`,
      type: 'success'
    });
  }, []);

  // Continuous Automatic Cloud Sync (Admin desktop, Solicitante portal, and Authorized Operators with ss_key)
  useEffect(() => {
    const isAuthorizedOperator = userRole === 'OPERADOR' && Boolean(operatorReleaseKey || activeOperatorRelease);
    // Standard field operators do not need external SSE sockets, keeping standard mobile checklists ultra-responsive
    if (userRole === 'OPERADOR' && !isAuthorizedOperator) {
      return;
    }

    cloudLiveSync.startListening((msg) => {
      if (msg.type === 'SERVICE_REQUEST_SAVED' && msg.data?.id) {
        if (deletedIdsRef.current.includes(msg.data.id)) return;
        const incoming = msg.data as ServiceRequest;
        let wasInsertedOrUpdated = false;
        setServiceRequests(prev => {
          const existing = prev.find(s => s.id === incoming.id);
          if (existing) {
            const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
            const incomingTime = new Date(incoming.updatedAt || incoming.createdAt || 0).getTime();
            if (incomingTime < existingTime) return prev;
          }
          wasInsertedOrUpdated = true;
          const filtered = prev.filter(s => s.id !== incoming.id && !deletedIdsRef.current.includes(s.id));
          const next = [incoming, ...filtered].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          safeLocalStorageSet(STORAGE_KEYS.SERVICE_REQUESTS, JSON.stringify(next));
          return next;
        });
        setViewServiceRequestDetail(curr => (curr?.id === incoming.id ? incoming : curr));
        api.saveServiceRequest(incoming).catch(() => {});

        if (wasInsertedOrUpdated && (userRole === 'ADMIN' || isAuthorizedOperator)) {
          const matchesOpFarm =
            userRole === 'ADMIN' ||
            serviceRequestFarmScope === 'TODAS' ||
            incoming.farm === serviceRequestFarmScope;
          if (matchesOpFarm && incoming.status === 'PENDENTE') {
            setSyncToast({
              isOpen: true,
              message: `🔔 Nova Solicitação de Serviço ${incoming.code} (${incoming.farm} — ${incoming.equipment}) enviada por ${incoming.requesterName}!`
            });
          }
        }
        return;
      }

      if (msg.type === 'SERVICE_REQUEST_DELETED' && msg.data?.id) {
        recordDeletedId(msg.data.id);
        setServiceRequests(prev => {
          const next = prev.filter(s => s.id !== msg.data.id);
          safeLocalStorageSet(STORAGE_KEYS.SERVICE_REQUESTS, JSON.stringify(next));
          return next;
        });
        api.deleteServiceRequest(msg.data.id).catch(() => {});
        return;
      }

      if (msg.type === 'OPERATOR_RELEASE_SAVED' && msg.data?.id) {
        if (deletedIdsRef.current.includes(msg.data.id)) return;
        const incoming = msg.data as OperatorServiceRelease;
        setOperatorServiceReleases(prev => {
          const existing = prev.find(o => o.id === incoming.id || o.token === incoming.token);
          if (existing) {
            const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
            const incomingTime = new Date(incoming.updatedAt || incoming.createdAt || 0).getTime();
            if (incomingTime < existingTime) return prev;
          }
          const filtered = prev.filter(o => o.id !== incoming.id && o.token !== incoming.token && !deletedIdsRef.current.includes(o.id));
          const next = [incoming, ...filtered];
          safeLocalStorageSet(STORAGE_KEYS.OPERATOR_RELEASES, JSON.stringify(next));
          return next;
        });
        api.saveOperatorRelease(incoming).catch(() => {});
        return;
      }

      if (msg.type === 'OPERATOR_RELEASE_DELETED' && msg.data?.id) {
        recordDeletedId(msg.data.id);
        setOperatorServiceReleases(prev => {
          const next = prev.filter(o => o.id !== msg.data.id);
          safeLocalStorageSet(STORAGE_KEYS.OPERATOR_RELEASES, JSON.stringify(next));
          return next;
        });
        api.deleteOperatorRelease(msg.data.id).catch(() => {});
        return;
      }

      if (msg.type === 'DRONE_SAVED' && msg.data?.id) {
        if (deletedIdsRef.current.includes(msg.data.id)) return;
        const incoming = msg.data as DroneAsset;
        setDrones(prev => {
          const exists = prev.some(d => d.id === incoming.id || d.label.toLowerCase() === incoming.label.toLowerCase());
          if (exists) return prev;
          const next = [...prev, incoming];
          safeLocalStorageSet(STORAGE_KEYS.DRONES, JSON.stringify(next));
          return next;
        });
        api.saveDrone(incoming).catch(() => {});
        return;
      }

      if (msg.type === 'DRONE_DELETED' && msg.data?.id) {
        recordDeletedId(msg.data.id);
        setDrones(prev => {
          const next = prev.filter(d => d.id !== msg.data.id);
          safeLocalStorageSet(STORAGE_KEYS.DRONES, JSON.stringify(next));
          return next;
        });
        api.deleteDrone(msg.data.id).catch(() => {});
        return;
      }

      // Solicitante & Authorized Operator only care about Service Request & Release events (keep mobile fast)
      if (userRole !== 'ADMIN') return;

      if (msg.type === 'CHECKLIST_SAVED' && msg.data) {
        if (deletedIdsRef.current.includes(msg.data.id)) {
          return; // Ignore deleted items permanently
        }
        setChecklists(prev => {
          const filtered = prev.filter(c => c.id !== msg.data.id && !deletedIdsRef.current.includes(c.id));
          const next = [msg.data, ...filtered];
          safeLocalStorageSet(STORAGE_KEYS.CHECKLISTS, JSON.stringify(next));
          return next;
        });
        setViewChecklistDetail(curr => curr?.id === msg.data.id ? msg.data : curr);
        api.saveChecklist(msg.data).catch(() => {});
        setSyncToast({
          isOpen: true,
          message: `📲 Checklist ${msg.data.code} (${msg.data.farm}) recebido automaticamente do celular!`,
          type: 'success'
        });
      } else if (msg.type === 'WORK_ORDER_SAVED' && msg.data) {
        if (deletedIdsRef.current.includes(msg.data.id)) {
          return; // Ignore deleted items permanently
        }
        setWorkOrders(prev => {
          const filtered = prev.filter(w => w.id !== msg.data.id && !deletedIdsRef.current.includes(w.id));
          const next = [msg.data, ...filtered];
          safeLocalStorageSet(STORAGE_KEYS.WORK_ORDERS, JSON.stringify(next));
          return next;
        });
        setViewWorkOrderDetail(curr => curr?.id === msg.data.id ? msg.data : curr);
        api.saveWorkOrder(msg.data).catch(() => {});
        setSyncToast({
          isOpen: true,
          message: `📲 Ordem de Serviço ${msg.data.code} (${msg.data.farm}) recebida automaticamente do celular!`,
          type: 'success'
        });
      } else if (msg.type === 'FLEET_UPDATE_SAVED' && msg.data) {
        if (deletedIdsRef.current.includes(msg.data.id)) {
          return;
        }
        setFleetMonthlyUpdates(prev => {
          const filtered = prev.filter(u => u.id !== msg.data.id && !deletedIdsRef.current.includes(u.id));
          const next = [msg.data, ...filtered];
          safeLocalStorageSet(STORAGE_KEYS.FLEET_MONTHLY_UPDATES, JSON.stringify(next));
          return next;
        });
        setViewFleetUpdateDetail(curr => curr?.id === msg.data.id ? msg.data : curr);
        api.saveFleetMonthlyUpdate(msg.data).catch(() => {});
        setSyncToast({
          isOpen: true,
          message: `🚗 Atualização de Frota ${msg.data.code} (${msg.data.plate || 'Frota'}) sincronizada com sucesso!`,
          type: 'success'
        });
      } else if (msg.type === 'FLEET_UPDATE_DELETED' && msg.data?.id) {
        recordDeletedId(msg.data.id);
        setFleetMonthlyUpdates(prev => prev.filter(u => u.id !== msg.data.id));
      } else if (msg.type === 'FUEL_LOG_SAVED' && msg.data?.id) {
        if (deletedIdsRef.current.includes(msg.data.id)) return;
        const incoming = msg.data as FuelLogRecord;
        setFuelLogs(prev => {
          const filtered = prev.filter(f => f.id !== incoming.id && !deletedIdsRef.current.includes(f.id));
          const next = [incoming, ...filtered];
          safeLocalStorageSet(STORAGE_KEYS.FUEL_LOGS, JSON.stringify(next));
          return next;
        });
        api.saveFuelLog(incoming).catch(() => {});
        setSyncToast({
          isOpen: true,
          message: `⛽ Abastecimento ${incoming.code} (${incoming.plate} · ${incoming.liters}L) sincronizado!`,
          type: 'success'
        });
      } else if (msg.type === 'FUEL_LOG_DELETED' && msg.data?.id) {
        recordDeletedId(msg.data.id);
        setFuelLogs(prev => {
          const next = prev.filter(f => f.id !== msg.data.id);
          safeLocalStorageSet(STORAGE_KEYS.FUEL_LOGS, JSON.stringify(next));
          return next;
        });
      } else if (msg.type === 'FUEL_RULE_SAVED' && msg.data?.plate) {
        const incoming = msg.data as FuelConsumptionRule;
        setFuelConsumptionRules(prev => {
          const filtered = prev.filter(r => r.id !== incoming.id && r.plate !== incoming.plate);
          const next = [...filtered, incoming];
          safeLocalStorageSet(STORAGE_KEYS.FUEL_RULES, JSON.stringify(next));
          return next;
        });
        api.saveFuelConsumptionRule(incoming).catch(() => {});
      } else if (msg.type === 'FUEL_RULE_DELETED' && msg.data?.id) {
        recordDeletedId(msg.data.id);
        setFuelConsumptionRules(prev => {
          const next = prev.filter(r => r.id !== msg.data.id);
          safeLocalStorageSet(STORAGE_KEYS.FUEL_RULES, JSON.stringify(next));
          return next;
        });
      } else if (msg.type === 'CHECKLIST_DELETED' && msg.data?.id) {
        recordDeletedId(msg.data.id);
        setChecklists(prev => prev.filter(c => c.id !== msg.data.id));
      } else if (msg.type === 'WORK_ORDER_DELETED' && msg.data?.id) {
        recordDeletedId(msg.data.id);
        setWorkOrders(prev => prev.filter(w => w.id !== msg.data.id));
      } else if (msg.type === 'ITEM_DELETED' && msg.data?.id) {
        recordDeletedId(msg.data.id);
        if (msg.data.type === 'checklist') {
          setChecklists(prev => prev.filter(c => c.id !== msg.data.id));
        } else if (msg.data.type === 'fleet-update') {
          setFleetMonthlyUpdates(prev => prev.filter(u => u.id !== msg.data.id));
        } else if (msg.data.type === 'fuel-log') {
          setFuelLogs(prev => prev.filter(f => f.id !== msg.data.id));
        } else {
          setWorkOrders(prev => prev.filter(w => w.id !== msg.data.id));
        }
      } else if (msg.type === 'CLEAR_TESTS') {
        if (Array.isArray(msg.data?.deletedIds)) {
          msg.data.deletedIds.forEach((id: string) => recordDeletedId(id));
        }
        syncNow();
      }
    });

    // Non-blocking background catch-up of recent cross-container events (e.g., ais-pre <-> ais-dev)
    const catchUpTimer = setTimeout(() => {
      if (typeof navigator === 'undefined' || navigator.onLine) {
        cloudLiveSync.pollRecentUpdates(1440);
      }
    }, 900);

    return () => {
      clearTimeout(catchUpTimer);
      cloudLiveSync.stopListening();
    };
  }, [userRole, operatorReleaseKey, Boolean(activeOperatorRelease), serviceRequestFarmScope, recordDeletedId, syncNow]);

  // PeerJS live sync (only active on-demand when user opens the Sync Modal)
  useEffect(() => {
    if (!showSyncModal || userRole === 'SOLICITANTE') {
      syncManager.cleanup();
      return;
    }

    syncManager.init(
      userRole === 'ADMIN' ? 'ADMIN' : 'OPERADOR',
      (incomingPayload) => {
        importSyncPayload(incomingPayload);
      },
      (status, message) => {
        setPeerStatus(status);
        if (message) setPeerMessage(message);
      }
    );

    return () => {
      syncManager.cleanup();
    };
  }, [showSyncModal, userRole, importSyncPayload]);

  // Read URL for import_sync on load
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const params = new URLSearchParams(window.location.search);
      const syncParam = params.get('import_sync');
      if (syncParam) {
        const payload = decodeSyncPayload(syncParam);
        if (payload) {
          importSyncPayload(payload);
          params.delete('import_sync');
          const newSearch = params.toString() ? `?${params.toString()}` : '';
          window.history.replaceState({}, document.title, window.location.pathname + newSearch);
        }
      }
    } catch (e) {
      console.warn('Error reading URL sync payload:', e);
    }
  }, [importSyncPayload]);

  // Checklists actions
  const addChecklist = (data: Omit<ChecklistRecord, 'id' | 'code' | 'createdAt'> & { id?: string; code?: string; createdAt?: string }): ChecklistRecord => {
    const nextIndex = checklists.length + 1;
    const code = data.code || `CHK-${String(nextIndex).padStart(3, '0')}`;
    const newRecord: ChecklistRecord = {
      ...data,
      id: data.id || `chk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      code,
      createdAt: data.createdAt || new Date().toISOString()
    };

    // Update local state immediately for instant feedback
    setChecklists(prev => {
      const filtered = prev.filter(c => c.id !== newRecord.id);
      return [newRecord, ...filtered];
    });

    // Check offline status
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      addToOfflineQueue({
        id: newRecord.id,
        type: 'checklist',
        action: 'save',
        data: newRecord,
        timestamp: Date.now()
      });
      setSyncToast({
        isOpen: true,
        message: `💾 Salvo no aparelho (Modo Offline). Assim que tiver sinal ou Wi-Fi, o checklist ${newRecord.code} subirá automaticamente para o computador!`,
        type: 'info'
      });
    } else {
      // Upload to central server
      api.saveChecklist(newRecord).catch(err => {
        console.warn('[API] Could not save checklist to server, queued offline:', err);
        addToOfflineQueue({
          id: newRecord.id,
          type: 'checklist',
          action: 'save',
          data: newRecord,
          timestamp: Date.now()
        });
      });

      // Automatically broadcast to the PC in real-time
      cloudLiveSync.publish('CHECKLIST_SAVED', newRecord);
    }

    return newRecord;
  };

  const deleteChecklist = async (id: string) => {
    recordDeletedId(id);
    setChecklists(prev => prev.filter(c => c.id !== id));
    if (viewChecklistDetail?.id === id) {
      setViewChecklistDetail(null);
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      addToOfflineQueue({
        id,
        type: 'checklist',
        action: 'delete',
        data: { id },
        timestamp: Date.now()
      });
    } else {
      try {
        await api.deleteChecklist(id);
        cloudLiveSync.publish('CHECKLIST_DELETED', { id });
        cloudLiveSync.publish('ITEM_DELETED', { id, type: 'checklist' });
      } catch (err) {
        console.warn('[API] Could not delete checklist on server, queued offline:', err);
        addToOfflineQueue({
          id,
          type: 'checklist',
          action: 'delete',
          data: { id },
          timestamp: Date.now()
        });
      }
    }
  };

  // Reconhecimento / Aceite Administrativo de Não Conformidade (Exclusivo Admin)
  const acknowledgeChecklistItem = async (
    checklistId: string,
    itemId: string,
    justification?: string
  ) => {
    const nowStr = new Date().toLocaleString('pt-BR');
    let updatedRecord: ChecklistRecord | null = null;

    setChecklists(prev => {
      const next = prev.map(c => {
        if (c.id === checklistId) {
          const nextItems = c.items.map(item => {
            if (item.itemId === itemId) {
              return {
                ...item,
                adminAcknowledged: true,
                acknowledgedAt: nowStr,
                acknowledgedBy: 'Gerente Manutenção',
                acknowledgementJustification: justification?.trim() || 'Não conformidade analisada e aceita pelo Gerente de Manutenção.'
              };
            }
            return item;
          });

          // Check if any active NC remains
          const hasPendingNC = nextItems.some(i => i.status === 'N/C' && !i.adminAcknowledged);
          const statusSummary = hasPendingNC ? c.statusSummary : 'CONFORME';

          updatedRecord = {
            ...c,
            items: nextItems,
            statusSummary
          };
          return updatedRecord;
        }
        return c;
      });

      safeLocalStorageSet(STORAGE_KEYS.CHECKLISTS, JSON.stringify(next));
      return next;
    });

    if (updatedRecord) {
      if (viewChecklistDetail?.id === checklistId) {
        setViewChecklistDetail(updatedRecord);
      }
      api.saveChecklist(updatedRecord).catch(() => {});
      cloudLiveSync.publish('CHECKLIST_SAVED', updatedRecord);

      setSyncToast({
        isOpen: true,
        message: '✓ Não conformidade reconhecida e aceita pelo Gerente de Manutenção! O item foi regularizado e o aceite ficou gravado no checklist.',
        type: 'success'
      });
    }
  };

  const unacknowledgeChecklistItem = async (checklistId: string, itemId: string) => {
    let updatedRecord: ChecklistRecord | null = null;

    setChecklists(prev => {
      const next = prev.map(c => {
        if (c.id === checklistId) {
          const nextItems = c.items.map(item => {
            if (item.itemId === itemId) {
              const { adminAcknowledged, acknowledgedAt, acknowledgedBy, acknowledgementJustification, ...rest } = item;
              return {
                ...rest,
                adminAcknowledged: false
              };
            }
            return item;
          });

          updatedRecord = {
            ...c,
            items: nextItems,
            statusSummary: 'COM_PENDENCIAS'
          };
          return updatedRecord;
        }
        return c;
      });

      safeLocalStorageSet(STORAGE_KEYS.CHECKLISTS, JSON.stringify(next));
      return next;
    });

    if (updatedRecord) {
      if (viewChecklistDetail?.id === checklistId) {
        setViewChecklistDetail(updatedRecord);
      }
      api.saveChecklist(updatedRecord).catch(() => {});
      cloudLiveSync.publish('CHECKLIST_SAVED', updatedRecord);

      setSyncToast({
        isOpen: true,
        message: 'Reconhecimento desfeito: o apontamento voltou a ser contabilizado como pendência.',
        type: 'info'
      });
    }
  };

  const acknowledgeAllChecklistNCs = async (checklistId: string, justification?: string) => {
    const nowStr = new Date().toLocaleString('pt-BR');
    let updatedRecord: ChecklistRecord | null = null;

    setChecklists(prev => {
      const next = prev.map(c => {
        if (c.id === checklistId) {
          const nextItems = c.items.map(item => {
            if (item.status === 'N/C' && !item.adminAcknowledged) {
              return {
                ...item,
                adminAcknowledged: true,
                acknowledgedAt: nowStr,
                acknowledgedBy: 'Gerente Manutenção',
                acknowledgementJustification: justification?.trim() || 'Todas as pendências analisadas e aceitas pelo Gerente de Manutenção.'
              };
            }
            return item;
          });

          updatedRecord = {
            ...c,
            items: nextItems,
            statusSummary: 'CONFORME'
          };
          return updatedRecord;
        }
        return c;
      });

      safeLocalStorageSet(STORAGE_KEYS.CHECKLISTS, JSON.stringify(next));
      return next;
    });

    if (updatedRecord) {
      if (viewChecklistDetail?.id === checklistId) {
        setViewChecklistDetail(updatedRecord);
      }
      api.saveChecklist(updatedRecord).catch(() => {});
      cloudLiveSync.publish('CHECKLIST_SAVED', updatedRecord);

      setSyncToast({
        isOpen: true,
        message: '✓ Todas as não conformidades deste checklist foram reconhecidas e aceitas pelo Gerente de Manutenção!',
        type: 'success'
      });
    }
  };
  const addWorkOrder = (data: Omit<WorkOrder, 'id' | 'code' | 'createdAt' | 'updatedAt'> & { id?: string; code?: string; createdAt?: string }): WorkOrder => {
    const nextIndex = workOrders.length + 1;
    const year = new Date().getFullYear();
    const code = data.code || `OS-${year}-${String(nextIndex).padStart(3, '0')}`;
    const nowIso = new Date().toISOString();
    const newRecord: WorkOrder = {
      ...data,
      id: data.id || `os_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      code,
      createdAt: data.createdAt || nowIso,
      updatedAt: nowIso
    };

    // Update local state immediately
    setWorkOrders(prev => {
      const filtered = prev.filter(w => w.id !== newRecord.id);
      return [newRecord, ...filtered];
    });

    // If linked to checklist
    if (data.checklistSourceId) {
      setChecklists(prev =>
        prev.map(c => {
          if (c.id === data.checklistSourceId) {
            const currentIds = c.workOrderIds || [];
            return {
              ...c,
              workOrderIds: [...currentIds, newRecord.id],
              items: c.items.map(item => {
                if (item.description === data.checklistItemDescription) {
                  return { ...item, generatedWorkOrderId: newRecord.id };
                }
                return item;
              })
            };
          }
          return c;
        })
      );
    }

    // If linked to Service Request, update it to OS_GERADA
    if (data.serviceRequestId) {
      const targetSr = serviceRequestsRef.current.find(sr => sr.id === data.serviceRequestId);
      if (targetSr) {
        const linkedIso = new Date().toISOString();
        const updatedReq: ServiceRequest = {
          ...targetSr,
          status: newRecord.status === 'CONCLUIDA' ? 'CONCLUIDA' : 'OS_GERADA',
          linkedWorkOrderId: newRecord.id,
          linkedWorkOrderCode: newRecord.code,
          assignedOperatorName: newRecord.responsible,
          linkedAt: linkedIso,
          updatedAt: linkedIso
        };
        setServiceRequests(prev => {
          const next = prev.map(sr => (sr.id === data.serviceRequestId ? updatedReq : sr));
          safeLocalStorageSet(STORAGE_KEYS.SERVICE_REQUESTS, JSON.stringify(next));
          return next;
        });
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          addToOfflineQueue({
            id: updatedReq.id,
            type: 'service-request',
            action: 'save',
            data: updatedReq,
            timestamp: Date.now()
          });
        } else {
          api.saveServiceRequest(updatedReq).catch(() => {});
          cloudLiveSync.publish('SERVICE_REQUEST_SAVED', updatedReq);
        }
      }
    }

    // Check offline status
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      addToOfflineQueue({
        id: newRecord.id,
        type: 'work-order',
        action: 'save',
        data: newRecord,
        timestamp: Date.now()
      });
      setSyncToast({
        isOpen: true,
        message: `💾 Salva no aparelho (Modo Offline). Assim que tiver sinal ou Wi-Fi, a OS ${newRecord.code} subirá automaticamente para o computador!`,
        type: 'info'
      });
    } else {
      // Upload to central server
      api.saveWorkOrder(newRecord).catch(err => {
        console.warn('[API] Could not save work order to server, queued offline:', err);
        addToOfflineQueue({
          id: newRecord.id,
          type: 'work-order',
          action: 'save',
          data: newRecord,
          timestamp: Date.now()
        });
      });

      // Automatically broadcast to the PC in real-time
      cloudLiveSync.publish('WORK_ORDER_SAVED', newRecord);
    }

    return newRecord;
  };

  const updateWorkOrder = async (id: string, updates: Partial<WorkOrder>) => {
    let updatedRecord: WorkOrder | null = null;
    setWorkOrders(prev =>
      prev.map(wo => {
        if (wo.id === id) {
          const updated = {
            ...wo,
            ...updates,
            updatedAt: new Date().toISOString()
          };
          updatedRecord = updated;
          if (viewWorkOrderDetail?.id === id) {
            setViewWorkOrderDetail(updated);
          }
          return updated;
        }
        return wo;
      })
    );

    // If linked to a Service Request and OS is completed, also mark the Service Request as CONCLUIDA
    if (updatedRecord && (updatedRecord as WorkOrder).serviceRequestId && updates.status === 'CONCLUIDA') {
      const srId = (updatedRecord as WorkOrder).serviceRequestId!;
      const targetSr = serviceRequestsRef.current.find(sr => sr.id === srId);
      if (targetSr) {
        const updatedReq: ServiceRequest = {
          ...targetSr,
          status: 'CONCLUIDA',
          updatedAt: new Date().toISOString()
        };
        setServiceRequests(prev => {
          const next = prev.map(sr => (sr.id === srId ? updatedReq : sr));
          safeLocalStorageSet(STORAGE_KEYS.SERVICE_REQUESTS, JSON.stringify(next));
          return next;
        });
        api.saveServiceRequest(updatedReq).catch(() => {});
        cloudLiveSync.publish('SERVICE_REQUEST_SAVED', updatedReq);
      }
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine && updatedRecord) {
      addToOfflineQueue({
        id,
        type: 'work-order',
        action: 'save',
        data: updatedRecord,
        timestamp: Date.now()
      });
    } else {
      try {
        await api.updateWorkOrder(id, updates);
        if (updatedRecord) {
          cloudLiveSync.publish('WORK_ORDER_SAVED', updatedRecord);
        }
      } catch (err) {
        console.warn('[API] Could not update work order on server, queued offline:', err);
        if (updatedRecord) {
          addToOfflineQueue({
            id,
            type: 'work-order',
            action: 'save',
            data: updatedRecord,
            timestamp: Date.now()
          });
        }
      }
    }
  };

  const deleteWorkOrder = async (id: string) => {
    recordDeletedId(id);
    setWorkOrders(prev => prev.filter(wo => wo.id !== id));
    if (viewWorkOrderDetail?.id === id) {
      setViewWorkOrderDetail(null);
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      addToOfflineQueue({
        id,
        type: 'work-order',
        action: 'delete',
        data: { id },
        timestamp: Date.now()
      });
    } else {
      try {
        await api.deleteWorkOrder(id);
        cloudLiveSync.publish('WORK_ORDER_DELETED', { id });
        cloudLiveSync.publish('ITEM_DELETED', { id, type: 'work-order' });
      } catch (err) {
        console.warn('[API] Could not delete work order on server, queued offline:', err);
        addToOfflineQueue({
          id,
          type: 'work-order',
          action: 'delete',
          data: { id },
          timestamp: Date.now()
        });
      }
    }
  };

  // Auto-save drafts to central server without spamming external live sync
  const autoSaveDraft = async (type: 'checklist' | 'work-order' | 'fleet-update', data: any) => {
    try {
      await api.autoSaveDraft(type, data);
    } catch (err) {
      console.warn('[API] Auto-save draft error:', err);
    }
  };

  const generateWorkOrderFromChecklistNC = (
    checklist: ChecklistRecord,
    itemDescription: string,
    notes?: string,
    photoUrl?: string
  ) => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().substring(0, 5);

    let derivedEquipment = itemDescription;
    const descLower = itemDescription.toLowerCase();
    if (descLower.includes('compressor')) derivedEquipment = 'Compressor Frigorífico';
    else if (descLower.includes('bomba')) derivedEquipment = 'Conjunto Moto-Bomba';
    else if (descLower.includes('gerador')) derivedEquipment = 'Grupo Gerador a Diesel';
    else if (descLower.includes('correia')) derivedEquipment = 'Sistema de Transmissão por Correias';
    else if (descLower.includes('cooler')) derivedEquipment = 'Painel de Automação / Ventilação';
    else if (descLower.includes('vazamento')) derivedEquipment = 'Tubulação e Manifold Hidráulico';

    const photosBeforeList = photoUrl ? [{
      id: `photo_${Date.now()}`,
      url: photoUrl,
      caption: `Foto registrada durante checklist: ${itemDescription}`,
      timestamp: `${dateStr} ${timeStr}`
    }] : [];

    setPrefilledWorkOrder({
      farm: checklist.farm,
      location: checklist.location,
      equipment: derivedEquipment,
      date: dateStr,
      time: timeStr,
      responsible: checklist.inspector,
      problemDescription: notes 
        ? `Apontamento do Checklist (${checklist.code}): ${itemDescription}. Obs: ${notes}`
        : `Não conformidade detectada no Checklist (${checklist.code}): ${itemDescription}.`,
      priority: 'ALTA',
      maintenanceType: 'CORRETIVA',
      photosBefore: photosBeforeList,
      checklistSourceId: checklist.id,
      checklistItemDescription: itemDescription
    });

    setActiveTab('new-work-order');
  };

  // Fleet Monthly Updates actions
  const addFleetMonthlyUpdate = useCallback((data: Omit<VehicleMonthlyUpdate, 'id' | 'code' | 'createdAt'> & { id?: string; code?: string; createdAt?: string }): VehicleMonthlyUpdate => {
    const nextIndex = fleetMonthlyUpdates.length + 1;
    const code = data.code || `AMV-2026-${String(nextIndex).padStart(3, '0')}`;
    const newRecord: VehicleMonthlyUpdate = {
      ...data,
      id: data.id || `amv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      code,
      createdAt: data.createdAt || new Date().toISOString()
    };

    setFleetMonthlyUpdates(prev => [newRecord, ...prev.filter(u => u.id !== newRecord.id)]);
    cloudLiveSync.publish('FLEET_UPDATE_SAVED', newRecord);

    // Save to central server or queue offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      addToOfflineQueue({
        id: newRecord.id,
        type: 'fleet-update',
        action: 'save',
        data: newRecord,
        timestamp: Date.now()
      });
      setSyncToast({
        isOpen: true,
        message: `💾 Salvo no aparelho (Modo Offline). A atualização de frota ${newRecord.code} subirá para a base assim que houver conexão!`,
        type: 'info'
      });
    } else {
      api.saveFleetMonthlyUpdate(newRecord).catch(err => {
        console.warn('[API] Could not save fleet update to server, queued offline:', err);
        addToOfflineQueue({
          id: newRecord.id,
          type: 'fleet-update',
          action: 'save',
          data: newRecord,
          timestamp: Date.now()
        });
      });
    }

    return newRecord;
  }, [fleetMonthlyUpdates, addToOfflineQueue]);

  const deleteFleetMonthlyUpdate = useCallback(async (id: string) => {
    setFleetMonthlyUpdates(prev => prev.filter(u => u.id !== id));
    if (viewFleetUpdateDetail?.id === id) {
      setViewFleetUpdateDetail(null);
    }
    recordDeletedId(id);
    cloudLiveSync.publish('FLEET_UPDATE_DELETED', { id });
    cloudLiveSync.publish('ITEM_DELETED', { id, type: 'fleet-update' });

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      addToOfflineQueue({
        id,
        type: 'fleet-update',
        action: 'delete',
        data: { id },
        timestamp: Date.now()
      });
    } else {
      try {
        await api.deleteFleetMonthlyUpdate(id);
      } catch (err) {
        console.warn('[API] Could not delete fleet update on server, queued offline:', err);
        addToOfflineQueue({
          id,
          type: 'fleet-update',
          action: 'delete',
          data: { id },
          timestamp: Date.now()
        });
      }
    }
  }, [viewFleetUpdateDetail, recordDeletedId, addToOfflineQueue]);

  // Reconhecimento / Aceite Administrativo de Sinistro de Frota (Exclusivo Admin)
  const acknowledgeFleetSinistro = useCallback(async (
    updateId: string,
    justification?: string
  ) => {
    const nowStr = new Date().toLocaleString('pt-BR');
    const isoNow = new Date().toISOString();
    let updatedRecord: VehicleMonthlyUpdate | null = null;

    setFleetMonthlyUpdates(prev => {
      const next = prev.map(u => {
        if (u.id === updateId) {
          updatedRecord = {
            ...u,
            adminAcknowledged: true,
            acknowledgedAt: nowStr,
            acknowledgedBy: 'Gerente Manutenção',
            acknowledgementJustification: justification?.trim() || 'Sinistro/avaria analisado e reconhecido pelo Gerente de Manutenção.',
            updatedAt: isoNow
          };
          return updatedRecord;
        }
        return u;
      });

      safeLocalStorageSet(STORAGE_KEYS.FLEET_MONTHLY_UPDATES, JSON.stringify(next));
      return next;
    });

    if (updatedRecord) {
      if (viewFleetUpdateDetail?.id === updateId) {
        setViewFleetUpdateDetail(updatedRecord);
      }
      try {
        await api.saveFleetMonthlyUpdate(updatedRecord);
      } catch {}
      cloudLiveSync.publish('FLEET_UPDATE_SAVED', updatedRecord);

      setSyncToast({
        isOpen: true,
        message: '✓ Sinistro reconhecido e aceito pelo Gerente de Manutenção! O alerta foi regularizado.',
        type: 'success'
      });
    }
  }, [viewFleetUpdateDetail]);

  const unacknowledgeFleetSinistro = useCallback(async (updateId: string) => {
    const isoNow = new Date().toISOString();
    let updatedRecord: VehicleMonthlyUpdate | null = null;

    setFleetMonthlyUpdates(prev => {
      const next = prev.map(u => {
        if (u.id === updateId) {
          updatedRecord = {
            ...u,
            adminAcknowledged: false,
            acknowledgedAt: undefined,
            acknowledgedBy: undefined,
            acknowledgementJustification: undefined,
            updatedAt: isoNow
          };
          return updatedRecord;
        }
        return u;
      });

      safeLocalStorageSet(STORAGE_KEYS.FLEET_MONTHLY_UPDATES, JSON.stringify(next));
      return next;
    });

    if (updatedRecord) {
      if (viewFleetUpdateDetail?.id === updateId) {
        setViewFleetUpdateDetail(updatedRecord);
      }
      try {
        await api.saveFleetMonthlyUpdate(updatedRecord);
      } catch {}
      cloudLiveSync.publish('FLEET_UPDATE_SAVED', updatedRecord);

      setSyncToast({
        isOpen: true,
        message: 'Reconhecimento de sinistro desfeito. O alerta voltou a ficar ativo.',
        type: 'info'
      });
    }
  }, [viewFleetUpdateDetail]);

  // ==================== ABASTECIMENTO DE VEÍCULOS & PARÂMETROS DE CONSUMO ====================

  const saveFuelLog = useCallback((
    data: Omit<FuelLogRecord, 'id' | 'code' | 'createdAt'> & { id?: string; code?: string; createdAt?: string }
  ): FuelLogRecord => {
    const year = new Date().getFullYear();
    const nowIso = new Date().toISOString();
    const existing = data.id ? fuelLogs.find(f => f.id === data.id) : undefined;
    const nextIndex = fuelLogs.length + 1;

    const record: FuelLogRecord = {
      ...existing,
      ...data,
      id: existing?.id || data.id || `fuel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      code: existing?.code || data.code || `ABT-${year}-${String(nextIndex).padStart(3, '0')}`,
      plate: String(data.plate).trim().toUpperCase().replace(/[^A-Z0-9]/g, ''),
      liters: Number(data.liters),
      km: Number.isFinite(Number(data.km)) ? Number(data.km) : 0,
      createdAt: existing?.createdAt || data.createdAt || nowIso,
      updatedAt: nowIso
    };

    setFuelLogs(prev => {
      const next = [record, ...prev.filter(f => f.id !== record.id)];
      safeLocalStorageSet(STORAGE_KEYS.FUEL_LOGS, JSON.stringify(next));
      return next;
    });

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      addToOfflineQueue({
        id: record.id,
        type: 'fuel-log',
        action: 'save',
        data: record,
        timestamp: Date.now()
      });
      setSyncToast({
        isOpen: true,
        message: `💾 Salvo no aparelho (Modo Offline). O abastecimento ${record.code} subirá assim que houver sinal!`,
        type: 'info'
      });
    } else {
      api.saveFuelLog(record).catch(err => {
        console.warn('[API] Could not save fuel log to server, queued offline:', err);
        addToOfflineQueue({
          id: record.id,
          type: 'fuel-log',
          action: 'save',
          data: record,
          timestamp: Date.now()
        });
      });
      cloudLiveSync.publish('FUEL_LOG_SAVED', record);
    }

    return record;
  }, [fuelLogs, addToOfflineQueue]);

  const deleteFuelLog = useCallback(async (id: string) => {
    setFuelLogs(prev => {
      const next = prev.filter(f => f.id !== id);
      safeLocalStorageSet(STORAGE_KEYS.FUEL_LOGS, JSON.stringify(next));
      return next;
    });
    recordDeletedId(id);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      addToOfflineQueue({
        id,
        type: 'fuel-log',
        action: 'delete',
        data: { id },
        timestamp: Date.now()
      });
    } else {
      try {
        await api.deleteFuelLog(id);
        cloudLiveSync.publish('FUEL_LOG_DELETED', { id });
        cloudLiveSync.publish('ITEM_DELETED', { id, type: 'fuel-log' });
      } catch (err) {
        console.warn('[API] Could not delete fuel log on server, queued offline:', err);
        addToOfflineQueue({
          id,
          type: 'fuel-log',
          action: 'delete',
          data: { id },
          timestamp: Date.now()
        });
      }
    }
  }, [recordDeletedId, addToOfflineQueue]);

  const saveFuelConsumptionRule = useCallback((
    ruleData: Omit<FuelConsumptionRule, 'id'> & { id?: string }
  ): FuelConsumptionRule => {
    const normalizedPlate = String(ruleData.plate).trim().toUpperCase() === 'DEFAULT'
      ? 'DEFAULT'
      : String(ruleData.plate).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    const existing = fuelConsumptionRules.find(
      r => (ruleData.id && r.id === ruleData.id) || r.plate.toUpperCase() === normalizedPlate
    );

    const record: FuelConsumptionRule = {
      id: existing?.id || ruleData.id || (normalizedPlate === 'DEFAULT' ? 'fcr_default' : `fcr_${normalizedPlate}_${Date.now()}`),
      plate: normalizedPlate,
      minConsumption: Number(ruleData.minConsumption),
      avgConsumption: Number(ruleData.avgConsumption),
      maxConsumption: Number(ruleData.maxConsumption),
      updatedAt: new Date().toISOString()
    };

    setFuelConsumptionRules(prev => {
      const filtered = prev.filter(r => r.id !== record.id && r.plate !== record.plate);
      const next = [...filtered, record];
      safeLocalStorageSet(STORAGE_KEYS.FUEL_RULES, JSON.stringify(next));
      return next;
    });

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      addToOfflineQueue({
        id: record.id,
        type: 'fuel-rule',
        action: 'save',
        data: record,
        timestamp: Date.now()
      });
    } else {
      api.saveFuelConsumptionRule(record).catch(() => {
        addToOfflineQueue({
          id: record.id,
          type: 'fuel-rule',
          action: 'save',
          data: record,
          timestamp: Date.now()
        });
      });
      cloudLiveSync.publish('FUEL_RULE_SAVED', record);
    }

    return record;
  }, [fuelConsumptionRules, addToOfflineQueue]);

  const saveFuelConsumptionRulesBatch = useCallback((payload: {
    rules: Array<Omit<FuelConsumptionRule, 'id'> & { id?: string }>;
    deleteRuleIds?: string[];
  }): FuelConsumptionRule[] => {
    const nowIso = new Date().toISOString();
    const deleteSet = new Set((payload.deleteRuleIds || []).filter(id => id && id !== 'fcr_default'));

    const preparedRules: FuelConsumptionRule[] = (payload.rules || []).map(ruleData => {
      const normalizedPlate = String(ruleData.plate).trim().toUpperCase() === 'DEFAULT'
        ? 'DEFAULT'
        : String(ruleData.plate).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      const existing = fuelConsumptionRules.find(
        r => (ruleData.id && r.id === ruleData.id) || r.plate.toUpperCase() === normalizedPlate
      );
      return {
        id: existing?.id || ruleData.id || (normalizedPlate === 'DEFAULT' ? 'fcr_default' : `fcr_${normalizedPlate}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`),
        plate: normalizedPlate,
        minConsumption: Number(ruleData.minConsumption),
        avgConsumption: Number(ruleData.avgConsumption),
        maxConsumption: Number(ruleData.maxConsumption),
        updatedAt: nowIso
      };
    });

    const preparedPlates = new Set(preparedRules.map(r => r.plate));
    const preparedIds = new Set(preparedRules.map(r => r.id));

    setFuelConsumptionRules(prev => {
      const kept = prev.filter(
        r => !deleteSet.has(r.id) && !preparedIds.has(r.id) && !preparedPlates.has(r.plate.toUpperCase())
      );
      const next = [...kept, ...preparedRules];
      safeLocalStorageSet(STORAGE_KEYS.FUEL_RULES, JSON.stringify(next));
      return next;
    });

    deleteSet.forEach(id => recordDeletedId(id));

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      preparedRules.forEach(record => {
        addToOfflineQueue({
          id: record.id,
          type: 'fuel-rule',
          action: 'save',
          data: record,
          timestamp: Date.now()
        });
      });
      deleteSet.forEach(id => {
        addToOfflineQueue({
          id,
          type: 'fuel-rule',
          action: 'delete',
          data: { id },
          timestamp: Date.now()
        });
      });
    } else {
      api.saveFuelConsumptionRulesBatch({
        rules: preparedRules,
        deleteRuleIds: Array.from(deleteSet)
      }).catch(() => {
        preparedRules.forEach(record => {
          addToOfflineQueue({
            id: record.id,
            type: 'fuel-rule',
            action: 'save',
            data: record,
            timestamp: Date.now()
          });
        });
        deleteSet.forEach(id => {
          addToOfflineQueue({
            id,
            type: 'fuel-rule',
            action: 'delete',
            data: { id },
            timestamp: Date.now()
          });
        });
      });
      preparedRules.forEach(record => cloudLiveSync.publish('FUEL_RULE_SAVED', record));
      deleteSet.forEach(id => cloudLiveSync.publish('FUEL_RULE_DELETED', { id }));
    }

    return preparedRules;
  }, [fuelConsumptionRules, addToOfflineQueue, recordDeletedId]);

  const deleteFuelConsumptionRule = useCallback(async (id: string) => {
    if (id === 'fcr_default') return;
    setFuelConsumptionRules(prev => {
      const next = prev.filter(r => r.id !== id);
      safeLocalStorageSet(STORAGE_KEYS.FUEL_RULES, JSON.stringify(next));
      return next;
    });
    recordDeletedId(id);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      addToOfflineQueue({
        id,
        type: 'fuel-rule',
        action: 'delete',
        data: { id },
        timestamp: Date.now()
      });
    } else {
      api.deleteFuelConsumptionRule(id).catch(() => {});
      cloudLiveSync.publish('FUEL_RULE_DELETED', { id });
    }
  }, [recordDeletedId, addToOfflineQueue]);

  // NR-13 & Metrologia (Laudos e Calibrações) actions
  const saveNR13Report = useCallback(async (rep: NR13InspectionReport) => {
    setNr13Reports(prev => {
      const existingIdx = prev.findIndex(r => r.id === rep.id);
      let next: NR13InspectionReport[];
      if (existingIdx !== -1) {
        next = prev.map(r => r.id === rep.id ? rep : r);
      } else {
        next = [rep, ...prev];
      }
      safeLocalStorageSet(STORAGE_KEYS.NR13_REPORTS, JSON.stringify(next));
      return next;
    });
    try {
      await api.saveNR13Report(rep);
    } catch (e) {
      console.warn('[API] Could not save NR13 report to server, saved locally:', e);
    }
  }, []);

  const deleteNR13Report = useCallback(async (id: string) => {
    setNr13Reports(prev => {
      const next = prev.filter(r => r.id !== id);
      safeLocalStorageSet(STORAGE_KEYS.NR13_REPORTS, JSON.stringify(next));
      return next;
    });
    recordDeletedId(id);
    try {
      await api.deleteNR13Report(id);
    } catch (e) {
      console.warn('[API] Could not delete NR13 report from server:', e);
    }
  }, [recordDeletedId]);

  const saveNR13Vessel = useCallback(async (vessel: NR13VesselMaster) => {
    const normalized: NR13VesselMaster = {
      ...vessel,
      updatedAt: new Date().toISOString()
    };
    setNr13Vessels(prev => {
      const existingIdx = prev.findIndex(v => v.id === normalized.id);
      const next = existingIdx !== -1
        ? prev.map(v => (v.id === normalized.id ? normalized : v))
        : [normalized, ...prev];
      safeLocalStorageSet(STORAGE_KEYS.NR13_VESSELS, JSON.stringify(next));
      return next;
    });
    try {
      await api.saveNR13Vessel(normalized);
    } catch (e) {
      console.warn('[API] Could not save NR13 vessel to server, saved locally:', e);
    }
  }, []);

  const deleteNR13Vessel = useCallback(async (id: string) => {
    setNr13Vessels(prev => {
      const next = prev.filter(v => v.id !== id);
      safeLocalStorageSet(STORAGE_KEYS.NR13_VESSELS, JSON.stringify(next));
      return next;
    });
    recordDeletedId(id);
    try {
      await api.deleteNR13Vessel(id);
    } catch (e) {
      console.warn('[API] Could not delete NR13 vessel from server:', e);
    }
  }, [recordDeletedId]);

  const saveValveCalibration = useCallback(async (record: ValveCalibrationRecord) => {
    setValveCalibrations(prev => {
      const existingIdx = prev.findIndex(v => v.id === record.id);
      let next: ValveCalibrationRecord[];
      if (existingIdx !== -1) {
        next = prev.map(v => v.id === record.id ? record : v);
      } else {
        next = [record, ...prev];
      }
      safeLocalStorageSet(STORAGE_KEYS.VALVE_CALIBRATIONS, JSON.stringify(next));
      return next;
    });
    try {
      await api.saveValveCalibration(record);
    } catch (e) {
      console.warn('[API] Could not save valve calibration to server:', e);
    }
  }, []);

  const deleteValveCalibration = useCallback(async (id: string) => {
    setValveCalibrations(prev => {
      const next = prev.filter(v => v.id !== id);
      safeLocalStorageSet(STORAGE_KEYS.VALVE_CALIBRATIONS, JSON.stringify(next));
      return next;
    });
    recordDeletedId(id);
    try {
      await api.deleteValveCalibration(id);
    } catch (e) {
      console.warn('[API] Could not delete valve calibration from server:', e);
    }
  }, [recordDeletedId]);

  const saveGaugeCalibration = useCallback(async (record: GaugeCalibrationRecord) => {
    setGaugeCalibrations(prev => {
      const existingIdx = prev.findIndex(g => g.id === record.id);
      let next: GaugeCalibrationRecord[];
      if (existingIdx !== -1) {
        next = prev.map(g => g.id === record.id ? record : g);
      } else {
        next = [record, ...prev];
      }
      safeLocalStorageSet(STORAGE_KEYS.GAUGE_CALIBRATIONS, JSON.stringify(next));
      return next;
    });
    try {
      await api.saveGaugeCalibration(record);
    } catch (e) {
      console.warn('[API] Could not save gauge calibration to server:', e);
    }
  }, []);

  const deleteGaugeCalibration = useCallback(async (id: string) => {
    setGaugeCalibrations(prev => {
      const next = prev.filter(g => g.id !== id);
      safeLocalStorageSet(STORAGE_KEYS.GAUGE_CALIBRATIONS, JSON.stringify(next));
      return next;
    });
    recordDeletedId(id);
    try {
      await api.deleteGaugeCalibration(id);
    } catch (e) {
      console.warn('[API] Could not delete gauge calibration from server:', e);
    }
  }, [recordDeletedId]);

  const saveUltrassomEquipment = useCallback(async (record: UltrassomEquipmentRecord) => {
    setUltrassomEquipments(prev => {
      const existingIdx = prev.findIndex(u => u.id === record.id);
      let next: UltrassomEquipmentRecord[];
      if (existingIdx !== -1) {
        next = prev.map(u => u.id === record.id ? record : u);
      } else {
        next = [record, ...prev];
      }
      safeLocalStorageSet(STORAGE_KEYS.ULTRASSOM_EQUIPMENTS, JSON.stringify(next));
      return next;
    });
    try {
      await api.saveUltrassomEquipment(record);
    } catch (e) {
      console.warn('[API] Could not save ultrassom equipment to server:', e);
    }
  }, []);

  const deleteUltrassomEquipment = useCallback(async (id: string) => {
    setUltrassomEquipments(prev => {
      const next = prev.filter(u => u.id !== id);
      safeLocalStorageSet(STORAGE_KEYS.ULTRASSOM_EQUIPMENTS, JSON.stringify(next));
      return next;
    });
    recordDeletedId(id);
    try {
      await api.deleteUltrassomEquipment(id);
    } catch (e) {
      console.warn('[API] Could not delete ultrassom equipment from server:', e);
    }
  }, [recordDeletedId]);

  // ==================== SOLICITAÇÕES DE SERVIÇO & LIBERAÇÃO EXCLUSIVA ====================

  const addServiceRequest = useCallback(async (
    data: Omit<ServiceRequest, 'id' | 'code' | 'createdAt' | 'status'> & { id?: string; code?: string; createdAt?: string; status?: ServiceRequest['status'] }
  ): Promise<ServiceRequest> => {
    const year = new Date().getFullYear();
    const nextIndex = serviceRequests.length + 1;
    const nowIso = new Date().toISOString();
    const newRecord: ServiceRequest = {
      ...data,
      id: data.id || `ss_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      code: data.code || `SS-${year}-${String(nextIndex).padStart(3, '0')}`,
      status: data.status || 'PENDENTE',
      createdAt: data.createdAt || nowIso,
      updatedAt: nowIso
    };

    setServiceRequests(prev => {
      const next = [newRecord, ...prev.filter(s => s.id !== newRecord.id)];
      safeLocalStorageSet(STORAGE_KEYS.SERVICE_REQUESTS, JSON.stringify(next));
      return next;
    });

    setMySubmittedRequestIds(prev => {
      const next = prev.includes(newRecord.id) ? prev : [newRecord.id, ...prev];
      safeLocalStorageSet(STORAGE_KEYS.MY_REQUEST_IDS, JSON.stringify(next));
      return next;
    });

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      addToOfflineQueue({
        id: newRecord.id,
        type: 'service-request',
        action: 'save',
        data: newRecord,
        timestamp: Date.now()
      });
      setSyncToast({
        isOpen: true,
        message: `💾 Solicitação ${newRecord.code} salva no aparelho e será enviada assim que houver sinal!`,
        type: 'info'
      });
    } else {
      let persistedRecord = newRecord;
      try {
        const res = await api.saveServiceRequest(newRecord);
        if (res.serviceRequest) {
          persistedRecord = res.serviceRequest;
          if (res.serviceRequest.code !== newRecord.code) {
            setServiceRequests(prev => {
              const next = prev.map(s => s.id === newRecord.id ? res.serviceRequest : s);
              safeLocalStorageSet(STORAGE_KEYS.SERVICE_REQUESTS, JSON.stringify(next));
              return next;
            });
          }
        }
      } catch (err) {
        console.warn('[API] Could not save service request to server, queued offline:', err);
        addToOfflineQueue({
          id: newRecord.id,
          type: 'service-request',
          action: 'save',
          data: newRecord,
          timestamp: Date.now()
        });
      }
      cloudLiveSync.publish('SERVICE_REQUEST_SAVED', persistedRecord);
      return persistedRecord;
    }

    return newRecord;
  }, [serviceRequests.length, addToOfflineQueue]);

  const updateServiceRequest = useCallback(async (id: string, updates: Partial<ServiceRequest>) => {
    const target = serviceRequestsRef.current.find(sr => sr.id === id);
    if (!target) return;
    const updatedRecord: ServiceRequest = {
      ...target,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    setServiceRequests(prev => {
      const next = prev.map(sr => (sr.id === id ? updatedRecord : sr));
      safeLocalStorageSet(STORAGE_KEYS.SERVICE_REQUESTS, JSON.stringify(next));
      return next;
    });

    setViewServiceRequestDetail(curr => (curr?.id === id ? updatedRecord : curr));
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      addToOfflineQueue({
        id,
        type: 'service-request',
        action: 'save',
        data: updatedRecord,
        timestamp: Date.now()
      });
    } else {
      api.saveServiceRequest(updatedRecord).catch(() => {});
      cloudLiveSync.publish('SERVICE_REQUEST_SAVED', updatedRecord);
    }
  }, [addToOfflineQueue]);

  const deleteServiceRequest = useCallback(async (id: string) => {
    setServiceRequests(prev => {
      const next = prev.filter(s => s.id !== id);
      safeLocalStorageSet(STORAGE_KEYS.SERVICE_REQUESTS, JSON.stringify(next));
      return next;
    });
    if (viewServiceRequestDetail?.id === id) {
      setViewServiceRequestDetail(null);
    }
    recordDeletedId(id);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      addToOfflineQueue({
        id,
        type: 'service-request',
        action: 'delete',
        data: { id },
        timestamp: Date.now()
      });
    } else {
      api.deleteServiceRequest(id).catch(() => {});
      cloudLiveSync.publish('SERVICE_REQUEST_DELETED', { id });
    }
  }, [viewServiceRequestDetail, recordDeletedId, addToOfflineQueue]);

  const generateWorkOrderFromServiceRequest = useCallback((sr: ServiceRequest) => {
    const isValidated =
      sr.priorityValidated === true ||
      (sr.priorityValidated !== false && (sr.status === 'OS_GERADA' || sr.status === 'CONCLUIDA'));

    if (!isValidated || !sr.urgency) {
      setViewServiceRequestDetail(sr);
      setSyncToast({
        isOpen: true,
        message: '⚠️ Valide primeiro se a solicitação é URGENTE ou NORMAL antes de gerar a Ordem de Serviço.'
      });
      return;
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().substring(0, 5);

    const photosBeforeList = (sr.photos || []).map((photoUrl, idx) => ({
      id: `photo_ss_${Date.now()}_${idx}`,
      url: photoUrl,
      caption: `Foto da Solicitação ${sr.code} (${sr.requesterName})`,
      timestamp: `${sr.date} ${sr.time}`
    }));

    setPrefilledWorkOrder({
      farm: sr.farm,
      location: sr.location,
      equipment: sr.equipment,
      date: dateStr,
      time: timeStr,
      responsible: activeOperatorRelease?.operatorName || '',
      problemDescription: `[Solicitação ${sr.code} | Solicitante: ${sr.requesterName} | ${sr.date.split('-').reverse().join('/')} ${sr.time}]\n${sr.problemDescription}`,
      priority: sr.urgency === 'URGENTE' ? 'URGENTE' : 'MEDIA',
      maintenanceType: 'CORRETIVA',
      photosBefore: photosBeforeList,
      serviceRequestId: sr.id,
      serviceRequestCode: sr.code,
      requesterName: sr.requesterName
    });

    setViewServiceRequestDetail(null);
    setActiveTab('new-work-order');
  }, [activeOperatorRelease]);

  const linkWorkOrderToServiceRequest = useCallback(async (serviceRequestId: string, wo: WorkOrder) => {
    const nowIso = new Date().toISOString();
    await updateServiceRequest(serviceRequestId, {
      status: wo.status === 'CONCLUIDA' ? 'CONCLUIDA' : 'OS_GERADA',
      linkedWorkOrderId: wo.id,
      linkedWorkOrderCode: wo.code,
      assignedOperatorName: wo.responsible,
      linkedAt: nowIso
    });

    const sr = serviceRequests.find(s => s.id === serviceRequestId);
    if (sr) {
      await updateWorkOrder(wo.id, {
        serviceRequestId: sr.id,
        serviceRequestCode: sr.code,
        requesterName: sr.requesterName
      });
    }

    setSyncToast({
      isOpen: true,
      message: `🔗 Solicitação vinculada com sucesso à Ordem de Serviço ${wo.code}!`,
      type: 'success'
    });
  }, [serviceRequests, updateServiceRequest, updateWorkOrder]);

  const saveOperatorRelease = useCallback(async (
    data: Partial<OperatorServiceRelease> & { operatorName: string }
  ): Promise<OperatorServiceRelease | null> => {
    try {
      const res = await api.saveOperatorRelease(data);
      if (res.release) {
        setOperatorServiceReleases(prev => {
          const exists = prev.some(o => o.id === res.release.id);
          const next = exists
            ? prev.map(o => o.id === res.release.id ? res.release : o)
            : [res.release, ...prev];
          safeLocalStorageSet(STORAGE_KEYS.OPERATOR_RELEASES, JSON.stringify(next));
          return next;
        });
        cloudLiveSync.publish('OPERATOR_RELEASE_SAVED', res.release);
        return res.release;
      }
    } catch (e) {
      console.warn('[API] Erro ao salvar liberação no servidor:', e);
    }
    // Fallback local
    const fallback: OperatorServiceRelease = {
      id: data.id || `rel_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      token: data.token || `ss_key_${Math.random().toString(36).substring(2, 8)}${Date.now().toString(36).slice(-4)}`,
      operatorName: data.operatorName.trim(),
      farm: data.farm || 'TODAS',
      active: data.active !== undefined ? Boolean(data.active) : true,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setOperatorServiceReleases(prev => {
      const next = [fallback, ...prev.filter(o => o.id !== fallback.id)];
      safeLocalStorageSet(STORAGE_KEYS.OPERATOR_RELEASES, JSON.stringify(next));
      return next;
    });
    cloudLiveSync.publish('OPERATOR_RELEASE_SAVED', fallback);
    return fallback;
  }, []);

  const toggleOperatorRelease = useCallback(async (id: string) => {
    const target = operatorReleasesRef.current.find(o => o.id === id);
    if (!target) return;
    const updated = { ...target, active: !target.active, updatedAt: new Date().toISOString() };
    setOperatorServiceReleases(prev => {
      const next = prev.map(o => o.id === id ? updated : o);
      safeLocalStorageSet(STORAGE_KEYS.OPERATOR_RELEASES, JSON.stringify(next));
      return next;
    });
    api.saveOperatorRelease(updated).catch(() => {});
    cloudLiveSync.publish('OPERATOR_RELEASE_SAVED', updated);
  }, []);

  const deleteOperatorRelease = useCallback(async (id: string) => {
    setOperatorServiceReleases(prev => {
      const next = prev.filter(o => o.id !== id);
      safeLocalStorageSet(STORAGE_KEYS.OPERATOR_RELEASES, JSON.stringify(next));
      return next;
    });
    recordDeletedId(id);
    api.deleteOperatorRelease(id).catch(() => {});
    cloudLiveSync.publish('OPERATOR_RELEASE_DELETED', { id });
  }, [recordDeletedId]);

  // Reset to default sample data
  const resetToDefaults = async () => {
    try {
      await api.resetData();
      setDeletedIds([]);
      deletedIdsRef.current = [];
      safeLocalStorageSet(STORAGE_KEYS.DELETED_IDS, JSON.stringify([]));
      await syncNow();
    } catch {
      setChecklists(INITIAL_CHECKLISTS);
      setWorkOrders(INITIAL_WORK_ORDERS);
      setFleetMonthlyUpdates(INITIAL_FLEET_UPDATES);
      setDeletedIds([]);
      deletedIdsRef.current = [];
      safeLocalStorageSet(STORAGE_KEYS.DELETED_IDS, JSON.stringify([]));
    }
  };

  // Clear newly created test records
  const clearTestRecords = async () => {
    try {
      const res = await api.clearTests();
      if (res.checklists && res.workOrders) {
        setChecklists(res.checklists);
        setWorkOrders(res.workOrders);
      }
      if (Array.isArray(res.deletedIds)) {
        setDeletedIds(res.deletedIds);
        deletedIdsRef.current = res.deletedIds;
        safeLocalStorageSet(STORAGE_KEYS.DELETED_IDS, JSON.stringify(res.deletedIds));
        cloudLiveSync.publish('CLEAR_TESTS', { deletedIds: res.deletedIds });
      }
    } catch (err) {
      console.warn('Error clearing tests:', err);
    }
  };

  // Restore standard template individually
  const restoreItemIndividually = async (type: 'checklist' | 'work-order', id: string) => {
    try {
      // Remove from tombstones
      setDeletedIds(prev => {
        const next = prev.filter(d => d !== id);
        deletedIdsRef.current = next;
        safeLocalStorageSet(STORAGE_KEYS.DELETED_IDS, JSON.stringify(next));
        return next;
      });

      const res = await api.restoreItem(type, id);
      if (res.checklists && res.workOrders) {
        setChecklists(res.checklists);
        setWorkOrders(res.workOrders);
      }
    } catch (err) {
      console.warn('Erro ao restaurar individualmente:', err);
      // Remove from tombstones in fallback as well
      setDeletedIds(prev => {
        const next = prev.filter(d => d !== id);
        deletedIdsRef.current = next;
        safeLocalStorageSet(STORAGE_KEYS.DELETED_IDS, JSON.stringify(next));
        return next;
      });

      if (type === 'checklist') {
        const item = INITIAL_CHECKLISTS.find(c => c.id === id);
        if (item) {
          setChecklists(prev => [item, ...prev.filter(c => c.id !== id)]);
        }
      } else {
        const item = INITIAL_WORK_ORDERS.find(w => w.id === id);
        if (item) {
          setWorkOrders(prev => [item, ...prev.filter(w => w.id !== id)]);
        }
      }
    }
  };

  // Complete History Export & Import / Anti-Loss Backup
  const exportBackupJson = () => {
    try {
      const backupPayload = {
        app: 'elCiruelo',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        checklists,
        workOrders,
        vehicles,
        drones,
        fleetMonthlyUpdates,
        fuelLogs,
        fuelConsumptionRules,
        nr13Reports,
        nr13Vessels,
        valveCalibrations,
        gaugeCalibrations,
        ultrassomEquipments,
        deletedIds: deletedIdsRef.current
      };
      const jsonStr = JSON.stringify(backupPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().substring(0, 10);
      a.href = url;
      a.download = `backup_el_ciruelo_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Erro ao exportar backup:', e);
    }
  };

  const importBackupJson = async (file: File): Promise<{ success: boolean; message: string }> => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || (!Array.isArray(parsed.checklists) && !Array.isArray(parsed.workOrders))) {
        throw new Error('Formato inválido. O arquivo JSON deve conter os dados de checklists e ordens de serviço.');
      }

      if (Array.isArray(parsed.vehicles) && parsed.vehicles.length > 0) {
        setVehicles(parsed.vehicles);
        localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(parsed.vehicles));
      }

      if (Array.isArray(parsed.drones) && parsed.drones.length > 0) {
        setDrones(parsed.drones);
        safeLocalStorageSet(STORAGE_KEYS.DRONES, JSON.stringify(parsed.drones));
      }

      if (Array.isArray(parsed.fleetMonthlyUpdates) && parsed.fleetMonthlyUpdates.length > 0) {
        setFleetMonthlyUpdates(parsed.fleetMonthlyUpdates);
        safeLocalStorageSet(STORAGE_KEYS.FLEET_MONTHLY_UPDATES, JSON.stringify(parsed.fleetMonthlyUpdates));
      }

      if (Array.isArray(parsed.fuelLogs)) {
        setFuelLogs(parsed.fuelLogs);
        safeLocalStorageSet(STORAGE_KEYS.FUEL_LOGS, JSON.stringify(parsed.fuelLogs));
      }

      if (Array.isArray(parsed.fuelConsumptionRules) && parsed.fuelConsumptionRules.length > 0) {
        setFuelConsumptionRules(parsed.fuelConsumptionRules);
        safeLocalStorageSet(STORAGE_KEYS.FUEL_RULES, JSON.stringify(parsed.fuelConsumptionRules));
      }

      if (Array.isArray(parsed.nr13Vessels) && parsed.nr13Vessels.length > 0) {
        setNr13Vessels(parsed.nr13Vessels);
        safeLocalStorageSet(STORAGE_KEYS.NR13_VESSELS, JSON.stringify(parsed.nr13Vessels));
      }

      if (Array.isArray(parsed.nr13Reports) && parsed.nr13Reports.length > 0) {
        setNr13Reports(parsed.nr13Reports);
        safeLocalStorageSet(STORAGE_KEYS.NR13_REPORTS, JSON.stringify(parsed.nr13Reports));
      }

      const res = await api.importBackup(parsed);
      if (res.checklists) {
        setChecklists(res.checklists);
        safeLocalStorageSet(STORAGE_KEYS.CHECKLISTS, JSON.stringify(res.checklists));
        safeLocalStorageSet('agrocheck_permanent_vault_checklists', JSON.stringify(res.checklists));
      }
      if (res.workOrders) {
        setWorkOrders(res.workOrders);
        safeLocalStorageSet(STORAGE_KEYS.WORK_ORDERS, JSON.stringify(res.workOrders));
        safeLocalStorageSet('agrocheck_permanent_vault_workorders', JSON.stringify(res.workOrders));
      }
      if (res.deletedIds) {
        setDeletedIds(res.deletedIds);
        deletedIdsRef.current = res.deletedIds;
        safeLocalStorageSet(STORAGE_KEYS.DELETED_IDS, JSON.stringify(res.deletedIds));
      }

      setSyncToast({
        isOpen: true,
        message: `📦 Backup restaurado com sucesso! ${res.checklists?.length || 0} checklists e ${res.workOrders?.length || 0} OS carregados.`,
        type: 'success'
      });

      return { success: true, message: res.message || 'Backup restaurado com sucesso!' };
    } catch (err: any) {
      console.error('Erro ao importar backup:', err);
      return { success: false, message: err.message || 'Falha ao processar arquivo de backup.' };
    }
  };

  // Delete modal triggers
  const requestDelete = (params: { type: 'checklist' | 'work-order' | 'fleet-update' | 'service-request' | 'fuel-log'; id: string; code: string; description?: string }) => {
    setDeleteModalState({
      isOpen: true,
      ...params
    });
  };

  const cancelDelete = () => {
    setDeleteModalState(prev => ({ ...prev, isOpen: false }));
  };

  const confirmDelete = async () => {
    const { type, id } = deleteModalState;
    if (type === 'checklist') {
      await deleteChecklist(id);
    } else if (type === 'work-order') {
      await deleteWorkOrder(id);
    } else if (type === 'fleet-update') {
      await deleteFleetMonthlyUpdate(id);
    } else if (type === 'service-request') {
      await deleteServiceRequest(id);
    } else if (type === 'fuel-log') {
      await deleteFuelLog(id);
    }
    setDeleteModalState(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <AppContext.Provider
      value={{
        userRole,
        setUserRole: handleSetUserRole,
        selectedFarmFilter,
        setSelectedFarmFilter,
        lockedFarm,
        setLockedFarm,
        isFarmLocked,
        isRoleLocked,
        allowedModules,
        hasModuleAccess,
        unlockFarm,
        activeTab,
        setActiveTab,
        checklists,
        addChecklist,
        deleteChecklist,
        acknowledgeChecklistItem,
        unacknowledgeChecklistItem,
        acknowledgeAllChecklistNCs,
        workOrders,
        addWorkOrder,
        updateWorkOrder,
        deleteWorkOrder,
        generateWorkOrderFromChecklistNC,
        isSyncing,
        lastSyncTime,
        syncNow,
        isOnline,
        pendingOfflineCount: offlineQueue.length,
        flushOfflineQueue,
        autoSaveDraft,
        resetToDefaults,
        clearTestRecords,
        restoreItemIndividually,
        exportBackupJson,
        importBackupJson,
        showDataManagementModal,
        setShowDataManagementModal,
        showSyncModal,
        setShowSyncModal,
        peerStatus,
        peerMessage,
        importSyncPayload,
        syncToast,
        setSyncToast,
        viewChecklistDetail,
        setViewChecklistDetail,
        viewWorkOrderDetail,
        setViewWorkOrderDetail,
        previewImage,
        setPreviewImage,
        showMobileAccessModal,
        setShowMobileAccessModal,
        deleteModalState,
        requestDelete,
        cancelDelete,
        confirmDelete,
        selectedChecklistTypeForCreation,
        setSelectedChecklistTypeForCreation,
        startNewChecklist,
        prefilledWorkOrder,
        setPrefilledWorkOrder,
        vehicles,
        addVehicle,
        deleteVehicle,
        showVehicleModal,
        setShowVehicleModal,
        drones,
        addDrone,
        deleteDrone,
        showDroneModal,
        setShowDroneModal,
        fleetMonthlyUpdates,
        viewFleetUpdateDetail,
        setViewFleetUpdateDetail,
        showFleetUpdateFormModal,
        setShowFleetUpdateFormModal,
        fleetFormMode,
        setFleetFormMode,
        fleetListTab,
        setFleetListTab,
        startNewFleetAction,
        addFleetMonthlyUpdate,
        deleteFleetMonthlyUpdate,
        acknowledgeFleetSinistro,
        unacknowledgeFleetSinistro,
        fuelLogs,
        fuelConsumptionRules,
        saveFuelLog,
        deleteFuelLog,
        saveFuelConsumptionRule,
        saveFuelConsumptionRulesBatch,
        deleteFuelConsumptionRule,
        nr13Reports,
        saveNR13Report,
        deleteNR13Report,
        nr13Vessels,
        saveNR13Vessel,
        deleteNR13Vessel,
        valveCalibrations,
        saveValveCalibration,
        deleteValveCalibration,
        gaugeCalibrations,
        saveGaugeCalibration,
        deleteGaugeCalibration,
        ultrassomEquipments,
        saveUltrassomEquipment,
        deleteUltrassomEquipment,
        serviceRequests,
        addServiceRequest,
        updateServiceRequest,
        deleteServiceRequest,
        viewServiceRequestDetail,
        setViewServiceRequestDetail,
        generateWorkOrderFromServiceRequest,
        linkWorkOrderToServiceRequest,
        mySubmittedRequestIds,
        operatorServiceReleases,
        operatorReleaseKey,
        activeOperatorRelease,
        hasServiceRequestAccess,
        serviceRequestFarmScope,
        redeemOperatorReleaseKey,
        saveOperatorRelease,
        toggleOperatorRelease,
        deleteOperatorRelease
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
