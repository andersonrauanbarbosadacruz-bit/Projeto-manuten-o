import React, { useState, useMemo } from 'react';
import { 
  Wrench, 
  PlusCircle, 
  Search, 
  MapPin, 
  Calendar, 
  User, 
  Building2, 
  Clock, 
  Eye, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Camera, 
  ArrowRight,
  Printer,
  Download
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Farm, FARMS, WorkOrder, WorkOrderPriority, WorkOrderStatus, MaintenanceType } from '../types';
import { exportWorkOrderToPdf } from '../utils/pdfGenerator';
import { downloadWorkOrderDocument } from '../utils/documentDownloader';

export const WorkOrderList: React.FC = () => {
  const { 
    workOrders, 
    selectedFarmFilter, 
    setSelectedFarmFilter, 
    setActiveTab, 
    setViewWorkOrderDetail, 
    deleteWorkOrder,
    updateWorkOrder,
    userRole,
    requestDelete,
    clearTestRecords
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | 'TODOS'>('TODOS');
  const [priorityFilter, setPriorityFilter] = useState<WorkOrderPriority | 'TODAS'>('TODAS');
  const [typeFilter, setTypeFilter] = useState<MaintenanceType | 'TODOS'>('TODOS');

  const filtered = useMemo(() => {
    return workOrders.filter(wo => {
      if (selectedFarmFilter !== 'TODAS' && wo.farm !== selectedFarmFilter) {
        return false;
      }
      if (statusFilter !== 'TODOS' && wo.status !== statusFilter) {
        return false;
      }
      if (priorityFilter !== 'TODAS' && wo.priority !== priorityFilter) {
        return false;
      }
      if (typeFilter !== 'TODOS' && wo.maintenanceType !== typeFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchCode = wo.code.toLowerCase().includes(q);
        const matchEquip = (wo.equipment || '').toLowerCase().includes(q);
        const matchLocation = wo.location.toLowerCase().includes(q);
        const matchResp = wo.responsible.toLowerCase().includes(q);
        const matchThird = wo.thirdParty.toLowerCase().includes(q);
        const matchDesc = wo.problemDescription.toLowerCase().includes(q);
        if (!matchCode && !matchEquip && !matchLocation && !matchResp && !matchThird && !matchDesc) {
          return false;
        }
      }
      return true;
    });
  }, [workOrders, selectedFarmFilter, statusFilter, priorityFilter, typeFilter, searchTerm]);

  const priorityColors = {
    BAIXA: 'bg-slate-100 text-slate-700 border-slate-200',
    MEDIA: 'bg-blue-50 text-blue-700 border-blue-200',
    ALTA: 'bg-amber-100 text-amber-800 border-amber-300',
    URGENTE: 'bg-red-100 text-red-800 border-red-300 animate-pulse'
  };

  const statusColors = {
    ABERTA: 'bg-red-50 text-red-700 border-red-200',
    EM_ANDAMENTO: 'bg-amber-50 text-amber-800 border-amber-200',
    CONCLUIDA: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    CANCELADA: 'bg-slate-100 text-slate-600 border-slate-200',
    RASCUNHO: 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse'
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Ordens de Serviço de Manutenção Interna
          </h1>
          <p className="text-sm text-slate-500">
            Controle de serviços, materiais, terceirizados e fotos antes/depois nas 4 fazendas
          </p>
        </div>

        <button
          onClick={() => setActiveTab('new-work-order')}
          className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Criar Nova Ordem de Serviço</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por equipamento, código..."
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

          {/* Maintenance Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="TODOS">Todos os Tipos</option>
              <option value="PREVENTIVA">Preventiva 🛡️</option>
              <option value="CORRETIVA">Corretiva ⚠️</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="TODOS">Todos os Status</option>
              <option value="ABERTA">Abertas</option>
              <option value="EM_ANDAMENTO">Em Andamento</option>
              <option value="CONCLUIDA">Concluídas</option>
              <option value="CANCELADA">Canceladas</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="TODAS">Todas as Prioridades</option>
              <option value="URGENTE">Urgente 🚨</option>
              <option value="ALTA">Alta</option>
              <option value="MEDIA">Média</option>
              <option value="BAIXA">Baixa</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid Results */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Wrench className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Nenhuma Ordem de Serviço encontrada
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Não encontramos ordens com os parâmetros informados. Altere os filtros ou abra uma nova OS.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(wo => {
            const hasBefore = wo.photosBefore.length > 0;
            const hasAfter = wo.photosAfter.length > 0;

            return (
              <div
                key={wo.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-amber-300 hover:shadow-md transition-all flex flex-col overflow-hidden"
              >
                {/* Top strip */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                      <span className="font-mono text-xs font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                        {wo.code}
                      </span>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${priorityColors[wo.priority]}`}>
                        {wo.priority}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        wo.maintenanceType === 'PREVENTIVA'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}>
                        {wo.maintenanceType === 'PREVENTIVA' ? '🛡️ Preventiva' : '⚠️ Corretiva'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-emerald-800 font-bold mt-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{wo.farm}</span>
                    </div>
                  </div>

                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${statusColors[wo.status]}`}>
                    {wo.status === 'EM_ANDAMENTO' ? 'EM ANDAMENTO' : wo.status}
                  </span>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Equipamento em Manutenção
                    </span>
                    <h3 className="text-sm font-extrabold text-slate-900 line-clamp-1">
                      {wo.equipment || 'Equipamento Geral'}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium line-clamp-1 mt-0.5">
                      📍 {wo.location}
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {wo.problemDescription}
                  </p>

                  {/* Responsible & Third Party Info */}
                  <div className="space-y-1 text-xs text-slate-600 pt-1 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center">
                        <User className="w-3.5 h-3.5 mr-1" />
                        Responsável:
                      </span>
                      <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                        {wo.responsible}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center">
                        <Building2 className="w-3.5 h-3.5 mr-1" />
                        Terceiro:
                      </span>
                      <span className={`font-semibold truncate max-w-[150px] ${
                        wo.isThirdParty ? 'text-amber-700' : 'text-slate-700'
                      }`}>
                        {wo.thirdParty}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1 text-slate-500" />
                        Início:
                      </span>
                      <span className="text-slate-800 font-medium">
                        {wo.date} às {wo.time}
                      </span>
                    </div>

                    {wo.completionDate ? (
                      <div className="flex items-center justify-between text-emerald-800">
                        <span className="text-emerald-700 flex items-center font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          Conclusão:
                        </span>
                        <span className="font-semibold text-emerald-950">
                          {wo.completionDate} às {wo.completionTime || '--:--'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>Conclusão:</span>
                        <span className="italic">{wo.status === 'EM_ANDAMENTO' ? 'Em andamento...' : 'Em aberto'}</span>
                      </div>
                    )}
                  </div>

                  {/* Visual Photo Comparison Indicators */}
                  <div className="pt-2 grid grid-cols-2 gap-2 text-center text-xs">
                    <div className={`p-2 rounded-xl border ${hasBefore ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                      <span className="block text-[10px] font-bold text-amber-900 uppercase">
                        📸 Antes
                      </span>
                      <span className="font-bold text-slate-800 text-xs mt-0.5">
                        {hasBefore ? `${wo.photosBefore.length} foto(s)` : 'Sem foto'}
                      </span>
                    </div>

                    <div className={`p-2 rounded-xl border ${hasAfter ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                      <span className="block text-[10px] font-bold text-emerald-900 uppercase">
                        ✨ Depois
                      </span>
                      <span className="font-bold text-slate-800 text-xs mt-0.5">
                        {hasAfter ? `${wo.photosAfter.length} foto(s)` : 'Pendente'}
                      </span>
                    </div>
                  </div>

                  {wo.materials.length > 0 && (
                    <div className="flex items-center space-x-1 text-[11px] text-slate-500 pt-1">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      <span>{wo.materials.length} material(is) registrado(s)</span>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => setViewWorkOrderDetail(wo)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                      title="Ver Ficha Técnica Completa ou Imprimir / Salvar em PDF"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Ver Ficha / Imprimir</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportWorkOrderToPdf(wo);
                      }}
                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 text-xs font-bold transition-colors cursor-pointer"
                      title="Baixar arquivo PDF da Ordem de Serviço no computador"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-700" />
                      <span className="hidden sm:inline">Baixar PDF</span>
                    </button>
                  </div>

                  <div className="flex items-center space-x-1">
                    {/* Quick status cycle button */}
                    {wo.status !== 'CONCLUIDA' && (
                      <button
                        onClick={() => {
                          const now = new Date();
                          const nextStatus = wo.status === 'ABERTA' ? 'EM_ANDAMENTO' : 'CONCLUIDA';
                          updateWorkOrder(wo.id, { 
                            status: nextStatus,
                            completionDate: nextStatus === 'CONCLUIDA' ? (wo.completionDate || now.toISOString().split('T')[0]) : wo.completionDate,
                            completionTime: nextStatus === 'CONCLUIDA' ? (wo.completionTime || now.toTimeString().substring(0, 5)) : wo.completionTime
                          });
                        }}
                        className="px-2 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition-colors cursor-pointer"
                        title="Avançar status"
                      >
                        {wo.status === 'ABERTA' ? 'Iniciar' : 'Concluir'}
                      </button>
                    )}

                    {userRole === 'ADMIN' && (
                      <button
                        onClick={() => {
                          requestDelete({
                            type: 'work-order',
                            id: wo.id,
                            code: wo.code,
                            description: `${wo.equipment} - ${wo.location}`
                          });
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                        title="Excluir OS (Apenas Administrador)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
