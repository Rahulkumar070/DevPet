import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongoose";
import { Companion, PUBLIC_COMPANION_FIELDS } from "@/lib/db/models/Companion";
import { User } from "@/lib/db/models/User";
import { getCached, setCached } from "@/lib/cache/redis";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sortBy = searchParams.get("sortBy") || "battleWins";
  const limit = parseInt(searchParams.get("limit") || "50");

  // Check cache
  const cacheKey = `battle-leaderboard:public-v3:${sortBy}:${limit}`;
  const cached = await getCached<unknown[]>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  await connectDB();

  const sortField: Record<string, 1 | -1> =
    sortBy === "level" ? { level: -1, xp: -1 } : { battleWins: -1, level: -1 };

  const companions = await Companion.find({ isPublic: true })
    .select(PUBLIC_COMPANION_FIELDS)
    .sort(sortField)
    .limit(limit)
    .lean();

  // Get usernames
  const userIds = [...new Set(companions.map((c) => c.userId.toString()))];
  const users = await User.find({ _id: { $in: userIds } })
    .select("username avatarUrl")
    .lean();

  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const leaderboard = companions.map((c) => ({
    ...c,
    username: userMap.get(c.userId.toString())?.username,
    avatarUrl: userMap.get(c.userId.toString())?.avatarUrl,
  }));

  // Cache for 5 minutes
  await setCached(cacheKey, leaderboard, 300);

  return NextResponse.json(leaderboard);
}
