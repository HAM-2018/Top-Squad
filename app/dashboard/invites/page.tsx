import { getInvitesForMyTeamChallenges } from "@/db/queries/getInvitesForTeamChallenges";
import { getTeamChallengesForUser } from "@/db/queries/getTeamChallengesWithParts";
import Invites from "./invites";
import { getTeams } from "@/db/queries/getTeams";
import { getCurrentUser } from "@/db/queries/getCurrentUser";
import { getMyPendingTeamInvites } from "@/db/queries/getUserPendingTeamInvites";

export default async function InvitesPage() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const [challenge, challengeInvites, teamInvites, teams] = await Promise.all([
    getTeamChallengesForUser(user.id),
    getInvitesForMyTeamChallenges(),
    getMyPendingTeamInvites(),       
    getTeams(),
  ]);

  return (
    <Invites
      initialChallenges={challenge}
      initialInvites={challengeInvites}  
      initialTeamInvites={teamInvites}        
      teams={teams}
    />
  );
}
