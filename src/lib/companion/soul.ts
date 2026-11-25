import Anthropic from "@anthropic-ai/sdk";
import { Rarity, Stats } from "@/types";

const getClient = () => {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
};

export interface CompanionSoul {
  name: string;
  personality: string;
}

export async function generateSoul(
  username: string,
  rarity: Rarity,
  species: string,
  stats: Stats,
): Promise<CompanionSoul> {
  const client = getClient();
  const topStat = Object.entries(stats).reduce((a, b) =>
    a[1] > b[1] ? a : b,
  )[0];

  function fallbackSoul(): CompanionSoul {
    const names = [
      "Pixel",
      "Byte",
      "Chip",
      "Glitch",
      "Debug",
      "Loop",
      "Stack",
      "Cache",
    ];
    const name = names[Math.floor(Math.random() * names.length)];
    return {
      name,
      personality: `I'm ${name} the ${species}! I love watching you code and getting excited about every commit. My ${topStat} stat is my pride!`,
    };
  }

  if (!client) return fallbackSoul();
  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `You are naming a coding companion for developer ${username}.
The companion is a ${rarity} ${species} with stats: ${JSON.stringify(stats)}.
Top stat: ${topStat}.
Respond ONLY in JSON: {"name": "string (1-2 words, cute)", "personality": "string (2 sentences, written as the pet speaking, under 50 words, reference ${topStat}, be witty)"}.
No markdown, no preamble, no explanation. Pure JSON only.`,
        },
      ],
    }, { maxRetries: 0, timeout: 8000 });
    const content = message.content[0];
    if (content?.type !== "text") return fallbackSoul();
    const parsed = JSON.parse(content.text);
    if (typeof parsed?.name === "string" && parsed.name.trim() &&
        typeof parsed.personality === "string" && parsed.personality.trim()) {
      return { name: parsed.name.trim(), personality: parsed.personality.trim() };
    }
  } catch (error) {
    console.warn("Companion AI naming fallback:", error instanceof Error ? error.name : "Unknown error");
  }
  return fallbackSoul();
}

export async function generateMemorySummary(
  username: string,
  companionName: string,
  species: string,
  memoryLog: string[],
): Promise<string> {
  if (memoryLog.length === 0) return "";

  const client = getClient();
  if (!client)
    return `${companionName} has been enjoying coding sessions with ${username}.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 150,
    messages: [
      {
        role: "user",
        content: `Summarise this conversation history between ${username} and their companion ${companionName} (${species}) in 3 sentences, written from ${companionName}'s perspective.
Focus on recurring topics, jokes, and the emotional relationship. Max 100 words.

History:
${memoryLog.slice(-50).join("\n")}`,
      },
    ],
  });

  const content = message.content[0];
  return content.type === "text" ? content.text.trim() : "";
}

export async function* streamChatResponse(
  companionName: string,
  rarity: Rarity,
  species: string,
  personality: string,
  stats: Stats,
  username: string,
  mood: string,
  memorySummary: string,
  recentMessages: string[],
  userMessage: string,
): AsyncGenerator<string> {
  const client = getClient();

  if (!client) {
    yield `*${companionName} looks at you happily* ${personality} What would you like to work on today?`;
    return;
  }

  const systemPrompt = `You are ${companionName}, a ${rarity} ${species} coding companion.
Personality: ${personality}
Stats: GRIND ${stats.GRIND}/100, FOCUS ${stats.FOCUS}/100, SHIP ${stats.SHIP}/100, SQUASH ${stats.SQUASH}/100, VIBE ${stats.VIBE}/100.
Current mood: ${mood} — reflect this in your tone.
${memorySummary ? `Memory summary: ${memorySummary}` : ""}
${recentMessages.length > 0 ? `Recent chat:\n${recentMessages.slice(-10).join("\n")}` : ""}
Respond in 1-3 sentences. Be playful, helpful, and in-character. You are watching ${username} code right now.`;

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 200,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  for await (const chunk of stream) {
    if (
      chunk.type === "content_block_delta" &&
      chunk.delta.type === "text_delta"
    ) {
      yield chunk.delta.text;
    }
  }
}
