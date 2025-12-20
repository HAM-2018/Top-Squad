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


export async function logIndividualAttempt(input: unknown) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Unauthorized");

  const { teamChallengeId, partId, value } = logAttemptSchema.parse(input);

  const [me] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!me) throw new Error("User not found");

  const [tc] = await db
    .select({ teamId: teamChallengesTable.teamId, challengeId: teamChallengesTable.challengeId })
    .from(teamChallengesTable)
    .where(eq(teamChallengesTable.id, teamChallengeId));

  if (!tc) throw new Error("Team challenge not found");

  const [part] = await db
    .select({
      challengeId: challengePartsTable.challengeId,
      isTeamLogOnly: challengePartsTable.isTeamLogOnly,
    })
    .from(challengePartsTable)
    .where(eq(challengePartsTable.id, partId));

  if (!part) throw new Error("Part not found");
  if (part.challengeId !== tc.challengeId) throw new Error("Part does not belong to this challenge");
  if (part.isTeamLogOnly) throw new Error("This part is team-log-only; admins must log it");

  // must be member of the team
  const [membership] = await db
    .select({ id: teamMembersTable.id })
    .from(teamMembersTable)
    .where(and(eq(teamMembersTable.teamId, tc.teamId), eq(teamMembersTable.userId, me.id)));

  if (!membership) throw new Error("You are not a member of this team");

  //insert attempt history
  await db.insert(challengeAttemptsTable).values({
    teamChallengeId,
    challengePartId: partId,
    userId: me.id,
    value,
  });

  return { ok: true };
}
