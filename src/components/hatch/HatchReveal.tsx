"use client";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ICompanion, RARITY_COLORS } from "@/types";
import { CompanionCard } from "@/components/companion/CompanionCard";
import { EggAnimation } from "./EggAnimation";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

type HatchState =
  | "idle"
  | "cracking"
  | "exploding"
  | "revealing"
  | "naming"
  | "complete";

interface HatchRevealProps {
  onHatch: () => Promise<ICompanion>;
  username: string;
}

export function HatchReveal({ onHatch, username }: HatchRevealProps) {
  const [state, setState] = useState<HatchState>("idle");
  const [companion, setCompanion] = useState<ICompanion | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [displayPersonality, setDisplayPersonality] = useState("");
  const router = useRouter();

  const startHatch = useCallback(async () => {
    setState("cracking");

    setTimeout(() => setState("exploding"), 1500);

    try {
      const newCompanion = await onHatch();
      setCompanion(newCompanion);

      setTimeout(() => {
        setState("revealing");

        setTimeout(() => {
          setState("naming");

          let nameIndex = 0;
          const nameInterval = setInterval(() => {
            if (nameIndex <= newCompanion.name.length) {
              setDisplayName(newCompanion.name.slice(0, nameIndex));
              nameIndex++;
            } else {
              clearInterval(nameInterval);

              let persIndex = 0;
              const persInterval = setInterval(() => {
                if (persIndex <= newCompanion.personality.length) {
                  setDisplayPersonality(
                    newCompanion.personality.slice(0, persIndex),
                  );
                  persIndex++;
                } else {
                  clearInterval(persInterval);
                  setState("complete");
                }
              }, 20);
            }
          }, 100);
        }, 1500);
      }, 1000);
    } catch (error) {
      console.error("Hatch failed:", error);
      setState("idle");
    }
  }, [onHatch]);

  const rarityColor = companion ? RARITY_COLORS[companion.rarity] : null;
  const isEpicOrLegendary =
    companion &&
    (companion.rarity === "epic" || companion.rarity === "legendary");

  return (
    <div className="workspace-panel p-5 relative min-h-[450px] flex flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        {state === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center space-y-6"
          >
            <h2 className="text-2xl font-bold">
              Your username seeds your companion
            </h2>
            <p className="text-subtle">
              Username: <span className="font-mono font-bold">{username}</span>
            </p>
            <p className="text-sm text-subtle max-w-md">
              Your GitHub username combined with a special seed determines your
              companion&apos;s species, stats, and rarity. Everyone gets a
              unique companion!
            </p>
            <Button size="lg" onClick={startHatch}>
              Begin Hatching
            </Button>
          </motion.div>
        )}

        {(state === "cracking" || state === "exploding") && (
          <motion.div
            key="egg"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
          >
            <EggAnimation
              isCracking={state === "cracking"}
              isExploding={state === "exploding"}
              rarity={companion?.rarity}
            />
            <p className="text-center mt-4 text-lg font-medium animate-pulse">
              {state === "cracking" ? "Something is hatching..." : "HATCHING!"}
            </p>
          </motion.div>
        )}

        {state === "revealing" && companion && (
          <>
            {isEpicOrLegendary && (
              <motion.div
                className="fixed inset-0 z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                style={{ backgroundColor: rarityColor?.bg }}
              />
            )}
            <motion.div
              key="reveal"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="relative z-50"
            >
              <div className="text-6xl mb-4 text-center">
                {companion.rarity === "legendary"
                  ? "👑"
                  : companion.rarity === "epic"
                    ? "💎"
                    : "✨"}
              </div>
              <h3
                className="text-3xl font-bold text-center mb-2"
                style={{ color: rarityColor?.border }}
              >
                {companion.rarity.toUpperCase()}!
              </h3>
            </motion.div>
          </>
        )}

        {(state === "naming" || state === "complete") && companion && (
          <motion.div
            key="naming"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <motion.h2
              className="text-4xl font-bold"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              style={{ color: rarityColor?.border }}
            >
              {displayName}
              {state === "naming" &&
                displayName.length < companion.name.length && (
                  <span className="animate-pulse">|</span>
                )}
            </motion.h2>

            {displayPersonality && (
              <motion.p
                className="text-lg italic max-w-md mx-auto text-subtle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                &ldquo;{displayPersonality}
                {state === "naming" &&
                  displayPersonality.length < companion.personality.length && (
                    <span className="animate-pulse">|</span>
                  )}
                &rdquo;
              </motion.p>
            )}
          </motion.div>
        )}

        {state === "complete" && companion && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 w-full max-w-sm space-y-6"
          >
            <CompanionCard companion={companion} size="lg" />

            <div className="flex gap-3 justify-center">
              <Button onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/companion/${companion.shareSlug}`,
                  );
                }}
              >
                Share Companion
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
