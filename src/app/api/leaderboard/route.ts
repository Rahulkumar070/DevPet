import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongoose";
import { Companion, PUBLIC_COMPANION_FIELDS } from "@/lib/db/models/Companion";
import { User } from "@/lib/db/models/User";
import { getCached, setCached } from "@/lib/cache/redis";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "companions";
  const limit = parseInt(searchParams.get("limit") || "50");

  const cacheKey = `leaderboard:public-v3:${type}:${limit}`;
  const cached = await getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  await connectDB();

  if (type === "users") {
    const users = await User.find()
      .sort({ xp: -1 })
      .limit(limit)
      .select("username avatarUrl xp level streak")
      .lean();

    await setCached(cacheKey, users, 300);
    return NextResponse.json(users);
  }

  // Default: companions
  const companions = await Companion.find({ isPublic: true })
    .select(PUBLIC_COMPANION_FIELDS)
    .sort({ level: -1, battleWins: -1 })
    .limit(limit)
    .lean();

  const userIds = [...new Set(companions.map((c) => c.userId.toString()))];
  const users = await User.find({ _id: { $in: userIds } })
    .select("username")
    .lean();

  const userMap = new Map(users.map((u) => [u._id.toString(), u.username]));

  const result = companions.map((c) => ({
    ...c,
    username: userMap.get(c.userId.toString()),
  }));

  await setCached(cacheKey, result, 300);
  return NextResponse.json(result);
}
