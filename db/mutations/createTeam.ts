"use server";

import { eq } from "drizzle-orm";
import { teamMembersTable, teamsTable, usersTable } from "../schema";
import { db } from "..";
import { auth } from "@clerk/nextjs/server";
import { type CreateTeam, createTeamSchema } from "@/validation/createTeamSchema";


export async function createTeam(input: CreateTeam) {
    const {name, description } = createTeamSchema.parse(input);

    const {userId} = await auth();

    if (!userId) throw new Error("Could not authenticate user");

    const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, userId));

    if (!user) {
        throw new Error("User not found in database");
    }

    const result = await db.transaction(async (trans) => {
        const [team] = await trans.insert(teamsTable)
        .values({
            name,
            description,
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
}