"use client";

import { Button } from "@/components/ui/button";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut(() => {
      router.push("/login");
    });
  };

  return (
    <div>
      <p className="text-muted-foreground">
        This is your simple dashboard. You&apos;re signed in with Clerk.
      </p>

      <Button
        onClick={handleLogout}
        variant="destructive"
        className="mt-4"
      >
        Sign Out
      </Button>
    </div>
  );
}

