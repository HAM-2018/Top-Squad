export type TeamProgressPoint = {
  t: string;
  values: Record<number, number | null>;
};

export type TeamProgress = {
  challengeId: number;
  teams: { teamId: number; name: string; isMyTeam: boolean }[];
  overall: TeamProgressPoint[];
  parts: Record<string, TeamProgressPoint[]>; 
};

export type SoloProgressPoint = {
  t: string;
  values: Record<number, number | null>; // userId -> value/points
};

export type SoloProgress = {
  teamChallengeId: number; 
  users: { userId: number; name: string; isMe: boolean }[];
  overall: SoloProgressPoint[];
  parts: Record<string, SoloProgressPoint[]>;
};
