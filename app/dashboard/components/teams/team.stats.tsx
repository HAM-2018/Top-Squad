"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { HandshakeIcon, MedalIcon, PartyPopperIcon, StarIcon, TimerIcon } from "lucide-react";
import { formatScore, metricCapitalize } from "@/lib/formatScore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TeamChallengeStats } from "@/types/TeamChallengeStats";
import { useMemo, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import TeamStatsGraph from "./team.stats.graph";
import TeamLineGraph from "./team.stats.line.graph";
import { TeamProgress } from "@/types/lineGraphStats";

export default function TeamChallenges({
  initialStats,
  teamProgress,
}: {
  initialStats: TeamChallengeStats | null;
  teamProgress?: TeamProgress | null;
}) {
  const parts = useMemo(() => initialStats?.parts ?? [], [initialStats]);
  const hasData = parts.length > 0;
  const hasMultipleParts = parts.length > 1;

  const [selected, setSelected] = useState<string>(() => {
    if (!hasData) return "";
    if (parts.length === 1) return String(parts[0].partId);
    return "overall";
  });

  const selectedPart = useMemo(() => {
    if (!hasData) return null;
    if (hasMultipleParts) {
      if (selected === "overall") return null;
      return parts.find((p) => String(p.partId) === selected) ?? null;
    }
    return parts[0] ?? null;
  }, [hasData, hasMultipleParts, parts, selected]);

  const isOverall = hasData && hasMultipleParts && selected === "overall";

  const teams = useMemo(() => {
    if (!initialStats) return [];
    return isOverall ? initialStats.overall.teams : selectedPart?.teams ?? [];
  }, [initialStats, isOverall, selectedPart]);

  const graphRows = useMemo(() => {
    if (!initialStats) return [];
    if (isOverall) {
      return initialStats.overall.chartRows.map((r) => ({
        name: r.name,
        value: r.time,
        isMyTeam: r.isMyTeam,
      }));
    }
    if (!selectedPart) return [];
    return selectedPart.chartRows.map((r) => ({
      name: r.name,
      value: r.time,
      isMyTeam: r.isMyTeam,
    }));
  }, [initialStats, isOverall, selectedPart]);

  const graphMetric = hasData ? (isOverall ? "reps" : selectedPart?.metric ?? "reps") : "reps";
  const graphUnit = hasData ? (isOverall ? null : selectedPart?.unit ?? null) : null;

  const linePoints = useMemo(() => {
    if (!teamProgress) return [];
    if (!selected) return [];
    if (isOverall) return teamProgress.overall;
    return teamProgress.parts[selected] ?? [];
  }, [teamProgress, isOverall, selected]);

  const lineData = useMemo(() => {
    return linePoints.map((p) => {
      const row: Record<string, number | string | null> = { t: p.t };
      for (const [teamId, val] of Object.entries(p.values)) {
        row[`team_${teamId}`] = val;
      }
      return row as { t: string } & Record<string, number | string | null>;
    });
  }, [linePoints]);

  const teamKeys = useMemo(() => {
    return (teamProgress?.teams ?? []).map((t) => ({
      key: `team_${t.teamId}`,
      name: t.name,
      isMyTeam: t.isMyTeam,
    }));
  }, [teamProgress]);

  const reversed = !hasData
    ? false
    : isOverall
    ? initialStats!.overall.pointsMode === "rank_low_wins"
    : selectedPart?.better === "lower";

  const firstPlaceTeam = useMemo(() => {
    const ranked = teams.filter((t) => t.rank !== null) as Array<typeof teams[number] & { rank: number }>;
    if (ranked.length === 0) return null;
    return ranked.reduce((best, cur) => (cur.rank < best.rank ? cur : best), ranked[0]);
  }, [teams]);

  const firstPlaceScore = useMemo(() => {
    if (!firstPlaceTeam) return "—";
    if (isOverall) {
      const pts = (firstPlaceTeam as any).points as number | null | undefined;
      return pts != null ? `${pts} pts` : "—";
    }
    const val = (firstPlaceTeam as any).value as number | null | undefined;
    return val != null && selectedPart ? formatScore(val, selectedPart.metric, selectedPart.unit) : "—";
  }, [firstPlaceTeam, isOverall, selectedPart]);

  if (!initialStats) {
    return <div className="text-muted-foreground">No team challenge data available yet.</div>;
  }

  const myRank = isOverall ? initialStats.overall.myTeamRank : selectedPart?.myTeamRank ?? null;
  const cap = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase());
  
  const label = hasData
    ? isOverall
      ? "Overall"
      : selectedPart
      ? `${selectedPart.partName} • ${metricCapitalize(selectedPart.metric)}${
          selectedPart.unit && selectedPart.unit !== selectedPart.metric
            ? ` • ${cap(selectedPart.unit)}`
            : ""
        }`
      : "—"
    : "No data yet";


  const value = isOverall
    ? initialStats.overall.myTeamPoints !== null
      ? `${initialStats.overall.myTeamPoints} pts`
      : "—"
    : selectedPart && selectedPart.myTeamValue !== null
    ? formatScore(selectedPart.myTeamValue, selectedPart.metric, selectedPart.unit)
    : "—";

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
            <Select
              value={
                !hasData
                  ? ""
                  : hasMultipleParts
                  ? (selected === "overall" || parts.some((p) => String(p.partId) === selected) ? selected : "overall")
                  : String(parts[0]?.partId ?? "")
              }
              onValueChange={setSelected}
              disabled={!hasData}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={hasData ? "Select event" : "No events yet"} />
              </SelectTrigger>
              <SelectContent>
                {hasData && hasMultipleParts ? <SelectItem value="overall">Overall</SelectItem> : null}
                {hasData ? parts.map((p) => (
                  <SelectItem key={p.partId} value={String(p.partId)}>
                    {p.partName}
                  </SelectItem>
                )) : null}
              </SelectContent>
            </Select>

            <div className="flex items-center justify-between">
              <span className="text-sm uppercase tracking-wide text-muted-foreground">Ranking</span>
              <span className="text-3xl font-semibold">{myRank !== null ? `#${myRank}` : "—"}</span>
            </div>

            <div className="h-px bg-border/60" />

            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm uppercase tracking-wide text-muted-foreground">{label}</span>
              <span className="font-mono text-4xl font-bold tabular-nums">{value}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-0">
            <CardTitle className="text-xl flex items-center justify-between border-b border-rose-500 pb-1">
              Teams competing <StarIcon className="text-yellow-500" size={40} />
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {teams.map((team) => (
                <TooltipProvider key={team.teamName}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Avatar>
                        {team.avatarUrl ? <AvatarImage src={team.avatarUrl ?? ""} alt={team.teamName} /> : null}
                        <AvatarFallback className="font-semibold">
                          {team.teamName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>{team.teamName}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
            <div className=" text-muted-foreground pt-4">Total: {teams.length}</div>
          </CardContent>
        </Card>

        <Card className="border-rose-500 min-h-45 flex flex-col">
          <CardHeader className="py-0">
            <CardTitle className="text-xl flex items-center justify-between border-b border-rose-500 pb-1">
              First place <MedalIcon className="text-yellow-500" size={40} />
            </CardTitle>
          </CardHeader>

          <CardContent className="flex gap-3 items-center">
            {!firstPlaceTeam ? (
              <p className="text-sm text-muted-foreground">No scores yet.</p>
            ) : (
              <>
                <Avatar>
                  {firstPlaceTeam.avatarUrl ? (
                    <AvatarImage src={firstPlaceTeam.avatarUrl ?? ""} alt={firstPlaceTeam.teamName} />
                  ) : null}
                  <AvatarFallback className="font-semibold">
                    {firstPlaceTeam.teamName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <div className="text-2xl font-semibold truncate">{firstPlaceTeam.teamName}</div>
                  <div className="text-sm text-muted-foreground">
                    {isOverall ? "Overall leader" : "Event leader"} • {firstPlaceScore}
                  </div>
                </div>
              </>
            )}
          </CardContent>

          <CardFooter className="flex gap-2 items-center text-xs text-muted-foreground mt-auto">
            <PartyPopperIcon className="text-rose-500" />
            <span>{firstPlaceTeam ? "Keep up the pressure!" : "Log attempts to start ranking."}</span>
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
        <CardContent>
          <TeamStatsGraph rows={graphRows} metric={graphMetric} unit={graphUnit} isOverall={isOverall} />
        </CardContent>
      </Card>

      <Card className="my-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TimerIcon />
            <span>Progress over time</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TeamLineGraph
            data={lineData}
            teamKeys={teamKeys}
            reversed={reversed}
            metric={graphMetric}
            unit={graphUnit}
            isOverall={isOverall}
          />
        </CardContent>
      </Card>
    </>
  );
}
