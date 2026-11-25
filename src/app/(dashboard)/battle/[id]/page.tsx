"use client";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { BattleTurn, ICompanion } from "@/types";
import { useSocket } from "@/hooks/useSocket";
import Link from "next/link";
import { BattleArena } from "@/components/battle/BattleArena";

interface PopulatedBattle {
  _id: string;
  challengerId: { _id: string; username: string; avatarUrl: string };
  defenderId: { _id: string; username: string; avatarUrl: string };
  challengerCompanionId: ICompanion;
  defenderCompanionId: ICompanion;
  status: string;
  winnerId?: string;
  winnerCompanionId?: string;
  challengerXpAwarded: number;
  defenderXpAwarded: number;
  log: BattleTurn[];
  createdAt: string;
}

export default function BattleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, update } = useSession();
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const battleId = params.id as string;

  const {
    data: battle,
    isLoading,
    refetch,
  } = useQuery<PopulatedBattle>({
    queryKey: ["battle", battleId],
    queryFn: async () => {
      const res = await fetch(`/api/battle/${battleId}`);
      if (!res.ok) throw new Error("Battle not found");
      return res.json();
    },
  });

  useEffect(() => {
    if (!socket) return;
    const handleComplete = (data: { battleId: string }) => {
      if (data.battleId === battleId) {
        queryClient.invalidateQueries({ queryKey: ["user", "fresh"] });
        queryClient.invalidateQueries({ queryKey: ["companion", "active"] });
        queryClient.invalidateQueries({ queryKey: ["battle"] });
        refetch();
        update();
      }
    };
    socket.on("battle:completed", handleComplete);
    return () => {
      socket.off("battle:completed", handleComplete);
    };
  }, [socket, battleId, queryClient, refetch, update]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-6xl animate-pulse">⚔️</div>
      </div>
    );
  }

  if (!battle) {
    return (
      <div className="text-center py-12">
        <h1
          className="text-xl font-bold mb-4"

        >
          Battle not found
        </h1>
        <Link
          href="/battle"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-action text-on-action hover:bg-action/90 text-sm font-semibold"
        >
          ← Back to Arena
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-lg border border-edge bg-surface flex items-center justify-center text-subtle hover:text-ink transition-colors"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4 stroke-current fill-none"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div>
          <h1
            className="text-lg font-bold"

          >
            Battle
          </h1>
          <p className="text-[12px] text-subtle">
            @{battle.challengerId.username} vs @{battle.defenderId.username} ·{" "}
            {battle.log?.length || 0} turns
          </p>
        </div>
      </div>

      <BattleArena
        challengerCompanion={battle.challengerCompanionId}
        defenderCompanion={battle.defenderCompanionId}
        currentUserId={session?.user?.id || ""}
        turns={battle.log || []}
        winnerId={battle.winnerId?.toString() || null}
        challengerXp={battle.challengerXpAwarded || 0}
        defenderXp={battle.defenderXpAwarded || 0}
      />

      <div className="text-center mt-6 mb-8">
        <Link
          href="/battle"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-surface border border-edge text-ink text-sm font-semibold hover:bg-inset transition-colors shadow-sm"
        >
          ← Back to Arena
        </Link>
      </div>
    </div>
  );
}
