// Executed by VS Code's extension test host in a disposable profile.
/* eslint-disable @typescript-eslint/no-require-imports */
const vscode = require("vscode");
const assert = require("node:assert/strict");
const http = require("node:http");
const path = require("node:path");
const { setTimeout: delay } = require("node:timers/promises");

async function until(predicate, description) {
  for (let attempt = 0; attempt < 200; attempt++) {
    if (predicate()) return;
    await delay(100);
  }
  throw new Error("Timed out waiting for " + description);
}

exports.run = async function () {
  const ext = vscode.extensions.getExtension("devpet.devpet");
  assert.ok(ext);
  await ext.activate();
  const commands = await vscode.commands.getCommands();
  for (const entry of ext.packageJSON.contributes.commands) assert.ok(commands.includes(entry.command), entry.command);
  const { saveToken } = require(path.join(ext.extensionPath, "out/api"));
  const { getCompanion, fetchCompanion } = require(path.join(ext.extensionPath, "out/companion"));
  const token = "devpet_local_fixture";
  const calls = [];
  let petStatus = 200;
  let level = 2;
  const pet = { name: "Cache", species: "gitfox", xp: 121, mood: "happy", evolutionStage: 1,
    rarity: "common", stats: { GRIND: 4, FOCUS: 5, SHIP: 6, SQUASH: 7, VIBE: 8 } };
  const server = http.createServer((req, res) => {
    calls.push(req.url);
    res.setHeader("Content-Type", "application/json");
    if (req.headers.authorization !== "Bearer " + token) res.statusCode = 401;
    else if (req.url === "/api/companion/active") res.statusCode = petStatus;
    if (req.url === "/api/github/sync") level++;
    res.end(JSON.stringify(req.url === "/api/companion/active" ? { ...pet, level } : { success: true, newCommits: 1, xpGained: 5 }));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const url = "http://127.0.0.1:" + server.address().port;
  const config = vscode.workspace.getConfiguration("devpet");
  try {
    await saveToken({ apiUrl: url, token });
    await config.update("apiUrl", url, vscode.ConfigurationTarget.Global);
    await until(() => calls.includes("/api/vscode/session/start") && getCompanion()?.name === "Cache", "initial pet and session");
    await vscode.commands.executeCommand("devpet.syncXP");
    assert.equal(getCompanion()?.level, 3);
    petStatus = 503;
    await fetchCompanion();
    assert.equal(getCompanion()?.name, "Cache");
    petStatus = 404;
    await fetchCompanion();
    assert.equal(getCompanion(), null);
    petStatus = 200;
    await fetchCompanion();
    assert.equal(getCompanion()?.name, "Cache");

    const folder = vscode.workspace.workspaceFolders[0].uri;
    const file = vscode.Uri.joinPath(folder, "app.txt");
    await vscode.workspace.fs.writeFile(file, Buffer.from("first line\n"));
    const doc = await vscode.workspace.openTextDocument(file);
    const edit = new vscode.WorkspaceEdit();
    edit.insert(file, new vscode.Position(0, 0), "second line\n");
    assert.ok(await vscode.workspace.applyEdit(edit));
    assert.ok(await doc.save());
    await vscode.commands.executeCommand("devpet.scanSecurity");
    await vscode.commands.executeCommand("devpet.installPrePushHook");
    const hook = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(folder, ".git", "hooks", "pre-push"));
    assert.match(Buffer.from(hook).toString(), /DevPet managed/);
    await vscode.commands.executeCommand("devpet.pushHistory");

    // Switch while the save timer is pending. Both final requests belong to the old session.
    await config.update("apiUrl", url + "/other", vscode.ConfigurationTarget.Global);
    await until(() => calls.includes("/api/vscode/session/end"), "session close");
    assert.equal(calls.filter(call => call === "/api/vscode/save").length, 1);
    assert.equal(calls.filter(call => call === "/api/vscode/session/start").length, 1);
    assert.ok(!calls.some(call => call.startsWith("/other")));
    assert.equal(getCompanion(), null);
    await require("./workspace-host.cjs")(ext, vscode.workspace.workspaceFolders[0]);
    await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(folder, ".devpet-test-passed"), Buffer.from("ok"));
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
};
