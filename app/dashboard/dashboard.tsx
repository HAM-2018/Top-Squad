"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import IndividualChallenges from "./components/personal/personal-stats";
import TeamChallenges from "./components/teams/team.stats";
import { createOrUpdateUser } from "@/db/mutations/createUser";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import type { MultiPartChallengeStats } from "@/types/individualchallengeStats";
import type { TeamChallengeStats } from "@/types/TeamChallengeStats";
import type { SoloChallengeOption } from "@/db/queries/getSoloChallengeOptions";
import type { TeamList } from "@/types/teams";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName } from "@/lib/initialsFromName";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TeamProgress } from "@/types/lineGraphStats";

export default function Dashboard({
  soloStats,
  soloOptions,
  selectedSoloTeamChallengeId,
  teams,
  selectedTeamId,
  teamStats,
  teamProgress,
}: {
  soloStats: MultiPartChallengeStats | null;
  soloOptions: SoloChallengeOption[];
  selectedSoloTeamChallengeId: number | null;

  teams: TeamList[];
  selectedTeamId: number | null;

  teamStats: TeamChallengeStats | null;
  teamProgress: TeamProgress | null;
}) {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const sp = useSearchParams();

  const [tab, setTab] = useState<"individual challenges" | "team challenges">(
    "individual challenges"
  );

  const selectedTeam = useMemo(() => {
    return teams.find((t) => t.id === selectedTeamId) ?? null;
  }, [teams, selectedTeamId]);

  const soloOptionsForTeam = useMemo(() => {
    if (!selectedTeamId) return [];
    return soloOptions.filter((o) => o.teamId === selectedTeamId);
  }, [soloOptions, selectedTeamId]);

  const soloLabel = useMemo(() => {
    const opt = soloOptionsForTeam.find(
      (o) => o.teamChallengeId === selectedSoloTeamChallengeId
    );
    return opt?.challengeName ?? null;
  }, [soloOptionsForTeam, selectedSoloTeamChallengeId]);

  const pushParams = (next: { team?: number | null; solo?: number | null }) => {
    const params = new URLSearchParams(sp.toString());

    if (next.team === null) params.delete("team");
    else if (typeof next.team === "number") params.set("team", String(next.team));

    if (next.solo === null) params.delete("solo");
    else if (typeof next.solo === "number") params.set("solo", String(next.solo));

    router.push(`/dashboard?${params.toString()}`);
  };

  const onTeamChange = (teamId: number) => {
    const firstSoloForTeam =
      soloOptions.find((o) => o.teamId === teamId)?.teamChallengeId ?? null;
    pushParams({ team: teamId, solo: firstSoloForTeam });
  };

  const onSoloChange = (teamChallengeId: number) => {
    pushParams({ solo: teamChallengeId });
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    void createOrUpdateUser({
      clerkId: user.id,
      email:
        user.primaryEmailAddress?.emailAddress ??
        user.emailAddresses[0]?.emailAddress ??
        "",
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.imageUrl,
    });
  }, [isLoaded, isSignedIn, user]);

  if (!isLoaded || !isSignedIn) return null;

  const triggerClass =
    "h-11 w-full rounded-md border bg-background px-3 text-sm " +
    "focus:outline-none focus:ring-0 focus:ring-offset-0 " +
    "data-[state=open]:ring-0 data-[state=open]:ring-offset-0";

  return (
    <div className="space-y-4">
      {tab === "individual challenges" ? (
        <div className="w-full">
          <div
            className="
              grid
              grid-cols-[520px_1fr_120px]
              items-center
              gap-6
            "
          >
            <div>
              <div className="mb-3">
                <div className="mb-2 text-center text-xs font-semibold tracking-wide text-muted-foreground">
                  Team:
                </div>
                <Select
                  value={selectedTeamId ? String(selectedTeamId) : ""}
                  onValueChange={(v) => {
                    const n = Number(v);
                    if (Number.isFinite(n)) onTeamChange(n);
                  }}
                  disabled={teams.length === 0}
                >
                  <SelectTrigger className={triggerClass}>
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Challenge */}
              <div>
                <div className="mb-2 text-center text-xs font-semibold tracking-wide text-muted-foreground">
                  Challenge:
                </div>
                <Select
                  value={
                    selectedSoloTeamChallengeId
                      ? String(selectedSoloTeamChallengeId)
                      : ""
                  }
                  onValueChange={(v) => {
                    const n = Number(v);
                    if (Number.isFinite(n)) onSoloChange(n);
                  }}
                  disabled={!selectedTeamId || soloOptionsForTeam.length === 0}
                >
                  <SelectTrigger className={triggerClass}>
                    <SelectValue placeholder="Select a solo challenge">
                      {soloLabel ?? "Select a solo challenge"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {soloOptionsForTeam.map((o) => (
                      <SelectItem
                        key={o.teamChallengeId}
                        value={String(o.teamChallengeId)}
                      >
                        {o.challengeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* spacer column*/}
            <div/>

            {/* AVATAR */}
            <div className="flex justify-center mr-40">
              <Avatar className="h-35 w-35 border bg-background">
                {selectedTeam?.avatarUrl ? (
                <AvatarImage
                  src={selectedTeam?.avatarUrl}
                  alt={selectedTeam?.name ?? "Team"}
                  className="object-cover"
                />
                ): null}
                
                <AvatarFallback className="text-4xl font-semibold">
                  {initialsFromName(selectedTeam?.name ?? "Team")}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="mb-4">
          <TabsTrigger value="individual challenges">Solo challenges</TabsTrigger>
          <TabsTrigger value="team challenges">Team challenges</TabsTrigger>
        </TabsList>

        <TabsContent value="individual challenges">
          <IndividualChallenges initialStats={soloStats} />
        </TabsContent>

        <TabsContent value="team challenges">
          <TeamChallenges initialStats={teamStats} teamProgress={teamProgress ?? null} />
        </TabsContent>
      </Tabs>
    </div>
  );

}