export type TeamProgressPoint = {
  t: string;
  values: Record<number, number | null>; // teamId - rank
};

export type TeamProgress = {
  challengeId: number;
  teams: { teamId: number; name: string; isMyTeam: boolean }[];
  overall: TeamProgressPoint[];
  parts: Record<string, TeamProgressPoint[]>; // partId - points
};
