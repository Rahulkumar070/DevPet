import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getExtensionUser } from "@/lib/auth/extension";
import { awardEditorXp } from "@/lib/companion/editorXp";
import { emitToUser } from "@/lib/socket/server";
import { incrementCounter } from "@/lib/cache/redis";

const saveMetrics = z.object({
  linesWritten: z.number().int().nonnegative().default(0),
  filesEdited: z.number().int().nonnegative().default(0),
});

export async function POST(req: NextRequest) {
  const user = await getExtensionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Valid extension token required" }, { status: 401 });
  }

  let xpGained = 5;
  const body = await req.text();
  if (body) {
    try {
      const { linesWritten, filesEdited } = saveMetrics.parse(JSON.parse(body));
      xpGained = Math.floor(linesWritten * 0.1 + filesEdited * 2);
    } catch {
      return NextResponse.json({ error: "Invalid save data" }, { status: 400 });
    }
  }
  const saves = await incrementCounter(`vscode-save:${user._id}`, 3600);
  if (saves > 10) {
    return NextResponse.json({ error: "Save XP limit reached" }, { status: 429 });
  }

  const owner = xpGained > 0 ? (await awardEditorXp(user, xpGained)).owner : user;
  if (xpGained > 0) {
    // Emit real-time XP notification
    emitToUser(user._id.toString(), "xp_gained", {
      amount: xpGained,
      source: "VSCode Coding",
    });
  }

  return NextResponse.json({
    success: true,
    xpGained,
    totalXp: owner.xp,
    level: owner.level,
  });
}
