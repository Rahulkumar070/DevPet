"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Crown, Search, Shield, X } from "lucide-react";

interface MemberWithDetails {
  _id: string;
  username: string;
  avatarUrl: string;
  level: number;
  xp: number;
  weeklyXp?: number;
  isOwner?: boolean;
}

interface MemberListProps {
  members: MemberWithDetails[];
  ownerId: string;
  isOwner: boolean;
  warActive?: boolean;
  onKick?: (memberId: string) => void;
  onPromote?: (memberId: string) => void;
}

export function MemberList({
  members,
  ownerId,
  isOwner,
  warActive,
  onKick,
  onPromote,
}: MemberListProps) {
  const [search, setSearch] = useState("");

  const filtered = members.filter((m) =>
    m.username.toLowerCase().includes(search.toLowerCase()),
  );

  const sorted = [...filtered].sort((a, b) => {
    if (a._id === ownerId) return -1;
    if (b._id === ownerId) return 1;
    return (b.weeklyXp ?? 0) - (a.weeklyXp ?? 0);
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Members ({members.length})</CardTitle>
          <div className="relative w-48">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
            <Input
              aria-label="Search guild members"
              placeholder="Search members…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="divide-y divide-edge">
            <AnimatePresence>
              {sorted.map((member, i) => (
                <motion.div
                  key={member._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-3 p-4 hover:bg-surface transition-colors"
                >
                  <div className="text-sm text-subtle w-6">#{i + 1}</div>

                  <Avatar>
                    <AvatarImage src={member.avatarUrl} alt={member.username} />
                    <AvatarFallback>
                      {member.username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        @{member.username}
                      </span>
                      {member._id === ownerId && (
                        <Badge
                          variant="secondary"
                          className="bg-[#423729] text-[#e6c192]"
                        >
                          <Crown className="w-3 h-3 mr-1" />
                          Owner
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-subtle">
                      Level {member.level} • {member.xp.toLocaleString()} XP
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="font-medium text-sm">
                      +{(member.weeklyXp ?? 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-subtle">this week</p>
                  </div>

                  {isOwner && member._id !== ownerId && !warActive && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onPromote?.(member._id)}
                      >
                        <Shield className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-[#edb2b3]"
                        onClick={() => onKick?.(member._id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
