"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export interface RevenueSource {
  id: string;
  label: string;
  value: string;
  numericValue: number;
  colorClass?: string;
  fill?: string;
  opacity?: number;
}

export interface RevenueWidgetProps {
  title?: string;
  data?: RevenueSource[];
  period?: string;
  className?: string;
  totalAttended?: number;
}

const defaultData: RevenueSource[] = [
  {
    id: "alunos",
    label: "Alunos em Ensaios",
    value: "215",
    numericValue: 215,
    fill: "#00b8d9",
  },
  {
    id: "eventos",
    label: "Público em Eventos",
    value: "180",
    numericValue: 180,
    fill: "#00b8d9",
    opacity: 0.7,
  },
];

export function RevenueWidget({
  title = "Público Atendido",
  data = defaultData,
  className = "",
  totalAttended,
}: RevenueWidgetProps) {
  const calculatedTotal = React.useMemo(() => {
    if (totalAttended !== undefined) return totalAttended;
    return data.reduce((sum, item) => sum + (item.numericValue || 0), 0);
  }, [data, totalAttended]);

  const chartData = React.useMemo(() => {
    return data.map((item) => ({
      ...item,
      fill: item.fill || "#00b8d9",
      opacity: item.opacity ?? 1,
    }));
  }, [data]);

  return (
    <div className={`w-full max-w-full ${className}`}>
      <Card className="text-slate-900 w-full border-0 bg-transparent shadow-none p-0">
        <CardContent className="flex flex-col items-center gap-4 p-0">
          <div className="w-full text-center sm:text-start">
            <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
              {title}
            </h3>
          </div>

          <div className="relative h-44 w-44 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius="68%"
                  outerRadius="95%"
                  paddingAngle={4}
                  dataKey="numericValue"
                  stroke="none"
                  cornerRadius={4}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.id || index}`}
                      fill={entry.fill}
                      fillOpacity={entry.opacity}
                      className="cursor-pointer transition-all duration-300 outline-none hover:opacity-80"
                    />
                  ))}
                </Pie>
                <Tooltip
                  cursor={false}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="border border-slate-200 bg-slate-900/90 text-white flex flex-col gap-0.5 rounded-xl p-2.5 shadow-lg backdrop-blur-md">
                          <span className="text-cyan-300 text-[10px] font-extrabold uppercase">
                            {payload[0].payload.label}
                          </span>
                          <span className="text-white text-xs font-black">
                            {payload[0].payload.value}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Bold Center Total Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {calculatedTotal.toLocaleString("pt-BR")}
              </span>
              <span className="text-[10px] font-extrabold text-cyan-700 uppercase tracking-wider mt-0.5">
                TOTAL ATENDIDOS
              </span>
            </div>
          </div>

          <p className="text-slate-500 text-xs font-medium text-center">
            Consolidado de presença em ensaios e público em apresentações
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default RevenueWidget;
export { RevenueWidget as Widget4 };
