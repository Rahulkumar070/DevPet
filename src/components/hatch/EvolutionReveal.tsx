"use client";
import { motion, AnimatePresence } from "framer-motion";
import { ICompanion, RARITY_COLORS, EvolutionStage } from "@/types";
import { CompanionSprite } from "@/components/companion/CompanionSprite";

interface EvolutionRevealProps {
  companion: ICompanion;
  previousStage: EvolutionStage;
  onComplete: () => void;
}

export function EvolutionReveal({
  companion,
  previousStage,
  onComplete,
}: EvolutionRevealProps) {
  const colors = RARITY_COLORS[companion.rarity];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="text-center"
        >
          <motion.h2
            className="text-3xl font-bold mb-8"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            style={{ color: colors.border }}
          >
            ✨ EVOLUTION! ✨
          </motion.h2>

          <div className="flex items-center justify-center gap-8">
            <motion.div
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: 0, opacity: 0 }}
              transition={{ delay: 1, duration: 0.5 }}
            >
              <CompanionSprite
                species={companion.species}
                eye={companion.eye}
                hat={companion.hat}
                evolutionStage={previousStage}
                size={100}
              />
            </motion.div>

            <motion.div
              className="text-4xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0, 1, 0, 1] }}
              transition={{ delay: 0.5, duration: 1 }}
            >
              →
            </motion.div>

            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.2, 1], opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.5, type: "spring" }}
              onAnimationComplete={() => setTimeout(onComplete, 2000)}
            >
              <CompanionSprite
                species={companion.species}
                eye={companion.eye}
                hat={companion.hat}
                evolutionStage={companion.evolutionStage}
                size={120}
              />
            </motion.div>
          </div>

          <motion.p
            className="mt-8 text-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            style={{ color: colors.border }}
          >
            {companion.name} evolved to stage {companion.evolutionStage}!
          </motion.p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
