import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import installer from "../out/hookInstall.js";
const { installHook } = installer;

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "devpet-guard-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const work = path.join(root, "working copy"), remote = path.join(root, "remote.git");
  fs.mkdirSync(work);
  function command(args) {
    return spawnSync("git", args, { cwd: work, encoding: "utf8", env: {
      ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: os.devNull, GIT_TERMINAL_PROMPT: "0",
    } });
  }
  function git(...args) {
    const result = command(args);
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  }
  function commit(name, body) {
    fs.writeFileSync(path.join(work, name), body);
    git("add", "--", name);
    git("commit", "-qm", "fixture");
  }
  git("init", "-q", "-b", "main");
  git("config", "user.name", "DevPet test");
  git("config", "user.email", "test@localhost");
  git("init", "--bare", "-q", remote);
  git("remote", "add", "origin", remote);
  return { work, remote, git, commit, command, history: () => {
    const dir = path.join(work, ".git/devpet/push-checks");
    return fs.readdirSync(dir).sort().map(file => JSON.parse(fs.readFileSync(path.join(dir, file))));
  }};
}

test("checks committed objects even when the index is clean and records local outcomes", t => {
  const f = fixture(t); installHook(f.work); installHook(f.work);
  f.commit(".env.sample", "COLOR=blue"); f.git("push", "origin", "main");
  const accepted = f.git("rev-parse", "HEAD");
  f.commit("private file.key", "harmless fixture"); f.git("rm", "private file.key"); f.git("commit", "-qm", "remove fixture");
  assert.equal(f.git("status", "--porcelain"), "");
  const attempt = f.command(["push", "origin", "main"]);
  assert.notEqual(attempt.status, 0); assert.match(attempt.stderr, /Protected file "private file.key"/);
  assert.equal(f.git("--git-dir=" + f.remote, "rev-parse", "main"), accepted);
  const [passed, blocked] = f.history();
  assert.equal(passed.remote, "origin"); assert.equal(passed.outcome, "passed"); assert.equal(blocked.outcome, "blocked");
  assert.equal(blocked.commitsInspected, 2); assert.equal(blocked.updates[0].before, accepted);
  assert.doesNotMatch(JSON.stringify(blocked), /private file|harmless fixture/);
});

test("handles multiple refs, tags, force updates, deletions and unrelated staged files", t => {
  const f = fixture(t); installHook(f.work);
  f.commit("app.txt", "version 1"); f.git("tag", "-a", "v1", "-m", "test");
  fs.writeFileSync(path.join(f.work, ".env"), "temporary fixture"); f.git("add", ".env");
  f.git("push", "origin", "main", "refs/tags/v1"); f.git("restore", "--staged", ".env");
  f.git("branch", "topic"); f.git("push", "origin", "topic"); f.git("push", "origin", "--delete", "topic");
  f.git("checkout", "--orphan", "other"); f.git("rm", "-f", "app.txt"); f.commit("next.txt", "replacement");
  f.git("push", "--force", "origin", "other:main");
  const records = f.history(); assert.equal(records[0].updates.length, 2); assert.equal(records[0].commitsInspected, 1);
  assert.equal(records[2].commitsInspected, 0); assert.equal(records[3].outcome, "passed");
});

test("flags a synthetic credential indicator in committed text without printing its value", t => {
  const f = fixture(t); installHook(f.work);
  const marker = ["-----BEGIN ", "PRIVATE KEY-----"].join("");
  f.commit("notes with spaces.txt", "# documentation fixture " + marker);
  const attempt = f.command(["push", "origin", "main"]);
  assert.notEqual(attempt.status, 0); assert.match(attempt.stderr, /Credential indicator/);
  assert.ok(!attempt.stderr.includes(marker)); assert.equal(f.history()[0].outcome, "blocked");
});

test("preserves an existing unmanaged hook and respects a custom hook path", t => {
  const f = fixture(t);
  const hook = path.join(f.work, ".git/hooks/pre-push"); fs.writeFileSync(hook, "#!/bin/sh\nexit 0\n");
  assert.throws(() => installHook(f.work), /existing pre-push/);
  assert.equal(fs.readFileSync(hook, "utf8"), "#!/bin/sh\nexit 0\n");
  f.git("config", "core.hooksPath", ".hooks"); assert.throws(() => installHook(f.work), /custom hooks/);
});

test("an incomplete inspection stops the update and leaves an incomplete receipt", t => {
  const f = fixture(t); installHook(f.work);
  fs.writeFileSync(path.join(f.work, "large.bin"), Buffer.alloc(16 * 1024 * 1024 + 1));
  f.git("add", "large.bin"); f.git("commit", "-qm", "large fixture");
  const attempt = f.command(["push", "origin", "main"]);
  assert.notEqual(attempt.status, 0);
  assert.equal(f.history()[0].outcome, "incomplete");
});

