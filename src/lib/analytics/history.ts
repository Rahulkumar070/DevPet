import type { Types } from "mongoose";
import { GithubCommit } from "@/lib/db/models/GithubCommit";
import { XpSnapshot } from "@/lib/db/models/XpSnapshot";

const DAY = 86_400_000;

function dateKey(time: number) {
  return new Date(time).toISOString().slice(0, 10);
}

export async function getActivityHistory(userId: Types.ObjectId, currentXp: number, now = new Date()) {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const monthStart = today - 29 * DAY;
  // Start on Sunday and include the current partial week.
  const calendarStart = today - (51 * 7 + now.getUTCDay()) * DAY;

  const [commitCounts, snapshots] = await Promise.all([
    GithubCommit.aggregate<{ _id: string; count: number }>([
      { $match: { userId, createdAt: { $gte: new Date(calendarStart), $lte: now } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } }, count: { $sum: 1 } } },
    ]),
    XpSnapshot.find({ userId, date: { $gte: new Date(monthStart), $lte: now } })
      .select("date userXp").sort({ date: 1, _id: 1 }).lean(),
  ]);

  const counts = new Map(commitCounts.map(({ _id, count }) => [_id, count]));
  const totals = new Map(snapshots.map(({ date, userXp }) => [dateKey(date.getTime()), userXp]));
  totals.set(dateKey(today), currentXp);

  const days = [];
  for (let time = calendarStart; time <= today; time += DAY) {
    const date = dateKey(time);
    days.push({ date, commits: counts.get(date) ?? 0 });
  }
  const month = days.slice(-30).map(day => ({ ...day, xp: totals.get(day.date) ?? null }));
  return { days, month };
}
