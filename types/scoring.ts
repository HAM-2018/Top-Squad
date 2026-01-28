

export const challengeMetricsValues = ["time", "distance", "reps", "weight"] as const;
export const aggregationValues = ["best", "sum", "avg", "latest"] as const;
export const betterValues = ["higher", "lower"] as const;
export const bestOfValues = ["best", "latest"] as const;
export const pointsModeValues = ["rank_low_wins", "rank_high_wins"] as const;

export type ChallengeMetrics = (typeof challengeMetricsValues)[number];
export type Aggregation = (typeof aggregationValues)[number];
export type Better = (typeof betterValues)[number];
export type BestOf = (typeof bestOfValues)[number];
export type PointsMode = (typeof pointsModeValues)[number];

export type ChallengeScoring = {
    partId: number;
    partName: string;
    metric: ChallengeMetrics;
    unit: string | null;
    better: Better;
    aggregation: Aggregation;
    weight: number;
    pointsMode: PointsMode;
};

export type BestAttempt = {
    partId: number;
    userId: number;
    bestValue: number;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
};