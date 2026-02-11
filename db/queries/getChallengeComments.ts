import { ChallengeComment } from "@/types/challengeComments";
import { getCurrentUser } from "./getCurrentUser";
import { db } from "..";
import {
  challengeCommentsTable,
  teamChallengesTable,
  teamMembersTable,
  teamsTable,
  usersTable,
} from "../schema";
import { and, desc, eq } from "drizzle-orm";

export async function GetChallengeComments(
  teamChallengeId: number,
): Promise<ChallengeComment[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const [teamChallenge] = await db
    .select({
      teamId: teamChallengesTable.teamId,
      teamName: teamsTable.name,
    })
    .from(teamChallengesTable)
    .innerJoin(teamsTable, eq(teamsTable.id, teamChallengesTable.teamId))
    .where(eq(teamChallengesTable.id, teamChallengeId));

  if (!teamChallenge) return [];

  const [membership] = await db
    .select({ id: teamMembersTable.id })
    .from(teamMembersTable)
    .where(
      and(
        eq(teamMembersTable.teamId, teamChallenge.teamId),
        eq(teamMembersTable.userId, user.id),
      ),
    );

  if (!membership) return [];

  const rows = await db
    .select({
      id: challengeCommentsTable.id,
      teamChallengeId: challengeCommentsTable.teamChallengeId,
      userId: challengeCommentsTable.userId,
      body: challengeCommentsTable.body,
      imageUrl: challengeCommentsTable.imageUrl,
      imagePublicId: challengeCommentsTable.imagePublicId,
      createdAt: challengeCommentsTable.createdAt,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      email: usersTable.email,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(challengeCommentsTable)
    .innerJoin(usersTable, eq(usersTable.id, challengeCommentsTable.userId))
    .where(eq(challengeCommentsTable.teamChallengeId, teamChallengeId))
    .orderBy(
      desc(challengeCommentsTable.createdAt),
      desc(challengeCommentsTable.id),
    )
    .limit(100);

  return rows.map((row) => {
    const fullName = `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim();

    return {
      id: row.id,
      teamChallengeId: row.teamChallengeId,
      userId: row.userId,
      userName: fullName || row.email,
      userAvatarUrl: row.avatarUrl ?? null,
      teamName: teamChallenge.teamName ?? null,
      body: row.body,
      imageUrl: row.imageUrl ?? null,
      imagePublicId: row.imagePublicId ?? null,
      createdAt: row.createdAt
        ? row.createdAt.toISOString()
        : new Date(0).toISOString(),
    };
  });
}
