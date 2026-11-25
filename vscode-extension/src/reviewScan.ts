import { Worker, parentPort, workerData } from "node:worker_threads";
import { inspectUpdates, type PathChange } from "./pushGuard";

interface Input { root: string; head: string; base: string }
export interface Scan { commits: string[]; changes: PathChange[]; error: string }

function scan({ root, head, base }: Input): Scan {
  const changes: PathChange[] = [];
  const commits: string[] = [];
  const result = inspectUpdates(root, [{ ref: "HEAD", after: head, before: base || "0" }], id => {
    if (commits.length >= 5000) throw new Error("Review exceeds the 5,000 commit display limit.");
    commits.push(id);
  }, change => {
    if (changes.length >= 20000) throw new Error("Review exceeds the 20,000 change display limit.");
    changes.push(change);
  });
  return { commits, changes, error: result.error };
}

if (parentPort && workerData?.devpetReview) parentPort.postMessage(scan(workerData.devpetReview));

export function scanReview(input: Input, signal?: AbortSignal): Promise<Scan> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new Error("Review cancelled.")); return; }
    const worker = new Worker(__filename, { workerData: { devpetReview: input }, execArgv: [] });
    const cancel = () => { reject(new Error("Review cancelled.")); void worker.terminate(); };
    signal?.addEventListener("abort", cancel, { once: true });
    const timer = setTimeout(() => {
      reject(new Error("Review exceeded two minutes. Try reviewing a smaller range."));
      void worker.terminate();
    }, 120000);
    worker.once("message", resolve);
    worker.once("error", reject);
    worker.once("exit", code => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
      if (code) reject(new Error("The review worker stopped before completion."));
    });
  });
}
