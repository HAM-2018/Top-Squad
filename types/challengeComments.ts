export type ChallengeComment = {
  id: number;
  teamChallengeId: number;
  userId: number;
  userName: string;
  userAvatarUrl: string | null;
  teamName: string | null;
  body: string;
  imageUrl: string | null;
  imagePublicId: string | null;
  createdAt: string;
};

export type UploadedChallengeImage = {
  imageUrl: string;
  imagePublicId: string;
};
