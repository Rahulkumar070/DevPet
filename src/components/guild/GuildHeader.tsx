"use client";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Users, Shield, Sparkles } from "lucide-react";
import Link from "next/link";

interface GuildMember {
  _id: string;
  username: string;
  avatarUrl: string;
}

interface GuildHeaderProps {
  guild: {
    _id: string;
    name: string;
    slug: string;
    wins: number;
    losses: number;
    weeklyXp: number;
    warStatus: "idle" | "active" | "completed";
    warEndsAt?: string | Date;
    cosmetic?: string;
    members: (string | GuildMember)[];
    ownerUsername?: string;
    memberCount?: number;
    memberAvatars?: string[];
  };
  isMember?: boolean;
  isOwner?: boolean;
  warActive?: boolean;
  onJoin?: () => void;
  onLeave?: () => void;
}

export function GuildHeader({
  guild,
  isMember,
  isOwner,
  warActive,
  onJoin,
  onLeave,
}: GuildHeaderProps) {
  const winRate =
    guild.wins + guild.losses > 0
      ? Math.round((guild.wins / (guild.wins + guild.losses)) * 100)
      : 0;

  const memberCount = guild.memberCount ?? guild.members.length;
  const memberAvatars =
    guild.memberAvatars ??
    guild.members
      .filter((m): m is GuildMember => typeof m === "object")
      .map((m) => m.avatarUrl);

  return (
    <Card className="overflow-hidden">
      {guild.cosmetic && (
        <div className="h-32 bg-gradient-to-r from-amber-400 via-orange-400 to-red-400" />
      )}

      <CardHeader className={guild.cosmetic ? "-mt-16 relative" : ""}>
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`w-24 h-24 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-5xl shadow-lg ${
              guild.cosmetic ? "border-4 border-white" : ""
            }`}
          >
            🏰
          </motion.div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1>{guild.name}</h1>
              {guild.warStatus === "active" && (
                <Badge variant="destructive" className="animate-pulse">
                  ⚔️ At War
                </Badge>
              )}
            </div>

            <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {memberCount} members
              </span>
              <span className="flex items-center gap-1">
                <Trophy className="w-4 h-4" />
                {guild.wins}W - {guild.losses}L ({winRate}%)
              </span>
              <span className="flex items-center gap-1">
                <Sparkles className="w-4 h-4" />
                {guild.weeklyXp.toLocaleString()} XP this week
              </span>
            </CardDescription>
          </div>

          <div className="flex gap-2">
            {isOwner ? (
              <Button variant="outline" asChild>
                <Link href={`/guild/${guild.slug}/settings`}>
                  <Shield className="w-4 h-4 mr-2" />
                  Manage
                </Link>
              </Button>
            ) : isMember ? (
              !warActive && (
                <Button variant="outline" onClick={onLeave}>
                  Leave Guild
                </Button>
              )
            ) : (
              !warActive && (
                <Button onClick={onJoin}>
                  <Users className="w-4 h-4 mr-2" />
                  Join Guild
                </Button>
              )
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center gap-4">
          <span className="text-sm text-subtle">Members:</span>
          <div className="flex -space-x-2">
            {memberAvatars.slice(0, 8).map((avatar, i) => (
              <Avatar
                key={i}
                className="w-8 h-8 border-2 border-white"
              >
                <AvatarImage src={avatar} />
                <AvatarFallback>?</AvatarFallback>
              </Avatar>
            ))}
            {memberCount > 8 && (
              <div className="w-8 h-8 rounded-full bg-inset border-2 border-white flex items-center justify-center text-xs">
                +{memberCount - 8}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function GuildHeaderSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <Skeleton className="w-24 h-24 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex -space-x-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="w-8 h-8 rounded-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
