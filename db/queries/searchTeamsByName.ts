"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { teamsTable } from "@/db/schema";
import { ilike, and, eq } from "drizzle-orm";

export async function searchTeamsByName(query: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const search = query.trim();
  if (!search) return [];

  const rows = await db
    .select({
      id: teamsTable.id,
      name: teamsTable.name,
      avatarUrl: teamsTable.avatarUrl,
    })
    .from(teamsTable)
    .where(and(eq(teamsTable.isActive, true), ilike(teamsTable.name, `%${search}%`)))
    .limit(10);

  return rows;
}
