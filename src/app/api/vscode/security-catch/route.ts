import { NextRequest, NextResponse } from "next/server";
import { getExtensionUser } from "@/lib/auth/extension";
import { awardEditorXp } from "@/lib/companion/editorXp";

export async function POST(req: NextRequest) {
  const user = await getExtensionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Valid extension token required" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !Number.isSafeInteger(body.issuesFound) || !Number.isSafeInteger(body.criticalCount) ||
      body.criticalCount < 0 || body.issuesFound < body.criticalCount) {
    return NextResponse.json({ error: "Invalid finding counts" }, { status: 400 });
  }
  const xpGained = Math.min(body.criticalCount * 10 + body.issuesFound * 5, 50);
  if (xpGained > 0) await awardEditorXp(user, xpGained);

  return NextResponse.json({ success: true, xpGained });
}
