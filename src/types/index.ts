export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type Mood = "happy" | "neutral" | "hungry" | "sleepy" | "excited";
export type EvolutionStage = 1 | 2 | 3;

export interface Stats {
  GRIND: number;
  FOCUS: number;
  SHIP: number;
  SQUASH: number;
  VIBE: number;
}

export interface ICompanion {
  _id: string;
  userId: string;
  rarity: Rarity;
  species: string;
  eye: string;
  hat?: string;
  shiny: boolean;
  stats: Stats;
  name: string;
  personality: string;
  memoryLog: string[];
  memorySummary: string;
  hatchedAt: string;
  level: number;
  xp: number;
  evolutionStage: EvolutionStage;
  isPublic: boolean;
  shareSlug: string;
  likes: number;
  mood: Mood;
  lastInteraction: string;
  battleWins: number;
  battleLosses: number;
  achievements: string[];
  createdAt: string;
  updatedAt: string;
}

export interface IUser {
  _id: string;
  githubId: string;
  username: string;
  email: string;
  avatarUrl: string;
  companions: string[];
  activeCompanionId?: string;
  guildId?: string;
  xp: number;
  level: number;
  codingSessions: number;
  streak: number;
  lastActiveDate?: string;
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  createdAt: string;
}

export interface IGuild {
  _id: string;
  name: string;
  slug: string;
  ownerId: string;
  members: string[];
  wins: number;
  losses: number;
  weeklyXp: number;
  warStatus: "idle" | "active" | "completed";
  warOpponentId?: string;
  warEndsAt?: string;
  cosmetic?: string;
  createdAt: string;
}

export interface IBattle {
  _id: string;
  challengerId: string;
  challengerCompanionId: string;
  defenderId: string;
  defenderCompanionId: string;
  status: "pending" | "active" | "completed" | "declined";
  winnerId?: string;
  winnerCompanionId?: string;
  log: BattleTurn[];
  challengerXpAwarded?: number;
  defenderXpAwarded?: number;
  expiresAt: string;
  createdAt: string;
}

export interface BattleTurn {
  turn: number;
  attackerCompanionId: string;
  attackerName: string;
  damage: number;
  crit: boolean;
  defenderHp: number;
  attackerHp: number;
}

export interface IAchievement {
  key: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  rarity: Rarity;
}

export const RARITY_COLORS: Record<
  Rarity,
  { bg: string; text: string; border: string }
> = {
  common: { bg: "#F1EFE8", text: "#444441", border: "#D3D1C7" },
  uncommon: { bg: "#EAF3DE", text: "#3B6D11", border: "#C0DD97" },
  rare: { bg: "#E6F1FB", text: "#185FA5", border: "#B5D4F4" },
  epic: { bg: "#EEEDFE", text: "#3C3489", border: "#CECBF6" },
  legendary: { bg: "#FAEEDA", text: "#854F0B", border: "#FAC775" },
};

export const RARITY_STARS: Record<Rarity, string> = {
  common: "★",
  uncommon: "★★",
  rare: "★★★",
  epic: "★★★★",
  legendary: "★★★★★",
};

export const SPECIES_EMOJI: Record<string, string> = {
  nullbyte: "🌑",
  gitfox: "🦊",
  stackrat: "🐀",
  hexbug: "🪲",
  loopworm: "🪱",
  compilot: "🤖",
  patchpup: "🐶",
  mergehog: "🦔",
  debugbear: "🐻",
  refactorcat: "🐱",
  binaryboa: "🐍",
  recursivefox: "🦊",
  kernelkrab: "🦀",
  deploybird: "🐦",
  segfaultdrake: "🐲",
  cloudwhale: "🐋",
  runtimelion: "🦁",
  rootwyrm: "🐉",
  voidphoenix: "🦅",
  quantumquokka: "🦘",
};

export const HAT_EMOJI: Record<string, string> = {
  rocket: "🚀",
  hoodie: "🧥",
  glasses: "🕶️",
  antenna: "📡",
  headphones: "🎧",
  cap: "🧢",
  laurel: "🌿",
};

export const MOOD_EMOJI: Record<Mood, string> = {
  excited: "✨",
  happy: "😊",
  neutral: "😐",
  hungry: "😤",
  sleepy: "😴",
};

export const STAT_COLORS: Record<keyof Stats, string> = {
  GRIND: "#2563eb",
  FOCUS: "#16a34a",
  SHIP: "#dc2626",
  SQUASH: "#7c3aed",
  VIBE: "#d97706",
};
