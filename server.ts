import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { INITIAL_CHECKLISTS, INITIAL_WORK_ORDERS, INITIAL_FLEET_UPDATES, INITIAL_DRONES } from './src/data/initialData';
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
} from './src/data/nr13InitialData';
import { ChecklistRecord, DroneAsset, FuelConsumptionRule, FuelLogRecord, GaugeCalibrationRecord, NR13InspectionReport, NR13VesselMaster, OperatorServiceRelease, ServiceRequest, UltrassomEquipmentRecord, ValveCalibrationRecord, VehicleMonthlyUpdate, WorkOrder } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Dev server runs on port 3000 (or CLI arg); in production Cloud Run, use process.env.PORT
const isProd = process.env.NODE_ENV === 'production';
const portArgIndex = process.argv.indexOf('--port');
const cliPort = portArgIndex !== -1 ? Number(process.argv[portArgIndex + 1]) : null;
const PORT = cliPort || (isProd && process.env.PORT ? Number(process.env.PORT) : 3000);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const BACKUP_LATEST = path.join(DATA_DIR, 'database_backup_latest.json');

// Ensure data and backup directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

interface DatabaseSchema {
  checklists: ChecklistRecord[];
  workOrders: WorkOrder[];
  fleetMonthlyUpdates: VehicleMonthlyUpdate[];
  fuelLogs: FuelLogRecord[];
  fuelConsumptionRules: FuelConsumptionRule[];
  nr13Reports: NR13InspectionReport[];
  nr13Vessels: NR13VesselMaster[];
  valveCalibrations: ValveCalibrationRecord[];
  gaugeCalibrations: GaugeCalibrationRecord[];
  ultrassomEquipments: UltrassomEquipmentRecord[];
  serviceRequests: ServiceRequest[];
  operatorServiceReleases: OperatorServiceRelease[];
  drones: DroneAsset[];
  deletedIds: string[];
  lastUpdated: string;
}

const DEFAULT_FUEL_RULES: FuelConsumptionRule[] = [
  {
    id: 'fcr_default',
    plate: 'DEFAULT',
    minConsumption: 5.0,
    avgConsumption: 10.0,
    maxConsumption: 16.0,
    updatedAt: new Date().toISOString()
  }
];

// In-memory state initialized from file or defaults
let db: DatabaseSchema = {
  checklists: [...INITIAL_CHECKLISTS],
  workOrders: [...INITIAL_WORK_ORDERS],
  fleetMonthlyUpdates: [...INITIAL_FLEET_UPDATES],
  fuelLogs: [],
  fuelConsumptionRules: [...DEFAULT_FUEL_RULES],
  nr13Reports: [...INITIAL_NR13_REPORTS],
  nr13Vessels: [...INITIAL_NR13_VESSELS],
  valveCalibrations: [...INITIAL_VALVE_CALIBRATIONS],
  gaugeCalibrations: [...INITIAL_GAUGE_CALIBRATIONS],
  ultrassomEquipments: [...INITIAL_ULTRASSOM_EQUIPMENTS],
  serviceRequests: [],
  operatorServiceReleases: [],
  drones: [...INITIAL_DRONES],
  deletedIds: [],
  lastUpdated: new Date().toISOString()
};

let lastSnapshotTime = 0;

function saveDatabase() {
  try {
    db.lastUpdated = new Date().toISOString();
    const serialized = JSON.stringify(db, null, 2);

    // 1. Write primary database file
    fs.writeFileSync(DB_FILE, serialized, 'utf-8');

    // 2. Always maintain a secondary mirror copy
    fs.writeFileSync(BACKUP_LATEST, serialized, 'utf-8');

    // 3. Periodic rotating snapshots (at least every 5 minutes when changes occur)
    const now = Date.now();
    if (now - lastSnapshotTime > 5 * 60 * 1000) {
      lastSnapshotTime = now;
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const snapshotPath = path.join(BACKUP_DIR, `snapshot_${dateStr}.json`);
      fs.writeFileSync(snapshotPath, serialized, 'utf-8');

      // Keep latest 2 snapshots to prevent publish bundle bloat
      try {
        const snapshots = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('snapshot_')).sort();
        while (snapshots.length > 2) {
          const oldest = snapshots.shift();
          if (oldest) fs.unlinkSync(path.join(BACKUP_DIR, oldest));
        }
      } catch {}
    }
  } catch (err) {
    console.error('[DB] Error saving database file:', err);
  }
}

