import { prisma } from '../prismaClient.js';

/** Estatísticas consolidadas de um mês (todas as escolas). Fonte: banco de dados. */

export interface SchoolMonthStats {
  schoolId: string;
  schoolName: string;
  boardName: string | null;
  activeStudents: number;
  dropoutsInMonth: number;
  sessions: number;
  sessionsByCategory: Record<string, number>;
  presences: number;
  absences: number;
  attendanceRate: number; // 0-100
  studentsAttended: number;
  boys: number;
  girls: number;
  ageGroups: { children: number; teens: number; others: number };
  events: number;
  eventPhotos: number;
  rehearsalPhotos: number;
  reportStatus: string | null;
  /** Alunos que estiveram presentes (para consolidar o ano sem perder detalhe). */
  attended: { id: string; g: string; a: number }[];
}

export interface MonthStats {
  monthYear: string; // AAAA-MM
  generatedAt: string;
  totals: {
    schools: number;
    sessions: number;
    presences: number;
    absences: number;
    attendanceRate: number;
    studentsAttended: number;
    boys: number;
    girls: number;
    ageGroups: { children: number; teens: number; others: number };
    events: number;
    eventPhotos: number;
    rehearsalPhotos: number;
    dropoutsInMonth: number;
  };
  schools: SchoolMonthStats[];
}

const pct = (p: number, a: number) => (p + a === 0 ? 0 : Math.round((p / (p + a)) * 1000) / 10);
const ageGroupOf = (age: number) => (age < 12 ? 'children' : age < 18 ? 'teens' : 'others');

/** Limites do mês no fuso de Brasília (UTC-3, sem horário de verão). */
export function monthRange(monthYear: string): { start: Date; end: Date } {
  const [y, m] = monthYear.split('-').map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1, 3)), end: new Date(Date.UTC(y, m, 1, 3)) };
}

export const currentMonthYear = (now = new Date()) => {
  const br = new Date(now.getTime() - 3 * 3600 * 1000);
  return `${br.getUTCFullYear()}-${String(br.getUTCMonth() + 1).padStart(2, '0')}`;
};

export async function buildMonthStats(monthYear: string): Promise<MonthStats> {
  const { start, end } = monthRange(monthYear);
  const [y, m] = monthYear.split('-');

  const schools = await prisma.school.findMany({
    orderBy: { name: 'asc' },
    include: {
      students: { select: { status: true, dropoutDate: true } },
      attendanceSessions: {
        where: { date: { gte: start, lt: end } },
        include: { attendanceRecords: { include: { student: { select: { id: true, gender: true, age: true } } } } },
      },
      eventSessions: { where: { date: { gte: start, lt: end } }, include: { photos: { select: { id: true } } } },
      rehearsalPhotos: { where: { date: { gte: start, lt: end } }, select: { id: true } },
      monthlyReports: { where: { monthYear: `${m}_${y}` }, select: { status: true } },
    },
  });

  const rows: SchoolMonthStats[] = schools.map((s) => {
    let presences = 0;
    let absences = 0;
    const byCategory: Record<string, number> = {};
    const attendedMap = new Map<string, { id: string; g: string; a: number }>();

    for (const session of s.attendanceSessions) {
      byCategory[session.category] = (byCategory[session.category] || 0) + 1;
      if (session.attendanceRecords.length > 0) {
        for (const r of session.attendanceRecords) {
          if (r.isPresent) {
            presences++;
            attendedMap.set(r.student.id, { id: r.student.id, g: r.student.gender, a: r.student.age });
          } else absences++;
        }
      } else {
        presences += session.countPresent;
        absences += session.countAbsent;
      }
    }

    const attended = Array.from(attendedMap.values());
    const ageGroups = { children: 0, teens: 0, others: 0 };
    attended.forEach((a) => ageGroups[ageGroupOf(a.a)]++);

    return {
      schoolId: s.id,
      schoolName: s.name,
      boardName: s.boardName,
      activeStudents: s.students.filter((st) => st.status === 'ACTIVE').length,
      dropoutsInMonth: s.students.filter((st) => st.status === 'DROPOUT' && st.dropoutDate && st.dropoutDate >= start && st.dropoutDate < end).length,
      sessions: s.attendanceSessions.length,
      sessionsByCategory: byCategory,
      presences,
      absences,
      attendanceRate: pct(presences, absences),
      studentsAttended: attended.length,
      boys: attended.filter((a) => a.g === 'M').length,
      girls: attended.filter((a) => a.g === 'F').length,
      ageGroups,
      events: s.eventSessions.length,
      eventPhotos: s.eventSessions.reduce((n, e) => n + e.photos.length, 0),
      rehearsalPhotos: s.rehearsalPhotos.length,
      reportStatus: s.monthlyReports[0]?.status ?? null,
      attended,
    };
  });

  const sum = (f: (r: SchoolMonthStats) => number) => rows.reduce((n, r) => n + f(r), 0);
  const presences = sum((r) => r.presences);
  const absences = sum((r) => r.absences);

  return {
    monthYear,
    generatedAt: new Date().toISOString(),
    totals: {
      schools: rows.length,
      sessions: sum((r) => r.sessions),
      presences,
      absences,
      attendanceRate: pct(presences, absences),
      studentsAttended: sum((r) => r.studentsAttended),
      boys: sum((r) => r.boys),
      girls: sum((r) => r.girls),
      ageGroups: {
        children: sum((r) => r.ageGroups.children),
        teens: sum((r) => r.ageGroups.teens),
        others: sum((r) => r.ageGroups.others),
      },
      events: sum((r) => r.events),
      eventPhotos: sum((r) => r.eventPhotos),
      rehearsalPhotos: sum((r) => r.rehearsalPhotos),
      dropoutsInMonth: sum((r) => r.dropoutsInMonth),
    },
    schools: rows,
  };
}

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const monthTitle = (ym: string) => `${MONTHS[Number(ym.split('-')[1]) - 1]} de ${ym.split('-')[0]}`;

