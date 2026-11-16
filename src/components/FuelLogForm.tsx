import React, { useState, useMemo, useEffect } from 'react';
import {
  Fuel,
  Calendar,
  User,
  Car,
  Gauge,
  MapPin,
  Save,
  AlertTriangle,
  CheckCircle2,
  History,
  Settings,
  ArrowRight,
  RotateCcw,
  Plus
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  FARMS,
  FUEL_LOCATIONS,
  FUEL_TYPES,
  FuelLocation,
  FuelLogRecord,
  FuelType,
  Vehicle
} from '../types';
import {
  formatDatePtBr,
  formatNumberPtBr,
  isTemporaryFuelVehicle,
  normalizePlate,
  resolveConsumptionRule,
  sortFuelLogsChronologically,
  validateFuelLogCandidate,
  FuelValidationResult
} from '../utils/fuelConsumptionHelper';
import { FuelConsumptionConfigModal } from './FuelConsumptionConfigModal';
import { FuelPlateCorrectionModal } from './FuelPlateCorrectionModal';

interface PendingFuelDraft {
  date: string;
  time: string;
  driver: string;
  plate: string;
  vehicleModel: string;
  fuelType: FuelType;
  liters: string;
  km: string;
  location: FuelLocation;
  notes: string;
}

interface FuelLogFormProps {
  editingLog?: FuelLogRecord | null;
  onSuccess?: (saved: FuelLogRecord) => void;
  onCancel?: () => void;
  leanMode?: boolean;
}

