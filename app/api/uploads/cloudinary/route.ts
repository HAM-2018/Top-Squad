import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PURPOSES = ["team-avatar", "challenge-comment"] as const;

type UploadPurpose = (typeof ALLOWED_PURPOSES)[number];

function getFolderFromPurpose(purpose: UploadPurpose): string {
  if (purpose === "team-avatar") return "topsquad/teams";
  return "challenge-comments";
}

function getCloudinaryConfig() {
  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME ??
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  const uploadPreset =
    process.env.CLOUDINARY_UPLOAD_PRESET ??
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary env vars are not set");
  }

  return { cloudName, uploadPreset };
}

type CloudinaryResponse = {
  secure_url?: string;
  public_id?: string;
  error?: { message?: string };
};

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const purposeRaw = formData.get("purpose");
    const file = formData.get("file");

    if (
      typeof purposeRaw !== "string" ||
      !ALLOWED_PURPOSES.includes(purposeRaw as UploadPurpose)
    ) {
      return NextResponse.json(
        { error: "Invalid upload purpose" },
        { status: 400 },
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image uploads are allowed" },
        { status: 400 },
      );
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Image must be 5MB or smaller" },
        { status: 400 },
      );
    }

    const { cloudName, uploadPreset } = getCloudinaryConfig();
    const folder = getFolderFromPurpose(purposeRaw as UploadPurpose);

    const cloudinaryForm = new FormData();
    cloudinaryForm.append("file", file);
    cloudinaryForm.append("upload_preset", uploadPreset);
    cloudinaryForm.append("folder", folder);

    const cloudinaryRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: cloudinaryForm },
    );

    const data = (await cloudinaryRes.json()) as CloudinaryResponse;

    if (!cloudinaryRes.ok) {
      return NextResponse.json(
        { error: data?.error?.message ?? "Upload failed" },
        { status: 400 },
      );
    }

    if (!data.secure_url || !data.public_id) {
      return NextResponse.json(
        { error: "Invalid upload response" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      imageUrl: data.secure_url,
      imagePublicId: data.public_id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
