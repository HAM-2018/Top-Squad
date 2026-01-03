import Dashboard from "./dashboard";
import { getTeams } from "@/db/queries/getTeams";
import { getSoloChallengeOptions } from "@/db/queries/getSoloChallengeOptions";
import { getTeamChallengeOptions } from "@/db/queries/getTeamChallengeOptions";
import { getSoloChallengeStats } from "@/db/queries/getSoloChallengeStats";
import { getSoloChallengeProgressDaily } from "@/db/queries/getSoloChallengeProgressDaily";
import { getTeamChallengeStats } from "@/db/queries/getTeamChallengeStats";
import { getTeamChallengeProgressDaily } from "@/db/queries/getTeamChallengeProgressDaily";

type SearchParams = {
  solo?: string | string[];
  team?: string | string[];
  teamChallenge?: string | string[];
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
  const sp = (await searchParams) ?? {};

  const soloIdFromUrl = toPositiveInt(firstParam(sp.solo));
  const teamIdFromUrl = toPositiveInt(firstParam(sp.team));
  const teamChallengeIdFromUrl = toPositiveInt(firstParam(sp.teamChallenge));

  const [teams, soloOptions, teamOptions] = await Promise.all([
    getTeams(),
    getSoloChallengeOptions(),
    getTeamChallengeOptions(),
  ]);

  // pick base team
  const latestSoloOverall = soloOptions[0] ?? null;
  const selectedTeamId = teamIdFromUrl ?? latestSoloOverall?.teamId ?? teams[0]?.id ?? null;

  // SOLO selection (scoped to team)
  const { current: currentSolo, optionsForTeam: soloOptionsForTeam } =
    pickCurrentOptionForTeam(soloOptions, selectedTeamId, soloIdFromUrl);

  const selectedSoloTeamChallengeId = currentSolo?.teamChallengeId ?? null;

  // TEAM-CHALLENGE selection (scoped to team)
  const { current: currentTeamChallenge, optionsForTeam: teamOptionsForTeam } =
    pickCurrentOptionForTeam(teamOptions, selectedTeamId, teamChallengeIdFromUrl);

  const selectedTeamTeamChallengeId = currentTeamChallenge?.teamChallengeId ?? null;

  // fetch stats/progress
  const [soloStats, soloProgress, teamStats, teamProgress] = await Promise.all([
    selectedSoloTeamChallengeId
      ? getSoloChallengeStats({ teamChallengeId: selectedSoloTeamChallengeId })
      : Promise.resolve(null),

    selectedSoloTeamChallengeId
      ? getSoloChallengeProgressDaily(selectedSoloTeamChallengeId)
      : Promise.resolve(null),

    selectedTeamTeamChallengeId
      ? getTeamChallengeStats({ teamChallengeId: selectedTeamTeamChallengeId })
      : Promise.resolve(null),

    selectedTeamTeamChallengeId
      ? getTeamChallengeProgressDaily(selectedTeamTeamChallengeId)
      : Promise.resolve(null),
  ]);

  return (
    <Dashboard
      teams={teams}
      selectedTeamId={selectedTeamId}
      soloOptions={soloOptions}
      soloStats={soloStats}
      soloProgress={soloProgress}
      selectedSoloTeamChallengeId={selectedSoloTeamChallengeId}
      teamStats={teamStats}
      teamProgress={teamProgress}
      teamOptions={teamOptions}
      selectedTeamChallengeId={selectedTeamTeamChallengeId}
    />
  );
}