import React, { useRef, useState } from 'react';
import { Upload, FileText, CheckCircle2, Eye, Download, Trash2, AlertCircle } from 'lucide-react';
import { DocumentAttachment } from '../../types';
import { formatFileSize, processUploadedFile, downloadAttachment } from '../../utils/fileAttachmentHelper';

interface AttachmentUploadFieldProps {
  label: string;
  tag: string;
  description?: string;
  attachment?: DocumentAttachment;
  onAttachmentChange: (attachment: DocumentAttachment | undefined) => void;
  onViewAttachment?: (attachment: DocumentAttachment) => void;
  required?: boolean;
}

export const AttachmentUploadField: React.FC<AttachmentUploadFieldProps> = ({
  label,
  tag,
  description,
  attachment,
  onAttachmentChange,
  onViewAttachment,
  required = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const processed = await processUploadedFile(file, tag);
      onAttachmentChange(processed);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao carregar o arquivo.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAttachmentChange(undefined);
    setErrorMessage(null);
  };

  return (
    <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 sm:p-4 hover:border-slate-300 transition-colors">
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <label className="text-xs sm:text-sm font-bold text-slate-900 flex items-center space-x-1.5">
          <span>{label}</span>
          {required && <span className="text-red-500 font-extrabold">*</span>}
        </label>
        {attachment ? (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Anexado com Sucesso</span>
          </span>
        ) : (
          <span className="text-[10px] font-semibold text-slate-500">
            {required ? 'Obrigatório' : 'Opcional'}
          </span>
        )}
      </div>

      {description && (
        <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">
          {description}
        </p>
      )}

      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        onChange={handleFileSelected}
        className="hidden"
      />

      {attachment ? (
        /* Attached state preview card */
        <div className="bg-white border border-emerald-200 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center space-x-2.5 overflow-hidden w-full">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-900 truncate" title={attachment.fileName}>
                {attachment.fileName}
              </p>
              <p className="text-[10px] text-slate-500">
                {formatFileSize(attachment.fileSize)} • Anexado em {new Date(attachment.uploadedAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-center">
            {onViewAttachment && (
              <button
                type="button"
                onClick={() => onViewAttachment(attachment)}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                title="Visualizar documento em tela cheia"
              >
                <Eye className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">Visualizar</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => downloadAttachment(attachment)}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors cursor-pointer border border-emerald-200"
              title="Baixar arquivo para o computador"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Baixar</span>
            </button>

            <button
              type="button"
              onClick={handleRemove}
              className="p-1.5 rounded-md text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              title="Remover anexo"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Empty upload trigger */
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
            isProcessing
              ? 'border-emerald-400 bg-emerald-50/50 cursor-wait'
              : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30'
          }`}
        >
          <div className="flex flex-col items-center justify-center space-y-1.5">
            <div className="p-2 rounded-full bg-slate-100 text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors">
              <Upload className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">
                {isProcessing ? 'Processando arquivo...' : 'Clique para selecionar o documento'}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Formatos aceitos: PDF oficial, PNG ou JPEG (máx. 15MB)
              </p>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mt-2 flex items-center space-x-1.5 text-xs text-red-700 bg-red-50 p-2 rounded-lg border border-red-200">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
