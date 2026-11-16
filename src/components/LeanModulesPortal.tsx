import React, { useState, useMemo } from 'react';
import {
  Car,
  Send,
  Lock,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  PlusCircle,
  FileText,
  ShieldAlert,
  Eye,
  ClipboardCheck,
  Plane
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ServiceRequestPortal } from './ServiceRequestPortal';
import { FleetMonthlyUpdateForm } from './FleetMonthlyUpdateForm';
import { getChecklistEffectiveStatus } from '../utils/complianceHelper';

export const LeanModulesPortal: React.FC = () => {
  const {
    hasModuleAccess,
    lockedFarm,
    isFarmLocked,
    selectedFarmFilter,
    fleetMonthlyUpdates,
    checklists,
    workOrders,
    isOnline,
    isSyncing,
    syncNow,
    setViewFleetUpdateDetail,
    setViewChecklistDetail
  } = useApp();

  const hasSS = hasModuleAccess('service_request');
  const hasFleet = hasModuleAccess('fleet_update');

  const [activeModule, setActiveModule] = useState<'SS' | 'FLEET'>(hasSS ? 'SS' : 'FLEET');
  const [fleetSubTab, setFleetSubTab] = useState<'FORM' | 'SENT'>('FORM');
  const [fleetSubmittedType, setFleetSubmittedType] = useState<'UPDATE' | 'CHECKLIST' | 'DRONE' | null>(null);
  const [sentFilterTab, setSentFilterTab] = useState<'UPDATES' | 'CHECKLISTS' | 'DRONES'>('UPDATES');

  const activeFarmScope = lockedFarm || (selectedFarmFilter !== 'TODAS' ? selectedFarmFilter : null);

  const farmUpdates = useMemo(() => {
    const list = fleetMonthlyUpdates || [];
    if (!activeFarmScope) return list;
    return list.filter(u => u.farm === activeFarmScope);
  }, [fleetMonthlyUpdates, activeFarmScope]);

  const farmVehicleChecklists = useMemo(() => {
    const list = (checklists || []).filter(c => c && c.type === 'VEICULO');
    if (!activeFarmScope) return list;
    return list.filter(c => c.farm === activeFarmScope);
  }, [checklists, activeFarmScope]);

  const farmDroneChecklists = useMemo(() => {
    const list = (checklists || []).filter(c => c && c.type === 'DRONE');
    if (!activeFarmScope) return list;
    return list.filter(c => c.farm === activeFarmScope);
  }, [checklists, activeFarmScope]);

  const totalSentCount = farmUpdates.length + farmVehicleChecklists.length + farmDroneChecklists.length;

  // If ONLY Solicitação de Serviço is enabled, render its dedicated ultra-lean standalone portal
  if (hasSS && !hasFleet) {
    return <ServiceRequestPortal />;
  }

  return (
    <div className="min-h-screen w-full max-w-full bg-slate-100 flex flex-col font-sans overflow-x-clip">
      {/* Ultra-Lean Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <img
              src="/assets/aistudio/image_adab39d7.png"
              alt="el Ciruelo"
              className="h-8 sm:h-9 w-auto object-contain shrink-0"
            />
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                {hasSS && hasFleet ? 'Portal de Campo' : 'Frota'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isFarmLocked && lockedFarm && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-200 whitespace-nowrap">
                <Lock className="w-3 h-3 mr-1 text-emerald-700" />
                {lockedFarm}
              </span>
            )}
            <button
              type="button"
              onClick={() => syncNow(true)}
              disabled={isSyncing}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer disabled:opacity-60"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
          </div>
        </div>
      </header>

      {!isOnline && (
        <div className="bg-amber-500 text-stone-950 px-4 py-2 text-xs font-bold">
          <div className="max-w-3xl mx-auto flex items-center space-x-2">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>
              Sem sinal no momento. Os registros ficam salvos neste aparelho e serão enviados assim que conectar.
            </span>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-4 space-y-4">
        {/* Top module switcher only when BOTH SS and Frota are enabled */}
        {hasSS && hasFleet && (
          <div className="grid grid-cols-2 gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveModule('SS')}
              className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                activeModule === 'SS'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Send className="w-4 h-4 shrink-0" />
              <span className="truncate">Solicitação de Serviço</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModule('FLEET')}
              className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                activeModule === 'FLEET'
                  ? 'bg-cyan-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Car className="w-4 h-4 shrink-0" />
              <span className="truncate">Frota</span>
            </button>
          </div>
        )}

        {activeModule === 'SS' && hasSS ? (
          <ServiceRequestPortal embedded />
        ) : (
          <div className="space-y-4">
            {/* Sub-tabs inside Frota: Novo Registro | Enviadas */}
            <div className="grid grid-cols-2 gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setFleetSubTab('FORM');
                  setFleetSubmittedType(null);
                }}
                className={`flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  fleetSubTab === 'FORM'
                    ? 'bg-cyan-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span>Preencher Frota</span>
              </button>

              <button
                type="button"
                onClick={() => setFleetSubTab('SENT')}
                className={`flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  fleetSubTab === 'SENT'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span className="tabular-nums">Enviadas ({totalSentCount})</span>
              </button>
            </div>

            {fleetSubTab === 'FORM' ? (
              fleetSubmittedType ? (
                <div className="bg-white rounded-2xl border border-cyan-200 p-6 sm:p-8 text-center space-y-5 shadow-2xs">
                  <div className="w-14 h-14 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-xl font-extrabold text-slate-900">
                      {fleetSubmittedType === 'CHECKLIST'
                        ? 'Checklist de Veículo Registrado!'
                        : fleetSubmittedType === 'DRONE'
                        ? 'Checklist de Drone Registrado!'
                        : 'Atualização Mensal Registrada!'}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                      {fleetSubmittedType === 'CHECKLIST'
                        ? 'O checklist completo, as fotos e a assinatura digital foram salvos e sincronizados com a base.'
                        : fleetSubmittedType === 'DRONE'
                        ? 'A inspeção do Drone Agrícola e as fotos dos 12 itens foram salvas e sincronizadas com a base.'
                        : 'Os dados de quilometragem, condutor e fotos dos 4 ângulos foram salvos e sincronizados.'}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setFleetSubmittedType(null)}
                      className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl text-xs sm:text-sm font-bold cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Enviar Outro Registro</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSentFilterTab(
                          fleetSubmittedType === 'CHECKLIST'
                            ? 'CHECKLISTS'
                            : fleetSubmittedType === 'DRONE'
                            ? 'DRONES'
                            : 'UPDATES'
                        );
                        setFleetSubTab('SENT');
                      }}
                      className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs sm:text-sm font-bold cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Ver Enviadas</span>
                    </button>
                  </div>
                </div>
              ) : (
                <FleetMonthlyUpdateForm
                  leanMode
                  onSuccess={() => setFleetSubmittedType('UPDATE')}
                  onChecklistSuccess={(created) =>
                    setFleetSubmittedType(created.type === 'DRONE' ? 'DRONE' : 'CHECKLIST')
                  }
                />
              )
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                    Histórico de Frota{activeFarmScope ? ` — ${activeFarmScope}` : ''}
                  </h2>
                  <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setSentFilterTab('UPDATES')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        sentFilterTab === 'UPDATES'
                          ? 'bg-cyan-700 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Atualizações ({farmUpdates.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSentFilterTab('CHECKLISTS')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        sentFilterTab === 'CHECKLISTS'
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Veículos ({farmVehicleChecklists.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSentFilterTab('DRONES')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        sentFilterTab === 'DRONES'
                          ? 'bg-indigo-700 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Drones ({farmDroneChecklists.length})
                    </button>
                  </div>
                </div>

                {sentFilterTab === 'DRONES' ? (
                  farmDroneChecklists.length === 0 ? (
                    <div className="py-10 text-center space-y-2.5">
                      <Plane className="w-10 h-10 text-indigo-300 mx-auto" />
                      <p className="text-sm font-bold text-slate-700">
                        Nenhum checklist de drone registrado ainda
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setFleetSubmittedType(null);
                          setFleetSubTab('FORM');
                        }}
                        className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Preencher Checklist de Drone</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {farmDroneChecklists.map(chk => {
                        const eff = getChecklistEffectiveStatus(chk, workOrders || []);
                        return (
                          <div
                            key={chk.id}
                            onClick={() => setViewChecklistDetail(chk)}
                            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:border-indigo-400 cursor-pointer transition-colors flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-mono text-[11px] font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-800">
                                  {chk.code}
                                </span>
                                <span className="text-sm font-black text-indigo-950">
                                  {chk.droneModel || 'Drone Agrícola'}
                                </span>
                                {eff.activeNCCount > 0 ? (
                                  <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                    {eff.activeNCCount} N/C
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200">
                                    Conforme
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-0.5 tabular-nums">
                                <span>Operador: <strong>{chk.inspector}</strong></span>
                                <span>{chk.date} · {chk.time}</span>
                              </div>
                            </div>
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-indigo-800 text-xs font-bold shrink-0">
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Ver</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : sentFilterTab === 'CHECKLISTS' ? (
                  farmVehicleChecklists.length === 0 ? (
                    <div className="py-10 text-center space-y-2.5">
                      <ClipboardCheck className="w-10 h-10 text-slate-300 mx-auto" />
                      <p className="text-sm font-bold text-slate-700">
                        Nenhum checklist de veículo registrado ainda
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setFleetSubmittedType(null);
                          setFleetSubTab('FORM');
                        }}
                        className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Preencher Checklist de Veículo</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {farmVehicleChecklists.map(chk => {
                        const eff = getChecklistEffectiveStatus(chk, workOrders || []);
                        return (
                          <div
                            key={chk.id}
                            onClick={() => setViewChecklistDetail(chk)}
                            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:border-cyan-400 cursor-pointer transition-colors flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-mono text-[11px] font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-800">
                                  {chk.code}
                                </span>
                                <span className="text-sm font-black text-slate-900">
                                  {chk.vehiclePlate || chk.location}
                                </span>
                                <span className="text-xs font-bold text-slate-600">
                                  • {chk.vehicleModel || 'Frota'}
                                </span>
                                {eff.activeNCCount > 0 ? (
                                  <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                    {eff.activeNCCount} N/C
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200">
                                    Conforme
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-0.5 tabular-nums">
                                <span>Inspetor: <strong>{chk.inspector}</strong></span>
                                {chk.initialKm && <span>KM: {chk.initialKm}</span>}
                                <span>{chk.date} · {chk.time}</span>
                              </div>
                            </div>
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-cyan-800 text-xs font-bold shrink-0">
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Ver</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : farmUpdates.length === 0 ? (
                  <div className="py-10 text-center space-y-2.5">
                    <Car className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-sm font-bold text-slate-700">
                      Nenhuma atualização registrada ainda
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setFleetSubmittedType(null);
                        setFleetSubTab('FORM');
                      }}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Preencher Primeira Atualização</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {farmUpdates.map(u => (
                      <div
                        key={u.id}
                        onClick={() => setViewFleetUpdateDetail(u)}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:border-cyan-400 cursor-pointer transition-colors flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-800">
                              {u.code}
                            </span>
                            <span className="text-sm font-black text-slate-900">
                              {u.plate}
                            </span>
                            <span className="text-xs font-bold text-slate-600">
                              • {u.vehicleModel}
                            </span>
                            {u.hasIncidentLast30Days && (
                              <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                <ShieldAlert className="w-3 h-3 mr-1" />
                                Sinistro
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-0.5 tabular-nums">
                            <span>Condutor: <strong>{u.driver}</strong></span>
                            <span>{Number(u.mileage).toLocaleString('pt-BR')} KM</span>
                            <span>{u.date} · {u.time}</span>
                          </div>
                        </div>
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-cyan-800 text-xs font-bold shrink-0">
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Ver</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
