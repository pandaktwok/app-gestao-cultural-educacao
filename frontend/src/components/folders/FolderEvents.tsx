import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Camera, Plus, CheckCircle2, AlertTriangle, List, MapPin, X } from 'lucide-react';
import { compressPhoto } from '../../lib/imageUtils';
import { api, isOnline } from '../../lib/api';
import { db } from '../../lib/db';
import { ImageCaptureModal } from '../common/ImageCaptureModal';
import { InteractiveCalendar, EventItem } from '../common/InteractiveCalendar';

interface FolderEventsProps {
  schoolId: string;
}

export const FolderEvents: React.FC<FolderEventsProps> = ({ schoolId }) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('LIST');

  // Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventDateTime, setEventDateTime] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [loading, setLoading] = useState(false);

  // Photo addition modal for pending events
  const [pendingEventForPhoto, setPendingEventForPhoto] = useState<EventItem | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);

  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setEventDateTime(now.toISOString().slice(0, 16));

    fetchEvents();
  }, [schoolId]);

  const fetchEvents = async () => {
    try {
      if (isOnline()) {
        const res = await api.get(`/sessions/school/${schoolId}`);
        if (res.data && Array.isArray(res.data.eventSessions)) {
          setEvents(res.data.eventSessions);
        }
      } else {
        const local = await db.pendingEvents.where('schoolId').equals(schoolId).toArray();
        setEvents(
          local.map((e) => ({
            id: String(e.id),
            name: e.name,
            date: e.date,
            photoUrls: e.photoUrls,
            photos: e.photoUrls ? e.photoUrls.map((u) => ({ photoUrl: u })) : [],
          }))
        );
      }
    } catch (err) {
      console.error('Error fetching school events:', err);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName || !eventDateTime) {
      alert('Preencha o nome do evento e a data/horário.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: eventName,
        date: new Date(eventDateTime).toISOString(),
        locationAddress: locationAddress || undefined,
        schoolId,
        photoUrls: [],
      };

      if (isOnline()) {
        const res = await api.post('/sessions/events', payload);
        const newEv = Array.isArray(res.data) ? res.data[0] : res.data;
        setEvents((prev) => [newEv, ...prev]);
      } else {
        const id = await db.pendingEvents.add({
          schoolId,
          name: eventName,
          date: eventDateTime,
          photoUrls: [],
          synced: false,
          timestamp: Date.now(),
        });
        const created: EventItem = {
          id: String(id),
          name: eventName,
          date: eventDateTime,
          locationAddress,
          photos: [],
          photoUrls: [],
        };
        setEvents((prev) => [created, ...prev]);
      }

      setEventName('');
      setLocationAddress('');
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddPhoto = (ev: EventItem) => {
    setPendingEventForPhoto(ev);
    setShowImageModal(true);
  };

  const handlePhotoCaptured = async (files: FileList | File[]) => {
    if (!pendingEventForPhoto || !files || files.length === 0) return;

    setLoading(true);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressPhoto(files[i]);
        newUrls.push(compressed);
      }

      if (isOnline() && pendingEventForPhoto.id && !pendingEventForPhoto.id.startsWith('temp')) {
        await api.post(`/sessions/events/${pendingEventForPhoto.id}/photos`, {
          photoUrls: newUrls,
        });
      }

      setEvents((prev) =>
        prev.map((ev) => {
          if (ev.id === pendingEventForPhoto.id || ev.name === pendingEventForPhoto.name) {
            const existingPhotos = ev.photos || [];
            const added = newUrls.map((u) => ({ photoUrl: u }));
            return {
              ...ev,
              photos: [...existingPhotos, ...added],
              photoUrls: [...(ev.photoUrls || []), ...newUrls],
            };
          }
          return ev;
        })
      );

      setPendingEventForPhoto(null);
    } catch (err) {
      console.error('Error attaching photo to event:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-b-bento-lg space-y-6">
      {/* Header Info Banner & View Toggle */}
      <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <CalendarIcon className="text-indigo-600 shrink-0 mt-0.5" size={22} />
          <div>
            <h4 className="text-sm font-extrabold text-indigo-950">Módulo de Eventos e Apresentações</h4>
            <p className="text-xs text-indigo-800 font-medium">
              Cadastre e gerencie apresentações culturais com visualização em lista e calendário interativo.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-auto">
          {/* View Mode Switcher */}
          <div className="flex flex-wrap bg-white p-1 rounded-full border shadow-sm gap-1">
            <button
              type="button"
              onClick={() => setViewMode('LIST')}
              className={`px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1 transition ${
                viewMode === 'LIST' ? 'bg-indigo-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List size={14} /> Lista
            </button>
            <button
              type="button"
              onClick={() => setViewMode('CALENDAR')}
              className={`px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1 transition ${
                viewMode === 'CALENDAR' ? 'bg-indigo-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CalendarIcon size={14} /> Calendário
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md shrink-0 transition"
          >
            <Plus size={16} /> Cadastrar Evento
          </button>
        </div>
      </div>

      {/* Main View Mode Render */}
      {viewMode === 'CALENDAR' ? (
        <InteractiveCalendar events={events} onAddPhoto={handleOpenAddPhoto} />
      ) : (
        /* LIST VIEW */
        <div className="space-y-3">
          <h4 className="font-extrabold text-base text-gray-900">
            Eventos da Escola ({events.length})
          </h4>

          {events.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed text-gray-400 space-y-2">
              <CalendarIcon size={36} className="mx-auto text-gray-300" />
              <p className="text-xs font-bold text-gray-600">Nenhum evento registrado ainda.</p>
              <p className="text-[11px] text-gray-400">Clique no botão acima para cadastrar uma apresentação.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((ev, idx) => {
                const photoCount = (ev.photos ? ev.photos.length : 0) + (ev.photoUrls ? ev.photoUrls.length : 0);
                const isCompleted = photoCount > 0;

                return (
                  <div
                    key={ev.id || idx}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${
                      isCompleted
                        ? 'bg-emerald-50/70 border-emerald-300'
                        : 'bg-amber-50/80 border-amber-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h5 className="font-extrabold text-sm text-gray-900">{ev.name}</h5>
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                            isCompleted
                              ? 'bg-emerald-200 text-emerald-900'
                              : 'bg-amber-200 text-amber-900'
                          }`}
                        >
                          {isCompleted ? (
                            <>
                              <CheckCircle2 size={12} /> Concluído (100%)
                            </>
                          ) : (
                            <>
                              <AlertTriangle size={12} /> Pendente (Sem Foto)
                            </>
                          )}
                        </span>
                      </div>

                      <p className="text-xs text-gray-600 font-medium flex items-center gap-2 flex-wrap">
                        <span>📅 {new Date(ev.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        {ev.locationAddress && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-gray-700 font-semibold">
                              <MapPin size={12} className="text-rose-500" /> {ev.locationAddress}
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span>🖼️ {photoCount} foto(s)</span>
                      </p>

                      {isCompleted && (
                        <div className="flex gap-2 pt-2">
                          {(ev.photos || []).slice(0, 4).map((p, pIdx) => (
                            <img
                              key={pIdx}
                              src={p.photoUrl}
                              alt="Foto do evento"
                              className="w-12 h-12 object-cover rounded-xl border shadow-sm"
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {!isCompleted ? (
                      <button
                        type="button"
                        onClick={() => handleOpenAddPhoto(ev)}
                        className="px-5 py-2.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-95 shrink-0"
                      >
                        <Camera size={16} /> Adicionar Foto
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenAddPhoto(ev)}
                        className="px-4 py-2 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-extrabold text-xs flex items-center justify-center gap-1.5 transition shrink-0"
                      >
                        <Camera size={14} /> Mais Fotos
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CREATE EVENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-bento-lg p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-extrabold text-gray-900">Cadastrar Novo Evento</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome do Evento *</label>
                <input
                  type="text"
                  required
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="Ex: Recital de Primavera, Desfile Cívico"
                  className="w-full p-3 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Data e Horário *</label>
                <input
                  type="datetime-local"
                  required
                  value={eventDateTime}
                  onChange={(e) => setEventDateTime(e.target.value)}
                  className="w-full p-3 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Endereço do Local (Opcional)</label>
                <input
                  type="text"
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  placeholder="Ex: Av. Paulista, 1500 - Teatro Municipal"
                  className="w-full p-3 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 rounded-full text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-full text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md"
                >
                  {loading ? 'Salvando...' : 'Salvar Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Image Capture Modal */}
      <ImageCaptureModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onCapture={handlePhotoCaptured}
        title={`Adicionar Foto: ${pendingEventForPhoto?.name || 'Evento'}`}
      />
    </div>
  );
};
