export type TeamChartRow = {
  teamId: number;
  name: string;
  avatarUrl: string | null;
  time: number;
  isMyTeam: boolean;
};

export type PartTeamRow = {
  teamId: number;
  teamName: string;
  avatarUrl: string | null;
  rank: number;
  value: number;
  isMyTeam: boolean;
};

export type TeamPartStats = {
  partId: number;
  partName: string;
  metric: "time" | "distance" | "reps" | "weight";
  unit: string | null;
  isTeamLogOnly: boolean;
  myTeamRank: number | null;
  myTeamValue: number | null;
  totalTeams: number;
  chartRows: TeamChartRow[];
  teams: PartTeamRow[];
};

export type OverallTeamRow = {
  teamId: number;
  teamName: string;
  avatarUrl: string | null;
  rank: number;
  points: number;
  isMyTeam: boolean;
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
    chartRows: TeamChartRow[];
    teams: OverallTeamRow[];
  };
};
