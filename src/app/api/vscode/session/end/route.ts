import { NextRequest, NextResponse } from "next/server";
import { getExtensionUser } from "@/lib/auth/extension";
import { awardEditorXp } from "@/lib/companion/editorXp";
import { XpSnapshot } from "@/lib/db/models/XpSnapshot";

export async function POST(req: NextRequest) {
  const user = await getExtensionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Valid extension token required" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid session data" }, { status: 400 });
  }
  const { durationMinutes = 0, linesWritten = 0, filesEdited = 0 } = body;
  if (![durationMinutes, linesWritten, filesEdited].every((value) =>
    Number.isSafeInteger(value) && value >= 0)) {
    return NextResponse.json({ error: "Invalid session metrics" }, { status: 400 });
  }

  // Award bonus XP for session completion based on duration
  const durationBonus = Math.floor(durationMinutes / 15) * 5; // 5 XP per 15 minutes
  const activityXp = Math.floor(linesWritten * 0.1 + filesEdited * 2);
  const xpGained = durationBonus + activityXp;

  const { owner, companion } = xpGained > 0 ? await awardEditorXp(user, xpGained) : { owner: user, companion: null };
  if (companion) {
    // Dedup XpSnapshot per day
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const existingSnapshot = await XpSnapshot.findOne({
      userId: user._id,
      date: { $gte: todayStart },
    });
    if (!existingSnapshot) {
      await XpSnapshot.create({
        userId: user._id,
        companionId: companion._id,
        userXp: owner.xp,
        companionXp: companion.xp,
        companionLevel: companion.level,
        date: new Date(),
      });
    } else {
      await XpSnapshot.updateOne(
        { _id: existingSnapshot._id },
        {
          userXp: owner.xp,
          companionXp: companion.xp,
          companionLevel: companion.level,
        }
      );
    }
  }

  return NextResponse.json({
    success: true,
    xpGained,
    totalXp: owner.xp,
    level: owner.level,
    sessionDuration: durationMinutes,
  });
}
