"use client";

import { useUser } from "@clerk/nextjs";

export default function Welcome() {
  const { user } = useUser();

  return (
    <h1 className="pb-4">
      Welcome,{" "}
      {user?.firstName || user?.emailAddresses?.[0]?.emailAddress || "User"}
    </h1>
  );
}