import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User";

export async function applyReferral(
  newUserId: string,
  referralCode: string,
): Promise<void> {
  await connectDB();

  const referrer = await User.findOne({ referralCode });
  if (!referrer) return;
  if (referrer._id.toString() === newUserId) return;

  await User.findByIdAndUpdate(newUserId, { referredBy: referrer._id });
  await User.findByIdAndUpdate(referrer._id, { $inc: { referralCount: 1 } });
}
