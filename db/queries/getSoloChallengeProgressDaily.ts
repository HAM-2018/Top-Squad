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
import type { DailyCell } from "@/types/challengeProgressDaily";
import type { Aggregation, Better } from "@/types/scoring";
import {applyAttemptToDailyCell, mergeRunningCell, cellToNumber, ensureMap, computeRanks} from "@/lib/progressCells";

export async function getSoloChallengeProgressDaily(
  userId: number,
  teamChallengeId: number
): Promise<SoloProgress | null> {
  if (!userId) throw new Error("Unauthorized");

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

  const [challenge] = await db
    .select({ isTeamBased: challengeTable.isTeamBased })
    .from(challengeTable)
    .where(eq(challengeTable.id, tc.challengeId))
    .limit(1);

  // Solo progress endpoint only applies to non-team-based challenges
  if (!challenge || challenge.isTeamBased) return null;

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

  const parts = await db
    .select({
      id: challengePartsTable.id,
      metric: challengePartsTable.metric,
      sortOrder: challengePartsTable.sortOrder,
      aggregation: challengePartsTable.aggregation,
      better: challengePartsTable.better,
    })
    .from(challengePartsTable)
    .where(eq(challengePartsTable.challengeId, tc.challengeId))
    .orderBy(asc(challengePartsTable.sortOrder));

  if (parts.length === 0) {
    return { teamChallengeId: tc.id, users, overall: [], parts: {} };
  }

  const partIds = parts.map((p) => p.id);

  // Part configuration (shared types)
  const configurationByPart = new Map<
    number,
    { metric: string; aggregation: Aggregation; better: Better }
  >(
    parts.map((p) => [
      p.id,
      {
        metric: p.metric,
        aggregation: (p.aggregation ?? "best") as Aggregation,
        better: (p.better ?? "higher") as Better,
      },
    ])
  );

  // Find min/max day bounds so we can build a continuous day range
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

  // Pull raw attempts
  const attempts = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${challengeAttemptsTable.recordedAt}), 'YYYY-MM-DD')`,
      userId: challengeAttemptsTable.userId,
      partId: challengeAttemptsTable.challengePartId,
      value: challengeAttemptsTable.value,
      recordedAt: challengeAttemptsTable.recordedAt,
      id: challengeAttemptsTable.id,
    })
    .from(challengeAttemptsTable)
    .innerJoin(challengePartsTable, eq(challengePartsTable.id, challengeAttemptsTable.challengePartId))
    .where(
      and(
        eq(challengeAttemptsTable.teamChallengeId, tc.id),
        eq(challengePartsTable.challengeId, tc.challengeId),
        inArray(challengeAttemptsTable.userId, userIds),
        inArray(challengeAttemptsTable.challengePartId, partIds)
      )
    );

  // dailyAgg[day][partId][userId] = DailyCell (daily aggregation)
  const dailyAgg = new Map<string, Map<number, Map<number, DailyCell>>>();

  // Build daily aggregates using shared helper
  for (const a of attempts) {
    if (a.value == null) continue;

    const cfg = configurationByPart.get(a.partId);
    if (!cfg) continue;

    const byPart = ensureMap(dailyAgg, a.day, () => new Map<number, Map<number, DailyCell>>());
    const byUser = ensureMap(byPart, a.partId, () => new Map<number, DailyCell>());

    const prev = byUser.get(a.userId);
    const next = applyAttemptToDailyCell(
      prev,
      { value: Number(a.value), recordedAt: a.recordedAt ?? null, id: a.id ?? null },
      { aggregation: cfg.aggregation, better: cfg.better }
    );

    byUser.set(a.userId, next);
  }

  // Output containers
  const partsOut: SoloProgress["parts"] = {};
  const overallOut: SoloProgress["overall"] = [];
  for (const p of parts) partsOut[String(p.id)] = [];

  // running[partId][userId] = DailyCell (running accumulation over days)
  const running = new Map<number, Map<number, DailyCell | undefined>>();
  for (const p of parts) {
    const m = new Map<number, DailyCell | undefined>();
    for (const uid of userIds) m.set(uid, undefined);
    running.set(p.id, m);
  }

  // Walk across days (continuous range) and build the line-series points
  for (const t of days) {
    const today = dailyAgg.get(t);
    const ranksByPart = new Map<number, Map<number, number>>();

    for (const p of parts) {
      const partId = p.id;
      const cfg = configurationByPart.get(partId)!;

      const byUserToday = today?.get(partId); // Map<userId, DailyCell> | undefined
      const runByUser = running.get(partId)!;

      // Update running state for every user
      for (const uid of userIds) {
        const prev = runByUser.get(uid);
        const next = mergeRunningCell(prev, byUserToday?.get(uid), {
          aggregation: cfg.aggregation,
          better: cfg.better,
        });
        runByUser.set(uid, next);
      }

      // Build values for this day (what line chart uses)
      const values: Record<number, number | null> = {};
      for (const uid of userIds) {
        values[uid] = cellToNumber(runByUser.get(uid));
      }

      // Emit timepoint for this part
      partsOut[String(partId)].push({ t, values });

      // Build ranks for overall scoring (same pattern as you already had)
      const ranks = computeRanks(userIds, values, cfg.better);
      ranksByPart.set(partId, ranks);
    }

    // Overall points = sum of ranks across parts (rank 1 is best => 1 point, etc.)
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
