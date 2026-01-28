"use client";
import ChallengeForm from "./challengeForm";
import { createChallenge } from "@/db/mutations/createChallenge";
import { CreateChallenge } from "@/validation/createChallengeSchema";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ChallengeWithParts } from "@/types/individualchallengeStats";

type Team = {
  id: number;
  name: string;
};

export default function NewChallengeForm({
  teams,
  challenges,
}:{
  teams: Team[];
  challenges: ChallengeWithParts[];
}) {
  const router = useRouter();

  const handleSubmit = async (data: CreateChallenge) => {
    try {
      await createChallenge({
        name: data.name,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        isTeamBased: data.isTeamBased,
        groupId: data.groupId,
        teamId: data.teamId,
        parts: data.parts
      });

      toast.success("Success", {
        description: "Challenge created",
      });

      router.refresh();
    } catch (err: any) {
      toast.error("Error", {
        description: err?.message ?? "Failed to create challenge",
      });
    }

  };

  return (
    <ChallengeForm onSubmit={handleSubmit} teams={teams} challenges={challenges} />
  );
}
