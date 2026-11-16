import { ChecklistItemResponse, ChecklistRecord, WorkOrder } from '../types';

export interface ResolvedItemInfo {
  isResolved: boolean;
  isAcknowledged?: boolean;
  linkedWorkOrder?: WorkOrder;
  acknowledgementInfo?: {
    by?: string;
    at?: string;
    justification?: string;
  };
}

/**
 * Checks if a specific non-conforming checklist item has been:
 * 1. Formally acknowledged/accepted by Management (Aceite da Administração/Gerente Manutenção)
 * 2. Or corrected through a completed Work Order (Ordem de Serviço com status 'CONCLUIDA').
 */
export function isChecklistItemResolved(
  item: ChecklistItemResponse,
  checklist: ChecklistRecord,
  workOrders: WorkOrder[]
): ResolvedItemInfo {
  if (item.status !== 'N/C') {
    return { isResolved: false, isAcknowledged: false };
  }

  // 1. Formally recognized and accepted by Admin / Management
  if (item.adminAcknowledged) {
    return {
      isResolved: true,
      isAcknowledged: true,
      acknowledgementInfo: {
        by: item.acknowledgedBy || 'Gerente Manutenção',
        at: item.acknowledgedAt,
        justification: item.acknowledgementJustification
      }
    };
  }

  // 2. Check direct link via item.generatedWorkOrderId
  if (item.generatedWorkOrderId) {
    const directWO = workOrders.find(w => w.id === item.generatedWorkOrderId);
    if (directWO && directWO.status === 'CONCLUIDA') {
      return { isResolved: true, isAcknowledged: false, linkedWorkOrder: directWO };
    }
  }

  // 3. Check link via Work Order referencing this checklist and item description
  const matchingWO = workOrders.find(w => {
    const matchesSource = w.checklistSourceId === checklist.id;
    const matchesDesc = w.checklistItemDescription === item.description ||
      w.problemDescription.toLowerCase().includes(item.description.toLowerCase());
    return matchesSource && matchesDesc && w.status === 'CONCLUIDA';
  });

  if (matchingWO) {
    return { isResolved: true, isAcknowledged: false, linkedWorkOrder: matchingWO };
  }

  // 4. Fallback: Check if any completed work order in the same farm, equipment/location matches this checklist
  const fallbackWO = workOrders.find(w => {
    if (w.status !== 'CONCLUIDA') return false;
    if (w.checklistSourceId === checklist.id) return true;
    return false;
  });

  const items = Array.isArray(checklist.items) ? checklist.items : [];
  if (fallbackWO && (items.filter(i => i.status === 'N/C').length === 1)) {
    return { isResolved: true, isAcknowledged: false, linkedWorkOrder: fallbackWO };
  }

  return { isResolved: false, isAcknowledged: false };
}

/**
 * Calculates whether a checklist has any remaining ACTIVE (unresolved) non-conformities.
 */
export function getChecklistEffectiveStatus(
  checklist: ChecklistRecord,
  workOrders: WorkOrder[]
): {
  isFullyConforming: boolean;
  activeNCCount: number;
  resolvedNCCount: number;
  totalNCCount: number;
  effectiveSummary: 'CONFORME' | 'REGULARIZADO' | 'COM_PENDENCIAS' | 'CRITICO' | 'EM_ANDAMENTO';
} {
  if (!checklist) {
    return {
      isFullyConforming: true,
      activeNCCount: 0,
      resolvedNCCount: 0,
      totalNCCount: 0,
      effectiveSummary: 'CONFORME'
    };
  }

  if (checklist.isDraft) {
    return {
      isFullyConforming: false,
      activeNCCount: 0,
      resolvedNCCount: 0,
      totalNCCount: 0,
      effectiveSummary: 'EM_ANDAMENTO'
    };
  }

  const items = Array.isArray(checklist.items) ? checklist.items : [];
  const ncItems = items.filter(i => i && i.status === 'N/C');
  const totalNCCount = ncItems.length;

  if (totalNCCount === 0) {
    return {
      isFullyConforming: true,
      activeNCCount: 0,
      resolvedNCCount: 0,
      totalNCCount: 0,
      effectiveSummary: 'CONFORME'
    };
  }

  let resolvedCount = 0;
  for (const item of ncItems) {
    const { isResolved } = isChecklistItemResolved(item, checklist, workOrders);
    if (isResolved) {
      resolvedCount++;
    }
  }

  const activeNCCount = totalNCCount - resolvedCount;

  if (activeNCCount === 0) {
    // All NC items have been repaired through completed work orders!
    return {
      isFullyConforming: true,
      activeNCCount: 0,
      resolvedNCCount: resolvedCount,
      totalNCCount,
      effectiveSummary: 'REGULARIZADO'
    };
  }

  return {
    isFullyConforming: false,
    activeNCCount,
    resolvedNCCount: resolvedCount,
    totalNCCount,
    effectiveSummary: activeNCCount >= 3 ? 'CRITICO' : 'COM_PENDENCIAS'
  };
}
