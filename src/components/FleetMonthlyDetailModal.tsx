import React, { useState } from 'react';
import { 
  X, 
  ArrowLeft,
  Printer, 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  Car, 
  Gauge, 
  Wrench, 
  ShieldAlert, 
  ShieldCheck,
  CheckCircle2, 
  Camera, 
  Trash2, 
  FileText,
  AlertTriangle,
  Eye
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const FleetMonthlyDetailModal: React.FC = () => {
  const { 
    viewFleetUpdateDetail, 
    setViewFleetUpdateDetail, 
    setPreviewImage, 
    requestDelete, 
    userRole,
    acknowledgeFleetSinistro,
    unacknowledgeFleetSinistro
  } = useApp();

  const [isAckModalOpen, setIsAckModalOpen] = useState(false);
  const [ackJustification, setAckJustification] = useState('');

  if (!viewFleetUpdateDetail) return null;

  const item = viewFleetUpdateDetail;

  const handlePrint = () => {
    window.focus();
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleDelete = () => {
    requestDelete({
      type: 'fleet-update',
      id: item.id,
      code: item.code,
      description: `Atualização Mensal ${item.code} (${item.plate} - ${item.driver})`
    });
  };

  const handleConfirmSinistroAck = async () => {
    await acknowledgeFleetSinistro(item.id, ackJustification);
    setIsAckModalOpen(false);
    setAckJustification('');
  };

  const handleUndoSinistroAck = async () => {
    await unacknowledgeFleetSinistro(item.id);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-100 flex flex-col modal-print-overlay">
      {/* Sticky Top Bar (Actions & Back) */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2 shadow-xs no-print">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 max-w-full">
          <button
            onClick={() => setViewFleetUpdateDetail(null)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer shrink-0"
            title="Voltar"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>
          <div className="flex items-center space-x-2 min-w-0 truncate">
            <span className="font-mono text-xs font-bold bg-cyan-100 text-cyan-900 px-2 py-0.5 rounded shrink-0">
              {item.code}
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              Vistoria Mensal de Frota • {item.plate} ({item.driver})
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Imprimir relatório da atualização"
          >
            <Printer className="w-3.5 h-3.5 text-slate-300" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>

          {userRole === 'ADMIN' && (
            <button
              onClick={handleDelete}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold border border-red-200 transition-colors cursor-pointer"
              title="Excluir este registro (Apenas Admin)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir</span>
            </button>
          )}

          <button
            onClick={() => setViewFleetUpdateDetail(null)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Fullscreen Body Container */}
      <div className="flex-1 w-full max-w-5xl mx-auto p-2 sm:p-6 md:p-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-8 space-y-6 text-slate-900 modal-print-card">
          {/* Main Inspection Header */}
          <div className="bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 bg-cyan-900/60 px-2 py-0.5 rounded-full border border-cyan-400/30">
                  🍇 el Ciruelo • Vistoria Periódica de Frota
                </span>
                <h1 className="text-2xl font-black mt-2 flex items-center space-x-2">
                  <Car className="w-6 h-6 text-cyan-400" />
                  <span>{item.plate} • {item.vehicleModel || 'Frota'}</span>
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-2">
                  <span className="flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    <strong>{item.farm}</strong>
                  </span>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Condutor: <strong>{item.driver}</strong></span>
                  </span>
                </div>
              </div>

              <div className="text-left md:text-right">
                <div className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                  Quilometragem Registrada
                </div>
                <div className="text-2xl font-black text-cyan-300 flex items-center md:justify-end space-x-1.5 mt-0.5">
                  <Gauge className="w-5 h-5 text-cyan-400" />
                  <span>{Number(item.mileage).toLocaleString('pt-BR')} KM</span>
                </div>
                <div className="text-[11px] text-slate-300 mt-1">
                  {item.date} às {item.time}
                </div>
              </div>
            </div>
          </div>

          {/* Cards de Status dos 30 Dias (Preventiva & Sinistro) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Manutenção Preventiva */}
            <div className={`p-4 rounded-xl border space-y-2 ${
              item.preventiveMaintenanceLast30Days
                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Wrench className={`w-4 h-4 ${item.preventiveMaintenanceLast30Days ? 'text-emerald-700' : 'text-slate-500'}`} />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Manutenção Preventiva (30 dias)
                  </span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                  item.preventiveMaintenanceLast30Days
                    ? 'bg-emerald-200 text-emerald-900'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {item.preventiveMaintenanceLast30Days ? 'SIM' : 'NÃO'}
                </span>
              </div>
              {item.preventiveMaintenanceLast30Days ? (
                <p className="text-xs text-emerald-900 bg-white/80 p-2.5 rounded-lg border border-emerald-200">
                  {item.preventiveMaintenanceNotes || 'Manutenção preventiva realizada conforme cronograma.'}
                </p>
              ) : (
                <p className="text-xs text-slate-500">
                  Nenhuma manutenção preventiva realizada no período.
                </p>
              )}
            </div>

            {/* Sinistro / Avaria */}
            <div className={`p-4 rounded-xl border space-y-3 ${
              item.hasIncidentLast30Days
                ? item.adminAcknowledged
                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                  : 'bg-amber-50/90 border-amber-300 text-amber-950'
                : 'bg-emerald-50/40 border-emerald-200 text-emerald-950'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldAlert className={`w-4 h-4 ${
                    item.hasIncidentLast30Days
                      ? item.adminAcknowledged ? 'text-emerald-700' : 'text-amber-600'
                      : 'text-emerald-600'
                  }`} />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Sinistro / Avaria (30 dias)
                  </span>
                </div>
                <div className="flex items-center space-x-1.5">
                  {item.hasIncidentLast30Days && item.adminAcknowledged && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center">
                      <ShieldCheck className="w-3 h-3 mr-1 text-emerald-700" />
                      Reconhecido Admin
                    </span>
                  )}
                  {item.hasIncidentLast30Days && !item.adminAcknowledged && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-200 text-amber-900 border border-amber-300 inline-flex items-center">
                      <AlertTriangle className="w-3 h-3 mr-1 text-amber-700" />
                      Pendente de Aceite
                    </span>
                  )}
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                    item.hasIncidentLast30Days
                      ? item.adminAcknowledged ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {item.hasIncidentLast30Days ? 'SIM' : 'NÃO'}
                  </span>
                </div>
              </div>

              {item.hasIncidentLast30Days ? (
                <div className="space-y-2.5">
                  <div className="bg-white/90 p-3 rounded-lg border border-amber-200 text-xs">
                    <span className="font-bold block text-slate-700 mb-0.5">Descrição do Sinistro / Dano:</span>
                    <p className="text-slate-800 leading-relaxed">
                      {item.incidentNotes || 'Sinistro registrado no período.'}
                    </p>
                  </div>

                  {/* Incident Photos Gallery */}
                  {item.incidentPhotos && item.incidentPhotos.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1">
                        <Camera className="w-3.5 h-3.5 text-amber-700" />
                        <span>Fotos do Sinistro / Dano ({item.incidentPhotos.length}):</span>
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {item.incidentPhotos.map((photoUrl: string, pIdx: number) => (
                          <div
                            key={pIdx}
                            onClick={() => setPreviewImage({ url: photoUrl, title: `Sinistro ${item.plate} - Foto ${pIdx + 1}` })}
                            className="relative group rounded-lg overflow-hidden border border-amber-300 bg-slate-900 h-24 cursor-pointer"
                          >
                            <img
                              src={photoUrl}
                              alt={`Dano ${pIdx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold space-x-1">
                              <Eye className="w-3.5 h-3.5" />
                              <span>Ampliar</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Acknowledgment Status Block */}
                  {item.adminAcknowledged ? (
                    <div className="p-3 bg-emerald-100/90 rounded-xl border border-emerald-300 text-xs space-y-1.5">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className="font-extrabold text-emerald-950 flex items-center space-x-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-700" />
                          <span>Sinistro Reconhecido e Aceito pela Gerência de Manutenção</span>
                        </span>
                        {userRole === 'ADMIN' && (
                          <button
                            type="button"
                            onClick={handleUndoSinistroAck}
                            className="text-[11px] text-emerald-800 hover:text-red-700 underline font-semibold cursor-pointer"
                          >
                            Desfazer Aceite
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-emerald-900">
                        Reconhecido por: <strong>{item.acknowledgedBy || 'Gerente Manutenção'}</strong> em {item.acknowledgedAt || 'Data registrada'}.
                      </p>
                      {item.acknowledgementJustification && (
                        <p className="text-[11px] text-emerald-900 bg-white/70 p-2 rounded border border-emerald-200">
                          <strong>Justificativa do Aceite:</strong> {item.acknowledgementJustification}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-100/80 rounded-xl border border-amber-300 text-xs space-y-2 no-print">
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-amber-950 font-extrabold block">
                            Atenção: Sinistro pendente de reconhecimento formal
                          </strong>
                          <p className="text-amber-900 text-[11px] mt-0.5">
                            Este sinistro está contabilizando como pendência de frota. O Gerente de Manutenção pode avaliar as fotos e reconhecer o evento formalmente.
                          </p>
                        </div>
                      </div>

                      {userRole === 'ADMIN' && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsAckModalOpen(true);
                            setAckJustification('');
                          }}
                          className="w-full inline-flex items-center justify-center space-x-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg shadow-xs cursor-pointer transition-colors text-xs"
                        >
                          <ShieldCheck className="w-4 h-4 text-emerald-300" />
                          <span>Reconhecer Sinistro / Aceite Administrativo (Gerente Manutenção)</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-emerald-800">
                  ✓ Sem sinistros ou avarias reportadas no período.
                </p>
              )}
            </div>
          </div>

          {/* Galeria dos 4 Ângulos Obrigatórios */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
                <Camera className="w-4 h-4 text-cyan-700" />
                <span>Avaliação Visual do Veículo (4 Ângulos)</span>
              </h3>
              <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded flex items-center">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                4 de 4 Fotos Registradas
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Frente */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 flex flex-col space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  🚗 FRENTE
                </span>
                {item.visualInspection?.front ? (
                  <div 
                    onClick={() => setPreviewImage({ url: item.visualInspection!.front!, title: `Frente - ${item.plate}` })}
                    className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-900 h-36 cursor-pointer"
                  >
                    <img
                      src={item.visualInspection.front}
                      alt="Frente"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold space-x-1">
                      <Eye className="w-4 h-4" />
                      <span>Ampliar</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-36 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs">
                    Sem foto
                  </div>
                )}
                <span className="text-[11px] font-bold text-slate-700 text-center">Frente do Veículo</span>
              </div>

              {/* Traseira */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 flex flex-col space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  🚙 TRASEIRA
                </span>
                {item.visualInspection?.rear ? (
                  <div 
                    onClick={() => setPreviewImage({ url: item.visualInspection!.rear!, title: `Traseira - ${item.plate}` })}
                    className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-900 h-36 cursor-pointer"
                  >
                    <img
                      src={item.visualInspection.rear}
                      alt="Traseira"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold space-x-1">
                      <Eye className="w-4 h-4" />
                      <span>Ampliar</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-36 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs">
                    Sem foto
                  </div>
                )}
                <span className="text-[11px] font-bold text-slate-700 text-center">Traseira do Veículo</span>
              </div>

              {/* Lateral Esquerda */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 flex flex-col space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  ◀️ LATERAL ESQ.
                </span>
                {item.visualInspection?.leftSide ? (
                  <div 
                    onClick={() => setPreviewImage({ url: item.visualInspection!.leftSide!, title: `Lateral Esquerda - ${item.plate}` })}
                    className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-900 h-36 cursor-pointer"
                  >
                    <img
                      src={item.visualInspection.leftSide}
                      alt="Lateral Esquerda"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold space-x-1">
                      <Eye className="w-4 h-4" />
                      <span>Ampliar</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-36 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs">
                    Sem foto
                  </div>
                )}
                <span className="text-[11px] font-bold text-slate-700 text-center">Lado Motorista</span>
              </div>

              {/* Lateral Direita */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 flex flex-col space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  ▶️ LATERAL DIR.
                </span>
                {item.visualInspection?.rightSide ? (
                  <div 
                    onClick={() => setPreviewImage({ url: item.visualInspection!.rightSide!, title: `Lateral Direita - ${item.plate}` })}
                    className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-900 h-36 cursor-pointer"
                  >
                    <img
                      src={item.visualInspection.rightSide}
                      alt="Lateral Direita"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold space-x-1">
                      <Eye className="w-4 h-4" />
                      <span>Ampliar</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-36 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs">
                    Sem foto
                  </div>
                )}
                <span className="text-[11px] font-bold text-slate-700 text-center">Lado Passageiro</span>
              </div>
            </div>
          </div>

          {/* Campo de Observação Geral */}
          {item.notes && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-600" />
                <span>Observações Gerais da Vistoria</span>
              </span>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                {item.notes}
              </p>
            </div>
          )}

          {/* Signatures Block for Print */}
          <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs text-slate-600">
            <div>
              <div className="border-b border-slate-400 w-48 mx-auto mb-1 pb-4 font-bold text-slate-900">
                {item.driver}
              </div>
              <span>Condutor do Veículo</span>
            </div>
            <div>
              <div className="border-b border-slate-400 w-48 mx-auto mb-1 pb-4 font-bold text-slate-900">
                Gerente Manutenção
              </div>
              <span>Visto de Controle de Frota</span>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Sinistro Recognition / Acceptance Confirmation Modal */}
      {isAckModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2 text-emerald-800 font-bold text-base">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Reconhecer Sinistro / Avaria</h3>
                  <p className="text-xs text-slate-500 font-normal">Acesso Administrativo / Gerente Manutenção</p>
                </div>
              </div>
              <button
                onClick={() => setIsAckModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-950 space-y-1.5">
              <p className="font-bold text-emerald-900">
                Veículo: {item.plate} ({item.vehicleModel || 'Frota'}) • Condutor: {item.driver}
              </p>
              <p className="text-slate-700">
                <strong>Sinistro apontado:</strong> {item.incidentNotes || 'Sinistro registrado'}
              </p>
              <p className="text-slate-600 leading-relaxed pt-1 border-t border-emerald-200">
                Ao confirmar, este sinistro <strong>deixará de ser contabilizado como alerta pendente</strong> nos relatórios e tela inicial. O formulário manterá registrado permanentemente que houve esse apontamento e o seu aceite técnico formal.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Justificativa / Parecer do Aceite da Gerência (Opcional):
              </label>
              <textarea
                rows={3}
                value={ackJustification}
                onChange={e => setAckJustification(e.target.value)}
                placeholder="Ex: Avaria leve registrada em vistoria; veículo apto para rodar até a próxima revisão programada."
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAckModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSinistroAck}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-md cursor-pointer transition-colors"
              >
                Confirmar Aceite do Sinistro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

