"use client";
import { motion } from "framer-motion";
import { RARITY_COLORS, Rarity } from "@/types";

interface EggAnimationProps {
  isCracking?: boolean;
  isExploding?: boolean;
  rarity?: Rarity;
}

export function EggAnimation({
  isCracking,
  isExploding,
  rarity,
}: EggAnimationProps) {
  const colors = rarity ? RARITY_COLORS[rarity] : null;

  return (
    <div className="relative w-32 h-40 flex items-center justify-center">
      <motion.div
        className="text-8xl select-none"
        animate={
          isExploding
            ? { scale: [1, 1.5, 0], rotate: [0, 30, -30, 0] }
            : isCracking
              ? { rotate: [-3, 3, -3, 3, -3], scale: [1, 1.02, 1, 1.02, 1] }
              : { rotate: [-3, 3, -3] }
        }
        transition={
          isExploding
            ? { duration: 0.5 }
            : isCracking
              ? { duration: 0.3, repeat: Infinity }
              : { duration: 2, repeat: Infinity, ease: "easeInOut" }
        }
      >
        🥚
      </motion.div>

      {isCracking && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 120"
        >
          <motion.path
            d="M40 30 L45 50 L42 70"
            stroke="#333"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5 }}
          />
          <motion.path
            d="M55 25 L60 45 L58 65"
            stroke="#333"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          />
          <motion.path
            d="M50 40 L48 55 L52 75"
            stroke="#333"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          />
        </svg>
      )}

      {isExploding && (
        <>
          {[...Array(20)].map((_, i) => {
            const angle = (i / 20) * 360;
            const distance = 80 + (i * 3); // Deterministic distance based on index
            const x = Math.cos((angle * Math.PI) / 180) * distance;
            const y = Math.sin((angle * Math.PI) / 180) * distance;
            const color =
              colors?.border ||
              ["#FFD700", "#FFA500", "#FF6347", "#90EE90", "#87CEEB"][i % 5];

            return (
              <motion.div
                key={i}
                className="absolute w-3 h-3 rounded-full"
                style={{ backgroundColor: color, left: "50%", top: "50%" }}
                initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                animate={{ x, y, scale: 0, opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            );
          })}
        </>
      )}
    </div>
  );
}
