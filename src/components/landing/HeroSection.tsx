"use client";
import { motion } from "framer-motion";
import { signIn } from "next-auth/react";
import { GithubIcon } from "@/components/icons/GithubIcon";
import { PokemonCard } from "@/components/companion/PokemonCard";
import { ICompanion } from "@/types";

const MOCK_COMPANION: ICompanion = {
  _id: "mock00001",
  userId: "",
  rarity: "legendary",
  species: "voidphoenix",
  eye: "★",
  shiny: true,
  stats: { GRIND: 88, FOCUS: 76, SHIP: 92, SQUASH: 71, VIBE: 85 },
  name: "Luminary",
  personality: "Bold and adventurous",
  memoryLog: [],
  memorySummary: "",
  hatchedAt: "",
  level: 42,
  xp: 260000,
  evolutionStage: 3,
  isPublic: true,
  shareSlug: "luminary",
  likes: 0,
  mood: "excited",
  lastInteraction: "",
  battleWins: 24,
  battleLosses: 3,
  achievements: [],
  createdAt: "",
  updatedAt: "",
};

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center px-4 py-20 overflow-hidden bg-[#f5f3ed]">
      {/* Background texture */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(45,91,227,0.04),transparent_60%),radial-gradient(circle_at_80%_20%,rgba(193,125,16,0.05),transparent_50%)]" />

      {/* Floating background creatures */}
      <motion.div
        className="absolute top-16 left-8 text-6xl opacity-10"
        animate={{ y: [0, -18, 0], rotate: [0, 4, 0] }}
        transition={{ duration: 6, repeat: Infinity }}
      >🐤</motion.div>
      <motion.div
        className="absolute top-32 right-12 text-5xl opacity-10"
        animate={{ y: [0, -12, 0], rotate: [0, -3, 0] }}
        transition={{ duration: 5, repeat: Infinity, delay: 1 }}
      >🐱</motion.div>
      <motion.div
        className="absolute bottom-32 left-1/4 text-6xl opacity-10"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
      >🐉</motion.div>

      <div className="relative z-10 max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
        {/* Left: copy */}
        <div className="flex-1 text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2d5be3]/[.07] text-[#2d5be3] text-xs font-semibold mb-5"
          >
            ✦ Gamify your coding journey
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-['Jost',sans-serif] text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-5"
          >
            Meet your<br />
            <span className="text-[#2d5be3]">coding companion</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-[#6b6b6b] text-base sm:text-lg mb-8 max-w-lg mx-auto lg:mx-0"
          >
            Every GitHub commit grows your companion. Battle other developers,
            chat with AI-powered pets, and join guild wars. Your code powers their evolution.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
          >
            <button
              onClick={() => signIn("github", { redirectTo: "/dashboard" })}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#1a1a1a] text-white text-sm font-semibold shadow-md hover:bg-[#333] transition-colors"
            >
              <GithubIcon className="w-4 h-4" />
              Sign in with GitHub
            </button>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white border border-black/10 text-[#444] text-sm font-semibold hover:bg-[#f5f3ed] transition-colors"
            >
              How it works
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 flex items-center gap-5 justify-center lg:justify-start text-xs text-[#999]"
          >
            <span>🔗 GitHub synced</span>
            <span>⚔️ Guild wars</span>
            <span>💬 AI chat</span>
          </motion.div>
        </div>

        {/* Right: PokemonCard */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, type: "spring", stiffness: 100 }}
          className="shrink-0"
        >
          <PokemonCard companion={MOCK_COMPANION} />
        </motion.div>
      </div>
    </section>
  );
}
