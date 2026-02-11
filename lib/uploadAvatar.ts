import { UploadedChallengeImage } from "@/types/challengeComments";

export async function uploadAvatar(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary env vars are not set");
  }

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", uploadPreset);
  form.append("folder", "topsquad/teams");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: form,
    },
  );

  const data = await res.json();

  if (!res.ok) {
    // Cloudinary returns useful error messages in data.error.message
    throw new Error(data?.error?.message ?? "Failed to upload image");
  }

  // secure_url is https + CDN-backed
  return data.secure_url as string;
}

export async function UploadChallengeCommentImage(
  file: File,
): Promise<UploadedChallengeImage> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary env vars are missing");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", "challenge-comments");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!res.ok) throw new Error("Image upload failed");

  const data = await res.json();

  if (!data.secure_url || !data.public_id) {
    throw new Error("Invalid Cloudinary upload response");
  }

  return {
    imageUrl: data.secure_url as string,
    imagePublicId: data.public_id as string,
  };
}
