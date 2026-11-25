import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import connectDB from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User";
import { Companion } from "@/lib/db/models/Companion";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const user = await User.findById(session.user.id)
    .select([
      "githubId", "username", "email", "avatarUrl", "companions", "activeCompanionId",
      "guildId", "xp", "level", "codingSessions", "streak", "lastActiveDate",
      "referralCode", "referredBy", "referralCount", "dailyReminderTime",
      "dailyReminderEnabled", "moodAlertEnabled", "createdAt", "updatedAt",
    ])
    .lean();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await req.json();
  const { activeCompanionId } = body;

  if (!activeCompanionId) {
    return NextResponse.json({ error: "activeCompanionId required" }, { status: 400 });
  }

  // Verify this companion belongs to this user
  const companion = await Companion.findOne({
    _id: activeCompanionId,
    userId: session.user.id,
  });
  if (!companion) {
    return NextResponse.json({ error: "Companion not found or not yours" }, { status: 404 });
  }

  // Use findByIdAndUpdate with { new: true } to confirm update
  const updatedUser = await User.findByIdAndUpdate(
    session.user.id,
    { activeCompanionId: companion._id },
    { new: true }
  );

  if (!updatedUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, activeCompanionId: updatedUser.activeCompanionId });
}
