import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { getExtensionUser } from "@/lib/auth/extension";
import connectDB from "@/lib/db/mongoose";
import { Companion } from "@/lib/db/models/Companion";
import { User } from "@/lib/db/models/User";
import { calculateMood, getMoodDescription } from "@/lib/companion/mood";
import { emitToUser } from "@/lib/socket/server";
import { sendPushNotification } from "@/lib/push";

export async function GET(req: Request) {
  const extensionUser = req.headers.has("authorization") ? await getExtensionUser(req) : null;
  const userId = req.headers.has("authorization")
    ? extensionUser?._id.toString()
    : (await auth())?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  // Get fresh user from DB — never use session.activeCompanionId
  const user = extensionUser ?? await User.findById(userId)
    .select("activeCompanionId streak moodAlertEnabled lastMoodAlertSentAt pushSubscription");
  
  if (!user?.activeCompanionId) {
    return NextResponse.json({ error: "No active companion" }, { status: 404 });
  }

  const query = Companion.findOne({ _id: user.activeCompanionId, userId });
  if (extensionUser) query.select("name species level xp mood evolutionStage rarity stats lastInteraction");
  const companion = await query.lean();
  if (!companion) {
    return NextResponse.json({ error: "Companion not found" }, { status: 404 });
  }

  // Recalculate mood
  const mood = calculateMood(companion.lastInteraction, user.streak);

  // Update mood if changed
  if (mood !== companion.mood) {
    const oldMood = companion.mood;
    await Companion.updateOne({ _id: companion._id }, { mood });
    companion.mood = mood;

    // Check if we should send mood alert
    const shouldAlert =
      user.moodAlertEnabled !== false &&
      (mood === "hungry" || mood === "sleepy");

    // Prevent alert spam: only send if no alert in last 6 hours
    const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
    const canSendAlert =
      !user.lastMoodAlertSentAt ||
      user.lastMoodAlertSentAt.getTime() < sixHoursAgo;

    if (shouldAlert && canSendAlert) {
      // Emit real-time socket event
      emitToUser(userId, "mood_changed", {
        mood,
        oldMood,
        companionName: companion.name,
        description: getMoodDescription(mood),
      });

      // Send push notification if user has subscription
      if (user.pushSubscription) {
        try {
          await sendPushNotification(user.pushSubscription, {
            title: `${companion.name} is ${mood}!`,
            body: getMoodDescription(mood),
            url: "/dashboard",
          });
        } catch (error) {
          console.error("Failed to send mood push notification:", error);
        }
      }

      // Update last alert timestamp
      await User.updateOne(
        { _id: userId },
        { lastMoodAlertSentAt: new Date() },
      );
    }
  }

  return NextResponse.json(companion);
}
