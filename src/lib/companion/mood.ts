import { Mood } from "@/types";

export function calculateMood(lastInteraction: Date, streak: number): Mood {
  const hoursSince =
    (Date.now() - lastInteraction.getTime()) / (1000 * 60 * 60);

  if (hoursSince < 2 && streak > 7) return "excited";
  if (hoursSince < 6) return "happy";
  if (hoursSince < 24) return "neutral";
  if (hoursSince < 48) return "hungry";
  return "sleepy";
}

export function getMoodDescription(mood: Mood): string {
  const descriptions: Record<Mood, string> = {
    excited: "Super energetic and proud of your streak!",
    happy: "Happy and ready to help you code.",
    neutral: "Relaxed and waiting.",
    hungry: "Missing you. Needs attention!",
    sleepy: "Barely awake. Come back and code!",
  };
  return descriptions[mood];
}

export function getMoodTone(mood: Mood): string {
  const tones: Record<Mood, string> = {
    excited: 'Use "!!" often. Reference the streak. Very energetic.',
    happy: "Normal cheerful personality.",
    neutral: "Slightly subdued. Still helpful.",
    hungry: "Mention wanting attention. A bit whiny but cute.",
    sleepy: 'Short responses. Mention being tired. Use "zzzz" occasionally.',
  };
  return tones[mood];
}
