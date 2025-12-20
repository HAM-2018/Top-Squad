import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import {
  challengePartsTable,
  challengeTable,
  teamChallengesTable,
  teamMembersTable,
  teamsTable,
  usersTable,
} from "@/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import { RecordableChallenge, RecordablePart } from "@/types/recordChallenges";



export async function getRecordableChallenges() {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Unauthorized");

  const [me] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!me) throw new Error("User not found");

  // all teams Im in
  const myTeams = await db
    .select({ teamId: teamMembersTable.teamId })
    .from(teamMembersTable)
    .where(eq(teamMembersTable.userId, me.id));

  const myTeamIds = myTeams.map((t) => t.teamId);
  if (myTeamIds.length === 0) {
    return { solo: [] as RecordableChallenge[], team: [] as RecordableChallenge[] };
  }

  // all challenges (teamChallenges) tied to my teams
  const rows = await db
    .select({
      teamChallengeId: teamChallengesTable.id,
      teamId: teamChallengesTable.teamId,
      teamName: teamsTable.name,
      challengeId: challengeTable.id,
      challengeName: challengeTable.name,
      isTeamBased: challengeTable.isTeamBased,
    })
    .from(teamChallengesTable)
    .innerJoin(challengeTable, eq(challengeTable.id, teamChallengesTable.challengeId))
    .innerJoin(teamsTable, eq(teamsTable.id, teamChallengesTable.teamId))
    .where(inArray(teamChallengesTable.teamId, myTeamIds));

  const challengeIds = Array.from(new Set(rows.map((r) => r.challengeId)));
  if (challengeIds.length === 0) {
    return { solo: [] as RecordableChallenge[], team: [] as RecordableChallenge[] };
  }

  // all parts for those challenges
  const parts = await db
    .select({
      challengeId: challengePartsTable.challengeId,
      partId: challengePartsTable.id,
      partName: challengePartsTable.name,
      metric: challengePartsTable.metric,
      unit: challengePartsTable.unit,
      sortOrder: challengePartsTable.sortOrder,
      isTeamLogOnly: challengePartsTable.isTeamLogOnly,
    })
    .from(challengePartsTable)
    .where(inArray(challengePartsTable.challengeId, challengeIds))
    .orderBy(asc(challengePartsTable.sortOrder));

  const partsByChallenge = new Map<number, RecordablePart[]>();
  for (const p of parts) {
    const arr = partsByChallenge.get(p.challengeId) ?? [];
    arr.push({
      partId: p.partId,
      partName: p.partName,
      metric: p.metric as any,
      unit: p.unit ?? null,
      sortOrder: p.sortOrder ?? 1,
      isTeamLogOnly: Boolean(p.isTeamLogOnly),
    });
    partsByChallenge.set(p.challengeId, arr);
  }

  const hydrated: RecordableChallenge[] = rows.map((r) => ({
    teamChallengeId: r.teamChallengeId,
    challengeId: r.challengeId,
    teamId: r.teamId,
    teamName: r.teamName,
    challengeName: r.challengeName,
    isTeamBased: r.isTeamBased,
    parts: partsByChallenge.get(r.challengeId) ?? [],
  }));

  return {
    solo: hydrated.filter((c) => !c.isTeamBased),
    team: hydrated.filter((c) => c.isTeamBased),
  };
}