function loadDatabase() {
  const tryLoadFrom = (filePath: string): boolean => {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.checklists) && Array.isArray(parsed.workOrders)) {
          const parsedDeleted = Array.isArray(parsed.deletedIds) ? parsed.deletedIds : [];
          const existingVessels = Array.isArray(parsed.nr13Vessels)
            ? parsed.nr13Vessels.filter((v: any) => v && v.id && !parsedDeleted.includes(v.id) && !LEGACY_SAMPLE_VESSEL_IDS.includes(v.id))
            : [];
          const existingVesselIds = new Set(existingVessels.map((v: any) => v.id));
          const mergedVessels = [
            ...existingVessels,
            ...INITIAL_NR13_VESSELS.filter(v => !existingVesselIds.has(v.id) && !parsedDeleted.includes(v.id))
          ];

          let upgradedValves = false;
          const existingValves = Array.isArray(parsed.valveCalibrations)
            ? parsed.valveCalibrations
                .filter((v: any) => v && v.id && !parsedDeleted.includes(v.id) && !LEGACY_SAMPLE_VALVE_IDS.includes(v.id))
                .map((v: any) => {
                  if (v.standardCertNumber === 'Laudo Inspecione Engenharia' || v.testBenchStandard === 'Bancada Pneumática / Hidrostática') {
                    upgradedValves = true;
                    return {
                      ...v,
                      testBenchStandard: INSPECIONE_TEST_GAUGE_STANDARD,
                      standardCertNumber: INSPECIONE_TEST_GAUGE_CERT
                    };
                  }
                  return v;
                })
            : [];
          const existingValveIds = new Set(existingValves.map((v: any) => v.id));
          const mergedValves = [
            ...existingValves,
            ...INITIAL_VALVE_CALIBRATIONS.filter(v => !existingValveIds.has(v.id) && !parsedDeleted.includes(v.id))
          ];

          const existingGauges = Array.isArray(parsed.gaugeCalibrations)
            ? parsed.gaugeCalibrations.filter((g: any) => g && g.id && !parsedDeleted.includes(g.id) && !LEGACY_SAMPLE_GAUGE_IDS.includes(g.id))
            : [];
          const existingGaugeIds = new Set(existingGauges.map((g: any) => g.id));
          const mergedGauges = [
            ...existingGauges,
            ...INITIAL_GAUGE_CALIBRATIONS.filter(g => !existingGaugeIds.has(g.id) && !parsedDeleted.includes(g.id))
          ];

          const existingUltrassom = Array.isArray(parsed.ultrassomEquipments)
            ? parsed.ultrassomEquipments.filter((u: any) => u && u.id && !parsedDeleted.includes(u.id))
            : [];
          const existingUltrassomIds = new Set(existingUltrassom.map((u: any) => u.id));
          const mergedUltrassom = [
            ...existingUltrassom,
            ...INITIAL_ULTRASSOM_EQUIPMENTS.filter(u => !existingUltrassomIds.has(u.id) && !parsedDeleted.includes(u.id))
          ];

          const hadNewSeed =
            upgradedValves ||
            mergedVessels.length !== existingVessels.length ||
            mergedValves.length !== existingValves.length ||
            mergedGauges.length !== existingGauges.length ||
            mergedUltrassom.length !== existingUltrassom.length ||
            (Array.isArray(parsed.nr13Vessels) && parsed.nr13Vessels.some((v: any) => LEGACY_SAMPLE_VESSEL_IDS.includes(v?.id))) ||
            (Array.isArray(parsed.gaugeCalibrations) && parsed.gaugeCalibrations.some((g: any) => LEGACY_SAMPLE_GAUGE_IDS.includes(g?.id)));

          db = {
            checklists: parsed.checklists.filter((c: any) => c && c.id && Array.isArray(c.items) && !parsedDeleted.includes(c.id)),
            workOrders: parsed.workOrders.filter((w: any) => w && w.id && !parsedDeleted.includes(w.id)),
            fleetMonthlyUpdates: Array.isArray(parsed.fleetMonthlyUpdates)
              ? parsed.fleetMonthlyUpdates.filter((u: any) => u && u.id && !parsedDeleted.includes(u.id))
              : [...INITIAL_FLEET_UPDATES].filter(u => u && u.id && !parsedDeleted.includes(u.id)),
            fuelLogs: Array.isArray(parsed.fuelLogs)
              ? parsed.fuelLogs.filter((f: any) => f && f.id && !parsedDeleted.includes(f.id))
              : [],
            fuelConsumptionRules: Array.isArray(parsed.fuelConsumptionRules) && parsed.fuelConsumptionRules.length > 0
              ? parsed.fuelConsumptionRules.filter((r: any) => r && r.id && !parsedDeleted.includes(r.id))
              : [...DEFAULT_FUEL_RULES],
            nr13Reports: Array.isArray(parsed.nr13Reports)
              ? parsed.nr13Reports.filter((r: any) => r && r.id && !parsedDeleted.includes(r.id))
              : [...INITIAL_NR13_REPORTS].filter(r => r && r.id && !parsedDeleted.includes(r.id)),
            nr13Vessels: mergedVessels,
            valveCalibrations: mergedValves,
            gaugeCalibrations: mergedGauges,
            ultrassomEquipments: mergedUltrassom,
            serviceRequests: Array.isArray(parsed.serviceRequests)
              ? parsed.serviceRequests.filter((s: any) => s && s.id && !parsedDeleted.includes(s.id))
              : [],
            operatorServiceReleases: Array.isArray(parsed.operatorServiceReleases)
              ? parsed.operatorServiceReleases.filter((o: any) => o && o.id && !parsedDeleted.includes(o.id))
              : [],
            drones: Array.isArray(parsed.drones) && parsed.drones.length > 0
              ? parsed.drones.filter((d: any) => d && d.id && !parsedDeleted.includes(d.id))
              : [...INITIAL_DRONES].filter(d => !parsedDeleted.includes(d.id)),
            deletedIds: parsedDeleted,
            lastUpdated: parsed.lastUpdated || new Date().toISOString()
          };
          if (hadNewSeed && filePath === DB_FILE) {
            saveDatabase();
          }
          console.log(`[DB] Database successfully loaded from ${filePath}: ${db.checklists.length} checklists, ${db.workOrders.length} work orders, ${db.fleetMonthlyUpdates.length} fleet updates, ${db.nr13Reports.length} NR-13 reports, ${db.nr13Vessels.length} vessels, ${db.valveCalibrations.length} valves, ${db.gaugeCalibrations.length} gauges, ${db.deletedIds.length} deleted items.`);
          return true;
        }
      }
    } catch (err) {
      console.warn(`[DB] Could not parse ${filePath}:`, err);
    }
    return false;
  };

  // Tier 1: Try primary database.json
  if (tryLoadFrom(DB_FILE)) return;

  // Tier 2: Try secondary database_backup_latest.json
  if (tryLoadFrom(BACKUP_LATEST)) {
    console.log('[DB] Restored from latest backup file.');
    saveDatabase();
    return;
  }

  // Tier 3: Try newest snapshot from backups directory
  try {
    if (fs.existsSync(BACKUP_DIR)) {
      const snapshots = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json')).sort().reverse();
      for (const snap of snapshots) {
        if (tryLoadFrom(path.join(BACKUP_DIR, snap))) {
          console.log(`[DB] Restored from snapshot: ${snap}`);
          saveDatabase();
          return;
        }
      }
    }
  } catch (e) {
    console.warn('[DB] Error reading snapshots directory:', e);
  }

  // Tier 4: Only if no database file or backup exists at all
  console.log('[DB] Fresh environment with no previous database. Initializing default templates.');
  saveDatabase();
}

// Initialize DB on boot
loadDatabase();

// Middleware: Large limit for compressed photo payloads and CORS
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ==================== API ROUTES ====================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Full state sync for Admin and Mobile (with lightweight conditional check)
app.get('/api/data', (req, res) => {
  const clientSince = req.query.since as string;
  // If client already has latest version, return tiny 50-byte response to prevent mobile network saturation
  if (clientSince && clientSince === db.lastUpdated) {
    return res.json({
      changed: false,
      lastUpdated: db.lastUpdated
    });
  }

  res.setHeader('ETag', `"${db.lastUpdated}"`);
  res.json({
    changed: true,
    checklists: db.checklists.filter(c => !db.deletedIds.includes(c.id)),
    workOrders: db.workOrders.filter(w => !db.deletedIds.includes(w.id)),
    fleetMonthlyUpdates: (db.fleetMonthlyUpdates || []).filter(u => !db.deletedIds.includes(u.id)),
    fuelLogs: (db.fuelLogs || []).filter(f => !db.deletedIds.includes(f.id)),
    fuelConsumptionRules: (db.fuelConsumptionRules || DEFAULT_FUEL_RULES).filter(r => !db.deletedIds.includes(r.id)),
    nr13Reports: (db.nr13Reports || []).filter(r => !db.deletedIds.includes(r.id)),
    nr13Vessels: (db.nr13Vessels || INITIAL_NR13_VESSELS).filter(v => !db.deletedIds.includes(v.id)),
    valveCalibrations: (db.valveCalibrations || []).filter(v => !db.deletedIds.includes(v.id)),
    gaugeCalibrations: (db.gaugeCalibrations || []).filter(g => !db.deletedIds.includes(g.id)),
    ultrassomEquipments: (db.ultrassomEquipments || []).filter(u => !db.deletedIds.includes(u.id)),
    serviceRequests: (db.serviceRequests || []).filter(s => !db.deletedIds.includes(s.id)),
    operatorServiceReleases: (db.operatorServiceReleases || []).filter(o => !db.deletedIds.includes(o.id)),
    drones: (db.drones || INITIAL_DRONES).filter(d => !db.deletedIds.includes(d.id)),
    deletedIds: db.deletedIds,
    lastUpdated: db.lastUpdated
  });
});

app.get('/api/sync/status', (req, res) => {
  res.json({
    lastUpdated: db.lastUpdated,
    checklistCount: db.checklists.length,
    workOrderCount: db.workOrders.length,
    fleetUpdateCount: (db.fleetMonthlyUpdates || []).length
  });
});

