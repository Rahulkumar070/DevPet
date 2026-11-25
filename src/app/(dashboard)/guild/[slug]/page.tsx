"use client";
import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GuildHeader,
  GuildHeaderSkeleton,
} from "@/components/guild/GuildHeader";
import { MemberList } from "@/components/guild/MemberList";
import { WarStatus } from "@/components/guild/WarStatus";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { IGuild } from "@/types";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Search, Users, Zap, Swords } from "lucide-react";

interface GuildWithDetails extends Omit<IGuild, "members"> {
  ownerUsername?: string;
  memberCount?: number;
  memberAvatars?: string[];
  members: Array<{
    _id: string;
    username: string;
    avatarUrl: string;
    level: number;
    xp: number;
    weeklyXp?: number;
  }>;
}

interface WarStatusData {
  status: "idle" | "active" | "completed";
  opponent?: string;
  opponentSlug?: string;
  endsAt?: string;
  ourXp?: number;
  theirXp?: number;
  winnerId?: string;
  ourGuildId?: string;
}

interface SearchGuild {
  _id: string;
  name: string;
  slug: string;
  memberCount: number;
  weeklyXp: number;
  warStatus: "idle" | "active" | "completed";
  cosmetic?: string;
}

export default function GuildDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const slug = params.slug as string;
  const defaultTab = searchParams.get("tab") || "members";
  const [showWarDialog, setShowWarDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGuild, setSelectedGuild] = useState<SearchGuild | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: guild, isLoading } = useQuery<GuildWithDetails>({
    queryKey: ["guild", slug],
    queryFn: async () => {
      const res = await fetch(`/api/guild/${slug}`);
      if (!res.ok) throw new Error("Guild not found");
      return res.json();
    },
  });

  const { data: warStatus } = useQuery<WarStatusData>({
    queryKey: ["guild", slug, "war"],
    queryFn: async () => {
      const res = await fetch(`/api/guild/${slug}/war`);
      if (!res.ok) return { status: "idle" };
      return res.json();
    },
    enabled: !!guild,
  });

  // Search guilds for war declaration
  const { data: searchResults, isLoading: isSearching } = useQuery<SearchGuild[]>({
    queryKey: ["guilds", "search", debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch) return [];
      const res = await fetch(`/api/guild?search=${encodeURIComponent(debouncedSearch)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: debouncedSearch.length >= 2,
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/guild/${slug}`, { method: "DELETE" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Left guild");
      queryClient.invalidateQueries({ queryKey: ["guild"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const kickMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const res = await fetch(`/api/guild/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kickMemberId: memberId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Member kicked");
      queryClient.invalidateQueries({ queryKey: ["guild", slug] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const declareWarMutation = useMutation({
    mutationFn: async (targetSlug: string) => {
      const res = await fetch(`/api/guild/${slug}/war`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "declare", opponentSlug: targetSlug }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`War declared against ${data.war.opponent}!`);
      setShowWarDialog(false);
      setSearchQuery("");
      setSelectedGuild(null);
      queryClient.invalidateQueries({ queryKey: ["guild", slug, "war"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleDeclareWar = () => {
    setShowWarDialog(true);
  };

  const handleConfirmWar = () => {
    if (!selectedGuild) {
      toast.error("Please select a guild to challenge");
      return;
    }
    declareWarMutation.mutate(selectedGuild.slug);
  };

  const handleCloseDialog = () => {
    setShowWarDialog(false);
    setSearchQuery("");
    setSelectedGuild(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/guild">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Guilds
          </Link>
        </Button>
        <GuildHeaderSkeleton />
      </div>
    );
  }

  if (!guild) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Guild not found</h1>
        <Button asChild>
          <Link href="/guild">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Guilds
          </Link>
        </Button>
      </div>
    );
  }

  const isOwner = guild.ownerId.toString() === session?.user.id;
  const isMember = guild.members.some((m) => m._id === session?.user.id);
  const warActive = guild.warStatus === "active";

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild>
        <Link href="/guild">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Guilds
        </Link>
      </Button>

      {/* War Active Banner */}
      {warActive && (
        <div className="bg-red-950 border border-red-800 rounded-lg p-4 flex items-center gap-3">
          <span className="text-2xl">⚔️</span>
          <div>
            <p className="font-bold text-red-400">War is Active!</p>
            <p className="text-sm text-red-300">
              No one can leave, join, or be kicked during war.
              {warStatus?.endsAt && (
                <> Ends {new Date(warStatus.endsAt).toLocaleDateString()}.</>
              )}{" "}
              Keep pushing commits to earn XP for your guild!
            </p>
          </div>
        </div>
      )}

      <GuildHeader
        guild={guild}
        isOwner={isOwner}
        isMember={isMember}
        warActive={warActive}
        onLeave={() => leaveMutation.mutate()}
      />

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="war">Guild War</TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <MemberList
            members={guild.members}
            ownerId={guild.ownerId.toString()}
            isOwner={isOwner}
            warActive={warActive}
            onKick={(memberId) => kickMutation.mutate(memberId)}
          />
        </TabsContent>

        <TabsContent value="war">
          <WarStatus
            warStatus={warStatus?.status || "idle"}
            opponentName={warStatus?.opponent}
            opponentSlug={warStatus?.opponentSlug}
            endsAt={warStatus?.endsAt}
            ourXp={warStatus?.ourXp}
            theirXp={warStatus?.theirXp}
            winnerId={warStatus?.winnerId}
            ourGuildId={warStatus?.ourGuildId}
            canDeclareWar={isOwner}
            onDeclareWar={handleDeclareWar}
          />
        </TabsContent>
      </Tabs>

      {/* Declare War Dialog with Searchable Guild Picker */}
      <Dialog open={showWarDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Declare War</DialogTitle>
            <DialogDescription>
              Search for a guild to challenge. The war will last 7 days.
              The guild with the most XP earned during that time wins!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="guildSearch">Search Guilds</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
                <Input
                  id="guildSearch"
                  placeholder="Type guild name..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedGuild(null);
                  }}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Selected Guild */}
            {selectedGuild && (
              <div className="p-3 rounded-lg border-2 border-amber-400 bg-[#352f29]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{selectedGuild.name}</p>
                    <div className="flex items-center gap-3 text-sm text-subtle">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {selectedGuild.memberCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {selectedGuild.weeklyXp} XP/week
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline">Selected</Badge>
                </div>
              </div>
            )}

            {/* Search Results */}
            {!selectedGuild && searchQuery.length >= 2 && (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {isSearching ? (
                  <p className="text-sm text-subtle text-center py-4">Searching...</p>
                ) : searchResults && searchResults.length > 0 ? (
                  searchResults.map((g) => {
                    const isAtWar = g.warStatus === "active";
                    return (
                      <button
                        key={g._id}
                        onClick={() => !isAtWar && setSelectedGuild(g)}
                        disabled={isAtWar}
                        className={`w-full p-3 rounded-lg border text-left transition-colors ${
                          isAtWar
                            ? "opacity-50 cursor-not-allowed bg-inset"
                            : "hover:border-amber-400 hover:bg-[#352f29] cursor-pointer"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium flex items-center gap-2">
                              {g.cosmetic && <span>{g.cosmetic}</span>}
                              {g.name}
                            </p>
                            <div className="flex items-center gap-3 text-sm text-subtle">
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {g.memberCount}
                              </span>
                              <span className="flex items-center gap-1">
                                <Zap className="w-3 h-3" />
                                {g.weeklyXp} XP/week
                              </span>
                            </div>
                          </div>
                          {isAtWar ? (
                            <Badge variant="destructive" className="text-xs">
                              <Swords className="w-3 h-3 mr-1" />
                              At War
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Available</Badge>
                          )}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <p className="text-sm text-subtle text-center py-4">
                    No guilds found matching &quot;{searchQuery}&quot;
                  </p>
                )}
              </div>
            )}

            {!selectedGuild && searchQuery.length < 2 && (
              <p className="text-xs text-subtle text-center">
                Type at least 2 characters to search
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmWar}
              disabled={!selectedGuild || declareWarMutation.isPending}
            >
              {declareWarMutation.isPending ? "Declaring..." : "Declare War"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
