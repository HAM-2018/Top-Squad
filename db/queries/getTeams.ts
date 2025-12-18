"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "..";
import { teamMembersTable, teamsTable, usersTable } from "../schema";
import { and, eq } from "drizzle-orm";
import { TeamList } from "@/types/teams";


export async function getTeams(): Promise<TeamList[]> {
  const { userId } = await auth();

  if (!userId) throw new Error("Not authenticated");

  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.clerkId, userId));

  if (!user) throw new Error("User not found in database");

  

  const teams = await db
    .select({
      id: teamsTable.id,
      name: teamsTable.name,
      description: teamsTable.description,
      ownerUserId: teamsTable.ownerUserId,
      isActive: teamsTable.isActive,
      avatarUrl: teamsTable.avatarUrl
    })
    .from(teamMembersTable)
    .innerJoin(teamsTable, eq(teamMembersTable.teamId, teamsTable.id))
    .where(and(eq(teamMembersTable.userId, user.id), eq(teamsTable.isActive, true)));

  const map = new Map<number, TeamList>();
  for (const team of teams) map.set(team.id, team);

  return [...map.values()];
};

    