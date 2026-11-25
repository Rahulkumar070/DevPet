import * as vscode from "vscode";
import { randomUUID } from "node:crypto";
import { realpath } from "node:fs/promises";
import * as path from "node:path";
import { branchName, worktreeFingerprint } from "./worktree";

interface Note { text: string; file?: string; line?: number }
interface Check { id: string; task: string; at: number; exit?: number; fingerprint: string | null }
interface Run { id: string; key: string; task: string; fingerprint: string | null }
export interface MemoryView { branch: string; note?: Note; check?: Check; freshness?: string; running: boolean }

function key(root: string, branch: string) { return JSON.stringify([root, branch]); }
function inside(root: string, file: string) {
  const rel = path.relative(root, file);
  return !!rel && rel !== ".." && !rel.startsWith(".." + path.sep) && !path.isAbsolute(rel);
}

export class BranchMemory {
  private readonly runs = new WeakMap<vscode.TaskExecution, Run>();
  private readonly early = new WeakMap<vscode.TaskExecution, { exit?: number }>();
  private readonly pending = new Set<string>();
  constructor(private readonly state: vscode.Memento, context: vscode.ExtensionContext, private readonly changed: () => void) {
    context.subscriptions.push(vscode.tasks.onDidEndTaskProcess(e => void this.finish(e.execution, e.exitCode)),
      vscode.tasks.onDidEndTask(e => {
        // A task may finish without producing a process exit code.
        if (!this.early.has(e.execution)) void this.finish(e.execution);
      }));
  }

  private async finish(execution: vscode.TaskExecution, exit?: number) {
    // Some task providers emit the generic end event before the process result.
    // A later exit code can complete the same run without overwriting a newer run.
    const prior = this.early.get(execution);
    if (prior && (prior.exit !== undefined || exit === undefined)) return;
    this.early.set(execution, { exit });
    await this.saveResult(execution, exit);
  }

  private async saveResult(execution: vscode.TaskExecution, exit?: number) {
    const run = this.runs.get(execution);
    if (!run || this.state.get<Check>("check:" + run.key)?.id !== run.id) return;
    const result: Check = { id: run.id, task: run.task, at: Date.now(), exit, fingerprint: run.fingerprint };
    try {
      await this.state.update("check:" + run.key, result);
    } finally {
      if (this.state.get<Check>("check:" + run.key)?.id === run.id) this.pending.delete(run.key);
      this.changed();
    }
  }

  async view(root: string): Promise<MemoryView | undefined> {
    const branch = await branchName(root);
    if (!branch) return;
    const id = key(root, branch);
    const note = this.state.get<Note>("note:" + id);
    const check = this.state.get<Check>("check:" + id);
    let freshness: string | undefined;
    if (check) {
      const now = await worktreeFingerprint(root);
      freshness = !check.fingerprint || !now ? "Freshness unknown" : check.fingerprint === now ? "Current" : "Out of date";
    }
    return { branch, note, check, freshness, running: this.pending.has(id) };
  }

  async edit(root: string) {
    const branch = await branchName(root);
    if (!branch) throw new Error("Open a Git workspace to leave a branch note.");
    const id = "note:" + key(root, branch);
    const note = this.state.get<Note>(id);
    const editor = vscode.window.activeTextEditor;
    const activeFile = editor?.document.uri.scheme === "file" && inside(root, editor.document.uri.fsPath);
    const file = activeFile ? path.relative(root, editor!.document.uri.fsPath) : note?.file;
    const line = activeFile ? editor!.selection.active.line : note?.line;
    const text = await vscode.window.showInputBox({ title: "Next step on " + branch, value: note?.text,
      prompt: "Leave one line for your next session. Clear it to remove the note.",
      validateInput: value => /[\r\n]/.test(value) || value.length > 300 ? "Use one line of up to 300 characters." : undefined });
    if (text === undefined) return;
    await this.saveNote(root, branch, { text, file, line });
  }

  async saveNote(root: string, branch: string, note: Note) {
    await this.state.update("note:" + key(root, branch), note.text.trim() ? { ...note, text: note.text.trim() } : undefined);
    this.changed();
  }

  async openFile(root: string) {
    const branch = await branchName(root);
    const note = branch && this.state.get<Note>("note:" + key(root, branch));
    if (!note || !note.file) return;
    const requested = path.resolve(root, note.file);
    const file = await realpath(requested).catch(() => "");
    if (!file || !inside(await realpath(root), file)) throw new Error("The bookmarked file is no longer in this workspace.");
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(requested));
    const pos = new vscode.Position(Math.min(note.line ?? 0, doc.lineCount - 1), 0);
    await vscode.window.showTextDocument(doc, { selection: new vscode.Range(pos, pos) });
  }

  async chooseCheck(root: string) {
    const folder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(root));
    const tasks = (await vscode.tasks.fetchTasks()).filter(task =>
      typeof task.scope === "object" && task.scope.uri.toString() === folder?.uri.toString() &&
      ["test", "build"].includes(task.group?.id ?? "") && !task.isBackground &&
      (task.execution instanceof vscode.ProcessExecution || task.execution instanceof vscode.ShellExecution));
    if (!tasks.length) throw new Error("Define a foreground test or build task for this folder in .vscode/tasks.json.");
    const pick = await vscode.window.showQuickPick(tasks.map(task => ({ label: task.name, description: task.source, task })),
      { title: "Run a workspace check", placeHolder: "Choose the build or test task to execute" });
    if (pick) await this.run(root, pick.task);
  }

  async run(root: string, task: vscode.Task) {
    const branch = await branchName(root);
    if (!branch) throw new Error("Open a Git workspace to record a check.");
    const id = key(root, branch);
    if (this.pending.has(id)) throw new Error("A check is already running on this branch.");
    this.pending.add(id);
    this.changed();
    try {
      const fingerprint = await worktreeFingerprint(root);
      const runId = randomUUID();
      await this.state.update("check:" + id, { id: runId, task: task.name, at: Date.now(), fingerprint });
      const execution = await vscode.tasks.executeTask(task);
      this.runs.set(execution, { id: runId, key: id, task: task.name, fingerprint });
      const completed = this.early.get(execution);
      if (completed) await this.saveResult(execution, completed.exit);
    } catch (error) {
      this.pending.delete(id);
      this.changed();
      throw error;
    }
  }
}
