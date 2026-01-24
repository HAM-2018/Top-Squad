"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { inviteUserToTeam } from "@/db/mutations/inviteUserToTeam";
import { respondToTeamInvite } from "@/db/mutations/respondToTeamInvite";

type TeamHeader = {
  id: number;
  name: string;
  avatarUrl: string | null;
};

type TeamInviteRow = {
  inviteId: number;
  invitedEmail: string;
  status: "pending" | "accepted" | "declined" | "revoked";
  createdAt: Date | null;
};

type MyInviteRow = {
  inviteId: number;
  teamId: number;
  teamName: string;
  invitedByName: string | null;
  createdAt: Date | null;
};

export default function TeamInvites({
  team,
  teamInvites,
  myInvites,
}: {
  team: TeamHeader;
  teamInvites: TeamInviteRow[];
  myInvites: MyInviteRow[];
}) {
  const [pending, startTransition] = useTransition();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<TeamInviteRow[]>(teamInvites);
  const [mine, setMine] = useState<MyInviteRow[]>(myInvites);

  function send() {
    const v = email.trim();
    if (!v) return toast.error("Enter an email.");

    startTransition(async () => {
    try {
      await inviteUserToTeam({
        teamId: team.id,
        invitedEmail: v,
        // No first name and last name in UI right now
      });

      toast.success("Invite sent.");
      setEmail("");

      setSent((prev) => [
        {
          inviteId: Date.now(),
          invitedEmail: v.trim().toLowerCase(),
          status: "pending",
          createdAt: new Date(),
        },
        ...prev,
      ]);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send invite.");
    }
  });

  }

  function respond(inviteId: number, action: "accept" | "decline") {
    startTransition(async () => {
      try {
        await respondToTeamInvite(inviteId, action);
        setMine((prev) => prev.filter((i) => i.inviteId !== inviteId));
        toast.success(action === "accept" ? "Invite accepted." : "Invite declined.");
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to respond.");
      }
    });
  }

  return (
    <div className="space-y-6 mx-auto max-w-5xl w-full">
      {/* SEND INVITE */}
      <Card className="border border-rose-500/40">
        <CardHeader className="pb-2 border-b border-rose-500">
          <CardTitle className="text-2xl">Invite to Team</CardTitle>
          <div className="text-muted-foreground text-sm">
            Invite a user to <span className="font-medium text-foreground">{team.name}</span> by email.
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Email</p>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@email.com"
              disabled={pending}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground truncate">
              {email.trim() ? `Invite: ${email.trim()}` : "Enter an email to invite."}
            </div>
            <Button onClick={send} disabled={pending || !email.trim()}>
              {pending ? "Working..." : "Send Invite"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Note: only team owner/admin can successfully invite.
          </p>

          <Separator />

          {/* SENT INVITES LIST */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Invites Sent</div>
            {sent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invites for this team.</p>
            ) : (
              <div className="space-y-2">
                {sent.map((i) => (
                  <div key={i.inviteId} className="rounded-md border p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{i.invitedEmail}</div>
                      <div className="text-xs text-muted-foreground mt-1">Status: {i.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* MY INVITES */}
      <Card>
        <CardHeader className="pb-2 border-b border-rose-500">
          <CardTitle className="text-xl">Your Team Invites</CardTitle>
        </CardHeader>

        <CardContent className="pt-4">
          {mine.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending invites.</p>
          ) : (
            <div className="space-y-3">
              {mine.map((inv) => (
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
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => respond(inv.inviteId, "decline")}>
                        Decline
                      </Button>
                      <Button size="sm" disabled={pending} onClick={() => respond(inv.inviteId, "accept")}>
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
