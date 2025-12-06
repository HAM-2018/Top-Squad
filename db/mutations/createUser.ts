"use server";

import { db } from "@/db";    
import { usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";


//Create user from existing clerk user

type CreateOrUpdateUserInput = {
  clerkId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
};

export async function createOrUpdateUser(input: CreateOrUpdateUserInput) {
  const { clerkId, email, firstName, lastName, avatarUrl } = input;

  const existing = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, clerkId),
  });

  if (existing) {
    await db
      .update(usersTable)
      .set({
        email,
        firstName: firstName ?? null,
        lastName: lastName ?? null,
        avatarUrl: avatarUrl ?? null,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.clerkId, clerkId));

    return { status: "updated" as const };
  }

  await db
    .insert(usersTable)
    .values({
      clerkId,
      email,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      avatarUrl: avatarUrl ?? null,
    });

  return { status: "created" as const };
}