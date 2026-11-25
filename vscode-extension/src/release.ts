import * as vscode from "vscode";
import { readInventory, releaseReport, type Inventory } from "./releaseInventory";

export async function reviewRelease(context: vscode.ExtensionContext) {
  const files = await vscode.window.showOpenDialog({ canSelectMany: false, openLabel: "Review archive", filters: { "Release archives": ["vsix", "tgz", "gz"] } });
  if (!files?.length) return;
  const next = await vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: "Inspecting release contents" },
    () => readInventory(context.asAbsolutePath("resources/release_inventory.py"), files[0].fsPath));
  const key = "release:" + JSON.stringify([next.kind, next.name]);
  const previous = context.workspaceState.get<Inventory>(key);
  const doc = await vscode.workspace.openTextDocument({ language: "plaintext", content: releaseReport(next, previous) });
  await vscode.window.showTextDocument(doc, { preview: false });
  if (await vscode.window.showInformationMessage("Use this inventory as the approved comparison for " + next.name + " " + next.version + "?", "Approve inventory") === "Approve inventory") {
    if (context.workspaceState.get<Inventory>(key)?.digest !== previous?.digest) throw new Error("The approved inventory changed during review. Open the archive again to compare it.");
    await context.workspaceState.update(key, next);
  }
}
