import { NextRequest, NextResponse } from "next/server";
import { isObjectIdOrHexString } from "mongoose";
import { auth } from "@/lib/auth/config";
import connectDB from "@/lib/db/mongoose";
import { Battle } from "@/lib/db/models/Battle";
import { Companion, PUBLIC_COMPANION_FIELDS } from "@/lib/db/models/Companion";
import { User } from "@/lib/db/models/User";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isObjectIdOrHexString(id)) {
    return NextResponse.json({ error: "Battle not found" }, { status: 404 });
  }

  await connectDB();

  const battle = await Battle.findById(id)
    .populate([
      { path: "challengerId", model: User, select: "username avatarUrl" },
      { path: "defenderId", model: User, select: "username avatarUrl" },
      { path: "challengerCompanionId", model: Companion, select: PUBLIC_COMPANION_FIELDS },
      { path: "defenderCompanionId", model: Companion, select: PUBLIC_COMPANION_FIELDS },
    ])
    .lean();

  if (!battle?.challengerId || !battle.defenderId ||
      !battle.challengerCompanionId || !battle.defenderCompanionId) {
    return NextResponse.json({ error: "Battle not found" }, { status: 404 });
  }

  // Only participants can view
  const isParticipant =
    battle.challengerId._id.toString() === session.user.id ||
    battle.defenderId._id.toString() === session.user.id;

  if (!isParticipant) {
    return NextResponse.json({ error: "Not your battle" }, { status: 403 });
  }

  return NextResponse.json(battle);
}
