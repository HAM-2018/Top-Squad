import z from "zod";

export const createTeamSchema = z.object({
    name: z.string().min(1, "Team name is required"),
    description: z.string().min(1, "Description is required"),
});


export type CreateTeam = z.infer<typeof createTeamSchema>;