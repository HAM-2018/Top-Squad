import { Button } from "@/components/ui/button";
import { TrophyIcon } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
    return (
        <>
            <h1 className="flex gap-2 items-center">
                <TrophyIcon size={50} className="text-yellow-600" />
                Top-Squad
            </h1>
            <p>
                Does your team have what it takes?
            </p>
            <div className="flex gap-2 items-center">
            <Button asChild>
                <Link href="/login">Login</Link>
            </Button>
            <small>or</small>
            <Button variant="outline" asChild>
                <Link href="/sign-up">Sign-up</Link>
            </Button>
            </div>
        </>
    )
}