import { Farm, ServiceRequest } from '../types';

export function isServiceRequestPriorityValidated(sr: ServiceRequest): boolean {
  if (sr.priorityValidated === true) return true;
  if (sr.priorityValidated === false) return false;
  return sr.status === 'OS_GERADA' || sr.status === 'CONCLUIDA';
}

export function getServiceRequestChronoTimestamp(sr: ServiceRequest): number {
  if (sr.date && sr.time) {
    const dt = new Date(`${sr.date}T${sr.time}:00`).getTime();
    if (!Number.isNaN(dt)) return dt;
  }
  const created = new Date(sr.createdAt || 0).getTime();
  return Number.isNaN(created) ? 0 : created;
}

export interface QueuedServiceRequest {
  request: ServiceRequest;
  isValidated: boolean;
  inQueue: boolean;
  queuePosition: number | null;
  totalInQueue: number;
  urgentAheadCount: number;
}

/**
 * Fila oficial por fazenda:
 * - Entram na fila apenas solicitações já validadas pelo técnico (URGENTE ou NORMAL)
 *   e ainda aguardando início de execução (status PENDENTE ou EM_ATENDIMENTO).
 * - Ordem: todos os URGENTES primeiro (por ordem cronológica de abertura),
 *   seguidos pelos NORMAIS (por ordem cronológica de abertura).
 */
export function buildFarmServiceQueue(
  allRequests: ServiceRequest[],
  farm: Farm
): QueuedServiceRequest[] {
  const farmRequests = (allRequests || []).filter(sr => sr && sr.farm === farm);

  const queued = farmRequests
    .filter(
      sr =>
        (sr.status === 'PENDENTE' || sr.status === 'EM_ATENDIMENTO') &&
        isServiceRequestPriorityValidated(sr)
    )
    .sort((a, b) => {
      const aUrgent = a.urgency === 'URGENTE' ? 0 : 1;
      const bUrgent = b.urgency === 'URGENTE' ? 0 : 1;
      if (aUrgent !== bUrgent) return aUrgent - bUrgent;
      const diff = getServiceRequestChronoTimestamp(a) - getServiceRequestChronoTimestamp(b);
      if (diff !== 0) return diff;
      return (a.code || '').localeCompare(b.code || '');
    });

  const totalInQueue = queued.length;
  const totalUrgentInQueue = queued.filter(sr => sr.urgency === 'URGENTE').length;
  const positionMap = new Map<string, number>();
  queued.forEach((sr, idx) => positionMap.set(sr.id, idx + 1));

  return farmRequests.map(sr => {
    const validated = isServiceRequestPriorityValidated(sr);
    const pos = positionMap.get(sr.id) ?? null;
    const urgentAheadCount =
      pos === null
        ? 0
        : sr.urgency === 'URGENTE'
        ? pos - 1
        : totalUrgentInQueue;

    return {
      request: sr,
      isValidated: validated,
      inQueue: pos !== null,
      queuePosition: pos,
      totalInQueue,
      urgentAheadCount
    };
  });
}

export function getServiceRequestQueueInfo(
  allRequests: ServiceRequest[],
  target: ServiceRequest
): QueuedServiceRequest {
  const farmQueue = buildFarmServiceQueue(allRequests, target.farm);
  return (
    farmQueue.find(q => q.request.id === target.id) || {
      request: target,
      isValidated: isServiceRequestPriorityValidated(target),
      inQueue: false,
      queuePosition: null,
      totalInQueue: farmQueue.filter(q => q.inQueue).length,
      urgentAheadCount: 0
    }
  );
}
