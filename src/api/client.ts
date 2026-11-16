import { ChecklistRecord, DroneAsset, FuelConsumptionRule, FuelLogRecord, GaugeCalibrationRecord, NR13InspectionReport, NR13VesselMaster, OperatorServiceRelease, ServiceRequest, UltrassomEquipmentRecord, ValveCalibrationRecord, VehicleMonthlyUpdate, WorkOrder } from '../types';

export interface SyncResponse {
  changed?: boolean;
  checklists?: ChecklistRecord[];
  workOrders?: WorkOrder[];
  fleetMonthlyUpdates?: VehicleMonthlyUpdate[];
  fuelLogs?: FuelLogRecord[];
  fuelConsumptionRules?: FuelConsumptionRule[];
  nr13Reports?: NR13InspectionReport[];
  nr13Vessels?: NR13VesselMaster[];
  valveCalibrations?: ValveCalibrationRecord[];
  gaugeCalibrations?: GaugeCalibrationRecord[];
  ultrassomEquipments?: UltrassomEquipmentRecord[];
  serviceRequests?: ServiceRequest[];
  operatorServiceReleases?: OperatorServiceRelease[];
  drones?: DroneAsset[];
  deletedIds?: string[];
  lastUpdated: string;
}

const getBaseUrl = () => {
  return '';
};

