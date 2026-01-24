"use server";

import { db } from "..";
import { eq, sql as dsql } from "drizzle-orm";
import { teamInvitesTable, teamsTable, usersTable } from "../schema";
import { PendingTeamInvite } from "@/types/teamInvites";
import { getCurrentUser } from "./getCurrentUser";

export async function getMyPendingTeamInvites(): Promise<PendingTeamInvite[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const rows = await db
    .select({
      inviteId: teamInvitesTable.id,
      teamId: teamInvitesTable.teamId,
      teamName: teamsTable.name,
      invitedByName: dsql`concat(coalesce(${usersTable.firstName}, ''), ' ', coalesce(${usersTable.lastName}, ''))`,
      createdAt: teamInvitesTable.createdAt,
    })
    .from(teamInvitesTable)
    .innerJoin(teamsTable, eq(teamInvitesTable.teamId, teamsTable.id))
    .innerJoin(usersTable, eq(teamInvitesTable.invitedByUserId, usersTable.id))
    .where(
      dsql`${teamInvitesTable.status} = 'pending' and lower(${teamInvitesTable.invitedEmail}) = lower(${user.email})`
    );

  return rows.map((r) => ({
    ...r,
    invitedByName: (r.invitedByName as unknown as string).trim() || null,
  }));
}
