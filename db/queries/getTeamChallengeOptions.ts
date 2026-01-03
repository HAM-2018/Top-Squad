import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "..";
import {
  challengeAttemptsTable,
  challengeTable,
  teamChallengesTable,
  teamMembersTable,
  teamsTable,
  usersTable,
} from "../schema";

export type TeamChallengeOption = {
  teamChallengeId: number;
  challengeId: number;
  challengeName: string;
  teamId: number;
  teamName: string;
  lastRecordedAt: Date | null;
};

// Return all TEAM-based teamChallenge instances the user has access to
export async function getTeamChallengeOptions(): Promise<TeamChallengeOption[]> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [me] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
  if (!me) throw new Error("User not found");

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
      and(eq(teamMembersTable.teamId, teamChallengesTable.teamId), eq(teamMembersTable.userId, me.id)),
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
