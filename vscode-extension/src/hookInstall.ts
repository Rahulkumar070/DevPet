import { spawnSync } from "node:child_process";
import { existsSync, linkSync, readFileSync, mkdirSync, writeFileSync, renameSync, unlinkSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { commonDirectory, hookScript } from "./pushGuard";
import { PRE_PUSH_HOOK_SCRIPT } from "./constants";

export function installHook(root: string) {
  const hooks = join(commonDirectory(root), "hooks");
  // A custom hooks directory may be shared across unrelated repositories.
  const config = spawnSync("git", ["config", "--get", "core.hooksPath"], { cwd: root });
  if (config.status === 0) throw new Error("This repository uses a custom hooks directory. DevPet left the existing hook manager in place.");
  if (config.status !== 1) throw new Error("Could not read Git hook configuration.");
  const target = join(hooks, "pre-push");
  const script = hookScript(readFileSync(join(__dirname, "pushGuard.js"), "utf8"));
  mkdirSync(hooks, { recursive: true });
  const upgrade = existsSync(target);
  if (upgrade) {
    const current = readFileSync(target, "utf8");
    if (current !== PRE_PUSH_HOOK_SCRIPT && !current.startsWith("#!/bin/sh\n# DevPet managed pre-push v2\n")) {
      throw new Error("An existing pre-push hook is installed. DevPet left it in place.");
    }
  }
  const temp = target + "-" + randomUUID();
  try {
    writeFileSync(temp, script, { mode: 0o755, flag: "wx" });
    if (upgrade) renameSync(temp, target);
    else linkSync(temp, target);
  } finally {
    if (existsSync(temp)) unlinkSync(temp);
  }
}
