"use client";

import Image from "next/image";
import { useMemo, useRef, useState, useTransition } from "react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { createChallengeComment } from "@/db/mutations/createChallengeComment";
import { initialsFromName } from "@/lib/initialsFromName";
import { UploadChallengeCommentImage } from "@/lib/uploadAvatar";
import type { ChallengeComment } from "@/types/challengeComments";

type Props = {
  teamChallengeId: number | null;
  initialComments: ChallengeComment[];
};

export default function ChallengeComments({
  teamChallengeId,
  initialComments,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [postedComments, setPostedComments] = useState<ChallengeComment[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const previewUrl = useMemo(() => {
    if (!imageFile) return null;
    return URL.createObjectURL(imageFile);
  }, [imageFile]);

  const comments = [...postedComments, ...initialComments];

  const submitPost = () => {
    const trimmedBody = body.trim();
    if (!teamChallengeId) return toast.error("Select a challenge first.");
    if (!trimmedBody) return toast.error("Write something before posting.");

    startTransition(async () => {
      try {
        let uploaded: { imageUrl: string; imagePublicId: string } | null = null;

        if (imageFile) {
          uploaded = await UploadChallengeCommentImage(imageFile);
        }

        const created = await createChallengeComment({
          teamChallengeId,
          body: trimmedBody,
          imageUrl: uploaded?.imageUrl ?? null,
          imagePublicId: uploaded?.imagePublicId ?? null,
        });

        setPostedComments((prev) => [created, ...prev]);
        setBody("");
        setImageFile(null);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Failed to post";
        toast.error(msg);
      }
    });
  };

  return (
    <Card className="my-4">
      <CardHeader>
        <CardTitle>Challenge posts</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {!teamChallengeId ? (
          <p className="text-sm text-muted-foreground">
            Select a challenge to view and share posts.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Share an update..."
                maxLength={2000}
                disabled={isPending}
              />

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isPending}
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (file && !file.type.startsWith("image/")) {
                    toast.error("Please select an image file");
                    e.target.value = "";
                    return;
                  }
                  setImageFile(file);
                }}
              />

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isPending}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="mr-2 h-4 w-4" />
                  Choose file
                </Button>

                {imageFile ? (
                  <>
                    <span className="max-w-[240px] truncate text-sm text-muted-foreground">
                      {imageFile.name}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={isPending}
                      onClick={() => {
                        setImageFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">No file chosen</span>
                )}
              </div>

              {previewUrl ? (
                <div className="relative h-48 w-full overflow-hidden rounded-md border">
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    fill
                    className="object-contain"
                  />
                </div>
              ) : null}

              <div className="flex justify-end">
                <Button
                  onClick={submitPost}
                  disabled={isPending || body.trim().length === 0}
                >
                  Post
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No posts yet for this challenge.
                </p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="rounded-md border p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <Avatar className="h-8 w-8 border bg-background">
                        {comment.userAvatarUrl ? (
                          <AvatarImage
                            src={comment.userAvatarUrl}
                            alt={comment.userName}
                          />
                        ) : null}
                        <AvatarFallback className="text-xs font-medium">
                          {initialsFromName(comment.userName)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-medium">
                            {comment.userName}
                          </div>
                          {comment.teamName ? (
                            <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {comment.teamName}
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <p className="whitespace-pre-wrap text-sm">
                      {comment.body}
                    </p>

                    {comment.imageUrl ? (
                      <div className="relative mt-2 h-80 w-full overflow-hidden rounded-md border">
                        <Image
                          src={comment.imageUrl}
                          alt="Post image"
                          fill
                          className="object-contain"
                        />
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
