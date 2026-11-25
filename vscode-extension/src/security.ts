import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "node:child_process";
import { protectedPath } from "./pushGuard";
import { installHook } from "./hookInstall";
import { getConfig } from "./api";
import { connectionFor, request } from "./api";
import { updateStatusBar, getCompanion } from "./companion";
import {
  SENSITIVE_FILENAMES,
  SENSITIVE_CONTENT_PATTERNS,
  SAFE_EXTENSIONS,
  SKIP_DIRECTORIES,

} from "./constants";

export interface SecurityIssue {
  filePath: string;
  type: "filename" | "content";
  label: string;
  severity: "critical" | "warning";
  line?: number;
}

// ─── File Name Check ──────────────────────────────────────────────────────────

function isSensitiveFilename(filename: string): boolean {
  const relative = filename.split(path.sep).join("/").toLowerCase();
  if (protectedPath(relative)) return true;
  const basename = path.basename(filename).toLowerCase();

  for (const pattern of SENSITIVE_FILENAMES) {
    if (pattern.includes("*")) {
      const ext = pattern.replace("*", "");
      if (basename.endsWith(ext)) return true;
    } else {
      if (basename === pattern.toLowerCase() || ("/" + relative).endsWith("/" + pattern.toLowerCase())) return true;
    }
  }

  return false;
}

// ─── Content Check ────────────────────────────────────────────────────────────

function scanFileContent(content: string, filePath: string): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  const ext = path.extname(filePath).toLowerCase();

  // Skip binary/safe files
  if (SAFE_EXTENSIONS.includes(ext)) return issues;

  // Skip very large files (> 1MB)
  if (content.length > 1024 * 1024) return issues;

  const lines = content.split("\n");

  for (const { pattern, label, severity } of SENSITIVE_CONTENT_PATTERNS) {
    pattern.lastIndex = 0; // Reset regex state

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip commented lines
      if (
        line.trimStart().startsWith("//") ||
        line.trimStart().startsWith("#") ||
        line.trimStart().startsWith("*")
      ) {
        continue;
      }

      // Skip example/placeholder values
      if (
        line.includes("YOUR_KEY_HERE") ||
        line.includes("your-api-key") ||
        line.includes("xxxx") ||
        line.includes("placeholder") ||
        line.includes("example")
      ) {
        continue;
      }

      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        issues.push({
          filePath,
          type: "content",
          label,
          severity,
          line: i + 1,
        });
        break; // One issue per pattern per file
      }
    }
  }

  return issues;
}

// ─── Gitignore Check ─────────────────────────────────────────────────────────

function isInGitignore(filePath: string, workspaceRoot: string): boolean {
  return spawnSync("git", ["check-ignore", "-q", "--", path.relative(workspaceRoot, filePath)], { cwd: workspaceRoot }).status === 0;
}

// ─── Scan Single File ─────────────────────────────────────────────────────────

export function scanFile(
  filePath: string,
  workspaceRoot: string,
  checkIgnore = true
): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  const filename = path.basename(filePath);

  // Git applies ignore rules only to untracked paths.
  if (checkIgnore && isInGitignore(filePath, workspaceRoot)) return issues;

  // Check filename
  if (isSensitiveFilename(path.relative(workspaceRoot, filePath))) {
    issues.push({
      filePath,
      type: "filename",
      label: `Sensitive filename: ${filename}`,
      severity: "critical",
    });
  }

  // Check content
  try {
    const stat = fs.lstatSync(filePath);
    if (!stat.isFile() || stat.size > 1024 * 1024) return issues;
    const content = fs.readFileSync(filePath, "utf-8");
    const contentIssues = scanFileContent(content, filePath);
    issues.push(...contentIssues);
  } catch {
    // File not readable — skip
  }

  return issues;
}

// ─── Scan Entire Project ──────────────────────────────────────────────────────

export async function scanProject(
  workspaceRoot: string
): Promise<SecurityIssue[]> {
  const allIssues: SecurityIssue[] = [];

  const listed = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z", "--", "."], {
    cwd: workspaceRoot, encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
  });
  if (listed.status === 0) {
    for (const name of new Set(listed.stdout.split("\0").filter(Boolean))) {
      const full = path.join(workspaceRoot, name);
      if (fs.existsSync(full)) allIssues.push(...scanFile(full, workspaceRoot, false));
    }
    return allIssues;
  }

  function walkDir(dir: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!SKIP_DIRECTORIES.includes(entry.name)) {
          walkDir(fullPath);
        }
      } else if (entry.isFile()) {
        const issues = scanFile(fullPath, workspaceRoot, false);
        allIssues.push(...issues);
      }
    }
  }

  walkDir(workspaceRoot);
  return allIssues;
}

// ─── Show Security Warning ────────────────────────────────────────────────────

