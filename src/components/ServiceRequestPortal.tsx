import React, { useState, useRef, useMemo } from 'react';
import {
  Calendar,
  Clock,
  User,
  MapPin,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Camera,
  Trash2,
  Send,
  FileText,
  PlusCircle,
  Lock,
  WifiOff,
  BellRing,
  RefreshCw,
  ListOrdered
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FARMS, Farm, ServiceRequest } from '../types';
import { compressImage } from '../utils/imageCompressor';
import {
  buildFarmServiceQueue,
  getServiceRequestQueueInfo,
  QueuedServiceRequest
} from '../utils/serviceRequestQueue';

interface ServiceRequestPortalProps {
  embedded?: boolean;
}

export const ServiceRequestPortal: React.FC<ServiceRequestPortalProps> = ({ embedded = false }) => {
  const {
    lockedFarm,
    isFarmLocked,
    selectedFarmFilter,
    addServiceRequest,
    serviceRequests,
    mySubmittedRequestIds,
    isOnline,
    isSyncing,
    syncNow,
    setPreviewImage
  } = useApp();

  const now = new Date();
  const [date, setDate] = useState(now.toISOString().split('T')[0]);
  const [time, setTime] = useState(now.toTimeString().substring(0, 5));
  const [requesterName, setRequesterName] = useState('');
  const [requesterSector, setRequesterSector] = useState('');
  const [farm, setFarm] = useState<Farm>(
    lockedFarm || (selectedFarmFilter !== 'TODAS' ? selectedFarmFilter : 'Vale das Uvas')
  );
  const [location, setLocation] = useState('');
  const [equipment, setEquipment] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedRequest, setSubmittedRequest] = useState<ServiceRequest | null>(null);
  const [portalTab, setPortalTab] = useState<'FORM' | 'FARM_PENDING' | 'HISTORY'>('FORM');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeFarm: Farm = lockedFarm || farm;

  // Farm queue calculation: Urgent validated first, Normal validated after, unvalidated awaiting triage
  const {
    farmQueueEntries,
    orderedFarmPending,
    farmAwaitingValidationCount,
    farmQueuedUrgentCount,
    farmQueuedNormalCount,
    farmInExecutionCount,
    farmConcludedCount
  } = useMemo(() => {
    const entries = buildFarmServiceQueue(serviceRequests, activeFarm);
    const awaitingValidation = entries.filter(
      e => !e.isValidated && (e.request.status === 'PENDENTE' || e.request.status === 'EM_ATENDIMENTO')
    );
    const inQueue = entries
      .filter(e => e.inQueue && e.queuePosition !== null)
      .sort((a, b) => (a.queuePosition || 0) - (b.queuePosition || 0));
    const inExec = entries.filter(e => e.request.status === 'OS_GERADA');
    const concluded = entries.filter(e => e.request.status === 'CONCLUIDA');

    return {
      farmQueueEntries: entries,
      orderedFarmPending: [...inQueue, ...awaitingValidation, ...inExec],
      farmAwaitingValidationCount: awaitingValidation.length,
      farmQueuedUrgentCount: inQueue.filter(e => e.request.urgency === 'URGENTE').length,
      farmQueuedNormalCount: inQueue.filter(e => e.request.urgency !== 'URGENTE').length,
      farmInExecutionCount: inExec.length,
      farmConcludedCount: concluded.length
    };
  }, [serviceRequests, activeFarm]);

  const myRequestsWithQueue: QueuedServiceRequest[] = useMemo(() => {
    const idSet = new Set(mySubmittedRequestIds);
    return serviceRequests
      .filter(sr => idSet.has(sr.id))
      .map(sr => getServiceRequestQueueInfo(serviceRequests, sr));
  }, [serviceRequests, mySubmittedRequestIds]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingPhoto(true);
    setErrorMsg(null);
    try {
      const processed: string[] = [];
      for (const file of Array.from(files).slice(0, 4)) {
        const compressed = await compressImage(file, 1100, 1100, 0.72);
        processed.push(compressed);
      }
      setPhotos(prev => [...prev, ...processed].slice(0, 4));
    } catch {
      setErrorMsg('Não foi possível processar a imagem selecionada. Tente novamente.');
    } finally {
      setIsProcessingPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, idx) => idx !== index));
  };

  const resetForm = () => {
    const fresh = new Date();
    setDate(fresh.toISOString().split('T')[0]);
    setTime(fresh.toTimeString().substring(0, 5));
    setLocation('');
    setEquipment('');
    setProblemDescription('');
    setPhotos([]);
    setErrorMsg(null);
    setSubmittedRequest(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!date) {
      setErrorMsg('Informe a data da solicitação.');
      return;
    }
    if (!time) {
      setErrorMsg('Informe a hora da solicitação.');
      return;
    }
    if (!requesterName.trim()) {
      setErrorMsg('Informe o nome do solicitante.');
      return;
    }
    if (!equipment.trim()) {
      setErrorMsg('Informe o equipamento com problema.');
      return;
    }
    if (!location.trim()) {
      setErrorMsg('Informe o local onde o equipamento se encontra.');
      return;
    }
    if (!problemDescription.trim()) {
      setErrorMsg('Descreva o problema ou serviço necessário.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await addServiceRequest({
        date,
        time,
        requesterName: requesterName.trim(),
        requesterSector: requesterSector.trim() || undefined,
        farm: lockedFarm || farm,
        location: location.trim(),
        equipment: equipment.trim(),
        problemDescription: problemDescription.trim(),
        priorityValidated: false,
        photos
      });
      setSubmittedRequest(created);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao registrar solicitação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusLabel = (status: ServiceRequest['status']) => {
    switch (status) {
      case 'PENDENTE':
        return { text: 'Aguardando Técnico', cls: 'bg-amber-100 text-amber-900 border-amber-300' };
      case 'EM_ATENDIMENTO':
        return { text: 'Em Análise Técnica', cls: 'bg-blue-100 text-blue-900 border-blue-300' };
      case 'OS_GERADA':
        return { text: 'OS Gerada / Em Execução', cls: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
      case 'CONCLUIDA':
        return { text: 'Serviço Concluído', cls: 'bg-slate-200 text-slate-800 border-slate-300' };
      case 'CANCELADA':
        return { text: 'Cancelada', cls: 'bg-red-100 text-red-800 border-red-300' };
    }
  };

  const content = (
    <div className="space-y-4">
        {/* Farm Pending Execution Counter Banner */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 shrink-0">
                <BellRing className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-300 flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    Unidade Fixa: {activeFarm}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-slate-200 tabular-nums">
                    {farmConcludedCount} concluída(s)
                  </span>
                </div>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-2xl sm:text-3xl font-black text-amber-300 tabular-nums">
                    {orderedFarmPending.length}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-100">
                    SS Pendente(s) de Execução nesta Fazenda
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-300 mt-1 tabular-nums">
                  <span>• Na fila: {farmQueuedUrgentCount + farmQueuedNormalCount} ({farmQueuedUrgentCount} urgente · {farmQueuedNormalCount} normal)</span>
                  <span>• Aguardando classificação: {farmAwaitingValidationCount}</span>
                  <span>• Em execução (OS): {farmInExecutionCount}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => syncNow(true)}
              disabled={isSyncing}
              className="self-start sm:self-center inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer shrink-0 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        {/* Clean 3-tab switcher strictly within the service request portal */}
        <div className="grid grid-cols-3 gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setPortalTab('FORM');
              setSubmittedRequest(null);
            }}
            className={`flex items-center justify-center space-x-1.5 py-2.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              portalTab === 'FORM'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">Nova Solicitação</span>
          </button>

          <button
            type="button"
            onClick={() => setPortalTab('FARM_PENDING')}
            className={`flex items-center justify-center space-x-1.5 py-2.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              portalTab === 'FARM_PENDING'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ListOrdered className="w-4 h-4 shrink-0" />
            <span className="truncate tabular-nums">
              Fila / Pendentes ({orderedFarmPending.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPortalTab('HISTORY')}
            className={`flex items-center justify-center space-x-1.5 py-2.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              portalTab === 'HISTORY'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="truncate tabular-nums">
              Minhas ({myRequestsWithQueue.length})
            </span>
          </button>
        </div>

        {portalTab === 'FORM' ? (
          submittedRequest ? (
            <div className="bg-white rounded-2xl border border-emerald-200 p-6 sm:p-8 text-center space-y-5 shadow-xs">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <span className="inline-block font-mono text-xs font-extrabold px-3 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200">
                  Protocolo: {submittedRequest.code}
                </span>
                <h2 className="text-xl font-extrabold text-slate-900 pt-1">
                  Solicitação Enviada com Sucesso!
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                  Sua solicitação foi enviada. O técnico responsável irá validar a prioridade (<strong>Urgente</strong> ou <strong>Normal</strong>) e o chamado entrará automaticamente na fila de atendimento.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 max-w-lg mx-auto font-semibold">
                ⏳ <strong>Aguardando classificação do técnico:</strong> assim que validada, você poderá acompanhar a posição exata na fila em <strong>Minhas</strong> ou <strong>Fila / Pendentes</strong>.
              </div>

              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-left text-xs space-y-2 max-w-lg mx-auto">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 block">Data / Hora</span>
                    <strong className="text-slate-900 font-mono tabular-nums">
                      {submittedRequest.date.split('-').reverse().join('/')} · {submittedRequest.time}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Solicitante</span>
                    <strong className="text-slate-900">{submittedRequest.requesterName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Fazenda / Local</span>
                    <strong className="text-slate-900">{submittedRequest.farm} — {submittedRequest.location}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Equipamento</span>
                    <strong className="text-slate-900">{submittedRequest.equipment}</strong>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-500 block">Problema Relatado</span>
                  <p className="text-slate-800 font-medium mt-0.5">{submittedRequest.problemDescription}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold cursor-pointer transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Enviar Nova Solicitação</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPortalTab('HISTORY')}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs sm:text-sm font-bold cursor-pointer transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span>Acompanhar Status</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5 shadow-2xs">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                  Preencher Solicitação de Serviço
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Informe os dados abaixo para que o técnico responsável possa avaliar e gerar a Ordem de Serviço.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3.5 bg-red-50 border border-red-300 rounded-xl flex items-start space-x-2.5 text-xs text-red-900">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Data e Hora */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1.5 text-emerald-700" />
                    Data *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono tabular-nums text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1.5 text-emerald-700" />
                    Hora *
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono tabular-nums text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Solicitante & Setor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center">
                    <User className="w-3.5 h-3.5 mr-1.5 text-emerald-700" />
                    Nome do Solicitante *
                  </label>
                  <input
                    type="text"
                    placeholder="Seu nome completo"
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Setor / Função (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Packing House, Campo, Produção"
                    value={requesterSector}
                    onChange={(e) => setRequesterSector(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Fazenda e Local */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center">
                    <MapPin className="w-3.5 h-3.5 mr-1.5 text-emerald-700" />
                    Fazenda / Unidade *
                  </label>
                  <select
                    value={lockedFarm || farm}
                    onChange={(e) => setFarm(e.target.value as Farm)}
                    disabled={isFarmLocked}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-600 disabled:opacity-70"
                  >
                    {FARMS.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center">
                    <MapPin className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                    Local Específico *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Sala de Máquinas, Galpão 02, Bloco B"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Equipamento (Prioridade é definida exclusivamente pelo técnico após análise) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center">
                  <Wrench className="w-3.5 h-3.5 mr-1.5 text-emerald-700" />
                  Equipamento / Máquina *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Câmara Fria 01, Bomba Irrigação, Trator, Esteira"
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  A prioridade (Urgente ou Normal) e a posição na fila serão definidas pelo técnico ao validar este chamado.
                </p>
              </div>

              {/* Problema */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                  Descrição do Problema / Serviço Solicitado *
                </label>
                <textarea
                  rows={4}
                  placeholder="Descreva com clareza o que está acontecendo, barulhos, vazamentos, falhas ou o serviço necessário..."
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                />
              </div>

              {/* Fotos opcionais */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center">
                    <Camera className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                    Foto do Problema (Opcional — até 4 fotos)
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessingPhoto || photos.length >= 4}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isProcessingPhoto ? 'Processando...' : 'Anexar Foto'}</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>

                {photos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                    {photos.map((url, idx) => (
                      <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-square">
                        <img
                          src={url}
                          alt={`Foto ${idx + 1}`}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setPreviewImage({ url, title: `Foto anexada ${idx + 1}` })}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-lg shadow-md cursor-pointer hover:bg-red-700"
                          title="Remover foto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || isProcessingPhoto}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white rounded-xl text-sm font-extrabold shadow-sm transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Enviando Solicitação...' : 'Enviar Solicitação de Serviço'}</span>
                </button>
              </div>
            </form>
          )
        ) : portalTab === 'FARM_PENDING' ? (
          /* Fila de Atendimento & Pendentes na Fazenda fixa do solicitante */
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                  <ListOrdered className="w-4 h-4 text-emerald-700" />
                  <span>Fila de Atendimento — {activeFarm}</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Ordem oficial validada pelo técnico: 1º Urgentes e posteriormente Normais.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-950 font-extrabold text-xs tabular-nums">
                {orderedFarmPending.length} pendente(s)
              </span>
            </div>

            {orderedFarmPending.length === 0 ? (
              <div className="py-10 text-center space-y-2.5">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-sm font-bold text-slate-800">
                  Nenhuma SS na fila ou pendente em {activeFarm}!
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Todas as solicitações desta fazenda já foram concluídas.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {orderedFarmPending.map(entry => {
                  const req = entry.request;
                  const st = getStatusLabel(req.status);
                  const isMine = mySubmittedRequestIds.includes(req.id);
                  return (
                    <div
                      key={req.id}
                      className={`p-4 rounded-xl border space-y-2 ${
                        entry.inQueue && req.urgency === 'URGENTE'
                          ? 'border-red-300 bg-red-50/40'
                          : isMine
                          ? 'border-emerald-300 bg-emerald-50/30'
                          : 'border-slate-200 bg-slate-50/70'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {entry.inQueue && entry.queuePosition !== null ? (
                            <span
                              className={`font-mono text-xs font-black px-2.5 py-0.5 rounded-lg border tabular-nums ${
                                req.urgency === 'URGENTE'
                                  ? 'bg-red-600 text-white border-red-700'
                                  : 'bg-slate-900 text-white border-slate-950'
                              }`}
                            >
                              {entry.queuePosition}º na Fila
                            </span>
                          ) : !entry.isValidated ? (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-amber-100 text-amber-950 border border-amber-300">
                              Aguardando Validação do Técnico
                            </span>
                          ) : null}

                          <span className="font-mono text-xs font-extrabold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 tabular-nums">
                            {req.code}
                          </span>
                          <span className="text-xs text-slate-500 font-mono tabular-nums">
                            {req.date.split('-').reverse().join('/')} · {req.time}
                          </span>

                          {entry.isValidated && req.urgency === 'URGENTE' && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-200 uppercase">
                              Urgente
                            </span>
                          )}
                          {entry.isValidated && req.urgency === 'NORMAL' && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 uppercase">
                              Normal
                            </span>
                          )}
                          {isMine && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                              Sua Solicitação
                            </span>
                          )}
                        </div>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${st.cls}`}>
                          {st.text}
                        </span>
                      </div>

                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          {req.equipment}
                        </div>
                        <div className="text-xs text-slate-600">
                          {req.farm} · {req.location} · Solicitante: <strong>{req.requesterName}</strong>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200/80">
                        {req.problemDescription}
                      </p>

                      {req.linkedWorkOrderCode && (
                        <div className="text-xs font-bold text-emerald-800 flex items-center space-x-1.5 pt-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            Ordem de Serviço vinculada: <span className="font-mono">{req.linkedWorkOrderCode}</span>
                            {req.assignedOperatorName ? ` · Técnico: ${req.assignedOperatorName}` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Histórico apenas das solicitações enviadas por este solicitante + posição exata na fila */
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Minhas Solicitações Enviadas
                </h2>
                <p className="text-xs text-slate-500">
                  Acompanhe a classificação do técnico e em qual posição da fila está cada solicitação.
                </p>
              </div>
            </div>

            {myRequestsWithQueue.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">
                  Nenhuma solicitação enviada ainda neste aparelho
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Quando você enviar uma solicitação de serviço, ela aparecerá aqui com o protocolo e sua posição na fila.
                </p>
                <button
                  type="button"
                  onClick={() => setPortalTab('FORM')}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Preencher Primeira Solicitação</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myRequestsWithQueue.map(entry => {
                  const req = entry.request;
                  const st = getStatusLabel(req.status);
                  return (
                    <div
                      key={req.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-extrabold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {req.code}
                          </span>
                          <span className="text-xs text-slate-500 font-mono tabular-nums">
                            {req.date.split('-').reverse().join('/')} · {req.time}
                          </span>
                        </div>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${st.cls}`}>
                          {st.text}
                        </span>
                      </div>

                      {/* Queue Position Banner for Requester */}
                      {entry.inQueue && entry.queuePosition !== null ? (
                        <div
                          className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 ${
                            req.urgency === 'URGENTE'
                              ? 'bg-red-50 border-red-300 text-red-950'
                              : 'bg-blue-50 border-blue-200 text-blue-950'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <span
                              className={`font-mono text-sm font-black px-2.5 py-1 rounded-lg tabular-nums ${
                                req.urgency === 'URGENTE'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-slate-900 text-white'
                              }`}
                            >
                              {entry.queuePosition}º Lugar
                            </span>
                            <div className="text-xs">
                              <div className="font-extrabold">
                                Posição na Fila ({req.farm}): {entry.queuePosition}º de {entry.totalInQueue}
                              </div>
                              <div className="opacity-85">
                                Classificação do Técnico:{' '}
                                <strong>{req.urgency === 'URGENTE' ? 'URGENTE' : 'NORMAL'}</strong>
                                {req.urgency === 'NORMAL' && entry.urgentAheadCount > 0
                                  ? ` · ${entry.urgentAheadCount} urgente(s) na frente`
                                  : ''}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : req.status === 'PENDENTE' || req.status === 'EM_ATENDIMENTO' ? (
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 font-semibold">
                          ⏳ Aguardando o técnico validar se a prioridade é <strong>Urgente</strong> ou <strong>Normal</strong> para definir a posição na fila.
                        </div>
                      ) : null}

                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          {req.equipment}
                        </div>
                        <div className="text-xs text-slate-600">
                          {req.farm} · {req.location} · Solicitante: <strong>{req.requesterName}</strong>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200/80">
                        {req.problemDescription}
                      </p>

                      {req.linkedWorkOrderCode && (
                        <div className="text-xs font-bold text-emerald-800 flex items-center space-x-1.5 pt-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            Ordem de Serviço vinculada: <span className="font-mono">{req.linkedWorkOrderCode}</span>
                            {req.assignedOperatorName ? ` · Técnico: ${req.assignedOperatorName}` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="min-h-screen w-full max-w-full bg-slate-100 flex flex-col font-sans overflow-x-clip">
      {/* Isolated Requester Top Header */}
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
                Solicitação de Serviço
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
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-fuchsia-50 text-fuchsia-950 border border-fuchsia-200 whitespace-nowrap">
              Solicitante
            </span>
          </div>
        </div>
      </header>

      {!isOnline && (
        <div className="bg-amber-500 text-stone-950 px-4 py-2 text-xs font-bold">
          <div className="max-w-3xl mx-auto flex items-center space-x-2">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>
              Sem sinal no momento. Você pode preencher e enviar normalmente: o pedido ficará salvo neste aparelho e subirá assim que conectar.
            </span>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-4">
        {content}
      </main>
    </div>
  );
};
