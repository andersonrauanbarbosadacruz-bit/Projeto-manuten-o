import React, { useState, useMemo } from 'react';
import { X, Edit3, Save, Trash2, AlertTriangle, CheckCircle2, Fuel } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FUEL_LOCATIONS, FUEL_TYPES, FuelLocation, FuelLogRecord, FuelType } from '../types';
import {
  enrichFuelLogsWithConsumption,
  formatDatePtBr,
  formatNumberPtBr,
  isTemporaryFuelVehicle,
  normalizePlate,
  sortFuelLogsChronologically,
  validateFuelLogCandidate
} from '../utils/fuelConsumptionHelper';

interface FuelPlateCorrectionModalProps {
  isOpen: boolean;
  plate: string;
  onClose: () => void;
  highlightMessage?: string;
}

export const FuelPlateCorrectionModal: React.FC<FuelPlateCorrectionModalProps> = ({
  isOpen,
  plate,
  onClose,
  highlightMessage
}) => {
  const {
    fuelLogs,
    fuelConsumptionRules,
    saveFuelLog,
    requestDelete,
    userRole,
    vehicles
  } = useApp();

  const normalizedPlate = normalizePlate(plate);
  const vehicleInfo = vehicles.find(v => normalizePlate(v.plate) === normalizedPlate);
  const isTempVehicle = isTemporaryFuelVehicle(normalizedPlate, vehicles);

  // ONLY records for this exact plate
  const plateLogs = useMemo(() => {
    const filtered = (fuelLogs || []).filter(
      f => f && normalizePlate(f.plate) === normalizedPlate
    );
    const enriched = enrichFuelLogsWithConsumption(filtered, fuelConsumptionRules, vehicles);
    return sortFuelLogsChronologically(enriched).reverse();
  }, [fuelLogs, fuelConsumptionRules, normalizedPlate, vehicles]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('12:00');
  const [editDriver, setEditDriver] = useState('');
  const [editFuelType, setEditFuelType] = useState<FuelType>('Diesel S10');
  const [editLiters, setEditLiters] = useState('');
  const [editKm, setEditKm] = useState('');
  const [editLocation, setEditLocation] = useState<FuelLocation>(FUEL_LOCATIONS[0]);
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const startEdit = (log: FuelLogRecord) => {
    setEditingId(log.id);
    setEditDate(log.date);
    setEditTime(log.time || '12:00');
    setEditDriver(log.driver);
    setEditFuelType(log.fuelType);
    setEditLiters(String(log.liters));
    setEditKm(String(log.km));
    setEditLocation(log.location);
    setEditNotes(log.notes || '');
    setEditError(null);
    setSavedNotice(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError(null);
  };

  const handleSaveEdit = (e: React.FormEvent, originalLog: FuelLogRecord) => {
    e.preventDefault();
    setEditError(null);

    const kmParsed = isTempVehicle && editKm.trim() === '' ? 0 : Number(editKm.replace(',', '.'));
    const validation = validateFuelLogCandidate(
      {
        plate: normalizedPlate,
        vehicleModel: originalLog.vehicleModel || vehicleInfo?.model,
        date: editDate,
        time: editTime,
        driver: editDriver,
        fuelType: editFuelType,
        liters: Number(editLiters.replace(',', '.')),
        km: kmParsed,
        location: editLocation,
        notes: editNotes.trim() || undefined,
        createdAt: originalLog.createdAt
      },
      fuelLogs,
      fuelConsumptionRules,
      originalLog.id,
      { isHistoricalCorrection: true, vehicles }
    );

    if (!validation.ok) {
      setEditError(validation.message || 'Verifique os valores informados.');
      return;
    }

    saveFuelLog({
      ...originalLog,
      date: editDate,
      time: editTime,
      driver: editDriver.trim(),
      plate: normalizedPlate,
      vehicleModel: originalLog.vehicleModel || vehicleInfo?.model,
      fuelType: editFuelType,
      liters: Number(editLiters.replace(',', '.')),
      km: kmParsed,
      location: editLocation,
      notes: editNotes.trim() || undefined
    });

    setEditingId(null);
    setSavedNotice(
      `Registro ${originalLog.code} da placa ${normalizedPlate} corrigido com sucesso! Você já pode voltar e confirmar o lançamento atual.`
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl shrink-0">
              <Fuel className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold truncate">
                Abastecimentos Anteriores — Placa {normalizedPlate}
              </h2>
              <p className="text-xs text-slate-400 truncate">
                {vehicleInfo ? `${vehicleInfo.model} · ` : ''}
                Exibindo exclusivamente os {plateLogs.length} registro(s) desta placa para conferência e correção
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {highlightMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs sm:text-sm font-medium flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Possível erro de digitação no abastecimento anterior</p>
                <p className="text-xs text-red-800">{highlightMessage}</p>
              </div>
            </div>
          )}

          {savedNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{savedNotice}</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shrink-0 cursor-pointer"
              >
                Voltar ao Lançamento
              </button>
            </div>
          )}

          {plateLogs.length === 0 ? (
            <div className="py-10 text-center border border-slate-200 rounded-xl bg-slate-50">
              <p className="text-sm font-bold text-slate-700">
                Nenhum abastecimento anterior registrado para a placa {normalizedPlate}.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {plateLogs.map((log: any) => {
                const isEditing = editingId === log.id;

                if (isEditing) {
                  return (
                    <form
                      key={log.id}
                      onSubmit={e => handleSaveEdit(e, log)}
                      className="p-4 rounded-xl border border-cyan-300 bg-cyan-50/40 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 font-mono">
                          Corrigindo {log.code} · Placa {normalizedPlate}
                        </span>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>

                      {editError && (
                        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-800">
                          {editError}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Data</label>
                          <input
                            type="date"
                            value={editDate}
                            onChange={e => setEditDate(e.target.value)}
                            required
                            className="w-full min-h-[42px] px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Horário</label>
                          <input
                            type="time"
                            value={editTime}
                            onChange={e => setEditTime(e.target.value)}
                            className="w-full min-h-[42px] px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Condutor</label>
                          <input
                            type="text"
                            value={editDriver}
                            onChange={e => setEditDriver(e.target.value)}
                            required
                            className="w-full min-h-[42px] px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Combustível</label>
                          <select
                            value={editFuelType}
                            onChange={e => setEditFuelType(e.target.value as FuelType)}
                            className="w-full min-h-[42px] px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                          >
                            {FUEL_TYPES.map(ft => (
                              <option key={ft} value={ft}>{ft}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Quantidade (Litros)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.1"
                            value={editLiters}
                            onChange={e => setEditLiters(e.target.value)}
                            required
                            className="w-full min-h-[42px] px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            {isTempVehicle ? 'KM (Opcional / Livre)' : 'KM (Odômetro)'}
                          </label>
                          <input
                            type="number"
                            step="1"
                            min={isTempVehicle ? '0' : '1'}
                            value={editKm}
                            onChange={e => setEditKm(e.target.value)}
                            required={!isTempVehicle}
                            className="w-full min-h-[42px] px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold tabular-nums"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Local</label>
                          <select
                            value={editLocation}
                            onChange={e => setEditLocation(e.target.value as FuelLocation)}
                            className="w-full min-h-[42px] px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                          >
                            {FUEL_LOCATIONS.map(loc => (
                              <option key={loc} value={loc}>{loc}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Observação</label>
                          <input
                            type="text"
                            value={editNotes}
                            onChange={e => setEditNotes(e.target.value)}
                            placeholder="Opcional"
                            className="w-full min-h-[42px] px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="min-h-[40px] inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Salvar Correção</span>
                        </button>
                      </div>
                    </form>
                  );
                }

                return (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                        <span className="font-mono font-bold text-slate-900">{log.code}</span>
                        <span className="text-slate-400">·</span>
                        <span className="font-bold text-slate-900 tabular-nums">
                          {formatDatePtBr(log.date)}{log.time ? ` ${log.time}` : ''}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="font-semibold text-slate-700">{log.fuelType}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-600">{log.location}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-700 tabular-nums">
                        <span>Condutor: <strong>{log.driver}</strong></span>
                        <span>
                          KM:{' '}
                          <strong className="font-mono">
                            {Number(log.km) > 0 ? Number(log.km).toLocaleString('pt-BR') : 'Não informado (Livre)'}
                          </strong>
                        </span>
                        <span>Qtd: <strong className="font-mono">{formatNumberPtBr(Number(log.liters), 2)} L</strong></span>
                        {log.status === 'TEMPORARY_EXEMPT' ? (
                          <span className="font-semibold text-amber-700">Temporário · Tudo permitido</span>
                        ) : log.consumptionKmPerL !== undefined ? (
                          <span className={`font-mono font-bold ${
                            log.status === 'ABOVE_MAX'
                              ? 'text-amber-700'
                              : log.status === 'BELOW_MIN'
                              ? 'text-red-700'
                              : 'text-emerald-700'
                          }`}>
                            Consumo: {formatNumberPtBr(log.consumptionKmPerL, 2)} km/L
                          </span>
                        ) : (
                          <span className="text-slate-500">1º registro (base)</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(log)}
                        className="min-h-[40px] inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-cyan-700" />
                        <span>Corrigir / Editar</span>
                      </button>

                      {userRole === 'ADMIN' && (
                        <button
                          type="button"
                          onClick={() =>
                            requestDelete({
                              type: 'fuel-log',
                              id: log.id,
                              code: log.code,
                              description: `${log.plate} · ${formatDatePtBr(log.date)} · ${log.liters}L`
                            })
                          }
                          className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Excluir registro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Fechar e Voltar
          </button>
        </div>
      </div>
    </div>
  );
};
