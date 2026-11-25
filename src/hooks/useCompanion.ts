"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ICompanion } from "@/types";

export function useActiveCompanion() {
  return useQuery<ICompanion | null>({
    queryKey: ["companion", "active"],
    queryFn: async () => {
      const res = await fetch("/api/companion/active");
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch companion");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useCompanionBySlug(slug: string) {
  return useQuery<ICompanion>({
    queryKey: ["companion", slug],
    queryFn: async () => {
      const res = await fetch(`/api/companion/${slug}`);
      if (!res.ok) throw new Error("Companion not found");
      return res.json();
    },
    enabled: !!slug,
    staleTime: 60_000,
  });
}

export function useLikeCompanion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (slug: string) => {
      const res = await fetch(`/api/companion/${slug}`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to like");
      return res.json();
    },
    onSuccess: (_, slug) => {
      queryClient.invalidateQueries({ queryKey: ["companion", slug] });
    },
  });
}

export function useUserCompanions() {
  return useQuery<ICompanion[]>({
    queryKey: ["companions"],
    queryFn: async () => {
      const res = await fetch("/api/companion");
      if (!res.ok) throw new Error("Failed to fetch companions");
      return res.json();
    },
    staleTime: 30_000,
  });
}
