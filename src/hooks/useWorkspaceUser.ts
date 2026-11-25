"use client";
import { useQuery } from "@tanstack/react-query";
import type { IUser } from "@/types";

export function useWorkspaceUser(userId?: string) {
  return useQuery({
    queryKey: ["user", "fresh", userId],
    enabled: !!userId,
    refetchInterval: 30_000,
    queryFn: async (): Promise<IUser> => {
      const response = await fetch("/api/user");
      if (!response.ok) throw new Error("Could not load account");
      return response.json();
    },
  });
}
