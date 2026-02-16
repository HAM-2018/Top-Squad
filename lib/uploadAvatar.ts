import type { UploadedChallengeImage } from "@/types/challengeComments";

type UploadPurpose = "team-avatar" | "challenge-comment";

async function uploadViaApi(
  file: File,
  purpose: UploadPurpose,
): Promise<UploadedChallengeImage> {
  const form = new FormData();
  form.append("file", file);
  form.append("purpose", purpose);

  const res = await fetch("/api/uploads/cloudinary", {
    method: "POST",
    body: form,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error ?? "Image upload failed");
  }

  if (!data?.imageUrl || !data?.imagePublicId) {
    throw new Error("Invalid upload response");
  }

  return {
    imageUrl: data.imageUrl as string,
    imagePublicId: data.imagePublicId as string,
  };
}

export async function uploadAvatar(file: File): Promise<string> {
  const uploaded = await uploadViaApi(file, "team-avatar");
  return uploaded.imageUrl;
}

export async function UploadChallengeCommentImage(
  file: File,
): Promise<UploadedChallengeImage> {
  return uploadViaApi(file, "challenge-comment");
}
