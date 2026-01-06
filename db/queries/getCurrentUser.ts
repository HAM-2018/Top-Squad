import { db } from "@/db";
import { usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createOrUpdateUser } from "@/db/mutations/createUser";

export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const [me] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
  if (me) return me;

  // Create row if missing
  const u = await (await clerkClient()).users.getUser(userId);
  const email =
    u.emailAddresses.find(e => e.id === u.primaryEmailAddressId)?.emailAddress ??
    u.emailAddresses[0]?.emailAddress ?? "";

  await createOrUpdateUser({
    clerkId: userId,
    email,
    firstName: u.firstName ?? null,
    lastName: u.lastName ?? null,
    avatarUrl: u.imageUrl ?? null,
  });

  const [created] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
  if (!created) throw new Error("Failed to create user row");

  return created;
}
