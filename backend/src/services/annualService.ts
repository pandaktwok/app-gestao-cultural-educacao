import { getMonthStats } from './snapshotService.js';
import { MonthStats } from './statsService.js';

const pct = (p: number, a: number) => (p + a === 0 ? 0 : Math.round((p / (p + a)) * 1000) / 10);
const ageGroupOf = (age: number) => (age < 12 ? 'children' : age < 18 ? 'teens' : 'others');

type Att = { id: string; g: string; a: number };

function summarize(attended: Map<string, Att>) {
  const list = Array.from(attended.values());
  const ageGroups = { children: 0, teens: 0, others: 0 };
  list.forEach((a) => ageGroups[ageGroupOf(a.a)]++);
  return {
    studentsAttended: list.length,
    boys: list.filter((a) => a.g === 'M').length,
    girls: list.filter((a) => a.g === 'F').length,
    ageGroups,
  };
}

/** Consolida os 12 meses do ano a partir das cópias mensais (meses fechados) e do mês atual. */
export async function buildAnnual(year: number) {
  const months: MonthStats[] = [];
  for (let m = 1; m <= 12; m++) months.push(await getMonthStats(`${year}-${String(m).padStart(2, '0')}`));

  const schoolMap = new Map<string, any>();
  const allAttended = new Map<string, Att>();

  months.forEach((ms, idx) => {
    ms.schools.forEach((s) => {
      const cur =
        schoolMap.get(s.schoolId) ||
        {
          schoolId: s.schoolId,
          schoolName: s.schoolName,
          boardName: s.boardName,
          sessions: 0,
          presences: 0,
          absences: 0,
          events: 0,
          eventPhotos: 0,
          rehearsalPhotos: 0,
          dropouts: 0,
          activeStudents: 0,
          monthly: Array(12).fill(0),
          attended: new Map<string, Att>(),
        };
      cur.sessions += s.sessions;
      cur.presences += s.presences;
      cur.absences += s.absences;
      cur.events += s.events;
      cur.eventPhotos += s.eventPhotos;
      cur.rehearsalPhotos += s.rehearsalPhotos;
      cur.dropouts += s.dropoutsInMonth;
      cur.activeStudents = s.activeStudents; // último mês conhecido
      cur.monthly[idx] = s.studentsAttended;
      (s.attended || []).forEach((a) => {
        cur.attended.set(a.id, a);
        allAttended.set(a.id, a);
      });
      schoolMap.set(s.schoolId, cur);
    });
  });

  const schools = Array.from(schoolMap.values()).map((s) => {
    const { attended, ...rest } = s;
    return { ...rest, attendanceRate: pct(s.presences, s.absences), ...summarize(attended) };
  });

  const presences = schools.reduce((n, s) => n + s.presences, 0);
  const absences = schools.reduce((n, s) => n + s.absences, 0);

  return {
    year,
    generatedAt: new Date().toISOString(),
    monthsWithData: months.filter((m) => m.totals.sessions > 0).length,
    totals: {
      schools: schools.length,
      sessions: schools.reduce((n, s) => n + s.sessions, 0),
      presences,
      absences,
      attendanceRate: pct(presences, absences),
      events: schools.reduce((n, s) => n + s.events, 0),
      eventPhotos: schools.reduce((n, s) => n + s.eventPhotos, 0),
      rehearsalPhotos: schools.reduce((n, s) => n + s.rehearsalPhotos, 0),
      dropouts: schools.reduce((n, s) => n + s.dropouts, 0),
      ...summarize(allAttended),
    },
    months: months.map((m) => ({
      monthYear: m.monthYear,
      sessions: m.totals.sessions,
      presences: m.totals.presences,
      absences: m.totals.absences,
      attendanceRate: m.totals.attendanceRate,
      studentsAttended: m.totals.studentsAttended,
      boys: m.totals.boys,
      girls: m.totals.girls,
      events: m.totals.events,
    })),
    schools,
  };
}

export function annualToMarkdown(a: Awaited<ReturnType<typeof buildAnnual>>): string {
  const t = a.totals;
  return `# Relatório anual consolidado — ${a.year}

_Gerado em ${new Date(a.generatedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · ${a.monthsWithData} mês(es) com chamadas._

## Resumo do ano
- Alunos atendidos no ano (únicos): **${t.studentsAttended}** (meninos ${t.boys} · meninas ${t.girls})
- Faixa etária: crianças ${t.ageGroups.children} · adolescentes ${t.ageGroups.teens} · 18+ ${t.ageGroups.others}
- Chamadas: ${t.sessions} · Presenças: ${t.presences} · Faltas: ${t.absences} · Frequência: **${t.attendanceRate}%**
- Eventos: ${t.events} · Fotos de ensaio: ${t.rehearsalPhotos} · Fotos de eventos: ${t.eventPhotos} · Desistências: ${t.dropouts}

## Mês a mês
| Mês | Alunos | Meninos | Meninas | Chamadas | Presenças | Faltas | Frequência | Eventos |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
${a.months.map((m) => `| ${m.monthYear} | ${m.studentsAttended} | ${m.boys} | ${m.girls} | ${m.sessions} | ${m.presences} | ${m.absences} | ${m.attendanceRate}% | ${m.events} |`).join('\n')}

## Por escola
| Escola | Alunos únicos | Meninos | Meninas | Chamadas | Presenças | Faltas | Frequência | Eventos | Desist. |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
${a.schools.map((s: any) => `| ${s.schoolName} | ${s.studentsAttended} | ${s.boys} | ${s.girls} | ${s.sessions} | ${s.presences} | ${s.absences} | ${s.attendanceRate}% | ${s.events} | ${s.dropouts} |`).join('\n')}
`;
}
