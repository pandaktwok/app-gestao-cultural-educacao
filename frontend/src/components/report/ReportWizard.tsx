import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle2,
  Minus,
  Plus,
  Download,
  ExternalLink,
  Loader2,
  FileText,
  AlertTriangle
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Textos-padrão e opções de resposta (as perguntas do relatório não mudam) */
/* ------------------------------------------------------------------ */

export const STANDARD_NO_DIFFICULTIES_TEXT =
  'Não foram observadas dificuldades ou empecilhos de ordem técnica, pedagógica ou operacional no decorrer das atividades do mês.';
export const STANDARD_SOLUTIONS_NO_NEED_TEXT =
  'Tendo em vista que não foram observadas dificuldades ou empecilhos no período, não houve necessidade de aplicação de medidas corretivas.';

// Pergunta 1: lista que entra em "Ensaios semanais com foco em ..."
const FOCUS_OPTIONS = [
  'afinação',
  'marcha e postura de apresentação',
  'sincronia entre os naipes',
  'leitura rítmica e musical',
  'técnica de percussão',
  'técnica de sopros',
  'repertório novo',
  'preparação para apresentações',
  'disciplina e concentração'
];

// Pergunta 3: frases completas
const IMPACT_OPTIONS = [
  'Boa adesão dos alunos e presença constante nos ensaios.',
  'Evolução na leitura rítmica e na execução dos toques.',
  'Melhora na marcha, no alinhamento e na postura.',
  'Maior sincronia entre os naipes.',
  'Mais disciplina, concentração e comprometimento da turma.',
  'Preparação para as próximas apresentações em andamento.',
  'Interesse e participação da comunidade escolar.',
  'Aumento da procura por vagas no projeto.'
];

// Pergunta 4: frases completas
const MONITORING_OPTIONS = [
  'Controle de frequência por chamada em todos os encontros.',
  'Avaliação por audições e exercícios práticos de coordenação, ritmo e noção auditiva.',
  'Observação individual de postura, marcha e resistência.',
  'Contato com a coordenação da escola em caso de faltas seguidas.',
  'Conversa periódica com a direção e a equipe pedagógica.',
  'Registro fotográfico dos ensaios e das apresentações.'
];

// Pergunta 5 (se houve dificuldades): frases completas
const DIFFICULTY_OPTIONS = [
  'Espaço para o ensaio indisponível ou inadequado em alguns dias.',
  'Conflito de horário com outras atividades da escola.',
  'Faltas frequentes de alguns alunos.',
  'Falta ou desgaste de instrumentos e materiais.',
  'Indisciplina ou dispersão da turma em alguns encontros.',
  'Ensaios afetados por chuva, feriados ou paralisações.'
];

// Pergunta 6 (soluções): frases completas
const SOLUTION_OPTIONS = [
  'Alinhamento do espaço e do horário com a direção da escola.',
  'Reposição dos ensaios perdidos em outro dia.',
  'Contato com a coordenação e com os responsáveis dos alunos faltosos.',
  'Reorganização dos instrumentos e materiais disponíveis.',
  'Conversa individual com os alunos e reforço das regras de convivência.'
];

const QUICK_PUBLIC = [50, 100, 150, 200, 300, 500];

/* ------------------------------------------------------------------ */
/* Helpers de texto                                                     */
/* ------------------------------------------------------------------ */

function joinList(items: string[]): string {
  const list = items.map((s) => s.trim()).filter(Boolean);
  if (list.length <= 1) return list[0] || '';
  return `${list.slice(0, -1).join(', ')} e ${list[list.length - 1]}`;
}

function endWithPeriod(s: string): string {
  const t = s.trim();
  if (!t) return '';
  return /[.!?…]$/.test(t) ? t : `${t}.`;
}

/** Descobre quais opções já aparecem num texto salvo e o que sobra dele (para retomar rascunhos). */
function parseExisting(value: string, options: string[], mode: 'list' | 'sentences', ignore?: string) {
  if (!value || value === ignore) return { sel: [] as string[], extra: '' };
  const sel = options.filter((o) => value.includes(o));
  let rest = value;
  sel.forEach((o) => {
    rest = rest.replace(o, '');
  });
  if (mode === 'list') {
    rest = rest.replace(/\s+e\s+/g, ' ').replace(/[,]/g, ' ');
  }
  return { sel, extra: rest.replace(/\s+/g, ' ').trim() };
}

