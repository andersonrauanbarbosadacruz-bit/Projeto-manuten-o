import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  X, 
  Smartphone, 
  Copy, 
  Check, 
  ExternalLink,
  MessageCircle,
  ShieldCheck,
  HardHat,
  AlertCircle,
  Download,
  Share2,
  MapPin,
  CheckCircle2,
  Info,
  Link2,
  Sparkles,
  ArrowRight,
  BellRing,
  KeyRound,
  UserPlus,
  Send,
  Car,
  ClipboardCheck,
  Wrench,
  Lock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FARMS, Farm, AccessModule, ALL_ACCESS_MODULES } from '../types';

const MODULE_META: Array<{
  id: AccessModule;
  label: string;
  desc: string;
  badge: string;
}> = [
  {
    id: 'service_request',
    label: 'Solicitação de Serviço (SS)',
    desc: 'Abertura / acompanhamento enxuto de chamados',
    badge: 'Enxuto'
  },
  {
    id: 'fleet_update',
    label: 'Frota',
    desc: 'Atualização mensal (KM, sinistro, 4 fotos), veículo e drone',
    badge: 'Enxuto'
  },
  {
    id: 'checklist',
    label: 'Checklist Operacional',
    desc: 'Inspeções de sala de máquinas, gerador e irrigação',
    badge: 'Campo'
  },
  {
    id: 'work_order',
    label: 'Ordem de Serviço (OS)',
    desc: 'Abertura e execução técnica com antes e depois',
    badge: 'Técnico'
  }
];

// Active URLs for this deployment in Google AI Studio
const PRIMARY_SHARED_URL = 'https://ais-pre-ydwzfjmardqsvwnfhd5ocb-738358786007.us-west2.run.app';
const PRIMARY_DEV_URL = 'https://ais-dev-ydwzfjmardqsvwnfhd5ocb-738358786007.us-west2.run.app';

