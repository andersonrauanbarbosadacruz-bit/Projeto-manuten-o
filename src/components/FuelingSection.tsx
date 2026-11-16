import React, { useState, useMemo } from 'react';
import {
  Fuel,
  Plus,
  Search,
  Settings,
  Download,
  Edit3,
  Trash2,
  History,
  X,
  Trophy,
  Gauge,
  Droplets,
  Route
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
  EnrichedFuelLog,
  enrichFuelLogsWithConsumption,
  formatDatePtBr,
  formatNumberPtBr,
  normalizePlate
} from '../utils/fuelConsumptionHelper';
import { FuelConsumptionChart } from './FuelConsumptionChart';
import { FuelConsumptionConfigModal } from './FuelConsumptionConfigModal';
import { FuelPlateCorrectionModal } from './FuelPlateCorrectionModal';
import { FuelLogForm } from './FuelLogForm';

const MONTH_NAMES_PT: Record<string, string> = {
  '01': 'Janeiro',
  '02': 'Fevereiro',
  '03': 'Março',
  '04': 'Abril',
  '05': 'Maio',
  '06': 'Junho',
  '07': 'Julho',
  '08': 'Agosto',
  '09': 'Setembro',
  '10': 'Outubro',
  '11': 'Novembro',
  '12': 'Dezembro'
};

const formatMonthLabel = (ym: string): string => {
  const [year, month] = ym.split('-');
  if (!year || !month) return ym;
  return `${MONTH_NAMES_PT[month] || month} / ${year}`;
};

