"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" },
  { href: "/hatch", label: "Hatch", icon: "M12 2C8 2 5 5.6 5 10c0 4.4 3 8 7 8s7-3.6 7-8c0-4.4-3-8-7-8z" },
  { href: "/chat", label: "Chat", icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" },
  { href: "/battle", label: "Battle", icon: "M14.5 17.5L3 6V3h3l11.5 11.5M13 7l4-4 5 5-4 4M3 21l3.5-3.5" },
  { href: "/guild", label: "Guild", icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" },
  { href: "/analytics", label: "Analytics", icon: "M18 20V10M12 20V4M6 20v-6" },
];

export function IconRail() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <>
      {/* Desktop Rail */}
      <nav className="hidden lg:flex fixed left-0 top-0 bottom-0 w-16 bg-white border-r border-black/[.06] flex-col items-center py-4 z-20">
        <Link href="/dashboard" className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#2d5be3] to-[#6c5ce7] flex items-center justify-center mb-6 shadow-md">
          <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-white"><path d="M12 2C6.5 2 2 5 2 9c0 3 2.5 5.5 6 6.5V22l4-3 4 3v-6.5c3.5-1 6-3.5 6-6.5 0-4-4.5-7-10-7z"/></svg>
        </Link>
        <div className="flex flex-col gap-1 items-center">
          {navItems.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href} title={item.label}
                className={`w-10 h-10 rounded-[10px] flex items-center justify-center transition-all ${isActive ? "bg-[#1a1a1a] text-white" : "text-[#999] hover:bg-[#f5f3ed] hover:text-[#444]"}`}>
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] stroke-current fill-none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
              </Link>
            );
          })}
        </div>
        <div className="mt-auto flex flex-col gap-1.5 items-center">
          <Link href="/settings" title="Settings"
            className={`w-10 h-10 rounded-[10px] flex items-center justify-center transition-all ${pathname.startsWith("/settings") ? "bg-[#1a1a1a] text-white" : "text-[#999] hover:bg-[#f5f3ed]"}`}>
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] stroke-current fill-none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06c.5-.5.67-1.2.33-1.82a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09c.7-.05 1.29-.5 1.51-1.08a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06c.5.5 1.2.67 1.82.33.58-.27 1.03-.86 1.08-1.51V3a2 2 0 014 0v.09c.05.7.5 1.29 1.08 1.51.62.26 1.33.1 1.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06c-.5.5-.67 1.2-.33 1.82.27.58.86 1.03 1.51 1.08H21a2 2 0 010 4h-.09c-.7.05-1.29.5-1.51 1.08z"/>
            </svg>
          </Link>
          <div className="w-[34px] h-[34px] rounded-[9px] bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center text-[11px] font-bold text-white cursor-pointer">
            {session?.user?.name?.[0] || "U"}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Bar */}
      <nav className="flex lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-black/[.06] z-50 items-center justify-around px-4 py-2" style={{paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)"}}>
        {navItems.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}
              className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all ${isActive ? "text-[#1a1a1a]" : "text-[#999]"}`}>
              <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-current fill-none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              {isActive && <div className="w-1 h-1 rounded-full bg-[#1a1a1a] mt-0.5" />}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