export const MobileAccessModal: React.FC = () => {
  const {
    showMobileAccessModal,
    setShowMobileAccessModal,
    selectedFarmFilter,
    operatorServiceReleases,
    saveOperatorRelease
  } = useApp();
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrRenderError, setQrRenderError] = useState<string | null>(null);

  // Automatically detect the active domain from the browser runtime
  const getDetectedUrls = () => {
    if (typeof window !== 'undefined' && window.location.origin && window.location.origin.startsWith('http')) {
      const origin = window.location.origin;
      if (origin.includes('ais-dev-')) {
        return {
          shared: origin.replace('ais-dev-', 'ais-pre-'),
          dev: origin
        };
      }
      if (origin.includes('ais-pre-')) {
        return {
          shared: origin,
          dev: origin.replace('ais-pre-', 'ais-dev-')
        };
      }
      return {
        shared: origin,
        dev: origin
      };
    }
    return {
      shared: PRIMARY_SHARED_URL,
      dev: PRIMARY_DEV_URL
    };
  };

  const detected = getDetectedUrls();
  const [urlOption, setUrlOption] = useState<'SHARED' | 'CUSTOM' | 'DEV'>('SHARED');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [targetRole, setTargetRole] = useState<'operador' | 'solicitante' | 'admin'>('operador');
  const [selectedModules, setSelectedModules] = useState<AccessModule[]>([
    'fleet_update',
    'checklist',
    'work_order'
  ]);
  const [targetFarm, setTargetFarm] = useState<Farm | 'TODAS'>(
    selectedFarmFilter !== 'TODAS' ? selectedFarmFilter : 'TODAS'
  );
  const [operatorReleaseMode, setOperatorReleaseMode] = useState<'STANDARD' | 'EXCLUSIVE'>('STANDARD');
  const [selectedReleaseToken, setSelectedReleaseToken] = useState<string>('');
  const [quickReleaseName, setQuickReleaseName] = useState('');
  const [isCreatingQuickRelease, setIsCreatingQuickRelease] = useState(false);

  const toggleModule = (mod: AccessModule) => {
    setSelectedModules(prev => {
      const exists = prev.includes(mod);
      let next: AccessModule[];
      if (exists) {
        if (prev.length <= 1) return prev; // Keep at least 1 module enabled
        next = prev.filter(m => m !== mod);
      } else {
        next = [...prev, mod];
      }

      if (targetRole === 'solicitante') {
        const hasFullOpModule = next.includes('checklist') || next.includes('work_order');
        if (hasFullOpModule) {
          setTargetRole('operador');
        }
      }
      if (mod === 'service_request' && !next.includes('service_request') && operatorReleaseMode === 'EXCLUSIVE') {
        setOperatorReleaseMode('STANDARD');
      }
      if (mod === 'work_order' && !next.includes('work_order') && operatorReleaseMode === 'EXCLUSIVE') {
        setOperatorReleaseMode('STANDARD');
      }
      return next;
    });
  };

  const applyPreset = (mods: AccessModule[]) => {
    setSelectedModules(mods);
    const hasFullOpModule = mods.includes('checklist') || mods.includes('work_order');
    if (hasFullOpModule) {
      setTargetRole('operador');
    } else if (targetRole !== 'operador') {
      setOperatorReleaseMode('STANDARD');
      setTargetRole('solicitante');
    } else {
      if (!mods.includes('service_request') || !mods.includes('work_order')) {
        setOperatorReleaseMode('STANDARD');
      }
    }
  };

  const handleSelectOperatorAlerts = (mode: 'STANDARD' | 'EXCLUSIVE') => {
    setOperatorReleaseMode(mode);
    if (mode === 'EXCLUSIVE') {
      setSelectedModules(prev => {
        const next = [...prev];
        if (!next.includes('service_request')) next.push('service_request');
        if (!next.includes('work_order')) next.push('work_order');
        return next;
      });
    } else {
      setSelectedModules(prev => {
        const filtered = prev.filter(m => m !== 'service_request');
        return filtered.length > 0 ? filtered : ['checklist', 'work_order'];
      });
    }
  };

  const activeReleases = operatorServiceReleases.filter(r => r.active);

  const handleCreateQuickRelease = async () => {
    if (!quickReleaseName.trim()) return;
    setIsCreatingQuickRelease(true);
    try {
      const created = await saveOperatorRelease({
        operatorName: quickReleaseName.trim(),
        farm: targetFarm,
        active: true
      });
      if (created) {
        setSelectedReleaseToken(created.token);
        setQuickReleaseName('');
      }
    } finally {
      setIsCreatingQuickRelease(false);
    }
  };

  // Default targetFarm to TODAS or current filter, but do NOT override user manual toggle inside modal
  useEffect(() => {
    if (showMobileAccessModal && !selectedReleaseToken && activeReleases.length > 0) {
      setSelectedReleaseToken(activeReleases[0].token);
    }
  }, [showMobileAccessModal, activeReleases, selectedReleaseToken]);

  // Compute final URL based on selected base and parameters
  const normalizeBaseUrl = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return detected.shared;
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return withProtocol.replace('ais-dev-', 'ais-pre-');
  };

  const getSelectedBaseUrl = () => {
    if (urlOption === 'CUSTOM' && customUrlInput.trim()) {
      return normalizeBaseUrl(customUrlInput);
    }
    if (urlOption === 'DEV') return detected.dev;
    return detected.shared;
  };

  const getFullUrl = () => {
    const rawBase = getSelectedBaseUrl();
    const isAdminLink = targetRole === 'admin';
    const hasFullOpModule = selectedModules.includes('checklist') || selectedModules.includes('work_order');
    const isExclusiveOperator =
      !isAdminLink &&
      targetRole === 'operador' &&
      operatorReleaseMode === 'EXCLUSIVE' &&
      Boolean(selectedReleaseToken);
    const effectiveRole: 'admin' | 'operador' | 'solicitante' = isAdminLink
      ? 'admin'
      : hasFullOpModule || isExclusiveOperator || targetRole === 'operador'
      ? 'operador'
      : 'solicitante';

    const selectedRel =
      isExclusiveOperator
        ? activeReleases.find(r => r.token === selectedReleaseToken) || null
        : null;
    const activeToken = selectedRel ? selectedRel.token : null;
    const effectiveFarm: Farm | 'TODAS' =
      selectedRel && selectedRel.farm !== 'TODAS' ? selectedRel.farm : targetFarm;
    const modsParamValue = isAdminLink ? '' : selectedModules.join(',');

    try {
      const urlObj = new URL(rawBase);
      urlObj.searchParams.set('perfil', effectiveRole);
      if (effectiveRole === 'operador') {
        urlObj.searchParams.set('somente_operador', 'true');
        urlObj.searchParams.set('lock_role', 'true');
        urlObj.searchParams.delete('somente_solicitante');
        urlObj.searchParams.set('mods', modsParamValue);
        if (selectedRel) {
          urlObj.searchParams.set('ss_key', selectedRel.token);
          urlObj.searchParams.set('ss_op', selectedRel.operatorName);
          urlObj.searchParams.set('ss_farm', selectedRel.farm);
          urlObj.searchParams.set('ss_rid', selectedRel.id);
        } else {
          urlObj.searchParams.delete('ss_key');
          urlObj.searchParams.delete('ss_op');
          urlObj.searchParams.delete('ss_farm');
          urlObj.searchParams.delete('ss_rid');
        }
      } else if (effectiveRole === 'solicitante') {
        urlObj.searchParams.set('somente_solicitante', 'true');
        urlObj.searchParams.set('lock_role', 'true');
        urlObj.searchParams.set('mods', modsParamValue);
        urlObj.searchParams.delete('somente_operador');
        urlObj.searchParams.delete('ss_key');
        urlObj.searchParams.delete('ss_op');
        urlObj.searchParams.delete('ss_farm');
        urlObj.searchParams.delete('ss_rid');
      } else {
        urlObj.searchParams.delete('somente_operador');
        urlObj.searchParams.delete('somente_solicitante');
        urlObj.searchParams.delete('lock_role');
        urlObj.searchParams.delete('mods');
        urlObj.searchParams.delete('ss_key');
        urlObj.searchParams.delete('ss_op');
        urlObj.searchParams.delete('ss_farm');
        urlObj.searchParams.delete('ss_rid');
      }
      if (effectiveFarm === 'TODAS') {
        urlObj.searchParams.set('fazenda', 'TODAS');
        urlObj.searchParams.set('todas_fazendas', 'true');
      } else {
        urlObj.searchParams.set('fazenda', effectiveFarm);
        urlObj.searchParams.delete('todas_fazendas');
      }
      return urlObj.toString();
    } catch {
      const separator = rawBase.includes('?') ? '&' : '?';
      const farmPart = effectiveFarm === 'TODAS' 
        ? '&fazenda=TODAS&todas_fazendas=true' 
        : `&fazenda=${encodeURIComponent(effectiveFarm)}`;
      const modsPart = !isAdminLink ? `&mods=${encodeURIComponent(modsParamValue)}` : '';
      const lockPart = effectiveRole === 'operador'
        ? `&somente_operador=true&lock_role=true${activeToken && selectedRel ? `&ss_key=${encodeURIComponent(activeToken)}&ss_op=${encodeURIComponent(selectedRel.operatorName)}&ss_farm=${encodeURIComponent(selectedRel.farm)}&ss_rid=${encodeURIComponent(selectedRel.id)}` : ''}`
        : effectiveRole === 'solicitante'
        ? '&somente_solicitante=true&lock_role=true'
        : '';
      return `${rawBase}${separator}perfil=${effectiveRole}${farmPart}${modsPart}${lockPart}`;
    }
  };

  const finalUrl = getFullUrl();

  // Render high-contrast QR Code onto Canvas whenever finalUrl or visibility changes
  // Tuned with errorCorrectionLevel 'M', width 280, margin 3 for instant recognition on both iOS Camera & Android Google Lens
  useEffect(() => {
    if (!showMobileAccessModal) return;

    const timer = setTimeout(() => {
      if (canvasRef.current) {
        QRCode.toCanvas(
          canvasRef.current,
          finalUrl,
          {
            width: 280,
            margin: 3,
            color: {
              dark: '#000000',
              light: '#ffffff'
            },
            errorCorrectionLevel: 'M'
          },
          (error) => {
            if (error) {
              console.error('Erro ao renderizar QR Code:', error);
              setQrRenderError('Falha ao gerar o código QR');
            } else {
              setQrRenderError(null);
            }
          }
        );
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [finalUrl, showMobileAccessModal]);

  if (!showMobileAccessModal) return null;

  const copyTextUniversal = async (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Fallback below for iOS Safari / Android WebViews
      }
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(textArea);
    return ok;
  };

  const handleCopyLink = async () => {
    try {
      await copyTextUniversal(finalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  const handleDownloadQr = () => {
    if (!canvasRef.current) return;
    const safeFarmName = targetFarm === 'TODAS' ? 'todas_fazendas' : targetFarm.replace(/\s+/g, '_');
    const fileName = `qrcode-elciruelo-${targetRole}-${safeFarmName}.png`;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], fileName, { type: 'image/png' });
        if (
          typeof navigator !== 'undefined' &&
          'canShare' in navigator &&
          typeof navigator.canShare === 'function' &&
          navigator.canShare({ files: [file] }) &&
          /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '')
        ) {
          try {
            await navigator.share({
              title: 'QR Code el Ciruelo',
              files: [file]
            });
            return;
          } catch {
            // Fall through to object URL download if share cancelled
          }
        }
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = fileName;
        link.href = blobUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2500);
      }, 'image/png');
    } catch (err) {
      console.error('Erro ao baixar imagem:', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'el Ciruelo - Acesso Mobile',
          text: `Acesse o sistema el Ciruelo das Fazendas (${targetRole.toUpperCase()}${targetFarm !== 'TODAS' ? ` - ${targetFarm}` : ''}):`,
          url: finalUrl
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  const farmLabelText = targetFarm === 'TODAS' ? 'Todas as Fazendas' : targetFarm;
  const selectedReleaseObj = activeReleases.find(r => r.token === selectedReleaseToken);
  const selectedModulesSummary = targetRole === 'admin'
    ? 'Acesso Total (incluindo NR-13)'
    : MODULE_META.filter(m => selectedModules.includes(m.id)).map(m => m.label).join(', ');

  const whatsappMessage = targetRole === 'solicitante'
    ? `*el Ciruelo - Acesso Rápido de Campo*\n\nOlá! Use este link para acessar:\n\n📋 *Telas Liberadas:* ${selectedModulesSummary}\n📍 *Unidade:* ${farmLabelText}\n🔗 *Link Direto:* ${finalUrl}`
    : `*el Ciruelo - Acesso Operador / Técnico*\n\nOlá equipe! Acesse o sistema pelo celular:\n\n🚜 *Perfil:* ${targetRole.toUpperCase()}${targetRole === 'operador' ? (operatorReleaseMode === 'EXCLUSIVE' && selectedReleaseObj ? ` (Alertas de SS na Tela Principal: SIM — ${selectedReleaseObj.operatorName})` : ' (Alertas de SS: NÃO)') : ''}\n📋 *Acessos:* ${selectedModulesSummary}\n📍 *Fazenda:* ${farmLabelText}\n🔗 *Link Direto:* ${finalUrl}\n\n_Dica: Abra no Chrome ou Safari do celular e use normalmente!_`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in"
      onClick={() => setShowMobileAccessModal(false)}
    >
      <div 
        className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 max-h-[94vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 p-5 text-white relative shrink-0">
          <button
            onClick={() => setShowMobileAccessModal(false)}
            className="absolute right-4 top-4 p-1.5 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-400/30">
              <Smartphone className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 block">
                Vale das Uvas • Brasil Uvas • Labrunier 1 & 2
              </span>
              <h2 className="text-xl font-extrabold text-white">
                Como Abrir o Sistema no Celular
              </h2>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto text-slate-800">
          
          {/* ANDROID & iOS READY BANNER */}
          <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-300 space-y-2 text-xs text-emerald-950">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2 font-extrabold text-sm text-emerald-950">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>QR Code e Link Liberados para Android e iOS</span>
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-700 text-white">
                Android · iPhone
              </span>
            </div>
            <p className="text-[11px] text-emerald-900 leading-relaxed">
              O QR Code e os links abaixo já apontam para o endereço público (<strong>ais-pre</strong>), pronto para abrir direto na câmera do <strong>iPhone (Safari)</strong> e <strong>Android (Chrome / Lens)</strong> ou pelo WhatsApp sem pedir login do Google.
            </p>
            <details className="text-[11px] text-slate-700 bg-white/80 rounded-xl border border-emerald-200 px-3 py-2">
              <summary className="font-bold text-emerald-900 cursor-pointer">
                Dica sobre link público vs. link do PC
              </summary>
              <ol className="list-decimal pl-4 space-y-1 mt-1.5 text-slate-600">
                <li>
                  Nunca envie o link <code>ais-dev</code> para celulares externos, pois ele funciona apenas na sessão privada do PC. Use sempre o <strong>Link Público</strong> ou um endereço próprio em <strong>Colar Link (Customizado)</strong>.
                </li>
                <li>
                  Se o aplicativo estiver hospedado em servidor próprio da empresa, cole o endereço na aba <strong>Colar Link (Customizado)</strong> para atualizar todos os QR Codes e links do WhatsApp.
                </li>
              </ol>
            </details>
          </div>

          {/* Configuration Grid: Profile & Farm */}
          <div className="space-y-3">
            {/* Target Profile */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                1. Tipo de Acesso / Perfil no Link:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setTargetRole('solicitante');
                    setOperatorReleaseMode('STANDARD');
                    const leanOnly = selectedModules.filter(m => m === 'service_request' || m === 'fleet_update');
                    setSelectedModules(leanOnly.length > 0 ? leanOnly : ['service_request']);
                    if (targetFarm === 'TODAS') {
                      setTargetFarm(selectedFarmFilter !== 'TODAS' ? selectedFarmFilter : FARMS[0]);
                    }
                  }}
                  className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                    targetRole === 'solicitante'
                      ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <Send className="w-4 h-4 mb-1" />
                  <span>Campo Enxuto</span>
                  <span className="text-[9px] opacity-80">(SS / Frota)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTargetRole('operador');
                    if (!selectedModules.includes('checklist') && !selectedModules.includes('work_order')) {
                      setSelectedModules(['fleet_update', 'checklist', 'work_order']);
                    }
                  }}
                  className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                    targetRole === 'operador'
                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <HardHat className="w-4 h-4 mb-1" />
                  <span>Operador</span>
                  <span className="text-[9px] opacity-80">(Sem excluir)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTargetRole('admin');
                    setSelectedModules(ALL_ACCESS_MODULES);
                  }}
                  className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                    targetRole === 'admin'
                      ? 'bg-slate-900 text-amber-300 border-slate-950 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 mb-1" />
                  <span>Admin</span>
                  <span className="text-[9px] opacity-80">(Controle total)</span>
                </button>
              </div>

              {targetRole !== 'admin' ? (
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      2. Escolher Acessos Liberados neste Link:
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Selecione 1 ou mais telas
                    </span>
                  </div>

                  {/* Quick presets */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyPreset(['service_request'])}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                        selectedModules.length === 1 && selectedModules[0] === 'service_request'
                          ? 'bg-emerald-700 text-white border-emerald-800'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      Só SS (Enxuto)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset(['fleet_update'])}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                        selectedModules.length === 1 && selectedModules[0] === 'fleet_update'
                          ? 'bg-cyan-700 text-white border-cyan-800'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      Só Frota (Enxuto)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset(['service_request', 'fleet_update'])}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                        selectedModules.length === 2 &&
                        selectedModules.includes('service_request') &&
                        selectedModules.includes('fleet_update')
                          ? 'bg-emerald-700 text-white border-emerald-800'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      SS + Frota (Enxuto)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset(['checklist', 'work_order'])}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                        selectedModules.length === 2 &&
                        selectedModules.includes('checklist') &&
                        selectedModules.includes('work_order')
                          ? 'bg-blue-700 text-white border-blue-800'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      Checklist + OS
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset([...ALL_ACCESS_MODULES])}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                        selectedModules.length === 4
                          ? 'bg-slate-900 text-white border-slate-950'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      Todos Operacionais
                    </button>
                  </div>

                  {/* Module checkboxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {MODULE_META.map(mod => {
                      const active = selectedModules.includes(mod.id);
                      return (
                        <button
                          key={mod.id}
                          type="button"
                          onClick={() => toggleModule(mod.id)}
                          className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-start space-x-2 ${
                            active
                              ? 'bg-white border-emerald-600 ring-1 ring-emerald-500/40 shadow-2xs'
                              : 'bg-slate-100/80 border-slate-200 text-slate-500 hover:bg-white'
                          }`}
                        >
                          <div className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center border shrink-0 ${
                            active
                              ? 'bg-emerald-600 border-emerald-700 text-white'
                              : 'bg-white border-slate-300'
                          }`}>
                            {active && <Check className="w-3 h-3" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className={`text-[11px] font-extrabold truncate ${active ? 'text-slate-900' : 'text-slate-600'}`}>
                                {mod.label}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'
                              }`}>
                                {mod.badge}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                              {mod.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[10px] bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-950 rounded-lg px-2.5 py-1.5 font-semibold">
                    <span className="flex items-center space-x-1">
                      <Lock className="w-3 h-3 text-fuchsia-800 shrink-0" />
                      <span>Laudos e Calibrações (NR-13) permanece exclusivo do Administrador.</span>
                    </span>
                  </div>

                  {!selectedModules.includes('checklist') && !selectedModules.includes('work_order') && (
                    <p className="text-[11px] text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                      ✨ <strong>Tela Ultra-Enxuta:</strong> Este link abrirá apenas{' '}
                      <strong>
                        {selectedModules.includes('service_request') && selectedModules.includes('fleet_update')
                          ? 'Solicitação de Serviço e Frota'
                          : selectedModules.includes('service_request')
                          ? 'Solicitação de Serviço'
                          : 'Frota'}
                      </strong>{' '}
                      sem painel administrativo nem menus extras.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-amber-950 bg-amber-50 border border-amber-200 rounded-lg p-2">
                  👑 <strong>Controle Total:</strong> Libera Checklists, OS, Frota, Solicitações e <strong>Laudos & Calibrações (NR-13)</strong>.
                </p>
              )}
            </div>

            {/* Alertas de Abertura de SS na Tela Principal (Decisão obrigatória ao criar acesso de Operador/Técnico) */}
            {targetRole === 'operador' && (
              <div className="bg-amber-50/80 p-3.5 rounded-2xl border-2 border-amber-300 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[11px] font-bold text-amber-950 uppercase tracking-wider flex items-center">
                    <BellRing className="w-3.5 h-3.5 mr-1 text-amber-700" />
                    3. Receber Alertas de Abertura de SS na Tela Principal?
                  </label>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    operatorReleaseMode === 'EXCLUSIVE' && selectedReleaseToken
                      ? 'bg-emerald-600 text-white'
                      : operatorReleaseMode === 'EXCLUSIVE'
                      ? 'bg-amber-500 text-stone-950'
                      : 'bg-slate-800 text-white'
                  }`}>
                    {operatorReleaseMode === 'EXCLUSIVE'
                      ? selectedReleaseToken ? 'Alertas Ativos' : 'Selecione/Libere Técnico'
                      : 'Sem Alertas de SS'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectOperatorAlerts('STANDARD')}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                      operatorReleaseMode === 'STANDARD'
                        ? 'bg-slate-900 text-white border-slate-950 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <div>Não Receber Alertas de SS</div>
                    <div className="text-[10px] opacity-80 font-normal mt-0.5">
                      Operador padrão · não exibe alertas de abertura de SS na tela principal
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectOperatorAlerts('EXCLUSIVE')}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                      operatorReleaseMode === 'EXCLUSIVE'
                        ? 'bg-amber-500 text-stone-950 border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center space-x-1">
                      <KeyRound className="w-3.5 h-3.5 shrink-0" />
                      <span>Sim, Receber Alertas de SS</span>
                    </div>
                    <div className="text-[10px] opacity-85 font-normal mt-0.5">
                      Recebe alertas na tela principal, decide prioridade, vincula e abre OS para executar
                    </div>
                  </button>
                </div>

                {operatorReleaseMode === 'EXCLUSIVE' && (
                  <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-2.5">
                    {activeReleases.length > 0 && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Selecionar Operador / Técnico Autorizado:
                        </label>
                        <select
                          value={selectedReleaseToken}
                          onChange={e => {
                            const tok = e.target.value;
                            setSelectedReleaseToken(tok);
                            const rel = activeReleases.find(r => r.token === tok);
                            if (rel && rel.farm !== 'TODAS') {
                              setTargetFarm(rel.farm);
                            }
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                        >
                          {activeReleases.map(rel => (
                            <option key={rel.id} value={rel.token}>
                              {rel.operatorName} ({rel.farm === 'TODAS' ? 'Todas Fazendas' : rel.farm})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className={activeReleases.length > 0 ? 'pt-2 border-t border-slate-100' : ''}>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        {activeReleases.length > 0 ? 'Ou cadastrar novo técnico com alertas:' : 'Cadastrar Técnico para Receber Alertas:'}
                      </label>
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="text"
                          placeholder="Nome do Técnico / Operador (ex: João)"
                          value={quickReleaseName}
                          onChange={e => setQuickReleaseName(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900"
                        />
                        <button
                          type="button"
                          onClick={handleCreateQuickRelease}
                          disabled={!quickReleaseName.trim() || isCreatingQuickRelease}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold cursor-pointer shrink-0"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>{isCreatingQuickRelease ? 'Salvando...' : 'Liberar'}</span>
                        </button>
                      </div>
                    </div>

                    {!selectedReleaseToken && (
                      <div className="p-2 rounded-lg bg-amber-100 border border-amber-300 text-[11px] font-bold text-amber-950">
                        ⚠️ Digite o nome do operador/técnico acima e clique em <strong>Liberar</strong> para incluir a chave de alertas de SS neste link/QR Code.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Target Farm Pre-selection */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center">
                <MapPin className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                {targetRole === 'operador' ? '4' : targetRole === 'solicitante' ? '3' : '2'}. Fazenda Pré-selecionada:
              </label>
              <select
                value={targetFarm}
                onChange={(e) => setTargetFarm(e.target.value as Farm | 'TODAS')}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="TODAS">Todas as Fazendas (Sem restrição)</option>
                {FARMS.map(f => (
                  <option key={f} value={f}>Exclusivo: {f}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500">
                {targetFarm !== 'TODAS' && (targetRole === 'operador' || targetRole === 'solicitante') ? (
                  <span className="font-bold text-emerald-800 flex items-center mt-0.5">
                    🔒 Acesso ficará restrito exclusivamente a {targetFarm}
                  </span>
                ) : (
                  <span>Ao abrir o link ou ler o QR Code, o sistema abrirá pré-configurado com estes parâmetros.</span>
                )}
              </p>
            </div>
          </div>

          {/* QR Code Canvas Card */}
          <div className="flex flex-col items-center justify-center text-center p-5 bg-gradient-to-b from-slate-50 to-emerald-50/40 rounded-2xl border border-emerald-200/80">
            <div className="p-3.5 bg-white rounded-2xl shadow-lg border-2 border-slate-200 flex items-center justify-center relative">
              <canvas ref={canvasRef} className="rounded-lg max-w-full" />
              {qrRenderError && (
                <div className="absolute inset-0 bg-white/95 flex items-center justify-center text-xs text-red-600 p-2 font-bold">
                  {qrRenderError}
                </div>
              )}
            </div>

            <p className="text-sm font-extrabold text-slate-900 mt-3.5">
              Aponte a câmera do celular para este QR Code
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              Abrirá em perfil <strong className="text-blue-700">{targetRole.toUpperCase()}</strong>
              {targetRole !== 'admin' && (
                <span> · Acessos: <strong className="text-slate-900">{selectedModulesSummary}</strong></span>
              )}
              {targetRole === 'operador' && (
                <span>
                  {' · Alertas de SS: '}
                  {operatorReleaseMode === 'EXCLUSIVE' && selectedReleaseObj ? (
                    <strong className="text-amber-700">SIM ({selectedReleaseObj.operatorName})</strong>
                  ) : (
                    <strong className="text-slate-700">NÃO</strong>
                  )}
                </span>
              )}
              {targetFarm !== 'TODAS' && <span> · Fazenda: <strong className="text-emerald-700">{targetFarm}</strong></span>}.
            </p>

            {/* Quick Actions for QR Code */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
              <button
                type="button"
                onClick={handleDownloadQr}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                title="Salvar imagem para imprimir ou colar na casa de bombas / tratores"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Baixar Imagem QR (PNG)</span>
              </button>

              {'share' in navigator && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Compartilhar</span>
                </button>
              )}
            </div>
          </div>

          {/* WhatsApp Direct Action Button */}
          <div>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center space-x-2 px-4 py-3.5 bg-[#25D366] hover:bg-[#1ebd5a] text-white rounded-xl font-extrabold text-sm shadow-md transition-all active:scale-98 cursor-pointer"
            >
              <MessageCircle className="w-5 h-5 fill-white text-[#25D366]" />
              <span>Enviar Link pelo WhatsApp dos Operadores</span>
            </a>
          </div>

          {/* Option to Choose URL or Paste the Link generated by AI Studio Share Button */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-3">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
              Seletor do Link do Aplicativo:
            </span>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setUrlOption('SHARED')}
                className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                  urlOption === 'SHARED'
                    ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs font-bold'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 font-medium'
                }`}
              >
                <div className="text-xs">Link Público</div>
                <div className="text-[9px] opacity-80">(Android / iOS)</div>
              </button>

              <button
                type="button"
                onClick={() => setUrlOption('CUSTOM')}
                className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                  urlOption === 'CUSTOM'
                    ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs font-bold'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 font-medium'
                }`}
              >
                <div className="text-xs">Colar Link</div>
                <div className="text-[9px] opacity-80">(Customizado)</div>
              </button>

              <button
                type="button"
                onClick={() => setUrlOption('DEV')}
                className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                  urlOption === 'DEV'
                    ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs font-bold'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 font-medium'
                }`}
              >
                <div className="text-xs">Link Dev</div>
                <div className="text-[9px] opacity-80">(Apenas PC)</div>
              </button>
            </div>

            {urlOption === 'SHARED' && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-950 leading-relaxed">
                <strong>Atenção sobre versões no celular:</strong> o endereço público (<code className="font-mono">ais-pre</code>) depende da publicação externa da plataforma e não é atualizado automaticamente pelo código do app. Para testar no telefone sem cache antigo, abra o link em uma <strong>aba anônima</strong>. Caso utilize servidor próprio, informe a URL na opção <strong>Colar Link (Customizado)</strong>. O <em>Link Dev</em> funciona apenas no PC.
              </div>
            )}

            {/* Custom URL Input if user hosts externally or has a custom link */}
            {urlOption === 'CUSTOM' && (
              <div className="p-3 bg-white rounded-xl border border-emerald-300 space-y-2 animate-in fade-in">
                <label className="block text-[11px] font-bold text-emerald-900">
                  Cole aqui o link público ou do seu servidor onde o sistema está publicado:
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="url"
                    placeholder="https://..."
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  O QR Code e o botão do WhatsApp atualizarão imediatamente para este link.
                </p>
              </div>
            )}
          </div>

          {/* Link Field & Copy */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Link Ativo do QR Code:
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={finalUrl}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 truncate focus:outline-none select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copiado!' : 'Copiar Link'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-[11px] text-slate-500">
                Teste de abertura:
              </span>
              <a
                href={finalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-700 hover:text-emerald-800 font-bold inline-flex items-center"
              >
                <span>Testar abertura em nova aba</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </a>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-1.5 text-slate-500 text-xs">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Compatível com Android e iPhone</span>
          </div>
          <button
            onClick={() => setShowMobileAccessModal(false)}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
