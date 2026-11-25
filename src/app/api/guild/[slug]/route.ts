import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth/config";
import connectDB from "@/lib/db/mongoose";
import { Guild } from "@/lib/db/models/Guild";
import { User } from "@/lib/db/models/User";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  await connectDB();

  const guild = await Guild.findOne({ slug }).lean();
  if (!guild) {
    return NextResponse.json({ error: "Guild not found" }, { status: 404 });
  }

  // Get members with details
  const members = await User.find({ _id: { $in: guild.members } })
    .select("username avatarUrl level xp")
    .lean();

  // Get the start of the current week (Sunday)
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  // Get weekly XP from XpSnapshots for each member
  const memberIds = members.map((m) => m._id);
  const xpSnapshots = await mongoose.connection
    .collection("xpsnapshots")
    .aggregate([
      {
        $match: {
          userId: { $in: memberIds },
          date: { $gte: weekStart },
        },
      },
      {
        $group: {
          _id: "$userId",
          maxXp: { $max: "$userXp" },
          minXp: { $min: "$userXp" },
        },
      },
      {
        $project: {
          _id: 1,
          weeklyXp: { $subtract: ["$maxXp", "$minXp"] },
        },
      },
    ])
    .toArray();

  const xpMap = new Map(
    xpSnapshots.map((s) => [s._id.toString(), s.weeklyXp])
  );

  // Calculate weekly XP per member from actual snapshots
  const membersWithXp = members.map((m) => ({
    ...m,
    weeklyXp: xpMap.get(m._id.toString()) ?? 0,
  }));

  const owner = members.find(
    (m) => m._id.toString() === guild.ownerId.toString(),
  );

  return NextResponse.json({
    ...guild,
    members: membersWithXp,
    ownerUsername: owner?.username,
    memberAvatars: members.map((m) => m.avatarUrl).filter(Boolean),
    memberCount: members.length,
  });
}

// Join guild
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

  // Block joining during active war
  if (guild.warStatus === "active") {
    return NextResponse.json(
      { error: "Cannot join a guild that is currently at war." },
      { status: 400 },
    );
  }

  const user = await User.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.guildId) {
    return NextResponse.json(
      { error: "You are already in a guild" },
      { status: 400 },
    );
  }

  // Check member limit (max 50)
  if (guild.members.length >= 50) {
    return NextResponse.json({ error: "Guild is full" }, { status: 400 });
  }

  guild.members.push(user._id);
  await guild.save();

  user.guildId = guild._id;
  await user.save();

  return NextResponse.json({ success: true });
}

// Leave guild
export async function DELETE(
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

  const user = await User.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!user.guildId || user.guildId.toString() !== guild._id.toString()) {
    return NextResponse.json({ error: "Not in this guild" }, { status: 400 });
  }

  // Block leaving during active war
  if (guild.warStatus === "active") {
    return NextResponse.json(
      { error: "War is active! You cannot leave during a guild war. The war lasts 7 days — fight it out!" },
      { status: 400 },
    );
  }

  // Owner can't leave without transferring or deleting
  if (guild.ownerId.toString() === session.user.id) {
    if (guild.members.length === 1) {
      // Delete guild if owner is last member
      // (active war already blocked above)
      await Guild.deleteOne({ _id: guild._id });
    } else {
      return NextResponse.json(
        { error: "Transfer ownership before leaving" },
        { status: 400 },
      );
    }
  } else {
    guild.members = guild.members.filter(
      (m) => m.toString() !== session.user.id,
    );
    await guild.save();
  }

  user.guildId = undefined;
  await user.save();

  return NextResponse.json({ success: true });
}

// Update guild (owner only)
export async function PATCH(
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
  const { name, kickMemberId, transferOwnerId } = body;

  if (name) {
    guild.name = name.slice(0, 32);
  }

  if (kickMemberId && kickMemberId !== session.user.id) {
    // Block kicking during active war
    if (guild.warStatus === "active") {
      return NextResponse.json(
        { error: "Cannot kick members during an active war." },
        { status: 400 },
      );
    }
    guild.members = guild.members.filter((m) => m.toString() !== kickMemberId);
    await User.updateOne({ _id: kickMemberId }, { $unset: { guildId: 1 } });
  }

  if (
    transferOwnerId &&
    guild.members.some((m) => m.toString() === transferOwnerId)
  ) {
    guild.ownerId = transferOwnerId;
  }

  await guild.save();

  return NextResponse.json(guild);
}
