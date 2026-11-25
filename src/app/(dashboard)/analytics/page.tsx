import Image from "next/image";
import { levelFromXP } from "@/lib/utils";
import s from "./analytics.module.css";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityChart } from "@/components/analytics/ActivityChart";
import { StatRadar } from "@/components/analytics/StatRadar";
import { StreakCalendar } from "@/components/analytics/StreakCalendar";
import { XPChart } from "@/components/analytics/XPChart";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User";
import { Companion } from "@/lib/db/models/Companion";
import { getActivityHistory } from "@/lib/analytics/history";
import { TrendingUp, Calendar, Radar, Zap, Layers, Flame, Swords } from "lucide-react";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user.id) redirect("/login?callbackUrl=/analytics");

  await connectDB();
  const user = await User.findById(session.user.id).select("xp streak activeCompanionId").lean();
  if (!user) throw new Error("DevPet account could not be loaded");

  const [history, companion] = await Promise.all([
    getActivityHistory(user._id, user.xp),
    user.activeCompanionId
      ? Companion.findOne({ _id: user.activeCompanionId, userId: user._id })
          .select("name stats battleWins battleLosses").lean()
      : null,
  ]);
  const recentCommits = history.month.reduce((total, day) => total + day.commits, 0);
  const recordedDays = history.month.filter(day => day.xp !== null).length;
  const syncDays = history.days.filter(day => day.commits > 0).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Analytics</h1>
        <p className="text-subtle text-sm">Track your coding activity and companion growth</p>
      </div>

      <div className={s.summary}>
        {[
          { label: "Total experience", value: user.xp.toLocaleString(), detail: "Lifetime XP", icon: Zap },
          { label: "Level", value: levelFromXP(user.xp), detail: "Account level", icon: Layers },
          { label: "Coding streak", value: user.streak, detail: user.streak === 1 ? "Day" : "Days", icon: Flame },
          { label: "Battle win rate", value: companion && companion.battleWins + companion.battleLosses
            ? `${Math.round(companion.battleWins * 100 / (companion.battleWins + companion.battleLosses))}%` : "—",
            detail: companion ? `${companion.battleWins} wins · ${companion.battleLosses} losses` : "No companion yet", icon: Swords },
        ].map(({ label, value, detail, icon: Icon }, i) => (
          <article key={label} className={s.metric}>
            {i === 0 && <Image src="/devpet-mascot.webp" alt="" width={118} height={128} />}
            <header><Icon size={15} />{label}</header>
            <strong>{value}</strong><small>{detail}</small>
          </article>
        ))}
      </div>

      <Tabs defaultValue="activity">
        <TabsList className="bg-inset border border-edge w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="activity">
            <TrendingUp className="w-4 h-4 mr-1.5" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="streak">
            <Calendar className="w-4 h-4 mr-1.5" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="stats">
            <Radar className="w-4 h-4 mr-1.5" />
            Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className={`${s.charts} mt-3`}>
          <div className={s.plot}>
            <h2 className="font-bold text-sm mb-0.5">XP over time</h2>
            <p className={s.caption}>Account XP totals recorded over the last 30 days (UTC).</p>
            {recordedDays > 1 ? <XPChart data={history.month} /> : <div className={s.firstRecord}>
              <span>First daily record</span>
              <strong>{user.xp.toLocaleString()} <small>XP</small></strong>
              <div className={s.days} aria-hidden="true">{history.month.map(day =>
                <i key={day.date} data-recorded={day.xp !== null} />
              )}</div>
              <p>1 of 30 days recorded. Your trend appears as more daily totals are saved.</p>
            </div>}
          </div>

          <div className={s.plot}>
            <h2 className="font-bold text-sm mb-0.5">GitHub commits</h2>
            <p className={s.caption}>{recentCommits.toLocaleString()} synced in the last 30 days, grouped by sync date (UTC).</p>
            <ActivityChart data={history.month} />
            {recentCommits === 0 && (
              <Link href="/dashboard" className="text-sm text-action underline">Open the dashboard to sync GitHub activity</Link>
            )}
          </div>
        </TabsContent>

        <TabsContent value="streak" className="mt-3">
          <div className={s.plot}>
            <h2 className="font-bold text-sm mb-0.5">GitHub sync calendar</h2>
            <p className={s.caption}>{syncDays} {syncDays === 1 ? "day" : "days"} with synced commits across the last 52 weeks (UTC).</p>
            <StreakCalendar days={history.days} />
          </div>
        </TabsContent>

        <TabsContent value="stats" className="mt-3">
          {companion ? (
            <div className={s.plot}>
              <h2 className="font-bold text-sm mb-0.5">{companion.name}&apos;s Stats</h2>
              <p className={s.caption}>Companion stat distribution</p>
              <div className="max-w-xl mx-auto">
                <StatRadar stats={companion.stats} />
              </div>
            </div>
          ) : (
            <div className="workspace-panel p-8 text-center">
              <p className="text-subtle text-sm mb-4">Hatch a companion to see their stats.</p>
              <Link href="/hatch" className="inline-flex px-5 py-2 rounded-full bg-action text-on-action hover:bg-action/90 text-sm font-semibold">
                Hatch Now
              </Link>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
