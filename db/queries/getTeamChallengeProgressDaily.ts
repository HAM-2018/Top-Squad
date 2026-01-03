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
import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";
import type { TeamProgress } from "@/types/lineGraphStats";

export async function getTeamChallengeProgressDaily(
  teamChallengeId: number
): Promise<TeamProgress | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Unauthorized");

  const [me] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!me) throw new Error("User not found");

  const [selected] = await db
    .select({
      challengeId: teamChallengesTable.challengeId,
      myTeamId: teamChallengesTable.teamId,
    })
    .from(teamChallengesTable)
    .innerJoin(challengeTable, eq(challengeTable.id, teamChallengesTable.challengeId))
    .innerJoin(
      teamMembersTable,
      and(eq(teamMembersTable.teamId, teamChallengesTable.teamId), eq(teamMembersTable.userId, me.id))
    )
    .where(and(eq(teamChallengesTable.id, teamChallengeId), eq(challengeTable.isTeamBased, true)))
    .limit(1);

  if (!selected) return null;

  // teams in this challenge
  const teamChallenges = await db
    .select({
      teamChallengeId: teamChallengesTable.id,
      teamId: teamChallengesTable.teamId,
      teamName: teamsTable.name,
    })
    .from(teamChallengesTable)
    .innerJoin(teamsTable, eq(teamsTable.id, teamChallengesTable.teamId))
    .where(eq(teamChallengesTable.challengeId, selected.challengeId));

  const teamChallengeIds = teamChallenges.map((t) => t.teamChallengeId);
  const teamIds = teamChallenges.map((t) => t.teamId);

  const teams = teamChallenges.map((t) => ({
    teamId: t.teamId,
    name: t.teamName,
    isMyTeam: t.teamId === selected.myTeamId,
  }));

  // parts
  const parts = await db
    .select({
      id: challengePartsTable.id,
      metric: challengePartsTable.metric,
      isTeamLogOnly: challengePartsTable.isTeamLogOnly,
      sortOrder: challengePartsTable.sortOrder,
    })
    .from(challengePartsTable)
    .where(eq(challengePartsTable.challengeId, selected.challengeId))
    .orderBy(asc(challengePartsTable.sortOrder));

  if (teamChallengeIds.length === 0) {
    return { challengeId: selected.challengeId, teams, overall: [], parts: {} };
  }

  const [bounds] = await db
    .select({
      minDay: sql<string | null>`
        to_char(date_trunc('day', min(${challengeAttemptsTable.recordedAt})), 'YYYY-MM-DD')
      `,
      maxDay: sql<string | null>`
        to_char(date_trunc('day', max(${challengeAttemptsTable.recordedAt})), 'YYYY-MM-DD')
      `,
    })
    .from(challengeAttemptsTable)
    .where(inArray(challengeAttemptsTable.teamChallengeId, teamChallengeIds));

  const minDay = bounds?.minDay ?? null;
  const maxDay = bounds?.maxDay ?? null;

  if (!minDay || !maxDay) {
    return { challengeId: selected.challengeId, teams, overall: [], parts: {} };
  }

  const days = await db.execute<{ t: string }>(sql`
    SELECT to_char(d::date, 'YYYY-MM-DD') as t
    FROM generate_series(${minDay}::date, ${maxDay}::date, interval '1 day') d
    ORDER BY d ASC
  `);

  async function valuesAndRanksForPartAtDay(
    partId: number,
    metric: string,
    isTeamLogOnly: boolean,
    day: string
  ) {
    const isTime = metric === "time";
    const bestExpr = isTime
      ? sql<number>`min(${challengeAttemptsTable.value})`
      : sql<number>`max(${challengeAttemptsTable.value})`;

    const cutoff = sql`${day}::date + interval '1 day' - interval '1 second'`;

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
          eq(challengeAttemptsTable.challengePartId, partId),
          lte(challengeAttemptsTable.recordedAt, cutoff)
        )
      )
      .groupBy(teamChallengesTable.teamId, challengeAttemptsTable.userId);

    const totals = new Map<number, number>();
    const counts = new Map<number, number>();

    for (const row of perUserBest) {
      if (row.bestValue == null) continue;
      const teamId = row.teamId;
      const v = Number(row.bestValue);

      if (isTeamLogOnly) {
        const cur = totals.get(teamId);
        if (cur === undefined) totals.set(teamId, v);
        else totals.set(teamId, isTime ? Math.min(cur, v) : Math.max(cur, v));
      } else {
        totals.set(teamId, (totals.get(teamId) ?? 0) + v);
        counts.set(teamId, (counts.get(teamId) ?? 0) + 1);
      }
    }

    if (isTime && !isTeamLogOnly) {
      for (const [teamId, sum] of totals.entries()) {
        const c = counts.get(teamId) ?? 1;
        totals.set(teamId, Math.round(sum / c));
      }
    }

    const values: Record<number, number | null> = {};
    for (const teamId of teamIds) {
      values[teamId] = totals.has(teamId) ? (totals.get(teamId) ?? null) : null;
    }

    const ranked = teamIds
      .map((teamId) => ({ teamId, total: totals.get(teamId) ?? null }))
      .filter((x) => x.total !== null) as { teamId: number; total: number }[];

    ranked.sort((a, b) => (isTime ? a.total - b.total : b.total - a.total));

    const ranks: Record<number, number> = {};
    ranked.forEach((t, idx) => (ranks[t.teamId] = idx + 1));

    return { values, ranks };
  }

  const partsOut: Record<string, { t: string; values: Record<number, number | null> }[]> = {};
  const overallOut: { t: string; values: Record<number, number | null> }[] = [];

  for (const d of days.rows) {
    const t = d.t;

    const ranksByPart = new Map<number, Record<number, number>>();

    for (const p of parts) {
      const { values, ranks } = await valuesAndRanksForPartAtDay(p.id, p.metric, p.isTeamLogOnly, t);

      const key = String(p.id);
      if (!partsOut[key]) partsOut[key] = [];
      partsOut[key].push({ t, values });

      ranksByPart.set(p.id, ranks);
    }

    const pointsByTeam = new Map<number, number>();

    for (const ranks of ranksByPart.values()) {
      for (const [teamIdStr, rnk] of Object.entries(ranks)) {
        const teamId = Number(teamIdStr);
        pointsByTeam.set(teamId, (pointsByTeam.get(teamId) ?? 0) + rnk);
      }
    }

    const overallValues: Record<number, number | null> = {};
    for (const teamId of teamIds) {
      overallValues[teamId] = pointsByTeam.has(teamId) ? pointsByTeam.get(teamId)! : null;
    }

    overallOut.push({ t, values: overallValues });
  }

  return {
    challengeId: selected.challengeId,
    teams,
    overall: overallOut,
    parts: partsOut,
  };
}
