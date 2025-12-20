"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import {
  challengeAttemptsTable,
  challengePartsTable,
  teamChallengesTable,
  teamMembersTable,
  usersTable,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { logAttemptSchema } from "@/validation/logAttemptSchema";


export async function logTeamPartScore(input: unknown) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Unauthorized");

  const { teamChallengeId, partId, value } = logAttemptSchema.parse(input);

  const [me] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!me) throw new Error("User not found");

  const [tc] = await db
    .select({
      teamId: teamChallengesTable.teamId,
      challengeId: teamChallengesTable.challengeId,
    })
    .from(teamChallengesTable)
    .where(eq(teamChallengesTable.id, teamChallengeId));

  if (!tc) throw new Error("Team challenge not found");

  // partbelongs to that challenge + isTeamLogOnly
  const [part] = await db
    .select({
      id: challengePartsTable.id,
      challengeId: challengePartsTable.challengeId,
      isTeamLogOnly: challengePartsTable.isTeamLogOnly,
      metric: challengePartsTable.metric,
    })
    .from(challengePartsTable)
    .where(eq(challengePartsTable.id, partId));

  if (!part) throw new Error("Part not found");
  if (part.challengeId !== tc.challengeId) throw new Error("Part does not belong to this challenge");

  // must be team-log-only for this action
  if (!part.isTeamLogOnly) throw new Error("This part is not team-log-only");

  // membership + role
  const [membership] = await db
    .select({ role: teamMembersTable.role })
    .from(teamMembersTable)
    .where(and(eq(teamMembersTable.teamId, tc.teamId), eq(teamMembersTable.userId, me.id)));

  if (!membership || (membership.role !== "admin" && membership.role !== "owner")) {
    throw new Error("Only admins/owners can log team scores");
  }

  // one score per teamChallenge + part
  await db.transaction(async (tx) => {
    await tx
      .delete(challengeAttemptsTable)
      .where(
        and(
          eq(challengeAttemptsTable.teamChallengeId, teamChallengeId),
          eq(challengeAttemptsTable.challengePartId, partId)
        )
      );

    await tx.insert(challengeAttemptsTable).values({
      teamChallengeId,
      challengePartId: partId,
      userId: me.id, // admin who logged
      value,
    });
  });

  return { ok: true };
}
