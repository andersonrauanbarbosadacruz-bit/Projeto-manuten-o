import React, { useState } from 'react';
import { X, ArrowLeft, Save, ShieldCheck } from 'lucide-react';
import { DocumentAttachment, Farm, FARMS, ValveCalibrationRecord } from '../../types';
import { INSPECIONE_TEST_GAUGE_CERT, INSPECIONE_TEST_GAUGE_STANDARD } from '../../data/nr13InitialData';
import { AttachmentUploadField } from './AttachmentUploadField';
import { AttachmentViewerModal } from './AttachmentViewerModal';

interface ValveCalibrationModalProps {
  calibration?: ValveCalibrationRecord | null;
  onSave: (record: ValveCalibrationRecord) => void;
  onClose: () => void;
  currentFarmFilter?: Farm | 'TODAS';
  isDedicatedScreen?: boolean;
}

export const ValveCalibrationModal: React.FC<ValveCalibrationModalProps> = ({
  calibration,
  onSave,
  onClose,
  currentFarmFilter,
  isDedicatedScreen = false
}) => {
  const defaultFarm: Farm = currentFarmFilter && currentFarmFilter !== 'TODAS' ? currentFarmFilter : 'Vale das Uvas';
  const [previewAttachment, setPreviewAttachment] = useState<DocumentAttachment | null>(null);

  const [formData, setFormData] = useState<ValveCalibrationRecord>(() => {
    if (calibration) return JSON.parse(JSON.stringify(calibration));

    const todayStr = new Date().toISOString().substring(0, 10);
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const nextYearStr = nextYear.toISOString().substring(0, 10);
    const year = new Date().getFullYear();
    const randNum = Math.floor(100 + Math.random() * 900);

    return {
      id: `valv_${Date.now()}`,
      code: `CAL-VALV-${year}-${randNum}`,
      tag: '',
      farm: defaultFarm,
      equipmentLinked: '',
      sector: '',
      manufacturer: '',
      model: '',
      connectionSize: '',
      fluidType: 'Ar Comprimido',
      setPressure: 0,
      openingPressure: 0,
      reseatPressure: 0,
      pressureUnit: 'bar',
      tightnessTest: 'SEM_VAZAMENTO',
      testFluid: 'Nitrogênio Gasoso (N2)',
      testBenchStandard: INSPECIONE_TEST_GAUGE_STANDARD,
      standardCertNumber: INSPECIONE_TEST_GAUGE_CERT,
      technicianName: '',
      calibrationDate: todayStr,
      nextCalibrationDate: nextYearStr,
      status: 'APROVADA',
      notes: '',
      createdAt: new Date().toISOString()
    };
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className={
      isDedicatedScreen
        ? 'max-w-4xl mx-auto pb-16 space-y-4 animate-in fade-in duration-150'
        : 'fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200'
    }>
      <div className={
        isDedicatedScreen
          ? 'bg-white rounded-2xl shadow-lg w-full flex flex-col border border-slate-200 overflow-hidden'
          : 'bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col border border-slate-300 overflow-hidden'
      }>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-fuchsia-950 via-slate-900 to-emerald-950 text-white px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            {isDedicatedScreen && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>
            )}
            <div className="p-2 rounded-xl bg-fuchsia-900/60 text-fuchsia-200 border border-fuchsia-400/30 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-sm bg-fuchsia-200 text-fuchsia-950 uppercase tracking-wider">
                  Metrologia • Válvulas PSV
                </span>
                <span className="text-xs text-slate-300 font-mono">{formData.code}</span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white truncate">
                {calibration ? 'Editar Calibração de Válvula de Segurança' : 'Nova Calibração de Válvula de Segurança (PSV)'}
              </h2>
            </div>
          </div>

          {!isDedicatedScreen && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className={isDedicatedScreen ? 'p-4 sm:p-6 space-y-4' : 'flex-1 overflow-y-auto p-5 sm:p-6 space-y-4'}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">TAG da Válvula</label>
              <input
                type="text"
                required
                value={formData.tag}
                onChange={e => setFormData({ ...formData, tag: e.target.value })}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 font-bold text-fuchsia-950"
                placeholder="Ex: PSV-01"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Fazenda</label>
              <select
                value={formData.farm}
                onChange={e => setFormData({ ...formData, farm: e.target.value as Farm })}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 font-bold"
              >
                {FARMS.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Setor / Linha</label>
              <input
                type="text"
                required
                value={formData.sector}
                onChange={e => setFormData({ ...formData, sector: e.target.value })}
                className="w-full text-xs p-2 rounded-lg border border-slate-300"
                placeholder="Ex: Sala de Máquinas"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Vaso ou Equipamento Vinculado</label>
            <input
              type="text"
              required
              value={formData.equipmentLinked}
              onChange={e => setFormData({ ...formData, equipmentLinked: e.target.value })}
              className="w-full text-xs p-2 rounded-lg border border-slate-300 font-medium"
              placeholder="Ex: Vaso de Pressão VP-01 - Reservatório de Ar Comprimido"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Fabricante</label>
              <input
                type="text"
                value={formData.manufacturer}
                onChange={e => setFormData({ ...formData, manufacturer: e.target.value })}
                className="w-full text-xs p-2 rounded-lg border border-slate-300"
                placeholder="Ex: Spirax Sarco, Danfoss"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Modelo</label>
              <input
                type="text"
                value={formData.model}
                onChange={e => setFormData({ ...formData, model: e.target.value })}
                className="w-full text-xs p-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Conexão / Bitola</label>
              <input
                type="text"
                value={formData.connectionSize}
                onChange={e => setFormData({ ...formData, connectionSize: e.target.value })}
                className="w-full text-xs p-2 rounded-lg border border-slate-300"
                placeholder='Ex: 1" NPT'
              />
            </div>
          </div>

          {/* Test Parameters Card */}
          <div className="p-4 bg-fuchsia-50/60 rounded-xl border border-fuchsia-200 space-y-3">
            <h4 className="text-xs font-extrabold text-fuchsia-950 uppercase tracking-wider">
              Ensaio Hidropneumático em Bancada de Teste
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Pressão de Ajuste (Set Point)</label>
                <div className="flex">
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={formData.setPressure}
                    onChange={e => setFormData({ ...formData, setPressure: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded-l-lg border border-slate-300 bg-white font-bold"
                  />
                  <span className="bg-slate-200 px-2 py-2 text-[10px] font-bold text-slate-700 rounded-r-lg border border-l-0 border-slate-300">
                    bar
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Pressão Abertura (Pop Test)</label>
                <div className="flex">
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={formData.openingPressure}
                    onChange={e => setFormData({ ...formData, openingPressure: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded-l-lg border border-slate-300 bg-white font-bold text-emerald-900"
                  />
                  <span className="bg-slate-200 px-2 py-2 text-[10px] font-bold text-slate-700 rounded-r-lg border border-l-0 border-slate-300">
                    bar
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Pressão Fechamento</label>
                <div className="flex">
                  <input
                    type="number"
                    step="0.05"
                    value={formData.reseatPressure || ''}
                    onChange={e => setFormData({ ...formData, reseatPressure: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded-l-lg border border-slate-300 bg-white"
                  />
                  <span className="bg-slate-200 px-2 py-2 text-[10px] font-bold text-slate-700 rounded-r-lg border border-l-0 border-slate-300">
                    bar
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Estanqueidade</label>
                <select
                  value={formData.tightnessTest}
                  onChange={e => setFormData({ ...formData, tightnessTest: e.target.value as any })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-bold text-emerald-800"
                >
                  <option value="SEM_VAZAMENTO">Sem Vazamento (100% Conforme)</option>
                  <option value="COM_VAZAMENTO">Com Vazamento (Reprovada)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Instrumento Padrão da Bancada</label>
                <input
                  type="text"
                  value={formData.testBenchStandard}
                  onChange={e => setFormData({ ...formData, testBenchStandard: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nº Certificado do Padrão Rastreável</label>
                <input
                  type="text"
                  value={formData.standardCertNumber}
                  onChange={e => setFormData({ ...formData, standardCertNumber: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Data da Calibração</label>
              <input
                type="date"
                required
                value={formData.calibrationDate}
                onChange={e => setFormData({ ...formData, calibrationDate: e.target.value })}
                className="w-full text-xs p-2 rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Próxima Calibração (Validade)</label>
              <input
                type="date"
                required
                value={formData.nextCalibrationDate}
                onChange={e => setFormData({ ...formData, nextCalibrationDate: e.target.value })}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 font-bold text-fuchsia-950"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status do Ensaio</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 font-extrabold text-slate-900"
              >
                <option value="APROVADA">APROVADA (Lacre aplicado)</option>
                <option value="REPROVADA">REPROVADA (Reparo necessário)</option>
                <option value="AJUSTADA">AJUSTADA / RECUPERADA</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Técnico / Metrologista Responsável</label>
            <input
              type="text"
              required
              value={formData.technicianName}
              onChange={e => setFormData({ ...formData, technicianName: e.target.value })}
              className="w-full text-xs p-2 rounded-lg border border-slate-300"
              placeholder="Ex: Eng. Aurélio Antonio Rodrigues Henrique"
            />
          </div>

          {/* Dedicated Field to Attach Certificate */}
          <AttachmentUploadField
            label="Anexo do Certificado de Calibração da Válvula"
            tag="CERTIFICADO_CALIBRACAO_VALVULA"
            description="Upload do PDF ou imagem do certificado de calibração em bancada emitido para esta válvula."
            attachment={formData.certificateAttachment}
            onAttachmentChange={att => setFormData({ ...formData, certificateAttachment: att })}
            onViewAttachment={att => setPreviewAttachment(att)}
            required={false}
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Observações Técnicas / Lacre</label>
            <textarea
              rows={2}
              value={formData.notes || ''}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full text-xs p-2 rounded-lg border border-slate-300"
              placeholder="Número do lacre aplicado, estado da mola e vedação..."
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-fuchsia-900 hover:bg-fuchsia-800 text-white transition-all shadow-md cursor-pointer border border-fuchsia-400/30"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Calibração de Válvula</span>
            </button>
          </div>
        </form>
      </div>

      {previewAttachment && (
        <AttachmentViewerModal
          attachment={previewAttachment}
          onClose={() => setPreviewAttachment(null)}
        />
      )}
    </div>
  );
};
