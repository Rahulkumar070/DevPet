import * as vscode from "vscode";
import { registerWorkspaceView } from "./workspaceView";
import { showPushHistory } from "./history";
import { getConfig, initializeCredentials, saveToken, connectionFor, request, serverUrl, type Connection } from "./api";
import {
  initStatusBar, selectConnection,
  fetchCompanion,
  startFetchInterval,
  stopFetchInterval,
  showCompanionStatus,
  updateStatusBar,
} from "./companion";
import { startSession, endSession, onFileSaved, syncXP } from "./xp";
import {
  onFileSavedSecurityCheck,
  runFullSecurityScan,
  installPrePushHook,
} from "./security";

async function chooseRoot() {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) {
    vscode.window.showInformationMessage("Open a Git repository folder first.");
    return;
  }
  const folder = folders.length === 1 ? folders[0] : await vscode.window.showWorkspaceFolderPick();
  return folder?.uri.fsPath;
}

let selected: Connection | null = null;
let selection = 0;

async function refresh() {
  const connection = selected;
  if (connection && await fetchCompanion() && selected === connection) startSession(connection);
}

async function connect() {
  const version = ++selection;
  const connection = await connectionFor(getConfig().apiUrl);
  if (version !== selection) return;
  if (connection && selected?.apiUrl === connection.apiUrl && selected.token === connection.token) return;
  stopFetchInterval();
  const closing = endSession();
  selected = connection;
  selectConnection(connection);
  await closing;
  if (!connection || selected !== connection) return;
  startFetchInterval(refresh);
  await refresh();
}

export async function activate(context: vscode.ExtensionContext) {
  console.log("[DevPet] Activating...");

  await initializeCredentials(context.secrets);

  // Initialize status bar
  initStatusBar(context);

  registerWorkspaceView(context, chooseRoot);

  // Register all commands
  context.subscriptions.push(
    vscode.commands.registerCommand("devpet.openDashboard", async () => {
      const { apiUrl } = getConfig();
      try {
        await vscode.env.openExternal(vscode.Uri.parse(serverUrl(apiUrl) + "/dashboard"));
      } catch {
        vscode.window.showErrorMessage("Set devpet.apiUrl to an HTTPS server or a local development URL.");
      }
    }),

    vscode.commands.registerCommand("devpet.syncXP", syncXP),

    vscode.commands.registerCommand("devpet.setToken", async () => {
      const { apiUrl } = getConfig();
      const token = await vscode.window.showInputBox({
        prompt:
          `Enter the DevPet token from ${apiUrl}/settings (API tab)`,
        password: true,
        placeHolder: "devpet_xxxxxxxxxxxxxxxx",
        validateInput: (value) =>
          !value?.trim() ? "Token cannot be empty" : null,
      });

      if (!token) return;

      const candidate = { apiUrl, token: token.trim() };
      const result = await request<{ username: string }>(candidate, "/api/user/token");
      if (!result.data?.username) {
        vscode.window.showErrorMessage(result.status === 401 || result.status === 403
          ? "DevPet rejected this token. Generate a token on the selected server in Settings → API."
          : "Could not verify this token. Check devpet.apiUrl and that the server is running.");
        return;
      }
      await saveToken(candidate);
      if (apiUrl === getConfig().apiUrl && (selected?.apiUrl !== apiUrl || selected.token !== candidate.token)) await connect();
      vscode.window.showInformationMessage("DevPet token verified for " + result.data.username + ".");
    }),

    vscode.commands.registerCommand("devpet.showStatus", showCompanionStatus),

    vscode.commands.registerCommand("devpet.scanSecurity", async () => {
      const root = await chooseRoot();
      if (root) await runFullSecurityScan(root);
    }),

    vscode.commands.registerCommand("devpet.installPrePushHook", async () => {
      const root = await chooseRoot();
      if (root) await installPrePushHook(root);
    }),
    vscode.commands.registerCommand("devpet.pushHistory", async () => {
      const root = await chooseRoot();
      if (!root) return;
      try {
        await showPushHistory(root);
      } catch {
        vscode.window.showErrorMessage("Could not read local push history for this repository.");
      }
    }),
  );

  // On file save: award XP + security check
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (document) => {
      if (document.uri.scheme === "file" && vscode.workspace.getWorkspaceFolder(document.uri)) onFileSaved();
      await onFileSavedSecurityCheck(document); // Security
    }),
  );

  // On config change
  context.subscriptions.push(
    context.secrets.onDidChange(async event => {
      if (event.key === getConfig().apiUrl) await connect();
    }),
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (e.affectsConfiguration("devpet.apiUrl")) {
        await connect();
      }
      if (e.affectsConfiguration("devpet.showInStatusBar")) {
        updateStatusBar();
      }
    }),
  );

  await connect();
}

export async function deactivate() {
  console.log("[DevPet] Deactivating...");
  stopFetchInterval();
  ++selection;
  selected = null;
  selectConnection(null);
  await endSession();
}
