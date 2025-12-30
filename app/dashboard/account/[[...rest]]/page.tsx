import { syncUserAvatar } from "@/db/mutations/syncUserAvatars";
import { UserProfile } from "@clerk/nextjs";

export default async function AccountPage() {
  await syncUserAvatar();
  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="text-sm text-muted-foreground">
          Update your profile info and avatar.
        </p>
      </div>

      <div className="flex justify-center md:justify-start">
        <UserProfile
          appearance={{
            elements: {
              card: "w-full max-w-3xl",
            },
          }}
        />
      </div>
    </div>
  );
}
