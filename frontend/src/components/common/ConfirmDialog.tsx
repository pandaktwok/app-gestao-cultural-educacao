import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Popup de confirmação (usado antes de qualquer exclusão). */
export const ConfirmDialog: React.FC<Props> = ({
  open,
  title,
  children,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = true,
  busy = false,
  onConfirm,
  onCancel,
}) => {
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[120] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      onClick={busy ? undefined : onCancel}
    >
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <span className={`h-11 w-11 rounded-full grid place-items-center shrink-0 ${danger ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
            <AlertTriangle size={22} />
          </span>
          <div className="min-w-0">
            <h3 className="text-lg font-extrabold text-gray-900 leading-tight">{title}</h3>
            <div className="text-sm text-gray-600 font-medium mt-1 space-y-1">{children}</div>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="flex-1 min-h-[46px] rounded-full border border-gray-300 text-sm font-extrabold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`flex-1 min-h-[46px] rounded-full text-sm font-extrabold text-white flex items-center justify-center gap-2 disabled:opacity-60 ${
              danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-charcoal hover:bg-black'
            }`}
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
