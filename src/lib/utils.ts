import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import crypto from "crypto";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatXP(xp: number): string {
  if (xp >= 1000) return `${(xp / 1000).toFixed(1)}k`;
  return xp.toString();
}

export function xpForNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.15, level));
}

export function levelFromXP(xp: number): number {
  let level = 1;
  let totalXP = 0;
  while (totalXP + xpForNextLevel(level) <= xp && level < 50) {
    totalXP += xpForNextLevel(level);
    level++;
  }
  return level;
}

export function xpProgressInCurrentLevel(xp: number): {
  current: number;
  needed: number;
  percent: number;
} {
  let level = 1;
  let totalXP = 0;
  while (totalXP + xpForNextLevel(level) <= xp && level < 50) {
    totalXP += xpForNextLevel(level);
    level++;
  }
  const current = xp - totalXP;
  const needed = xpForNextLevel(level);
  return { current, needed, percent: Math.floor((current / needed) * 100) };
}

export function generateShareSlug(species: string, name: string): string {
  const hex = Math.random().toString(16).slice(2, 6);
  const safeName = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 10);
  return `${species}-${safeName}-${hex}`;
}

export function generateReferralCode(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export function timeAgo(date: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function encryptToken(token: string): string {
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error("ENCRYPTION_KEY environment variable is required");
  }
  // Support both hex (64 chars) and base64 (44 chars) formats
  let key: Buffer;
  const rawKey = process.env.ENCRYPTION_KEY;
  if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    key = Buffer.from(rawKey, "hex");
  } else {
    key = Buffer.from(rawKey, "base64");
  }
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must decode to 32 bytes");
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  // Format: iv (12 bytes) + tag (16 bytes) + encrypted
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptToken(encrypted: string): string {
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error("ENCRYPTION_KEY environment variable is required");
  }
  // Support both hex (64 chars) and base64 (44 chars) formats
  let key: Buffer;
  const rawKey = process.env.ENCRYPTION_KEY;
  if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    key = Buffer.from(rawKey, "hex");
  } else {
    key = Buffer.from(rawKey, "base64");
  }
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must decode to 32 bytes");
  }
  const buf = Buffer.from(encrypted, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data) + decipher.final("utf8");
}
