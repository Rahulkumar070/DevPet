import { test } from "node:test";
import assert from "node:assert/strict";
import Module, { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("late process exits update only their own task and never promote a newer unfinished check", async t => {
  const root = mkdtempSync(join(tmpdir(), "devpet-task-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync("git", ["init", "-q", "-b", "main", root]);
  let onProcess, onEnd, execution;
  const tasks = {
    onDidEndTaskProcess(fn) { onProcess = fn; return { dispose() {} }; },
    onDidEndTask(fn) { onEnd = fn; return { dispose() {} }; },
    async executeTask() { execution = {}; return execution; },
  };
  const load = Module._load;
  let BranchMemory;
  try {
    Module._load = function (name, ...args) {
      return name === "vscode" ? { tasks } : load.call(this, name, ...args);
    };
    ({ BranchMemory } = createRequire(import.meta.url)("../out/branchMemory.js"));
  } finally { Module._load = load; }
  const state = new Map();
  const memory = new BranchMemory({ get: k => state.get(k), update: async (k, v) => state.set(k,v) }, { subscriptions: [] }, () => {});
  await memory.run(root, { name: "unit tests" });
  onEnd({ execution });
  assert.equal((await memory.view(root)).check.exit, undefined);
  onProcess({ execution, exitCode: 3 });
  assert.equal((await memory.view(root)).check.exit, 3);
  await memory.run(root, { name: "older build" });
  const old = execution;
  onEnd({ execution });
  await memory.view(root);
  await memory.run(root, { name: "new build" });
  onProcess({ execution: old, exitCode: 0 });
  const pending = await memory.view(root);
  assert.equal(pending.running, true);
  assert.equal(pending.check.exit, undefined);
  onProcess({ execution, exitCode: 7 });
  assert.equal((await memory.view(root)).check.exit, 7);
});
