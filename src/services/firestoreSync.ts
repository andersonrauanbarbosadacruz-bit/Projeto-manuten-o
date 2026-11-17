import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Unsubscribe
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { FARMS } from '../types';

export type FirestoreCollectionName =
  | 'checklists'
  | 'workOrders'
  | 'fleetMonthlyUpdates'
  | 'fuelLogs'
  | 'fuelConsumptionRules'
  | 'vehicles'
  | 'drones'
  | 'serviceRequests'
  | 'operatorServiceReleases'
  | 'nr13Reports'
  | 'nr13Vessels'
  | 'valveCalibrations'
  | 'gaugeCalibrations'
  | 'ultrassomEquipments'
  | 'deletedTombstones';

const VALID_FARMS = new Set<string>(FARMS);
const MAX_FIRESTORE_DOC_BYTES = 900_000;

function stripUndefinedAndNull(value: any): any {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) {
    return value
      .map((item) => stripUndefinedAndNull(item))
      .filter((item) => item !== undefined);
  }
  if (typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      const cleaned = stripUndefinedAndNull(v);
      if (cleaned !== undefined) {
        out[k] = cleaned;
      }
    }
    return out;
  }
  return value;
}

function clampString(val: unknown, maxLen: number, fallback = ''): string {
  const s = typeof val === 'string' ? val : val !== undefined && val !== null ? String(val) : fallback;
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function validFarmOrDefault(farm: unknown): string {
  const f = typeof farm === 'string' ? farm : '';
  return VALID_FARMS.has(f) ? f : 'Matriz';
}

function enforceDocByteLimit(docObj: Record<string, any>): Record<string, any> {
  try {
    const encoder = new TextEncoder();
    const clone = { ...docObj };
    if (typeof clone.equipmentPhoto === 'string' && clone.equipmentPhoto.length > 380_000) {
      delete clone.equipmentPhoto;
    }
    const size = encoder.encode(JSON.stringify(clone)).length;
    if (size <= MAX_FIRESTORE_DOC_BYTES) return clone;
    // Strip heavy base64 attachments/photos cleanly if document exceeds 900KB
    if (Array.isArray(clone.photos) && clone.photos.length > 2) {
      clone.photos = clone.photos.slice(0, 2);
    }
    if (Array.isArray(clone.photosBefore) && clone.photosBefore.length > 2) {
      clone.photosBefore = clone.photosBefore.slice(0, 2);
    }
    if (Array.isArray(clone.photosAfter) && clone.photosAfter.length > 2) {
      clone.photosAfter = clone.photosAfter.slice(0, 2);
    }
    if (Array.isArray(clone.incidentPhotos) && clone.incidentPhotos.length > 2) {
      clone.incidentPhotos = clone.incidentPhotos.slice(0, 2);
    }
    if (typeof clone.equipmentPhoto === 'string' && clone.equipmentPhoto.length > 200_000) {
      delete clone.equipmentPhoto;
    }
    for (const attKey of ['artAttachment', 'valveCalibrationAttachment', 'ultrassomAttachment', 'certificateAttachment']) {
      if (clone[attKey] && encoder.encode(JSON.stringify(clone)).length > MAX_FIRESTORE_DOC_BYTES) {
        delete clone[attKey];
      }
    }
    if (Array.isArray(clone.items) && encoder.encode(JSON.stringify(clone)).length > MAX_FIRESTORE_DOC_BYTES) {
      clone.items = clone.items.map((it: any) => {
        if (it && typeof it.photoUrl === 'string' && it.photoUrl.length > 80_000) {
          const { photoUrl, ...rest } = it;
          return rest;
        }
        return it;
      });
    }
    return clone;
  } catch {
    return docObj;
  }
}

export function sanitizeForFirestore(col: FirestoreCollectionName, raw: any): Record<string, any> {
  const nowIso = new Date().toISOString();
  const base = stripUndefinedAndNull(raw) || {};

  let normalized: Record<string, any> = {};

  switch (col) {
    case 'checklists': {
      const validTypes = ['SALA_DE_MAQUINAS', 'GERADOR', 'IRRIGACAO', 'DRONE', 'VEICULO'];
      const validStatuses = ['CONFORME', 'COM_PENDENCIAS', 'CRITICO', 'EM_ANDAMENTO'];
      normalized = {
        ...base,
        id: clampString(base.id, 128),
        code: clampString(base.code || 'CHK-RASCUNHO', 64),
        type: validTypes.includes(base.type) ? base.type : 'SALA_DE_MAQUINAS',
        farm: validFarmOrDefault(base.farm),
        location: clampString(base.location ?? '', 200),
        date: clampString(base.date || nowIso.slice(0, 10), 32),
        time: clampString(base.time || '00:00', 16),
        inspector: clampString(base.inspector || 'Operador', 120),
        items: Array.isArray(base.items) ? base.items.slice(0, 120) : [],
        statusSummary: validStatuses.includes(base.statusSummary) ? base.statusSummary : 'EM_ANDAMENTO',
        createdAt: clampString(base.createdAt || nowIso, 64)
      };
      if (normalized.shift !== undefined) normalized.shift = clampString(normalized.shift, 40);
      if (normalized.droneModel !== undefined) normalized.droneModel = clampString(normalized.droneModel, 120);
      if (normalized.vehiclePlate !== undefined) normalized.vehiclePlate = clampString(normalized.vehiclePlate, 32);
      if (normalized.vehicleModel !== undefined) normalized.vehicleModel = clampString(normalized.vehicleModel, 120);
      if (normalized.generalNotes !== undefined) normalized.generalNotes = clampString(normalized.generalNotes, 4000);
      if (normalized.signatureUrl !== undefined) normalized.signatureUrl = clampString(normalized.signatureUrl, 350000);
      if (Array.isArray(normalized.workOrderIds)) normalized.workOrderIds = normalized.workOrderIds.slice(0, 100);
      break;
    }

    case 'workOrders': {
      const validMaint = ['PREVENTIVA', 'CORRETIVA'];
      const validStatus = ['ABERTA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA', 'RASCUNHO'];
      const validPriority = ['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'];
      normalized = {
        ...base,
        id: clampString(base.id, 128),
        code: clampString(base.code || 'OS-RASCUNHO', 64),
        farm: validFarmOrDefault(base.farm),
        equipment: clampString(base.equipment || 'Equipamento', 200),
        maintenanceType: validMaint.includes(base.maintenanceType) ? base.maintenanceType : 'CORRETIVA',
        date: clampString(base.date || nowIso.slice(0, 10), 32),
        time: clampString(base.time || '00:00', 16),
        location: clampString(base.location ?? '', 200),
        responsible: clampString(base.responsible ?? 'Operador', 120),
        thirdParty: clampString(base.thirdParty ?? 'Não / Equipe Interna', 160),
        isThirdParty: Boolean(base.isThirdParty),
        problemDescription: clampString(base.problemDescription ?? '', 4000),
        materials: Array.isArray(base.materials) ? base.materials.slice(0, 100) : [],
        photosBefore: Array.isArray(base.photosBefore) ? base.photosBefore.slice(0, 20) : [],
        photosAfter: Array.isArray(base.photosAfter) ? base.photosAfter.slice(0, 20) : [],
        status: validStatus.includes(base.status) ? base.status : 'ABERTA',
        priority: validPriority.includes(base.priority) ? base.priority : 'MEDIA',
        createdAt: clampString(base.createdAt || nowIso, 64),
        updatedAt: clampString(base.updatedAt || nowIso, 64)
      };
      if (normalized.solutionDescription !== undefined) normalized.solutionDescription = clampString(normalized.solutionDescription, 4000);
      if (normalized.checklistItemDescription !== undefined) normalized.checklistItemDescription = clampString(normalized.checklistItemDescription, 400);
      if (normalized.requesterName !== undefined) normalized.requesterName = clampString(normalized.requesterName, 120);
      break;
    }

    case 'fleetMonthlyUpdates': {
      normalized = {
        ...base,
        id: clampString(base.id, 128),
        code: clampString(base.code || 'AMV-2026-000', 64),
        farm: validFarmOrDefault(base.farm),
        mileage: typeof base.mileage === 'number' ? base.mileage : clampString(base.mileage ?? '0', 40),
        driver: clampString(base.driver || 'Condutor', 120),
        date: clampString(base.date || nowIso.slice(0, 10), 32),
        time: clampString(base.time || '00:00', 16),
        plate: clampString(base.plate || 'SEMPLACA', 32),
        preventiveMaintenanceLast30Days: Boolean(base.preventiveMaintenanceLast30Days),
        hasIncidentLast30Days: Boolean(base.hasIncidentLast30Days),
        visualInspection: base.visualInspection && typeof base.visualInspection === 'object' ? base.visualInspection : {},
        createdAt: clampString(base.createdAt || nowIso, 64)
      };
      if (normalized.vehicleModel !== undefined) normalized.vehicleModel = clampString(normalized.vehicleModel, 120);
      if (normalized.preventiveMaintenanceNotes !== undefined) normalized.preventiveMaintenanceNotes = clampString(normalized.preventiveMaintenanceNotes, 2000);
      if (normalized.incidentNotes !== undefined) normalized.incidentNotes = clampString(normalized.incidentNotes, 2000);
      if (normalized.acknowledgementJustification !== undefined) normalized.acknowledgementJustification = clampString(normalized.acknowledgementJustification, 1000);
      if (Array.isArray(normalized.incidentPhotos)) normalized.incidentPhotos = normalized.incidentPhotos.slice(0, 20);
      if (normalized.notes !== undefined) normalized.notes = clampString(normalized.notes, 2000);
      break;
    }

    case 'fuelLogs': {
      const validFuels = ['Gasolina', 'Diesel Comum', 'Diesel S10'];
      const validLocs = [...FARMS, 'Posto L3', 'Posto Raul Lins'];
      const litersNum = Number(base.liters);
      const kmNum = Number(base.km);
      normalized = {
        ...base,
        id: clampString(base.id, 128),
        code: clampString(base.code || 'ABT-2026-000', 64),
        date: clampString(base.date || nowIso.slice(0, 10), 32),
        driver: clampString(base.driver || 'Condutor', 120),
        plate: clampString(base.plate || 'AAA0A00', 32).toUpperCase(),
        fuelType: validFuels.includes(base.fuelType) ? base.fuelType : 'Diesel S10',
        liters: Number.isFinite(litersNum) && litersNum > 0 ? Math.min(litersNum, 50000) : 1,
        km: Number.isFinite(kmNum) && kmNum >= 0 ? Math.min(kmNum, 10000000) : 0,
        location: validLocs.includes(base.location) ? base.location : 'Matriz',
        createdAt: clampString(base.createdAt || nowIso, 64)
      };
      if (normalized.notes !== undefined) normalized.notes = clampString(normalized.notes, 1000);
      break;
    }

    case 'fuelConsumptionRules': {
      const minVal = Math.max(0.1, Math.min(100, Number(base.minConsumption) || 5));
      const avgVal = Math.max(minVal, Math.min(100, Number(base.avgConsumption) || 10));
      const maxVal = Math.max(avgVal, Math.min(100, Number(base.maxConsumption) || 16));
      normalized = {
        ...base,
        id: clampString(base.id, 128),
        plate: clampString(base.plate || 'DEFAULT', 32).toUpperCase(),
        minConsumption: minVal,
        avgConsumption: avgVal,
        maxConsumption: maxVal
      };
      break;
    }

    case 'vehicles': {
      normalized = {
        ...base,
        id: clampString(base.id, 128),
        model: clampString(base.model || 'VEÍCULO', 120),
        plate: clampString(base.plate || 'AAA0A00', 32).toUpperCase()
      };
      if (normalized.farm && !VALID_FARMS.has(normalized.farm)) delete normalized.farm;
      break;
    }

    case 'drones': {
      normalized = {
        ...base,
        id: clampString(base.id, 128),
        name: clampString(base.name || 'Drone', 100),
        model: clampString(base.model ?? '', 100),
        label: clampString(base.label || base.name || 'Drone', 180)
      };
      if (normalized.farm && !VALID_FARMS.has(normalized.farm)) delete normalized.farm;
      break;
    }

    case 'serviceRequests': {
      const validStatuses = ['PENDENTE', 'EM_ATENDIMENTO', 'OS_GERADA', 'CONCLUIDA', 'CANCELADA'];
      normalized = {
        ...base,
        id: clampString(base.id, 128),
        code: clampString(base.code || 'SS-2026-000', 64),
        date: clampString(base.date || nowIso.slice(0, 10), 32),
        time: clampString(base.time || '00:00', 16),
        requesterName: clampString(base.requesterName || 'Solicitante', 120),
        farm: validFarmOrDefault(base.farm),
        location: clampString(base.location ?? '', 200),
        equipment: clampString(base.equipment ?? '', 200),
        problemDescription: clampString(base.problemDescription || 'Solicitação operacional', 4000),
        status: validStatuses.includes(base.status) ? base.status : 'PENDENTE',
        createdAt: clampString(base.createdAt || nowIso, 64)
      };
      if (Array.isArray(normalized.photos)) normalized.photos = normalized.photos.slice(0, 20);
      break;
    }

    case 'operatorServiceReleases': {
      normalized = {
        ...base,
        id: clampString(base.id, 128),
        token: clampString(base.token || `ss_key_${Date.now()}`, 128),
        operatorName: clampString(base.operatorName || 'Operador', 120),
        farm: base.farm === 'TODAS' ? 'TODAS' : validFarmOrDefault(base.farm),
        active: Boolean(base.active),
        createdAt: clampString(base.createdAt || nowIso, 64)
      };
      break;
    }

    case 'nr13Reports': {
      normalized = {
        ...base,
        id: clampString(base.id, 128),
        code: clampString(base.code || 'RT-000/2026', 64),
        equipmentTag: clampString(base.equipmentTag || 'Equipamento NR-13', 240),
        farm: validFarmOrDefault(base.farm),
        sector: clampString(base.sector ?? '', 160),
        inspectionNature: ['INICIAL', 'PERIODICA', 'EXTRAORDINARIA'].includes(base.inspectionNature) ? base.inspectionNature : 'PERIODICA',
        inspectionDate: clampString(base.inspectionDate || nowIso.slice(0, 10), 32),
        issueDate: clampString(base.issueDate || nowIso.slice(0, 10), 32),
        technicalResponsible: clampString(base.technicalResponsible ?? '', 160),
        creaNumber: clampString(base.creaNumber ?? '', 80),
        artNumber: clampString(base.artNumber ?? '', 80),
        scope: base.scope || {},
        parties: base.parties || {},
        equipment: base.equipment || {},
        nr13Categorization: base.nr13Categorization || {},
        devicesVerification: base.devicesVerification || {},
        ultrassomPoints: Array.isArray(base.ultrassomPoints) ? base.ultrassomPoints.slice(0, 100) : [],
        nonConformities: Array.isArray(base.nonConformities) ? base.nonConformities.slice(0, 100) : [],
        technicalOpinion: ['FAVORAVEL', 'FAVORAVEL_COM_RESTRICOES', 'DESFAVORAVEL', 'INCONCLUSIVO'].includes(base.technicalOpinion) ? base.technicalOpinion : 'FAVORAVEL',
        nextInspections: base.nextInspections || {},
        createdAt: clampString(base.createdAt || nowIso, 64)
      };
      break;
    }

    case 'nr13Vessels': {
      normalized = {
        ...base,
        id: clampString(base.id, 128),
        farm: validFarmOrDefault(base.farm),
        vesselNumber: clampString(base.vesselNumber || 'VP-00', 64),
        equipmentTag: clampString(base.equipmentTag || 'Vaso NR-13', 240),
        sector: clampString(base.sector ?? '', 160),
        companyData: base.companyData || {},
        equipment: base.equipment || {},
        nr13Categorization: base.nr13Categorization || {},
        createdAt: clampString(base.createdAt || nowIso, 64)
      };
      break;
    }

    case 'valveCalibrations': {
      normalized = {
        ...base,
        id: clampString(base.id, 128),
        code: clampString(base.code || 'CAL-VALV-2026-000', 64),
        tag: clampString(base.tag || 'PSV', 80),
        farm: validFarmOrDefault(base.farm),
        equipmentLinked: clampString(base.equipmentLinked ?? '', 200),
        sector: clampString(base.sector ?? '', 160),
        manufacturer: clampString(base.manufacturer ?? '', 120),
        model: clampString(base.model ?? '', 120),
        connectionSize: clampString(base.connectionSize ?? '', 80),
        fluidType: clampString(base.fluidType ?? '', 80),
        setPressure: Number(base.setPressure) || 0,
        openingPressure: Number(base.openingPressure) || 0,
        pressureUnit: ['bar', 'kgf/cm²', 'psi'].includes(base.pressureUnit) ? base.pressureUnit : 'kgf/cm²',
        tightnessTest: ['SEM_VAZAMENTO', 'COM_VAZAMENTO'].includes(base.tightnessTest) ? base.tightnessTest : 'SEM_VAZAMENTO',
        testFluid: clampString(base.testFluid ?? '', 100),
        testBenchStandard: clampString(base.testBenchStandard ?? '', 200),
        standardCertNumber: clampString(base.standardCertNumber ?? '', 120),
        technicianName: clampString(base.technicianName ?? '', 160),
        calibrationDate: clampString(base.calibrationDate || nowIso.slice(0, 10), 32),
        nextCalibrationDate: clampString(base.nextCalibrationDate || nowIso.slice(0, 10), 32),
        status: ['APROVADA', 'REPROVADA', 'AJUSTADA'].includes(base.status) ? base.status : 'APROVADA',
        createdAt: clampString(base.createdAt || nowIso, 64)
      };
      break;
    }

    case 'gaugeCalibrations': {
      normalized = {
        ...base,
        id: clampString(base.id, 128),
        code: clampString(base.code || 'CAL-MAN-2026-000', 64),
        tag: clampString(base.tag || 'MAN', 80),
        farm: validFarmOrDefault(base.farm),
        equipmentLinked: clampString(base.equipmentLinked ?? '', 200),
        sector: clampString(base.sector ?? '', 160),
        manufacturer: clampString(base.manufacturer ?? '', 120),
        gaugeType: ['ANALOGICO', 'DIGITAL'].includes(base.gaugeType) ? base.gaugeType : 'ANALOGICO',
        scaleMin: Number(base.scaleMin) || 0,
        scaleMax: Number(base.scaleMax) || 10,
        unit: ['bar', 'kgf/cm²', 'psi'].includes(base.unit) ? base.unit : 'bar',
        resolution: Number(base.resolution) || 0.2,
        accuracyClass: clampString(base.accuracyClass ?? '', 120),
        standardUsed: clampString(base.standardUsed ?? '', 200),
        standardCertNumber: clampString(base.standardCertNumber ?? '', 120),
        calibrationDate: clampString(base.calibrationDate || nowIso.slice(0, 10), 32),
        nextCalibrationDate: clampString(base.nextCalibrationDate || nowIso.slice(0, 10), 32),
        calibratedBy: clampString(base.calibratedBy ?? '', 160),
        maxFoundError: Number(base.maxFoundError) || 0,
        maxAllowedError: Number(base.maxAllowedError) || 0,
        status: ['APROVADO', 'REPROVADO', 'AJUSTADO'].includes(base.status) ? base.status : 'APROVADO',
        createdAt: clampString(base.createdAt || nowIso, 64)
      };
      break;
    }

    case 'ultrassomEquipments': {
      normalized = {
        ...base,
        id: clampString(base.id, 128),
        name: clampString(base.name || 'Medidor Ultrassom', 160),
        serialNumber: clampString(base.serialNumber ?? '', 120),
        certificateNumber: clampString(base.certificateNumber ?? '', 120),
        calibrationDate: clampString(base.calibrationDate || nowIso.slice(0, 10), 32),
        nextCalibrationDate: clampString(base.nextCalibrationDate || nowIso.slice(0, 10), 32),
        status: ['CALIBRADO', 'VENCIDO', 'MANUTENCAO'].includes(base.status) ? base.status : 'CALIBRADO',
        createdAt: clampString(base.createdAt || nowIso, 64)
      };
      break;
    }

    case 'deletedTombstones': {
      normalized = {
        id: clampString(base.id, 128),
        deletedAt: clampString(base.deletedAt || nowIso, 64)
      };
      break;
    }
  }

  const bounded = enforceDocByteLimit(normalized);
  return {
    ...bounded,
    serverUpdatedAt: serverTimestamp()
  };
}

export async function saveToFirestore(
  col: FirestoreCollectionName,
  id: string,
  rawData: any
): Promise<void> {
  if (!id) return;
  const payload = sanitizeForFirestore(col, { ...rawData, id });
  const path = `${col}/${id}`;
  try {
    await setDoc(doc(db, col, id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteFromFirestore(
  col: FirestoreCollectionName,
  id: string,
  recordTombstone = true
): Promise<void> {
  if (!id) return;
  const path = `${col}/${id}`;
  try {
    if (recordTombstone && col !== 'deletedTombstones') {
      const tombPayload = sanitizeForFirestore('deletedTombstones', {
        id,
        deletedAt: new Date().toISOString()
      });
      await setDoc(doc(db, 'deletedTombstones', id), tombPayload);
    }
    await deleteDoc(doc(db, col, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function removeTombstoneFromFirestore(id: string): Promise<void> {
  if (!id) return;
  const path = `deletedTombstones/${id}`;
  try {
    await deleteDoc(doc(db, 'deletedTombstones', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeCollection<T>(
  col: FirestoreCollectionName,
  onData: (items: T[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, col),
    (snapshot) => {
      const items = snapshot.docs.map((d) => {
        const raw = d.data();
        const { serverUpdatedAt, ...clean } = raw;
        return { ...clean, id: clean.id || d.id } as T;
      });
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, col);
    }
  );
}

export async function seedCollectionIfEmpty(
  col: FirestoreCollectionName,
  items: Array<Record<string, any>>,
  deletedSet: Set<string>
): Promise<boolean> {
  if (!items || items.length === 0) return false;
  try {
    const snap = await getDocs(query(collection(db, col), limit(1)));
    if (!snap.empty) return false;

    const validItems = items.filter((item) => item && item.id && !deletedSet.has(item.id));
    await Promise.all(
      validItems.map((item) => saveToFirestore(col, String(item.id), item))
    );
    return validItems.length > 0;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, col);
  }
}

export async function fetchDeletedTombstones(): Promise<Set<string>> {
  try {
    const snap = await getDocs(collection(db, 'deletedTombstones'));
    return new Set(snap.docs.map((d) => d.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'deletedTombstones');
  }
}
