import * as vscode from "vscode";
import { apiCall, type Connection, request } from "./api";
import { fetchCompanion } from "./companion";

interface Session {
  connection: Connection;
  since: number;
  started: Promise<boolean>;
  timer?: ReturnType<typeof setTimeout>;
  pending?: Promise<void>;
}

let active: Session | null = null;

export function startSession(connection: Connection) {
  if (active?.connection === connection) return;
  const session: Session = {
    connection, since: Date.now(),
    started: request<{ success: boolean }>(connection, "/api/vscode/session/start", "POST")
      .then(result => result.data?.success === true),
  };
  active = session;
  void session.started.then(ok => { if (!ok && active === session) active = null; });
}

async function sendSave(session: Session) {
  if (!await session.started) return;
  const result = await request<{ xpGained: number }>(session.connection, "/api/vscode/save", "POST");
  if (result.data?.xpGained && active === session) await fetchCompanion();
}

export function onFileSaved() {
  const session = active;
  if (!session || session.timer) return;
  session.timer = setTimeout(() => {
    session.timer = undefined;
    session.pending = sendSave(session);
  }, 30_000);
}

export async function endSession() {
  const session = active;
  if (!session) return;
  active = null;
  const durationMinutes = Math.floor((Date.now() - session.since) / 60_000);
  if (session.timer) clearTimeout(session.timer);
  if (!await session.started) return;
  await session.pending;
  if (session.timer) await sendSave(session);
  await request(session.connection, "/api/vscode/session/end", "POST", { durationMinutes });
}

export async function syncXP() {
  const result = await apiCall<{
    success: boolean;
    xpGained: number;
    newCommits: number;
  }>("/api/github/sync", "POST");

  if (result?.success) {
    if (result.xpGained > 0) {
      vscode.window.showInformationMessage(
        `🚀 DevPet: Synced ${result.newCommits} commits! +${result.xpGained} XP`
      );
      await fetchCompanion();
    } else {
      vscode.window.showInformationMessage(
        "💪 DevPet: No new commits found. Keep shipping!"
      );
    }
  } else {
    vscode.window.showErrorMessage(
      "DevPet: Failed to sync XP. Check your API token in settings."
    );
  }
}
