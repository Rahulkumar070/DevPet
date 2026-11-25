import { User, type IUserDocument } from "@/lib/db/models/User";
import { Companion } from "@/lib/db/models/Companion";
import { xpForNextLevel } from "@/lib/utils";

const thresholds: number[] = [];
let total = 0;
for (let level = 1; level < 50; level++) {
  total += xpForNextLevel(level);
  thresholds.push(total);
}

// Compute each document's level from the incremented total in the same write.
// A save in another editor window can arrive while a session is closing.
function progress(amount: number, activityField: string) {
  return [
    { $set: { xp: { $add: [{ $ifNull: ["$xp", 0] }, amount] }, [activityField]: "$$NOW" } },
    { $set: { level: { $add: [1, { $size: { $filter: {
      input: thresholds, as: "threshold", cond: { $gte: ["$xp", "$$threshold"] },
    } } }] } } },
  ];
}

export async function awardEditorXp(user: IUserDocument, amount: number) {
  const options = { returnDocument: "after", updatePipeline: true } as const;
  const owner = await User.findByIdAndUpdate(user._id, progress(amount, "lastActiveDate"), options);
  if (!owner) throw new Error("DevPet account no longer exists");
  const companion = owner.activeCompanionId ? await Companion.findOneAndUpdate(
    { _id: owner.activeCompanionId, userId: owner._id },
    [...progress(Math.floor(amount / 2), "lastInteraction"), {
      $set: { evolutionStage: { $max: ["$evolutionStage", { $switch: {
        branches: [{ case: { $gte: ["$level", 30] }, then: 3 }, { case: { $gte: ["$level", 10] }, then: 2 }],
        default: 1,
      } }] } },
    }], options,
  ) : null;
  return { owner, companion };
}
