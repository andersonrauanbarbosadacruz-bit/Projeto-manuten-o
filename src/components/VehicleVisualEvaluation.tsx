import React, { useRef, useState } from 'react';
import { Camera, Check, AlertTriangle, Eye, Trash2, Car } from 'lucide-react';
import { VehicleVisualInspection } from '../types';
import { compressImage } from '../utils/imageCompressor';

interface VehicleVisualEvaluationProps {
  value: VehicleVisualInspection;
  onChange: (updated: VehicleVisualInspection) => void;
  onPreview: (url: string, title: string) => void;
}

type AngleKey = 'front' | 'rear' | 'leftSide' | 'rightSide';

interface AngleMeta {
  key: AngleKey;
  label: string;
  sublabel: string;
  iconText: string;
}

const ANGLES: AngleMeta[] = [
  {
    key: 'front',
    label: 'Frente do Veículo',
    sublabel: 'Para-choque dianteiro, faróis e capô',
    iconText: '🚗 FRENTE'
  },
  {
    key: 'rear',
    label: 'Traseira do Veículo',
    sublabel: 'Tampa traseira, lanternas e para-choque',
    iconText: '🚙 TRASEIRA'
  },
  {
    key: 'leftSide',
    label: 'Lateral Esquerda',
    sublabel: 'Portas, retrovisor e para-lamas (Lado Motorista)',
    iconText: '◀️ LATERAL ESQ.'
  },
  {
    key: 'rightSide',
    label: 'Lateral Direita',
    sublabel: 'Portas, retrovisor e para-lamas (Lado Passageiro)',
    iconText: '▶️ LATERAL DIR.'
  }
];

const VehicleVisualEvaluationComponent: React.FC<VehicleVisualEvaluationProps> = ({
  value,
  onChange,
  onPreview
}) => {
  const [uploadingKey, setUploadingKey] = useState<AngleKey | null>(null);
  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  const handleCapture = async (key: AngleKey, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingKey(key);
    try {
      // 850x850 with 0.65 quality gives fast processing on mobile and sharp inspection visual quality
      const compressed = await compressImage(file, 850, 850, 0.65);
      onChange({
        ...value,
        [key]: compressed
      });
    } catch (err) {
      console.error(`Erro ao capturar foto do ângulo ${key}:`, err);
    } finally {
      setUploadingKey(null);
      if (e.target) e.target.value = '';
    }
  };

  const removePhoto = (key: AngleKey) => {
    const updated = { ...value };
    delete updated[key];
    onChange(updated);
  };

  const completedCount = [value.front, value.rear, value.leftSide, value.rightSide].filter(Boolean).length;
  const isAllCompleted = completedCount === 4;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center">
              Avaliação Visual Obrigatória dos 4 Ângulos
              <span className="text-red-500 ml-1">*</span>
            </h3>
            <p className="text-xs text-slate-500">
              Fotografe os 4 lados do veículo para vistoria e registro de avarias
            </p>
          </div>
        </div>

        <div className="self-start sm:self-auto">
          {isAllCompleted ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <Check className="w-3.5 h-3.5 mr-1 text-emerald-700" />
              4 de 4 Ângulos Registrados (Completo)
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
              <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-700" />
              {completedCount} de 4 Ângulos • Falta(m) {4 - completedCount} foto(s)
            </span>
          )}
        </div>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {ANGLES.map(angle => {
          const photoUrl = value[angle.key];
          const isUploading = uploadingKey === angle.key;

          return (
            <div
              key={angle.key}
              className={`rounded-xl border p-3 flex flex-col justify-between transition-all ${
                photoUrl
                  ? 'bg-white border-emerald-300 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {angle.iconText}
                  </span>
                  {photoUrl ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center">
                      <Check className="w-3 h-3 mr-0.5" /> Anexada
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                      Obrigatória
                    </span>
                  )}
                </div>

                <h4 className="text-xs font-bold text-slate-900">{angle.label}</h4>
                <p className="text-[11px] text-slate-400 mb-2 line-clamp-1">{angle.sublabel}</p>
              </div>

              {/* Photo Box or Trigger */}
              <div>
                {photoUrl ? (
                  <div className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-100 h-28">
                    <img
                      src={photoUrl}
                      alt={angle.label}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                      <button
                        type="button"
                        onClick={() => onPreview(photoUrl, `Avaliação Visual - ${angle.label}`)}
                        className="p-1.5 bg-white text-slate-800 rounded-lg hover:bg-slate-100"
                        title="Ver foto em tela cheia"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removePhoto(angle.key)}
                        className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        title="Remover foto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => fileInputsRef.current[angle.key]?.click()}
                      className="w-full h-28 rounded-lg border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/40 flex flex-col items-center justify-center text-center p-2 transition-colors cursor-pointer group"
                    >
                      <Camera className="w-6 h-6 text-slate-400 group-hover:text-emerald-600 mb-1" />
                      <span className="text-[11px] font-bold text-slate-700 group-hover:text-emerald-900">
                        {isUploading ? 'Processando...' : 'Tirar / Anexar Foto'}
                      </span>
                      <span className="text-[9px] text-slate-400">Ângulo {angle.label.split(' ')[0]}</span>
                    </button>
                  </div>
                )}

                <input
                  type="file"
                  ref={el => { fileInputsRef.current[angle.key] = el; }}
                  accept="image/*"
                  capture="environment"
                  onChange={e => handleCapture(angle.key, e)}
                  className="hidden"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const VehicleVisualEvaluation = React.memo(
  VehicleVisualEvaluationComponent,
  (prev, next) =>
    prev.value.front === next.value.front &&
    prev.value.rear === next.value.rear &&
    prev.value.leftSide === next.value.leftSide &&
    prev.value.rightSide === next.value.rightSide &&
    prev.onChange === next.onChange &&
    prev.onPreview === next.onPreview
);
