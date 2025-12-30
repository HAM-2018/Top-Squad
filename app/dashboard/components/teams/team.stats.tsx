"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { HandshakeIcon, MedalIcon, PartyPopperIcon, TimerIcon, UsersIcon } from "lucide-react";
import { formatScore, metricCapitalize } from "@/lib/formatScore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import hs from "@/public/images/thailand.jpg";
import Image from "next/image";
import { TeamChallengeStats } from "@/types/TeamChallengeStats";
import { useEffect, useMemo, useState } from "react";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export default function TeamChallenges({
  initialStats,
}: {
  initialStats: TeamChallengeStats | null;
}) {
  // ✅ safe derived values even when null
  const parts = initialStats?.parts ?? [];
  const hasMultipleParts = parts.length > 1;

  // ✅ hook runs every render (never conditional)
  const [selected, setSelected] = useState<string>("overall");

  // ✅ ensure selected is valid once stats/parts exist
  useEffect(() => {
    if (parts.length === 0) return;

    // if only one part, force selection to that part
    if (!hasMultipleParts) {
      const onlyId = String(parts[0].partId);
      setSelected(onlyId);
      return;
    }

    // multiple parts: default to "overall" if current selection isn't valid
    const valid =
      selected === "overall" || parts.some((p) => String(p.partId) === selected);

    if (!valid) setSelected("overall");
  }, [parts.length, hasMultipleParts]); // intentionally not depending on `selected` to avoid loops

  // ✅ render empty state AFTER hooks
  if (!initialStats) {
    return (
      <div className="text-muted-foreground">
        No team challenge data available yet.
      </div>
    );
  }

  // from here on, initialStats is non-null
  const selectedPart =
    hasMultipleParts
      ? parts.find((p) => String(p.partId) === selected) ?? null
      : parts[0] ?? null;

  const isOverall = hasMultipleParts && selected === "overall";

  const myRank = isOverall
    ? initialStats.overall.myTeamRank
    : selectedPart?.myTeamRank ?? null;

  const totalCompetitors = isOverall
    ? initialStats.overall.totalTeams
    : selectedPart?.totalTeams ?? 0;

  const label = isOverall
    ? "Overall"
    : selectedPart
    ? `${selectedPart.partName} • ${metricCapitalize(selectedPart.metric)}`
    : "—";

  const value = isOverall
    ? initialStats.overall.myTeamPoints !== null
      ? `${initialStats.overall.myTeamPoints} pts`
      : "—"
    : selectedPart && selectedPart.myTeamValue !== null
    ? formatScore(selectedPart.myTeamValue, selectedPart.metric, selectedPart.unit)
    : "—";

  const teams = isOverall ? initialStats.overall.teams : selectedPart?.teams ?? [];

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
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select event" />
              </SelectTrigger>
              <SelectContent>
                {hasMultipleParts ? (
                  <SelectItem value="overall">Overall</SelectItem>
                ) : null}
                {parts.map((p) => (
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
          <CardContent className="flex flex-wrap gap-2">
            {teams.map((team) => (
              <TooltipProvider key={team.teamName}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar>
                      {!!team.avatarUrl ? (
                        <Image
                          src={team.avatarUrl}
                          alt={team.teamName}
                          width={40}
                          height={40}
                        />
                      ) : null}
                      <AvatarFallback>
                        {team.teamName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>{team.teamName}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </CardContent>
        </Card>

        <Card className="border-rose-500 min-h-45 flex flex-col">
          <CardHeader className="py-0">
            <CardTitle className="text-xl flex items-center justify-between border-b border-rose-500 pb-1">
              First place Team <MedalIcon size={40} />
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2 items-center">
            <Avatar>
              <Image src={hs} alt="First-place avatar" />
              <AvatarFallback>HS</AvatarFallback>
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
        <CardContent className="pl-0">Line Graph</CardContent>
      </Card>
    </>
  );
}
