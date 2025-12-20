import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import {
  challengeAttemptsTable,
  challengePartsTable,
  challengeTable,
  teamChallengesTable,
  teamMembersTable,
  teamsTable,
  usersTable,
} from "@/db/schema";
import { and, asc, desc, eq, inArray, min, max } from "drizzle-orm";

export async function getTeamChallengeStats() {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Unauthorized");

  const [me] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!me) throw new Error("User not found");

  const [myTeam] = await db
  .select({ teamId: teamMembersTable.teamId })
  .from(teamMembersTable)
  .where(eq(teamMembersTable.userId, me.id))
  .limit(1);

if (!myTeam) return null;

const [challenge] = await db
  .select({
    challengeId: teamChallengesTable.challengeId,
    challengeName: challengeTable.name,
    myTeamId: teamChallengesTable.teamId,
  })
  .from(teamChallengesTable)
  .innerJoin(challengeTable, eq(challengeTable.id, teamChallengesTable.challengeId))
  .where(
    and(
      eq(teamChallengesTable.teamId, myTeam.teamId),
      eq(challengeTable.isTeamBased, true)))
  .orderBy(desc(teamChallengesTable.createdAt))
  .limit(1);

if (!challenge) return null;

  // all teams participating in this challenge
  const teamChallenges = await db
    .select({
      teamChallengeId: teamChallengesTable.id,
      teamId: teamChallengesTable.teamId,
      teamName: teamsTable.name,
      teamAvatarUrl: teamsTable.avatarUrl,
    })
    .from(teamChallengesTable)
    .innerJoin(teamsTable, eq(teamsTable.id, teamChallengesTable.teamId))
    .where(eq(teamChallengesTable.challengeId, challenge.challengeId));

  const teamChallengeIds = teamChallenges.map((t) => t.teamChallengeId);
  const teamMeta = new Map<number, { name: string; avatarUrl: string | null }>();
  teamChallenges.forEach((t) => teamMeta.set(t.teamId, { name: t.teamName, avatarUrl: t.teamAvatarUrl ?? null }));

  // parts
  const parts = await db
    .select({
      id: challengePartsTable.id,
      name: challengePartsTable.name,
      metric: challengePartsTable.metric,
      unit: challengePartsTable.unit,
      sortOrder: challengePartsTable.sortOrder,
      isTeamLogOnly: challengePartsTable.isTeamLogOnly,
    })
    .from(challengePartsTable)
    .where(eq(challengePartsTable.challengeId, challenge.challengeId))
    .orderBy(asc(challengePartsTable.sortOrder));

  const pointsByTeam = new Map<number, number>();
  const partStats: any[] = [];

  for (const part of parts) {
    const isTime = part.metric === "time";
    const bestExpr = isTime ? min(challengeAttemptsTable.value) : max(challengeAttemptsTable.value);

    const perUserBest = await db
      .select({
        teamId: teamChallengesTable.teamId,
        userId: challengeAttemptsTable.userId,
        bestValue: bestExpr,
      })
      .from(challengeAttemptsTable)
      .innerJoin(teamChallengesTable, eq(teamChallengesTable.id, challengeAttemptsTable.teamChallengeId))
      .where(
        and(
          inArray(challengeAttemptsTable.teamChallengeId, teamChallengeIds),
          eq(challengeAttemptsTable.challengePartId, part.id)
        )
      )
      .groupBy(teamChallengesTable.teamId, challengeAttemptsTable.userId);

    // roll up to team totals
    const teamTotals = new Map<number, number>();
    const teamCounts = new Map<number, number>(); 

    for (const row of perUserBest) {
      if (row.bestValue === null) continue;

      const teamId = row.teamId;
      const v = Number(row.bestValue);

      if (part.isTeamLogOnly) {
        // one team value 
        const cur = teamTotals.get(teamId);
        if (cur === undefined) {
          teamTotals.set(teamId, v);
        } else {
          teamTotals.set(teamId, isTime ? Math.min(cur, v) : Math.max(cur, v));
        }
      } else {
        // Time averages all other metrics sum
        if (isTime) {
          teamTotals.set(teamId, (teamTotals.get(teamId) ?? 0) + v);
          teamCounts.set(teamId, (teamCounts.get(teamId) ?? 0) + 1);
        } else {
          teamTotals.set(teamId, (teamTotals.get(teamId) ?? 0) + v);
        }
      }
    }

    // sum averages for time metric
    if (isTime && !part.isTeamLogOnly) {
      for (const [teamId, sum] of teamTotals.entries()) {
        const count = teamCounts.get(teamId) ?? 1;
        teamTotals.set(teamId, Math.round(sum / count));
      }
    }


    const leaderboard = Array.from(teamTotals.entries())
      .map(([teamId, total]) => {
        const meta = teamMeta.get(teamId);
        return {
          teamId,
          name: meta?.name ?? `Team ${teamId}`,
          avatarUrl: meta?.avatarUrl ?? null,
          total,
          isMyTeam: teamId === challenge.myTeamId,
        };
      })
      .sort((a, b) => (isTime ? a.total - b.total : b.total - a.total));

    const myIndex = leaderboard.findIndex((t) => t.teamId === challenge.myTeamId);
    const myTeamRank = myIndex >= 0 ? myIndex + 1 : null;
    const myTeamValue = myIndex >= 0 ? leaderboard[myIndex].total : null;

    leaderboard.forEach((t, idx) => {
      pointsByTeam.set(t.teamId, (pointsByTeam.get(t.teamId) ?? 0) + (idx + 1));
    });

    partStats.push({
      partId: part.id,
      partName: part.name,
      metric: part.metric,
      unit: part.unit ?? null,
      isTeamLogOnly: part.isTeamLogOnly,
      myTeamRank,
      myTeamValue,
      totalTeams: leaderboard.length,
      chartRows: leaderboard.slice(0, 10).map((t) => ({
        teamId: t.teamId,
        name: t.name,
        avatarUrl: t.avatarUrl,
        time: t.total,
        isMyTeam: t.isMyTeam,
      })),
    });
  }

  const overallLeaderboard = Array.from(pointsByTeam.entries())
    .map(([teamId, points]) => {
      const meta = teamMeta.get(teamId);
      return {
        teamId,
        points,
        name: meta?.name ?? `Team ${teamId}`,
        avatarUrl: meta?.avatarUrl ?? null,
        isMyTeam: teamId === challenge.myTeamId,
      };
    })
    .sort((a, b) => a.points - b.points);

  const myOverallIndex = overallLeaderboard.findIndex((t) => t.teamId === challenge.myTeamId);

  return {
    challengeId: challenge.challengeId,
    challengeName: challenge.challengeName,
    myTeamId: challenge.myTeamId,
    parts: partStats,
    overall: {
      myTeamRank: myOverallIndex >= 0 ? myOverallIndex + 1 : null,
      myTeamPoints: myOverallIndex >= 0 ? overallLeaderboard[myOverallIndex].points : null,
      totalTeams: overallLeaderboard.length,
      chartRows: overallLeaderboard.slice(0, 10).map((t) => ({
        teamId: t.teamId,
        name: t.name,
        avatarUrl: t.avatarUrl,
        time: t.points,
        isMyTeam: t.isMyTeam,
      })),
    },
  };
}
