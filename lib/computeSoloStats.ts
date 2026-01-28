import type { ChallengeScoring, BestAttempt, PointsMode } from "@/types/scoring";
import { Rank, rankToPoints } from "./scoringRules";

export function computeSoloStats(params: {
  challengeId: number;
  parts: ChallengeScoring[];
  bestAttemptsByPart: Map<number, BestAttempt[]>;
  userId: number;
  overallPointsMode: PointsMode;
}) {
  const { challengeId, parts, bestAttemptsByPart, userId, overallPointsMode } = params;

  const pointsByUser = new Map<number, number>();
  const nameByUser = new Map<
    number,
    { firstName: string | null; lastName: string | null; avatarUrl: string | null }
  >();

  const partStats = parts.map((part) => {
    const rows = bestAttemptsByPart.get(part.partId) ?? [];

    // cache names
    for (const r of rows) {
      if (!nameByUser.has(r.userId)) {
        nameByUser.set(r.userId, {
          firstName: r.firstName,
          lastName: r.lastName,
          avatarUrl: r.avatarUrl ?? null,
        });
      }
    }

    const { sort } = Rank(rows, (r) => r.bestValue, part.better);

    const totalCompetitors = sort.length;
    const myIndex = sort.findIndex((r) => r.userId === userId);
    const myRank = myIndex >= 0 ? myIndex + 1 : null;
    const myValue = myIndex >= 0 ? sort[myIndex].bestValue : null;

    if (parts.length > 1) {
      sort.forEach((r, idx) => {
        const rank = idx + 1;
        const pts = rankToPoints(rank, totalCompetitors, part.pointsMode) * part.weight;
        pointsByUser.set(r.userId, (pointsByUser.get(r.userId) ?? 0) + pts);
      });
    }

    const first = sort[0] ?? null;
    const firstPlace = first
      ? { name: `${first.firstName ?? ""} ${first.lastName ?? ""}`.trim(), value: first.bestValue }
      : null;

    const chartRows = sort.slice(0, 10).map((r) => ({
      userId: r.userId,
      name: `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || "Unknown",
      time: r.bestValue,
      avatarUrl: r.avatarUrl ?? null,
    }));

    return {
      partId: part.partId,
      partName: part.partName,
      metric: part.metric,
      unit: part.unit,
      better: part.better,
      aggregation: part.aggregation,
      pointsMode: part.pointsMode,
      weight: part.weight,

      myRank,
      myValue,
      totalCompetitors,
      firstPlace,
      chartRows,
    };
  });

 if (parts.length <= 1) {
  const only = partStats[0] ?? null;

  return {
    challengeId,
    parts: partStats,
    overall: {
      myRank: only?.myRank ?? null,
      //single-part uses VALUE, not points
      myValue: only?.myValue ?? null,
      firstPlaceValue: only?.firstPlace
        ? { name: only.firstPlace.name, value: only.firstPlace.value }
        : null,
      //no points system for single-part
      myPoints: null,
      firstPlace: null,
      totalCompetitors: only?.totalCompetitors ?? 0,
      chartRows: only?.chartRows ?? [],
       pointsMode: overallPointsMode
    },
  };
}



  const overallHighWins = overallPointsMode === "rank_high_wins";

  const overallLeaderboard = Array.from(pointsByUser.entries())
    .map(([uid, points]) => {
      const info = nameByUser.get(uid);
      return {
        userId: uid,
        points,
        firstName: info?.firstName ?? null,
        lastName: info?.lastName ?? null,
        avatarUrl: info?.avatarUrl ?? null,
      };
    })
    .sort((a, b) => (overallHighWins ? b.points - a.points : a.points - b.points));

  const myOverallIndex = overallLeaderboard.findIndex((r) => r.userId === userId);
  const myPoints = myOverallIndex >= 0 ? overallLeaderboard[myOverallIndex].points : null;
  const myOverallRank = myOverallIndex >= 0 ? myOverallIndex + 1 : null;

  const overallFirst = overallLeaderboard[0] ?? null;
  const overallFirstPlace = overallFirst
    ? {
        name: `${overallFirst.firstName ?? ""} ${overallFirst.lastName ?? ""}`.trim(),
        points: overallFirst.points,
      }
    : null;

  const overallChartRows = overallLeaderboard.slice(0, 10).map((r) => ({
    userId: r.userId,
    name: `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || "Unknown",
    time: r.points,
    avatarUrl: r.avatarUrl ?? null,
  }));

  return {
  challengeId,
  parts: partStats,
  overall: {
    myRank: myOverallRank,

    // ✅ multi-part uses POINTS
    myPoints,
    firstPlace: overallFirstPlace,

    // ✅ no single-part “value” in multi-part overall
    myValue: null,
    firstPlaceValue: null,

    totalCompetitors: overallLeaderboard.length,
    chartRows: overallChartRows,
     pointsMode: overallPointsMode
  },
};

}
