import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, 
  ShieldCheck, 
  Activity,
  PlusCircle, 
  Download, 
  Eye, 
  Trash2, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Printer, 
  Layers, 
  Paperclip,
  Calendar,
  AlertCircle,
  FileCheck,
  Database
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  DocumentAttachment, 
  FARMS, 
  NR13InspectionReport, 
  NR13VesselMaster,
  UltrassomEquipmentRecord,
  ValveCalibrationRecord 
} from '../../types';
import { exportNR13ReportToPdf } from '../../utils/nr13PdfGenerator';
import { downloadAttachment } from '../../utils/fileAttachmentHelper';
import { NR13ReportDetailModal } from './NR13ReportDetailModal';
import { NR13ReportFormModal } from './NR13ReportFormModal';
import { NR13VesselMasterModal } from './NR13VesselMasterModal';
import { ValveCalibrationModal } from './ValveCalibrationModal';
import { UltrassomEquipmentModal } from './UltrassomEquipmentModal';
import { AttachmentViewerModal } from './AttachmentViewerModal';

export const NR13CalibrationsView: React.FC = () => {
  const { 
    userRole, 
    selectedFarmFilter, 
    setSelectedFarmFilter,
    nr13Reports,
    saveNR13Report,
    deleteNR13Report,
    nr13Vessels,
    saveNR13Vessel,
    deleteNR13Vessel,
    valveCalibrations,
    saveValveCalibration,
    deleteValveCalibration,
    ultrassomEquipments,
    saveUltrassomEquipment,
    deleteUltrassomEquipment,
    setActiveTab
  } = useApp();

  // Active sub-tab within this module
  const [activeSubTab, setActiveSubTab] = useState<'laudos' | 'vasos' | 'valvulas' | 'ultrassom'>('laudos');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');

  // Modals
  const [viewReportDetail, setViewReportDetail] = useState<NR13InspectionReport | null>(null);
  const [editingReport, setEditingReport] = useState<NR13InspectionReport | null>(null);
  const [preselectedVesselForReport, setPreselectedVesselForReport] = useState<NR13VesselMaster | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);

  const [editingVessel, setEditingVessel] = useState<NR13VesselMaster | null>(null);
  const [showVesselForm, setShowVesselForm] = useState(false);

  const [editingValve, setEditingValve] = useState<ValveCalibrationRecord | null>(null);
  const [showValveForm, setShowValveForm] = useState(false);

  const [editingUltrassom, setEditingUltrassom] = useState<UltrassomEquipmentRecord | null>(null);
  const [showUltrassomForm, setShowUltrassomForm] = useState(false);

  const [previewAttachment, setPreviewAttachment] = useState<DocumentAttachment | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    type: 'report' | 'vessel' | 'valve' | 'ultrassom';
    id: string;
    label: string;
  } | null>(null);

  // 1. Check Administrator Access Restriction
  if (userRole !== 'ADMIN') {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white rounded-2xl p-8 border border-red-200 shadow-xl text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mx-auto mb-4 border border-red-300">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2">
          Acesso Restrito ao Administrador
        </h2>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          O módulo de <strong>Laudos Técnicos e Calibrações Metrológicas (NR-13)</strong> contém documentos legais, ARTs e certificados de conformidade com acesso restrito a administradores e engenheiros habilitados no computador.
        </p>
        <button
          onClick={() => setActiveTab('dashboard')}
          className="px-6 py-2.5 rounded-xl text-xs font-extrabold bg-emerald-700 hover:bg-emerald-800 text-white transition-all shadow-md cursor-pointer"
        >
          Voltar ao Painel Geral
        </button>
      </div>
    );
  }

  // Filtered lists
  const filteredReports = useMemo(() => {
    return (nr13Reports || []).filter(rep => {
      const matchFarm = selectedFarmFilter === 'TODAS' || rep.farm === selectedFarmFilter;
      const matchSearch = !searchQuery || 
        rep.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rep.equipmentTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (rep.vesselNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        rep.sector.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'TODOS' || rep.technicalOpinion === statusFilter;
      return matchFarm && matchSearch && matchStatus;
    });
  }, [nr13Reports, selectedFarmFilter, searchQuery, statusFilter]);

  const filteredVessels = useMemo(() => {
    return (nr13Vessels || [])
      .filter(v => {
        const matchFarm = selectedFarmFilter === 'TODAS' || v.farm === selectedFarmFilter;
        const q = searchQuery.toLowerCase();
        const matchSearch = !q ||
          v.vesselNumber.toLowerCase().includes(q) ||
          v.equipmentTag.toLowerCase().includes(q) ||
          v.sector.toLowerCase().includes(q) ||
          (v.linkedValveTag || '').toLowerCase().includes(q) ||
          (v.linkedGaugeTag || '').toLowerCase().includes(q);
        return matchFarm && matchSearch;
      })
      .sort((a, b) => {
        const farmCmp = a.farm.localeCompare(b.farm, 'pt-BR');
        if (farmCmp !== 0) return farmCmp;
        return a.vesselNumber.localeCompare(b.vesselNumber, 'pt-BR', { numeric: true });
      });
  }, [nr13Vessels, selectedFarmFilter, searchQuery]);

  const filteredValves = useMemo(() => {
    return (valveCalibrations || []).filter(v => {
      const matchFarm = selectedFarmFilter === 'TODAS' || v.farm === selectedFarmFilter;
      const matchSearch = !searchQuery || 
        v.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.equipmentLinked.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'TODOS' || v.status === statusFilter;
      return matchFarm && matchSearch && matchStatus;
    });
  }, [valveCalibrations, selectedFarmFilter, searchQuery, statusFilter]);

  const filteredUltrassomEquipments = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return (ultrassomEquipments || []).filter(u => {
      const matchSearch = !q ||
        u.name.toLowerCase().includes(q) ||
        u.serialNumber.toLowerCase().includes(q) ||
        u.certificateNumber.toLowerCase().includes(q) ||
        (u.calibrationLab || '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'TODOS' || u.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [ultrassomEquipments, searchQuery, statusFilter]);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    if (pendingDelete.type === 'report') {
      await deleteNR13Report(pendingDelete.id);
    } else if (pendingDelete.type === 'vessel') {
      await deleteNR13Vessel(pendingDelete.id);
    } else if (pendingDelete.type === 'valve') {
      await deleteValveCalibration(pendingDelete.id);
    } else if (pendingDelete.type === 'ultrassom') {
      await deleteUltrassomEquipment(pendingDelete.id);
    }
    setPendingDelete(null);
  };

  useEffect(() => {
    if (showReportForm || viewReportDetail || showVesselForm || showValveForm || showUltrassomForm) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [showReportForm, viewReportDetail, showVesselForm, showValveForm, showUltrassomForm]);

  // Dedicated Screen 1: Create / Edit NR-13 Report
  if (showReportForm) {
    return (
      <NR13ReportFormModal
        isDedicatedScreen
        report={editingReport}
        preselectedVessel={preselectedVesselForReport}
        currentFarmFilter={selectedFarmFilter}
        onClose={() => {
          setShowReportForm(false);
          setEditingReport(null);
          setPreselectedVesselForReport(null);
        }}
        onSave={(rep) => {
          saveNR13Report(rep);
          setShowReportForm(false);
          setEditingReport(null);
          setPreselectedVesselForReport(null);
        }}
      />
    );
  }

  // Dedicated Screen 2: View / Print Official NR-13 Report
  if (viewReportDetail) {
    return (
      <NR13ReportDetailModal
        isDedicatedScreen
        report={viewReportDetail}
        onClose={() => setViewReportDetail(null)}
        onEdit={() => {
          const rep = viewReportDetail;
          setViewReportDetail(null);
          setEditingReport(rep);
          setPreselectedVesselForReport(null);
          setShowReportForm(true);
        }}
      />
    );
  }

  // Dedicated Screen 3: Create / Edit VP or CP Vessel Master
  if (showVesselForm) {
    return (
      <NR13VesselMasterModal
        isDedicatedScreen
        vessel={editingVessel}
        currentFarmFilter={selectedFarmFilter}
        onClose={() => {
          setShowVesselForm(false);
          setEditingVessel(null);
        }}
        onSave={async (vessel) => {
          await saveNR13Vessel(vessel);
          setShowVesselForm(false);
          setEditingVessel(null);
        }}
      />
    );
  }

  // Dedicated Screen 4: Create / Edit Safety Valve Calibration (PSV)
  if (showValveForm) {
    return (
      <ValveCalibrationModal
        isDedicatedScreen
        calibration={editingValve}
        currentFarmFilter={selectedFarmFilter}
        onClose={() => {
          setShowValveForm(false);
          setEditingValve(null);
        }}
        onSave={(valv) => {
          saveValveCalibration(valv);
          setShowValveForm(false);
          setEditingValve(null);
        }}
      />
    );
  }

  // Dedicated Screen 5: Create / Edit Ultrassom Measuring Equipment
  if (showUltrassomForm) {
    return (
      <UltrassomEquipmentModal
        isDedicatedScreen
        equipment={editingUltrassom}
        onClose={() => {
          setShowUltrassomForm(false);
          setEditingUltrassom(null);
        }}
        onSave={(equip) => {
          saveUltrassomEquipment(equip);
          setShowUltrassomForm(false);
          setEditingUltrassom(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Module Hero Header with el Ciruelo Branding */}
      <div className="bg-gradient-to-r from-fuchsia-950 via-slate-900 to-emerald-950 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-fuchsia-900/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="bg-white p-2 rounded-xl shrink-0 shadow-sm">
              <img 
                src="/assets/aistudio/image_adab39d7.png" 
                alt="el Ciruelo" 
                className="h-8 sm:h-9 w-auto object-contain" 
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-fuchsia-400 text-fuchsia-950 uppercase tracking-wider">
                  🔒 Acesso Administrador
                </span>
                <span className="text-xs text-emerald-300 font-semibold hidden sm:inline">
                  NR-13 & Metrologia Operacional
                </span>
              </div>
              <h1 className="text-lg sm:text-2xl font-black text-white mt-0.5">
                Laudos e Calibrações
              </h1>
              <p className="text-xs text-slate-300 max-w-xl">
                Controle de integridade estrutural de vasos de pressão (NR-13) com rastreabilidade de ART, laudos de válvulas e equipamentos de medição por ultrassom.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
            {activeSubTab === 'laudos' && (
              <button
                onClick={() => { setEditingReport(null); setPreselectedVesselForReport(null); setShowReportForm(true); }}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-fuchsia-800 hover:bg-fuchsia-700 text-white transition-all shadow-md cursor-pointer border border-fuchsia-400/30"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Novo Laudo NR-13</span>
              </button>
            )}

            {activeSubTab === 'vasos' && (
              <button
                onClick={() => { setEditingVessel(null); setShowVesselForm(true); }}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white transition-all shadow-md cursor-pointer border border-emerald-400/30"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Cadastrar VP / CP</span>
              </button>
            )}

            {activeSubTab === 'valvulas' && (
              <button
                onClick={() => { setEditingValve(null); setShowValveForm(true); }}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-fuchsia-800 hover:bg-fuchsia-700 text-white transition-all shadow-md cursor-pointer border border-fuchsia-400/30"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Calibrar Válvula PSV</span>
              </button>
            )}

            {activeSubTab === 'ultrassom' && (
              <button
                onClick={() => { setEditingUltrassom(null); setShowUltrassomForm(true); }}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-800 hover:bg-cyan-700 text-white transition-all shadow-md cursor-pointer border border-cyan-400/30"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Novo Equipamento de Aferição</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main 4 Segmented Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-1.5 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
          
          {/* Aba 1: Laudos NR-13 */}
          <button
            onClick={() => { setActiveSubTab('laudos'); setStatusFilter('TODOS'); }}
            className={`flex items-center justify-between p-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'laudos'
                ? 'bg-fuchsia-950 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <FileText className={`w-4 h-4 ${activeSubTab === 'laudos' ? 'text-fuchsia-300' : 'text-slate-500'}`} />
              <div className="text-left">
                <span className="block text-xs font-extrabold">Laudos NR-13</span>
                <span className={`text-[10px] ${activeSubTab === 'laudos' ? 'text-fuchsia-200' : 'text-slate-400'}`}>
                  Relatórios Oficiais e PDF
                </span>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
              activeSubTab === 'laudos' ? 'bg-fuchsia-800 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {(nr13Reports || []).length}
            </span>
          </button>

          {/* Aba 2: Cadastro Fixo de VPs e CPs */}
          <button
            onClick={() => { setActiveSubTab('vasos'); setStatusFilter('TODOS'); }}
            className={`flex items-center justify-between p-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'vasos'
                ? 'bg-emerald-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Database className={`w-4 h-4 ${activeSubTab === 'vasos' ? 'text-emerald-300' : 'text-slate-500'}`} />
              <div className="text-left">
                <span className="block text-xs font-extrabold">Base de VPs / CPs</span>
                <span className={`text-[10px] ${activeSubTab === 'vasos' ? 'text-emerald-200' : 'text-slate-400'}`}>
                  Vasos e Compressores Fixos
                </span>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
              activeSubTab === 'vasos' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {(nr13Vessels || []).length}
            </span>
          </button>

          {/* Aba 3: Calibração de Válvulas PSV */}
          <button
            onClick={() => { setActiveSubTab('valvulas'); setStatusFilter('TODOS'); }}
            className={`flex items-center justify-between p-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'valvulas'
                ? 'bg-fuchsia-950 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <ShieldCheck className={`w-4 h-4 ${activeSubTab === 'valvulas' ? 'text-emerald-300' : 'text-slate-500'}`} />
              <div className="text-left">
                <span className="block text-xs font-extrabold">Válvulas (PSV)</span>
                <span className={`text-[10px] ${activeSubTab === 'valvulas' ? 'text-fuchsia-200' : 'text-slate-400'}`}>
                  Laudos e Calibração
                </span>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
              activeSubTab === 'valvulas' ? 'bg-fuchsia-800 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {(valveCalibrations || []).length}
            </span>
          </button>

          {/* Aba 4: Medidores de Ultrassom / Equipamentos de Aferição */}
          <button
            onClick={() => { setActiveSubTab('ultrassom'); setStatusFilter('TODOS'); }}
            className={`flex items-center justify-between p-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'ultrassom'
                ? 'bg-cyan-950 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Activity className={`w-4 h-4 ${activeSubTab === 'ultrassom' ? 'text-cyan-300' : 'text-slate-500'}`} />
              <div className="text-left">
                <span className="block text-xs font-extrabold">Ultrassom / Aferição</span>
                <span className={`text-[10px] ${activeSubTab === 'ultrassom' ? 'text-cyan-200' : 'text-slate-400'}`}>
                  Medidores de Espessura
                </span>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
              activeSubTab === 'ultrassom' ? 'bg-cyan-800 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {(ultrassomEquipments || []).length}
            </span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por TAG, código, equipamento..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-fuchsia-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-500 font-semibold flex items-center">
            <Filter className="w-3.5 h-3.5 mr-1" />
            Fazenda:
          </span>
          <select
            value={selectedFarmFilter}
            onChange={e => setSelectedFarmFilter(e.target.value as any)}
            className="text-xs p-1.5 rounded-lg border border-slate-300 bg-white font-bold text-slate-800"
          >
            <option value="TODAS">Todas as Fazendas</option>
            {FARMS.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CONTEÚDO DA ABA 1: LAUDOS NR-13 */}
      {/* ========================================================================= */}
      {activeSubTab === 'laudos' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              <FileCheck className="w-4 h-4 text-fuchsia-900 shrink-0" />
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                Relatórios Técnicos de Inspeção de Vaso de Pressão (NR-13)
              </h3>
            </div>
            <span className="text-xs text-slate-500">
              {filteredReports.length} laudo(s) encontrado(s)
            </span>
          </div>

          {filteredReports.length === 0 ? (
            <div className="text-center py-12 px-4">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">Nenhum laudo técnico encontrado</p>
              <p className="text-xs text-slate-400 mt-1">Clique no botão "+ Novo Laudo NR-13" para cadastrar um vaso de pressão.</p>
            </div>
          ) : (
            <>
              {/* Mobile Vertical Cards (no horizontal scroll) */}
              <div className="md:hidden divide-y divide-slate-200">
                {filteredReports.map(rep => (
                  <div key={rep.id} className="p-4 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-xs font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {rep.code}
                          </span>
                          <span className="px-2 py-0.5 rounded font-extrabold text-[10px] bg-fuchsia-100 text-fuchsia-950">
                            Cat. {rep.nr13Categorization.category}
                          </span>
                        </div>
                        <strong className="text-sm text-slate-900 block mt-1">{rep.equipmentTag}</strong>
                        <span className="text-xs text-slate-500 block">
                          {rep.equipment.manufacturer} • {rep.equipment.serviceFluid}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        rep.technicalOpinion === 'FAVORAVEL'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rep.technicalOpinion === 'FAVORAVEL_COM_RESTRICOES'
                          ? 'bg-amber-100 text-amber-900'
                          : rep.technicalOpinion === 'INCONCLUSIVO'
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {rep.technicalOpinion === 'FAVORAVEL'
                          ? 'Conforme'
                          : rep.technicalOpinion === 'FAVORAVEL_COM_RESTRICOES'
                          ? 'Fav. c/ Restrição'
                          : rep.technicalOpinion === 'INCONCLUSIVO'
                          ? 'Em aberto'
                          : 'Não Conforme'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Fazenda / Setor</span>
                        <span className="font-bold text-emerald-900 block">{rep.farm}</span>
                        <span className="text-[11px] text-slate-500">{rep.sector}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Próx. Insp. Externa</span>
                        <span className="font-bold text-slate-800 block">
                          {rep.nextInspections.nextExternalInspectionDate ? new Date(rep.nextInspections.nextExternalInspectionDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => rep.artAttachment && setPreviewAttachment(rep.artAttachment)}
                        disabled={!rep.artAttachment}
                        className={`px-2 py-1 rounded text-[11px] font-extrabold ${
                          rep.artAttachment ? 'bg-blue-100 text-blue-900 cursor-pointer' : 'bg-slate-100 text-slate-400 opacity-50'
                        }`}
                      >
                        ART
                      </button>
                      <button
                        type="button"
                        onClick={() => rep.valveCalibrationAttachment && setPreviewAttachment(rep.valveCalibrationAttachment)}
                        disabled={!rep.valveCalibrationAttachment}
                        className={`px-2 py-1 rounded text-[11px] font-extrabold ${
                          rep.valveCalibrationAttachment ? 'bg-fuchsia-100 text-fuchsia-950 cursor-pointer' : 'bg-slate-100 text-slate-400 opacity-50'
                        }`}
                      >
                        PSV
                      </button>
                      <button
                        type="button"
                        onClick={() => rep.ultrassomAttachment && setPreviewAttachment(rep.ultrassomAttachment)}
                        disabled={!rep.ultrassomAttachment}
                        className={`px-2 py-1 rounded text-[11px] font-extrabold ${
                          rep.ultrassomAttachment ? 'bg-teal-100 text-teal-900 cursor-pointer' : 'bg-slate-100 text-slate-400 opacity-50'
                        }`}
                      >
                        US
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => setViewReportDetail(rep)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Visualizar</span>
                      </button>
                      <button
                        onClick={() => exportNR13ReportToPdf(rep)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-fuchsia-50 text-fuchsia-900 border border-fuchsia-200 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>
                      <button
                        onClick={() => { setEditingReport(rep); setPreselectedVesselForReport(null); setShowReportForm(true); }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setPendingDelete({ type: 'report', id: rep.id, label: `laudo ${rep.code}` })}
                        className="p-1.5 rounded-lg text-red-600 bg-red-50 border border-red-200 cursor-pointer ml-auto"
                        title="Excluir laudo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Código</th>
                    <th className="p-3">TAG / Vaso de Pressão</th>
                    <th className="p-3">Fazenda & Setor</th>
                    <th className="p-3">Categoria</th>
                    <th className="p-3">Parecer</th>
                    <th className="p-3 text-center">Anexos Rastreáveis</th>
                    <th className="p-3">Próx. Inspeção</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReports.map(rep => (
                    <tr key={rep.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-900">{rep.code}</td>
                      <td className="p-3">
                        <strong className="text-slate-900 block">{rep.equipmentTag}</strong>
                        <span className="text-[11px] text-slate-500">{rep.equipment.manufacturer} • {rep.equipment.serviceFluid}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-emerald-900 block">{rep.farm}</span>
                        <span className="text-[11px] text-slate-500">{rep.sector}</span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded font-extrabold text-[10px] bg-fuchsia-100 text-fuchsia-950">
                          Cat. {rep.nr13Categorization.category}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          rep.technicalOpinion === 'FAVORAVEL'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rep.technicalOpinion === 'FAVORAVEL_COM_RESTRICOES'
                            ? 'bg-amber-100 text-amber-900'
                            : rep.technicalOpinion === 'INCONCLUSIVO'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {rep.technicalOpinion === 'FAVORAVEL'
                            ? 'Conforme'
                            : rep.technicalOpinion === 'FAVORAVEL_COM_RESTRICOES'
                            ? 'Fav. c/ Restrição'
                            : rep.technicalOpinion === 'INCONCLUSIVO'
                            ? 'Em aberto'
                            : 'Não Conforme'}
                        </span>
                      </td>
                      
                      {/* OS 3 ANEXOS SEPARADOS */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {/* 1. ART */}
                          <button
                            type="button"
                            onClick={() => rep.artAttachment && setPreviewAttachment(rep.artAttachment)}
                            disabled={!rep.artAttachment}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold flex items-center space-x-0.5 ${
                              rep.artAttachment 
                                ? 'bg-blue-100 text-blue-900 hover:bg-blue-200 cursor-pointer' 
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                            }`}
                            title={rep.artAttachment ? `Visualizar ART: ${rep.artAttachment.fileName}` : 'ART não anexada'}
                          >
                            <span>ART</span>
                          </button>

                          {/* 2. Válvula */}
                          <button
                            type="button"
                            onClick={() => rep.valveCalibrationAttachment && setPreviewAttachment(rep.valveCalibrationAttachment)}
                            disabled={!rep.valveCalibrationAttachment}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold flex items-center space-x-0.5 ${
                              rep.valveCalibrationAttachment 
                                ? 'bg-fuchsia-100 text-fuchsia-950 hover:bg-fuchsia-200 cursor-pointer' 
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                            }`}
                            title={rep.valveCalibrationAttachment ? `Visualizar Laudo da Válvula: ${rep.valveCalibrationAttachment.fileName}` : 'Laudo de válvula não anexado'}
                          >
                            <span>PSV</span>
                          </button>

                          {/* 3. Ultrassom */}
                          <button
                            type="button"
                            onClick={() => rep.ultrassomAttachment && setPreviewAttachment(rep.ultrassomAttachment)}
                            disabled={!rep.ultrassomAttachment}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold flex items-center space-x-0.5 ${
                              rep.ultrassomAttachment 
                                ? 'bg-teal-100 text-teal-900 hover:bg-teal-200 cursor-pointer' 
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                            }`}
                            title={rep.ultrassomAttachment ? `Visualizar Laudo de Ultrassom: ${rep.ultrassomAttachment.fileName}` : 'Laudo ultrassom não anexado'}
                          >
                            <span>US</span>
                          </button>
                        </div>
                      </td>

                      <td className="p-3">
                        <span className="font-bold text-slate-800 block">
                          {rep.nextInspections.nextExternalInspectionDate ? new Date(rep.nextInspections.nextExternalInspectionDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                        </span>
                        <span className="text-[10px] text-slate-400">Externa</span>
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => setViewReportDetail(rep)}
                            className="p-1.5 rounded-lg text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Visualizar laudo completo em tela inteira"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => exportNR13ReportToPdf(rep)}
                            className="p-1.5 rounded-lg text-fuchsia-900 hover:bg-fuchsia-50 transition-colors cursor-pointer"
                            title="Baixar Laudo Oficial em PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => { setEditingReport(rep); setPreselectedVesselForReport(null); setShowReportForm(true); }}
                            className="px-2 py-1 rounded text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            Editar
                          </button>

                          <button
                            onClick={() => setPendingDelete({ type: 'report', id: rep.id, label: `laudo ${rep.code}` })}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
                            title="Excluir laudo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONTEÚDO DA ABA 2: BASE FIXA DE VPs E CPs */}
      {/* ========================================================================= */}
      {activeSubTab === 'vasos' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-emerald-800" />
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                Base Pré-Cadastrada de VPs (Vasos de Pressão) &amp; CPs (Compressores)
              </h3>
            </div>
            <span className="text-xs text-slate-500">
              {filteredVessels.length} equipamento(s) cadastrado(s)
            </span>
          </div>

          {filteredVessels.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Database className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">Nenhum VP ou CP cadastrado nesta fazenda</p>
              <p className="text-xs text-slate-400 mt-1">
                Clique em "+ Cadastrar VP / CP" para definir as especificações técnicas fixas e vincular a válvula PSV.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Vertical Cards */}
              <div className="md:hidden divide-y divide-slate-200">
                {filteredVessels.map(v => (
                  <div key={v.id} className="p-4 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                            v.assetType === 'CP' ? 'bg-cyan-100 text-cyan-900' : 'bg-fuchsia-100 text-fuchsia-950'
                          }`}>
                            {v.assetType || 'VP'}
                          </span>
                          <strong className="font-mono text-sm text-slate-900">{v.vesselNumber}</strong>
                        </div>
                        <strong className="text-sm text-slate-900 block mt-1">{v.equipmentTag}</strong>
                        <span className="text-xs text-slate-500 block">
                          {v.equipment.manufacturer || '-'} • {v.equipment.model || '-'} • Série {v.equipment.serialNumber || '-'}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-fuchsia-50 text-fuchsia-900 border border-fuchsia-200">
                        Cat. {v.nr13Categorization.category}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Fazenda / Setor</span>
                        <span className="font-bold text-emerald-900 block">{v.farm}</span>
                        <span className="text-[11px] text-slate-500">{v.sector || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">PMTA / Volume</span>
                        <strong className="text-slate-900 block">
                          {v.equipment.pmta} kgf/cm² • {v.equipment.geometricVolume} {v.equipment.volumeUnit}
                        </strong>
                        <span className="text-[11px] text-fuchsia-950 font-semibold">
                          PSV: {v.linkedValveTag || 'Não vinculada'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setEditingReport(null);
                          setPreselectedVesselForReport(v);
                          setShowReportForm(true);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer"
                      >
                        Gerar Laudo NR-13
                      </button>
                      <button
                        onClick={() => { setEditingVessel(v); setShowVesselForm(true); }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setPendingDelete({ type: 'vessel', id: v.id, label: `[${v.assetType || 'VP'}] ${v.vesselNumber} (${v.farm})` })}
                        className="p-1.5 rounded-lg text-red-600 bg-red-50 border border-red-200 cursor-pointer ml-auto"
                        title="Excluir cadastro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Tipo &amp; Nº</th>
                    <th className="p-3">Identificação / Fabricante</th>
                    <th className="p-3">Fazenda &amp; Setor</th>
                    <th className="p-3">PMTA / Volume / Cat.</th>
                    <th className="p-3">Dispositivos Vinculados</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVessels.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center space-x-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                            v.assetType === 'CP'
                              ? 'bg-cyan-100 text-cyan-900'
                              : 'bg-fuchsia-100 text-fuchsia-950'
                          }`}>
                            {v.assetType || 'VP'}
                          </span>
                          <strong className="font-mono text-slate-900">{v.vesselNumber}</strong>
                        </div>
                      </td>
                      <td className="p-3">
                        <strong className="text-slate-900 block">{v.equipmentTag}</strong>
                        <span className="text-[11px] text-slate-500">
                          {v.equipment.manufacturer || '-'} • {v.equipment.model || '-'} • Série {v.equipment.serialNumber || '-'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-emerald-900 block">{v.farm}</span>
                        <span className="text-[11px] text-slate-500">{v.sector || '-'}</span>
                      </td>
                      <td className="p-3">
                        <strong className="text-slate-900 block">
                          {v.equipment.pmta} kgf/cm² • {v.equipment.geometricVolume} {v.equipment.volumeUnit}
                        </strong>
                        <span className="text-[10px] font-bold text-fuchsia-900">
                          Categoria {v.nr13Categorization.category}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="block text-fuchsia-950 font-semibold text-[11px]">
                          PSV: {v.linkedValveTag || 'Não vinculada'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => {
                              setEditingReport(null);
                              setPreselectedVesselForReport(v);
                              setShowReportForm(true);
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer"
                            title="Abrir novo relatório NR-13 já preenchido com os dados fixos deste VP/CP"
                          >
                            Gerar Laudo NR-13
                          </button>

                          <button
                            onClick={() => { setEditingVessel(v); setShowVesselForm(true); }}
                            className="px-2 py-1 rounded text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            Editar
                          </button>

                          <button
                            onClick={() => setPendingDelete({ type: 'vessel', id: v.id, label: `[${v.assetType || 'VP'}] ${v.vesselNumber} (${v.farm})` })}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
                            title="Excluir cadastro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONTEÚDO DA ABA 2: CALIBRAÇÕES DE VÁLVULAS DE SEGURANÇA (PSV) */}
      {/* ========================================================================= */}
      {activeSubTab === 'valvulas' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              <ShieldCheck className="w-4 h-4 text-fuchsia-900 shrink-0" />
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                Calibrações de Válvulas de Segurança (PSV) • Bancada de Ensaio
              </h3>
            </div>
            <span className="text-xs text-slate-500">
              {filteredValves.length} válvula(s) cadastrada(s)
            </span>
          </div>

          {filteredValves.length === 0 ? (
            <div className="text-center py-12 px-4">
              <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">Nenhuma válvula cadastrada nesta fazenda</p>
              <p className="text-xs text-slate-400 mt-1">Clique em "+ Calibrar Válvula PSV" para registrar um ensaio.</p>
            </div>
          ) : (
            <>
              {/* Mobile Vertical Cards */}
              <div className="md:hidden divide-y divide-slate-200">
                {filteredValves.map(v => (
                  <div key={v.id} className="p-4 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <span className="font-bold font-mono text-sm text-fuchsia-950 block">{v.tag}</span>
                        <strong className="text-xs text-slate-900 block">{v.equipmentLinked}</strong>
                        <span className="text-xs text-slate-500 block">{v.manufacturer} • {v.connectionSize}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        v.status === 'APROVADA' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {v.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Fazenda</span>
                        <span className="font-semibold text-emerald-900">{v.farm}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Ajuste / Abertura</span>
                        <span className="font-bold text-slate-900 block">
                          {v.setPressure} → {v.openingPressure} {v.pressureUnit}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Estanqueidade</span>
                        <span className={`font-bold ${v.tightnessTest === 'SEM_VAZAMENTO' ? 'text-emerald-800' : 'text-red-700'}`}>
                          {v.tightnessTest === 'SEM_VAZAMENTO' ? '100% Conforme' : 'Com Vazamento'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Validade</span>
                        <span className="font-bold text-slate-900">
                          {new Date(v.nextCalibrationDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                      {v.certificateAttachment && (
                        <button
                          onClick={() => setPreviewAttachment(v.certificateAttachment!)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-fuchsia-100 text-fuchsia-950 cursor-pointer"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>Certificado</span>
                        </button>
                      )}
                      <button
                        onClick={() => { setEditingValve(v); setShowValveForm(true); }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setPendingDelete({ type: 'valve', id: v.id, label: `válvula ${v.tag}` })}
                        className="p-1.5 rounded-lg text-red-600 bg-red-50 border border-red-200 cursor-pointer ml-auto"
                        title="Excluir válvula"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">TAG</th>
                    <th className="p-3">Vaso / Equipamento Vinculado</th>
                    <th className="p-3">Fazenda</th>
                    <th className="p-3">Set Point (Ajuste)</th>
                    <th className="p-3">Abertura Medida</th>
                    <th className="p-3">Estanqueidade</th>
                    <th className="p-3">Validade</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Certificado</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredValves.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold font-mono text-fuchsia-950">{v.tag}</td>
                      <td className="p-3">
                        <strong className="text-slate-900 block">{v.equipmentLinked}</strong>
                        <span className="text-[11px] text-slate-500">{v.manufacturer} • {v.connectionSize}</span>
                      </td>
                      <td className="p-3 font-semibold text-emerald-900">{v.farm}</td>
                      <td className="p-3 font-bold text-slate-900">{v.setPressure} {v.pressureUnit}</td>
                      <td className="p-3 font-bold text-emerald-900">{v.openingPressure} {v.pressureUnit}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          v.tightnessTest === 'SEM_VAZAMENTO' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {v.tightnessTest === 'SEM_VAZAMENTO' ? '100% Conforme' : 'Com Vazamento'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-900 block">
                          {new Date(v.nextCalibrationDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                        <span className="text-[10px] text-slate-400">Calibrado: {new Date(v.calibrationDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          v.status === 'APROVADA' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {v.certificateAttachment ? (
                          <button
                            onClick={() => setPreviewAttachment(v.certificateAttachment!)}
                            className="inline-flex items-center space-x-1 px-2 py-1 rounded-md text-[10px] font-bold bg-fuchsia-100 text-fuchsia-950 hover:bg-fuchsia-200 cursor-pointer shadow-2xs"
                            title="Ver Certificado de Calibração da Válvula"
                          >
                            <Paperclip className="w-3 h-3 text-fuchsia-800" />
                            <span>Certificado</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">Sem anexo</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => { setEditingValve(v); setShowValveForm(true); }}
                            className="px-2 py-1 rounded text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => setPendingDelete({ type: 'valve', id: v.id, label: `válvula ${v.tag}` })}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONTEÚDO DA ABA 4: MEDIDORES DE ULTRASSOM / EQUIPAMENTOS DE AFERIÇÃO */}
      {/* ========================================================================= */}
      {activeSubTab === 'ultrassom' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-900" />
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                Medidores de Espessura por Ultrassom &amp; Equipamentos de Aferição
              </h3>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-xs text-slate-500">
                {filteredUltrassomEquipments.length} equipamento(s) cadastrado(s)
              </span>
              <button
                onClick={() => { setEditingUltrassom(null); setShowUltrassomForm(true); }}
                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-cyan-900 hover:bg-cyan-800 text-white cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Adicionar Equipamento</span>
              </button>
            </div>
          </div>

          {filteredUltrassomEquipments.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Activity className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">Nenhum equipamento de aferição encontrado</p>
              <p className="text-xs text-slate-400 mt-1">Clique em &quot;+ Novo Equipamento de Aferição&quot; para cadastrar um medidor de ultrassom.</p>
            </div>
          ) : (
            <>
              {/* Mobile Vertical Cards */}
              <div className="md:hidden divide-y divide-slate-200">
                {filteredUltrassomEquipments.map(u => (
                  <div key={u.id} className="p-4 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <strong className="text-sm font-extrabold text-slate-900 block">{u.name}</strong>
                        <span className="text-xs font-mono font-bold text-cyan-950 block">Série: {u.serialNumber || '-'}</span>
                        <span className="text-xs font-mono font-bold text-fuchsia-950 block">Cert.: {u.certificateNumber || '-'}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        u.status === 'CALIBRADO'
                          ? 'bg-emerald-100 text-emerald-800'
                          : u.status === 'VENCIDO'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                      }`}>
                        {u.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Laboratório</span>
                        <strong className="text-slate-800 block">{u.calibrationLab || '-'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Validade / Calib.</span>
                        <span className="font-bold text-slate-900 block">
                          Val.: {u.nextCalibrationDate ? new Date(u.nextCalibrationDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Calib.: {u.calibrationDate ? new Date(u.calibrationDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                      {u.certificateAttachment && (
                        <button
                          onClick={() => setPreviewAttachment(u.certificateAttachment!)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-cyan-100 text-cyan-950 cursor-pointer"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>Certificado</span>
                        </button>
                      )}
                      <button
                        onClick={() => { setEditingUltrassom(u); setShowUltrassomForm(true); }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setPendingDelete({ type: 'ultrassom', id: u.id, label: `equipamento ${u.name} (${u.certificateNumber})` })}
                        className="p-1.5 rounded-lg text-red-600 bg-red-50 border border-red-200 cursor-pointer ml-auto"
                        title="Excluir equipamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Equipamento</th>
                    <th className="p-3">Nº de Série</th>
                    <th className="p-3">Certificado</th>
                    <th className="p-3">Laboratório / Faixa</th>
                    <th className="p-3">Calibração / Validade</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Certificado PDF</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUltrassomEquipments.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-extrabold text-slate-900">{u.name}</td>
                      <td className="p-3 font-mono font-bold text-cyan-950">{u.serialNumber || '-'}</td>
                      <td className="p-3 font-mono font-bold text-fuchsia-950">{u.certificateNumber || '-'}</td>
                      <td className="p-3">
                        <strong className="text-slate-800 block">{u.calibrationLab || '-'}</strong>
                        <span className="text-[11px] text-slate-500">
                          {[u.measurementRange, u.resolution ? `Res. ${u.resolution}` : '', u.uncertainty ? `Inc. ${u.uncertainty}` : ''].filter(Boolean).join(' • ') || '-'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-900 block">
                          Val.: {u.nextCalibrationDate ? new Date(u.nextCalibrationDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Calib.: {u.calibrationDate ? new Date(u.calibrationDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          u.status === 'CALIBRADO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : u.status === 'VENCIDO'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {u.certificateAttachment ? (
                          <button
                            onClick={() => setPreviewAttachment(u.certificateAttachment!)}
                            className="inline-flex items-center space-x-1 px-2 py-1 rounded-md text-[10px] font-bold bg-cyan-100 text-cyan-950 hover:bg-cyan-200 cursor-pointer shadow-2xs"
                            title="Ver Certificado do Equipamento de Ultrassom"
                          >
                            <Paperclip className="w-3 h-3 text-cyan-800" />
                            <span>Certificado</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">Sem anexo</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => { setEditingUltrassom(u); setShowUltrassomForm(true); }}
                            className="px-2 py-1 rounded text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => setPendingDelete({ type: 'ultrassom', id: u.id, label: `equipamento ${u.name} (${u.certificateNumber})` })}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ==================== AUXILIARY OVERLAYS (DOCUMENT PREVIEW & DELETE CONFIRM) ==================== */}

      {/* 5. In-App Document / PDF Viewer Modal */}
      {previewAttachment && (
        <AttachmentViewerModal
          attachment={previewAttachment}
          onClose={() => setPreviewAttachment(null)}
        />
      )}

      {/* 6. In-App Delete Confirmation Modal */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 border border-slate-200 space-y-4">
            <div className="flex items-center space-x-2.5 text-red-700">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-extrabold">Confirmar Exclusão</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tem certeza que deseja excluir permanentemente o registro <strong>{pendingDelete.label}</strong>?
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="px-3.5 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg text-xs font-extrabold bg-red-600 hover:bg-red-700 text-white cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
