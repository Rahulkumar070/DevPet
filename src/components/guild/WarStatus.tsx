"use client";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Swords, Clock, Trophy, Shield, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface WarStatusProps {
  warStatus: "idle" | "active" | "completed";
  opponentName?: string;
  opponentSlug?: string;
  endsAt?: string;
  ourXp?: number;
  theirXp?: number;
  winnerId?: string;
  ourGuildId?: string;
  onDeclareWar?: () => void;
  canDeclareWar?: boolean;
}

export function WarStatus({
  warStatus,
  opponentName,
  endsAt,
  ourXp = 0,
  theirXp = 0,
  winnerId,
  ourGuildId,
  onDeclareWar,
  canDeclareWar,
}: WarStatusProps) {
  const totalXp = ourXp + theirXp;
  const ourPercent = totalXp > 0 ? Math.round((ourXp / totalXp) * 100) : 50;
  const weWon = winnerId === ourGuildId;

  if (warStatus === "idle") {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Guild Wars
          </CardTitle>
          <CardDescription>
            Compete against other guilds! Earn XP together to win.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canDeclareWar ? (
            <Button onClick={onDeclareWar}>
              <Swords className="w-4 h-4 mr-2" />
              Declare War
            </Button>
          ) : (
            <p className="text-sm text-subtle">
              Guild owners can declare wars.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (warStatus === "completed") {
    return (
      <Card className={weWon ? "border-green-500" : "border-red-500"}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy
                className={`w-5 h-5 ${weWon ? "text-amber-500" : "text-subtle"}`}
              />
              War Results
            </CardTitle>
            <Badge variant={weWon ? "default" : "secondary"}>
              {weWon ? "🎉 Victory!" : "Defeat"}
            </Badge>
          </div>
          <CardDescription>vs {opponentName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Your guild: {ourXp.toLocaleString()} XP</span>
              <span>
                {opponentName}: {theirXp.toLocaleString()} XP
              </span>
            </div>
            <div className="h-4 rounded-full bg-edge overflow-hidden flex">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${ourPercent}%` }}
                className="h-full bg-gradient-to-r from-green-400 to-green-500"
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${100 - ourPercent}%` }}
                className="h-full bg-gradient-to-r from-red-400 to-red-500"
              />
            </div>
          </div>

          <Button
            className="mt-4"
            onClick={onDeclareWar}
            disabled={!canDeclareWar}
          >
            <Swords className="w-4 h-4 mr-2" />
            Start New War
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Active war
  const timeLeft = endsAt
    ? formatDistanceToNow(new Date(endsAt), { addSuffix: true })
    : "Unknown";

  return (
    <Card className="border-amber-500 bg-gradient-to-br from-[#342f2a] to-[#252429]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-red-500 animate-pulse" />
            War in Progress!
          </CardTitle>
          <Badge variant="destructive" className="animate-pulse">
            <Clock className="w-3 h-3 mr-1" />
            Ends {timeLeft}
          </Badge>
        </div>
        <CardDescription>vs {opponentName}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="text-center">
              <div className="text-3xl font-bold text-[#a9d5ba]">
                {ourXp.toLocaleString()}
              </div>
              <p className="text-xs text-subtle">Your guild</p>
            </div>
            <div className="text-2xl font-bold text-zinc-300">VS</div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#edb2b3]">
                {theirXp.toLocaleString()}
              </div>
              <p className="text-xs text-subtle">{opponentName}</p>
            </div>
          </div>

          <div className="h-6 rounded-full bg-edge overflow-hidden flex relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${ourPercent}%` }}
              transition={{ duration: 1 }}
              className="h-full bg-gradient-to-r from-green-400 to-green-500 flex items-center justify-end pr-2"
            >
              {ourPercent > 20 && (
                <span className="text-xs font-bold text-white">
                  {ourPercent}%
                </span>
              )}
            </motion.div>
          </div>

          <div className="flex items-center gap-2 text-sm text-subtle">
            <Sparkles className="w-4 h-4" />
            <span>Every commit and battle helps your guild!</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
