import { Aggregation, Better, PointsMode } from "@/types/scoring";


export function sortByBetter(a: number, b: number, better:Better) {
    return better === "lower" ? a - b : b - a;
};

export function Rank<T>(
    rows: T[],
    value: (row: T) => number,
    better: Better
) {
    const sort = [...rows].sort((rowA, rowB) => sortByBetter(value(rowA), value(rowB), better));
    const rankKey = new Map<T, number>();
    sort.forEach((row, index) => rankKey.set(row, index + 1));
    return {sort, rankKey};
};

export function rankToPoints(rank: number, totalCompetitors: number, mode: PointsMode) {
    if (mode === "rank_low_wins") return rank;

    return totalCompetitors - rank + 1;
}

export function pickAggregatedValue(
  cfg: { aggregation: Aggregation; better: Better },
  vals: {
    minV: number | null;
    maxV: number | null;
    sumV: number | null;
    avgV: number | null;
    latestV: number | null;
  }
): number | null {
  switch (cfg.aggregation) {
    case "sum":
      return vals.sumV;
    case "avg":
      return vals.avgV;
    case "latest":
      return vals.latestV;
    case "best":
    default: {
      if (vals.minV == null || vals.maxV == null) return null;
      return cfg.better === "lower" ? vals.minV : vals.maxV;
    }
  }
}