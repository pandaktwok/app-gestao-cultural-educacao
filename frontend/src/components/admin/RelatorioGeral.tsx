import React, { useEffect, useState, useCallback } from 'react';
import {
  Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, Pie, PieChart, Cell, PolarAngleAxis, PolarGrid,
  Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ChevronLeft, ChevronRight, FileDown, FileText, RefreshCw, ShieldCheck, Loader2, Trophy } from 'lucide-react';
import { api } from '../../lib/api';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const BOY = '#2563eb';
const GIRL = '#db2777';
const CYAN = '#00b8d9';
const PURPLE = '#7f56d9';

const brNow = () => new Date(Date.now() - 3 * 3600 * 1000);
const ymNow = () => `${brNow().getUTCFullYear()}-${String(brNow().getUTCMonth() + 1).padStart(2, '0')}`;
const shiftMonth = (ym: string, d: number) => {
  const [y, m] = ym.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + d, 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
};
const monthTitle = (ym: string) => `${MONTHS[Number(ym.split('-')[1]) - 1]} de ${ym.split('-')[0]}`;

async function downloadFile(url: string, filename: string) {
  const res = await api.get(url, { responseType: 'blob' });
  const href = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 2000);
}

const Kpi: React.FC<{ value: React.ReactNode; label: string; tone?: string }> = ({ value, label, tone = 'text-gray-900' }) => (
  <div className="bento-card p-4 text-center">
    <p className={`text-3xl font-black tracking-tight ${tone}`}>{value}</p>
    <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mt-1">{label}</p>
  </div>
);

const Card: React.FC<{ title: string; sub?: string; children: React.ReactNode; className?: string }> = ({ title, sub, children, className = '' }) => (
  <div className={`bento-card p-5 ${className}`}>
    <h4 className="text-sm font-extrabold text-gray-900">{title}</h4>
    {sub && <p className="text-xs text-gray-500 font-medium mb-3">{sub}</p>}
    {!sub && <div className="mb-3" />}
    {children}
  </div>
);

function ActionButton({ onClick, icon, children, primary }: { onClick: () => Promise<void> | void; icon: React.ReactNode; children: React.ReactNode; primary?: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try { await onClick(); } catch (e: any) {
          alert(e?.response?.data instanceof Blob ? 'Não foi possível gerar o arquivo. Veja se o gerador de PDF está instalado.' : e?.response?.data?.error || 'Não foi possível concluir.');
        } finally { setBusy(false); }
      }}
      className={`min-h-[42px] px-4 rounded-full text-xs font-extrabold flex items-center gap-2 transition disabled:opacity-60 ${
        primary ? 'bg-adminBlue text-white shadow-md hover:opacity-90' : 'bg-white border border-gray-300 text-gray-800 hover:bg-gray-50'
      }`}
    >
      {busy ? <Loader2 size={15} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}

// ======================= RELATÓRIO GERAL MENSAL =======================

