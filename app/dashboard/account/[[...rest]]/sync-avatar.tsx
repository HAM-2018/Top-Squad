"use client";

import { useEffect, useRef, useTransition } from "react";
import { useUser } from "@clerk/nextjs";
import { syncUserAvatar } from "@/db/mutations/syncUserAvatars";

export default function SyncAvatar() {
    const {user, isLoaded, isSignedIn } = useUser();
    const lastSyncedUrl = useRef<string | null>(null);
    const [, startTransition] = useTransition();

    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;

        const url = user?.imageUrl ?? null;
        if(!url) return;

        if (lastSyncedUrl.current === url) return;
        
        lastSyncedUrl.current = url;

        startTransition(() => {
      syncUserAvatar();
    });
  }, [isLoaded, isSignedIn, user?.imageUrl, startTransition]);

  return null;
}