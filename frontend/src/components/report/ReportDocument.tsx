import React from 'react';
import { AttendanceSummary, monthLabel, splitInColumns } from '../../lib/reportStats';

/**
 * Documento oficial do Relatório Mensal (exportado em PDF A4).
 * Segue o padrão "Relatório de Execução das Atividades" (seções 1 a 7) e traz
 * a chamada completa do mês: resumo, nominata em colunas e registro diário.
 */

export interface ReportDocumentProps {
  entityName?: string;
  projectTitle: string;
  grantorName: string;
  fundingAgreementNo: string;
  responsibleName: string;
  monthYear: string;
  referenceMonthLabel?: string;
  locationCityDate: string;

  schoolName: string;
  directorName: string;
  instructorName: string;
  instructorCpf?: string;

  activitiesFocus: string;
  impactIndicators: string;
  monitoringEvaluation: string;
  hasDifficulties: boolean;
  difficultiesDetails: string;
  achievedResults: string;

  summary: AttendanceSummary;
  events: { id: string; name: string; date: string; locationAddress?: string | null }[];
  eventPublicCounts: Record<string, number>;
  rehearsalPhotos: any[];
  eventPhotos: { photo: any; event: any }[];
  nominataColumns: 2 | 3;
}

const NO_DIFFICULTIES =
  'Não foram observadas dificuldades ou empecilhos de ordem técnica, pedagógica ou operacional no decorrer das atividades do mês.';
const NO_ACTIONS =
  'Tendo em vista que não foram observadas dificuldades ou empecilhos no período, não houve necessidade de aplicação de medidas corretivas.';

const fmtDate = (d: any) => {
  const date = new Date(d);
  return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR');
};
const fmtShort = (d: any) => {
  const date = new Date(d);
  return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};
const fmtTime = (d: any) => {
  const date = new Date(d);
  return isNaN(date.getTime()) ? '' : date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};
const pct = (n: number | null) => (n === null ? '—' : `${n}%`);

const avoid: React.CSSProperties = { breakInside: 'avoid', pageBreakInside: 'avoid' };

const SectionTitle: React.FC<{ n?: string; children: React.ReactNode }> = ({ n, children }) => (
  <div style={avoid} className="flex items-center gap-2.5 mt-6 mb-2.5">
    {n && (
      <span className="w-6 h-6 rounded-lg bg-charcoal text-white text-[11px] font-black flex items-center justify-center shrink-0">
        {n}
      </span>
    )}
    <h3 className="text-[12px] font-black uppercase tracking-wide text-gray-900">{children}</h3>
    <span className="flex-1 border-b border-gray-300" />
  </div>
);

const Stat: React.FC<{ label: string; value: React.ReactNode; tone?: 'amber' | 'mint' | 'coral' | 'plain' }> = ({
  label,
  value,
  tone = 'plain',
}) => {
  const tones = {
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    mint: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    coral: 'bg-rose-50 border-rose-200 text-rose-900',
    plain: 'bg-gray-50 border-gray-200 text-gray-900',
  };
  return (
    <div style={avoid} className={`rounded-2xl border px-3 py-2.5 text-center ${tones[tone]}`}>
      <div className="text-[18px] font-black leading-none">{value}</div>
      <div className="text-[9px] font-bold uppercase tracking-wider mt-1 opacity-70">{label}</div>
    </div>
  );
};

const TextBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[11.5px] leading-relaxed text-gray-800 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 whitespace-pre-line">
    {children}
  </p>
);

