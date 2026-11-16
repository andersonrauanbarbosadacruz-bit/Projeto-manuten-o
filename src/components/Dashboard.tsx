import React, { useState, useMemo } from 'react';
import { 
  ClipboardCheck, 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  ArrowRight, 
  Droplet, 
  Gauge, 
  ShieldCheck, 
  Building2,
  Calendar,
  User,
  Plus,
  Zap,
  Check,
  Plane,
  Car,
  ShieldAlert,
  FileText,
  Camera,
  BellRing
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FARMS, Farm, CHECKLIST_TYPE_LABELS, ChecklistType } from '../types';
import { isChecklistItemResolved, getChecklistEffectiveStatus } from '../utils/complianceHelper';
import { getServiceRequestQueueInfo, isServiceRequestPriorityValidated } from '../utils/serviceRequestQueue';
import { WorkOrderAnalyticsChart } from './WorkOrderAnalyticsChart';

export const Dashboard: React.FC = () => {
  const { 
    selectedFarmFilter, 
    setSelectedFarmFilter, 
    userRole,
    setActiveTab, 
    checklists, 
    workOrders, 
    setViewChecklistDetail, 
    setViewWorkOrderDetail,
    generateWorkOrderFromChecklistNC,
    startNewChecklist,
    startNewFleetAction,
    setShowSyncModal,
    fleetMonthlyUpdates,
    setShowFleetUpdateFormModal,
    setViewFleetUpdateDetail,
    hasServiceRequestAccess,
    hasModuleAccess,
    serviceRequestFarmScope,
    serviceRequests,
    setViewServiceRequestDetail,
    generateWorkOrderFromServiceRequest,
    activeOperatorRelease
  } = useApp();

  const canChecklist = hasModuleAccess('checklist');
  const canWorkOrder = hasModuleAccess('work_order');
  const canFleet = hasModuleAccess('fleet_update');

  const [ncTab, setNcTab] = useState<'PENDENTES' | 'CORRIGIDAS'>('PENDENTES');
  const [sinistroTab, setSinistroTab] = useState<'PENDENTES' | 'RECONHECIDOS'>('PENDENTES');

  // Filter fleet updates by active farm
  const currentFleetUpdates = useMemo(() => {
    return selectedFarmFilter === 'TODAS'
      ? (fleetMonthlyUpdates || [])
      : (fleetMonthlyUpdates || []).filter(u => u.farm === selectedFarmFilter);
  }, [fleetMonthlyUpdates, selectedFarmFilter]);

  // Sinistros partitioned into pending vs recognized by admin
  const { pendingSinistros, recognizedSinistros } = useMemo(() => {
    const pending: typeof currentFleetUpdates = [];
    const recognized: typeof currentFleetUpdates = [];
    currentFleetUpdates.forEach(u => {
      if (u.hasIncidentLast30Days) {
        if (u.adminAcknowledged) {
          recognized.push(u);
        } else {
          pending.push(u);
        }
      }
    });
    return { pendingSinistros: pending, recognizedSinistros: recognized };
  }, [currentFleetUpdates]);

  // Filter items by active farm
  const currentChecklists = useMemo(() => {
    return selectedFarmFilter === 'TODAS'
      ? checklists
      : checklists.filter(c => c.farm === selectedFarmFilter);
  }, [checklists, selectedFarmFilter]);

  const currentWorkOrders = useMemo(() => {
    return selectedFarmFilter === 'TODAS'
      ? workOrders
      : workOrders.filter(wo => wo.farm === selectedFarmFilter);
  }, [workOrders, selectedFarmFilter]);

  const pendingServiceRequests = useMemo(() => {
    if (!hasServiceRequestAccess) return [];
    const list = serviceRequestFarmScope === 'TODAS'
      ? (serviceRequests || [])
      : (serviceRequests || []).filter(sr => sr.farm === serviceRequestFarmScope);
    return list
      .filter(sr => sr.status === 'PENDENTE' || sr.status === 'EM_ATENDIMENTO')
      .sort((a, b) => {
        const aVal = isServiceRequestPriorityValidated(a);
        const bVal = isServiceRequestPriorityValidated(b);
        if (aVal !== bVal) return aVal ? 1 : -1;
        const aUrg = a.urgency === 'URGENTE' ? 0 : 1;
        const bUrg = b.urgency === 'URGENTE' ? 0 : 1;
        if (aUrg !== bUrg) return aUrg - bUrg;
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      });
  }, [hasServiceRequestAccess, serviceRequests, serviceRequestFarmScope]);

  // Statistics: Checklists that are conforming or whose NCs have all been corrected via concluded Work Orders
  const { 
    totalChecklists, 
    compliantChecklists, 
    complianceRate, 
    totalItemsChecked,
    openWorkOrders,
    inProgressWorkOrders,
    completedWorkOrders,
    pendingNCIssues,
    resolvedNCIssues,
    totalItemsNC
  } = useMemo(() => {
    const totChecklists = currentChecklists.length;
    const compChecklists = currentChecklists.filter(c => {
      const eff = getChecklistEffectiveStatus(c, workOrders);
      return eff.isFullyConforming;
    }).length;

    const compRate = totChecklists > 0 
      ? Math.round((compChecklists / totChecklists) * 100) 
      : 100;

    const totItemsChecked = currentChecklists.reduce(
      (acc, c) => acc + (c && Array.isArray(c.items) ? c.items.length : 0), 
      0
    );

    const openWO = currentWorkOrders.filter(wo => wo.status === 'ABERTA');
    const inProgressWO = currentWorkOrders.filter(wo => wo.status === 'EM_ANDAMENTO');
    const completedWO = currentWorkOrders.filter(wo => wo.status === 'CONCLUIDA');

    const pendingNC: Array<{
      checklist: any;
      item: any;
    }> = [];

    const resolvedNC: Array<{
      checklist: any;
      item: any;
      linkedWorkOrder: any;
      isAcknowledged?: boolean;
    }> = [];

    currentChecklists.forEach(c => {
      if (!c || !Array.isArray(c.items)) return;
      c.items.forEach(item => {
        if (item.status === 'N/C') {
          const { isResolved, linkedWorkOrder, isAcknowledged } = isChecklistItemResolved(item, c, workOrders);
          if (isResolved) {
            resolvedNC.push({
              checklist: c,
              item,
              linkedWorkOrder,
              isAcknowledged
            });
          } else {
            pendingNC.push({
              checklist: c,
              item
            });
          }
        }
      });
    });

    return {
      totalChecklists: totChecklists,
      compliantChecklists: compChecklists,
      complianceRate: compRate,
      totalItemsChecked: totItemsChecked,
      openWorkOrders: openWO,
      inProgressWorkOrders: inProgressWO,
      completedWorkOrders: completedWO,
      pendingNCIssues: pendingNC,
      resolvedNCIssues: resolvedNC,
      totalItemsNC: pendingNC.length
    };
  }, [currentChecklists, currentWorkOrders, workOrders]);

  return (
    <div className="space-y-5 pb-12">
      {/* Compact & Intuitive Hero Header */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 rounded-2xl p-4 sm:p-5 text-white shadow-lg border border-emerald-900/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <MapPin className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                {selectedFarmFilter === 'TODAS' ? 'Todas as Fazendas' : selectedFarmFilter}
              </span>
              <span className="text-slate-500 text-xs hidden sm:inline">•</span>
              <span className="text-xs text-emerald-400/90 font-medium hidden sm:inline">
                Painel Integrado de Manutenção & Frota
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 pt-1 min-w-0">
              <div className="bg-white/95 rounded-xl px-2 py-1 shadow-xs flex items-center shrink-0">
                <img 
                  src="/assets/aistudio/image_adab39d7.png" 
                  alt="el Ciruelo" 
                  className="h-7 sm:h-8 w-auto object-contain"
                />
              </div>
              <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white break-words min-w-0">
                el Ciruelo • Manutenção & Frota
              </h1>
            </div>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-normal">
              Controle preventivo/corretivo de instalações, checklists de campo e vistorias mensais com odômetro e fotos.
            </p>
          </div>

          {/* Quick Primary Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {canChecklist && (
              <button
                onClick={() => setActiveTab('new-checklist')}
                className="inline-flex items-center px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1" />
                <span>Novo Checklist</span>
              </button>
            )}
            {canWorkOrder && (
              <button
                onClick={() => setActiveTab('new-work-order')}
                className="inline-flex items-center px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Wrench className="w-4 h-4 mr-1" />
                <span>Nova OS</span>
              </button>
            )}
            {canFleet && (
              <button
                onClick={() => startNewFleetAction('UPDATE')}
                className="inline-flex items-center px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-95 cursor-pointer"
                title="Acessar Frota (Atualização Mensal ou Checklist de Veículo)"
              >
                <Car className="w-4 h-4 mr-1" />
                <span>Frota</span>
              </button>
            )}
            <button
              onClick={() => setShowSyncModal(true)}
              className="inline-flex items-center px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-emerald-300 border border-emerald-500/40 font-bold text-xs sm:text-sm transition-all active:scale-95 cursor-pointer"
              title="Sincronizar Celular e Computador via QR Code ou WhatsApp"
            >
              <span>📲 Sincronizar</span>
            </button>
          </div>
        </div>

        {/* Quick Alert Ticker if there are pending NCs, pending Sinistros or pending Service Requests */}
        {((canChecklist && pendingNCIssues.length > 0) || (canFleet && pendingSinistros.length > 0) || (hasServiceRequestAccess && pendingServiceRequests.length > 0)) && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-400 text-[11px] uppercase tracking-wider">Alertas ativos:</span>
            {hasServiceRequestAccess && pendingServiceRequests.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('service-requests')}
                className="inline-flex items-center px-2.5 py-1 rounded-lg bg-violet-500/25 text-violet-200 border border-violet-400/50 font-bold hover:bg-violet-500/40 transition-colors cursor-pointer animate-pulse"
              >
                <BellRing className="w-3.5 h-3.5 mr-1.5 text-violet-300" />
                {pendingServiceRequests.length} Solicitação(ões) de Serviço Pendente(s)
              </button>
            )}
            {canChecklist && pendingNCIssues.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-500/40 font-bold">
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-red-400" />
                {pendingNCIssues.length} Não Conformidade(s) em Checklist
              </span>
            )}
            {canFleet && pendingSinistros.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold animate-pulse">
                <ShieldAlert className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                {pendingSinistros.length} Sinistro(s) de Frota Pendente(s) de Aceite
              </span>
            )}
          </div>
        )}
      </div>

      {/* Quick Access Banner: Laudos e Calibrações NR-13 (Admin) */}
      {userRole === 'ADMIN' && (
        <div 
          onClick={() => setActiveTab('nr13-calibrations')}
          className="bg-gradient-to-r from-fuchsia-950 via-slate-900 to-emerald-950 p-4 rounded-2xl border border-fuchsia-900/40 text-white shadow-md flex items-center justify-between gap-3 cursor-pointer hover:border-fuchsia-400 transition-all group"
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-fuchsia-900/60 text-fuchsia-200 border border-fuchsia-400/30 shrink-0 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5 text-fuchsia-300" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-fuchsia-200 text-fuchsia-950 uppercase tracking-wider">
                  🍇 el Ciruelo • NR-13
                </span>
                <span className="text-xs text-slate-300">Vasos de Pressão & Metrologia</span>
              </div>
              <h4 className="text-sm font-bold text-white mt-0.5">
                Laudos Técnicos e Calibrações (Válvulas PSV e Ultrassom)
              </h4>
            </div>
          </div>
          <div className="hidden sm:flex items-center space-x-2 text-xs font-bold text-fuchsia-300 group-hover:text-white transition-colors">
            <span>Acessar Módulo</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* Exclusive Service Requests Alerts (Visible ONLY to Admin & Authorized Operators) */}
      {hasServiceRequestAccess && pendingServiceRequests.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border-2 border-violet-300 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 rounded-xl bg-violet-700 text-white shadow-xs shrink-0">
                <BellRing className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-100 text-violet-900 border border-violet-200">
                    {activeOperatorRelease ? `Alertas Liberados: ${activeOperatorRelease.operatorName}` : 'Acesso Técnico Autorizado'}
                  </span>
                  {serviceRequestFarmScope !== 'TODAS' && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                      Fazenda: {serviceRequestFarmScope}
                    </span>
                  )}
                  <span className="text-xs font-extrabold text-violet-800 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200 tabular-nums">
                    {pendingServiceRequests.length} pendente(s)
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
                  Alertas de Abertura de Solicitações de Serviço
                </h2>
                <p className="text-xs text-slate-600">
                  Acesse o chamado para decidir a prioridade (Urgente ou Normal). Depois, siga com a vinculação para abrir e executar a Ordem de Serviço.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('service-requests')}
              className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-violet-700 hover:bg-violet-800 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors shrink-0"
            >
              <span>Abrir Painel de Solicitações</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingServiceRequests.slice(0, 6).map(sr => {
              const qInfo = getServiceRequestQueueInfo(serviceRequests || [], sr);
              const isValidated = qInfo.isValidated;
              return (
                <div
                  key={sr.id}
                  className={`rounded-xl p-3.5 border transition-all flex flex-col justify-between space-y-2.5 ${
                    !isValidated
                      ? 'bg-amber-50/70 border-amber-300 hover:border-amber-400'
                      : 'bg-violet-50/50 border-violet-200 hover:border-violet-400'
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span className="font-mono text-[11px] font-bold bg-white text-violet-950 px-2 py-0.5 rounded border border-violet-200 tabular-nums">
                        {sr.code}
                      </span>
                      {!isValidated ? (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase bg-amber-200 text-amber-950 border border-amber-400 animate-pulse">
                          Decidir Prioridade
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          {qInfo.queuePosition !== null && (
                            <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-900 text-white tabular-nums">
                              {qInfo.queuePosition}º Fila
                            </span>
                          )}
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                            sr.urgency === 'URGENTE'
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}>
                            {sr.urgency === 'URGENTE' ? 'Urgente' : 'Normal'}
                          </span>
                        </div>
                      )}
                    </div>

                    <h4 className="text-sm font-black text-slate-900 mt-1.5 line-clamp-1">
                      {sr.equipment}
                    </h4>

                    <div className="text-[11px] text-slate-600 mt-1 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="truncate font-semibold text-slate-800">Solic.: {sr.requesterName}</span>
                        <span className="tabular-nums text-slate-500 shrink-0 ml-2">{sr.date} {sr.time}</span>
                      </div>
                      <div className="truncate text-slate-600">
                        {sr.farm} • {sr.location}
                      </div>
                    </div>

                    <p className="mt-2 text-xs text-slate-700 bg-white p-2 rounded-lg border border-violet-100 line-clamp-2">
                      {sr.problemDescription}
                    </p>
                  </div>

                  {!isValidated ? (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setViewServiceRequestDetail(sr)}
                        className="w-full inline-flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-extrabold cursor-pointer transition-colors shadow-2xs"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Acessar & Decidir Prioridade</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setViewServiceRequestDetail(sr)}
                        className="flex-1 min-w-[110px] py-2 px-2.5 rounded-lg bg-white hover:bg-violet-100 text-violet-900 border border-violet-300 text-xs font-bold cursor-pointer transition-colors"
                      >
                        Ver / Vincular
                      </button>
                      <button
                        type="button"
                        onClick={() => generateWorkOrderFromServiceRequest(sr)}
                        className="flex-1 min-w-[130px] inline-flex items-center justify-center space-x-1 py-2 px-2.5 rounded-lg text-xs font-extrabold cursor-pointer transition-colors shadow-2xs bg-amber-500 hover:bg-amber-400 text-stone-950"
                      >
                        <Wrench className="w-3.5 h-3.5 shrink-0" />
                        <span>Vincular & Abrir OS</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {userRole === 'OPERADOR' && hasServiceRequestAccess && pendingServiceRequests.length === 0 && (
        <div className="bg-white rounded-2xl p-4 border border-violet-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-violet-100 text-violet-800 shrink-0">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-extrabold text-slate-900">
                Alertas de Abertura de SS Ativos ({activeOperatorRelease?.operatorName || 'Técnico'})
              </div>
              <div className="text-[11px] text-slate-500">
                Nenhuma solicitação aguardando decisão de prioridade ou abertura de OS em {serviceRequestFarmScope === 'TODAS' ? 'todas as fazendas' : serviceRequestFarmScope}.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('service-requests')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-900 border border-violet-200 text-xs font-bold cursor-pointer shrink-0"
          >
            <span>Ver Fila & Histórico de SS</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      {(canChecklist || canWorkOrder) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {canChecklist && (
            <>
        {/* Card 1: Checklists */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Checklists Totais
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <ClipboardCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {currentChecklists.filter(c => c.type !== 'VEICULO' && c.type !== 'DRONE').length}
            </span>
            <span className="text-xs text-slate-500 font-medium">realizados</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-1 pt-2 border-t border-slate-100">
            <span>{currentChecklists.filter(c => c.type === 'SALA_DE_MAQUINAS').length} Máq</span>
            <span>•</span>
            <span>{currentChecklists.filter(c => c.type === 'GERADOR').length} Ger</span>
            <span>•</span>
            <span>{currentChecklists.filter(c => c.type === 'IRRIGACAO').length} Irrig</span>
          </div>
        </div>

        {/* Card 2: Conformidade */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Taxa de Conformidade
            </span>
            <div className={`p-2 rounded-lg ${complianceRate >= 80 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className={`text-3xl font-extrabold ${complianceRate >= 80 ? 'text-emerald-700' : 'text-amber-600'}`}>
              {complianceRate}%
            </span>
            <span className="text-xs text-slate-500 font-medium">conforme</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div 
                className={`h-1.5 rounded-full ${complianceRate >= 80 ? 'bg-emerald-600' : 'bg-amber-500'}`}
                style={{ width: `${complianceRate}%` }}
              />
            </div>
          </div>
        </div>

            </>
          )}

          {canWorkOrder && (
            <>
              {/* Card 3: OS Abertas e Em Andamento */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              OS Pendentes
            </span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-amber-600">
              {openWorkOrders.length + inProgressWorkOrders.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">em aberto</span>
          </div>
          <div className="mt-2 text-xs text-slate-600 flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-red-600 font-semibold">{openWorkOrders.length} Abertas</span>
            <span>•</span>
            <span className="text-amber-700 font-semibold">{inProgressWorkOrders.length} Em Andamento</span>
          </div>
        </div>

        {/* Card 4: OS Concluídas */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              OS Concluídas
            </span>
            <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900">{completedWorkOrders.length}</span>
            <span className="text-xs text-slate-500 font-medium">finalizadas</span>
          </div>
          <div className="mt-2 text-xs text-emerald-700 font-semibold flex items-center pt-2 border-t border-slate-100">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Manutenção com antes e depois
          </div>
        </div>
            </>
          )}
        </div>
      )}

      {/* Direct Checklist Starters (3 Operational Models - Veículo e Drone migrados para Frota) */}
      {canChecklist && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Box 1: Sala de Máquinas */}
        <div 
          onClick={() => startNewChecklist('SALA_DE_MAQUINAS')}
          className="group relative cursor-pointer bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-4 rounded-2xl border border-slate-700 text-white shadow-lg hover:shadow-xl hover:border-emerald-500 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 group-hover:scale-105 transition-transform">
                <Gauge className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300">
                9 Itens
              </span>
            </div>
            <div className="mt-3">
              <h3 className="text-base font-bold group-hover:text-emerald-300 transition-colors">
                Sala de Máquinas
              </h3>
              <p className="mt-1 text-xs text-slate-300 line-clamp-2">
                Compressores, bombas de amônia, condensadores evaporativos e câmaras.
              </p>
            </div>
          </div>
          <div className="mt-3.5 flex items-center text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform pt-2.5 border-t border-slate-800">
            <span>Iniciar Máquinas</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </div>

        {/* Box 2: Grupo Gerador */}
        <div 
          onClick={() => startNewChecklist('GERADOR')}
          className="group relative cursor-pointer bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 p-4 rounded-2xl border border-slate-700 text-white shadow-lg hover:shadow-xl hover:border-amber-500 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300">
                5 Itens
              </span>
            </div>
            <div className="mt-3">
              <h3 className="text-base font-bold group-hover:text-amber-300 transition-colors">
                Grupo Gerador
              </h3>
              <p className="mt-1 text-xs text-slate-300 line-clamp-2">
                Radiador, óleo lubrificante, nível de combustível, baterias e teste 5 min.
              </p>
            </div>
          </div>
          <div className="mt-3.5 flex items-center text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform pt-2.5 border-t border-slate-800">
            <span>Iniciar Gerador</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </div>

        {/* Box 3: Irrigação */}
        <div 
          onClick={() => startNewChecklist('IRRIGACAO')}
          className="group relative cursor-pointer bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 p-4 rounded-2xl border border-slate-700 text-white shadow-lg hover:shadow-xl hover:border-teal-500 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between">
              <div className="p-2 bg-teal-500/20 text-teal-400 rounded-xl border border-teal-500/30 group-hover:scale-105 transition-transform">
                <Droplet className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-300">
                6 Itens
              </span>
            </div>
            <div className="mt-3">
              <h3 className="text-base font-bold group-hover:text-teal-300 transition-colors">
                Casa de Bombas
              </h3>
              <p className="mt-1 text-xs text-slate-300 line-clamp-2">
                Nível de óleo das bombas, acoplamentos, filtros e vazamentos.
              </p>
            </div>
          </div>
          <div className="mt-3.5 flex items-center text-xs font-bold text-teal-400 group-hover:translate-x-1 transition-transform pt-2.5 border-t border-slate-800">
            <span>Iniciar Irrigação</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </div>
        </div>
      )}

      {/* Item Solicitado: Frota (Atualização Mensal, Veículos e Drone Agrícola) */}
      {canFleet && (
        <div className="bg-gradient-to-br from-white via-cyan-50/20 to-white rounded-2xl p-6 border border-cyan-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-3 bg-gradient-to-br from-cyan-700 to-cyan-900 text-white rounded-2xl shadow-md shrink-0">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-800 bg-cyan-100 px-2.5 py-0.5 rounded-full">
                  Frota & Aeronaves
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-bold text-slate-500">
                  {currentFleetUpdates.length} atualização(ões) • {currentChecklists.filter(c => c.type === 'VEICULO').length} veículo(s) • {currentChecklists.filter(c => c.type === 'DRONE').length} drone(s)
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight mt-1">
                Frota: Atualização Mensal, Veículos & Drone Agrícola
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mt-0.5">
                Realize a atualização mensal (KM, condutor, preventivas, sinistros e 4 fotos), o checklist de veículo ou o checklist de drone agrícola.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('fleet-updates')}
              className="inline-flex items-center px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-2xs"
            >
              Ver Histórico Completo
            </button>
            <button
              onClick={() => startNewFleetAction('DRONE')}
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs sm:text-sm font-extrabold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Plane className="w-4 h-4 text-indigo-200" />
              <span>Drone Agrícola</span>
            </button>
            <button
              onClick={() => startNewFleetAction('CHECKLIST')}
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-extrabold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <ClipboardCheck className="w-4 h-4 text-cyan-300" />
              <span>Checklist de Veículo</span>
            </button>
            <button
              onClick={() => startNewFleetAction('UPDATE')}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white text-xs sm:text-sm font-extrabold shadow-md hover:shadow-cyan-700/20 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Atualização Mensal</span>
            </button>
          </div>
        </div>

        {/* Incident Alert Banner if there are unacknowledged sinistros */}
        {pendingSinistros.length > 0 && (
          <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-amber-500 text-white rounded-lg shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <strong className="text-amber-950 text-sm font-black flex items-center gap-1.5">
                  <span>Alerta de Frota:</span>
                  <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full text-xs">
                    {pendingSinistros.length} Sinistro(s) Pendente(s)
                  </span>
                </strong>
                <p className="text-xs text-amber-900 mt-0.5">
                  Existem avarias reportadas em veículos aguardando vistoria e reconhecimento formal pela Gerência de Manutenção.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setSinistroTab('PENDENTES');
                if (pendingSinistros[0]) setViewFleetUpdateDetail(pendingSinistros[0]);
              }}
              className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 shadow-xs cursor-pointer transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Acessar e Reconhecer Sinistro</span>
            </button>
          </div>
        )}

        {/* Tab Filters for Fleet Preview */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 flex-wrap gap-2">
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setSinistroTab('PENDENTES')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                sinistroTab === 'PENDENTES'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sinistros Pendentes ({pendingSinistros.length})
            </button>
            <button
              type="button"
              onClick={() => setSinistroTab('RECONHECIDOS')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                sinistroTab === 'RECONHECIDOS'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Reconhecidos Admin ({recognizedSinistros.length})
            </button>
          </div>

          <span className="text-xs text-slate-400 font-medium">
            Mostrando {sinistroTab === 'PENDENTES' ? pendingSinistros.length : recognizedSinistros.length} registro(s)
          </span>
        </div>

        {/* Fleet Updates List Based on Sinistro Tab */}
        {sinistroTab === 'PENDENTES' ? (
          pendingSinistros.length === 0 ? (
            <div className="bg-slate-50 rounded-xl p-6 text-center border border-slate-200 text-xs text-slate-500 flex flex-col items-center justify-center space-y-1.5">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              <strong className="text-slate-800 text-sm">Nenhum sinistro pendente de aceite!</strong>
              <p className="text-slate-500 max-w-sm">
                Todos os veículos inspecionados estão sem avarias ou tiveram seus sinistros formalmente reconhecidos pela Gerência.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pendingSinistros.map((u: any) => (
                <div
                  key={u.id}
                  className="bg-amber-50/70 rounded-xl p-3.5 border-2 border-amber-300 hover:shadow-md transition-all flex flex-col justify-between space-y-2.5 group"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono text-[11px] font-bold bg-white text-slate-800 px-1.5 py-0.5 rounded border border-amber-200">
                            {u.code}
                          </span>
                          <span className="text-[11px] font-bold text-amber-900 bg-amber-200 px-2 py-0.5 rounded-full">
                            {u.farm}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-slate-900 mt-1 flex items-center space-x-1">
                          <span>{u.plate}</span>
                          <span className="text-slate-400 font-normal">•</span>
                          <span className="text-xs text-slate-700 font-bold">{u.vehicleModel || 'Frota'}</span>
                        </h4>
                      </div>
                      <span className="text-xs font-black text-amber-950 bg-amber-100 px-2 py-1 rounded-md border border-amber-300">
                        {Number(u.mileage).toLocaleString('pt-BR')} KM
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1.5 mt-1 border-t border-amber-200">
                      <span>Condutor: <strong>{u.driver}</strong></span>
                      <span>{u.date}</span>
                    </div>

                    {/* Damage Note */}
                    <div className="mt-2 bg-white/90 p-2.5 rounded-lg border border-amber-200 text-xs text-amber-950">
                      <strong className="block text-slate-800 mb-0.5">Dano / Sinistro Apontado:</strong>
                      <p className="line-clamp-2">{u.incidentNotes || 'Sinistro reportado na vistoria.'}</p>
                    </div>

                    {/* Incident Photos Preview if any */}
                    {u.incidentPhotos && u.incidentPhotos.length > 0 && (
                      <div className="mt-2 flex items-center space-x-1.5">
                        <Camera className="w-3.5 h-3.5 text-amber-700" />
                        <span className="text-[10px] font-extrabold text-amber-900">
                          {u.incidentPhotos.length} foto(s) anexada(s) do sinistro
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setViewFleetUpdateDetail(u)}
                    className="w-full inline-flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Acessar Ficha e Reconhecer Sinistro</span>
                  </button>
                </div>
              ))}
            </div>
          )
        ) : (
          recognizedSinistros.length === 0 ? (
            <div className="bg-slate-50 rounded-xl p-6 text-center border border-slate-200 text-xs text-slate-500">
              Nenhum sinistro reconhecido registrado nesta fazenda.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recognizedSinistros.map((u: any) => (
                <div
                  key={u.id}
                  onClick={() => setViewFleetUpdateDetail(u)}
                  className="bg-white rounded-xl p-3.5 border border-emerald-300 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between space-y-2 group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono text-[11px] font-bold bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded">
                          {u.code}
                        </span>
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                          {u.farm}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 mt-1">
                        {u.plate} • {u.vehicleModel || 'Frota'}
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center">
                      <ShieldCheck className="w-3 h-3 mr-1 text-emerald-700" />
                      Reconhecido
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600 bg-emerald-50/50 p-2 rounded border border-emerald-100">
                    <p className="line-clamp-1"><strong>Dano:</strong> {u.incidentNotes || 'Sinistro registrado'}</p>
                    <p className="text-[10px] text-emerald-800 mt-0.5">
                      Visto: {u.acknowledgedBy || 'Gerente Manutenção'} ({u.acknowledgedAt || 'Data'})
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-cyan-700 pt-1 border-t border-slate-100">
                    <span>Ver ficha completa</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )
        )}
        </div>
      )}

      {/* Farms Status Overview (Vale das Uvas, Brasil Uvas, Labrunier 1, Labrunier 2) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Situação por Unidade / Fazenda
            </h2>
            <p className="text-xs text-slate-500">
              Clique em uma fazenda para filtrar todo o sistema automaticamente
            </p>
          </div>
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            {FARMS.length} Fazendas Ativas
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {FARMS.map(farm => {
            const farmChecklists = checklists.filter(c => c.farm === farm);
            const farmOpenOS = workOrders.filter(
              wo => wo.farm === farm && (wo.status === 'ABERTA' || wo.status === 'EM_ANDAMENTO')
            );
            const isSelected = selectedFarmFilter === farm;

            return (
              <div
                key={farm}
                onClick={() => setSelectedFarmFilter(isSelected ? 'TODAS' : farm)}
                className={`cursor-pointer rounded-xl p-4 border transition-all ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{farm}</span>
                  <Building2 className={`w-4 h-4 ${isSelected ? 'text-emerald-700' : 'text-slate-400'}`} />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                  <span>{farmChecklists.length} checklists</span>
                  <span className={`font-semibold px-2 py-0.5 rounded-full ${
                    farmOpenOS.length > 0 
                      ? 'bg-amber-100 text-amber-800' 
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {farmOpenOS.length} OS {farmOpenOS.length === 1 ? 'pendente' : 'pendentes'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Non-Conformities Alert Feed & Work Orders */}
      {(canChecklist || canWorkOrder) && (
        <div className={`grid grid-cols-1 ${canChecklist && canWorkOrder ? 'lg:grid-cols-2' : ''} gap-6`}>
          {/* NC Items needing attention */}
          {canChecklist && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">
                  Não Conformidades de Checklist
                </h3>
                <p className="text-xs text-slate-500">
                  Apontamentos operacionais com acompanhamento de reparo
                </p>
              </div>
            </div>

            {/* Toggle Tabs */}
            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setNcTab('PENDENTES')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  ncTab === 'PENDENTES'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pendentes ({pendingNCIssues.length})
              </button>

              <button
                type="button"
                onClick={() => setNcTab('CORRIGIDAS')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  ncTab === 'CORRIGIDAS'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Corrigidas via OS ({resolvedNCIssues.length})
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-96 pr-1">
            {ncTab === 'PENDENTES' ? (
              pendingNCIssues.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-center p-4 text-slate-400">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
                  <p className="text-sm font-bold text-slate-700">
                    Nenhuma Não-Conformidade pendente!
                  </p>
                  <p className="text-xs text-slate-400 max-w-xs mt-0.5">
                    {resolvedNCIssues.length > 0 
                      ? `Todos os ${resolvedNCIssues.length} defeitos apontados foram reparados e concluídos via Ordem de Serviço!`
                      : 'Todos os checklists avaliados estão 100% conformes.'}
                  </p>
                </div>
              ) : (
                pendingNCIssues.map((nc, idx) => {
                  const hasOS = !!nc.item.generatedWorkOrderId;
                  const linkedOS = workOrders.find(w => w.id === nc.item.generatedWorkOrderId);

                  return (
                    <div 
                      key={idx}
                      className="p-3.5 rounded-xl border border-red-200/70 bg-red-50/30 hover:bg-red-50/60 transition-colors space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-red-800 uppercase tracking-wider block">
                            {nc.checklist.farm} • {CHECKLIST_TYPE_LABELS[nc.checklist.type as ChecklistType]}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900">
                            {nc.item.description}
                          </h4>
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-600 text-white shrink-0">
                          N/C Ativa
                        </span>
                      </div>

                      {nc.item.notes && (
                        <p className="text-xs text-slate-600 bg-white p-2 rounded-lg border border-red-100">
                          <strong>Obs:</strong> {nc.item.notes}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <span className="text-xs text-slate-500">
                          {nc.checklist.code} • {nc.checklist.date}
                        </span>

                        {hasOS && linkedOS ? (
                          <button
                            onClick={() => setViewWorkOrderDetail(linkedOS)}
                            className="inline-flex items-center text-xs font-bold text-amber-900 hover:text-amber-950 bg-amber-100 px-2.5 py-1 rounded-md border border-amber-300 cursor-pointer"
                          >
                            <Wrench className="w-3 h-3 mr-1 text-amber-700" />
                            OS {linkedOS.code} ({linkedOS.status})
                          </button>
                        ) : (
                          <button
                            onClick={() => generateWorkOrderFromChecklistNC(
                              nc.checklist,
                              nc.item.description,
                              nc.item.notes,
                              nc.item.photoUrl
                            )}
                            className="inline-flex items-center text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-2.5 py-1 rounded-md shadow-xs transition-colors cursor-pointer"
                          >
                            <Wrench className="w-3 h-3 mr-1" />
                            Gerar OS Deste Defeito
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              /* Resolved tab */
              resolvedNCIssues.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-center p-4 text-slate-400">
                  <Wrench className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-slate-700">
                    Nenhuma não conformidade corrigida ainda
                  </p>
                  <p className="text-xs text-slate-400 max-w-xs mt-0.5">
                    Quando uma Ordem de Serviço gerada a partir de um checklist for concluída, ela aparecerá aqui como regularizada.
                  </p>
                </div>
              ) : (
                resolvedNCIssues.map((nc, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70 transition-colors space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                          {nc.checklist.farm} • {CHECKLIST_TYPE_LABELS[nc.checklist.type as ChecklistType]}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">
                          {nc.item.description}
                        </h4>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-700 text-white shrink-0 flex items-center">
                        {nc.isAcknowledged ? (
                          <>
                            <ShieldCheck className="w-3 h-3 mr-1" /> N/C Aceita (Admin)
                          </>
                        ) : (
                          <>
                            <Check className="w-3 h-3 mr-0.5" /> Corrigido (OS)
                          </>
                        )}
                      </span>
                    </div>

                    {nc.item.notes && (
                      <p className="text-xs text-slate-600 bg-white p-2 rounded-lg border border-emerald-100">
                        <strong>Obs do checklist:</strong> {nc.item.notes}
                      </p>
                    )}

                    {nc.isAcknowledged && nc.item.acknowledgementJustification && (
                      <p className="text-xs text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                        <strong>Justificativa do Aceite:</strong> {nc.item.acknowledgementJustification}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span className="text-xs text-slate-500">
                        Checklist: {nc.checklist.code} ({nc.checklist.date})
                      </span>

                      {nc.isAcknowledged ? (
                        <span className="inline-flex items-center text-xs font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-md">
                          <ShieldCheck className="w-3 h-3 mr-1 text-emerald-700" />
                          Gerente Manutenção ({nc.item.acknowledgedAt || 'Registrado'})
                        </span>
                      ) : nc.linkedWorkOrder ? (
                        <button
                          onClick={() => setViewWorkOrderDetail(nc.linkedWorkOrder)}
                          className="inline-flex items-center text-xs font-bold text-emerald-900 bg-white hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-md shadow-2xs cursor-pointer"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                          OS {nc.linkedWorkOrder.code} (Concluída)
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              )
            )}
          </div>
            </div>
          )}

          {/* Recent Work Orders */}
          {canWorkOrder && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">
                  Ordens de Serviço Recentes
                </h3>
                <p className="text-xs text-slate-500">
                  Acompanhamento de manutenções com fotos antes e depois
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('work-orders')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center"
            >
              Ver todas <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-96 pr-1">
            {currentWorkOrders.slice(0, 5).map(wo => {
              const statusColors = {
                ABERTA: 'bg-red-100 text-red-800 border-red-200',
                EM_ANDAMENTO: 'bg-amber-100 text-amber-800 border-amber-200',
                CONCLUIDA: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                CANCELADA: 'bg-slate-100 text-slate-600 border-slate-200',
                RASCUNHO: 'bg-blue-100 text-blue-800 border-blue-200'
              };

              return (
                <div
                  key={wo.id}
                  onClick={() => setViewWorkOrderDetail(wo)}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-slate-50/70 transition-all cursor-pointer space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-1.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                          {wo.code}
                        </span>
                        <span className="text-xs font-bold text-emerald-800">
                          {wo.farm}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          wo.maintenanceType === 'PREVENTIVA'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}>
                          {wo.maintenanceType === 'PREVENTIVA' ? 'Preventiva' : 'Corretiva'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1 line-clamp-1">
                        {wo.equipment || wo.location}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium line-clamp-1">
                        📍 {wo.location}
                      </p>
                    </div>

                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${statusColors[wo.status]}`}>
                      {wo.status === 'EM_ANDAMENTO' ? 'EM ANDAMENTO' : wo.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2">
                    {wo.problemDescription}
                  </p>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 flex-wrap gap-1">
                    <span className="flex items-center">
                      <User className="w-3 h-3 mr-1" />
                      {wo.responsible}
                    </span>
                    <span className="text-[11px] font-medium text-slate-600">
                      {wo.completionDate ? `Concluída: ${wo.completionDate} às ${wo.completionTime || '--:--'}` : `Início: ${wo.date} às ${wo.time}`}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      {wo.photosBefore.length > 0 && (
                        <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          📸 {wo.photosBefore.length}
                        </span>
                      )}
                      {wo.photosAfter.length > 0 && (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          ✨ {wo.photosAfter.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
            </div>
          )}
        </div>
      )}

      {/* Gráfico de Ordens de Serviço (Filtros por técnico, fazenda e período) - Acesso Admin */}
      {canWorkOrder && <WorkOrderAnalyticsChart />}
    </div>
  );
};
