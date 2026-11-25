/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { setTimeout: delay } = require("node:timers/promises");
const path = require("node:path");
const vscode = require("vscode");

module.exports = async function checkWorkspaceTools(ext, folder) {
  const root = folder.uri.fsPath;
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  const { BranchMemory } = require(path.join(ext.extensionPath, "out/branchMemory"));
  const { scanReview } = require(path.join(ext.extensionPath, "out/reviewScan"));
  const { reviewRows } = require(path.join(ext.extensionPath, "out/workspaceView"));
  const { reviewOutgoing } = require(path.join(ext.extensionPath, "out/outgoing"));
  const { readInventory } = require(path.join(ext.extensionPath, "out/releaseInventory"));
  const subscriptions = [];
  const state = new Map();
  const memory = new BranchMemory({ get: k => state.get(k), update: async (k,v) => state.set(k,v) }, { subscriptions }, () => {});
  async function checkTask(code) {
    const task = new vscode.Task({ type: "process" }, folder, "DevPet fixture " + code, "devpet-test",
      new vscode.ProcessExecution(process.platform === "win32" ? process.env.ComSpec : "/bin/sh",
        process.platform === "win32" ? ["/c", "exit " + code] : ["-c", "exit " + code]));
    task.group = vscode.TaskGroup.Test;
    task.presentationOptions = { reveal: vscode.TaskRevealKind.Never };
    await memory.run(root, task);
    for (let i = 0; i < 100; i++) {
      const view = await memory.view(root);
      if (!view.running && view.check?.exit !== undefined) return view;
      await delay(100);
    }
    throw new Error("Workspace task did not finish");
  }
  try {
    git("config", "user.name", "DevPet fixture"); git("config", "user.email", "fixture@localhost");
    git("add", "app.txt"); git("commit", "-qm", "start fixture");
    const branch = git("branch", "--show-current");
    const base = git("rev-parse", "HEAD");
    git("remote", "add", "fixture", path.join(path.dirname(root), "bare.git"));
    git("update-ref", "refs/remotes/fixture/main", base);
    git("branch", "--set-upstream-to=fixture/main", branch);
    const env = vscode.Uri.joinPath(folder.uri, ".env.local");
    await vscode.workspace.fs.writeFile(env, Buffer.from("COLOR=blue"));
    git("add", ".env.local"); git("commit", "-qm", "add fixture");
    const introduced = git("rev-parse", "HEAD");
    git("rm", "-q", ".env.local"); git("commit", "-qm", "remove fixture");
    const preview = await reviewOutgoing(root, "fixture", "main");
    const scan = await scanReview({ root, head: preview.head, base: preview.base });
    const rows = reviewRows({ root, remote: "fixture", branch: "main" }, preview, scan);
    assert.equal(rows.flagged, 1);
    const finding = rows.rows.find(row => row.label === "1 flagged file(s)").children[0];
    assert.deepEqual(finding.command.arguments, [root, introduced, ".env.local"]);
    // Exercise the registered command and accept the prefilled upstream destination.
    let reviewing = true;
    const command = vscode.commands.executeCommand("devpet.reviewOutgoing").then(() => { reviewing = false; });
    for (let i = 0; reviewing && i < 40; i++) {
      await delay(150);
      if (reviewing) await vscode.commands.executeCommand("workbench.action.acceptSelectedQuickOpenItem");
    }
    assert.equal(reviewing, false, "The push review command should finish");
    await command;
    await vscode.commands.executeCommand(finding.command.command, ...finding.command.arguments);
    assert.match(vscode.window.activeTextEditor.document.getText(), /COLOR=blue/);
    await vscode.commands.executeCommand("devpet.checkAgain");
    await vscode.commands.executeCommand("devpet.resumeBranch");

    await memory.saveNote(root, branch, { text: "Recheck expiry", file: "app.txt", line: 0 });
    git("checkout", "-qb", "other-task");
    assert.equal((await memory.view(root)).note, undefined);
    git("checkout", "-q", branch);
    assert.equal((await memory.view(root)).note.text, "Recheck expiry");
    await memory.openFile(root);
    assert.equal(vscode.window.activeTextEditor.document.uri.fsPath, path.join(root, "app.txt"));
    const passed = await checkTask(0);
    assert.equal(passed.check.exit, 0); assert.equal(passed.freshness, "Current");
    await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(folder.uri, "new-test.txt"), Buffer.from("fixture"));
    assert.equal((await memory.view(root)).freshness, "Out of date");
    const failed = await checkTask(3); assert.equal(failed.check.exit, 3);
    await memory.saveNote(root, branch, { text: "" });
    assert.equal((await memory.view(root)).note, undefined);
    const release = await readInventory(path.join(ext.extensionPath, "resources/release_inventory.py"), path.join(path.dirname(root), "fixture.vsix"));
    assert.ok(release.entries.some(e => e.name === "extension/out/workspaceView.js"));
  } finally {
    for (const item of subscriptions) item.dispose();
  }
};
