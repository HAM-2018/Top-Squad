"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useMemo, useState } from "react";
import { initialsFromName } from "@/lib/initialsFromName";

export default function IndividualChallenges({
  initialStats,
}: {
  initialStats: MultiPartChallengeStats | null;
}) {
  //treat null as empty state but keep UI
  const hasData = !!initialStats;

  const parts = initialStats?.parts ?? [];
  const hasMultipleParts = parts.length > 1;

  const [selected, setSelected] = useState<string>(() => {
    if (!hasData) return "";
    if (!hasMultipleParts) return String(parts[0]?.partId ?? "");
    return "overall";
  });

  // if no dataselectedPart is null
  const selectedPart = useMemo(() => {
    if (!hasData) return null;
    if (hasMultipleParts) {
      return parts.find((p) => String(p.partId) === selected) ?? null;
    }
    return parts[0] ?? null;
  }, [hasData, hasMultipleParts, parts, selected]);

  const isOverall = hasData && hasMultipleParts && selected === "overall";

  const myRank = hasData
    ? isOverall
      ? initialStats!.overall.myRank
      : selectedPart?.myRank ?? null
    : null;

  const totalCompetitors = hasData
    ? isOverall
      ? initialStats!.overall.totalCompetitors
      : selectedPart?.totalCompetitors ?? 0
    : 0;

  const label = hasData
    ? isOverall
      ? "Overall"
      : selectedPart
      ? `${selectedPart.partName} • ${metricCapitalize(selectedPart.metric)}`
      : "—"
    : "No data yet";

  const value = hasData
    ? isOverall
      ? initialStats!.overall.myPoints !== null
        ? `${initialStats!.overall.myPoints} pts`
        : "—"
      : selectedPart && selectedPart.myValue !== null
      ? formatScore(selectedPart.myValue, selectedPart.metric, selectedPart.unit)
      : "—"
    : "—";

  const rankingPercentage =
    myRank !== null && totalCompetitors > 0
      ? Math.round((myRank / totalCompetitors) * 100)
      : null;

  const chartRows = hasData
    ? isOverall
      ? initialStats!.overall.chartRows
      : selectedPart?.chartRows ?? []
    : [];

  const chartData = chartRows.map((r) => ({
    ...r,
    value: r.time,
  }));

  const metric = hasData ? (isOverall ? "reps" : selectedPart?.metric ?? "time") : "time";
  const unit = hasData ? (isOverall ? null : selectedPart?.unit ?? null) : null;

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
            <Select value={selected} onValueChange={setSelected} disabled={!hasData}>
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={hasData ? "Select event" : "No events yet"}
                />
              </SelectTrigger>
              <SelectContent>
                {hasData && hasMultipleParts ? (
                  <SelectItem value="overall">Overall</SelectItem>
                ) : null}
                {hasData
                  ? parts.map((p) => (
                      <SelectItem key={p.partId} value={String(p.partId)}>
                        {p.partName}
                      </SelectItem>
                    ))
                  : null}
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

            {!hasData ? (
              <p className="text-sm text-muted-foreground">
                Log a result to see your rank and stats here.
              </p>
            ) : null}
          </CardContent>
        </Card>

        {/* Competitors */}
        <Card className="flex flex-col">
          <CardHeader className="py-0">
            <CardTitle className="text-xl flex items-center justify-between border-b border-rose-500 pb-1">
              Competitors <UsersIcon size={40} />
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="leading-none text-muted-foreground whitespace-nowrap">
                Chasing 1st:
              </span>
              <div className="flex-1 overflow-x-auto">
                <div className="flex items-center gap-3 flex-nowrap min-w-max pr-2 justify-start lg:justify-center">
                  {hasData && chartRows.length > 0 ? (
                    chartRows.slice(1, 6).map((row) => (
                      <Avatar key={row.userId} className="h-14 w-14 shrink-0 border bg-background">
                        {row.avatarUrl ? (
                          <img
                            src={row.avatarUrl}
                            alt={row.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <AvatarFallback className="text-xs font-medium">
                            {initialsFromName(row.name)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground py-2">
                      No competitors yet.
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-baseline justify-between pt-4">
              <span className="uppercase tracking-wide text-muted-foreground">
                Total
              </span>
              <span className="text-3xl font-semibold tabular-nums">
                {hasData ? totalCompetitors : "—"}
              </span>
            </div>

            <div className="flex justify-end">
              <Button
                asChild
                size="xs"
                className="h-6 px-2 text-[10px] border border-rose-500 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                variant="ghost"
              >
                <Link href="/dashboard/teams">View All</Link>
              </Button>
            </div>
          </CardContent>

          <CardFooter className="mt-auto">
            {hasData ? (
              rankingPercentage !== null ? (
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
              )
            ) : (
              <span className="text-xs text-muted-foreground">
                Log a result to appear on the leaderboard.
              </span>
            )}
          </CardFooter>
        </Card>

        {/* First place */}
        <Card className="border-rose-500 min-h-45 flex flex-col">
          <CardHeader className="py-0">
            <CardTitle className="text-xl flex items-center justify-between border-b border-rose-500 pb-1">
              First place <MedalIcon size={40} />
            </CardTitle>
          </CardHeader>

          <CardContent className="flex gap-2 items-center">
            {hasData && chartRows?.[0] ? (
              <>
                <Avatar className="h-10 w-10 border bg-background">
                  {chartRows[0].avatarUrl ? (
                    <img
                      src={chartRows[0].avatarUrl}
                      alt={chartRows[0].name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <AvatarFallback className="text-xs font-medium">
                      {initialsFromName(chartRows[0].name)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <span className="text-2xl">{chartRows[0].name}</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">
                No results yet.
              </span>
            )}
          </CardContent>

          <CardFooter className="flex gap-2 items-center text-xs text-muted-foreground mt-auto">
            <PartyPopperIcon className="text-rose-500" />
            <span>{hasData ? "Keep up the good work!" : "Start logging to climb the leaderboard."}</span>
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
          {hasData ? (
            <IndividualChallengeScores
              rows={chartData}
              metric={metric}
              unit={unit}
              isOverall={isOverall}
            />
          ) : (
            <div className="px-6 py-10 text-sm text-muted-foreground">
              No results yet — log your first attempt to see the chart.
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
