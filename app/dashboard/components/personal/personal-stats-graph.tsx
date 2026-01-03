"use client"
import ChallengeLegend from "@/components/ui/soloGraphLegend";
import { Bar, BarChart, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatScore } from "@/lib/formatScore";

type ChartRow = {
  name: string;
  value: number;
  isMe?: boolean;
};


export default function IndividualChallengeScores({
  rows,
  metric,
  unit,
  isOverall = false
}: {
  rows: ChartRow[];
  metric: "time" | "distance" | "reps" | "weight";
  unit?: string | null,
  isOverall?: boolean
}) {

  if (!rows.length) {
    return <div className="text-muted-foreground">No scores yet.</div>;
  }
   const format = (v: number) => (isOverall ? `${v} pts` : formatScore(v, metric, unit));

    return (
       <ResponsiveContainer height={350} width="100%">
          <BarChart data={rows} className="[&_.recharts-tooltip-cursor]:fill-zinc-200 dark:[&_.recharts-tooltip-cursor]:fill-zinc-800">
            <XAxis dataKey="name" stroke="#888888" fontSize={12} />
            <YAxis 
            stroke="#888888" 
            fontSize={12}
            tickFormatter={(value) => format(Number(value))} 
            />
            <Tooltip separator=": " wrapperClassName=" !text-sm rounded-md dark:!border-border"
              labelClassName="font-bold"
              formatter={(value) => format(Number(value))}
              labelFormatter={(label) => label}
              contentStyle={{
              backgroundColor: "var(--tooltip-bg)",
              borderRadius: "6px",
              borderColor: "var(--tooltip-border)"
              }}
              itemStyle={{color: "var(--tooltip-text)"}}
              />
            <Legend content={<ChallengeLegend />} />
            <Bar 
            dataKey="value"
            name={isOverall ? "Points" : metric}
            radius={[4, 4, 0, 0]}
            >
              {rows.map((entry, index) => (
                <Cell
                key={`cell-${index}`}
                fill={entry!.isMe ? "#22c55e" : "#f43f5e"} />
              ))}
            </Bar>
          </BarChart>
       </ResponsiveContainer>
    )
}