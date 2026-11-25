import { EvolutionStage } from "@/types";

interface EvolutionBadgeProps {
  stage: EvolutionStage;
}

const STAGE_LABELS: Record<
  EvolutionStage,
  { label: string; icon: string; color: string }
> = {
  1: { label: "Baby", icon: "🥚", color: "bg-zinc-100 text-zinc-600" },
  2: { label: "Teen", icon: "🌱", color: "bg-green-100 text-green-700" },
  3: { label: "Adult", icon: "⭐", color: "bg-purple-100 text-purple-700" },
};

export function EvolutionBadge({ stage }: EvolutionBadgeProps) {
  const { label, icon, color } = STAGE_LABELS[stage];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
}
