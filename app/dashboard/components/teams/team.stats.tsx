import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { HandshakeIcon, MedalIcon, PartyPopperIcon, TimerIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import hs from '@/public/images/thailand.jpg';
import Image from "next/image";

export default function TeamChallenges() {
    
    // Ranking logic, REVISIT 
    const totalCompetitors = 80;
    const ranking = 3;
    const rankingPercentage = Math.round((ranking / totalCompetitors) * 100);

    return (
        <>
        <div className="grid lg:grid-cols-3 gap-4">
            <Card>
                <CardHeader className="py-0">
                    <CardTitle className="text-xl flex items-center justify-between border-b border-rose-500 pb-1">
                        Team Performance <HandshakeIcon size={40} />
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            
                            <span className="text-2xl font-bold">Ranking: 3rd</span>
                        </div>
                    </div>
                    <div>
                        <span className="text-2xl font-bold">Score: 12:32</span>
                    </div>
  
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="py-0">
                    <CardTitle className="text-xl flex items-center justify-between border-b border-rose-500 pb-1">
                        Teams competing <UsersIcon size={40} />
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-between">
                    
                </CardContent>
               
            </Card>
            <Card className="border-rose-500 min-h-[180px] flex flex-col">
                <CardHeader className="py-0">
                    <CardTitle className="text-xl flex items-center justify-between border-b border-rose-500 pb-1">
                        First place Team <MedalIcon size={40} />
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex gap-2 items-center">
                    <Avatar>
                        <Image src={hs} alt="First-place avatar"/>
                        <AvatarFallback>
                            HS
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-2xl">RLTW!</span>
                </CardContent>
                <CardFooter className="flex gap-2 items-center text-xs text-muted-foreground mt-auto">
                    <PartyPopperIcon className="text-rose-500" />
                    <span>Keep up the good work!</span>
                </CardFooter>
            </Card>
        </div>
        <Card className="my-4">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TimerIcon />
                    <span>Current Team scores</span>   
                </CardTitle>
            </CardHeader>
            <CardContent className="pl-0">
                Line Graph 
            </CardContent>
        </Card>
        </>
    )
}