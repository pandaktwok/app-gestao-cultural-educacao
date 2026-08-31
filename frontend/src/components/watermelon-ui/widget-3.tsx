"use client";

import React, { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface FrequencyDataPoint {
  day: string;
  presentes: number;
  faltas: number;
  desistencias: number;
}

export interface FrequencyChannel {
  key: keyof Omit<FrequencyDataPoint, "day">;
  label: string;
  color: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
}

export interface SalesBreakdownWidgetProps {
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  data?: FrequencyDataPoint[];
  channels?: FrequencyChannel[];
  period?: "dia" | "semana" | "mes" | string;
  className?: string;
  onActionClick?: () => void;
}

// Display order for bottom legend pills: Crianças Atendidas, Faltas, Desistências
const defaultLegendPills: FrequencyChannel[] = [
  {
    key: "presentes",
    label: "Crianças Atendidas",
    color: "#00b8d9",
    bgClass: "bg-cyan-50",
    borderClass: "border-cyan-100",
    textClass: "text-cyan-900",
  },
  {
    key: "faltas",
    label: "Faltas",
    color: "#7f56d9",
    bgClass: "bg-purple-50",
    borderClass: "border-purple-100",
    textClass: "text-purple-900",
  },
  {
    key: "desistencias",
    label: "Desistências",
    color: "#e040fb",
    bgClass: "bg-pink-50",
    borderClass: "border-pink-100",
    textClass: "text-pink-900",
  },
];

// Stack order for rendering <Bar> components: Desistências at bottom, Faltas in middle, Presentes at top
const stackRenderOrder = [
  {
    key: "desistencias",
    label: "Desistências",
    color: "#e040fb",
  },
  {
    key: "faltas",
    label: "Faltas",
    color: "#7f56d9",
  },
  {
    key: "presentes",
    label: "Crianças Atendidas",
    color: "#00b8d9",
  },
];

const defaultDiaData: FrequencyDataPoint[] = [
  { day: "06/07", presentes: 28, faltas: 3, desistencias: 0 },
  { day: "08/07", presentes: 30, faltas: 2, desistencias: 1 },
  { day: "13/07", presentes: 29, faltas: 4, desistencias: 0 },
  { day: "15/07", presentes: 32, faltas: 1, desistencias: 0 },
  { day: "20/07", presentes: 27, faltas: 5, desistencias: 1 },
  { day: "22/07", presentes: 31, faltas: 2, desistencias: 0 },
];

const defaultSemanaData: FrequencyDataPoint[] = [
  { day: "Sem 1", presentes: 58, faltas: 6, desistencias: 1 },
  { day: "Sem 2", presentes: 62, faltas: 4, desistencias: 0 },
  { day: "Sem 3", presentes: 60, faltas: 7, desistencias: 1 },
  { day: "Sem 4", presentes: 65, faltas: 3, desistencias: 0 },
];

const defaultMesData: FrequencyDataPoint[] = [
  { day: "Jan", presentes: 78, faltas: 12, desistencias: 2 },
  { day: "Fev", presentes: 85, faltas: 15, desistencias: 1 },
  { day: "Mar", presentes: 92, faltas: 10, desistencias: 0 },
  { day: "Abr", presentes: 95, faltas: 18, desistencias: 3 },
  { day: "Mai", presentes: 88, faltas: 14, desistencias: 1 },
  { day: "Jun", presentes: 98, faltas: 8, desistencias: 0 },
  { day: "Jul", presentes: 91, faltas: 11, desistencias: 2 },
  { day: "Ago", presentes: 99, faltas: 6, desistencias: 1 },
  { day: "Set", presentes: 84, faltas: 16, desistencias: 2 },
  { day: "Out", presentes: 89, faltas: 13, desistencias: 1 },
  { day: "Nov", presentes: 93, faltas: 9, desistencias: 0 },
  { day: "Dez", presentes: 96, faltas: 7, desistencias: 1 },
];

function CustomTooltip(props: any) {
  const { active, payload, label } = props;
  if (!active || !payload?.length) return null;

  const total = payload.reduce((sum: number, item: any) => sum + (item.value ?? 0), 0);

  return (
    <div className="bg-slate-900/90 text-white shadow-xl min-w-[130px] rounded-xl p-3 backdrop-blur-md border border-slate-800">
      <p className="text-cyan-300 mb-2 text-xs font-bold tracking-widest uppercase">
        {label}
      </p>
      <div className="flex flex-col gap-1.5">
        {[...payload].reverse().map((entry: any) => (
          <div
            key={entry.name}
            className="flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: entry.fill }}
              />
              <span className="text-slate-300 text-xs font-medium">
                {entry.name}
              </span>
            </div>
            <span className="text-white text-xs font-bold tabular-nums">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
      <div className="border-slate-700/60 mt-2 flex justify-between border-t pt-2">
        <span className="text-slate-400 text-xs font-bold">
          Total
        </span>
        <span className="text-white text-xs font-bold">{total}</span>
      </div>
    </div>
  );
}

export function SalesBreakdownWidget({
  title = "Evolução de Atendimentos & Frequência",
  subtitle = "Histórico mensal consolidado de presença e evasão",
  data,
  channels = defaultLegendPills,
  period = "mes",
  className = "",
}: SalesBreakdownWidgetProps) {
  const [hiddenKeys, setHiddenKeys] = useState<string[]>([]);

  const toggleKey = (key: string) => {
    setHiddenKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const activeData = React.useMemo(() => {
    if (data && data.length > 0) return data;
    if (period === "dia") return defaultDiaData;
    if (period === "semana") return defaultSemanaData;
    return defaultMesData;
  }, [data, period]);

  return (
    <div className={`bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between ${className}`}>
      {/* Cabeçalho Despoluído */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-violet-50 text-violet-600 rounded-2xl">
          {/* Ícone Streamline de Gráfico */}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>

      {/* Gráfico de Barras Agrupadas / Shadcn Widget-3 */}
      <div className="w-full h-64 my-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={activeData} barSize={22} barCategoryGap="0%">
            <CartesianGrid
              vertical={false}
              stroke="#f1f5f9"
              strokeDasharray="2 4"
            />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "#64748b",
                fontSize: 11,
                fontWeight: 700,
              }}
            />
            <YAxis hide axisLine={false} tickLine={false} />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                fill: "#f8fafc",
                opacity: 0.8,
                radius: 8,
              }}
            />
            {stackRenderOrder.map((channel) => {
              if (hiddenKeys.includes(channel.key)) return null;
              return (
                <Bar
                  key={channel.key}
                  dataKey={channel.key}
                  name={channel.label}
                  stackId="attendance"
                  fill={channel.color}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={true}
                  animationDuration={500}
                  animationEasing="ease-in-out"
                />
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Rodapé com a Legenda Integrada */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-100">
        {channels.map((ch) => {
          const isHidden = hiddenKeys.includes(ch.key);
          return (
            <button
              key={ch.key}
              type="button"
              onClick={() => toggleKey(ch.key)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border transition-all duration-200 select-none cursor-pointer ${ch.bgClass} ${ch.borderClass} text-xs font-medium ${ch.textClass} ${
                isHidden ? "opacity-40 line-through grayscale" : "hover:brightness-95"
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: ch.color }}
              />
              {ch.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SalesBreakdownWidget;
export { SalesBreakdownWidget as Widget3 };

