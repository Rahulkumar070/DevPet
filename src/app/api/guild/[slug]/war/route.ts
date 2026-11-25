import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import connectDB from "@/lib/db/mongoose";
import { Guild } from "@/lib/db/models/Guild";

// Declare or end war
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const guild = await Guild.findOne({ slug });
  if (!guild) {
    return NextResponse.json({ error: "Guild not found" }, { status: 404 });
  }

  if (guild.ownerId.toString() !== session.user.id) {
    return NextResponse.json({ error: "Not guild owner" }, { status: 403 });
  }

  const body = await req.json();
  const { action, opponentSlug } = body;

  if (action === "declare") {
    if (guild.warStatus === "active") {
      return NextResponse.json({ error: "Already at war" }, { status: 400 });
    }

    if (!opponentSlug) {
      return NextResponse.json({ error: "Opponent required" }, { status: 400 });
    }

    const opponent = await Guild.findOne({ slug: opponentSlug });
    if (!opponent) {
      return NextResponse.json(
        { error: "Opponent guild not found" },
        { status: 404 },
      );
    }

    if (opponent._id.toString() === guild._id.toString()) {
      return NextResponse.json(
        { error: "Can't war yourself" },
        { status: 400 },
      );
    }

    if (opponent.warStatus === "active") {
      return NextResponse.json(
        { error: "Opponent is already at war" },
        { status: 400 },
      );
    }

    // Start war - 7 days
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + 7);

    guild.warStatus = "active";
    guild.warOpponentId = opponent._id;
    guild.warEndsAt = endsAt;

    opponent.warStatus = "active";
    opponent.warOpponentId = guild._id;
    opponent.warEndsAt = endsAt;

    await guild.save();
    await opponent.save();

    return NextResponse.json({
      success: true,
      war: {
        status: "active",
        opponent: opponent.name,
        endsAt,
      },
    });
  }

  if (action === "end") {
    if (guild.warStatus !== "active") {
      return NextResponse.json({ error: "No active war" }, { status: 400 });
    }

    const opponent = await Guild.findById(guild.warOpponentId);

    // Determine winner by weekly XP
    const weWon = guild.weeklyXp > (opponent?.weeklyXp || 0);

    // Bug 7 fix: Award seasonal cosmetic to winner
    const weekNumber = Math.ceil(new Date().getDate() / 7);
    const cosmetics = ["🏆", "⚡", "🌟", "🔥"];
    const cosmetic = cosmetics[(weekNumber - 1) % 4];

    guild.warStatus = "completed";
    guild.warWinnerId = weWon ? guild._id : guild.warOpponentId;
    if (weWon) {
      guild.wins += 1;
      guild.cosmetic = cosmetic;
    } else {
      guild.losses += 1;
    }

    if (opponent) {
      opponent.warStatus = "completed";
      opponent.warWinnerId = weWon ? guild._id : opponent._id;
      if (!weWon) {
        opponent.wins += 1;
        opponent.cosmetic = cosmetic;
      } else {
        opponent.losses += 1;
      }
      await opponent.save();
    }

    await guild.save();

    return NextResponse.json({
      success: true,
      winner: weWon ? guild.name : opponent?.name,
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// Get war status
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  await connectDB();

  const guild = await Guild.findOne({ slug });
  if (!guild) {
    return NextResponse.json({ error: "Guild not found" }, { status: 404 });
  }

  if (guild.warStatus === "idle") {
    return NextResponse.json({ status: "idle" });
  }

  const opponent = await Guild.findById(guild.warOpponentId)
    .select("name slug weeklyXp")
    .lean();

  return NextResponse.json({
    status: guild.warStatus,
    opponent: opponent?.name,
    opponentSlug: opponent?.slug,
    endsAt: guild.warEndsAt,
    ourXp: guild.weeklyXp,
    theirXp: opponent?.weeklyXp || 0,
    winnerId: guild.warWinnerId?.toString(),
    ourGuildId: guild._id.toString(),
  });
}
