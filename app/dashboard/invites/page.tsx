import { db } from "@/db";
import { getInvitesForMyTeams } from "@/db/queries/getInvitesForTeam";
import { getTeamChallengesForUser } from "@/db/queries/getTeamChallengesWithParts"
import { usersTable } from "@/db/schema";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import Invites from "./invites";
import { getTeams } from "@/db/queries/getTeams";

export default async function InvitesPage() {
    const {userId} = await auth();

    if(!userId) throw new Error("Unauthorized");

    const [user] = await db
    .select({id: usersTable.id})
    .from(usersTable)
    .where(eq(usersTable.clerkId, userId));

    const challenge = await getTeamChallengesForUser(user.id);

    const invites = await getInvitesForMyTeams();
    const teams = await getTeams();

    return (
        <Invites initialChallenges={challenge} initialInvites={invites} teams={teams}/>
    )
}