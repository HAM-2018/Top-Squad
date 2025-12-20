import z from "zod";

export const logAttemptSchema = z.object({
  teamChallengeId: z.number().int().positive(),
  partId: z.number().int().positive(),
  value: z.number().int().nonnegative(),
});