// Funções puras que transformam os dados do sistema (chamadas, alunos, eventos)
// nos números e tabelas exibidos no Relatório Mensal.

export interface ReportSession {
  id: string;
  date: string;
  category?: string;
  type?: string;
  countPresent?: number;
  countAbsent?: number;
  attendanceRecords?: { studentId: string; isPresent: boolean; justification?: string | null }[];
}

export interface ReportStudent {
  id: string;
  name: string;
  age: number;
  gender: string; // 'M' | 'F'
  status?: string; // 'ACTIVE' | 'DROPOUT'
}

export type Mark = 'P' | 'F' | '-';

export interface StudentAttendanceRow {
  student: ReportStudent;
  marks: Mark[]; // uma marca por sessão (na mesma ordem de `sessions`)
  present: number;
  absent: number;
  rate: number | null; // 0-100, null se o aluno não teve nenhuma chamada
}

export interface AttendanceSummary {
  sessions: ReportSession[]; // ordenadas da mais antiga para a mais recente
  rows: StudentAttendanceRow[];
  totalStudents: number;
  boys: number;
  girls: number;
  totalPresences: number;
  totalAbsences: number;
  averageRate: number | null;
  perSession: {
    session: ReportSession;
    present: number;
    absent: number;
    rate: number | null;
  }[];
  audience: { children: number; teens: number; others: number };
}

/** "08_2026" -> { month: 8, year: 2026 } */
export function parseMonthYear(monthYear: string): { month: number; year: number } {
  const [m, y] = monthYear.split('_').map((n) => parseInt(n, 10));
  return { month: m, year: y };
}

export function toMonthYear(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, '0')}_${date.getFullYear()}`;
}

export function isInMonth(dateInput: any, monthYear: string): boolean {
  if (!dateInput) return false;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return false;
  const { month, year } = parseMonthYear(monthYear);
  return d.getMonth() + 1 === month && d.getFullYear() === year;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function monthLabel(monthYear: string): string {
  const { month, year } = parseMonthYear(monthYear);
  return `${MONTH_NAMES[month - 1] ?? monthYear} de ${year}`;
}

/** Faixa etária (ECA): criança < 12, adolescente 12–17, demais = outros. */
export function ageGroup(age: number): 'children' | 'teens' | 'others' {
  if (age < 12) return 'children';
  if (age < 18) return 'teens';
  return 'others';
}

export function buildAttendanceSummary(
  allSessions: ReportSession[],
  students: ReportStudent[],
  monthYear: string
): AttendanceSummary {
  const sessions = allSessions
    .filter((s) => isInMonth(s.date, monthYear))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // índice studentId -> sessionId -> presença
  const index = new Map<string, Map<string, boolean>>();
  sessions.forEach((s) => {
    (s.attendanceRecords || []).forEach((r) => {
      if (!index.has(r.studentId)) index.set(r.studentId, new Map());
      index.get(r.studentId)!.set(s.id, r.isPresent);
    });
  });

  // Alunos atendidos no mês: ativos + evadidos que tiveram chamada no mês
  const relevant = students.filter(
    (s) => s.status !== 'DROPOUT' || (index.get(s.id)?.size ?? 0) > 0
  );

  const rows: StudentAttendanceRow[] = relevant
    .map((student) => {
      const byId = index.get(student.id);
      const marks: Mark[] = sessions.map((s) => {
        const v = byId?.get(s.id);
        return v === undefined ? '-' : v ? 'P' : 'F';
      });
      const present = marks.filter((m) => m === 'P').length;
      const absent = marks.filter((m) => m === 'F').length;
      const total = present + absent;
      return {
        student,
        marks,
        present,
        absent,
        rate: total === 0 ? null : Math.round((present / total) * 100),
      };
    })
    .sort((a, b) => a.student.name.localeCompare(b.student.name, 'pt-BR'));

  const totalPresences = rows.reduce((n, r) => n + r.present, 0);
  const totalAbsences = rows.reduce((n, r) => n + r.absent, 0);

  const perSession = sessions.map((session, i) => {
    const present = rows.filter((r) => r.marks[i] === 'P').length;
    const absent = rows.filter((r) => r.marks[i] === 'F').length;
    const total = present + absent;
    return { session, present, absent, rate: total === 0 ? null : Math.round((present / total) * 100) };
  });

  const audience = { children: 0, teens: 0, others: 0 };
  rows.forEach((r) => {
    audience[ageGroup(r.student.age)]++;
  });

  return {
    sessions,
    rows,
    totalStudents: rows.length,
    boys: rows.filter((r) => r.student.gender === 'M').length,
    girls: rows.filter((r) => r.student.gender === 'F').length,
    totalPresences,
    totalAbsences,
    averageRate:
      totalPresences + totalAbsences === 0
        ? null
        : Math.round((totalPresences / (totalPresences + totalAbsences)) * 100),
    perSession,
    audience,
  };
}

/** Divide uma lista em `cols` blocos consecutivos de tamanho parecido (para tabelas lado a lado). */
export function splitInColumns<T>(items: T[], cols: number): T[][] {
  if (cols <= 1) return [items];
  const size = Math.ceil(items.length / cols) || 1;
  return Array.from({ length: cols }, (_, i) => items.slice(i * size, (i + 1) * size));
}
