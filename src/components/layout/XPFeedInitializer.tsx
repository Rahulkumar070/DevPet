"use client";
import { useXPFeed } from "@/hooks/useXPFeed";

export function XPFeedInitializer() {
  useXPFeed();
  return null;
}
