import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Camera, Plus, CheckCircle2, AlertTriangle, List, MapPin } from 'lucide-react';
import { compressPhoto } from '../../lib/imageUtils';
import { api, isOnline } from '../../lib/api';
import { db } from '../../lib/db';
import { ImageCaptureModal } from '../common/ImageCaptureModal';
import { InteractiveCalendar, EventItem } from '../common/InteractiveCalendar';
import { BottomSheet } from '../common/BottomSheet';

interface FolderEventsProps {
  schoolId: string;
}

export const FolderEvents: React.FC<FolderEventsProps> = ({ schoolId }) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('LIST');

  // Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [loading, setLoading] = useState(false);

  // Photo addition modal for pending events
  const [pendingEventForPhoto, setPendingEventForPhoto] = useState<EventItem | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);

  useEffect(() => {
    const now = new Date();
    setEventDate(now.toISOString().slice(0, 10));
    setEventTime(now.toTimeString().slice(0, 5));

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
    if (!eventName.trim() || !eventDate || !eventTime) return;

    setLoading(true);
    try {
      const combinedDateTime = `${eventDate}T${eventTime}`;
      const payload = {
        name: eventName,
        date: new Date(combinedDateTime).toISOString(),
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
          date: combinedDateTime,
          photoUrls: [],
          synced: false,
          timestamp: Date.now(),
        });
        const created: EventItem = {
          id: String(id),
          name: eventName,
          date: combinedDateTime,
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

  const inputCls = 'w-full h-14 px-4 rounded-2xl border-2 text-base font-medium focus:border-indigo-500 focus:outline-none bg-white';

  return (
    <div className="p-4 sm:p-6 bg-white rounded-b-bento-lg space-y-5">
      {/* Cadastrar + alternar visão */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="w-full min-h-[60px] rounded-3xl bg-indigo-600 active:bg-indigo-700 text-white text-base font-extrabold flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition"
        >
          <Plus size={22} /> Cadastrar evento
        </button>

        <div className="grid grid-cols-2 bg-gray-100 p-1.5 rounded-full">
          {(
            [
              ['LIST', 'Lista', <List key="l" size={17} />],
              ['CALENDAR', 'Calendário', <CalendarIcon key="c" size={17} />],
            ] as const
          ).map(([key, label, icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setViewMode(key)}
              className={`min-h-[48px] rounded-full text-sm font-extrabold flex items-center justify-center gap-1.5 transition ${
                viewMode === key ? 'bg-indigo-600 text-white shadow' : 'text-gray-600'
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'CALENDAR' ? (
        <InteractiveCalendar events={events} onAddPhoto={handleOpenAddPhoto} />
      ) : (
        <div className="space-y-3">
          <h4 className="font-extrabold text-base text-gray-900">Eventos da escola ({events.length})</h4>

          {events.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed text-gray-400 space-y-2">
              <CalendarIcon size={36} className="mx-auto text-gray-300" />
              <p className="text-sm font-bold text-gray-600">Nenhum evento ainda.</p>
              <p className="text-xs text-gray-400">Toque em &quot;Cadastrar evento&quot; para começar.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((ev, idx) => {
                const photoCount = (ev.photos ? ev.photos.length : 0) + (ev.photoUrls ? ev.photoUrls.length : 0);
                const isCompleted = photoCount > 0;

                return (
                  <div
                    key={ev.id || idx}
                    className={`p-4 rounded-2xl border shadow-sm space-y-3 ${
                      isCompleted ? 'bg-emerald-50/70 border-emerald-300' : 'bg-amber-50/80 border-amber-300'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="font-extrabold text-base text-gray-900 leading-tight">{ev.name}</h5>
                        <span
                          className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 ${
                            isCompleted ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                          }`}
                        >
                          {isCompleted ? (
                            <>
                              <CheckCircle2 size={12} /> Com foto
                            </>
                          ) : (
                            <>
                              <AlertTriangle size={12} /> Sem foto
                            </>
                          )}
                        </span>
                      </div>

                      <p className="text-sm text-gray-700 font-medium">
                        📅{' '}
                        {new Date(ev.date).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {' · '}🖼️ {photoCount} {photoCount === 1 ? 'foto' : 'fotos'}
                      </p>
                      {ev.locationAddress && (
                        <p className="text-sm text-gray-700 font-semibold flex items-start gap-1.5">
                          <MapPin size={15} className="text-rose-500 mt-0.5 shrink-0" /> {ev.locationAddress}
                        </p>
                      )}
                    </div>

                    {isCompleted && (
                      <div className="flex gap-2 overflow-x-auto">
                        {(ev.photos || []).slice(0, 6).map((p, pIdx) => (
                          <img
                            key={pIdx}
                            src={p.photoUrl}
                            alt="Foto do evento"
                            className="w-16 h-16 object-cover rounded-xl border shadow-sm shrink-0"
                          />
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenAddPhoto(ev)}
                      className={`w-full min-h-[52px] rounded-full font-extrabold text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] ${
                        isCompleted ? 'bg-emerald-100 text-emerald-900 active:bg-emerald-200' : 'bg-amber-600 text-white shadow-md active:bg-amber-700'
                      }`}
                    >
                      <Camera size={19} /> {isCompleted ? 'Tirar mais fotos' : 'Tirar foto do evento'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CADASTRAR EVENTO */}
      <BottomSheet
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Novo evento"
        footer={
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="min-h-[52px] rounded-full text-sm font-extrabold text-gray-800 bg-gray-100 active:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-novo-evento"
              disabled={loading || !eventName.trim()}
              className="min-h-[52px] rounded-full text-sm font-extrabold text-white bg-indigo-600 disabled:bg-gray-300 active:bg-indigo-700"
            >
              {loading ? 'Salvando…' : 'Salvar evento'}
            </button>
          </div>
        }
      >
        <form id="form-novo-evento" onSubmit={handleCreateEvent} className="space-y-4">
          <div>
            <label htmlFor="ev-nome" className="block text-xs font-extrabold text-gray-700 mb-1.5">Nome do evento *</label>
            <input
              id="ev-nome"
              type="text"
              required
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Ex.: Desfile Cívico, Recital"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ev-data" className="block text-xs font-extrabold text-gray-700 mb-1.5">Data *</label>
              <input id="ev-data" type="date" required value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={`${inputCls} px-3`} />
            </div>
            <div>
              <label htmlFor="ev-hora" className="block text-xs font-extrabold text-gray-700 mb-1.5">Horário *</label>
              <input id="ev-hora" type="time" required value={eventTime} onChange={(e) => setEventTime(e.target.value)} className={`${inputCls} px-3`} />
            </div>
          </div>

          <div>
            <label htmlFor="ev-local" className="block text-xs font-extrabold text-gray-700 mb-1.5">Local (opcional)</label>
            <input
              id="ev-local"
              type="text"
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
              placeholder="Ex.: Praça central, Teatro Municipal"
              className={inputCls}
            />
          </div>
        </form>
      </BottomSheet>

      {/* Câmera (somente câmera, sem galeria) */}
      <ImageCaptureModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onCapture={handlePhotoCaptured}
        title={`Foto: ${pendingEventForPhoto?.name || 'Evento'}`}
        multiple
      />
    </div>
  );
};
