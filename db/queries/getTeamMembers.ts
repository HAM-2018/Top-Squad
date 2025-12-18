"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "..";
import { teamMembersTable, usersTable } from "../schema";
import { and, eq } from "drizzle-orm";
import { TeamMember } from "@/types/teams";


export async function getTeamMembers(teamId: number): Promise<TeamMember[]> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.clerkId, userId));

  if (!user) throw new Error("User not found in database");

  const [membership] = await db
    .select({ id: teamMembersTable.id })
    .from(teamMembersTable)
    .where(and(eq(teamMembersTable.teamId, teamId), eq(teamMembersTable.userId, user.id)));

  if (!membership) throw new Error("Not authorized to view this team");

  const members = await db
    .select({
      userId: usersTable.id,
      name: usersTable.firstName,
      avatarUrl: usersTable.avatarUrl,
      role: teamMembersTable.role,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
    })
    .from(teamMembersTable)
    .innerJoin(usersTable, eq(teamMembersTable.userId, usersTable.id))
    .where(eq(teamMembersTable.teamId, teamId));

  return members
    .map((m) => ({
      userId: m.userId,
      name: `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() || "Unknown",
      avatarUrl: m.avatarUrl,
      role: m.role,
    }))
    .sort((a, b) => (a.role === "owner" ? -1 : 1) - (b.role === "owner" ? -1 : 1));
}