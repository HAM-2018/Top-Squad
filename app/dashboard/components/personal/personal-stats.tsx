import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangleIcon, BadgeCheckIcon, MedalIcon, PartyPopperIcon, TimerIcon, UserIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import hs from '@/public/images/thailand.jpg';
import Image from "next/image";
import IndividualChallengeScores from "./individual-challenge-scores";

export default function IndividualChallenges() {
    
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
                        My Performance <UserIcon size={40} />
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
                        Competitors <UsersIcon size={40} />
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-between">
                     <div className="flex-gap-2">
                        <div className="text-5xl font-bold">{totalCompetitors}</div>
                     </div>
                     <div>
                     <Button asChild size="xs">
                            <Link href="/dashboard/challenges">View All</Link>
                    </Button>
                    </div>
                </CardContent>
                <CardFooter>
                    {rankingPercentage < 50 ?
                    <span className="text-xs text-green-500 flex gap-1 items-center"> 
                        <BadgeCheckIcon />
                        You are in the top {rankingPercentage}% of all competitors
                    </span> 
                    : 
                    <span className="text-xs text-yellow-500 flex gap-1 items-center"> 
                        <AlertTriangleIcon />
                        You are in the bottom {rankingPercentage}% of all competitors
                    </span> 
                    }
                </CardFooter>
            </Card>
            <Card className="border-rose-500 min-h-[180px] flex flex-col">
                <CardHeader className="py-0">
                    <CardTitle className="text-xl flex items-center justify-between border-b border-rose-500 pb-1">
                        First place <MedalIcon size={40} />
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex gap-2 items-center">
                    <Avatar>
                        <Image src={hs} alt="First-place avatar"/>
                        <AvatarFallback>
                            HS
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-2xl">Haden Smith!</span>
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
                    <span>Current Challenge times</span>   
                </CardTitle>
            </CardHeader>
            <CardContent>
                <IndividualChallengeScores />
            </CardContent>
        </Card>
        </>
    )
}