import { FIXED_LOGOS } from './sccsSpec.js';
import { MonthStats, monthTitle } from './statsService.js';

/** Spec do PDF oficial (skill sccs-relatorio) para os relatórios gerais da rede: mensal e anual. Função pura. */

const chunk = <T,>(a: T[], n: number): T[][] => {
  const o: T[][] = [];
  for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n));
  return o;
};
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const monthName = (ym: string) => MONTHS[Number(ym.split('-')[1]) - 1];

const capa = (titulo: string, sub: string) => ({
  kicker: 'Relatório geral da rede',
  titulo,
  subtitulo: sub,
  esquerda: [['Representante legal', 'Fábio Paulo Matias']],
  direita: [['Contato', ['sccruzeirodosul.org', 'contato@sccruzeirodosul.org', '@cruzeirodosul.cric']]],
});

export function buildMonthlyNetworkSpec(s: MonthStats): any {
  const t = s.totals;
  const paginas: any[] = [
    {
      tipo: 'resumo',
      kicker: `${monthTitle(s.monthYear)} · toda a rede`,
      titulo: 'Relatório geral do mês',
      sub: 'Atendimento consolidado de todas as escolas',
      blocos: [
        { secao: { n: 1, titulo: 'Público beneficiário' } },
        {
          cards: [
            [String(t.studentsAttended), 'alunos atendidos', false],
            [String(t.boys), 'meninos', false],
            [String(t.girls), 'meninas', false],
            [String(t.sessions), 'chamadas realizadas', false],
            [String(t.presences), 'presenças', false],
            [`${t.attendanceRate}%`, 'frequência média', false],
          ],
        },
        {
          tabela: {
            titulo: 'Alunos por faixa etária',
            linhas: [
              ['Crianças', 'até 11 anos', t.ageGroups.children],
              ['Adolescentes', '12 a 17 anos', t.ageGroups.teens],
              ['Outros', '18 anos ou mais', t.ageGroups.others],
            ],
          },
        },
        { barras: [...s.schools].sort((a, b) => b.studentsAttended - a.studentsAttended).map((r) => [r.schoolName, r.studentsAttended]) },
      ],
    },
  ];

  chunk(s.schools, 8).forEach((group, gi) => {
    paginas.push({
      tipo: 'resumo',
      kicker: '2. Escolas',
      titulo: gi === 0 ? 'Desempenho por escola' : 'Desempenho por escola (continuação)',
      sub: 'Alunos, chamadas e frequência no mês',
      blocos: [
        {
          tabela: {
            titulo: 'Escola · alunos (meninos/meninas) · chamadas · frequência',
            linhas: group.map((r) => [
              r.schoolName,
              `${r.studentsAttended} (${r.boys}M / ${r.girls}F) · ${r.sessions} chamadas`,
              `${r.presences} pres. · ${r.absences} falt. · ${r.sessions ? r.attendanceRate + '%' : '—'}`,
            ]),
          },
        },
      ],
    });
  });

  paginas.push({
    tipo: 'resumo',
    kicker: '3. Atividades',
    titulo: 'Eventos, registros e desistências',
    blocos: [
      {
        cards: [
          [String(t.events), 'eventos', false],
          [String(t.rehearsalPhotos), 'fotos de ensaio', false],
          [String(t.eventPhotos), 'fotos de eventos', false],
          [String(t.dropoutsInMonth), 'desistências no mês', t.dropoutsInMonth > 0],
        ],
      },
    ],
  });

  return { logos: FIXED_LOGOS, capa: capa('Toda a rede de escolas', `Mês de referência: ${monthTitle(s.monthYear)}`), paginas };
}

export function buildAnnualNetworkSpec(a: any): any {
  const t = a.totals;
  const paginas: any[] = [
    {
      tipo: 'resumo',
      kicker: `Ano ${a.year} · toda a rede`,
      titulo: 'Relatório anual consolidado',
      sub: `${a.monthsWithData} mês(es) com chamadas registradas`,
      blocos: [
        { secao: { n: 1, titulo: 'Público beneficiário no ano' } },
        {
          cards: [
            [String(t.studentsAttended), 'alunos atendidos (únicos)', false],
            [String(t.boys), 'meninos', false],
            [String(t.girls), 'meninas', false],
            [String(t.sessions), 'chamadas realizadas', false],
            [String(t.presences), 'presenças', false],
            [`${t.attendanceRate}%`, 'frequência média', false],
          ],
        },
        {
          tabela: {
            titulo: 'Alunos por faixa etária',
            linhas: [
              ['Crianças', 'até 11 anos', t.ageGroups.children],
              ['Adolescentes', '12 a 17 anos', t.ageGroups.teens],
              ['Outros', '18 anos ou mais', t.ageGroups.others],
            ],
          },
        },
        { destaque: `${t.events} eventos · ${t.rehearsalPhotos + t.eventPhotos} fotos registradas · ${t.dropouts} desistência(s) no ano.` },
      ],
    },
    {
      tipo: 'resumo',
      kicker: '2. Evolução',
      titulo: 'Mês a mês',
      sub: 'Alunos atendidos e frequência em cada mês',
      blocos: [
        { barras: a.months.filter((m: any) => m.sessions > 0).map((m: any) => [monthName(m.monthYear), m.studentsAttended]) },
        {
          tabela: {
            titulo: 'Resumo mensal',
            linhas: a.months
              .filter((m: any) => m.sessions > 0)
              .map((m: any) => [monthName(m.monthYear), `${m.studentsAttended} alunos (${m.boys}M / ${m.girls}F) · ${m.sessions} chamadas`, `${m.presences} pres. · ${m.absences} falt. · ${m.attendanceRate}%`]),
          },
        },
      ],
    },
  ];

  chunk(a.schools as any[], 8).forEach((group, gi) => {
    paginas.push({
      tipo: 'resumo',
      kicker: '3. Escolas',
      titulo: gi === 0 ? 'Desempenho por escola' : 'Desempenho por escola (continuação)',
      sub: 'Total do ano',
      blocos: [
        {
          tabela: {
            titulo: 'Escola · alunos únicos · chamadas · frequência',
            linhas: group.map((r) => [
              r.schoolName,
              `${r.studentsAttended} (${r.boys}M / ${r.girls}F) · ${r.sessions} chamadas`,
              `${r.presences} pres. · ${r.absences} falt. · ${r.sessions ? r.attendanceRate + '%' : '—'}`,
            ]),
          },
        },
      ],
    });
  });

  return { logos: FIXED_LOGOS, capa: capa('Toda a rede de escolas', `Ano de referência: ${a.year}`), paginas };
}
