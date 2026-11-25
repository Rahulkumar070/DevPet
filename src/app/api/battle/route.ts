import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import connectDB from "@/lib/db/mongoose";
import { Battle } from "@/lib/db/models/Battle";
import { Companion } from "@/lib/db/models/Companion";
import { User } from "@/lib/db/models/User";
import { runBattle } from "@/lib/battle/engine";
import { emitToUser } from "@/lib/socket/server";
import { levelFromXP } from "@/lib/utils";

// Get user's battles
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "20");

  const query: Record<string, unknown> = {
    $or: [{ challengerId: session.user.id }, { defenderId: session.user.id }],
  };

  if (status) {
    query.status = status;
  }

  const battles = await Battle.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("challengerId", "username avatarUrl")
    .populate("defenderId", "username avatarUrl")
    .populate("challengerCompanionId", "name species rarity level")
    .populate("defenderCompanionId", "name species rarity level")
    .lean();

  return NextResponse.json(battles);
}

// Accept a battle challenge (starts the battle)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await req.json();
  const { battleId, action } = body;

  if (!battleId) {
    return NextResponse.json({ error: "Battle ID required" }, { status: 400 });
  }

  const battle = await Battle.findById(battleId);
  if (!battle) {
    return NextResponse.json({ error: "Battle not found" }, { status: 404 });
  }

  // Only defender can accept/decline
  if (battle.defenderId.toString() !== session.user.id) {
    return NextResponse.json({ error: "Not your battle" }, { status: 403 });
  }

  if (battle.status !== "pending") {
    return NextResponse.json(
      { error: "Battle already processed" },
      { status: 400 },
    );
  }

  // Bug 6 fix: Check if battle has expired
  if (battle.expiresAt < new Date()) {
    battle.status = "declined";
    await battle.save();
    // Notify challenger that challenge expired
    emitToUser(battle.challengerId.toString(), "battle:expired", {
      battleId: battle._id.toString(),
      message: "Your battle challenge expired",
    });
    return NextResponse.json(
      { error: "This battle challenge has expired" },
      { status: 400 }
    );
  }

  if (action === "decline") {
    battle.status = "declined";
    await battle.save();
    
    // Notify challenger that battle was declined
    emitToUser(battle.challengerId.toString(), "battle:declined", {
      battleId: battle._id.toString(),
      message: "Your battle challenge was declined",
    });
    
    return NextResponse.json({ success: true, status: "declined" });
  }

  // Accept and run battle
  try {
    const challenger = await Companion.findById(battle.challengerCompanionId);
    const defender = await Companion.findById(battle.defenderCompanionId);

    if (!challenger || !defender) {
      return NextResponse.json(
        { error: "Companions not found" },
        { status: 404 },
      );
    }

    // Run the battle
    const result = runBattle(
      {
        companionId: challenger._id.toString(),
        name: challenger.name,
        stats: challenger.stats,
        level: challenger.level,
      },
      {
        companionId: defender._id.toString(),
        name: defender.name,
        stats: defender.stats,
        level: defender.level,
      },
      battle.challengerId.toString(),
      battle.defenderId.toString(),
    );

    // Validate battle result
    if (!result || !result.winnerId) {
      throw new Error("Battle simulation failed");
    }

    // Determine winner
    const challengerWon = result.winnerId === battle.challengerId.toString();
    const winnerId = challengerWon ? battle.challengerId : battle.defenderId;
    const winnerCompanionId = challengerWon
      ? battle.challengerCompanionId
      : battle.defenderCompanionId;

    // Calculate XP rewards
    const winnerXp = 50 + Math.floor(Math.random() * 30);
    const loserXp = 10 + Math.floor(Math.random() * 15);

    battle.status = "completed";
    battle.winnerId = winnerId;
    battle.winnerCompanionId = winnerCompanionId;
    battle.log = result.turns;
    battle.challengerXpAwarded = challengerWon ? winnerXp : loserXp;
    battle.defenderXpAwarded = challengerWon ? loserXp : winnerXp;

    await battle.save();

    // Update companion stats
    if (challengerWon) {
      await Companion.updateOne(
        { _id: challenger._id },
        { $inc: { battleWins: 1, xp: winnerXp } },
      );
      await Companion.updateOne(
        { _id: defender._id },
        { $inc: { battleLosses: 1, xp: loserXp } },
      );
    } else {
      await Companion.updateOne(
        { _id: defender._id },
        { $inc: { battleWins: 1, xp: winnerXp } },
      );
      await Companion.updateOne(
        { _id: challenger._id },
        { $inc: { battleLosses: 1, xp: loserXp } },
      );
    }

    // Recalculate companion levels after XP update
    const updatedChallengerCompanion = await Companion.findById(challenger._id);
    if (updatedChallengerCompanion) {
      const newLevel = Math.min(50, levelFromXP(updatedChallengerCompanion.xp));
      const newEvoStage = newLevel >= 30 ? 3 : newLevel >= 10 ? 2 : 1;
      await Companion.updateOne(
        { _id: challenger._id },
        { level: newLevel, evolutionStage: newEvoStage }
      );
    }

    const updatedDefenderCompanion = await Companion.findById(defender._id);
    if (updatedDefenderCompanion) {
      const newLevel = Math.min(50, levelFromXP(updatedDefenderCompanion.xp));
      const newEvoStage = newLevel >= 30 ? 3 : newLevel >= 10 ? 2 : 1;
      await Companion.updateOne(
        { _id: defender._id },
        { level: newLevel, evolutionStage: newEvoStage }
      );
    }

    // Update user XP and level
    await User.updateOne(
      { _id: battle.challengerId },
      { $inc: { xp: battle.challengerXpAwarded } },
    );
    const updatedChallenger = await User.findById(battle.challengerId);
    if (updatedChallenger) {
      const newChallengerLevel = Math.min(50, levelFromXP(updatedChallenger.xp));
      await User.updateOne(
        { _id: battle.challengerId },
        { level: newChallengerLevel }
      );
    }

    await User.updateOne(
      { _id: battle.defenderId },
      { $inc: { xp: battle.defenderXpAwarded } },
    );
    const updatedDefender = await User.findById(battle.defenderId);
    if (updatedDefender) {
      const newDefenderLevel = Math.min(50, levelFromXP(updatedDefender.xp));
      await User.updateOne(
        { _id: battle.defenderId },
        { level: newDefenderLevel }
      );
    }

    // Notify both users about battle completion
    const battleResult = {
      battleId: battle._id.toString(),
      winnerId: winnerId.toString(),
      challengerWon,
      challengerXp: battle.challengerXpAwarded,
      defenderXp: battle.defenderXpAwarded,
    };

    // Notify challenger
    emitToUser(battle.challengerId.toString(), "battle:completed", {
      ...battleResult,
      message: challengerWon 
        ? `You won the battle! +${winnerXp} XP` 
        : `You lost the battle. +${loserXp} XP`,
      isWinner: challengerWon,
    });

    // Notify defender
    emitToUser(battle.defenderId.toString(), "battle:completed", {
      ...battleResult,
      message: !challengerWon 
        ? `You won the battle! +${winnerXp} XP` 
        : `You lost the battle. +${loserXp} XP`,
      isWinner: !challengerWon,
    });

    // Emit XP gained events with updated level
    emitToUser(battle.challengerId.toString(), "xp_gained", {
      amount: battle.challengerXpAwarded,
      source: "Battle",
      total: updatedChallenger?.xp ?? 0,
      level: Math.min(50, levelFromXP(updatedChallenger?.xp ?? 0)),
    });

    emitToUser(battle.defenderId.toString(), "xp_gained", {
      amount: battle.defenderXpAwarded,
      source: "Battle",
      total: updatedDefender?.xp ?? 0,
      level: Math.min(50, levelFromXP(updatedDefender?.xp ?? 0)),
    });

    return NextResponse.json(battle);
  } catch (error) {
    console.error("Battle execution error:", error);
    // Rollback: mark battle as declined (no valid "error" status)
    battle.status = "declined";
    await battle.save();
    
    return NextResponse.json(
      { error: "Failed to execute battle. Please try again." },
      { status: 500 }
    );
  }
}
