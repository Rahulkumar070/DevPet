import mongoose, { Document, Model, Schema } from "mongoose";

export interface IGithubCommitDocument extends Document {
  userId: mongoose.Types.ObjectId;
  sha: string;
  repo: string;
  message: string;
  filesChanged: number;
  xpAwarded: number;
  createdAt: Date;
}

const GithubCommitSchema = new Schema<IGithubCommitDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sha: { type: String, required: true, unique: true },
    repo: { type: String, required: true },
    message: { type: String, default: "" },
    filesChanged: { type: Number, default: 0 },
    xpAwarded: { type: Number, required: true },
  },
  { timestamps: true },
);

GithubCommitSchema.index({ userId: 1, createdAt: -1 });

export const GithubCommit: Model<IGithubCommitDocument> =
  mongoose.models.GithubCommit ??
  mongoose.model<IGithubCommitDocument>("GithubCommit", GithubCommitSchema);
