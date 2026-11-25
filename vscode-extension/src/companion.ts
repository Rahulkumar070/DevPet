import * as vscode from "vscode";

import { type Connection, request, getConfig, serverUrl } from "./api";
import { MOOD_EMOJI, SPECIES_EMOJI } from "./constants";

export interface Companion {
  name: string;
  species: string;
  level: number;
  xp: number;
  mood: "happy" | "neutral" | "hungry" | "sleepy" | "excited";
  evolutionStage: 1 | 2 | 3;
  rarity: string;
  stats: {
    GRIND: number;
    FOCUS: number;
    SHIP: number;
    SQUASH: number;
    VIBE: number;
  };
}

let companion: Companion | null = null;
let statusBarItem: vscode.StatusBarItem;
let current: Connection | null = null;
let revision = 0;
let state: "disconnected" | "loading" | "ready" | "empty" | "offline" | "invalid" = "disconnected";
let fetchInterval: ReturnType<typeof setInterval> | null = null;

export function getCompanion(): Companion | null {
  return companion;
}

export function selectConnection(connection: Connection | null) {
  current = connection;
  revision++;
  companion = null;
  state = connection ? "loading" : "disconnected";
  updateStatusBar();
}

const messages = {
  disconnected: "Connect your companion with a DevPet API token.",
  loading: "Loading your companion…",
  empty: "Token accepted. Hatch or select a companion in DevPet.",
  offline: "Could not refresh your companion. Check the server address and connection.",
  invalid: "This server rejected your token. Generate a token in Settings → API.",
  ready: "",
};

export function initStatusBar(context: vscode.ExtensionContext) {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  context.subscriptions.push(statusBarItem);
  updateStatusBar();
}

export function updateStatusBar(override?: {
  text: string;
  tooltip: string;
  command?: string;
}) {
  const { showInStatusBar } = getConfig();

  if (!showInStatusBar) {
    statusBarItem.hide();
    return;
  }

  if (override) {
    statusBarItem.text = override.text;
    statusBarItem.tooltip = override.tooltip;
    statusBarItem.command = override.command ?? "devpet.showStatus";
    statusBarItem.show();
    return;
  }

  if (state !== "ready" || !companion) {
    statusBarItem.text = state === "offline" && companion ? `🐾 ${companion.name} · offline` :
      state === "empty" ? "🥚 Hatch a DevPet" : "🐾 DevPet";
    statusBarItem.tooltip = messages[state];
    statusBarItem.command = state === "invalid" || state === "disconnected" ? "devpet.setToken" : "devpet.showStatus";
    statusBarItem.show();
    return;
  }

  const moodEmoji = MOOD_EMOJI[companion.mood] ?? "😊";
  statusBarItem.text = `${moodEmoji} ${companion.name} Lv.${companion.level}`;
  statusBarItem.tooltip = buildTooltip();
  statusBarItem.command = "devpet.openDashboard";
  statusBarItem.show();
}

function buildTooltip(): string {
  if (!companion) return "DevPet";

  const speciesEmoji = SPECIES_EMOJI[companion.species] ?? "🐾";
  const moodEmoji = MOOD_EMOJI[companion.mood] ?? "😊";
  const evoLabel =
    companion.evolutionStage === 3
      ? "Final Form ✨"
      : companion.evolutionStage === 2
        ? "Teen"
        : "Baby";

  return [
    `${speciesEmoji} ${companion.name}`,
    `${companion.rarity} ${companion.species} • ${evoLabel}`,
    `Level ${companion.level}`,
    `Mood: ${moodEmoji} ${companion.mood}`,
    ``,
    `GRIND ${companion.stats.GRIND} | FOCUS ${companion.stats.FOCUS} | SHIP ${companion.stats.SHIP}`,
    `SQUASH ${companion.stats.SQUASH} | VIBE ${companion.stats.VIBE}`,
    ``,
    `Click to open dashboard`,
  ].join("\n");
}

export async function fetchCompanion() {
  if (!current) return false;
  const version = ++revision;
  const { status, data } = await request<Companion>(current, "/api/companion/active");
  if (version !== revision) return false;
  if (status === 401 || status === 403 || status === 404) {
    companion = null;
    state = status === 404 ? "empty" : "invalid";
  } else if (data?.name && data.stats && Number.isFinite(data.level)) {
    companion = data;
    state = "ready";
  } else {
    state = "offline";
  }
  updateStatusBar();
  return state === "ready" || state === "empty";
}

export function startFetchInterval(refresh: () => Promise<void>) {
  stopFetchInterval();
  fetchInterval = setInterval(refresh, 5 * 60 * 1000);
}

export function stopFetchInterval() {
  if (fetchInterval) {
    clearInterval(fetchInterval);
    fetchInterval = null;
  }
}

export async function showCompanionStatus() {
  await fetchCompanion();
  if (state !== "ready" || !companion) {
    const action = state === "empty" ? "Open Hatchery" :
      state === "invalid" || state === "disconnected" ? "Set Token" : "Open Settings";
    if (await vscode.window.showInformationMessage(messages[state], action) === action) {
      if (action === "Set Token") await vscode.commands.executeCommand("devpet.setToken");
      else if (action === "Open Hatchery" && current) await vscode.env.openExternal(vscode.Uri.parse(serverUrl(current.apiUrl) + "/hatch"));
      else await vscode.commands.executeCommand("workbench.action.openSettings", "devpet.apiUrl");
    }
    return;
  }

  const speciesEmoji = SPECIES_EMOJI[companion.species] ?? "🐾";
  const moodEmoji = MOOD_EMOJI[companion.mood] ?? "😊";

  const action = await vscode.window.showInformationMessage(
    `${speciesEmoji} ${companion.name} (${companion.rarity}) • Lv.${companion.level} • ${moodEmoji} ${companion.mood}`,
    "Open Dashboard",
    "Sync XP",
    "Scan Security"
  );

  if (action === "Open Dashboard") {
    await vscode.commands.executeCommand("devpet.openDashboard");
  } else if (action === "Sync XP") {
    await vscode.commands.executeCommand("devpet.syncXP");
  } else if (action === "Scan Security") {
    await vscode.commands.executeCommand("devpet.scanSecurity");
  }
}
