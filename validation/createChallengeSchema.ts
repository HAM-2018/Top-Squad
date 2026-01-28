import { aggregationValues, bestOfValues, betterValues, pointsModeValues } from "@/types/scoring";
import z from "zod";

const challengeMetricValues = ["time", "distance", "reps", "weight"] as const;

export const challengePartSchema = z
  .object({
    name: z.string().min(1, "Name of event is required"),
    metric: z.enum(challengeMetricValues),

    targetValue: z.number().int().positive().optional(),
    unit: z.string().optional(),
    sortOrder: z.number().int().min(1).optional(),
    isTeamLogOnly: z.boolean().optional().default(false),
    //scoring fields
    aggregation: z.enum(aggregationValues).default("best"),
    better: z.enum(betterValues).default("lower"),
    pointsMode: z.enum(pointsModeValues).default("rank_low_wins"),
    weight: z.number().int().min(1).default(1),
  })

export const createChallengeSchema = z
  .object({
    name: z.string().min(1, "Challenge name is required"),
    description: z.string().min(1, "Description of the challenge is required"),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    isTeamBased: z.boolean().default(false),
    groupId: z.number().int(),
    teamId: z.number().int().optional(),
    parts: z.array(challengePartSchema).min(1, "At least one event is required"),
    pointsMode: z.enum(pointsModeValues).default("rank_low_wins"),
  })
  .superRefine((data, ctx) => {
    const now = new Date();

    if (data.endDate < now) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date cannot be in the past",
      });
    }

    if (data.endDate < data.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date cannot be earlier than the start date",
      });
    }

    if (data.isTeamBased && !data.teamId) {
      ctx.addIssue({
        code: "custom",
        path: ["teamId"],
        message: "You must select a valid team for a team event",
      });
    }
  });

export type CreateChallenge = z.infer<typeof createChallengeSchema>;
