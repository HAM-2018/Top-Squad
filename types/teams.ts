export type TeamMember = {
  userId: number;
  name: string;
  avatarUrl: string | null;
  role: "owner" | "admin" | "member";
};

export type TeamList = {
  id: number;
  name: string;
  description: string | null;
  ownerUserId: number;
  isActive: boolean;
  avatarUrl: string | null;
};