"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "..";
import { usersTable } from "../schema";

export async function syncUserAvatar() {
  const { userId } = await auth();
  if (!userId) return;

  const user = await currentUser();
  if (!user) return;

  await db
    .update(usersTable)
    .set({
      avatarUrl: user.imageUrl,
      updatedAt: new Date(),
    })
    .where(eq(usersTable.clerkId, userId));
}
