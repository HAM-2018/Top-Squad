import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import DashboardShell from "./layout-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  return <DashboardShell>{children}</DashboardShell>;
}
