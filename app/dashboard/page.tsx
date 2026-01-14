import Dashboard from "./dashboard";
import { getTeams } from "@/db/queries/getTeams";
import { getSoloChallengeOptions } from "@/db/queries/getSoloChallengeOptions";
import { getTeamChallengeOptions } from "@/db/queries/getTeamChallengeOptions";
import { getSoloChallengeStats } from "@/db/queries/getSoloChallengeStats";
import { getSoloChallengeProgressDaily } from "@/db/queries/getSoloChallengeProgressDaily";
import { getTeamChallengeStats } from "@/db/queries/getTeamChallengeStats";
import { getTeamChallengeProgressDaily } from "@/db/queries/getTeamChallengeProgressDaily";
import { getCurrentUser } from "@/db/queries/getCurrentUser";

type SearchParams = {
  solo?: string | string[];
  team?: string | string[];
  teamChallenge?: string | string[];
  tab?: "solo" | "team" | string | string[];
};

function firstParam(v?: string | string[]) {
  return Array.isArray(v) ? v[0] : v;
}

function toPositiveInt(v?: string | null) {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function pickCurrentOptionForTeam<T extends { teamChallengeId: number; teamId: number }>(
  options: T[],
  teamId: number | null,
  idFromUrl: number | null
) {
  const optionsForTeam = teamId ? options.filter((o) => o.teamId === teamId) : [];

  const fromUrl =
    idFromUrl !== null
      ? optionsForTeam.find((o) => o.teamChallengeId === idFromUrl) ?? null
      : null;

  const latestForTeam = optionsForTeam[0] ?? null;
  return { current: fromUrl ?? latestForTeam, optionsForTeam };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {

  const user = await getCurrentUser();

  const sp = (await searchParams) ?? {};

  const soloIdFromUrl = toPositiveInt(firstParam(sp.solo));
  const teamIdFromUrl = toPositiveInt(firstParam(sp.team));
  const teamChallengeIdFromUrl = toPositiveInt(firstParam(sp.teamChallenge));

  // find active tab from URL 
  const tab = firstParam(sp.tab);
  const activeTab: "solo" | "team" = tab === "team" ? "team" : "solo";

  // get teams and solo challenges
  const [teams, soloOptions, teamOptions] = await Promise.all([
    getTeams(),
    getSoloChallengeOptions(user.id),
    activeTab === "team" ? getTeamChallengeOptions(user.id) : Promise.resolve([]),
  ]);

  // pick base team
  const latestSoloOverall = soloOptions[0] ?? null;
  const selectedTeamId =
    teamIdFromUrl ?? latestSoloOverall?.teamId ?? teams[0]?.id ?? null;

  // SOLO selection 
  const { current: currentSolo } = pickCurrentOptionForTeam(
    soloOptions as any[],
    selectedTeamId,
    soloIdFromUrl
  );
  const selectedSoloTeamChallengeId = currentSolo?.teamChallengeId ?? null;

  // SOLO stats/progress 
  const [soloStats, soloProgress] = await Promise.all([
    selectedSoloTeamChallengeId
      ? getSoloChallengeStats({ teamChallengeId: selectedSoloTeamChallengeId, userId: user.id })
      : Promise.resolve(null),

    selectedSoloTeamChallengeId
      ? getSoloChallengeProgressDaily(user.id, selectedSoloTeamChallengeId)
      : Promise.resolve(null),
  ]);

  // get team stats when tab is set to team
  let selectedTeamTeamChallengeId: number | null = null;
  let teamStats: any = null;
  let teamProgress: any = null;

  if (activeTab === "team") {
    const { current: currentTeamChallenge } = pickCurrentOptionForTeam(
      teamOptions as any[],
      selectedTeamId,
      teamChallengeIdFromUrl
    );

    selectedTeamTeamChallengeId = currentTeamChallenge?.teamChallengeId ?? null;

    [teamStats, teamProgress] = await Promise.all([
      selectedTeamTeamChallengeId
        ? getTeamChallengeStats({ userId: user.id, teamChallengeId: selectedTeamTeamChallengeId })
        : Promise.resolve(null),

      selectedTeamTeamChallengeId
        ? getTeamChallengeProgressDaily(user.id, selectedTeamTeamChallengeId)
        : Promise.resolve(null),
    ]);
  }

  return (
    <Dashboard
      activeTab={activeTab} 
      teams={teams}
      selectedTeamId={selectedTeamId}
      soloOptions={soloOptions}
      soloStats={soloStats}
      soloProgress={soloProgress}
      selectedSoloTeamChallengeId={selectedSoloTeamChallengeId}
      teamStats={teamStats}
      teamProgress={teamProgress}
      teamOptions={teamOptions as any[]}
      selectedTeamChallengeId={selectedTeamTeamChallengeId}
    />
  );
}
