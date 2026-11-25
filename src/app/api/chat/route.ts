import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import connectDB from "@/lib/db/mongoose";
import { Companion } from "@/lib/db/models/Companion";
import { User } from "@/lib/db/models/User";
import { streamChatResponse } from "@/lib/companion/soul";
import { updateMemorySummary } from "@/lib/companion/memorySummary";
import { calculateMood } from "@/lib/companion/mood";
import { incrementCounter } from "@/lib/cache/redis";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chatCount = await incrementCounter(`chat:${session.user.id}`, 3600);
  if (chatCount > 60) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Maximum 60 messages per hour." },
      { status: 429 }
    );
  }

  await connectDB();

  const user = await User.findById(session.user.id);
  if (!user || !user.activeCompanionId) {
    return NextResponse.json({ error: "No active companion" }, { status: 404 });
  }

  const companion = await Companion.findById(user.activeCompanionId);
  if (!companion) {
    return NextResponse.json({ error: "Companion not found" }, { status: 404 });
  }

  const body = await req.json();
  const { message } = body;

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  // Validate message length to prevent memory/token overflow
  if (message.length > 2000) {
    return NextResponse.json(
      { error: "Message too long. Maximum 2000 characters." },
      { status: 400 }
    );
  }

  if (message.trim().length === 0) {
    return NextResponse.json(
      { error: "Message cannot be empty" },
      { status: 400 }
    );
  }

  // Update last interaction and mood
  companion.lastInteraction = new Date();
  const newMood = calculateMood(companion.lastInteraction, user.streak);
  companion.mood = newMood;

  // Add user message to memory log
  companion.memoryLog.push(`User: ${message}`);

  // Keep only last 50 messages
  if (companion.memoryLog.length > 50) {
    companion.memoryLog = companion.memoryLog.slice(-50);
    // Trigger memory summary update
    updateMemorySummary(companion._id.toString()).catch(console.error);
  }

  await companion.save();

  // Stream response
  try {
    const stream = streamChatResponse(
      companion.name,
      companion.rarity,
      companion.species,
      companion.personality,
      companion.stats,
      session.user.username ?? "Developer",
      companion.mood,
      companion.memorySummary,
      companion.memoryLog.slice(-10),
      message,
    );

    // Collect full response for memory
    let fullResponse = "";
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            fullResponse += chunk;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`),
            );
          }

          // Save AI response to memory
          companion.memoryLog.push(`${companion.name}: ${fullResponse}`);
          await companion.save();

          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 },
    );
  }
}
