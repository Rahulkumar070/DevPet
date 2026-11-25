import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import connectDB from "@/lib/db/mongoose";
import { ConfirmedPush } from "@/lib/db/models/ConfirmedPush";
import { User } from "@/lib/db/models/User";

const limit = 25 * 1024 * 1024;
const githubId = z.number().int().positive();
const sha = z.string().regex(/^[a-f0-9]{40}$/);
const push = z.object({
  installation: z.object({ id: githubId }),
  repository: z.object({ id: githubId, full_name: z.string().max(256).regex(/^[\w.-]+\/[\w.-]+$/) }),
  sender: z.object({ id: githubId }),
  ref: z.string().max(1024).regex(/^refs\/(heads|tags)\/\S+$/),
  before: sha, after: sha, created: z.boolean(), deleted: z.boolean(), forced: z.boolean(),
});

export async function POST(request: Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return new Response(null, { status: 503 });
  const signature = request.headers.get("x-hub-signature-256") ?? "";
  if (!/^sha256=[\da-f]{64}$/.test(signature)) return new Response(null, { status: 401 });
  if (Number(request.headers.get("content-length")) > limit) return new Response(null, { status: 413 });
  if (!request.body) return new Response(null, { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  const hmac = createHmac("sha256", secret);
  const reader = request.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        return new Response(null, { status: 413 });
      }
      chunks.push(value);
      hmac.update(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (!timingSafeEqual(hmac.digest(), Buffer.from(signature.slice(7), "hex"))) return new Response(null, { status: 401 });
  if (request.headers.get("x-github-event") !== "push") return new Response(null, { status: 204 });
  const delivery = request.headers.get("x-github-delivery");
  if (!delivery || !z.uuid().safeParse(delivery).success) return new Response(null, { status: 400 });
  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.concat(chunks, size).toString("utf8"));
  } catch {
    return new Response(null, { status: 400 });
  }
  const parsed = push.safeParse(payload);
  if (!parsed.success) return new Response(null, { status: 422 });
  const { sender, installation, repository, ref, before, after, created, deleted, forced } = parsed.data;
  await connectDB();
  const owner = await User.findOne({ githubId: String(sender.id) }).select("_id").lean();
  if (owner) {
    try {
      await ConfirmedPush.create({
        _id: installation.id + ":" + delivery.toLowerCase(), userId: owner._id, receivedAt: new Date(),
        repositoryId: repository.id, repository: repository.full_name, ref, before, after, created, deleted, forced,
      });
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === 11000)) throw error;
    }
  }
  return new Response(null, { status: 204 });
}
