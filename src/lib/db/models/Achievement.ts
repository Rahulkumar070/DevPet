import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAchievementDocument extends Document {
  key: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  rarity: string;
}

const AchievementSchema = new Schema<IAchievementDocument>({
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  xpReward: { type: Number, required: true },
  rarity: {
    type: String,
    enum: ["common", "uncommon", "rare", "epic", "legendary"],
    default: "common",
  },
});

export const Achievement: Model<IAchievementDocument> =
  mongoose.models.Achievement ??
  mongoose.model<IAchievementDocument>("Achievement", AchievementSchema);

export const ACHIEVEMENT_DEFINITIONS = [
  {
    key: "first_hatch",
    name: "Born!",
    description: "Hatch your first companion",
    icon: "🥚",
    xpReward: 50,
    rarity: "common",
  },
  {
    key: "first_battle",
    name: "Fighter",
    description: "Win your first battle",
    icon: "⚔️",
    xpReward: 100,
    rarity: "uncommon",
  },
  {
    key: "streak_7",
    name: "On a roll",
    description: "7-day coding streak",
    icon: "🔥",
    xpReward: 200,
    rarity: "uncommon",
  },
  {
    key: "streak_30",
    name: "Grinder",
    description: "30-day coding streak",
    icon: "💎",
    xpReward: 500,
    rarity: "epic",
  },
  {
    key: "level_10",
    name: "Growing up",
    description: "Reach companion level 10",
    icon: "📈",
    xpReward: 150,
    rarity: "uncommon",
  },
  {
    key: "level_50",
    name: "Legendary coder",
    description: "Reach companion level 50",
    icon: "👑",
    xpReward: 1000,
    rarity: "legendary",
  },
  {
    key: "first_evo",
    name: "Evolution!",
    description: "Evolve for the first time",
    icon: "✨",
    xpReward: 200,
    rarity: "rare",
  },
  {
    key: "legendary_hatch",
    name: "Chosen one",
    description: "Hatch a legendary companion",
    icon: "⭐",
    xpReward: 500,
    rarity: "legendary",
  },
  {
    key: "shiny_hatch",
    name: "Sparkle",
    description: "Hatch a shiny companion",
    icon: "💫",
    xpReward: 300,
    rarity: "epic",
  },
  {
    key: "guild_join",
    name: "Team player",
    description: "Join a guild",
    icon: "🏠",
    xpReward: 50,
    rarity: "common",
  },
  {
    key: "guild_war_win",
    name: "War champion",
    description: "Win a guild war",
    icon: "🏆",
    xpReward: 400,
    rarity: "epic",
  },
  {
    key: "share_companion",
    name: "Show off",
    description: "Share companion publicly",
    icon: "📣",
    xpReward: 50,
    rarity: "common",
  },
  {
    key: "chat_100",
    name: "Best friends",
    description: "Send 100 chat messages",
    icon: "💬",
    xpReward: 200,
    rarity: "rare",
  },
  {
    key: "refer_3",
    name: "Recruiter",
    description: "Refer 3 developers",
    icon: "🤝",
    xpReward: 300,
    rarity: "rare",
  },
  {
    key: "commit_100",
    name: "Shipper",
    description: "Push 100 GitHub commits",
    icon: "🚀",
    xpReward: 400,
    rarity: "epic",
  },
];
