import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import {
  challengeAttemptsTable,
  challengePartsTable,
  challengeTable,
  teamChallengesTable,
  teamMembersTable,
  usersTable,
} from "@/db/schema";
import { and, asc, eq, lte, sql } from "drizzle-orm";
import type { SoloProgress } from "@/types/lineGraphStats";

export async function getSoloChallengeProgressDaily(
  teamChallengeId: number
): Promise<SoloProgress | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Unauthorized");

  const [me] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!me) throw new Error("User not found");

  // identify the selected teamChallenge
  const [tc] = await db
    .select({
      id: teamChallengesTable.id,
      teamId: teamChallengesTable.teamId,
      challengeId: teamChallengesTable.challengeId,
    })
    .from(teamChallengesTable)
    .where(eq(teamChallengesTable.id, teamChallengeId))
    .limit(1);

  if (!tc) return null;

  // ensure it's a solo challenge
  const [challenge] = await db
    .select({ isTeamBased: challengeTable.isTeamBased })
    .from(challengeTable)
    .where(eq(challengeTable.id, tc.challengeId))
    .limit(1);

  if (!challenge || challenge.isTeamBased) return null;

  // users on team
  const members = await db
    .select({
      userId: usersTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      email: usersTable.email,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(teamMembersTable)
    .innerJoin(usersTable, eq(usersTable.id, teamMembersTable.userId))
    .where(eq(teamMembersTable.teamId, tc.teamId));

  const userIds = members.map((m) => m.userId);
  if (userIds.length === 0) return null;

  const users = members.map((m) => ({
    userId: m.userId,
    name: `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() || m.email,
    isMe: m.userId === me.id,
    avatarUrl: m.avatarUrl ?? null,
  }));

  // parts for this challenge
  const parts = await db
    .select({
      id: challengePartsTable.id,
      metric: challengePartsTable.metric,
      sortOrder: challengePartsTable.sortOrder,
    })
    .from(challengePartsTable)
    .where(eq(challengePartsTable.challengeId, tc.challengeId))
    .orderBy(asc(challengePartsTable.sortOrder));

  // dates from attempts for this teamChallenge
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
    .where(eq(challengeAttemptsTable.teamChallengeId, tc.id));

  const minDay = bounds?.minDay ?? null;
  const maxDay = bounds?.maxDay ?? null;

  if (!minDay || !maxDay) {
    return { teamChallengeId: tc.id, users, overall: [], parts: {} };
  }

  const days = await db.execute<{ t: string }>(sql`
    SELECT to_char(d::date, 'YYYY-MM-DD') as t
    FROM generate_series(${minDay}::date, ${maxDay}::date, interval '1 day') d
    ORDER BY d ASC
  `);

  async function valuesAndRanksForPartAtDay(partId: number, metric: string, day: string) {
    const isTime = metric === "time";
    const bestExpr = isTime
      ? sql<number>`min(${challengeAttemptsTable.value})`
      : sql<number>`max(${challengeAttemptsTable.value})`;

    const cutoff = sql`${day}::date + interval '1 day' - interval '1 second'`;

    const perUserBest = await db
      .select({
        userId: challengeAttemptsTable.userId,
        bestValue: bestExpr,
      })
      .from(challengeAttemptsTable)
      .where(
        and(
          eq(challengeAttemptsTable.teamChallengeId, tc.id),
          eq(challengeAttemptsTable.challengePartId, partId),
          lte(challengeAttemptsTable.recordedAt, cutoff)
        )
      )
      .groupBy(challengeAttemptsTable.userId);

    const totals = new Map<number, number>();
    for (const row of perUserBest) {
      if (row.bestValue == null) continue;
      totals.set(row.userId, Number(row.bestValue));
    }

    const values: Record<number, number | null> = {};
    for (const uid of userIds) values[uid] = totals.has(uid) ? totals.get(uid)! : null;

    const ranked = userIds
      .map((uid) => ({ uid, total: totals.get(uid) ?? null }))
      .filter((x) => x.total !== null) as { uid: number; total: number }[];

    ranked.sort((a, b) => (isTime ? a.total - b.total : b.total - a.total));

    const ranks: Record<number, number> = {};
    ranked.forEach((u, idx) => (ranks[u.uid] = idx + 1));

    return { values, ranks };
  }

  const partsOut: SoloProgress["parts"] = {};
  const overallOut: SoloProgress["overall"] = [];

  for (const d of days.rows) {
    const t = d.t;

    const ranksByPart = new Map<number, Record<number, number>>();

    for (const p of parts) {
      const { values, ranks } = await valuesAndRanksForPartAtDay(p.id, p.metric, t);

      const key = String(p.id);
      if (!partsOut[key]) partsOut[key] = [];
      partsOut[key].push({ t, values });

      ranksByPart.set(p.id, ranks);
    }

    // overall points = sum of ranks across parts
    const pointsByUser = new Map<number, number>();
    for (const ranks of ranksByPart.values()) {
      for (const [uidStr, rnk] of Object.entries(ranks)) {
        const uid = Number(uidStr);
        pointsByUser.set(uid, (pointsByUser.get(uid) ?? 0) + rnk);
      }
    }

    const overallValues: Record<number, number | null> = {};
    for (const uid of userIds) overallValues[uid] = pointsByUser.has(uid) ? pointsByUser.get(uid)! : null;

    overallOut.push({ t, values: overallValues });
  }

  return {
    teamChallengeId: tc.id,
    users,
    overall: overallOut,
    parts: partsOut,
  };
}
