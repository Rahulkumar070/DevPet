import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { lstat, readFile, readlink } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
async function git(root: string, ...args: string[]) {
  const result = await exec("git", ["-c", "core.fsmonitor=false", ...args], {
    cwd: root, encoding: "buffer", maxBuffer: 8 * 1024 * 1024, timeout: 15000,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0", GIT_NO_LAZY_FETCH: "1" },
  });
  return result.stdout;
}

export async function branchName(root: string) {
  try {
    return (await git(root, "symbolic-ref", "--quiet", "--short", "HEAD")).toString().trimEnd();
  } catch {
    try {
      return "@" + (await git(root, "rev-parse", "--verify", "HEAD")).toString().trimEnd();
    } catch { return null; }
  }
}

// Hash the committed revision and staged index, then the bytes of changed and
// untracked working files. No clean tracked file needs to be read a second time.
export async function worktreeFingerprint(folder: string): Promise<string | null> {
  try {
    const root = (await git(folder, "rev-parse", "--show-toplevel")).toString().trimEnd();
    const hash = createHash("sha256");
    const part = (value: Buffer | string) => {
      hash.update(String(Buffer.byteLength(value)) + ":");
      hash.update(value);
    };
    const head = await git(root, "rev-parse", "--verify", "--quiet", "HEAD").catch((e: { code: number }) => {
      if (e.code === 1) return Buffer.alloc(0);
      throw e;
    });
    part(head);
    part(await git(root, "ls-files", "--stage", "-z"));
    const status = await git(root, "status", "--porcelain=v1", "-z", "--no-renames", "--untracked-files=all", "--ignore-submodules=none");
    part(status);
    const entries = status.toString().split("\0").filter(Boolean);
    if (entries.length > 10000) return null;
    let bytes = 0;
    for (const line of entries) {
      const file = join(root, line.slice(3));
      const stat = await lstat(file).catch((e: NodeJS.ErrnoException) => {
        if (e.code === "ENOENT" || e.code === "ENOTDIR") return null;
        throw e;
      });
      if (!stat) { part("absent"); continue; }
      if (stat.isSymbolicLink()) { part(await readlink(file)); continue; }
      bytes += stat.size;
      if (!stat.isFile() || bytes > 64 * 1024 * 1024) return null;
      part(String(stat.mode));
      part(await readFile(file));
    }
    return hash.digest("hex");
  } catch { return null; }
}
