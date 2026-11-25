"use client";
import { MOOD_EMOJI, Mood } from "@/types";
import { getMoodDescription } from "@/lib/companion/mood";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MoodBadgeProps {
  mood: Mood;
}

const MOOD_COLORS: Record<Mood, string> = {
  excited: "bg-amber-100 text-amber-800 border-amber-200",
  happy: "bg-green-100 text-green-800 border-green-200",
  neutral: "bg-zinc-100 text-zinc-800 border-zinc-200",
  hungry: "bg-orange-100 text-orange-800 border-orange-200",
  sleepy: "bg-slate-100 text-slate-600 border-slate-200",
};

export function MoodBadge({ mood }: MoodBadgeProps) {
  const emoji = MOOD_EMOJI[mood];
  const description = getMoodDescription(mood);
  const colorClasses = MOOD_COLORS[mood];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colorClasses}`}
          >
            <span>{emoji}</span>
            <span className="capitalize">{mood}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
