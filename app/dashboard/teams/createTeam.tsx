"use client"

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createTeam } from "@/db/mutations/createTeam";
import { UsersIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName } from "@/lib/initialsFromName";
import { Upload, X } from "lucide-react";
import CropAvatar from "@/components/cropAvatar";
import { uploadAvatar } from "@/lib/uploadAvatar";

type Props = {
    onCreate?: (teamId: number) => void;
};

export default function CreateTeamCard({ onCreate }: Props) {
    const router = useRouter();

    const [teamName, setTeamName] = useState("");
    const [teamDescription, setTeamDescription] = useState("");
    const [isPending, startTransition] = useTransition();

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);

    const [rawImageUrl, setRawImageUrl] = useState<string | null>(null);
    const [cropOpen, setCropOpen] = useState(false);


    useEffect(() => {
        if (!avatarFile) {
            setAvatarPreviewUrl(null);
            return;
        }
        const url = URL.createObjectURL(avatarFile);
        setAvatarPreviewUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [avatarFile]);

    const handleCreate = () => {
        startTransition(async () => {
            try {
                let avatarUrl: string | null = null;

                if (avatarFile) {
                    avatarUrl = await uploadAvatar(avatarFile);
                }

                const created = await createTeam({
                    name: teamName,
                    description: teamDescription,
                    avatarUrl,
                });

                toast.success("Team Created");

                setTeamName("");
                setTeamDescription("");
                setAvatarFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
                onCreate?.(created.id);

                router.refresh();
            } catch (error: any) {
                toast.error(error?.message ?? "Failed to create team");
            }
        });
    };

    return (
        <Card>
            <CardHeader className="py-0">
                <CardTitle className="text-xl flex items-center justify-between border-b border-rose-500">
                    Create a new Team <UsersIcon />
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
                <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="teamName"> Team Name</Label>
                            <Input 
                            id="teamName"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            disabled={isPending}
                            maxLength={100} 
                            />
                            <p className="text-xs text-muted-foreground">
                                Team name must be available
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="teamDescription"> Description</Label>
                            <Textarea 
                            id="teamDescription"
                            value={teamDescription}
                            onChange={(e) => setTeamDescription(e.target.value)}
                            placeholder="What is this Team about?"
                            disabled={isPending}
                            rows={4}
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2">
                            <Button 
                            onClick={() => {
                                setTeamName("");
                                setTeamDescription("");
                                setAvatarFile(null);
                                if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                            disabled={isPending || (!teamName && !teamDescription && !avatarFile)}
                            >
                                Clear
                            </Button>
                            <Button 
                            onClick={handleCreate}
                            disabled={isPending || teamName.trim().length === 0}
                            >
                                Create
                            </Button>
                        </div>
                    </div>
                    {/* AVATAR */}
                    <div className="rounded-lg border p-4 space-y-4 h-fit">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">
                                Team Avatar
                            </div>
                            {avatarFile ? (
                                <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setAvatarFile(null);
                                    if (fileInputRef.current) fileInputRef.current.value = "";
                                }}
                                disabled={isPending}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            ) : null}
                        </div>

                        <div className="flex items-center gap-3">
                            <Avatar className="h-24 w-24 border bg-background shrink-0">
                                {avatarPreviewUrl ? (
                                    <AvatarImage src={avatarPreviewUrl} alt={teamName || "Team"} />
                                ) : (
                                    <AvatarFallback className="text-lg font-semibold">
                                        {initialsFromName(teamName || "Team")}
                                    </AvatarFallback>
                                )}
                            </Avatar>
                            
                            <div className="min-w-0">
                                <div className="text-sm font-medium truncate">
                                    {avatarFile ? avatarFile.name : "No image selected"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    PNG/JPG/WebP up to 5MB
                                </div>
                            </div>
                        </div>
                        <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            if (!file.type.startsWith("image/")) {
                                toast.error("Please choose an image file");
                                e.target.value = "";
                                return;
                            }
                            const url = URL.createObjectURL(file);
                            setRawImageUrl(url);
                            setCropOpen(true);
                        }}
                        disabled={isPending}
                        />
                        <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isPending}
                        className="w-full"
                        variant="secondary"
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload team pic
                        </Button>
                    </div>
                </div>
            </CardContent>
            {rawImageUrl && (
            <CropAvatar
                open={cropOpen}
                imageUrl={rawImageUrl}
                onCancel={() => {
                setCropOpen(false);
                URL.revokeObjectURL(rawImageUrl);
                setRawImageUrl(null);
                }}
                onSave={(blob) => {
                const file = new File([blob], "team-avatar.png", {
                    type: "image/png",
                });
                setAvatarFile(file);
                setCropOpen(false);
                URL.revokeObjectURL(rawImageUrl);
                setRawImageUrl(null);
                }}
            />
            )}
        </Card>
    );
}
