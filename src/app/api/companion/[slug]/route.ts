import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import connectDB from "@/lib/db/mongoose";
import { Companion, PUBLIC_COMPANION_FIELDS } from "@/lib/db/models/Companion";
import { User } from "@/lib/db/models/User";
import { incrementCounter } from "@/lib/cache/redis";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  await connectDB();

  const companion = await Companion.findOne({ shareSlug: slug }).select(PUBLIC_COMPANION_FIELDS).lean();
  if (!companion) {
    return NextResponse.json({ error: "Companion not found" }, { status: 404 });
  }

  // Only return public companions or if owner
  const session = await auth();
  if (
    !companion.isPublic &&
    companion.userId.toString() !== session?.user?.id
  ) {
    return NextResponse.json(
      { error: "Companion is private" },
      { status: 403 },
    );
  }

  // Get owner username
  const owner = await User.findById(companion.userId).select("username").lean();

  return NextResponse.json({
    ...companion,
    ownerUsername: owner?.username,
  });
}

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

  const companion = await Companion.findOne({ shareSlug: slug });
  if (!companion) {
    return NextResponse.json({ error: "Companion not found" }, { status: 404 });
  }

  if (companion.userId.toString() !== session.user.id) {
    return NextResponse.json({ error: "Not your companion" }, { status: 403 });
  }

  const body = await req.json();
  const { name, isPublic } = body;

  if (name !== undefined) {
    companion.name = name.slice(0, 24);
  }
  if (isPublic !== undefined) {
    companion.isPublic = isPublic;
  }

  await companion.save();

  return NextResponse.json(companion);
}

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

  const companion = await Companion.findOne({ shareSlug: slug });
  if (!companion) {
    return NextResponse.json({ error: "Companion not found" }, { status: 404 });
  }

  if (companion.userId.toString() !== session.user.id) {
    return NextResponse.json({ error: "Not your companion" }, { status: 403 });
  }

  // Remove from user's companions
  await User.updateOne(
    { _id: session.user.id },
    {
      $pull: { companions: companion._id },
      $unset: {
        ...(session.user.activeCompanionId === companion._id.toString()
          ? { activeCompanionId: 1 }
          : {}),
      },
    },
  );

  await Companion.deleteOne({ _id: companion._id });

  return NextResponse.json({ success: true });
}

// Like/unlike a companion
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

  const companion = await Companion.findOne({ shareSlug: slug });
  if (!companion) {
    return NextResponse.json({ error: "Companion not found" }, { status: 404 });
  }

  if (!companion.isPublic) {
    return NextResponse.json(
      { error: "Cannot like private companion" },
      { status: 403 },
    );
  }

  // Prevent self-liking
  if (companion.userId.toString() === session.user.id) {
    return NextResponse.json(
      { error: "Cannot like your own companion" },
      { status: 400 }
    );
  }

  // Rate limit: 1 like per companion per user per day
  const likeKey = `like:${session.user.id}:${companion._id}`;
  const likeCount = await incrementCounter(likeKey, 86400);
  if (likeCount > 1) {
    return NextResponse.json(
      { error: "Already liked today" },
      { status: 400 }
    );
  }

  companion.likes += 1;
  await companion.save();

  return NextResponse.json({ likes: companion.likes });
}
