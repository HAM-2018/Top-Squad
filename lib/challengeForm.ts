import { ChallengeWithParts } from "@/types/individualchallengeStats";
import { format } from "date-fns";

export type ChallengeStatus = "live" | "upcoming" | "completed";

export function getChallengeStatus(
  challenge: ChallengeWithParts,
): ChallengeStatus {
  const now = new Date();

  if (!challenge.challengeIsActive || !challenge.teamChallengeIsActive) {
    return "completed";
  }

  if (!challenge.startDate || !challenge.endDate) {
    return "live";
  }

  if (challenge.endDate < now) return "completed";
  if (challenge.startDate > now) return "upcoming";
  return "live";
}

export function formatChallengeDateRange(
  startDate: Date | null,
  endDate: Date | null,
) {
  if (!startDate && !endDate) return "No schedule";
  if (startDate && endDate) {
    return `${format(startDate, "MMM d, yyyy")} - ${format(endDate, "MMM d, yyyy")}`;
  }
  if (startDate) return `Starts ${format(startDate, "MMM d, yyyy")}`;
  return `Ends ${format(endDate!, "MMM d, yyyy")}`;
}
