import { auth } from "@clerk/nextjs/server";
import NewChallengeForm from "./newChallengeForm";
import { db } from "@/db";
import { teamMembersTable, teamsTable, usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function ChallengesPage() {

  const { userId } = await auth();

  if (!userId) {
    throw new Error("Not authenticated");
  }

   const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, userId));

    if (!user) {
    throw new Error("User record not found");
  }


  const teams = await db
  .select({
    id: teamsTable.id,
    name: teamsTable.name,
  })
  .from(teamMembersTable)
  .innerJoin(teamsTable, eq(teamMembersTable.teamId, teamsTable.id))
  .where(eq(teamMembersTable.userId, user.id))

  return (
    <NewChallengeForm teams={teams} />
  );
}
