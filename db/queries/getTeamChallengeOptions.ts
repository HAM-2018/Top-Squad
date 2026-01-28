import { and, desc, eq, max, sql } from "drizzle-orm";
import { db } from "..";
import {
  challengeAttemptsTable,
  challengeTable,
  teamChallengesTable,
  teamMembersTable,
  teamsTable,
} from "../schema";

export type TeamChallengeOption = {
  teamChallengeId: number;
  challengeId: number;
  challengeName: string;
  teamId: number;
  teamName: string;
  lastRecordedAt: Date | null;
};

export async function getTeamChallengeOptions(userId: number): Promise<TeamChallengeOption[]> {
  if (!userId) throw new Error("Unauthorized");

  const rows = await db
    .select({
      teamChallengeId: teamChallengesTable.id,
      challengeId: challengeTable.id,
      challengeName: challengeTable.name,
      teamId: teamsTable.id,
      teamName: teamsTable.name,
      lastRecordedAt: max(challengeAttemptsTable.recordedAt),
    })
    .from(teamChallengesTable)
    .innerJoin(challengeTable, eq(challengeTable.id, teamChallengesTable.challengeId))
    .innerJoin(teamsTable, eq(teamsTable.id, teamChallengesTable.teamId))
    .innerJoin(
      teamMembersTable,
      and(eq(teamMembersTable.teamId, teamChallengesTable.teamId), eq(teamMembersTable.userId, userId))
    )
    .leftJoin(challengeAttemptsTable, eq(challengeAttemptsTable.teamChallengeId, teamChallengesTable.id))
    .where(eq(challengeTable.isTeamBased, true))
    .groupBy(
      teamChallengesTable.id,
      challengeTable.id,
      challengeTable.name,
      teamsTable.id,
      teamsTable.name
    )
    .orderBy(
      desc(sql`max(${challengeAttemptsTable.recordedAt})`)
    );

  return rows;
}
