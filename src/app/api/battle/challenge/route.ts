import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import connectDB from "@/lib/db/mongoose";
import { Battle } from "@/lib/db/models/Battle";
import { Companion } from "@/lib/db/models/Companion";
import { User } from "@/lib/db/models/User";
import { emitToUser } from "@/lib/socket/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await req.json();
  const { defenderUsername, defenderCompanionId } = body;

  if (!defenderUsername) {
    return NextResponse.json(
      { error: "Defender username required" },
      { status: 400 },
    );
  }

  // Get challenger's active companion
  const challenger = await User.findById(session.user.id);
  if (!challenger || !challenger.activeCompanionId) {
    return NextResponse.json(
      { error: "You need an active companion" },
      { status: 400 },
    );
  }

  // Find defender - use case-insensitive regex to handle any stored casing
  const defender = await User.findOne({
    username: { $regex: new RegExp(`^${defenderUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
  });
  if (!defender) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (defender._id.toString() === session.user.id) {
    return NextResponse.json(
      { error: "Can't battle yourself" },
      { status: 400 },
    );
  }

  // Get defender's companion
  let defenderCompanion;
  if (defenderCompanionId) {
    defenderCompanion = await Companion.findOne({
      _id: defenderCompanionId,
      userId: defender._id,
    });
  } else {
    defenderCompanion = defender.activeCompanionId
      ? await Companion.findById(defender.activeCompanionId)
      : await Companion.findOne({ userId: defender._id });
  }

  if (!defenderCompanion) {
    return NextResponse.json(
      { error: "Defender has no companion" },
      { status: 400 },
    );
  }

  // Check for existing pending battle
  const existingBattle = await Battle.findOne({
    challengerId: challenger._id,
    defenderId: defender._id,
    status: "pending",
    expiresAt: { $gt: new Date() },
  });

  if (existingBattle) {
    return NextResponse.json(
      { error: "You already have a pending challenge with this user" },
      { status: 400 },
    );
  }

  // Create battle
  const battle = await Battle.create({
    challengerId: challenger._id,
    challengerCompanionId: challenger.activeCompanionId,
    defenderId: defender._id,
    defenderCompanionId: defenderCompanion._id,
    expiresAt: new Date(Date.now() + 600_000), // 10 minutes to accept
  });

  // Populate for response
  await battle.populate("challengerId", "username avatarUrl");
  await battle.populate("defenderId", "username avatarUrl");
  await battle.populate("challengerCompanionId", "name species rarity level");
  await battle.populate("defenderCompanionId", "name species rarity level");

  // Emit real-time notification to defender
  emitToUser(defender._id.toString(), "battle:challenge", {
    battleId: battle._id.toString(),
    challengerUsername: challenger.username,
    message: `@${challenger.username} challenged you to a battle!`,
  });

  return NextResponse.json(battle);
}
