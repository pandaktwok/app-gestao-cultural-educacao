import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Check, RefreshCw, Trash2, X } from 'lucide-react';

interface ImageCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (files: File[]) => void;
  title?: string;
  /** Permite tirar várias fotos seguidas antes de concluir. */
  multiple?: boolean;
}

interface Shot {
  id: number;
  file: File;
  preview: string;
}

/**
 * Captura de foto SOMENTE pela câmera. Não existe opção de galeria.
 * Usa a câmera ao vivo (getUserMedia). Se o aparelho/navegador não permitir,
 * cai para o seletor nativo em modo "câmera" (capture="environment").
 */
export const ImageCaptureModal: React.FC<ImageCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Tirar foto',
  multiple = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fallbackRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<'starting' | 'live' | 'fallback'>('starting');
  const [shots, setShots] = useState<Shot[]>([]);
  const [flash, setFlash] = useState(false);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');

  useEffect(() => setMounted(true), []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setMode('starting');
    setShots([]);

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMode('fallback');
        return;
      }
      try {
        stopStream();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setMode('live');
      } catch {
        if (!cancelled) setMode('fallback');
      }
    };
    start();

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      cancelled = true;
      stopStream();
      document.body.style.overflow = prev;
    };
  }, [isOpen, facing, stopStream]);

  // Liga o stream ao <video> quando ele aparece
  useEffect(() => {
    if (mode === 'live' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [mode]);

  useEffect(() => {
    return () => shots.forEach((s) => URL.revokeObjectURL(s.preview));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isOpen || !mounted) return null;

  const finish = (files: File[]) => {
    stopStream();
    if (files.length > 0) onCapture(files);
    onClose();
  };

  const takeShot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const max = 1600;
    const scale = Math.min(1, max / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    setFlash(true);
    setTimeout(() => setFlash(false), 120);
    if (navigator.vibrate) navigator.vibrate(25);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `foto_${Date.now()}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
        if (!multiple) {
          finish([file]);
          return;
        }
        setShots((prev) => [...prev, { id: Date.now(), file, preview: URL.createObjectURL(file) }]);
      },
      'image/jpeg',
      0.85
    );
  };

  const removeShot = (id: number) => {
    setShots((prev) => {
      const target = prev.find((s) => s.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((s) => s.id !== id);
    });
  };

  const handleFallbackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (files.length > 0) finish(files);
  };

  return createPortal(
    <div className="fixed inset-0 z-[110] bg-black flex flex-col text-white" role="dialog" aria-modal="true" aria-label={title}>
      {/* Barra superior */}
      <div className="flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 shrink-0 z-10">
        <button
          type="button"
          onClick={() => {
            stopStream();
            onClose();
          }}
          aria-label="Cancelar"
          className="h-12 w-12 rounded-full bg-white/15 flex items-center justify-center active:bg-white/30"
        >
          <X size={24} />
        </button>
        <span className="text-sm font-extrabold truncate px-2">{title}</span>
        {mode === 'live' ? (
          <button
            type="button"
            onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
            aria-label="Virar câmera"
            className="h-12 w-12 rounded-full bg-white/15 flex items-center justify-center active:bg-white/30"
          >
            <RefreshCw size={20} />
          </button>
        ) : (
          <span className="w-12" />
        )}
      </div>

      {/* Área da câmera */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        {mode === 'live' && (
          <video ref={videoRef} playsInline muted autoPlay className="absolute inset-0 w-full h-full object-cover" />
        )}
        {mode === 'starting' && (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white/70">
            Abrindo a câmera…
          </div>
        )}
        {mode === 'fallback' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-8 text-center">
            <div className="h-20 w-20 rounded-full bg-white/10 flex items-center justify-center">
              <Camera size={38} />
            </div>
            <p className="text-sm font-semibold text-white/80 max-w-xs">
              Toque no botão para abrir a câmera do celular e tirar a foto agora.
            </p>
            <input
              ref={fallbackRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple={multiple}
              onChange={handleFallbackChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fallbackRef.current?.click()}
              className="h-14 px-8 rounded-full bg-white text-black font-extrabold text-base flex items-center gap-2 active:scale-95 transition"
            >
              <Camera size={22} /> Abrir câmera
            </button>
          </div>
        )}
        {flash && <div className="absolute inset-0 bg-white/80 pointer-events-none" />}
      </div>

      {/* Faixa de fotos tiradas + controles */}
      <div className="shrink-0 bg-black/90 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {multiple && shots.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-4 pb-3">
            {shots.map((s, i) => (
              <div key={s.id} className="relative shrink-0">
                <img src={s.preview} alt={`Foto ${i + 1}`} className="h-16 w-16 rounded-xl object-cover border-2 border-white/40" />
                <button
                  type="button"
                  onClick={() => removeShot(s.id)}
                  aria-label={`Apagar foto ${i + 1}`}
                  className="absolute -top-1.5 -right-1.5 h-7 w-7 rounded-full bg-rose-600 flex items-center justify-center shadow"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between px-6 h-20">
          <span className="w-24 text-xs font-bold text-white/70">
            {multiple ? `${shots.length} foto${shots.length === 1 ? '' : 's'}` : ''}
          </span>

          {mode === 'live' ? (
            <button
              type="button"
              onClick={takeShot}
              aria-label="Tirar foto"
              className="h-[76px] w-[76px] rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition"
            >
              <span className="h-[58px] w-[58px] rounded-full bg-white" />
            </button>
          ) : (
            <span className="h-[76px] w-[76px]" />
          )}

          <div className="w-24 flex justify-end">
            {multiple && shots.length > 0 && (
              <button
                type="button"
                onClick={() => finish(shots.map((s) => s.file))}
                className="h-12 px-4 rounded-full bg-emerald-500 text-black font-extrabold text-sm flex items-center gap-1.5 active:scale-95 transition"
              >
                <Check size={18} /> Pronto
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