// Checklists endpoints
app.post('/api/checklists', (req, res) => {
  try {
    const incoming = req.body;
    if (!incoming) {
      return res.status(400).json({ error: 'Dados inválidos' });
    }

    // Never resurrect permanently deleted records
    if (incoming.id && db.deletedIds.includes(incoming.id)) {
      return res.json({ success: true, ignored: true, reason: 'Checklist foi excluído permanentemente.' });
    }

    const existingIndex = db.checklists.findIndex(c => c.id === incoming.id);
    let record: ChecklistRecord;

    if (existingIndex >= 0) {
      // Update existing
      record = {
        ...db.checklists[existingIndex],
        ...incoming,
        id: db.checklists[existingIndex].id,
        code: db.checklists[existingIndex].code || incoming.code
      };
      db.checklists[existingIndex] = record;
    } else {
      // Create new
      const nextNum = db.checklists.length + 1;
      const code = incoming.code || `CHK-${String(nextNum).padStart(3, '0')}`;
      record = {
        ...incoming,
        id: incoming.id || `chk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        code,
        createdAt: incoming.createdAt || new Date().toISOString()
      };
      db.checklists.unshift(record);
    }

    saveDatabase();
    res.json({ success: true, checklist: record });
  } catch (err: any) {
    console.error('Error saving checklist:', err);
    res.status(500).json({ error: err.message || 'Erro ao salvar checklist' });
  }
});

app.delete('/api/checklists/:id', (req, res) => {
  try {
    const { id } = req.params;
    const initialLength = db.checklists.length;
    db.checklists = db.checklists.filter(c => c.id !== id);
    if (!db.deletedIds.includes(id)) {
      db.deletedIds.push(id);
    }

    saveDatabase();
    res.json({ success: true, deleted: initialLength !== db.checklists.length, deletedIds: db.deletedIds });
  } catch (err: any) {
    console.error('Error deleting checklist:', err);
    res.status(500).json({ error: err.message || 'Erro ao excluir checklist' });
  }
});

// Work orders endpoints
app.post('/api/work-orders', (req, res) => {
  try {
    const incoming = req.body;
    if (!incoming) {
      return res.status(400).json({ error: 'Dados inválidos' });
    }

    // Never resurrect permanently deleted records
    if (incoming.id && db.deletedIds.includes(incoming.id)) {
      return res.json({ success: true, ignored: true, reason: 'Ordem de serviço foi excluída permanentemente.' });
    }

    const existingIndex = db.workOrders.findIndex(w => w.id === incoming.id);
    let record: WorkOrder;
    const nowIso = new Date().toISOString();

    if (existingIndex >= 0) {
      // Update existing
      record = {
        ...db.workOrders[existingIndex],
        ...incoming,
        id: db.workOrders[existingIndex].id,
        code: db.workOrders[existingIndex].code || incoming.code,
        updatedAt: nowIso
      };
      db.workOrders[existingIndex] = record;
    } else {
      // Create new
      const nextNum = db.workOrders.length + 1;
      const year = new Date().getFullYear();
      const code = incoming.code || `OS-${year}-${String(nextNum).padStart(3, '0')}`;
      record = {
        ...incoming,
        id: incoming.id || `os_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        code,
        createdAt: incoming.createdAt || nowIso,
        updatedAt: nowIso
      };
      db.workOrders.unshift(record);
    }

    // Link to checklist if generated from NC
    if (record.checklistSourceId) {
      db.checklists = db.checklists.map(c => {
        if (c.id === record.checklistSourceId) {
          const currentIds = c.workOrderIds || [];
          const updatedIds = currentIds.includes(record.id) ? currentIds : [...currentIds, record.id];
          return {
            ...c,
            workOrderIds: updatedIds,
            items: c.items.map(item => {
              if (item.description === record.checklistItemDescription) {
                return { ...item, generatedWorkOrderId: record.id };
              }
              return item;
            })
          };
        }
        return c;
      });
    }

    saveDatabase();
    res.json({ success: true, workOrder: record });
  } catch (err: any) {
    console.error('Error saving work order:', err);
    res.status(500).json({ error: err.message || 'Erro ao salvar ordem de serviço' });
  }
});

app.put('/api/work-orders/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const index = db.workOrders.findIndex(w => w.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada' });
    }

    const updated = {
      ...db.workOrders[index],
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    db.workOrders[index] = updated;

    saveDatabase();
    res.json({ success: true, workOrder: updated });
  } catch (err: any) {
    console.error('Error updating work order:', err);
    res.status(500).json({ error: err.message || 'Erro ao atualizar ordem de serviço' });
  }
});

app.delete('/api/work-orders/:id', (req, res) => {
  try {
    const { id } = req.params;
    const initialLength = db.workOrders.length;
    db.workOrders = db.workOrders.filter(w => w.id !== id);
    if (!db.deletedIds.includes(id)) {
      db.deletedIds.push(id);
    }

    saveDatabase();
    res.json({ success: true, deleted: initialLength !== db.workOrders.length, deletedIds: db.deletedIds });
  } catch (err: any) {
    console.error('Error deleting work order:', err);
    res.status(500).json({ error: err.message || 'Erro ao excluir ordem de serviço' });
  }
});

// Monthly Fleet Updates endpoints
app.post('/api/fleet-monthly-updates', (req, res) => {
  try {
    const incoming = req.body;
    if (!incoming) {
      return res.status(400).json({ error: 'Dados inválidos' });
    }

    if (!db.fleetMonthlyUpdates) {
      db.fleetMonthlyUpdates = [];
    }

    // Never resurrect permanently deleted records
    if (incoming.id && db.deletedIds.includes(incoming.id)) {
      return res.json({ success: true, ignored: true, reason: 'Atualização de frota foi excluída permanentemente.' });
    }

    const existingIndex = db.fleetMonthlyUpdates.findIndex(u => u.id === incoming.id);
    let record: VehicleMonthlyUpdate;

    if (existingIndex >= 0) {
      record = {
        ...db.fleetMonthlyUpdates[existingIndex],
        ...incoming,
        id: db.fleetMonthlyUpdates[existingIndex].id,
        code: db.fleetMonthlyUpdates[existingIndex].code || incoming.code,
        updatedAt: new Date().toISOString()
      };
      if (incoming.adminAcknowledged === false) {
        delete record.acknowledgedAt;
        delete record.acknowledgedBy;
        delete record.acknowledgementJustification;
        record.adminAcknowledged = false;
      }
      db.fleetMonthlyUpdates[existingIndex] = record;
    } else {
      const nextNum = db.fleetMonthlyUpdates.length + 1;
      const code = incoming.code || `AMV-2026-${String(nextNum).padStart(3, '0')}`;
      record = {
        ...incoming,
        id: incoming.id || `amv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        code,
        createdAt: incoming.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.fleetMonthlyUpdates.unshift(record);
    }

    saveDatabase();
    res.json({ success: true, fleetMonthlyUpdate: record });
  } catch (err: any) {
    console.error('Error saving fleet monthly update:', err);
    res.status(500).json({ error: err.message || 'Erro ao salvar atualização de frota' });
  }
});

app.delete('/api/fleet-monthly-updates/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (!db.fleetMonthlyUpdates) db.fleetMonthlyUpdates = [];
    const initialLength = db.fleetMonthlyUpdates.length;
    db.fleetMonthlyUpdates = db.fleetMonthlyUpdates.filter(u => u.id !== id);
    if (!db.deletedIds.includes(id)) {
      db.deletedIds.push(id);
    }

    saveDatabase();
    res.json({ success: true, deleted: initialLength !== db.fleetMonthlyUpdates.length, deletedIds: db.deletedIds });
  } catch (err: any) {
    console.error('Error deleting fleet monthly update:', err);
    res.status(500).json({ error: err.message || 'Erro ao excluir atualização de frota' });
  }
});

// ==================== ABASTECIMENTO DE VEÍCULOS & METAS DE CONSUMO ====================

app.post('/api/fuel-logs', (req, res) => {
  try {
    const incoming = req.body;
    if (!incoming || !incoming.plate || !incoming.driver) {
      return res.status(400).json({ error: 'Dados do abastecimento incompletos (placa e condutor obrigatórios)' });
    }
    if (!db.fuelLogs) db.fuelLogs = [];

    if (incoming.id && db.deletedIds.includes(incoming.id)) {
      return res.json({ success: true, ignored: true, reason: 'Abastecimento foi excluído permanentemente.' });
    }

    const existingIdx = db.fuelLogs.findIndex(f => f.id === incoming.id);
    let record: FuelLogRecord;

    if (existingIdx >= 0) {
      const existing = db.fuelLogs[existingIdx];
      record = {
        ...existing,
        ...incoming,
        id: existing.id,
        code: existing.code || incoming.code,
        plate: String(incoming.plate).trim().toUpperCase(),
        liters: Number(incoming.liters),
        km: Number.isFinite(Number(incoming.km)) ? Number(incoming.km) : 0,
        updatedAt: new Date().toISOString()
      };
      db.fuelLogs[existingIdx] = record;
    } else {
      const year = new Date().getFullYear();
      const nextNum = db.fuelLogs.length + 1;
      record = {
        ...incoming,
        id: incoming.id || `fuel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        code: incoming.code || `ABT-${year}-${String(nextNum).padStart(3, '0')}`,
        plate: String(incoming.plate).trim().toUpperCase(),
        liters: Number(incoming.liters),
        km: Number.isFinite(Number(incoming.km)) ? Number(incoming.km) : 0,
        createdAt: incoming.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.fuelLogs.unshift(record);
    }

    saveDatabase();
    res.json({ success: true, fuelLog: record });
  } catch (err: any) {
    console.error('Error saving fuel log:', err);
    res.status(500).json({ error: err.message || 'Erro ao salvar abastecimento' });
  }
});

app.delete('/api/fuel-logs/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (!db.fuelLogs) db.fuelLogs = [];
    const initialLength = db.fuelLogs.length;
    db.fuelLogs = db.fuelLogs.filter(f => f.id !== id);
    if (!db.deletedIds.includes(id)) {
      db.deletedIds.push(id);
    }
    saveDatabase();
    res.json({ success: true, deleted: initialLength !== db.fuelLogs.length, deletedIds: db.deletedIds });
  } catch (err: any) {
    console.error('Error deleting fuel log:', err);
    res.status(500).json({ error: err.message || 'Erro ao excluir abastecimento' });
  }
});

