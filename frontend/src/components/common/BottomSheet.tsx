import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Ocupa a tela inteira no celular (ex.: chamada). */
  full?: boolean;
  children: React.ReactNode;
  /** Rodapé fixo com botões de ação (respeita a área segura do iPhone). */
  footer?: React.ReactNode;
}

/**
 * Painel que sobe da parte de baixo da tela no celular (e vira janela
 * centralizada no desktop). Alvos de toque grandes, rodapé fixo, fecha ao
 * tocar fora.
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({ open, onClose, title, subtitle, full, children, footer }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !full) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`bg-white w-full sm:max-w-md flex flex-col shadow-2xl ${
          full
            ? 'h-[100dvh] sm:h-auto sm:max-h-[92dvh] sm:rounded-3xl'
            : 'max-h-[92dvh] rounded-t-3xl sm:rounded-3xl'
        }`}
      >
        {!full && <div className="sm:hidden mx-auto mt-2.5 h-1.5 w-11 rounded-full bg-gray-300 shrink-0" />}

        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b shrink-0 pt-[max(1rem,env(safe-area-inset-top))] sm:pt-4">
          <div className="min-w-0">
            <h3 className="text-lg font-extrabold text-gray-900 leading-tight">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500 font-medium mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="h-11 w-11 -mr-2 -mt-1 rounded-full text-gray-500 hover:bg-gray-100 active:bg-gray-200 flex items-center justify-center shrink-0"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>

        {footer && (
          <div className="border-t px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shrink-0 bg-white sm:rounded-b-3xl">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
