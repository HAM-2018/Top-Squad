"use server";

import { type CreateChallenge, createChallengeSchema } from "@/validation/createChallengeSchema";
import { auth } from "@clerk/nextjs/server";
import { db } from "..";
import {
  challengePartsTable,
  challengeTable,
  teamChallengesTable,
  teamMembersTable,
  usersTable,
} from "../schema";
import { eq, and } from "drizzle-orm";

export async function createChallenge(input: CreateChallenge) {
  const {
    name,
    description,
    startDate,
    endDate,
    isTeamBased,
    groupId,
    parts = [],
  } = createChallengeSchema.parse(input);

  const { userId } = await auth();
  if (!userId) throw new Error("User not authenticated");

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, userId));

  if (!user) throw new Error("User not found");

  //must be admin/owner of host team
  const [membership] = await db
    .select({ role: teamMembersTable.role })
    .from(teamMembersTable)
    .where(
      and(
        eq(teamMembersTable.teamId, groupId),
        eq(teamMembersTable.userId, user.id)
      )
    );

  if (!membership) throw new Error("Not authorized to create challenge for this team");
  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new Error("Only team owners/admins can create challenges");
  }

  return await db.transaction(async (tx) => {
    const [challenge] = await tx
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

    // Create parts
    if (parts.length > 0) {
      await tx.insert(challengePartsTable).values(
        parts.map((part, index) => ({
          challengeId: challenge.id,
          name: part.name,
          metric: part.metric,
          targetValue: part.targetValue ?? null,
          unit: part.unit ?? null,
          sortOrder: part.sortOrder ?? index + 1,
          isTeamLogOnly: isTeamBased ? (part.isTeamLogOnly ?? false) : false,
        }))
      );
    }

    // Auto-join host team
    await tx
      .insert(teamChallengesTable)
      .values({
        teamId: groupId,
        challengeId: challenge.id,
        isActive: true,
      })
      .onConflictDoNothing();

    return challenge;
  });
}
