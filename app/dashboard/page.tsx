// KEEP SERVER PAGE

import { getSoloChallengeStats } from "@/db/queries/getSoloChallengeStats";
import Dashboard from "./dashboard";
import { getTeamChallengeStats } from "@/db/queries/getTeamChallengeStats";

export default async function DashboardPage() {
  const soloStats = await getSoloChallengeStats();
  const teamStats = await getTeamChallengeStats();
  return <Dashboard soloStats={soloStats} teamStats={teamStats} />;
}
