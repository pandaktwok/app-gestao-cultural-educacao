/**
 * Converte os dados do relatório mensal do app no JSON esperado pela skill `sccs-relatorio`
 * (ver sccs-docs/sccs-relatorio/estrutura.md). Função pura: sem acesso a banco, disco ou rede.
 * Datas e horas chegam já formatadas (fuso do navegador do usuário).
 */

export interface SccsLogos {
  projeto: string[];
  apoiadores: string[];
  publicos: string[];
  patrocinadores: string[];
  ordem?: 'edital';
}

/** Logomarcas do documento: padrão fixo, definido pela SCCS. Não é editável por ninguém. */
export const FIXED_LOGOS: SccsLogos = {
  projeto: ['musicos-do-futuro'],
  apoiadores: [],
  publicos: ['prefeitura-criciuma', 'sme-criciuma'],
  patrocinadores: [],
  ordem: 'edital',
};

export interface SccsReportPayload {
  monthLabel: string; // "Agosto de 2026"
  schoolName: string;
  directorName: string;
  instructorName: string;
  locationCityDate: string;
  logos: SccsLogos;
  nominataColumns: 2 | 3;
  texts: {
    activitiesFocus: string;
    impactIndicators: string;
    monitoringEvaluation: string;
    hasDifficulties: boolean;
    difficultiesDetails: string;
    achievedResults: string;
  };
  stats: {
    totalStudents: number;
    boys: number;
    girls: number;
    totalPresences: number;
    totalAbsences: number;
    averageRate: number | null;
    audience: { children: number; teens: number; others: number };
  };
  encounters: { dateShort: string; dateFull: string; category: string; present: number; absent: number; rate: number | null }[];
  students: { name: string; age: number; sex: string; marks: string[]; present: number; absent: number; rate: number | null }[];
  events: { name: string; dateFull: string; publicCount: number }[];
  photos: { url: string; group: string; title: string; when: string }[];
}

const NO_DIFFICULTIES =
  'Não foram observadas dificuldades ou empecilhos de ordem técnica, pedagógica ou operacional no decorrer das atividades do mês.';
const NO_ACTIONS =
  'Tendo em vista que não foram observadas dificuldades ou empecilhos no período, não houve necessidade de aplicação de medidas corretivas.';
const TODO = '[a preencher]';

const ROWS_PER_PAGE = 28; // linhas de tabela que cabem por página, com o cabeçalho
const DATES_PER_BLOCK = 14; // colunas de data por página na chamada
const ENCOUNTERS_PER_PAGE = 12;
const BODY_BUDGET_PT = 520; // altura útil de uma página de texto

const pct = (n: number | null) => (n === null ? '—' : `${n}%`);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Estimativa de altura (pt) de uma seção de texto: título + linhas de ~85 caracteres a 19 pt. */
function sectionHeight(text: string): number {
  return 52 + 19 * Math.max(1, Math.ceil(text.length / 85));
}

