"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobileTopIcons() {
  const pathname = usePathname();
  const isSettings = pathname.startsWith("/settings");

  return (
    <div className="flex lg:hidden fixed top-0 right-0 z-30 items-center gap-1 p-3">
      <Link
        href="/settings"
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
          isSettings
            ? "bg-[#1a1a1a] text-white"
            : "bg-white/80 backdrop-blur-sm border border-black/[.06] text-[#999] hover:text-[#444]"
        }`}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06c.5-.5.67-1.2.33-1.82a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09c.7-.05 1.29-.5 1.51-1.08a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06c.5.5 1.2.67 1.82.33.58-.27 1.03-.86 1.08-1.51V3a2 2 0 014 0v.09c.05.7.5 1.29 1.08 1.51.62.26 1.33.1 1.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06c-.5.5-.67 1.2-.33 1.82.27.58.86 1.03 1.51 1.08H21a2 2 0 010 4h-.09c-.7.05-1.29.5-1.51 1.08z" />
        </svg>
      </Link>
    </div>
  );
}
