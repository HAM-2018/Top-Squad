"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  challengeCommentsTable,
  teamChallengesTable,
  teamMembersTable,
  teamsTable,
} from "@/db/schema";
import { CreateChallengeCommentSchema } from "@/validation/createChallengeCommentSchema";
import type { ChallengeComment } from "@/types/challengeComments";
import { getCurrentUser } from "../queries/getCurrentUser";

export async function createChallengeComment(
  input: unknown,
): Promise<ChallengeComment> {
  const user = await getCurrentUser();

  const parsed = CreateChallengeCommentSchema.parse(input);

  if (!user) throw new Error("User not found");

  const [teamChallenge] = await db
    .select({
      teamId: teamChallengesTable.teamId,
      teamName: teamsTable.name,
    })
    .from(teamChallengesTable)
    .innerJoin(teamsTable, eq(teamsTable.id, teamChallengesTable.teamId))
    .where(eq(teamChallengesTable.id, parsed.teamChallengeId));

  if (!teamChallenge) throw new Error("Challenge not found");

  const [membership] = await db
    .select({ id: teamMembersTable.id })
    .from(teamMembersTable)
    .where(
      and(
        eq(teamMembersTable.teamId, teamChallenge.teamId),
        eq(teamMembersTable.userId, user.id),
      ),
    );

  if (!membership) throw new Error("You are not part of this challenge team");

  const [created] = await db
    .insert(challengeCommentsTable)
    .values({
      teamChallengeId: parsed.teamChallengeId,
      userId: user.id,
      body: parsed.body.trim(),
      imageUrl: parsed.imageUrl?.trim() || null,
      imagePublicId: parsed.imagePublicId?.trim() || null,
    })
    .returning({
      id: challengeCommentsTable.id,
      teamChallengeId: challengeCommentsTable.teamChallengeId,
      userId: challengeCommentsTable.userId,
      body: challengeCommentsTable.body,
      imageUrl: challengeCommentsTable.imageUrl,
      imagePublicId: challengeCommentsTable.imagePublicId,
      createdAt: challengeCommentsTable.createdAt,
    });

  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();

  return {
    id: created.id,
    teamChallengeId: created.teamChallengeId,
    userId: created.userId,
    userName: fullName || user.email,
    userAvatarUrl: user.avatarUrl ?? null,
    teamName: teamChallenge.teamName ?? null,
    body: created.body,
    imageUrl: created.imageUrl ?? null,
    imagePublicId: created.imagePublicId ?? null,
    createdAt: created.createdAt
      ? created.createdAt.toISOString()
      : new Date().toISOString(),
  };
}
