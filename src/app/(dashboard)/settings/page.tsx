"use client";
import section from "@/components/dashboard/sections.module.css";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceUser } from "@/hooks/useWorkspaceUser";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { CompanionSprite } from "@/components/companion/CompanionSprite";
import { ICompanion } from "@/types";
import { toast } from "sonner";
import {
  User,
  Bell,
  Key,
  Copy,
  RefreshCw,
  Check,
  LogOut,
  Loader2,
  Egg,
} from "lucide-react";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const requestedTab = searchParams.get("tab") ?? "";
  const defaultTab = ["companions", "notifications", "api"].includes(requestedTab) ? requestedTab : "account";

  const [apiToken, setApiToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const pushStatusKey = ["pushSubscription", session?.user.id];
  const { data: notificationsEnabled, isFetching: checkingNotifications } = useQuery({
    queryKey: pushStatusKey,
    enabled: Boolean(session?.user.id),
    queryFn: async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
      const registration = await navigator.serviceWorker.getRegistration("/");
      if (!(await registration?.pushManager.getSubscription())) return false;
      const response = await fetch("/api/push/subscribe");
      if (!response.ok) throw new Error("Could not check notification settings");
      const { subscribed } = await response.json();
      return Boolean(subscribed);
    },
  });

  const notificationMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("Push notifications are unavailable in this browser");
      }

      if (!enabled) {
        const response = await fetch("/api/push/subscribe", { method: "DELETE" });
        if (!response.ok) throw new Error("Could not disable notifications");
        return;
      }

      if ((await Notification.requestPermission()) !== "granted") {
        throw new Error("Notification permission denied");
      }
      const response = await fetch("/api/push/vapid-key");
      if (!response.ok) throw new Error("Push notifications are unavailable on this server");
      const { vapidKey } = await response.json();
      await navigator.serviceWorker.register("/sw.js");
      const registration = await navigator.serviceWorker.ready;
      const subscription = (await registration.pushManager.getSubscription()) ??
        await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey });
      const saved = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription }),
      });
      if (!saved.ok) throw new Error("Could not save the push subscription");
    },
    onSuccess: (_, enabled) => {
      queryClient.setQueryData(pushStatusKey, enabled);
      toast.success(enabled ? "Notifications enabled" : "Notifications disabled");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const { data: freshUser } = useWorkspaceUser(session?.user.id);

  const { data: companions } = useQuery<ICompanion[]>({
    queryKey: ["companions"],
    queryFn: async () => {
      const res = await fetch("/api/companion");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const generateTokenMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/user/token", { method: "POST" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },
    onSuccess: (data) => {
      setApiToken(data.token);
      toast.success("API token generated!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const syncGithubMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/github/sync", { method: "POST" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Synced ${data.newCommits} commits, +${data.xpGained} XP!`);
      queryClient.invalidateQueries({ queryKey: ["companion", "active"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const setActiveMutation = useMutation({
    mutationFn: async (companionId: string) => {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeCompanionId: companionId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Active companion updated!");
      queryClient.invalidateQueries({ queryKey: ["companion", "active"] });
      queryClient.invalidateQueries({ queryKey: ["companions"] });
      queryClient.invalidateQueries({ queryKey: ["user", "fresh"] });
      update();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const copyToken = () => {
    if (apiToken) {
      navigator.clipboard.writeText(apiToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!session) return null;

  const card = "workspace-panel p-5";

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
        <p className="text-subtle text-sm">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="bg-inset border border-edge flex flex-wrap gap-0.5 h-auto w-full sm:w-auto sm:flex-nowrap">
          <TabsTrigger value="account"><User className="w-3.5 h-3.5 mr-1.5" />Account</TabsTrigger>
          <TabsTrigger value="companions"><Egg className="w-3.5 h-3.5 mr-1.5" />Companions</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="w-3.5 h-3.5 mr-1.5" />Notifications</TabsTrigger>
          <TabsTrigger value="api"><Key className="w-3.5 h-3.5 mr-1.5" />API</TabsTrigger>
        </TabsList>

        {/* Account */}
        <TabsContent value="account" className="space-y-4 mt-3">
          <div className={card}>
            <h2 className="font-bold text-sm mb-0.5">Profile</h2>
            <p className="text-subtle text-xs mb-4">Your account information</p>
            <div className={`${section.profileStrip} flex items-center gap-4 mb-4`}>
              {session.user.image && (
                <Image src={session.user.image} alt="" width={56} height={56} className="w-14 h-14 rounded-full" />
              )}
              <div>
                <p className="font-semibold">{session.user.name}</p>
                <p className="text-subtle text-sm">@{session.user.username}</p>
              </div>
            </div>
            <Separator className="mb-4" />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="account-email" className="text-xs text-subtle">Email</Label>
                <Input id="account-email" value={session.user.email || ""} disabled className="bg-inset border-0 mt-1" />
              </div>
              <div>
                <Label htmlFor="referral-code" className="text-xs text-subtle">Referral Code</Label>
                <div className="flex gap-2 mt-1">
                  <Input id="referral-code" value={session.user.referralCode} disabled className="bg-inset border-0 font-mono text-sm" />
                  <button aria-label="Copy referral link"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/r/${session.user.referralCode}`);
                      toast.success("Referral link copied!");
                    }}
                    className="w-9 h-9 rounded-lg bg-surface border border-edge flex items-center justify-center text-ink shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className={card}>
            <h2 className="font-bold text-sm mb-0.5">GitHub Sync</h2>
            <p className="text-subtle text-xs mb-4">Sync your recent commits to earn XP</p>
            <button
              onClick={() => syncGithubMutation.mutate()}
              disabled={syncGithubMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-action text-on-action hover:bg-action/90 text-sm font-semibold disabled:opacity-50"
            >
              {syncGithubMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Sync Now
            </button>
          </div>

          <div className="bg-surface border border-red-200/60 rounded-xl p-5">
            <h2 className="font-bold text-sm text-[#edb2b3] mb-3">Danger Zone</h2>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#d63031] text-white text-sm font-semibold"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </TabsContent>

        {/* Companions */}
        <TabsContent value="companions" className="mt-3">
          <div className={card}>
            <h2 className="font-bold text-sm mb-0.5">Your Companions</h2>
            <p className="text-subtle text-xs mb-4">Manage which companion is shown on your dashboard</p>
            <div className="space-y-2">
              {companions?.map((companion) => {
                const isActive = freshUser?.activeCompanionId?.toString() === companion._id.toString();
                return (
                  <div
                    key={companion._id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      isActive
                        ? "border-[#c17d10]/40 bg-[#352f29]"
                        : "border-edge bg-inset"
                    }`}
                  >
                    <CompanionSprite
                      species={companion.species}
                      eye={companion.eye}
                      hat={companion.hat}
                      evolutionStage={companion.evolutionStage}
                      size={36}
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{companion.name}</p>
                      <p className="text-xs text-subtle capitalize">
                        {companion.rarity} {companion.species} · Lv.{companion.level}
                      </p>
                    </div>
                    {isActive ? (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#c17d10]/10 text-[#e6c192]">Active</span>
                    ) : (
                      <button
                        onClick={() => setActiveMutation.mutate(companion._id)}
                        disabled={setActiveMutation.isPending}
                        className="px-3 py-1.5 rounded-lg bg-surface border border-edge text-ink text-xs font-semibold disabled:opacity-50"
                      >
                        Set Active
                      </button>
                    )}
                  </div>
                );
              })}
              {(!companions || companions.length === 0) && (
                <p className="text-center text-subtle text-sm py-4">
                  No companions yet.{" "}
                  <Link href="/hatch" className="text-action hover:underline">Hatch one!</Link>
                </p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="mt-3">
          <div className={card}>
            <h2 className="font-bold text-sm mb-0.5">Push Notifications</h2>
            <p className="text-subtle text-xs mb-4">Get reminded to code and keep your companion happy</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Enable notifications</p>
                <p className="text-xs text-subtle">Daily reminders and companion mood alerts</p>
              </div>
              <Switch
                aria-label="Enable notifications"
                checked={notificationsEnabled ?? false}
                disabled={notificationMutation.isPending || checkingNotifications}
                onCheckedChange={(enabled) => notificationMutation.mutate(enabled)}
              />
            </div>
          </div>
        </TabsContent>

        {/* API */}
        <TabsContent value="api" className="mt-3">
          <div className={card}>
            <h2 className="font-bold text-sm mb-0.5">VSCode Extension Token</h2>
            <p className="text-subtle text-xs mb-4">
              Use this token in the DevPet VS Code extension.
            </p>
            {apiToken ? (
              <div className="flex gap-2">
                <Input value={apiToken} readOnly className="font-mono text-sm bg-inset border-0" />
                <button
                  onClick={copyToken}
                  className="w-9 h-9 rounded-lg bg-surface border border-edge flex items-center justify-center text-ink shrink-0"
                >
                  {copied ? <Check className="w-4 h-4 text-[#a9d5ba]" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <button
                onClick={() => generateTokenMutation.mutate()}
                disabled={generateTokenMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-action text-on-action hover:bg-action/90 text-sm font-semibold disabled:opacity-50"
              >
                {generateTokenMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Key className="w-4 h-4" />
                )}
                Generate Token
              </button>
            )}
            <p className="text-xs text-subtle mt-3">Keep this token secure. Generate a new one if compromised.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
