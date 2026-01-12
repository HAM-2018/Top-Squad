import { and, desc, eq } from "drizzle-orm";
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

// Return all TEAM-based teamChallenge instances the user has 
export async function getTeamChallengeOptions(userId: number): Promise<TeamChallengeOption[]> {
  
  if (!userId) throw new Error("Unauthorized");

  // attempts order by most recent
  const rows = await db
    .select({
      teamChallengeId: teamChallengesTable.id,
      challengeId: challengeTable.id,
      challengeName: challengeTable.name,
      teamId: teamsTable.id,
      teamName: teamsTable.name,
      lastRecordedAt: challengeAttemptsTable.recordedAt,
    })
    .from(teamChallengesTable)
    .innerJoin(challengeTable, eq(challengeTable.id, teamChallengesTable.challengeId))
    .innerJoin(teamsTable, eq(teamsTable.id, teamChallengesTable.teamId))
    .innerJoin(
      teamMembersTable,
      and(eq(teamMembersTable.teamId, teamChallengesTable.teamId), eq(teamMembersTable.userId, userId)),
    )
    .leftJoin(
      challengeAttemptsTable,
      eq(challengeAttemptsTable.teamChallengeId, teamChallengesTable.id),
    )
    .where(eq(challengeTable.isTeamBased, true))
    .orderBy(desc(challengeAttemptsTable.recordedAt));

  const seen = new Set<number>();
  const out: TeamChallengeOption[] = [];
  for (const r of rows) {
    if (seen.has(r.teamChallengeId)) continue;
    seen.add(r.teamChallengeId);
    out.push(r);
  }
  return out;
}
