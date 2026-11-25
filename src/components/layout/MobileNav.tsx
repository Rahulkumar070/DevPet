"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Menu,
  Home,
  Egg,
  MessageCircle,
  Swords,
  Users,
  BarChart2,
  Settings,
  LogOut,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/hatch", label: "Hatch", icon: Egg },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/battle", label: "Battle", icon: Swords },
  { href: "/guild", label: "Guild", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  const { data: freshUser } = useQuery<{ xp: number; level: number; streak: number }>({
    queryKey: ["user", "fresh"],
    queryFn: async () => {
      const res = await fetch("/api/user");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  if (!session) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-80 bg-white border-r border-black/[.06] z-[100]">
        <div className="p-4 flex items-center justify-between border-b">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={session.user.image ?? ""}
                alt={session.user.name ?? ""}
              />
              <AvatarFallback>{session.user.name?.[0] ?? "U"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{session.user.name}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">
                  @{session.user.username}
                </span>
              </div>
            </div>
          </div>
        </div>
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>

        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="p-4 space-y-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Button
                  key={item.href}
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    isActive && "bg-zinc-100",
                  )}
                  onClick={() => setOpen(false)}
                  asChild
                >
                  <Link href={item.href}>
                    <item.icon className="w-4 h-4 mr-3" />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </div>

          <Separator className="my-4" />

          <div className="px-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Level</span>
              <span className="font-medium">{freshUser?.level ?? session.user.level ?? 1}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Streak</span>
              <span className="font-medium">{freshUser?.streak ?? session.user.streak ?? 0} 🔥</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">XP</span>
              <span className="font-medium">
                {(freshUser?.xp ?? session.user.xp ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
        </ScrollArea>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => signOut()}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
