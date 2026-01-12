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
      and(
        eq(teamMembersTable.teamId, teamChallengesTable.teamId),
        eq(teamMembersTable.userId, userId)
      )
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
    })
    .from(challengePartsTable)
    .where(eq(challengePartsTable.challengeId, selected.challengeId))
    .orderBy(asc(challengePartsTable.sortOrder));

  const partIds = parts.map((p) => p.id);
  if (partIds.length === 0) {
    return { challengeId: selected.challengeId, teams, overall: [], parts: {} };
  }

  const metricByPart = new Map<number, string>(parts.map((p) => [p.id, p.metric]));
  const teamLogOnlyByPart = new Map<number, boolean>(parts.map((p) => [p.id, p.isTeamLogOnly]));

  // Bounds across ALL participating teams for this challenge
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

  const days = dayRange(minDay, maxDay);

  // Fetch ALL attempts once 
  // Include day + teamId by joining teamChallengesTable
  const attempts = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${challengeAttemptsTable.recordedAt}), 'YYYY-MM-DD')`,
      teamId: teamChallengesTable.teamId,
      userId: challengeAttemptsTable.userId,
      partId: challengeAttemptsTable.challengePartId,
      value: challengeAttemptsTable.value,
    })
    .from(challengeAttemptsTable)
    .innerJoin(teamChallengesTable, eq(teamChallengesTable.id, challengeAttemptsTable.teamChallengeId))
    .where(
      and(
        inArray(challengeAttemptsTable.teamChallengeId, teamChallengeIds),
        inArray(challengeAttemptsTable.challengePartId, partIds)
      )
    );

  // Build daily best per (day, part, team, user)
  // dailyBest.get(day).get(partId).get(teamId).get(userId) => best on day
  const dailyBest = new Map<string, Map<number, Map<number, Map<number, number>>>>();

  for (const a of attempts) {
    if (a.value == null) continue;

    const day = a.day;
    const partId = a.partId;
    const teamId = a.teamId;
    const uid = a.userId;

    const metric = metricByPart.get(partId) ?? "";
    const isTime = metric === "time";
    const val = Number(a.value);

    let byPart = dailyBest.get(day);
    if (!byPart) {
      byPart = new Map();
      dailyBest.set(day, byPart);
    }

    let byTeam = byPart.get(partId);
    if (!byTeam) {
      byTeam = new Map();
      byPart.set(partId, byTeam);
    }

    let byUser = byTeam.get(teamId);
    if (!byUser) {
      byUser = new Map();
      byTeam.set(teamId, byUser);
    }

    const prev = byUser.get(uid);
    if (prev == null) byUser.set(uid, val);
    else byUser.set(uid, isTime ? Math.min(prev, val) : Math.max(prev, val));
  }

  // Walk days and maintain running per-user best
  // runningBest.get(partId).get(teamId).get(userId) => best so far
  const runningBest = new Map<number, Map<number, Map<number, number>>>();
  for (const p of parts) runningBest.set(p.id, new Map());

  const partsOut: TeamProgress["parts"] = {};
  const overallOut: TeamProgress["overall"] = [];

  for (const t of days) {
    const today = dailyBest.get(t);

    // ranksByPart: partId -> (teamId -> rank)
    const ranksByPart = new Map<number, Map<number, number>>();

    for (const p of parts) {
      const partId = p.id;
      const metric = p.metric;
      const isTime = metric === "time";
      const isTeamLogOnly = teamLogOnlyByPart.get(partId) ?? false;

      const rbPart = runningBest.get(partId)!;

      // Update runningBest for any (team,user) that has a value today
      const todayTeams = today?.get(partId); // Map<teamId, Map<userId, bestToday>>
      if (todayTeams) {
        for (const [teamId, userMapToday] of todayTeams.entries()) {
          let rbTeam = rbPart.get(teamId);
          if (!rbTeam) {
            rbTeam = new Map();
            rbPart.set(teamId, rbTeam);
          }

          for (const [uid, bestToday] of userMapToday.entries()) {
            const prev = rbTeam.get(uid);
            if (prev == null) rbTeam.set(uid, bestToday);
            else rbTeam.set(uid, isTime ? Math.min(prev, bestToday) : Math.max(prev, bestToday));
          }
        }
      }

      // Compute per-team value for this day/part 
      const values: Record<number, number | null> = {};
      for (const teamId of teamIds) {
        const rbTeam = rbPart.get(teamId); // Map<userId, bestSoFar>
        if (!rbTeam || rbTeam.size === 0) {
          values[teamId] = null;
          continue;
        }

        if (isTeamLogOnly) {
          // team best = min/max across users best-so-far
          let teamBest: number | null = null;
          for (const v of rbTeam.values()) {
            if (teamBest == null) teamBest = v;
            else teamBest = isTime ? Math.min(teamBest, v) : Math.max(teamBest, v);
          }
          values[teamId] = teamBest;
        } else {
          // team total = sum of users best-so-far
          let sum = 0;
          let count = 0;
          for (const v of rbTeam.values()) {
            sum += v;
            count += 1;
          }

          if (count === 0) {
            values[teamId] = null;
          } else if (isTime) {
            values[teamId] = Math.round(sum / count);
          } else {
            values[teamId] = sum;
          }
        }
      }

      // Emit part series
      const key = String(partId);
      if (!partsOut[key]) partsOut[key] = [];
      partsOut[key].push({ t, values });

      // Compute ranks for this part/day
      const ranked = teamIds
        .map((teamId) => ({ teamId, total: values[teamId] }))
        .filter((x): x is { teamId: number; total: number } => x.total !== null);

      ranked.sort((a, b) => (isTime ? a.total - b.total : b.total - a.total));

      const ranks = new Map<number, number>();
      ranked.forEach((row, idx) => ranks.set(row.teamId, idx + 1));
      ranksByPart.set(partId, ranks);
    }

    // Overall points = sum of ranks across parts
    const pointsByTeam = new Map<number, number>();
    for (const ranks of ranksByPart.values()) {
      for (const [teamId, rnk] of ranks.entries()) {
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
