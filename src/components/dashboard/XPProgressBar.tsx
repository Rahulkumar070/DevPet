"use client";
import { motion } from "framer-motion";
import { xpProgressInCurrentLevel } from "@/lib/utils";

interface XPProgressBarProps {
  xp: number;
  level: number;
}

export function XPProgressBar({ xp, level }: XPProgressBarProps) {
  const { current, needed, percent } = xpProgressInCurrentLevel(xp);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">Level {level}</span>
        <span className="text-zinc-500">
          {current}/{needed} XP
        </span>
      </div>
      <div className="h-3 bg-zinc-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
        />
      </div>
    </div>
  );
}
