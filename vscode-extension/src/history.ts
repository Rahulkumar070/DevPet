import * as vscode from "vscode";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { commonDirectory } from "./pushGuard";

const git = promisify(execFile);
interface Receipt {
  timestamp: string;
  remote?: string | null;
  outcome: "passed" | "blocked" | "incomplete";
  commitsInspected: number;
  changedPathsSeen: number;
  updates: { ref: string; before: string; after: string }[];
}

export async function showPushHistory(root: string) {
  const dir = join(commonDirectory(root), "devpet", "push-checks");
  const names = await fs.readdir(dir).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const files = names.filter(name => /^\d+-[\da-f-]+\.json$/.test(name)).sort().reverse().slice(0, 100);
  const records = await Promise.all(files.map(async name =>
    JSON.parse(await fs.readFile(join(dir, name), "utf8")) as Receipt));
  if (!records.length) {
    vscode.window.showInformationMessage("No local push checks recorded for this repository yet.");
    return;
  }
  const picked = await vscode.window.showQuickPick(records.map(record => ({
    label: `${record.outcome} · ${record.remote ? record.remote + " / " : ""}${record.updates.map(update => update.ref).join(", ")}`,
    description: new Date(record.timestamp).toLocaleString(),
    detail: `${record.commitsInspected} commits inspected · ${record.changedPathsSeen} paths seen`,
    record,
  })), { title: "DevPet · Local push checks", placeHolder: "Select a check to inspect its file changes locally" });
  if (!picked) return;
  const details = [JSON.stringify(picked.record, null, 2)];
  for (const { ref, before, after } of picked.record.updates) {
    if (![before, after].every(id => /^(?:[a-f\d]{40}|[a-f\d]{64})$/.test(id))) continue;
    if (/^0+$/.test(after)) continue;
    const range = [after + "^{commit}"];
    if (!/^0+$/.test(before)) range.push("^" + before + "^{commit}");
    try {
      const { stdout } = await git("git", ["log", "--no-color", "--no-ext-diff", "--no-renames", "--root", "-m",
        "--format=commit %H", "--name-status", ...range, "--"], { cwd: root, maxBuffer: 4 * 1024 * 1024 });
      details.push(ref + "\n" + stdout.trim());
    } catch {
      details.push(ref + "\nFile list unavailable. The local objects may be missing or the history exceeds the display limit.");
    }
  }
  const doc = await vscode.workspace.openTextDocument({ language: "plaintext", content: details.join("\n\n") });
  await vscode.window.showTextDocument(doc, { preview: true });
}
