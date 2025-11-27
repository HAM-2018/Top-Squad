"use client"
import { MoonIcon, SunIcon } from "lucide-react"
import { Button } from "./button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip"
import { useTheme } from "next-themes";

export function LightDarkToggle({
    className
}: {
    className?: string;
}) {

    const {setTheme, resolvedTheme} = useTheme();
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild className={className} onClick={() => {
                    setTheme(resolvedTheme === "light" ? "dark" : "light");
                }}>
                    <Button variant="outline">
                    <SunIcon className="block dark:hidden" />
                    <MoonIcon className="hidden dark:block" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <span className="hidden dark:inline">Enable light mode</span>
                    <span className="inline dark:hidden">Enable dark mode</span>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}