app.post('/api/fuel-configs', (req, res) => {
  try {
    const incoming = req.body;
    if (!incoming || !incoming.plate) {
      return res.status(400).json({ error: 'Placa ou padrão DEFAULT é obrigatório' });
    }
    if (!db.fuelConsumptionRules) db.fuelConsumptionRules = [...DEFAULT_FUEL_RULES];

    const normalizedPlate = String(incoming.plate).trim().toUpperCase() === 'DEFAULT'
      ? 'DEFAULT'
      : String(incoming.plate).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (incoming.id && db.deletedIds.includes(incoming.id)) {
      db.deletedIds = db.deletedIds.filter(d => d !== incoming.id);
    }

    const existingIdx = db.fuelConsumptionRules.findIndex(
      r => (incoming.id && r.id === incoming.id) || r.plate.toUpperCase() === normalizedPlate
    );

    let record: FuelConsumptionRule;
    if (existingIdx >= 0) {
      record = {
        ...db.fuelConsumptionRules[existingIdx],
        ...incoming,
        id: db.fuelConsumptionRules[existingIdx].id,
        plate: normalizedPlate,
        minConsumption: Number(incoming.minConsumption),
        avgConsumption: Number(incoming.avgConsumption),
        maxConsumption: Number(incoming.maxConsumption),
        updatedAt: new Date().toISOString()
      };
      db.fuelConsumptionRules[existingIdx] = record;
    } else {
      record = {
        id: incoming.id || (normalizedPlate === 'DEFAULT' ? 'fcr_default' : `fcr_${normalizedPlate}_${Date.now()}`),
        plate: normalizedPlate,
        minConsumption: Number(incoming.minConsumption),
        avgConsumption: Number(incoming.avgConsumption),
        maxConsumption: Number(incoming.maxConsumption),
        updatedAt: new Date().toISOString()
      };
      db.fuelConsumptionRules.push(record);
    }

    saveDatabase();
    res.json({ success: true, rule: record });
  } catch (err: any) {
    console.error('Error saving fuel consumption config:', err);
    res.status(500).json({ error: err.message || 'Erro ao salvar parâmetro de consumo' });
  }
});

app.post('/api/fuel-configs/batch', (req, res) => {
  try {
    const { rules, deleteRuleIds } = req.body || {};
    if (!db.fuelConsumptionRules) db.fuelConsumptionRules = [...DEFAULT_FUEL_RULES];

    if (Array.isArray(deleteRuleIds) && deleteRuleIds.length > 0) {
      const toDelete = new Set(deleteRuleIds.filter((id: string) => id && id !== 'fcr_default'));
      db.fuelConsumptionRules = db.fuelConsumptionRules.filter(r => !toDelete.has(r.id));
      toDelete.forEach((id: string) => {
        if (!db.deletedIds.includes(id)) db.deletedIds.push(id);
      });
    }

    const savedRules: FuelConsumptionRule[] = [];
    if (Array.isArray(rules)) {
      rules.forEach((incoming: Partial<FuelConsumptionRule>) => {
        if (!incoming || !incoming.plate) return;
        const normalizedPlate = String(incoming.plate).trim().toUpperCase() === 'DEFAULT'
          ? 'DEFAULT'
          : String(incoming.plate).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

        if (incoming.id && db.deletedIds.includes(incoming.id)) {
          db.deletedIds = db.deletedIds.filter(d => d !== incoming.id);
        }

        const existingIdx = db.fuelConsumptionRules!.findIndex(
          r => (incoming.id && r.id === incoming.id) || r.plate.toUpperCase() === normalizedPlate
        );

        let record: FuelConsumptionRule;
        if (existingIdx >= 0) {
          record = {
            ...db.fuelConsumptionRules![existingIdx],
            ...incoming,
            id: db.fuelConsumptionRules![existingIdx].id,
            plate: normalizedPlate,
            minConsumption: Number(incoming.minConsumption),
            avgConsumption: Number(incoming.avgConsumption),
            maxConsumption: Number(incoming.maxConsumption),
            updatedAt: new Date().toISOString()
          };
          db.fuelConsumptionRules![existingIdx] = record;
        } else {
          record = {
            id: incoming.id || (normalizedPlate === 'DEFAULT' ? 'fcr_default' : `fcr_${normalizedPlate}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`),
            plate: normalizedPlate,
            minConsumption: Number(incoming.minConsumption),
            avgConsumption: Number(incoming.avgConsumption),
            maxConsumption: Number(incoming.maxConsumption),
            updatedAt: new Date().toISOString()
          };
          db.fuelConsumptionRules!.push(record);
        }
        savedRules.push(record);
      });
    }

    saveDatabase();
    res.json({ success: true, rules: db.fuelConsumptionRules, savedRules, deletedIds: db.deletedIds });
  } catch (err: any) {
    console.error('Error batch saving fuel consumption configs:', err);
    res.status(500).json({ error: err.message || 'Erro ao salvar parâmetros de consumo em lote' });
  }
});

app.delete('/api/fuel-configs/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (!db.fuelConsumptionRules) db.fuelConsumptionRules = [...DEFAULT_FUEL_RULES];
    if (id === 'fcr_default') {
      return res.status(400).json({ error: 'O parâmetro padrão geral não pode ser excluído, apenas editado.' });
    }
    db.fuelConsumptionRules = db.fuelConsumptionRules.filter(r => r.id !== id);
    if (!db.deletedIds.includes(id)) db.deletedIds.push(id);
    saveDatabase();
    res.json({ success: true, deletedIds: db.deletedIds });
  } catch (err: any) {
    console.error('Error deleting fuel consumption config:', err);
    res.status(500).json({ error: err.message || 'Erro ao excluir parâmetro de consumo' });
  }
});

// ==================== NR-13 & CALIBRAÇÕES ENDPOINTS ====================

app.post('/api/nr13-reports', (req, res) => {
  try {
    const incoming = req.body;
    if (!incoming || !incoming.equipmentTag) {
      return res.status(400).json({ error: 'Dados do laudo NR-13 incompletos' });
    }
    if (!db.nr13Reports) db.nr13Reports = [];

    const existingIdx = db.nr13Reports.findIndex(r => r.id === incoming.id);
    let record: NR13InspectionReport;

    if (existingIdx !== -1) {
      record = {
        ...db.nr13Reports[existingIdx],
        ...incoming,
        id: db.nr13Reports[existingIdx].id,
        code: db.nr13Reports[existingIdx].code || incoming.code,
        updatedAt: new Date().toISOString()
      };
      db.nr13Reports[existingIdx] = record;
    } else {
      const year = new Date().getFullYear();
      const nextNum = db.nr13Reports.length + 1;
      const code = incoming.code || `RT-${String(nextNum).padStart(3, '0')}/${year}`;
      record = {
        ...incoming,
        id: incoming.id || `nr13_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        code,
        createdAt: incoming.createdAt || new Date().toISOString()
      };
      db.nr13Reports.unshift(record);
    }

    saveDatabase();
    res.json({ success: true, report: record, count: db.nr13Reports.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao salvar laudo NR-13' });
  }
});

app.delete('/api/nr13-reports/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (!db.nr13Reports) db.nr13Reports = [];
    db.nr13Reports = db.nr13Reports.filter(r => r.id !== id);
    if (!db.deletedIds.includes(id)) db.deletedIds.push(id);
    saveDatabase();
    res.json({ success: true, deletedIds: db.deletedIds });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao excluir laudo NR-13' });
  }
});

app.post('/api/nr13-vessels', (req, res) => {
  try {
    const incoming = req.body;
    if (!incoming || !incoming.farm || !incoming.vesselNumber) {
      return res.status(400).json({ error: 'Fazenda e Número do Vaso são obrigatórios' });
    }
    if (!db.nr13Vessels) db.nr13Vessels = [...INITIAL_NR13_VESSELS];

    if (incoming.id && db.deletedIds.includes(incoming.id)) {
      return res.json({ success: true, ignored: true, reason: 'Vaso excluído permanentemente.' });
    }

    const existingIdx = db.nr13Vessels.findIndex(
      v => (incoming.id && v.id === incoming.id) || (v.farm === incoming.farm && v.vesselNumber.toLowerCase() === String(incoming.vesselNumber).trim().toLowerCase())
    );
    let record: NR13VesselMaster;

    if (existingIdx !== -1) {
      record = {
        ...db.nr13Vessels[existingIdx],
        ...incoming,
        id: db.nr13Vessels[existingIdx].id,
        updatedAt: new Date().toISOString()
      };
      db.nr13Vessels[existingIdx] = record;
    } else {
      record = {
        ...incoming,
        id: incoming.id || `vessel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        createdAt: incoming.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.nr13Vessels.push(record);
    }

    saveDatabase();
    res.json({ success: true, vessel: record });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao salvar cadastro de vaso NR-13' });
  }
});

app.delete('/api/nr13-vessels/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (!db.nr13Vessels) db.nr13Vessels = [...INITIAL_NR13_VESSELS];
    db.nr13Vessels = db.nr13Vessels.filter(v => v.id !== id);
    if (!db.deletedIds.includes(id)) db.deletedIds.push(id);
    saveDatabase();
    res.json({ success: true, deletedIds: db.deletedIds });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao excluir vaso NR-13' });
  }
});

