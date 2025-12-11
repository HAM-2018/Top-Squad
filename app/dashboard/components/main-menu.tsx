import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import MenuItem from "./menu-item";
import MenuTitle from "./menu-title";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { LightDarkToggle } from "@/components/ui/light-dark-toggle";

export default function MainMenu() {

    const router = useRouter();
    const { signOut } = useAuth();

    const handleLogout = async () => {
        await signOut(() => {
        router.push("/login");
        });
    };
    const {user} = useUser();
    const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`;
    return (
        <nav className="bg-muted overflow-auto p-4 flex flex-col"> 
            <header className="border-b dark:border-b-black border-b-zinc-300 pb-4">
                <MenuTitle />
            </header>
            <div className="py-4 grow">
                <MenuItem href="/dashboard">
                    My dashboard
                </MenuItem>
                <MenuItem href="/dashboard/teams">
                    Teams
                </MenuItem>
                <MenuItem href="/dashboard/challenges">
                    Challenges
                </MenuItem>
                <MenuItem href="/dashboard/account">
                    Account
                </MenuItem>
                <MenuItem href="/dashboard/settings">
                    Settings
                </MenuItem>
            </div>
            <footer className="flex gap-2 items-center">
                <Avatar>
                    <AvatarFallback className="bg-rose-300 dark:bg-rose-600">
                        {initials}
                    </AvatarFallback>
                </Avatar>
                <span role="button" onClick={handleLogout} className="cursor-pointer hover:underline">
                    Logout
                </span>
                <LightDarkToggle className="ml-auto" />
            </footer>
        </nav>

    )
}