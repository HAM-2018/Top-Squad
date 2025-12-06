"use client"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

//DUMMY DATA
const data = [
  { name: "You", time: 752 },    // 12:32
  { name: "Ava", time: 810 },
  { name: "Eli", time: 690 },
  { name: "Mia", time: 920 },
  { name: "Noah", time: 840 },
  { name: "Liam", time: 780 },
  { name: "Emma", time: 995 },
  { name: "Olivia", time: 720 },
  { name: "James", time: 860 },
  { name: "Sophia", time: 705 },
  // ...add all competitors
];


export default function IndividualChallengeScores() {
    return (
       <div className="w-full overflow-x-auto">
      {/* Make chart wider than container so it scrolls horizontally */}
      <div className="min-w-[1200px] h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" tickLine={false} axisLine={false} />
            <YAxis hide />
            <Tooltip formatter={(value) => `${value} sec`} />
            <Bar
              dataKey="time"
              fill="#f43f5e"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
    )
}