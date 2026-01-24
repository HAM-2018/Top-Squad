import z from "zod";

export const TeamInviteSchema = z.object({
    teamId: z.number().int().positive(),
    invitedEmail: z.email().trim().transform((v) => v.toLowerCase()),
    invitedFirstName: z.string().trim().max(50).optional().nullable(),
    invitedLastName: z.string().trim().max(50).optional().nullable(),
});

