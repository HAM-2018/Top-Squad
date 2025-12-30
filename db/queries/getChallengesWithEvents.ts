import { asc, desc, eq, and } from "drizzle-orm";
import { db } from "@/db";
import {
  challengePartsTable,
  challengeTable,
  teamsTable,
  teamChallengesTable,
  teamMembersTable,
} from "@/db/schema";
import type { ChallengeWithParts } from "@/types/individualchallengeStats";

export async function getChallengesWithPartsForUser(
  userDbId: number
): Promise<ChallengeWithParts[]> {
  const rows = await db
  .select({
    challengeId: challengeTable.id,
    challengeName: challengeTable.name,
    challengeDescription: challengeTable.description,
    isTeamBased: challengeTable.isTeamBased,
    groupId: challengeTable.groupId,
    groupName: teamsTable.name,
    startDate: challengeTable.startDate,
    endDate: challengeTable.endDate,

    partId: challengePartsTable.id,
    partName: challengePartsTable.name,
    metric: challengePartsTable.metric,
    unit: challengePartsTable.unit,
    targetValue: challengePartsTable.targetValue,
    sortOrder: challengePartsTable.sortOrder,
    isTeamLogOnly: challengePartsTable.isTeamLogOnly,
  })
  .from(teamChallengesTable)
  .innerJoin(challengeTable, eq(challengeTable.id, teamChallengesTable.challengeId))
  .innerJoin(teamsTable, eq(teamsTable.id, challengeTable.groupId))
  .innerJoin(
    teamMembersTable,
    and(
      eq(teamMembersTable.teamId, teamChallengesTable.teamId),
      eq(teamMembersTable.userId, userDbId)
    )
  )
  .leftJoin(challengePartsTable, eq(challengePartsTable.challengeId, challengeTable.id))
  .where(
    and(
      eq(challengeTable.isActive, true),
      eq(teamChallengesTable.isActive, true)
    )
  )
  .orderBy(desc(challengeTable.createdAt), asc(challengePartsTable.sortOrder));

  // Group into ChallengeWithParts[]
const byChallenge = new Map<number, ChallengeWithParts>();
const partsSeen = new Map<number, Set<number>>(); // challengeId -> set(partId)

for (const r of rows) {
  let c = byChallenge.get(r.challengeId);

  if (!c) {
    c = {
      challengeId: r.challengeId,
      name: r.challengeName,
      description: r.challengeDescription,
      isTeamBased: r.isTeamBased,
      groupId: r.groupId,
      groupName: r.groupName,
      startDate: r.startDate ?? null,
      endDate: r.endDate ?? null,
      parts: [],
    };
    byChallenge.set(r.challengeId, c);
    partsSeen.set(r.challengeId, new Set());
  }

  if (r.partId) {
    const seen = partsSeen.get(r.challengeId)!;
    if (!seen.has(r.partId)) {
      seen.add(r.partId);

      c.parts.push({
        partId: r.partId,
        partName: r.partName ?? "Unnamed Event",
        metric: r.metric as any,
        unit: r.unit ?? null,
        targetValue: r.targetValue ?? null,
        sortOrder: r.sortOrder ?? 1,
        isTeamLogOnly: r.isTeamLogOnly ?? false,
      });
    }
  }
}

return Array.from(byChallenge.values());
}
