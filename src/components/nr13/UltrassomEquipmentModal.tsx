import React, { useState } from 'react';
import { X, ArrowLeft, Save, Activity } from 'lucide-react';
import { DocumentAttachment, UltrassomEquipmentRecord } from '../../types';
import { AttachmentUploadField } from './AttachmentUploadField';
import { AttachmentViewerModal } from './AttachmentViewerModal';

interface UltrassomEquipmentModalProps {
  equipment?: UltrassomEquipmentRecord | null;
  onSave: (record: UltrassomEquipmentRecord) => void;
  onClose: () => void;
  isDedicatedScreen?: boolean;
}

export const UltrassomEquipmentModal: React.FC<UltrassomEquipmentModalProps> = ({
  equipment,
  onSave,
  onClose,
  isDedicatedScreen = false
}) => {
  const [previewAttachment, setPreviewAttachment] = useState<DocumentAttachment | null>(null);

  const [formData, setFormData] = useState<UltrassomEquipmentRecord>(() => {
    if (equipment) return JSON.parse(JSON.stringify(equipment));

    const todayStr = new Date().toISOString().substring(0, 10);
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const nextYearStr = nextYear.toISOString().substring(0, 10);

    return {
      id: `ultra_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: '',
      serialNumber: '',
      certificateNumber: '',
      calibrationDate: todayStr,
      nextCalibrationDate: nextYearStr,
      calibrationLab: '',
      measurementRange: '',
      resolution: '',
      uncertainty: '',
      status: 'CALIBRADO',
      notes: '',
      createdAt: new Date().toISOString()
    };
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      name: formData.name.trim(),
      serialNumber: formData.serialNumber.trim(),
      certificateNumber: formData.certificateNumber.trim()
    });
  };

  return (
    <div className={
      isDedicatedScreen
        ? 'max-w-3xl mx-auto pb-16 space-y-4 animate-in fade-in duration-150'
        : 'fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200'
    }>
      <div className={
        isDedicatedScreen
          ? 'bg-white rounded-2xl shadow-lg w-full flex flex-col border border-slate-200 overflow-hidden'
          : 'bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col border border-slate-300 overflow-hidden'
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
            <div className="p-2 rounded-xl bg-cyan-900/60 text-cyan-200 border border-cyan-400/30 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-sm bg-cyan-200 text-cyan-950 uppercase tracking-wider">
                  END • Ultrassom
                </span>
                <span className="text-xs text-slate-300 font-mono">
                  {formData.certificateNumber || 'Novo Equipamento'}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white truncate">
                {equipment ? 'Editar Equipamento de Aferição (Ultrassom)' : 'Cadastrar Equipamento de Aferição (Ultrassom)'}
              </h2>
            </div>
          </div>

          {!isDedicatedScreen && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className={isDedicatedScreen ? 'p-4 sm:p-6 space-y-4' : 'flex-1 overflow-y-auto p-5 sm:p-6 space-y-4'}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Equipamento / Modelo (Medidor de Espessura por Ultrassom) *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 font-bold text-slate-900"
                placeholder="Ex: Eddytronic USE 100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nº de Série *</label>
              <input
                type="text"
                required
                value={formData.serialNumber}
                onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono"
                placeholder="Ex: KL:2412978"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nº do Certificado *</label>
              <input
                type="text"
                required
                value={formData.certificateNumber}
                onChange={e => setFormData({ ...formData, certificateNumber: e.target.value })}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono font-bold text-cyan-950"
                placeholder="Ex: 4575/24"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Data da Calibração *</label>
              <input
                type="date"
                required
                value={formData.calibrationDate}
                onChange={e => setFormData({ ...formData, calibrationDate: e.target.value })}
                className="w-full text-xs p-2 rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Validade da Calibração *</label>
              <input
                type="date"
                required
                value={formData.nextCalibrationDate}
                onChange={e => setFormData({ ...formData, nextCalibrationDate: e.target.value })}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 font-bold text-cyan-950"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Laboratório / Empresa Calibradora</label>
              <input
                type="text"
                value={formData.calibrationLab || ''}
                onChange={e => setFormData({ ...formData, calibrationLab: e.target.value })}
                className="w-full text-xs p-2 rounded-lg border border-slate-300"
                placeholder="Ex: Righ Comércio e Serviços Ltda"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 font-extrabold text-slate-900"
              >
                <option value="CALIBRADO">CALIBRADO / EM DIA</option>
                <option value="VENCIDO">VENCIDO</option>
                <option value="MANUTENCAO">EM MANUTENÇÃO</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-cyan-50/50 p-3 rounded-xl border border-cyan-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Faixa de Medição</label>
              <input
                type="text"
                value={formData.measurementRange || ''}
                onChange={e => setFormData({ ...formData, measurementRange: e.target.value })}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                placeholder="Ex: 1,0 a 32,0 mm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Resolução</label>
              <input
                type="text"
                value={formData.resolution || ''}
                onChange={e => setFormData({ ...formData, resolution: e.target.value })}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                placeholder="Ex: 0,1 mm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Incerteza</label>
              <input
                type="text"
                value={formData.uncertainty || ''}
                onChange={e => setFormData({ ...formData, uncertainty: e.target.value })}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                placeholder="Ex: 1%"
              />
            </div>
          </div>

          <AttachmentUploadField
            label="Certificado de Calibração do Equipamento"
            tag="CERTIFICADO_ULTRASSOM"
            description="PDF ou imagem do certificado oficial de calibração do medidor de espessura por ultrassom."
            attachment={formData.certificateAttachment}
            onAttachmentChange={att => setFormData({ ...formData, certificateAttachment: att })}
            onViewAttachment={att => setPreviewAttachment(att)}
            required={false}
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Observações Técnicas</label>
            <textarea
              rows={2}
              value={formData.notes || ''}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full text-xs p-2 rounded-lg border border-slate-300"
              placeholder="Transdutor utilizado, bloco padrão de referência, observações..."
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
              className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-900 hover:bg-cyan-800 text-white transition-all shadow-md cursor-pointer border border-cyan-400/30"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Equipamento de Aferição</span>
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
