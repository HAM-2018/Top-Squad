import { DailyCell } from "@/types/challengeProgressDaily";
import { Aggregation, Better, PointsMode } from "@/types/scoring";

// Helpers to engine the line-graph logic
//1. Build daily aggregates
// 2. Merge daily into running 


// Convert a DailyCell into a plain number you can chart
export function cellToNumber(cell: DailyCell | null | undefined): number | null {
    if (!cell) return null;
    if (cell.kind === "avg") return cell.count ? cell.sum / cell.count : null;

    return cell.value;
}

// Compare two numbers and return the "better" one according to Better.
export function pickBetter(a: number, b: number, better: Better): number {
  return better === "lower" ? Math.min(a, b) : Math.max(a, b);
}

// Build the DAILY aggregate cell for a single user, on a single day.
export function applyAttemptToDailyCell(
  prev: DailyCell | undefined,
  attempt: { value: number; recordedAt?: Date | null; id?: number | null },
  cfg: { aggregation: Aggregation; better: Better }
): DailyCell {
  const agg = cfg.aggregation ?? "best";
  const better = cfg.better ?? "higher";
  const val = Number(attempt.value);

  // SUM: add all attempts for that day
  if (agg === "sum") {
    if (!prev || prev.kind !== "sum") return { kind: "sum", value: val };
    return { kind: "sum", value: prev.value + val };
  }

  // AVG: accumulate sum+count for that day
  if (agg === "avg") {
    if (!prev || prev.kind !== "avg") return { kind: "avg", sum: val, count: 1 };
    return { kind: "avg", sum: prev.sum + val, count: prev.count + 1 };
  }

  // LATEST: keep newest attempt for that day (by recordedAt, tie-break by id)
  if (agg === "latest") {
    const recordedAt = attempt.recordedAt ?? null;
    const id = Number(attempt.id ?? 0);

    // If recordedAt is missing, we still store something deterministic.
    const next: DailyCell = {
      kind: "latest",
      value: val,
      recordedAt: recordedAt ?? new Date(0),
      id,
    };

    if (!prev || prev.kind !== "latest") return next;

    const prevT = prev.recordedAt.getTime();
    const nextT = next.recordedAt.getTime();
    const isNewer = nextT > prevT || (nextT === prevT && next.id > prev.id);

    return isNewer ? next : prev;
  }

  // BEST: keep best attempt for that day using Better (higher/lower)
  if (!prev || prev.kind !== "best") return { kind: "best", value: val };
  return { kind: "best", value: pickBetter(prev.value, val, better) };
}

export function mergeRunningCell(
  prev: DailyCell | undefined,
  today: DailyCell | undefined,
  cfg: { aggregation: Aggregation; better: Better }
): DailyCell | undefined {
  // If nothing happened today, keep yesterday's running.
  if (!today) return prev;

  const agg = cfg.aggregation ?? "best";
  const better = cfg.better ?? "higher";

  // SUM: running sum should keep increasing over days
  if (agg === "sum") {
    const v = cellToNumber(today);
    if (v == null) return prev;

    if (!prev || prev.kind !== "sum") return { kind: "sum", value: v };
    return { kind: "sum", value: prev.value + v };
  }

  // AVG: keep running sum+count across all days
  if (agg === "avg") {
    // If the daily cell already has sum+count, merge that directly.
    if (today.kind === "avg") {
      if (!prev || prev.kind !== "avg") return { kind: "avg", sum: today.sum, count: today.count };
      return { kind: "avg", sum: prev.sum + today.sum, count: prev.count + today.count };
    }

    // Otherwise treat the daily cell as one observation.
    const v = cellToNumber(today);
    if (v == null) return prev;

    if (!prev || prev.kind !== "avg") return { kind: "avg", sum: v, count: 1 };
    return { kind: "avg", sum: prev.sum + v, count: prev.count + 1 };
  }

  // LATEST: the running cell is just the most recent attempt ever (across days)
  if (agg === "latest") {
    if (today.kind !== "latest") return prev;

    if (!prev || prev.kind !== "latest") return today;

    const prevT = prev.recordedAt.getTime();
    const nextT = today.recordedAt.getTime();
    const isNewer = nextT > prevT || (nextT === prevT && today.id > prev.id);

    return isNewer ? today : prev;
  }

  // BEST: running best across all days so far
  const v = cellToNumber(today);
  if (v == null) return prev;

  if (!prev || prev.kind !== "best") return { kind: "best", value: v };
  return { kind: "best", value: pickBetter(prev.value, v, better) };
}

export function computeRanks(
  ids: number[],
  values: Record<number, number | null>,
  better: Better
): Map<number, number> {
  const ranked = ids
    .map((id) => ({ id, v: values[id] }))
    .filter((x): x is { id: number; v: number } => x.v !== null);

  ranked.sort((a, b) => (better === "lower" ? a.v - b.v : b.v - a.v));

  const ranks = new Map<number, number>();
  ranked.forEach((row, idx) => ranks.set(row.id, idx + 1));

  return ranks;
}

/**
 * Convert ranks into points and accumulate them into pointsById.
 *
 * pointsMode:
 * - "rank_low_wins":  rank 1 => 1 point, rank 2 => 2 points, etc.
 *   (lower is better; "golf-style" scoring)
 *
 * - "rank_high_wins": rank 1 => N points, rank 2 => N-1 points, etc.
 *   (higher is better; "winner gets most points")
 *
 * weight:
 * - multiply the per-part points by weight so some parts matter more.
 */
export function addPointsFromRanks(opts: {
  pointsById: Map<number, number>;
  ranks: Map<number, number>;
  pointsMode: PointsMode;
  weight: number;
}) {
  const scored = Array.from(opts.ranks.entries()); // [id, rank]
  const n = scored.length;

  for (const [id, rank] of scored) {
    const pts = opts.pointsMode === "rank_low_wins" ? rank : n - rank + 1;
    opts.pointsById.set(id, (opts.pointsById.get(id) ?? 0) + pts * opts.weight);
  }
}

export function ensureMap<K, V>(parent: Map<K, V>, key: K, factory: () => V): V {
  let v = parent.get(key);
  if (!v) {
    v = factory();
    parent.set(key, v);
  }
  return v;
}
