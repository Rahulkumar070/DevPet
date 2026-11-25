import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { DashboardFrame } from "@/components/layout/DashboardFrame";
import { XPFeedListener } from "@/components/providers/XPFeedListener";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <XPFeedListener>
      <DashboardFrame account={session.user}>{children}</DashboardFrame>
    </XPFeedListener>
  );
}
