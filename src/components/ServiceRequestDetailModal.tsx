import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  MapPin,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Link2,
  Trash2,
  Eye,
  ExternalLink,
  ListOrdered,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  getServiceRequestQueueInfo,
  isServiceRequestPriorityValidated
} from '../utils/serviceRequestQueue';

export const ServiceRequestDetailModal: React.FC = () => {
  const {
    viewServiceRequestDetail,
    setViewServiceRequestDetail,
    generateWorkOrderFromServiceRequest,
    linkWorkOrderToServiceRequest,
    serviceRequests,
    workOrders,
    setViewWorkOrderDetail,
    setPreviewImage,
    requestDelete,
    userRole,
    activeOperatorRelease,
    updateServiceRequest,
    setSyncToast
  } = useApp();

  const [showLinkExisting, setShowLinkExisting] = useState(false);
  const [selectedExistingOsId, setSelectedExistingOsId] = useState('');

  const availableOpenOrders = useMemo(() => {
    if (!viewServiceRequestDetail) return [];
    return workOrders.filter(wo => wo.status !== 'CANCELADA');
  }, [workOrders, viewServiceRequestDetail]);

  if (!viewServiceRequestDetail) return null;

  const sr = viewServiceRequestDetail;
  const linkedOrder = sr.linkedWorkOrderId
    ? workOrders.find(w => w.id === sr.linkedWorkOrderId)
    : undefined;

  const isValidated = isServiceRequestPriorityValidated(sr);
  const queueInfo = getServiceRequestQueueInfo(serviceRequests, sr);

  const handleValidatePriority = async (chosenUrgency: 'NORMAL' | 'URGENTE') => {
    const validatorName =
      activeOperatorRelease?.operatorName ||
      (userRole === 'ADMIN' ? 'Administrador' : 'Técnico Autorizado');
    await updateServiceRequest(sr.id, {
      urgency: chosenUrgency,
      priorityValidated: true,
      priorityValidatedAt: new Date().toISOString(),
      priorityValidatedBy: validatorName
    });
    setSyncToast({
      isOpen: true,
      message: `✅ Prioridade validada como ${chosenUrgency}. Solicitação ${sr.code} inserida na fila de atendimento (${sr.farm}).`
    });
  };

  const handleLinkExisting = async () => {
    if (!isValidated) return;
    const target = workOrders.find(w => w.id === selectedExistingOsId);
    if (!target) return;
    await linkWorkOrderToServiceRequest(sr.id, target);
    setShowLinkExisting(false);
    setSelectedExistingOsId('');
  };

  const getStatusDisplay = () => {
    switch (sr.status) {
      case 'PENDENTE':
        return { label: 'Pendente de Atendimento', cls: 'bg-amber-100 text-amber-950 border-amber-300' };
      case 'EM_ATENDIMENTO':
        return { label: 'Em Análise Técnica', cls: 'bg-blue-100 text-blue-950 border-blue-300' };
      case 'OS_GERADA':
        return { label: 'OS Gerada & Vinculada', cls: 'bg-emerald-100 text-emerald-950 border-emerald-300' };
      case 'CONCLUIDA':
        return { label: 'Concluída', cls: 'bg-slate-200 text-slate-900 border-slate-300' };
      case 'CANCELADA':
        return { label: 'Cancelada', cls: 'bg-red-100 text-red-900 border-red-300' };
    }
  };

  const st = getStatusDisplay();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in"
      onClick={() => setViewServiceRequestDetail(null)}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-amber-400 text-stone-950">
                {sr.code}
              </span>
              {!isValidated ? (
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded bg-amber-500 text-stone-950">
                  VALIDAR PRIORIDADE
                </span>
              ) : sr.urgency === 'URGENTE' ? (
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded bg-red-600 text-white">
                  URGENTE
                </span>
              ) : (
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded bg-blue-600 text-white">
                  NORMAL
                </span>
              )}
              {queueInfo.inQueue && queueInfo.queuePosition !== null && (
                <span className="font-mono text-[11px] font-extrabold px-2 py-0.5 rounded bg-emerald-600 text-white tabular-nums">
                  {queueInfo.queuePosition}º na Fila
                </span>
              )}
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${st.cls}`}>
                {st.label}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-white mt-1 truncate">
              Solicitação de Serviço — {sr.equipment}
            </h2>
          </div>

          <button
            onClick={() => setViewServiceRequestDetail(null)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* Core metadata grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 flex items-center mb-1">
                <Calendar className="w-3.5 h-3.5 mr-1.5 text-emerald-700" />
                Data e Hora da Solicitação
              </span>
              <strong className="text-sm text-slate-900 font-mono tabular-nums">
                {sr.date.split('-').reverse().join('/')} às {sr.time}
              </strong>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 flex items-center mb-1">
                <User className="w-3.5 h-3.5 mr-1.5 text-emerald-700" />
                Solicitante
              </span>
              <strong className="text-sm text-slate-900 block">
                {sr.requesterName}
              </strong>
              {sr.requesterSector && (
                <span className="text-[11px] text-slate-500">Setor: {sr.requesterSector}</span>
              )}
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 flex items-center mb-1">
                <Wrench className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                Equipamento
              </span>
              <strong className="text-sm text-slate-900">{sr.equipment}</strong>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 flex items-center mb-1">
                <MapPin className="w-3.5 h-3.5 mr-1.5 text-emerald-700" />
                Fazenda / Local
              </span>
              <strong className="text-sm text-slate-900">
                {sr.farm} — {sr.location}
              </strong>
            </div>
          </div>

          {/* Problem description */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-700 flex items-center">
              <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
              Problema Relatado pelo Solicitante
            </span>
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-sm text-slate-900 whitespace-pre-wrap leading-relaxed">
              {sr.problemDescription}
            </div>
          </div>

          {/* Photos if attached */}
          {sr.photos && sr.photos.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 block">
                Fotos Anexadas pelo Solicitante ({sr.photos.length})
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {sr.photos.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPreviewImage({ url, title: `${sr.code} — Foto ${idx + 1}` })}
                    className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-100 cursor-pointer"
                  >
                    <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Eye className="w-5 h-5 text-white" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mandatory Technician Priority Validation & Queue Box */}
          {sr.status !== 'CONCLUIDA' && sr.status !== 'CANCELADA' && (
            <div
              className={`p-4 rounded-xl border-2 space-y-3 ${
                !isValidated
                  ? 'bg-amber-50 border-amber-400'
                  : sr.urgency === 'URGENTE'
                  ? 'bg-red-50/70 border-red-300'
                  : 'bg-blue-50/70 border-blue-300'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-slate-800 shrink-0" />
                    <span>
                      {isValidated
                        ? '1º Passo Concluído · Prioridade Definida pelo Técnico'
                        : '1º Passo Obrigatório · Decidir Prioridade (Técnico)'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-700 mt-0.5">
                    O solicitante não define prioridade. Decida abaixo se o atendimento é{' '}
                    <strong>Urgente</strong> ou <strong>Normal</strong> para posicionar na fila e liberar a vinculação à Ordem de Serviço.
                  </p>
                </div>

                {queueInfo.inQueue && queueInfo.queuePosition !== null && (
                  <span className="inline-flex items-center space-x-1 font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-slate-900 text-white shrink-0 tabular-nums">
                    <ListOrdered className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      {queueInfo.queuePosition}º de {queueInfo.totalInQueue} na fila ({sr.farm})
                    </span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleValidatePriority('URGENTE')}
                  className={`py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
                    isValidated && sr.urgency === 'URGENTE'
                      ? 'bg-red-600 text-white border-red-700 shadow-sm ring-2 ring-red-400/40'
                      : 'bg-white text-red-800 border-red-300 hover:bg-red-50'
                  }`}
                >
                  <span>🚨 URGENTE</span>
                  <span className={`text-[10px] font-semibold mt-0.5 ${isValidated && sr.urgency === 'URGENTE' ? 'text-red-100' : 'text-red-700'}`}>
                    Primeiros lugares da fila
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleValidatePriority('NORMAL')}
                  className={`py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
                    isValidated && sr.urgency === 'NORMAL'
                      ? 'bg-blue-700 text-white border-blue-800 shadow-sm ring-2 ring-blue-400/40'
                      : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span>📋 NORMAL</span>
                  <span className={`text-[10px] font-semibold mt-0.5 ${isValidated && sr.urgency === 'NORMAL' ? 'text-blue-100' : 'text-slate-500'}`}>
                    Fila após os urgentes
                  </span>
                </button>
              </div>

              {isValidated && sr.priorityValidatedBy && (
                <div className="text-[11px] font-semibold text-slate-700 bg-white/80 px-2.5 py-1.5 rounded-lg border border-slate-200/80">
                  ✅ Validado por <strong>{sr.priorityValidatedBy}</strong>
                  {sr.priorityValidatedAt
                    ? ` em ${new Date(sr.priorityValidatedAt).toLocaleString('pt-BR')}`
                    : ''}
                  . O solicitante já acompanha a posição na fila — siga abaixo para vincular e abrir a OS.
                </div>
              )}
            </div>
          )}

          {/* Action / Linkage Box */}
          {sr.linkedWorkOrderId ? (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2 text-emerald-950 font-extrabold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                  <span>Solicitação Vinculada à Ordem de Serviço</span>
                </div>
                <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded bg-white text-emerald-900 border border-emerald-300">
                  {sr.linkedWorkOrderCode || linkedOrder?.code}
                </span>
              </div>

              <div className="text-xs text-emerald-900 flex flex-wrap gap-x-4 gap-y-1">
                {sr.assignedOperatorName && (
                  <span>Técnico Responsável: <strong>{sr.assignedOperatorName}</strong></span>
                )}
                {linkedOrder && (
                  <span>Status da OS: <strong>{linkedOrder.status.replace('_', ' ')}</strong></span>
                )}
              </div>

              {linkedOrder && (
                <button
                  type="button"
                  onClick={() => {
                    setViewServiceRequestDetail(null);
                    setViewWorkOrderDetail(linkedOrder);
                  }}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir Ficha da Ordem de Serviço ({linkedOrder.code})</span>
                </button>
              )}
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-slate-900">
                  2º Passo · Vincular e Redirecionar para Abertura / Execução da OS
                </h3>
                <p className="text-xs text-slate-600">
                  Gere uma nova Ordem de Serviço vinculada (redireciona automaticamente para abrir a OS e executar o serviço com todos os dados pré-preenchidos) ou vincule a uma OS já existente.
                </p>
              </div>

              {!isValidated && (
                <div className="p-2.5 rounded-lg bg-amber-100 border border-amber-300 text-xs font-bold text-amber-950">
                  ⚠️ Decida primeiro no 1º passo se é <strong>URGENTE</strong> ou <strong>NORMAL</strong> para liberar a vinculação e abertura da OS.
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  disabled={!isValidated}
                  onClick={() => generateWorkOrderFromServiceRequest(sr)}
                  className="flex-1 inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-stone-950 hover:text-white rounded-xl text-xs sm:text-sm font-extrabold shadow-xs transition-all cursor-pointer"
                >
                  <Wrench className="w-4 h-4" />
                  <span>Vincular & Gerar Ordem de Serviço</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  disabled={!isValidated}
                  onClick={() => setShowLinkExisting(prev => !prev)}
                  className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Vincular a OS Existente</span>
                </button>
              </div>

              {showLinkExisting && (
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Selecione uma Ordem de Serviço já aberta para vincular:
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={selectedExistingOsId}
                      onChange={e => setSelectedExistingOsId(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                    >
                      <option value="">-- Selecione uma OS --</option>
                      {availableOpenOrders.map(wo => (
                        <option key={wo.id} value={wo.id}>
                          {wo.code} · {wo.equipment} ({wo.farm}) - {wo.status}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!selectedExistingOsId}
                      onClick={handleLinkExisting}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Confirmar Vínculo
                    </button>
                  </div>
                </div>
              )}

              {sr.status === 'PENDENTE' && (
                <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Deseja sinalizar que já está analisando este chamado?</span>
                  <button
                    type="button"
                    onClick={() => updateServiceRequest(sr.id, { status: 'EM_ATENDIMENTO' })}
                    className="text-blue-700 hover:underline font-bold cursor-pointer flex items-center"
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    Marcar Em Análise Técnica
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          {userRole === 'ADMIN' ? (
            <button
              type="button"
              onClick={() =>
                requestDelete({
                  type: 'service-request',
                  id: sr.id,
                  code: sr.code,
                  description: `${sr.equipment} (${sr.requesterName})`
                })
              }
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-red-700 hover:bg-red-100 rounded-lg text-xs font-bold cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-400">
              el Ciruelo · Manutenção
            </span>
          )}

          <button
            type="button"
            onClick={() => setViewServiceRequestDetail(null)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
