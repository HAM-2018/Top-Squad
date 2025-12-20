import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { HandshakeIcon, MedalIcon, PartyPopperIcon, TimerIcon, UsersIcon } from "lucide-react";
import { formatScore, metricCapitalize } from "@/lib/formatScore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import hs from '@/public/images/thailand.jpg';
import Image from "next/image";
import { TeamChallengeStats } from "@/types/TeamChallengeStats";
import { useState } from "react";

export default function TeamChallenges({
    initialStats,
}: {
    initialStats: TeamChallengeStats | null
}) {
    
    if (!initialStats) {
    return <div className="text-muted-foreground">No team challenge data available yet.</div>;
    }

    const hasMultipleParts = initialStats.parts.length > 1;

    const [selected, setSelected] = useState<string>(() => {
    if (!hasMultipleParts) return String(initialStats.parts[0]?.partId ?? "");
    return "overall";
    });

    // selected part (if not overall)
    const selectedPart =
    hasMultipleParts
        ? initialStats.parts.find((p) => String(p.partId) === selected) ?? null
        : initialStats.parts[0] ?? null;

    const isOverall = hasMultipleParts && selected === "overall";

    // TEAM RANK / TOTAL TEAMS
    const myRank = isOverall ? initialStats.overall.myTeamRank : selectedPart?.myTeamRank ?? null;
    const totalCompetitors = isOverall
    ? initialStats.overall.totalTeams
    : selectedPart?.totalTeams ?? 0;

    // LABEL (what event are we showing)
    const label = isOverall
    ? "Overall"
    : selectedPart
    ? `${selectedPart.partName} • ${metricCapitalize(selectedPart.metric)}`
    : "—";

    // VALUE (team score)
    const value = isOverall
    ? initialStats.overall.myTeamPoints !== null
        ? `${initialStats.overall.myTeamPoints} pts`
        : "—"
    : selectedPart && selectedPart.myTeamValue !== null
    ? formatScore(selectedPart.myTeamValue, selectedPart.metric, selectedPart.unit)
    : "—";

    const rankingPercentage =
    myRank !== null && totalCompetitors > 0
        ? Math.round((myRank / totalCompetitors) * 100)
        : null;


    return (
        <>
        <div className="grid lg:grid-cols-3 gap-4">
            <Card className="flex flex-col">
            <CardHeader className="py-0">
                <CardTitle className="text-xl flex items-center justify-between border-b border-rose-500 pb-1">
                Team Performance <HandshakeIcon size={40} />
                </CardTitle>
            </CardHeader>

            <CardContent className="flex flex-col gap-3 pt-0">
                {/* Dropdown: only show Overall if multiple parts */}
                <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                    {hasMultipleParts ? <SelectItem value="overall">Overall</SelectItem> : null}
                    {initialStats.parts.map((p) => (
                    <SelectItem key={p.partId} value={String(p.partId)}>
                        {p.partName}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>

                <div className="flex items-center justify-between">
                <span className="text-sm uppercase tracking-wide text-muted-foreground">
                    Ranking
                </span>
                <span className="text-3xl font-semibold">
                    {myRank !== null ? `#${myRank}` : "—"}
                </span>
                </div>

                <div className="h-px bg-border/60" />

                <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm uppercase tracking-wide text-muted-foreground">
                    {label}
                </span>
                <span className="font-mono text-4xl font-bold tabular-nums">
                    {value}
                </span>
                </div>
            </CardContent>
            </Card>

            <Card>
                <CardHeader className="py-0">
                    <CardTitle className="text-xl flex items-center justify-between border-b border-rose-500 pb-1">
                        Teams competing <UsersIcon size={40} />
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-between">
                    
                </CardContent>
               
            </Card>
            <Card className="border-rose-500 min-h-[180px] flex flex-col">
                <CardHeader className="py-0">
                    <CardTitle className="text-xl flex items-center justify-between border-b border-rose-500 pb-1">
                        First place Team <MedalIcon size={40} />
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex gap-2 items-center">
                    <Avatar>
                        <Image src={hs} alt="First-place avatar"/>
                        <AvatarFallback>
                            HS
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-2xl">RLTW!</span>
                </CardContent>
                <CardFooter className="flex gap-2 items-center text-xs text-muted-foreground mt-auto">
                    <PartyPopperIcon className="text-rose-500" />
                    <span>Keep up the good work!</span>
                </CardFooter>
            </Card>
        </div>
        <Card className="my-4">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TimerIcon />
                    <span>Current Team scores</span>   
                </CardTitle>
            </CardHeader>
            <CardContent className="pl-0">
                Line Graph 
            </CardContent>
        </Card>
        </>
    )
}