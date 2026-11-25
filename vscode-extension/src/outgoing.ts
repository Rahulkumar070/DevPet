import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

async function git(root: string, ...args: string[]) {
  const { stdout } = await exec("git", ["-c", "core.quotePath=true", ...args], {
    cwd: root, env: { ...process.env, GIT_NO_LAZY_FETCH: "1", GIT_TERMINAL_PROMPT: "0" }, maxBuffer: 8 * 1024 * 1024, timeout: 30_000,
  });
  return stdout.replace(/\n$/, "");
}

function missing(error: unknown) {
  return (error as { code?: number }).code === 1;
}

async function optionalGit(root: string, ...args: string[]) {
  try {
    return await git(root, ...args);
  } catch (error) {
    if (missing(error)) return "";
    throw error;
  }
}

export async function reviewTargets(root: string) {
  const remotes = (await git(root, "remote")).split("\n").filter(Boolean);
  const branch = await optionalGit(root, "symbolic-ref", "--quiet", "--short", "HEAD");
  const upstream = branch ? await git(root, "for-each-ref", "--format=%(upstream:remotename)%00%(upstream:remoteref)", "refs/heads/" + branch) : "";
  const [remote, ref = ""] = upstream.split("\0");
  return { remotes, branch, remote, upstreamBranch: ref.replace(/^refs\/heads\//, "") };
}

function destinationLabel(raw: string) {
  // Show only the GitHub owner/repo or host. Remote URLs may contain credentials.
  const scp = /^(?:[^/@:]+@)?([\w.-]+):([^/].*)$/.exec(raw);
  try {
    const url = scp ? new URL("ssh://" + scp[1] + "/" + scp[2]) : new URL(raw);
    if (!["https:", "http:", "ssh:", "git:"].includes(url.protocol)) return "local or custom transport";
    if (url.hostname === "github.com" && /^\/[\w.-]+\/[\w.-]+$/.test(url.pathname)) {
      return url.hostname + url.pathname.replace(/\.git$/, "");
    }
    return url.hostname;
  } catch {
    return "local or custom transport";
  }
}

export async function reviewDestination(root: string, remote: string, branch: string) {
  if (!(await reviewTargets(root)).remotes.includes(remote)) throw new Error("Select a configured Git remote.");
  try {
    await git(root, "check-ref-format", "refs/heads/" + branch);
  } catch {
    throw new Error("Enter a valid destination branch name.");
  }
  const head = await optionalGit(root, "rev-parse", "--verify", "--quiet", "HEAD^{commit}");
  if (!head) throw new Error("Create a commit before reviewing outgoing changes.");
  if (await git(root, "rev-parse", "--is-shallow-repository") === "true") {
    throw new Error("A complete history is required for an outgoing review. Fetch the full history and try again.");
  }
  const tracking = "refs/remotes/" + remote + "/" + branch;
  const destinations = (await git(root, "remote", "get-url", "--push", "--all", "--", remote)).split("\n");
  const fetchUrl = await git(root, "remote", "get-url", "--", remote);
  const sameDestination = destinations.length === 1 && destinations[0] === fetchUrl;
  const fetchSpec = await optionalGit(root, "config", "--get-all", "remote." + remote + ".fetch");
  const standardTracking = fetchSpec.replace(/^\+/, "") === "refs/heads/*:refs/remotes/" + remote + "/*";
  const symbolicTracking = sameDestination && standardTracking
    ? await optionalGit(root, "for-each-ref", "--format=%(symref)", tracking)
    : "";
  const base = sameDestination && standardTracking && !symbolicTracking ? await optionalGit(root, "rev-parse", "--verify", "--quiet", tracking + "^{commit}") : "";
  const revisions = base ? [head, "^" + base] : [head];
  const count = await git(root, "rev-list", "--count", ...revisions);
  const behind = base ? await git(root, "rev-list", "--count", base, "^" + head) : "0";
  return { head, base, count, behind: Number(behind), endpoint: destinations.map(destinationLabel).join(", ") };
}

export async function reviewOutgoing(root: string, remote: string, branch: string) {
  const destination = await reviewDestination(root, remote, branch);
  const { head, base, count, behind, endpoint } = destination;
  const revisions = base ? [head, "^" + base] : [head];
  // Include root commits and merge diffs so temporary files are visible even if the final tree is clean.
  const log = await git(root, "log", "--format=", "--no-notes", "--no-color", "--no-relative", "--name-status", "--no-renames", "--root", "-m", "--no-ext-diff", ...revisions, "--");
  const entries = [...new Set(log.split("\n").filter(Boolean))];
  const text = [
    "Outgoing branch review", "", "Destination: " + remote + " → refs/heads/" + branch,
    "Push endpoint: " + endpoint,
    "Local HEAD: " + head, "Cached destination: " + (base || "Unavailable for this destination"),
    base ? "Comparison uses the local tracking snapshot. It can differ from the push destination."
         : "The review includes all history reachable from HEAD because the destination tip is unknown.",
    "Commits in scope: " + count,
    ...(behind > 0 ? ["Destination-only commits: " + behind + ". A normal push to that snapshot would be rejected."] : []),
    "", "File changes across the commits (A added, M modified, D deleted, T type changed)",
    ...(entries.length ? entries : ["No file changes in this range."]), "",
    "Staged and working-tree edits are excluded. The installed pre-push hook checks the refs supplied by Git during a push.",
  ].join("\n");
  return { text, ...destination, hasCommits: count !== "0" };
}

export async function outgoingCommitIds(root: string, head: string, base: string) {
  const range = base ? [head, "^" + base] : [head];
  const ids = await git(root, "rev-list", "--max-count=100", ...range, "--");
  return ids.split("\n").filter(Boolean);
}

export async function reviewCommitDiff(root: string, id: string, file?: string) {
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(id)) throw new Error("Select a commit from this review.");
  return git(root, "--literal-pathspecs", "show", "--format=commit %H", "--patch", "--no-color", "--root", "-m", ...(file ? [] : ["--first-parent"]),
    "--no-ext-diff", "--no-textconv", "--no-notes", "--no-relative", id, "--", ...(file ? [file] : []));
}
