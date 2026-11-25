import mongoose, { Document, Model, Schema } from "mongoose";

export interface IUserDocument extends Document {
  githubId: string;
  username: string;
  email: string;
  avatarUrl: string;
  companions: mongoose.Types.ObjectId[];
  activeCompanionId?: mongoose.Types.ObjectId;
  guildId?: mongoose.Types.ObjectId;
  xp: number;
  level: number;
  codingSessions: number;
  streak: number;
  lastActiveDate?: Date;
  referralCode: string;
  referredBy?: mongoose.Types.ObjectId;
  referralCount: number;
  pushSubscription?: string;
  githubAccessToken?: string;
  apiToken?: string;
  // Notification preferences
  dailyReminderTime?: string; // Format: "HH:MM" in 24-hour format (e.g., "09:00")
  dailyReminderEnabled?: boolean;
  lastReminderSentAt?: Date;
  moodAlertEnabled?: boolean;
  lastMoodAlertSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    githubId: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true, lowercase: true },
    email: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },
    companions: [{ type: Schema.Types.ObjectId, ref: "Companion" }],
    activeCompanionId: { type: Schema.Types.ObjectId, ref: "Companion" },
    guildId: { type: Schema.Types.ObjectId, ref: "Guild" },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    codingSessions: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    lastActiveDate: Date,
    referralCode: { type: String, required: true, unique: true },
    referredBy: { type: Schema.Types.ObjectId, ref: "User" },
    referralCount: { type: Number, default: 0 },
    pushSubscription: String,
    githubAccessToken: String,
    apiToken: String,
    // Notification preferences
    dailyReminderTime: { type: String, default: "09:00" },
    dailyReminderEnabled: { type: Boolean, default: true },
    lastReminderSentAt: Date,
    moodAlertEnabled: { type: Boolean, default: true },
    lastMoodAlertSentAt: Date,
  },
  { timestamps: true },
);

UserSchema.index({ apiToken: 1 }, { sparse: true });

export const User: Model<IUserDocument> =
  mongoose.models.User ?? mongoose.model<IUserDocument>("User", UserSchema);
