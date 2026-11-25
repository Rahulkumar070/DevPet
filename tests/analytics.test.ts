import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import mongoose from "mongoose";
import { getActivityHistory } from "../src/lib/analytics/history";
import { GithubCommit } from "../src/lib/db/models/GithubCommit";
import { XpSnapshot } from "../src/lib/db/models/XpSnapshot";

const database = "devpet_test_" + randomUUID().replaceAll("-", "");
const now = new Date("2026-01-04T12:00:00Z"); // Sunday, so the final week has just one day.

before(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017", { dbName: database, serverSelectionTimeoutMS: 5000 });
});

after(async () => {
  if (mongoose.connection.name === database) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test("an empty account has no recorded historical XP or synced commits", async () => {
  const { days, month } = await getActivityHistory(new mongoose.Types.ObjectId(), 0, now);
  assert.equal(days.length, 51 * 7 + 1);
  assert.equal(month.length, 30);
  assert.equal(month[0].date, "2025-12-06");
  assert.deepEqual(month.at(-1), { date: "2026-01-04", commits: 0, xp: 0 });
  assert.ok(days.every(day => day.commits === 0));
  assert.ok(month.slice(0, -1).every(day => day.xp === null));
});

test("UTC buckets isolate users and use the newest recorded total for each day", async () => {
  const userId = new mongoose.Types.ObjectId();
  const otherId = new mongoose.Types.ObjectId();
  const companionId = new mongoose.Types.ObjectId();
  for (const [owner, date] of [
    [userId, "2026-01-02T23:59:59Z"], [userId, "2026-01-03T00:00:00Z"],
    [userId, "2026-01-03T01:00:00Z"], [otherId, "2026-01-03T01:00:00Z"],
    [userId, "2026-01-04T13:00:00Z"],
  ] as const) {
    await GithubCommit.create({ userId: owner, sha: randomUUID(), repo: "demo", xpAwarded: 10, createdAt: new Date(date) });
  }
  for (const [owner, date, xp] of [
    [userId, "2026-01-02T01:00:00Z", 10], [userId, "2026-01-02T03:00:00Z", 30],
    [otherId, "2026-01-02T05:00:00Z", 99], [userId, "2026-01-04T08:00:00Z", 40],
  ] as const) {
    await XpSnapshot.create({ userId: owner, companionId, date: new Date(date), userXp: xp, companionXp: 1, companionLevel: 1 });
  }
  const { month } = await getActivityHistory(userId, 50, now);
  assert.deepEqual(month.slice(-3), [
    { date: "2026-01-02", commits: 1, xp: 30 },
    { date: "2026-01-03", commits: 2, xp: null },
    { date: "2026-01-04", commits: 0, xp: 50 },
  ]);
});
