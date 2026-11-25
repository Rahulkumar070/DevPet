import cron from "node-cron";
import connectDB from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User";
import { Companion } from "@/lib/db/models/Companion";
import { Guild } from "@/lib/db/models/Guild";
import { getPushConfig, sendPushNotification } from "@/lib/push";

// Track if scheduler is already initialized
let schedulerInitialized = false;

/**
 * Initialize daily reminder cron job
 * Runs every hour and checks if users need reminders
 */
export function initializeDailyReminderScheduler() {
  if (schedulerInitialized) {
    console.log("Daily reminder scheduler already initialized");
    return;
  }

  // Run every hour at the start of the hour
  cron.schedule("0 * * * *", async () => {
    if (!getPushConfig()) return;
    console.log("Running daily reminder check...");

    try {
      await connectDB();

      const currentHour = new Date().getHours();
      const currentMinute = new Date().getMinutes();
      const currentTime = `${currentHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`;

      // Find users who:
      // 1. Have daily reminders enabled
      // 2. Have a push subscription
      // 3. Have their reminder time set to current hour (within +/- 30 minutes)
      // 4. Haven't received a reminder today

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const users = await User.find({
        dailyReminderEnabled: { $ne: false },
        pushSubscription: { $exists: true, $ne: null },
        $or: [
          { lastReminderSentAt: { $lt: todayStart } },
          { lastReminderSentAt: { $exists: false } },
        ],
      }).lean();

      console.log(
        `Found ${users.length} users eligible for daily reminders at ${currentTime}`,
      );

      let sentCount = 0;
      let errorCount = 0;

      for (const user of users) {
        try {
          // Parse user's preferred reminder time (default: "09:00")
          const reminderTime = user.dailyReminderTime || "09:00";
          const [reminderHour] = reminderTime.split(":").map(Number);

          // Only send if current hour matches user's preferred hour
          if (currentHour !== reminderHour) {
            continue;
          }

          // Get user's active companion for personalized message
          let companionName = "your companion";
          if (user.activeCompanionId) {
            const companion = await Companion.findById(
              user.activeCompanionId,
            ).lean();
            if (companion) {
              companionName = companion.name;
            }
          }

          // Send push notification
          if (!user.pushSubscription) continue;
          const sent = await sendPushNotification(user.pushSubscription, {
            title: `${companionName} misses you! 🐾`,
            body: "Time to code and earn some XP! Your companion is waiting for you.",
            url: "/dashboard",
          });
          if (!sent) continue;

          // Update last reminder sent timestamp
          await User.updateOne(
            { _id: user._id },
            { lastReminderSentAt: new Date() },
          );

          sentCount++;
        } catch (error) {
          console.error(
            `Failed to send daily reminder to user ${user._id}:`,
            error,
          );
          errorCount++;
        }
      }

      console.log(
        `Daily reminder check complete: ${sentCount} sent, ${errorCount} errors`,
      );
    } catch (error) {
      console.error("Daily reminder scheduler error:", error);
    }
  });

  // Bug 7 fix: War resolution — runs every hour at :30
  cron.schedule("30 * * * *", async () => {
    console.log("Running guild war resolution check...");
    try {
      await connectDB();

      const expiredWars = await Guild.find({
        warStatus: "active",
        warEndsAt: { $lt: new Date() },
      });

      console.log(`Found ${expiredWars.length} expired wars to resolve`);

      for (const guild of expiredWars) {
        try {
          const opponent = await Guild.findById(guild.warOpponentId);

          const guildXp = guild.weeklyXp;
          const opponentXp = opponent?.weeklyXp ?? 0;
          const weWon = guildXp >= opponentXp;

          // Seasonal cosmetic: rotate every week
          const weekNumber = Math.ceil(new Date().getDate() / 7);
          const cosmetics = ["🏆", "⚡", "🌟", "🔥"];
          const cosmetic = cosmetics[(weekNumber - 1) % 4];

          // Update our guild
          await Guild.updateOne(
            { _id: guild._id },
            {
              warStatus: "completed",
              warWinnerId: weWon ? guild._id : guild.warOpponentId,
              ...(weWon
                ? { $inc: { wins: 1 }, cosmetic }
                : { $inc: { losses: 1 } }),
            }
          );

          // Update opponent guild
          if (opponent) {
            await Guild.updateOne(
              { _id: opponent._id },
              {
                warStatus: "completed",
                warWinnerId: weWon ? guild._id : opponent._id,
                ...(!weWon
                  ? { $inc: { wins: 1 }, cosmetic }
                  : { $inc: { losses: 1 } }),
              }
            );
          }

          console.log(
            `War resolved: ${guild.name} vs ${opponent?.name ?? "unknown"} — ${weWon ? guild.name : opponent?.name} won`
          );
        } catch (warError) {
          console.error(`Failed to resolve war for guild ${guild._id}:`, warError);
        }
      }

      console.log(`War resolution complete: ${expiredWars.length} wars resolved`);
    } catch (error) {
      console.error("War resolution scheduler error:", error);
    }
  });

  schedulerInitialized = true;
  console.log("Daily reminder scheduler initialized (runs every hour)");
}
