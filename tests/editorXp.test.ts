import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "../src/lib/db/mongoose";
import { User } from "../src/lib/db/models/User";
import { Companion } from "../src/lib/db/models/Companion";
import { XpSnapshot } from "../src/lib/db/models/XpSnapshot";
import { xpForNextLevel } from "../src/lib/utils";
import { GET as active } from "../src/app/api/companion/active/route";
import { GET as verify } from "../src/app/api/user/token/route";
import { POST as start } from "../src/app/api/vscode/session/start/route";
import { POST as save } from "../src/app/api/vscode/save/route";
import { POST as securityCatch } from "../src/app/api/vscode/security-catch/route";
import { POST as end } from "../src/app/api/vscode/session/end/route";

const database = "devpet_test_" + randomUUID().replaceAll("-", "");
const token = randomUUID();
function request(data?: object, credential: string = token) {
  return new NextRequest("http://localhost/test", {
    method: "POST", headers: { authorization: "Bearer " + credential },
    body: data ? JSON.stringify(data) : undefined,
  });
}
after(async () => {
  if (mongoose.connection.name === database) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test("editor routes verify credentials, load the pet, award concurrent saves, evolve and close a session", async () => {
  process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/" + database;
  await connectDB();
  const user = await User.create({ username: "tester", githubId: "999", apiToken: token, referralCode: "test" });
  assert.equal((await verify(request(undefined, "invalid"))).status, 401);
  assert.equal((await verify(request())).status, 200);
  assert.equal((await active(request())).status, 404);
  const atLevelTen = Array.from({ length: 9 }, (_, i) => xpForNextLevel(i + 1)).reduce((a,b) => a+b,0);
  const pet = await Companion.create({ userId: user._id, name: "Cache", species: "gitfox", rarity: "common",
    personality: "curious", eye: "*", shareSlug: "demo-cache", stats: { GRIND: 4, FOCUS: 5, SHIP: 6, SQUASH: 7, VIBE: 8 },
    xp: atLevelTen - 2, level: 9, memoryLog: ["test memory"] });
  await User.updateOne({ _id: user._id }, { activeCompanionId: pet._id });
  assert.equal((await start(request())).status, 200);
  const saves = await Promise.all([save(request()), save(request())]);
  assert.deepEqual(await Promise.all(saves.map(async res => (await res.json()).xpGained)), [5,5]);
  const current = await (await active(request())).json();
  assert.deepEqual([current.name, current.xp, current.level, current.evolutionStage], ["Cache", atLevelTen + 2, 10, 2]);
  assert.ok(!("memoryLog" in current));
  assert.equal((await securityCatch(request({ criticalCount: 2, issuesFound: 1 }))).status, 400);
  assert.equal((await (await securityCatch(request({ criticalCount: 1, issuesFound: 1 }))).json()).xpGained, 15);
  const summary = await (await end(request({ durationMinutes: 30 }))).json();
  assert.equal(summary.totalXp, 35);
  assert.equal(summary.xpGained, 10);
  assert.equal((await XpSnapshot.findOne({ userId: user._id }))?.companionXp, atLevelTen + 14);
});
