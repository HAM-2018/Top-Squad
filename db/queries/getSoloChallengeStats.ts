import { db } from "..";
import {
  challengeAttemptsTable,
  challengePartsTable,
  challengeTable,
  teamChallengesTable,
  teamMembersTable,
  usersTable,
} from "../schema";
import { and, asc, desc, eq, max, min, sum, avg, sql } from "drizzle-orm";

import type { MultiPartChallengeStats } from "@/types/individualchallengeStats";
import type { BestAttempt, ChallengeScoring, PointsMode } from "@/types/scoring";
import { computeSoloStats } from "@/lib/computeSoloStats";
import { pickAggregatedValue } from "@/lib/scoringRules";

export async function getSoloChallengeStats(input: {
  teamChallengeId?: number;
  userId: number;
}): Promise<MultiPartChallengeStats | null> {
  if (!input?.userId) throw new Error("Unauthorized");

  const whereClause = input.teamChallengeId
    ? and(
        eq(challengeAttemptsTable.userId, input.userId),
        eq(challengeTable.isTeamBased, false),
        eq(challengeAttemptsTable.teamChallengeId, input.teamChallengeId)
      )
    : and(eq(challengeAttemptsTable.userId, input.userId), eq(challengeTable.isTeamBased, false));

  const [selected] = await db
    .select({
      challengeId: challengeTable.id,
      teamChallengeId: teamChallengesTable.id,
      teamId: teamChallengesTable.teamId,
    })
    .from(challengeAttemptsTable)
    .innerJoin(teamChallengesTable, eq(teamChallengesTable.id, challengeAttemptsTable.teamChallengeId))
    .innerJoin(challengeTable, eq(challengeTable.id, teamChallengesTable.challengeId))
    .innerJoin(
      teamMembersTable,
      and(
        eq(teamMembersTable.teamId, teamChallengesTable.teamId),
        eq(teamMembersTable.userId, challengeAttemptsTable.userId)
      )
    )
    .where(whereClause)
    .orderBy(desc(challengeAttemptsTable.recordedAt))
    .limit(1);

  if (!selected) return null;

  const { challengeId, teamChallengeId, teamId } = selected;

  // parts + scoring config
  const partsRows = await db
    .select({
      id: challengePartsTable.id,
      name: challengePartsTable.name,
      metric: challengePartsTable.metric,
      unit: challengePartsTable.unit,
      sortOrder: challengePartsTable.sortOrder,
      better: challengePartsTable.better,
      aggregation: challengePartsTable.aggregation, 
      weight: challengePartsTable.weight,
      pointsMode: challengePartsTable.pointsMode,
    })
    .from(challengePartsTable)
    .where(eq(challengePartsTable.challengeId, challengeId))
    .orderBy(asc(challengePartsTable.sortOrder));

  if (!partsRows.length) return null;

  const parts: ChallengeScoring[] = partsRows.map((p) => ({
    partId: p.id,
    partName: p.name,
    metric: p.metric,
    unit: p.unit ?? null,
    better: p.better,
    aggregation: p.aggregation,
    weight: Number(p.weight ?? 1),
    pointsMode: p.pointsMode,
  }));

  const partConfigById = new Map(parts.map((p) => [p.partId, p]));

  // ONE query: per user + part aggregates (min/max/sum/avg)
  const summary = await db
    .select({
      partId: challengeAttemptsTable.challengePartId,
      userId: challengeAttemptsTable.userId,

      minValue: min(challengeAttemptsTable.value),
      maxValue: max(challengeAttemptsTable.value),
      sumValue: sum(challengeAttemptsTable.value),
      avgValue: avg(challengeAttemptsTable.value),

      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(challengeAttemptsTable)
    .innerJoin(usersTable, eq(usersTable.id, challengeAttemptsTable.userId))
    .innerJoin(
      teamMembersTable,
      and(eq(teamMembersTable.teamId, teamId), eq(teamMembersTable.userId, challengeAttemptsTable.userId))
    )
    .where(eq(challengeAttemptsTable.teamChallengeId, teamChallengeId))
    .groupBy(
      challengeAttemptsTable.challengePartId,
      challengeAttemptsTable.userId,
      usersTable.firstName,
      usersTable.lastName,
      usersTable.avatarUrl
    );

  // only need if any is "latest"
  const latest = parts.some((p) => p.aggregation === "latest");
  const latestByUserPart = new Map<string, number>();
  if (latest) {
    const latestRows = await db.execute(sql<{
      part_id: number;
      user_id: number;
      latest_value: number;
    }>`
      SELECT DISTINCT ON (a.user_id, a.challenge_part_id)
        a.challenge_part_id AS part_id,
        a.user_id          AS user_id,
        a.value            AS latest_value
      FROM challenge_attempts a
      JOIN team_members tm
        ON tm.user_id = a.user_id
       AND tm.team_id = ${teamId}
      WHERE a.team_challenge_id = ${teamChallengeId}
      ORDER BY a.user_id, a.challenge_part_id, a.recorded_at DESC, a.id DESC
    `);

    for (const r of latestRows.rows) {
      latestByUserPart.set(`${r.user_id}:${r.part_id}`, Number(r.latest_value));
    }
  }

  const bestAttemptsByPart = new Map<number, BestAttempt[]>();

  for (const row of summary) {
  const configuration = partConfigById.get(row.partId);
  if (!configuration) continue;

  const minV = row.minValue == null ? null : Number(row.minValue);
  const maxV = row.maxValue == null ? null : Number(row.maxValue);
  const sumV = row.sumValue == null ? null : Number(row.sumValue);
  const avgV = row.avgValue == null ? null : Number(row.avgValue);
  const latestV = latestByUserPart.get(`${row.userId}:${row.partId}`) ?? null;

  const bestValue = pickAggregatedValue(
    { aggregation: configuration.aggregation ?? "best", better: configuration.better ?? "higher" },
    { minV, maxV, sumV, avgV, latestV }
  );

  if (bestValue == null) continue;

  const arr = bestAttemptsByPart.get(row.partId) ?? [];
  arr.push({
    partId: row.partId,
    userId: row.userId,
    bestValue,
    firstName: row.firstName,
    lastName: row.lastName,
    avatarUrl: row.avatarUrl ?? null,
  });
  bestAttemptsByPart.set(row.partId, arr);
}

  // overall mode
  const overallPointsMode: PointsMode = parts[0]?.pointsMode ?? "rank_low_wins";

  return computeSoloStats({
    challengeId,
    parts,
    bestAttemptsByPart,
    userId: input.userId,
    overallPointsMode,
  });
}
