"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import {
  challengeTable,
  challengeTeamInvitesTable,
  teamMembersTable,
  teamsTable,
  usersTable,
} from "@/db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

export type PendingInviteRow = {
  inviteId: number;
  createdAt: Date | null;

  teamId: number;
  teamName: string;

  challengeId: number;
  challengeName: string;
  hostTeamId: number;
};

export async function getInvitesForMyTeams(): Promise<PendingInviteRow[]> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.clerkId, userId));

  if (!user) throw new Error("User not found");

  // Teams where user is admin/owner
  const adminTeams = await db
    .select({ teamId: teamMembersTable.teamId })
    .from(teamMembersTable)
    .where(
      and(
        eq(teamMembersTable.userId, user.id),
        inArray(teamMembersTable.role, ["owner", "admin"])
      )
    );

  const teamIds = adminTeams.map((t) => t.teamId);
  if (teamIds.length === 0) return [];

  // Pending invites for those teams
  const rows = await db
    .select({
      inviteId: challengeTeamInvitesTable.id,
      createdAt: challengeTeamInvitesTable.createdAt,

      teamId: teamsTable.id,
      teamName: teamsTable.name,

      challengeId: challengeTable.id,
      challengeName: challengeTable.name,
      hostTeamId: challengeTable.groupId,
    })
    .from(challengeTeamInvitesTable)
    .innerJoin(teamsTable, eq(teamsTable.id, challengeTeamInvitesTable.teamId))
    .innerJoin(challengeTable, eq(challengeTable.id, challengeTeamInvitesTable.challengeId))
    .where(
      and(
        inArray(challengeTeamInvitesTable.teamId, teamIds),
        sql`${challengeTeamInvitesTable.status} = ${"pending"}::invite_status`,
        eq(challengeTable.isActive, true)
      )
    )
    .orderBy(desc(challengeTeamInvitesTable.createdAt));

  return rows;
}
