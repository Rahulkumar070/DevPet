import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import mongoose from "mongoose";
import connectDB from "../src/lib/db/mongoose";
import { ConfirmedPush, recentPushes } from "../src/lib/db/models/ConfirmedPush";
import { User } from "../src/lib/db/models/User";
import { POST } from "../src/app/api/github/webhook/route";

const database = "devpet_test_" + randomUUID().replaceAll("-", "");
const secret = randomUUID();
const delivery = randomUUID();
const push = {
  installation: { id: 71 }, sender: { id: 19 }, repository: { id: 12, full_name: "example/demo" },
  ref: "refs/heads/main", before: "a".repeat(40), after: "b".repeat(40),
  created: false, deleted: false, forced: false,
  commits: [{ message: "sample text omitted from storage" }],
};

function deliver(body = JSON.stringify(push), signed = body, event = "push", id = delivery) {
  return POST(new Request("http://localhost/api/github/webhook", {
    method: "POST", body, headers: {
      "x-hub-signature-256": "sha256=" + createHmac("sha256", secret).update(signed).digest("hex"),
      "x-github-event": event, "x-github-delivery": id,
    },
  }));
}

before(() => {
  process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/" + database;
  process.env.GITHUB_WEBHOOK_SECRET = secret;
});

after(async () => {
  if (mongoose.connection.name === database) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test("checks the signature on the exact bytes and accepts a signed ping", async () => {
  assert.equal((await deliver(JSON.stringify(push) + " ", JSON.stringify(push))).status, 401);
  assert.equal((await deliver("{}", "{}", "ping")).status, 204);
  assert.equal((await deliver("{}")).status, 422);
  assert.equal((await deliver("invalid json")).status, 400);
});

test("deduplicates concurrent deliveries, retains metadata only and scopes the feed to its sender", async () => {
  await connectDB();
  const user = await User.create({ username: "developer", githubId: "19", referralCode: "fixture" });
  await ConfirmedPush.init();
  const responses = await Promise.all([deliver(), deliver()]);
  assert.deepEqual(responses.map(response => response.status), [204, 204]);
  const receipts = await recentPushes(String(user._id));
  assert.equal(receipts.length, 1);
  assert.equal(receipts[0].after, push.after);
  assert.equal(receipts[0].repository, "example/demo");
  assert.deepEqual(await recentPushes(new mongoose.Types.ObjectId().toString()), []);
  const raw = await ConfirmedPush.collection.findOne({});
  assert.ok(raw && !("commits" in raw) && !("sender" in raw));
  const unlinked = { ...push, sender: { id: 20, login: user.username } };
  const body = JSON.stringify(unlinked);
  assert.equal((await deliver(body, body, "push", randomUUID())).status, 204);
  assert.equal(await ConfirmedPush.countDocuments(), 1);
});
