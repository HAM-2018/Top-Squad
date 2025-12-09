"use client"
import ChallengeLegend from "@/components/ui/customLegend";
import { Bar, BarChart, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";


function formatTime(seconds: number) {
  const min = Math.floor(seconds / 60).toString().padStart(2, "0");
  const sec = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${min}:${sec}`;
};

//DUMMY DATA
const data = [
  { name: "You", time: 752, display: formatTime(752) },     // 12:32
  { name: "Ava", time: 810, display: formatTime(810) },
  { name: "Eli", time: 690, display: formatTime(690) },
  { name: "Mia", time: 920, display: formatTime(920) },
  { name: "Noah", time: 840, display: formatTime(840) },
  { name: "Liam", time: 780, display: formatTime(780) },
  { name: "Emma", time: 995, display: formatTime(995) },
  { name: "Olivia", time: 720, display: formatTime(720) },
  { name: "James", time: 860, display: formatTime(860) },
  { name: "Sophia", time: 705, display: formatTime(705) },
];


export default function IndividualChallengeScores() {
  const user = data.find((d) => d.name === "You");
  const others = data.filter((d) => d.name !== "You");
  const topTen = [...others]
  .sort((a, b) => a.time - b.time).slice(0, 10);
  const topTenAndUser = [user, ...topTen];

    return (
       <ResponsiveContainer height={350} width="100%">
          <BarChart data={topTenAndUser} className="[&_.recharts-tooltip-cursor]:fill-zinc-200 dark:[&_.recharts-tooltip-cursor]:fill-zinc-800">
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
              {topTenAndUser.map((entry, index) => (
                <Cell
                key={`cell-${index}`}
                fill={entry!.name === "You" ? "#22c55e" : "#f43f5e"} />
              ))}
            </Bar>
          </BarChart>
       </ResponsiveContainer>
    )
}