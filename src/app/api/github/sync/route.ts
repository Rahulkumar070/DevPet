import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { getExtensionUser } from "@/lib/auth/extension";
import { runGithubSync } from "@/lib/github/syncRunner";
import connectDB from "@/lib/db/mongoose";
import { GithubCommit } from "@/lib/db/models/GithubCommit";
import { User } from "@/lib/db/models/User";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const requestedLimit = Number(new URL(req.url).searchParams.get("limit") ?? 5);
  const limit = Number.isInteger(requestedLimit) ? Math.min(50, Math.max(1, requestedLimit)) : 5;
  const commits = await GithubCommit.find({ userId: session.user.id })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .select("sha repo message xpAwarded createdAt -_id")
    .lean();
  return NextResponse.json(commits);
}

export async function POST(req: Request) {
  const extensionUser = req.headers.has("authorization") ? await getExtensionUser(req) : null;
  const userId = req.headers.has("authorization")
    ? extensionUser?._id.toString()
    : (await auth())?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const user = extensionUser ?? await User.findById(userId);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!user.githubAccessToken)
    return NextResponse.json({ error: "GitHub not connected" }, { status: 400 });

  try {
    const result = await runGithubSync(userId);
    const updated = await User.findById(userId);
    return NextResponse.json({
      success: true,
      newCommits: result.newCommits,
      xpGained: result.xpGained,
      totalXp: updated?.xp ?? 0,
      level: updated?.level ?? 1,
      streak: updated?.streak ?? 0,
    });
  } catch (error) {
    console.error("GitHub sync error:", error);
    return NextResponse.json({ error: "Failed to sync with GitHub" }, { status: 500 });
  }
}
