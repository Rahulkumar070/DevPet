"use client";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Trophy, Flame } from "lucide-react";
import { IGuild } from "@/types";

interface GuildCardProps {
  guild: IGuild & { memberCount?: number };
}

export function GuildCard({ guild }: GuildCardProps) {
  const memberCount = guild.memberCount ?? guild.members?.length ?? 0;

  return (
    <Link href={`/guild/${guild.slug}`}>
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">{guild.name}</h3>
          {guild.warStatus === "active" && (
            <Badge variant="destructive" className="animate-pulse">
              <Flame className="w-3 h-3 mr-1" />
              At War!
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <Users className="w-4 h-4 mx-auto mb-1 text-zinc-400" />
            <p className="text-lg font-bold">{memberCount}</p>
            <p className="text-xs text-zinc-500">Members</p>
          </div>
          <div>
            <Trophy className="w-4 h-4 mx-auto mb-1 text-amber-500" />
            <p className="text-lg font-bold">
              {guild.wins}/{guild.losses}
            </p>
            <p className="text-xs text-zinc-500">W/L</p>
          </div>
          <div>
            <Flame className="w-4 h-4 mx-auto mb-1 text-orange-500" />
            <p className="text-lg font-bold">{guild.weeklyXp}</p>
            <p className="text-xs text-zinc-500">Weekly XP</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
