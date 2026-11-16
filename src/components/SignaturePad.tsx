import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PenTool, RotateCcw, Check, X, ShieldCheck } from 'lucide-react';

interface SignaturePadProps {
  signatureUrl?: string;
  onSave: (dataUrl: string) => void;
  onClear: () => void;
  driverName?: string;
  required?: boolean;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  signatureUrl,
  onSave,
  onClear,
  driverName,
  required = true
}) => {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Use refs for drawing state to avoid React re-render lags during touch gestures
  const isDrawingRef = useRef(false);
  const hasDrawnRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const dprRef = useRef(1);

  // Setup / reset canvas with high DPI and proper background
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(window.devicePixelRatio || 1, 2);
    dprRef.current = dpr;

    const displayWidth = rect.width > 0 ? rect.width : 460;
    const displayHeight = rect.height > 0 ? rect.height : 200;

    canvas.width = Math.round(displayWidth * dpr);
    canvas.height = Math.round(displayHeight * dpr);

    // Reset coordinate transform and scale for device pixel ratio
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    // Solid white canvas background for clean PDF & print rendering
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Baseline guide line for signature alignment
    ctx.beginPath();
    ctx.strokeStyle = '#e2e8f0'; // slate-200
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.moveTo(24, displayHeight - 40);
    ctx.lineTo(displayWidth - 24, displayHeight - 40);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // Professional ink styling
    ctx.strokeStyle = '#0f172a'; // slate-900 dark ink
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    hasDrawnRef.current = false;
    setHasDrawn(false);
    lastPointRef.current = null;
  }, []);

  // When modal opens, initialize the canvas smoothly
  useEffect(() => {
    if (!isOpenModal) return;

    // Small delay allows CSS modal animation to layout properly
    const timeout = setTimeout(() => {
      setupCanvas();
    }, 60);

    return () => clearTimeout(timeout);
  }, [isOpenModal, setupCanvas]);

  // Direct native Pointer Events binding for ultra-fast, zero-lag touch response
  useEffect(() => {
    if (!isOpenModal) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getCanvasPoint = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    const handlePointerDown = (e: PointerEvent) => {
      e.preventDefault();
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // Fallback for devices without pointer capture support
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const point = getCanvasPoint(e);
      isDrawingRef.current = true;
      lastPointRef.current = point;

      // Draw initial touch dot
      ctx.beginPath();
      ctx.arc(point.x, point.y, 1.4, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();

      // Only notify React state once upon starting to draw
      if (!hasDrawnRef.current) {
        hasDrawnRef.current = true;
        setHasDrawn(true);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDrawingRef.current || !lastPointRef.current) return;
      e.preventDefault();

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const currentPoint = getCanvasPoint(e);
      const lastPoint = lastPointRef.current;

      // Smooth Bézier midpoint curve: instant O(1) performance without path accumulation lag
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);

      const midPointX = (lastPoint.x + currentPoint.x) / 2;
      const midPointY = (lastPoint.y + currentPoint.y) / 2;

      ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, midPointX, midPointY);
      ctx.stroke();

      lastPointRef.current = currentPoint;
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      isDrawingRef.current = false;
      lastPointRef.current = null;
      try {
        if (canvas.hasPointerCapture(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Safe catch
      }
    };

    const handlePointerCancel = (e: PointerEvent) => {
      isDrawingRef.current = false;
      lastPointRef.current = null;
      try {
        if (canvas.hasPointerCapture(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Safe catch
      }
    };

    // Attach native non-passive listeners directly to avoid browser gesture interference
    canvas.addEventListener('pointerdown', handlePointerDown, { passive: false });
    canvas.addEventListener('pointermove', handlePointerMove, { passive: false });
    canvas.addEventListener('pointerup', handlePointerUp, { passive: false });
    canvas.addEventListener('pointercancel', handlePointerCancel, { passive: false });

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [isOpenModal]);

  const confirmSignature = () => {
    if (!canvasRef.current || !hasDrawnRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onSave(dataUrl);
    setIsOpenModal(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center">
          <PenTool className="w-3.5 h-3.5 mr-1 text-emerald-700" />
          Assinatura na Tela do Responsável / Condutor:
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {signatureUrl ? (
          <span className="inline-flex items-center text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300">
            <Check className="w-3 h-3 mr-1 text-emerald-700" />
            Assinatura Coletada
          </span>
        ) : (
          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-300">
            Pendente de Assinatura
          </span>
        )}
      </div>

      {signatureUrl ? (
        <div className="p-3 bg-white border border-emerald-300 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <div className="w-40 h-16 bg-slate-50 border border-slate-200 rounded-lg p-1 flex items-center justify-center overflow-hidden">
              <img src={signatureUrl} alt="Assinatura" className="max-h-full max-w-full object-contain" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                {driverName ? `Assinado por: ${driverName}` : 'Assinatura Digital Registrada'}
              </p>
              <p className="text-[11px] text-slate-500">Coletada diretamente no dispositivo touchscreen</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                setHasDrawn(false);
                hasDrawnRef.current = false;
                setIsOpenModal(true);
              }}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Assinar Novamente
            </button>
            <button
              type="button"
              onClick={onClear}
              className="px-2.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              title="Remover assinatura"
            >
              Limpar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setHasDrawn(false);
            hasDrawnRef.current = false;
            setIsOpenModal(true);
          }}
          className="w-full py-4 px-4 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border-2 border-dashed border-emerald-400 rounded-xl flex flex-col items-center justify-center space-y-1 transition-all active:scale-[0.99] cursor-pointer group"
        >
          <div className="p-2 bg-emerald-600 text-white rounded-full group-hover:scale-110 transition-transform shadow-xs">
            <PenTool className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-emerald-950">
            Clique aqui para Coletar a Assinatura na Tela
          </span>
          <span className="text-[11px] text-slate-500">
            O condutor/responsável pode assinar diretamente com o dedo ou caneta touchscreen
          </span>
        </button>
      )}

      {/* Signature Capture Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-300 overflow-hidden animate-in zoom-in-95">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <PenTool className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">Assinatura Digital no Touchscreen</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpenModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>
                  Responsável: <strong>{driverName || 'Condutor do Veículo'}</strong>
                </span>
                <span className="text-[11px] text-slate-400">Assine com o dedo ou caneta:</span>
              </div>

              {/* High Performance Canvas Box */}
              <div 
                ref={containerRef}
                className="border-2 border-slate-300 hover:border-emerald-500 rounded-xl bg-white overflow-hidden relative shadow-inner select-none transition-colors"
                style={{ touchAction: 'none' }}
              >
                <canvas
                  ref={canvasRef}
                  style={{ 
                    width: '100%', 
                    height: '210px', 
                    display: 'block', 
                    touchAction: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none'
                  }}
                  className="cursor-crosshair active:cursor-crosshair"
                />

                {!hasDrawn && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 text-xs font-semibold select-none space-y-1">
                    <span className="text-lg">✍️</span>
                    <span>Toque na tela e assine com o dedo ou caneta</span>
                    <span className="text-[10px] text-slate-400">Linha pontilhada indica a base da assinatura</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={setupCanvas}
                  className="inline-flex items-center space-x-1 px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Limpar Tela</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsOpenModal(false)}
                    className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmSignature}
                    disabled={!hasDrawn}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white rounded-lg shadow-sm cursor-pointer transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirmar Assinatura</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