/* ------------------------------------------------------------------ */
/* Peças de interface                                                   */
/* ------------------------------------------------------------------ */

const Chip: React.FC<{ on: boolean; onClick: () => void; children: React.ReactNode }> = ({ on, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    className={`w-full text-left flex items-start gap-3 min-h-[52px] px-4 py-3 rounded-2xl border-2 text-[15px] leading-snug font-semibold transition active:scale-[0.99] ${
      on ? 'bg-amber-100 border-amber-400 text-gray-900' : 'bg-white border-gray-200 text-gray-800'
    }`}
  >
    <span
      className={`mt-0.5 shrink-0 w-6 h-6 rounded-full border-2 grid place-items-center ${
        on ? 'bg-amber-400 border-amber-500 text-black' : 'border-gray-300 text-transparent'
      }`}
    >
      <Check size={14} strokeWidth={3} />
    </span>
    <span>{children}</span>
  </button>
);

const Title: React.FC<{ kicker: string; title: string; hint?: string }> = ({ kicker, title, hint }) => (
  <div className="space-y-1 mb-4">
    <span className="text-[11px] font-black uppercase tracking-wider text-amber-700">{kicker}</span>
    <h2 className="text-[22px] leading-tight font-black text-gray-900">{title}</h2>
    {hint && <p className="text-sm text-gray-500 font-medium">{hint}</p>}
  </div>
);

const Preview: React.FC<{ label: string; text: string }> = ({ label, text }) => (
  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
    <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 block mb-1">{label}</span>
    <p className="text-sm italic text-amber-950 whitespace-pre-line">{text || 'Escolha uma opção ou escreva abaixo.'}</p>
  </div>
);

const ExtraBox: React.FC<{ id: string; value: string; onChange: (v: string) => void; placeholder: string }> = ({
  id,
  value,
  onChange,
  placeholder
}) => (
  <div className="mt-4">
    <label htmlFor={id} className="block text-sm font-extrabold text-gray-800 mb-1.5">
      Quer acrescentar algo? <span className="font-medium text-gray-400">(opcional)</span>
    </label>
    <textarea
      id={id}
      rows={3}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full p-3.5 rounded-2xl border-2 border-gray-200 bg-white text-base font-medium focus:border-amber-400 focus:outline-none placeholder:text-gray-400"
    />
  </div>
);

/** Pergunta de múltipla escolha que monta o texto do relatório sozinha. */
const MultiQuestion: React.FC<{
  id: string;
  options: string[];
  mode: 'list' | 'sentences';
  value: string;
  setValue: (v: string) => void;
  previewLabel: string;
  previewWrap?: (text: string) => string;
  placeholder: string;
  ignoreValue?: string;
}> = ({ id, options, mode, value, setValue, previewLabel, previewWrap, placeholder, ignoreValue }) => {
  const init = useMemo(() => parseExisting(value, options, mode, ignoreValue), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [sel, setSel] = useState<string[]>(init.sel);
  const [extra, setExtra] = useState(init.extra);

  const compose = (s: string[], e: string) => {
    const ordered = options.filter((o) => s.includes(o));
    if (mode === 'list') return joinList([...ordered, e.trim()]);
    return [...ordered, endWithPeriod(e)].filter(Boolean).join(' ');
  };

  const toggle = (o: string) => {
    const next = sel.includes(o) ? sel.filter((x) => x !== o) : [...sel, o];
    setSel(next);
    setValue(compose(next, extra));
  };
  const changeExtra = (e: string) => {
    setExtra(e);
    setValue(compose(sel, e));
  };

  const text = value && value !== ignoreValue ? value : '';
  return (
    <div>
      <div className="space-y-2.5" role="group">
        {options.map((o) => (
          <Chip key={o} on={sel.includes(o)} onClick={() => toggle(o)}>
            {o}
          </Chip>
        ))}
      </div>
      <ExtraBox id={id} value={extra} onChange={changeExtra} placeholder={placeholder} />
      <Preview label={previewLabel} text={previewWrap ? (text ? previewWrap(text) : '') : text} />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Componente principal                                                 */
/* ------------------------------------------------------------------ */

export interface ReportWizardProps {
  schoolName: string;
  monthText: string;
  // Dados do mês (somente leitura)
  attendanceSessions: any[];
  eventSessions: any[];
  rehearsalPhotos: any[];
  summary: { totalStudents: number; totalPresences: number; totalAbsences: number; boys: number; girls: number; perSession: { session: any; present: number; absent: number }[] };
  formatDateStr: (d: any) => string;
  // Respostas
  activitiesFocus: string;
  setActivitiesFocus: (v: string) => void;
  impactIndicators: string;
  setImpactIndicators: (v: string) => void;
  monitoringEvaluation: string;
  setMonitoringEvaluation: (v: string) => void;
  hasDifficulties: boolean;
  onToggleDifficulties: (yes: boolean) => void;
  difficultiesDetails: string;
  setDifficultiesDetails: (v: string) => void;
  achievedResults: string;
  setAchievedResults: (v: string) => void;
  eventPublicCounts: { [eventId: string]: number };
  onEventPublicChange: (eventId: string, count: number) => void;
  // Fotos
  selectedRehearsalIds: string[];
  onToggleRehearsalPhoto: (id: string) => void;
  selectedEventPhotoIds: string[];
  onToggleEventPhoto: (photoId: string, eventId: string) => void;
  // Documento
  nominataColumns: 2 | 3;
  setNominataColumns: (n: 2 | 3) => void;
  officialBusy: boolean;
  officialUrl: string | null;
  officialError: string | null;
  onGenerate: () => void;
  downloadName: string;
  // Ações
  onSaveDraft: () => Promise<boolean>;
  onFinish: () => Promise<void>;
  onClose: () => void;
  finishing: boolean;
}

export const ReportWizard: React.FC<ReportWizardProps> = (p) => {
  const [idx, setIdx] = useState(0);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'offline'>('idle');
  const scroller = useRef<HTMLDivElement>(null);

  const steps = useMemo(
    () => [
      { key: 'foco', label: 'Foco dos ensaios' },
      { key: 'publico', label: 'Público' },
      { key: 'impacto', label: 'Resultados e impacto' },
      { key: 'avaliacao', label: 'Avaliação' },
      { key: 'dificuldades', label: 'Dificuldades' },
      ...(p.hasDifficulties ? [{ key: 'solucoes', label: 'Soluções' }] : []),
      { key: 'fotos', label: 'Fotos' },
      { key: 'documento', label: 'Documento' }
    ],
    [p.hasDifficulties]
  );
  const step = steps[Math.min(idx, steps.length - 1)];
  const last = idx >= steps.length - 1;

  // trava a rolagem da página de trás enquanto o assistente está aberto
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [idx]);

  const missing: string | null = (() => {
    switch (step.key) {
      case 'foco':
        return p.activitiesFocus.trim() ? null : 'Escolha ao menos uma opção ou escreva o foco dos ensaios.';
      case 'impacto':
        return p.impactIndicators.trim() ? null : 'Escolha ao menos uma opção ou escreva os resultados.';
      case 'avaliacao':
        return p.monitoringEvaluation.trim() ? null : 'Escolha ao menos uma opção ou escreva como foi a avaliação.';
      case 'dificuldades':
        return p.hasDifficulties && !p.difficultiesDetails.trim() ? 'Escolha ao menos uma dificuldade ou escreva qual foi.' : null;
      case 'solucoes':
        return p.hasDifficulties && !p.achievedResults.trim() ? 'Escolha ao menos uma solução ou escreva qual foi.' : null;
      default:
        return null;
    }
  })();

  const save = async () => {
    setSaveState('saving');
    try {
      const ok = await p.onSaveDraft();
      setSaveState(ok ? 'saved' : 'offline');
    } catch {
      setSaveState('offline');
    }
  };

  const go = (d: number) => {
    if (d > 0 && missing) return;
    if (d > 0) save(); // salva o rascunho a cada avanço
    setIdx((i) => Math.max(0, Math.min(steps.length - 1, i + d)));
  };

  // conta só as fotos que existem neste mês (o rascunho pode guardar ids antigos)
  const pickedRehearsals = p.rehearsalPhotos.filter((ph) => p.selectedRehearsalIds.includes(ph.id)).length;
  const pickedEventPhotos = p.eventSessions.reduce(
    (n, ev) => n + (ev.photos || []).filter((ph: any) => p.selectedEventPhotoIds.includes(ph.id)).length,
    0
  );

  const pct = Math.round(((idx + 1) / steps.length) * 100);

  const ui = (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#F5F3EE]" role="dialog" aria-modal="true" aria-label="Assistente do relatório mensal">
      {/* Topo */}
      <header className="bg-white border-b border-gray-200 px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3">
        <div className="max-w-xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={p.onClose}
              aria-label="Fechar assistente"
              className="w-11 h-11 -ml-2 rounded-full grid place-items-center text-gray-600 active:bg-gray-100"
            >
              <X size={22} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-wider text-gray-400 truncate">Relatório de {p.monthText}</p>
              <p className="text-sm font-extrabold text-gray-900 truncate">{p.schoolName}</p>
            </div>
            <span className="text-[11px] font-bold text-gray-400 whitespace-nowrap flex items-center gap-1 shrink-0" aria-live="polite">
              {saveState === 'saving' && (
                <>
                  <Loader2 size={14} className="animate-spin" /> <span className="hidden sm:inline">Salvando</span>
                </>
              )}
              {saveState === 'saved' && (
                <>
                  <CheckCircle2 size={14} className="text-emerald-600" /> <span className="hidden sm:inline">Rascunho salvo</span>
                </>
              )}
              {saveState === 'offline' && (
                <>
                  <AlertTriangle size={14} className="text-amber-600" /> <span className="hidden sm:inline">Não salvou (sem internet)</span>
                </>
              )}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-2 flex-1 rounded-full bg-gray-200 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-black text-gray-700 tabular-nums">
              {idx + 1}/{steps.length}
            </span>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <div ref={scroller} className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-xl mx-auto w-full px-4 py-5 pb-8">
          {step.key === 'foco' && (
            <>
              <Title
                kicker="Pergunta 1 de 6"
                title="Os ensaios deste mês tiveram foco em quê?"
                hint="Toque em tudo o que foi trabalhado."
              />
              <MultiQuestion
                id="extra-foco"
                options={FOCUS_OPTIONS}
                mode="list"
                value={p.activitiesFocus}
                setValue={p.setActivitiesFocus}
                previewLabel="Assim vai aparecer no relatório"
                previewWrap={(t) => `Ensaios semanais com foco em ${t}.`}
                placeholder="Outro foco, com suas palavras"
              />
            </>
          )}

          {step.key === 'publico' && (
            <>
              <Title kicker="Pergunta 2 de 6" title="Público atendido" hint="Os ensaios já vêm da chamada. Informe só o público dos eventos." />
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  ['Alunos', p.summary.totalStudents],
                  ['Presenças', p.summary.totalPresences],
                  ['Faltas', p.summary.totalAbsences]
                ].map(([l, v]) => (
                  <div key={l as string} className="rounded-2xl bg-white border border-gray-200 p-3 text-center">
                    <b className="block text-2xl font-black text-gray-900 tabular-nums">{v}</b>
                    <span className="text-[11px] font-bold text-gray-500">{l}</span>
                  </div>
                ))}
              </div>

              <h3 className="text-sm font-extrabold text-gray-800 mb-2">Ensaios do mês</h3>
              {p.summary.perSession.length === 0 ? (
                <p className="rounded-2xl bg-white border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                  Nenhum ensaio com chamada neste mês.
                </p>
              ) : (
                <ul className="space-y-2">
                  {p.summary.perSession.map(({ session: s, present }, i) => (
                    <li key={s.id} className="flex items-center justify-between rounded-2xl bg-white border border-gray-200 px-4 py-3">
                      <span className="text-sm font-bold text-gray-900">
                        {i + 1}º ensaio <span className="text-gray-400 font-semibold">· {p.formatDateStr(s.date)}</span>
                      </span>
                      <span className="text-sm font-black text-amber-700">{present} presentes</span>
                    </li>
                  ))}
                </ul>
              )}

              {p.eventSessions.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-sm font-extrabold text-gray-800">Quantas pessoas foram aos eventos?</h3>
                  {p.eventSessions.map((ev) => {
                    const n = p.eventPublicCounts[ev.id] || 0;
                    return (
                      <div key={ev.id} className="rounded-2xl bg-white border-2 border-amber-200 p-4">
                        <p className="text-sm font-black text-gray-900">{ev.name}</p>
                        <p className="text-xs text-gray-500 font-medium mb-3">{p.formatDateStr(ev.date)}</p>
                        <div className="flex items-center justify-between gap-3">
                          <button
                            type="button"
                            aria-label="Diminuir público"
                            onClick={() => p.onEventPublicChange(ev.id, Math.max(0, n - 10))}
                            className="w-14 h-14 rounded-2xl bg-gray-100 grid place-items-center active:bg-gray-200"
                          >
                            <Minus size={22} />
                          </button>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={n || ''}
                            placeholder="0"
                            aria-label={`Público do evento ${ev.name}`}
                            onChange={(e) => p.onEventPublicChange(ev.id, Math.max(0, parseInt(e.target.value) || 0))}
                            className="flex-1 min-w-0 h-14 text-center text-2xl font-black rounded-2xl border-2 border-gray-200 focus:border-amber-400 focus:outline-none"
                          />
                          <button
                            type="button"
                            aria-label="Aumentar público"
                            onClick={() => p.onEventPublicChange(ev.id, n + 10)}
                            className="w-14 h-14 rounded-2xl bg-amber-400 grid place-items-center active:bg-amber-500"
                          >
                            <Plus size={22} />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {QUICK_PUBLIC.map((q) => (
                            <button
                              key={q}
                              type="button"
                              onClick={() => p.onEventPublicChange(ev.id, q)}
                              className={`min-h-[40px] px-4 rounded-full text-sm font-bold border-2 ${
                                n === q ? 'bg-amber-100 border-amber-400' : 'bg-white border-gray-200'
                              }`}
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {step.key === 'impacto' && (
            <>
              <Title
                kicker="Pergunta 3 de 6"
                title="Quais resultados e impactos você observou?"
                hint="Toque em tudo o que se aplica."
              />
              <MultiQuestion
                id="extra-impacto"
                options={IMPACT_OPTIONS}
                mode="sentences"
                value={p.impactIndicators}
                setValue={p.setImpactIndicators}
                previewLabel="Assim vai aparecer no relatório"
                placeholder="Algo que você quer destacar"
              />
            </>
          )}

          {step.key === 'avaliacao' && (
            <>
              <Title
                kicker="Pergunta 4 de 6"
                title="Como foi feito o acompanhamento e a avaliação dos alunos?"
                hint="Toque em tudo o que você fez."
              />
              <MultiQuestion
                id="extra-avaliacao"
                options={MONITORING_OPTIONS}
                mode="sentences"
                value={p.monitoringEvaluation}
                setValue={p.setMonitoringEvaluation}
                previewLabel="Assim vai aparecer no relatório"
                placeholder="Outra forma de acompanhamento"
              />
            </>
          )}

          {step.key === 'dificuldades' && (
            <>
              <Title kicker="Pergunta 5 de 6" title="Houve dificuldades neste mês?" />
              <div className="grid grid-cols-2 gap-3 mb-2">
                {[
                  { yes: false, label: 'Não', sub: 'Tudo correu bem' },
                  { yes: true, label: 'Sim', sub: 'Houve dificuldades' }
                ].map((o) => (
                  <button
                    key={o.label}
                    type="button"
                    onClick={() => p.onToggleDifficulties(o.yes)}
                    aria-pressed={p.hasDifficulties === o.yes}
                    className={`min-h-[84px] rounded-2xl border-2 p-3 text-center transition active:scale-[0.98] ${
                      p.hasDifficulties === o.yes ? 'bg-amber-400 border-amber-500' : 'bg-white border-gray-200'
                    }`}
                  >
                    <span className="block text-2xl font-black text-gray-900">{o.label}</span>
                    <span className="block text-xs font-bold text-gray-700">{o.sub}</span>
                  </button>
                ))}
              </div>

              {p.hasDifficulties ? (
                <div className="mt-5">
                  <h3 className="text-sm font-extrabold text-gray-800 mb-2">Quais foram as dificuldades?</h3>
                  <MultiQuestion
                    key="dif"
                    id="extra-dif"
                    options={DIFFICULTY_OPTIONS}
                    mode="sentences"
                    value={p.difficultiesDetails}
                    setValue={p.setDifficultiesDetails}
                    ignoreValue={STANDARD_NO_DIFFICULTIES_TEXT}
                    previewLabel="Assim vai aparecer no relatório"
                    placeholder="Outra dificuldade, com suas palavras"
                  />
                </div>
              ) : (
                <Preview label="Texto automático no relatório" text={STANDARD_NO_DIFFICULTIES_TEXT} />
              )}
            </>
          )}

          {step.key === 'solucoes' && (
            <>
              <Title kicker="Pergunta 6 de 6" title="Que soluções foram adotadas?" hint="Toque em tudo o que foi feito para resolver." />
              <MultiQuestion
                key="sol"
                id="extra-sol"
                options={SOLUTION_OPTIONS}
                mode="sentences"
                value={p.achievedResults}
                setValue={p.setAchievedResults}
                ignoreValue={STANDARD_SOLUTIONS_NO_NEED_TEXT}
                previewLabel="Assim vai aparecer no relatório"
                placeholder="Outra solução, com suas palavras"
              />
            </>
          )}

          {step.key === 'fotos' && (
            <>
              <Title
                kicker="Fotos"
                title="Escolha as fotos do relatório"
                hint="Uma foto por ensaio e até duas por evento. Toque para marcar ou desmarcar."
              />

              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-extrabold text-gray-800">Ensaios</h3>
                <span className="text-xs font-black text-amber-800 bg-amber-100 rounded-full px-2.5 py-1">
                  {pickedRehearsals} de {p.summary.perSession.length}
                </span>
              </div>
              {p.rehearsalPhotos.length === 0 ? (
                <p className="rounded-2xl bg-white border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                  Nenhuma foto de ensaio registrada neste mês.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {p.rehearsalPhotos.map((ph) => {
                    const on = p.selectedRehearsalIds.includes(ph.id);
                    const d = ph.originalTimestamp || ph.date || ph.createdAt;
                    return (
                      <button
                        key={ph.id}
                        type="button"
                        onClick={() => p.onToggleRehearsalPhoto(ph.id)}
                        aria-pressed={on}
                        className={`relative text-left rounded-2xl border-2 overflow-hidden bg-white transition ${
                          on ? 'border-amber-500 ring-2 ring-amber-200' : 'border-gray-200 opacity-60'
                        }`}
                      >
                        <img src={ph.photoUrl} alt="Foto do ensaio" className="w-full aspect-[4/3] object-cover" />
                        {on && (
                          <span className="absolute top-2 right-2 bg-amber-400 rounded-full p-1">
                            <Check size={14} strokeWidth={3} />
                          </span>
                        )}
                        <span className="block px-2.5 py-2 text-xs font-bold text-gray-700">{p.formatDateStr(d)}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <h3 className="text-sm font-extrabold text-gray-800 mt-7 mb-2">Eventos</h3>
              {p.eventSessions.length === 0 ? (
                <p className="rounded-2xl bg-white border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                  Nenhum evento registrado neste mês.
                </p>
              ) : (
                <div className="space-y-5">
                  {p.eventSessions.map((ev) => (
                    <div key={ev.id}>
                      <p className="text-sm font-black text-gray-900 mb-2">
                        {ev.name} <span className="font-semibold text-gray-400">· {p.formatDateStr(ev.date)}</span>
                      </p>
                      {(ev.photos || []).length === 0 ? (
                        <p className="text-xs text-gray-500">Este evento não tem fotos.</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          {ev.photos.map((ph: any) => {
                            const on = p.selectedEventPhotoIds.includes(ph.id);
                            return (
                              <button
                                key={ph.id}
                                type="button"
                                onClick={() => p.onToggleEventPhoto(ph.id, ev.id)}
                                aria-pressed={on}
                                className={`relative rounded-2xl border-2 overflow-hidden bg-white transition ${
                                  on ? 'border-amber-500 ring-2 ring-amber-200' : 'border-gray-200 opacity-60'
                                }`}
                              >
                                <img src={ph.photoUrl} alt="Foto do evento" className="w-full aspect-[4/3] object-cover" />
                                {on && (
                                  <span className="absolute top-2 right-2 bg-amber-400 rounded-full p-1">
                                    <Check size={14} strokeWidth={3} />
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {step.key === 'documento' && (
            <>
              <Title kicker="Último passo" title="Gerar o documento" hint="Confira, gere o PDF e finalize." />

              <div className="rounded-2xl bg-white border border-gray-200 divide-y divide-gray-100 mb-5">
                {[
                  ['Escola', p.schoolName],
                  ['Mês', p.monthText],
                  ['Alunos', `${p.summary.totalStudents} (${p.summary.boys} meninos, ${p.summary.girls} meninas)`],
                  ['Presenças / faltas', `${p.summary.totalPresences} / ${p.summary.totalAbsences}`],
                  ['Fotos', `${pickedRehearsals} de ensaios, ${pickedEventPhotos} de eventos`]
                ].map(([k, v]) => (
                  <div key={k} className="flex items-start justify-between gap-4 px-4 py-3">
                    <span className="text-xs font-black uppercase tracking-wider text-gray-400 pt-0.5">{k}</span>
                    <span className="text-sm font-bold text-gray-900 text-right">{v}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <p className="text-sm font-extrabold text-gray-800 mb-2">Lista de alunos em</p>
                <div className="grid grid-cols-2 gap-3">
                  {([2, 3] as const).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => p.setNominataColumns(n)}
                      aria-pressed={p.nominataColumns === n}
                      className={`min-h-[52px] rounded-2xl border-2 text-base font-black ${
                        p.nominataColumns === n ? 'bg-charcoal text-white border-charcoal' : 'bg-white border-gray-200 text-gray-800'
                      }`}
                    >
                      {n} colunas
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  disabled={p.officialBusy}
                  onClick={p.onGenerate}
                  className="w-full min-h-[56px] rounded-2xl bg-charcoal text-white text-base font-black flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99]"
                >
                  {p.officialBusy ? (
                    <>
                      <Loader2 size={20} className="animate-spin" /> Gerando PDF…
                    </>
                  ) : (
                    <>
                      <FileText size={20} /> {p.officialUrl ? 'Gerar de novo' : 'Gerar PDF'}
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500 font-medium text-center">Pode levar alguns segundos.</p>

                {p.officialError && (
                  <div className="p-3.5 rounded-2xl border border-amber-300 bg-amber-50 text-sm font-bold text-amber-900 flex gap-2">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5" /> <span>{p.officialError}</span>
                  </div>
                )}

                {p.officialUrl && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <a
                        href={p.officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[52px] rounded-2xl bg-white border-2 border-gray-200 text-sm font-black text-gray-900 flex items-center justify-center gap-2"
                      >
                        <ExternalLink size={18} /> Abrir
                      </a>
                      <a
                        href={p.officialUrl}
                        download={p.downloadName}
                        className="min-h-[52px] rounded-2xl bg-emerald-600 text-white text-sm font-black flex items-center justify-center gap-2"
                      >
                        <Download size={18} /> Baixar
                      </a>
                    </div>
                    <iframe
                      src={p.officialUrl}
                      title="Prévia do relatório"
                      className="hidden md:block w-full rounded-2xl border-2 border-gray-200 bg-gray-100"
                      style={{ height: '720px' }}
                    />
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Barra inferior fixa */}
      <footer className="bg-white border-t border-gray-200 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        <div className="max-w-xl mx-auto w-full">
          {missing && !last && <p className="text-xs font-bold text-amber-800 mb-2 text-center">{missing}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={idx === 0}
              className="min-h-[52px] px-5 rounded-2xl bg-gray-100 text-gray-800 font-black flex items-center gap-1 disabled:opacity-30"
            >
              <ChevronLeft size={20} /> Voltar
            </button>
            {!last ? (
              <button
                type="button"
                onClick={() => go(1)}
                disabled={!!missing}
                className="flex-1 min-h-[52px] rounded-2xl bg-amber-400 text-black text-base font-black flex items-center justify-center gap-1 disabled:opacity-40 active:bg-amber-500"
              >
                Continuar <ChevronRight size={20} />
              </button>
            ) : (
              <button
                type="button"
                onClick={p.onFinish}
                disabled={p.finishing}
                className="flex-1 min-h-[52px] rounded-2xl bg-emerald-600 text-white text-base font-black flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <CheckCircle2 size={20} /> {p.finishing ? 'Salvando…' : 'Finalizar relatório'}
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
  return typeof document === 'undefined' ? ui : createPortal(ui, document.body);
};
