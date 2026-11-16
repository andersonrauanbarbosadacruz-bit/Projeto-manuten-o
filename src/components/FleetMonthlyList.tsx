import React, { useState, useMemo } from 'react';
import { 
  Car, 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  Gauge, 
  Wrench, 
  ShieldAlert, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Camera, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Trash2, 
  Download, 
  X, 
  SlidersHorizontal,
  ChevronDown,
  ClipboardCheck,
  Plane,
  Fuel
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FARMS, Farm, VehicleMonthlyUpdate, Vehicle, ChecklistRecord } from '../types';
import { getChecklistEffectiveStatus } from '../utils/complianceHelper';
import { exportChecklistToPdf } from '../utils/pdfGenerator';
import { downloadChecklistDocument } from '../utils/documentDownloader';
import { FuelingSection } from './FuelingSection';

export const FleetMonthlyList: React.FC = () => {
  const { 
    fleetMonthlyUpdates, 
    checklists,
    workOrders,
    setViewFleetUpdateDetail, 
    setViewChecklistDetail,
    setShowFleetUpdateFormModal,
    selectedFarmFilter,
    setSelectedFarmFilter,
    setActiveTab,
    startNewFleetAction,
    vehicles,
    fuelLogs,
    fleetListTab: listTab,
    setFleetListTab: setListTab,
    userRole,
    requestDelete,
    setShowVehicleModal
  } = useApp() as any;

  // Search & Basic Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [farmFilter, setFarmFilter] = useState<Farm | 'TODAS'>('TODAS');
  const [filterIncident, setFilterIncident] = useState<'TODOS' | 'COM_SINISTRO_PENDENTE' | 'COM_SINISTRO_RECONHECIDO' | 'COM_SINISTRO' | 'SEM_SINISTRO'>('TODOS');
  
  // Specific User Request Filters: Placa (lista suspensa cadastrada) e Período (Data Inicial / Final)
  const [plateFilter, setPlateFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'TODOS' | '30_DIAS' | 'MES_ATUAL' | 'ESTE_ANO' | 'CUSTOM'>('TODOS');

  // Available Plates: Registered vehicles + any legacy update plate
  const availablePlates = useMemo(() => {
    const list: { plate: string; model: string; farm?: string }[] = [];
    const seen = new Set<string>();

    if (Array.isArray(vehicles)) {
      vehicles.forEach((v: Vehicle) => {
        const p = v.plate?.trim().toUpperCase();
        if (p && !seen.has(p)) {
          seen.add(p);
          list.push({ plate: p, model: v.model, farm: v.farm });
        }
      });
    }

    if (Array.isArray(fleetMonthlyUpdates)) {
      fleetMonthlyUpdates.forEach((u: VehicleMonthlyUpdate) => {
        const p = u.plate?.trim().toUpperCase();
        if (p && !seen.has(p)) {
          seen.add(p);
          list.push({ plate: p, model: u.vehicleModel || 'Veículo', farm: u.farm });
        }
      });
    }

    return list.sort((a, b) => a.plate.localeCompare(b.plate));
  }, [vehicles, fleetMonthlyUpdates]);

  // Handle Date Presets
  const applyDatePreset = (preset: 'TODOS' | '30_DIAS' | 'MES_ATUAL' | 'ESTE_ANO') => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === 'TODOS') {
      setStartDate('');
      setEndDate('');
      return;
    }

    if (preset === '30_DIAS') {
      const start = new Date();
      start.setDate(now.getDate() - 30);
      setStartDate(start.toISOString().substring(0, 10));
      setEndDate(now.toISOString().substring(0, 10));
      return;
    }

    if (preset === 'MES_ATUAL') {
      const year = now.getFullYear();
      const month = now.getMonth();
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      setStartDate(start.toISOString().substring(0, 10));
      setEndDate(end.toISOString().substring(0, 10));
      return;
    }

    if (preset === 'ESTE_ANO') {
      const year = now.getFullYear();
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31);
      setStartDate(start.toISOString().substring(0, 10));
      setEndDate(end.toISOString().substring(0, 10));
      return;
    }
  };

  const handleCustomDateChange = (startVal?: string, endVal?: string) => {
    setDatePreset('CUSTOM');
    if (startVal !== undefined) setStartDate(startVal);
    if (endVal !== undefined) setEndDate(endVal);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setFarmFilter('TODAS');
    setFilterIncident('TODOS');
    setPlateFilter('');
    setStartDate('');
    setEndDate('');
    setDatePreset('TODOS');
  };

  const hasActiveFilters = Boolean(
    searchTerm.trim() || 
    farmFilter !== 'TODAS' || 
    filterIncident !== 'TODOS' || 
    plateFilter || 
    startDate || 
    endDate
  );

  // Filter updates
  const filtered = useMemo(() => {
    return fleetMonthlyUpdates.filter((u: VehicleMonthlyUpdate) => {
      // 1. Farm filter
      const activeFarm = selectedFarmFilter !== 'TODAS' ? selectedFarmFilter : farmFilter;
      if (activeFarm !== 'TODAS' && u.farm !== activeFarm) {
        return false;
      }

      // 2. Incident filter
      if (filterIncident === 'COM_SINISTRO' && !u.hasIncidentLast30Days) return false;
      if (filterIncident === 'COM_SINISTRO_PENDENTE' && (!u.hasIncidentLast30Days || u.adminAcknowledged)) return false;
      if (filterIncident === 'COM_SINISTRO_RECONHECIDO' && (!u.hasIncidentLast30Days || !u.adminAcknowledged)) return false;
      if (filterIncident === 'SEM_SINISTRO' && u.hasIncidentLast30Days) return false;

      // 3. Plate filter (lista suspensa de placas cadastradas)
      if (plateFilter && u.plate?.trim().toUpperCase() !== plateFilter.trim().toUpperCase()) {
        return false;
      }

      // 4. Period Filter (Data Inicial e Data Final)
      if (startDate && u.date < startDate) {
        return false;
      }
      if (endDate && u.date > endDate) {
        return false;
      }

      // 5. Text search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchPlate = u.plate?.toLowerCase().includes(q);
        const matchModel = (u.vehicleModel || '').toLowerCase().includes(q);
        const matchDriver = u.driver?.toLowerCase().includes(q);
        const matchCode = u.code?.toLowerCase().includes(q);
        const matchFarm = u.farm?.toLowerCase().includes(q);
        const matchNotes = (u.notes || '').toLowerCase().includes(q);
        if (!matchPlate && !matchModel && !matchDriver && !matchCode && !matchFarm && !matchNotes) {
          return false;
        }
      }

      return true;
    });
  }, [fleetMonthlyUpdates, selectedFarmFilter, farmFilter, filterIncident, plateFilter, startDate, endDate, searchTerm]);

  const totalWithPreventive = useMemo(() => filtered.filter((u: VehicleMonthlyUpdate) => u.preventiveMaintenanceLast30Days).length, [filtered]);
  const totalWithIncident = useMemo(() => filtered.filter((u: VehicleMonthlyUpdate) => u.hasIncidentLast30Days).length, [filtered]);

  // Vehicle checklists (migrated from Checklists module into Frota)
  const allVehicleChecklists = useMemo(() => {
    return (Array.isArray(checklists) ? checklists : []).filter((c: ChecklistRecord) => c && c.type === 'VEICULO');
  }, [checklists]);

  const filteredVehicleChecklists = useMemo(() => {
    return allVehicleChecklists.filter((c: ChecklistRecord) => {
      const activeFarm = selectedFarmFilter !== 'TODAS' ? selectedFarmFilter : farmFilter;
      if (activeFarm !== 'TODAS' && c.farm !== activeFarm) return false;

      if (plateFilter && (c.vehiclePlate || '').trim().toUpperCase() !== plateFilter.trim().toUpperCase()) {
        return false;
      }

      if (startDate && c.date < startDate) return false;
      if (endDate && c.date > endDate) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchCode = (c.code || '').toLowerCase().includes(q);
        const matchPlate = (c.vehiclePlate || '').toLowerCase().includes(q);
        const matchModel = (c.vehicleModel || '').toLowerCase().includes(q);
        const matchInspector = (c.inspector || '').toLowerCase().includes(q);
        const matchFarm = (c.farm || '').toLowerCase().includes(q);
        const matchLoc = (c.location || '').toLowerCase().includes(q);
        if (!matchCode && !matchPlate && !matchModel && !matchInspector && !matchFarm && !matchLoc) {
          return false;
        }
      }

      return true;
    });
  }, [allVehicleChecklists, selectedFarmFilter, farmFilter, plateFilter, startDate, endDate, searchTerm]);

  // Drone checklists (migrated from Checklists module into Frota)
  const allDroneChecklists = useMemo(() => {
    return (Array.isArray(checklists) ? checklists : []).filter((c: ChecklistRecord) => c && c.type === 'DRONE');
  }, [checklists]);

  const filteredDroneChecklists = useMemo(() => {
    return allDroneChecklists.filter((c: ChecklistRecord) => {
      const activeFarm = selectedFarmFilter !== 'TODAS' ? selectedFarmFilter : farmFilter;
      if (activeFarm !== 'TODAS' && c.farm !== activeFarm) return false;

      if (startDate && c.date < startDate) return false;
      if (endDate && c.date > endDate) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchCode = (c.code || '').toLowerCase().includes(q);
        const matchDrone = (c.droneModel || '').toLowerCase().includes(q);
        const matchInspector = (c.inspector || '').toLowerCase().includes(q);
        const matchFarm = (c.farm || '').toLowerCase().includes(q);
        const matchLoc = (c.location || '').toLowerCase().includes(q);
        if (!matchCode && !matchDrone && !matchInspector && !matchFarm && !matchLoc) {
          return false;
        }
      }

      return true;
    });
  }, [allDroneChecklists, selectedFarmFilter, farmFilter, startDate, endDate, searchTerm]);

  // Export filtered items to CSV
  const exportToCsv = () => {
    if (filtered.length === 0) return;
    const headers = [
      'Código',
      'Data',
      'Hora',
      'Fazenda',
      'Placa',
      'Modelo',
      'Quilometragem (KM)',
      'Condutor',
      'Preventiva Últimos 30 Dias',
      'Detalhes Preventiva',
      'Sinistro Últimos 30 Dias',
      'Detalhes Sinistro',
      'Fotos 4 Ângulos',
      'Observações'
    ];

    const rows = filtered.map((u: VehicleMonthlyUpdate) => {
      const photoCount = [u.visualInspection?.front, u.visualInspection?.rear, u.visualInspection?.leftSide, u.visualInspection?.rightSide].filter(Boolean).length;
      return [
        `"${u.code || ''}"`,
        `"${u.date || ''}"`,
        `"${u.time || ''}"`,
        `"${u.farm || ''}"`,
        `"${u.plate || ''}"`,
        `"${u.vehicleModel || ''}"`,
        `"${u.mileage || 0}"`,
        `"${(u.driver || '').replace(/"/g, '""')}"`,
        `"${u.preventiveMaintenanceLast30Days ? 'SIM' : 'NÃO'}"`,
        `"${(u.preventiveMaintenanceNotes || '').replace(/"/g, '""')}"`,
        `"${u.hasIncidentLast30Days ? 'SIM' : 'NÃO'}"`,
        `"${(u.incidentNotes || '').replace(/"/g, '""')}"`,
        `"${photoCount}/4 fotos"`,
        `"${(u.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r: string[]) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-atualizacoes-frota-${new Date().toISOString().substring(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-100 text-cyan-900 border border-cyan-300">
              <Car className="w-3.5 h-3.5 mr-1 text-cyan-700" />
              Frota de Veículos
            </span>
            {userRole === 'ADMIN' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                🛡️ Acesso Gerente Manutenção
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Frota: Atualizações Mensais, Veículos e Drone Agrícola
          </h1>
          <p className="text-sm text-slate-500">
            Realize atualizações mensais (KM e 4 fotos), checklists de veículos ou inspeções de drone agrícola, filtrando por período ou fazenda.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {userRole === 'ADMIN' && (
            <button
              onClick={() => setShowVehicleModal(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer border border-slate-300"
              title="Cadastrar ou gerenciar placas de veículos"
            >
              <Car className="w-3.5 h-3.5 text-slate-600" />
              <span>Gerenciar Placas</span>
            </button>
          )}

          <button
            onClick={exportToCsv}
            disabled={filtered.length === 0}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer border border-slate-300"
            title="Exportar registros filtrados para Excel / CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => startNewFleetAction('FUEL')}
            className="inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Fuel className="w-4 h-4 text-emerald-200" />
            <span>+ Abastecimento</span>
          </button>

          <button
            onClick={() => startNewFleetAction('DRONE')}
            className="inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Plane className="w-4 h-4 text-indigo-200" />
            <span>+ Drone Agrícola</span>
          </button>

          <button
            onClick={() => startNewFleetAction('CHECKLIST')}
            className="inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <ClipboardCheck className="w-4 h-4 text-cyan-300" />
            <span>+ Checklist de Veículo</span>
          </button>

          <button
            onClick={() => startNewFleetAction('UPDATE')}
            className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-cyan-700/20 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Atualização Mensal</span>
          </button>
        </div>
      </div>

      {/* Frota Sub-View Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setListTab('UPDATES')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
            listTab === 'UPDATES'
              ? 'bg-cyan-700 text-white shadow-md ring-2 ring-cyan-500/30'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-cyan-50 hover:text-cyan-900'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>Atualizações Mensais da Frota</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
            listTab === 'UPDATES' ? 'bg-cyan-900 text-cyan-100' : 'bg-slate-100 text-slate-600'
          }`}>
            {filtered.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setListTab('FUEL')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
            listTab === 'FUEL'
              ? 'bg-emerald-700 text-white shadow-md ring-2 ring-emerald-500/30'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-900'
          }`}
        >
          <Fuel className={`w-4 h-4 ${listTab === 'FUEL' ? 'text-emerald-200' : 'text-emerald-700'}`} />
          <span>Abastecimentos</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
            listTab === 'FUEL' ? 'bg-emerald-900 text-emerald-100' : 'bg-slate-100 text-slate-600'
          }`}>
            {(fuelLogs || []).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setListTab('CHECKLISTS')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
            listTab === 'CHECKLISTS'
              ? 'bg-slate-900 text-white shadow-md ring-2 ring-slate-700/30'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 text-slate-800'
          }`}
        >
          <ClipboardCheck className="w-4 h-4 text-cyan-400" />
          <span>Checklists de Veículos</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
            listTab === 'CHECKLISTS' ? 'bg-slate-700 text-cyan-200' : 'bg-slate-100 text-slate-600'
          }`}>
            {filteredVehicleChecklists.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setListTab('DRONES')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
            listTab === 'DRONES'
              ? 'bg-indigo-700 text-white shadow-md ring-2 ring-indigo-500/30'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-900'
          }`}
        >
          <Plane className="w-4 h-4 text-indigo-300" />
          <span>Drone Agrícola</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
            listTab === 'DRONES' ? 'bg-indigo-900 text-indigo-100' : 'bg-slate-100 text-slate-600'
          }`}>
            {filteredDroneChecklists.length}
          </span>
        </button>
      </div>

      {listTab === 'FUEL' ? (
        <FuelingSection />
      ) : (
        <>
      {/* KPI Mini-bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Registros no Filtro
            </span>
            <span className="text-2xl font-black text-slate-900">{filtered.length}</span>
            <span className="text-[10px] text-slate-400">de {fleetMonthlyUpdates.length} no total</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
            <Car className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Com Manutenção Preventiva
            </span>
            <span className="text-2xl font-black text-emerald-700">{totalWithPreventive}</span>
            <span className="text-[10px] text-slate-400">últimos 30 dias</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Wrench className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Com Sinistro / Avaria
            </span>
            <span className={`text-2xl font-black ${totalWithIncident > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
              {totalWithIncident}
            </span>
            <span className="text-[10px] text-slate-400">requerem vistoria</span>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            totalWithIncident > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'
          }`}>
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Primary Filter and Search Box */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-4">
        {/* Row 1: Search, Placa (Dropdown de veículos cadastrados), Fazenda e Sinistros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Term */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar condutor, modelo, código..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-cyan-500 font-medium"
            />
          </div>

          {/* Placa Filter (Lista Suspensa de Placas Cadastradas) */}
          <div>
            <select
              value={plateFilter}
              onChange={e => setPlateFilter(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                plateFilter 
                  ? 'bg-cyan-50 border-cyan-500 text-cyan-900 ring-2 ring-cyan-500/20' 
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:ring-2 focus:ring-cyan-500'
              }`}
            >
              <option value="">🚗 Todas as Placas ({availablePlates.length} veículos)</option>
              {availablePlates.map(v => (
                <option key={v.plate} value={v.plate}>
                  {v.plate} — {v.model} {v.farm ? `(${v.farm})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Farm Filter */}
          <div>
            <select
              value={selectedFarmFilter !== 'TODAS' ? selectedFarmFilter : farmFilter}
              disabled={selectedFarmFilter !== 'TODAS'}
              onChange={e => setFarmFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-cyan-500 font-bold"
            >
              <option value="TODAS">🌾 Todas as Fazendas</option>
              {FARMS.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Sinistro Filter */}
          <div>
            <select
              value={filterIncident}
              onChange={e => setFilterIncident(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-cyan-500 font-medium"
            >
              <option value="TODOS">⚠️ Todos os Registros</option>
              <option value="COM_SINISTRO_PENDENTE">🚨 Sinistro Pendente de Aceite</option>
              <option value="COM_SINISTRO_RECONHECIDO">✓ Sinistro Reconhecido (Admin)</option>
              <option value="COM_SINISTRO">Todos com Sinistro / Avaria</option>
              <option value="SEM_SINISTRO">Sem Sinistros</option>
            </select>
          </div>
        </div>

        {/* Row 2: Filtragem por Período (Data Inicial, Data Final e Presets Rápidos) */}
        <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center mr-1">
              <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
              Período:
            </span>
            <button
              type="button"
              onClick={() => applyDatePreset('TODOS')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                datePreset === 'TODOS' && !startDate && !endDate
                  ? 'bg-cyan-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset('30_DIAS')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                datePreset === '30_DIAS'
                  ? 'bg-cyan-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Últimos 30 Dias
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset('MES_ATUAL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                datePreset === 'MES_ATUAL'
                  ? 'bg-cyan-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Mês Atual
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset('ESTE_ANO')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                datePreset === 'ESTE_ANO'
                  ? 'bg-cyan-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Este Ano
            </button>
          </div>

          {/* Date Range Inputs */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5">
              <label className="text-[11px] font-bold text-slate-500">De:</label>
              <input
                type="date"
                value={startDate}
                onChange={e => handleCustomDateChange(e.target.value, undefined)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:bg-white focus:ring-1 focus:ring-cyan-500 max-w-full"
              />
            </div>
            <div className="flex items-center space-x-1.5">
              <label className="text-[11px] font-bold text-slate-500">Até:</label>
              <input
                type="date"
                value={endDate}
                onChange={e => handleCustomDateChange(undefined, e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:bg-white focus:ring-1 focus:ring-cyan-500 max-w-full"
              />
            </div>

            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => applyDatePreset('TODOS')}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Limpar período"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Tags Bar */}
        {hasActiveFilters && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Filtros ativos:
              </span>

              {plateFilter && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-100 text-cyan-900 border border-cyan-300">
                  Placa: {plateFilter}
                  <button onClick={() => setPlateFilter('')} className="ml-1 text-cyan-700 hover:text-cyan-950">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {(startDate || endDate) && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-100 text-cyan-900 border border-cyan-300">
                  Período: {startDate || 'Início'} até {endDate || 'Hoje'}
                  <button onClick={() => applyDatePreset('TODOS')} className="ml-1 text-cyan-700 hover:text-cyan-950">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {farmFilter !== 'TODAS' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                  Fazenda: {farmFilter}
                  <button onClick={() => setFarmFilter('TODAS')} className="ml-1 text-slate-500 hover:text-slate-800">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filterIncident !== 'TODOS' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  {filterIncident === 'COM_SINISTRO' ? 'Com Sinistro' : 'Sem Sinistro'}
                  <button onClick={() => setFilterIncident('TODOS')} className="ml-1 text-amber-700 hover:text-amber-950">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {searchTerm.trim() && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                  Texto: "{searchTerm}"
                  <button onClick={() => setSearchTerm('')} className="ml-1 text-slate-500 hover:text-slate-800">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs font-bold text-red-600 hover:text-red-800 hover:underline cursor-pointer"
            >
              Limpar todos os filtros
            </button>
          </div>
        )}
      </div>

      {/* List Grid */}
      {listTab === 'DRONES' ? (
        filteredDroneChecklists.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto">
              <Plane className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Nenhum checklist de Drone Agrícola encontrado para os filtros selecionados
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {hasActiveFilters
                ? 'Tente ajustar ou limpar os filtros de busca e período para visualizar outros registros.'
                : 'Utilize o botão abaixo para preencher o checklist de 12 itens do Drone Agrícola com fotos obrigatórias.'}
            </p>
            <div className="flex items-center justify-center space-x-2 pt-2">
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Limpar Filtros</span>
                </button>
              )}
              <button
                onClick={() => startNewFleetAction('DRONE')}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold transition-all cursor-pointer"
              >
                <Plane className="w-3.5 h-3.5 text-indigo-200" />
                <span>Preencher Checklist de Drone</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDroneChecklists.map((item: ChecklistRecord) => {
              const effectiveStatus = getChecklistEffectiveStatus(item, workOrders || []);
              const itemsList = Array.isArray(item.items) ? item.items : [];
              const conformingItems = itemsList.filter(i => i && i.status === 'C').length;
              const effectiveConformingTotal = conformingItems + effectiveStatus.resolvedNCCount;

              let badgeLabel = 'Conforme';
              let badgeBg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
              if (effectiveStatus.effectiveSummary === 'REGULARIZADO') {
                badgeLabel = 'Regularizado (OS)';
                badgeBg = 'bg-emerald-100 text-emerald-800 border-emerald-300';
              } else if (effectiveStatus.effectiveSummary === 'CRITICO') {
                badgeLabel = `${effectiveStatus.activeNCCount} Crítico(s) (N/C)`;
                badgeBg = 'bg-red-50 text-red-800 border-red-200';
              } else if (effectiveStatus.activeNCCount > 0) {
                badgeLabel = `${effectiveStatus.activeNCCount} N/C`;
                badgeBg = 'bg-amber-50 text-amber-800 border-amber-200';
              }

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all flex flex-col overflow-hidden"
                >
                  <div className="p-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/60">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {item.code}
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900">
                          {item.farm}
                        </span>
                      </div>
                      <h3 className="text-base font-black text-indigo-950 mt-2 flex items-center space-x-1.5">
                        <Plane className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>{item.droneModel || 'Drone Agrícola'}</span>
                      </h3>
                    </div>

                    <span className={`inline-flex items-center text-[11px] font-bold px-2 py-1 rounded-full border shrink-0 ${badgeBg}`}>
                      {badgeLabel}
                    </span>
                  </div>

                  <div className="p-4 flex-1 space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <div className="flex items-center space-x-1 truncate">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{item.inspector}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{item.date} • {item.time}</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs flex items-center justify-between text-slate-600">
                      <span>
                        <strong className="text-slate-900">{effectiveConformingTotal}</strong> de {itemsList.length} conformes
                      </span>
                      {effectiveStatus.activeNCCount > 0 ? (
                        <span className="text-red-700 font-bold">
                          ⚠️ {effectiveStatus.activeNCCount} N/C Pendente(s)
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold">100% OK</span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setViewChecklistDetail(item)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Ficha</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => exportChecklistToPdf(item, workOrders || [])}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold cursor-pointer"
                        title="Baixar PDF"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-700" />
                        <span>PDF</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadChecklistDocument(item, workOrders || [])}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold cursor-pointer"
                        title="Baixar DOC"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-600" />
                        <span>DOC</span>
                      </button>
                    </div>

                    {userRole === 'ADMIN' && (
                      <button
                        type="button"
                        onClick={() =>
                          requestDelete({
                            type: 'checklist',
                            id: item.id,
                            code: item.code,
                            description: `${item.droneModel || 'Drone Agrícola'} (${item.inspector})`
                          })
                        }
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                        title="Excluir Checklist (Acesso Admin)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : listTab === 'CHECKLISTS' ? (
        filteredVehicleChecklists.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <ClipboardCheck className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Nenhum checklist de veículo encontrado para os filtros selecionados
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {hasActiveFilters
                ? 'Tente ajustar ou limpar o filtro por período e placa para visualizar outros checklists.'
                : 'Utilize o botão abaixo para preencher o checklist completo de veículo com inspeção de 6 itens, 4 ângulos e assinatura digital.'}
            </p>
            <div className="flex items-center justify-center space-x-2 pt-2">
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Limpar Filtros</span>
                </button>
              )}
              <button
                onClick={() => startNewFleetAction('CHECKLIST')}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
              >
                <ClipboardCheck className="w-3.5 h-3.5 text-cyan-300" />
                <span>Preencher Checklist de Veículo</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVehicleChecklists.map((item: ChecklistRecord) => {
              const effectiveStatus = getChecklistEffectiveStatus(item, workOrders || []);
              const itemsList = Array.isArray(item.items) ? item.items : [];
              const conformingItems = itemsList.filter(i => i && i.status === 'C').length;
              const effectiveConformingTotal = conformingItems + effectiveStatus.resolvedNCCount;

              let badgeLabel = 'Conforme';
              let badgeBg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
              if (effectiveStatus.effectiveSummary === 'REGULARIZADO') {
                badgeLabel = 'Regularizado (OS)';
                badgeBg = 'bg-emerald-100 text-emerald-800 border-emerald-300';
              } else if (effectiveStatus.effectiveSummary === 'CRITICO') {
                badgeLabel = `${effectiveStatus.activeNCCount} Crítico(s) (N/C)`;
                badgeBg = 'bg-red-50 text-red-800 border-red-200';
              } else if (effectiveStatus.activeNCCount > 0) {
                badgeLabel = `${effectiveStatus.activeNCCount} N/C`;
                badgeBg = 'bg-amber-50 text-amber-800 border-amber-200';
              }

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-cyan-400 hover:shadow-md transition-all flex flex-col overflow-hidden"
                >
                  <div className="p-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/60">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {item.code}
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-900">
                          {item.farm}
                        </span>
                      </div>
                      <h3 className="text-base font-black text-slate-900 mt-2 flex items-center space-x-1.5">
                        <Car className="w-4 h-4 text-cyan-600 shrink-0" />
                        <span>{item.vehiclePlate || item.location} • {item.vehicleModel || 'Frota'}</span>
                      </h3>
                    </div>

                    <span className={`inline-flex items-center text-[11px] font-bold px-2 py-1 rounded-full border shrink-0 ${badgeBg}`}>
                      {badgeLabel}
                    </span>
                  </div>

                  <div className="p-4 flex-1 space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <div className="flex items-center space-x-1 truncate">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{item.inspector}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{item.date} • {item.time}</span>
                      </div>
                    </div>

                    {(item.initialKm || item.finalKm) && (
                      <div className="flex items-center space-x-2 text-xs font-bold text-cyan-950 bg-cyan-50 px-2.5 py-1.5 rounded-lg border border-cyan-200">
                        <Gauge className="w-3.5 h-3.5 text-cyan-700 shrink-0" />
                        <span>
                          KM Inicial: {item.initialKm || '-'}
                          {item.finalKm ? ` • KM Final: ${item.finalKm}` : ''}
                        </span>
                      </div>
                    )}

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs flex items-center justify-between text-slate-600">
                      <span>
                        <strong className="text-slate-900">{effectiveConformingTotal}</strong> de {itemsList.length} conformes
                      </span>
                      {effectiveStatus.activeNCCount > 0 ? (
                        <span className="text-red-700 font-bold">
                          ⚠️ {effectiveStatus.activeNCCount} N/C Pendente(s)
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold">100% OK</span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setViewChecklistDetail(item)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Ficha</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => exportChecklistToPdf(item, workOrders || [])}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold cursor-pointer"
                        title="Baixar PDF"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-700" />
                        <span>PDF</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadChecklistDocument(item, workOrders || [])}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold cursor-pointer"
                        title="Baixar DOC"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-600" />
                        <span>DOC</span>
                      </button>
                    </div>

                    {userRole === 'ADMIN' && (
                      <button
                        type="button"
                        onClick={() =>
                          requestDelete({
                            type: 'checklist',
                            id: item.id,
                            code: item.code,
                            description: `${item.vehiclePlate || item.location} (${item.inspector})`
                          })
                        }
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                        title="Excluir Checklist (Acesso Admin)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Car className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Nenhuma atualização mensal encontrada para os filtros selecionados
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {hasActiveFilters
              ? 'Tente ajustar ou limpar o filtro por período e placa para visualizar outros registros.'
              : 'Utilize o botão acima para registrar a primeira atualização mensal de um veículo da frota com fotos dos 4 ângulos.'}
          </p>
          <div className="flex items-center justify-center space-x-2 pt-2">
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpar Filtros</span>
              </button>
            )}
            <button
              onClick={() => startNewFleetAction('UPDATE')}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Preencher Atualização</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item: VehicleMonthlyUpdate) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-cyan-400 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
            >
              {/* Card Top */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {item.code}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-900">
                      {item.farm}
                    </span>
                  </div>
                  <h3 
                    onClick={() => setViewFleetUpdateDetail(item)}
                    className="text-base font-black text-slate-900 mt-2 flex items-center space-x-1.5 group-hover:text-cyan-700 transition-colors cursor-pointer"
                  >
                    <Car className="w-4 h-4 text-cyan-600 shrink-0" />
                    <span>{item.plate} • {item.vehicleModel || 'Frota'}</span>
                  </h3>
                </div>

                <div className="text-right flex flex-col items-end space-y-1">
                  <span className="text-xs font-extrabold text-cyan-950 bg-cyan-50 px-2.5 py-1 rounded-lg border border-cyan-200 block">
                    {Number(item.mileage).toLocaleString('pt-BR')} KM
                  </span>

                  {userRole === 'ADMIN' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        requestDelete({
                          type: 'fleet-update',
                          id: item.id,
                          code: item.code,
                          description: `${item.plate} - ${item.vehicleModel || 'Veículo'}`
                        });
                      }}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Excluir esta atualização (Acesso Admin)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div 
                onClick={() => setViewFleetUpdateDetail(item)}
                className="p-4 space-y-3 flex-1 cursor-pointer"
              >
                {/* Driver and Date */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="flex items-center space-x-1 truncate">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{item.driver}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{item.date}</span>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {item.preventiveMaintenanceLast30Days ? (
                    <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <Wrench className="w-3 h-3 mr-1 text-emerald-600" />
                      Preventiva Realizada
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      Sem preventiva no mês
                    </span>
                  )}

                  {item.hasIncidentLast30Days ? (
                    item.adminAcknowledged ? (
                      <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-700" />
                        Sinistro Reconhecido (Admin)
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                        <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                        Sinistro Pendente Aceite
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                      Sem avarias
                    </span>
                  )}

                  {item.incidentPhotos && item.incidentPhotos.length > 0 && (
                    <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                      <Camera className="w-3 h-3 mr-1 text-amber-700" />
                      {item.incidentPhotos.length} foto(s) do dano
                    </span>
                  )}
                </div>

                {/* 4 Photos Thumbnails Row */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold mb-1.5">
                    <span className="flex items-center space-x-1">
                      <Camera className="w-3 h-3 text-cyan-600" />
                      <span>Vistoria 4 Ângulos</span>
                    </span>
                    <span className="text-emerald-700">✓ 4 Fotos OK</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 h-12">
                    <div className="rounded overflow-hidden bg-slate-100 border border-slate-200">
                      {item.visualInspection?.front && (
                        <img src={item.visualInspection.front} alt="Frente" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="rounded overflow-hidden bg-slate-100 border border-slate-200">
                      {item.visualInspection?.rear && (
                        <img src={item.visualInspection.rear} alt="Traseira" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="rounded overflow-hidden bg-slate-100 border border-slate-200">
                      {item.visualInspection?.leftSide && (
                        <img src={item.visualInspection.leftSide} alt="Esq" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="rounded overflow-hidden bg-slate-100 border border-slate-200">
                      {item.visualInspection?.rightSide && (
                        <img src={item.visualInspection.rightSide} alt="Dir" className="w-full h-full object-cover" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div 
                onClick={() => setViewFleetUpdateDetail(item)}
                className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-cyan-700 group-hover:text-cyan-800 cursor-pointer"
              >
                <span>Visualizar Vistoria Completa</span>
                <Eye className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      )}
        </>
      )}
    </div>
  );
};
