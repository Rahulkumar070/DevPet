"use client";

import { useXPFeed } from "@/hooks/useXPFeed";

export function XPFeedListener({ children }: { children: React.ReactNode }) {
  useXPFeed();
  return <>{children}</>;
}
