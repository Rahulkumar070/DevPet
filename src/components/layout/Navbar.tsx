"use client";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GithubIcon } from "@/components/icons/GithubIcon";
import { LogOut, Settings, User } from "lucide-react";
import { MobileNav } from "./MobileNav";

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const isLanding = pathname === "/";

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-black/[.06] bg-white backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <span className="text-2xl">🐾</span>
            <span>DevPet</span>
          </Link>

          {!isLanding && session && (
            <div className="hidden lg:flex items-center gap-4">
              <Link
                href="/dashboard"
                className={`text-sm hover:text-zinc-900 transition-colors ${
                  pathname === "/dashboard" ? "font-bold" : "text-zinc-500"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/battle"
                className={`text-sm hover:text-zinc-900 transition-colors ${
                  pathname.startsWith("/battle") ? "font-bold" : "text-zinc-500"
                }`}
              >
                Battle
              </Link>
              <Link
                href="/guild"
                className={`text-sm hover:text-zinc-900 transition-colors ${
                  pathname.startsWith("/guild") ? "font-bold" : "text-zinc-500"
                }`}
              >
                Guild
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {session ? (
            <>
              <div className="hidden lg:flex items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-9 w-9 rounded-full"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage
                          src={session.user.image ?? ""}
                          alt={session.user.name ?? ""}
                        />
                        <AvatarFallback>
                          {session.user.name?.[0] ?? "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="font-medium">{session.user.name}</p>
                      <p className="text-xs text-zinc-500">
                        @{session.user.username}
                      </p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard">
                        <User className="w-4 h-4 mr-2" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings">
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut()}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <MobileNav />
            </>
          ) : (
            <Button onClick={() => signIn("github", { redirectTo: "/dashboard" })}>
              <GithubIcon className="w-4 h-4 mr-2" />
              Sign in
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
