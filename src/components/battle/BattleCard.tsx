"use client";
import { ICompanion, RARITY_COLORS } from "@/types";
import { CompanionSprite } from "@/components/companion/CompanionSprite";
import { RarityBadge } from "@/components/companion/RarityBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Swords } from "lucide-react";

interface BattleCardProps {
  companion: ICompanion;
  username: string;
  onChallenge?: () => void;
  isLoading?: boolean;
}

export function BattleCard({
  companion,
  username,
  onChallenge,
  isLoading,
}: BattleCardProps) {
  const colors = RARITY_COLORS[companion.rarity];

  return (
    <Card
      className="p-4 flex items-center gap-4"
      style={{ borderColor: colors.border }}
    >
      <CompanionSprite
        species={companion.species}
        eye={companion.eye}
        hat={companion.hat}
        evolutionStage={companion.evolutionStage}
        size={50}
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-bold">{companion.name}</h4>
          <RarityBadge rarity={companion.rarity} />
        </div>
        <p className="text-sm text-subtle">
          @{username} • Lv.{companion.level}
        </p>
        <p className="text-xs text-subtle">
          {companion.battleWins}W / {companion.battleLosses}L
        </p>
      </div>
      {onChallenge && (
        <Button size="sm" onClick={onChallenge} disabled={isLoading}>
          <Swords className="w-4 h-4 mr-1" />
          Challenge
        </Button>
      )}
    </Card>
  );
}