export const FuelLogForm: React.FC<FuelLogFormProps> = ({
  editingLog = null,
  onSuccess,
  onCancel,
  leanMode = false
}) => {
  const {
    vehicles,
    fuelLogs,
    fuelConsumptionRules,
    saveFuelLog,
    lockedFarm,
    selectedFarmFilter,
    userRole,
    setShowVehicleModal,
    setSyncToast
  } = useApp();

  const availablePlates = useMemo(() => {
    const map = new Map<string, { plate: string; model: string; farm?: string; isTemporary?: boolean }>();
    (vehicles || []).forEach((v: Vehicle) => {
      const p = normalizePlate(v.plate);
      if (p) {
        map.set(p, {
          plate: p,
          model: v.model || 'Veículo',
          farm: v.farm,
          isTemporary: isTemporaryFuelVehicle(p, vehicles)
        });
      }
    });
    (fuelLogs || []).forEach(f => {
      const p = normalizePlate(f.plate);
      if (p && !map.has(p)) {
        map.set(p, {
          plate: p,
          model: f.vehicleModel || 'Frota',
          isTemporary: isTemporaryFuelVehicle(p, vehicles)
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.isTemporary && !b.isTemporary) return 1;
      if (!a.isTemporary && b.isTemporary) return -1;
      return a.plate.localeCompare(b.plate);
    });
  }, [vehicles, fuelLogs]);

  const defaultLocation: FuelLocation = useMemo(() => {
    if (lockedFarm) return lockedFarm;
    if (selectedFarmFilter && selectedFarmFilter !== 'TODAS') return selectedFarmFilter;
    return FARMS[0];
  }, [lockedFarm, selectedFarmFilter]);

  const [date, setDate] = useState<string>(() =>
    editingLog?.date || new Date().toISOString().substring(0, 10)
  );
  const [time, setTime] = useState<string>(() => {
    if (editingLog?.time) return editingLog.time;
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [driver, setDriver] = useState<string>(() => editingLog?.driver || '');
  const [plate, setPlate] = useState<string>(() =>
    editingLog?.plate ? normalizePlate(editingLog.plate) : (availablePlates[0]?.plate || '')
  );
  const [vehicleModel, setVehicleModel] = useState<string>(() =>
    editingLog?.vehicleModel || availablePlates[0]?.model || ''
  );
  const [fuelType, setFuelType] = useState<FuelType>(() => editingLog?.fuelType || 'Diesel S10');
  const [liters, setLiters] = useState<string>(() =>
    editingLog?.liters ? String(editingLog.liters) : ''
  );
  const [km, setKm] = useState<string>(() => (editingLog?.km ? String(editingLog.km) : ''));
  const [location, setLocation] = useState<FuelLocation>(
    () => editingLog?.location || defaultLocation
  );
  const [notes, setNotes] = useState<string>(() => editingLog?.notes || '');

  // Guided anomaly workflow state
  const [pendingLaterDraft, setPendingLaterDraft] = useState<PendingFuelDraft | null>(null);
  const [restoredNotice, setRestoredNotice] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<FuelValidationResult | null>(null);

  // Sub-modals
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);

  // Sync vehicle model when plate changes
  useEffect(() => {
    if (!plate && availablePlates.length > 0) {
      setPlate(availablePlates[0].plate);
      setVehicleModel(availablePlates[0].model);
    } else if (plate) {
      const found = availablePlates.find(v => v.plate === normalizePlate(plate));
      if (found && found.model) setVehicleModel(found.model);
    }
  }, [plate, availablePlates]);

  const isTempVehicle = useMemo(
    () => isTemporaryFuelVehicle(plate, vehicles),
    [plate, vehicles]
  );

  const activeRule = useMemo(
    () => resolveConsumptionRule(plate, fuelConsumptionRules),
    [plate, fuelConsumptionRules]
  );

  // Previous fuelings strictly for the selected plate
  const selectedPlateHistory = useMemo(() => {
    const clean = normalizePlate(plate);
    if (!clean) return [];
    return sortFuelLogsChronologically(
      (fuelLogs || []).filter(f => f && normalizePlate(f.plate) === clean && f.id !== editingLog?.id)
    );
  }, [fuelLogs, plate, editingLog?.id]);

  // Live preview of consumption as the user types KM & Liters
  const livePreview = useMemo(() => {
    if (isTempVehicle) return null;
    const litersNum = Number(String(liters).replace(',', '.'));
    const kmNum = Number(String(km).replace(',', '.'));
    if (!plate || !date || !Number.isFinite(litersNum) || litersNum <= 0 || !Number.isFinite(kmNum) || kmNum <= 0) {
      return null;
    }
    return validateFuelLogCandidate(
      {
        plate,
        vehicleModel,
        date,
        time,
        driver: driver || 'Condutor',
        fuelType,
        liters: litersNum,
        km: kmNum,
        location,
        notes
      },
      fuelLogs,
      fuelConsumptionRules,
      editingLog?.id,
      { vehicles }
    );
  }, [isTempVehicle, plate, vehicleModel, date, time, driver, fuelType, liters, km, location, notes, fuelLogs, fuelConsumptionRules, editingLog?.id, vehicles]);

  // Clear stale submit validation when inputs are corrected
  useEffect(() => {
    if (validationResult && !validationResult.ok) {
      setValidationResult(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, time, plate, liters, km, driver, fuelType, location]);

  const handlePlateSelect = (newPlate: string) => {
    const clean = normalizePlate(newPlate);
    setPlate(clean);
    const found = availablePlates.find(v => v.plate === clean);
    setVehicleModel(found?.model || 'Frota');
  };

  const handleEnterMissedEarlierMode = () => {
    const draft: PendingFuelDraft = {
      date,
      time,
      driver,
      plate,
      vehicleModel,
      fuelType,
      liters,
      km,
      location,
      notes
    };
    setPendingLaterDraft(draft);
    setValidationResult(null);
    setRestoredNotice(null);

    // Suggest an earlier date (day before attempted date) and clear KM/liters so the user fills the forgotten entry
    if (date) {
      const dt = new Date(`${date}T12:00:00`);
      dt.setDate(dt.getDate() - 1);
      setDate(dt.toISOString().substring(0, 10));
    }
    setLiters('');
    setKm('');
    setNotes('Abastecimento anterior esquecido (lançado retroativamente)');
  };

  const handleCancelMissedMode = () => {
    if (!pendingLaterDraft) return;
    setDate(pendingLaterDraft.date);
    setTime(pendingLaterDraft.time);
    setDriver(pendingLaterDraft.driver);
    setPlate(pendingLaterDraft.plate);
    setVehicleModel(pendingLaterDraft.vehicleModel);
    setFuelType(pendingLaterDraft.fuelType);
    setLiters(pendingLaterDraft.liters);
    setKm(pendingLaterDraft.km);
    setLocation(pendingLaterDraft.location);
    setNotes(pendingLaterDraft.notes);
    setPendingLaterDraft(null);
    setValidationResult(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRestoredNotice(null);

    const litersNum = Number(String(liters).replace(',', '.'));
    const kmNum = isTempVehicle && km.trim() === '' ? 0 : Number(String(km).replace(',', '.'));

    // Also enforce that forgotten earlier entry stays strictly lower in KM than the stashed later entry
    if (pendingLaterDraft && !isTempVehicle) {
      const pendingKm = Number(String(pendingLaterDraft.km).replace(',', '.'));
      if (Number.isFinite(pendingKm) && kmNum >= pendingKm) {
        setValidationResult({
          ok: false,
          errorType: 'INVALID_KM',
          message: `O abastecimento anterior esquecido deve ter KM menor que o abastecimento atual pendente (${pendingKm.toLocaleString('pt-BR')} KM em ${formatDatePtBr(pendingLaterDraft.date)}).`,
          rule: activeRule,
          plateLogs: []
        });
        return;
      }
      if (date > pendingLaterDraft.date) {
        setValidationResult({
          ok: false,
          errorType: 'VALIDATION',
          message: `A data do abastecimento anterior esquecido deve ser igual ou anterior a ${formatDatePtBr(pendingLaterDraft.date)}.`,
          rule: activeRule,
          plateLogs: []
        });
        return;
      }
    }

    const res = validateFuelLogCandidate(
      {
        plate,
        vehicleModel,
        date,
        time,
        driver,
        fuelType,
        liters: litersNum,
        km: kmNum,
        location,
        notes: notes.trim() || undefined,
        createdAt: editingLog?.createdAt
      },
      fuelLogs,
      fuelConsumptionRules,
      editingLog?.id,
      { vehicles }
    );

    if (!res.ok) {
      setValidationResult(res);
      return;
    }

    const saved = saveFuelLog({
      id: editingLog?.id,
      code: editingLog?.code,
      createdAt: editingLog?.createdAt,
      date,
      time,
      driver: driver.trim(),
      plate,
      vehicleModel: vehicleModel || 'Frota',
      fuelType,
      liters: litersNum,
      km: kmNum,
      location,
      notes: notes.trim() || undefined
    });

    // If we just saved the missed earlier fueling, immediately restore the pending current fueling!
    if (pendingLaterDraft) {
      setDate(pendingLaterDraft.date);
      setTime(pendingLaterDraft.time);
      setDriver(pendingLaterDraft.driver);
      setPlate(pendingLaterDraft.plate);
      setVehicleModel(pendingLaterDraft.vehicleModel);
      setFuelType(pendingLaterDraft.fuelType);
      setLiters(pendingLaterDraft.liters);
      setKm(pendingLaterDraft.km);
      setLocation(pendingLaterDraft.location);
      setNotes(pendingLaterDraft.notes);
      setPendingLaterDraft(null);
      setValidationResult(null);
      setRestoredNotice(
        `Abastecimento anterior ${saved.code} (${formatDatePtBr(saved.date)} · ${Number(saved.km).toLocaleString('pt-BR')} KM) salvo! Agora confirme o envio do abastecimento atual restaurado abaixo.`
      );
      setSyncToast({
        isOpen: true,
        message: `Abastecimento anterior ${saved.code} salvo! Revise e confirme o abastecimento atual.`
      });
      return;
    }

    setSyncToast({
      isOpen: true,
      message: editingLog
        ? `Abastecimento ${saved.code} atualizado com sucesso!`
        : `Abastecimento ${saved.code} (${saved.plate} · ${formatNumberPtBr(saved.liters, 1)} L) registrado!`
    });

    if (onSuccess) {
      onSuccess(saved);
    } else if (!editingLog) {
      // Reset numeric fields for next quick entry
      setLiters('');
      setKm('');
      setNotes('');
      setValidationResult(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stashed Pending Entry Banner (Active while recording forgotten earlier fueling) */}
      {pendingLaterDraft && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2 text-amber-950">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
              <span className="text-sm font-extrabold">
                Etapa 1 de 2: Lançando Abastecimento Anterior Esquecido ({pendingLaterDraft.plate})
              </span>
            </div>
            <button
              type="button"
              onClick={handleCancelMissedMode}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-900 text-xs font-bold hover:bg-amber-100 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Voltar ao lançamento original</span>
            </button>
          </div>
          <p className="text-xs text-amber-900 leading-relaxed">
            Preencha os dados do abastecimento anterior que ficou faltando. Assim que salvar, retornaremos automaticamente para concluir o abastecimento atual de{' '}
            <strong className="font-mono tabular-nums">
              {formatDatePtBr(pendingLaterDraft.date)} · {Number(pendingLaterDraft.km).toLocaleString('pt-BR')} KM · {pendingLaterDraft.liters} L
            </strong>.
          </p>
        </div>
      )}

      {/* Restored Notice after saving forgotten entry */}
      {restoredNotice && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 flex items-start space-x-2.5 text-emerald-950">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm font-semibold">{restoredNotice}</div>
        </div>
      )}

      {/* Active Consumption Rule Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          {isTempVehicle ? (
            <>
              <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                Veículo Temporário — {plate} (Modo Livre)
              </div>
              <div className="text-xs sm:text-sm font-semibold text-slate-700">
                Sem parâmetro de consumo e sem validação de quilometragem — tudo permitido.
              </div>
            </>
          ) : (
            <>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Parâmetros de Consumo Ativos {plate ? `— ${plate}` : ''}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm font-mono tabular-nums">
                <span className="text-red-700 font-bold">
                  Mín: {formatNumberPtBr(activeRule.minConsumption, 1)} km/L
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-emerald-800 font-bold">
                  Médio: {formatNumberPtBr(activeRule.avgConsumption, 1)} km/L
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-amber-700 font-bold">
                  Máx: {formatNumberPtBr(activeRule.maxConsumption, 1)} km/L
                </span>
                {activeRule.plate === 'DEFAULT' && (
                  <span className="font-sans text-[11px] text-slate-500">(Padrão geral)</span>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {plate && (
            <button
              type="button"
              onClick={() => setShowCorrectionModal(true)}
              className="min-h-[40px] inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-slate-600" />
              <span>Histórico de {plate} ({selectedPlateHistory.length})</span>
            </button>
          )}
          {userRole === 'ADMIN' && (
            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              className="min-h-[40px] inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-emerald-700" />
              <span>Definir Consumo (Mín/Méd/Máx)</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 space-y-5 shadow-2xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                {pendingLaterDraft
                  ? 'Registrar Abastecimento Anterior Esquecido'
                  : editingLog
                  ? `Editar Abastecimento ${editingLog.code}`
                  : 'Novo Abastecimento de Veículo'}
              </h2>
              <p className="text-xs text-slate-500">
                Informe data, condutor, placa, combustível, litros, KM e local
              </p>
            </div>
          </div>
          {onCancel && !leanMode && (
            <button
              type="button"
              onClick={onCancel}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Cancelar
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Data */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Data do Abastecimento <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="w-full min-h-[44px] pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Horário */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Horário (Opcional)
            </label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* Condutor */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Condutor <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              <input
                type="text"
                value={driver}
                onChange={e => setDriver(e.target.value)}
                placeholder="Nome do condutor"
                required
                className="w-full min-h-[44px] pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Placa (Lista Suspensa) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Placa do Veículo <span className="text-red-500">*</span>
              </label>
              {userRole === 'ADMIN' && !pendingLaterDraft && (
                <button
                  type="button"
                  onClick={() => setShowVehicleModal(true)}
                  className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center cursor-pointer"
                >
                  <Plus className="w-3 h-3 mr-0.5" />
                  Gerenciar Placas
                </button>
              )}
            </div>
            <div className="relative">
              <Car className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              <select
                value={plate}
                onChange={e => handlePlateSelect(e.target.value)}
                disabled={Boolean(pendingLaterDraft)}
                required
                className="w-full min-h-[44px] pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-600 disabled:opacity-70"
              >
                <option value="">Selecione a placa...</option>
                {availablePlates.map(v => (
                  <option key={v.plate} value={v.plate}>
                    {v.plate} — {v.model}{v.isTemporary ? ' (Livre / Sem KM)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tipo de Combustível (Lista Suspensa) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tipo de Combustível <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Fuel className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              <select
                value={fuelType}
                onChange={e => setFuelType(e.target.value as FuelType)}
                required
                className="w-full min-h-[44px] pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-600"
              >
                {FUEL_TYPES.map(ft => (
                  <option key={ft} value={ft}>
                    {ft}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Local (Lista Suspensa: Fazendas + Posto L3 + Posto Raul Lins) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Local do Abastecimento <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              <select
                value={location}
                onChange={e => setLocation(e.target.value as FuelLocation)}
                required
                className="w-full min-h-[44px] pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-600"
              >
                <optgroup label="Fazendas">
                  {FARMS.map(f => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Postos Externos">
                  <option value="Posto L3">Posto L3</option>
                  <option value="Posto Raul Lins">Posto Raul Lins</option>
                </optgroup>
              </select>
            </div>
          </div>

          {/* Quantidade (Litros) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Quantidade (Litros) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.1"
              inputMode="decimal"
              value={liters}
              onChange={e => setLiters(e.target.value)}
              placeholder="Ex: 45,50"
              required
              className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 tabular-nums focus:bg-white focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* KM (Hodômetro) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {isTempVehicle ? (
                <>KM (Opcional / Livre)</>
              ) : (
                <>
                  KM Atual (Hodômetro) <span className="text-red-500">*</span>
                </>
              )}
            </label>
            <div className="relative">
              <Gauge className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              <input
                type="number"
                step="1"
                min={isTempVehicle ? '0' : '1'}
                inputMode="numeric"
                value={km}
                onChange={e => setKm(e.target.value)}
                placeholder={isTempVehicle ? 'Opcional (tudo permitido)' : 'Ex: 45820'}
                required={!isTempVehicle}
                className="w-full min-h-[44px] pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 tabular-nums focus:bg-white focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Observações (Opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={
                isTempVehicle
                  ? 'Identificação do veículo temporário, motorista...'
                  : 'Cupom fiscal, bomba, observação...'
              }
              className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>

        {/* Temporary Vehicle Libre Banner */}
        {isTempVehicle && (
          <div className="p-3.5 rounded-xl border bg-amber-50/70 border-amber-200 text-amber-950 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-2">
            <div>
              <strong>Veículo Temporário ({plate}):</strong> neste cadastro não há parâmetro de consumo (mínimo/máximo) nem obrigatoriedade ou trava de quilometragem — todo abastecimento é permitido.
            </div>
          </div>
        )}

        {/* Live Consumption Preview Strip */}
        {livePreview && (
          <div
            className={`p-3.5 rounded-xl border text-xs sm:text-sm flex flex-wrap items-center justify-between gap-2 tabular-nums ${
              !livePreview.ok && livePreview.errorType === 'ABOVE_MAX'
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : !livePreview.ok && (livePreview.errorType === 'BELOW_MIN' || livePreview.errorType === 'INVALID_KM')
                ? 'bg-red-50 border-red-300 text-red-950'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            {livePreview.prevLog ? (
              <div className="space-y-0.5">
                <div className="font-bold">
                  Último abastecimento anterior de {plate}:{' '}
                  <span className="font-mono">
                    {formatDatePtBr(livePreview.prevLog.date)} · {Number(livePreview.prevLog.km).toLocaleString('pt-BR')} KM
                  </span>
                </div>
                {livePreview.kmDriven !== undefined && livePreview.calculatedConsumption !== undefined && (
                  <div className="text-xs">
                    Distância percorrida:{' '}
                    <strong className="font-mono">{livePreview.kmDriven.toLocaleString('pt-BR')} KM</strong>{' '}
                    · Consumo calculado:{' '}
                    <strong className="font-mono text-sm">
                      {formatNumberPtBr(livePreview.calculatedConsumption, 2)} km/L
                    </strong>
                  </div>
                )}
              </div>
            ) : (
              <div className="font-semibold">
                1º registro para a placa <strong className="font-mono">{plate}</strong> (servirá como KM inicial de referência para os próximos abastecimentos).
              </div>
            )}

            {livePreview.calculatedConsumption !== undefined && (
              <div className="font-mono text-xs font-extrabold">
                {livePreview.ok
                  ? '✓ Dentro da faixa esperada'
                  : livePreview.errorType === 'ABOVE_MAX'
                  ? `▲ Acima do Máx (${formatNumberPtBr(activeRule.maxConsumption, 1)} km/L)`
                  : `▼ Abaixo do Mín (${formatNumberPtBr(activeRule.minConsumption, 1)} km/L)`}
              </div>
            )}
          </div>
        )}

        {/* Strict Blocking Validation & Guided Recovery Actions */}
        {validationResult && !validationResult.ok && (
          <div
            className={`rounded-2xl p-4 sm:p-5 border space-y-3 ${
              validationResult.errorType === 'ABOVE_MAX'
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : 'bg-red-50 border-red-300 text-red-950'
            }`}
          >
            <div className="flex items-start space-x-3">
              <AlertTriangle
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  validationResult.errorType === 'ABOVE_MAX' ? 'text-amber-700' : 'text-red-600'
                }`}
              />
              <div className="space-y-1.5 flex-1">
                <h3 className="text-sm font-extrabold">
                  {validationResult.errorType === 'ABOVE_MAX'
                    ? 'Atenção: Consumo acima do máximo — Abastecimento anterior esquecido'
                    : validationResult.errorType === 'BELOW_MIN'
                    ? 'Atenção: Consumo abaixo do mínimo — Possível erro de digitação anterior'
                    : validationResult.errorType === 'INVALID_KM'
                    ? 'Inconsistência de Hodômetro (KM)'
                    : 'Dados obrigatórios pendentes'}
                </h3>
                <p className="text-xs sm:text-sm leading-relaxed">
                  {validationResult.message}
                </p>
              </div>
            </div>

            {/* Required Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {validationResult.errorType === 'ABOVE_MAX' && (
                <button
                  type="button"
                  onClick={handleEnterMissedEarlierMode}
                  className="min-h-[44px] inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs sm:text-sm font-extrabold cursor-pointer transition-colors"
                >
                  <span>Registrar Abastecimento Anterior Esquecido Primeiro</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {(validationResult.errorType === 'BELOW_MIN' || validationResult.errorType === 'INVALID_KM') && plate && (
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(true)}
                  className="min-h-[44px] inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs sm:text-sm font-extrabold cursor-pointer transition-colors"
                >
                  <History className="w-4 h-4" />
                  <span>Acessar Abastecimentos Anteriores de {plate} para Corrigir</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Submit Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="min-h-[44px] px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold cursor-pointer"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            className="min-h-[48px] inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-extrabold shadow-sm transition-all active:scale-[0.99] cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>
              {pendingLaterDraft
                ? 'Salvar Abastecimento Anterior Esquecido'
                : editingLog
                ? 'Salvar Alterações'
                : 'Registrar Abastecimento'}
            </span>
          </button>
        </div>
      </form>

      {/* Modals */}
      {userRole === 'ADMIN' && (
        <FuelConsumptionConfigModal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          initialPlate={plate}
        />
      )}

      <FuelPlateCorrectionModal
        isOpen={showCorrectionModal}
        plate={plate}
        onClose={() => setShowCorrectionModal(false)}
        highlightMessage={
          validationResult?.errorType === 'BELOW_MIN' || validationResult?.errorType === 'INVALID_KM'
            ? validationResult.message
            : undefined
        }
      />
    </div>
  );
};
