import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, CheckCircle2, AlertTriangle, Camera, X } from 'lucide-react';

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

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
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
            <p className="text-xs text-gray-500 font-medium">Grade Mensal Interativa de Apresentações</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={todayReset}
            className="px-3 py-1.5 rounded-full text-xs font-extrabold bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
          >
            Hoje
          </button>
          <div className="flex items-center bg-gray-100 rounded-full p-1 border">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 hover:bg-white rounded-full transition text-gray-700"
              title="Mês Anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 hover:bg-white rounded-full transition text-gray-700"
              title="Próximo Mês"
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
          <div key={`empty-${i}`} className="min-h-[70px] sm:min-h-[90px] bg-gray-50/50 rounded-2xl border border-dashed border-gray-100" />
        ))}

        {/* Days of the month */}
        {Array.from({ length: daysInMonth }).map((_, dayIdx) => {
          const dayNumber = dayIdx + 1;
          const dayEvents = getEventsForDay(dayNumber);
          const currentIsToday = isToday(dayNumber);

          return (
            <div
              key={dayNumber}
              className={`min-h-[70px] sm:min-h-[95px] p-1.5 sm:p-2 rounded-2xl border flex flex-col justify-between transition-all ${
                currentIsToday
                  ? 'bg-indigo-50/60 border-indigo-300 ring-2 ring-indigo-400'
                  : dayEvents.length > 0
                  ? 'bg-white border-gray-300 hover:shadow-md'
                  : 'bg-white border-gray-200 hover:bg-gray-50/50'
              }`}
            >
              <div className="flex justify-between items-center">
                <span
                  className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                    currentIsToday ? 'bg-indigo-600 text-white' : 'text-gray-700'
                  }`}
                >
                  {dayNumber}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] font-bold text-gray-400">
                    {dayEvents.length} {dayEvents.length === 1 ? 'evt' : 'evts'}
                  </span>
                )}
              </div>

              {/* Event chips */}
              <div className="space-y-1 mt-1 overflow-y-auto max-h-14">
                {dayEvents.map((ev, idx) => {
                  const photoCount = (ev.photos ? ev.photos.length : 0) + (ev.photoUrls ? ev.photoUrls.length : 0);
                  const isCompleted = photoCount > 0;

                  return (
                    <button
                      key={ev.id || idx}
                      type="button"
                      onClick={() => setSelectedEvent(ev)}
                      className={`w-full text-left p-1 rounded-xl text-[10px] font-bold leading-tight truncate flex items-center gap-1 transition-all ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
                          : 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                      }`}
                      title={ev.name}
                    >
                      <span className="shrink-0">
                        {isCompleted ? <CheckCircle2 size={10} className="text-emerald-700" /> : <AlertTriangle size={10} className="text-amber-700" />}
                      </span>
                      <span className="truncate">{ev.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-bento-lg p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="text-lg font-extrabold text-gray-900 leading-tight">
                {selectedEvent.name}
              </h4>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs text-gray-700 font-medium">
              <p className="flex items-center gap-2">
                <CalendarIcon size={14} className="text-indigo-600" />
                <span>
                  {new Date(selectedEvent.date).toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </p>

              {selectedEvent.locationAddress && (
                <p className="flex items-center gap-2">
                  <MapPin size={14} className="text-rose-500" />
                  <span>{selectedEvent.locationAddress}</span>
                </p>
              )}

              {selectedEvent.school?.name && (
                <p className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">Escola:</span>
                  <span className="bg-gray-100 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                    {selectedEvent.school.name}
                  </span>
                </p>
              )}

              <div className="pt-2">
                {((selectedEvent.photos && selectedEvent.photos.length > 0) || (selectedEvent.photoUrls && selectedEvent.photoUrls.length > 0)) ? (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 size={14} /> Mídia Anexada (Concluído 100%)
                    </span>
                    <div className="flex gap-2">
                      {(selectedEvent.photos || []).map((p, idx) => (
                        <img
                          key={idx}
                          src={p.photoUrl}
                          alt="Foto"
                          className="w-14 h-14 object-cover rounded-xl border shadow-sm"
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                    <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
                      <AlertTriangle size={14} /> Evento Pendente de Foto
                    </span>
                    {onAddPhoto && (
                      <button
                        type="button"
                        onClick={() => {
                          const ev = selectedEvent;
                          setSelectedEvent(null);
                          onAddPhoto(ev);
                        }}
                        className="w-full py-2.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md"
                      >
                        <Camera size={14} /> Adicionar Foto Agora
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedEvent(null)}
              className="w-full py-2.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