export const RelatorioGeralMensal: React.FC = () => {
  const [month, setMonth] = useState(ymNow());
  const [data, setData] = useState<any | null>(null);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, snaps] = await Promise.all([api.get(`/admin/stats/monthly?month=${month}`), api.get('/admin/snapshots')]);
      setData(s.data);
      setSnapshots(snaps.data);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const snap = snapshots.find((x) => x.monthYear === month);
  const t = data?.totals;
  const schools: any[] = data?.schools || [];
  const active = schools.filter((s) => s.sessions > 0 || s.studentsAttended > 0);
  const maxStudents = Math.max(1, ...schools.map((s) => s.studentsAttended));
  const maxSessions = Math.max(1, ...schools.map((s) => s.sessions));
  const ranked = [...schools].sort((a, b) => b.studentsAttended - a.studentsAttended);

  return (
    <div className="space-y-6">
      <div className="bento-card p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-extrabold text-gray-900">Relatório geral da rede</h3>
          <p className="text-xs text-gray-500 font-medium">
            Todas as escolas juntas. Gerado automaticamente a partir das chamadas — sem perguntas para preencher.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-gray-100 rounded-full p-1 border">
            <button type="button" aria-label="Mês anterior" onClick={() => setMonth(shiftMonth(month, -1))} className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-white">
              <ChevronLeft size={18} />
            </button>
            <span className="px-3 text-sm font-extrabold min-w-[150px] text-center">{monthTitle(month)}</span>
            <button type="button" aria-label="Próximo mês" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= ymNow()} className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-white disabled:opacity-30">
              <ChevronRight size={18} />
            </button>
          </div>
          <ActionButton primary icon={<FileDown size={15} />} onClick={() => downloadFile(`/admin/stats/monthly/pdf?month=${month}`, `relatorio-geral-${month}.pdf`)}>
            PDF oficial
          </ActionButton>
          <ActionButton icon={<FileText size={15} />} onClick={() => downloadFile(`/admin/snapshots/${month}/markdown`, `relatorio-geral-${month}.md`)}>
            Arquivo .md
          </ActionButton>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs font-bold px-1">
        <ShieldCheck size={16} className={snap ? 'text-emerald-600' : 'text-amber-600'} />
        {snap ? (
          <span className="text-emerald-800">
            Cópia de segurança deste mês salva em {new Date(snap.generatedAt).toLocaleString('pt-BR')}
            {snap.driveFileId ? ' · também no Google Drive' : ' · só no servidor (Drive não configurado)'}.
          </span>
        ) : (
          <span className="text-amber-800">Ainda não há cópia de segurança deste mês.</span>
        )}
        <button
          type="button"
          onClick={async () => { await api.post(`/admin/snapshots/${month}/generate`); await load(); }}
          className="ml-1 inline-flex items-center gap-1 text-adminBlue hover:underline"
        >
          <RefreshCw size={12} /> Atualizar cópia agora
        </button>
      </div>

      {loading || !t ? (
        <div className="bento-card p-12 text-center text-gray-400 font-bold">Carregando…</div>
      ) : t.sessions === 0 ? (
        <div className="bento-card p-12 text-center text-gray-500 font-bold">Nenhuma chamada registrada em {monthTitle(month)}.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <Kpi value={t.studentsAttended} label="Alunos atendidos" />
            <Kpi value={t.boys} label="Meninos" tone="text-blue-700" />
            <Kpi value={t.girls} label="Meninas" tone="text-pink-700" />
            <Kpi value={t.sessions} label="Chamadas" />
            <Kpi value={`${t.attendanceRate}%`} label="Frequência média" tone="text-emerald-700" />
            <Kpi value={t.dropoutsInMonth} label="Desistências" tone="text-rose-700" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card title="Meninos e meninas" sub="Alunos que estiveram presentes no mês">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[{ name: 'Meninos', value: t.boys }, { name: 'Meninas', value: t.girls }]} dataKey="value" innerRadius={48} outerRadius={78} paddingAngle={3} label={(e: any) => `${e.value}`} labelLine={false}>
                      <Cell fill={BOY} />
                      <Cell fill={GIRL} />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Faixa etária" sub="Crianças até 11 · adolescentes 12–17 · 18+">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ n: 'Crianças', v: t.ageGroups.children }, { n: 'Adolescentes', v: t.ageGroups.teens }, { n: '18+', v: t.ageGroups.others }]}>
                    <CartesianGrid vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="n" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} hide />
                    <Tooltip />
                    <Bar dataKey="v" name="Alunos" fill={PURPLE} radius={[6, 6, 0, 0]} label={{ position: 'top', fontSize: 11, fontWeight: 700 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Alunos por escola" sub="Do maior para o menor atendimento">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ranked.map((s) => ({ n: s.schoolName.replace(/^(EMEB|Colégio Municipal)\s+/i, ''), v: s.studentsAttended }))} layout="vertical" margin={{ left: 10 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="n" width={110} tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="v" name="Alunos" fill={CYAN} radius={[0, 6, 6, 0]} label={{ position: 'right', fontSize: 11, fontWeight: 700 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card title="Ranking · mais alunos atendidos">
              <ol className="space-y-1.5">
                {ranked.map((s, i) => (
                  <li key={s.schoolId} className="flex items-center justify-between text-sm font-bold">
                    <span className="flex items-center gap-2">
                      {i === 0 ? <Trophy size={15} className="text-amber-500" /> : <span className="w-[15px] text-gray-400 text-xs">{i + 1}º</span>}
                      {s.schoolName}
                    </span>
                    <span className="text-gray-900">{s.studentsAttended}</span>
                  </li>
                ))}
              </ol>
            </Card>
            <Card title="Ranking · maior frequência">
              <ol className="space-y-1.5">
                {[...active].sort((a, b) => b.attendanceRate - a.attendanceRate).map((s, i) => (
                  <li key={s.schoolId} className="flex items-center justify-between text-sm font-bold">
                    <span className="flex items-center gap-2">
                      {i === 0 ? <Trophy size={15} className="text-amber-500" /> : <span className="w-[15px] text-gray-400 text-xs">{i + 1}º</span>}
                      {s.schoolName}
                    </span>
                    <span className="text-emerald-700">{s.attendanceRate}%</span>
                  </li>
                ))}
              </ol>
            </Card>
          </div>

          <div>
            <h3 className="text-lg font-extrabold text-gray-900 mb-3">Cada escola em detalhe</h3>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {schools.map((s) => {
                const radar = [
                  { eixo: 'Alunos', v: Math.round((s.studentsAttended / maxStudents) * 100) },
                  { eixo: 'Chamad.', v: Math.round((s.sessions / maxSessions) * 100) },
                  { eixo: 'Freq.', v: s.attendanceRate },
                ];
                const boysPct = s.studentsAttended ? Math.round((s.boys / s.studentsAttended) * 100) : 0;
                return (
                  <div key={s.schoolId} className="bento-card p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-extrabold text-gray-900">{s.schoolName}</h4>
                        <p className="text-xs text-gray-500 font-medium">{s.activeStudents} alunos matriculados · {s.sessions} chamadas · {s.events} eventos</p>
                      </div>
                      <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">{s.sessions ? `${s.attendanceRate}%` : '—'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-2 items-center">
                      <div className="h-44" title="Triângulo: alunos, chamadas e frequência (alunos e chamadas em relação ao maior da rede)">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={radar} outerRadius="55%">
                            <PolarGrid />
                            <PolarAngleAxis dataKey="eixo" tick={{ fontSize: 10, fontWeight: 700 }} />
                            <Radar dataKey="v" stroke={CYAN} fill={CYAN} fillOpacity={0.35} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-3 text-xs font-bold">
                        <div>
                          <div className="flex justify-between mb-1"><span className="text-blue-700">Meninos {s.boys}</span><span className="text-pink-700">Meninas {s.girls}</span></div>
                          <div className="h-2.5 rounded-full bg-pink-500 overflow-hidden"><div className="h-full bg-blue-600" style={{ width: `${boysPct}%` }} /></div>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 text-center">
                          {[['Crianças', s.ageGroups.children], ['Adolesc.', s.ageGroups.teens], ['18+', s.ageGroups.others]].map(([l, v]) => (
                            <div key={String(l)} className="rounded-xl bg-gray-50 border py-1.5">
                              <p className="text-base font-black text-gray-900">{v as number}</p>
                              <p className="text-[10px] text-gray-500 uppercase">{l}</p>
                            </div>
                          ))}
                        </div>
                        <p className="text-gray-600">{s.presences} presenças · {s.absences} faltas · {s.dropoutsInMonth} desist.</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ======================= RELATÓRIO ANUAL =======================

export const RelatorioAnual: React.FC = () => {
  const [year, setYear] = useState(brNow().getUTCFullYear());
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/admin/stats/annual?year=${year}`).then((r) => setData(r.data)).finally(() => setLoading(false));
  }, [year]);

  const t = data?.totals;
  const months = (data?.months || []).map((m: any) => ({ ...m, attendanceRate: m.sessions ? m.attendanceRate : null, mes: MONTHS[Number(m.monthYear.split('-')[1]) - 1].slice(0, 3) }));

  return (
    <div className="space-y-6">
      <div className="bento-card p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-extrabold text-gray-900">Relatório anual</h3>
          <p className="text-xs text-gray-500 font-medium max-w-xl">
            Reúne os 12 meses. Os meses já fechados vêm das cópias de segurança mensais, então continuam corretos mesmo que algum dado seja apagado depois.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-gray-100 rounded-full p-1 border">
            <button type="button" aria-label="Ano anterior" onClick={() => setYear(year - 1)} className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-white"><ChevronLeft size={18} /></button>
            <span className="px-4 text-sm font-extrabold">{year}</span>
            <button type="button" aria-label="Próximo ano" onClick={() => setYear(year + 1)} disabled={year >= brNow().getUTCFullYear()} className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-white disabled:opacity-30"><ChevronRight size={18} /></button>
          </div>
          <ActionButton primary icon={<FileDown size={15} />} onClick={() => downloadFile(`/admin/stats/annual/pdf?year=${year}`, `relatorio-anual-${year}.pdf`)}>
            Gerar relatório público (PDF)
          </ActionButton>
          <ActionButton icon={<FileText size={15} />} onClick={() => downloadFile(`/admin/stats/annual/markdown?year=${year}`, `relatorio-anual-${year}.md`)}>
            Arquivo .md
          </ActionButton>
        </div>
      </div>

      {loading || !t ? (
        <div className="bento-card p-12 text-center text-gray-400 font-bold">Consolidando o ano…</div>
      ) : data.monthsWithData === 0 ? (
        <div className="bento-card p-12 text-center text-gray-500 font-bold">Nenhuma chamada registrada em {year}.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <Kpi value={t.studentsAttended} label="Alunos únicos" />
            <Kpi value={t.boys} label="Meninos" tone="text-blue-700" />
            <Kpi value={t.girls} label="Meninas" tone="text-pink-700" />
            <Kpi value={t.sessions} label="Chamadas" />
            <Kpi value={`${t.attendanceRate}%`} label="Frequência média" tone="text-emerald-700" />
            <Kpi value={t.dropouts} label="Desistências" tone="text-rose-700" />
          </div>

          <Card title="Mês a mês" sub="Alunos atendidos (meninos e meninas) e frequência">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={months}>
                  <CartesianGrid vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="a" allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="b" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="a" dataKey="boys" name="Meninos" stackId="s" fill={BOY} />
                  <Bar yAxisId="a" dataKey="girls" name="Meninas" stackId="s" fill={GIRL} radius={[6, 6, 0, 0]} />
                  <Line yAxisId="b" dataKey="attendanceRate" name="Frequência %" stroke="#059669" strokeWidth={2.5} dot />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Escolas" sub="Total do ano">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase text-gray-500 text-left border-b">
                    <th className="py-2 pr-3">Escola</th><th className="px-2 text-right">Alunos</th><th className="px-2 text-right">Meninos</th><th className="px-2 text-right">Meninas</th>
                    <th className="px-2 text-right">Chamadas</th><th className="px-2 text-right">Presenças</th><th className="px-2 text-right">Faltas</th><th className="px-2 text-right">Freq.</th><th className="px-2 text-right">Eventos</th><th className="pl-2 text-right">Desist.</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.schools].sort((a: any, b: any) => b.studentsAttended - a.studentsAttended).map((s: any) => (
                    <tr key={s.schoolId} className="border-b last:border-0 font-semibold">
                      <td className="py-2.5 pr-3 font-extrabold text-gray-900">{s.schoolName}</td>
                      <td className="px-2 text-right">{s.studentsAttended}</td><td className="px-2 text-right text-blue-700">{s.boys}</td><td className="px-2 text-right text-pink-700">{s.girls}</td>
                      <td className="px-2 text-right">{s.sessions}</td><td className="px-2 text-right">{s.presences}</td><td className="px-2 text-right">{s.absences}</td>
                      <td className="px-2 text-right text-emerald-700 font-extrabold">{s.sessions ? `${s.attendanceRate}%` : '—'}</td><td className="px-2 text-right">{s.events}</td><td className="pl-2 text-right text-rose-700">{s.dropouts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
