"use client";

import { getTeamMembers } from "@/db/queries/getTeamMembers";
import { TeamList, TeamMember } from "@/types/teams";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserPlus, UsersIcon } from "lucide-react";
import { initialsFromName } from "@/lib/initialsFromName";
import TeamMemberDropdown from "./teamMemberDropdown";
import CreateTeamCard from "./createTeam";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ShowTeams({
  teams,
  initialTeamId,
  initialMembers,
}: {
  teams: TeamList[];
  initialTeamId: number | null;
  initialMembers: TeamMember[];
}) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    initialTeamId ? String(initialTeamId) : ""
  );

  // only store fetched members
  const [fetchedMembers, setFetchedMembers] = useState<TeamMember[] | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedTeam = useMemo(
    () => teams.find((t) => String(t.id) === selectedTeamId) ?? null,
    [teams, selectedTeamId]
  );

  const membersToShow = useMemo(() => {
    if (!selectedTeamId) return [];
    if (fetchedMembers !== null) return fetchedMembers;

    if (initialTeamId && selectedTeamId === String(initialTeamId)) return initialMembers;

    return [];
  }, [selectedTeamId, fetchedMembers, initialTeamId, initialMembers]);

  useEffect(() => {
    if (!selectedTeamId) {
      return;
    }

    startTransition(async () => {
      const next = await getTeamMembers(Number(selectedTeamId));
      setFetchedMembers(next);
    });
  }, [selectedTeamId]);

  return (
    <>
      {/* all teams */}
      <Card>
        <CardHeader className="py-0">
          <CardTitle className="text-xl flex items-center justify-between border-b border-rose-500 pb-1">
            My Teams <UsersIcon size={40} />
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-4 space-y-3">
          {teams.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              You&apos;re not on any teams yet.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  Select a team to view members:
                </div>

                <Select
                value={selectedTeamId}
                onValueChange={(val) => {
                    setSelectedTeamId(val);
                    setFetchedMembers(null); // reset state
                }}
                >

                  <SelectTrigger className="w-[260px]">
                    <SelectValue placeholder="Choose a team" />
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

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="rounded-lg border p-3 flex items-center gap-3"
                  >
                    <Avatar className="h-10 w-10 border bg-background shrink-0">
                      {team.avatarUrl ? (
                        <img
                          src={team.avatarUrl}
                          alt={team.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <AvatarFallback className="text-xs font-medium">
                          {initialsFromName(team.name)}
                        </AvatarFallback>
                      )}
                    </Avatar>

                    <div className="min-w-0">
                      <div className="font-semibold truncate">{team.name}</div>
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {team.description ?? "No description"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* members */}
      <Card>
        <CardHeader className="py-0">
          <CardTitle className="text-xl flex items-center justify-between border-b border-rose-500 pb-2">
            <div className="flex items-center gap-2 ">
              Team Members
              <span className="text-sm font-normal text-muted-foreground">
                {selectedTeam ? selectedTeam.name : "—"}
              </span>
            </div>

            {selectedTeamId && (
              <Button asChild size="sm" variant="secondary">
                <Link href={`/dashboard/invites`}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite
                </Link>
              </Button>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-4">
          {!selectedTeamId ? (
            <div className="text-sm text-muted-foreground">Choose a team above.</div>
          ) : isPending && membersToShow.length === 0 ? (
            <div className="text-sm text-muted-foreground">Loading members…</div>
          ) : membersToShow.length === 0 ? (
            <div className="text-sm text-muted-foreground">No members found.</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {membersToShow.map((m) => (
                <div
                  key={m.userId}
                  className="rounded-lg border p-3 flex items-center gap-3"
                >
                  <Avatar className="h-10 w-10 border bg-background">
                    {m.avatarUrl ? (
                      <img
                        src={m.avatarUrl}
                        alt={m.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <AvatarFallback className="text-xs font-medium">
                        {initialsFromName(m.name)}
                      </AvatarFallback>
                    )}
                  </Avatar>

                  <div className="min-w-0">
                    <div className="font-semibold truncate">{m.name}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                      {m.role}
                    </div>
                  </div>

                  <TeamMemberDropdown
                    teamId={Number(selectedTeamId)}
                    member={m}
                    onChange={async () => {
                      const updated = await getTeamMembers(Number(selectedTeamId));
                      setFetchedMembers(updated);
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateTeamCard
        onCreate={(newTeamId) => {
          setSelectedTeamId(String(newTeamId));
          setFetchedMembers(null);
        }}
      />
    </>
  );
}
