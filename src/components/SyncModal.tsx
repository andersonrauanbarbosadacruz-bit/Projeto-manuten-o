import React, { useState, useEffect, useRef, useMemo } from 'react';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  X, 
  QrCode, 
  Camera, 
  Smartphone, 
  Send, 
  Download, 
  Upload, 
  Copy, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Share2, 
  Laptop, 
  Radio, 
  MessageCircle,
  FileJson
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { 
  encodeSyncPayload, 
  decodeSyncPayload, 
  generateSyncShareUrl, 
  SyncPayload, 
  syncManager 
} from '../utils/syncManager';

export const SyncModal: React.FC = () => {
  const { 
    showSyncModal, 
    setShowSyncModal, 
    checklists, 
    workOrders, 
    importSyncPayload, 
    peerStatus, 
    peerMessage, 
    userRole 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'TRANSMIT' | 'SCAN' | 'WHATSAPP' | 'MANUAL'>(
    userRole === 'ADMIN' ? 'SCAN' : 'TRANSMIT'
  );

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const qrReaderIdRef = useRef<string>(`qr-reader-${Math.random().toString(36).substring(2, 7)}`);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Prepare full sync payload of this device (memoized)
  const currentPayload: SyncPayload = useMemo(() => ({
    version: 1,
    timestamp: new Date().toISOString(),
    source: userRole === 'OPERADOR' ? 'Celular Operador' : 'Computador Admin',
    checklists,
    workOrders
  }), [checklists, workOrders, userRole]);

  const encodedPayload = useMemo(() => encodeSyncPayload(currentPayload), [currentPayload]);
  const shareableUrl = useMemo(() => generateSyncShareUrl(currentPayload), [currentPayload]);

  // Render transmission QR Code onto canvas
  useEffect(() => {
    if (!showSyncModal || activeTab !== 'TRANSMIT') return;

    const timer = setTimeout(() => {
      if (qrCanvasRef.current) {
        QRCode.toCanvas(
          qrCanvasRef.current,
          shareableUrl,
          {
            width: 264,
            margin: 3,
            color: {
              dark: '#022c22',
              light: '#ffffff'
            },
            errorCorrectionLevel: 'M'
          },
          (err) => {
            if (err) console.error('QR Render Error:', err);
          }
        );
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [showSyncModal, activeTab, shareableUrl]);

  // Handle Scanner Start/Stop
  useEffect(() => {
    if (!showSyncModal || activeTab !== 'SCAN') {
      stopScanner();
      return;
    }

    startScanner();

    return () => {
      stopScanner();
    };
  }, [showSyncModal, activeTab]);

  const startScanner = async () => {
    setScannerError(null);
    try {
      const elementId = qrReaderIdRef.current;
      if (!document.getElementById(elementId)) {
        setTimeout(startScanner, 150);
        return;
      }

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(elementId);
      }

      setIsScanning(true);

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          handleScannedText(decodedText);
        },
        () => {
          // Frame error, safe to ignore
        }
      );
    } catch (err: any) {
      console.warn('Camera scanner start error:', err);
      setIsScanning(false);
      setScannerError('Não foi possível acessar a câmera. Você também pode importar via WhatsApp ou colando o código.');
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  };

  const handleScannedText = (text: string) => {
    stopScanner();

    // Check if it's a URL with import_sync or raw compressed code
    let code = text.trim();
    if (code.includes('import_sync=')) {
      try {
        const urlObj = new URL(code);
        code = urlObj.searchParams.get('import_sync') || code;
      } catch {
        const match = code.match(/import_sync=([^&]+)/);
        if (match) code = match[1];
      }
    }

    const payload = decodeSyncPayload(code);
    if (payload) {
      importSyncPayload(payload);
      setImportStatus(`Sincronização concluída! ${payload.checklists?.length || 0} checklists e ${payload.workOrders?.length || 0} OS recebidos.`);
    } else {
      setImportStatus('Formato de código QR inválido ou ilegível.');
    }
  };

  const handleManualImport = () => {
    if (!manualInput.trim()) return;
    let code = manualInput.trim();
    if (code.includes('import_sync=')) {
      try {
        const urlObj = new URL(code);
        code = urlObj.searchParams.get('import_sync') || code;
      } catch {
        const match = code.match(/import_sync=([^&]+)/);
        if (match) code = match[1];
      }
    }

    const payload = decodeSyncPayload(code);
    if (payload) {
      importSyncPayload(payload);
      setImportStatus(`Importado com sucesso! ${payload.checklists?.length || 0} checklists e ${payload.workOrders?.length || 0} OS atualizados na base.`);
      setManualInput('');
    } else {
      // Try raw JSON parse
      try {
        const parsed = JSON.parse(code);
        if (Array.isArray(parsed.checklists) || Array.isArray(parsed.workOrders)) {
          importSyncPayload({
            version: 1,
            timestamp: new Date().toISOString(),
            source: 'Importação Manual',
            checklists: parsed.checklists,
            workOrders: parsed.workOrders
          });
          setImportStatus('Arquivo JSON importado com sucesso!');
          setManualInput('');
          return;
        }
      } catch {
        // ignore
      }
      setImportStatus('Código de sincronização inválido ou corrompido.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed.checklists) || Array.isArray(parsed.workOrders)) {
          importSyncPayload({
            version: 1,
            timestamp: new Date().toISOString(),
            source: file.name,
            checklists: parsed.checklists,
            workOrders: parsed.workOrders
          });
          setImportStatus(`Arquivo "${file.name}" importado com sucesso na base!`);
        } else {
          setImportStatus('Estrutura de arquivo JSON não reconhecida.');
        }
      } catch (err: any) {
        setImportStatus(`Erro ao ler arquivo: ${err.message}`);
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const handleDownloadBackup = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `agrocheck_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareableUrl);
      } else {
        const ta = document.createElement('textarea');
        ta.value = shareableUrl;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, shareableUrl.length);
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(encodedPayload);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      // ignore
    }
  };

  const whatsappMessage = `*el Ciruelo - Sincronização de Campo*\n\nOlá Administrador! Envio a sincronização dos Checklists e Ordens de Serviço realizados:\n\n📊 *Total Checklists:* ${checklists.length}\n🔧 *Total Ordens de Serviço:* ${workOrders.length}\n\n👉 *Clique no link abaixo no computador para importar tudo instantaneamente para a base:*\n${shareableUrl}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;

  if (!showSyncModal) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in"
      onClick={() => setShowSyncModal(false)}
    >
      <div 
        className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 max-h-[94vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 p-5 text-white relative shrink-0">
          <button
            onClick={() => setShowSyncModal(false)}
            className="absolute right-4 top-4 p-1.5 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-400/30">
              <RefreshCw className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 block">
                Sincronização 100% Garantida
              </span>
              <h2 className="text-xl font-extrabold text-white">
                Transferir Dados Celular ↔ Computador
              </h2>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="grid grid-cols-4 gap-1 mt-4 pt-3 border-t border-slate-700/60 text-xs">
            <button
              onClick={() => setActiveTab('TRANSMIT')}
              className={`py-2 px-2 rounded-xl text-center font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
                activeTab === 'TRANSMIT'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <QrCode className="w-4 h-4 mb-0.5" />
              <span>Gerar QR</span>
            </button>

            <button
              onClick={() => setActiveTab('SCAN')}
              className={`py-2 px-2 rounded-xl text-center font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
                activeTab === 'SCAN'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Camera className="w-4 h-4 mb-0.5" />
              <span>Ler QR</span>
            </button>

            <button
              onClick={() => setActiveTab('WHATSAPP')}
              className={`py-2 px-2 rounded-xl text-center font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
                activeTab === 'WHATSAPP'
                  ? 'bg-[#25D366] text-white shadow-xs'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <MessageCircle className="w-4 h-4 mb-0.5" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={() => setActiveTab('MANUAL')}
              className={`py-2 px-2 rounded-xl text-center font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
                activeTab === 'MANUAL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <FileJson className="w-4 h-4 mb-0.5" />
              <span>Código/JSON</span>
            </button>
          </div>
        </div>

        {/* Automatic Real-Time Sync Notice */}
        <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-3 text-emerald-950 flex items-start space-x-2.5 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse mt-1 shrink-0" />
          <div className="text-xs">
            <strong className="block font-bold text-emerald-900">Sincronização 100% Automática em Tempo Real Ativa!</strong>
            <p className="text-emerald-800 text-[11px] leading-snug mt-0.5">
              Sempre que você preenche e salva no celular, as informações <strong>sobem automaticamente</strong> para a tela do computador em tempo real, sem necessidade de ler QR Code! As opções abaixo servem apenas como alternativa de envio manual.
            </p>
          </div>
        </div>

        {/* Real-time P2P status bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-5 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className={`w-2.5 h-2.5 rounded-full ${
              peerStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
            }`} />
            <span className="font-semibold text-slate-700">
              Canal P2P Direto: {peerStatus === 'connected' ? 'Conectado em tempo real' : 'Aguardando pareamento'}
            </span>
          </div>
          {peerMessage && (
            <span className="text-[11px] text-slate-500 font-mono truncate max-w-[200px]">
              {peerMessage}
            </span>
          )}
        </div>

        {/* Feedback message */}
        {importStatus && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 text-xs font-bold text-emerald-900 flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{importStatus}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-slate-800 flex-1">
          {/* TAB 1: TRANSMIT (QR CODE TO SCAN) */}
          {activeTab === 'TRANSMIT' && (
            <div className="space-y-4 text-center">
              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 text-xs text-emerald-950">
                <p className="font-bold">
                  📲 Exiba este QR Code na tela do seu celular para o computador escanear!
                </p>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  Ele contém todos os {checklists.length} checklists e {workOrders.length} ordens de serviço salvos neste aparelho.
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-md inline-block">
                <canvas ref={qrCanvasRef} className="rounded-lg max-w-full" />
              </div>

              <div className="flex items-center justify-center space-x-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link de Sincronização'}</span>
                </button>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#1ebd5a] text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Enviar ao WhatsApp</span>
                </a>
              </div>
            </div>
          )}

          {/* TAB 2: SCAN (WEBCAM / CAMERA SCANNER) */}
          {activeTab === 'SCAN' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200 text-xs text-blue-950">
                <p className="font-bold">
                  💻 Aponte o QR Code do celular para a câmera deste computador!
                </p>
                <p className="text-[11px] text-blue-800 mt-0.5">
                  Ao ler o QR code exibido no celular do operador, todos os checklists e ordens de serviço sobem imediatamente para a base central do computador.
                </p>
              </div>

              <div className="rounded-2xl overflow-hidden border-2 border-slate-200 bg-black min-h-[260px] flex items-center justify-center relative">
                <div id={qrReaderIdRef.current} className="w-full" />
                {!isScanning && (
                  <div className="p-6 text-center text-white space-y-2">
                    <Camera className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                    <p className="font-bold text-sm">Câmera em pausa</p>
                    <button
                      type="button"
                      onClick={startScanner}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Ativar Câmera
                    </button>
                  </div>
                )}
              </div>

              {scannerError && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{scannerError}</p>
                    <p className="mt-1 text-slate-600">
                      Alternativa: peça ao operador para clicar na aba <strong>WhatsApp</strong> e enviar o link de 1 clique!
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: WHATSAPP 1-TAP SYNC */}
          {activeTab === 'WHATSAPP' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 space-y-2">
                <p className="font-bold text-sm text-emerald-900 flex items-center space-x-1.5">
                  <MessageCircle className="w-4 h-4 text-[#25D366]" />
                  <span>Sincronização Fácil via WhatsApp</span>
                </p>
                <p className="text-slate-600 leading-relaxed text-xs">
                  O operador clica no botão verde abaixo no celular e envia a mensagem para o WhatsApp do supervisor. Quando o supervisor clica no link no computador, todos os checklists sobem para a base do PC instantaneamente!
                </p>
              </div>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center space-x-2 px-5 py-4 bg-[#25D366] hover:bg-[#1ebd5a] text-white rounded-2xl font-black text-sm shadow-md transition-all active:scale-98 cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 fill-white text-[#25D366]" />
                <span>Enviar Sincronização pelo WhatsApp</span>
              </a>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                  Ou copie o link direto:
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={shareableUrl}
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 truncate select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer shrink-0"
                  >
                    {copiedLink ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MANUAL CODE / FILE IMPORT & EXPORT */}
          {activeTab === 'MANUAL' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Colar Código de Sincronização ou JSON:
                </label>
                <textarea
                  rows={3}
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Cole aqui o código de sincronização ou link que o operador gerou..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleManualImport}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Importar Dados Colados
                </button>
              </div>

              <div className="pt-3 border-t border-slate-200 grid grid-cols-2 gap-2">
                <label className="flex items-center justify-center space-x-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 cursor-pointer transition-colors text-center">
                  <Upload className="w-4 h-4 text-slate-600 shrink-0" />
                  <span>Carregar Arquivo .JSON</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="flex items-center justify-center space-x-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 cursor-pointer transition-colors text-center"
                >
                  <Download className="w-4 h-4 text-slate-600 shrink-0" />
                  <span>Baixar Backup .JSON</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-1.5 text-slate-500 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Dados preservados com segurança local e remota</span>
          </div>
          <button
            onClick={() => setShowSyncModal(false)}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
