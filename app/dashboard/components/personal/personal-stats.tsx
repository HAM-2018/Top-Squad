"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangleIcon,
  BadgeCheckIcon,
  MedalIcon,
  PartyPopperIcon,
  TimerIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import IndividualChallengeScores from "./individual-challenge-scores";
import { formatScore, metricCapitalize } from "@/lib/formatScore";
import type { MultiPartChallengeStats } from "@/types/individualchallengeStats";
import { useState } from "react";
import { initialsFromName } from "@/lib/initialsFromName";

export default function IndividualChallenges({
  initialStats,
}: {
  initialStats: MultiPartChallengeStats | null;
}) {
  if (!initialStats) {
    return (
      <div className="text-muted-foreground">
        No challenge data available yet.
      </div>
    );
  }

  const hasMultipleParts = initialStats.parts.length > 1;

  const [selected, setSelected] = useState<string>(() => {
    if (!hasMultipleParts) return String(initialStats.parts[0]?.partId ?? "");
    return "overall";
  });

  // If only one part do not allow "Overall" selection
  const selectedPart =
    hasMultipleParts
      ? initialStats.parts.find((p) => String(p.partId) === selected) ?? null
      : initialStats.parts[0] ?? null;

  const isOverall = hasMultipleParts && selected === "overall";

  const myRank = isOverall ? initialStats.overall.myRank : selectedPart?.myRank ?? null;
  const totalCompetitors = isOverall
    ? initialStats.overall.totalCompetitors
    : selectedPart?.totalCompetitors ?? 0;

  const label = isOverall
    ? "Overall"
    : selectedPart
    ? `${selectedPart.partName} • ${metricCapitalize(selectedPart.metric)}`
    : "—";

  const value = isOverall
    ? initialStats.overall.myPoints !== null
      ? `${initialStats.overall.myPoints} pts`
      : "—"
    : selectedPart && selectedPart.myValue !== null
    ? formatScore(selectedPart.myValue, selectedPart.metric, selectedPart.unit)
    : "—";

  const rankingPercentage =
    myRank !== null && totalCompetitors > 0
      ? Math.round((myRank / totalCompetitors) * 100)
      : null;

  const chartRows = isOverall
    ? initialStats.overall.chartRows
    : selectedPart?.chartRows ?? [];

    const chartData = chartRows.map(r => ({
    ...r,
    value: r.time, // normalize for chart
  }));

    const metric = isOverall ? "reps" : (selectedPart?.metric ?? "time");
    const unit = isOverall ? null : (selectedPart?.unit ?? null);


  return (
    <>
      <div className="grid lg:grid-cols-3 gap-4">
        {/* My Performance */}
        <Card className="flex flex-col">
          <CardHeader className="py-0">
            <CardTitle className="text-xl flex items-center justify-between border-b border-rose-500 pb-1">
              My Performance <UserIcon size={40} />
            </CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col gap-3 pt-0">
            {/* Dropdown: only show "Overall" if there are multiple parts */}
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
          {/* Competitors */}
         <Card className="flex flex-col">
          <CardHeader className="py-0">
            <CardTitle className="text-xl flex items-center justify-between border-b border-rose-500 pb-1">
              Top Competitors <UsersIcon size={40} />
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 pt-1">

            {/* Top 5 avatars */}
            <div className="flex justify-center gap-2">
              {chartRows.slice(0, 5).map((row) => {
                const initials = initialsFromName(row.name)
                return (
                  <Avatar
                    key={row.userId}
                    className="h-10 w-10 border bg-background">
                    {row.avatarUrl ? (
                      <img
                        src={row.avatarUrl}
                        alt={row.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <AvatarFallback className="text-xs font-medium">
                        {initials}
                      </AvatarFallback>
                    )}
                  </Avatar>
                );
              })}
            </div>

             {/* Top row: count + button */}
            <div className="flex items-baseline justify-between">
                <span className="text-sm uppercase tracking-wide text-muted-foreground">Total</span>
                <span className="text-3xl font-semibold tabular-nums">{totalCompetitors}</span>
            </div>
            <div className="flex justify-end">
             <Button 
             asChild size="xs"  
             className="
              h-6 px-2 text-[10px]
              border border-rose-500
              text-rose-500
              hover:bg-rose-500/10
              hover:text-rose-600" 
              variant="ghost"
              >
                <Link href="/dashboard/teams">View All</Link>

            </Button>
            </div>
          </CardContent>
          <CardFooter className="mt-auto">
            {rankingPercentage !== null ? (
              rankingPercentage < 50 ? (
                <span className="text-xs text-green-500 flex gap-1 items-center">
                  <BadgeCheckIcon />
                  You are in the top {rankingPercentage}% of all competitors
                </span>
              ) : (
                <span className="text-xs text-yellow-500 flex gap-1 items-center">
                  <AlertTriangleIcon />
                  You are in the bottom {rankingPercentage}% of all competitors
                </span>
              )
            ) : (
              <span className="text-xs text-muted-foreground">
                No ranking yet.
              </span>
            )}
          </CardFooter>
        </Card>

        {/* First place */}

        <Card className="border-rose-500 min-h-[180px] flex flex-col">
          <CardHeader className="py-0">
            <CardTitle className="text-xl flex items-center justify-between border-b border-rose-500 pb-1">
              First place <MedalIcon size={40} />
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2 items-center">
            {(() => {
              const first = chartRows?.[0];

              if (!first) {
                return (
                  <span className="text-sm text-muted-foreground">
                    No competitors yet.
                  </span>
                );
              }
              return (
                <>
                  <Avatar className="h-10 w-10 border bg-background">
                    {first.avatarUrl ? (
                      <img
                        src={first.avatarUrl}
                        alt={first.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <AvatarFallback className="text-xs font-medium">
                        {initialsFromName(first.name)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span className="text-2xl">{first.name}</span>
                </>
              );
            })()}
          </CardContent>
          <CardFooter className="flex gap-2 items-center text-xs text-muted-foreground mt-auto">
            <PartyPopperIcon className="text-rose-500" />
            <span>Keep up the good work!</span>
          </CardFooter>
        </Card>
      </div>

      {/* Chart */}
      <Card className="my-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TimerIcon />
            <span>Challenge Results</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pl-0">
          <IndividualChallengeScores rows={chartData} metric={metric} unit={unit} isOverall={isOverall} />
        </CardContent>
      </Card>
    </>
  );
} 
