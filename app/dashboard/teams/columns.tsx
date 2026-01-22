"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName } from "@/lib/initialsFromName";
import { Badge } from "@/components/ui/badge";
import TeamMemberDropdown from "./teamMemberDropdown";

export type TeamMember = {
  userId: number;
  name: string;
  avatarUrl: string | null;
  role: "owner" | "admin" | "member";
};

function splitName(full: string) {
    const parts = full.trim().split(/\s+/);
    return {
        first: parts[0] ?? "",
        last: parts.slice(1).join(" "),
    };
}

export function makeColumns({
  teamId,
  onChange,
}: {
  teamId: number;
  onChange: () => Promise<void> | void;
}): ColumnDef<TeamMember>[] {

  return [
  {
    accessorKey: "avatarUrl",
    header: "",
    cell: ({ row }) => {
      const m = row.original;

      return (
        <Avatar className="h-10 w-10">
          {m.avatarUrl ? (
            <AvatarImage src={m.avatarUrl} alt={m.name} />
          ) : null}
          <AvatarFallback className="text-xs">
            {initialsFromName(m.name)}
          </AvatarFallback>
        </Avatar>
      );
    },
    enableSorting: false,
  },
  {
    id: "firstName",
    accessorFn: (row) => splitName(row.name).first,
    header: "First Name",
    cell: ({ getValue }) => <div>{getValue<string>()}</div>,
  },
  {
    id: "lastName",
    accessorFn: (row) => splitName(row.name).last,
    header: "Last Name",
    cell: ({ getValue }) => <div>{getValue<string>()}</div>,
  },
  {
  accessorKey: "role",
  header: "Role",
  cell: ({ row }) => {
    switch (row.original.role) {
      case "owner":
        return <Badge className="bg-green-600">Owner</Badge>;

      case "admin":
        return (
          <Badge className="bg-blue-600 text-white">
            Admin
          </Badge>
        );

      case "member":
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Member
          </Badge>
        );

      default:
        return null;
    }
  },
},
{
  id: "actions",
  header: "",
  cell: ({ row }) => (
    <div className="flex justify-end">
      <TeamMemberDropdown
      teamId={teamId}
      member={row.original}
      onChange={onChange} 
      />
    </div>
  ),
  enableSorting: false,
},
];
}
