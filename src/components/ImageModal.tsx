import React from 'react';
import { X, ZoomIn, Download } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ImageModal: React.FC = () => {
  const { previewImage, setPreviewImage } = useApp();

  if (!previewImage) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={() => setPreviewImage(null)}
    >
      <div 
        className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 text-white"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center space-x-2">
            <ZoomIn className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-slate-200 text-sm md:text-base">
              {previewImage.title || 'Visualização do Anexo Fotográfico'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <a
              href={previewImage.url}
              download="registro-fotografico.png"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Baixar imagem"
            >
              <Download className="w-5 h-5" />
            </a>
            <button
              onClick={() => setPreviewImage(null)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Fechar"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-4 flex items-center justify-center max-h-[75vh] overflow-auto bg-slate-950">
          <img
            src={previewImage.url}
            alt={previewImage.title || 'Foto de manutenção'}
            className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg shadow-md"
          />
        </div>

        {previewImage.title && (
          <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 text-sm text-slate-300 text-center">
            {previewImage.title}
          </div>
        )}
      </div>
    </div>
  );
};
