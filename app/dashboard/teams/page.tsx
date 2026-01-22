import ShowTeams from "./showTeams";
import { getTeams } from "@/db/queries/getTeams";
import { getTeamMembers } from "@/db/queries/getTeamMembers";
import ShowTeams2 from "./updated.show.teams";

export default async function TeamsPage() {
  const teams = await getTeams();

  // default selected team = first team
  const initialTeamId = teams[0]?.id ?? null;
  const initialMembers = initialTeamId ? await getTeamMembers(initialTeamId) : [];

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Teams</h1>
        <p className="text-sm text-muted-foreground">
          View your teams and teammates.
        </p>
      </div>
      <ShowTeams2 teams={teams} initialTeamId={initialTeamId} initialMembers={initialMembers}/>
    </div>
  );
}
