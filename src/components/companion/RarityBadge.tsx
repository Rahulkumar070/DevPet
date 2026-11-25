import { RARITY_COLORS, RARITY_STARS, Rarity } from "@/types";
import { cn } from "@/lib/utils";

interface RarityBadgeProps {
  rarity: Rarity;
  className?: string;
}

export function RarityBadge({ rarity, className }: RarityBadgeProps) {
  const colors = RARITY_COLORS[rarity];
  const stars = RARITY_STARS[rarity];
  const isLegendary = rarity === "legendary";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold capitalize",
        isLegendary && "animate-pulse shadow-md",
        className,
      )}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border,
        borderWidth: "1px",
      }}
    >
      <span>{stars}</span>
      <span>{rarity}</span>
    </span>
  );
}
