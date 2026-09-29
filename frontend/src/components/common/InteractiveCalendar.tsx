import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, CheckCircle2, AlertTriangle, Camera } from 'lucide-react';
import { BottomSheet } from './BottomSheet';

export interface EventItem {
  id?: string;
  name: string;
  date: string;
  locationAddress?: string | null;
  googleCalendarEventId?: string | null;
  schoolId?: string;
  school?: { id?: string; name: string };
  photos?: { id?: string; photoUrl: string }[];
  photoUrls?: string[];
}

interface InteractiveCalendarProps {
  events: EventItem[];
  onAddPhoto?: (event: EventItem) => void;
}

export const InteractiveCalendar: React.FC<InteractiveCalendarProps> = ({ events, onAddPhoto }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of current month and total days
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const prevMonth = () => { setSelectedDay(null); setCurrentDate(new Date(year, month - 1, 1)); };
  const nextMonth = () => { setSelectedDay(null); setCurrentDate(new Date(year, month + 1, 1)); };
  const todayReset = () => setCurrentDate(new Date());

  // Filter events by day
  const getEventsForDay = (dayNumber: number) => {
    return events.filter((ev) => {
      const evDate = new Date(ev.date);
      return (
        evDate.getFullYear() === year &&
        evDate.getMonth() === month &&
        evDate.getDate() === dayNumber
      );
    });
  };

  const isToday = (dayNumber: number) => {
    const now = new Date();
    return now.getFullYear() === year && now.getMonth() === month && now.getDate() === dayNumber;
  };

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-4 sm:p-6 space-y-4">
      {/* Calendar Header / Month Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-2xl font-bold">
            <CalendarIcon size={20} />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">
              {monthNames[month]} {year}
            </h3>
            <p className="text-xs text-gray-500 font-medium">Toque em um dia com evento</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={todayReset}
            className="min-h-[44px] px-4 rounded-full text-sm font-extrabold bg-gray-100 text-gray-700 active:bg-gray-200 transition"
          >
            Hoje
          </button>
          <div className="flex items-center bg-gray-100 rounded-full p-1 border">
            <button
              type="button"
              onClick={prevMonth}
              className="h-11 w-11 flex items-center justify-center active:bg-white rounded-full transition text-gray-700"
              aria-label="Mês anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="h-11 w-11 flex items-center justify-center active:bg-white rounded-full transition text-gray-700"
              aria-label="Próximo mês"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Weekday Labels Header */}
      <div className="grid grid-cols-7 gap-1 text-center font-extrabold text-xs text-gray-500 py-1">
        {weekDays.map((d, i) => (
          <div key={i} className="py-1 uppercase tracking-wider">{d}</div>
        ))}
      </div>

      {/* Month Days Grid */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {/* Empty cells before 1st day */}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[52px] sm:min-h-[90px] bg-gray-50/50 rounded-xl border border-dashed border-gray-100" />
        ))}

        {/* Days of the month */}
        {Array.from({ length: daysInMonth }).map((_, dayIdx) => {
          const dayNumber = dayIdx + 1;
          const dayEvents = getEventsForDay(dayNumber);
          const currentIsToday = isToday(dayNumber);

          return (
            <button
              type="button"
              key={dayNumber}
              onClick={() => setSelectedDay(dayEvents.length > 0 ? (selectedDay === dayNumber ? null : dayNumber) : null)}
              aria-label={`Dia ${dayNumber}${dayEvents.length ? `, ${dayEvents.length} evento(s)` : ''}`}
              className={`text-left min-h-[52px] sm:min-h-[95px] p-1 sm:p-2 rounded-xl sm:rounded-2xl border flex flex-col items-center sm:items-stretch justify-between transition-all ${
                selectedDay === dayNumber
                  ? 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-500'
                  : currentIsToday
                  ? 'bg-indigo-50/60 border-indigo-300 ring-2 ring-indigo-400'
                  : dayEvents.length > 0
                  ? 'bg-white border-gray-300'
                  : 'bg-white border-gray-200'
              }`}
            >
              <span
                className={`text-xs font-extrabold px-1.5 py-0.5 rounded-full ${
                  currentIsToday ? 'bg-indigo-600 text-white' : 'text-gray-700'
                }`}
              >
                {dayNumber}
              </span>

              {/* Celular: bolinhas */}
              <span className="flex gap-0.5 mb-1 sm:hidden">
                {dayEvents.slice(0, 3).map((ev, idx) => {
                  const done = (ev.photos?.length || 0) + (ev.photoUrls?.length || 0) > 0;
                  return <span key={idx} className={`h-2 w-2 rounded-full ${done ? 'bg-emerald-500' : 'bg-amber-500'}`} />;
                })}
              </span>

              {/* Desktop: etiquetas */}
              <span className="hidden sm:block space-y-1 mt-1 w-full">
                {dayEvents.slice(0, 2).map((ev, idx) => {
                  const done = (ev.photos?.length || 0) + (ev.photoUrls?.length || 0) > 0;
                  return (
                    <span
                      key={ev.id || idx}
                      className={`w-full p-1 rounded-xl text-[10px] font-bold leading-tight truncate flex items-center gap-1 border ${
                        done ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}
                    >
                      {done ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                      <span className="truncate">{ev.name}</span>
                    </span>
                  );
                })}
              </span>
            </button>
          );
        })}
      </div>

      {/* Eventos do dia selecionado */}
      {selectedDay !== null && (
        <div className="space-y-2">
          <h4 className="text-sm font-extrabold text-gray-800">
            {selectedDay} de {monthNames[month]}
          </h4>
          {getEventsForDay(selectedDay).map((ev, idx) => {
            const done = (ev.photos?.length || 0) + (ev.photoUrls?.length || 0) > 0;
            return (
              <button
                key={ev.id || idx}
                type="button"
                onClick={() => setSelectedEvent(ev)}
                className={`w-full min-h-[56px] px-4 rounded-2xl border text-left flex items-center justify-between gap-2 font-bold text-sm ${
                  done ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-amber-50 border-amber-300 text-amber-950'
                }`}
              >
                <span className="truncate">{ev.name}</span>
                <span className="text-xs font-extrabold shrink-0">{done ? '✓ Com foto' : 'Sem foto'}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Detalhes do evento */}
      <BottomSheet
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.name || 'Evento'}
        footer={
          <button
            type="button"
            onClick={() => setSelectedEvent(null)}
            className="w-full min-h-[52px] rounded-full text-sm font-extrabold bg-gray-100 text-gray-800 active:bg-gray-200"
          >
            Fechar
          </button>
        }
      >
        {selectedEvent && (
          <div className="space-y-3 text-sm text-gray-700 font-medium">
            <p className="flex items-start gap-2">
              <CalendarIcon size={16} className="text-indigo-600 mt-0.5 shrink-0" />
              <span>
                {new Date(selectedEvent.date).toLocaleDateString('pt-BR', {
                  weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </p>
            {selectedEvent.locationAddress && (
              <p className="flex items-start gap-2">
                <MapPin size={16} className="text-rose-500 mt-0.5 shrink-0" />
                <span>{selectedEvent.locationAddress}</span>
              </p>
            )}
            {selectedEvent.school?.name && (
              <p className="flex items-center gap-2">
                <span className="font-bold text-gray-900">Escola:</span>
                <span className="bg-gray-100 px-2.5 py-0.5 rounded-full font-bold text-xs">{selectedEvent.school.name}</span>
              </p>
            )}

            {(selectedEvent.photos?.length || 0) + (selectedEvent.photoUrls?.length || 0) > 0 ? (
              <div className="space-y-2">
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 size={15} /> Foto anexada
                </span>
                <div className="flex gap-2 flex-wrap">
                  {(selectedEvent.photos || []).map((p, idx) => (
                    <img key={idx} src={p.photoUrl} alt="Foto do evento" className="w-20 h-20 object-cover rounded-xl border shadow-sm" />
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                  <AlertTriangle size={15} /> Evento sem foto
                </span>
                {onAddPhoto && (
                  <button
                    type="button"
                    onClick={() => {
                      const ev = selectedEvent;
                      setSelectedEvent(null);
                      onAddPhoto(ev);
                    }}
                    className="w-full min-h-[52px] rounded-full bg-amber-600 active:bg-amber-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md"
                  >
                    <Camera size={18} /> Tirar foto agora
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
};
