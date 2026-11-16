import React, { useState } from 'react';
import { 
  X, 
  ArrowLeft,
  Printer, 
  Download, 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Wrench, 
  Camera, 
  Eye,
  Share2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CHECKLIST_TYPE_LABELS } from '../types';
import { isChecklistItemResolved, getChecklistEffectiveStatus } from '../utils/complianceHelper';
import { exportChecklistToPdf } from '../utils/pdfGenerator';
import { downloadChecklistDocument } from '../utils/documentDownloader';

export const ChecklistDetailModal: React.FC = () => {
  const { 
    viewChecklistDetail, 
    setViewChecklistDetail, 
    setPreviewImage,
    generateWorkOrderFromChecklistNC,
    requestDelete,
    userRole,
    setShowSyncModal,
    workOrders,
    acknowledgeChecklistItem,
    unacknowledgeChecklistItem,
    acknowledgeAllChecklistNCs
  } = useApp();

  const [ackModalTarget, setAckModalTarget] = useState<{ itemId: string; description: string; isAll?: boolean } | null>(null);
  const [ackJustification, setAckJustification] = useState('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  if (!viewChecklistDetail) return null;

  const item = viewChecklistDetail;
  const conformingCount = item.items.filter(i => i.status === 'C').length;
  const allNCItems = item.items.filter(i => i.status === 'N/C');
  const naCount = item.items.filter(i => i.status === 'N/A').length;

  const effectiveStatus = getChecklistEffectiveStatus(item, workOrders);

  const activeNCItems = allNCItems.filter(
    nc => !isChecklistItemResolved(nc, item, workOrders).isResolved
  );
  const resolvedNCItems = allNCItems.filter(
    nc => isChecklistItemResolved(nc, item, workOrders).isResolved
  );

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportChecklistToPdf(item, workOrders);
    } catch (err) {
      console.error('Erro ao gerar PDF do checklist:', err);
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-100 flex flex-col modal-print-overlay">
      {/* Sticky Fullscreen Top Bar */}
      <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 px-3 sm:px-6 py-2.5 sm:py-3 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs no-print">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 max-w-full">
          <button
            onClick={() => setViewChecklistDetail(null)}
            className="inline-flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer shrink-0"
            title="Voltar à tela anterior"
          >
            <ArrowLeft className="w-4 h-4 text-slate-700" />
            <span>Voltar</span>
          </button>
          <div className="flex items-center space-x-1.5 min-w-0 truncate">
            <span className="font-mono text-xs font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded shrink-0">
              {item.code}
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              Ficha Técnica - {CHECKLIST_TYPE_LABELS[item.type]}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
          <button
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            title="Baixar arquivo PDF da ficha no computador ou celular para abrir e imprimir diretamente"
          >
            <Download className="w-4 h-4 text-emerald-300" />
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
            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
            title="Transmitir este e todos os dados para o computador via WhatsApp ou QR Code"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Enviar ao PC</span>
          </button>

          {userRole === 'ADMIN' && (
            <button
              onClick={() => {
                requestDelete({
                  type: 'checklist',
                  id: item.id,
                  code: item.code,
                  description: `${item.location} (${item.inspector})`
                });
              }}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold border border-red-200 transition-colors cursor-pointer"
              title="Excluir este Checklist"
            >
              <span>Excluir</span>
            </button>
          )}

          <button
            onClick={() => setViewChecklistDetail(null)}
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
          <div className="no-print bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 text-emerald-900">
              <Download className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                <strong>Opção de Baixar no PC:</strong> Salve a ficha oficial em formato <strong>PDF</strong> no seu computador para abrir e imprimir diretamente em A4 ou enviar por e-mail/WhatsApp.
              </span>
            </div>
            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-bold shrink-0 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Gerando PDF...' : 'Baixar Ficha em PDF'}</span>
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
                    SISTEMA DE MANUTENÇÃO AGRÍCOLA
                  </h1>
                </div>
                <p className="text-xs text-slate-500 font-semibold tracking-wide uppercase mt-0.5">
                  Ficha de Inspeção Operacional • {item.farm}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="inline-block text-xs font-mono font-bold bg-slate-100 border border-slate-300 px-2.5 py-1 rounded">
                  REGISTRO: {item.code}
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  Emitido em: {new Date(item.createdAt).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>

            {/* Info Grid */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">
                  Fazenda
                </span>
                <span className="font-extrabold text-slate-900 text-sm">
                  {item.farm}
                </span>
              </div>

              {item.type === 'VEICULO' ? (
                <>
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">
                      Veículo & Placa
                    </span>
                    <span className="font-extrabold text-purple-900 text-sm font-mono">
                      {item.vehicleModel || 'VEÍCULO'} • {item.vehiclePlate || 'S/P'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">
                      Quilometragem (KM)
                    </span>
                    <span className="font-semibold text-slate-800">
                      Inicial: {item.initialKm || '--'} {item.finalKm ? `• Final: ${item.finalKm}` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">
                      Condutor / Responsável
                    </span>
                    <span className="font-semibold text-slate-800">
                      {item.inspector}
                    </span>
                  </div>
                </>
              ) : item.type === 'DRONE' ? (
                <>
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">
                      Drone / Modelo
                    </span>
                    <span className="font-extrabold text-blue-900 text-sm">
                      {item.droneModel || 'Drone Agrícola'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">
                      Operador do Drone
                    </span>
                    <span className="font-semibold text-slate-800">
                      {item.inspector}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">
                      Data e Horário
                    </span>
                    <span className="font-semibold text-slate-800">
                      {item.date} • {item.time} ({item.shift || 'Geral'})
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">
                      Local / Setor
                    </span>
                    <span className="font-semibold text-slate-800">
                      {item.location}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">
                      Data / Hora / Turno
                    </span>
                    <span className="font-semibold text-slate-800">
                      {item.date} • {item.time} ({item.shift || 'Manhã'})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">
                      Responsável / Inspetor
                    </span>
                    <span className="font-semibold text-slate-800">
                      {item.inspector}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Model Title Header Box (Exactly as user's tables) */}
          <div className="border border-slate-900 rounded-lg overflow-hidden shadow-xs">
            <div className="bg-slate-900 text-white text-center font-black text-sm sm:text-base py-2 uppercase tracking-widest">
              {CHECKLIST_TYPE_LABELS[item.type]?.toUpperCase() || item.type}
            </div>

            {/* Table layout identical to reference images */}
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-100 border-b border-t border-slate-900 text-slate-900 font-bold">
                  <th className="py-2.5 px-2 sm:px-4 border-r border-slate-300">
                    ITENS A VERIFICAR
                  </th>
                  <th className="py-2.5 px-1.5 sm:px-3 text-center border-r border-slate-300 w-9 sm:w-16">
                    C
                  </th>
                  <th className="py-2.5 px-1.5 sm:px-3 text-center border-r border-slate-300 w-9 sm:w-16">
                    N/C
                  </th>
                  <th className="py-2.5 px-1.5 sm:px-3 text-center border-r border-slate-300 w-9 sm:w-16">
                    N/A
                  </th>
                  <th className="py-2.5 px-1.5 sm:px-3 text-center w-16 sm:w-28">
                    IMAGEM
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {item.items.map((row, idx) => {
                  const isC = row.status === 'C';
                  const isNC = row.status === 'N/C';
                  const isNA = row.status === 'N/A';
                  const resolvedInfo = isChecklistItemResolved(row, item, workOrders);
                  const { isResolved, linkedWorkOrder, isAcknowledged } = resolvedInfo;

                  return (
                    <tr 
                      key={idx}
                      className={`hover:bg-slate-50 ${isNC && !isResolved ? 'bg-red-50/70 font-semibold' : isResolved ? 'bg-emerald-50/50' : ''}`}
                    >
                      <td className="py-2.5 px-3 sm:px-4 border-r border-slate-200">
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className={isResolved ? 'text-slate-800' : 'text-slate-900 font-bold'}>{row.description}</span>
                            {isAcknowledged && (
                              <span className="text-[10px] font-extrabold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full inline-flex items-center">
                                <ShieldCheck className="w-3 h-3 mr-1 text-emerald-700" />
                                Aceite Gerente Manutenção ({row.acknowledgedAt || 'Reconhecido'})
                              </span>
                            )}
                            {isResolved && !isAcknowledged && linkedWorkOrder && (
                              <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full inline-flex items-center">
                                ✓ Corrigido via OS {linkedWorkOrder.code} (Concluída)
                              </span>
                            )}
                          </div>
                          {row.notes && (
                            <span className="text-xs text-slate-600 font-normal italic mt-0.5">
                              Obs do Inspetor: {row.notes}
                            </span>
                          )}
                          {isAcknowledged && row.acknowledgementJustification && (
                            <span className="text-[11px] text-emerald-900 bg-emerald-50/90 px-2.5 py-1 rounded border border-emerald-200 mt-1 inline-block">
                              <strong>Justificativa do Aceite:</strong> {row.acknowledgementJustification}
                            </span>
                          )}

                          {/* Specific Admin Action Command for Non-Conformities */}
                          {isNC && (
                            <div className="mt-2 flex flex-wrap items-center gap-2 no-print">
                              {isAcknowledged ? (
                                userRole === 'ADMIN' && (
                                  <button
                                    type="button"
                                    onClick={() => unacknowledgeChecklistItem(item.id, row.itemId)}
                                    className="text-[11px] font-semibold text-slate-500 hover:text-red-700 underline cursor-pointer"
                                  >
                                    Desfazer Aceite
                                  </button>
                                )
                              ) : (
                                <>
                                  {userRole === 'ADMIN' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAckModalTarget({ itemId: row.itemId, description: row.description });
                                        setAckJustification('');
                                      }}
                                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
                                      title="Reconhecer não conformidade: deixa de contabilizar e mantém o aceite gravado no checklist"
                                    >
                                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                                      <span>Reconhecer / Aceitar N/C (Admin)</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setViewChecklistDetail(null);
                                      generateWorkOrderFromChecklistNC(item, row.description, row.notes, row.photoUrl);
                                    }}
                                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
                                  >
                                    <Wrench className="w-3.5 h-3.5" />
                                    <span>Abrir OS deste Item</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* C Column */}
                      <td className="py-2 px-2 text-center border-r border-slate-200 font-bold">
                        {isC ? (
                          <span className="inline-block text-emerald-700 font-black text-base">
                            ✓
                          </span>
                        ) : null}
                      </td>

                      {/* N/C Column */}
                      <td className="py-2 px-2 text-center border-r border-slate-200 font-bold">
                        {isNC ? (
                          isAcknowledged ? (
                            <span className="inline-flex items-center text-[11px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300" title="Apontado como N/C e Aceito pelo Gerente de Manutenção">
                              N/C • Aceito
                            </span>
                          ) : isResolved ? (
                            <span className="inline-block text-emerald-700 font-black text-base">✓</span>
                          ) : (
                            <span className="inline-block text-red-600 font-black text-base">✕</span>
                          )
                        ) : null}
                      </td>

                      {/* N/A Column */}
                      <td className="py-2 px-2 text-center border-r border-slate-200 font-bold text-slate-500">
                        {isNA ? (
                          <span className="inline-block text-slate-700 font-bold">
                            —
                          </span>
                        ) : null}
                      </td>

                      {/* IMAGEM Column */}
                      <td className="py-2 px-2 text-center text-xs">
                        {row.photoUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewImage({
                              url: row.photoUrl!,
                              title: `${row.description} - Foto da Inspeção`
                            })}
                            className="inline-flex items-center space-x-1 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 font-bold cursor-pointer"
                          >
                            <Camera className="w-3 h-3 text-emerald-700" />
                            <span>Ver foto</span>
                          </button>
                        ) : (
                          <span className="text-slate-400">
                            {row.requiresImage ? 'sim' : 'não'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Observations and Non-Conformity Actions */}
          {item.generalNotes && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-700 block uppercase mb-1">
                Observações Gerais do Inspetor:
              </span>
              <p className="text-slate-800 leading-relaxed">
                {item.generalNotes}
              </p>
            </div>
          )}

          {/* If there are ACTIVE (unresolved) NC items, show quick action to generate OS or acknowledge */}
          {activeNCItems.length > 0 && (
            <div className="p-4 bg-red-50 rounded-xl border border-red-200 space-y-3 no-print">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2 text-red-800 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Atenção: Existem {activeNCItems.length} item(ns) Não Conforme(s) pendente(s) de intervenção.</span>
                </div>
                {userRole === 'ADMIN' && (
                  <button
                    onClick={() => {
                      setAckModalTarget({ itemId: 'ALL', description: 'Todas as Não Conformidades deste Checklist', isAll: true });
                      setAckJustification('');
                    }}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer transition-colors shrink-0"
                    title="Reconhecer todas as pendências de uma vez como Gerente de Manutenção"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Reconhecer Todas (Aceite Admin)</span>
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {activeNCItems.map((nc, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white rounded-lg border border-red-100 text-xs">
                    <div>
                      <strong className="text-slate-900">{nc.description}</strong>
                      {nc.notes && <p className="text-slate-600 mt-0.5">{nc.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {userRole === 'ADMIN' && (
                        <button
                          onClick={() => {
                            setAckModalTarget({ itemId: nc.itemId, description: nc.description });
                            setAckJustification('');
                          }}
                          className="inline-flex items-center justify-center space-x-1 px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-md shadow-xs transition-colors cursor-pointer"
                        >
                          <ShieldCheck className="w-3 h-3 text-emerald-300" />
                          <span>Reconhecer N/C</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setViewChecklistDetail(null);
                          generateWorkOrderFromChecklistNC(
                            item,
                            nc.description,
                            nc.notes,
                            nc.photoUrl
                          );
                        }}
                        className="inline-flex items-center justify-center space-x-1 px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md shadow-xs transition-colors cursor-pointer"
                      >
                        <Wrench className="w-3 h-3" />
                        <span>Abrir OS</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* If some or all NC items have been resolved via completed work orders */}
          {resolvedNCItems.length > 0 && (
            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-extrabold text-emerald-900 block">
                  {resolvedNCItems.length} item(ns) corrigido(s) via Ordem de Serviço concluída:
                </strong>
                <p className="mt-0.5 text-emerald-800 text-[11px]">
                  Os defeitos apontados foram reparados e testados através de OS concluídas. Não contabilizam mais como pendências.
                </p>
              </div>
            </div>
          )}

          {/* Photo Gallery of Checklist (Printed nicely) */}
          {item.items.some(i => i.photoUrl) && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
                <Camera className="w-4 h-4 mr-1 text-slate-500" />
                Registros Fotográficos da Inspeção
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {item.items.filter(i => i.photoUrl).map((photoItem, pIdx) => (
                  <div 
                    key={pIdx}
                    onClick={() => setPreviewImage({
                      url: photoItem.photoUrl!,
                      title: photoItem.description
                    })}
                    className="border border-slate-200 rounded-xl p-2 bg-slate-50 space-y-1.5 cursor-pointer hover:border-emerald-400 transition-colors"
                  >
                    <div className="h-28 w-full bg-slate-200 rounded-lg overflow-hidden">
                      <img 
                        src={photoItem.photoUrl} 
                        alt={photoItem.description}
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <p className="text-[11px] font-semibold text-slate-800 line-clamp-1">
                      {photoItem.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vehicle 4 Angles Visual Inspection Display */}
          {item.type === 'VEICULO' && item.vehicleVisual && (
            <div className="space-y-3 bg-purple-50/50 p-4 rounded-xl border border-purple-200">
              <h3 className="text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center">
                <Camera className="w-4 h-4 mr-1 text-purple-700" />
                Avaliação Visual Obrigatória dos 4 Ângulos do Veículo
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: 'front', label: 'Frente' },
                  { key: 'rear', label: 'Traseira' },
                  { key: 'leftSide', label: 'Lateral Esquerda' },
                  { key: 'rightSide', label: 'Lateral Direita' }
                ].map(angle => {
                  const url = item.vehicleVisual?.[angle.key as keyof typeof item.vehicleVisual];
                  return (
                    <div key={angle.key} className="bg-white rounded-lg p-2 border border-purple-200 space-y-1">
                      <span className="text-[10px] font-bold text-purple-900 uppercase block">{angle.label}</span>
                      {url ? (
                        <div
                          onClick={() => setPreviewImage({ url, title: `Foto ${angle.label} - ${item.vehiclePlate}` })}
                          className="h-24 bg-slate-100 rounded overflow-hidden cursor-pointer relative group"
                        >
                          <img src={url} alt={angle.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Eye className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="h-24 bg-slate-100 rounded flex items-center justify-center text-[10px] text-slate-400">
                          Sem foto
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Signature Block */}
          <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="space-y-1 flex flex-col items-center">
              {item.signatureUrl ? (
                <div className="h-16 flex items-center justify-center border-b border-slate-400 w-3/4 pb-1 mb-1">
                  <img src={item.signatureUrl} alt="Assinatura" className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <div className="border-b border-slate-400 w-3/4 mx-auto pb-6" />
              )}
              <p className="font-bold text-slate-900">{item.inspector}</p>
              <p className="text-slate-500 text-[11px]">
                {item.type === 'VEICULO' ? 'Condutor / Responsável pelo Veículo' : (item.type === 'DRONE' ? 'Operador / Piloto do Drone' : 'Técnico / Inspetor Responsável')}
              </p>
            </div>
            <div className="space-y-1 flex flex-col items-center">
              <div className="border-b border-slate-400 w-3/4 mx-auto pb-6 pt-10" />
              <p className="font-bold text-slate-900">Gerente Manutenção</p>
              <p className="text-slate-500 text-[11px]">Visto / Aprovação Operacional</p>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Recognition / Acceptance Confirmation Modal */}
      {ackModalTarget && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2 text-emerald-800 font-bold text-base">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Reconhecer Não Conformidade</h3>
                  <p className="text-xs text-slate-500 font-normal">Acesso Administrativo / Gerente Manutenção</p>
                </div>
              </div>
              <button
                onClick={() => setAckModalTarget(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-950 space-y-1.5">
              <p className="font-bold text-emerald-900">
                Item: {ackModalTarget.description}
              </p>
              <p className="text-slate-600 leading-relaxed">
                Ao confirmar, este item <strong>deixará de ser contabilizado como não conformidade</strong> pendente nos gráficos e relatórios operacionais. O checklist manterá registrado permanentemente que houve esse apontamento e o seu aceite técnico formal.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Justificativa / Parecer do Aceite Operacional (Opcional):
              </label>
              <textarea
                rows={3}
                value={ackJustification}
                onChange={e => setAckJustification(e.target.value)}
                placeholder="Ex: Desgaste aceitável para o ciclo atual. Equipamento liberado para operação sob monitoramento técnico."
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAckModalTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (ackModalTarget.isAll) {
                    await acknowledgeAllChecklistNCs(item.id, ackJustification);
                  } else {
                    await acknowledgeChecklistItem(item.id, ackModalTarget.itemId, ackJustification);
                  }
                  setAckModalTarget(null);
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-md cursor-pointer transition-colors"
              >
                Confirmar Aceite Técnico
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
