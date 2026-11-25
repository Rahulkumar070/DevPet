"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Egg, Flame, PawPrint, RefreshCw, Search, Sparkle, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { CompanionPortrait } from "@/components/companion/CompanionPortrait";
import { ConfirmedPushes } from "@/components/dashboard/ConfirmedPushes";
import { ActivityFeed, type SyncedCommit } from "@/components/dashboard/ActivityFeed";
import { useWorkspaceUser } from "@/hooks/useWorkspaceUser";
import { levelFromXP, xpProgressInCurrentLevel } from "@/lib/utils";
import { type ICompanion } from "@/types";
import DashboardLoading from "./loading";
import s from "@/components/dashboard/workspace.module.css";

async function readJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) throw new Error("Could not load workspace data");
  return response.json();
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState(0);
  const [search, setSearch] = useState("");
  const user = useWorkspaceUser(userId);
  const companion = useQuery({
    queryKey: ["companion", "active", userId], enabled: !!userId,
    queryFn: async (): Promise<ICompanion | null> => {
      const response = await fetch("/api/companion/active");
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("Could not load active companion");
      return response.json();
    },
  });
  const activity = useQuery({
    queryKey: ["github", "activity", userId, 50], enabled: !!userId,
    queryFn: () => readJson<SyncedCommit[]>("/api/github/sync?limit=50"), refetchInterval: 30_000,
  });
  const sync = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/github/sync", { method: "POST" });
      if (!response.ok) throw new Error("GitHub sync failed");
      return response.json() as Promise<{ newCommits: number; xpGained: number }>;
    },
    onSuccess: async ({ newCommits, xpGained }) => {
      await Promise.all([["github", "activity"], ["user", "fresh"], ["companion", "active"]].map(queryKey =>
        queryClient.invalidateQueries({ queryKey })
      ));
      toast.success(newCommits ? `Synced ${newCommits} commits · +${xpGained} XP` : "Your GitHub activity is up to date");
    },
    onError: () => toast.error("Couldn’t sync GitHub activity. Please try again."),
  });

  if (!session) return <DashboardLoading />;
  const xp = user.data?.xp ?? session.user.xp;
  const level = levelFromXP(xp);
  const streak = user.data?.streak ?? session.user.streak;
  const progress = xpProgressInCurrentLevel(xp);
  const remaining = Math.max(0, progress.needed - progress.current);
  const commits = activity.data ?? [];
  const selected = commits.filter(c => !period || Date.parse(c.createdAt) >= activity.dataUpdatedAt - period * 86_400_000);
  const needle = search.trim().toLowerCase();
  const visible = selected.filter(c => [c.message, c.repo, c.sha].some(value => value.toLowerCase().includes(needle)));
  const repos = new Set(selected.map(c => c.repo)).size;
  const days = new Set(selected.map(c => c.createdAt.slice(0, 10))).size;
  const pet = companion.data;
  const petHref = pet ? (pet.isPublic ? `/companion/${pet.shareSlug}` : "/settings?tab=companions") : "/hatch";
  const loaded = !!activity.data;

  return <>
      <div className={s.intro}><h1>Dashboard</h1>
        <p>@{session.user.username}<span>·</span>{pet ? `${pet.name} · Lv. ${pet.level} · ${pet.mood}` : "Personal workspace"}</p>
      </div>
      <div className={s.toolbar}>
        <div className={s.segment} aria-label="Activity period" role="group">
          {[[0,"All activity"],[7,"7 days"],[30,"30 days"]].map(([value,label]) =>
            <button key={value} aria-pressed={period === value} onClick={() => setPeriod(Number(value))}>{label}</button>)}
        </div>
        <label className={s.search}><Search size={14} /><input aria-label="Search recent commits" placeholder="Search commits or repos" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button aria-label="Clear search" onClick={() => setSearch("")}><X size={12} /></button>}
        </label>
        <button className={s.sync} disabled={sync.isPending} onClick={() => sync.mutate()}>
          <RefreshCw size={14} className={sync.isPending ? s.spin : undefined} />{sync.isPending ? "Syncing…" : "Sync GitHub"}
        </button>
      </div>

      <div className={s.sectionBar}><div className={s.sectionTitle}><h2>Overview</h2><small>Account summary</small></div>
        <Link href="/analytics">View analytics <ArrowUpRight size={13} /></Link>
      </div>
      <div className={s.overview}>
        <article className={s.hero}>
          <header><span><Zap size={15} />Total experience</span><b>Level {level}</b></header>
          <div className={s.heroArt} aria-hidden><i /><i /><Sparkle size={22} /><Image src="/devpet-mascot.webp" width={520} height={563} alt="" priority /></div>
          <div className={s.heroValue}>{xp.toLocaleString()}<small>XP</small></div>
          <div className={s.heroFoot}>{level >= 50 ? "Maximum level reached" : `${remaining} XP to level ${level + 1}`}</div>
        </article>
        <article className={s.bubbleCard}>
          <h3>Activity snapshot</h3>
          <div className={s.bubblePlot}>
            <div className={s.bubbleOne}><strong>{loaded ? selected.length : "—"}</strong><span>Commits</span></div>
            <div className={s.bubbleTwo}><strong>{loaded ? repos : "—"}</strong><span>Repos</span></div>
            <div className={s.bubbleThree}><strong>{loaded ? days : "—"}</strong><span>Days</span></div>
          </div>
          <small>{period ? `Past ${period} days · latest 50 commits` : "Up to 50 recent commits"}</small>
        </article>
        <div className={s.miniStack}>
          <Link className={s.mini} href="/analytics"><header>Coding streak<Flame size={16} /></header><div className={s.miniBottom}><strong>{streak}<small>{streak === 1 ? "day" : "days"}</small></strong><span className={s.flameDot}><Flame size={18} /></span></div></Link>
          <Link className={s.mini} href={petHref}><header>Active companion<PawPrint size={16} /></header><div className={s.miniBottom}><b>{companion.isError ? "View hatchery" : companion.isPending ? "Loading…" : pet?.name ?? "Hatch a pet"}</b><span className={s.petDot}>{pet ? <CompanionPortrait species={pet.species} size={40} /> : <Egg size={18} />}</span></div></Link>
        </div>
      </div>
      <ConfirmedPushes userId={session.user.id} />
      <ActivityFeed key={`${period}:${search}`} commits={visible} loading={activity.isPending} error={activity.isError} retry={() => { void activity.refetch(); }} />
  </>;
}
