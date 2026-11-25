// Installed as a standalone Node program. Keep runtime imports in Node's standard library.
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function git(args: string[], cwd = process.cwd()) {
  const result = spawnSync("git", args, {
    cwd, timeout: 30_000, maxBuffer: 32 * 1024 * 1024, env: { ...process.env, GIT_NO_REPLACE_OBJECTS: "1", GIT_NO_LAZY_FETCH: "1", GIT_TERMINAL_PROMPT: "0" },
  });
  if (result.error || result.status !== 0) throw new Error(`Git could not complete ${args[0]}. Fetch the destination history and retry.`);
  return result.stdout;
}

export function commonDirectory(cwd: string) {
  return git(["rev-parse", "--path-format=absolute", "--git-common-dir"], cwd).toString().trimEnd();
}

export function protectedPath(name: string) {
  if (/(?:^|\/)\.claude\/(?:settings\.local\.json$|projects\/.+\.jsonl$)/i.test(name)) return true;
  return /(?:^|\/)(?:\.env(?:\..+)?|id_(?:rsa|dsa|ecdsa|ed25519)|credentials\.json|service-account\.json|secrets\.ya?ml|secrets\.json|\.aws\/credentials|config\/master\.key|\.htpasswd)$/i.test(name)
    && !/\.env\.(?:[\w-]+\.)*(?:example|sample|template)$/i.test(name)
    || /\.(?:pem|key|pfx|p12|keystore|jks)$/i.test(name);
}

// Only high-confidence indicators block a push. Editor hints have a broader rule set.
const credentials = /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{50,}\b|\bsk-ant-[A-Za-z0-9_-]{40,}\b|\bAKIA[A-Z0-9]{16}\b/;
const zero = /^0+$/;
const oid = /^(?:[a-f\d]{40}|[a-f\d]{64})$/;

interface Update { ref: string; before: string; after: string }

function parseUpdates(input: string): Update[] {
  if (!input.trim()) return [];
  return input.trimEnd().split("\n").map(line => {
    const fields = line.split(" ");
    if (fields.length !== 4 || !oid.test(fields[1]) || !oid.test(fields[3]) || !fields[2].startsWith("refs/")) {
      throw new Error("Unexpected Git ref update.");
    }
    return { ref: fields[2], before: fields[3], after: fields[1] };
  });
}

export interface PathChange { commit: string; name: string; status: string; reasons: string[] }

export function inspectUpdates(root: string, updates: Update[], visitCommit?: (commit: string) => void,
  visitPath?: (change: PathChange) => void) {
  const readGit = (args: string[]) => git(args, root);
  const seenCommits = new Set<string>();
  const paths = new Set<string>();
  const content = new Map<string, "clear" | "binary" | "credential">();
  const findings = new Set<string>();
  let binaryCount = 0;
  let error = "";
  try {
    if (updates.some(u => !zero.test(u.after)) && readGit(["rev-parse", "--is-shallow-repository"]).toString().trim() === "true") {
      throw new Error("Full local history is required for this check.");
    }
    for (const { before, after } of updates) {
      if (zero.test(after)) continue; // Deleting a ref introduces no new objects.
      const range = [after + "^{commit}"];
      if (!zero.test(before)) range.push("^" + before + "^{commit}");
      const commits = readGit(["rev-list", "--topo-order", ...range]).toString().trim();
      for (const commit of commits ? commits.split("\n") : []) {
        if (seenCommits.has(commit)) continue;
        seenCommits.add(commit);
        visitCommit?.(commit);
        const records = readGit(["diff-tree", "--root", "-m", "-r", "--raw", "-z", "--no-abbrev", "--no-commit-id", "--no-renames", commit]).toString().split("\0");
        for (let i = 0; i < records.length - 1; i += 2) {
          const [, mode, , blob, status] = records[i].split(" ");
          const name = records[i + 1];
          paths.add(name);
          const reasons: string[] = [];
          if (status === "D" || mode === "160000") {
            visitPath?.({ commit, name, status, reasons });
            continue;
          }
          if (protectedPath(name)) reasons.push("Protected file");
          if (!content.has(blob)) {
            const size = Number(readGit(["cat-file", "-s", blob]).toString());
            if (size > 16 * 1024 * 1024) throw new Error("File exceeds the 16 MiB inspection limit: " + JSON.stringify(name));
            const bytes = readGit(["cat-file", "blob", blob]);
            const binary = bytes.includes(0);
            content.set(blob, binary ? "binary" : credentials.test(bytes.toString("utf8")) ? "credential" : "clear");
            if (binary) binaryCount++;
          }
          if (content.get(blob) === "credential") reasons.push("Credential indicator");
          for (const reason of reasons) findings.add(reason + (reason === "Protected file" ? " " : " in ") + JSON.stringify(name));
          visitPath?.({ commit, name, status, reasons });
        }
      }
    }
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Could not inspect push";
  }
  return { error, findings, commitsInspected: seenCommits.size, changedPathsSeen: paths.size, blobsInspected: content.size, binaryBlobs: binaryCount };
}

export function runHook(remote?: string) {
  let updates: Update[] = [];
  let parseError = "";
  try {
    updates = parseUpdates(readFileSync(0, "utf8"));
    if (!updates.length) return;
  } catch {
    parseError = "Unexpected Git ref update.";
  }
  const { findings, error, ...counts } = inspectUpdates(process.cwd(), updates);
  let outcome = parseError || error ? "incomplete" : findings.size ? "blocked" : "passed";
  if (parseError || error) console.error("DevPet:", parseError || error);
  for (const finding of [...findings].slice(0, 10)) console.error("DevPet:", finding);
  try {
    const dir = join(commonDirectory(process.cwd()), "devpet", "push-checks");
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    const timestamp = new Date().toISOString();
    const alias = remote && /^[a-z0-9][a-z0-9_.-]{0,63}$/i.test(remote) && git(["remote"]).toString().split("\n").includes(remote) ? remote : null;
    const record = { version: 1, timestamp, outcome, remote: alias, updates, ...counts, findings: findings.size };
    writeFileSync(join(dir, Date.now() + "-" + randomUUID() + ".json"), JSON.stringify(record), { flag: "wx", mode: 0o600 });
  } catch {
    console.error("DevPet could not write the local push-check history.");
    outcome = "incomplete";
  }
  console.error(`DevPet pre-push: ${outcome}. ${counts.commitsInspected} commits, ${counts.changedPathsSeen} paths, ${counts.binaryBlobs} binary blobs (filename checks only).`);
  if (outcome !== "passed") process.exitCode = 1;
}

export function hookScript(compiled: string) {
  const program = compiled + "\nexports.runHook(process.argv[1]);";
  return "#!/bin/sh\n# DevPet managed pre-push v2\nexec node --input-type=commonjs -e '" + program.replace(/'/g, "'\\''") + "' \"$1\"\n";
}
