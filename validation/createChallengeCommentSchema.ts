import z from "zod";

export const CreateChallengeCommentSchema = z.object({
  teamChallengeId: z.number().int().positive(),
  body: z
    .string()
    .trim()
    .min(1, "Post is required")
    .max(2000, "Post is too long"),
  imageUrl: z
    .string()
    .trim()
    .url("Image URL must be valid")
    .optional()
    .nullable(),
  imagePublicId: z.string().trim().min(1).optional().nullable(),
});

export type CreateChallengeCommentInput = z.infer<
  typeof CreateChallengeCommentSchema
>;
