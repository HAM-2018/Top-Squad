
import { redirect } from "next/navigation";
import MainMenu from "./components/main-menu";
import { auth } from "@clerk/nextjs/server";
import Welcome from "./components/welcome";

export default async function DashboardLayout({children}: {children: React.ReactNode}) {

    const {userId} = await auth();

    if (!userId) redirect("/login");

    return (
        <div className="grid grid-cols-[250px_1fr] h-screen">
            <MainMenu />
            <div className="overflow-auto py-2 px-4">
                <Welcome />
                {children}
            </div>
        </div>
    )
}