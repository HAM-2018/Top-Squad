"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function DemoDisclaimer() {
    const {isLoaded, isSignedIn} = useUser();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!isLoaded) return;
        setOpen(isSignedIn);
    }, [isLoaded, isSignedIn]);

    if (!isLoaded || !isSignedIn) return null;

    return (
        <Dialog open={open} onOpenChange={setOpen} >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Demo Preview</DialogTitle>
                    <DialogDescription asChild>
                        <div className="space-y-3">
                            <div>
                                You are viewing a <strong>demo version of Top-Squad</strong>
                            </div>
                            <div>
                                Some features are still in development, all data has been simulated.
                            </div>
                            <div className="font-medium">Coming soon:</div>
                            <ul className="list-disc pl-4">
                                <li>More challenge options</li>
                                <li>Expanded Invite functionality</li>
                                <li>Performance and UI Improvements</li>
                                <li>Share pictures of your workouts with friends</li>
                            </ul>
                        </div>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button onClick={() => setOpen(false)}>Okay</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}