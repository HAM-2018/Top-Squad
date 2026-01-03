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

export async function getTeamChallengeStats({
  teamChallengeId,
}: {
  teamChallengeId: number;
}) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Unauthorized");

  const [me] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId));
  if (!me) throw new Error("User not found");

  const [selected] = await db
    .select({
      challengeId: teamChallengesTable.challengeId,
      challengeName: challengeTable.name,
      myTeamId: teamChallengesTable.teamId,
    })
    .from(teamChallengesTable)
    .innerJoin(challengeTable, eq(challengeTable.id, teamChallengesTable.challengeId))
    .innerJoin(
      teamMembersTable,
      and(
        eq(teamMembersTable.teamId, teamChallengesTable.teamId),
        eq(teamMembersTable.userId, me.id)
      )
    )
    .where(and(eq(teamChallengesTable.id, teamChallengeId), eq(challengeTable.isTeamBased, true)))
    .limit(1);

  if (!selected) return null;

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
    .where(eq(teamChallengesTable.challengeId, selected.challengeId));

  const teamChallengeIds = teamChallenges.map((t) => t.teamChallengeId);

  const teamMeta = new Map<number, { name: string; avatarUrl: string | null }>();
  teamChallenges.forEach((t) =>
    teamMeta.set(t.teamId, { name: t.teamName, avatarUrl: t.teamAvatarUrl ?? null })
  );

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
    .where(eq(challengePartsTable.challengeId, selected.challengeId))
    .orderBy(asc(challengePartsTable.sortOrder));

  // seed ALL teams so overall includes everyone even with no attempts
  const pointsByTeam = new Map<number, number>();
  for (const t of teamChallenges) pointsByTeam.set(t.teamId, 0);

  const partStats: Array<{
    partId: number;
    partName: string;
    metric: "time" | "distance" | "reps" | "weight";
    unit: string | null;
    isTeamLogOnly: boolean;
    myTeamRank: number | null;
    myTeamValue: number | null;
    totalTeams: number;
    teams: Array<{
      teamId: number;
      teamName: string;
      avatarUrl: string | null;
      rank: number | null;
      value: number | null;
      isMyTeam: boolean;
    }>;
    chartRows: Array<{
      teamId: number;
      name: string;
      avatarUrl: string | null;
      time: number;
      isMyTeam: boolean;
    }>;
  }> = [];

  for (const part of parts) {
    const isTime = part.metric === "time";
    const bestExpr = isTime
      ? min(challengeAttemptsTable.value)
      : max(challengeAttemptsTable.value);

    const perUserBest = await db
      .select({
        teamId: teamChallengesTable.teamId,
        userId: challengeAttemptsTable.userId,
        bestValue: bestExpr,
      })
      .from(challengeAttemptsTable)
      .innerJoin(
        teamChallengesTable,
        eq(teamChallengesTable.id, challengeAttemptsTable.teamChallengeId)
      )
      .where(
        and(
          inArray(challengeAttemptsTable.teamChallengeId, teamChallengeIds),
          eq(challengeAttemptsTable.challengePartId, part.id)
        )
      )
      .groupBy(teamChallengesTable.teamId, challengeAttemptsTable.userId);

    // roll up to team totals (ONLY teams with attempts end up here)
    const teamTotals = new Map<number, number>();
    const teamCounts = new Map<number, number>();

    for (const row of perUserBest) {
      if (row.bestValue === null) continue;

      const teamId = row.teamId;
      const v = Number(row.bestValue);

      if (part.isTeamLogOnly) {
        const cur = teamTotals.get(teamId);
        if (cur === undefined) teamTotals.set(teamId, v);
        else teamTotals.set(teamId, isTime ? Math.min(cur, v) : Math.max(cur, v));
      } else {
        // time = average of member bests, others = sum
        teamTotals.set(teamId, (teamTotals.get(teamId) ?? 0) + v);
        if (isTime) teamCounts.set(teamId, (teamCounts.get(teamId) ?? 0) + 1);
      }
    }

    // average for time (non-team-log-only)
    if (isTime && !part.isTeamLogOnly) {
      for (const [teamId, sum] of teamTotals.entries()) {
        const count = teamCounts.get(teamId) ?? 1;
        teamTotals.set(teamId, Math.round(sum / count));
      }
    }

    // leaderboard from ALL teams (null if no attempts)
    const leaderboard = teamChallenges
      .map((tc) => {
        const meta = teamMeta.get(tc.teamId);
        return {
          teamId: tc.teamId,
          name: meta?.name ?? `Team ${tc.teamId}`,
          avatarUrl: meta?.avatarUrl ?? null,
          total: (teamTotals.get(tc.teamId) ?? null) as number | null,
          isMyTeam: tc.teamId === selected.myTeamId,
        };
      })
      .sort((a, b) => {
        if (a.total === null && b.total === null) return 0;
        if (a.total === null) return 1;
        if (b.total === null) return -1;
        return isTime ? a.total - b.total : b.total - a.total;
      });

    const scored = leaderboard.filter((t) => t.total !== null) as Array<
      Omit<(typeof leaderboard)[number], "total"> & { total: number }
    >;

    const rankByTeam = new Map<number, number>();
    scored.forEach((t, idx) => rankByTeam.set(t.teamId, idx + 1));

    const myRow = leaderboard.find((t) => t.teamId === selected.myTeamId) ?? null;
    const myTeamValue = myRow?.total ?? null;
    const myTeamRank =
      myRow?.total === null ? null : (rankByTeam.get(selected.myTeamId) ?? null);

    // award points only to scored teams
    scored.forEach((t, idx) => {
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

      teams: leaderboard.map((t) => ({
        teamId: t.teamId,
        teamName: t.name,
        avatarUrl: t.avatarUrl,
        rank: rankByTeam.get(t.teamId) ?? null,
        value: t.total,
        isMyTeam: t.isMyTeam,
      })),

      chartRows: scored.slice(0, 10).map((t) => ({
        teamId: t.teamId,
        name: t.name,
        avatarUrl: t.avatarUrl,
        time: t.total,
        isMyTeam: t.isMyTeam,
      })),
    });
  }

  // overall = low points is better
  const overallLeaderboard = Array.from(pointsByTeam.entries())
    .map(([teamId, points]) => {
      const meta = teamMeta.get(teamId);
      return {
        teamId,
        points,
        name: meta?.name ?? `Team ${teamId}`,
        avatarUrl: meta?.avatarUrl ?? null,
        isMyTeam: teamId === selected.myTeamId,
      };
    })
    .sort((a, b) => a.points - b.points);

  const myOverallIndex = overallLeaderboard.findIndex((t) => t.teamId === selected.myTeamId);

  return {
    challengeId: selected.challengeId,
    challengeName: selected.challengeName,
    myTeamId: selected.myTeamId,
    parts: partStats,
    overall: {
      myTeamRank: myOverallIndex >= 0 ? myOverallIndex + 1 : null,
      myTeamPoints: myOverallIndex >= 0 ? overallLeaderboard[myOverallIndex].points : null,
      totalTeams: overallLeaderboard.length,

      teams: overallLeaderboard.map((t, idx) => ({
        teamId: t.teamId,
        teamName: t.name,
        avatarUrl: t.avatarUrl,
        rank: idx + 1,
        points: t.points,
        isMyTeam: t.isMyTeam,
      })),

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
