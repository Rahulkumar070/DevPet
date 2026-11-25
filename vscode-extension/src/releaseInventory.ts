import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { protectedPath } from "./pushGuard";

interface Entry { name: string; size: number; hash: string }
export interface Inventory { kind: string; name: string; version: string; digest: string; entries: Entry[] }

export function releaseReport(next: Inventory, previous?: Inventory) {
  const old = new Map(previous?.entries.map(e => [e.name, e]));
  const lines = [next.name + " " + next.version, "Artifact SHA-256  " + next.digest,
    previous ? "Approved comparison  " + previous.version + " · " + previous.digest : "First inventory · no approved comparison",
    "", next.entries.length + " files", ""];
  for (const file of next.entries) {
    const before = old.get(file.name);
    old.delete(file.name);
    const flags: string[] = [];
    if (protectedPath(file.name)) flags.push("protected path");
    if (/\.map$/i.test(file.name)) flags.push("source map");
    if (/\.(zip|tar|tgz|gz|7z|rar|vsix|jar)$/i.test(file.name)) flags.push("nested archive");
    if (file.size - (before?.size ?? 0) >= 1024 * 1024) flags.push("grew by at least 1 MiB");
    const status = !previous ? "INCLUDED" : !before ? "ADDED" : before.hash !== file.hash ? "CHANGED" : "UNCHANGED";
    if (status !== "UNCHANGED" || flags.length) lines.push([status, JSON.stringify(file.name), file.size + " bytes", ...flags].join("  "));
  }
  for (const name of old.keys()) lines.push("REMOVED  " + JSON.stringify(name));
  return lines.join("\n");
}

export async function readInventory(helper: string, file: string): Promise<Inventory> {
  const exec = promisify(execFile);
  const commands = process.platform === "win32" ? [["py", "-3"], ["python3"]] : [["python3"]];
  for (const [program, ...args] of commands) {
    try {
      const { stdout } = await exec(program, [...args, "-I", helper, file], { timeout: 60000, maxBuffer: 12 * 1024 * 1024 });
      return JSON.parse(stdout);
    } catch (err) {
      const reason = err as NodeJS.ErrnoException & { stderr?: string };
      if (reason.code === "ENOENT") continue;
      throw new Error(reason.stderr?.trim().slice(0, 300) || "The archive could not be fully inspected.");
    }
  }
  throw new Error("Install Python 3.8 or later to inspect release archives.");
}

