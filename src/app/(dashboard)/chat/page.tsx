"use client";
import section from "@/components/dashboard/sections.module.css";
import { useState, useRef, useEffect } from "react";
import Loading from "./loading";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CompanionSprite } from "@/components/companion/CompanionSprite";
import { MoodBadge } from "@/components/companion/MoodBadge";
import { ICompanion } from "@/types";
import { Send } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: companion, isPending: loadingCompanion, isError: companionError, refetch: retryCompanion } = useQuery<ICompanion | null>({
    queryKey: ["companion", "active"],
    queryFn: async () => {
      const res = await fetch("/api/companion/active");
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Could not load companion");
      return res.json();
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No reader");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const { text } = JSON.parse(data);
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last.role === "assistant") {
                  return [...prev.slice(0, -1), { ...last, content: last.content + text }];
                }
                return prev;
              });
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send message");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  };

  if (loadingCompanion) return <Loading />;
  if (companionError) return <div className="space-y-4"><h1>Companion chat</h1><div className="workspace-panel p-5" role="alert">Couldn’t load your companion. <button className="underline" onClick={() => void retryCompanion()}>Try again</button></div></div>;
  if (!companion) {
    return (
      <div className="space-y-4"><h1>Companion chat</h1>
        <div className="workspace-panel p-8 text-center">
          <div className="text-5xl mb-4">🥚</div>
          <h2 className="text-lg font-bold tracking-tight mb-2">No companion yet!</h2>
          <p className="text-subtle text-sm mb-5">Hatch a companion first to start chatting with them.</p>
          <Link
            href="/hatch"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-action text-on-action hover:bg-action/90 text-sm font-semibold"
          >
            Hatch Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl min-h-96 h-[calc(100dvh-7rem)] flex flex-col gap-3">
      <h1>Companion chat</h1>
      <div className={`${section.chatProfile} px-4 py-3 flex items-center gap-3 shrink-0`}>
        <CompanionSprite
          species={companion.species}
          eye={companion.eye}
          hat={companion.hat}
          evolutionStage={companion.evolutionStage}
          size={44}
        />
        <div className="flex-1">
          <p className="font-bold text-sm">{companion.name}</p>
          <p className="text-subtle text-xs">{companion.personality}</p>
        </div>
        <MoodBadge mood={companion.mood} />
      </div>

      {/* Chat area */}
      <div className="workspace-panel flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="min-h-0 flex-1 p-4">
          <div className="space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-subtle py-10">
                <p className="text-sm">Say hi to {companion.name}!</p>
                <p className="text-xs mt-1">They remember your conversations and grow from each interaction.</p>
              </div>
            )}

            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`break-words max-w-[85%] lg:max-w-[75%] rounded-xl px-4 py-2 text-sm ${
                      message.role === "user"
                        ? "bg-action text-on-action"
                        : "bg-inset text-ink"
                    }`}
                  >
                    {message.content || (
                      <span className="inline-block w-2 h-4 bg-current animate-pulse" />
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-edge">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex gap-2"
          >
            <Input
              aria-label="Message to companion"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Message ${companion.name}...`}
              disabled={isStreaming}
              className="flex-1 bg-inset border-0 focus-visible:ring-1 focus-visible:ring-action rounded-lg"
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={!input.trim() || isStreaming}
              className="w-9 h-9 rounded-full bg-action text-on-action hover:bg-action/90 flex items-center justify-center disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
