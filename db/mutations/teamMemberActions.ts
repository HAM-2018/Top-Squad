"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "..";
import { teamMembersTable, usersTable } from "../schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function getCurrentUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.clerkId, userId));

  if (!user) throw new Error("User not found in database");
  return user.id;
}

async function getMyRole(teamId: number, myUserId: number) {
  const [me] = await db
    .select({ role: teamMembersTable.role })
    .from(teamMembersTable)
    .where(and(eq(teamMembersTable.teamId, teamId), eq(teamMembersTable.userId, myUserId)));

  if (!me) throw new Error("Not a member of this team");
  return me.role;
}

async function getTargetRole(teamId: number, targetUserId: number) {
  const [target] = await db
    .select({ role: teamMembersTable.role })
    .from(teamMembersTable)
    .where(and(eq(teamMembersTable.teamId, teamId), eq(teamMembersTable.userId, targetUserId)));

  if (!target) throw new Error("Target user is not on this team");
  return target.role;
}

// Admins + Owner can promote members to admin
export async function makeAdmin(teamId: number, targetUserId: number) {
  const myUserId = await getCurrentUserId();
  const myRole = await getMyRole(teamId, myUserId);

  if (myRole !== "owner" && myRole !== "admin") {
    return {ok: false, error: "Not authorized"};
  }

  const targetRole = await getTargetRole(teamId, targetUserId);
  if (targetRole === "owner") {
    return {ok: false, error: "Already owner"};
  }

  if (targetRole === "admin") {
    return {ok: false, error: "Member is already an admin"};
  }

  await db
    .update(teamMembersTable)
    .set({ role: "admin" })
    .where(and(eq(teamMembersTable.teamId, teamId), eq(teamMembersTable.userId, targetUserId)));

    return {ok: true};
}

// Admins + Owner can kick members except owner
export async function kickMember(teamId: number, targetUserId: number) {
  const myUserId = await getCurrentUserId();
  const myRole = await getMyRole(teamId, myUserId);

  if (myRole !== "owner" && myRole !== "admin") {
    return {ok: false, error: "Not authorized"};
  }

  const targetRole = await getTargetRole(teamId, targetUserId);
  if (targetRole === "owner") {
    return {ok: false, error: "You can not kick the owner"};
  }

  await db
    .delete(teamMembersTable)
    .where(and(eq(teamMembersTable.teamId, teamId), eq(teamMembersTable.userId, targetUserId)));

     revalidatePath("/dashboard", "layout");
     revalidatePath("/dashboard", "page");
     revalidatePath("/dashboard/teams", "page");

     return {ok: true};
}

// Only Owner can transfer ownership and becomes admin instead
export async function transferOwnership(teamId: number, targetUserId: number) {
  const myUserId = await getCurrentUserId();
  const myRole = await getMyRole(teamId, myUserId);

  if (myRole !== "owner") {
    return {ok: false, error: "Only group owner can transfer ownership"};
  }

  const targetRole = await getTargetRole(teamId, targetUserId);
  if (!targetRole) {
    return { ok: false, error: "User is not a member of this team" };
  }

  if (targetRole === "owner") {
    return { ok: false, error: "User is already the owner" };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(teamMembersTable)
      .set({ role: "owner" })
      .where(and(eq(teamMembersTable.teamId, teamId), eq(teamMembersTable.userId, targetUserId)));

    await tx
      .update(teamMembersTable)
      .set({ role: "admin" })
      .where(and(eq(teamMembersTable.teamId, teamId), eq(teamMembersTable.userId, myUserId)));
  });
  return { ok: true };

}
