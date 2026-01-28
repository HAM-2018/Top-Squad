export type TeamMetric = "time" | "distance" | "reps" | "weight";
export type TeamBetter = "higher" | "lower";
export type TeamAggregation = "best" | "sum" | "avg" | "latest";
export type TeamPointsMode = "rank_low_wins" | "rank_high_wins";

export type TeamChartRow = {
  teamId: number;
  name: string;
  avatarUrl: string | null;
  time: number;
  isMyTeam: boolean;
};

export type TeamRow = {
  teamId: number;
  teamName: string;
  avatarUrl: string | null;
  rank: number | null;
  value: number | null;
  isMyTeam: boolean;
};

export type OverallTeamRow = {
  teamId: number;
  teamName: string;
  avatarUrl: string | null;
  rank: number;
  points: number;
  isMyTeam: boolean;
};

export type TeamPartStats = {
  partId: number;
  partName: string;
  metric: TeamMetric;
  unit: string | null;
  isTeamLogOnly: boolean;

  aggregation: TeamAggregation;
  better: TeamBetter;
  pointsMode: TeamPointsMode;
  weight: number;

  myTeamRank: number | null;
  myTeamValue: number | null;
  totalTeams: number;

  teams: TeamRow[];
  chartRows: TeamChartRow[];
};

export type TeamChallengeStats = {
  challengeId: number;
  challengeName: string;
  myTeamId: number;
  parts: TeamPartStats[];
  overall: {
    myTeamRank: number | null;
    myTeamPoints: number | null;
    totalTeams: number;
    pointsMode: TeamPointsMode;
    chartRows: TeamChartRow[];
    teams: OverallTeamRow[];
  };
};
