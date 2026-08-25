import React, { useState } from 'react';
import { Camera, CheckCircle2, Clock, Trash2 } from 'lucide-react';
import { compressPhoto, extractExifTimestamp } from '../../lib/imageUtils';
import { api, isOnline } from '../../lib/api';
import { db } from '../../lib/db';
import { ImageCaptureModal } from '../common/ImageCaptureModal';

interface FolderRehearsalPhotosProps {
  schoolId: string;
  onComplete: (status: boolean) => void;
  isReadOnly?: boolean;
}

interface PhotoItem {
  id: string;
  url: string;
  timestamp: Date;
}

export const FolderRehearsalPhotos: React.FC<FolderRehearsalPhotosProps> = ({ schoolId, onComplete, isReadOnly = false }) => {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  const handlePhotoCaptured = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setLoading(true);
    try {
      const newItems: PhotoItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressed = await compressPhoto(file);
        const timestamp = await extractExifTimestamp(file);
        newItems.push({
          id: `${Date.now()}_${i}`,
          url: compressed,
          timestamp,
        });
      }

      const updated = [...photos, ...newItems];
      setPhotos(updated);

      if (updated.length >= 1) {
        onComplete(true);
      }
    } catch (error) {
      console.error('Error processing photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePhoto = (id: string) => {
    const updated = photos.filter((p) => p.id !== id);
    setPhotos(updated);
    if (updated.length < 1) {
      onComplete(false);
    }
  };

  const handleSubmitPhotos = async () => {
    if (photos.length < 1) return;

    setLoading(true);
    try {
      const payload = {
        date: new Date().toISOString(),
        schoolId,
        photoUrls: photos.map((p) => p.url),
        originalTimestamp: photos[0]?.timestamp?.toISOString(),
      };

      if (isOnline()) {
        await api.post('/sessions/rehearsals', payload);
      } else {
        for (const p of photos) {
          await db.pendingPhotos.add({
            schoolId,
            date: new Date().toISOString(),
            originalTimestamp: p.timestamp.toISOString(),
            photoUrl: p.url,
            synced: false,
            timestamp: Date.now(),
          });
        }
      }

      setSubmitted(true);
      onComplete(true);
    } catch (error) {
      console.error('Error uploading rehearsal photos:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-b-bento-lg space-y-6">
      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3">
        <Camera className="text-accentPeach shrink-0 mt-0.5" size={20} />
        <div>
          <h4 className="text-sm font-extrabold text-orange-950">Foto do Ensaio Obrigatória</h4>
          <p className="text-xs text-orange-800 font-medium">
            Adicione no mínimo 1 foto do ensaio de hoje para validar o atendimento. Metadados de data e hora são extraídos automaticamente.
          </p>
        </div>
      </div>

      {/* Photo Picker / Camera button */}
      <div className="border-2 border-dashed border-orange-200 rounded-3xl p-6 text-center hover:border-accentPeach transition bg-orange-50/30">
        <Camera size={40} className="mx-auto text-accentPeach mb-2" />
        <p className="text-sm font-bold text-gray-800 mb-1">Fotos do Ensaio</p>
        <p className="text-xs text-gray-500 mb-4">Captura direta pela câmera ou arquivo local</p>

        <button
          type="button"
          onClick={() => setShowImageModal(true)}
          className="inline-flex items-center gap-2 bg-charcoal text-white text-xs font-extrabold px-6 py-3 rounded-full cursor-pointer hover:bg-black shadow-md transition"
        >
          <Camera size={16} /> Adicionar Fotos do Ensaio
        </button>
      </div>

      {/* Photos Grid */}
      {photos.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-extrabold text-sm text-gray-800">
            Fotos Selecionadas ({photos.length})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group rounded-2xl overflow-hidden border bg-gray-50 shadow-sm">
                <img src={photo.url} alt="Ensaio" className="w-full h-32 object-cover" />
                <div className="p-2 bg-white flex items-center justify-between text-[11px] text-gray-600 font-bold">
                  <span className="flex items-center gap-1">
                    <Clock size={12} className="text-accentPeach" />
                    {photo.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(photo.id)}
                    className="text-rose-600 hover:bg-rose-50 p-1 rounded-full"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Button */}
      <button
        type="button"
        onClick={handleSubmitPhotos}
        disabled={photos.length < 1 || loading || submitted}
        className={`w-full py-4 rounded-full font-extrabold text-base shadow-lg transition-all flex items-center justify-center gap-2 ${
          photos.length < 1
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : submitted
            ? 'bg-emerald-600 text-white cursor-default'
            : 'bg-charcoal text-white hover:bg-black active:scale-[0.99]'
        }`}
      >
        {submitted ? (
          <>
            <CheckCircle2 size={20} /> Fotos Salvas e Validadas!
          </>
        ) : (
          'Enviar Fotos do Ensaio'
        )}
      </button>

      {/* Global Image Capture Modal */}
      <ImageCaptureModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onCapture={handlePhotoCaptured}
        title="Fotos do Ensaio"
        multiple={true}
      />
    </div>
  );
};
