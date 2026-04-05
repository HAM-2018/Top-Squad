"use client";

import { RecordableChallenge } from "@/types/recordChallenges";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { logIndividualAttempt } from "@/db/mutations/logIndividualAttempt";
import { logTeamPartScore } from "@/db/mutations/logTeamAttempt";

export default function LogScoreCard({
  soloChallenges,
  teamChallenges,
}: {
  soloChallenges: RecordableChallenge[];
  teamChallenges: RecordableChallenge[];
}) {
  const router = useRouter();

  const [mode, setMode] = useState<"solo" | "team">("solo");
  const challenges = mode === "solo" ? soloChallenges : teamChallenges;

  const [selectedTcId, setSelectedTcId] = useState<string>("");
  const selectedChallenge = useMemo(
    () =>
      challenges.find((c) => String(c.teamChallengeId) === selectedTcId) ??
      null,
    [challenges, selectedTcId],
  );
  const [selectedPartId, setSelectedPartId] = useState<string>("");
  const selectedPart = useMemo(
    () =>
      selectedChallenge?.parts.find(
        (p) => String(p.partId) === selectedPartId,
      ) ?? null,
    [selectedChallenge, selectedPartId],
  );

  const [value, setValue] = useState<string>("");

  async function onSubmit() {
    if (!selectedChallenge) return toast.error("Pick a challenge");
    if (!selectedPart) return toast.error("Pick an event");
    const v = Number(value);
    if (!Number.isFinite(v)) return toast.error("Enter a valid number");

    try {
      const payload = {
        teamChallengeId: selectedChallenge.teamChallengeId,
        partId: selectedPart.partId,
        value: v,
      };

      // team logs must enforce "admin" only
      if (selectedPart.isTeamLogOnly) {
        await logTeamPartScore(payload);
      } else {
        await logIndividualAttempt(payload);
      }

      toast.success("Score recorded");
      setValue("");
      router.refresh();
    } catch (e: any) {
      toast.error("Error", {
        description: e?.message ?? "Failed to record score",
      });
    }
  }

  return (
    <Card className="mt-6 relative w-full">
      <CardHeader className="border-b border-rose-500 pb-4">
        <div className="flex w-full justify-center">
          <CardTitle className="text-center text-2xl font-semibold">
            Record a Challenge Score
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4 p-6 pt-5 pb-5">
        <div className="flex items-center gap-2">
          <Button
            className="h-8 px-3 text-xs"
            variant={mode === "solo" ? "default" : "outline"}
            onClick={() => {
              setMode("solo");
              setSelectedTcId("");
              setSelectedPartId("");
              setValue("");
            }}
          >
            Solo challenge
          </Button>
          <Button
            className="h-8 px-3 text-xs"
            variant={mode === "team" ? "default" : "outline"}
            onClick={() => {
              setMode("team");
              setSelectedTcId("");
              setSelectedPartId("");
              setValue("");
            }}
          >
            Team challenge
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Challenge */}
          <div className="grid gap-1">
            <span className="text-xs text-muted-foreground">
              {mode === "solo" ? "Solo challenge" : "Team challenge"}
            </span>

            <Select
              value={selectedTcId}
              onValueChange={(v) => {
                setSelectedTcId(v);
                setSelectedPartId("");
              }}
            >
              <SelectTrigger className="h-10">
                <SelectValue
                  placeholder={
                    mode === "solo"
                      ? "Select solo challenge"
                      : "Select team challenge"
                  }
                />
              </SelectTrigger>

              <SelectContent>
                {challenges.map((c) => (
                  <SelectItem
                    key={c.teamChallengeId}
                    value={String(c.teamChallengeId)}
                  >
                    Team: {c.teamName} - Challenge: {c.challengeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Part */}
          <div className="grid gap-1">
            <span className="text-xs text-muted-foreground">Event</span>

            <Select
              value={selectedPartId}
              onValueChange={setSelectedPartId}
              disabled={!selectedChallenge}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select event/part" />
              </SelectTrigger>

              <SelectContent>
                {(selectedChallenge?.parts ?? []).map((p) => (
                  <SelectItem key={p.partId} value={String(p.partId)}>
                    {p.partName}
                    {p.isTeamLogOnly ? " (admin logs)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
          <div className="grid gap-1">
            <span className="text-xs text-muted-foreground">Score</span>
            <Input
              className="h-10"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Seconds / reps / etc"
              inputMode="numeric"
            />
          </div>

          <Button
            type="button"
            className="h-10 px-6"
            onClick={onSubmit}
            disabled={!selectedChallenge || !selectedPart}
          >
            Save score
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
