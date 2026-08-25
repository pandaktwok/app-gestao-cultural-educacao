import React, { useRef } from 'react';
import { Camera, Image as ImageIcon, X } from 'lucide-react';

interface ImageCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (files: FileList | File[]) => void;
  title?: string;
  multiple?: boolean;
  userRole?: string;
}

export const ImageCaptureModal: React.FC<ImageCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Adicionar Foto',
  multiple = false,
  userRole,
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const role = userRole || (typeof window !== 'undefined' ? localStorage.getItem('user_role') || 'TEACHER' : 'TEACHER');
  const isProd = process.env.NODE_ENV === 'production' || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');
  const isMobile = typeof window !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isRestrictedMobileProd = isProd && isMobile && role === 'TEACHER';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onCapture(e.target.files);
      // Reset value so same file can be selected again if needed
      e.target.value = '';
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-t-bento-lg sm:rounded-bento-lg p-6 max-w-sm w-full space-y-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-extrabold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-xs text-gray-500 font-medium">
          {isRestrictedMobileProd
            ? 'Ambiente Mobile (Produção): Apenas fotos tiradas pela câmera nativa são permitidas para validação de atendimento.'
            : 'Escolha como deseja capturar ou selecionar a imagem:'}
        </p>

        {/* Hidden inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
        />

        {!isRestrictedMobileProd && (
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple={multiple}
            onChange={handleFileChange}
            className="hidden"
          />
        )}

        {/* Tactile Action Buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="w-full py-4 px-5 rounded-2xl bg-charcoal text-white font-extrabold text-sm flex items-center justify-center gap-3 shadow-md hover:bg-black active:scale-[0.98] transition-all"
          >
            <Camera size={22} className="text-emerald-400" />
            <span>Abrir Câmera Nativa</span>
          </button>

          {!isRestrictedMobileProd ? (
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="w-full py-4 px-5 rounded-2xl bg-gray-100 text-gray-800 font-extrabold text-sm flex items-center justify-center gap-3 border hover:bg-gray-200 active:scale-[0.98] transition-all"
            >
              <ImageIcon size={22} className="text-indigo-600" />
              <span>Escolher da Galeria</span>
            </button>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 font-bold text-center">
              ⚠️ Seleção da galeria desabilitada no perfil Professor em dispositivos móveis de produção.
            </div>
          )}
        </div>

        {/* Cancel Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 text-xs font-bold text-gray-500 hover:text-gray-800"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};
