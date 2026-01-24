export type TeamInvite = {
  inviteId: number;
  invitedEmail: string;
  status: "pending" | "accepted" | "declined" | "revoked";
  createdAt: Date | null;
};

export type PendingTeamInvite = {
  inviteId: number;
  teamId: number;
  teamName: string;
  invitedByName: string | null; 
  createdAt: Date | null;
};

// Challenge invites

export type ChallengeInvite = {
  inviteId: number;
  createdAt: Date | null;
  teamId: number;
  teamName: string;
  challengeId: number;
  challengeName: string;
  hostTeamId: number;
};

