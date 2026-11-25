import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { getExtensionUser } from "@/lib/auth/extension";
import connectDB from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User";
import { nanoid } from "nanoid";

// Generate or regenerate API token for VSCode extension
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const user = await User.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Generate new token
  const token = `devpet_${nanoid(32)}`;
  user.apiToken = token;
  await user.save();

  return NextResponse.json({ token });
}

// Verify token (for VSCode extension)
export async function GET(req: Request) {
  const user = await getExtensionUser(req);

  if (!user) {
    return NextResponse.json({ error: "Valid extension token required" }, { status: 401 });
  }

  return NextResponse.json({
    username: user.username,
    activeCompanionId: user.activeCompanionId?.toString(),
  });
}
