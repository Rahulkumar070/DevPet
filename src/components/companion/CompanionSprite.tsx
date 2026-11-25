"use client";
import { motion } from "framer-motion";
import { SPECIES_EMOJI, HAT_EMOJI, EvolutionStage } from "@/types";

interface CompanionSpriteProps {
  species: string;
  eye: string;
  hat?: string;
  shiny?: boolean;
  evolutionStage?: EvolutionStage;
  size?: number;
}

export function CompanionSprite({
  species,
  eye,
  hat,
  shiny = false,
  evolutionStage = 1,
  size = 60,
}: CompanionSpriteProps) {
  const emoji = SPECIES_EMOJI[species] || "🐾";
  const hatEmoji = hat ? HAT_EMOJI[hat] : null;

  const fontSize = {
    1: size * 0.8,
    2: size * 1,
    3: size * 1.2,
  }[evolutionStage];

  const filter = shiny
    ? "hue-rotate(180deg) saturate(2)"
    : evolutionStage === 3
      ? "saturate(1.8) brightness(1.2)"
      : evolutionStage === 2
        ? "saturate(1.4) brightness(1.1)"
        : "none";

  return (
    <motion.div
      className="relative"
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      style={{ width: size, height: size }}
    >
      {hatEmoji && (
        <span
          className="absolute -top-4 left-1/2 -translate-x-1/2 z-10"
          style={{ fontSize: fontSize * 0.4 }}
        >
          {hatEmoji}
        </span>
      )}

      <span
        className="block text-center"
        style={{ fontSize, filter, lineHeight: 1 }}
      >
        {emoji}
      </span>

      <span
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-80 pointer-events-none"
        style={{ fontSize: fontSize * 0.2 }}
      >
        {eye}
        {eye}
      </span>

      {evolutionStage === 3 && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%)",
          }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {shiny && (
        <motion.div
          className="absolute -top-1 -right-1 text-lg"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        >
          ✨
        </motion.div>
      )}
    </motion.div>
  );
}
