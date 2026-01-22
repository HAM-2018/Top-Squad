"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { makeColumns } from "./columns";
import { TeamList, TeamMember } from "@/types/teams";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { getTeamMembers } from "@/db/queries/getTeamMembers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UserPlus, UsersIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initialsFromName } from "@/lib/initialsFromName";

export default function ShowTeams2({
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
      const [, startTransition] = useTransition();

      const selectedTeam = useMemo(() => 
        teams.find((t) => String(t.id) === selectedTeamId) ?? null,
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
        // skip refetch if you already have members passed from server
        if (initialTeamId && selectedTeamId === String(initialTeamId)) {
          return;
        }
        let cancel = false;
    
        startTransition(async () => {
          const next = await getTeamMembers(Number(selectedTeamId));
          if (!cancel) setFetchedMembers(next);
        });
    
        return () => {
          cancel = true;
        };
      }, [selectedTeamId, initialTeamId, startTransition]);

      const regetMembers = useCallback (async () => {
        if (!selectedTeamId) return;
        const updated = await getTeamMembers(Number(selectedTeamId));
        setFetchedMembers(updated);
      }, [selectedTeamId]);

      // On change rebuild columns with teamId
        const tableColumns = useMemo(() => {
        const teamId = Number(selectedTeamId);
        if (!teamId) return makeColumns({ teamId: 0, onChange: regetMembers }); // safe fallback
        return makeColumns({ teamId, onChange: regetMembers });
        }, [selectedTeamId, regetMembers]); 


    return (
        <>
        <Card>
            <CardHeader>
                <CardTitle>
                    <div className="flex items-center justify-between border-b border-rose-500 pb-2">
                    <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold ">
                    Team Members:
                    </h2>
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
                    </div>

                    <div className="pt-2">
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
                </CardTitle>
            </CardHeader>
            <CardContent>
                <DataTable columns={tableColumns} data={membersToShow} />
            </CardContent>
        </Card>
        {/* all teams */}
        <Card>
            <CardHeader className="py-0">
            <CardTitle className="text-xl flex items-center justify-between border-b border-rose-500 pb-1">
                My Teams 
                <Button asChild size="sm" variant="secondary">
                <Link href="/dashboard/teams/new">
                    <UsersIcon className="h-4 w-4 mr-2" />
                    Create
                </Link>
                </Button> 
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
        </>
        
    )
}