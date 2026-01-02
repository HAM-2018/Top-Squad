
import { getSoloChallengeStats } from "@/db/queries/getSoloChallengeStats";
import Dashboard from "./dashboard";
import { getTeamChallengeStats } from "@/db/queries/getTeamChallengeStats";
import { getSoloChallengeOptions } from "@/db/queries/getSoloChallengeOptions";
import { getTeams } from "@/db/queries/getTeams";
import { getTeamChallengeProgressDaily } from "@/db/queries/getTeamChallengeProgressDaily";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ solo?: string | string[]; team?: string | string[] }>;
}) {
  const sp = (await searchParams) ?? {};

  const [teams, soloOptions] = await Promise.all([getTeams(), getSoloChallengeOptions()]);

  // normalize params
  const soloParam = Array.isArray(sp.solo) ? sp.solo[0] : sp.solo;
  const teamParam = Array.isArray(sp.team) ? sp.team[0] : sp.team;

  const soloIdFromUrl = soloParam ? Number(soloParam) : undefined;
  const teamIdFromUrl = teamParam ? Number(teamParam) : undefined;

  // picks current solo's option
  const soloFromUrl =
    Number.isFinite(soloIdFromUrl) && soloIdFromUrl
      ? soloOptions.find((o) => o.teamChallengeId === soloIdFromUrl) ?? null
      : null;

  const latestSolo = soloOptions[0] ?? null; // already ordered by recordedAt desc
  const currentSolo = soloFromUrl ?? latestSolo;

  // team defaults to team param, or currentSolo
  const selectedTeamId =
    (Number.isFinite(teamIdFromUrl) && (teamIdFromUrl ?? 0) > 0 ? teamIdFromUrl : null) ??
    currentSolo?.teamId ??
    teams[0]?.id ??
    null;

  // solo selection must be within selected team
  const soloOptionsForTeam = selectedTeamId
    ? soloOptions.filter((o) => o.teamId === selectedTeamId)
    : [];

  const selectedSoloTeamChallengeId =
    currentSolo && currentSolo.teamId === selectedTeamId
      ? currentSolo.teamChallengeId
      : soloOptionsForTeam[0]?.teamChallengeId ?? null; // newest for that team

  const soloStats = selectedSoloTeamChallengeId
    ? await getSoloChallengeStats({ teamChallengeId: selectedSoloTeamChallengeId })
    : null;

  const teamStats = await getTeamChallengeStats();
  const teamProgress = await getTeamChallengeProgressDaily();

  return (
    <Dashboard
      teams={teams}
      selectedTeamId={selectedTeamId}
      soloOptions={soloOptions}
      soloStats={soloStats}
      selectedSoloTeamChallengeId={selectedSoloTeamChallengeId}
      teamStats={teamStats}
      teamProgress={teamProgress}
    />
  );
}
