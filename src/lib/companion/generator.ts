import { Rarity, Stats } from "@/types";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Bug 3 fix: Species filtered by rarity
const SPECIES_BY_RARITY: Record<Rarity, string[]> = {
  common: ["nullbyte", "gitfox", "stackrat", "hexbug", "loopworm"],
  uncommon: ["compilot", "patchpup", "mergehog", "debugbear", "refactorcat"],
  rare: ["binaryboa", "recursivefox", "kernelkrab", "deploybird"],
  epic: ["segfaultdrake", "cloudwhale", "runtimelion"],
  legendary: ["rootwyrm", "voidphoenix", "quantumquokka"],
};

const EYES = ["·", "★", "~", "◆", "#", "ø"];
const HATS = [
  "rocket",
  "hoodie",
  "glasses",
  "antenna",
  "headphones",
  "cap",
  "laurel",
];

const RARITY_WEIGHTS = [
  { rarity: "common" as Rarity, weight: 60 },
  { rarity: "uncommon" as Rarity, weight: 25 },
  { rarity: "rare" as Rarity, weight: 10 },
  { rarity: "epic" as Rarity, weight: 4 },
  { rarity: "legendary" as Rarity, weight: 1 },
];

const RARITY_FLOOR: Record<Rarity, number> = {
  common: 8,
  uncommon: 18,
  rare: 28,
  epic: 38,
  legendary: 55,
};

export interface GeneratedCompanion {
  species: string;
  rarity: Rarity;
  eye: string;
  hat?: string;
  shiny: boolean;
  stats: Stats;
}

export function generateCompanion(username: string, salt?: string): GeneratedCompanion {
  const seed = hashString(username + (salt || Date.now().toString()));
  const rng = mulberry32(seed);

  // Rarity
  const roll = rng() * 100;
  let cumulative = 0;
  let rarity: Rarity = "common";
  for (const { rarity: r, weight } of RARITY_WEIGHTS) {
    cumulative += weight;
    if (roll < cumulative) {
      rarity = r;
      break;
    }
  }

  // Species - Bug 3 fix: filter by rarity
  const speciesPool = SPECIES_BY_RARITY[rarity];
  const species = speciesPool[Math.floor(rng() * speciesPool.length)];

  // Eye
  const eye = EYES[Math.floor(rng() * EYES.length)];

  // Hat (non-common only)
  let hat: string | undefined;
  if (rarity !== "common") {
    hat = HATS[Math.floor(rng() * HATS.length)];
  }

  // Shiny
  const shiny = rng() < 0.01;

  // Stats
  const floor = RARITY_FLOOR[rarity];
  const statNames = [
    "GRIND",
    "FOCUS",
    "SHIP",
    "SQUASH",
    "VIBE",
  ] as (keyof Stats)[];
  const peakIdx = Math.floor(rng() * 5);
  const dumpIdx = (peakIdx + 1 + Math.floor(rng() * 4)) % 5;

  const stats = {} as Stats;
  for (let i = 0; i < 5; i++) {
    if (i === peakIdx) {
      stats[statNames[i]] = Math.floor(floor + 50 + rng() * 30);
    } else if (i === dumpIdx) {
      stats[statNames[i]] = Math.max(0, Math.floor(floor - 10 + rng() * 15));
    } else {
      stats[statNames[i]] = Math.floor(floor + rng() * 40);
    }
    stats[statNames[i]] = Math.min(100, stats[statNames[i]]);
  }

  return { species, rarity, eye, hat, shiny, stats };
}
