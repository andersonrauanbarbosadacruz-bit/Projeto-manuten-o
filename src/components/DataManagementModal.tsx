import React, { useState, useRef } from 'react';
import { 
  X, 
  Trash2, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  ClipboardCheck, 
  Wrench, 
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  Info,
  Calendar,
  MapPin,
  Check,
  Download,
  Upload,
  ShieldCheck,
  HardDrive
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { INITIAL_CHECKLISTS, INITIAL_WORK_ORDERS } from '../data/initialData';
import { CHECKLIST_TYPE_LABELS, ChecklistType } from '../types';

export const DataManagementModal: React.FC = () => {
  const { 
    showDataManagementModal, 
    setShowDataManagementModal,
    checklists,
    workOrders,
    deleteChecklist,
    deleteWorkOrder,
    restoreItemIndividually,
    clearTestRecords,
    resetToDefaults,
    exportBackupJson,
    importBackupJson,
    syncNow
  } = useApp();

  const [activeTab, setActiveTab] = useState<'ITEMS' | 'BACKUP' | 'RESTORE'>('ITEMS');
  const [filterType, setFilterType] = useState<'TODOS' | 'CHECKLIST' | 'OS'>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!showDataManagementModal) return null;

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleDeleteChecklist = async (id: string, code: string) => {
    try {
      await deleteChecklist(id);
      showFeedback(`Checklist ${code} excluído com sucesso.`);
    } catch {
      showFeedback(`Erro ao excluir ${code}.`);
    }
  };

  const handleDeleteWorkOrder = async (id: string, code: string) => {
    try {
      await deleteWorkOrder(id);
      showFeedback(`Ordem de Serviço ${code} excluída com sucesso.`);
    } catch {
      showFeedback(`Erro ao excluir ${code}.`);
    }
  };

  const handleRestoreSingle = async (type: 'checklist' | 'work-order', id: string, name: string) => {
    setIsProcessing(true);
    try {
      await restoreItemIndividually(type, id);
      showFeedback(`Item "${name}" restaurado com sucesso!`);
    } catch {
      showFeedback(`Erro ao restaurar "${name}".`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearTests = async () => {
    setIsProcessing(true);
    try {
      await clearTestRecords();
      showFeedback('Todos os registros de teste foram removidos!');
    } catch {
      showFeedback('Erro ao limpar testes.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetAll = async () => {
    const confirmed = window.confirm(
      '⚠️ ATENÇÃO: Restaurar o banco para o padrão de fábrica substituirá os registros atuais pelos modelos iniciais. Um backup de emergência será gerado no servidor. Deseja prosseguir?'
    );
    if (!confirmed) return;

    setIsProcessing(true);
    try {
      await resetToDefaults();
      showFeedback('Modelos padrão restaurados! (Backup de emergência preservado)');
    } catch {
      showFeedback('Erro ao restaurar.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportBackup = () => {
    exportBackupJson();
    showFeedback('Cópia de segurança completa (.JSON) gerada com sucesso!');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const res = await importBackupJson(file);
      showFeedback(res.message);
    } catch (err: any) {
      showFeedback(err.message || 'Erro ao importar arquivo.');
    } finally {
      setIsProcessing(false);
      if (e.target) e.target.value = '';
    }
  };

  // Combine active records for the Trash / Management tab
  const allItems = [
    ...checklists.map(c => ({
      kind: 'checklist' as const,
      id: c.id,
      code: c.code,
      title: `${CHECKLIST_TYPE_LABELS[c.type]} (${c.farm})`,
      subtitle: `${c.location} • Inspetor: ${c.inspector}`,
      date: `${c.date} ${c.time}`,
      isDraft: c.isDraft,
      isTemplate: INITIAL_CHECKLISTS.some(init => init.id === c.id)
    })),
    ...workOrders.map(w => ({
      kind: 'work-order' as const,
      id: w.id,
      code: w.code,
      title: `${w.equipment} (${w.farm})`,
      subtitle: `${w.location} • Resp: ${w.responsible} • Status: ${w.status}`,
      date: `${w.date} ${w.time}`,
      isDraft: false,
      isTemplate: INITIAL_WORK_ORDERS.some(init => init.id === w.id)
    }))
  ];

  const filteredItems = allItems.filter(item => {
    if (filterType === 'CHECKLIST' && item.kind !== 'checklist') return false;
    if (filterType === 'OS' && item.kind !== 'work-order') return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        item.code.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in"
      onClick={() => setShowDataManagementModal(false)}
    >
      <div 
        className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 p-5 text-white relative shrink-0">
          <button
            onClick={() => setShowDataManagementModal(false)}
            className="absolute right-4 top-4 p-1.5 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center border border-red-400/30">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-300 block">
                Painel do Administrador
              </span>
              <h2 className="text-xl font-extrabold text-white">
                Gerenciador de Dados, Lixeira & Restauração
              </h2>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-700/60">
            <button
              onClick={() => setActiveTab('ITEMS')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === 'ITEMS'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Itens Salvos & Lixeira ({allItems.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('BACKUP')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === 'BACKUP'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
              <span>Segurança & Backup Antiperda</span>
            </button>

            <button
              onClick={() => setActiveTab('RESTORE')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === 'RESTORE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Modelos Padrão de Fábrica</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div className="bg-emerald-50 text-emerald-900 border-b border-emerald-200 px-5 py-2.5 text-xs font-bold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedbackMessage}</span>
            </div>
          </div>
        )}

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-800 flex-1">
          {activeTab === 'ITEMS' && (
            <div className="space-y-4">
              {/* Quick Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setFilterType('TODOS')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterType === 'TODOS'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Todos ({allItems.length})
                  </button>
                  <button
                    onClick={() => setFilterType('CHECKLIST')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterType === 'CHECKLIST'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Checklists ({checklists.length})
                  </button>
                  <button
                    onClick={() => setFilterType('OS')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterType === 'OS'
                        ? 'bg-amber-600 text-white'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    OS ({workOrders.length})
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleClearTests}
                    disabled={isProcessing}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold border border-red-200 transition-colors cursor-pointer"
                    title="Exclui todos os checklists e ordens de teste que não fazem parte dos dados iniciais"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Limpar Apenas Testes</span>
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Pesquisar por código, fazenda, equipamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Items List */}
              <div className="space-y-2">
                {filteredItems.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                    <Trash2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-600 text-sm">Nenhum registro encontrado</p>
                    <p className="text-xs text-slate-400 mt-0.5">Use a aba de restauração se desejar carregar dados modelo.</p>
                  </div>
                ) : (
                  filteredItems.map(item => (
                    <div
                      key={`${item.kind}_${item.id}`}
                      className="p-3.5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-2xs flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className={`p-2 rounded-xl shrink-0 ${
                          item.kind === 'checklist' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {item.kind === 'checklist' ? (
                            <ClipboardCheck className="w-4 h-4" />
                          ) : (
                            <Wrench className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-xs text-slate-900">
                              {item.code}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              item.kind === 'checklist' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {item.kind === 'checklist' ? 'Checklist' : 'OS'}
                            </span>
                            {item.isTemplate && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                Padrão
                              </span>
                            )}
                            {item.isDraft && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800">
                                Rascunho
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {item.subtitle} • {item.date}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (item.kind === 'checklist') {
                            handleDeleteChecklist(item.id, item.code);
                          } else {
                            handleDeleteWorkOrder(item.id, item.code);
                          }
                        }}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-red-50 hover:bg-red-600 text-red-700 hover:text-white rounded-lg text-xs font-bold border border-red-200 transition-colors shrink-0 cursor-pointer"
                        title={`Excluir ${item.code}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'BACKUP' && (
            <div className="space-y-5">
              {/* Shield Status Banner */}
              <div className="p-4 bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white rounded-2xl border border-emerald-500/30 shadow-md space-y-2">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="font-extrabold text-sm text-emerald-200">
                    Blindagem de Dados e Histórico Antiperda Ativa
                  </span>
                </div>
                <p className="text-xs text-emerald-100/90 leading-relaxed">
                  Todos os checklists e ordens de serviço estão protegidos com persistência em disco no servidor (<code className="bg-black/40 px-1 py-0.5 rounded text-[11px]">/data/database.json</code>), snapshots periódicos de segurança e espelhamento no cofre do navegador. Nenhuma atualização de tela ou comando apaga o seu histórico real.
                </p>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="bg-white/10 rounded-xl p-2.5 text-center border border-white/10">
                    <span className="text-[10px] uppercase font-bold text-emerald-300 block">Checklists no Cofre</span>
                    <strong className="text-lg font-black text-white">{checklists.length}</strong>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2.5 text-center border border-white/10">
                    <span className="text-[10px] uppercase font-bold text-amber-300 block">Ordens de Serviço no Cofre</span>
                    <strong className="text-lg font-black text-white">{workOrders.length}</strong>
                  </div>
                </div>
              </div>

              {/* Action 1: Export Full Backup */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 shrink-0 border border-blue-200">
                    <Download className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-slate-900">
                      1. Baixar Cópia de Segurança Completa (.JSON)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Faça o download de um arquivo com 100% dos checklists, ordens de serviço, evidências fotográficas e itens corrigidos. Você pode guardar esse arquivo no seu computador, pen drive ou enviar por e-mail para ter total tranquilidade.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar Arquivo de Backup (.JSON)</span>
                  </button>
                </div>
              </div>

              {/* Action 2: Import Backup File */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0 border border-emerald-200">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-slate-900">
                      2. Restaurar a partir de Arquivo de Backup (.JSON)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Se você precisar recuperar dados de uma data anterior ou migrar todo o seu histórico para um novo computador, selecione o arquivo de backup baixado anteriormente. Uma cópia de emergência será gerada no servidor antes de aplicar.
                    </p>
                  </div>
                </div>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span>{isProcessing ? 'Processando Arquivo...' : 'Selecionar Arquivo .JSON e Restaurar'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'RESTORE' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-200 text-xs text-blue-900 space-y-1">
                <div className="flex items-center space-x-1.5 font-bold">
                  <Info className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>Restauração Seletiva de Modelos Oficiais</span>
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Você pode restaurar individualmente qualquer modelo de checklist ou ordem de serviço original sem apagar os outros registros salvos.
                </p>
              </div>

              {/* Checklists Templates to Restore */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1">
                  <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                  <span>Checklists Oficiais de Fábrica:</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {INITIAL_CHECKLISTS.map(chk => {
                    const isAlreadyPresent = checklists.some(c => c.id === chk.id);

                    return (
                      <div
                        key={chk.id}
                        className="p-3 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 shadow-2xs space-y-2 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-xs text-emerald-800">
                              {chk.code}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {CHECKLIST_TYPE_LABELS[chk.type]}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-900 mt-1">
                            {chk.farm} • {chk.location}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                            {chk.generalNotes}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRestoreSingle('checklist', chk.id, `${chk.code} (${CHECKLIST_TYPE_LABELS[chk.type]})`)}
                          disabled={isProcessing}
                          className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer ${
                            isAlreadyPresent
                              ? 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200'
                              : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs'
                          }`}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{isAlreadyPresent ? 'Restaurar / Reaplicar' : 'Restaurar este Checklist'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Work Orders Templates to Restore */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1">
                  <Wrench className="w-4 h-4 text-amber-600" />
                  <span>Ordens de Serviço Oficiais de Fábrica:</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {INITIAL_WORK_ORDERS.map(wo => {
                    const isAlreadyPresent = workOrders.some(w => w.id === wo.id);

                    return (
                      <div
                        key={wo.id}
                        className="p-3 bg-white rounded-xl border border-slate-200 hover:border-amber-300 shadow-2xs space-y-2 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-xs text-amber-800">
                              {wo.code}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {wo.status}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-900 mt-1">
                            {wo.equipment} ({wo.farm})
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                            {wo.problemDescription}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRestoreSingle('work-order', wo.id, `${wo.code} (${wo.equipment})`)}
                          disabled={isProcessing}
                          className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer ${
                            isAlreadyPresent
                              ? 'bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200'
                              : 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                          }`}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{isAlreadyPresent ? 'Restaurar / Reaplicar' : 'Restaurar esta OS'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reset Everything Button */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Deseja resetar todo o banco para o estado original?
                </span>
                <button
                  type="button"
                  onClick={handleResetAll}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center space-x-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Restaurar Todos os Exemplos</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-1.5 text-slate-500 text-xs">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Exclusões e restaurações sincronizam em tempo real</span>
          </div>
          <button
            onClick={() => setShowDataManagementModal(false)}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
