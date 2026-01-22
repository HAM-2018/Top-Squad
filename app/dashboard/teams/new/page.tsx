import CreateTeamCard from "../createTeam";

export default function NewTeamPage() {
    return (
        <div className="p-4 space-y-4">
            <div>
                <h1 className="text-2xl font-semibold">
                    Create Team
                </h1>
                <p className="text-muted-foreground">
                    Create a new team and upload a team picture
                </p>
            </div>
            <CreateTeamCard />
        </div>
    )
}