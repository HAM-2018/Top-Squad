import { and, desc, eq } from "drizzle-orm";
import { db } from "..";
import {
  challengeAttemptsTable,
  challengeTable,
  teamChallengesTable,
  teamMembersTable,
  teamsTable,
} from "../schema";

export type SoloChallengeOption = {
  teamChallengeId: number;
  challengeId: number;
  challengeName: string;
  teamId: number;
  teamName: string;
  lastRecordedAt: Date | null;
};

// return all solo teamChallenge instances the user has attempted,
// ordered by most recent attempt. Deduped by teamChallengeId.
export async function getSoloChallengeOptions(userId: number): Promise<SoloChallengeOption[]> {

  if (!userId) throw new Error("Unauthorized");

  const rows = await db
    .select({
      teamChallengeId: teamChallengesTable.id,
      challengeId: challengeTable.id,
      challengeName: challengeTable.name,
      teamId: teamsTable.id,
      teamName: teamsTable.name,
      lastRecordedAt: challengeAttemptsTable.recordedAt,
    })
    .from(challengeAttemptsTable)
    .innerJoin(teamChallengesTable, eq(teamChallengesTable.id, challengeAttemptsTable.teamChallengeId))
    .innerJoin(challengeTable, eq(challengeTable.id, teamChallengesTable.challengeId))
    .innerJoin(teamsTable, eq(teamsTable.id, teamChallengesTable.teamId))
    .innerJoin(
      teamMembersTable,
      and(
        eq(teamMembersTable.teamId, teamChallengesTable.teamId),
        eq(teamMembersTable.userId, userId),
      ),
    )
    .where(
      and(
        eq(challengeAttemptsTable.userId, userId),
        eq(challengeTable.isTeamBased, false),
      ),
    )
    .orderBy(desc(challengeAttemptsTable.recordedAt));

  // keep most recent per teamchallengeid
  const seen = new Set<number>();
  const out: SoloChallengeOption[] = [];
  for (const r of rows) {
    if (seen.has(r.teamChallengeId)) continue;
    seen.add(r.teamChallengeId);
    out.push(r);
  }
  return out;
}
