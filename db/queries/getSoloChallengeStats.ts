import { auth } from "@clerk/nextjs/server";
import { challengeAttemptsTable, challengePartsTable, challengeTable, teamChallengesTable, usersTable } from "../schema";
import { asc, eq, min } from "drizzle-orm";
import { db } from "..";
import { type IndividualChallengeStats } from "@/types/individualchallengeStats";



export async function getSoloChallengeStats() {
    const {userId} = await auth();

    if (!userId) throw new Error("Unauthorized");

    const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, userId));

    if (!user) throw new Error("User not found");

  // Find most recent active solo challenge with attempts
  const [challenge] = await db
    .select({
        challengeId: challengeTable.id,
    })
    .from(challengeTable)
    .innerJoin(teamChallengesTable, eq(teamChallengesTable.challengeId, challengeTable.id))
    .innerJoin(
      challengeAttemptsTable,
      eq(challengeAttemptsTable.teamChallengeId, teamChallengesTable.id)
    )
    .where(eq(challengeAttemptsTable.userId, user.id))
    .orderBy(challengeTable.createdAt)
    .limit(1);

    if (!challenge) return null;

  const challengeId = challenge.challengeId;

  const [part] = await db
    .select()
    .from(challengePartsTable)
    .where(eq(challengePartsTable.challengeId, challengeId))
    .orderBy(asc(challengePartsTable.sortOrder))
    .limit(1);

  if (!part) return null;

  //Find correct metric to render
  const metric = part.metric;
  const unit = part.unit ?? null;

  const leaderboard = await db
    .select({
      userId: challengeAttemptsTable.userId,
      bestTime: min(challengeAttemptsTable.value),
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
    })
    .from(challengeAttemptsTable)
    .innerJoin(usersTable, eq(usersTable.id, challengeAttemptsTable.userId))
    .where(eq(challengeAttemptsTable.challengePartId, part.id))
    .groupBy(
      challengeAttemptsTable.userId,
      usersTable.firstName,
      usersTable.lastName
    )
    .orderBy(min(challengeAttemptsTable.value));

  const myIndex = leaderboard.findIndex((l) => l.userId === user.id);
  const myRank = myIndex >= 0 ? myIndex + 1 : null;
  const myTime = myIndex >= 0 ? leaderboard[myIndex].bestTime : null;

  const first = leaderboard[0];

  const firstPlace = first
  ? {
      name: `${first.firstName ?? ""} ${first.lastName ?? ""}`.trim(),
      time: Number(first.bestTime),
    }
  : null;

const chartRows = leaderboard.slice(0, 10).map((l) => ({
  name: l.userId === user.id ? "You" : `${l.firstName ?? ""}`.trim(),
  time: Number(l.bestTime),
}));


 const stats: IndividualChallengeStats = {
  myRank,
  myTime: myTime !== null ? Number(myTime) : null,
  totalCompetitors: leaderboard.length,
  metric,
  unit,
  firstPlace,
  chartRows,
};

return stats;

}