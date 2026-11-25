"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Loading from "./loading";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanionSprite } from "@/components/companion/CompanionSprite";
import { RarityBadge } from "@/components/companion/RarityBadge";
import { useSocketContext } from "@/components/providers/SocketProvider";
import { ICompanion, IBattle } from "@/types";
import { Swords, Trophy, Clock, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function BattlePage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [opponentUsername, setOpponentUsername] = useState("");
  const { socket, connected } = useSocketContext();

  useEffect(() => {
    if (!socket) return;

    const handleBattleChallenge = (data: {
      challengerUsername: string;
      message: string;
    }) => {
      toast.info(data.message);
      queryClient.invalidateQueries({ queryKey: ["battles"] });
    };

    const handleBattleCompleted = (data: {
      battleId: string;
      message: string;
      isWinner: boolean;
    }) => {
      queryClient.invalidateQueries({ queryKey: ["battles"] });
      queryClient.invalidateQueries({ queryKey: ["companion", "active"] });
      queryClient.invalidateQueries({ queryKey: ["user", "fresh"] });
      if (data.battleId) {
        toast.success("Battle completed! Watch the replay...");
        router.push(`/battle/${data.battleId}`);
      }
    };

    const handleBattleDeclined = (data: { message: string }) => {
      toast.info(data.message);
      queryClient.invalidateQueries({ queryKey: ["battles"] });
    };

    socket.on("battle:challenge", handleBattleChallenge);
    socket.on("battle:completed", handleBattleCompleted);
    socket.on("battle:declined", handleBattleDeclined);

    return () => {
      socket.off("battle:challenge", handleBattleChallenge);
      socket.off("battle:completed", handleBattleCompleted);
      socket.off("battle:declined", handleBattleDeclined);
    };
  }, [socket, connected, queryClient, router]);

  const { data: companion, isPending: loadingCompanion, isError: companionError, refetch: retryCompanion } = useQuery<ICompanion | null>({
    queryKey: ["companion", "active"],
    queryFn: async () => {
      const res = await fetch("/api/companion/active");
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Could not load companion");
      return res.json();
    },
  });

  const { data: battles } = useQuery<IBattle[]>({
    queryKey: ["battles"],
    queryFn: async () => {
      const res = await fetch("/api/battle?limit=20");
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 10000,
  });

  const { data: leaderboard } = useQuery<
    (ICompanion & { username?: string })[]
  >({
    queryKey: ["leaderboard", "battle"],
    queryFn: async () => {
      const res = await fetch("/api/battle/leaderboard?limit=20");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const challengeMutation = useMutation({
    mutationFn: async (username: string) => {
      const res = await fetch("/api/battle/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defenderUsername: username }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Challenge sent!");
      setOpponentUsername("");
      queryClient.invalidateQueries({ queryKey: ["battles"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const acceptMutation = useMutation({
    mutationFn: async ({
      battleId,
      action,
    }: {
      battleId: string;
      action: "accept" | "decline";
    }) => {
      const res = await fetch("/api/battle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ battleId, action }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      if (data.status === "declined") {
        toast.info("Challenge declined");
        queryClient.invalidateQueries({ queryKey: ["battles"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["battles"] });
        queryClient.invalidateQueries({ queryKey: ["companion", "active"] });
        queryClient.invalidateQueries({ queryKey: ["user", "fresh"] });
        router.push(`/battle/${variables.battleId}`);
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const pendingBattles =
    battles?.filter(
      (b) =>
        b.status === "pending" &&
        (b.defenderId as unknown as { _id: string })?._id === session?.user.id,
    ) || [];

  const recentBattles = battles?.filter((b) => b.status === "completed") || [];

  if (loadingCompanion) return <Loading />;
  if (companionError) return <div className="space-y-4"><h1>Battle arena</h1><div className="workspace-panel p-5" role="alert">Couldn’t load your companion. <button className="underline" onClick={() => void retryCompanion()}>Try again</button></div></div>;
  if (!companion) {
    return (
      <div className="space-y-4"><h1>Battle arena</h1>
        <div className="workspace-panel p-8 text-center">
          <div className="text-5xl mb-4">🥚</div>
          <h2 className="text-lg font-bold tracking-tight mb-2">
            No companion yet!
          </h2>
          <p className="text-subtle text-sm mb-5">
            Hatch a companion first to start battling.
          </p>
          <Link
            href="/hatch"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-action text-on-action hover:bg-action/90 text-sm font-semibold"
          >
            Hatch Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Battle Arena
          </h1>
          <p className="text-subtle text-sm">
            Challenge other developers and prove your strength!
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Trophy className="w-4 h-4 text-[#e6c192]" />
          <span className="font-mono font-semibold">
            {companion.battleWins}
          </span>
          <span className="text-subtle">wins</span>
          <span className="text-subtle">|</span>
          <span className="font-mono text-subtle">
            {companion.battleLosses}
          </span>
          <span className="text-subtle">losses</span>
        </div>
      </div>

      {/* Pending battles */}
      {pendingBattles.length > 0 && (
        <div className="bg-[#352f29] border border-[#f5c97a]/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-[#e6c192] animate-pulse" />
            <span className="font-bold text-sm">
              Pending Challenges ({pendingBattles.length})
            </span>
          </div>
          <div className="space-y-2">
            {pendingBattles.map((battle) => (
              <div
                key={battle._id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-surface rounded-lg border border-edge"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    Challenge from @
                    {
                      (battle.challengerId as unknown as { username: string })
                        .username
                    }
                  </p>
                  <p className="text-xs text-subtle">
                    Expires{" "}
                    {formatDistanceToNow(new Date(battle.expiresAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <button
                  onClick={() =>
                    acceptMutation.mutate({
                      battleId: battle._id,
                      action: "accept",
                    })
                  }
                  disabled={acceptMutation.isPending}
                  className="px-4 py-1.5 rounded-full bg-action text-on-action hover:bg-action/90 text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
                >
                  {acceptMutation.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : null}
                  Accept
                </button>
                <button
                  onClick={() =>
                    acceptMutation.mutate({
                      battleId: battle._id,
                      action: "decline",
                    })
                  }
                  disabled={acceptMutation.isPending}
                  className="px-4 py-1.5 rounded-lg bg-surface border border-edge text-ink text-xs font-semibold disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse lg:grid lg:grid-cols-3 gap-4">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Challenge form */}
          <div className="workspace-panel p-5">
            <h2 className="font-bold text-sm mb-0.5">
              Challenge a Developer
            </h2>
            <p className="text-subtle text-xs mb-3">
              Enter a GitHub username to challenge them to battle
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (opponentUsername.trim())
                  challengeMutation.mutate(opponentUsername.trim());
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
                <Input
                  placeholder="GitHub username"
                  value={opponentUsername}
                  onChange={(e) => setOpponentUsername(e.target.value)}
                  className="pl-9 bg-inset border-0 focus-visible:ring-1 focus-visible:ring-action"
                />
              </div>
              <button
                type="submit"
                disabled={
                  challengeMutation.isPending || !opponentUsername.trim()
                }
                className="px-4 py-2 rounded-full bg-action text-on-action hover:bg-action/90 text-sm font-semibold disabled:opacity-40 flex items-center gap-1.5"
              >
                {challengeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Swords className="w-4 h-4" />
                )}
                Challenge
              </button>
            </form>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="recent">
            <TabsList className="bg-inset border border-edge">
              <TabsTrigger value="recent">Recent Battles</TabsTrigger>
              <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            </TabsList>

            <TabsContent value="recent">
              <div className="workspace-panel overflow-hidden">
                <ScrollArea className="h-[400px]">
                  <div className="p-3 space-y-2">
                    {recentBattles.length === 0 ? (
                      <p className="text-center text-subtle text-sm py-10">
                        No battles yet. Challenge someone!
                      </p>
                    ) : (
                      recentBattles.map((battle) => {
                        const won = battle.winnerId === session?.user.id;
                        return (
                          <Link key={battle._id} href={`/battle/${battle._id}`}>
                            <motion.div
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                won
                                  ? "bg-[#24362e] hover:bg-[#24362e]"
                                  : "bg-[#38282d] hover:bg-[#38282d]"
                              }`}
                            >
                              <span className="text-xl">
                                {won ? "🎉" : "💀"}
                              </span>
                              <div className="flex-1">
                                <p className="font-semibold text-sm">
                                  {won ? "Victory!" : "Defeat"}
                                </p>
                                <p className="text-xs text-subtle">
                                  vs @
                                  {(
                                    battle.challengerId as unknown as {
                                      _id: string;
                                    }
                                  )?._id === session?.user.id
                                    ? (
                                        battle.defenderId as unknown as {
                                          username: string;
                                        }
                                      ).username
                                    : (
                                        battle.challengerId as unknown as {
                                          username: string;
                                        }
                                      ).username}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-mono font-semibold text-sm text-[#a9d5ba]">
                                  +
                                  {(
                                    battle.challengerId as unknown as {
                                      _id: string;
                                    }
                                  )?._id === session?.user.id
                                    ? battle.challengerXpAwarded
                                    : battle.defenderXpAwarded}{" "}
                                  XP
                                </p>
                                <p className="text-xs text-subtle">
                                  {formatDistanceToNow(
                                    new Date(battle.createdAt),
                                    { addSuffix: true },
                                  )}
                                </p>
                              </div>
                            </motion.div>
                          </Link>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="leaderboard">
              <div className="workspace-panel overflow-hidden">
                <ScrollArea className="h-[400px]">
                  <div className="divide-y divide-edge">
                    {leaderboard?.map((c, i) => {
                      return (
                        <div
                          key={c._id}
                          className="flex items-center gap-3 p-3 hover:bg-inset transition-colors"
                        >
                          <div className="font-mono text-sm font-bold text-subtle w-7 text-center">
                            {i === 0
                              ? "🥇"
                              : i === 1
                                ? "🥈"
                                : i === 2
                                  ? "🥉"
                                  : `#${i + 1}`}
                          </div>
                          <CompanionSprite
                            species={c.species}
                            eye={c.eye}
                            hat={c.hat}
                            evolutionStage={c.evolutionStage}
                            size={36}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">
                                {c.name}
                              </span>
                              <RarityBadge rarity={c.rarity} />
                            </div>
                            <p
                              className="text-xs text-subtle"
                            >
                              @{c.username} · Lv.{c.level}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-[#e6c192]">
                              <Trophy className="w-3.5 h-3.5" />
                              <span className="font-mono font-bold text-sm">
                                {c.battleWins}
                              </span>
                            </div>
                            <p className="text-[10px] text-subtle">wins</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Your Fighter */}
        <div>
          <div className="workspace-panel p-4">
            <h2 className="font-bold text-sm mb-3">
              Your Fighter
            </h2>
            <div className="flex lg:flex-col lg:items-center items-center gap-4 lg:gap-0 lg:text-center">
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="shrink-0"
              >
                <CompanionSprite
                  species={companion.species}
                  eye={companion.eye}
                  hat={companion.hat}
                  evolutionStage={companion.evolutionStage}
                  size={60}
                />
              </motion.div>
              <div className="flex-1 lg:mt-3">
                <h3 className="font-bold">
                  {companion.name}
                </h3>
                <div className="flex items-center gap-2 lg:justify-center mt-1">
                  <RarityBadge rarity={companion.rarity} />
                  <span className="font-mono text-xs text-subtle">
                    Lv.{companion.level}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#24362e] p-2.5 rounded-lg text-center">
                    <p className="font-mono font-bold text-[#a9d5ba] text-base">
                      {companion.battleWins}
                    </p>
                    <p className="text-subtle">Wins</p>
                  </div>
                  <div className="bg-[#38282d] p-2.5 rounded-lg text-center">
                    <p className="font-mono font-bold text-[#edb2b3] text-base">
                      {companion.battleLosses}
                    </p>
                    <p className="text-subtle">Losses</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
