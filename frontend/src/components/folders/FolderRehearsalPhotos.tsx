import React, { useState } from 'react';
import { Camera, CheckCircle2, Clock, Trash2, Loader2 } from 'lucide-react';
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
  const [showCamera, setShowCamera] = useState(false);
  const [error, setError] = useState('');

  const handlePhotoCaptured = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const newItems: PhotoItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressed = await compressPhoto(file);
        const timestamp = await extractExifTimestamp(file);
        newItems.push({ id: `${Date.now()}_${i}`, url: compressed, timestamp });
      }
      const updated = [...photos, ...newItems];
      setPhotos(updated);
      setSubmitted(false); // novas fotos precisam ser enviadas
    } catch (err) {
      console.error('Error processing photos:', err);
      setError('Não foi possível processar a foto. Tente tirar novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePhoto = (id: string) => {
    const updated = photos.filter((p) => p.id !== id);
    setPhotos(updated);
    setSubmitted(false);
    if (updated.length < 1) onComplete(false);
  };

  const handleSubmitPhotos = async () => {
    if (photos.length < 1) return;
    setLoading(true);
    setError('');
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
    } catch (err) {
      console.error('Error uploading rehearsal photos:', err);
      setError('Não foi possível enviar agora. Confira a internet e toque em enviar de novo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-white rounded-b-bento-lg space-y-5">
      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3">
        <Camera className="text-accentPeach shrink-0 mt-0.5" size={22} />
        <div>
          <h4 className="text-sm font-extrabold text-orange-950">Foto do ensaio obrigatória</h4>
          <p className="text-xs text-orange-800 font-medium mt-0.5">
            Tire pelo menos 1 foto agora, durante o ensaio. A data e a hora são registradas automaticamente.
          </p>
        </div>
      </div>

      {/* Botão principal da câmera */}
      <button
        type="button"
        onClick={() => setShowCamera(true)}
        disabled={isReadOnly || loading}
        className="w-full min-h-[132px] rounded-3xl border-2 border-dashed border-orange-300 bg-orange-50/50 active:bg-orange-100 disabled:opacity-50 flex flex-col items-center justify-center gap-2 transition"
      >
        {loading ? (
          <Loader2 size={38} className="text-accentPeach animate-spin" />
        ) : (
          <span className="h-16 w-16 rounded-full bg-charcoal text-white flex items-center justify-center shadow-lg">
            <Camera size={30} />
          </span>
        )}
        <span className="text-base font-extrabold text-gray-900">
          {photos.length === 0 ? 'Tirar foto do ensaio' : 'Tirar mais fotos'}
        </span>
        <span className="text-xs text-gray-500 font-medium">Abre a câmera do celular</span>
      </button>

      {/* Grade de fotos */}
      {photos.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-extrabold text-sm text-gray-800">
            {photos.length} {photos.length === 1 ? 'foto tirada' : 'fotos tiradas'}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="relative rounded-2xl overflow-hidden border bg-gray-50 shadow-sm">
                <img src={photo.url} alt="Foto do ensaio" className="w-full h-36 object-cover" />
                <div className="px-2.5 py-1.5 bg-white flex items-center justify-between text-xs text-gray-600 font-bold">
                  <span className="flex items-center gap-1">
                    <Clock size={13} className="text-accentPeach" />
                    {photo.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(photo.id)}
                  aria-label="Apagar foto"
                  className="absolute top-2 right-2 h-11 w-11 rounded-full bg-black/60 text-white flex items-center justify-center active:bg-rose-600"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl p-3">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmitPhotos}
        disabled={photos.length < 1 || loading || submitted}
        className={`w-full min-h-[56px] rounded-full font-extrabold text-base shadow-lg transition-all flex items-center justify-center gap-2 ${
          photos.length < 1
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
            : submitted
            ? 'bg-emerald-600 text-white cursor-default'
            : 'bg-charcoal text-white active:scale-[0.98]'
        }`}
      >
        {submitted ? (
          <>
            <CheckCircle2 size={22} /> Fotos enviadas!
          </>
        ) : loading ? (
          <>
            <Loader2 size={20} className="animate-spin" /> Enviando…
          </>
        ) : (
          `Enviar ${photos.length > 0 ? photos.length : ''} ${photos.length === 1 ? 'foto' : 'fotos'}`.replace('  ', ' ')
        )}
      </button>

      <ImageCaptureModal
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handlePhotoCaptured}
        title="Fotos do ensaio"
        multiple
      />
    </div>
  );
};
