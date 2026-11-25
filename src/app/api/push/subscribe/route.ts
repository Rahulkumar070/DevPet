import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import connectDB from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User";
import { getPushConfig, isSupportedPushEndpoint } from "@/lib/push";

const subscriptionSchema = z.object({
  endpoint: z.string().max(4096).refine(isSupportedPushEndpoint),
  keys: z.object({
    p256dh: z.string().regex(/^[\w-]{87}$/),
    auth: z.string().regex(/^[\w-]{22}$/),
  }),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const user = await User.findById(session.user.id).select("pushSubscription").lean();
  return NextResponse.json({ subscribed: Boolean(user?.pushSubscription) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!getPushConfig()) {
    return NextResponse.json({ error: "Push notifications are unavailable" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const subscription = subscriptionSchema.safeParse(body?.subscription);
  if (!subscription.success) {
    return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 });
  }

  await connectDB();
  const result = await User.updateOne(
    { _id: session.user.id },
    { pushSubscription: JSON.stringify(subscription.data) },
  );
  if (result.matchedCount === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  await User.updateOne({ _id: session.user.id }, { $unset: { pushSubscription: 1 } });
  return NextResponse.json({ success: true });
}
