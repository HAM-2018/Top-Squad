import { formatScore } from "@/lib/formatScore";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartColors } from "@/lib/chartColors";

type ProgressPoint = {
  t: string;
  [key: string]: number | string | null;
};

export default function TeamLineGraph({
  data,
  teamKeys,
  reversed = false,
  metric,
  unit,
  isOverall = false
}:{
  data: ProgressPoint[];
  teamKeys: {key: string; name: string; isMyTeam: boolean}[];
  reversed: boolean;
  metric: "time" | "distance" | "reps" | "weight";
  unit: string | null;
  isOverall: boolean;
}) {
  if (!data.length) return <div className="text-muted-foreground">No history yet.</div>;

  const format = (v: number) => (isOverall ? `${v} pts` : formatScore(v, metric, unit));

  return (
    <ResponsiveContainer height={350} width="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis fontSize={12} dataKey="t" />
        <YAxis 
        fontSize={12}
        allowDecimals={false}
        reversed={isOverall ? false : reversed}
        tickFormatter={(v) => format(v)}
        />
        <Tooltip formatter={(v) => typeof v === "number" ? format(v) : v}
        wrapperClassName=" !text-sm dark:!bg-black rounded-md dark:!border-border"
        labelClassName="font-bold" />
        <Legend formatter={(value) => <span className="capitalize">{value}</span> } />
        {teamKeys.map((t, index) => (
          <Line
            key={t.key}
            type="monotone"
            dataKey={t.key}
            name={t.name}
            connectNulls
            dot={false}
            strokeWidth={t.isMyTeam ? 3 : 2}
            stroke={chartColors[index % chartColors.length]}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
