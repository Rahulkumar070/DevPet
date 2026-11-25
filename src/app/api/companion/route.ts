import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import connectDB from "@/lib/db/mongoose";
import { Companion } from "@/lib/db/models/Companion";
import { User } from "@/lib/db/models/User";
import { generateCompanion } from "@/lib/companion/generator";
import { generateSoul } from "@/lib/companion/soul";
import { generateShareSlug } from "@/lib/utils";
import { checkAndAwardAchievement } from "@/lib/achievements/checker";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const companions = await Companion.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(companions);
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const user = await User.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Generate companion based on username
  const generated = generateCompanion(
    session.user.username,
    Date.now().toString(),
  );

  // Generate name and personality with AI (or fallback)
  const soul = await generateSoul(
    session.user.username,
    generated.rarity,
    generated.species,
    generated.stats,
  );

  const shareSlug = generateShareSlug(generated.species, soul.name);

  const companion = await Companion.create({
    userId: user._id,
    rarity: generated.rarity,
    species: generated.species,
    eye: generated.eye,
    hat: generated.hat,
    shiny: generated.shiny,
    stats: generated.stats,
    name: soul.name,
    personality: soul.personality,
    shareSlug,
    hatchedAt: new Date(),
    lastInteraction: new Date(),
  });

  // Update user — always set newest companion as active
  user.companions.push(companion._id);
  user.activeCompanionId = companion._id;
  await user.save();

  // Check achievements
  await checkAndAwardAchievement({
    key: "first_hatch",
    userId: user._id.toString(),
    companionId: companion._id.toString(),
  });
  if (generated.rarity === "legendary") {
    await checkAndAwardAchievement({
      key: "legendary_hatch",
      userId: user._id.toString(),
      companionId: companion._id.toString(),
    });
  }
  if (generated.shiny) {
    await checkAndAwardAchievement({
      key: "shiny_hatch",
      userId: user._id.toString(),
      companionId: companion._id.toString(),
    });
  }

  return NextResponse.json(companion);
}
