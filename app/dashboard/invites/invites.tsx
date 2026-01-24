"use client";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { inviteTeamToChallenge } from "@/db/mutations/inviteTeamToChallenge";
import { respondToChallengeInvite } from "@/db/mutations/respondToChallengeInvite";
import { respondToTeamInvite } from "@/db/mutations/respondToTeamInvite"; 
import { searchTeamsByName } from "@/db/queries/searchTeamsByName";
import type { ChallengeWithParts } from "@/types/individualchallengeStats";
import type { Team, TeamList } from "@/types/teams";
import { ChallengeInvite, PendingTeamInvite } from "@/types/teamInvites";


export default function Invites({
  initialChallenges,
  initialInvites,
  initialTeamInvites,
  teams,
}: {
  initialChallenges: ChallengeWithParts[];
  initialInvites: ChallengeInvite[];
  initialTeamInvites: PendingTeamInvite[]; 
  teams: TeamList[];
}) {
  const [pending, startTransition] = useTransition();

  const [selectedHostTeamId, setSelectedHostTeamId] = useState<string>("");
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>("");

  const [teamQuery, setTeamQuery] = useState("");
  const [teamResults, setTeamResults] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  // Challenge invites list 
  const [invites, setInvites] = useState<ChallengeInvite[]>(initialInvites);

  // Team invites list 
  const [teamInvites, setTeamInvites] = useState<PendingTeamInvite[]>(
    initialTeamInvites
  );

  const selectedHostTeam = useMemo(() => {
    const id = Number(selectedHostTeamId);
    if (!id) return null;
    return teams.find((t) => t.id === id) ?? null;
  }, [selectedHostTeamId, teams]);

  const teamChallenges = useMemo(() => {
    const hostId = Number(selectedHostTeamId);
    if (!hostId) return [];
    return initialChallenges.filter((c) => c.isTeamBased && c.groupId === hostId);
  }, [initialChallenges, selectedHostTeamId]);

  const selectedTeam = useMemo(
    () => teamResults.find((t) => t.id === selectedTeamId) ?? null,
    [teamResults, selectedTeamId]
  );

  const selectedChallenge = useMemo(() => {
    const id = Number(selectedChallengeId);
    if (!id) return null;
    return teamChallenges.find((c) => c.challengeId === id) ?? null;
  }, [selectedChallengeId, teamChallenges]);

  async function onSearchChange(val: string) {
    setTeamQuery(val);
    setSelectedTeamId(null);

    const q = val.trim();
    if (q.length < 2) {
      setTeamResults([]);
      return;
    }

    try {
      const rows = await searchTeamsByName(q);
      setTeamResults(rows);
    } catch (e: any) {
      toast.error(e?.message ?? "Team search failed.");
    }
  }

  function sendInvite() {
    if (!selectedHostTeamId) return toast.error("Select your team first.");
    if (!selectedChallengeId) return toast.error("Select a challenge first.");
    if (!selectedTeamId) return toast.error("Select a team to invite.");

    startTransition(async () => {
      try {
        await inviteTeamToChallenge(Number(selectedChallengeId), selectedTeamId);
        toast.success(`Invite sent to ${selectedTeam?.name ?? "team"}.`);

        setTeamQuery("");
        setTeamResults([]);
        setSelectedTeamId(null);
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to send invite.");
      }
    });
  }

  function respondChallengeInvite(inviteId: number, action: "accept" | "decline") {
    startTransition(async () => {
      try {
        await respondToChallengeInvite(inviteId, action);
        setInvites((prev) => prev.filter((i) => i.inviteId !== inviteId));
        toast.success(action === "accept" ? "Invite accepted." : "Invite declined.");
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to respond.");
      }
    });
  }

  //Respond to TEAM invite 
  function respondTeamInvite(inviteId: number, action: "accept" | "decline") {
    startTransition(async () => {
      try {
        await respondToTeamInvite(inviteId, action);
        setTeamInvites((prev) => prev.filter((i) => i.inviteId !== inviteId));
        toast.success(action === "accept" ? "Invite accepted." : "Invite declined.");
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to respond.");
      }
    });
  }

  return (
    <div className="space-y-6 mx-auto max-w-5xl w-full">
      {/* INVITE A TEAM INTO A CHALLENGE */}
      <Card className="border border-rose-500/40">
        <CardHeader className="pb-2 border-b border-rose-500">
          <CardTitle className="text-2xl">Invite a Team</CardTitle>
          <div className="text-muted-foreground text-sm">
            Team Challenge? Invite other teams to join an existing challenge.
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Your Team</p>
                <Select
                  value={selectedHostTeamId}
                  onValueChange={(val) => {
                    setSelectedHostTeamId(val);
                    setSelectedChallengeId("");
                    setTeamQuery("");
                    setTeamResults([]);
                    setSelectedTeamId(null);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select one of your teams" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Team Challenge</p>
                <Select
                  value={selectedChallengeId}
                  onValueChange={setSelectedChallengeId}
                  disabled={!selectedHostTeamId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        selectedHostTeamId
                          ? "Select a team challenge"
                          : "Select your team first"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {teamChallenges.map((c) => (
                      <SelectItem key={c.challengeId} value={String(c.challengeId)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedHostTeamId && teamChallenges.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No team-based challenges found for this team.
                  </p>
                ) : null}
                {selectedChallenge ? (
                  <p className="text-xs text-muted-foreground">
                    Inviting into:{" "}
                    <span className="font-medium">{selectedChallenge.name}</span>
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex justify-end">
              <div className="rounded-lg border overflow-hidden bg-muted w-45 h-45">
                {selectedHostTeam ? (
                  selectedHostTeam.avatarUrl ? (
                    <img
                      src={selectedHostTeam.avatarUrl}
                      alt={selectedHostTeam.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-5xl font-bold text-muted-foreground">
                        {selectedHostTeam.name
                          .split(" ")
                          .filter(Boolean)
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    </div>
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-sm text-muted-foreground">Select a team</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Search Team to Invite</p>
            <Input
              value={teamQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by team name..."
              disabled={!selectedChallengeId}
            />
            {teamResults.length > 0 ? (
              <div className="rounded-md border p-2 space-y-1 max-h-52 overflow-auto">
                {teamResults.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTeamId(t.id)}
                    className={[
                      "w-full text-left rounded-md px-2 py-1 text-sm",
                      selectedTeamId === t.id ? "bg-muted" : "hover:bg-muted/60",
                    ].join(" ")}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            ) : teamQuery.trim().length >= 2 ? (
              <p className="text-xs text-muted-foreground">No teams found.</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {selectedChallengeId
                  ? "Type at least 2 characters."
                  : "Select a challenge to invite a team."}
              </p>
            )}
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground truncate">
              {selectedTeam ? (
                <>
                  Selected team:{" "}
                  <span className="font-medium text-foreground">{selectedTeam.name}</span>
                </>
              ) : (
                "Select a team to invite."
              )}
            </div>
            <Button
              onClick={sendInvite}
              disabled={pending || !selectedHostTeamId || !selectedChallengeId || !selectedTeamId}
            >
              {pending ? "Working..." : "Send Invite"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Note: you can only successfully invite if you’re a host-team admin/owner.
          </p>
        </CardContent>
      </Card>

      {/* TEAM INVITES */}
      <Card>
        <CardHeader className="pb-2 border-b border-rose-500">
          <CardTitle className="text-xl">Your Team Invites</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {teamInvites.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending invites to join a new team.</p>
          ) : (
            <div className="space-y-3">
              {teamInvites.map((inv) => (
                <div key={inv.inviteId} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{inv.teamName}</div>
                      {inv.invitedByName ? (
                        <div className="text-xs text-muted-foreground mt-1">
                          Invited by <span className="font-medium">{inv.invitedByName}</span>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => respondTeamInvite(inv.inviteId, "decline")}
                      >
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        disabled={pending}
                        onClick={() => respondTeamInvite(inv.inviteId, "accept")}
                      >
                        Accept
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {/*CHALLENGE TEAM INVITES */}
      <Card>
        <CardHeader className="pb-2 border-b border-rose-500">
          <CardTitle className="text-xl">Challenge Invites</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {invites.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No pending invites for your teams.
            </p>
          ) : (
            <div className="space-y-3">
              {invites.map((inv) => (
                <div key={inv.inviteId} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{inv.challengeName}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Invited team: <span className="font-medium">{inv.teamName}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => respondChallengeInvite(inv.inviteId, "decline")}
                      >
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        disabled={pending}
                        onClick={() => respondChallengeInvite(inv.inviteId, "accept")}
                      >
                        Accept
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
