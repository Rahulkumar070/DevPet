import mongoose, { type InferSchemaType, type Model, Schema } from "mongoose";

const schema = new Schema({
  _id: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, required: true },
  repositoryId: { type: Number, required: true },
  repository: { type: String, required: true },
  ref: { type: String, required: true },
  before: { type: String, required: true },
  after: { type: String, required: true },
  created: { type: Boolean, required: true },
  deleted: { type: Boolean, required: true },
  forced: { type: Boolean, required: true },
  receivedAt: { type: Date, required: true },
}, { versionKey: false });

schema.index({ userId: 1, receivedAt: -1, _id: -1 });
type Push = InferSchemaType<typeof schema>;
export const ConfirmedPush: Model<Push> = mongoose.models.ConfirmedPush ?? mongoose.model("ConfirmedPush", schema);

export function recentPushes(userId: string) {
  return ConfirmedPush.find({ userId }).sort({ receivedAt: -1, _id: -1 }).limit(20)
    .select("repository ref before after created deleted forced receivedAt _id").lean();
}
