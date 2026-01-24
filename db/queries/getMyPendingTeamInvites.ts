import { db } from "@/db";
import { teamInvitesTable, teamsTable } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "./getCurrentUser";

export async function getMyPendingTeamInvites() {
  const user = await getCurrentUser();
  if (!user) throw new Error("User not found");

  const rows = await db
    .select({
      inviteId: teamInvitesTable.id,
      teamId: teamsTable.id,
      teamName: teamsTable.name,
      invitedByName: sql<string | null>`null`,
      createdAt: teamInvitesTable.createdAt,
    })
    .from(teamInvitesTable)
    .innerJoin(teamsTable, eq(teamInvitesTable.teamId, teamsTable.id))
    .where(
      and(
        eq(teamInvitesTable.status, "pending"),
        sql`(
          ${teamInvitesTable.invitedUserId} = ${user.id}
          OR lower(${teamInvitesTable.invitedEmail}) = lower(${user.email})
        )`
      )
    )
    .orderBy(desc(teamInvitesTable.createdAt));

  return rows;
}
