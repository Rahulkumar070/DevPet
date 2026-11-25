import mongoose, { Document, Model, Schema } from "mongoose";

export interface IXpSnapshotDocument extends Document {
  userId: mongoose.Types.ObjectId;
  companionId: mongoose.Types.ObjectId;
  userXp: number;
  companionXp: number;
  companionLevel: number;
  date: Date;
}

const XpSnapshotSchema = new Schema<IXpSnapshotDocument>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  companionId: {
    type: Schema.Types.ObjectId,
    ref: "Companion",
    required: true,
  },
  userXp: { type: Number, required: true },
  companionXp: { type: Number, required: true },
  companionLevel: { type: Number, required: true },
  date: { type: Date, required: true },
});

XpSnapshotSchema.index({ userId: 1, date: -1 });
XpSnapshotSchema.index({ companionId: 1, date: -1 });

export const XpSnapshot: Model<IXpSnapshotDocument> =
  mongoose.models.XpSnapshot ??
  mongoose.model<IXpSnapshotDocument>("XpSnapshot", XpSnapshotSchema);
