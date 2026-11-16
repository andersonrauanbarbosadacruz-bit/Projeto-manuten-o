import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Filter, 
  Calendar, 
  User, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Wrench, 
  TrendingUp, 
  Layers, 
  RefreshCw,
  PieChart
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Farm, FARMS, WorkOrder, WorkOrderStatus, WorkOrderPriority } from '../types';

type PeriodPreset = '7D' | '30D' | '90D' | 'ANO' | 'TODOS' | 'CUSTOM';

export const WorkOrderAnalyticsChart: React.FC = () => {
  const { workOrders, userRole, setViewWorkOrderDetail } = useApp();

  // Filters state
  const [selectedFarm, setSelectedFarm] = useState<Farm | 'TODAS'>('TODAS');
  const [selectedTechnician, setSelectedTechnician] = useState<string>('TODOS');
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('TODOS');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Extract all unique technicians from work orders
  const allTechnicians = useMemo(() => {
    const set = new Set<string>();
    workOrders.forEach(wo => {
      if (wo.responsible && wo.responsible.trim()) {
        set.add(wo.responsible.trim());
      }
    });
    return Array.from(set).sort();
  }, [workOrders]);

  // Apply filters
  const filteredWorkOrders = useMemo(() => {
    const now = new Date();

    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    if (periodPreset === '7D') {
      minDate = new Date();
      minDate.setDate(now.getDate() - 7);
    } else if (periodPreset === '30D') {
      minDate = new Date();
      minDate.setDate(now.getDate() - 30);
    } else if (periodPreset === '90D') {
      minDate = new Date();
      minDate.setDate(now.getDate() - 90);
    } else if (periodPreset === 'ANO') {
      minDate = new Date(now.getFullYear(), 0, 1);
    } else if (periodPreset === 'CUSTOM') {
      if (startDate) minDate = new Date(startDate);
      if (endDate) {
        maxDate = new Date(endDate);
        maxDate.setHours(23, 59, 59, 999);
      }
    }

    return workOrders.filter(wo => {
      // Farm filter
      if (selectedFarm !== 'TODAS' && wo.farm !== selectedFarm) {
        return false;
      }

      // Technician filter
      if (selectedTechnician !== 'TODOS' && wo.responsible !== selectedTechnician) {
        return false;
      }

      // Date filter
      if (minDate || maxDate) {
        const woDate = new Date(wo.date);
        if (minDate && woDate < minDate) return false;
        if (maxDate && woDate > maxDate) return false;
      }

      return true;
    });
  }, [workOrders, selectedFarm, selectedTechnician, periodPreset, startDate, endDate]);

  // Metrics computation
  const totalCount = filteredWorkOrders.length;
  const completedList = filteredWorkOrders.filter(w => w.status === 'CONCLUIDA');
  const inProgressList = filteredWorkOrders.filter(w => w.status === 'EM_ANDAMENTO');
  const openList = filteredWorkOrders.filter(w => w.status === 'ABERTA');
  const cancelledList = filteredWorkOrders.filter(w => w.status === 'CANCELADA');

  const completionRate = totalCount > 0 ? Math.round((completedList.length / totalCount) * 100) : 0;

  // Average resolution duration (in days) for concluded work orders
  const avgResolutionDays = useMemo(() => {
    const withDuration = completedList.filter(w => w.date && w.completionDate);
    if (withDuration.length === 0) return 0;
    const totalDays = withDuration.reduce((acc, w) => {
      const dStart = new Date(w.date).getTime();
      const dEnd = new Date(w.completionDate!).getTime();
      const diff = Math.max(0, (dEnd - dStart) / (1000 * 60 * 60 * 24));
      return acc + diff;
    }, 0);
    return Math.round((totalDays / withDuration.length) * 10) / 10;
  }, [completedList]);

  // Group by Technician
  const technicianStats = useMemo(() => {
    const map = new Map<string, { total: number; completed: number; inProgress: number; open: number }>();
    filteredWorkOrders.forEach(w => {
      const tech = w.responsible || 'Não informado';
      const cur = map.get(tech) || { total: 0, completed: 0, inProgress: 0, open: 0 };
      cur.total += 1;
      if (w.status === 'CONCLUIDA') cur.completed += 1;
      else if (w.status === 'EM_ANDAMENTO') cur.inProgress += 1;
      else if (w.status === 'ABERTA') cur.open += 1;
      map.set(tech, cur);
    });
    return Array.from(map.entries())
      .map(([name, stats]) => ({
        name,
        ...stats,
        rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredWorkOrders]);

  // Group by Farm
  const farmStats = useMemo(() => {
    const map = new Map<string, { total: number; completed: number; open: number }>();
    filteredWorkOrders.forEach(w => {
      const farm = w.farm;
      const cur = map.get(farm) || { total: 0, completed: 0, open: 0 };
      cur.total += 1;
      if (w.status === 'CONCLUIDA') cur.completed += 1;
      else cur.open += 1;
      map.set(farm, cur);
    });
    return Array.from(map.entries()).map(([farm, stats]) => ({
      farm,
      ...stats,
      rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
    }));
  }, [filteredWorkOrders]);

  // Group by Date for timeline bar chart (last 8 distinct chronological dates/buckets)
  const timelineData = useMemo(() => {
    const map = new Map<string, { completed: number; inProgress: number; open: number; total: number }>();
    
    // Sort chronological
    const sorted = [...filteredWorkOrders].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    sorted.forEach(w => {
      const d = w.date || 'Sem data';
      const cur = map.get(d) || { completed: 0, inProgress: 0, open: 0, total: 0 };
      cur.total += 1;
      if (w.status === 'CONCLUIDA') cur.completed += 1;
      else if (w.status === 'EM_ANDAMENTO') cur.inProgress += 1;
      else if (w.status === 'ABERTA') cur.open += 1;
      map.set(d, cur);
    });

    const entries = Array.from(map.entries());
    // Take last 8 dates for clear spacing
    return entries.slice(-8).map(([date, counts]) => ({
      date: date.length >= 10 ? date.substring(5) : date, // MM-DD
      fullDate: date,
      ...counts
    }));
  }, [filteredWorkOrders]);

  const maxTimelineTotal = Math.max(1, ...timelineData.map(d => d.total));

  // Only render on Admin access
  if (userRole !== 'ADMIN') {
    return null;
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-7 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-amber-500/10 text-amber-700 rounded-2xl border border-amber-300/40">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 block">
              Painel de Gestão & Métricas
            </span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Gráficos de Desempenho de Ordens de Serviço
            </h2>
            <p className="text-xs text-slate-500">
              Análise operacional detalhada por responsável técnico, fazenda e período
            </p>
          </div>
        </div>

        {/* Period Preset Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200">
          {(['7D', '30D', '90D', 'ANO', 'TODOS'] as PeriodPreset[]).map(preset => {
            const labels: Record<PeriodPreset, string> = {
              '7D': '7 dias',
              '30D': '30 dias',
              '90D': '90 dias',
              'ANO': 'Este Ano',
              'TODOS': 'Histórico Todo',
              'CUSTOM': 'Personalizado'
            };
            return (
              <button
                key={preset}
                onClick={() => setPeriodPreset(preset)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  periodPreset === preset
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                {labels[preset]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Toolbar (Técnico, Fazenda, Período Customizado) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
        {/* Farm Filter */}
        <div>
          <label className="text-[11px] font-bold text-slate-600 uppercase flex items-center space-x-1 mb-1">
            <MapPin className="w-3.5 h-3.5 text-amber-600" />
            <span>Fazenda</span>
          </label>
          <select
            value={selectedFarm}
            onChange={(e) => setSelectedFarm(e.target.value as any)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            <option value="TODAS">Todas as Fazendas ({workOrders.length} OS)</option>
            {FARMS.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        {/* Technician Filter */}
        <div>
          <label className="text-[11px] font-bold text-slate-600 uppercase flex items-center space-x-1 mb-1">
            <User className="w-3.5 h-3.5 text-amber-600" />
            <span>Técnico Responsável</span>
          </label>
          <select
            value={selectedTechnician}
            onChange={(e) => setSelectedTechnician(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            <option value="TODOS">Todos os Técnicos ({allTechnicians.length})</option>
            {allTechnicians.map(tech => (
              <option key={tech} value={tech}>{tech}</option>
            ))}
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label className="text-[11px] font-bold text-slate-600 uppercase flex items-center space-x-1 mb-1">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <span>Data Inicial</span>
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPeriodPreset('CUSTOM');
            }}
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="text-[11px] font-bold text-slate-600 uppercase flex items-center space-x-1 mb-1">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <span>Data Final</span>
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPeriodPreset('CUSTOM');
            }}
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Filtrado</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-slate-900">{totalCount}</span>
            <span className="text-xs text-slate-500">OS</span>
          </div>
        </div>

        <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200">
          <span className="text-[10px] uppercase font-bold text-emerald-700 block">Taxa de Conclusão</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-emerald-800">{completionRate}%</span>
            <span className="text-xs text-emerald-600 font-semibold">{completedList.length} concluídas</span>
          </div>
        </div>

        <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200">
          <span className="text-[10px] uppercase font-bold text-amber-800 block">Em Andamento</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-amber-900">{inProgressList.length}</span>
            <span className="text-xs text-amber-700 font-semibold">em execução</span>
          </div>
        </div>

        <div className="p-4 bg-red-50/70 rounded-2xl border border-red-200">
          <span className="text-[10px] uppercase font-bold text-red-700 block">Abertas / Pendentes</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-red-800">{openList.length}</span>
            <span className="text-xs text-red-600 font-semibold">aguardando</span>
          </div>
        </div>

        <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200 col-span-2 lg:col-span-1">
          <span className="text-[10px] uppercase font-bold text-blue-700 block">Tempo Médio Resolução</span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-2xl font-black text-blue-900">{avgResolutionDays}</span>
            <span className="text-xs text-blue-700 font-semibold">dia(s)</span>
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Timeline Evolution Bar Chart */}
        <div className="bg-slate-50/60 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Evolução Temporal das Ordens de Serviço</span>
              </h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold">
                <span className="flex items-center space-x-1 text-emerald-800">
                  <span className="w-2.5 h-2.5 bg-emerald-600 rounded-sm inline-block"></span>
                  <span>Concluídas</span>
                </span>
                <span className="flex items-center space-x-1 text-amber-800">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-sm inline-block"></span>
                  <span>Andamento</span>
                </span>
                <span className="flex items-center space-x-1 text-red-700">
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-sm inline-block"></span>
                  <span>Abertas</span>
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              Volume diário de serviços concluídos vs pendências
            </p>
          </div>

          {timelineData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-xs font-semibold">
              Nenhuma ordem de serviço no período selecionado
            </div>
          ) : (
            <div className="h-52 flex items-end justify-between gap-1 sm:gap-2 pt-6 border-b border-slate-200 pb-2 w-full">
              {timelineData.map((bucket, idx) => {
                const totalH = Math.max(12, Math.round((bucket.total / maxTimelineTotal) * 160));
                const completedH = bucket.total > 0 ? (bucket.completed / bucket.total) * totalH : 0;
                const inProgressH = bucket.total > 0 ? (bucket.inProgress / bucket.total) * totalH : 0;
                const openH = bucket.total > 0 ? (bucket.open / bucket.total) * totalH : 0;

                return (
                  <div key={idx} className="flex-1 min-w-0 flex flex-col items-center group relative cursor-pointer">
                    {/* Tooltip on Hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-20 bg-slate-900 text-white text-[10px] py-1 px-2 rounded-md whitespace-nowrap shadow-lg pointer-events-none">
                      <strong>{bucket.fullDate}:</strong> {bucket.total} OS ({bucket.completed} concl., {bucket.inProgress} and., {bucket.open} abertas)
                    </div>

                    <span className="text-[10px] font-bold text-slate-600 mb-1">
                      {bucket.total}
                    </span>

                    {/* Stacked Vertical Bar */}
                    <div 
                      style={{ height: `${totalH}px` }} 
                      className="w-full max-w-[36px] rounded-lg overflow-hidden flex flex-col-reverse shadow-xs border border-slate-300/40"
                    >
                      <div style={{ height: `${completedH}px` }} className="bg-emerald-600 w-full transition-all" />
                      <div style={{ height: `${inProgressH}px` }} className="bg-amber-500 w-full transition-all" />
                      <div style={{ height: `${openH}px` }} className="bg-red-500 w-full transition-all" />
                    </div>

                    <span className="text-[9px] sm:text-[10px] font-semibold text-slate-500 mt-2 truncate max-w-full">
                      {bucket.date}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chart 2: Performance by Technician */}
        <div className="bg-slate-50/60 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <User className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Desempenho por Técnico Responsável</span>
              </h3>
              <span className="text-xs text-slate-500 font-semibold">
                {technicianStats.length} técnico(s) ativo(s)
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Distribuição de ordens executadas e taxa de conclusão individual
            </p>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-56 pr-1">
            {technicianStats.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-400 text-xs font-semibold">
                Nenhum técnico encontrado no filtro
              </div>
            ) : (
              technicianStats.map((tech, idx) => (
                <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 truncate flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                      <span>{tech.name}</span>
                    </span>
                    <span className="font-mono text-[11px] font-bold text-slate-700">
                      <strong className="text-emerald-700">{tech.completed}</strong>/{tech.total} ({tech.rate}%)
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div 
                      style={{ width: `${tech.rate}%` }} 
                      className="bg-emerald-600 h-full rounded-full transition-all" 
                    />
                    <div 
                      style={{ width: `${tech.total > 0 ? (tech.inProgress / tech.total) * 100 : 0}%` }} 
                      className="bg-amber-500 h-full transition-all" 
                    />
                    <div 
                      style={{ width: `${tech.total > 0 ? (tech.open / tech.total) * 100 : 0}%` }} 
                      className="bg-red-400 h-full transition-all" 
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Farm Distribution Cards */}
      <div className="pt-2 border-t border-slate-100">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center space-x-1.5">
          <MapPin className="w-3.5 h-3.5 text-emerald-700" />
          <span>Resumo de Atendimentos por Fazenda</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {farmStats.map(f => (
            <div key={f.farm} className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <strong className="text-xs font-bold text-slate-900 block truncate">{f.farm}</strong>
                <span className="text-[11px] text-slate-500">{f.completed} concluídas • {f.open} pendentes</span>
              </div>
              <span className={`text-xs font-black px-2 py-1 rounded-lg ${
                f.rate >= 80 ? 'bg-emerald-100 text-emerald-800' : (f.rate >= 50 ? 'bg-amber-100 text-amber-900' : 'bg-red-100 text-red-800')
              }`}>
                {f.rate}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
