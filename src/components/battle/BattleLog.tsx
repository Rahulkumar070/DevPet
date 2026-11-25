"use client";
import { motion } from "framer-motion";
import { BattleTurn } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BattleLogProps {
  turns: BattleTurn[];
  challengerName: string;
  defenderName: string;
}

export function BattleLog({ turns }: BattleLogProps) {
  return (
    <ScrollArea className="h-48 rounded-md border border-edge p-3">
      <div className="space-y-2">
        {turns.length === 0 ? (
          <p className="text-sm text-subtle text-center py-4">
            Battle log will appear here...
          </p>
        ) : (
          turns.map((turn, i) => (
            <motion.div
              key={turn.turn}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="text-sm"
            >
              <span className="text-subtle">Turn {turn.turn}:</span>{" "}
              <span className="font-medium">{turn.attackerName}</span> attacks
              for{" "}
              <span
                className={turn.crit ? "text-red-500 font-bold" : "font-medium"}
              >
                {turn.damage} damage
                {turn.crit && " (CRIT!)"}
              </span>
            </motion.div>
          ))
        )}
      </div>
    </ScrollArea>
  );
}
