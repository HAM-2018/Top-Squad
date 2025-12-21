"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import {
  challengeTable,
  challengeTeamInvitesTable,
  teamMembersTable,
  usersTable,
} from "@/db/schema";
import { and, eq, or } from "drizzle-orm";

export async function inviteTeamToChallenge(challengeId: number, teamId: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Get app user
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, userId));

  if (!user) throw new Error("User not found");

  // Get challenge
  const [challenge] = await db
    .select({
      id: challengeTable.id,
      groupId: challengeTable.groupId, // host team
      createdByUserId: challengeTable.createdByUserId,
      isTeamBased: challengeTable.isTeamBased,
      isActive: challengeTable.isActive,
    })
    .from(challengeTable)
    .where(eq(challengeTable.id, challengeId));

  if (!challenge) throw new Error("Challenge not found");
  if (!challenge.isActive) throw new Error("Challenge is not active");
  if (!challenge.isTeamBased) throw new Error("This challenge is not team-based");

  const [membership] = await db
    .select({ role: teamMembersTable.role })
    .from(teamMembersTable)
    .where(
      and(
        eq(teamMembersTable.teamId, challenge.groupId),
        eq(teamMembersTable.userId, user.id)
      )
    );

  const adminOrOwner =
    membership?.role === "owner" || membership?.role === "admin";

  if (!adminOrOwner) {
    throw new Error("Only challenge creator or host team admins/owners can invite teams");
  }

  // Create invite
  await db
    .insert(challengeTeamInvitesTable)
    .values({
      challengeId,
      teamId,
      invitedByUserId: user.id,
      status: "pending",
    })
    .onConflictDoUpdate({
      target: [
        challengeTeamInvitesTable.challengeId,
        challengeTeamInvitesTable.teamId,
      ],
      set: {
        status: "pending",
        invitedByUserId: user.id,
      },
    });
}
