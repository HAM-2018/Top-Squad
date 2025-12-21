"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import {
  challengeTeamInvitesTable,
  teamChallengesTable,
  teamMembersTable,
  usersTable,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function respondToChallengeInvite(inviteId: number, action: "accept" | "decline") {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
  if (!user) throw new Error("User not found");

  const [invite] = await db
    .select()
    .from(challengeTeamInvitesTable)
    .where(eq(challengeTeamInvitesTable.id, inviteId));

  if (!invite) throw new Error("Invite not found");

  // Must be team admin/owner to respond
  const [membership] = await db
    .select()
    .from(teamMembersTable)
    .where(and(eq(teamMembersTable.teamId, invite.teamId), eq(teamMembersTable.userId, user.id)));

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    throw new Error("Only team admins/owners can respond to invites");
  }

  if (action === "decline") {
    await db
      .update(challengeTeamInvitesTable)
      .set({ status: "declined", respondedAt: new Date() })
      .where(eq(challengeTeamInvitesTable.id, inviteId));
    return;
  }

  // accept
  await db
    .update(challengeTeamInvitesTable)
    .set({ status: "accepted", respondedAt: new Date() })
    .where(eq(challengeTeamInvitesTable.id, inviteId));

  await db
    .insert(teamChallengesTable)
    .values({
      teamId: invite.teamId,
      challengeId: invite.challengeId,
      isActive: true,
    })
    .onConflictDoNothing();
}
