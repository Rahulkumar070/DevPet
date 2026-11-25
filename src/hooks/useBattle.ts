"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { IBattle } from "@/types";

export function useBattleHistory() {
  return useQuery<IBattle[]>({
    queryKey: ["battles"],
    queryFn: async () => {
      const res = await fetch("/api/battle");
      if (!res.ok) throw new Error("Failed to fetch battles");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useBattle(id: string) {
  return useQuery<IBattle>({
    queryKey: ["battle", id],
    queryFn: async () => {
      const res = await fetch(`/api/battle/${id}`);
      if (!res.ok) throw new Error("Battle not found");
      return res.json();
    },
    enabled: !!id,
    refetchInterval: 2000,
  });
}

export function useChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (defenderUsername: string) => {
      const res = await fetch("/api/battle/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defenderUsername }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Challenge failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["battles"] });
    },
  });
}

export function useAcceptBattle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (battleId: string) => {
      const res = await fetch("/api/battle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ battleId, action: "accept" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to accept");
      }
      return res.json();
    },
    onSuccess: (_, battleId) => {
      queryClient.invalidateQueries({ queryKey: ["battle", battleId] });
      queryClient.invalidateQueries({ queryKey: ["battles"] });
    },
  });
}

export function useDeclineBattle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (battleId: string) => {
      const res = await fetch("/api/battle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ battleId, action: "decline" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to decline");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["battles"] });
    },
  });
}

export function useBattleLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard", "battles"],
    queryFn: async () => {
      const res = await fetch("/api/battle/leaderboard");
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
    staleTime: 60_000,
  });
}