app.post('/api/valve-calibrations', (req, res) => {
  try {
    const incoming = req.body;
    if (!incoming || !incoming.tag) {
      return res.status(400).json({ error: 'Dados da válvula incompletos' });
    }
    if (!db.valveCalibrations) db.valveCalibrations = [];

    const existingIdx = db.valveCalibrations.findIndex(v => v.id === incoming.id);
    let record: ValveCalibrationRecord;

    if (existingIdx !== -1) {
      record = {
        ...db.valveCalibrations[existingIdx],
        ...incoming,
        id: db.valveCalibrations[existingIdx].id,
        updatedAt: new Date().toISOString()
      };
      db.valveCalibrations[existingIdx] = record;
    } else {
      const nextNum = db.valveCalibrations.length + 1;
      record = {
        ...incoming,
        id: incoming.id || `valv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        code: incoming.code || `CAL-VALV-2026-${String(nextNum).padStart(3, '0')}`,
        createdAt: incoming.createdAt || new Date().toISOString()
      };
      db.valveCalibrations.unshift(record);
    }

    saveDatabase();
    res.json({ success: true, calibration: record });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao salvar calibração de válvula' });
  }
});

app.delete('/api/valve-calibrations/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (!db.valveCalibrations) db.valveCalibrations = [];
    db.valveCalibrations = db.valveCalibrations.filter(v => v.id !== id);
    if (!db.deletedIds.includes(id)) db.deletedIds.push(id);
    saveDatabase();
    res.json({ success: true, deletedIds: db.deletedIds });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao excluir calibração de válvula' });
  }
});

app.post('/api/gauge-calibrations', (req, res) => {
  try {
    const incoming = req.body;
    if (!incoming || !incoming.tag) {
      return res.status(400).json({ error: 'Dados do manômetro incompletos' });
    }
    if (!db.gaugeCalibrations) db.gaugeCalibrations = [];

    const existingIdx = db.gaugeCalibrations.findIndex(g => g.id === incoming.id);
    let record: GaugeCalibrationRecord;

    if (existingIdx !== -1) {
      record = {
        ...db.gaugeCalibrations[existingIdx],
        ...incoming,
        id: db.gaugeCalibrations[existingIdx].id,
        updatedAt: new Date().toISOString()
      };
      db.gaugeCalibrations[existingIdx] = record;
    } else {
      const nextNum = db.gaugeCalibrations.length + 1;
      record = {
        ...incoming,
        id: incoming.id || `gauge_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        code: incoming.code || `CAL-MAN-2026-${String(nextNum).padStart(3, '0')}`,
        createdAt: incoming.createdAt || new Date().toISOString()
      };
      db.gaugeCalibrations.unshift(record);
    }

    saveDatabase();
    res.json({ success: true, calibration: record });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao salvar calibração de manômetro' });
  }
});

app.delete('/api/gauge-calibrations/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (!db.gaugeCalibrations) db.gaugeCalibrations = [];
    db.gaugeCalibrations = db.gaugeCalibrations.filter(g => g.id !== id);
    if (!db.deletedIds.includes(id)) db.deletedIds.push(id);
    saveDatabase();
    res.json({ success: true, deletedIds: db.deletedIds });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao excluir calibração de manômetro' });
  }
});

app.post('/api/ultrassom-equipments', (req, res) => {
  try {
    const incoming = req.body;
    if (!incoming || !incoming.name) {
      return res.status(400).json({ error: 'Nome do equipamento de aferição obrigatório' });
    }
    if (!db.ultrassomEquipments) db.ultrassomEquipments = [];

    const existingIdx = db.ultrassomEquipments.findIndex(u => u.id === incoming.id);
    let record: UltrassomEquipmentRecord;

    if (existingIdx !== -1) {
      record = {
        ...db.ultrassomEquipments[existingIdx],
        ...incoming,
        id: db.ultrassomEquipments[existingIdx].id,
        updatedAt: new Date().toISOString()
      };
      db.ultrassomEquipments[existingIdx] = record;
    } else {
      record = {
        ...incoming,
        id: incoming.id || `ultra_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        createdAt: incoming.createdAt || new Date().toISOString()
      };
      db.ultrassomEquipments.unshift(record);
    }

    saveDatabase();
    res.json({ success: true, equipment: record });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao salvar equipamento de aferição' });
  }
});

app.delete('/api/ultrassom-equipments/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (!db.ultrassomEquipments) db.ultrassomEquipments = [];
    db.ultrassomEquipments = db.ultrassomEquipments.filter(u => u.id !== id);
    if (!db.deletedIds.includes(id)) db.deletedIds.push(id);
    saveDatabase();
    res.json({ success: true, deletedIds: db.deletedIds });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao excluir equipamento de aferição' });
  }
});

// ==================== SOLICITAÇÕES DE SERVIÇO & LIBERAÇÃO EXCLUSIVA ====================

app.post('/api/service-requests', (req, res) => {
  try {
    const incoming = req.body;
    if (!incoming || !incoming.requesterName || !incoming.problemDescription) {
      return res.status(400).json({ error: 'Dados da solicitação de serviço incompletos' });
    }
    if (!db.serviceRequests) db.serviceRequests = [];

    if (incoming.id && db.deletedIds.includes(incoming.id)) {
      return res.json({ success: true, ignored: true, reason: 'Solicitação foi excluída permanentemente.' });
    }

    const existingIdx = db.serviceRequests.findIndex(s => s.id === incoming.id);
    let record: ServiceRequest;

    if (existingIdx !== -1) {
      const existing = db.serviceRequests[existingIdx];
      const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      const incomingTime = new Date(incoming.updatedAt || incoming.createdAt || 0).getTime();
      if (existingTime > 0 && incomingTime > 0 && incomingTime < existingTime) {
        return res.json({ success: true, serviceRequest: existing, staleIgnored: true });
      }
      record = {
        ...existing,
        ...incoming,
        id: existing.id,
        code: existing.code || incoming.code,
        updatedAt: incoming.updatedAt || new Date().toISOString()
      };
      db.serviceRequests[existingIdx] = record;
    } else {
      const year = new Date().getFullYear();
      const nextNum = db.serviceRequests.length + 1;
      record = {
        ...incoming,
        id: incoming.id || `ss_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        code: incoming.code || `SS-${year}-${String(nextNum).padStart(3, '0')}`,
        status: incoming.status || 'PENDENTE',
        createdAt: incoming.createdAt || new Date().toISOString(),
        updatedAt: incoming.updatedAt || new Date().toISOString()
      };
      db.serviceRequests.unshift(record);
    }

    saveDatabase();
    res.json({ success: true, serviceRequest: record });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao salvar solicitação de serviço' });
  }
});

