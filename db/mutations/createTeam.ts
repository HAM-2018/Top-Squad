"use server";

import { eq } from "drizzle-orm";
import { teamMembersTable, teamsTable, usersTable } from "../schema";
import { db } from "..";
import { auth } from "@clerk/nextjs/server";
import { type CreateTeam, createTeamSchema } from "@/validation/createTeamSchema";

export async function createTeam(input: CreateTeam) {
  const { name, description, avatarUrl } = createTeamSchema.parse(input);

  const { userId } = await auth();
  if (!userId) throw new Error("Could not authenticate user");

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, userId));

  if (!user) throw new Error("User not found in database");

  try {
    const result = await db.transaction(async (trans) => {
      const [team] = await trans
        .insert(teamsTable)
        .values({
          name,
          description,
          avatarUrl,
          ownerUserId: user.id,
          isActive: true,
        })
        .returning();

      await trans.insert(teamMembersTable).values({
        teamId: team.id,
        userId: user.id,
        role: "owner",
      });

      return team;
    });

    return result;
  } catch (err: any) {
    // Postgres unique violation
    const pgCode = err?.code ?? err?.cause?.code;
    const constraint = err?.constraint ?? err?.cause?.constraint;
    if ( pgCode === "23505"  && constraint === "uniq_teams_name_lower") {
      // Team name taken
      throw new Error("That team name is already taken. Try a different name.");
    }
     console.error("createTeam failed:", err);
    throw new Error("Could not create team. Please try again.");
  }
}