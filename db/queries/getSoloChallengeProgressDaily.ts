import { db } from "@/db";
import {
  challengeAttemptsTable,
  challengePartsTable,
  challengeTable,
  teamChallengesTable,
  teamMembersTable,
  usersTable,
} from "@/db/schema";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { SoloProgress } from "@/types/lineGraphStats";
import { dayRange } from "@/lib/dayRange";



export async function getSoloChallengeProgressDaily(
  userId: number,
  teamChallengeId: number
): Promise<SoloProgress | null> {
  if (!userId) throw new Error("Unauthorized");

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
    isMe: m.userId === userId,
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

  if (parts.length === 0) {
    return { teamChallengeId: tc.id, users, overall: [], parts: {} };
  }

  const partIds = parts.map((p) => p.id);
  const metricByPart = new Map<number, string>(parts.map((p) => [p.id, p.metric]));

  // date bounds
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

  const days = dayRange(minDay, maxDay);

  // Fetch all attempts once
  const attempts = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${challengeAttemptsTable.recordedAt}), 'YYYY-MM-DD')`,
      userId: challengeAttemptsTable.userId,
      partId: challengeAttemptsTable.challengePartId,
      value: challengeAttemptsTable.value,
    })
    .from(challengeAttemptsTable)
    .where(
      and(
        eq(challengeAttemptsTable.teamChallengeId, tc.id),
        inArray(challengeAttemptsTable.userId, userIds),
        inArray(challengeAttemptsTable.challengePartId, partIds)
      )
    );


  //Build daily best-by (day, partId, userId)
  // dailyBest.get(day).get(partId).get(userId) => best value on day
  const dailyBest = new Map<string, Map<number, Map<number, number>>>();

  for (const a of attempts) {
    const day = a.day;
    const partId = a.partId;
    const uid = a.userId;

    if (a.value == null) continue;
    const val = Number(a.value);
    const metric = metricByPart.get(partId) ?? "";
    const isTime = metric === "time";

    let byPart = dailyBest.get(day);
    if (!byPart) {
      byPart = new Map();
      dailyBest.set(day, byPart);
    }

    let byUser = byPart.get(partId);
    if (!byUser) {
      byUser = new Map();
      byPart.set(partId, byUser);
    }

    const prev = byUser.get(uid);
    if (prev == null) {
      byUser.set(uid, val);
    } else {
      // best within the same day
      byUser.set(uid, isTime ? Math.min(prev, val) : Math.max(prev, val));
    }
  }

  // days in order, maintaining running "best so far" per part/user
  const partsOut: SoloProgress["parts"] = {};
  const overallOut: SoloProgress["overall"] = [];

  // runningBest.get(partId).get(userId) => best so far up to current day
  const runningBest = new Map<number, Map<number, number | null>>();
  for (const p of parts) {
    const m = new Map<number, number | null>();
    for (const uid of userIds) m.set(uid, null);
    runningBest.set(p.id, m);
  }

  for (const t of days) {
    // update running best using today's daily best
    const today = dailyBest.get(t);

    // ranks per part for this day (uid -> rank)
    const ranksByPart = new Map<number, Map<number, number>>();

    for (const p of parts) {
      const metric = p.metric;
      const isTime = metric === "time";
      const rb = runningBest.get(p.id)!;

      const todayForPart = today?.get(p.id); // Map<uid, bestToday>

      if (todayForPart) {
        for (const [uid, bestToday] of todayForPart.entries()) {
          const prev = rb.get(uid);
          if (prev == null) rb.set(uid, bestToday);
          else rb.set(uid, isTime ? Math.min(prev, bestToday) : Math.max(prev, bestToday));
        }
      }

      // emit values for this part/day
      const values: Record<number, number | null> = {};
      for (const uid of userIds) values[uid] = rb.get(uid) ?? null;

      const key = String(p.id);
      if (!partsOut[key]) partsOut[key] = [];
      partsOut[key].push({ t, values });

      // compute ranks for this part/day
      const ranked = userIds
        .map((uid) => ({ uid, total: rb.get(uid) ?? null }))
        .filter((x): x is { uid: number; total: number } => x.total !== null);

      ranked.sort((a, b) => (isTime ? a.total - b.total : b.total - a.total));

      const ranks = new Map<number, number>();
      ranked.forEach((u, idx) => ranks.set(u.uid, idx + 1));
      ranksByPart.set(p.id, ranks);
    }

    // overall points = sum of ranks across parts (only when ranked)
    const pointsByUser = new Map<number, number>();
    for (const ranks of ranksByPart.values()) {
      for (const [uid, rnk] of ranks.entries()) {
        pointsByUser.set(uid, (pointsByUser.get(uid) ?? 0) + rnk);
      }
    }

    const overallValues: Record<number, number | null> = {};
    for (const uid of userIds) {
      overallValues[uid] = pointsByUser.has(uid) ? pointsByUser.get(uid)! : null;
    }

    overallOut.push({ t, values: overallValues });
  }

  return {
    teamChallengeId: tc.id,
    users,
    overall: overallOut,
    parts: partsOut,
  };
}
