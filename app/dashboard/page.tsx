"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TabsContent } from "@radix-ui/react-tabs";
import IndividualChallenges from "./components/personal/personal-stats";
import { createOrUpdateUser } from "@/db/mutations/createUser";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";


  export default function DashboardPage() {
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
        <TabsTrigger value="individual challenges">
          individual challenges
        </TabsTrigger>
        <TabsTrigger value="team challenges">
          Team challenges
        </TabsTrigger>
      </TabsList>
      <TabsContent value="individual challenges">
        <IndividualChallenges/>
      </TabsContent>
      <TabsContent value="team challenges">
        team stats
      </TabsContent>
    </Tabs>
  );
}

