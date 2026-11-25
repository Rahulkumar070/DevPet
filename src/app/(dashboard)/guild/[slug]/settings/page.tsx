"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Save, Trash2, Crown } from "lucide-react";

interface GuildMember {
  _id: string;
  username: string;
  avatarUrl: string;
}

interface GuildData {
  _id: string;
  name: string;
  slug: string;
  ownerId: string;
  members: GuildMember[];
}

export default function GuildSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const slug = params.slug as string;

  const [guildName, setGuildName] = useState<string | null>(null);
  const [newOwnerId, setNewOwnerId] = useState("");

  const { data: guild, isLoading } = useQuery<GuildData>({
    queryKey: ["guild", slug],
    queryFn: async () => {
      const res = await fetch(`/api/guild/${slug}`);
      if (!res.ok) throw new Error("Guild not found");
      return res.json();
    },
  });

  // Derive the displayed guild name - prefer local state if set, otherwise use fetched data
  const displayedGuildName = guildName ?? guild?.name ?? "";

  const updateMutation = useMutation({
    mutationFn: async (data: { name?: string; transferOwnerId?: string }) => {
      const res = await fetch(`/api/guild/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Guild updated!");
      queryClient.invalidateQueries({ queryKey: ["guild", slug] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/guild/${slug}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Guild deleted");
      router.push("/guild");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href={`/guild/${slug}`}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Guild
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
        </Card>
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

  const isOwner = guild.ownerId === session?.user?.id;

  if (!isOwner) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-subtle mb-4">Only the guild owner can manage settings.</p>
        <Button asChild>
          <Link href={`/guild/${slug}`}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Guild
          </Link>
        </Button>
      </div>
    );
  }

  const otherMembers = guild.members.filter((m) => m._id !== session?.user?.id);

  const handleSaveName = () => {
    if (displayedGuildName.trim() && displayedGuildName !== guild.name) {
      updateMutation.mutate({ name: displayedGuildName.trim() });
    }
  };

  const handleTransferOwnership = () => {
    if (newOwnerId) {
      updateMutation.mutate({ transferOwnerId: newOwnerId });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Button variant="ghost" asChild>
        <Link href={`/guild/${slug}`}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Guild
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold">Guild Settings</h1>
        <p className="text-subtle">Manage your guild</p>
      </div>

      {/* Guild Name */}
      <Card>
        <CardHeader>
          <CardTitle>Guild Name</CardTitle>
          <CardDescription>Change your guild&apos;s display name</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="guildName">Name</Label>
            <Input
              id="guildName"
              value={displayedGuildName}
              onChange={(e) => setGuildName(e.target.value)}
              maxLength={32}
            />
          </div>
          <Button
            onClick={handleSaveName}
            disabled={updateMutation.isPending || displayedGuildName === guild.name}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Name
          </Button>
        </CardContent>
      </Card>

      {/* Transfer Ownership */}
      {otherMembers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              Transfer Ownership
            </CardTitle>
            <CardDescription>
              Transfer guild ownership to another member
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newOwner">New Owner</Label>
              <Select value={newOwnerId} onValueChange={setNewOwnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a member" />
                </SelectTrigger>
                <SelectContent>
                  {otherMembers.map((member) => (
                    <SelectItem key={member._id} value={member._id}>
                      @{member.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={!newOwnerId}>
                  Transfer Ownership
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Transfer Ownership?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will make the selected member the new owner. You will no longer
                    be able to manage guild settings. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleTransferOwnership}>
                    Transfer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-[#edb2b3]">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions. Please be careful.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Guild
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Guild?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the guild &quot;{guild.name}&quot; and remove
                  all members. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete Guild
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
