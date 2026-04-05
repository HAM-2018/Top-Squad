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

export async function getTeamChallengesForUser(userDbId: number): Promise<ChallengeWithParts[]> {
  const rows = await db
    .select({
      teamChallengeId: teamChallengesTable.id,
      challengeId: challengeTable.id,
      challengeName: challengeTable.name,
      challengeDescription: challengeTable.description,
      isTeamBased: challengeTable.isTeamBased,
      groupId: challengeTable.groupId,
      groupName: teamsTable.name,
      startDate: challengeTable.startDate,
      endDate: challengeTable.endDate,
      challengeIsActive: challengeTable.isActive,
      teamChallengeIsActive: teamChallengesTable.isActive,

      partId: challengePartsTable.id,
      partName: challengePartsTable.name,
      metric: challengePartsTable.metric,
      unit: challengePartsTable.unit,
      targetValue: challengePartsTable.targetValue,
      sortOrder: challengePartsTable.sortOrder,
      isTeamLogOnly: challengePartsTable.isTeamLogOnly,
    })
    .from(teamMembersTable)
    .innerJoin(teamChallengesTable, eq(teamChallengesTable.teamId, teamMembersTable.teamId))
    .innerJoin(challengeTable, eq(challengeTable.id, teamChallengesTable.challengeId))
    .innerJoin(teamsTable, eq(teamsTable.id, challengeTable.groupId))
    .leftJoin(challengePartsTable, eq(challengePartsTable.challengeId, challengeTable.id))
    .where(
      and(
        eq(teamMembersTable.userId, userDbId),
        eq(challengeTable.isTeamBased, true),
        eq(challengeTable.isActive, true),
        eq(teamChallengesTable.isActive, true)
      )
    )
    .orderBy(desc(challengeTable.createdAt), asc(challengePartsTable.sortOrder));

  // Group into ChallengeWithParts[]
  const byTeamChallenge = new Map<number, ChallengeWithParts>();
  const partsSeen = new Map<number, Set<number>>();

  for (const r of rows) {
    let c = byTeamChallenge.get(r.teamChallengeId);

    if (!c) {
      c = {
        teamChallengeId: r.teamChallengeId,
        challengeId: r.challengeId,
        name: r.challengeName,
        description: r.challengeDescription,
        isTeamBased: r.isTeamBased,
        groupId: r.groupId,
        groupName: r.groupName,
        startDate: r.startDate ?? null,
        endDate: r.endDate ?? null,
        challengeIsActive: r.challengeIsActive ?? true,
        teamChallengeIsActive: r.teamChallengeIsActive ?? true,
        parts: [],
      };
      byTeamChallenge.set(r.teamChallengeId, c);
      partsSeen.set(r.teamChallengeId, new Set());
    }

    if (r.partId) {
      const seen = partsSeen.get(r.teamChallengeId)!;
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

  return Array.from(byTeamChallenge.values());
}
