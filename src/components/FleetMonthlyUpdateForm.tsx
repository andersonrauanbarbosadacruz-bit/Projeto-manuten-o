import React, { useState, useRef, useEffect } from 'react';
import { 
  Car, 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  Gauge, 
  ShieldAlert, 
  Wrench, 
  Camera, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowLeft, 
  Save, 
  Plus, 
  FileText,
  X,
  Trash2,
  Eye,
  ClipboardCheck,
  Plane
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Farm, FARMS, VehicleVisualInspection, ChecklistRecord } from '../types';
import { VehicleVisualEvaluation } from './VehicleVisualEvaluation';
import { ChecklistForm } from './ChecklistForm';
import { compressImage } from '../utils/imageCompressor';

interface FleetMonthlyUpdateFormProps {
  onSuccess?: () => void;
  onChecklistSuccess?: (created: ChecklistRecord) => void;
  onCancel?: () => void;
  isModal?: boolean;
  leanMode?: boolean;
}

export const FleetMonthlyUpdateForm: React.FC<FleetMonthlyUpdateFormProps> = ({
  onSuccess,
  onChecklistSuccess,
  onCancel,
  isModal = false,
  leanMode = false
}) => {
  const { 
    farms,
    userRole,
    lockedFarm,
    selectedFarmFilter,
    vehicles,
    addFleetMonthlyUpdate,
    setViewFleetUpdateDetail,
    setActiveTab,
    setShowVehicleModal,
    setPreviewImage,
    setShowFleetUpdateFormModal,
    fleetFormMode,
    setFleetFormMode
  } = useApp() as any;

  // Farm selection
  const initialFarm: Farm = lockedFarm || (selectedFarmFilter !== 'TODAS' ? selectedFarmFilter : 'Vale das Uvas');
  const [farm, setFarm] = useState<Farm>(initialFarm);

  useEffect(() => {
    if (lockedFarm) {
      setFarm(lockedFarm);
    }
  }, [lockedFarm]);

  // Form fields
  const [plate, setPlate] = useState<string>('');
  const [vehicleModel, setVehicleModel] = useState<string>('');
  const [mileage, setMileage] = useState<string>('');
  const [driver, setDriver] = useState<string>('');
  
  // Date and Time (default to current local date and time)
  const [date, setDate] = useState<string>(() => new Date().toISOString().substring(0, 10));
  const [time, setTime] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  // Preventive maintenance in last 30 days
  const [preventiveMaintenanceLast30Days, setPreventiveMaintenanceLast30Days] = useState<boolean>(false);
  const [preventiveMaintenanceNotes, setPreventiveMaintenanceNotes] = useState<string>('');

  // Incident in last 30 days
  const [hasIncidentLast30Days, setHasIncidentLast30Days] = useState<boolean>(false);
  const [incidentNotes, setIncidentNotes] = useState<string>('');
  const [incidentPhotos, setIncidentPhotos] = useState<string[]>([]);
  const [isCapturingIncidentPhoto, setIsCapturingIncidentPhoto] = useState<boolean>(false);
  const incidentPhotoInputRef = useRef<HTMLInputElement | null>(null);

  const handleCaptureIncidentPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCapturingIncidentPhoto(true);
    try {
      const compressed = await compressImage(file, 850, 850, 0.65);
      setIncidentPhotos(prev => [...prev, compressed]);
    } catch (err) {
      console.error('Erro ao processar foto do sinistro:', err);
    } finally {
      setIsCapturingIncidentPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  const removeIncidentPhoto = (index: number) => {
    setIncidentPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // 4 visual angles
  const [visualInspection, setVisualInspection] = useState<VehicleVisualInspection>({});

  // General observations
  const [notes, setNotes] = useState<string>('');

  // State
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Auto-select first vehicle if plate is not set
  useEffect(() => {
    if (!plate && vehicles && vehicles.length > 0) {
      setPlate(vehicles[0].plate);
      setVehicleModel(vehicles[0].model);
    }
  }, [vehicles, plate]);

  // Handle vehicle plate change
  const handlePlateChange = (newPlate: string) => {
    setPlate(newPlate);
    const found = vehicles.find((v: any) => v.plate === newPlate);
    if (found) {
      setVehicleModel(found.model);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // 1. Validate Plate
    if (!plate) {
      setValidationError('Por favor, selecione a placa do veículo na lista suspensa.');
      return;
    }

    // 2. Validate Mileage
    if (!mileage || Number(mileage) <= 0) {
      setValidationError('Por favor, informe a quilometragem atual do veículo (KM válido).');
      return;
    }

    // 3. Validate Driver
    if (!driver.trim()) {
      setValidationError('Por favor, informe o nome do Condutor responsável.');
      return;
    }

    // 4. Validate Date & Time
    if (!date) {
      setValidationError('Por favor, informe a data do registro.');
      return;
    }
    if (!time) {
      setValidationError('Por favor, informe o horário do registro.');
      return;
    }

    // 5. Validate Preventive Notes if SIM
    if (preventiveMaintenanceLast30Days && !preventiveMaintenanceNotes.trim()) {
      setValidationError('Como houve manutenção preventiva nos últimos 30 dias, por favor descreva o serviço realizado.');
      return;
    }

    // 6. Validate Incident Notes if SIM
    if (hasIncidentLast30Days && !incidentNotes.trim()) {
      setValidationError('Como houve registro de sinistro/avaria nos últimos 30 dias, por favor descreva o ocorrido.');
      return;
    }

    // 7. Mandatory 4 Visual Angles: "obrigatoriamente foto dos 4 ângulos do veículo"
    if (!visualInspection.front || !visualInspection.rear || !visualInspection.leftSide || !visualInspection.rightSide) {
      const missing: string[] = [];
      if (!visualInspection.front) missing.push('Frente');
      if (!visualInspection.rear) missing.push('Traseira');
      if (!visualInspection.leftSide) missing.push('Lateral Esquerda');
      if (!visualInspection.rightSide) missing.push('Lateral Direita');
      setValidationError(`É OBRIGATÓRIO anexar a foto dos 4 ângulos do veículo. Foto(s) pendente(s): ${missing.join(', ')}.`);
      return;
    }

    setIsSaving(true);
    try {
      const created = addFleetMonthlyUpdate({
        farm,
        plate,
        vehicleModel: vehicleModel || 'Frota',
        mileage: Number(mileage),
        driver: driver.trim(),
        date,
        time,
        preventiveMaintenanceLast30Days,
        preventiveMaintenanceNotes: preventiveMaintenanceLast30Days ? preventiveMaintenanceNotes.trim() : '',
        hasIncidentLast30Days,
        incidentNotes: hasIncidentLast30Days ? incidentNotes.trim() : '',
        incidentPhotos: hasIncidentLast30Days ? incidentPhotos : [],
        visualInspection,
        notes: notes.trim()
      });

      if (onSuccess) {
        onSuccess();
      } else {
        setViewFleetUpdateDetail(created);
        setActiveTab('fleet-updates');
      }
    } catch (err: any) {
      console.error('Erro ao salvar atualização mensal de veículo:', err);
      setValidationError(`Erro ao salvar atualização: ${err.message || 'Tente novamente.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = React.useCallback((url: string, title: string) => {
    setPreviewImage({ url, title });
  }, [setPreviewImage]);

  const handleClose = () => {
    if (onCancel) {
      onCancel();
    } else {
      setActiveTab('fleet-updates');
    }
  };

  const handleOpenHistory = () => {
    setActiveTab('fleet-updates');
  };

  return (
    <div className={leanMode ? 'space-y-4 pb-6' : 'max-w-4xl mx-auto space-y-6 pb-16'}>
      {!leanMode && (
        <>
          {/* Top Navigation Bar - Matching Checklist and OS screens */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center text-sm font-semibold text-slate-600 hover:text-cyan-700 transition-colors cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5 group-hover:-translate-x-0.5 transition-transform" />
              Voltar para Frota
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleOpenHistory}
                className="inline-flex items-center space-x-1 px-3 py-1 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 rounded-lg text-xs font-bold border border-cyan-200 transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Ver Histórico</span>
              </button>
              <span className="text-xs font-bold px-3 py-1 bg-cyan-100 text-cyan-900 rounded-full border border-cyan-300">
                Frota de Veículos
              </span>
            </div>
          </div>

          {/* Header Banner */}
          <div className="bg-gradient-to-r from-cyan-900 via-slate-900 to-cyan-950 rounded-2xl p-5 sm:p-6 text-white shadow-xl flex items-center justify-between border border-cyan-800/40">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center border border-cyan-400/30 shrink-0">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-cyan-300 bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                    Frota & Aeronaves
                  </span>
                  <span className="text-xs text-slate-300 hidden sm:inline">•</span>
                  <span className="text-xs text-slate-300 hidden sm:inline">Atualização Mensal, Veículo & Drone</span>
                </div>
                <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight mt-1">
                  Frota: Atualização Mensal, Veículo & Drone
                </h1>
                <p className="text-xs sm:text-sm text-cyan-100/80 mt-0.5">
                  Escolha abaixo se deseja registrar a <strong>Atualização Mensal</strong>, o <strong>Checklist de Veículo</strong> ou o <strong>Checklist de Drone</strong>.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Mode Switcher: Atualização Mensal | Checklist de Veículo | Drone Agrícola */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setFleetFormMode('UPDATE')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center space-x-3 ${
            fleetFormMode === 'UPDATE'
              ? 'bg-cyan-700 text-white border-cyan-800 shadow-sm'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <div className={`p-2 rounded-lg shrink-0 ${
            fleetFormMode === 'UPDATE' ? 'bg-white/20 text-white' : 'bg-cyan-100 text-cyan-800'
          }`}>
            <Car className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-extrabold truncate">Atualização Mensal</div>
            <div className={`text-[10px] truncate ${fleetFormMode === 'UPDATE' ? 'text-cyan-100' : 'text-slate-500'}`}>
              KM, preventivas, sinistro e 4 fotos
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFleetFormMode('CHECKLIST')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center space-x-3 ${
            fleetFormMode === 'CHECKLIST'
              ? 'bg-purple-700 text-white border-purple-800 shadow-sm'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <div className={`p-2 rounded-lg shrink-0 ${
            fleetFormMode === 'CHECKLIST' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-800'
          }`}>
            <ClipboardCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-extrabold truncate">Checklist de Veículo</div>
            <div className={`text-[10px] truncate ${fleetFormMode === 'CHECKLIST' ? 'text-purple-100' : 'text-slate-500'}`}>
              Inspeção, 4 ângulos e assinatura
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFleetFormMode('DRONE')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center space-x-3 ${
            fleetFormMode === 'DRONE'
              ? 'bg-indigo-700 text-white border-indigo-800 shadow-sm'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <div className={`p-2 rounded-lg shrink-0 ${
            fleetFormMode === 'DRONE' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-800'
          }`}>
            <Plane className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-extrabold truncate">Drone Agrícola</div>
            <div className={`text-[10px] truncate ${fleetFormMode === 'DRONE' ? 'text-indigo-100' : 'text-slate-500'}`}>
              12 itens com fotos obrigatórias
            </div>
          </div>
        </button>
      </div>

      {fleetFormMode === 'CHECKLIST' ? (
        <ChecklistForm
          forcedType="VEICULO"
          leanMode={leanMode}
          onSuccess={onChecklistSuccess}
          onCancel={handleClose}
        />
      ) : fleetFormMode === 'DRONE' ? (
        <ChecklistForm
          forcedType="DRONE"
          leanMode={leanMode}
          onSuccess={onChecklistSuccess}
          onCancel={handleClose}
        />
      ) : (
        <>
          {/* Validation alert */}
          {validationError && (
            <div className="bg-red-50 border-2 border-red-400/80 rounded-xl p-4 text-red-900 flex items-start space-x-3 shadow-md animate-shake">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm font-semibold">
                <strong className="block text-red-950 font-bold mb-0.5">Atenção ao preenchimento:</strong>
                {validationError}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Identificação Básica (Fazenda, Placa, Modelo, KM, Condutor, Data/Hora) */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-800 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                Dados do Veículo e da Inspeção
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">* Campos obrigatórios</span>
          </div>

          {/* Farm Selection Radio Grid */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Qual a Fazenda? <span className="text-red-500">*</span>
            </label>
            {lockedFarm ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>Fazenda Bloqueada: <strong>{lockedFarm}</strong></span>
                </span>
                <span className="text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">
                  🔒 Operador
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {FARMS.map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFarm(f)}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                      farm === f
                        ? 'border-cyan-600 bg-cyan-700 text-white shadow-sm ring-2 ring-cyan-500/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <MapPin className={`w-3.5 h-3.5 ${farm === f ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{f}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Grid: Placa & Modelo & Botão Cadastrar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {/* Placa (lista suspensa) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Placa do Veículo <span className="text-red-500">*</span>
                </label>
                {(!leanMode || userRole === 'ADMIN') && (
                  <button
                    type="button"
                    onClick={() => setShowVehicleModal(true)}
                    className="text-[11px] font-bold text-cyan-700 hover:text-cyan-900 flex items-center space-x-1 cursor-pointer"
                    title="Cadastrar nova placa na frota"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Nova Placa</span>
                  </button>
                )}
              </div>
              <div className="relative">
                <Car className="w-4 h-4 absolute left-3 top-3 text-cyan-600 pointer-events-none" />
                <select
                  value={plate}
                  onChange={(e) => handlePlateChange(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">Selecione a placa do veículo...</option>
                  {vehicles.map((v: any) => (
                    <option key={v.id || v.plate} value={v.plate}>
                      {v.plate} — {v.model} {v.farm ? `(${v.farm})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {vehicles.length} veículos cadastrados na frota
              </span>
            </div>

            {/* Modelo do Veículo (Auto-preenchido) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Modelo do Veículo
              </label>
              <input
                type="text"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value.toUpperCase())}
                placeholder="Ex: ARGO, STRADA, POLO..."
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-cyan-500 uppercase"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Preenchido automaticamente pela placa
              </span>
            </div>

            {/* Quilometragem Atual (KM) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Quilometragem (KM) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Gauge className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  placeholder="Ex: 45280"
                  className="w-full pl-9 pr-12 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-cyan-500"
                />
                <span className="absolute right-3 top-2.5 text-xs font-extrabold text-slate-400">
                  KM
                </span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Odômetro atual do painel do veículo
              </span>
            </div>
          </div>

          {/* Grid: Condutor, Data e Hora */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Condutor */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Condutor Responsável <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={driver}
                  onChange={(e) => setDriver(e.target.value)}
                  placeholder="Nome completo do condutor"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-cyan-500 font-medium"
                />
              </div>
            </div>

            {/* Data */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Data do Registro <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-cyan-500 font-medium"
                />
              </div>
            </div>

            {/* Hora */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Horário <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-cyan-500 font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Questões Operacionais de 30 Dias (Preventiva e Sinistros) */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-800 flex items-center justify-center font-bold text-xs">
              2
            </div>
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Histórico Operacional dos Últimos 30 Dias
            </h2>
          </div>

          {/* Pergunta 1: Manutenção Preventiva nos últimos 30 dias? */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Wrench className="w-4 h-4 text-emerald-700" />
                  <span>Houve manutenção preventiva nos últimos 30 dias?</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ex: Troca de óleo, substituição de filtros, alinhamento/balanceamento, revisão periódica
                </p>
              </div>

              {/* Toggle Buttons SIM / NÃO */}
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setPreventiveMaintenanceLast30Days(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    !preventiveMaintenanceLast30Days
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  NÃO
                </button>
                <button
                  type="button"
                  onClick={() => setPreventiveMaintenanceLast30Days(true)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    preventiveMaintenanceLast30Days
                      ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/30'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  SIM
                </button>
              </div>
            </div>

            {/* Campo condicional para detalhes da preventiva */}
            {preventiveMaintenanceLast30Days && (
              <div className="pt-2 animate-in fade-in">
                <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider mb-1.5">
                  Descreva a manutenção preventiva realizada: <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={preventiveMaintenanceNotes}
                  onChange={(e) => setPreventiveMaintenanceNotes(e.target.value)}
                  placeholder="Ex: Troca de óleo 5W30, filtro de óleo e combustível, rodízio de pneus..."
                  className="w-full p-3 bg-white border border-emerald-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Pergunta 2: Algum sinistro dos últimos 30 dias? */}
          <div className={`p-4 rounded-xl border space-y-3 transition-colors ${
            hasIncidentLast30Days ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200 bg-slate-50/60'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Houve algum sinistro ou avaria nos últimos 30 dias?</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ex: Colisão, amassado, quebra de lanterna/retrovisor, arranhões na lataria ou vidros
                </p>
              </div>

              {/* Toggle Buttons SIM / NÃO */}
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setHasIncidentLast30Days(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    !hasIncidentLast30Days
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  NÃO
                </button>
                <button
                  type="button"
                  onClick={() => setHasIncidentLast30Days(true)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    hasIncidentLast30Days
                      ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-500/30'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  SIM
                </button>
              </div>
            </div>

            {/* Campo condicional para detalhes do sinistro + fotos anexadas */}
            {hasIncidentLast30Days && (
              <div className="pt-2 space-y-3 animate-in fade-in">
                <div>
                  <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-1.5">
                    Descreva o sinistro / avaria com detalhes: <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={incidentNotes}
                    onChange={(e) => setIncidentNotes(e.target.value)}
                    placeholder="Ex: Para-choque dianteiro avariado ao manobrar próximo a cerca no lote 14..."
                    className="w-full p-3 bg-white border border-amber-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Bloco de Upload / Captura de Imagens do Sinistro */}
                <div className="bg-white/95 rounded-xl p-3.5 border border-amber-300 shadow-2xs space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-extrabold text-amber-950 flex items-center space-x-1.5">
                        <Camera className="w-4 h-4 text-amber-600" />
                        <span>Imagens do Sinistro / Avaria</span>
                        {incidentPhotos.length > 0 && (
                          <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.2 rounded-full">
                            {incidentPhotos.length} {incidentPhotos.length === 1 ? 'foto' : 'fotos'}
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Tire ou anexe fotos detalhadas do dano (arranhões, amassados, peças quebradas)
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isCapturingIncidentPhoto}
                      onClick={() => incidentPhotoInputRef.current?.click()}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer transition-all active:scale-95 self-start sm:self-auto"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{isCapturingIncidentPhoto ? 'Comprimindo...' : '+ Adicionar Foto do Sinistro'}</span>
                    </button>
                    <input
                      type="file"
                      ref={incidentPhotoInputRef}
                      accept="image/*"
                      capture="environment"
                      onChange={handleCaptureIncidentPhoto}
                      className="hidden"
                    />
                  </div>

                  {/* Grid de Miniaturas com Exclusão e Zoom */}
                  {incidentPhotos.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                      {incidentPhotos.map((photoUrl, idx) => (
                        <div key={idx} className="relative group rounded-lg overflow-hidden border border-amber-300 bg-slate-100 h-24">
                          <img
                            src={photoUrl}
                            alt={`Foto Sinistro ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handlePreview(photoUrl, `Foto do Sinistro ${idx + 1} (${plate})`)}
                              className="p-1.5 bg-white text-slate-800 rounded-md hover:bg-slate-100"
                              title="Ampliar foto"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeIncidentPhoto(idx)}
                              className="p-1.5 bg-red-600 text-white rounded-md hover:bg-red-700"
                              title="Remover foto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                            Foto {idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div 
                      onClick={() => incidentPhotoInputRef.current?.click()}
                      className="border-2 border-dashed border-amber-300/80 hover:border-amber-500 bg-amber-50/40 rounded-lg p-3 text-center cursor-pointer transition-colors"
                    >
                      <span className="text-xs font-semibold text-amber-800">
                        Nenhuma foto do sinistro anexada. Clique aqui para tirar foto da câmera ou anexar da galeria.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Fotos Obrigatórias dos 4 Ângulos do Veículo */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-800 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                Vistoria Fotográfica dos 4 Ângulos Obrigatórios
              </h2>
            </div>
            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
              Todas as 4 fotos são obrigatórias
            </span>
          </div>

          {/* Componente Reutilizável de Avaliação Visual de 4 Ângulos */}
          <VehicleVisualEvaluation
            value={visualInspection}
            onChange={setVisualInspection}
            onPreview={handlePreview}
          />
        </div>

        {/* Step 4: Campo de Observação Geral */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-3">
          <div className="border-b border-slate-100 pb-3 flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-800 flex items-center justify-center font-bold text-xs">
              4
            </div>
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Campo de Observação Geral
            </h2>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Observações gerais sobre as condições do veículo
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descreva quaisquer outros apontamentos relevantes sobre a conservação, limpeza interna, ruídos anormais, estepe ou ferramentas..."
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className={`flex flex-col sm:flex-row items-center gap-3 pt-2 ${leanMode ? 'justify-end' : 'justify-between'}`}>
          {!leanMode && (
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold transition-all cursor-pointer"
            >
              Cancelar
            </button>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-8 py-3 rounded-xl bg-cyan-700 hover:bg-cyan-800 disabled:opacity-50 text-white text-xs sm:text-sm font-extrabold shadow-lg hover:shadow-cyan-700/25 transition-all active:scale-95 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Salvando...' : 'Salvar Atualização Mensal'}</span>
          </button>
        </div>
      </form>
        </>
      )}
    </div>
  );
};
