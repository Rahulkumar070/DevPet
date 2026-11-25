import { NextResponse } from "next/server";
import { getPushConfig } from "@/lib/push";

export async function GET() {
  const vapidKey = getPushConfig()?.publicKey;

  if (!vapidKey) {
    return NextResponse.json(
      { error: "VAPID key not configured" },
      { status: 503 },
    );
  }

  return NextResponse.json({ vapidKey });
}
