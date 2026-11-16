import React, { useState, useMemo, useEffect } from 'react';
import { X, Gauge, Plus, Trash2, CheckCircle2, AlertTriangle, CheckSquare, Square, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FuelConsumptionRule, Vehicle } from '../types';
import { formatNumberPtBr, isTemporaryFuelVehicle, normalizePlate } from '../utils/fuelConsumptionHelper';

interface FuelConsumptionConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlate?: string;
}

export const FuelConsumptionConfigModal: React.FC<FuelConsumptionConfigModalProps> = ({
  isOpen,
  onClose,
  initialPlate
}) => {
  const {
    userRole,
    vehicles,
    fuelLogs,
    fuelConsumptionRules,
    saveFuelConsumptionRule,
    saveFuelConsumptionRulesBatch,
    deleteFuelConsumptionRule
  } = useApp();

  const defaultRule = useMemo(
    () =>
      fuelConsumptionRules.find(r => r.plate === 'DEFAULT') || {
        id: 'fcr_default',
        plate: 'DEFAULT',
        minConsumption: 5,
        avgConsumption: 10,
        maxConsumption: 16
      },
    [fuelConsumptionRules]
  );

  const { configurablePlates, temporaryPlates } = useMemo(() => {
    const map = new Map<string, { plate: string; model: string; isTemp: boolean }>();
    (vehicles || []).forEach((v: Vehicle) => {
      const p = normalizePlate(v.plate);
      if (!p) return;
      map.set(p, {
        plate: p,
        model: v.model || 'Veículo',
        isTemp: isTemporaryFuelVehicle(p, vehicles)
      });
    });
    (fuelLogs || []).forEach(f => {
      const p = normalizePlate(f.plate);
      if (p && !map.has(p)) {
        map.set(p, {
          plate: p,
          model: f.vehicleModel || 'Frota',
          isTemp: isTemporaryFuelVehicle(p, vehicles)
        });
      }
    });

    const all = Array.from(map.values()).sort((a, b) => a.plate.localeCompare(b.plate));
    return {
      configurablePlates: all.filter(item => !item.isTemp),
      temporaryPlates: all.filter(item => item.isTemp)
    };
  }, [vehicles, fuelLogs]);

  const initialCleanPlate = useMemo(() => {
    if (!initialPlate) return '';
    const clean = normalizePlate(initialPlate);
    return isTemporaryFuelVehicle(clean, vehicles) ? '' : clean;
  }, [initialPlate, vehicles]);

  const [selectedPlates, setSelectedPlates] = useState<string[]>(() =>
    initialCleanPlate ? [initialCleanPlate] : []
  );
  const [applyToDefault, setApplyToDefault] = useState<boolean>(() => !initialCleanPlate);
  const [plateSearch, setPlateSearch] = useState('');

  const referenceRule = useMemo(() => {
    if (selectedPlates.length === 1) {
      return fuelConsumptionRules.find(r => r.plate === selectedPlates[0]) || defaultRule;
    }
    return defaultRule;
  }, [fuelConsumptionRules, selectedPlates, defaultRule]);

  const [minVal, setMinVal] = useState<string>(() => String(referenceRule.minConsumption));
  const [avgVal, setAvgVal] = useState<string>(() => String(referenceRule.avgConsumption));
  const [maxVal, setMaxVal] = useState<string>(() => String(referenceRule.maxConsumption));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    if (initialCleanPlate) {
      setSelectedPlates([initialCleanPlate]);
      setApplyToDefault(false);
      const found = fuelConsumptionRules.find(r => r.plate === initialCleanPlate) || defaultRule;
      setMinVal(String(found.minConsumption));
      setAvgVal(String(found.avgConsumption));
      setMaxVal(String(found.maxConsumption));
    } else {
      setSelectedPlates(configurablePlates.map(p => p.plate));
      setApplyToDefault(true);
      setMinVal(String(defaultRule.minConsumption));
      setAvgVal(String(defaultRule.avgConsumption));
      setMaxVal(String(defaultRule.maxConsumption));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialCleanPlate]);

  if (!isOpen || userRole !== 'ADMIN') return null;

  const allSelected =
    configurablePlates.length > 0 &&
    configurablePlates.every(p => selectedPlates.includes(p.plate));

  const filteredConfigurablePlates = configurablePlates.filter(p => {
    if (!plateSearch.trim()) return true;
    const q = plateSearch.toLowerCase();
    return p.plate.toLowerCase().includes(q) || p.model.toLowerCase().includes(q);
  });

  const handleToggleAllVehicles = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (allSelected) {
      setSelectedPlates([]);
    } else {
      setSelectedPlates(configurablePlates.map(p => p.plate));
      setApplyToDefault(true);
    }
  };

  const handleTogglePlate = (plate: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setSelectedPlates(prev => {
      const next = prev.includes(plate) ? prev.filter(p => p !== plate) : [...prev, plate];
      if (next.length === 1) {
        const found = fuelConsumptionRules.find(r => r.plate === next[0]) || defaultRule;
        setMinVal(String(found.minConsumption));
        setAvgVal(String(found.avgConsumption));
        setMaxVal(String(found.maxConsumption));
      }
      return next;
    });
  };

  const handleEditSingle = (target: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const found = fuelConsumptionRules.find(r => r.plate === target) || defaultRule;
    setMinVal(String(found.minConsumption));
    setAvgVal(String(found.avgConsumption));
    setMaxVal(String(found.maxConsumption));
    if (target === 'DEFAULT') {
      setSelectedPlates([]);
      setApplyToDefault(true);
    } else {
      setSelectedPlates([target]);
      setApplyToDefault(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!applyToDefault && selectedPlates.length === 0) {
      setErrorMsg('Marque pelo menos um veículo, clique em "Marcar todos os veículos" ou selecione o Padrão Geral da Frota.');
      return;
    }

    const minNum = Number(minVal.replace(',', '.'));
    const avgNum = Number(avgVal.replace(',', '.'));
    const maxNum = Number(maxVal.replace(',', '.'));

    if (!Number.isFinite(minNum) || minNum <= 0) {
      setErrorMsg('Informe um consumo mínimo válido maior que 0 km/L.');
      return;
    }
    if (!Number.isFinite(avgNum) || avgNum < minNum) {
      setErrorMsg('O consumo médio deve ser maior ou igual ao consumo mínimo.');
      return;
    }
    if (!Number.isFinite(maxNum) || maxNum < avgNum) {
      setErrorMsg('O consumo máximo deve ser maior ou igual ao consumo médio.');
      return;
    }

    const minFixed = Number(minNum.toFixed(2));
    const avgFixed = Number(avgNum.toFixed(2));
    const maxFixed = Number(maxNum.toFixed(2));

    // If all vehicles are marked AND Padrão Geral is checked: update DEFAULT & unify all specific overrides
    if (allSelected && applyToDefault) {
      const overrideIds = fuelConsumptionRules
        .filter(r => r.plate !== 'DEFAULT')
        .map(r => r.id);

      saveFuelConsumptionRulesBatch({
        rules: [
          {
            id: defaultRule.id,
            plate: 'DEFAULT',
            minConsumption: minFixed,
            avgConsumption: avgFixed,
            maxConsumption: maxFixed
          }
        ],
        deleteRuleIds: overrideIds
      });

      setSuccessMsg(
        `Parâmetro aplicado para TODOS os ${configurablePlates.length} veículos da frota: Mín ${formatNumberPtBr(minFixed, 1)} · Médio ${formatNumberPtBr(avgFixed, 1)} · Máx ${formatNumberPtBr(maxFixed, 1)} km/L.`
      );
      return;
    }

    // Single target optimization or multi-select batch
    const rulesToSave: Array<Omit<FuelConsumptionRule, 'id'> & { id?: string }> = [];
    if (applyToDefault) {
      rulesToSave.push({
        id: defaultRule.id,
        plate: 'DEFAULT',
        minConsumption: minFixed,
        avgConsumption: avgFixed,
        maxConsumption: maxFixed
      });
    }
    selectedPlates.forEach(plate => {
      const existing = fuelConsumptionRules.find(r => r.plate === plate);
      rulesToSave.push({
        id: existing?.id,
        plate,
        minConsumption: minFixed,
        avgConsumption: avgFixed,
        maxConsumption: maxFixed
      });
    });

    if (rulesToSave.length === 1) {
      const saved = saveFuelConsumptionRule(rulesToSave[0]);
      setSuccessMsg(
        saved.plate === 'DEFAULT'
          ? `Padrão geral atualizado: Mín ${formatNumberPtBr(saved.minConsumption, 1)} · Médio ${formatNumberPtBr(saved.avgConsumption, 1)} · Máx ${formatNumberPtBr(saved.maxConsumption, 1)} km/L.`
          : `Parâmetro da placa ${saved.plate} salvo com sucesso!`
      );
    } else {
      saveFuelConsumptionRulesBatch({ rules: rulesToSave });
      setSuccessMsg(
        `Parâmetro salvo para ${selectedPlates.length} veículo(s)${applyToDefault ? ' + Padrão Geral' : ''}: Mín ${formatNumberPtBr(minFixed, 1)} · Médio ${formatNumberPtBr(avgFixed, 1)} · Máx ${formatNumberPtBr(maxFixed, 1)} km/L.`
      );
    }
  };

  const specificRules = fuelConsumptionRules
    .filter(r => r.plate !== 'DEFAULT' && !isTemporaryFuelVehicle(r.plate, vehicles))
    .sort((a, b) => a.plate.localeCompare(b.plate));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl shrink-0">
              <Gauge className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold truncate">
                Parâmetros de Consumo (Mínimo, Médio e Máximo)
              </h2>
              <p className="text-xs text-slate-400 truncate">
                Define a faixa esperada em km/L para alertas de abastecimento esquecido ou erro de digitação
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
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          <form onSubmit={handleSave} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            {/* Step 1: Select All Vehicles or Specific Vehicles */}
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  1. Selecionar veículos ({selectedPlates.length}/{configurablePlates.length} marcados)
                </label>

                <button
                  type="button"
                  onClick={handleToggleAllVehicles}
                  className={`min-h-[38px] inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                    allSelected
                      ? 'bg-emerald-700 text-white border-emerald-800'
                      : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {allSelected ? (
                    <CheckSquare className="w-4 h-4 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 shrink-0" />
                  )}
                  <span>
                    {allSelected ? 'Todos os veículos marcados' : `Marcar todos os veículos (${configurablePlates.length})`}
                  </span>
                </button>
              </div>

              {/* Padrão Geral checkbox */}
              <label className="flex items-start space-x-2 p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyToDefault}
                  onChange={e => setApplyToDefault(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                />
                <span>
                  <strong>Aplicar também ao Padrão Geral da Frota</strong>{' '}
                  <span className="text-slate-500">
                    (vale para todos os veículos sem regra individual e novos veículos cadastrados)
                  </span>
                </span>
              </label>

              {/* Search + Multi-select Vehicle Grid */}
              <div className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={plateSearch}
                    onChange={e => setPlateSearch(e.target.value)}
                    placeholder="Filtrar placa ou modelo..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {filteredConfigurablePlates.map(v => {
                    const checked = selectedPlates.includes(v.plate);
                    return (
                      <label
                        key={v.plate}
                        className={`flex items-center space-x-2 px-2.5 py-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          checked
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                            : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleTogglePlate(v.plate)}
                          className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600 shrink-0"
                        />
                        <span className="font-mono font-extrabold shrink-0">{v.plate}</span>
                        <span className="text-slate-500 truncate font-medium">· {v.model}</span>
                      </label>
                    );
                  })}
                </div>

                {temporaryPlates.length > 0 && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                    Veículo temporário ({temporaryPlates.map(t => t.plate).join(', ')}) não usa parâmetro de consumo nem validação de KM (tudo permitido).
                  </p>
                )}
              </div>
            </div>

            {/* Step 2: Min / Avg / Max Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-red-700 mb-1">
                  Consumo Mínimo (km/L)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={minVal}
                  onChange={e => setMinVal(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 tabular-nums focus:ring-2 focus:ring-emerald-600"
                  placeholder="Ex: 5.0"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Abaixo disso: alerta erro anterior
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1">
                  Consumo Médio (km/L)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={avgVal}
                  onChange={e => setAvgVal(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 tabular-nums focus:ring-2 focus:ring-emerald-600"
                  placeholder="Ex: 10.0"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Referência esperada no gráfico
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-700 mb-1">
                  Consumo Máximo (km/L)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={maxVal}
                  onChange={e => setMaxVal(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 tabular-nums focus:ring-2 focus:ring-emerald-600"
                  placeholder="Ex: 16.0"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Acima disso: bloqueia e exige anterior
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-start space-x-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-start space-x-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                className="min-h-[44px] inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {allSelected && applyToDefault
                    ? `Salvar para Todos os Veículos (${configurablePlates.length})`
                    : selectedPlates.length > 0
                    ? `Salvar para ${selectedPlates.length} Veículo(s)`
                    : 'Salvar Padrão Geral'}
                </span>
              </button>
            </div>
          </form>

          {/* Active Rules Overview */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Regras Configuradas ({1 + specificRules.length})
            </h3>

            {/* Default Rule Card */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-slate-900">Padrão Geral da Frota</div>
                <div className="text-xs text-slate-500">
                  {specificRules.length === 0
                    ? `Aplicado a todos os ${configurablePlates.length} veículos da frota`
                    : 'Aplicado às placas sem configuração individual'}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums">
                <span className="text-red-700 font-bold">Mín {formatNumberPtBr(defaultRule.minConsumption, 1)}</span>
                <span className="text-emerald-800 font-bold">Méd {formatNumberPtBr(defaultRule.avgConsumption, 1)}</span>
                <span className="text-amber-700 font-bold">Máx {formatNumberPtBr(defaultRule.maxConsumption, 1)} km/L</span>
                <button
                  type="button"
                  onClick={() => handleEditSingle('DEFAULT')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-sans font-bold text-xs cursor-pointer"
                >
                  Editar
                </button>
              </div>
            </div>

            {specificRules.map((rule: FuelConsumptionRule) => {
              const veh = configurablePlates.find(v => v.plate === rule.plate);
              return (
                <div
                  key={rule.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white flex flex-wrap items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900 font-mono">
                      {rule.plate}
                      {veh && <span className="font-sans font-semibold text-slate-600"> · {veh.model}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums">
                    <span className="text-red-700 font-bold">Mín {formatNumberPtBr(rule.minConsumption, 1)}</span>
                    <span className="text-emerald-800 font-bold">Méd {formatNumberPtBr(rule.avgConsumption, 1)}</span>
                    <span className="text-amber-700 font-bold">Máx {formatNumberPtBr(rule.maxConsumption, 1)} km/L</span>
                    <button
                      type="button"
                      onClick={() => handleEditSingle(rule.plate)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-sans font-bold text-xs cursor-pointer"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteFuelConsumptionRule(rule.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Remover regra específica (volta ao padrão geral)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
