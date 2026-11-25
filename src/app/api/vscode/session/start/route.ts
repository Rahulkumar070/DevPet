import { NextRequest, NextResponse } from "next/server";
import { getExtensionUser } from "@/lib/auth/extension";

export async function POST(req: NextRequest) {
  const user = await getExtensionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Valid extension token required" }, { status: 401 });
  }

  // Save the OLD lastActiveDate before updating
  const previousActiveDate = user.lastActiveDate;

  // Update streak logic BEFORE setting new date
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (previousActiveDate) {
    const lastActive = new Date(previousActiveDate);
    lastActive.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor(
      (today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff === 1) {
      user.streak += 1;
    } else if (daysDiff > 1) {
      user.streak = 1;
    }
    // If daysDiff === 0 (same day), streak stays the same
  } else {
    user.streak = 1;
  }

  // NOW update session data with new date
  user.codingSessions = (user.codingSessions || 0) + 1;
  user.lastActiveDate = new Date();

  await user.save();

  return NextResponse.json({
    success: true,
    sessionCount: user.codingSessions,
    streak: user.streak,
  });
}
