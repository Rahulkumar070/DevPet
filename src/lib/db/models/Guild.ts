import mongoose, { Document, Model, Schema } from "mongoose";

export interface IGuildDocument extends Document {
  name: string;
  slug: string;
  ownerId: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  sharedMemory: string[];
  wins: number;
  losses: number;
  weeklyXp: number;
  weeklyXpResetAt: Date;
  warStatus: "idle" | "active" | "completed";
  warOpponentId?: mongoose.Types.ObjectId;
  warEndsAt?: Date;
  warWinnerId?: mongoose.Types.ObjectId;
  cosmetic?: string;
  createdAt: Date;
}

const GuildSchema = new Schema<IGuildDocument>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
    sharedMemory: { type: [String], default: [] },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    weeklyXp: { type: Number, default: 0 },
    weeklyXpResetAt: { type: Date, default: () => nextMonday() },
    warStatus: {
      type: String,
      enum: ["idle", "active", "completed"],
      default: "idle",
    },
    warOpponentId: { type: Schema.Types.ObjectId, ref: "Guild" },
    warEndsAt: Date,
    warWinnerId: { type: Schema.Types.ObjectId, ref: "Guild" },
    cosmetic: String,
  },
  { timestamps: true },
);

function nextMonday(): Date {
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7) || 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

GuildSchema.index({ weeklyXp: -1 });

export const Guild: Model<IGuildDocument> =
  mongoose.models.Guild ?? mongoose.model<IGuildDocument>("Guild", GuildSchema);