/** Versão em texto (Markdown) — serve de cópia de segurança legível. */
export function statsToMarkdown(s: MonthStats): string {
  const t = s.totals;
  const line = (r: SchoolMonthStats) =>
    `| ${r.schoolName} | ${r.studentsAttended} | ${r.boys} | ${r.girls} | ${r.sessions} | ${r.presences} | ${r.absences} | ${r.attendanceRate}% | ${r.events} | ${r.dropoutsInMonth} |`;
  const byAttended = [...s.schools].sort((a, b) => b.studentsAttended - a.studentsAttended);
  const byRate = [...s.schools].filter((r) => r.sessions > 0).sort((a, b) => b.attendanceRate - a.attendanceRate);

  return `# Relatório geral — ${monthTitle(s.monthYear)}

_Gerado automaticamente em ${new Date(s.generatedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}._

## Resumo da rede
- Escolas: **${t.schools}**
- Alunos atendidos no mês: **${t.studentsAttended}** (meninos: ${t.boys} · meninas: ${t.girls})
- Faixa etária: crianças (até 11): ${t.ageGroups.children} · adolescentes (12–17): ${t.ageGroups.teens} · 18+: ${t.ageGroups.others}
- Chamadas realizadas: **${t.sessions}**
- Presenças: **${t.presences}** · Faltas: **${t.absences}** · Frequência média: **${t.attendanceRate}%**
- Eventos: ${t.events} · Fotos de ensaio: ${t.rehearsalPhotos} · Fotos de eventos: ${t.eventPhotos}
- Desistências no mês: ${t.dropoutsInMonth}

## Por escola
| Escola | Alunos | Meninos | Meninas | Chamadas | Presenças | Faltas | Frequência | Eventos | Desist. |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
${s.schools.map(line).join('\n')}

## Ranking
**Mais alunos atendidos:** ${byAttended.map((r, i) => `${i + 1}. ${r.schoolName} (${r.studentsAttended})`).join(' · ') || '—'}

**Maior frequência:** ${byRate.map((r, i) => `${i + 1}. ${r.schoolName} (${r.attendanceRate}%)`).join(' · ') || '—'}

## Detalhe por escola
${s.schools
  .map(
    (r) => `### ${r.schoolName}
- Alunos ativos matriculados: ${r.activeStudents} · atendidos no mês: ${r.studentsAttended}
- Meninos: ${r.boys} · Meninas: ${r.girls}
- Faixa etária: crianças ${r.ageGroups.children} · adolescentes ${r.ageGroups.teens} · 18+ ${r.ageGroups.others}
- Chamadas: ${r.sessions} ${Object.keys(r.sessionsByCategory).length ? `(${Object.entries(r.sessionsByCategory).map(([k, v]) => `${k}: ${v}`).join(', ')})` : ''}
- Presenças ${r.presences} · Faltas ${r.absences} · Frequência ${r.attendanceRate}%
- Eventos: ${r.events} · Fotos de ensaio: ${r.rehearsalPhotos} · Fotos de eventos: ${r.eventPhotos}
- Relatório mensal do professor: ${r.reportStatus ?? 'não iniciado'}
`
  )
  .join('\n')}`;
}
