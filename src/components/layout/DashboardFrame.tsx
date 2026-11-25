"use client";

import type { Session } from "next-auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Layers } from "lucide-react";
import { WorkspaceNav } from "@/components/dashboard/WorkspaceNav";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { levelFromXP, xpProgressInCurrentLevel } from "@/lib/utils";
import type { IGuild } from "@/types";
import { useWorkspaceUser } from "@/hooks/useWorkspaceUser";
import s from "@/components/dashboard/workspace.module.css";

const sections: Record<string, string> = {
  dashboard: "Overview", analytics: "Analytics", hatch: "Hatchery", chat: "Companion chat",
  battle: "Battle arena", guild: "Guild", settings: "Settings",
};

export function DashboardFrame({ account, children }: { account: Session["user"]; children: React.ReactNode }) {
  const [section, detail, subpage] = usePathname().split("/").filter(Boolean);
  const user = useWorkspaceUser(account.id);
  const guild = useQuery({
    queryKey: ["guild", "mine", account.id],
    queryFn: async (): Promise<{ guild: IGuild | null }> => {
      const response = await fetch("/api/guild?mine=true");
      if (!response.ok) throw new Error("Could not load guild");
      return response.json();
    },
  });
  const xp = user.data?.xp ?? account.xp;
  const level = levelFromXP(xp);
  const progress = xpProgressInCurrentLevel(xp);
  const detailLabel = detail && (section === "battle" ? "Battle details" : subpage === "settings" ? "Guild settings" : "Guild overview");

  return <div className={s.workspace} data-devpet-workspace="">
    <WorkspaceNav level={level} percent={level >= 50 ? 100 : Math.min(100, progress.percent)}
      remaining={Math.max(0, progress.needed - progress.current)} guildSlug={guild.data?.guild?.slug} />
    <main className={s.main}>
      <header className={s.topbar}>
        <nav aria-label="Breadcrumb" className={s.breadcrumb}>
          <Layers size={13} /><Link href="/dashboard">Workspace</Link><ChevronRight size={11} />
          {detailLabel ? <><Link href={`/${section}`}>{sections[section]}</Link><ChevronRight size={11} />{detailLabel}</> : sections[section]}
        </nav>
        <Link href="/settings" aria-label="Open account settings" className={s.avatar}>
          <Avatar className="size-full">
            <AvatarImage src={account.image ?? undefined} alt="" />
            <AvatarFallback className={s.initial}>{account.username.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Link>
      </header>
      {section === "dashboard" ? children : <div className={s.sectionPage}>{children}</div>}
    </main>
  </div>;
}
