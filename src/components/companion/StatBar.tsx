"use client";
import { motion } from "framer-motion";
import { STAT_COLORS, Stats } from "@/types";

interface StatBarProps {
  stat: keyof Stats;
  value: number;
  showLabel?: boolean;
}

export function StatBar({ stat, value, showLabel = false }: StatBarProps) {
  const color = STAT_COLORS[stat];
  const normalizedValue = Math.min(100, Math.max(0, value));

  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex justify-between text-xs">
          <span className="font-medium" style={{ color }}>
            {stat}
          </span>
          <span className="opacity-70">{value}/100</span>
        </div>
      )}
      <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${normalizedValue}%` }}
          transition={{
            type: "spring",
            stiffness: 100,
            damping: 15,
            delay: 0.1,
          }}
        />
      </div>
    </div>
  );
}