export const FuelingSection: React.FC = () => {
  const {
    fuelLogs,
    fuelConsumptionRules,
    vehicles,
    userRole,
    selectedFarmFilter,
    requestDelete,
    startNewFleetAction
  } = useApp();

  // Filters
  const [monthFilter, setMonthFilter] = useState<string>('TODOS');
  const [plateFilter, setPlateFilter] = useState<string>('');
  const [fuelTypeFilter, setFuelTypeFilter] = useState<FuelType | 'TODOS'>('TODOS');
  const [locationFilter, setLocationFilter] = useState<FuelLocation | 'TODOS'>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [correctionPlate, setCorrectionPlate] = useState<string | null>(null);
  const [editingFuelLog, setEditingFuelLog] = useState<FuelLogRecord | null>(null);

  // Enrich all fuel logs dynamically per-plate in chronological order FIRST
  // (so month/location filters never break the previous-KM baseline calculation!)
  const enrichedAll = useMemo(() => {
    return enrichFuelLogsWithConsumption(fuelLogs || [], fuelConsumptionRules || [], vehicles);
  }, [fuelLogs, fuelConsumptionRules, vehicles]);

  const availablePlates = useMemo(() => {
    const map = new Map<string, { plate: string; model: string }>();
    (vehicles || []).forEach((v: Vehicle) => {
      const p = normalizePlate(v.plate);
      if (p) map.set(p, { plate: p, model: v.model || 'Veículo' });
    });
    (fuelLogs || []).forEach(f => {
      const p = normalizePlate(f.plate);
      if (p && !map.has(p)) {
        map.set(p, { plate: p, model: f.vehicleModel || 'Frota' });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.plate.localeCompare(b.plate));
  }, [vehicles, fuelLogs]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    const currentMonth = new Date().toISOString().substring(0, 7);
    set.add(currentMonth);
    (fuelLogs || []).forEach(f => {
      if (f?.date && f.date.length >= 7) {
        set.add(f.date.substring(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [fuelLogs]);

  // Apply filters
  const filteredLogs = useMemo(() => {
    return enrichedAll
      .filter((log: EnrichedFuelLog) => {
        // Global farm filter (if set and log location is a farm, filter by it; external gas stations pass unless specific location chosen)
        if (
          selectedFarmFilter !== 'TODAS' &&
          FARMS.includes(log.location as any) &&
          log.location !== selectedFarmFilter
        ) {
          return false;
        }

        if (monthFilter !== 'TODOS' && (!log.date || !log.date.startsWith(monthFilter))) {
          return false;
        }

        if (plateFilter && normalizePlate(log.plate) !== normalizePlate(plateFilter)) {
          return false;
        }

        if (fuelTypeFilter !== 'TODOS' && log.fuelType !== fuelTypeFilter) {
          return false;
        }

        if (locationFilter !== 'TODOS' && log.location !== locationFilter) {
          return false;
        }

        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchCode = (log.code || '').toLowerCase().includes(q);
          const matchDriver = (log.driver || '').toLowerCase().includes(q);
          const matchPlate = (log.plate || '').toLowerCase().includes(q);
          const matchModel = (log.vehicleModel || '').toLowerCase().includes(q);
          const matchLoc = (log.location || '').toLowerCase().includes(q);
          const matchNotes = (log.notes || '').toLowerCase().includes(q);
          if (!matchCode && !matchDriver && !matchPlate && !matchModel && !matchLoc && !matchNotes) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (Number(b.km) || 0) - (Number(a.km) || 0);
      });
  }, [enrichedAll, selectedFarmFilter, monthFilter, plateFilter, fuelTypeFilter, locationFilter, searchTerm]);

  const hasActiveFilters = Boolean(
    monthFilter !== 'TODOS' ||
      plateFilter ||
      fuelTypeFilter !== 'TODOS' ||
      locationFilter !== 'TODOS' ||
      searchTerm.trim()
  );

  const clearAllFilters = () => {
    setMonthFilter('TODOS');
    setPlateFilter('');
    setFuelTypeFilter('TODOS');
    setLocationFilter('TODOS');
    setSearchTerm('');
  };

  // KPIs for filtered logs
  const kpis = useMemo(() => {
    const totalLiters = filteredLogs.reduce((acc, l) => acc + (Number(l.liters) || 0), 0);
    const measured = filteredLogs.filter(
      l => l.consumptionKmPerL !== undefined && (l.kmDriven || 0) > 0
    );
    const totalKmDriven = measured.reduce((acc, l) => acc + (l.kmDriven || 0), 0);
    const measuredLiters = measured.reduce((acc, l) => acc + (Number(l.liters) || 0), 0);
    const weightedAvg = measuredLiters > 0 ? totalKmDriven / measuredLiters : 0;

    let bestLog: EnrichedFuelLog | null = null;
    for (const l of measured) {
      if (!bestLog || (l.consumptionKmPerL || 0) > (bestLog.consumptionKmPerL || 0)) {
        bestLog = l;
      }
    }

    return {
      totalLiters,
      totalKmDriven,
      weightedAvg,
      bestLog
    };
  }, [filteredLogs]);

  const exportFuelCsv = () => {
    if (filteredLogs.length === 0) return;
    const headers = [
      'Código',
      'Data',
      'Hora',
      'Placa',
      'Modelo',
      'Condutor',
      'Combustível',
      'Quantidade (L)',
      'KM Atual',
      'KM Rodados',
      'Consumo (km/L)',
      'Local',
      'Observações'
    ];

    const rows = filteredLogs.map(l => [
      `"${l.code || ''}"`,
      `"${l.date || ''}"`,
      `"${l.time || ''}"`,
      `"${l.plate || ''}"`,
      `"${l.vehicleModel || ''}"`,
      `"${(l.driver || '').replace(/"/g, '""')}"`,
      `"${l.fuelType || ''}"`,
      `"${l.liters}"`,
      `"${l.km}"`,
      `"${l.kmDriven ?? ''}"`,
      `"${l.consumptionKmPerL !== undefined ? formatNumberPtBr(l.consumptionKmPerL, 2) : ''}"`,
      `"${l.location || ''}"`,
      `"${(l.notes || '').replace(/"/g, '""')}"`
    ]);

    const csv = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `abastecimentos-frota-${new Date().toISOString().substring(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
            Controle de Abastecimentos & Consumo
          </h2>
          <p className="text-xs text-slate-500">
            Registre abastecimentos, monitore limites mínimo/médio/máximo e acompanhe o ranking de eficiência
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {userRole === 'ADMIN' && (
            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              className="min-h-[42px] inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold cursor-pointer"
            >
              <Settings className="w-4 h-4 text-emerald-700" />
              <span>Parâmetros (Mín / Méd / Máx)</span>
            </button>
          )}

          <button
            type="button"
            onClick={exportFuelCsv}
            disabled={filteredLogs.length === 0}
            className="min-h-[42px] inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Exportar CSV</span>
          </button>

          <button
            type="button"
            onClick={() => startNewFleetAction('FUEL')}
            className="min-h-[42px] inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Abastecimento</span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-slate-200 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Melhor Consumo
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-700 font-mono tabular-nums block">
              {kpis.bestLog?.consumptionKmPerL
                ? `${formatNumberPtBr(kpis.bestLog.consumptionKmPerL, 2)} km/L`
                : '—'}
            </span>
            <span className="text-[11px] text-slate-500 truncate block">
              {kpis.bestLog ? `${kpis.bestLog.plate} · ${formatDatePtBr(kpis.bestLog.date)}` : 'Sem medições'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Média no Filtro
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tabular-nums block">
              {kpis.weightedAvg > 0 ? `${formatNumberPtBr(kpis.weightedAvg, 2)} km/L` : '—'}
            </span>
            <span className="text-[11px] text-slate-500 block">
              Média ponderada por litro
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center shrink-0">
            <Gauge className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Abastecido
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tabular-nums block">
              {formatNumberPtBr(kpis.totalLiters, 1)} L
            </span>
            <span className="text-[11px] text-slate-500 tabular-nums block">
              {filteredLogs.length} lançamento(s)
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Droplets className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              KM Percorridos
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tabular-nums block">
              {kpis.totalKmDriven.toLocaleString('pt-BR')} km
            </span>
            <span className="text-[11px] text-slate-500 block">
              Entre abastecimentos medidos
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Route className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters Box */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Mês */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Mês</label>
            <select
              value={monthFilter}
              onChange={e => setMonthFilter(e.target.value)}
              className="w-full min-h-[42px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900"
            >
              <option value="TODOS">Todos os Meses</option>
              {availableMonths.map(ym => (
                <option key={ym} value={ym}>
                  {formatMonthLabel(ym)}
                </option>
              ))}
            </select>
          </div>

          {/* Placa */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Placa</label>
            <select
              value={plateFilter}
              onChange={e => setPlateFilter(e.target.value)}
              className="w-full min-h-[42px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900"
            >
              <option value="">Todas as Placas ({availablePlates.length})</option>
              {availablePlates.map(v => (
                <option key={v.plate} value={v.plate}>
                  {v.plate} — {v.model}
                </option>
              ))}
            </select>
          </div>

          {/* Combustível */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Combustível</label>
            <select
              value={fuelTypeFilter}
              onChange={e => setFuelTypeFilter(e.target.value as any)}
              className="w-full min-h-[42px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900"
            >
              <option value="TODOS">Todos os Combustíveis</option>
              {FUEL_TYPES.map(ft => (
                <option key={ft} value={ft}>{ft}</option>
              ))}
            </select>
          </div>

          {/* Local */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Local</label>
            <select
              value={locationFilter}
              onChange={e => setLocationFilter(e.target.value as any)}
              className="w-full min-h-[42px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900"
            >
              <option value="TODOS">Todos os Locais</option>
              {FUEL_LOCATIONS.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Busca */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Buscar</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Condutor, código..."
                className="w-full min-h-[42px] pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900"
              />
            </div>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-600">
              Exibindo <strong>{filteredLogs.length}</strong> de <strong>{(fuelLogs || []).length}</strong> abastecimento(s)
              {plateFilter ? ` · Placa: ${plateFilter}` : ''}
              {monthFilter !== 'TODOS' ? ` · Mês: ${formatMonthLabel(monthFilter)}` : ''}
            </span>
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center space-x-1 font-bold text-red-600 hover:underline cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpar filtros</span>
            </button>
          </div>
        )}
      </div>

      {/* Best Consumptions Chart */}
      <FuelConsumptionChart
        logs={filteredLogs}
        selectedPlateFilter={plateFilter}
        onSelectPlate={plate => setPlateFilter(plate)}
      />

      {/* Fuel Logs History List */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <Fuel className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {hasActiveFilters
              ? 'Nenhum abastecimento encontrado para os filtros aplicados'
              : 'Nenhum abastecimento registrado ainda'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {hasActiveFilters
              ? 'Ajuste ou limpe os filtros de mês, placa, combustível ou local.'
              : 'Registre o primeiro abastecimento informando data, condutor, placa, combustível, litros, KM e local.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Limpar Filtros
              </button>
            )}
            <button
              type="button"
              onClick={() => startNewFleetAction('FUEL')}
              className="min-h-[42px] inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Abastecimento</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLogs.map((log: EnrichedFuelLog) => {
            const statusText =
              log.status === 'TEMPORARY_EXEMPT'
                ? 'Veículo Temporário (Livre)'
                : log.status === 'BASELINE'
                ? '1º Registro (Base KM)'
                : log.status === 'ABOVE_MAX'
                ? 'Acima do Máximo'
                : log.status === 'BELOW_MIN'
                ? 'Abaixo do Mínimo'
                : log.status === 'INVALID_KM'
                ? 'KM Inconsistente'
                : 'Dentro da Faixa';

            const statusColor =
              log.status === 'TEMPORARY_EXEMPT'
                ? 'text-amber-700'
                : log.status === 'ABOVE_MAX'
                ? 'text-amber-700'
                : log.status === 'BELOW_MIN' || log.status === 'INVALID_KM'
                ? 'text-red-700'
                : log.status === 'BASELINE'
                ? 'text-slate-500'
                : 'text-emerald-700';

            return (
              <div
                key={log.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-400 transition-colors flex flex-col justify-between overflow-hidden"
              >
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs text-slate-500 font-mono tabular-nums">
                        {log.code} · {formatDatePtBr(log.date)}{log.time ? ` ${log.time}` : ''}
                      </div>
                      <h3 className="text-base font-black text-slate-900 mt-0.5 truncate">
                        <span className="font-mono">{log.plate}</span>
                        {log.vehicleModel ? ` · ${log.vehicleModel}` : ''}
                      </h3>
                    </div>

                    <div className="text-right shrink-0 tabular-nums">
                      <div className="font-mono text-sm font-black text-slate-900">
                        {formatNumberPtBr(Number(log.liters), 2)} L
                      </div>
                      <div className="text-[11px] font-semibold text-slate-600">
                        {log.fuelType}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-2.5 flex-1 text-xs text-slate-700 tabular-nums">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>Condutor: <strong>{log.driver}</strong></span>
                    <span className="font-semibold text-slate-800">{log.location}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Hodômetro:</span>
                      <strong className="font-mono text-slate-900">
                        {Number(log.km) > 0
                          ? `${Number(log.km).toLocaleString('pt-BR')} KM`
                          : 'Não obrigatório (Livre)'}
                      </strong>
                    </div>
                    {log.previousKm !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">KM Rodados (desde {log.previousKm.toLocaleString('pt-BR')}):</span>
                        <strong className="font-mono text-slate-900">
                          {(log.kmDriven || 0).toLocaleString('pt-BR')} KM
                        </strong>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/70">
                      <span className="text-slate-600 font-semibold">Consumo:</span>
                      <span className={`font-mono font-extrabold text-sm ${statusColor}`}>
                        {log.status === 'TEMPORARY_EXEMPT'
                          ? 'Livre (Sem parâmetro)'
                          : log.consumptionKmPerL !== undefined
                          ? `${formatNumberPtBr(log.consumptionKmPerL, 2)} km/L`
                          : 'Base inicial'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className={`font-bold ${statusColor}`}>{statusText}</span>
                    <span className="font-mono text-slate-400">
                      {log.status === 'TEMPORARY_EXEMPT'
                        ? 'Sem parâmetro de consumo/KM'
                        : `Meta ${formatNumberPtBr(log.ruleUsed.minConsumption, 1)}–${formatNumberPtBr(log.ruleUsed.maxConsumption, 1)} km/L`}
                    </span>
                  </div>

                  {log.notes && (
                    <p className="text-[11px] text-slate-500 line-clamp-2">{log.notes}</p>
                  )}
                </div>

                <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCorrectionPlate(log.plate)}
                      className="min-h-[36px] inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold cursor-pointer"
                      title={`Ver somente abastecimentos da placa ${log.plate}`}
                    >
                      <History className="w-3.5 h-3.5 text-slate-600" />
                      <span>Placa {log.plate}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingFuelLog(log)}
                      className="min-h-[36px] inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Editar</span>
                    </button>
                  </div>

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
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Excluir Abastecimento (Admin)"
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

      {/* Consumption Config Modal (Admin only) */}
      {userRole === 'ADMIN' && (
        <FuelConsumptionConfigModal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          initialPlate={plateFilter || undefined}
        />
      )}

      {/* Plate-Scoped Correction Modal (shows ONLY logs of that exact plate) */}
      <FuelPlateCorrectionModal
        isOpen={Boolean(correctionPlate)}
        plate={correctionPlate || ''}
        onClose={() => setCorrectionPlate(null)}
      />

      {/* Edit Fuel Log Modal */}
      {editingFuelLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-100 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-5 shadow-2xl border border-slate-200">
            <FuelLogForm
              editingLog={editingFuelLog}
              onSuccess={() => setEditingFuelLog(null)}
              onCancel={() => setEditingFuelLog(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
