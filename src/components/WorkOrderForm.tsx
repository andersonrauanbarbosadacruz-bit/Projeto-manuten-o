import React, { useState, useEffect, useRef } from 'react';
import { 
  Wrench, 
  Camera, 
  Trash2, 
  Plus, 
  Save, 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  Building2, 
  AlertTriangle, 
  Layers, 
  Eye, 
  CheckCircle2, 
  ShieldCheck,
  FileText
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { compressImage } from '../utils/imageCompressor';
import { 
  Farm, 
  FARMS, 
  WorkOrderStatus, 
  WorkOrderPriority, 
  MaintenanceType,
  MaterialItem, 
  WorkOrderPhoto 
} from '../types';

export const WorkOrderForm: React.FC = () => {
  const { 
    selectedFarmFilter, 
    lockedFarm,
    isFarmLocked,
    addWorkOrder, 
    setActiveTab, 
    setViewWorkOrderDetail, 
    setPreviewImage,
    prefilledWorkOrder,
    setPrefilledWorkOrder,
    autoSaveDraft
  } = useApp();

  const now = new Date();
  const defaultDate = now.toISOString().split('T')[0];
  const defaultTime = now.toTimeString().substring(0, 5);

  const initialFarm: Farm = lockedFarm || (selectedFarmFilter !== 'TODAS' ? selectedFarmFilter : 'Vale das Uvas');

  // Form states
  const [farm, setFarm] = useState<Farm>(lockedFarm || prefilledWorkOrder?.farm || initialFarm);

  useEffect(() => {
    if (lockedFarm) {
      setFarm(lockedFarm);
    }
  }, [lockedFarm]);
  const [equipment, setEquipment] = useState(prefilledWorkOrder?.equipment || '');
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>(
    prefilledWorkOrder?.maintenanceType || 'CORRETIVA'
  );
  const [date, setDate] = useState(prefilledWorkOrder?.date || defaultDate);
  const [time, setTime] = useState(prefilledWorkOrder?.time || defaultTime);
  const [location, setLocation] = useState(prefilledWorkOrder?.location || '');
  const [responsible, setResponsible] = useState(prefilledWorkOrder?.responsible || '');
  
  // Terceiro: pode ser "Não / Equipe Interna" ou o nome da empresa prestadora
  const [isThirdParty, setIsThirdParty] = useState(prefilledWorkOrder?.isThirdParty || false);
  const [thirdPartyName, setThirdPartyName] = useState(
    prefilledWorkOrder?.thirdParty && prefilledWorkOrder.thirdParty !== 'Não / Equipe Interna'
      ? prefilledWorkOrder.thirdParty
      : ''
  );

  const [problemDescription, setProblemDescription] = useState(prefilledWorkOrder?.problemDescription || '');
  const [priority, setPriority] = useState<WorkOrderPriority>(prefilledWorkOrder?.priority || 'MEDIA');
  const [status, setStatus] = useState<WorkOrderStatus>(prefilledWorkOrder?.status || 'ABERTA');
  const [completionDate, setCompletionDate] = useState(prefilledWorkOrder?.completionDate || '');
  const [completionTime, setCompletionTime] = useState(prefilledWorkOrder?.completionTime || '');
  const [solutionDescription, setSolutionDescription] = useState(prefilledWorkOrder?.solutionDescription || '');

  // Materials
  const [materials, setMaterials] = useState<MaterialItem[]>(prefilledWorkOrder?.materials || []);
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialQty, setNewMaterialQty] = useState<number>(1);
  const [newMaterialUnit, setNewMaterialUnit] = useState('un');

  // Photos Before & After
  const [photosBefore, setPhotosBefore] = useState<WorkOrderPhoto[]>(prefilledWorkOrder?.photosBefore || []);
  const [photosAfter, setPhotosAfter] = useState<WorkOrderPhoto[]>(prefilledWorkOrder?.photosAfter || []);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);
  const osIdRef = useRef<string>(prefilledWorkOrder?.id || `os_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);

  // If prefilledWorkOrder changes, update state
  useEffect(() => {
    if (prefilledWorkOrder) {
      if (prefilledWorkOrder.farm) setFarm(prefilledWorkOrder.farm);
      if (prefilledWorkOrder.equipment) setEquipment(prefilledWorkOrder.equipment);
      if (prefilledWorkOrder.maintenanceType) setMaintenanceType(prefilledWorkOrder.maintenanceType);
      if (prefilledWorkOrder.date) setDate(prefilledWorkOrder.date);
      if (prefilledWorkOrder.time) setTime(prefilledWorkOrder.time);
      if (prefilledWorkOrder.location) setLocation(prefilledWorkOrder.location);
      if (prefilledWorkOrder.responsible) setResponsible(prefilledWorkOrder.responsible);
      if (prefilledWorkOrder.problemDescription) setProblemDescription(prefilledWorkOrder.problemDescription);
      if (prefilledWorkOrder.priority) setPriority(prefilledWorkOrder.priority);
      if (prefilledWorkOrder.photosBefore) setPhotosBefore(prefilledWorkOrder.photosBefore);
      if (prefilledWorkOrder.completionDate) setCompletionDate(prefilledWorkOrder.completionDate);
      if (prefilledWorkOrder.completionTime) setCompletionTime(prefilledWorkOrder.completionTime);
    }
  }, [prefilledWorkOrder]);

  // Live draft auto-save to central server so Admin sees phone input in real time
  const triggerAutoSave = (curBefore = photosBefore, curAfter = photosAfter, curMaterials = materials) => {
    if (!equipment.trim() && !problemDescription.trim() && !location.trim()) return;

    autoSaveDraft('work-order', {
      id: osIdRef.current,
      farm,
      equipment: equipment.trim() || 'Equipamento em preenchimento...',
      maintenanceType,
      date,
      time,
      location: location.trim() || 'Local em preenchimento...',
      responsible: responsible.trim() || 'Operador',
      thirdParty: isThirdParty ? (thirdPartyName.trim() || 'Terceiro') : 'Não / Equipe Interna',
      isThirdParty,
      problemDescription: problemDescription.trim() || 'Rascunho em preenchimento no celular...',
      materials: curMaterials,
      photosBefore: curBefore,
      photosAfter: curAfter,
      status: 'EM_ANDAMENTO',
      priority,
      solutionDescription,
      completionDate: completionDate.trim() || undefined,
      completionTime: completionTime.trim() || undefined,
      checklistSourceId: prefilledWorkOrder?.checklistSourceId,
      checklistItemDescription: prefilledWorkOrder?.checklistItemDescription,
      serviceRequestId: prefilledWorkOrder?.serviceRequestId,
      serviceRequestCode: prefilledWorkOrder?.serviceRequestCode,
      requesterName: prefilledWorkOrder?.requesterName
    });
  };

  const handleAddMaterial = () => {
    if (!newMaterialName.trim()) return;
    const newMat: MaterialItem = {
      id: `mat_${Date.now()}`,
      name: newMaterialName.trim(),
      quantity: Number(newMaterialQty) || 1,
      unit: newMaterialUnit
    };
    const updated = [...materials, newMat];
    setMaterials(updated);
    setNewMaterialName('');
    setNewMaterialQty(1);
    setNewMaterialUnit('un');
    triggerAutoSave(photosBefore, photosAfter, updated);
  };

  const handleRemoveMaterial = (id: string) => {
    const updated = materials.filter(m => m.id !== id);
    setMaterials(updated);
    triggerAutoSave(photosBefore, photosAfter, updated);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isAfter: boolean) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingPhoto(true);
    setValidationError(null);

    try {
      const processed: WorkOrderPhoto[] = [];
      for (const file of Array.from(files)) {
        // Compress smartphone camera photo to lightweight high-quality JPEG (~80-120KB)
        const compressedUrl = await compressImage(file, 1200, 1200, 0.72);
        processed.push({
          id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          url: compressedUrl,
          caption: isAfter ? 'Registro fotográfico pós-execução' : 'Registro fotográfico pré-execução',
          timestamp: `${date} ${time}`
        });
      }

      if (isAfter) {
        setPhotosAfter(prev => {
          const next = [...prev, ...processed];
          triggerAutoSave(photosBefore, next);
          return next;
        });
      } else {
        setPhotosBefore(prev => {
          const next = [...prev, ...processed];
          triggerAutoSave(next, photosAfter);
          return next;
        });
      }
    } catch (err) {
      console.error('Erro ao processar foto:', err);
      setValidationError('Ocorreu um erro ao processar a foto. Tente novamente.');
    } finally {
      setIsProcessingPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  const removePhoto = (id: string, isAfter: boolean) => {
    if (isAfter) {
      setPhotosAfter(prev => {
        const next = prev.filter(p => p.id !== id);
        triggerAutoSave(photosBefore, next);
        return next;
      });
    } else {
      setPhotosBefore(prev => {
        const next = prev.filter(p => p.id !== id);
        triggerAutoSave(next, photosAfter);
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!equipment.trim()) {
      setValidationError('Por favor, informe o equipamento ou maquinário que passará por manutenção.');
      return;
    }
    if (!location.trim()) {
      setValidationError('Por favor, informe o local específico da intervenção.');
      return;
    }
    if (!responsible.trim()) {
      setValidationError('Por favor, informe o colaborador ou técnico responsável.');
      return;
    }
    if (!problemDescription.trim()) {
      setValidationError('Por favor, descreva detalhadamente o problema a ser resolvido.');
      return;
    }

    const thirdPartyFinal = isThirdParty 
      ? (thirdPartyName.trim() || 'Terceiro Não Especificado') 
      : 'Não / Equipe Interna';

    const finalCompletionDate = status === 'CONCLUIDA'
      ? (completionDate.trim() || date)
      : (completionDate.trim() || undefined);

    const finalCompletionTime = status === 'CONCLUIDA'
      ? (completionTime.trim() || time)
      : (completionTime.trim() || undefined);

    setIsSaving(true);
    try {
      const created = await addWorkOrder({
        id: osIdRef.current,
        farm,
        equipment: equipment.trim(),
        maintenanceType,
        date,
        time,
        location,
        responsible,
        thirdParty: thirdPartyFinal,
        isThirdParty,
        problemDescription,
        materials,
        photosBefore,
        photosAfter,
        status,
        priority,
        solutionDescription,
        completionDate: finalCompletionDate,
        completionTime: finalCompletionTime,
        checklistSourceId: prefilledWorkOrder?.checklistSourceId,
        checklistItemDescription: prefilledWorkOrder?.checklistItemDescription,
        serviceRequestId: prefilledWorkOrder?.serviceRequestId,
        serviceRequestCode: prefilledWorkOrder?.serviceRequestCode,
        requesterName: prefilledWorkOrder?.requesterName
      });

      // Clear prefill and navigate
      setPrefilledWorkOrder(null);
      setViewWorkOrderDetail(created);
      setActiveTab('work-orders');
    } catch (err: any) {
      console.error('Erro ao finalizar OS:', err);
      setValidationError(`Erro ao salvar: ${err.message || 'Verifique os dados e tente novamente.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            setPrefilledWorkOrder(null);
            setActiveTab('work-orders');
          }}
          className="inline-flex items-center text-sm font-semibold text-slate-600 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Voltar para Ordens de Serviço
        </button>

        <span className="text-xs font-bold px-3 py-1 bg-amber-100 text-amber-900 rounded-full">
          Abertura de Ordem de Serviço (OS)
        </span>
      </div>

      {prefilledWorkOrder?.checklistItemDescription && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start space-x-3 text-amber-900 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>OS Originada de Não Conformidade em Checklist:</strong>
            <p className="mt-0.5">
              Item apontado: <em>"{prefilledWorkOrder.checklistItemDescription}"</em>. Os campos principais foram pré-carregados automaticamente.
            </p>
          </div>
        </div>
      )}

      {prefilledWorkOrder?.serviceRequestCode && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex items-start space-x-3 text-emerald-950 text-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <strong>OS Vinculada à Solicitação de Serviço {prefilledWorkOrder.serviceRequestCode}:</strong>
            <p className="mt-0.5">
              Solicitante: <strong>{prefilledWorkOrder.requesterName || 'Não informado'}</strong>. Ao salvar esta OS, o vínculo ficará registrado automaticamente na solicitação.
            </p>
          </div>
        </div>
      )}

      {validationError && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-start space-x-3 text-red-900 text-xs animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="block font-bold">Atenção ao preencher a Ordem de Serviço:</strong>
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
        {/* Step 1: Identification & Location */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
              <Wrench className="w-5 h-5 text-amber-600" />
              <span>1. Informações Básicas da Ordem de Serviço</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Unidade agrícola, data, hora e responsáveis pela intervenção
            </p>
          </div>

          {/* Farm selector */}
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

          {/* Tipo de Manutenção: Preventiva ou Corretiva */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Tipo de Manutenção: <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMaintenanceType('PREVENTIVA')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-start space-x-3 cursor-pointer ${
                  maintenanceType === 'PREVENTIVA'
                    ? 'border-emerald-600 bg-emerald-50/80 shadow-xs ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className={`p-2 rounded-lg ${
                  maintenanceType === 'PREVENTIVA' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-slate-900 text-sm">
                      Manutenção Preventiva
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Programada
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Revisão periódica, troca de óleo, lubrificação e inspeções preventivas
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMaintenanceType('CORRETIVA')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-start space-x-3 cursor-pointer ${
                  maintenanceType === 'CORRETIVA'
                    ? 'border-amber-500 bg-amber-50/80 shadow-xs ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className={`p-2 rounded-lg ${
                  maintenanceType === 'CORRETIVA' ? 'bg-amber-500 text-stone-950' : 'bg-slate-100 text-slate-600'
                }`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-slate-900 text-sm">
                      Manutenção Corretiva
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                      Reparo de Falha
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Conserto de quebra, vazamento, ruído anormal ou defeito de checklist
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Equipamento */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Equipamento para Manutenção: <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Toque em uma sugestão abaixo ou digite
              </span>
            </div>
            <input
              type="text"
              value={equipment}
              onChange={e => setEquipment(e.target.value)}
              placeholder="Ex: Compressor Frigorífico nº 02, Bomba de Irrigação 75CV, Gerador..."
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />

            {/* Quick Suggestion Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[
                'Compressor Frigorífico',
                'Bomba de Amônia',
                'Condensador Evaporativo',
                'Bomba de Irrigação 75CV',
                'Quadro Elétrico Geral',
                'Grupo Gerador Diesel',
                'Válvula Ventosa / Redutora',
                'Tubulação / Manifold'
              ].map(item => (
                <button
                  type="button"
                  key={item}
                  onClick={() => setEquipment(item)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  + {item}
                </button>
              ))}
            </div>
          </div>

          {/* Cronograma do Serviço: Início e Conclusão */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                <Calendar className="w-4 h-4 mr-1.5 text-emerald-700" />
                Cronograma de Execução: Início e Conclusão do Serviço
              </span>
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                Registro de data e hora do início e do término
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Início do Serviço */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                <span className="text-xs font-extrabold text-slate-800 flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Início do Serviço:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Data Inicial <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      required
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Horário Inicial <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={time}
                      onChange={e => setTime(e.target.value)}
                      required
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Conclusão do Serviço */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800 flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Conclusão do Serviço:
                  </span>
                  {completionDate && (
                    <button
                      type="button"
                      onClick={() => {
                        setCompletionDate('');
                        setCompletionTime('');
                        if (status === 'CONCLUIDA') setStatus('EM_ANDAMENTO');
                      }}
                      className="text-[10px] text-red-600 hover:underline cursor-pointer"
                    >
                      Limpar Conclusão
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Data de Conclusão {status === 'CONCLUIDA' && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="date"
                      value={completionDate}
                      onChange={e => {
                        setCompletionDate(e.target.value);
                        if (e.target.value && !completionTime) setCompletionTime(defaultTime);
                      }}
                      placeholder="dd/mm/aaaa"
                      required={status === 'CONCLUIDA'}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Horário de Conclusão {status === 'CONCLUIDA' && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="time"
                      value={completionTime}
                      onChange={e => setCompletionTime(e.target.value)}
                      placeholder="--:--"
                      required={status === 'CONCLUIDA'}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Prioridade e Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Prioridade do Serviço:
                </label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 font-semibold"
                >
                  <option value="BAIXA">Baixa</option>
                  <option value="MEDIA">Média</option>
                  <option value="ALTA">Alta</option>
                  <option value="URGENTE">Urgente 🚨</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status Atual da OS:
                </label>
                <select
                  value={status}
                  onChange={e => {
                    const newStatus = e.target.value as WorkOrderStatus;
                    setStatus(newStatus);
                    if (newStatus === 'CONCLUIDA') {
                      if (!completionDate) setCompletionDate(defaultDate);
                      if (!completionTime) setCompletionTime(defaultTime);
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 font-semibold"
                >
                  <option value="ABERTA">Aberta</option>
                  <option value="EM_ANDAMENTO">Em Andamento</option>
                  <option value="CONCLUIDA">Concluída</option>
                </select>
              </div>
            </div>
          </div>

          {/* Location and Responsible */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Local / Setor Específico: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Ex: Compressor 02 da Sala de Máquinas Central ou Pivô 4 Setor Norte"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Responsável Interno: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={responsible}
                onChange={e => setResponsible(e.target.value)}
                placeholder="Ex: João Batista (Mecânico Chefe)"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Terceiro / Prestador Externo */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Envolve Empresa Terceira / Prestador Externo?
                </span>
                <p className="text-xs text-slate-500">
                  Defina se o serviço é executado internamente ou por empresa especializada
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsThirdParty(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    !isThirdParty 
                      ? 'bg-emerald-700 text-white shadow-2xs' 
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Não (Equipe Interna)
                </button>
                <button
                  type="button"
                  onClick={() => setIsThirdParty(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    isThirdParty 
                      ? 'bg-amber-600 text-white shadow-2xs' 
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Sim (Terceirizado)
                </button>
              </div>
            </div>

            {isThirdParty && (
              <div className="pt-2 animate-in fade-in duration-150">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome da Empresa Terceira / Técnico Prestador: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={thirdPartyName}
                  onChange={e => setThirdPartyName(e.target.value)}
                  placeholder="Ex: Lubrifrios Refrigeração Industrial Ltda / EletroBombas"
                  required={isThirdParty}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Problem Description & Materials */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              <span>2. Descrição Detalhada do Problema & Materiais Utilizados</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Detalhes técnicos da falha, causas aparentes e insumos necessários
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Descrição Detalhada do Problema: <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={problemDescription}
              onChange={e => setProblemDescription(e.target.value)}
              placeholder="Descreva minunciosamente o sintoma observado, equipamentos afetados, ruídos estranhos, vazamentos, superaquecimento, medições anormais..."
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Materials Section */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Material Utilizado / Peças Trocadas:
            </label>

            {/* Material Add Bar */}
            <div className="flex flex-col sm:flex-row gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <input
                type="text"
                value={newMaterialName}
                onChange={e => setNewMaterialName(e.target.value)}
                placeholder="Nome da peça ou material (ex: Óleo Sintético VG 68, Veda-rosca, Rolamento 6205...)"
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />

              <div className="flex space-x-2">
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  value={newMaterialQty}
                  onChange={e => setNewMaterialQty(parseFloat(e.target.value))}
                  placeholder="Qtd"
                  className="w-20 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 text-center"
                />

                <select
                  value={newMaterialUnit}
                  onChange={e => setNewMaterialUnit(e.target.value)}
                  className="w-24 px-2 py-2 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="un">un (unidade)</option>
                  <option value="Litros">Litros</option>
                  <option value="m">m (metros)</option>
                  <option value="kg">kg (quilos)</option>
                  <option value="cj">cj (conjunto)</option>
                  <option value="rolos">rolos</option>
                  <option value="cx">cx (caixa)</option>
                </select>

                <button
                  type="button"
                  onClick={handleAddMaterial}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center shrink-0 shadow-2xs"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </button>
              </div>
            </div>

            {/* Materials List Table */}
            {materials.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {materials.map(mat => (
                  <div key={mat.id} className="p-2.5 px-4 flex items-center justify-between text-xs bg-white">
                    <span className="font-semibold text-slate-900">{mat.name}</span>
                    <div className="flex items-center space-x-3">
                      <span className="bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-slate-700">
                        {mat.quantity} {mat.unit}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMaterial(mat.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remover material"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Photos Before & After */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
              <Camera className="w-5 h-5 text-emerald-600" />
              <span>3. Anexo de Fotos Antes e Depois da Execução</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprovação fotográfica exigida para auditoria e controle de qualidade técnica
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Fotos ANTES */}
            <div className="space-y-3 p-4 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/20">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold text-amber-900 uppercase tracking-wider block">
                    📸 Fotos ANTES da Execução
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Registro do defeito ou condição inicial
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => beforeInputRef.current?.click()}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs shadow-2xs cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Adicionar Foto</span>
                </button>

                <input
                  type="file"
                  ref={beforeInputRef}
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={e => handlePhotoUpload(e, false)}
                  className="hidden"
                />
              </div>

              {photosBefore.length === 0 ? (
                <div className="h-32 rounded-lg border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 text-center p-3">
                  <Camera className="w-6 h-6 mb-1 text-slate-300" />
                  <p className="text-xs font-medium">Nenhuma foto do ANTES anexada</p>
                  <p className="text-[10px] text-slate-400">Clique no botão para tirar foto ou carregar arquivo</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {photosBefore.map(photo => (
                    <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-white">
                      <img
                        src={photo.url}
                        alt="Foto Antes"
                        className="w-full h-24 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ url: photo.url, title: 'Foto Antes da Execução' })}
                          className="p-1 bg-white text-slate-800 rounded-md hover:bg-slate-100"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removePhoto(photo.id, false)}
                          className="p-1 bg-red-600 text-white rounded-md hover:bg-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fotos DEPOIS */}
            <div className="space-y-3 p-4 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/20">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider block">
                    ✨ Fotos DEPOIS da Execução
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Registro do reparo concluído e testado
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => afterInputRef.current?.click()}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-2xs cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Adicionar Foto</span>
                </button>

                <input
                  type="file"
                  ref={afterInputRef}
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={e => handlePhotoUpload(e, true)}
                  className="hidden"
                />
              </div>

              {photosAfter.length === 0 ? (
                <div className="h-32 rounded-lg border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 text-center p-3">
                  <Camera className="w-6 h-6 mb-1 text-slate-300" />
                  <p className="text-xs font-medium">Nenhuma foto do DEPOIS anexada</p>
                  <p className="text-[10px] text-slate-400">Pode ser adicionada agora ou no fechamento da OS</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {photosAfter.map(photo => (
                    <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-white">
                      <img
                        src={photo.url}
                        alt="Foto Depois"
                        className="w-full h-24 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ url: photo.url, title: 'Foto Depois da Execução' })}
                          className="p-1 bg-white text-slate-800 rounded-md hover:bg-slate-100"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removePhoto(photo.id, true)}
                          className="p-1 bg-red-600 text-white rounded-md hover:bg-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Solution Description / Fechamento */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Solução Aplicada / Relatório de Encerramento (Opcional se em aberto):
            </label>
            <textarea
              rows={3}
              value={solutionDescription}
              onChange={e => setSolutionDescription(e.target.value)}
              placeholder="Descreva as ações realizadas para sanar a anomalia (ex: 'Substituído anel de vedação, reapertados os parafusos flangeados e realizado teste de carga por 30 minutos sem anomalias')."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              * Todos os dados e fotos ficam salvos localmente
            </span>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => {
                  setPrefilledWorkOrder(null);
                  setActiveTab('work-orders');
                }}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-stone-950 font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
                    <span>Salvando na Base...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Salvar Ordem de Serviço</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