export function buildSccsSpec(p: SccsReportPayload, photoFiles: (string | null)[]): any {
  const school = p.schoolName;
  const paginas: any[] = [];

  // ---------- 1 e 2: resumo ----------
  const focus = p.texts.activitiesFocus.trim().replace(/\.$/, '');
  const s = p.stats;
  paginas.push({
    tipo: 'resumo',
    kicker: `${p.monthLabel} · ${school}`,
    titulo: 'Relatório de execução das atividades',
    sub: 'Ensaios, público e resultados do período',
    blocos: [
      {
        secao: {
          n: 1,
          titulo: 'Descrição das atividades planejadas/executadas',
          texto: focus ? `Ensaios com foco em ${focus}.` : TODO,
        },
      },
      { secao: { n: 2, titulo: 'Público beneficiário' } },
      {
        cards: [
          [String(s.totalStudents), 'alunos atendidos no mês', false],
          [String(s.totalPresences), 'presenças registradas', false],
          [String(s.totalAbsences), 'faltas registradas', s.totalAbsences > 0],
          [String(s.boys), 'meninos', false],
          [String(s.girls), 'meninas', false],
          [pct(s.averageRate), 'frequência média da turma', false],
        ],
      },
    ],
  });

  // ---------- 2 (continuação): encontros, eventos, faixa etária ----------
  const enc = p.encounters;
  const encChunks = chunk(enc, ENCOUNTERS_PER_PAGE);
  if (encChunks.length === 0) encChunks.push([]);
  encChunks.forEach((group, gi) => {
    const blocos: any[] = [];
    if (group.length === 0) {
      blocos.push({ destaque: 'Nenhuma chamada registrada neste mês.' });
    } else {
      blocos.push({
        tabela: {
          titulo: gi === 0 ? school : `${school} (continuação)`,
          linhas: group.map((e, i) => [
            `${gi * ENCOUNTERS_PER_PAGE + i + 1}º encontro · ${e.category}`,
            e.dateShort,
            `${e.present} pres. · ${e.absent} falt. · ${pct(e.rate)}`,
          ]),
        },
      });
    }
    if (gi === 0 && enc.length > 0 && enc.length <= 8) {
      blocos.push({ barras: enc.map((e, i) => [`${i + 1}º encontro · ${e.dateShort}`, e.present]) });
    }
    if (gi === 0) {
      if (p.events.length > 0) {
        blocos.push({
          tabela: {
            titulo: 'Eventos e apresentações',
            linhas: p.events.map((e) => [e.name, e.dateFull, plural(e.publicCount, 'pessoa', 'pessoas')]),
          },
        });
      }
      blocos.push({
        tabela: {
          titulo: 'Alunos por faixa etária',
          linhas: [
            ['Crianças', 'até 11 anos', s.audience.children],
            ['Adolescentes', '12 a 17 anos', s.audience.teens],
            ['Outros', '18 anos ou mais', s.audience.others],
          ],
        },
      });
    }
    paginas.push({ tipo: 'resumo', blocos });
  });

  // ---------- Nominata ----------
  const cols = p.nominataColumns === 3 ? 3 : 2;
  const perPage = ROWS_PER_PAGE * cols;
  const nomChunks = chunk(p.students, perPage);
  nomChunks.forEach((group, gi) => {
    const offset = gi * perPage;
    paginas.push({
      tipo: 'nominata',
      kicker: '2. Público beneficiário',
      titulo: 'Nominata dos alunos',
      sub: 'Idade, sexo e frequência no mês',
      colunas: cols,
      linhas: group.map((st, i) => [offset + i + 1, st.name, st.age, st.sex, st.present, st.absent, pct(st.rate)]),
      legenda:
        'Id. = idade · Sexo: M/F · Pres. = presenças · Falt. = faltas · Freq. = presenças ÷ chamadas do aluno no mês.',
    });
  });

  // ---------- 3 a 6: seções de texto, paginadas por altura estimada ----------
  const t = p.texts;
  const blocksText = [
    { kind: 'secao', n: 3, titulo: 'Indicadores de resultado e impacto', texto: t.impactIndicators.trim() || TODO },
    { kind: 'secao', n: 4, titulo: 'Monitoramento e avaliação', texto: t.monitoringEvaluation.trim() || TODO },
    {
      kind: 'secao',
      n: 5,
      titulo: 'Dificuldades encontradas',
      texto: t.hasDifficulties ? t.difficultiesDetails.trim() || TODO : NO_DIFFICULTIES,
    },
    {
      kind: 'destaque',
      n: 6,
      titulo: 'Resultados alcançados',
      texto: t.hasDifficulties ? t.achievedResults.trim() || TODO : NO_ACTIONS,
    },
  ];
  let page: any[] = [];
  let used = 0;
  const flush = () => {
    if (page.length) paginas.push({ tipo: 'resumo', blocos: page });
    page = [];
    used = 0;
  };
  for (const b of blocksText) {
    const h = sectionHeight(b.texto) + (b.kind === 'destaque' ? 20 : 0);
    if (used + h > BODY_BUDGET_PT && page.length) flush();
    if (b.kind === 'secao') page.push({ secao: { n: b.n, titulo: b.titulo, texto: b.texto } });
    else {
      page.push({ secao: { n: b.n, titulo: b.titulo } });
      page.push({ destaque: b.texto });
    }
    used += h;
  }
  flush();

  // ---------- 7: fotos, agrupadas por atividade, 4 por página ----------
  const groups = new Map<string, { arquivo: string; titulo: string; data: string }[]>();
  p.photos.forEach((ph, i) => {
    const file = photoFiles[i];
    if (!file) return;
    if (!groups.has(ph.group)) groups.set(ph.group, []);
    groups.get(ph.group)!.push({ arquivo: file, titulo: ph.title, data: ph.when });
  });
  groups.forEach((fotos, group) => {
    chunk(fotos, 4).forEach((f) => {
      paginas.push({
        tipo: 'fotos',
        kicker: '7. Documentos comprobatórios anexados',
        titulo: group,
        sub: 'Registro fotográfico das atividades',
        fotos: f,
      });
    });
  });

  // ---------- Anexo: registro diário de chamada ----------
  if (enc.length > 0 && p.students.length > 0) {
    const dateBlocks = chunk(enc.map((_, i) => i), DATES_PER_BLOCK);
    dateBlocks.forEach((idxs, bi) => {
      const lastBlock = bi === dateBlocks.length - 1;
      chunk(p.students, ROWS_PER_PAGE).forEach((rows, ri, all) => {
        const offset = ri * ROWS_PER_PAGE;
        const lastRows = ri === all.length - 1;
        paginas.push({
          tipo: 'chamada',
          kicker: 'Anexo',
          titulo: 'Registro diário de chamada',
          sub: dateBlocks.length > 1 ? `Encontros ${idxs[0] + 1} a ${idxs[idxs.length - 1] + 1}` : 'Presenças e faltas por encontro',
          datas: idxs.map((i) => enc[i].dateShort),
          linhas: rows.map((st, i) => [
            offset + i + 1,
            st.name,
            st.age,
            st.sex,
            idxs.map((k) => st.marks[k] ?? '-'),
            st.present,
            st.absent,
            pct(st.rate),
          ]),
          resumo: lastBlock,
          totais:
            lastBlock && lastRows
              ? {
                  por_data: idxs.map((i) => enc[i].present),
                  presencas: s.totalPresences,
                  faltas: s.totalAbsences,
                  freq: pct(s.averageRate),
                }
              : undefined,
          legenda: 'P = presente · F = falta · – = sem registro de chamada para o aluno na data.',
        });
      });
    });
  }

  // ---------- Encerramento ----------
  paginas.push({
    tipo: 'encerramento',
    kicker: 'Encerramento',
    titulo: 'Identificação e assinaturas',
    linhas: [
      ['Local e data', p.locationCityDate || TODO],
      ['Instrutor', p.instructorName || TODO],
      ['Escola', school],
      ['Diretor(a)', p.directorName || TODO],
    ],
    assinaturas: ['Instrutor', 'Direção da escola'],
  });

  return {
    logos: p.logos,
    capa: {
      kicker: 'Relatório de execução das atividades',
      titulo: school,
      subtitulo: `Mês de referência: ${p.monthLabel}`,
      esquerda: [
        ['Representante legal', 'Fábio Paulo Matias'],
        ['Elaborado por', p.instructorName || TODO],
      ],
      direita: [['Contato', ['sccruzeirodosul.org', 'contato@sccruzeirodosul.org', '@cruzeirodosul.cric']]],
    },
    paginas,
  };
}
