import React, { useState, useMemo } from 'react';
import { 
  ClipboardCheck, 
  PlusCircle, 
  Search, 
  Filter, 
  MapPin, 
  Calendar, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Eye, 
  Trash2, 
  Printer, 
  Wrench,
  XCircle,
  FileText,
  Gauge,
  Droplet,
  Zap,
  Download,
  Plane
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { 
  ChecklistRecord, 
  ChecklistType, 
  CHECKLIST_TYPE_LABELS, 
  Farm, 
  FARMS 
} from '../types';
import { getChecklistEffectiveStatus } from '../utils/complianceHelper';
import { exportChecklistToPdf } from '../utils/pdfGenerator';
import { downloadChecklistDocument } from '../utils/documentDownloader';

export const ChecklistList: React.FC = () => {
  const { 
    checklists, 
    workOrders,
    selectedFarmFilter, 
    setSelectedFarmFilter, 
    setActiveTab, 
    setViewChecklistDetail, 
    deleteChecklist,
    generateWorkOrderFromChecklistNC,
    startNewChecklist,
    userRole,
    requestDelete
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<ChecklistType | 'TODOS'>('TODOS');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'CONFORME' | 'COM_PENDENCIAS' | 'CRITICO' | 'REGULARIZADO'>('TODOS');

  // Filter checklists (memoized) - VEICULO e DRONE agora ficam dentro de Frota
  const filtered = useMemo(() => {
    return checklists.filter(item => {
      if (item.type === 'VEICULO' || item.type === 'DRONE') {
        return false;
      }
      // Farm filter
      if (selectedFarmFilter !== 'TODAS' && item.farm !== selectedFarmFilter) {
        return false;
      }
      // Type filter
      if (typeFilter !== 'TODOS' && item.type !== typeFilter) {
        return false;
      }
      // Status filter taking into account resolved work orders
      const effectiveStatus = getChecklistEffectiveStatus(item, workOrders);
      if (statusFilter !== 'TODOS') {
        if (statusFilter === 'CONFORME') {
          if (!effectiveStatus.isFullyConforming && item.statusSummary !== 'CONFORME') return false;
        } else if (statusFilter === 'REGULARIZADO') {
          if (effectiveStatus.effectiveSummary !== 'REGULARIZADO') return false;
        } else if (statusFilter === 'COM_PENDENCIAS') {
          if (effectiveStatus.effectiveSummary !== 'COM_PENDENCIAS') return false;
        } else if (statusFilter === 'CRITICO') {
          if (effectiveStatus.effectiveSummary !== 'CRITICO') return false;
        }
      }
      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchCode = item.code.toLowerCase().includes(q);
        const matchLocation = item.location.toLowerCase().includes(q);
        const matchInspector = item.inspector.toLowerCase().includes(q);
        const matchFarm = item.farm.toLowerCase().includes(q);
        if (!matchCode && !matchLocation && !matchInspector && !matchFarm) {
          return false;
        }
      }
      return true;
    });
  }, [checklists, selectedFarmFilter, typeFilter, statusFilter, searchTerm, workOrders]);

  const farmFilteredChecklists = useMemo(() => {
    return selectedFarmFilter === 'TODAS'
      ? checklists.filter(c => c.type !== 'VEICULO' && c.type !== 'DRONE')
      : checklists.filter(c => c.type !== 'VEICULO' && c.type !== 'DRONE' && c.farm === selectedFarmFilter);
  }, [checklists, selectedFarmFilter]);

  return (
    <div className="space-y-6 pb-16">
      {/* Header with Title and Dynamic Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Histórico de Checklists Operacionais
          </h1>
          <p className="text-sm text-slate-500">
            Inspeções preventivas de Sala de Máquinas, Geradores e Irrigação nas fazendas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {typeFilter === 'IRRIGACAO' ? (
            <button
              onClick={() => startNewChecklist('IRRIGACAO')}
              className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Droplet className="w-4 h-4 text-teal-200" />
              <span>Novo Checklist de Irrigação</span>
            </button>
          ) : typeFilter === 'GERADOR' ? (
            <button
              onClick={() => startNewChecklist('GERADOR')}
              className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-200" />
              <span>Novo Checklist Gerador</span>
            </button>
          ) : typeFilter === 'SALA_DE_MAQUINAS' ? (
            <button
              onClick={() => startNewChecklist('SALA_DE_MAQUINAS')}
              className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Gauge className="w-4 h-4 text-emerald-200" />
              <span>Novo Checklist Sala de Máquinas</span>
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => startNewChecklist('SALA_DE_MAQUINAS')}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <Gauge className="w-3.5 h-3.5" />
                <span>+ Máquinas</span>
              </button>
              <button
                onClick={() => startNewChecklist('GERADOR')}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>+ Gerador</span>
              </button>
              <button
                onClick={() => startNewChecklist('IRRIGACAO')}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <Droplet className="w-3.5 h-3.5" />
                <span>+ Irrigação</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Prominent Visual Model Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setTypeFilter('TODOS')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
            typeFilter === 'TODOS'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          <span>📋 Todos os Checklists</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
            typeFilter === 'TODOS' ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-600'
          }`}>
            {farmFilteredChecklists.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTypeFilter('SALA_DE_MAQUINAS')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
            typeFilter === 'SALA_DE_MAQUINAS'
              ? 'bg-emerald-700 text-white shadow-md ring-2 ring-emerald-500/30'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-900'
          }`}
        >
          <Gauge className="w-4 h-4 text-emerald-400" />
          <span>Aba: Sala de Máquinas</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
            typeFilter === 'SALA_DE_MAQUINAS' ? 'bg-emerald-900 text-emerald-100' : 'bg-slate-100 text-slate-600'
          }`}>
            {farmFilteredChecklists.filter(c => c.type === 'SALA_DE_MAQUINAS').length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTypeFilter('GERADOR')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
            typeFilter === 'GERADOR'
              ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-500/30'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-amber-50 hover:text-amber-900'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-300" />
          <span>Aba: Gerador</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
            typeFilter === 'GERADOR' ? 'bg-amber-900 text-amber-100' : 'bg-slate-100 text-slate-600'
          }`}>
            {farmFilteredChecklists.filter(c => c.type === 'GERADOR').length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTypeFilter('IRRIGACAO')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
            typeFilter === 'IRRIGACAO'
              ? 'bg-teal-700 text-white shadow-md ring-2 ring-teal-500/30'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-teal-50 hover:text-teal-900'
          }`}
        >
          <Droplet className="w-4 h-4 text-teal-300" />
          <span>Aba: Irrigação</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
            typeFilter === 'IRRIGACAO' ? 'bg-teal-900 text-teal-100' : 'bg-slate-100 text-slate-600'
          }`}>
            {farmFilteredChecklists.filter(c => c.type === 'IRRIGACAO').length}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por código, local, técnico..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Farm Filter */}
          <div>
            <select
              value={selectedFarmFilter}
              onChange={e => setSelectedFarmFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="TODAS">Todas as Fazendas</option>
              {FARMS.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="TODOS">Todos os Resultados</option>
              <option value="CONFORME">100% Conforme</option>
              <option value="REGULARIZADO">Regularizado via OS Concluída</option>
              <option value="COM_PENDENCIAS">Com Pendências</option>
              <option value="CRITICO">Crítico</option>
            </select>
          </div>
        </div>
      </div>

      {/* List Results */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Nenhum checklist encontrado
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Não foram encontrados registros para os filtros selecionados. Tente alterar a fazenda ou os critérios de busca.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.filter(item => item && item.id).map(item => {
            const effectiveStatus = getChecklistEffectiveStatus(item, workOrders);
            const itemsList = Array.isArray(item.items) ? item.items : [];
            const conformingItems = itemsList.filter(i => i && i.status === 'C').length;
            const effectiveConformingTotal = conformingItems + effectiveStatus.resolvedNCCount;

            const isRegularized = effectiveStatus.effectiveSummary === 'REGULARIZADO';

            let badgeConfig = {
              label: 'Conforme',
              bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
              icon: CheckCircle2
            };

            if (isRegularized) {
              badgeConfig = {
                label: 'Regularizado (OS Concluída)',
                bg: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold',
                icon: CheckCircle2
              };
            } else if (item.statusSummary === 'EM_ANDAMENTO') {
              badgeConfig = {
                label: 'Preenchendo no Celular...',
                bg: 'bg-blue-50 text-blue-800 border-blue-200 animate-pulse',
                icon: AlertTriangle
              };
            } else if (effectiveStatus.effectiveSummary === 'CRITICO') {
              badgeConfig = {
                label: `${effectiveStatus.activeNCCount} Crítico${effectiveStatus.activeNCCount > 1 ? 's' : ''} (N/C)`,
                bg: 'bg-red-50 text-red-800 border-red-200',
                icon: AlertTriangle
              };
            } else if (effectiveStatus.activeNCCount > 0) {
              badgeConfig = {
                label: `${effectiveStatus.activeNCCount} Não Conforme${effectiveStatus.activeNCCount > 1 ? 's' : ''}`,
                bg: 'bg-amber-50 text-amber-800 border-amber-200',
                icon: AlertTriangle
              };
            }

            const BadgeIcon = badgeConfig.icon;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col overflow-hidden"
              >
                {/* Top strip */}
                <div className="p-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                        {item.code}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100/70 text-emerald-900">
                        {CHECKLIST_TYPE_LABELS[item.type]}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-slate-600 font-medium pt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-slate-800">{item.farm}</span>
                    </div>
                  </div>

                  <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full border ${badgeConfig.bg}`}>
                    <BadgeIcon className="w-3.5 h-3.5 mr-1" />
                    {badgeConfig.label}
                  </span>
                </div>

                {/* Body Content */}
                <div className="p-4 flex-1 space-y-3">
                  {item.type !== 'DRONE' ? (
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                        Localização / Setor
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                        {item.location}
                      </h3>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                        Aeronave / Drone Agrícola
                      </span>
                      <h3 className="text-sm font-bold text-indigo-950 line-clamp-1 flex items-center space-x-1.5">
                        <Plane className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>{item.droneModel || 'DJI Agrícola'}</span>
                      </h3>
                    </div>
                  )}

                  {/* Inspector and Date */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                    <div className="flex items-center space-x-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{item.inspector}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.date} • {item.time}</span>
                    </div>
                  </div>

                  {/* Items summary */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs flex flex-wrap items-center justify-between gap-1 text-slate-600">
                    <span>
                      <strong className="text-slate-900">{effectiveConformingTotal}</strong> de {itemsList.length} conformes
                    </span>
                    {effectiveStatus.activeNCCount > 0 ? (
                      <span className="text-red-700 font-bold">
                        ⚠️ {effectiveStatus.activeNCCount} N/C Pendente{effectiveStatus.activeNCCount > 1 ? 's' : ''}
                      </span>
                    ) : effectiveStatus.resolvedNCCount > 0 ? (
                      <span className="text-emerald-700 font-bold flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{effectiveStatus.resolvedNCCount} corrigido(s) via OS</span>
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-semibold">100% OK</span>
                    )}
                  </div>

                  {/* Work Order links if any */}
                  {item.workOrderIds && item.workOrderIds.length > 0 && (
                    <div className="flex items-center space-x-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                      <Wrench className="w-3 h-3 text-amber-600" />
                      <span>OS Vinculada: {item.workOrderIds.length} ordem(ns) gerada(s)</span>
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => setViewChecklistDetail(item)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver Ficha / Imprimir</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportChecklistToPdf(item, workOrders);
                      }}
                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 text-xs font-bold transition-colors cursor-pointer"
                      title="Baixar arquivo PDF da ficha no computador"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="hidden sm:inline">Baixar PDF</span>
                    </button>
                  </div>

                  {userRole === 'ADMIN' && (
                    <button
                      onClick={() => {
                        requestDelete({
                          type: 'checklist',
                          id: item.id,
                          code: item.code,
                          description: `${item.location} (${item.inspector})`
                        });
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                      title="Excluir Checklist (Apenas Administrador)"
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
  );
};
