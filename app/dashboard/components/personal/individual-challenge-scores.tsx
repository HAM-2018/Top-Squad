"use client"
import ChallengeLegend from "@/components/ui/customLegend";
import { Bar, BarChart, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatTime } from "@/lib/formatTime";

type ChartRow = {
  name: string;
  time: number;
};


export default function IndividualChallengeScores({
  rows,
}: {
  rows: ChartRow[];
}) {

  if (!rows.length) {
    return <div className="text-muted-foreground">No scores yet.</div>;
  }

    return (
       <ResponsiveContainer height={350} width="100%">
          <BarChart data={rows} className="[&_.recharts-tooltip-cursor]:fill-zinc-200 dark:[&_.recharts-tooltip-cursor]:fill-zinc-800">
            <XAxis dataKey="name" stroke="#888888" fontSize={12} />
            <YAxis 
            stroke="#888888" 
            fontSize={12}
            tickFormatter={(value) => formatTime(value)} 
            />
            <Tooltip separator=": " wrapperClassName=" !text-sm rounded-md dark:!border-border"
              labelClassName="font-bold"
              formatter={(value) => formatTime(value as number)}
              labelFormatter={(label) => label}
              contentStyle={{
              backgroundColor: "var(--tooltip-bg)",
              borderRadius: "6px",
              borderColor: "var(--tooltip-border)"
              }}
              itemStyle={{color: "var(--tooltip-text)"}}
              />
            <Legend content={<ChallengeLegend />} />
            <Bar dataKey="time" radius={[4, 4, 0, 0]}>
              {rows.map((entry, index) => (
                <Cell
                key={`cell-${index}`}
                fill={entry!.name === "You" ? "#22c55e" : "#f43f5e"} />
              ))}
            </Bar>
          </BarChart>
       </ResponsiveContainer>
    )
}