test("linked worktrees use the shared hook and common history", t => {
  const f = fixture(t); f.commit("app.txt", "first");
  const linked = path.join(path.dirname(f.work), "linked");
  f.git("worktree", "add", "-q", "-b", "feature", linked);
  installHook(linked);
  f.git("-C", linked, "push", "origin", "feature");
  assert.equal(f.history()[0].updates[0].ref, "refs/heads/feature");
});

test("review shows intermediate committed paths, quotes unusual filenames and excludes staged work", async t => {
  const { reviewOutgoing, reviewTargets, outgoingCommitIds, reviewCommitDiff } = await import("../out/outgoing.js");
  const f = fixture(t);
  f.commit("base.txt", "initial");
  f.git("push", "-u", "origin", "main");
  assert.equal((await reviewTargets(f.work)).upstreamBranch, "main");
  assert.match((await reviewOutgoing(f.work, "origin", "main")).text, /Commits in scope: 0/);
  f.commit("temporary.txt", "intermediate");
  f.git("rm", "temporary.txt");
  f.commit("line\nbreak.txt", "version 2");
  fs.writeFileSync(path.join(f.work, "staged.txt"), "staged only");
  f.git("add", "staged.txt");
  const snapshot = await reviewOutgoing(f.work, "origin", "main");
  const review = snapshot.text;
  const ids = await outgoingCommitIds(f.work, snapshot.head, snapshot.base);
  assert.equal(ids.length, 2);
  assert.match(await reviewCommitDiff(f.work, ids[0]), /-intermediate/);
  assert.match(review, /Commits in scope: 2/);
  assert.ok(review.includes("A\ttemporary.txt") && review.includes("D\ttemporary.txt"));
  assert.ok(review.includes('"line\\nbreak.txt"'));
  assert.doesNotMatch(review, /staged\.txt|base\.txt/);
  assert.match((await reviewOutgoing(f.work, "origin", "new-branch")).text, /Commits in scope: 3/);
  f.git("config", "remote.origin.pushurl", "https://fixture@example.invalid/other/project.git");
  const separate = (await reviewOutgoing(f.work, "origin", "main")).text;
  assert.match(separate, /Push endpoint: example\.invalid/);
  assert.match(separate, /Commits in scope: 3/);
  assert.doesNotMatch(separate, /fixture@/);
});

test("panel and installed hook agree on intermediate findings and rerunning a corrected range", async t => {
  const { reviewOutgoing, reviewCommitDiff } = await import("../out/outgoing.js");
  const { scanReview } = await import("../out/reviewScan.js");
  const f = fixture(t);
  f.commit("app.txt", "ready"); f.git("push", "origin", "main"); installHook(f.work);
  const base = f.git("rev-parse", "HEAD");
  f.commit(".env.local", "COLOR=blue");
  const introduced = f.git("rev-parse", "HEAD");
  f.git("rm", ".env.local"); f.git("commit", "-qm", "remove fixture");
  const run = async () => {
    const { head, base } = await reviewOutgoing(f.work, "origin", "main");
    return scanReview({ root: f.work, head, base });
  };
  const scan = await run();
  assert.equal(scan.error, "");
  assert.deepEqual(scan.changes.filter(c => c.reasons.length).map(c => [c.name, c.commit, c.reasons]), [
    [".env.local", introduced, ["Protected file"]],
  ]);
  assert.ok(scan.changes.some(c => c.name === ".env.local" && c.status === "D"));
  assert.match(await reviewCommitDiff(f.work, introduced, ".env.local"), /COLOR=blue/);
  assert.notEqual(f.command(["push", "origin", "main"]).status, 0);
  f.git("checkout", "-qb", "corrected", base); f.commit("app.txt", "reviewed");
  const clear = await run(); assert.equal(clear.error, ""); assert.ok(clear.changes.every(c => !c.reasons.length));
  f.git("push", "origin", "HEAD:main");
  assert.equal(f.git("--git-dir=" + f.remote, "rev-parse", "main"), f.git("rev-parse", "HEAD"));
});

test("workspace check fingerprints track staged, unstaged, untracked and ignored changes", async t => {
  const { worktreeFingerprint, branchName } = await import("../out/worktree.js");
  const f = fixture(t);
  f.commit(".gitignore", "*.cache\n"); f.commit("app.txt", "hello");
  assert.equal(await branchName(f.work), "main");
  const original = await worktreeFingerprint(f.work); assert.ok(original);
  fs.writeFileSync(path.join(f.work, "out.cache"), "generated");
  assert.equal(await worktreeFingerprint(f.work), original);
  fs.writeFileSync(path.join(f.work, "app.txt"), "there");
  const edited = await worktreeFingerprint(f.work); assert.notEqual(edited, original);
  f.git("add", "app.txt"); assert.notEqual(await worktreeFingerprint(f.work), edited);
  f.git("restore", "--staged", "app.txt"); f.git("restore", "app.txt");
  assert.equal(await worktreeFingerprint(f.work), original);
  fs.writeFileSync(path.join(f.work, "new.txt"), "one"); const first = await worktreeFingerprint(f.work);
  fs.writeFileSync(path.join(f.work, "new.txt"), "two"); assert.notEqual(await worktreeFingerprint(f.work), first);
});
