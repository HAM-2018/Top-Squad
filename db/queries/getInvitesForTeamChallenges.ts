"use server";

import { db } from "@/db";
import {
  challengeTable,
  challengeTeamInvitesTable,
  teamMembersTable,
  teamsTable,
} from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getCurrentUser } from "./getCurrentUser";
import { ChallengeInvite } from "@/types/teamInvites";

export async function getInvitesForMyTeamChallenges(): Promise<ChallengeInvite[]> {
  const user = await getCurrentUser(); 
  if (!user) throw new Error("User not found");

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
        eq(challengeTeamInvitesTable.status, "pending"),
        eq(challengeTable.isActive, true)
      )
    )
    .orderBy(desc(challengeTeamInvitesTable.createdAt));

  return rows;
}
