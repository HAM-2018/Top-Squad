export type ChartRow = {
  userId: number;
  name: string;
  time: number;
  avatarUrl: string | null;
};

export type PartStats = {
  partId: number;
  partName: string;
  metric: "time" | "distance" | "reps" | "weight";
  unit: string | null;
  better: "higher" | "lower";
  myRank: number | null;
  myValue: number | null;
  totalCompetitors: number;
  firstPlace: { name: string; value: number } | null;

  chartRows: ChartRow[];
};

export type OverallStats = {
  myRank: number | null;
  myPoints: number | null;
  firstPlace: { name: string; points: number } | null;
  myValue: number | null;
  firstPlaceValue: { name: string; value: number } | null;
  totalCompetitors: number;
  chartRows: ChartRow[];
  pointsMode: "rank_low_wins" | "rank_high_wins";
};


export type MultiPartChallengeStats = {
  challengeId: number;
  parts: PartStats[];
  overall: OverallStats;
};

export type ChallengeParts = {
  partId: number;
  partName: string;
  metric: "time" | "distance" | "reps" | "weight";
  unit: string | null;
  targetValue: number | null;
  sortOrder: number;
  isTeamLogOnly: boolean;
};

export type ChallengeWithParts = {
  challengeId: number;
  name: string;
  description: string;
  isTeamBased: boolean;
  groupId: number;
  groupName: string;
  startDate: Date | null;
  endDate: Date | null;
  parts: ChallengeParts[];
}