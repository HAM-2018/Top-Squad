export type RecordablePart = {
  partId: number;
  partName: string;
  metric: "time" | "distance" | "reps" | "weight";
  unit: string | null;
  isTeamLogOnly: boolean;
  sortOrder: number;
};

export type RecordableChallenge = {
  teamChallengeId: number;
  challengeId: number;
  teamId: number;
  challengeName: string;
  isTeamBased: boolean;
  teamName: string;
  parts: RecordablePart[];
};