



// Helper for line graph to display only the top N amount of competitors
export function pickTopKeysByLatest({
  keys,
  latestPoint,
  isOverall,
  metric,
  limit = 5,
}: {
  keys: { key: string; name: string; isMyTeam: boolean }[];
  latestPoint: { values: Record<number, number | null> } | null;
  isOverall: boolean;
  metric: "time" | "distance" | "reps" | "weight";
  limit?: number;
}) {
  if (limit <= 0) return [];
  if (!latestPoint) return keys.slice(0, limit);

  const isTime = metric === "time";
  const lowerIsBetter = isOverall || isTime;

  // Attach latest value to each key
  const scored = keys.map((k) => {
    const idStr = k.key.split("_")[1]; // team_12 / user_12
    const id = Number(idStr);
    const v = Number.isFinite(id) ? latestPoint.values?.[id] ?? null : null;
    return { ...k, v };
  });

  // Keep only entities that actually have a value at the latest point
  const withValues = scored.filter((x): x is (typeof scored)[number] & { v: number } => x.v !== null);

  // Sort by “best”
  withValues.sort((a, b) => (lowerIsBetter ? a.v - b.v : b.v - a.v));

  // Always include user if present, then fill remaining slots with top others
  const mine = withValues.find((x) => x.isMyTeam) ?? null;
  const others = withValues.filter((x) => !x.isMyTeam);

  const remaining = Math.max(0, limit - (mine ? 1 : 0));
  const topOthers = others.slice(0, remaining);

  // If user exist. user goes first
  const result = mine ? [mine, ...topOthers] : others.slice(0, limit);

  return result;
}