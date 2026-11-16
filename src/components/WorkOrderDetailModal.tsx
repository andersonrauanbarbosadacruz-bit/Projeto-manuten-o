import React, { useState, useRef } from 'react';
import { 
  X, 
  ArrowLeft,
  Printer, 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  Building2, 
  AlertTriangle, 
  CheckCircle2, 
  Camera, 
  Plus, 
  Layers, 
  Eye, 
  FileText,
  Trash2,
  Share2,
  Download
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { compressImage } from '../utils/imageCompressor';
import { WorkOrderPhoto, WorkOrderStatus } from '../types';
import { exportWorkOrderToPdf } from '../utils/pdfGenerator';
import { downloadWorkOrderDocument } from '../utils/documentDownloader';

export const WorkOrderDetailModal: React.FC = () => {
  const { 
    viewWorkOrderDetail, 
    setViewWorkOrderDetail, 
    updateWorkOrder, 
    setPreviewImage,
    requestDelete,
    userRole,
    setShowSyncModal
  } = useApp();

  const [isFinishing, setIsFinishing] = useState(false);
  const [closingNotes, setClosingNotes] = useState('');
  const [closingDate, setClosingDate] = useState('');
  const [closingTime, setClosingTime] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const finishFileInputRef = useRef<HTMLInputElement>(null);

  if (!viewWorkOrderDetail) return null;

  const wo = viewWorkOrderDetail;

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportWorkOrderToPdf(wo);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    window.focus();
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleStatusChange = (newStatus: WorkOrderStatus) => {
    const now = new Date();
    updateWorkOrder(wo.id, {
      status: newStatus,
      completionDate: newStatus === 'CONCLUIDA' ? (wo.completionDate || now.toISOString().split('T')[0]) : wo.completionDate,
      completionTime: newStatus === 'CONCLUIDA' ? (wo.completionTime || now.toTimeString().substring(0, 5)) : wo.completionTime
    });
  };

  const handleAddAfterPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPhoto(true);
    try {
      const newPhotos: WorkOrderPhoto[] = [];
      for (const file of Array.from(files)) {
        const compressed = await compressImage(file, 1200, 1200, 0.72);
        newPhotos.push({
          id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          url: compressed,
          caption: 'Foto do reparo concluído',
          timestamp: new Date().toLocaleString('pt-BR')
        });
      }

      const existingAfter = wo.photosAfter || [];
      updateWorkOrder(wo.id, {
        photosAfter: [...existingAfter, ...newPhotos]
      });
    } catch (err) {
      console.error('Erro ao anexar foto:', err);
    } finally {
      setIsUploadingPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  const startFinishingFlow = () => {
    const now = new Date();
    setClosingDate(wo.completionDate || now.toISOString().split('T')[0]);
    setClosingTime(wo.completionTime || now.toTimeString().substring(0, 5));
    setClosingNotes(wo.solutionDescription || '');
    setIsFinishing(true);
  };

  const handleSaveFinishing = () => {
    const now = new Date();
    const finalDate = closingDate.trim() || now.toISOString().split('T')[0];
    const finalTime = closingTime.trim() || now.toTimeString().substring(0, 5);

    updateWorkOrder(wo.id, {
      status: 'CONCLUIDA',
      solutionDescription: closingNotes || wo.solutionDescription || 'Manutenção realizada com sucesso e equipamento testado.',
      completionDate: finalDate,
      completionTime: finalTime
    });
    setIsFinishing(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-100 flex flex-col modal-print-overlay">
      {/* Sticky Fullscreen Top Bar */}
      <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 px-3 sm:px-6 py-2.5 sm:py-3 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs no-print">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 max-w-full">
          <button
            onClick={() => setViewWorkOrderDetail(null)}
            className="inline-flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer shrink-0"
            title="Voltar à tela anterior"
          >
            <ArrowLeft className="w-4 h-4 text-slate-700" />
            <span>Voltar</span>
          </button>
          <div className="flex items-center space-x-1.5 min-w-0 truncate">
            <span className="font-mono text-xs font-bold bg-amber-100 text-amber-950 px-2 py-0.5 rounded shrink-0">
              {wo.code}
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              Ficha Técnica - Ordem de Serviço
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
          <button
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-stone-950 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            title="Baixar arquivo PDF oficial da OS no computador ou celular"
          >
            <Download className="w-4 h-4 text-stone-950" />
            <span className="hidden sm:inline">{isExportingPdf ? 'Gerando...' : 'Baixar PDF'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
            title="Tentar imprimir direto pela janela do navegador"
          >
            <Printer className="w-4 h-4 text-slate-300" />
            <span className="hidden md:inline">Imprimir Direto</span>
          </button>

          <button
            onClick={() => setShowSyncModal(true)}
            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-colors cursor-pointer"
            title="Transmitir esta e todas as OS para o computador via WhatsApp ou QR Code"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Enviar ao PC</span>
          </button>

          {userRole === 'ADMIN' && (
            <button
              onClick={() => {
                requestDelete({
                  type: 'work-order',
                  id: wo.id,
                  code: wo.code,
                  description: `${wo.equipment} - ${wo.location}`
                });
              }}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold border border-red-200 transition-colors cursor-pointer"
              title="Excluir esta Ordem de Serviço"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir</span>
            </button>
          )}

          <button
            onClick={() => setViewWorkOrderDetail(null)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Fechar Ficha"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Fullscreen Body Container */}
      <div className="flex-1 w-full max-w-5xl mx-auto p-2 sm:p-6 md:p-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-8 space-y-6 text-slate-900 modal-print-card">
          {/* Quick Download & Print Helper Notice */}
          <div className="no-print bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 text-amber-950">
              <Download className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Opção de Baixar no PC:</strong> Salve o documento completo da Ordem de Serviço em formato <strong>PDF</strong> no seu computador para abrir, imprimir em A4 ou anexar em relatórios.
              </span>
            </div>
            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-stone-950 font-bold shrink-0 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Gerando PDF...' : 'Baixar OS em PDF'}</span>
            </button>
          </div>
          {/* Official Document Header */}
          <div className="border-b-2 border-slate-900 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center font-black text-sm">
                    🍇
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                    ORDEM DE SERVIÇO DE MANUTENÇÃO
                  </h1>
                </div>
                <p className="text-xs text-slate-500 font-semibold tracking-wide uppercase mt-0.5">
                  Serviços Internos e Terceirizados • Fazenda {wo.farm}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="inline-block text-sm font-mono font-black bg-slate-100 border border-slate-400 px-3 py-1 rounded">
                  {wo.code}
                </span>
                <div className="flex items-center justify-end space-x-2 mt-1">
                  <span className={`text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    wo.maintenanceType === 'PREVENTIVA'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}>
                    {wo.maintenanceType === 'PREVENTIVA' ? '🛡️ Preventiva' : '⚠️ Corretiva'}
                  </span>
                  <p className="text-xs text-slate-500">
                    Prioridade: <strong className="text-slate-900">{wo.priority}</strong> • Status: <strong className="text-slate-900">{wo.status}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Metadata Box */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">
                  Unidade / Fazenda
                </span>
                <span className="font-extrabold text-slate-900 text-sm">
                  {wo.farm}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400 font-bold uppercase block text-[10px]">
                  Equipamento
                </span>
                <span className="font-extrabold text-slate-900 text-sm">
                  {wo.equipment || 'Equipamento Geral'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">
                  Local Específico
                </span>
                <span className="font-semibold text-slate-800">
                  {wo.location}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">
                  Início do Serviço
                </span>
                <span className="font-semibold text-slate-800">
                  {wo.date} às {wo.time}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">
                  Conclusão do Serviço
                </span>
                <span className={`font-semibold ${wo.completionDate ? 'text-emerald-800' : 'text-amber-700'}`}>
                  {wo.completionDate ? `${wo.completionDate} às ${wo.completionTime || '--:--'}` : 'Em aberto'}
                </span>
              </div>
            </div>

            {wo.serviceRequestCode && (
              <div className="mt-2.5 px-3.5 py-2 bg-emerald-50 rounded-lg border border-emerald-200 text-xs flex flex-wrap items-center justify-between gap-2 text-emerald-950">
                <span>
                  <strong>Origem:</strong> Solicitação de Serviço <span className="font-mono font-extrabold">{wo.serviceRequestCode}</span>
                </span>
                {wo.requesterName && (
                  <span>Solicitante: <strong>{wo.requesterName}</strong></span>
                )}
              </div>
            )}

            {/* Terceiro info row */}
            <div className="mt-2.5 px-3.5 py-2 bg-amber-50/50 rounded-lg border border-amber-200 text-xs flex items-center justify-between">
              <span className="font-bold text-slate-700 flex items-center">
                <Building2 className="w-3.5 h-3.5 mr-1 text-amber-700" />
                Execução Terceirizada:
              </span>
              <span className="font-semibold text-amber-900">
                {wo.thirdParty} {wo.isThirdParty ? '(Contratado Externo)' : '(Equipe Interna)'}
              </span>
            </div>
          </div>

          {/* Problem Detailed Description */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center">
              <FileText className="w-4 h-4 mr-1 text-slate-600" />
              Descrição Detalhada do Problema
            </h3>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm leading-relaxed text-slate-900 whitespace-pre-line">
              {wo.problemDescription}
            </div>
          </div>

          {/* Materials Used Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center">
              <Layers className="w-4 h-4 mr-1 text-slate-600" />
              Materiais & Peças Utilizadas
            </h3>
            {wo.materials.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-200">
                Nenhum material cadastrado nesta ordem de serviço.
              </p>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="py-2 px-3">Item / Material</th>
                      <th className="py-2 px-3 text-right">Quantidade</th>
                      <th className="py-2 px-3 text-center">Unidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {wo.materials.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-900">{m.name}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">{m.quantity}</td>
                        <td className="py-2 px-3 text-center font-mono text-slate-600">{m.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Photos Side-by-Side: ANTES e DEPOIS */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center">
                <Camera className="w-4 h-4 mr-1 text-slate-600 shrink-0" />
                <span>Evidências Fotográficas: Antes e Depois</span>
              </h3>

              <div className="no-print">
                <button
                  type="button"
                  onClick={() => finishFileInputRef.current?.click()}
                  className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-300 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Anexar Foto do DEPOIS</span>
                </button>
                <input
                  type="file"
                  ref={finishFileInputRef}
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={handleAddAfterPhoto}
                  className="hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fotos ANTES */}
              <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-200 space-y-2">
                <span className="text-xs font-black text-amber-900 uppercase tracking-wider block">
                  📸 ANTES DA EXECUÇÃO ({wo.photosBefore.length})
                </span>

                {wo.photosBefore.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-xs text-slate-400 border border-dashed border-amber-200 rounded-lg">
                    Nenhuma foto do antes registrada
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {wo.photosBefore.map((p, i) => (
                      <div
                        key={i}
                        onClick={() => setPreviewImage({ url: p.url, title: `Foto ANTES da OS ${wo.code}` })}
                        className="rounded-lg overflow-hidden border border-amber-300 shadow-2xs group cursor-pointer relative"
                      >
                        <img src={p.url} alt="Antes" className="w-full h-32 object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye className="w-5 h-5 text-white" />
                        </div>
                        {p.caption && (
                          <div className="p-1 bg-white text-[10px] text-slate-600 line-clamp-1">
                            {p.caption}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Fotos DEPOIS */}
              <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-200 space-y-2">
                <span className="text-xs font-black text-emerald-900 uppercase tracking-wider block">
                  ✨ DEPOIS DA EXECUÇÃO ({wo.photosAfter.length})
                </span>

                {wo.photosAfter.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-xs text-slate-400 border border-dashed border-emerald-200 rounded-lg p-2 text-center">
                    <span>Nenhuma foto do pós-serviço adicionada ainda.</span>
                    <button
                      onClick={() => finishFileInputRef.current?.click()}
                      className="mt-1.5 text-[11px] font-bold text-emerald-700 underline no-print"
                    >
                      Clique para anexar foto de conclusão
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {wo.photosAfter.map((p, i) => (
                      <div
                        key={i}
                        onClick={() => setPreviewImage({ url: p.url, title: `Foto DEPOIS da OS ${wo.code}` })}
                        className="rounded-lg overflow-hidden border border-emerald-300 shadow-2xs group cursor-pointer relative"
                      >
                        <img src={p.url} alt="Depois" className="w-full h-32 object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye className="w-5 h-5 text-white" />
                        </div>
                        {p.caption && (
                          <div className="p-1 bg-white text-[10px] text-slate-600 line-clamp-1">
                            {p.caption}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Solution / Encerramento */}
          {wo.solutionDescription && (
            <div className="space-y-1.5 bg-emerald-50/60 p-4 rounded-xl border border-emerald-200">
              <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-700" />
                Relatório Técnico de Conclusão / Solução
              </h3>
              <p className="text-xs text-slate-800 leading-relaxed">
                {wo.solutionDescription}
              </p>
              {wo.completionDate && (
                <p className="text-[11px] text-slate-500 pt-1">
                  Finalizado em: {wo.completionDate} às {wo.completionTime || ''}
                </p>
              )}
            </div>
          )}

          {/* Interactive Closing Box (Only if not concluded) */}
          {wo.status !== 'CONCLUIDA' && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 no-print">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase">
                    Ações de Andamento da Ordem de Serviço
                  </h4>
                  <p className="text-xs text-slate-500">
                    Atualize o estágio ou conclua o reparo técnico
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {wo.status === 'ABERTA' && (
                    <button
                      onClick={() => handleStatusChange('EM_ANDAMENTO')}
                      className="px-3 py-1.5 bg-amber-500 text-stone-950 hover:bg-amber-600 rounded-lg text-xs font-bold shadow-2xs"
                    >
                      Iniciar Execução
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (!isFinishing) startFinishingFlow();
                      else setIsFinishing(false);
                    }}
                    className="px-3 py-1.5 bg-emerald-700 text-white hover:bg-emerald-800 rounded-lg text-xs font-bold shadow-2xs cursor-pointer"
                  >
                    Concluir Ordem de Serviço
                  </button>
                </div>
              </div>

              {isFinishing && (
                <div className="pt-3 border-t border-slate-200 space-y-3 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-slate-200">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Data de Conclusão: <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={closingDate}
                        onChange={e => setClosingDate(e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Horário de Conclusão: <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={closingTime}
                        onChange={e => setClosingTime(e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Relatório do Serviço Realizado:
                    </label>
                    <textarea
                      rows={2}
                      value={closingNotes}
                      onChange={e => setClosingNotes(e.target.value)}
                      placeholder="Descreva o que foi feito para sanar a falha e os testes de conformidade efetuados..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                    />
                  </div>
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => setIsFinishing(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveFinishing}
                      className="px-4 py-1.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-2xs cursor-pointer"
                    >
                      Confirmar Conclusão da OS
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Official Signatures in Print */}
          <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="space-y-1">
              <div className="border-b border-slate-400 w-3/4 mx-auto pb-6" />
              <p className="font-bold text-slate-900">{wo.responsible}</p>
              <p className="text-slate-500 text-[11px]">Técnico / Executor Responsável</p>
            </div>
            <div className="space-y-1">
              <div className="border-b border-slate-400 w-3/4 mx-auto pb-6" />
              <p className="font-bold text-slate-900">Gerente Manutenção</p>
              <p className="text-slate-500 text-[11px]">Visto de Liberação Operacional</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
