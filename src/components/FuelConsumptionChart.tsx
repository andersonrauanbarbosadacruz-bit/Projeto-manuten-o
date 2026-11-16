import React, { useState, useMemo } from 'react';
import { BarChart3, Trophy, TrendingUp } from 'lucide-react';
import {
  EnrichedFuelLog,
  formatDatePtBr,
  formatNumberPtBr
} from '../utils/fuelConsumptionHelper';

interface FuelConsumptionChartProps {
  logs: EnrichedFuelLog[];
  selectedPlateFilter: string;
  onSelectPlate?: (plate: string) => void;
}

export const FuelConsumptionChart: React.FC<FuelConsumptionChartProps> = ({
  logs,
  selectedPlateFilter,
  onSelectPlate
}) => {
  const [chartMode, setChartMode] = useState<'RANKING' | 'TIMELINE'>('RANKING');

  // Filter logs that have a valid consumption calculation (kmDriven > 0 and consumption > 0)
  const measuredLogs = useMemo(() => {
    return logs.filter(
      l =>
        l.consumptionKmPerL !== undefined &&
        Number.isFinite(l.consumptionKmPerL) &&
        l.consumptionKmPerL > 0 &&
        (l.kmDriven || 0) > 0
    );
  }, [logs]);

  // Aggregate best & average consumption per plate
  const plateRanking = useMemo(() => {
    const map = new Map<
      string,
      {
        plate: string;
        model: string;
        totalKm: number;
        totalLiters: number;
        bestConsumption: number;
        bestDate: string;
        count: number;
        avgTarget: number;
        minTarget: number;
        maxTarget: number;
      }
    >();

    measuredLogs.forEach(log => {
      const existing = map.get(log.plate) || {
        plate: log.plate,
        model: log.vehicleModel || 'Frota',
        totalKm: 0,
        totalLiters: 0,
        bestConsumption: 0,
        bestDate: log.date,
        count: 0,
        avgTarget: log.ruleUsed.avgConsumption,
        minTarget: log.ruleUsed.minConsumption,
        maxTarget: log.ruleUsed.maxConsumption
      };

      existing.totalKm += log.kmDriven || 0;
      existing.totalLiters += Number(log.liters) || 0;
      existing.count += 1;
      const c = log.consumptionKmPerL || 0;
      if (c > existing.bestConsumption) {
        existing.bestConsumption = c;
        existing.bestDate = log.date;
      }
      map.set(log.plate, existing);
    });

    return Array.from(map.values())
      .map(item => ({
        ...item,
        avgConsumption: item.totalLiters > 0 ? item.totalKm / item.totalLiters : 0
      }))
      .sort((a, b) => b.avgConsumption - a.avgConsumption);
  }, [measuredLogs]);

  // Chronological timeline (up to latest 16 measured entries in filter)
  const timelineEntries = useMemo(() => {
    return [...measuredLogs]
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (Number(a.km) || 0) - (Number(b.km) || 0);
      })
      .slice(-16);
  }, [measuredLogs]);

  const maxPlateBarValue = useMemo(() => {
    const maxVal = plateRanking.reduce(
      (acc, item) => Math.max(acc, item.avgConsumption, item.bestConsumption, item.avgTarget),
      1
    );
    return maxVal * 1.1;
  }, [plateRanking]);

  const maxTimelineValue = useMemo(() => {
    const maxVal = timelineEntries.reduce(
      (acc, item) => Math.max(acc, item.consumptionKmPerL || 0, item.ruleUsed.avgConsumption),
      1
    );
    return maxVal * 1.12;
  }, [timelineEntries]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4 shadow-2xs">
      {/* Header + Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
              Gráfico dos Melhores Consumos (km/L)
            </h2>
            <p className="text-xs text-slate-500">
              {measuredLogs.length > 0
                ? `${plateRanking.length} veículo(s) ranqueado(s) com base em ${measuredLogs.length} medição(ões) no filtro`
                : 'Registre ao menos dois abastecimentos de uma mesma placa para calcular o consumo em km/L'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setChartMode('RANKING')}
            className={`min-h-[36px] inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              chartMode === 'RANKING'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Melhores por Placa</span>
          </button>

          <button
            type="button"
            onClick={() => setChartMode('TIMELINE')}
            className={`min-h-[36px] inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              chartMode === 'TIMELINE'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Por Abastecimento</span>
          </button>
        </div>
      </div>

      {measuredLogs.length === 0 ? (
        <div className="py-10 text-center text-xs sm:text-sm text-slate-500">
          Ainda não há medições de consumo suficientes para exibir o gráfico neste filtro.
        </div>
      ) : chartMode === 'RANKING' ? (
        <div className="space-y-3">
          {plateRanking.map((row, idx) => {
            const avgWidthPct = Math.min(100, Math.max(4, (row.avgConsumption / maxPlateBarValue) * 100));
            const targetPct = Math.min(100, (row.avgTarget / maxPlateBarValue) * 100);
            const isSelected = selectedPlateFilter === row.plate;

            const isAboveTarget = row.avgConsumption >= row.avgTarget;
            const isBelowMin = row.avgConsumption < row.minTarget;
            const barColor = isBelowMin
              ? 'bg-red-600'
              : isAboveTarget
              ? 'bg-emerald-600'
              : 'bg-cyan-600';

            return (
              <div
                key={row.plate}
                onClick={() => onSelectPlate && onSelectPlate(isSelected ? '' : row.plate)}
                className={`p-3 rounded-xl border transition-all ${
                  onSelectPlate ? 'cursor-pointer hover:border-emerald-400' : ''
                } ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/40'
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
                    <span className="font-mono text-xs font-extrabold text-slate-500 tabular-nums">
                      #{idx + 1}
                    </span>
                    <span className="font-mono text-sm font-black text-slate-900">
                      {row.plate}
                    </span>
                    <span className="text-xs font-semibold text-slate-600 truncate">
                      {row.model}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs tabular-nums">
                    <span className="text-slate-500">
                      Melhor trecho:{' '}
                      <strong className="font-mono text-slate-800">
                        {formatNumberPtBr(row.bestConsumption, 2)} km/L
                      </strong>
                    </span>
                    <span className="font-mono text-sm font-black text-emerald-800">
                      Média {formatNumberPtBr(row.avgConsumption, 2)} km/L
                    </span>
                  </div>
                </div>

                {/* Progress Bar with Avg Target Marker */}
                <div className="relative h-3 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${avgWidthPct}%` }}
                  />
                  {/* Configured Average Benchmark Marker */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-slate-900/80"
                    style={{ left: `${targetPct}%` }}
                    title={`Meta Média: ${formatNumberPtBr(row.avgTarget, 1)} km/L`}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5 text-[11px] text-slate-500 tabular-nums">
                  <span>
                    {row.totalKm.toLocaleString('pt-BR')} km rodados · {formatNumberPtBr(row.totalLiters, 1)} L · {row.count} medição(ões)
                  </span>
                  <span className="font-mono">
                    Meta: {formatNumberPtBr(row.avgTarget, 1)} km/L
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            {timelineEntries.map(entry => {
              const val = entry.consumptionKmPerL || 0;
              const widthPct = Math.min(100, Math.max(4, (val / maxTimelineValue) * 100));
              const barClass =
                entry.status === 'ABOVE_MAX'
                  ? 'bg-amber-500'
                  : entry.status === 'BELOW_MIN'
                  ? 'bg-red-600'
                  : val >= entry.ruleUsed.avgConsumption
                  ? 'bg-emerald-600'
                  : 'bg-cyan-600';

              return (
                <div key={entry.id} className="space-y-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs tabular-nums">
                    <div className="flex flex-wrap items-baseline gap-x-2 text-slate-700">
                      <span className="font-mono font-bold text-slate-900">{entry.plate}</span>
                      <span className="text-slate-400">·</span>
                      <span>{formatDatePtBr(entry.date)}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600">{entry.driver}</span>
                    </div>
                    <span className="font-mono font-extrabold text-slate-900">
                      {formatNumberPtBr(val, 2)} km/L
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barClass}`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Clean Legend */}
      {measuredLogs.length > 0 && (
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
          <span className="inline-flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
            <span>Acima ou na meta média</span>
          </span>
          <span className="inline-flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 inline-block" />
            <span>Entre mínimo e médio</span>
          </span>
          <span className="inline-flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
            <span>Abaixo do mínimo</span>
          </span>
          <span className="inline-flex items-center space-x-1.5">
            <span className="w-0.5 h-3 bg-slate-900 inline-block" />
            <span>Linha de meta média configurada</span>
          </span>
        </div>
      )}
    </div>
  );
};
