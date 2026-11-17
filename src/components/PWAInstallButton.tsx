import React, { useState } from 'react';
import { Download, Smartphone, Share, MoreVertical, PlusSquare, X, CheckCircle2, Info } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [platformTab, setPlatformTab] = useState<'android' | 'ios'>(() => (isIOS ? 'ios' : 'android'));

  // Hide button automatically when already running as an installed standalone PWA
  if (isInstalled) {
    return null;
  }

  const handlePrimaryClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) return;
    }
    setPlatformTab(isIOS ? 'ios' : 'android');
    setShowGuideModal(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handlePrimaryClick}
        className={`flex items-center space-x-1 rounded-lg font-bold transition-all shadow-xs cursor-pointer ${
          compact
            ? 'px-2 py-1 text-[11px] bg-emerald-700 hover:bg-emerald-800 text-white'
            : 'px-2 sm:px-2.5 py-1 sm:py-1.5 text-[11px] sm:text-xs bg-emerald-700 hover:bg-emerald-800 text-white'
        }`}
        title="Instalar aplicativo no Android, iPhone (iOS) ou computador"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className="whitespace-nowrap">Instalar App</span>
      </button>

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          onClick={() => setShowGuideModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-emerald-900 text-white px-5 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center space-x-3 min-w-0">
                <img
                  src="/pwa-192x192.png"
                  alt="Gestão Manutenção"
                  className="w-11 h-11 rounded-xl bg-white p-0.5 object-contain shadow-sm shrink-0"
                />
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-extrabold leading-tight truncate">
                    Instalar Gestão Manutenção
                  </h3>
                  <p className="text-[11px] text-emerald-200 truncate">
                    Acesso rápido em tela cheia · Android e iOS
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800 transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Platform Switcher */}
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPlatformTab('android')}
                  className={`flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    platformTab === 'android'
                      ? 'bg-white text-emerald-900 shadow-xs ring-1 ring-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>Android</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlatformTab('ios')}
                  className={`flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    platformTab === 'ios'
                      ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-slate-700" />
                  <span>iPhone / iPad (iOS)</span>
                </button>
              </div>

              {platformTab === 'android' ? (
                <div className="space-y-3 text-xs text-slate-700">
                  {isInstallable && (
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await install();
                        if (ok) setShowGuideModal(false);
                      }}
                      className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-sm shadow-sm transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Instalar Agora em 1 Toque</span>
                    </button>
                  )}

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                    <div className="font-extrabold text-slate-900 text-xs">
                      Como instalar no Android (Chrome / Edge):
                    </div>
                    <ol className="space-y-2 text-xs text-slate-700">
                      <li className="flex items-start space-x-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center shrink-0 text-[11px]">
                          1
                        </span>
                        <span>
                          Caso tenha aberto pelo WhatsApp, toque em <strong>⋮</strong> e escolha{' '}
                          <strong>Abrir no navegador Chrome</strong>.
                        </span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center shrink-0 text-[11px]">
                          2
                        </span>
                        <span className="flex items-center flex-wrap gap-1">
                          Toque no menu{' '}
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-white border border-slate-300 font-bold text-slate-800">
                            <MoreVertical className="w-3 h-3" />
                          </span>{' '}
                          no canto superior direito.
                        </span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center shrink-0 text-[11px]">
                          3
                        </span>
                        <span>
                          Selecione <strong>Instalar aplicativo</strong> (ou{' '}
                          <strong>Adicionar à tela inicial</strong>) e confirme em <strong>Instalar</strong>.
                        </span>
                      </li>
                    </ol>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs text-slate-700">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                    <div className="font-extrabold text-slate-900 text-xs">
                      Como instalar no iPhone / iPad (Safari):
                    </div>
                    <ol className="space-y-2 text-xs text-slate-700">
                      <li className="flex items-start space-x-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-900 font-extrabold flex items-center justify-center shrink-0 text-[11px]">
                          1
                        </span>
                        <span>
                          Abra este link no navegador <strong>Safari</strong>.
                        </span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-900 font-extrabold flex items-center justify-center shrink-0 text-[11px]">
                          2
                        </span>
                        <span className="flex items-center flex-wrap gap-1">
                          Toque no botão <strong>Compartilhar</strong>{' '}
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-white border border-slate-300 text-blue-600">
                            <Share className="w-3.5 h-3.5" />
                          </span>{' '}
                          na barra inferior.
                        </span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-900 font-extrabold flex items-center justify-center shrink-0 text-[11px]">
                          3
                        </span>
                        <span className="flex items-center flex-wrap gap-1">
                          Role para baixo e toque em{' '}
                          <strong className="inline-flex items-center gap-1">
                            <PlusSquare className="w-3.5 h-3.5 text-slate-700" />
                            Adicionar à Tela de Início
                          </strong>{' '}
                          e depois em <strong>Adicionar</strong>.
                        </span>
                      </li>
                    </ol>
                  </div>
                </div>
              )}

              <div className="flex items-start space-x-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-950 leading-relaxed">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Atualização de ícone:</strong> se você já havia instalado uma versão antiga no celular,
                  remova o ícone antigo da tela inicial e instale novamente para exibir o novo ícone.
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Funciona em tela cheia (App)
                </span>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
