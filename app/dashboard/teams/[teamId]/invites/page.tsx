import { getTeamPendingInvites } from "@/db/queries/getTeamPendingInvites";
import { getTeams } from "@/db/queries/getTeams";
import { getMyPendingTeamInvites } from "@/db/queries/getUserPendingTeamInvites";
import TeamInvites from "./team.invites";


export default async function TeamInvitesPage({
    params,
}:{
    params: Promise<{ teamId: string}>;
}) {
    const { teamId } = await params;
    const id = Number(teamId);

    const teams = await getTeams();
    const team = teams.find((t) => t.id === id) ?? null;
    if (!team) {
        return (
            <div>Team not found</div>
        )
    }

    const [teamInvites, myInvites] = await Promise.all([
        getTeamPendingInvites(id),
        getMyPendingTeamInvites(),
    ]);

    return (
        <div className="p-6">
            <TeamInvites team={team} myInvites={myInvites} teamInvites={teamInvites} />
        </div>
    )
}