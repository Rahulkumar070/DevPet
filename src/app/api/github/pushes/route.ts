import { auth } from "@/lib/auth/config";
import connectDB from "@/lib/db/mongoose";
import { recentPushes } from "@/lib/db/models/ConfirmedPush";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new Response(null, { status: 401 });
  await connectDB();
  const pushes = await recentPushes(session.user.id);
  const slug = process.env.GITHUB_APP_SLUG;
  const configured = Boolean(process.env.GITHUB_WEBHOOK_SECRET);
  const installUrl = configured && slug && /^[a-z0-9-]+$/.test(slug) ? `https://github.com/apps/${slug}/installations/new` : null;
  return Response.json({ configured, installUrl, pushes }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
