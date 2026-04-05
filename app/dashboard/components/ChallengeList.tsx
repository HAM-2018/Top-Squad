import { formatChallengeDateRange } from "@/lib/challengeForm";
import { ChallengeWithParts } from "@/types/individualchallengeStats";

export function ChallengeList({
  challenges,
}: {
  challenges: ChallengeWithParts[];
}) {
  if (challenges.length === 0) return null;

  return (
    <div className="space-y-3">
      {challenges.slice(0, 8).map((c) => (
        <div key={c.teamChallengeId} className="rounded-md border p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="truncate font-medium">{c.name}</span>

                <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
                  {c.isTeamBased ? "Team" : "Solo"}
                </span>

                {c.groupName ? (
                  <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
                    {c.groupName}
                  </span>
                ) : null}
              </div>

              <div className="mt-1 text-xs text-muted-foreground">
                {formatChallengeDateRange(c.startDate, c.endDate)}
              </div>

              <div className="mt-1 truncate text-xs text-muted-foreground">
                {c.description}
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {c.parts.slice(0, 4).map((p) => (
                  <span
                    key={`${c.teamChallengeId}-${p.partId}`}
                    className="rounded-full border px-2 py-1 text-[10px] text-muted-foreground"
                  >
                    {p.partName} - {p.metric}
                    {p.unit ? ` ${p.unit}` : ""}
                    {p.isTeamLogOnly ? " - admin" : ""}
                  </span>
                ))}

                {c.parts.length > 4 ? (
                  <span className="rounded-full border px-2 py-1 text-[10px] text-muted-foreground">
                    +{c.parts.length - 4} more
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
