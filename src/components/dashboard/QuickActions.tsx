"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageCircle, Swords, Share2 } from "lucide-react";
import { GithubIcon } from "@/components/icons/GithubIcon";

interface QuickActionsProps {
  companionSlug?: string;
  onSyncGithub?: () => void;
  isSyncing?: boolean;
}

export function QuickActions({
  companionSlug,
  onSyncGithub,
  isSyncing,
}: QuickActionsProps) {
  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="w-full justify-start" asChild>
          <Link href="/chat">
            <MessageCircle className="w-4 h-4 mr-2" />
            Chat
          </Link>
        </Button>

        <Button variant="outline" className="w-full justify-start" asChild>
          <Link href="/battle">
            <Swords className="w-4 h-4 mr-2" />
            Battle
          </Link>
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => {
            if (companionSlug) {
              navigator.clipboard.writeText(
                `${window.location.origin}/companion/${companionSlug}`,
              );
            }
          }}
          disabled={!companionSlug}
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={onSyncGithub}
          disabled={isSyncing}
        >
          <GithubIcon className="w-4 h-4 mr-2" />
          {isSyncing ? "Syncing..." : "Sync XP"}
        </Button>
      </div>
    </Card>
  );
}
