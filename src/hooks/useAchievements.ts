"use client";
import { useQuery } from "@tanstack/react-query";
import { IAchievement } from "@/types";
import { ACHIEVEMENT_DEFINITIONS } from "@/lib/db/models/Achievement";

export function useAchievements(unlockedKeys: string[]) {
  return useQuery<{ unlocked: IAchievement[]; locked: IAchievement[] }>({
    queryKey: ["achievements", unlockedKeys],
    queryFn: async () => {
      const all = ACHIEVEMENT_DEFINITIONS as unknown as IAchievement[];
      const unlocked = all.filter((a) => unlockedKeys.includes(a.key));
      const locked = all.filter((a) => !unlockedKeys.includes(a.key));
      return { unlocked, locked };
    },
    staleTime: Infinity,
  });
}
