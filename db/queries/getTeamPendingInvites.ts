"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "..";
import { and, eq } from "drizzle-orm";
import { teamInvitesTable, teamMembersTable, usersTable } from "../schema";
import { TeamInvite } from "@/types/teamInvites";


export async function getTeamPendingInvites(teamId: number): Promise<TeamInvite[]> {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Unauthorized");

  const me = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId))
    .then((r) => r[0]);

  if (!me) throw new Error("User not found.");

  // Only team members should see invites list 
  const teamMember = await db
    .select({ id: teamMembersTable.id })
    .from(teamMembersTable)
    .where(and(eq(teamMembersTable.teamId, teamId), eq(teamMembersTable.userId, me.id)))
    .then((r) => r[0]);

  if (!teamMember) throw new Error("Forbidden");
     return db
    .select({
      inviteId: teamInvitesTable.id,
      invitedEmail: teamInvitesTable.invitedEmail,
      status: teamInvitesTable.status,
      createdAt: teamInvitesTable.createdAt,
    }) 
    .from(teamInvitesTable)
    .where(and(
      eq(teamInvitesTable.teamId, teamId),
      eq(teamInvitesTable.status, "pending")
    ))
    .orderBy(teamInvitesTable.createdAt);
}
