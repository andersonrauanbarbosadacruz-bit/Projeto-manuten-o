import React, { useState, useEffect, useRef } from 'react';
import { 
  ClipboardCheck, 
  Camera, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  MinusCircle, 
  AlertTriangle, 
  Upload, 
  Save, 
  Wrench, 
  Eye, 
  Check, 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  ArrowLeft,
  Droplet,
  Gauge,
  Zap,
  Navigation,
  Car,
  Plus,
  PenTool
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { compressImage } from '../utils/imageCompressor';
import { 
  ChecklistType, 
  ComplianceStatus, 
  Farm, 
  FARMS, 
  CHECKLIST_TYPE_LABELS,
  ChecklistItemResponse,
  ChecklistRecord,
  VehicleVisualInspection
} from '../types';
import { CHECKLIST_TEMPLATES } from '../data/initialData';
import { SignaturePad } from './SignaturePad';
import { VehicleVisualEvaluation } from './VehicleVisualEvaluation';
import { VehicleManagerModal } from './VehicleManagerModal';
import { DroneManagerModal } from './DroneManagerModal';

interface ChecklistFormProps {
  forcedType?: ChecklistType;
  leanMode?: boolean;
  onSuccess?: (created: ChecklistRecord) => void;
  onCancel?: () => void;
}

export const ChecklistForm: React.FC<ChecklistFormProps> = ({
  forcedType,
  leanMode = false,
  onSuccess,
  onCancel
}) => {
  const { 
    selectedFarmFilter, 
    lockedFarm,
    isFarmLocked,
    addChecklist, 
    setActiveTab, 
    setViewChecklistDetail, 
    setPreviewImage,
    generateWorkOrderFromChecklistNC,
    selectedChecklistTypeForCreation,
    setSelectedChecklistTypeForCreation,
    autoSaveDraft,
    vehicles,
    drones,
    addDrone,
    userRole
  } = useApp();

  const now = new Date();
  const defaultDate = now.toISOString().split('T')[0];
  const defaultTime = now.toTimeString().substring(0, 5);

  const initialFarm: Farm = lockedFarm || (selectedFarmFilter !== 'TODAS' ? selectedFarmFilter : 'Vale das Uvas');

  const initialChecklistType: ChecklistType = forcedType
    ? forcedType
    : selectedChecklistTypeForCreation && selectedChecklistTypeForCreation !== 'VEICULO' && selectedChecklistTypeForCreation !== 'DRONE'
    ? selectedChecklistTypeForCreation
    : 'SALA_DE_MAQUINAS';

  // Form State
  const [checklistType, setChecklistType] = useState<ChecklistType>(initialChecklistType);
  const [farm, setFarm] = useState<Farm>(initialFarm);

  useEffect(() => {
    if (lockedFarm) {
      setFarm(lockedFarm);
    }
  }, [lockedFarm]);

  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);
  const [location, setLocation] = useState('');
  const [inspector, setInspector] = useState('');
  const [shift, setShift] = useState('Manhã');
  const [generalNotes, setGeneralNotes] = useState('');

  // Specific Drone State
  const [droneModel, setDroneModel] = useState<string>(() => drones[0]?.label || 'Drone 01 (DJI T70P)');
  const [isDroneModalOpen, setIsDroneModalOpen] = useState(false);
  const [showInlineNewDrone, setShowInlineNewDrone] = useState(false);
  const [newDroneName, setNewDroneName] = useState('');
  const [newDroneModelName, setNewDroneModelName] = useState('DJI T70P');
  const [newDroneError, setNewDroneError] = useState<string | null>(null);

  // Specific Vehicle State
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [initialKm, setInitialKm] = useState('');
  const [finalKm, setFinalKm] = useState('');
  const [vehicleVisual, setVehicleVisual] = useState<VehicleVisualInspection>({});
  const [signatureUrl, setSignatureUrl] = useState<string | undefined>(undefined);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);

  // Ensure valid default drone when switching to DRONE
  useEffect(() => {
    if (checklistType === 'DRONE' && !droneModel && drones.length > 0) {
      setDroneModel(drones[0].label);
    }
  }, [checklistType, drones, droneModel]);

  // Set default vehicle if switching to VEICULO
  useEffect(() => {
    if (checklistType === 'VEICULO' && !vehiclePlate && vehicles.length > 0) {
      setVehiclePlate(vehicles[0].plate);
      setVehicleModel(vehicles[0].model);
    }
  }, [checklistType, vehicles]);

  const handleSelectVehicle = (plate: string, model: string) => {
    setVehiclePlate(plate);
    setVehicleModel(model);
  };

  const handleSaveInlineDrone = () => {
    setNewDroneError(null);
    const cleanName = newDroneName.trim();
    const cleanModel = newDroneModelName.trim().toUpperCase();
    if (!cleanName) {
      setNewDroneError('Informe o prefixo ou nome do drone (ex: Drone 03).');
      return;
    }
    if (!cleanModel) {
      setNewDroneError('Informe o modelo do drone (ex: DJI T70P).');
      return;
    }
    const candidateLabel = `${cleanName} (${cleanModel})`;
    const existing = drones.find(d => d.label.toLowerCase() === candidateLabel.toLowerCase());
    if (existing) {
      setDroneModel(existing.label);
      setShowInlineNewDrone(false);
      setNewDroneName('');
      return;
    }
    const created = addDrone({
      name: cleanName,
      model: cleanModel,
      farm
    });
    setDroneModel(created.label);
    setShowInlineNewDrone(false);
    setNewDroneName('');
    setNewDroneModelName('DJI T70P');
  };

  // Items responses
  const [itemsResponses, setItemsResponses] = useState<Record<string, ChecklistItemResponse>>(() => {
    const templates = CHECKLIST_TEMPLATES[initialChecklistType] || [];
    const initial: Record<string, ChecklistItemResponse> = {};
    templates.forEach((t) => {
      initial[t.id] = {
        itemId: t.id,
        description: t.description,
        status: null,
        requiresImage: t.requiresImage,
        notes: ''
      };
    });
    return initial;
  });

  // When checklistType switches, re-initialize items
  const handleTypeChange = (newType: ChecklistType) => {
    setChecklistType(newType);
    setSelectedChecklistTypeForCreation(newType);
    const templates = CHECKLIST_TEMPLATES[newType] || [];
    const initial: Record<string, ChecklistItemResponse> = {};
    templates.forEach(t => {
      initial[t.id] = {
        itemId: t.id,
        description: t.description,
        status: null,
        requiresImage: t.requiresImage,
        notes: ''
      };
    });
    setItemsResponses(initial);
  };

  // Sync when selectedChecklistTypeForCreation or forcedType changes
  useEffect(() => {
    if (forcedType) {
      if (forcedType !== checklistType) {
        handleTypeChange(forcedType);
      }
      return;
    }
    if (selectedChecklistTypeForCreation && selectedChecklistTypeForCreation !== 'VEICULO' && selectedChecklistTypeForCreation !== 'DRONE' && selectedChecklistTypeForCreation !== checklistType) {
      handleTypeChange(selectedChecklistTypeForCreation);
    }
  }, [selectedChecklistTypeForCreation, forcedType]);

  const currentTemplates = CHECKLIST_TEMPLATES[checklistType] || [];

  const checklistIdRef = useRef<string>(`chk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Auto-save draft
  const triggerChecklistAutoSave = (updatedResponses = itemsResponses) => {
    const itemsArray = currentTemplates.map(t => updatedResponses[t.id] || {
      itemId: t.id,
      description: t.description,
      status: null,
      requiresImage: t.requiresImage
    });

    autoSaveDraft('checklist', {
      id: checklistIdRef.current,
      type: checklistType,
      farm,
      location: location.trim() || (checklistType === 'VEICULO' ? `Veículo ${vehiclePlate || ''}` : 'Local em inspeção...'),
      date,
      time,
      inspector: inspector.trim() || 'Operador',
      shift,
      generalNotes,
      droneModel: checklistType === 'DRONE' ? droneModel : undefined,
      vehiclePlate: checklistType === 'VEICULO' ? vehiclePlate : undefined,
      vehicleModel: checklistType === 'VEICULO' ? vehicleModel : undefined,
      initialKm: checklistType === 'VEICULO' ? initialKm : undefined,
      finalKm: checklistType === 'VEICULO' ? finalKm : undefined,
      vehicleVisual: checklistType === 'VEICULO' ? vehicleVisual : undefined,
      signatureUrl: checklistType === 'VEICULO' ? signatureUrl : undefined,
      statusSummary: 'EM_ANDAMENTO',
      items: itemsArray,
      isDraft: true
    });
  };

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const debouncedAutoSave = (updatedResponses: typeof itemsResponses) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      triggerChecklistAutoSave(updatedResponses);
    }, 1200);
  };

  const handleStatusChange = (itemId: string, status: ComplianceStatus) => {
    setItemsResponses(prev => {
      const next = {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          status
        }
      };
      debouncedAutoSave(next);
      return next;
    });
  };

  const handleNotesChange = (itemId: string, notes: string) => {
    setItemsResponses(prev => {
      const next = {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          notes
        }
      };
      debouncedAutoSave(next);
      return next;
    });
  };

  const handleImageUpload = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingPhoto(true);
      try {
        const compressedUrl = await compressImage(file, 1200, 1200, 0.72);
        setItemsResponses(prev => {
          const next = {
            ...prev,
            [itemId]: {
              ...prev[itemId],
              photoUrl: compressedUrl
            }
          };
          triggerChecklistAutoSave(next);
          return next;
        });
      } catch (err) {
        console.error('Erro ao comprimir imagem do checklist:', err);
      } finally {
        setIsProcessingPhoto(false);
        if (e.target) e.target.value = '';
      }
    }
  };

  const removePhoto = (itemId: string) => {
    setItemsResponses(prev => {
      const next = {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          photoUrl: undefined
        }
      };
      triggerChecklistAutoSave(next);
      return next;
    });
  };

  const markAllAsConforming = () => {
    setItemsResponses(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(id => {
        updated[id] = {
          ...updated[id],
          status: 'C'
        };
      });
      triggerChecklistAutoSave(updated);
      return updated;
    });
  };

  // Stats calculation
  const totalItems = currentTemplates.length;
  const answeredItems = Object.values(itemsResponses).filter(i => i.status !== null).length;
  const conformingCount = Object.values(itemsResponses).filter(i => i.status === 'C').length;
  const nonConformingCount = Object.values(itemsResponses).filter(i => i.status === 'N/C').length;
  const notApplicableCount = Object.values(itemsResponses).filter(i => i.status === 'N/A').length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Common validations (VEICULO and DRONE have their own asset identifiers)
    if (checklistType !== 'VEICULO' && checklistType !== 'DRONE' && !location.trim()) {
      setValidationError('Por favor, informe o Local / Setor específico inspecionado.');
      return;
    }

    if (!inspector.trim()) {
      setValidationError(
        checklistType === 'VEICULO'
          ? 'Por favor, informe o nome do Condutor do Veículo.'
          : checklistType === 'DRONE'
          ? 'Por favor, informe o nome do Operador do Drone.'
          : 'Por favor, informe o nome do Responsável / Inspetor.'
      );
      return;
    }

    // Specific DRONE Validations: "todos os itens com a opção de imagem obrigatória"
    if (checklistType === 'DRONE') {
      if (!droneModel.trim()) {
        setValidationError('Por favor, informe a identificação / modelo do Drone.');
        return;
      }

      for (const t of currentTemplates) {
        const itemResp = itemsResponses[t.id];
        if (!itemResp || !itemResp.photoUrl) {
          setValidationError(`No Checklist de Drone, a imagem de cada item é obrigatória. Por favor, anexe a foto do item: "${t.description}".`);
          return;
        }
      }
    }

    // Specific VEICULO Validations
    if (checklistType === 'VEICULO') {
      if (!vehiclePlate) {
        setValidationError('Por favor, selecione a placa do veículo na lista suspensa.');
        return;
      }

      // Mandatory 4 visual angles: "e na avaliação visual obrigatoriamente exigir imagem dos 4 ângulos do veículo"
      if (!vehicleVisual.front || !vehicleVisual.rear || !vehicleVisual.leftSide || !vehicleVisual.rightSide) {
        const missing: string[] = [];
        if (!vehicleVisual.front) missing.push('Frente');
        if (!vehicleVisual.rear) missing.push('Traseira');
        if (!vehicleVisual.leftSide) missing.push('Lateral Esquerda');
        if (!vehicleVisual.rightSide) missing.push('Lateral Direita');
        setValidationError(`Na Avaliação Visual do Veículo, é obrigatório anexar as fotos dos 4 ângulos. Pendente(s): ${missing.join(', ')}.`);
        return;
      }

      // Mandatory screen signature: "no item responsável abrir a assinatura na tela"
      if (!signatureUrl) {
        setValidationError('É obrigatório coletar a assinatura na tela do Condutor/Responsável antes de salvar.');
        return;
      }
    }

    // Check if all items answered
    const unanswered = currentTemplates.filter(t => !itemsResponses[t.id] || itemsResponses[t.id].status === null);
    if (unanswered.length > 0) {
      setValidationError(`Existem ${unanswered.length} item(ns) pendentes de resposta. Por favor, avalie todos os itens.`);
      return;
    }

    // Determine summary status
    let statusSummary: 'CONFORME' | 'COM_PENDENCIAS' | 'CRITICO' = 'CONFORME';
    if (nonConformingCount > 2) {
      statusSummary = 'CRITICO';
    } else if (nonConformingCount > 0) {
      statusSummary = 'COM_PENDENCIAS';
    }

    const finalLocation = checklistType === 'DRONE'
      ? `Drone ${droneModel}`
      : (checklistType === 'VEICULO'
          ? `Veículo ${vehicleModel} (${vehiclePlate})`
          : (location.trim() || 'Instalação'));

    const itemsArray: ChecklistItemResponse[] = currentTemplates.map(t => {
      const resp = itemsResponses[t.id];
      return {
        itemId: t.id,
        description: t.description,
        requiresImage: t.requiresImage,
        status: resp?.status || 'C',
        notes: resp?.notes || '',
        photoUrl: resp?.photoUrl
      };
    });

    setIsSaving(true);
    try {
      const created = await addChecklist({
        id: checklistIdRef.current,
        type: checklistType,
        farm,
        location: finalLocation,
        date,
        time,
        inspector,
        shift,
        generalNotes,
        droneModel: checklistType === 'DRONE' ? droneModel : undefined,
        vehiclePlate: checklistType === 'VEICULO' ? vehiclePlate : undefined,
        vehicleModel: checklistType === 'VEICULO' ? vehicleModel : undefined,
        initialKm: checklistType === 'VEICULO' ? initialKm : undefined,
        finalKm: checklistType === 'VEICULO' ? finalKm : undefined,
        vehicleVisual: checklistType === 'VEICULO' ? vehicleVisual : undefined,
        signatureUrl: checklistType === 'VEICULO' ? signatureUrl : undefined,
        statusSummary,
        items: itemsArray,
        isDraft: false
      });

      if (onSuccess) {
        onSuccess(created);
      } else if (forcedType === 'VEICULO' || forcedType === 'DRONE') {
        setViewChecklistDetail(created);
        setActiveTab('fleet-updates');
      } else {
        setViewChecklistDetail(created);
        setActiveTab('checklists');
      }
    } catch (err: any) {
      console.error('Erro ao salvar checklist:', err);
      setValidationError(`Erro ao salvar checklist: ${err.message || 'Tente novamente.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={forcedType ? 'space-y-5 pb-8' : 'max-w-5xl mx-auto space-y-6 pb-16'}>
      {/* Top Header (hidden when embedded inside Atualização de Frota) */}
      {!forcedType && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setActiveTab('checklists')}
            className="inline-flex items-center text-sm font-semibold text-slate-600 hover:text-emerald-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Voltar para Histórico
          </button>
          <span className="text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full">
            Emissão de Checklist Técnico
          </span>
        </div>
      )}

      {validationError && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-start space-x-3 text-red-900 text-xs animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="block font-bold">Atenção ao preencher o Checklist:</strong>
            <p>{validationError}</p>
          </div>
        </div>
      )}

      {isProcessingPhoto && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center space-x-3 text-emerald-900 text-xs animate-pulse">
          <Camera className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Otimizando e comprimindo fotografia para sincronização rápida... Aguarde um instante.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Selection of Checklist Model and Farm */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
              {forcedType === 'VEICULO' ? (
                <Car className="w-5 h-5 text-cyan-700" />
              ) : forcedType === 'DRONE' ? (
                <Navigation className="w-5 h-5 text-indigo-700" />
              ) : (
                <ClipboardCheck className="w-5 h-5 text-emerald-600" />
              )}
              <span>
                {forcedType === 'VEICULO'
                  ? '1. Unidade & Identificação do Veículo / Frota'
                  : forcedType === 'DRONE'
                  ? '1. Unidade & Identificação do Drone Agrícola'
                  : '1. Escolha do Checklist Aplicável & Unidade'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {forcedType === 'VEICULO'
                ? 'Preencha os dados do veículo, quilometragem inicial/final, checklist de verificação, 4 fotos e assinatura.'
                : forcedType === 'DRONE'
                ? 'Preencha o modelo/prefixo do drone, operador e os 12 itens obrigatórios com foto.'
                : 'Defina o tipo de inspeção operacional e a fazenda de execução'}
            </p>
          </div>

          {/* Checklist Type Selector - 3 Operational Models (Veículo e Drone foram migrados para Frota) */}
          {!forcedType && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Checklist Aplicável: <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1: Sala de Máquinas */}
              <button
                type="button"
                onClick={() => handleTypeChange('SALA_DE_MAQUINAS')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer ${
                  checklistType === 'SALA_DE_MAQUINAS'
                    ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className={`p-2 rounded-lg self-start ${
                  checklistType === 'SALA_DE_MAQUINAS' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Gauge className="w-4 h-4" />
                </div>
                <div className="mt-2">
                  <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">Sala de Máquinas</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Compressores, amônia e câmaras (9 itens)</p>
                </div>
              </button>

              {/* 2: Gerador */}
              <button
                type="button"
                onClick={() => handleTypeChange('GERADOR')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer ${
                  checklistType === 'GERADOR'
                    ? 'border-amber-600 bg-amber-50/70 shadow-sm ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className={`p-2 rounded-lg self-start ${
                  checklistType === 'GERADOR' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Zap className="w-4 h-4" />
                </div>
                <div className="mt-2">
                  <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">Grupo Gerador</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Diesel, radiador e baterias (5 itens)</p>
                </div>
              </button>

              {/* 3: Irrigação */}
              <button
                type="button"
                onClick={() => handleTypeChange('IRRIGACAO')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer ${
                  checklistType === 'IRRIGACAO'
                    ? 'border-teal-600 bg-teal-50/70 shadow-sm ring-2 ring-teal-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className={`p-2 rounded-lg self-start ${
                  checklistType === 'IRRIGACAO' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Droplet className="w-4 h-4" />
                </div>
                <div className="mt-2">
                  <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">Irrigação</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Casa de bombas e filtragem (6 itens)</p>
                </div>
              </button>
              </div>
            </div>
          )}

          {/* Farm Selection Radio / Grid */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Fazenda: <span className="text-red-500">*</span></span>
              {isFarmLocked && (
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center">
                  🔒 Bloqueada para este operador
                </span>
              )}
            </label>
            {isFarmLocked ? (
              <div className="p-3.5 bg-emerald-50 border-2 border-emerald-500 rounded-xl flex items-center justify-between shadow-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-extrabold text-emerald-950 flex items-center">
                    <MapPin className="w-4 h-4 mr-1 text-emerald-600 inline" />
                    {lockedFarm}
                  </span>
                  <span className="text-xs text-emerald-700 font-medium hidden sm:inline">
                    (Acesso restrito individualizado para esta fazenda)
                  </span>
                </div>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded">
                  Modo Operador
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FARMS.map(f => (
                  <button
                    type="button"
                    key={f}
                    onClick={() => setFarm(f)}
                    className={`px-3 py-2.5 rounded-xl border text-sm font-bold transition-all text-center ${
                      farm === f
                        ? 'border-emerald-600 bg-emerald-700 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Type-Specific Identification Fields */}
          {checklistType === 'DRONE' && (
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-3 animate-in fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <Navigation className="w-4 h-4 text-blue-700" />
                  <h3 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                    Identificação da Aeronave / Drone
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowInlineNewDrone(prev => !prev);
                      setNewDroneError(null);
                    }}
                    className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-white px-2.5 py-1 rounded-lg border border-blue-200 transition-colors flex items-center cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    <span>Cadastrar Novo Drone</span>
                  </button>
                  {userRole === 'ADMIN' && (
                    <button
                      type="button"
                      onClick={() => setIsDroneModalOpen(true)}
                      className="text-xs font-bold text-slate-700 hover:text-blue-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer shadow-2xs"
                    >
                      Gerenciar ({drones.length})
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Drone / Modelo / Prefixo (Lista Suspensa): <span className="text-red-500">*</span>
                </label>
                <select
                  value={droneModel}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '__NEW_DRONE__') {
                      setShowInlineNewDrone(true);
                      setNewDroneError(null);
                    } else {
                      setDroneModel(val);
                      setShowInlineNewDrone(false);
                    }
                  }}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-bold focus:ring-2 focus:ring-blue-500"
                >
                  {drones.map(d => (
                    <option key={d.id} value={d.label}>
                      {d.label}
                    </option>
                  ))}
                  {droneModel && !drones.some(d => d.label === droneModel) && (
                    <option value={droneModel}>{droneModel}</option>
                  )}
                  <option value="__NEW_DRONE__">+ Cadastrar novo drone...</option>
                </select>
              </div>

              {showInlineNewDrone && (
                <div className="bg-white border border-blue-200 rounded-xl p-3.5 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-blue-900 uppercase tracking-wider flex items-center">
                      <Plus className="w-3.5 h-3.5 mr-1 text-blue-700" />
                      Novo Cadastro de Drone
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowInlineNewDrone(false);
                        setNewDroneError(null);
                      }}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>

                  {newDroneError && (
                    <p className="text-xs text-red-600 font-semibold bg-red-50 p-2 rounded-lg border border-red-200">
                      {newDroneError}
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Nome / Prefixo: <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newDroneName}
                        onChange={e => setNewDroneName(e.target.value)}
                        placeholder="Ex: Drone 03"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Modelo: <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newDroneModelName}
                        onChange={e => setNewDroneModelName(e.target.value.toUpperCase())}
                        placeholder="Ex: DJI T70P"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold uppercase text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowInlineNewDrone(false);
                        setNewDroneError(null);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveInlineDrone}
                      className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-2xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Salvar e Selecionar</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {checklistType === 'VEICULO' && (
            <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Car className="w-4 h-4 text-purple-700" />
                  <h3 className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                    Identificação do Veículo & Quilometragem
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsVehicleModalOpen(true)}
                  className="text-xs font-bold text-purple-700 hover:text-purple-900 bg-white px-2.5 py-1 rounded-lg border border-purple-200 transition-colors flex items-center cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  {userRole === 'ADMIN' ? 'Gerenciar / Cadastrar Placas' : 'Ver Placas'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Placa / Modelo (Lista Suspensa): <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={vehiclePlate}
                    onChange={e => {
                      const selPlate = e.target.value;
                      const found = vehicles.find(v => v.plate === selPlate);
                      if (found) {
                        setVehiclePlate(found.plate);
                        setVehicleModel(found.model);
                      } else {
                        setVehiclePlate(selPlate);
                      }
                    }}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Selecione o veículo na frota...</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.plate}>
                        {v.model} — {v.plate}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    KM Inicial: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={initialKm}
                    onChange={e => setInitialKm(e.target.value)}
                    placeholder="Ex: 45210"
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    KM Final:
                  </label>
                  <input
                    type="number"
                    value={finalKm}
                    onChange={e => setFinalKm(e.target.value)}
                    placeholder="Ex: 45350"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Date, Time, Inspector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data:
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hora:
              </label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Turno:
              </label>
              <select
                value={shift}
                onChange={e => setShift(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              >
                <option value="Manhã">Manhã</option>
                <option value="Tarde">Tarde</option>
                <option value="Noite">Noite</option>
                <option value="Madrugada">Madrugada</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {checklistType === 'VEICULO'
                  ? 'Condutor do Veículo:'
                  : checklistType === 'DRONE'
                  ? 'Operador do Drone:'
                  : 'Responsável / Inspetor:'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={inspector}
                onChange={e => setInspector(e.target.value)}
                placeholder="Ex: Carlos Eduardo"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          {checklistType !== 'DRONE' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {checklistType === 'VEICULO' ? 'Setor / Rota / Unidade:' : 'Local / Setor Específico:'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder={checklistType === 'VEICULO' ? 'Ex: Rota Vale das Uvas -> Petrolina ou Setor de Apoio' : 'Ex: Sala de Máquinas Central ou Casa de Bombas Setor 4'}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>
          )}
        </div>

        {/* Step 2: The Checklist Inspection Table */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
                <span>2. Itens a Verificar ({CHECKLIST_TYPE_LABELS[checklistType]})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {checklistType === 'VEICULO'
                  ? 'Marque SIM (Conforme) ou NÃO (Não Conforme) em cada item de segurança.'
                  : checklistType === 'DRONE'
                  ? 'Marque C (Conforme) ou N/C (Não Conforme). Foto obrigatória em todos os 12 itens.'
                  : 'Marque cada item como C (Conforme), N/C (Não Conforme) ou N/A (Não Aplicável).'}
              </p>
            </div>

            <div className="flex items-center space-x-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={markAllAsConforming}
                className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition-colors cursor-pointer flex items-center"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                Marcar Todos Conformes
              </button>
            </div>
          </div>

          {/* Banner for Drone Mandatory Photos */}
          {checklistType === 'DRONE' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center space-x-2.5 text-blue-900 text-xs">
              <Camera className="w-5 h-5 text-blue-700 shrink-0" />
              <span>
                <strong>Exigência Operacional Drone:</strong> É obrigatório anexar a fotografia comprovando a inspeção de cada um dos 12 itens do drone.
              </span>
            </div>
          )}

          {/* Items List */}
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {currentTemplates.map((item, idx) => {
              const resp = itemsResponses[item.id] || {
                itemId: item.id,
                description: item.description,
                status: null,
                requiresImage: item.requiresImage
              };
              const isNonConforming = resp.status === 'N/C';
              const isConforming = resp.status === 'C';
              const isNA = resp.status === 'N/A';
              const fileInputId = `photo_input_${item.id}`;
              const isDrone = checklistType === 'DRONE';
              const isMandatoryPhoto = isDrone || item.requiresImage;

              return (
                <div
                  key={item.id}
                  className={`p-4 transition-colors ${
                    isNonConforming
                      ? 'bg-red-50/40'
                      : isConforming
                      ? 'bg-emerald-50/20'
                      : 'hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          #{idx + 1}
                        </span>
                        {item.category && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {item.category}
                          </span>
                        )}
                        {isMandatoryPhoto && (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 flex items-center">
                            <Camera className="w-3 h-3 mr-0.5 text-blue-700" />
                            Foto Obrigatória
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {item.description}
                      </h4>
                    </div>

                    {/* Action Status Buttons */}
                    <div className="flex items-center space-x-1.5 self-start lg:self-center shrink-0">
                      {/* Button C (Conforme / SIM) */}
                      <button
                        type="button"
                        onClick={() => handleStatusChange(item.id, 'C')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center space-x-1 ${
                          isConforming
                            ? 'bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-500/20'
                            : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{checklistType === 'VEICULO' ? 'SIM' : 'C'}</span>
                      </button>

                      {/* Button N/C (Não Conforme / NÃO) */}
                      <button
                        type="button"
                        onClick={() => handleStatusChange(item.id, 'N/C')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center space-x-1 ${
                          isNonConforming
                            ? 'bg-red-600 text-white shadow-xs ring-2 ring-red-500/20'
                            : 'bg-slate-100 text-slate-700 hover:bg-red-50 hover:text-red-700'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{checklistType === 'VEICULO' ? 'NÃO' : 'N/C'}</span>
                      </button>

                      {/* Button N/A (Only for industrial checklists) */}
                      {checklistType !== 'VEICULO' && checklistType !== 'DRONE' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.id, 'N/A')}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isNA
                              ? 'bg-slate-700 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          N/A
                        </button>
                      )}

                      {/* Photo Attachment Button */}
                      <div>
                        <input
                          type="file"
                          id={fileInputId}
                          accept="image/*"
                          capture="environment"
                          onChange={e => handleImageUpload(item.id, e)}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => document.getElementById(fileInputId)?.click()}
                          className={`p-2 rounded-lg transition-colors cursor-pointer flex items-center ${
                            resp.photoUrl
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : isMandatoryPhoto
                              ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-300'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                          title="Anexar Foto de Evidência"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Photo Thumbnail Preview */}
                  {resp.photoUrl && (
                    <div className="mt-3 flex items-center space-x-3 p-2 bg-white rounded-lg border border-slate-200 w-fit">
                      <div
                        onClick={() => setPreviewImage({ url: resp.photoUrl!, title: item.description })}
                        className="w-14 h-14 rounded-md overflow-hidden bg-slate-100 cursor-pointer border border-slate-300 group relative"
                      >
                        <img src={resp.photoUrl} alt="Foto" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-emerald-800 flex items-center">
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Foto Anexada
                        </span>
                        <button
                          type="button"
                          onClick={() => removePhoto(item.id)}
                          className="text-[11px] font-semibold text-red-600 hover:underline cursor-pointer"
                        >
                          Remover Foto
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Observações / Apontamento */}
                  {(isNonConforming || resp.notes) && (
                    <div className="mt-3">
                      <input
                        type="text"
                        placeholder="Descreva a não conformidade ou observação técnica..."
                        value={resp.notes || ''}
                        onChange={e => handleNotesChange(item.id, e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-red-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 3: Vehicle Specific Steps (Visual Evaluation of 4 Angles & Screen Signature) */}
        {checklistType === 'VEICULO' && (
          <div className="space-y-6">
            {/* 3A: Avaliação Visual Obrigatória dos 4 Ângulos */}
            <VehicleVisualEvaluation
              value={vehicleVisual}
              onChange={setVehicleVisual}
              onPreview={(url, title) => setPreviewImage({ url, title })}
            />

            {/* 3B: Assinatura na Tela do Condutor/Responsável */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
              <SignaturePad
                signatureUrl={signatureUrl}
                onSave={setSignatureUrl}
                onClear={() => setSignatureUrl(undefined)}
                driverName={inspector}
                required={true}
              />
            </div>
          </div>
        )}

        {/* Step 4: General Notes */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-3">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Observações Gerais da Inspeção:
          </label>
          <textarea
            rows={3}
            value={generalNotes}
            onChange={e => setGeneralNotes(e.target.value)}
            placeholder="Comentários adicionais sobre as condições gerais de operação, testes ou recomendações..."
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium leading-relaxed"
          />
        </div>

        {/* Bottom Submission Bar */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="text-xs text-slate-600">
              Progresso: <strong>{answeredItems} de {totalItems}</strong> respondidos
              <div className="w-36 sm:w-48 bg-slate-100 rounded-full h-2 mt-1 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all"
                  style={{ width: `${totalItems > 0 ? (answeredItems / totalItems) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 self-end sm:self-auto">
            {!leanMode && (
              <button
                type="button"
                onClick={() => {
                  if (onCancel) onCancel();
                  else setActiveTab(forcedType === 'VEICULO' || forcedType === 'DRONE' ? 'fleet-updates' : 'checklists');
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Salvando e Registrando...' : 'Finalizar e Gravar Checklist'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Vehicle Manager Modal for Admins */}
      <VehicleManagerModal
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
        onSelectVehicle={(plate, model) => {
          handleSelectVehicle(plate, model);
          setIsVehicleModalOpen(false);
        }}
      />

      {/* Drone Manager Modal */}
      <DroneManagerModal
        isOpen={isDroneModalOpen}
        onClose={() => setIsDroneModalOpen(false)}
        onSelectDrone={(label) => {
          setDroneModel(label);
          setShowInlineNewDrone(false);
          setIsDroneModalOpen(false);
        }}
      />
    </div>
  );
};
