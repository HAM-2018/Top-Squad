"use client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import IndividualChallenges from "./components/personal/personal-stats";
import TeamChallenges from "./components/teams/team.stats";
import { useMemo, useState, useTransition } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import type { MultiPartChallengeStats } from "@/types/individualchallengeStats";
import type { TeamChallengeStats } from "@/types/TeamChallengeStats";
import type { SoloChallengeOption } from "@/db/queries/getSoloChallengeOptions";
import type { TeamChallengeOption } from "@/db/queries/getTeamChallengeOptions";
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
import { SoloProgress, TeamProgress } from "@/types/lineGraphStats";
import TeamChallengesSkeleton from "./components/teams/team.stats.skeleton";
import IndividualChallengesSkeleton from "./components/personal/personal.stats.skeleton";
import DemoDisclaimer from "./components/demo-disclaimer";
import ChallengeComments from "./components/challenge-comments";
import type { ChallengeComment } from "@/types/challengeComments";
import { Sparkles } from "lucide-react";

export default function Dashboard({
  activeTab = "solo",
  soloStats,
  soloProgress,
  soloOptions,
  selectedSoloTeamChallengeId,
  teams,
  selectedTeamId,
  teamOptions,
  selectedTeamChallengeId,
  teamStats,
  teamProgress,
  selectedCommentTeamChallengeId,
  initialComments,
}: {
  activeTab?: "solo" | "team";
  soloStats: MultiPartChallengeStats | null;
  soloProgress: SoloProgress | null;
  soloOptions: SoloChallengeOption[];
  selectedSoloTeamChallengeId: number | null;
  teams: TeamList[];
  selectedTeamId: number | null;
  teamOptions: TeamChallengeOption[];
  selectedTeamChallengeId: number | null;
  teamStats: TeamChallengeStats | null;
  teamProgress: TeamProgress | null;
  selectedCommentTeamChallengeId: number | null;
  initialComments: ChallengeComment[];
}) {
  type Tab = "individual challenges" | "team challenges";
  const tabToUrl = (t: Tab) => (t === "team challenges" ? "team" : "solo");

  const [isPending, startTransition] = useTransition();

  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const sp = useSearchParams();

  const [tab, setTab] = useState<Tab>(() =>
    activeTab === "team" ? "team challenges" : "individual challenges",
  );

  const [image, setImage] = useState(true);
  const selectedTeam = useMemo(() => {
    return teams.find((t) => t.id === selectedTeamId) ?? null;
  }, [teams, selectedTeamId]);

  const avatarSrc = selectedTeam?.avatarUrl ?? null;

  const [lastSrc, setLastSrc] = useState<string | null>(avatarSrc);
  if (lastSrc !== avatarSrc) {
    setLastSrc(avatarSrc);
    if (!image) setImage(true);
  }

  const soloOptionsForTeam = useMemo(() => {
    if (!selectedTeamId) return [];
    return soloOptions.filter((o) => o.teamId === selectedTeamId);
  }, [soloOptions, selectedTeamId]);

  const soloLabel = useMemo(() => {
    const opt = soloOptionsForTeam.find(
      (o) => o.teamChallengeId === selectedSoloTeamChallengeId,
    );
    return opt?.challengeName ?? null;
  }, [soloOptionsForTeam, selectedSoloTeamChallengeId]);

  const teamOptionsForTeam = useMemo(() => {
    if (!selectedTeamId) return [];
    return teamOptions.filter((o) => o.teamId === selectedTeamId);
  }, [teamOptions, selectedTeamId]);

  const teamLabel = useMemo(() => {
    const opt = teamOptionsForTeam.find(
      (o) => o.teamChallengeId === selectedTeamChallengeId,
    );
    return opt?.challengeName ?? null;
  }, [teamOptionsForTeam, selectedTeamChallengeId]);

  const activeChallengeName =
    tab === "individual challenges" ? soloLabel : teamLabel;

  const activeChallengeTone =
    tab === "individual challenges" ? "Solo mode" : "Squad mode";

  const pushParams = (next: {
    team?: number | null;
    solo?: number | null;
    teamChallenge?: number | null;
    tab?: "solo" | "team" | null;
  }) => {
    const params = new URLSearchParams(sp.toString());

    if (next.team === null) params.delete("team");
    else if (typeof next.team === "number")
      params.set("team", String(next.team));

    if (next.solo === null) params.delete("solo");
    else if (typeof next.solo === "number")
      params.set("solo", String(next.solo));

    if (next.teamChallenge === null) params.delete("teamChallenge");
    else if (typeof next.teamChallenge === "number") {
      params.set("teamChallenge", String(next.teamChallenge));
    }

    if (next.tab === null) params.delete("tab");
    else if (next.tab) params.set("tab", next.tab);

    startTransition(() => {
      router.push(`/dashboard?${params.toString()}`);
    });
  };

  const onTeamChange = (teamId: number) => {
    const firstSoloForTeam =
      soloOptions.find((o) => o.teamId === teamId)?.teamChallengeId ?? null;
    const firstTeamChallengeForTeam =
      teamOptions.find((o) => o.teamId === teamId)?.teamChallengeId ?? null;

    pushParams({
      team: teamId,
      solo: firstSoloForTeam,
      teamChallenge: firstTeamChallengeForTeam,
      tab: tabToUrl(tab),
    });
  };

  const onSoloChange = (teamChallengeId: number) => {
    pushParams({ solo: teamChallengeId, tab: "solo" });
  };

  const onTeamChallengeChange = (teamChallengeId: number) => {
    pushParams({ teamChallenge: teamChallengeId, tab: "team" });
  };

  if (!isLoaded || !isSignedIn) return null;

  const triggerClass =
    "w-full rounded-md border bg-background px-3 " +
    "h-9 text-xs " +
    "sm:h-10 sm:text-sm " +
    "focus:outline-none focus:ring-0 focus:ring-offset-0 " +
    "data-[state=open]:ring-0 data-[state=open]:ring-offset-0";

  const showSoloHeader = tab === "individual challenges";
  const showTeamHeader = tab === "team challenges";

  const currentCommentTargetId =
    tab === "team challenges"
      ? selectedTeamChallengeId
      : selectedSoloTeamChallengeId;

  const commentsForCurrentTarget =
    selectedCommentTeamChallengeId === currentCommentTargetId
      ? initialComments
      : [];

  return (
    <div className="space-y-4">
      <DemoDisclaimer />
      <div className="w-full">
        <div
          className="
            grid
            grid-cols-1
            gap-4
            md:grid-cols-[520px_1fr_120px]
            items-center
            md:gap-6
          "
        >
          <div>
            <div className="mb-3">
              <div className="mb-1 text-center text-[10px] font-semibold tracking-wide text-muted-foreground sm:mb-2 sm:text-xs">
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

            {showSoloHeader ? (
              <div>
                <div className="mb-1 text-center text-[10px] font-semibold tracking-wide text-muted-foreground sm:mb-2 sm:text-xs">
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
            ) : null}

            {showTeamHeader ? (
              <div>
                <div className="mb-2 text-center text-xs font-semibold tracking-wide text-muted-foreground">
                  Challenge:
                </div>
                <Select
                  value={
                    selectedTeamChallengeId
                      ? String(selectedTeamChallengeId)
                      : ""
                  }
                  onValueChange={(v) => {
                    const n = Number(v);
                    if (Number.isFinite(n)) onTeamChallengeChange(n);
                  }}
                  disabled={!selectedTeamId || teamOptionsForTeam.length === 0}
                >
                  <SelectTrigger className={triggerClass}>
                    <SelectValue placeholder="Select a team challenge">
                      {teamLabel ?? "Select a team challenge"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {teamOptionsForTeam.map((o) => (
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
            ) : null}
          </div>

          <div />

          <div className="flex justify-center md:mr-40">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24 md:h-35 md:w-35 border bg-background">
              {selectedTeam?.avatarUrl && image ? (
                <AvatarImage
                  key={selectedTeam.avatarUrl}
                  src={selectedTeam.avatarUrl}
                  alt={selectedTeam.name ?? "Team"}
                  className="object-cover"
                  onError={() => setImage(false)}
                />
              ) : null}

              <AvatarFallback className="text-foreground text-xl sm:text-2xl md:text-4xl font-semibold">
                {initialsFromName(selectedTeam?.name ?? "Team")}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          const nextTab = v as Tab;
          setTab(nextTab);
          pushParams({ tab: tabToUrl(nextTab) });
        }}
      >
        <TabsList className="mb-4">
          <TabsTrigger value="individual challenges">
            Solo challenges
          </TabsTrigger>
          <TabsTrigger value="team challenges">Team challenges</TabsTrigger>
        </TabsList>

        <div className="text-center text-xl mb-4 rounded-xl border bg-linear-to-r from-green-600 via-green-400 to-green-200 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-black">
            <Sparkles className="h-4 w-4" />
            {activeChallengeTone}
          </div>
          <p className="mt-1 text-xl font-semibold xl:text-base text-white">
            {activeChallengeName ? (
              <>
                Current challenge:{" "}
                <span className="font-semibold text-gray-900">
                  {activeChallengeName}
                </span>
              </>
            ) : (
              "Pick a challenge to get started."
            )}
          </p>
        </div>

        <TabsContent value="individual challenges">
          {isPending ? (
            <IndividualChallengesSkeleton />
          ) : (
            <IndividualChallenges
              initialStats={soloStats}
              soloProgress={soloProgress}
            />
          )}
        </TabsContent>

        <TabsContent value="team challenges">
          {isPending ? (
            <TeamChallengesSkeleton />
          ) : (
            <TeamChallenges
              initialStats={teamStats}
              teamProgress={teamProgress ?? null}
            />
          )}
        </TabsContent>
      </Tabs>

      <ChallengeComments
        key={currentCommentTargetId ?? -1}
        teamChallengeId={currentCommentTargetId}
        initialComments={commentsForCurrentTarget}
      />
    </div>
  );
}
