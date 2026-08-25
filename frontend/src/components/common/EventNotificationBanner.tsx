import React, { useState, useEffect } from 'react';
import { Bell, Calendar, MapPin, X, ChevronRight } from 'lucide-react';
import { api, isOnline } from '../../lib/api';

interface EventItem {
  id?: string;
  name: string;
  date: string;
  locationAddress?: string;
  school?: { name: string };
  schoolId?: string;
}

export const EventNotificationBanner: React.FC<{ activeSchoolId?: string }> = ({ activeSchoolId }) => {
  const [upcomingEvent, setUpcomingEvent] = useState<EventItem | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetchUpcomingEvent();
  }, [activeSchoolId]);

  const fetchUpcomingEvent = async () => {
    try {
      if (!isOnline()) return;

      let events: EventItem[] = [];
      if (activeSchoolId) {
        const res = await api.get(`/sessions/school/${activeSchoolId}`);
        if (res.data && Array.isArray(res.data.eventSessions)) {
          events = res.data.eventSessions;
        }
      } else {
        const res = await api.get('/sessions/events/all');
        if (Array.isArray(res.data)) {
          events = res.data;
        }
      }

      // Filter strictly future events (event date >= start of current date)
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      const futureEvents = events
        .map((e) => ({ ...e, parsedDate: new Date(e.date) }))
        .filter((e) => !isNaN(e.parsedDate.getTime()) && e.parsedDate.getTime() >= startOfToday)
        .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

      if (futureEvents.length > 0) {
        setUpcomingEvent(futureEvents[0]);
      } else {
        setUpcomingEvent(null);
      }
    } catch (err) {
      console.error('Error fetching upcoming event for banner:', err);
    }
  };

  if (dismissed || !upcomingEvent) return null;

  const eventDateObj = new Date(upcomingEvent.date);
  const formattedDate = eventDateObj.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
  const formattedTime = eventDateObj.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white shadow-lg border-b border-white/10 sticky top-[65px] z-30 animate-fadeIn">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="p-2 bg-amber-400/20 text-amber-300 rounded-full animate-bounce shrink-0">
            <Bell size={18} />
          </div>
          <div className="text-xs truncate">
            <span className="font-extrabold text-amber-300 mr-2 uppercase tracking-wide">
              Aviso de Evento Iminente:
            </span>
            <span className="font-bold">{upcomingEvent.name}</span>
            <span className="opacity-75 mx-1 font-normal">•</span>
            <span className="text-indigo-200 font-medium">
              📅 {formattedDate} às {formattedTime}
            </span>
            {upcomingEvent.locationAddress && (
              <>
                <span className="opacity-75 mx-1 font-normal">•</span>
                <span className="text-indigo-200 font-medium truncate inline-flex items-center gap-0.5">
                  <MapPin size={12} className="inline" /> {upcomingEvent.locationAddress}
                </span>
              </>
            )}
            {upcomingEvent.school?.name && (
              <>
                <span className="opacity-75 mx-1 font-normal">•</span>
                <span className="bg-white/15 px-2 py-0.5 rounded-full font-bold text-[10px]">
                  {upcomingEvent.school.name}
                </span>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition shrink-0"
          title="Fechar aviso"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