app.delete('/api/service-requests/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (!db.serviceRequests) db.serviceRequests = [];
    db.serviceRequests = db.serviceRequests.filter(s => s.id !== id);
    if (!db.deletedIds.includes(id)) db.deletedIds.push(id);
    saveDatabase();
    res.json({ success: true, deletedIds: db.deletedIds });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao excluir solicitação de serviço' });
  }
});

app.post('/api/operator-releases', (req, res) => {
  try {
    const incoming = req.body;
    if (!incoming || !incoming.operatorName) {
      return res.status(400).json({ error: 'Nome do operador/técnico é obrigatório' });
    }
    if (!db.operatorServiceReleases) db.operatorServiceReleases = [];

    if (incoming.id && db.deletedIds.includes(incoming.id)) {
      return res.json({ success: true, ignored: true, reason: 'Liberação foi excluída permanentemente.' });
    }

    const existingIdx = db.operatorServiceReleases.findIndex(
      o => (incoming.id && o.id === incoming.id) || (incoming.token && o.token === incoming.token)
    );
    let record: OperatorServiceRelease;

    if (existingIdx !== -1) {
      const existing = db.operatorServiceReleases[existingIdx];
      const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      const incomingTime = new Date(incoming.updatedAt || incoming.createdAt || 0).getTime();
      if (existingTime > 0 && incomingTime > 0 && incomingTime < existingTime) {
        return res.json({ success: true, release: existing, staleIgnored: true });
      }
      record = {
        ...existing,
        ...incoming,
        id: existing.id,
        token: existing.token,
        updatedAt: incoming.updatedAt || new Date().toISOString()
      };
      db.operatorServiceReleases[existingIdx] = record;
    } else {
      const randomToken = `ss_key_${Math.random().toString(36).substring(2, 8)}${Date.now().toString(36).slice(-4)}`;
      record = {
        id: incoming.id || `rel_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        token: incoming.token || randomToken,
        operatorName: incoming.operatorName.trim(),
        farm: incoming.farm || 'TODAS',
        active: incoming.active !== undefined ? Boolean(incoming.active) : true,
        createdAt: incoming.createdAt || new Date().toISOString(),
        updatedAt: incoming.updatedAt || new Date().toISOString()
      };
      db.operatorServiceReleases.unshift(record);
    }

    saveDatabase();
    res.json({ success: true, release: record });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao salvar liberação exclusiva' });
  }
});

app.delete('/api/operator-releases/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (!db.operatorServiceReleases) db.operatorServiceReleases = [];
    db.operatorServiceReleases = db.operatorServiceReleases.filter(o => o.id !== id);
    if (!db.deletedIds.includes(id)) db.deletedIds.push(id);
    saveDatabase();
    res.json({ success: true, deletedIds: db.deletedIds });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao excluir liberação exclusiva' });
  }
});

app.post('/api/drones', (req, res) => {
  try {
    const incoming = req.body;
    if (!incoming || (!incoming.label && !incoming.name)) {
      return res.status(400).json({ error: 'Identificação do drone é obrigatória' });
    }
    if (!db.drones) db.drones = [...INITIAL_DRONES];

    if (incoming.id && db.deletedIds.includes(incoming.id)) {
      return res.json({ success: true, ignored: true, reason: 'Drone foi excluído permanentemente.' });
    }

    const name = String(incoming.name || incoming.label || '').trim();
    const model = String(incoming.model || '').trim();
    const label = String(incoming.label || (model ? `${name} (${model})` : name)).trim();

    const existingIdx = db.drones.findIndex(
      d => (incoming.id && d.id === incoming.id) || d.label.toLowerCase() === label.toLowerCase()
    );

    let record: DroneAsset;
    if (existingIdx >= 0) {
      record = {
        ...db.drones[existingIdx],
        ...incoming,
        name: name || db.drones[existingIdx].name,
        model: model || db.drones[existingIdx].model,
        label
      };
      db.drones[existingIdx] = record;
    } else {
      record = {
        id: incoming.id || `dr_asset_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name,
        model,
        label,
        farm: incoming.farm || undefined,
        createdAt: incoming.createdAt || new Date().toISOString()
      };
      db.drones.push(record);
    }

    saveDatabase();
    res.json({ success: true, drone: record });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao salvar drone' });
  }
});

app.delete('/api/drones/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (!db.drones) db.drones = [...INITIAL_DRONES];
    db.drones = db.drones.filter(d => d.id !== id);
    if (!db.deletedIds.includes(id)) db.deletedIds.push(id);
    saveDatabase();
    res.json({ success: true, deletedIds: db.deletedIds });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao excluir drone' });
  }
});

