import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import connectDB from "@/lib/db/mongoose";
import { Guild } from "@/lib/db/models/Guild";
import { User } from "@/lib/db/models/User";

// Get all guilds or user's guild
export async function GET(req: NextRequest) {
  const session = await auth();

  await connectDB();

  const { searchParams } = new URL(req.url);
  const myGuild = searchParams.get("mine") === "true";
  const search = searchParams.get("search");
  const limit = parseInt(searchParams.get("limit") || "20");

  if (myGuild) {
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findById(session.user.id);
    if (!user?.guildId) {
      return NextResponse.json({ guild: null });
    }

    const guild = await Guild.findById(user.guildId).lean();
    return NextResponse.json({ guild });
  }

  // Build query for search
  const query: Record<string, unknown> = {};
  
  if (search) {
    query.name = { $regex: search, $options: "i" };
  }

  // Exclude user's own guild from search results
  if (session?.user?.id) {
    const user = await User.findById(session.user.id);
    if (user?.guildId) {
      query._id = { $ne: user.guildId };
    }
  }

  // List guilds matching query
  const guilds = await Guild.find(query)
    .select("name slug members weeklyXp warStatus cosmetic ownerId")
    .sort({ weeklyXp: -1 })
    .limit(search ? 10 : limit)
    .lean();

  // Get member counts and owner info
  const result = await Promise.all(
    guilds.map(async (guild) => {
      const owner = await User.findById(guild.ownerId)
        .select("username avatarUrl")
        .lean();
      return {
        ...guild,
        memberCount: guild.members.length,
        ownerUsername: owner?.username,
        ownerAvatar: owner?.avatarUrl,
      };
    }),
  );

  return NextResponse.json(result);
}

// Create a new guild
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const user = await User.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.guildId) {
    return NextResponse.json(
      { error: "You are already in a guild. Leave first." },
      { status: 400 },
    );
  }

  const body = await req.json();
  const { name } = body;

  if (!name || name.length < 3 || name.length > 32) {
    return NextResponse.json(
      { error: "Guild name must be 3-32 characters" },
      { status: 400 },
    );
  }

  // Generate slug
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-");
  let slug = baseSlug;
  let counter = 1;
  while (await Guild.findOne({ slug })) {
    slug = `${baseSlug}-${counter++}`;
  }

  const guild = await Guild.create({
    name,
    slug,
    ownerId: user._id,
    members: [user._id],
  });

  // Update user
  user.guildId = guild._id;
  await user.save();

  return NextResponse.json(guild);
}
