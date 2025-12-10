
import { db } from "@/db";
import { teamsTable, teamMembersTable, usersTable } from "@/db/schema";
import { createTeam } from "@/db/mutations/createTeam";
import { eq } from "drizzle-orm";

export default async function TeamsPage() {
  // Load existing teams
  const teams = await db.select().from(teamsTable);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: "bold" }}>Teams (DB Test)</h1>

      {/* Create a test team */}
      <form
        action={async () => {
          "use server";

          await createTeam({
            name: "Test Team " + Math.floor(Math.random() * 1000),
            description: "This is a test team",
          });
        }}
      >
        <button type="submit" style={{ marginTop: 16, padding: "10px 18px" }}>
          Create Test Team
        </button>
      </form>

      <div style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600 }}>Existing Teams</h2>

        {teams.length === 0 ? (
          <p>No teams found</p>
        ) : (
          teams.map((team) => <TeamItem key={team.id} team={team} />)
        )}
      </div>
    </div>
  );
}

// COMPONENT TO DISPLAY A SINGLE TEAM + MEMBERS
async function TeamItem({ team }: { team: typeof teamsTable.$inferSelect }) {
  const members = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      role: teamMembersTable.role,
    })
    .from(teamMembersTable)
    .innerJoin(usersTable, eq(teamMembersTable.userId, usersTable.id))
    .where(eq(teamMembersTable.teamId, team.id));

  return (
    <div
      style={{
        padding: 16,
        border: "1px solid #ccc",
        borderRadius: 8,
        marginTop: 16,
      }}
    >
      <h3 style={{ fontSize: 20, fontWeight: 600 }}>{team.name}</h3>
      <p>{team.description}</p>

      <strong>Members:</strong>
      <ul>
        {members.map((m) => (
          <li key={m.id}>
            {m.email} — <em>{m.role}</em>
          </li>
        ))}
      </ul>
    </div>
  );
}
