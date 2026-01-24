"use server";
import { db } from "..";
import { and, eq } from "drizzle-orm";
import { teamInvitesTable, teamMembersTable, usersTable } from "../schema";
import { getCurrentUser } from "../queries/getCurrentUser";

export async function respondToTeamInvite(inviteId: number, action: "accept" | "decline") {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const invite = await db
    .select({
      id: teamInvitesTable.id,
      teamId: teamInvitesTable.teamId,
      invitedEmail: teamInvitesTable.invitedEmail,
      status: teamInvitesTable.status,
    })
    .from(teamInvitesTable)
    .where(eq(teamInvitesTable.id, inviteId))
    .then((r) => r[0]);

  if (!invite) throw new Error("Invite not found.");
  if (invite.status !== "pending") throw new Error("Invite is no longer pending.");

  // Must match email case insensitive
  if (invite.invitedEmail.toLowerCase() !== user.email.toLowerCase()) {
    throw new Error("This invite is not for your account.");
  }

  if (action === "accept") {
    // Ensure membership exists
    const existing = await db
      .select({ id: teamMembersTable.id })
      .from(teamMembersTable)
      .where(and(eq(teamMembersTable.teamId, invite.teamId), eq(teamMembersTable.userId, user.id)))
      .then((r) => r[0]);

    if (!existing) {
      await db.insert(teamMembersTable).values({
        teamId: invite.teamId,
        userId: user.id,
        role: "member",
      });
    }

    await db
      .update(teamInvitesTable)
      .set({ status: "accepted", respondedAt: new Date(), invitedUserId: user.id })
      .where(eq(teamInvitesTable.id, inviteId));

    return;
  }

  await db
    .update(teamInvitesTable)
    .set({ status: "declined", respondedAt: new Date(), invitedUserId: user.id })
    .where(eq(teamInvitesTable.id, inviteId));
}
