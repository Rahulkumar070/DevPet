"use client";
import { useEffect } from "react";
import { useSocket } from "./useSocket";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

export function useXPFeed() {
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const { update } = useSession();

  useEffect(() => {
    if (!socket) return;

    socket.on(
      "xp_gained",
      (data: {
        amount: number;
        source: string;
        total?: number;
        level?: number;
      }) => {
        const description = data.level
          ? `Level ${data.level} • ${data.total} XP total`
          : `From ${data.source}`;

        toast.success(`+${data.amount} XP`, {
          description,
          duration: 3000,
          position: "bottom-right",
        });

        // Invalidate queries so dashboard re-fetches fresh data
        queryClient.invalidateQueries({ queryKey: ["user", "fresh"] });
        queryClient.invalidateQueries({ queryKey: ["companion", "active"] });

        // Refresh NextAuth JWT session
        update();
      },
    );

    socket.on(
      "achievement_unlocked",
      ({
        achievement,
        xpReward,
      }: {
        achievement: { icon: string; name: string };
        xpReward?: number;
      }) => {
        toast.success(`${achievement.icon} Achievement unlocked!`, {
          description: xpReward ? `${achievement.name} • +${xpReward} XP` : achievement.name,
          duration: 5000,
          position: "bottom-right",
        });

        queryClient.invalidateQueries({ queryKey: ["user", "fresh"] });
        update();
      },
    );

    socket.on(
      "mood_changed",
      ({
        mood,
        companionName,
        description,
      }: {
        mood: string;
        oldMood: string;
        companionName: string;
        description: string;
      }) => {
        const moodEmojis: Record<string, string> = {
          excited: "🎉",
          happy: "😊",
          neutral: "😐",
          hungry: "🥺",
          sleepy: "😴",
        };

        toast.warning(`${moodEmojis[mood] || "🐾"} ${companionName} is ${mood}`, {
          description,
          duration: 5000,
          position: "bottom-right",
        });

        queryClient.invalidateQueries({ queryKey: ["companion", "active"] });
      },
    );

    return () => {
      socket.off("xp_gained");
      socket.off("achievement_unlocked");
      socket.off("mood_changed");
    };
  }, [socket, queryClient, update]);
}
