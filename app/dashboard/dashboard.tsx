"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import IndividualChallenges from "./components/personal/personal-stats";
import TeamChallenges from "./components/teams/team.stats";
import { createOrUpdateUser } from "@/db/mutations/createUser";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { MultiPartChallengeStats } from "@/types/individualchallengeStats";
import { TeamChallengeStats } from "@/types/TeamChallengeStats";

export default function Dashboard({
  soloStats,
  teamStats,
}: {
  soloStats: MultiPartChallengeStats | null;
  teamStats: TeamChallengeStats | null;
}) {
  const { user, isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    void createOrUpdateUser({
      clerkId: user.id,
      email:
        user.primaryEmailAddress?.emailAddress ??
        user.emailAddresses[0]?.emailAddress ??
        "",
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.imageUrl,
    });
  }, [isLoaded, isSignedIn, user]);

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  return (
    <Tabs defaultValue="individual challenges">
      <TabsList className="mb-4">
        <TabsTrigger value="individual challenges">Solo challenges</TabsTrigger>
        <TabsTrigger value="team challenges">Team challenges</TabsTrigger>
      </TabsList>

      <TabsContent value="individual challenges">
        <IndividualChallenges initialStats={soloStats} />
      </TabsContent>

      <TabsContent value="team challenges">
        <TeamChallenges initialStats={teamStats} />
      </TabsContent>
    </Tabs>
  );
}