export const api = {
  async fetchAll(since?: string): Promise<SyncResponse> {
    const url = since ? `${getBaseUrl()}/api/data?since=${encodeURIComponent(since)}` : `${getBaseUrl()}/api/data`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Falha ao sincronizar dados: ${res.statusText}`);
    }
    return res.json();
  },

  async saveChecklist(data: Partial<ChecklistRecord>): Promise<{ success: boolean; checklist: ChecklistRecord }> {
    const res = await fetch(`${getBaseUrl()}/api/checklists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      throw new Error(`Erro ao salvar checklist: ${res.statusText}`);
    }
    return res.json();
  },

  async deleteChecklist(id: string): Promise<{ success: boolean; deletedIds?: string[] }> {
    const res = await fetch(`${getBaseUrl()}/api/checklists/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      throw new Error(`Erro ao excluir checklist: ${res.statusText}`);
    }
    return res.json();
  },

  async saveWorkOrder(data: Partial<WorkOrder>): Promise<{ success: boolean; workOrder: WorkOrder }> {
    const res = await fetch(`${getBaseUrl()}/api/work-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      throw new Error(`Erro ao salvar ordem de serviço: ${res.statusText}`);
    }
    return res.json();
  },

  async updateWorkOrder(id: string, updates: Partial<WorkOrder>): Promise<{ success: boolean; workOrder: WorkOrder }> {
    const res = await fetch(`${getBaseUrl()}/api/work-orders/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      throw new Error(`Erro ao atualizar ordem de serviço: ${res.statusText}`);
    }
    return res.json();
  },

  async deleteWorkOrder(id: string): Promise<{ success: boolean; deletedIds?: string[] }> {
    const res = await fetch(`${getBaseUrl()}/api/work-orders/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      throw new Error(`Erro ao excluir ordem de serviço: ${res.statusText}`);
    }
    return res.json();
  },

  async saveFleetMonthlyUpdate(data: Partial<VehicleMonthlyUpdate>): Promise<{ success: boolean; fleetMonthlyUpdate: VehicleMonthlyUpdate }> {
    const res = await fetch(`${getBaseUrl()}/api/fleet-monthly-updates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      throw new Error(`Erro ao salvar atualização de frota: ${res.statusText}`);
    }
    return res.json();
  },

  async deleteFleetMonthlyUpdate(id: string): Promise<{ success: boolean; deletedIds?: string[] }> {
    const res = await fetch(`${getBaseUrl()}/api/fleet-monthly-updates/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      throw new Error(`Erro ao excluir atualização de frota: ${res.statusText}`);
    }
    return res.json();
  },

  async saveFuelLog(data: Partial<FuelLogRecord>): Promise<{ success: boolean; fuelLog: FuelLogRecord }> {
    const res = await fetch(`${getBaseUrl()}/api/fuel-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      throw new Error(`Erro ao salvar abastecimento: ${res.statusText}`);
    }
    return res.json();
  },

  async deleteFuelLog(id: string): Promise<{ success: boolean; deletedIds?: string[] }> {
    const res = await fetch(`${getBaseUrl()}/api/fuel-logs/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      throw new Error(`Erro ao excluir abastecimento: ${res.statusText}`);
    }
    return res.json();
  },

  async saveFuelConsumptionRule(data: Partial<FuelConsumptionRule>): Promise<{ success: boolean; rule: FuelConsumptionRule }> {
    const res = await fetch(`${getBaseUrl()}/api/fuel-configs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      throw new Error(`Erro ao salvar parâmetro de consumo: ${res.statusText}`);
    }
    return res.json();
  },

  async saveFuelConsumptionRulesBatch(payload: {
    rules: Partial<FuelConsumptionRule>[];
    deleteRuleIds?: string[];
  }): Promise<{ success: boolean; rules: FuelConsumptionRule[]; savedRules: FuelConsumptionRule[]; deletedIds?: string[] }> {
    const res = await fetch(`${getBaseUrl()}/api/fuel-configs/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error(`Erro ao salvar parâmetros de consumo em lote: ${res.statusText}`);
    }
    return res.json();
  },

  async deleteFuelConsumptionRule(id: string): Promise<{ success: boolean; deletedIds?: string[] }> {
    const res = await fetch(`${getBaseUrl()}/api/fuel-configs/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      throw new Error(`Erro ao excluir parâmetro de consumo: ${res.statusText}`);
    }
    return res.json();
  },

  async saveNR13Report(data: Partial<NR13InspectionReport>): Promise<{ success: boolean; report: NR13InspectionReport }> {
    const res = await fetch(`${getBaseUrl()}/api/nr13-reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      throw new Error(`Erro ao salvar laudo NR-13: ${res.statusText}`);
    }
    return res.json();
  },

  async deleteNR13Report(id: string): Promise<{ success: boolean; deletedIds?: string[] }> {
    const res = await fetch(`${getBaseUrl()}/api/nr13-reports/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      throw new Error(`Erro ao excluir laudo NR-13: ${res.statusText}`);
    }
    return res.json();
  },

  async saveNR13Vessel(data: Partial<NR13VesselMaster>): Promise<{ success: boolean; vessel: NR13VesselMaster }> {
    const res = await fetch(`${getBaseUrl()}/api/nr13-vessels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      throw new Error(`Erro ao salvar vaso NR-13: ${res.statusText}`);
    }
    return res.json();
  },

  async deleteNR13Vessel(id: string): Promise<{ success: boolean; deletedIds?: string[] }> {
    const res = await fetch(`${getBaseUrl()}/api/nr13-vessels/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      throw new Error(`Erro ao excluir vaso NR-13: ${res.statusText}`);
    }
    return res.json();
  },

  async saveValveCalibration(data: Partial<ValveCalibrationRecord>): Promise<{ success: boolean; calibration: ValveCalibrationRecord }> {
    const res = await fetch(`${getBaseUrl()}/api/valve-calibrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      throw new Error(`Erro ao salvar calibração de válvula: ${res.statusText}`);
    }
    return res.json();
  },

  async deleteValveCalibration(id: string): Promise<{ success: boolean; deletedIds?: string[] }> {
    const res = await fetch(`${getBaseUrl()}/api/valve-calibrations/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      throw new Error(`Erro ao excluir calibração de válvula: ${res.statusText}`);
    }
    return res.json();
  },

  async saveGaugeCalibration(data: Partial<GaugeCalibrationRecord>): Promise<{ success: boolean; calibration: GaugeCalibrationRecord }> {
    const res = await fetch(`${getBaseUrl()}/api/gauge-calibrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      throw new Error(`Erro ao salvar calibração de manômetro: ${res.statusText}`);
    }
    return res.json();
  },

  async deleteGaugeCalibration(id: string): Promise<{ success: boolean; deletedIds?: string[] }> {
    const res = await fetch(`${getBaseUrl()}/api/gauge-calibrations/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      throw new Error(`Erro ao excluir calibração de manômetro: ${res.statusText}`);
    }
    return res.json();
  },

  async saveUltrassomEquipment(data: Partial<UltrassomEquipmentRecord>): Promise<{ success: boolean; equipment: UltrassomEquipmentRecord }> {
    const res = await fetch(`${getBaseUrl()}/api/ultrassom-equipments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      throw new Error(`Erro ao salvar equipamento de aferição: ${res.statusText}`);
    }
    return res.json();
  },

  async deleteUltrassomEquipment(id: string): Promise<{ success: boolean; deletedIds?: string[] }> {
    const res = await fetch(`${getBaseUrl()}/api/ultrassom-equipments/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      throw new Error(`Erro ao excluir equipamento de aferição: ${res.statusText}`);
    }
    return res.json();
  },

  async saveServiceRequest(data: Partial<ServiceRequest>): Promise<{ success: boolean; serviceRequest: ServiceRequest }> {
    const res = await fetch(`${getBaseUrl()}/api/service-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      throw new Error(`Erro ao salvar solicitação de serviço: ${res.statusText}`);
    }
    return res.json();
  },

  async deleteServiceRequest(id: string): Promise<{ success: boolean; deletedIds?: string[] }> {
    const res = await fetch(`${getBaseUrl()}/api/service-requests/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      throw new Error(`Erro ao excluir solicitação de serviço: ${res.statusText}`);
    }
    return res.json();
  },

  async saveOperatorRelease(data: Partial<OperatorServiceRelease>): Promise<{ success: boolean; release: OperatorServiceRelease }> {
    const res = await fetch(`${getBaseUrl()}/api/operator-releases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      throw new Error(`Erro ao salvar liberação de operador: ${res.statusText}`);
    }
    return res.json();
  },

  async deleteOperatorRelease(id: string): Promise<{ success: boolean; deletedIds?: string[] }> {
    const res = await fetch(`${getBaseUrl()}/api/operator-releases/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      throw new Error(`Erro ao excluir liberação de operador: ${res.statusText}`);
    }
    return res.json();
  },

  async saveDrone(data: Partial<DroneAsset>): Promise<{ success: boolean; drone: DroneAsset }> {
    const res = await fetch(`${getBaseUrl()}/api/drones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      throw new Error(`Erro ao salvar drone: ${res.statusText}`);
    }
    return res.json();
  },

  async deleteDrone(id: string): Promise<{ success: boolean; deletedIds?: string[] }> {
    const res = await fetch(`${getBaseUrl()}/api/drones/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      throw new Error(`Erro ao excluir drone: ${res.statusText}`);
    }
    return res.json();
  },

  async autoSaveDraft(type: 'checklist' | 'work-order' | 'fleet-update', data: any): Promise<{ success: boolean }> {
    const res = await fetch(`${getBaseUrl()}/api/auto-save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data })
    });
    if (!res.ok) {
      throw new Error(`Erro ao auto-salvar rascunho: ${res.statusText}`);
    }
    return res.json();
  },

  async resetData(): Promise<{ success: boolean; deletedIds?: string[] }> {
    const res = await fetch(`${getBaseUrl()}/api/reset`, { method: 'POST' });
    if (!res.ok) throw new Error('Falha ao restaurar dados');
    return res.json();
  },

  async clearTests(): Promise<{ success: boolean; checklists: ChecklistRecord[]; workOrders: WorkOrder[]; fleetMonthlyUpdates?: VehicleMonthlyUpdate[]; deletedIds?: string[] }> {
    const res = await fetch(`${getBaseUrl()}/api/clear-tests`, { method: 'POST' });
    if (!res.ok) throw new Error('Falha ao limpar dados de teste');
    return res.json();
  },

  async restoreItem(type: 'checklist' | 'work-order', id: string): Promise<{ success: boolean; checklists: ChecklistRecord[]; workOrders: WorkOrder[]; deletedIds?: string[] }> {
    const res = await fetch(`${getBaseUrl()}/api/restore-item`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id })
    });
    if (!res.ok) throw new Error('Falha ao restaurar item');
    return res.json();
  },

  async batchSync(payload: {
    checklists?: ChecklistRecord[];
    workOrders?: WorkOrder[];
    fleetMonthlyUpdates?: VehicleMonthlyUpdate[];
    fuelLogs?: FuelLogRecord[];
    fuelConsumptionRules?: FuelConsumptionRule[];
    serviceRequests?: ServiceRequest[];
    operatorServiceReleases?: OperatorServiceRelease[];
    drones?: DroneAsset[];
    nr13Vessels?: NR13VesselMaster[];
    deletedIds?: string[];
  }): Promise<SyncResponse> {
    const res = await fetch(`${getBaseUrl()}/api/sync/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Falha no envio de sincronização: ${res.statusText}`);
    return res.json();
  },

  async importBackup(data: any): Promise<{ success: boolean; message: string; checklists: ChecklistRecord[]; workOrders: WorkOrder[]; fleetMonthlyUpdates?: VehicleMonthlyUpdate[]; fuelLogs?: FuelLogRecord[]; fuelConsumptionRules?: FuelConsumptionRule[]; deletedIds: string[] }> {
    const res = await fetch(`${getBaseUrl()}/api/backup/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Falha ao importar arquivo de backup: ${res.statusText}`);
    }
    return res.json();
  }
};
