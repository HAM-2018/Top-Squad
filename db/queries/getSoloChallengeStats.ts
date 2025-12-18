import { auth } from "@clerk/nextjs/server";
import { challengeAttemptsTable, challengePartsTable, challengeTable, teamChallengesTable, teamMembersTable, usersTable } from "../schema";
import { asc, eq, min, desc, max, and } from "drizzle-orm";
import { db } from "..";
import { MultiPartChallengeStats, } from "@/types/individualchallengeStats";



export async function getSoloChallengeStats(): Promise<MultiPartChallengeStats | null> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, userId));

  if (!user) throw new Error("User not found");

  // scope challenge to specific teamChallengeId
  const [challenge] = await db
    .select({
      challengeId: challengeTable.id,
      teamChallengeId: teamChallengesTable.id,
      teamId: teamChallengesTable.teamId 
    })
    .from(challengeAttemptsTable)
    .innerJoin(
    teamChallengesTable,
    eq(teamChallengesTable.id, challengeAttemptsTable.teamChallengeId)
    )
    .innerJoin(
      challengeTable,
      eq(challengeTable.id, teamChallengesTable.challengeId)
    )
    .innerJoin(
      teamMembersTable,
      and(
        eq(teamMembersTable.teamId, teamChallengesTable.teamId),
        eq(teamMembersTable.userId, challengeAttemptsTable.userId)
      )
    )
    .where(eq(challengeAttemptsTable.userId, user.id))
    .orderBy(desc(challengeAttemptsTable.recordedAt))
    .limit(1);

  if (!challenge) return null;

  const challengeId = challenge.challengeId;
  const teamChallengeId = challenge.teamChallengeId;
  const teamId = challenge.teamId;

  // Get ALL parts
  const parts = await db
    .select()
    .from(challengePartsTable)
    .where(eq(challengePartsTable.challengeId, challengeId))
    .orderBy(asc(challengePartsTable.sortOrder));

  if (!parts.length) return null;

  //build per-part stats + overall "rank points"
  const pointsByUser = new Map<number, number>();
  const nameByUser = new Map<number,{ firstName: string | null; lastName: string | null; avatarUrl: string | null }>();

  const partStats = [];

  for (const part of parts) {
    const isTime = part.metric === "time";

    // time: lower is better
    // reps/weight/distance: higher is better
    const bestExpr = isTime ? min(challengeAttemptsTable.value) : max(challengeAttemptsTable.value);

    const leaderboard = await db
      .select({
        userId: challengeAttemptsTable.userId,
        bestValue: bestExpr,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        avatarUrl: usersTable.avatarUrl
      })
      .from(challengeAttemptsTable)
      .innerJoin(usersTable, eq(usersTable.id, challengeAttemptsTable.userId))
      .innerJoin(
        teamMembersTable,
        and(
          eq(teamMembersTable.teamId, teamId),
          eq(teamMembersTable.userId, challengeAttemptsTable.userId)
        )
      )
      .where(
        and(
          eq(challengeAttemptsTable.teamChallengeId, teamChallengeId),
          eq(challengeAttemptsTable.challengePartId, part.id)
        )
      )
      .groupBy(challengeAttemptsTable.userId, usersTable.firstName, usersTable.lastName, usersTable.avatarUrl)
      .orderBy(isTime ? asc(bestExpr) : desc(bestExpr));

      // Normalize
     const normalized = leaderboard
      .map((l) => ({
        userId: l.userId,
        firstName: l.firstName,
        lastName: l.lastName,
        avatarUrl: l.avatarUrl ?? null,
        bestValue: l.bestValue === null ? null : Number(l.bestValue),
      }))
      .filter((l): l is {
        userId: number;
        firstName: string | null;
        lastName: string | null;
        avatarUrl: string | null;
        bestValue: number;
      } => l.bestValue !== null);

    // Cache names for overall
    for (const l of normalized) {
      if (!nameByUser.has(l.userId)) {
        nameByUser.set(l.userId, { firstName: l.firstName, lastName: l.lastName, avatarUrl: l.avatarUrl ?? null});
      }
    }

    // My rank/value for this part
    const myIndex = normalized.findIndex((l) => l.userId === user.id);
    const myRank = myIndex >= 0 ? myIndex + 1 : null;
    const myValue = myIndex >= 0 ? normalized[myIndex].bestValue : null;

    // Add rank points (overall)
    normalized.forEach((l, idx) => {
      const pts = idx + 1;
      pointsByUser.set(l.userId, (pointsByUser.get(l.userId) ?? 0) + pts);
    });

    const first = normalized[0] ?? null;
    const firstPlace = first
      ? {
          name: `${first.firstName ?? ""} ${first.lastName ?? ""}`.trim(),
          value: first.bestValue,
        }
      : null;

    const chartRows = normalized.slice(0, 10).map((l) => ({
      userId: l.userId,
      name:l.userId === user.id ? "You" : `${l.firstName ?? ""} ${l.lastName ?? ""}`.trim(),
      time: l.bestValue,
      avatarUrl: l.avatarUrl ?? null,
    }));

    partStats.push({
      partId: part.id,
      partName: part.name,
      metric: part.metric,
      unit: part.unit ?? null,
      myRank,
      myValue,
      totalCompetitors: normalized.length,
      firstPlace,
      chartRows,
    });
  }

  // Overall leaderboard by points (lower is better)
    const overallLeaderboard = Array.from(pointsByUser.entries())
    .map(([userId, points]) => {
      const info = nameByUser.get(userId);
      return {
        userId,
        points,
        firstName: info?.firstName ?? null,
        lastName: info?.lastName ?? null,
        avatarUrl: info?.avatarUrl ?? null,
      };
    })
    .sort((a, b) => a.points - b.points);

  const myOverallIndex = overallLeaderboard.findIndex((l) => l.userId === user.id);
  const myPoints = myOverallIndex >= 0 ? overallLeaderboard[myOverallIndex].points : null;
  const myOverallRank = myOverallIndex >= 0 ? myOverallIndex + 1 : null;

  const overallFirst = overallLeaderboard[0] ?? null;
  const overallFirstPlace = overallFirst
    ? {
        name: `${overallFirst.firstName ?? ""} ${overallFirst.lastName ?? ""}`.trim(),
        points: overallFirst.points,
      }
    : null;
    const overallChartRows = overallLeaderboard.slice(0, 10).map((l) => ({
    userId: l.userId,
    name: l.userId === user.id ? "You" : `${l.firstName ?? ""}`.trim(),
    time: l.points,
    avatarUrl: l.avatarUrl ?? null,
  }));

  return {
    challengeId,
    parts: partStats,
    overall: {
      myRank: myOverallRank,
      myPoints,
      totalCompetitors: overallLeaderboard.length,
      firstPlace: overallFirstPlace,
      chartRows: overallChartRows,
    },
  };
}