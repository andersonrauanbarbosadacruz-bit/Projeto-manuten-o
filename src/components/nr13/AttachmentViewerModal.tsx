import React from 'react';
import { X, Download, FileText, ExternalLink } from 'lucide-react';
import { DocumentAttachment } from '../../types';
import { downloadAttachment, formatFileSize } from '../../utils/fileAttachmentHelper';

interface AttachmentViewerModalProps {
  attachment: DocumentAttachment;
  onClose: () => void;
}

export const AttachmentViewerModal: React.FC<AttachmentViewerModalProps> = ({
  attachment,
  onClose
}) => {
  const isPdf = attachment.mimeType.toLowerCase().includes('pdf') || attachment.fileName.toLowerCase().endsWith('.pdf');
  const isImage = attachment.mimeType.startsWith('image/') || attachment.dataUrl.startsWith('data:image/');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-5xl h-[92vh] overflow-hidden border border-slate-300">
        {/* Top Header with El Ciruelo Branding */}
        <div className="bg-gradient-to-r from-fuchsia-950 via-slate-900 to-emerald-950 text-white px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-2 rounded-lg bg-fuchsia-900/60 text-fuchsia-200 border border-fuchsia-400/30">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-sm bg-fuchsia-200 text-fuchsia-950 uppercase tracking-wider">
                  🍇 el Ciruelo • Laudos
                </span>
                <span className="text-xs text-slate-300 font-medium">
                  {formatFileSize(attachment.fileSize)}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-xl">
                {attachment.fileName}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => downloadAttachment(attachment)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-xs cursor-pointer"
              title="Baixar arquivo original"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Baixar Arquivo</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Fechar visualizador"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 bg-slate-100 flex items-center justify-center p-2 sm:p-4 overflow-auto">
          {isPdf ? (
            <iframe
              src={attachment.dataUrl}
              title={attachment.fileName}
              className="w-full h-full rounded-xl border border-slate-300 bg-white shadow-inner"
            />
          ) : isImage ? (
            <div className="max-w-full max-h-full flex items-center justify-center p-2">
              <img
                src={attachment.dataUrl}
                alt={attachment.fileName}
                className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-lg border border-slate-300 bg-white"
              />
            </div>
          ) : (
            <div className="text-center p-8 bg-white rounded-xl shadow-xs max-w-md border border-slate-200">
              <FileText className="w-16 h-16 text-slate-400 mx-auto mb-3" />
              <h4 className="font-bold text-slate-800 text-base mb-1">
                Visualização direta não suportada
              </h4>
              <p className="text-xs text-slate-500 mb-4">
                Este formato de arquivo pode ser baixado e aberto diretamente em seu leitor local.
              </p>
              <button
                onClick={() => downloadAttachment(attachment)}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Baixar {attachment.fileName}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
