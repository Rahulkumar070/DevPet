import * as vscode from "vscode";
import * as path from "node:path";
import { BranchMemory, type MemoryView } from "./branchMemory";
import { getCompanion } from "./companion";
import { reviewCommitDiff, reviewDestination, reviewTargets } from "./outgoing";
import { scanReview, type Scan } from "./reviewScan";
import { branchName } from "./worktree";
import { reviewRelease } from "./release";

class Row extends vscode.TreeItem {
  constructor(label: string, readonly children: Row[] = [], icon?: string, command?: string, args?: unknown[]) {
    super(label, children.length ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
    if (icon) this.iconPath = new vscode.ThemeIcon(icon);
    if (command) this.command = { title: label, command, arguments: args };
  }
}
interface Destination { root: string; remote: string; branch: string }
type Preview = Awaited<ReturnType<typeof reviewDestination>>;
const action = (label: string, icon: string, cmd: string) => new Row(label, [], icon, "devpet." + cmd);
const quiet = () => vscode.workspace.getConfiguration("devpet").get<boolean>("quietMode", false);
const printable = (s: string) => JSON.stringify(s).slice(1, -1);

export function reviewRows(target: Destination, review: Preview, scan: Scan) {
  const byFile = new Map<string, Row[]>();
  const flagged = new Map<string, Row>();
  for (const change of scan.changes) {
    const reasons = change.reasons.join(", ");
    const row = new Row(change.status + " · " + change.commit.slice(0, 8) + (reasons ? " · " + reasons : ""),
      [], reasons ? "warning" : "git-commit", "devpet.reviewDiff", [target.root, change.commit, change.name]);
    if (reasons) flagged.set(change.name, row);
    const rows = byFile.get(change.name) ?? [];
    rows.push(row);
    byFile.set(change.name, rows);
  }
  const files = [...byFile].sort(([a], [b]) => Number(flagged.has(b)) - Number(flagged.has(a)) || a.localeCompare(b))
    .map(([file, rows]) => new Row(printable(file), rows, flagged.has(file) ? "warning" : "file"));
  const findings = [...flagged].map(([name, first]) => {
    const item = new Row(printable(name), [], "warning");
    item.command = first.command;
    item.description = "First flagged · " + String(first.label);
    return item;
  });
  const commits = scan.commits.map(id => new Row(id.slice(0, 12), [], "git-commit", "devpet.reviewDiff", [target.root, id]));
  const status = scan.error ? "Incomplete review" : flagged.size ? flagged.size + " flagged file(s)" : "No findings in inspected history";
  return { flagged: flagged.size, rows: [
    new Row(target.remote + " → " + target.branch, [], "repo"), new Row(review.endpoint + " · HEAD " + review.head.slice(0, 8)),
    new Row(review.base ? "Cached destination " + review.base.slice(0, 8) : "Unknown destination tip · entire reachable history"),
    ...(review.behind ? [new Row(review.behind + " destination-only commits", [], "warning")] : []),
    new Row(status, findings, scan.error || flagged.size ? "warning" : "pass"),
    ...(scan.error ? [new Row(scan.error)] : []),
    new Row("Files · " + files.length, files, "files"), new Row("Commits · " + commits.length, commits, "git-commit"),
  ] };
}

export function registerWorkspaceView(context: vscode.ExtensionContext, chooseRoot: () => Promise<string | undefined>) {
  const updates = new vscode.EventEmitter<void>();
  const provider: vscode.TreeDataProvider<Row> = { onDidChangeTreeData: updates.event, getTreeItem: item => item,
    getChildren: item => item ? item.children : roots() };
  const tree = vscode.window.createTreeView("devpet.workspace", { treeDataProvider: provider });
  const memory = new BranchMemory(context.workspaceState, context, () => schedule());
  let root = vscode.window.activeTextEditor && vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri)?.uri.fsPath
    || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  let memoryView: MemoryView | undefined;
  let lastVisit = "";
  let generation = 0;
  let target: Destination | undefined;
  let reviewVersion = 0;
  let reviewItems: Row[] = [];
  let previousFlagged = 0;
  let reviewBusy = false;
  let cancelScan: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function roots() {
    const name = getCompanion()?.name ?? "DevPet";
    const items: Row[] = [action("Review outgoing changes", "git-pull-request", "reviewOutgoing")];
    if (target) items.push(action("Check again", "refresh", "checkAgain"));
    if (reviewBusy) items.push(new Row(name + " is checking outgoing commits…", [], quiet() ? "search" : "loading~spin"));
    items.push(...reviewItems);
    const current = memoryView;
    if (current) {
      const note = current.note;
      const notes = [action(note ? "Edit branch note" : "Leave a branch note", "edit", "branchNote")];
      if (note) notes.unshift(new Row(note.text, [], "bookmark"));
      if (note?.file) notes.push(action(printable(note.file), "go-to-file", "openBranchFile"));
      const last = current.check;
      if (current.running) notes.push(new Row("Workspace check running…", [], "watch"));
      if (last) {
        const outcome = last.exit === undefined ? "Unknown result" : last.exit === 0 ? "Passed" : "Failed";
        const row = new Row(last.task + " · " + outcome + " · " + current.freshness, [], current.freshness === "Current" && last.exit === 0 ? "pass" : "history");
        row.description = new Date(last.at).toLocaleString();
        notes.push(row);
      }
      notes.push(action("Run a workspace check", "beaker", "runCheck"));
      const group = new Row("Where was I? · " + current.branch, notes, "history");
      group.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
      items.push(group);
    } else items.push(action("Where was I?", "history", "resumeBranch"));
    items.push(action("Review a release archive", "package", "reviewRelease"));
    return items;
  }
  async function refreshMemory() {
    const version = ++generation;
    const next = root ? await memory.view(root) : undefined;
    if (version !== generation) return;
    memoryView = next;
    const visit = JSON.stringify([root, next?.branch]);
    if (visit !== lastVisit && next?.note && !quiet() && !tree.visible) {
      void vscode.window.showInformationMessage("Next on " + next.branch + " · " + next.note.text, "Resume")
        .then(action => { if (action && lastVisit === visit) void vscode.commands.executeCommand("devpet.workspace.focus"); });
    }
    lastVisit = visit;
    updates.fire();
  }
  function schedule() {
    ++generation;
    clearTimeout(timer);
    timer = setTimeout(() => { void refreshMemory(); }, 350);
  }
  function selectRoot(folder: string) {
    if (root === folder) return;
    cancelScan?.abort();
    root = folder;
    memoryView = undefined;
    target = undefined;
    previousFlagged = 0;
    reviewItems = [];
    reviewBusy = false;
    ++reviewVersion;
    schedule();
    updates.fire();
  }
  function register(cmd: string, fn: (...args: never[]) => unknown) {
    context.subscriptions.push(vscode.commands.registerCommand("devpet." + cmd, async (...args: never[]) => {
      try { return await fn(...args); }
      catch (err) { vscode.window.showErrorMessage(err instanceof Error && !("cmd" in err) ? err.message : "DevPet could not read this Git workspace."); }
    }));
  }
  async function inspect(next: Destination) {
    if (reviewBusy && target?.root === next.root && target.remote === next.remote && target.branch === next.branch) return;
    cancelScan?.abort();
    const controller = new AbortController();
    cancelScan = controller;
    const version = ++reviewVersion;
    if (target?.root !== next.root || target?.remote !== next.remote || target?.branch !== next.branch) previousFlagged = 0;
    target = next;
    schedule();
    reviewBusy = true;
    reviewItems = [];
    updates.fire();
    try {
      const preview = await reviewDestination(next.root, next.remote, next.branch);
      if (controller.signal.aborted) return;
      const scan = await scanReview({ root: next.root, head: preview.head, base: preview.base }, controller.signal);
      if (version !== reviewVersion) return;
      const result = reviewRows(next, preview, scan);
      reviewItems = result.rows;
      if (!scan.error) {
        if (previousFlagged && !result.flagged && !quiet()) void vscode.window.showInformationMessage((getCompanion()?.name ?? "DevPet") + " checked again. The flagged files are clear.");
        previousFlagged = result.flagged;
      }
      return;
    } catch (error) {
      if (controller.signal.aborted) return;
      if (version === reviewVersion) reviewItems = [new Row("Incomplete review · check the destination and local history", [], "warning")];
      throw error;
    } finally {
      if (version === reviewVersion) { reviewBusy = false; updates.fire(); }
    }
  }
  register("reviewOutgoing", async () => {
    const folder = await chooseRoot();
    if (!folder) return;
    const targets = await reviewTargets(folder);
    if (!targets.remotes.length) throw new Error("Add a Git remote to review an outgoing branch.");
    const remote = targets.remotes.length === 1 ? targets.remotes[0] : await vscode.window.showQuickPick(targets.remotes, { title: "Review push destination" });
    if (!remote) return;
    const branch = await vscode.window.showInputBox({ title: "Review branch on " + remote,
      value: (remote === targets.remote && targets.upstreamBranch) || targets.branch, prompt: "Compare committed HEAD with a cached destination branch" });
    if (!branch) return;
    selectRoot(folder);
    await vscode.commands.executeCommand("devpet.workspace.focus");
    return inspect({ root: folder, remote, branch });
  });
  register("checkAgain", () => target ? inspect(target) : vscode.commands.executeCommand("devpet.reviewOutgoing"));
  register("reviewDiff", async (folder: string, id: string, file?: string) => {
    if (!target || folder !== target.root) return;
    const content = await reviewCommitDiff(folder, id, file);
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument({ language: "diff", content }));
  });
  register("resumeBranch", async () => {
    const folder = await chooseRoot();
    if (folder) { selectRoot(folder); await refreshMemory(); await vscode.commands.executeCommand("devpet.workspace.focus"); }
  });
  register("branchNote", async () => { if (root) { await memory.edit(root); await refreshMemory(); } });
  register("openBranchFile", async () => { if (root) await memory.openFile(root); });
  register("runCheck", async () => { if (root) await memory.chooseCheck(root); });
  register("reviewRelease", () => reviewRelease(context));
  const watcher = vscode.workspace.createFileSystemWatcher("**/*");
  function onFile(uri: vscode.Uri) {
    if (!root || !memoryView?.check || vscode.workspace.getWorkspaceFolder(uri)?.uri.fsPath !== root) return;
    if (!path.relative(root, uri.fsPath).split(path.sep).some(p => p === ".git" || p === "node_modules")) schedule();
  }
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => { if (e.affectsConfiguration("devpet.quietMode")) updates.fire(); }),
    tree, updates, watcher, watcher.onDidCreate(onFile), watcher.onDidChange(onFile), watcher.onDidDelete(onFile),
    vscode.workspace.onDidSaveTextDocument(doc => onFile(doc.uri)), tree.onDidChangeVisibility(e => { if (e.visible) schedule(); }),
    vscode.window.onDidChangeActiveTextEditor(editor => {
      const folder = editor && vscode.workspace.getWorkspaceFolder(editor.document.uri);
      if (folder) selectRoot(folder.uri.fsPath);
    }), { dispose: () => { ++generation; ++reviewVersion; cancelScan?.abort(); clearTimeout(timer); } });
  // VS Code watchers may exclude .git, including worktree HEAD files. Check the
  // branch while this view is visible, even if no editor document changed.
  const poll = setInterval(async () => {
    if (!root || (!tree.visible && !vscode.window.state.focused)) return;
    if ((await branchName(root)) !== (memoryView?.branch ?? null)) schedule();
    else if (tree.visible && memoryView?.check) schedule();
  }, 8000);
  context.subscriptions.push({ dispose: () => clearInterval(poll) });
  schedule();

}