export const ReportDocument = React.forwardRef<HTMLDivElement, ReportDocumentProps>((p, ref) => {
  const { summary } = p;
  const monthText = p.referenceMonthLabel?.trim() || monthLabel(p.monthYear);
  const columns = splitInColumns(summary.rows, p.nominataColumns);
  const showPF = p.nominataColumns === 2;
  const totalEventPublic = p.events.reduce((n, e) => n + (p.eventPublicCounts[e.id] || 0), 0);

  // Linha do tempo de atividades (ensaios + eventos), em ordem cronológica
  const timeline = [
    ...summary.perSession.map((s) => ({
      date: s.session.date,
      text: `${s.session.category || 'Ensaio'} — ${s.present} presente(s) e ${s.absent} falta(s)${
        s.rate !== null ? ` (${s.rate}% de frequência)` : ''
      }`,
    })),
    ...p.events.map((e) => ({
      date: e.date,
      text: `Evento: ${e.name}${e.locationAddress ? ` — ${e.locationAddress}` : ''}${
        p.eventPublicCounts[e.id] ? ` (${p.eventPublicCounts[e.id]} pessoas de público)` : ''
      }`,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div
      ref={ref}
      className="bg-white text-gray-900 font-sans"
      style={{ width: '794px', padding: '36px 40px', boxSizing: 'border-box' }}
    >
      {/* CABEÇALHO */}
      <header style={avoid} className="rounded-3xl bg-charcoal text-white px-6 py-5 flex items-start justify-between gap-6">
        <div className="space-y-1">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-300">
            {p.entityName || 'Sociedade Cultural Cruzeiro do Sul'}
          </p>
          <h1 className="text-[20px] font-black leading-tight tracking-tight">Relatório de Execução das Atividades</h1>
          <p className="text-[11px] font-semibold text-gray-300">{p.projectTitle}</p>
          <p className="text-[10px] text-gray-400">{p.fundingAgreementNo} · {p.grantorName}</p>
        </div>
        <div className="text-right shrink-0 space-y-1.5">
          <span className="inline-block bg-amber-400 text-amber-950 text-[11px] font-black rounded-full px-3.5 py-1">
            Mês de referência: {monthText}
          </span>
          <p className="text-[11px] font-bold">{p.schoolName}</p>
        </div>
      </header>

      {/* 1. ATIVIDADES */}
      <SectionTitle n="1">Descrição das atividades planejadas / executadas</SectionTitle>
      <TextBlock>
        {p.activitiesFocus?.trim()
          ? `Ensaios com foco em ${p.activitiesFocus.trim().replace(/\.$/, '')}.`
          : 'Ensaios voltados ao aprimoramento técnico e pedagógico dos alunos.'}
      </TextBlock>
      {timeline.length > 0 && (
        <ul className="mt-2.5 space-y-1">
          {timeline.map((t, i) => (
            <li key={i} style={avoid} className="flex gap-2 text-[11px] leading-snug">
              <span className="font-black text-gray-900 w-11 shrink-0">{fmtShort(t.date)}:</span>
              <span className="text-gray-700">{t.text}</span>
            </li>
          ))}
        </ul>
      )}

      {/* 2. PÚBLICO BENEFICIÁRIO + CHAMADA */}
      <SectionTitle n="2">Público beneficiário e frequência</SectionTitle>

      <div style={avoid} className="grid grid-cols-6 gap-2">
        <Stat label="Alunos atendidos" value={summary.totalStudents} tone="amber" />
        <Stat label="Meninos" value={summary.boys} />
        <Stat label="Meninas" value={summary.girls} />
        <Stat label="Total de presenças" value={summary.totalPresences} tone="mint" />
        <Stat label="Total de faltas" value={summary.totalAbsences} tone="coral" />
        <Stat label="Frequência média" value={pct(summary.averageRate)} tone="amber" />
      </div>

      <div style={avoid} className="grid grid-cols-2 gap-3 mt-3">
        <table className="w-full text-[10.5px] border border-gray-300 rounded-xl overflow-hidden">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="text-left px-2.5 py-1.5 font-black">Categoria</th>
              <th className="w-12 text-center px-2 py-1.5 font-black">Alunos</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Crianças (até 11 anos)', summary.audience.children],
              ['Adolescentes (12 a 17 anos)', summary.audience.teens],
              ['Outros (18 anos ou mais)', summary.audience.others],
            ].map(([label, n]) => (
              <tr key={label as string} className="border-t border-gray-200">
                <td className="px-2.5 py-1.5">{label}</td>
                <td className="text-center font-black">{n}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className="w-full text-[10.5px] border border-gray-300">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="text-left px-2.5 py-1.5 font-black">Eventos e apresentações</th>
              <th className="w-16 text-center px-2 py-1.5 font-black">Público</th>
            </tr>
          </thead>
          <tbody>
            {p.events.length === 0 && (
              <tr className="border-t border-gray-200">
                <td colSpan={2} className="px-2.5 py-1.5 text-gray-500 italic">Nenhum evento no mês.</td>
              </tr>
            )}
            {p.events.map((e) => (
              <tr key={e.id} className="border-t border-gray-200">
                <td className="px-2.5 py-1.5">{e.name} <span className="text-gray-500">({fmtDate(e.date)})</span></td>
                <td className="text-center font-black">{p.eventPublicCounts[e.id] || 0}</td>
              </tr>
            ))}
            {p.events.length > 1 && (
              <tr className="border-t border-gray-300 bg-gray-50">
                <td className="px-2.5 py-1.5 font-black">Total</td>
                <td className="text-center font-black">{totalEventPublic}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Frequência por encontro */}
      {summary.perSession.length > 0 && (
        <table style={avoid} className="w-full text-[10.5px] border border-gray-300 mt-3">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="text-left px-2.5 py-1.5 font-black">Encontro</th>
              <th className="text-left px-2 py-1.5 font-black">Categoria</th>
              <th className="text-center px-2 py-1.5 font-black">Presentes</th>
              <th className="text-center px-2 py-1.5 font-black">Faltas</th>
              <th className="text-center px-2 py-1.5 font-black">Frequência</th>
            </tr>
          </thead>
          <tbody>
            {summary.perSession.map((s, i) => (
              <tr key={s.session.id} className="border-t border-gray-200">
                <td className="px-2.5 py-1.5 font-bold">{i + 1}º — {fmtDate(s.session.date)}</td>
                <td className="px-2 py-1.5">{s.session.category || 'Ensaio'}</td>
                <td className="text-center font-black text-emerald-800">{s.present}</td>
                <td className="text-center font-black text-rose-700">{s.absent}</td>
                <td className="text-center font-bold">{pct(s.rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Nominata em colunas */}
      <p className="text-[10px] font-black uppercase tracking-wider text-gray-500 mt-4 mb-1.5">
        Nominata dos alunos — idade, sexo e frequência no mês
      </p>
      {summary.rows.length === 0 ? (
        <TextBlock>Nenhum aluno com chamada registrada neste mês.</TextBlock>
      ) : (
        <div style={avoid} className="flex gap-2 items-start">
          {columns.map((col, ci) => {
            const offset = columns.slice(0, ci).reduce((n, c) => n + c.length, 0);
            return (
              <table key={ci} className="flex-1 text-[9px] border border-gray-300" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '18px' }} />
                  <col />
                  <col style={{ width: '22px' }} />
                  <col style={{ width: '16px' }} />
                  {showPF && <col style={{ width: '16px' }} />}
                  {showPF && <col style={{ width: '16px' }} />}
                  <col style={{ width: '28px' }} />
                </colgroup>
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="py-1 font-black">Nº</th>
                    <th className="py-1 text-left px-1 font-black">Aluno</th>
                    <th className="py-1 font-black">Id.</th>
                    <th className="py-1 font-black">Sx</th>
                    {showPF && <th className="py-1 font-black text-emerald-800">P</th>}
                    {showPF && <th className="py-1 font-black text-rose-700">F</th>}
                    <th className="py-1 font-black">Freq.</th>
                  </tr>
                </thead>
                <tbody>
                  {col.map((r, i) => (
                    <tr key={r.student.id} style={avoid} className="border-t border-gray-200">
                      <td className="text-center text-gray-500 py-[3px]">{offset + i + 1}</td>
                      <td className="px-1 py-[3px] font-semibold truncate">{r.student.name}</td>
                      <td className="text-center">{r.student.age}</td>
                      <td className="text-center">{r.student.gender === 'F' ? 'F' : 'M'}</td>
                      {showPF && <td className="text-center font-bold text-emerald-800">{r.present}</td>}
                      {showPF && <td className="text-center font-bold text-rose-700">{r.absent}</td>}
                      <td className="text-center font-black">{pct(r.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })}
        </div>
      )}
      <p className="text-[8.5px] text-gray-500 mt-1">Id. = idade · Sx = sexo (M/F) · P = presenças · F = faltas · Freq. = presenças ÷ chamadas do aluno</p>

      {/* 3 a 6 */}
      <SectionTitle n="3">Indicadores de resultado e impacto</SectionTitle>
      <TextBlock>{p.impactIndicators?.trim() || 'Manutenção dos indicadores de evolução pedagógica e engajamento dos alunos.'}</TextBlock>

      <SectionTitle n="4">Monitoramento e avaliação</SectionTitle>
      <TextBlock>{p.monitoringEvaluation?.trim() || 'Acompanhamento diário de frequência e assiduidade, com registro fotográfico dos encontros.'}</TextBlock>

      <SectionTitle n="5">Dificuldades encontradas</SectionTitle>
      <TextBlock>{p.hasDifficulties ? p.difficultiesDetails : NO_DIFFICULTIES}</TextBlock>

      <SectionTitle n="6">Resultados alcançados</SectionTitle>
      <TextBlock>{p.hasDifficulties ? p.achievedResults : NO_ACTIONS}</TextBlock>

      {/* 7. COMPROVAÇÃO */}
      <SectionTitle n="7">Documentos comprobatórios anexados</SectionTitle>
      {p.rehearsalPhotos.length + p.eventPhotos.length === 0 ? (
        <TextBlock>Nenhuma foto selecionada para este relatório.</TextBlock>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {p.rehearsalPhotos.map((photo, i) => {
            const d = photo.originalTimestamp || photo.date || photo.createdAt;
            return (
              <figure key={`r${i}`} style={avoid} className="rounded-2xl border border-gray-200 p-2 bg-white">
                <img src={photo.photoUrl} alt="Ensaio" className="w-full h-40 object-cover rounded-xl" crossOrigin="anonymous" />
                <figcaption className="mt-1.5 text-[9.5px] leading-tight">
                  <b>{fmtDate(d)}{fmtTime(d) ? ` às ${fmtTime(d)}` : ''}</b>
                  <span className="block text-gray-600">Ensaio · {p.schoolName}</span>
                </figcaption>
              </figure>
            );
          })}
          {p.eventPhotos.map((item, i) => {
            const d = item.photo.createdAt || item.event.date;
            return (
              <figure key={`e${i}`} style={avoid} className="rounded-2xl border border-gray-200 p-2 bg-white">
                <img src={item.photo.photoUrl} alt="Evento" className="w-full h-40 object-cover rounded-xl" crossOrigin="anonymous" />
                <figcaption className="mt-1.5 text-[9.5px] leading-tight">
                  <b>{fmtDate(d)}{fmtTime(d) ? ` às ${fmtTime(d)}` : ''}</b>
                  <span className="block text-gray-600">Evento: {item.event.name} · {p.schoolName}</span>
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}

      {/* ANEXO: REGISTRO DIÁRIO DE CHAMADA */}
      {summary.sessions.length > 0 && summary.rows.length > 0 && (
        <div style={{ pageBreakBefore: 'always', breakBefore: 'page' }}>
          <SectionTitle>Anexo — Registro diário de chamada</SectionTitle>
          <table className="w-full text-[9px] border border-gray-300" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '22px' }} />
              <col />
              <col style={{ width: '22px' }} />
              <col style={{ width: '16px' }} />
              {summary.sessions.map((s) => (
                <col key={s.id} style={{ width: '30px' }} />
              ))}
              <col style={{ width: '20px' }} />
              <col style={{ width: '20px' }} />
              <col style={{ width: '32px' }} />
            </colgroup>
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="py-1 font-black">Nº</th>
                <th className="py-1 text-left px-1 font-black">Aluno</th>
                <th className="py-1 font-black">Id.</th>
                <th className="py-1 font-black">Sx</th>
                {summary.sessions.map((s) => (
                  <th key={s.id} className="py-1 font-black">{fmtShort(s.date)}</th>
                ))}
                <th className="py-1 font-black text-emerald-800">P</th>
                <th className="py-1 font-black text-rose-700">F</th>
                <th className="py-1 font-black">Freq.</th>
              </tr>
            </thead>
            <tbody>
              {summary.rows.map((r, i) => (
                <tr key={r.student.id} style={avoid} className="border-t border-gray-200">
                  <td className="text-center text-gray-500 py-[3px]">{i + 1}</td>
                  <td className="px-1 font-semibold truncate">{r.student.name}</td>
                  <td className="text-center">{r.student.age}</td>
                  <td className="text-center">{r.student.gender === 'F' ? 'F' : 'M'}</td>
                  {r.marks.map((m, j) => (
                    <td
                      key={j}
                      className={`text-center font-black ${
                        m === 'P' ? 'text-emerald-700 bg-emerald-50' : m === 'F' ? 'text-rose-700 bg-rose-50' : 'text-gray-300'
                      }`}
                    >
                      {m === '-' ? '–' : m}
                    </td>
                  ))}
                  <td className="text-center font-bold">{r.present}</td>
                  <td className="text-center font-bold">{r.absent}</td>
                  <td className="text-center font-black">{pct(r.rate)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-400 bg-gray-50 font-black">
                <td colSpan={4} className="px-1 py-1 text-right">Presentes no dia</td>
                {summary.perSession.map((s) => (
                  <td key={s.session.id} className="text-center text-emerald-800">{s.present}</td>
                ))}
                <td className="text-center text-emerald-800">{summary.totalPresences}</td>
                <td className="text-center text-rose-700">{summary.totalAbsences}</td>
                <td className="text-center">{pct(summary.averageRate)}</td>
              </tr>
            </tbody>
          </table>
          <p className="text-[8.5px] text-gray-500 mt-1">P = presente · F = falta · – = sem registro de chamada para o aluno na data</p>
        </div>
      )}

      {/* LOCAL, DATA E ASSINATURAS */}
      <footer style={avoid} className="mt-8 pt-4 border-t-2 border-gray-900 space-y-6">
        <p className="text-[11px] font-semibold">
          Local e data: {p.locationCityDate}
        </p>
        <div className="grid grid-cols-2 gap-10 text-center">
          <div>
            <div className="border-b border-gray-900 h-10" />
            <p className="text-[11px] font-black mt-1.5">{p.instructorName}</p>
            {p.instructorCpf && <p className="text-[9.5px] text-gray-600">CPF: {p.instructorCpf}</p>}
            <p className="text-[9.5px] font-bold uppercase text-gray-500">Professor / Instrutor do projeto</p>
          </div>
          <div>
            <div className="border-b border-gray-900 h-10" />
            <p className="text-[11px] font-black mt-1.5">{p.directorName}</p>
            <p className="text-[9.5px] font-bold uppercase text-gray-500">Direção — {p.schoolName}</p>
          </div>
        </div>
        <p className="text-center text-[9px] text-gray-500">
          {p.entityName || 'Sociedade Cultural Cruzeiro do Sul'} · Responsável técnico: {p.responsibleName}
        </p>
      </footer>
    </div>
  );
});

ReportDocument.displayName = 'ReportDocument';
