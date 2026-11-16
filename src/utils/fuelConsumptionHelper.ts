import { FuelConsumptionRule, FuelLogRecord, Vehicle } from '../types';

export type FuelConsumptionStatus =
  | 'BASELINE'
  | 'NORMAL'
  | 'ABOVE_MAX'
  | 'BELOW_MIN'
  | 'INVALID_KM'
  | 'TEMPORARY_EXEMPT';

export interface EnrichedFuelLog extends FuelLogRecord {
  previousLogId?: string;
  previousDate?: string;
  previousKm?: number;
  kmDriven?: number;
  consumptionKmPerL?: number;
  ruleUsed: FuelConsumptionRule;
  status: FuelConsumptionStatus;
}

export const DEFAULT_FALLBACK_RULE: FuelConsumptionRule = {
  id: 'fcr_default',
  plate: 'DEFAULT',
  minConsumption: 5.0,
  avgConsumption: 10.0,
  maxConsumption: 16.0
};

export const TEMPORARY_PLATE_CODES = new Set<string>(['AAA0A00']);

export const normalizePlate = (plate: string): string => {
  return String(plate || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
};

export const isTemporaryFuelVehicle = (plate: string, vehicles?: Vehicle[]): boolean => {
  const clean = normalizePlate(plate);
  if (!clean) return false;
  if (TEMPORARY_PLATE_CODES.has(clean)) return true;
  if (!Array.isArray(vehicles)) return false;
  return vehicles.some(v => normalizePlate(v.plate) === clean && Boolean(v.isTemporary));
};

export const formatDatePtBr = (isoDate?: string): string => {
  if (!isoDate) return '-';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

export const formatNumberPtBr = (val: number, decimals = 2): string => {
  if (!Number.isFinite(val)) return '-';
  return val.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

export const sortFuelLogsChronologically = (logs: FuelLogRecord[]): FuelLogRecord[] => {
  return [...logs].sort((a, b) => {
    const dateA = a.date || '';
    const dateB = b.date || '';
    if (dateA !== dateB) return dateA.localeCompare(dateB);

    const kmA = Number(a.km) || 0;
    const kmB = Number(b.km) || 0;
    if (kmA !== kmB) return kmA - kmB;

    const timeA = a.time || '12:00';
    const timeB = b.time || '12:00';
    if (timeA !== timeB) return timeA.localeCompare(timeB);

    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });
};

export const resolveConsumptionRule = (
  plate: string,
  rules: FuelConsumptionRule[]
): FuelConsumptionRule => {
  const clean = normalizePlate(plate);
  const safeRules = Array.isArray(rules) ? rules : [];
  const plateSpecific = clean
    ? safeRules.find(r => normalizePlate(r.plate) === clean)
    : undefined;
  if (plateSpecific) return plateSpecific;

  const defaultRule = safeRules.find(r => r.plate === 'DEFAULT');
  return defaultRule || DEFAULT_FALLBACK_RULE;
};

export const enrichFuelLogsWithConsumption = (
  logs: FuelLogRecord[],
  rules: FuelConsumptionRule[],
  vehicles?: Vehicle[]
): EnrichedFuelLog[] => {
  const byPlate = new Map<string, FuelLogRecord[]>();
  (Array.isArray(logs) ? logs : []).forEach(log => {
    if (!log || !log.plate) return;
    const p = normalizePlate(log.plate);
    const list = byPlate.get(p) || [];
    list.push(log);
    byPlate.set(p, list);
  });

  const enrichedMap = new Map<string, EnrichedFuelLog>();

  byPlate.forEach((plateLogs, plateKey) => {
    const sorted = sortFuelLogsChronologically(plateLogs);
    const rule = resolveConsumptionRule(plateKey, rules);
    const isTemp = isTemporaryFuelVehicle(plateKey, vehicles);

    if (isTemp) {
      sorted.forEach(curr => {
        enrichedMap.set(curr.id, {
          ...curr,
          ruleUsed: rule,
          status: 'TEMPORARY_EXEMPT'
        });
      });
      return;
    }

    for (let i = 0; i < sorted.length; i++) {
      const curr = sorted[i];
      const prev = i > 0 ? sorted[i - 1] : undefined;

      if (!prev) {
        enrichedMap.set(curr.id, {
          ...curr,
          ruleUsed: rule,
          status: 'BASELINE'
        });
        continue;
      }

      const kmDriven = Number(curr.km) - Number(prev.km);
      const liters = Number(curr.liters);

      if (kmDriven <= 0 || liters <= 0) {
        enrichedMap.set(curr.id, {
          ...curr,
          previousLogId: prev.id,
          previousDate: prev.date,
          previousKm: Number(prev.km),
          kmDriven,
          ruleUsed: rule,
          status: 'INVALID_KM'
        });
        continue;
      }

      const consumption = kmDriven / liters;
      let status: FuelConsumptionStatus = 'NORMAL';
      if (consumption > rule.maxConsumption) {
        status = 'ABOVE_MAX';
      } else if (consumption < rule.minConsumption) {
        status = 'BELOW_MIN';
      }

      enrichedMap.set(curr.id, {
        ...curr,
        previousLogId: prev.id,
        previousDate: prev.date,
        previousKm: Number(prev.km),
        kmDriven,
        consumptionKmPerL: consumption,
        ruleUsed: rule,
        status
      });
    }
  });

  return (Array.isArray(logs) ? logs : []).map(log => {
    const found = enrichedMap.get(log.id);
    if (found) return found;
    const isTemp = isTemporaryFuelVehicle(log.plate, vehicles);
    return {
      ...log,
      ruleUsed: resolveConsumptionRule(log.plate, rules),
      status: isTemp ? 'TEMPORARY_EXEMPT' : 'BASELINE'
    };
  });
};

export interface FuelValidationResult {
  ok: boolean;
  isTemporaryExempt?: boolean;
  errorType?: 'VALIDATION' | 'INVALID_KM' | 'ABOVE_MAX' | 'BELOW_MIN';
  message?: string;
  calculatedConsumption?: number;
  kmDriven?: number;
  prevLog?: FuelLogRecord;
  nextLog?: FuelLogRecord;
  rule: FuelConsumptionRule;
  plateLogs: EnrichedFuelLog[];
}

export interface FuelValidationOptions {
  /**
   * When correcting an existing historical log to resolve a below-minimum error,
   * we still enforce valid odometer progression (prev.km < km < next.km),
   * while allowing the user to save the corrected historical record without
   * getting stuck on a cascading upper/lower check against unedited neighbors.
   */
  isHistoricalCorrection?: boolean;
  vehicles?: Vehicle[];
}

export const validateFuelLogCandidate = (
  candidate: Omit<FuelLogRecord, 'id' | 'code' | 'createdAt'> & { id?: string; createdAt?: string },
  allLogs: FuelLogRecord[],
  rules: FuelConsumptionRule[],
  editingId?: string,
  options?: FuelValidationOptions
): FuelValidationResult => {
  const cleanPlate = normalizePlate(candidate.plate);
  const isTemp = isTemporaryFuelVehicle(cleanPlate, options?.vehicles);
  const rule = resolveConsumptionRule(cleanPlate, rules);

  const samePlateExisting = (Array.isArray(allLogs) ? allLogs : []).filter(
    l => l && normalizePlate(l.plate) === cleanPlate && l.id !== editingId
  );
  const enrichedPlateLogs = sortFuelLogsChronologically(
    enrichFuelLogsWithConsumption(samePlateExisting, rules, options?.vehicles)
  ) as EnrichedFuelLog[];

  if (!cleanPlate) {
    return {
      ok: false,
      errorType: 'VALIDATION',
      message: 'Selecione a placa do veículo na lista suspensa.',
      rule,
      plateLogs: enrichedPlateLogs
    };
  }
  if (!candidate.driver || !candidate.driver.trim()) {
    return {
      ok: false,
      errorType: 'VALIDATION',
      message: 'Informe o nome do condutor responsável pelo abastecimento.',
      rule,
      plateLogs: enrichedPlateLogs
    };
  }
  if (!candidate.date) {
    return {
      ok: false,
      errorType: 'VALIDATION',
      message: 'Informe a data do abastecimento.',
      rule,
      plateLogs: enrichedPlateLogs
    };
  }
  const litersNum = Number(candidate.liters);
  const kmNum = Number(candidate.km);

  if (!Number.isFinite(litersNum) || litersNum <= 0) {
    return {
      ok: false,
      errorType: 'VALIDATION',
      message: 'Informe uma quantidade de combustível válida em litros (maior que 0).',
      rule,
      plateLogs: enrichedPlateLogs
    };
  }

  // Temporary vehicle (e.g. AAA0A00): NO KM requirement and NO consumption limits — everything is allowed!
  if (isTemp) {
    if (Number.isFinite(kmNum) && kmNum < 0) {
      return {
        ok: false,
        errorType: 'VALIDATION',
        message: 'O KM não pode ser negativo.',
        rule,
        plateLogs: enrichedPlateLogs
      };
    }
    return {
      ok: true,
      isTemporaryExempt: true,
      rule,
      plateLogs: enrichedPlateLogs
    };
  }

  if (!Number.isFinite(kmNum) || kmNum <= 0) {
    return {
      ok: false,
      errorType: 'VALIDATION',
      message: 'Informe a quilometragem (KM) atual do hodômetro.',
      rule,
      plateLogs: enrichedPlateLogs
    };
  }

  const tempCandidate: FuelLogRecord = {
    id: editingId || '__candidate__',
    code: 'NEW',
    date: candidate.date,
    time: candidate.time || '12:00',
    driver: candidate.driver.trim(),
    plate: cleanPlate,
    vehicleModel: candidate.vehicleModel,
    fuelType: candidate.fuelType,
    liters: litersNum,
    km: kmNum,
    location: candidate.location,
    notes: candidate.notes,
    createdAt: candidate.createdAt || new Date().toISOString()
  };

  const timeline = sortFuelLogsChronologically([...samePlateExisting, tempCandidate]);
  const idx = timeline.findIndex(item => item.id === tempCandidate.id);
  const prevLog = idx > 0 ? timeline[idx - 1] : undefined;
  const nextLog = idx >= 0 && idx < timeline.length - 1 ? timeline[idx + 1] : undefined;

  if (prevLog && kmNum <= Number(prevLog.km)) {
    return {
      ok: false,
      errorType: 'INVALID_KM',
      message: `O KM informado (${kmNum.toLocaleString('pt-BR')} KM) não pode ser menor ou igual ao abastecimento anterior desta placa (${Number(prevLog.km).toLocaleString('pt-BR')} KM em ${formatDatePtBr(prevLog.date)}). Verifique se houve erro de digitação no abastecimento anterior ou ajuste a data caso seja um lançamento retroativo.`,
      prevLog,
      nextLog,
      rule,
      plateLogs: enrichedPlateLogs
    };
  }

  if (nextLog && kmNum >= Number(nextLog.km)) {
    return {
      ok: false,
      errorType: 'INVALID_KM',
      message: `O KM informado (${kmNum.toLocaleString('pt-BR')} KM) não pode ser maior ou igual ao abastecimento posterior de ${formatDatePtBr(nextLog.date)} (${Number(nextLog.km).toLocaleString('pt-BR')} KM).`,
      prevLog,
      nextLog,
      rule,
      plateLogs: enrichedPlateLogs
    };
  }

  if (!prevLog) {
    return {
      ok: true,
      prevLog: undefined,
      nextLog,
      rule,
      plateLogs: enrichedPlateLogs
    };
  }

  const kmDriven = kmNum - Number(prevLog.km);
  const calculatedConsumption = kmDriven / litersNum;

  if (!options?.isHistoricalCorrection) {
    if (calculatedConsumption > rule.maxConsumption) {
      return {
        ok: false,
        errorType: 'ABOVE_MAX',
        message: `O consumo calculado (${formatNumberPtBr(calculatedConsumption)} km/L) está ACIMA do máximo definido (${formatNumberPtBr(rule.maxConsumption)} km/L) para a placa ${cleanPlate}. Isso indica que você deixou de registrar algum abastecimento anterior. É obrigatório registrar primeiro o abastecimento anterior que esqueceu para posteriormente lançar este abastecimento atual.`,
        calculatedConsumption,
        kmDriven,
        prevLog,
        nextLog,
        rule,
        plateLogs: enrichedPlateLogs
      };
    }

    if (calculatedConsumption < rule.minConsumption) {
      return {
        ok: false,
        errorType: 'BELOW_MIN',
        message: `O consumo calculado (${formatNumberPtBr(calculatedConsumption)} km/L) está ABAIXO do mínimo definido (${formatNumberPtBr(rule.minConsumption)} km/L) para a placa ${cleanPlate}. Provavelmente houve digitação errada no abastecimento anterior. Acesse os abastecimentos anteriores desta placa para corrigir.`,
        calculatedConsumption,
        kmDriven,
        prevLog,
        nextLog,
        rule,
        plateLogs: enrichedPlateLogs
      };
    }
  }

  return {
    ok: true,
    calculatedConsumption,
    kmDriven,
    prevLog,
    nextLog,
    rule,
    plateLogs: enrichedPlateLogs
  };
};
