import { Line, LineChart, ResponsiveContainer } from "recharts";

type ProgressPoint = {
        date: string;
        [key: string]: number | string;
    };

export default function TeamLineGraph({
    data,
    teamKeys,
    myTeamKey,
}:{
    data: ProgressPoint[];
    teamKeys: {key: string; name: string; isMyTeam: boolean}[];
    myTeamKey?: string;
}) {

    
    return (
        <ResponsiveContainer height={350} width="100%">
            <LineChart data={data}>
                {teamKeys.map((t) => (
                    <Line
                    dataKey={t.key}
                    name={t.key}
                    strokeWidth={t.isMyTeam ? 3 : 2} />
                ))}
            </LineChart>
        </ResponsiveContainer>
    )
}