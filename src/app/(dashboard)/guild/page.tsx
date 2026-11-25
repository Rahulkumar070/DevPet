"use client";
import section from "@/components/dashboard/sections.module.css";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { IGuild } from "@/types";
import { Users, Plus, Trophy, Search, Loader2, Crown } from "lucide-react";
import { toast } from "sonner";

export default function GuildPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [newGuildName, setNewGuildName] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: myGuild } = useQuery<{ guild: IGuild | null }>({
    queryKey: ["guild", "mine"],
    queryFn: async () => {
      const res = await fetch("/api/guild?mine=true");
      if (!res.ok) return { guild: null };
      return res.json();
    },
  });

  const { data: guilds } = useQuery<(IGuild & { memberCount: number; ownerUsername: string })[]>({
    queryKey: ["guilds"],
    queryFn: async () => {
      const res = await fetch("/api/guild");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/guild", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Guild created!");
      setCreateDialogOpen(false);
      setNewGuildName("");
      queryClient.invalidateQueries({ queryKey: ["guild"] });
      queryClient.invalidateQueries({ queryKey: ["guilds"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const joinMutation = useMutation({
    mutationFn: async (slug: string) => {
      const res = await fetch(`/api/guild/${slug}`, { method: "POST" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Joined guild!");
      queryClient.invalidateQueries({ queryKey: ["guild"] });
      queryClient.invalidateQueries({ queryKey: ["guilds"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const filtered =
    guilds?.filter(
      (g) =>
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.ownerUsername?.toLowerCase().includes(search.toLowerCase()),
    ) || [];

  if (myGuild?.guild) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Your Guild</h1>
            <p className="text-subtle text-sm">You are a member of {myGuild.guild.name}</p>
          </div>
          <Link
            href={`/guild/${myGuild.guild.slug}`}
            className="self-start sm:self-auto px-4 py-2 rounded-full bg-action text-on-action hover:bg-action/90 text-sm font-semibold"
          >
            View Guild
          </Link>
        </div>

        {/* Guild hero card */}
        <div className={`${section.guildHighlight} rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4`}>
          <div className="text-5xl">🏰</div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{myGuild.guild.name}</h2>
            <p className="text-subtle text-sm">
              <span className="font-mono">{myGuild.guild.members.length}</span> members ·{" "}
              <span className="font-mono">{myGuild.guild.weeklyXp.toLocaleString()}</span> XP this week
            </p>
          </div>
          <div className="sm:text-right">
            <div className="flex items-center gap-2 text-base font-bold">
              <Trophy className="w-4 h-4 text-[#e6c192]" />
              <span className="font-mono">{myGuild.guild.wins}W - {myGuild.guild.losses}L</span>
            </div>
            <p className="text-xs text-subtle">Guild record</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Link href={`/guild/${myGuild.guild.slug}`}>
            <div className="workspace-panel p-5 cursor-pointer hover:shadow-md transition-shadow h-full">
              <Users className="w-7 h-7 text-action mb-3" />
              <h3 className="font-bold mb-1">Members</h3>
              <p className="text-subtle text-sm">
                View all {myGuild.guild.members.length} guild members and their stats
              </p>
            </div>
          </Link>

          <Link href={`/guild/${myGuild.guild.slug}?tab=war`}>
            <div className="workspace-panel p-5 cursor-pointer hover:shadow-md transition-shadow h-full">
              <Trophy className="w-7 h-7 text-[#edb2b3] mb-3" />
              <h3 className="font-bold mb-1">Guild Wars</h3>
              <p className="text-subtle text-sm">
                {myGuild.guild.warStatus === "active"
                  ? "War in progress! Check your status."
                  : "Start a war against another guild"}
              </p>
            </div>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Guilds</h1>
          <p className="text-subtle text-sm">Join a guild or create your own</p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <button className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-full bg-action text-on-action hover:bg-action/90 text-sm font-semibold">
              <Plus className="w-4 h-4" />
              Create Guild
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a Guild</DialogTitle>
              <DialogDescription>
                Name your guild. You can invite up to 50 members.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newGuildName.trim()) createMutation.mutate(newGuildName.trim());
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="guildName">Guild Name</Label>
                <Input
                  id="guildName"
                  value={newGuildName}
                  onChange={(e) => setNewGuildName(e.target.value)}
                  placeholder="The Rubber Ducks"
                  maxLength={32}
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 rounded-full bg-action text-on-action hover:bg-action/90 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Guild
              </button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Browse guilds */}
      <div className="workspace-panel overflow-hidden">
        <div className="p-4 border-b border-edge flex flex-col sm:flex-row sm:items-center gap-3">
          <h2 className="font-bold text-sm">Browse Guilds</h2>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
            <Input
              aria-label="Search guilds"
              placeholder="Search guilds…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-inset border-0 focus-visible:ring-1 focus-visible:ring-action"
            />
          </div>
        </div>
        <ScrollArea className="h-[500px]">
          <div className="divide-y divide-edge">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-subtle text-sm"><span className={section.guildSymbol} aria-hidden="true">🏰</span>
                {search.trim() ? "No guilds match your search." : "No guilds yet. Create one to get started."}
              </div>
            ) : (
              filtered.map((guild, i) => (
                <motion.div
                  key={guild._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 hover:bg-inset transition-colors"
                >
                  <div className={section.guildSymbol} aria-hidden="true">🏰</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">{guild.name}</h3>
                      {guild.warStatus === "active" && (
                        <span className="text-[10px] bg-[#38282d] text-[#edb2b3] px-2 py-0.5 rounded-full font-semibold">
                          ⚔️ At War
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-subtle">
                      <Crown className="w-3 h-3 inline mr-0.5" />@{guild.ownerUsername} ·{" "}
                      <span className="font-mono">{guild.memberCount}</span> members
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="font-mono font-semibold text-sm">{guild.weeklyXp.toLocaleString()} XP</p>
                    <p className="text-xs text-subtle">this week</p>
                  </div>
                  <button
                    onClick={() => joinMutation.mutate(guild.slug)}
                    disabled={joinMutation.isPending}
                    className="px-4 py-1.5 rounded-full bg-action text-on-action hover:bg-action/90 text-xs font-semibold disabled:opacity-50 flex items-center gap-1"
                  >
                    {joinMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    Join
                  </button>
                </motion.div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
