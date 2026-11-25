import * as vscode from "vscode";
import fetch from "node-fetch";

export const localServer = "http://localhost:3000";
export interface Connection { apiUrl: string; token: string }

export function getConfig() {
  const config = vscode.workspace.getConfiguration("devpet");
  return {
    apiUrl: (config.get<string>("apiUrl") ?? localServer).replace(/\/+$/, ""),
    showInStatusBar: config.get<boolean>("showInStatusBar") ?? true,
    securityScanEnabled: config.get<boolean>("securityScanEnabled") ?? true,
    securityScanOnSave: config.get<boolean>("securityScanOnSave") ?? true,
  };
}

let secrets: vscode.SecretStorage;

export async function initializeCredentials(storage: vscode.SecretStorage) {
  secrets = storage;
  const config = vscode.workspace.getConfiguration("devpet");
  const legacy = config.inspect<string>("apiToken")?.globalValue;
  const oldDefault = "https://devpet.dev";
  if (config.inspect<string>("apiUrl")?.globalValue === undefined &&
      (legacy || await secrets.get(oldDefault)) && getConfig().apiUrl === localServer) {
    await config.update("apiUrl", oldDefault, vscode.ConfigurationTarget.Global);
  }
  if (legacy) {
    const key = getConfig().apiUrl;
    if (!await secrets.get(key)) await secrets.store(key, legacy);
    await config.update("apiToken", undefined, vscode.ConfigurationTarget.Global);
  }
}

export async function connectionFor(apiUrl: string): Promise<Connection | null> {
  const token = await secrets.get(apiUrl);
  return token ? { apiUrl, token } : null;
}

export function saveToken(connection: Connection) {
  return secrets.store(connection.apiUrl, connection.token);
}

export function serverUrl(value: string) {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash || (url.protocol !== "https:" &&
      !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))) {
    throw new Error("Use HTTPS or a local development URL");
  }
  return url.href.replace(/\/+$/, "");
}

export async function request<T>(connection: Connection, path: string, method: "GET" | "POST" = "GET", body?: object) {
  try {
    const res = await fetch(serverUrl(connection.apiUrl) + path, {
      method, timeout: 8000, redirect: "error",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + connection.token },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: res.status, data: res.ok ? await res.json() as T : null };
  } catch {
    return { status: 0, data: null };
  }
}

export async function apiCall<T>(path: string, method: "GET" | "POST" = "GET", body?: object): Promise<T | null> {
  const connection = await connectionFor(getConfig().apiUrl);
  return connection ? (await request<T>(connection, path, method, body)).data : null;
}
