import { generateMemorySummary } from "./soul";
import { connectDB } from "@/lib/db/mongoose";
import { Companion } from "@/lib/db/models/Companion";
import { User } from "@/lib/db/models/User";

export async function updateMemorySummary(
  companionId: string,
): Promise<string> {
  await connectDB();

  const companion = await Companion.findById(companionId).populate("userId");
  if (!companion) return "";

  const lastSummary = companion.lastMemorySummaryAt;
  const shouldUpdate =
    !lastSummary || Date.now() - lastSummary.getTime() > 24 * 60 * 60 * 1000;

  if (!shouldUpdate && companion.memorySummary) {
    return companion.memorySummary;
  }

  const user = await User.findById(companion.userId);
  if (!user) return companion.memorySummary || "";

  const summary = await generateMemorySummary(
    user.username,
    companion.name,
    companion.species,
    companion.memoryLog,
  );

  await Companion.findByIdAndUpdate(companionId, {
    memorySummary: summary,
    lastMemorySummaryAt: new Date(),
  });

  return summary;
}
