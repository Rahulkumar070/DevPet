"use client";
import section from "@/components/dashboard/sections.module.css";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { HatchReveal } from "@/components/hatch/HatchReveal";
import { CompanionCard } from "@/components/companion/CompanionCard";
import { ICompanion } from "@/types";
import { Egg } from "lucide-react";

export default function HatchPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [showHatchReveal, setShowHatchReveal] = useState(false);

  const { data: companions } = useQuery<ICompanion[]>({
    queryKey: ["companions"],
    queryFn: async () => {
      const res = await fetch("/api/companion");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const handleHatch = async (): Promise<ICompanion> => {
    const res = await fetch("/api/companion", { method: "POST" });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to hatch");
    }
    const companion = await res.json();
    queryClient.invalidateQueries({ queryKey: ["companions"] });
    queryClient.invalidateQueries({ queryKey: ["companion", "active"] });
    return companion;
  };

  if (!session) return null;

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Hatchery</h1>
        <p className="text-subtle text-sm mt-0.5">
          Hatch a companion from your GitHub username and explore your collection.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {showHatchReveal ? (
          <HatchReveal onHatch={handleHatch} username={session.user.username} />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className={section.hatchStage}>
              <div className={section.hatchEgg} aria-hidden="true"><span>🥚</span></div>
              <h2 className="text-2xl font-semibold tracking-tight mb-2">Ready to hatch?</h2>
              <p className="text-sm mb-5 max-w-sm">
                Your companion&apos;s rarity, species, and stats are determined by your GitHub username.
                Shiny companions are rare (1 in 100)!
              </p>

              <button
                onClick={() => setShowHatchReveal(true)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#23202c] text-white hover:bg-[#37303d] text-sm font-semibold"
              >
                <Egg className="w-4 h-4" />
                Hatch My Companion
              </button>
            </div>

            {companions && companions.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-base font-bold tracking-tight">Your companions</h2>
                <div className="grid items-start grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {companions.map((companion) => (
                    <CompanionCard key={companion._id} companion={companion} size="sm" />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
