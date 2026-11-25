import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBattleDocument extends Document {
  challengerId: mongoose.Types.ObjectId;
  challengerCompanionId: mongoose.Types.ObjectId;
  defenderId: mongoose.Types.ObjectId;
  defenderCompanionId: mongoose.Types.ObjectId;
  status: "pending" | "active" | "completed" | "declined";
  winnerId?: mongoose.Types.ObjectId;
  winnerCompanionId?: mongoose.Types.ObjectId;
  log: Array<{
    turn: number;
    attackerCompanionId: string;
    attackerName: string;
    damage: number;
    crit: boolean;
    defenderHp: number;
    attackerHp: number;
  }>;
  challengerXpAwarded: number;
  defenderXpAwarded: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BattleSchema = new Schema<IBattleDocument>(
  {
    challengerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    challengerCompanionId: {
      type: Schema.Types.ObjectId,
      ref: "Companion",
      required: true,
    },
    defenderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    defenderCompanionId: {
      type: Schema.Types.ObjectId,
      ref: "Companion",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "active", "completed", "declined"],
      default: "pending",
    },
    winnerId: { type: Schema.Types.ObjectId, ref: "User" },
    winnerCompanionId: { type: Schema.Types.ObjectId, ref: "Companion" },
    log: [
      {
        turn: Number,
        attackerCompanionId: String,
        attackerName: String,
        damage: Number,
        crit: Boolean,
        defenderHp: Number,
        attackerHp: Number,
      },
    ],
    challengerXpAwarded: { type: Number, default: 0 },
    defenderXpAwarded: { type: Number, default: 0 },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 600_000) },
  },
  { timestamps: true },
);

BattleSchema.index({ challengerId: 1, createdAt: -1 });
BattleSchema.index({ defenderId: 1, status: 1 });
BattleSchema.index({ status: 1, expiresAt: 1 });

export const Battle: Model<IBattleDocument> =
  mongoose.models.Battle ??
  mongoose.model<IBattleDocument>("Battle", BattleSchema);
