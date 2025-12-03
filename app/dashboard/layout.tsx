"use client";

import MainMenu from "@/main-menu/main-menu";
import { RedirectToSignIn, useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation";

export default function DashboardLayout({children}: {children: React.ReactNode}) {
    const {user, isLoaded, isSignedIn} = useUser();
    const router = useRouter();

    if (!isLoaded) return null;

    if (!isSignedIn) {
        router.push("/login");
    }

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