"use server";

import { CreateChallenge, createChallengeSchema } from "@/validation/createChallengeSchema";
import { auth } from "@clerk/nextjs/server";
import { db } from "..";
import { challengePartsTable, challengeTable, teamChallengesTable, usersTable } from "../schema";
import { eq } from "drizzle-orm";

export async function createChallenge (input: CreateChallenge) {
    const {name, description, startDate, endDate, isTeamBased, teamId, groupId, parts = []} = createChallengeSchema.parse(input);

    const { userId } = await auth();

    if (!userId) throw new Error ("User not found");

    const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, userId));

    if (!user) throw new Error ("User not found");

    const [challenge] = await db
    .insert(challengeTable)
    .values({
        name,
        description,
        startDate,
        endDate,
        isTeamBased,
        groupId,
        createdByUserId: user.id,
    })
    .returning();

    if (!challenge) throw new Error("Failed to create challenge");

    if (parts.length > 0) {
        await db.insert(challengePartsTable).values(
        parts.map((part, index) => ({
            challengeId: challenge.id,
            name: part.name,
            metric: part.metric,
            targetValue: part.targetValue ?? null,
            unit: part.unit ?? null,
            sortOrder: part.sortOrder ?? index + 1,
            })),
        );
    }

    if (isTeamBased && teamId) {
        await db.insert(teamChallengesTable).values({
            teamId,
            challengeId: challenge.id,
        });
    }

    return challenge;
}