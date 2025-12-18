"use client";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { makeAdmin, kickMember, transferOwnership } from "@/db/mutations/teamMemberActions";
import { TeamMember } from "@/types/teams";
import {  PencilIcon, TrashIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

export default function TeamMemberDropdown({
    teamId,
    member,
    onChange,
    showTooltip = true,
}:{
    teamId: number,
    member: TeamMember,
    onChange: () => Promise<void> | void;
    showTooltip?: boolean,
}) {
    const [isPending, makeTransition] = useTransition();

    const router= useRouter();

    const owner = member.role ==="owner";
    const admin = member.role === "admin";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" disabled={isPending}>
                    <PencilIcon  />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem disabled={owner || admin || isPending}
                onClick={() => 
                    makeTransition(async () => {
                        const result = await makeAdmin(teamId, member.userId);
                        if (!result.ok) {
                            toast.error("Not authorized");
                            return;
                        }
                        await onChange();
                        router.refresh();
                        toast.success( `${member.name} has been made an admin of this group!`);
                    })
                } 
                >
                    Make Admin
                </DropdownMenuItem>
                <DropdownMenuItem
                    disabled={owner || isPending}
                    onClick={() => {
                        makeTransition(async () => {
                        const result = await transferOwnership(teamId, member.userId);
                        if (!result.ok) {
                            toast.error("Not authorized");
                            return;
                        }
                        await onChange();
                        router.refresh();
                        toast.success(`${member.name} is now the owner of this group!`);
                        });
                    }}
                >
                    Transfer Ownership
                </DropdownMenuItem>
                <DropdownMenuItem
                className="text-red-500 flex items-center justify-between gap-2"  
                disabled={owner || isPending}
                onClick={() => 
                makeTransition(async () => {
                    const result = await kickMember(teamId, member.userId);
                    if (!result.ok) {
                        toast.error("Not authorized",);
                        return;
                    }
                    await onChange();
                    router.refresh();
                    toast.success(`${member.name} was removed from the group`);
                })
                } 
                >
                    <span> Kick Member</span>
                    <TrashIcon className="text-red-500" />
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}