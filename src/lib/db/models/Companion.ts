import mongoose, { Document, Model, Schema } from "mongoose";
import { Rarity, Mood, EvolutionStage } from "@/types";

// Public card fields plus the owner reference used by profile and leaderboard lookups.
export const PUBLIC_COMPANION_FIELDS =
  "userId name species rarity eye hat shiny stats level xp evolutionStage mood personality " +
  "hatchedAt isPublic shareSlug likes battleWins battleLosses achievements createdAt updatedAt";

export interface ICompanionDocument extends Document {
  userId: mongoose.Types.ObjectId;
  rarity: Rarity;
  species: string;
  eye: string;
  hat?: string;
  shiny: boolean;
  stats: {
    GRIND: number;
    FOCUS: number;
    SHIP: number;
    SQUASH: number;
    VIBE: number;
  };
  name: string;
  personality: string;
  memoryLog: string[];
  memorySummary: string;
  lastMemorySummaryAt?: Date;
  hatchedAt: Date;
  level: number;
  xp: number;
  evolutionStage: EvolutionStage;
  isPublic: boolean;
  shareSlug: string;
  likes: number;
  mood: Mood;
  lastInteraction: Date;
  battleWins: number;
  battleLosses: number;
  achievements: string[];
  createdAt: Date;
  updatedAt: Date;
}

const CompanionSchema = new Schema<ICompanionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rarity: {
      type: String,
      enum: ["common", "uncommon", "rare", "epic", "legendary"],
      required: true,
    },
    species: { type: String, required: true },
    eye: { type: String, required: true },
    hat: String,
    shiny: { type: Boolean, default: false },
    stats: {
      GRIND: { type: Number, required: true },
      FOCUS: { type: Number, required: true },
      SHIP: { type: Number, required: true },
      SQUASH: { type: Number, required: true },
      VIBE: { type: Number, required: true },
    },
    name: { type: String, required: true },
    personality: { type: String, required: true },
    memoryLog: { type: [String], default: [] },
    memorySummary: { type: String, default: "" },
    lastMemorySummaryAt: Date,
    hatchedAt: { type: Date, default: Date.now },
    level: { type: Number, default: 1, min: 1, max: 50 },
    xp: { type: Number, default: 0 },
    evolutionStage: { type: Number, enum: [1, 2, 3], default: 1 },
    isPublic: { type: Boolean, default: true },
    shareSlug: { type: String, required: true, unique: true },
    likes: { type: Number, default: 0 },
    mood: {
      type: String,
      enum: ["happy", "neutral", "hungry", "sleepy", "excited"],
      default: "excited",
    },
    lastInteraction: { type: Date, default: Date.now },
    battleWins: { type: Number, default: 0 },
    battleLosses: { type: Number, default: 0 },
    achievements: { type: [String], default: [] },
  },
  { timestamps: true },
);

CompanionSchema.index({ userId: 1 });
CompanionSchema.index({ rarity: 1, level: -1 });
CompanionSchema.index({ isPublic: 1, battleWins: -1 });

export const Companion: Model<ICompanionDocument> =
  mongoose.models.Companion ??
  mongoose.model<ICompanionDocument>("Companion", CompanionSchema);
