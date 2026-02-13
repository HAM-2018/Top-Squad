"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUser } from "@clerk/nextjs";
import { useState } from "react";

const DASHBOARD_DEMO_KEY = "showDemoOnDashboard";
export default function DemoDisclaimer() {
  const { isLoaded, isSignedIn } = useUser();
  const [showDemo, setShowDemo] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(DASHBOARD_DEMO_KEY) === "true";
  });

  const open = isLoaded && isSignedIn && showDemo;

  const CloseDemo = () => {
    sessionStorage.removeItem(DASHBOARD_DEMO_KEY);
    setShowDemo(false);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && CloseDemo()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Demo Preview</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3">
              <div>
                You are viewing a <strong>demo version of Top-Squad</strong>
              </div>
              <div>
                Some features are still in development, all data has been
                simulated.
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
          <Button onClick={CloseDemo}>Okay</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
