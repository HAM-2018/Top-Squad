export type IndividualChallengeStats = {
  myRank: number | null;
  myTime: number | null;
  totalCompetitors: number;
  metric: "time" | "distance" | "reps" | "weight";
  unit: string | null;

  firstPlace: {
    name: string;
    time: number;
  } | null;

  chartRows: {
    name: string;
    time: number;
  }[];
};
