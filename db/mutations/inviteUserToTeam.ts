"use server";
import { db } from "..";
import { and, eq, sql as dsql } from "drizzle-orm";
import { teamInvitesTable, teamMembersTable, usersTable } from "../schema";
import z from "zod";
import { TeamInviteSchema } from "@/validation/teamInvites";
import { getCurrentUser } from "../queries/getCurrentUser";

type TeamInviteInput = z.infer<typeof TeamInviteSchema>;

export async function inviteUserToTeam(input: {
  teamId: number;
  invitedEmail: string;
  invitedFirstName?: string | null;
  invitedLastName?: string | null;
}) {
 const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const data: TeamInviteInput = TeamInviteSchema.parse(input);

  // cant invite yourself
  if (user.email.toLowerCase() === data.invitedEmail) {
    throw new Error("You can’t invite yourself.");
  }

  // only owner/admin can invite 
  const myMembership = await db
    .select({ role: teamMembersTable.role })
    .from(teamMembersTable)
    .where(and(eq(teamMembersTable.teamId, data.teamId), eq(teamMembersTable.userId, user.id)))
    .then((r) => r[0]);

  if (!myMembership || (myMembership.role !== "owner" && myMembership.role !== "admin")) {
    throw new Error("You must be a team admin/owner to invite.");
  }

  //if invited email belongs to an existing user, link it
  const invitedUser = await db
    .select({ id: usersTable.id, email: usersTable.email, firstName: usersTable.firstName, lastName: usersTable.lastName })
    .from(usersTable)
    .where(dsql`lower(${usersTable.email}) = ${data.invitedEmail}`)
    .then((r) => r[0]);

  const invitedUserId = invitedUser?.id ?? null;

  // don't invite someone already on the team
  if (invitedUserId) {
    const existingMember = await db
      .select({ id: teamMembersTable.id })
      .from(teamMembersTable)
      .where(and(eq(teamMembersTable.teamId, data.teamId), eq(teamMembersTable.userId, invitedUserId)))
      .then((r) => r[0]);

    if (existingMember) {
      throw new Error("That user is already on this team.");
    }
  }

  // insert invite
  try {
    await db.insert(teamInvitesTable).values({
      teamId: data.teamId,
      invitedByUserId: user.id,
      invitedEmail: data.invitedEmail,
      invitedUserId,
      invitedFirstName: data.invitedFirstName ?? invitedUser?.firstName ?? null,
      invitedLastName: data.invitedLastName ?? invitedUser?.lastName ?? null,
      // status defaults to pending
    });
  } catch (err: any) {
    if (err?.code === "23505") {
      throw new Error("An invite for that email already exists for this team.");
    }
    throw err;
  }
  return { ok: true };
}