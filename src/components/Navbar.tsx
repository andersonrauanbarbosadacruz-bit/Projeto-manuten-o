import React, { useState, useMemo } from 'react';
import { 
  ClipboardCheck, 
  Wrench, 
  LayoutDashboard, 
  PlusCircle, 
  Plus,
  MapPin, 
  Menu, 
  X, 
  Smartphone, 
  QrCode,
  RefreshCw, 
  Trash2, 
  WifiOff, 
  Car,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  BellRing
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FARMS, Farm } from '../types';
import { getChecklistEffectiveStatus } from '../utils/complianceHelper';

export const Navbar: React.FC = () => {
  const { 
    selectedFarmFilter, 
    setSelectedFarmFilter, 
    lockedFarm,
    isFarmLocked,
    activeTab, 
    setActiveTab, 
    checklists, 
    workOrders, 
    fleetMonthlyUpdates,
    serviceRequests,
    hasServiceRequestAccess,
    hasModuleAccess,
    serviceRequestFarmScope,
    setShowMobileAccessModal, 
    setShowDataManagementModal,
    setShowSyncModal,
    setShowVehicleModal,
    userRole, 
    isSyncing,
    lastSyncTime,
    syncNow,
    isOnline,
    pendingOfflineCount,
    flushOfflineQueue
  } = useApp();

  const canChecklist = hasModuleAccess('checklist');
  const canWorkOrder = hasModuleAccess('work_order');
  const canFleet = hasModuleAccess('fleet_update');
  const canServiceRequest = hasModuleAccess('service_request');
  const canCreateAny = canChecklist || canWorkOrder || canFleet || userRole === 'ADMIN';

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [desktopCreateDropdownOpen, setDesktopCreateDropdownOpen] = useState(false);

  // Memoized counts based on active filter to keep mobile rendering fast
  const openWorkOrdersCount = useMemo(() => {
    const list = selectedFarmFilter === 'TODAS'
      ? workOrders
      : workOrders.filter(wo => wo.farm === selectedFarmFilter);
    return list.filter(wo => wo.status === 'ABERTA' || wo.status === 'EM_ANDAMENTO').length;
  }, [workOrders, selectedFarmFilter]);

  const pendingChecklistsCount = useMemo(() => {
    const list = selectedFarmFilter === 'TODAS'
      ? checklists
      : checklists.filter(c => c.farm === selectedFarmFilter);
    return list.filter(c => !getChecklistEffectiveStatus(c, workOrders).isFullyConforming).length;
  }, [checklists, workOrders, selectedFarmFilter]);

  const pendingSinistrosCount = useMemo(() => {
    const list = selectedFarmFilter === 'TODAS'
      ? (fleetMonthlyUpdates || [])
      : (fleetMonthlyUpdates || []).filter(u => u.farm === selectedFarmFilter);
    return list.filter(u => u.hasIncidentLast30Days && !u.adminAcknowledged).length;
  }, [fleetMonthlyUpdates, selectedFarmFilter]);

  const pendingServiceRequestsCount = useMemo(() => {
    if (!hasServiceRequestAccess) return 0;
    const list = serviceRequestFarmScope === 'TODAS'
      ? (serviceRequests || [])
      : (serviceRequests || []).filter(sr => sr.farm === serviceRequestFarmScope);
    return list.filter(sr => sr.status === 'PENDENTE' || sr.status === 'EM_ATENDIMENTO').length;
  }, [hasServiceRequestAccess, serviceRequests, serviceRequestFarmScope]);

  const handleTabClick = (tab: any) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    setQuickCreateOpen(false);
  };

  const handleSelectFarm = (farm: Farm | 'TODAS') => {
    if (isFarmLocked) return;
    setSelectedFarmFilter(farm);
  };

  return (
    <>
      <header className="relative md:sticky md:top-0 z-40 w-full max-w-full bg-white/95 backdrop-blur-md border-b border-emerald-900/10 shadow-xs no-print">
        {/* Top Banner / Farm Quick Selector Bar - Wraps cleanly without horizontal scroll */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-emerald-50 px-2.5 sm:px-6 py-1.5 text-xs w-full max-w-full">
          <div className="max-w-7xl w-full min-w-0 mx-auto flex flex-wrap items-center justify-between gap-x-2.5 gap-y-1.5">
            <div className="flex items-center space-x-2 shrink-0">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-fuchsia-900/60 text-fuchsia-100 border border-fuchsia-400/30">
                🍇 el Ciruelo
              </span>
            </div>

            {/* Farm Switcher Pills or Locked Badge - All farms visible via flex-wrap */}
            {isFarmLocked ? (
              <div className="flex items-center space-x-2 min-w-0">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-extrabold bg-amber-400 text-stone-950 shadow-xs truncate max-w-full">
                  🔒 Operador Restrito: {lockedFarm}
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-1 py-0.5 min-w-0 max-w-full">
                <span className="text-emerald-300 mr-0.5 flex items-center text-[11px] sm:text-xs font-medium shrink-0">
                  <MapPin className="w-3.5 h-3.5 mr-0.5 inline text-emerald-400 shrink-0" />
                  Fazenda:
                </span>
                <button
                  onClick={() => handleSelectFarm('TODAS')}
                  className={`px-2 py-0.5 rounded-md text-[11px] sm:text-xs font-medium transition-all cursor-pointer ${
                    selectedFarmFilter === 'TODAS'
                      ? 'bg-white text-emerald-950 font-bold shadow-xs'
                      : 'bg-emerald-800/80 text-emerald-200 hover:bg-emerald-700 hover:text-white'
                  }`}
                >
                  Todas
                </button>
                {FARMS.map(farm => (
                  <button
                    key={farm}
                    onClick={() => handleSelectFarm(farm)}
                    className={`px-2 py-0.5 rounded-md text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                      selectedFarmFilter === farm
                        ? 'bg-amber-400 text-stone-950 font-bold shadow-xs ring-1 ring-amber-300'
                        : 'bg-emerald-800/80 text-emerald-200 hover:bg-emerald-700 hover:text-white'
                    }`}
                  >
                    {farm}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Navigation Bar - 2 clean wrapping rows so nothing ever overflows on PC or Mobile */}
        <div className="max-w-7xl w-full min-w-0 mx-auto px-2.5 sm:px-6 lg:px-8 py-2 space-y-2">
          {/* Row 1: Brand + All Action & Utility Commands */}
          <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
            {/* 1. Left: Brand Mark - el Ciruelo */}
            <div 
              className="flex items-center space-x-2 cursor-pointer shrink-0 py-0.5" 
              onClick={() => handleTabClick('dashboard')}
            >
              <img 
                src="/assets/aistudio/image_adab39d7.png" 
                alt="el Ciruelo" 
                className="h-[34px] w-auto object-contain shrink-0" 
              />
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-sm bg-fuchsia-100 text-fuchsia-950 uppercase tracking-wider hidden sm:inline shrink-0">
                Checklist & OS
              </span>
            </div>

            {/* 2. Right: Creation Group & Utilities (Wraps cleanly so all buttons stay visible) */}
            <div className="flex flex-wrap items-center justify-start sm:justify-end gap-1 sm:gap-1.5 min-w-0 max-w-full">
              {/* + Criar Dropdown Menu */}
              {canCreateAny && (
                <div className="relative">
                  <button
                    onClick={() => setDesktopCreateDropdownOpen(prev => !prev)}
                    className="flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs cursor-pointer transition-all"
                    title="Criar novo registro"
                  >
                    <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="whitespace-nowrap">+ Criar</span>
                    <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${desktopCreateDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {desktopCreateDropdownOpen && (
                    <>
                      {/* Backdrop for closing dropdown on outside click */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setDesktopCreateDropdownOpen(false)} 
                      />
                      <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                          Ações Rápidas de Emissão
                        </div>
                        
                        {canChecklist && (
                          <button
                            onClick={() => { handleTabClick('new-checklist'); setDesktopCreateDropdownOpen(false); }}
                            className="w-full flex items-center space-x-2.5 px-3 py-2 text-left hover:bg-emerald-50 text-slate-800 transition-colors cursor-pointer group"
                          >
                            <span className="p-1.5 rounded-md bg-emerald-100 text-emerald-800 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                              <ClipboardCheck className="w-4 h-4" />
                            </span>
                            <div>
                              <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-900">Novo Checklist</div>
                              <div className="text-[10px] text-slate-500">Operacional de tratores e máquinas</div>
                            </div>
                          </button>
                        )}

                        {canWorkOrder && (
                          <button
                            onClick={() => { handleTabClick('new-work-order'); setDesktopCreateDropdownOpen(false); }}
                            className="w-full flex items-center space-x-2.5 px-3 py-2 text-left hover:bg-amber-50 text-slate-800 transition-colors cursor-pointer group"
                          >
                            <span className="p-1.5 rounded-md bg-amber-100 text-amber-800 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                              <Wrench className="w-4 h-4" />
                            </span>
                            <div>
                              <div className="text-xs font-bold text-slate-900 group-hover:text-amber-900">Nova Ordem de Serviço (OS)</div>
                              <div className="text-[10px] text-slate-500">Manutenção preventiva e corretiva</div>
                            </div>
                          </button>
                        )}

                        {canFleet && (
                          <button
                            onClick={() => { handleTabClick('new-fleet-update'); setDesktopCreateDropdownOpen(false); }}
                            className="w-full flex items-center space-x-2.5 px-3 py-2 text-left hover:bg-cyan-50 text-slate-800 transition-colors cursor-pointer group"
                          >
                            <span className="p-1.5 rounded-md bg-cyan-100 text-cyan-800 group-hover:bg-cyan-700 group-hover:text-white transition-colors">
                              <Car className="w-4 h-4" />
                            </span>
                            <div>
                              <div className="text-xs font-bold text-slate-900 group-hover:text-cyan-950">Frota</div>
                              <div className="text-[10px] text-slate-500">Atualização mensal ou checklist de veículo</div>
                            </div>
                          </button>
                        )}

                        {userRole === 'ADMIN' && (
                          <button
                            onClick={() => { handleTabClick('nr13-calibrations'); setDesktopCreateDropdownOpen(false); }}
                            className="w-full flex items-center space-x-2.5 px-3 py-2 text-left hover:bg-fuchsia-50 text-slate-800 transition-colors cursor-pointer group border-t border-slate-100"
                          >
                            <span className="p-1.5 rounded-md bg-fuchsia-100 text-fuchsia-900 group-hover:bg-fuchsia-900 group-hover:text-white transition-colors">
                              <ShieldCheck className="w-4 h-4" />
                            </span>
                            <div>
                              <div className="text-xs font-bold text-slate-900 group-hover:text-fuchsia-950">Laudo NR-13 / Calibração</div>
                              <div className="text-[10px] text-slate-500">Vasos de pressão, válvulas PSV e aferição</div>
                            </div>
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Compact Sync Pill */}
              {!isOnline ? (
                <button
                  onClick={flushOfflineQueue}
                  className="flex items-center space-x-1 px-2 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-stone-950 hover:bg-amber-400 transition-all cursor-pointer shadow-xs animate-pulse"
                  title="Modo Offline ativo: dados salvos localmente. Clique para reconectar."
                >
                  <WifiOff className="w-3.5 h-3.5" />
                  <span className="text-[11px] whitespace-nowrap">
                    Offline{pendingOfflineCount > 0 ? ` (${pendingOfflineCount})` : ''}
                  </span>
                </button>
              ) : isSyncing ? (
                <div 
                  className="flex items-center space-x-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-2xs"
                  title="Sincronizando com a base central..."
                >
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                  <span className="text-[11px] whitespace-nowrap">Sincronizando</span>
                </div>
              ) : (
                <button
                  onClick={() => syncNow()}
                  className="flex items-center space-x-1 px-2 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 border border-emerald-300 text-emerald-900 hover:bg-emerald-100 transition-all cursor-pointer shadow-2xs"
                  title={`Sincronização em tempo real ativa. Última atualização: ${lastSyncTime || 'recente'}.`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] whitespace-nowrap">Sync</span>
                  <RefreshCw className="w-3 h-3 text-emerald-600 opacity-70 hover:opacity-100" />
                </button>
              )}

              {/* Mobile QR & Link Generator (Admin only) */}
              {userRole === 'ADMIN' && (
                <button
                  onClick={() => setShowMobileAccessModal(true)}
                  className="flex items-center space-x-1 px-2 sm:px-2.5 py-1 sm:py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] sm:text-xs font-bold transition-all shadow-xs cursor-pointer"
                  title="Gerar QR Code e Link para Android e iOS"
                >
                  <QrCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="whitespace-nowrap">Celular</span>
                </button>
              )}

              {/* Fleet Vehicles Manager (Admin only) */}
              {userRole === 'ADMIN' && (
                <button
                  onClick={() => setShowVehicleModal(true)}
                  className="flex items-center space-x-1 px-2 sm:px-2.5 py-1 sm:py-1.5 text-cyan-800 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors border border-cyan-200 cursor-pointer shadow-2xs text-[11px] sm:text-xs font-bold"
                  title="Gerenciar Frota e Cadastrar Novas Placas"
                >
                  <Car className="w-3.5 h-3.5 text-cyan-700 shrink-0" />
                  <span className="whitespace-nowrap">Placas</span>
                </button>
              )}

              {/* Trash & Test Cleanup (Admin only) */}
              {userRole === 'ADMIN' && (
                <button
                  onClick={() => setShowDataManagementModal(true)}
                  className="flex items-center space-x-1 px-2 py-1 sm:py-1.5 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200 cursor-pointer shadow-2xs text-[11px] sm:text-xs font-bold"
                  title="Lixeira: excluir testes e restaurar dados de exemplo"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">Lixeira</span>
                </button>
              )}

              {/* User Profile Badge */}
              {userRole === 'OPERADOR' ? (
                <div
                  className="flex items-center px-2 py-1 rounded-lg text-[11px] sm:text-xs font-bold bg-cyan-950 text-cyan-200 border border-cyan-700 shadow-2xs select-none whitespace-nowrap"
                  title="Acesso de Operador de Campo. Alterações de perfil restritas ao Administrador no computador."
                >
                  <span>👷 Operador</span>
                </div>
              ) : (
                <div
                  className="flex items-center px-2 py-1 rounded-lg text-[11px] sm:text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300 shadow-xs select-none whitespace-nowrap"
                  title="Perfil: Administrador no PC (Acesso Total Gerente Manutenção)"
                >
                  <span>👑 Admin</span>
                </div>
              )}

              {/* Mobile Extra Options Drawer Button */}
              <div className="md:hidden">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="relative p-1.5 rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                  aria-label="Mais opções"
                  title="Sincronização e ferramentas"
                >
                  {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: All Navigation Commands - Wraps cleanly on BOTH Mobile and PC with zero side-scrolling */}
          <nav className="w-full min-w-0 flex flex-wrap items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => handleTabClick('dashboard')}
              className={`flex items-center space-x-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-emerald-600" />
              <span>Painel</span>
            </button>

            {canChecklist && (
              <button
                onClick={() => handleTabClick('checklists')}
                className={`flex items-center space-x-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all relative cursor-pointer ${
                  activeTab === 'checklists'
                    ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <ClipboardCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-emerald-700" />
                <span>Checklists</span>
                {pendingChecklistsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 tabular-nums">
                    {pendingChecklistsCount}
                  </span>
                )}
              </button>
            )}

            {canWorkOrder && (
              <button
                onClick={() => handleTabClick('work-orders')}
                className={`flex items-center space-x-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all relative cursor-pointer ${
                  activeTab === 'work-orders'
                    ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Wrench className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-amber-600" />
                <span>Ordens de Serviço</span>
                {openWorkOrdersCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700 animate-pulse border border-red-300 tabular-nums">
                    {openWorkOrdersCount}
                  </span>
                )}
              </button>
            )}

            {canFleet && (
              <button
                onClick={() => handleTabClick('fleet-updates')}
                className={`flex items-center space-x-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all relative cursor-pointer ${
                  activeTab === 'fleet-updates' || activeTab === 'new-fleet-update'
                    ? 'bg-white text-cyan-900 shadow-xs ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Car className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-cyan-700" />
                <span>Frota</span>
                {pendingSinistrosCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 animate-pulse border border-amber-300 tabular-nums" title="Sinistros pendentes de reconhecimento">
                    {pendingSinistrosCount}
                  </span>
                )}
              </button>
            )}

            {(hasServiceRequestAccess || canServiceRequest) && (
              <button
                onClick={() => handleTabClick('service-requests')}
                className={`flex items-center space-x-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all relative cursor-pointer ${
                  activeTab === 'service-requests'
                    ? 'bg-white text-violet-950 shadow-xs ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
                title={hasServiceRequestAccess ? 'Solicitações de Serviço — Acesso Exclusivo Autorizado' : 'Abrir Solicitação de Serviço'}
              >
                <BellRing className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${hasServiceRequestAccess && pendingServiceRequestsCount > 0 ? 'text-violet-700 animate-pulse' : 'text-violet-700'}`} />
                <span>{hasServiceRequestAccess ? 'Solicitações' : 'Solicitar Serviço'}</span>
                {hasServiceRequestAccess && pendingServiceRequestsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-violet-600 text-white animate-pulse tabular-nums">
                    {pendingServiceRequestsCount}
                  </span>
                )}
              </button>
            )}

            {userRole === 'ADMIN' && (
              <button
                onClick={() => handleTabClick('nr13-calibrations')}
                className={`flex items-center space-x-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all relative cursor-pointer ${
                  activeTab === 'nr13-calibrations'
                    ? 'bg-white text-fuchsia-950 shadow-xs ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
                title="Laudos NR-13 e Calibrações (Válvulas PSV e Ultrassom) - Restrito a Administradores"
              >
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-fuchsia-900" />
                <span>Laudos & Calibrações</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-fuchsia-100 text-fuchsia-950 border border-fuchsia-200">
                  NR-13
                </span>
              </button>
            )}
          </nav>
        </div>

        {/* Mobile Drawer (Secondary tools & Farm selector) */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-5 space-y-3 shadow-xl">
            {/* Online/Offline Status Banner */}
            <div className={`p-2.5 rounded-lg flex items-center justify-between text-xs font-bold ${
              isOnline 
                ? 'bg-emerald-50 border border-emerald-300 text-emerald-900' 
                : 'bg-amber-50 border border-amber-300 text-amber-900'
            }`}>
              <div className="flex items-center space-x-2">
                {isOnline ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>🟢 Online & Sincronizado</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-amber-600" />
                    <span>Modo Offline ({pendingOfflineCount} pendentes)</span>
                  </>
                )}
              </div>
              <button
                onClick={() => {
                  if (isOnline) syncNow();
                  else flushOfflineQueue();
                }}
                className="px-2 py-1 bg-white rounded shadow-xs text-[11px] font-bold text-slate-800"
              >
                {isOnline ? 'Atualizar' : 'Reconectar'}
              </button>
            </div>

            {/* Farm Switcher for Mobile */}
            <div className="py-1 border-b border-slate-100">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Fazenda Ativa:
              </p>
              {isFarmLocked ? (
                <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900">
                    🔒 Fazenda: {lockedFarm} (Restrita ao Operador)
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded">
                    Modo Campo
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => handleSelectFarm('TODAS')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left ${
                      selectedFarmFilter === 'TODAS'
                        ? 'bg-emerald-700 text-white font-bold'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Todas as Fazendas
                  </button>
                  {FARMS.map(farm => (
                    <button
                      key={farm}
                      onClick={() => handleSelectFarm(farm)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left truncate ${
                        selectedFarmFilter === farm
                          ? 'bg-amber-400 text-stone-950 font-bold'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {farm}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sync & Tools */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <button
                onClick={() => {
                  setShowSyncModal(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 hover:bg-slate-200"
              >
                <div className="flex items-center space-x-2">
                  <Smartphone className="w-4 h-4 text-emerald-700" />
                  <span>Opções de Sincronização (QR / WhatsApp / P2P)</span>
                </div>
              </button>

              {(hasServiceRequestAccess || canServiceRequest) && (
                <button
                  onClick={() => {
                    handleTabClick('service-requests');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold bg-violet-50 text-violet-950 border border-violet-200 cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <BellRing className={`w-4 h-4 text-violet-700 ${hasServiceRequestAccess && pendingServiceRequestsCount > 0 ? 'animate-pulse' : ''}`} />
                    <span>{hasServiceRequestAccess ? 'Solicitações de Serviço' : 'Abrir Solicitação de Serviço'}</span>
                  </div>
                  {hasServiceRequestAccess && (
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                      pendingServiceRequestsCount > 0
                        ? 'bg-violet-600 text-white animate-pulse'
                        : 'bg-violet-200 text-violet-950'
                    }`}>
                      {pendingServiceRequestsCount > 0 ? `${pendingServiceRequestsCount} pendente(s)` : 'Exclusivo'}
                    </span>
                  )}
                </button>
              )}

              {userRole === 'ADMIN' && (
                <button
                  onClick={() => {
                    handleTabClick('nr13-calibrations');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold bg-fuchsia-50 text-fuchsia-950 border border-fuchsia-200 cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-fuchsia-900" />
                    <span>Laudos e Calibrações (NR-13)</span>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 bg-fuchsia-200 text-fuchsia-950 rounded">
                    Admin
                  </span>
                </button>
              )}

              {userRole === 'ADMIN' && (
                <button
                  onClick={() => {
                    setShowVehicleModal(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold bg-cyan-50 text-cyan-900 border border-cyan-200 cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <Car className="w-4 h-4 text-cyan-700" />
                    <span>Gerenciar Placas de Veículos</span>
                  </div>
                </button>
              )}

              {userRole === 'ADMIN' && (
                <button
                  onClick={() => {
                    setShowMobileAccessModal(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold bg-slate-900 text-white cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span>Acesso Celular (QR Code & Link Operador)</span>
                  </div>
                </button>
              )}

              {userRole === 'ADMIN' && (
                <button
                  onClick={() => {
                    setShowDataManagementModal(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-200 cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <Trash2 className="w-4 h-4 text-red-600" />
                    <span>Lixeira & Gerenciador de Testes</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* PERSISTENT MOBILE BOTTOM NAVIGATION BAR (Screens < md)                    */}
      {/* Safe-area aware, locked strictly to 100vw with compact non-clipping items */}
      {/* ========================================================================= */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 w-full max-w-full overflow-x-clip bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg no-print pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between min-h-[58px] px-1 py-1 gap-0.5 w-full max-w-full">
          {/* 1. Painel */}
          <button
            onClick={() => handleTabClick('dashboard')}
            className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 cursor-pointer transition-colors ${
              activeTab === 'dashboard'
                ? 'text-emerald-800 font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeTab === 'dashboard' ? 'bg-emerald-100 text-emerald-800' : ''}`}>
              <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[10px] leading-tight mt-0.5 truncate max-w-full block">Painel</span>
          </button>

          {/* 2. Checklists */}
          {canChecklist && (
            <button
              onClick={() => handleTabClick('checklists')}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 relative cursor-pointer transition-colors ${
                activeTab === 'checklists'
                  ? 'text-emerald-800 font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className={`p-1 rounded-lg relative ${activeTab === 'checklists' ? 'bg-emerald-100 text-emerald-800' : ''}`}>
                <ClipboardCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                {pendingChecklistsCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-amber-500 text-stone-950 font-black text-[9px] flex items-center justify-center">
                    {pendingChecklistsCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] leading-tight mt-0.5 truncate max-w-full block">Checklists</span>
            </button>
          )}

          {/* 3. Center Action: + Novo (kept strictly inside bar height so labels never clip) */}
          {canCreateAny && (
            <button
              onClick={() => setQuickCreateOpen(!quickCreateOpen)}
              className="flex-1 min-w-0 flex flex-col items-center justify-center py-0.5 px-0.5 cursor-pointer transition-colors"
              title="Criar novo registro"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-700 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-700/30 active:scale-95 transition-all">
                <Plus className={`w-5 h-5 transition-transform duration-200 ${quickCreateOpen ? 'rotate-45' : ''}`} />
              </div>
              <span className="text-[10px] leading-tight font-bold text-emerald-900 mt-0.5 truncate max-w-full block">Novo</span>
            </button>
          )}

          {/* 4. Ordens de Serviço */}
          {canWorkOrder && (
            <button
              onClick={() => handleTabClick('work-orders')}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 relative cursor-pointer transition-colors ${
                activeTab === 'work-orders'
                  ? 'text-amber-800 font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className={`p-1 rounded-lg relative ${activeTab === 'work-orders' ? 'bg-amber-100 text-amber-800' : ''}`}>
                <Wrench className="w-4 h-4 sm:w-5 sm:h-5" />
                {openWorkOrdersCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-red-600 text-white font-black text-[9px] flex items-center justify-center animate-pulse">
                    {openWorkOrdersCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] leading-tight mt-0.5 truncate max-w-full block">OS</span>
            </button>
          )}

          {/* 5. Frota */}
          {canFleet && (
            <button
              onClick={() => handleTabClick('fleet-updates')}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 relative cursor-pointer transition-colors ${
                activeTab === 'fleet-updates' || activeTab === 'new-fleet-update'
                  ? 'text-cyan-800 font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className={`p-1 rounded-lg relative ${activeTab === 'fleet-updates' || activeTab === 'new-fleet-update' ? 'bg-cyan-100 text-cyan-800' : ''}`}>
                <Car className="w-4 h-4 sm:w-5 sm:h-5" />
                {pendingSinistrosCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-amber-500 text-stone-950 font-black text-[9px] flex items-center justify-center animate-pulse">
                    {pendingSinistrosCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] leading-tight mt-0.5 truncate max-w-full block">Frota</span>
            </button>
          )}

          {/* 6. Solicitações (sempre visível para quem tem acesso) */}
          {(hasServiceRequestAccess || canServiceRequest) && (
            <button
              onClick={() => handleTabClick('service-requests')}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 relative cursor-pointer transition-colors ${
                activeTab === 'service-requests'
                  ? 'text-violet-900 font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className={`p-1 rounded-lg relative ${activeTab === 'service-requests' ? 'bg-violet-100 text-violet-900' : ''}`}>
                <BellRing className="w-4 h-4 sm:w-5 sm:h-5" />
                {hasServiceRequestAccess && pendingServiceRequestsCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-violet-600 text-white font-black text-[9px] flex items-center justify-center animate-pulse">
                    {pendingServiceRequestsCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] leading-tight mt-0.5 truncate max-w-full block">Solic.</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Action Bottom Sheet on Mobile when "+ Novo" is pressed */}
      {quickCreateOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 shadow-2xl space-y-4 max-w-sm mx-auto w-full max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                  ✨
                </div>
                <h3 className="text-base font-extrabold text-slate-900">Novo Registro Operacional</h3>
              </div>
              <button
                onClick={() => setQuickCreateOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {canChecklist && (
                <button
                  onClick={() => handleTabClick('new-checklist')}
                  className="w-full flex items-center space-x-3.5 p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-left transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <ClipboardCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-emerald-950">Novo Checklist</div>
                    <div className="text-xs text-emerald-800">Inspeção de máquinas, tratores, pivôs ou drones</div>
                  </div>
                </button>
              )}

              {canWorkOrder && (
                <button
                  onClick={() => handleTabClick('new-work-order')}
                  className="w-full flex items-center space-x-3.5 p-3 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-left transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 shadow-sm">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-amber-950">Nova Ordem de Serviço (OS)</div>
                    <div className="text-xs text-amber-900">Abertura de manutenção preventiva ou corretiva</div>
                  </div>
                </button>
              )}

              {canFleet && (
                <button
                  onClick={() => handleTabClick('new-fleet-update')}
                  className="w-full flex items-center space-x-3.5 p-3 rounded-2xl bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-left transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-cyan-700 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-cyan-950">Frota</div>
                    <div className="text-xs text-cyan-800">Atualização mensal ou checklist de veículo</div>
                  </div>
                </button>
              )}

              {(hasServiceRequestAccess || canServiceRequest) && (
                <button
                  onClick={() => handleTabClick('service-requests')}
                  className="w-full flex items-center space-x-3.5 p-3 rounded-2xl bg-violet-50 hover:bg-violet-100 border border-violet-200 text-left transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-violet-700 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <BellRing className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-violet-950">
                      {hasServiceRequestAccess ? 'Solicitações de Serviço' : 'Abrir Solicitação de Serviço'}
                    </div>
                    <div className="text-xs text-violet-800">Chamados de manutenção das unidades</div>
                  </div>
                </button>
              )}

              {userRole === 'ADMIN' && (
                <button
                  onClick={() => handleTabClick('nr13-calibrations')}
                  className="w-full flex items-center space-x-3.5 p-3 rounded-2xl bg-fuchsia-50 hover:bg-fuchsia-100 border border-fuchsia-200 text-left transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-fuchsia-900 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-fuchsia-950">Laudo NR-13 / Calibração</div>
                    <div className="text-xs text-fuchsia-900">Vasos de pressão, válvulas PSV e aferição</div>
                  </div>
                </button>
              )}
            </div>

            <button
              onClick={() => setQuickCreateOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
};
