// KEEP SERVER PAGE

import { getSoloChallengeStats } from "@/db/queries/getSoloChallengeStats";
import Dashboard from "./dashboard";

export default async function DashboardPage() {
  const soloStats = await getSoloChallengeStats();
  return <Dashboard soloStats={soloStats} />;
}
