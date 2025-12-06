"use client";

import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation";
import MainMenu from "./components/main-menu";
import { useEffect } from "react";

export default function DashboardLayout({children}: {children: React.ReactNode}) {
    const {user, isLoaded, isSignedIn} = useUser();
    const router = useRouter();

    useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/login");
    }
  }, [isLoaded, isSignedIn, router]);

  // while loading or redirecting, render nothing (or a spinner)
  if (!isLoaded || !isSignedIn) return null;

    return (
        <div className="grid grid-cols-[250px_1fr] h-screen">
            <MainMenu />
            <div className="overflow-auto py-2 px-4">
                <h1 className="pb-4">
                   Welcome, {" "} {user?.firstName || user?.emailAddresses?.[0]?.emailAddress} 
                </h1>
                {children}
            </div>
        </div>
    )
}