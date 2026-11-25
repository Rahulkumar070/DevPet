import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User";
import { Companion, ICompanionDocument } from "@/lib/db/models/Companion";
import { GithubCommit } from "@/lib/db/models/GithubCommit";
import { emitToUser } from "@/lib/socket/server";

interface AchievementCheck {
  key: string;
  userId: string;
  companionId?: string;
}

const XP_REWARDS: Record<string, number> = {
  first_hatch: 50,
  first_battle: 100,
  streak_7: 200,
  streak_30: 500,
  level_10: 150,
  level_50: 1000,
  first_evo: 200,
  legendary_hatch: 500,
  shiny_hatch: 300,
  guild_join: 50,
  guild_war_win: 400,
  share_companion: 50,
  chat_100: 200,
  refer_3: 300,
  commit_100: 400,
};

const ACHIEVEMENT_NAMES: Record<string, { icon: string; name: string }> = {
  first_hatch: { icon: "🥚", name: "First Hatch" },
  first_battle: { icon: "⚔️", name: "First Battle" },
  streak_7: { icon: "🔥", name: "Week Streak" },
  streak_30: { icon: "🔥🔥", name: "Month Streak" },
  level_10: { icon: "⭐", name: "Level 10" },
  level_50: { icon: "💫", name: "Level 50" },
  first_evo: { icon: "🦋", name: "First Evolution" },
  legendary_hatch: { icon: "👑", name: "Legendary Hatch" },
  shiny_hatch: { icon: "✨", name: "Shiny Hatch" },
  guild_join: { icon: "🏰", name: "Guild Member" },
  guild_war_win: { icon: "🏆", name: "War Victor" },
  share_companion: { icon: "📤", name: "First Like" },
  chat_100: { icon: "💬", name: "Chatty" },
  refer_3: { icon: "👥", name: "Recruiter" },
  commit_100: { icon: "💻", name: "100 Commits" },
};

export async function checkAndAwardAchievement({
  key,
  userId,
  companionId,
}: AchievementCheck): Promise<boolean> {
  await connectDB();

  const companion = companionId
    ? await Companion.findById(companionId)
    : await Companion.findOne({ userId });

  if (!companion) return false;
  if (companion.achievements.includes(key)) return false;

  const earned = await validateAchievement(key, userId, companion);
  if (!earned) return false;

  const xpReward = XP_REWARDS[key] ?? 0;

  await Companion.findByIdAndUpdate(companion._id, {
    $addToSet: { achievements: key },
    $inc: { xp: xpReward },
  });

  await User.findByIdAndUpdate(userId, { $inc: { xp: xpReward } });

  // Emit real-time achievement notification
  const achievementInfo = ACHIEVEMENT_NAMES[key] ?? { icon: "🏆", name: key };
  emitToUser(userId, "achievement_unlocked", {
    achievement: achievementInfo,
    xpReward,
  });

  return true;
}

async function validateAchievement(
  key: string,
  userId: string,
  companion: ICompanionDocument,
): Promise<boolean> {
  switch (key) {
    case "first_hatch":
      return true;
    case "first_battle":
      return companion.battleWins >= 1;
    case "streak_7": {
      const user = await User.findById(userId);
      return (user?.streak ?? 0) >= 7;
    }
    case "streak_30": {
      const user = await User.findById(userId);
      return (user?.streak ?? 0) >= 30;
    }
    case "level_10":
      return companion.level >= 10;
    case "level_50":
      return companion.level >= 50;
    case "first_evo":
      return companion.evolutionStage >= 2;
    case "legendary_hatch":
      return companion.rarity === "legendary";
    case "shiny_hatch":
      return companion.shiny === true;
    case "guild_join": {
      const user = await User.findById(userId);
      return !!user?.guildId;
    }
    case "share_companion":
      // Bug 4 fix: Award when companion has received at least 1 like from another user
      // This means someone else actually visited and liked the public profile
      return companion.likes >= 1;
    case "chat_100":
      return companion.memoryLog.length >= 100;
    case "refer_3": {
      const user = await User.findById(userId);
      return (user?.referralCount ?? 0) >= 3;
    }
    case "commit_100": {
      const count = await GithubCommit.countDocuments({ userId });
      return count >= 100;
    }
    default:
      return false;
  }
}
