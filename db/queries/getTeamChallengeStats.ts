import { db } from "@/db";
import {
  challengeAttemptsTable,
  challengePartsTable,
  challengeTable,
  teamChallengesTable,
  teamMembersTable,
  teamsTable,
} from "@/db/schema";
import { pickAggregatedValue } from "@/lib/scoringRules";
import { and, asc, desc, eq, inArray, max, sql } from "drizzle-orm";

type Agg = "best" | "sum" | "avg" | "latest";
type Better = "higher" | "lower";
type PointsMode = "rank_low_wins" | "rank_high_wins";

export async function getTeamChallengeStats({
  userId,
  teamChallengeId,
}: {
  userId: number;
  teamChallengeId: number;
}) {
  if (!userId) throw new Error("Unauthorized");

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
      and(eq(teamMembersTable.teamId, teamChallengesTable.teamId), eq(teamMembersTable.userId, userId))
    )
    .where(and(eq(teamChallengesTable.id, teamChallengeId), eq(challengeTable.isTeamBased, true)))
    .limit(1);

  if (!selected) return null;

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
  const teamIds = teamChallenges.map((t) => t.teamId);

  const teamMeta = new Map<number, { name: string; avatarUrl: string | null }>();
  teamChallenges.forEach((t) =>
    teamMeta.set(t.teamId, { name: t.teamName, avatarUrl: t.teamAvatarUrl ?? null })
  );

  const parts = await db
    .select({
      id: challengePartsTable.id,
      name: challengePartsTable.name,
      metric: challengePartsTable.metric,
      unit: challengePartsTable.unit,
      sortOrder: challengePartsTable.sortOrder,
      isTeamLogOnly: challengePartsTable.isTeamLogOnly,
      aggregation: challengePartsTable.aggregation,
      better: challengePartsTable.better,
      pointsMode: challengePartsTable.pointsMode,
      weight: challengePartsTable.weight,
    })
    .from(challengePartsTable)
    .where(eq(challengePartsTable.challengeId, selected.challengeId))
    .orderBy(asc(challengePartsTable.sortOrder));

  const pointsByTeam = new Map<number, number>();
  for (const t of teamChallenges) pointsByTeam.set(t.teamId, 0);

  const partStats: Array<{
    partId: number;
    partName: string;
    metric: "time" | "distance" | "reps" | "weight";
    unit: string | null;
    isTeamLogOnly: boolean;
    aggregation: Agg;
    better: Better;
    pointsMode: PointsMode;
    weight: number;
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
    const aggregation = (part.aggregation ?? "best") as Agg;
    const better = (part.better ?? "higher") as Better;
    const pointsMode = (part.pointsMode ?? "rank_low_wins") as PointsMode;
    const weight = Number(part.weight ?? 1);

    if (part.isTeamLogOnly) {
      const rows = await db
        .select({
          teamId: teamChallengesTable.teamId,
          value: challengeAttemptsTable.value,
          recordedAt: challengeAttemptsTable.recordedAt,
          id: challengeAttemptsTable.id,
        })
        .from(challengeAttemptsTable)
        .innerJoin(teamChallengesTable, eq(teamChallengesTable.id, challengeAttemptsTable.teamChallengeId))
        .where(
          and(
            inArray(challengeAttemptsTable.teamChallengeId, teamChallengeIds),
            eq(challengeAttemptsTable.challengePartId, part.id)
          )
        );

      const teamValue = new Map<number, number | null>();

      if (aggregation === "sum" || aggregation === "avg") {
        const sumByTeam = new Map<number, number>();
        const countByTeam = new Map<number, number>();

        for (const r of rows) {
          if (r.value == null) continue;
          const v = Number(r.value);
          sumByTeam.set(r.teamId, (sumByTeam.get(r.teamId) ?? 0) + v);
          countByTeam.set(r.teamId, (countByTeam.get(r.teamId) ?? 0) + 1);
        }

        for (const tc of teamChallenges) {
          const s = sumByTeam.get(tc.teamId);
          if (s == null) teamValue.set(tc.teamId, null);
          else if (aggregation === "sum") teamValue.set(tc.teamId, s);
          else {
            const c = countByTeam.get(tc.teamId) ?? 0;
            teamValue.set(tc.teamId, c ? s / c : null);
          }
        }
      } else if (aggregation === "latest") {
        const latestByTeam = new Map<number, { recordedAt: Date; id: number; value: number }>();
        for (const r of rows) {
          if (r.value == null || !r.recordedAt) continue;
          const v = Number(r.value);
          const cur = latestByTeam.get(r.teamId);
          if (!cur) {
            latestByTeam.set(r.teamId, { recordedAt: r.recordedAt, id: r.id, value: v });
          } else {
            const curT = cur.recordedAt.getTime();
            const nxtT = r.recordedAt.getTime();
            if (nxtT > curT || (nxtT === curT && r.id > cur.id)) {
              latestByTeam.set(r.teamId, { recordedAt: r.recordedAt, id: r.id, value: v });
            }
          }
        }
        for (const tc of teamChallenges) {
          teamValue.set(tc.teamId, latestByTeam.get(tc.teamId)?.value ?? null);
        }
      } else {
        const bestByTeam = new Map<number, number>();
        const isLowerBetter = better === "lower";
        for (const r of rows) {
          if (r.value == null) continue;
          const v = Number(r.value);
          const cur = bestByTeam.get(r.teamId);
          if (cur == null) bestByTeam.set(r.teamId, v);
          else bestByTeam.set(r.teamId, isLowerBetter ? Math.min(cur, v) : Math.max(cur, v));
        }
        for (const tc of teamChallenges) {
          teamValue.set(tc.teamId, bestByTeam.get(tc.teamId) ?? null);
        }
      }

      const leaderboard = teamChallenges
        .map((tc) => {
          const meta = teamMeta.get(tc.teamId);
          return {
            teamId: tc.teamId,
            name: meta?.name ?? `Team ${tc.teamId}`,
            avatarUrl: meta?.avatarUrl ?? null,
            total: teamValue.get(tc.teamId) ?? null,
            isMyTeam: tc.teamId === selected.myTeamId,
          };
        })
        .sort((a, b) => {
          if (a.total === null && b.total === null) return 0;
          if (a.total === null) return 1;
          if (b.total === null) return -1;
          return better === "lower" ? a.total - b.total : b.total - a.total;
        });

      const scored = leaderboard.filter((t) => t.total !== null) as Array<
        Omit<(typeof leaderboard)[number], "total"> & { total: number }
      >;

      const rankByTeam = new Map<number, number>();
      scored.forEach((t, idx) => rankByTeam.set(t.teamId, idx + 1));

      const myRow = leaderboard.find((t) => t.teamId === selected.myTeamId) ?? null;
      const myTeamValue = myRow?.total ?? null;
      const myTeamRank = myRow?.total === null ? null : (rankByTeam.get(selected.myTeamId) ?? null);

      const n = scored.length;
      scored.forEach((t, idx) => {
        const rank = idx + 1;
        const points = pointsMode === "rank_low_wins" ? rank : (n - rank + 1);
        pointsByTeam.set(t.teamId, (pointsByTeam.get(t.teamId) ?? 0) + points * weight);
      });

      partStats.push({
        partId: part.id,
        partName: part.name,
        metric: part.metric,
        unit: part.unit ?? null,
        isTeamLogOnly: part.isTeamLogOnly,
        aggregation,
        better,
        pointsMode,
        weight,
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

      continue;
    }

    const perUserAgg = await db
      .select({
        teamId: teamChallengesTable.teamId,
        userId: challengeAttemptsTable.userId,
        sumValue: sql<number | null>`sum(${challengeAttemptsTable.value})`,
        avgValue: sql<number | null>`avg(${challengeAttemptsTable.value})`,
        minValue: sql<number | null>`min(${challengeAttemptsTable.value})`,
        maxValue: sql<number | null>`max(${challengeAttemptsTable.value})`,
        latestAt: max(challengeAttemptsTable.recordedAt),
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

    const latestRows = aggregation === "latest"
      ? await db
          .select({
            teamId: teamChallengesTable.teamId,
            userId: challengeAttemptsTable.userId,
            value: challengeAttemptsTable.value,
            recordedAt: challengeAttemptsTable.recordedAt,
            id: challengeAttemptsTable.id,
          })
          .from(challengeAttemptsTable)
          .innerJoin(teamChallengesTable, eq(teamChallengesTable.id, challengeAttemptsTable.teamChallengeId))
          .where(
            and(
              inArray(challengeAttemptsTable.teamChallengeId, teamChallengeIds),
              eq(challengeAttemptsTable.challengePartId, part.id)
            )
          )
          .orderBy(desc(challengeAttemptsTable.recordedAt), desc(challengeAttemptsTable.id))
      : [];

    const latestPicked = new Map<string, number>();
    if (aggregation === "latest") {
      const seen = new Set<string>();
      for (const r of latestRows) {
        if (r.value == null || !r.recordedAt) continue;
        const key = `${r.teamId}:${r.userId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        latestPicked.set(key, Number(r.value));
      }
    }

    const userValueByTeam = new Map<number, Map<number, number>>();
    const isLowerBetter = better === "lower";

    for (const row of perUserAgg) {
      const v = pickAggregatedValue(
        { aggregation, better },
        {
          minV: row.minValue == null ? null : Number(row.minValue),
          maxV: row.maxValue == null ? null : Number(row.maxValue),
          sumV: row.sumValue == null ? null : Number(row.sumValue),
          avgV: row.avgValue == null ? null : Number(row.avgValue),
          latestV:
            aggregation === "latest"
              ? latestPicked.get(`${row.teamId}:${row.userId}`) ?? null
              : null,
        }
      );

      if (v == null) continue;

      let byUser = userValueByTeam.get(row.teamId);
      if (!byUser) {
        byUser = new Map();
        userValueByTeam.set(row.teamId, byUser);
      }
      byUser.set(row.userId, v);
    }

    const teamTotals = new Map<number, number>();
    const teamCounts = new Map<number, number>();

    for (const tc of teamChallenges) {
      const byUser = userValueByTeam.get(tc.teamId);
      if (!byUser || byUser.size === 0) continue;

      let sum = 0;
      let count = 0;
      for (const v of byUser.values()) {
        sum += v;
        count += 1;
      }

      if (count === 0) continue;

      if (part.metric === "time") {
        teamTotals.set(tc.teamId, sum / count);
        teamCounts.set(tc.teamId, count);
      } else {
        teamTotals.set(tc.teamId, sum);
      }
    }

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
        return better === "lower" ? a.total - b.total : b.total - a.total;
      });

    const scored = leaderboard.filter((t) => t.total !== null) as Array<
      Omit<(typeof leaderboard)[number], "total"> & { total: number }
    >;

    const rankByTeam = new Map<number, number>();
    scored.forEach((t, idx) => rankByTeam.set(t.teamId, idx + 1));

    const myRow = leaderboard.find((t) => t.teamId === selected.myTeamId) ?? null;
    const myTeamValue = myRow?.total ?? null;
    const myTeamRank = myRow?.total === null ? null : (rankByTeam.get(selected.myTeamId) ?? null);

    const n = scored.length;
    scored.forEach((t, idx) => {
      const rank = idx + 1;
      const points = pointsMode === "rank_low_wins" ? rank : (n - rank + 1);
      pointsByTeam.set(t.teamId, (pointsByTeam.get(t.teamId) ?? 0) + points * weight);
    });

    partStats.push({
      partId: part.id,
      partName: part.name,
      metric: part.metric,
      unit: part.unit ?? null,
      isTeamLogOnly: part.isTeamLogOnly,
      aggregation,
      better,
      pointsMode,
      weight,
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

  const overallPointsMode: PointsMode =
    parts.length ? ((parts[0].pointsMode ?? "rank_low_wins") as PointsMode) : "rank_low_wins";

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
    .sort((a, b) =>
      overallPointsMode === "rank_low_wins" ? a.points - b.points : b.points - a.points
    );

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
      pointsMode: overallPointsMode,
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