// Auto-save endpoint for live drafts in progress (satisfies: "tudo que for preenchido precisa subir para a base admin, independente de está finalizada ou não.")
app.post('/api/auto-save', (req, res) => {
  try {
    const { type, data } = req.body;
    if (!type || !data || !data.id) {
      return res.status(400).json({ error: 'Parâmetros incompletos ou ID ausente' });
    }

    // Do not resurrect permanently deleted records
    if (data.id && db.deletedIds.includes(data.id)) {
      return res.json({ success: true, ignored: true });
    }

    if (type === 'checklist') {
      const sanitized = {
        ...data,
        items: Array.isArray(data.items) ? data.items : [],
        isDraft: data.isDraft !== false
      };
      const existingIdx = db.checklists.findIndex(c => c.id === data.id);
      if (existingIdx >= 0) {
        db.checklists[existingIdx] = { ...db.checklists[existingIdx], ...sanitized };
      } else {
        db.checklists.unshift(sanitized);
      }
    } else if (type === 'work-order') {
      const existingIdx = db.workOrders.findIndex(w => w.id === data.id);
      if (existingIdx >= 0) {
        db.workOrders[existingIdx] = { ...db.workOrders[existingIdx], ...data, updatedAt: new Date().toISOString() };
      } else {
        db.workOrders.unshift({ ...data, updatedAt: new Date().toISOString() });
      }
    } else if (type === 'fleet-update') {
      if (!db.fleetMonthlyUpdates) db.fleetMonthlyUpdates = [];
      const existingIdx = db.fleetMonthlyUpdates.findIndex(u => u.id === data.id);
      if (existingIdx >= 0) {
        db.fleetMonthlyUpdates[existingIdx] = { ...db.fleetMonthlyUpdates[existingIdx], ...data };
      } else {
        db.fleetMonthlyUpdates.unshift(data);
      }
    }

    saveDatabase();
    res.json({ success: true, lastUpdated: db.lastUpdated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao salvar rascunho' });
  }
});

// Batch synchronization for merging mobile and desktop records in a single payload
app.post('/api/sync/batch', (req, res) => {
  try {
    const { 
      checklists: incomingChecklists, 
      workOrders: incomingWorkOrders,
      fleetMonthlyUpdates: incomingFleetUpdates,
      fuelLogs: incomingFuelLogs,
      fuelConsumptionRules: incomingFuelRules,
      serviceRequests: incomingServiceRequests,
      operatorServiceReleases: incomingOperatorReleases,
      drones: incomingDrones,
      nr13Vessels: incomingNr13Vessels,
      deletedIds: incomingDeletedIds 
    } = req.body || {};
    let changed = false;

    if (!db.fleetMonthlyUpdates) db.fleetMonthlyUpdates = [];
    if (!db.fuelLogs) db.fuelLogs = [];
    if (!db.fuelConsumptionRules) db.fuelConsumptionRules = [...DEFAULT_FUEL_RULES];
    if (!db.serviceRequests) db.serviceRequests = [];
    if (!db.operatorServiceReleases) db.operatorServiceReleases = [];
    if (!db.drones) db.drones = [...INITIAL_DRONES];
    if (!db.nr13Vessels) db.nr13Vessels = [...INITIAL_NR13_VESSELS];

    // 1. Process tombstones first
    if (Array.isArray(incomingDeletedIds) && incomingDeletedIds.length > 0) {
      for (const dId of incomingDeletedIds) {
        if (!db.deletedIds.includes(dId)) {
          db.deletedIds.push(dId);
          changed = true;
        }
      }
      db.checklists = db.checklists.filter(c => !db.deletedIds.includes(c.id));
      db.workOrders = db.workOrders.filter(w => !db.deletedIds.includes(w.id));
      db.fleetMonthlyUpdates = db.fleetMonthlyUpdates.filter(u => !db.deletedIds.includes(u.id));
      db.fuelLogs = db.fuelLogs.filter(f => !db.deletedIds.includes(f.id));
      db.fuelConsumptionRules = db.fuelConsumptionRules.filter(r => !db.deletedIds.includes(r.id));
      db.serviceRequests = db.serviceRequests.filter(s => !db.deletedIds.includes(s.id));
      db.operatorServiceReleases = db.operatorServiceReleases.filter(o => !db.deletedIds.includes(o.id));
      db.drones = db.drones.filter(d => !db.deletedIds.includes(d.id));
      db.nr13Vessels = db.nr13Vessels.filter(v => !db.deletedIds.includes(v.id));
    }

    if (Array.isArray(incomingChecklists) && incomingChecklists.length > 0) {
      for (const item of incomingChecklists) {
        if (!item || !item.id) continue;
        if (db.deletedIds.includes(item.id)) continue;
        const idx = db.checklists.findIndex(c => c.id === item.id);
        if (idx >= 0) {
          db.checklists[idx] = { ...db.checklists[idx], ...item };
        } else {
          db.checklists.unshift(item);
        }
        changed = true;
      }
    }

    if (Array.isArray(incomingWorkOrders) && incomingWorkOrders.length > 0) {
      for (const item of incomingWorkOrders) {
        if (!item || !item.id) continue;
        if (db.deletedIds.includes(item.id)) continue;
        const idx = db.workOrders.findIndex(w => w.id === item.id);
        if (idx >= 0) {
          db.workOrders[idx] = { ...db.workOrders[idx], ...item };
        } else {
          db.workOrders.unshift(item);
        }
        changed = true;
      }
    }

    if (Array.isArray(incomingFleetUpdates) && incomingFleetUpdates.length > 0) {
      for (const item of incomingFleetUpdates) {
        if (!item || !item.id) continue;
        if (db.deletedIds.includes(item.id)) continue;
        const idx = db.fleetMonthlyUpdates.findIndex(u => u.id === item.id);
        if (idx >= 0) {
          db.fleetMonthlyUpdates[idx] = { ...db.fleetMonthlyUpdates[idx], ...item };
        } else {
          db.fleetMonthlyUpdates.unshift(item);
        }
        changed = true;
      }
    }

    if (Array.isArray(incomingServiceRequests) && incomingServiceRequests.length > 0) {
      for (const item of incomingServiceRequests) {
        if (!item || !item.id) continue;
        if (db.deletedIds.includes(item.id)) continue;
        const idx = db.serviceRequests.findIndex(s => s.id === item.id);
        if (idx >= 0) {
          const existing = db.serviceRequests[idx];
          const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
          const incomingTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
          if (incomingTime >= existingTime) {
            db.serviceRequests[idx] = { ...existing, ...item };
            changed = true;
          }
        } else {
          db.serviceRequests.unshift(item);
          changed = true;
        }
      }
    }

    if (Array.isArray(incomingOperatorReleases) && incomingOperatorReleases.length > 0) {
      for (const item of incomingOperatorReleases) {
        if (!item || !item.id) continue;
        if (db.deletedIds.includes(item.id)) continue;
        const idx = db.operatorServiceReleases.findIndex(o => o.id === item.id || (item.token && o.token === item.token));
        if (idx >= 0) {
          const existing = db.operatorServiceReleases[idx];
          const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
          const incomingTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
          if (incomingTime >= existingTime) {
            db.operatorServiceReleases[idx] = { ...existing, ...item };
            changed = true;
          }
        } else {
          db.operatorServiceReleases.unshift(item);
          changed = true;
        }
      }
    }

    if (Array.isArray(incomingDrones) && incomingDrones.length > 0) {
      for (const item of incomingDrones) {
        if (!item || !item.id) continue;
        if (db.deletedIds.includes(item.id)) continue;
        const idx = db.drones.findIndex(d => d.id === item.id || d.label.toLowerCase() === String(item.label || '').toLowerCase());
        if (idx >= 0) {
          db.drones[idx] = { ...db.drones[idx], ...item };
        } else {
          db.drones.push(item);
        }
        changed = true;
      }
    }

    if (Array.isArray(incomingNr13Vessels) && incomingNr13Vessels.length > 0) {
      for (const item of incomingNr13Vessels) {
        if (!item || !item.id) continue;
        if (db.deletedIds.includes(item.id) || LEGACY_SAMPLE_VESSEL_IDS.includes(item.id)) continue;
        const idx = db.nr13Vessels.findIndex(v => v.id === item.id || (v.farm === item.farm && v.vesselNumber === item.vesselNumber));
        if (idx >= 0) {
          db.nr13Vessels[idx] = { ...db.nr13Vessels[idx], ...item };
        } else {
          db.nr13Vessels.push(item);
        }
        changed = true;
      }
    }

    if (Array.isArray(incomingFuelLogs) && incomingFuelLogs.length > 0) {
      for (const item of incomingFuelLogs) {
        if (!item || !item.id) continue;
        if (db.deletedIds.includes(item.id)) continue;
        const idx = db.fuelLogs.findIndex(f => f.id === item.id);
        if (idx >= 0) {
          const existing = db.fuelLogs[idx];
          const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
          const incomingTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
          if (incomingTime >= existingTime) {
            db.fuelLogs[idx] = { ...existing, ...item };
            changed = true;
          }
        } else {
          db.fuelLogs.unshift(item);
          changed = true;
        }
      }
    }

    if (Array.isArray(incomingFuelRules) && incomingFuelRules.length > 0) {
      for (const item of incomingFuelRules) {
        if (!item || !item.id || !item.plate) continue;
        if (db.deletedIds.includes(item.id)) continue;
        const idx = db.fuelConsumptionRules.findIndex(r => r.id === item.id || r.plate === item.plate);
        if (idx >= 0) {
          const existing = db.fuelConsumptionRules[idx];
          const existingTime = new Date(existing.updatedAt || 0).getTime();
          const incomingTime = new Date(item.updatedAt || 0).getTime();
          if (incomingTime >= existingTime) {
            db.fuelConsumptionRules[idx] = { ...existing, ...item };
            changed = true;
          }
        } else {
          db.fuelConsumptionRules.push(item);
          changed = true;
        }
      }
    }

    if (changed) {
      saveDatabase();
    }

    res.json({
      success: true,
      checklists: db.checklists.filter(c => !db.deletedIds.includes(c.id)),
      workOrders: db.workOrders.filter(w => !db.deletedIds.includes(w.id)),
      fleetMonthlyUpdates: db.fleetMonthlyUpdates.filter(u => !db.deletedIds.includes(u.id)),
      fuelLogs: db.fuelLogs.filter(f => !db.deletedIds.includes(f.id)),
      fuelConsumptionRules: db.fuelConsumptionRules.filter(r => !db.deletedIds.includes(r.id)),
      serviceRequests: db.serviceRequests.filter(s => !db.deletedIds.includes(s.id)),
      operatorServiceReleases: db.operatorServiceReleases.filter(o => !db.deletedIds.includes(o.id)),
      drones: db.drones.filter(d => !db.deletedIds.includes(d.id)),
      nr13Vessels: db.nr13Vessels.filter(v => !db.deletedIds.includes(v.id)),
      deletedIds: db.deletedIds,
      lastUpdated: db.lastUpdated
    });
  } catch (err: any) {
    console.error('Batch sync error:', err);
    res.status(500).json({ error: err.message || 'Erro no sync batch' });
  }
});

// Backup Export & Import endpoints for complete history safety
app.get('/api/backup/export', (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="agromanutencao_backup_${timestamp}.json"`);
    res.send(JSON.stringify(db, null, 2));
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao exportar backup de dados' });
  }
});

app.post('/api/backup/import', (req, res) => {
  try {
    const incoming = req.body;
    if (!incoming || !Array.isArray(incoming.checklists) || !Array.isArray(incoming.workOrders)) {
      return res.status(400).json({ error: 'Arquivo de backup inválido. É necessário conter as listas de checklists e ordens de serviço.' });
    }

    // Save emergency snapshot of current state before replacing
    try {
      const emergencyPath = path.join(BACKUP_DIR, `emergency_pre_import_${Date.now()}.json`);
      fs.writeFileSync(emergencyPath, JSON.stringify(db, null, 2), 'utf-8');
    } catch {}

    db = {
      checklists: incoming.checklists,
      workOrders: incoming.workOrders,
      fleetMonthlyUpdates: Array.isArray(incoming.fleetMonthlyUpdates) ? incoming.fleetMonthlyUpdates : [],
      fuelLogs: Array.isArray(incoming.fuelLogs) ? incoming.fuelLogs : (db.fuelLogs || []),
      fuelConsumptionRules: Array.isArray(incoming.fuelConsumptionRules) && incoming.fuelConsumptionRules.length > 0 ? incoming.fuelConsumptionRules : (db.fuelConsumptionRules || [...DEFAULT_FUEL_RULES]),
      nr13Reports: Array.isArray(incoming.nr13Reports) ? incoming.nr13Reports : (db.nr13Reports || []),
      nr13Vessels: Array.isArray(incoming.nr13Vessels) && incoming.nr13Vessels.length > 0 ? incoming.nr13Vessels : (db.nr13Vessels || [...INITIAL_NR13_VESSELS]),
      valveCalibrations: Array.isArray(incoming.valveCalibrations) ? incoming.valveCalibrations : (db.valveCalibrations || []),
      gaugeCalibrations: Array.isArray(incoming.gaugeCalibrations) ? incoming.gaugeCalibrations : (db.gaugeCalibrations || []),
      ultrassomEquipments: Array.isArray(incoming.ultrassomEquipments) ? incoming.ultrassomEquipments : (db.ultrassomEquipments || [...INITIAL_ULTRASSOM_EQUIPMENTS]),
      serviceRequests: Array.isArray(incoming.serviceRequests) ? incoming.serviceRequests : (db.serviceRequests || []),
      operatorServiceReleases: Array.isArray(incoming.operatorServiceReleases) ? incoming.operatorServiceReleases : (db.operatorServiceReleases || []),
      drones: Array.isArray(incoming.drones) && incoming.drones.length > 0 ? incoming.drones : (db.drones || [...INITIAL_DRONES]),
      deletedIds: Array.isArray(incoming.deletedIds) ? incoming.deletedIds : [],
      lastUpdated: new Date().toISOString()
    };

    saveDatabase();
    res.json({
      success: true,
      message: `Backup restaurado com sucesso! ${db.checklists.length} checklists, ${db.workOrders.length} ordens de serviço e ${db.fleetMonthlyUpdates.length} atualizações de frota carregados.`,
      checklists: db.checklists,
      workOrders: db.workOrders,
      fleetMonthlyUpdates: db.fleetMonthlyUpdates,
      fuelLogs: db.fuelLogs,
      fuelConsumptionRules: db.fuelConsumptionRules,
      deletedIds: db.deletedIds
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao importar backup' });
  }
});

// Reset / Clear tests endpoints
app.post('/api/reset', (req, res) => {
  try {
    // Preserve emergency backup of current data before resetting
    try {
      const emergencyPath = path.join(BACKUP_DIR, `emergency_pre_reset_${Date.now()}.json`);
      fs.writeFileSync(emergencyPath, JSON.stringify(db, null, 2), 'utf-8');
    } catch {}

    db = {
      checklists: [...INITIAL_CHECKLISTS],
      workOrders: [...INITIAL_WORK_ORDERS],
      fleetMonthlyUpdates: [...INITIAL_FLEET_UPDATES],
      fuelLogs: db.fuelLogs || [],
      fuelConsumptionRules: db.fuelConsumptionRules || [...DEFAULT_FUEL_RULES],
      nr13Reports: [...INITIAL_NR13_REPORTS],
      nr13Vessels: [...INITIAL_NR13_VESSELS],
      valveCalibrations: [...INITIAL_VALVE_CALIBRATIONS],
      gaugeCalibrations: [...INITIAL_GAUGE_CALIBRATIONS],
      ultrassomEquipments: [...INITIAL_ULTRASSOM_EQUIPMENTS],
      serviceRequests: db.serviceRequests || [],
      operatorServiceReleases: db.operatorServiceReleases || [],
      drones: [...INITIAL_DRONES],
      deletedIds: [],
      lastUpdated: new Date().toISOString()
    };
    saveDatabase();
    res.json({ success: true, message: 'Dados restaurados com sucesso (backup de emergência gerado)', deletedIds: db.deletedIds });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clear-tests', (req, res) => {
  try {
    // Keep initial standard templates/records and permanently record test record IDs as deleted
    const initialChecklistIds = new Set(INITIAL_CHECKLISTS.map(c => c.id));
    const initialWorkOrderIds = new Set(INITIAL_WORK_ORDERS.map(w => w.id));

    const clearedChecklists = db.checklists.filter(c => !initialChecklistIds.has(c.id));
    const clearedWorkOrders = db.workOrders.filter(w => !initialWorkOrderIds.has(w.id));

    for (const c of clearedChecklists) {
      if (!db.deletedIds.includes(c.id)) db.deletedIds.push(c.id);
    }
    for (const w of clearedWorkOrders) {
      if (!db.deletedIds.includes(w.id)) db.deletedIds.push(w.id);
    }

    db.checklists = db.checklists.filter(c => initialChecklistIds.has(c.id));
    db.workOrders = db.workOrders.filter(w => initialWorkOrderIds.has(w.id));

    saveDatabase();
    res.json({ 
      success: true, 
      message: 'Registros de teste excluídos permanentemente com sucesso.',
      checklists: db.checklists,
      workOrders: db.workOrders,
      deletedIds: db.deletedIds
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/restore-item', (req, res) => {
  try {
    const { type, id } = req.body;
    if (!type || !id) {
      return res.status(400).json({ error: 'Tipo e ID são obrigatórios' });
    }

    // Un-tombstone if explicitly restored by Admin
    db.deletedIds = db.deletedIds.filter(dId => dId !== id);

    if (type === 'checklist') {
      const template = INITIAL_CHECKLISTS.find(c => c.id === id);
      if (!template) {
        return res.status(404).json({ error: 'Modelo de checklist padrão não encontrado' });
      }
      const existingIdx = db.checklists.findIndex(c => c.id === id);
      if (existingIdx >= 0) {
        db.checklists[existingIdx] = { ...template };
      } else {
        db.checklists.unshift({ ...template });
      }
    } else if (type === 'work-order') {
      const template = INITIAL_WORK_ORDERS.find(w => w.id === id);
      if (!template) {
        return res.status(404).json({ error: 'Modelo de ordem de serviço padrão não encontrado' });
      }
      const existingIdx = db.workOrders.findIndex(w => w.id === id);
      if (existingIdx >= 0) {
        db.workOrders[existingIdx] = { ...template };
      } else {
        db.workOrders.unshift({ ...template });
      }
    }

    saveDatabase();
    res.json({
      success: true,
      message: 'Item restaurado individualmente com sucesso',
      checklists: db.checklists,
      workOrders: db.workOrders,
      deletedIds: db.deletedIds
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao restaurar item' });
  }
});

// ==================== VITE / STATIC SERVING ====================

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  // Ensure mobile browsers (Android Chrome / iOS Safari) never hold a stale cached index.html
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api/') && !req.path.includes('.')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    next();
  });

  if (!isProd) {
    // Mount Vite dev server middlewares dynamically only in development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.endsWith('sw.js') || filePath.endsWith('manifest.webmanifest')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        }
      }
    }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AgroCheck Server] Rodando com sucesso na porta ${PORT} (0.0.0.0)`);
  });
}

startServer().catch((err) => {
  console.error('[AgroCheck Server] Falha ao iniciar:', err);
  process.exit(1);
});
