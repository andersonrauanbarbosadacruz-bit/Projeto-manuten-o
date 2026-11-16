import React, { useState, useMemo, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  BellRing,
  Search,
  Wrench,
  Clock,
  CheckCircle2,
  User,
  MapPin,
  Calendar,
  ArrowRight,
  KeyRound,
  Copy,
  Check,
  ShieldCheck,
  UserPlus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  MessageCircle,
  Link2,
  QrCode,
  AlertTriangle,
  ListOrdered,
  X,
  Download
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FARMS, Farm, ServiceRequestStatus } from '../types';
import {
  getServiceRequestQueueInfo,
  isServiceRequestPriorityValidated
} from '../utils/serviceRequestQueue';

export const ServiceRequestsView: React.FC = () => {
  const {
    userRole,
    selectedFarmFilter,
    serviceRequests,
    setViewServiceRequestDetail,
    generateWorkOrderFromServiceRequest,
    hasServiceRequestAccess,
    serviceRequestFarmScope,
    activeOperatorRelease,
    operatorServiceReleases,
    saveOperatorRelease,
    toggleOperatorRelease,
    deleteOperatorRelease,
    setShowMobileAccessModal,
    setSyncToast
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<'PENDENTES' | 'OS_GERADA' | 'CONCLUIDA' | 'TODAS'>('PENDENTES');
  const [searchTerm, setSearchTerm] = useState('');
  const [showReleasesPanel, setShowReleasesPanel] = useState(false);
  const [newOperatorName, setNewOperatorName] = useState('');
  const [newOperatorFarm, setNewOperatorFarm] = useState<Farm | 'TODAS'>(FARMS[0]);
  const [requesterLinkFarm, setRequesterLinkFarm] = useState<Farm>(
    selectedFarmFilter !== 'TODAS' ? selectedFarmFilter : FARMS[0]
  );
  const [isCreatingRelease, setIsCreatingRelease] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrPreview, setQrPreview] = useState<{ title: string; subtitle: string; url: string } | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!qrPreview) return;
    const t = setTimeout(() => {
      if (qrCanvasRef.current) {
        QRCode.toCanvas(
          qrCanvasRef.current,
          qrPreview.url,
          {
            width: 260,
            margin: 3,
            color: { dark: '#000000', light: '#ffffff' },
            errorCorrectionLevel: 'M'
          },
          () => {}
        );
      }
    }, 50);
    return () => clearTimeout(t);
  }, [qrPreview]);

  const getBasePublicUrl = () => {
    if (typeof window !== 'undefined' && window.location.origin.startsWith('http')) {
      return window.location.origin.includes('ais-dev-')
        ? window.location.origin.replace('ais-dev-', 'ais-pre-')
        : window.location.origin;
    }
    return 'https://ais-pre-ydwzfjmardqsvwnfhd5ocb-738358786007.us-west2.run.app';
  };

  const buildOperatorReleaseLink = (
    token: string,
    farm: Farm | 'TODAS',
    operatorName?: string,
    id?: string
  ) => {
    const base = getBasePublicUrl();
    const farmParams = farm === 'TODAS'
      ? 'fazenda=TODAS&todas_fazendas=true'
      : `fazenda=${encodeURIComponent(farm)}`;
    const metaParams = `${operatorName ? `&ss_op=${encodeURIComponent(operatorName)}` : ''}&ss_farm=${encodeURIComponent(farm)}${id ? `&ss_rid=${encodeURIComponent(id)}` : ''}`;
    return `${base}/?perfil=operador&somente_operador=true&lock_role=true&mods=service_request,fleet_update,checklist,work_order&${farmParams}&ss_key=${encodeURIComponent(token)}${metaParams}`;
  };

  const buildRequesterPortalLink = (farm: Farm = requesterLinkFarm) => {
    const base = getBasePublicUrl();
    return `${base}/?perfil=solicitante&somente_solicitante=true&lock_role=true&mods=service_request&fazenda=${encodeURIComponent(farm)}`;
  };

  const handleCopyText = async (text: string, id: string, label: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, text.length);
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2200);
      setSyncToast({
        isOpen: true,
        message: `${label} copiado para a área de transferência!`
      });
    } catch {}
  };

  const handleCreateRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOperatorName.trim()) return;
    setIsCreatingRelease(true);
    try {
      await saveOperatorRelease({
        operatorName: newOperatorName.trim(),
        farm: newOperatorFarm,
        active: true
      });
      setNewOperatorName('');
      setNewOperatorFarm('TODAS');
      setSyncToast({
        isOpen: true,
        message: 'Liberação exclusiva gerada! Copie o link ou envie pelo WhatsApp para o técnico autorizado.'
      });
    } finally {
      setIsCreatingRelease(false);
    }
  };

  const farmScopedRequests = useMemo(() => {
    if (serviceRequestFarmScope === 'TODAS') return serviceRequests;
    return serviceRequests.filter(sr => sr.farm === serviceRequestFarmScope);
  }, [serviceRequests, serviceRequestFarmScope]);

  const counts = useMemo(() => {
    let pendentes = 0;
    let osGerada = 0;
    let concluidas = 0;
    farmScopedRequests.forEach(sr => {
      if (sr.status === 'PENDENTE' || sr.status === 'EM_ATENDIMENTO') pendentes++;
      else if (sr.status === 'OS_GERADA') osGerada++;
      else if (sr.status === 'CONCLUIDA') concluidas++;
    });
    return { pendentes, osGerada, concluidas, total: farmScopedRequests.length };
  }, [farmScopedRequests]);

  const filteredRequests = useMemo(() => {
    const base = farmScopedRequests.filter(sr => {
      if (statusFilter === 'PENDENTES' && sr.status !== 'PENDENTE' && sr.status !== 'EM_ATENDIMENTO') return false;
      if (statusFilter === 'OS_GERADA' && sr.status !== 'OS_GERADA') return false;
      if (statusFilter === 'CONCLUIDA' && sr.status !== 'CONCLUIDA') return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const hay = `${sr.code} ${sr.requesterName} ${sr.equipment} ${sr.location} ${sr.problemDescription} ${sr.farm}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (statusFilter === 'PENDENTES') {
      return [...base].sort((a, b) => {
        const aVal = isServiceRequestPriorityValidated(a);
        const bVal = isServiceRequestPriorityValidated(b);
        // 1. Unvalidated requests pinned at top for immediate technician validation
        if (aVal !== bVal) return aVal ? 1 : -1;
        if (aVal && bVal) {
          const aUrg = a.urgency === 'URGENTE' ? 0 : 1;
          const bUrg = b.urgency === 'URGENTE' ? 0 : 1;
          if (aUrg !== bUrg) return aUrg - bUrg;
          const qA = getServiceRequestQueueInfo(serviceRequests, a).queuePosition ?? 9999;
          const qB = getServiceRequestQueueInfo(serviceRequests, b).queuePosition ?? 9999;
          if (qA !== qB) return qA - qB;
        }
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      });
    }

    return base;
  }, [farmScopedRequests, serviceRequests, statusFilter, searchTerm]);

  if (!hasServiceRequestAccess) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 max-w-lg mx-auto my-8">
        <ShieldCheck className="w-10 h-10 text-amber-600 mx-auto" />
        <h2 className="text-lg font-extrabold text-slate-900">Acesso Restrito</h2>
        <p className="text-xs sm:text-sm text-slate-600">
          Esta aba é exclusiva para o Administrador e para Operadores Técnicos com liberação exclusiva ativa.
        </p>
      </div>
    );
  }

  const getStatusBadge = (status: ServiceRequestStatus) => {
    switch (status) {
      case 'PENDENTE':
        return { label: 'Pendente', cls: 'bg-amber-100 text-amber-950 border-amber-300' };
      case 'EM_ATENDIMENTO':
        return { label: 'Em Análise', cls: 'bg-blue-100 text-blue-950 border-blue-300' };
      case 'OS_GERADA':
        return { label: 'OS Gerada', cls: 'bg-emerald-100 text-emerald-950 border-emerald-300' };
      case 'CONCLUIDA':
        return { label: 'Concluída', cls: 'bg-slate-200 text-slate-900 border-slate-300' };
      case 'CANCELADA':
        return { label: 'Cancelada', cls: 'bg-red-100 text-red-900 border-red-300' };
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-2xl p-5 sm:p-6 text-white border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-amber-300 font-bold">
              <BellRing className="w-4 h-4 shrink-0" />
              <span>
                {userRole === 'ADMIN'
                  ? 'Central Administrativa · Solicitações de Serviço'
                  : `Liberação Exclusiva Ativa: ${activeOperatorRelease?.operatorName || 'Técnico Autorizado'} · Fazenda: ${serviceRequestFarmScope === 'TODAS' ? 'Todas' : serviceRequestFarmScope}`}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Solicitações de Serviço
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Chamados abertos pelo link do solicitante. Abra qualquer solicitação pendente para vincular e redirecionar à geração da Ordem de Serviço (OS).
            </p>
          </div>

          {userRole === 'ADMIN' && (
            <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
              <div className="flex flex-wrap items-center bg-slate-800 border border-slate-700 rounded-xl p-1 gap-1 max-w-full">
                <select
                  value={requesterLinkFarm}
                  onChange={e => setRequesterLinkFarm(e.target.value as Farm)}
                  className="bg-slate-900 text-emerald-200 text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-700 focus:outline-none cursor-pointer max-w-full"
                  title="Selecionar fazenda fixa do solicitante"
                >
                  {FARMS.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleCopyText(buildRequesterPortalLink(requesterLinkFarm), 'requester-link', `Link do Solicitante (${requesterLinkFarm})`)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                >
                  {copiedId === 'requester-link' ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                  <span className="whitespace-nowrap">
                    {copiedId === 'requester-link' ? 'Copiado!' : 'Link Solicitante'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setQrPreview({
                      title: `QR Code — Solicitante (${requesterLinkFarm})`,
                      subtitle: 'Liberado para câmera nativa de Android e iPhone (iOS)',
                      url: buildRequesterPortalLink(requesterLinkFarm)
                    })
                  }
                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-700 text-emerald-300 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                  title="Ver QR Code do Solicitante (Android / iOS)"
                >
                  <QrCode className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowReleasesPanel(prev => !prev)}
                className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors border ${
                  showReleasesPanel
                    ? 'bg-amber-400 text-stone-950 border-amber-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
                }`}
              >
                <KeyRound className="w-4 h-4" />
                <span className="whitespace-nowrap">
                  Liberação Exclusiva ({operatorServiceReleases.filter(r => r.active).length})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowMobileAccessModal(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                <QrCode className="w-4 h-4 text-emerald-300" />
                <span className="whitespace-nowrap">QR Codes</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Admin Exclusive Operator Releases Panel */}
      {userRole === 'ADMIN' && showReleasesPanel && (
        <div className="bg-white rounded-2xl border border-amber-300 p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <span>Liberação Exclusiva de Alertas para Operadores / Técnicos</span>
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Apenas os operadores listados abaixo (com acesso ativo) receberão os alertas de Solicitação de Serviço. Operadores com o link padrão não visualizarão estes alertas.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateRelease} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-6">
              <input
                type="text"
                placeholder="Nome do Técnico / Operador (ex: João Silva - Elétrica)"
                value={newOperatorName}
                onChange={e => setNewOperatorName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div className="sm:col-span-3">
              <select
                value={newOperatorFarm}
                onChange={e => setNewOperatorFarm(e.target.value as Farm | 'TODAS')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900"
              >
                <option value="TODAS">Todas as Fazendas</option>
                {FARMS.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={isCreatingRelease}
                className="w-full inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>Gerar Liberação</span>
              </button>
            </div>
          </form>

          {operatorServiceReleases.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
              Nenhuma liberação exclusiva criada ainda. Crie acima para gerar um link individualizado para um operador/técnico específico.
            </div>
          ) : (
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
              {operatorServiceReleases.map(rel => {
                const link = buildOperatorReleaseLink(rel.token, rel.farm, rel.operatorName, rel.id);
                const waText = `*el Ciruelo — Acesso Técnico Exclusivo*\n\nOlá *${rel.operatorName}*! Segue seu link exclusivo com permissão para receber alertas de Solicitações de Serviço (${rel.farm === 'TODAS' ? 'Todas as Fazendas' : rel.farm}) e gerar Ordens de Serviço:\n\n🔗 ${link}`;
                const waHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;
                return (
                  <div
                    key={rel.id}
                    className={`p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      rel.active ? 'bg-white' : 'bg-slate-50 opacity-75'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-900">
                          {rel.operatorName}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          rel.active
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {rel.active ? 'Alertas Liberados' : 'Bloqueado'}
                        </span>
                        <span className="text-xs text-slate-500">
                          {rel.farm === 'TODAS' ? 'Todas as Fazendas' : rel.farm}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 truncate">
                        Chave: {rel.token}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setQrPreview({
                            title: `QR Code — ${rel.operatorName}`,
                            subtitle: `Acesso Técnico com Alertas (${rel.farm === 'TODAS' ? 'Todas as Fazendas' : rel.farm}) · Android & iOS`,
                            url: link
                          })
                        }
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-300 rounded-lg text-xs font-bold cursor-pointer"
                        title="Gerar QR Code para Android e iOS"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>QR Code</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyText(link, rel.id, `Link de ${rel.operatorName}`)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        {copiedId === rel.id ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedId === rel.id ? 'Copiado' : 'Copiar Link'}</span>
                      </button>

                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-[#25D366] hover:bg-[#1ebd5a] text-white rounded-lg text-xs font-bold cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => toggleOperatorRelease(rel.id)}
                        className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${
                          rel.active
                            ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                            : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                        }`}
                        title={rel.active ? 'Suspender acesso deste operador' : 'Reativar acesso deste operador'}
                      >
                        {rel.active ? <ToggleRight className="w-4 h-4 text-emerald-700" /> : <ToggleLeft className="w-4 h-4 text-slate-500" />}
                        <span>{rel.active ? 'Ativo' : 'Reativar'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteOperatorRelease(rel.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 cursor-pointer"
                        title="Excluir liberação permanentemente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 font-medium">Aguardando Técnico</div>
          <div className="text-2xl font-extrabold text-amber-600 font-mono tabular-nums mt-1">
            {counts.pendentes}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 font-medium">OS Geradas</div>
          <div className="text-2xl font-extrabold text-emerald-700 font-mono tabular-nums mt-1">
            {counts.osGerada}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 font-medium">Concluídas</div>
          <div className="text-2xl font-extrabold text-slate-800 font-mono tabular-nums mt-1">
            {counts.concluidas}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 font-medium">Total Registradas</div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums mt-1">
            {counts.total}
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {([
            { id: 'PENDENTES', label: `Pendentes (${counts.pendentes})` },
            { id: 'OS_GERADA', label: `OS Gerada (${counts.osGerada})` },
            { id: 'CONCLUIDA', label: `Concluídas (${counts.concluidas})` },
            { id: 'TODAS', label: `Todas (${counts.total})` }
          ] as const).map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por solicitante, equipamento, local..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-emerald-600"
          />
        </div>
      </div>

      {/* Service Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="text-base font-extrabold text-slate-900">
            Nenhuma solicitação encontrada neste filtro
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Quando um solicitante preencher o formulário através do link exclusivo, o chamado aparecerá imediatamente aqui para atendimento e geração da Ordem de Serviço.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map(sr => {
            const st = getStatusBadge(sr.status);
            const qInfo = getServiceRequestQueueInfo(serviceRequests, sr);
            const isValidated = qInfo.isValidated;
            return (
              <div
                key={sr.id}
                onClick={() => setViewServiceRequestDetail(sr)}
                className={`bg-white rounded-xl border p-4 sm:p-5 transition-colors cursor-pointer space-y-3 ${
                  !isValidated && (sr.status === 'PENDENTE' || sr.status === 'EM_ATENDIMENTO')
                    ? 'border-amber-400 bg-amber-50/20 hover:border-amber-500'
                    : isValidated && sr.urgency === 'URGENTE' && qInfo.inQueue
                    ? 'border-red-300 hover:border-red-400'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {qInfo.inQueue && qInfo.queuePosition !== null ? (
                      <span
                        className={`inline-flex items-center font-mono text-xs font-black px-2.5 py-0.5 rounded-lg tabular-nums ${
                          sr.urgency === 'URGENTE'
                            ? 'bg-red-600 text-white'
                            : 'bg-slate-900 text-white'
                        }`}
                      >
                        <ListOrdered className="w-3 h-3 mr-1" />
                        {qInfo.queuePosition}º na Fila ({sr.farm})
                      </span>
                    ) : !isValidated && (sr.status === 'PENDENTE' || sr.status === 'EM_ATENDIMENTO') ? (
                      <span className="inline-flex items-center text-[11px] font-extrabold text-amber-950 bg-amber-200 px-2.5 py-0.5 rounded-lg border border-amber-400 animate-pulse">
                        <AlertTriangle className="w-3 h-3 mr-1 text-amber-800" />
                        Validar Prioridade
                      </span>
                    ) : null}

                    <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-slate-100 text-slate-900 border border-slate-200">
                      {sr.code}
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${st.cls}`}>
                      {st.label}
                    </span>
                    {isValidated && sr.urgency === 'URGENTE' && (
                      <span className="inline-flex items-center text-[11px] font-extrabold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Urgente
                      </span>
                    )}
                    {isValidated && sr.urgency === 'NORMAL' && (
                      <span className="inline-flex items-center text-[11px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        Normal
                      </span>
                    )}
                    <span className="text-xs text-slate-500 font-mono tabular-nums flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      {sr.date.split('-').reverse().join('/')}
                      <span className="mx-1">·</span>
                      <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      {sr.time}
                    </span>
                  </div>

                  {sr.linkedWorkOrderCode ? (
                    <span className="inline-flex items-center space-x-1 text-xs font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>OS: {sr.linkedWorkOrderCode}</span>
                    </span>
                  ) : !isValidated ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewServiceRequestDetail(sr);
                      }}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded-lg text-xs font-extrabold transition-colors cursor-pointer shrink-0"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Abrir & Validar Prioridade</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        generateWorkOrderFromServiceRequest(sr);
                      }}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 hover:text-white rounded-lg text-xs font-extrabold transition-colors cursor-pointer shrink-0"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Vincular & Gerar OS</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center text-slate-700">
                    <Wrench className="w-3.5 h-3.5 mr-1.5 text-amber-600 shrink-0" />
                    <strong className="truncate">{sr.equipment}</strong>
                  </div>
                  <div className="flex items-center text-slate-700">
                    <MapPin className="w-3.5 h-3.5 mr-1.5 text-emerald-700 shrink-0" />
                    <span className="truncate">{sr.farm} — {sr.location}</span>
                  </div>
                  <div className="flex items-center text-slate-700">
                    <User className="w-3.5 h-3.5 mr-1.5 text-slate-500 shrink-0" />
                    <span className="truncate">Solicitante: <strong>{sr.requesterName}</strong></span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200/80 line-clamp-2">
                  {sr.problemDescription}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Inline QR Code Modal for Android & iOS */}
      {qrPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
          onClick={() => setQrPreview(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200 text-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 text-left">
              <div>
                <span className="inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                  Android · iOS (iPhone)
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">{qrPreview.title}</h3>
                <p className="text-xs text-slate-500">{qrPreview.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setQrPreview(null)}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block">
              <canvas ref={qrCanvasRef} className="rounded-lg max-w-full" />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleCopyText(qrPreview.url, 'qr-preview', qrPreview.title)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {copiedId === 'qr-preview' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedId === 'qr-preview' ? 'Link Copiado!' : 'Copiar Link'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!qrCanvasRef.current) return;
                  qrCanvasRef.current.toBlob(blob => {
                    if (!blob) return;
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'qrcode-elciruelo.png';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 2500);
                  }, 'image/png');
                }}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Baixar QR (PNG)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
