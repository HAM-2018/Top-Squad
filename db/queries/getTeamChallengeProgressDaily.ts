import { db } from "@/db";
import {
  challengeAttemptsTable,
  challengePartsTable,
  challengeTable,
  teamChallengesTable,
  teamMembersTable,
  teamsTable,
} from "@/db/schema";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { TeamProgress } from "@/types/lineGraphStats";
import { dayRange } from "@/lib/dayRange";
import type { DailyCell } from "@/types/challengeProgressDaily";
import type { Aggregation, Better, PointsMode } from "@/types/scoring";
import { applyAttemptToDailyCell, pickBetter, addPointsFromRanks, cellToNumber, ensureMap, mergeRunningCell, computeRanks, } from "@/lib/progressCells"; 

export async function getTeamChallengeProgressDaily(
  userId: number,
  teamChallengeId: number
): Promise<TeamProgress | null> {
  if (!userId) throw new Error("Unauthorized");

  // Validate access + ensure this is a TEAM challenge
  const [selected] = await db
    .select({
      challengeId: teamChallengesTable.challengeId,
      myTeamId: teamChallengesTable.teamId,
    })
    .from(teamChallengesTable)
    .innerJoin(challengeTable, eq(challengeTable.id, teamChallengesTable.challengeId))
    .innerJoin(
      teamMembersTable,
      and(eq(teamMembersTable.teamId, teamChallengesTable.teamId), eq(teamMembersTable.userId, userId))
    )
    .where(and(eq(teamChallengesTable.id, teamChallengeId), eq(challengeTable.isTeamBased, true)))
    .limit(1);

  if (!selected) return null;

  // All teams participating in this challenge (all teamChallenge instances for this challengeId)
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

  if (teamChallengeIds.length === 0) {
    return { challengeId: selected.challengeId, teams, overall: [], parts: {} };
  }

  // Parts for this challenge
  const parts = await db
    .select({
      id: challengePartsTable.id,
      metric: challengePartsTable.metric,
      isTeamLogOnly: challengePartsTable.isTeamLogOnly,
      sortOrder: challengePartsTable.sortOrder,
      aggregation: challengePartsTable.aggregation,
      better: challengePartsTable.better,
      pointsMode: challengePartsTable.pointsMode,
      weight: challengePartsTable.weight,
    })
    .from(challengePartsTable)
    .where(eq(challengePartsTable.challengeId, selected.challengeId))
    .orderBy(asc(challengePartsTable.sortOrder));

  const partIds = parts.map((p) => p.id);
  if (partIds.length === 0) {
    return { challengeId: selected.challengeId, teams, overall: [], parts: {} };
  }

  const configurationByPart = new Map<
    number,
    {
      metric: string;
      isTeamLogOnly: boolean;
      aggregation: Aggregation;
      better: Better;
      pointsMode: PointsMode;
      weight: number;
    }
  >(
    parts.map((p) => [
      p.id,
      {
        metric: p.metric,
        isTeamLogOnly: p.isTeamLogOnly,
        aggregation: (p.aggregation ?? "best") as Aggregation,
        better: (p.better ?? "higher") as Better,
        pointsMode: (p.pointsMode ?? "rank_low_wins") as PointsMode,
        weight: Number(p.weight ?? 1),
      },
    ])
  );

  // Bounds across ALL participating teams for this challenge
  const [bounds] = await db
    .select({
      minDay: sql<string | null>`to_char(date_trunc('day', min(${challengeAttemptsTable.recordedAt})), 'YYYY-MM-DD')`,
      maxDay: sql<string | null>`to_char(date_trunc('day', max(${challengeAttemptsTable.recordedAt})), 'YYYY-MM-DD')`,
    })
    .from(challengeAttemptsTable)
    .where(inArray(challengeAttemptsTable.teamChallengeId, teamChallengeIds));

  const minDay = bounds?.minDay ?? null;
  const maxDay = bounds?.maxDay ?? null;

  if (!minDay || !maxDay) {
    return { challengeId: selected.challengeId, teams, overall: [], parts: {} };
  }

  const days = dayRange(minDay, maxDay);

  // Fetch ALL attempts once
  const attempts = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${challengeAttemptsTable.recordedAt}), 'YYYY-MM-DD')`,
      teamId: teamChallengesTable.teamId,
      userId: challengeAttemptsTable.userId,
      partId: challengeAttemptsTable.challengePartId,
      value: challengeAttemptsTable.value,
      recordedAt: challengeAttemptsTable.recordedAt,
      id: challengeAttemptsTable.id,
    })
    .from(challengeAttemptsTable)
    .innerJoin(teamChallengesTable, eq(teamChallengesTable.id, challengeAttemptsTable.teamChallengeId))
    .where(
      and(
        inArray(challengeAttemptsTable.teamChallengeId, teamChallengeIds),
        inArray(challengeAttemptsTable.challengePartId, partIds)
      )
    );

  // dailyAgg.get(day).get(partId).get(teamId).get(userId) => DailyCell
  const dailyAgg = new Map<string, Map<number, Map<number, Map<number, DailyCell>>>>();

  for (const a of attempts) {
    if (a.value == null) continue;

    const cfg = configurationByPart.get(a.partId);
    if (!cfg) continue;

    const byPart = ensureMap(dailyAgg, a.day, () => new Map());
    const byTeam = ensureMap(byPart, a.partId, () => new Map());
    const byUser = ensureMap(byTeam, a.teamId, () => new Map());

    const prev = byUser.get(a.userId);
    const next = applyAttemptToDailyCell(
      prev,
      { value: Number(a.value), recordedAt: a.recordedAt ?? null, id: a.id ?? 0 },
      { aggregation: cfg.aggregation, better: cfg.better }
    );

    byUser.set(a.userId, next);
  }

  // running.get(partId).get(teamId).get(userId) => DailyCell (running state)
  const running = new Map<number, Map<number, Map<number, DailyCell>>>();
  for (const p of parts) running.set(p.id, new Map());

  const partsOut: TeamProgress["parts"] = {};
  const overallOut: TeamProgress["overall"] = [];

  for (const t of days) {
    const today = dailyAgg.get(t);

    // ranksByPart: partId -> (teamId -> rank)
    const ranksByPart = new Map<number, Map<number, number>>();

    for (const p of parts) {
      const cfg = configurationByPart.get(p.id)!;

      const rbPart = running.get(p.id)!;
      const todayTeams = today?.get(p.id); // Map<teamId, Map<userId, DailyCell>>

      // Update running state for any (team,user) that has a value today
      if (todayTeams) {
        for (const [teamId, userMapToday] of todayTeams.entries()) {
          const rbTeam = ensureMap(rbPart, teamId, () => new Map());

          for (const [uid, todayCell] of userMapToday.entries()) {
            const prevRun = rbTeam.get(uid);
            const nextRun = mergeRunningCell(prevRun, todayCell, {
              aggregation: cfg.aggregation,
              better: cfg.better,
            });
            if (nextRun) rbTeam.set(uid, nextRun);
          }
        }
      }

      // Compute per-team value for this day/part
      const values: Record<number, number | null> = {};

      for (const teamId of teamIds) {
        const rbTeam = rbPart.get(teamId);

        if (!rbTeam || rbTeam.size === 0) {
          values[teamId] = null;
          continue;
        }

        if (cfg.isTeamLogOnly) {
          // "Official score" mode: pick best across users running values
          let best: number | null = null;

          for (const s of rbTeam.values()) {
            const v = cellToNumber(s);
            if (v == null) continue;
            best = best == null ? v : pickBetter(best, v, cfg.better);
          }

          values[teamId] = best;
        } else {
          // "Behave like solo" mode: sum everyone's running contribution (cumulative)
          let sum = 0;
          let hasAny = false;

          for (const s of rbTeam.values()) {
            const v = cellToNumber(s);
            if (v == null) continue;
            sum += v;
            hasAny = true;
          }

          values[teamId] = hasAny ? sum : null;
        }
      }

      // Emit part series
      const key = String(p.id);
      if (!partsOut[key]) partsOut[key] = [];
      partsOut[key].push({ t, values });

      // Ranks for this day/part
      const ranks = computeRanks(teamIds, values, cfg.better);
      ranksByPart.set(p.id, ranks);
    }

    // Overall points = sum of weighted points across parts
    const pointsByTeam = new Map<number, number>();

    for (const p of parts) {
      const cfg = configurationByPart.get(p.id)!;
      const ranks = ranksByPart.get(p.id);
      if (!ranks) continue;

      addPointsFromRanks({
        pointsById: pointsByTeam,
        ranks,
        pointsMode: cfg.pointsMode,
        weight: cfg.weight,
      });
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
