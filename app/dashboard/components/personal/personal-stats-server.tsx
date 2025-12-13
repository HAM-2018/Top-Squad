import { getSoloChallengeStats } from "@/db/queries/getSoloChallengeStats";
import IndividualChallenges from "./personal-stats";

export default async function IndividualChallengeServer() {
  const stats = await getSoloChallengeStats();
  return <IndividualChallenges initialStats={stats} />;
}