export async function showSecurityWarning(
  issues: SecurityIssue[],
  context: "save" | "scan"
): Promise<void> {
  if (issues.length === 0) return;

  const companion = getCompanion();
  const petName = companion?.name ?? "Your companion";

  const criticalIssues = issues.filter((i) => i.severity === "critical");
  const warningIssues = issues.filter((i) => i.severity === "warning");

  // Update status bar to show security alert
  updateStatusBar({
    text: `🛡️ ${petName} found a potential exposure`,
    tooltip: `DevPet Security: ${issues.length} sensitive item(s) detected`,
    command: "devpet.scanSecurity",
  });

  // Build message
  const issueLines = issues.slice(0, 5).map((issue) => {
    const lineInfo = issue.line ? ` (line ${issue.line})` : "";
    return `• ${issue.label}${lineInfo} in ${path.basename(issue.filePath)}`;
  });

  if (issues.length > 5) {
    issueLines.push(`• ...and ${issues.length - 5} more`);
  }

  const message =
    context === "save"
      ? `🛡️ ${petName} detected sensitive data in your file!`
      : `🛡️ Security scan found ${issues.length} issue(s) in your project`;

  const connection = await connectionFor(getConfig().apiUrl);
  const action = await vscode.window.showWarningMessage(
    message,
    { modal: true, detail: issueLines.join("\n") },
    "Fix Now (Open Files)",
    "Add to .gitignore",
    "Ignore"
  );

  if (action === "Fix Now (Open Files)") {
    // Open the first affected file
    const firstIssue = issues[0];
    const doc = await vscode.workspace.openTextDocument(firstIssue.filePath);
    await vscode.window.showTextDocument(doc, {
      selection: firstIssue.line
        ? new vscode.Range(firstIssue.line - 1, 0, firstIssue.line - 1, 0)
        : undefined,
    });
  } else if (action === "Add to .gitignore") {
    await addToGitignore(
      issues.map((i) => i.filePath),
      vscode.workspace.getWorkspaceFolder(vscode.Uri.file(issues[0].filePath))?.uri.fsPath ?? ""
    );
  }

  // Award XP for catching a security issue (report to API)
  if (connection) await request(connection, "/api/vscode/security-catch", "POST", {
    issuesFound: issues.length,
    criticalCount: criticalIssues.length,
    warningCount: warningIssues.length,
  }).catch(() => {}); // Non-blocking

  // Reset status bar after 10 seconds
  setTimeout(() => {
    const { showInStatusBar } = getConfig();
    if (showInStatusBar) {
      updateStatusBar();
    }
  }, 10000);
}

// ─── Add to .gitignore ────────────────────────────────────────────────────────

async function addToGitignore(
  filePaths: string[],
  workspaceRoot: string
): Promise<void> {
  if (!workspaceRoot) return;

  const gitignorePath = path.join(workspaceRoot, ".gitignore");
  const patterns = new Set<string>();
  for (const file of filePaths) {
    const relative = path.relative(workspaceRoot, file).split(path.sep).join("/");
    if (!relative || relative.startsWith("../") || path.isAbsolute(relative) || /[\r\n]/.test(relative)) {
      vscode.window.showWarningMessage("Could not represent the selected path safely in .gitignore.");
      return;
    }
    // Match this path literally, including spaces and Git glob characters.
    patterns.add("/" + Array.from(relative, c => "\\*?[] ".includes(c) ? "\\" + c : c).join(""));
  }
  const stat = fs.lstatSync(gitignorePath, { throwIfNoEntry: false });
  if (stat && !stat.isFile()) {
    vscode.window.showWarningMessage("DevPet can only update a regular .gitignore file.");
    return;
  }
  const existing = new Set(stat ? fs.readFileSync(gitignorePath, "utf-8").split(/\r?\n/) : []);
  const toAdd = [...patterns].filter(pattern => !existing.has(pattern));

  if (toAdd.length === 0) {
    vscode.window.showInformationMessage(
      "DevPet: These files are already in .gitignore ✅"
    );
    return;
  }

  const addition = `\n# Added by DevPet Security Scanner\n${toAdd.join("\n")}\n`;
  fs.appendFileSync(gitignorePath, addition);

  vscode.window.showInformationMessage(
    `Added ${toAdd.join(", ")} to .gitignore. Already committed versions remain in history.`
  );
}

// ─── Install Pre-Push Hook ────────────────────────────────────────────────────

export async function installPrePushHook(workspaceRoot: string): Promise<void> {
  if (!vscode.workspace.isTrusted || !workspaceRoot) return;
  try {
    installHook(workspaceRoot);
    vscode.window.showInformationMessage("DevPet’s local pre-push check is installed. It also runs for terminal pushes.");
  } catch (error) {
    vscode.window.showErrorMessage(error instanceof Error ? error.message : "Could not install DevPet’s hook.");
  }
}

// ─── On Save Handler ──────────────────────────────────────────────────────────

export async function onFileSavedSecurityCheck(
  document: vscode.TextDocument
): Promise<void> {
  const { securityScanEnabled, securityScanOnSave } = getConfig();
  if (!securityScanEnabled || !securityScanOnSave) return;

  const workspaceRoot = vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath;
  if (!workspaceRoot || document.uri.scheme !== "file") return;
  const filePath = document.uri.fsPath;

  const issues = scanFile(filePath, workspaceRoot);

  if (issues.length > 0) {
    await showSecurityWarning(issues, "save");
  }
}

// ─── Full Project Scan Command ────────────────────────────────────────────────

export async function runFullSecurityScan(workspaceRoot: string): Promise<void> {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "🔍 DevPet: Scanning project for sensitive files...",
      cancellable: false,
    },
    async () => {
      const issues = await scanProject(workspaceRoot);

      if (issues.length === 0) {
        const companion = getCompanion();
        const petName = companion?.name ?? "Your companion";
        vscode.window.showInformationMessage(
          `✅ ${petName} says: All clear! No sensitive files detected. The pre-push hook checks committed changes separately.`
        );
      } else {
        await showSecurityWarning(issues, "scan");
      }
    }
  );
}
