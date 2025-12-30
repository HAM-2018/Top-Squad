import { auth } from "@clerk/nextjs/server";
import { and, eq, asc } from "drizzle-orm";
import { db } from "..";
import {
  challengeTable,
  teamChallengesTable,
  teamMembersTable,
  teamsTable,
  usersTable,
} from "../schema";

export type TeamChallengeOption = {
  teamChallengeId: number;
  teamId: number;
  teamName: string;
  challengeName: string;
};

export async function getTeamChallengeOptions(): Promise<TeamChallengeOption[]> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, userId));

  if (!user) throw new Error("User not found");

  const rows = await db
    .select({
      teamChallengeId: teamChallengesTable.id,
      teamId: teamsTable.id,
      teamName: teamsTable.name,
      challengeName: challengeTable.name,
    })
    .from(teamChallengesTable)
    .innerJoin(challengeTable, eq(challengeTable.id, teamChallengesTable.challengeId))
    .innerJoin(teamsTable, eq(teamsTable.id, teamChallengesTable.teamId))
    .innerJoin(
      teamMembersTable,
      and(
        eq(teamMembersTable.teamId, teamChallengesTable.teamId),
        eq(teamMembersTable.userId, user.id)
      )
    )
    .where(eq(challengeTable.isTeamBased, true))
    .orderBy(asc(teamsTable.name), asc(challengeTable.name));

  return rows;
}
