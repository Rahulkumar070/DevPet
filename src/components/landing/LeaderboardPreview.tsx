"use client";
import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { GithubIcon } from "@/components/icons/GithubIcon";

const BATTLES = [
  { attacker: "gitfox", defender: "compilot", atkEmoji: "🦊", defEmoji: "🤖", atkName: "Foxbyte", defName: "Robokit", damage: 42, won: true },
  { attacker: "voidphoenix", defender: "debugbear", atkEmoji: "🦅", defEmoji: "🐻", atkName: "Luminary", defName: "Grizzstack", damage: 67, won: true },
  { attacker: "kernelkrab", defender: "mergehog", atkEmoji: "🦀", defEmoji: "🦔", atkName: "Shellfire", defName: "Pushpin", damage: 31, won: false },
];

function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}

export function LeaderboardPreview() {
  const { ref, visible } = useFadeIn();

  return (
    <section className="py-20 px-4 bg-[#111]">
      <div ref={ref} className="max-w-5xl mx-auto">
        <div
          className={`text-center mb-12 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <p className="text-xs font-semibold text-[#6c5ce7] uppercase tracking-[1px] mb-2">Battle Arena</p>
          <h2 className="font-['Jost',sans-serif] text-3xl font-extrabold tracking-tight text-white">
            Real-time battles between developers
          </h2>
          <p className="text-[#999] mt-2 text-sm">Stats powered by your actual GitHub activity</p>
        </div>

        <div
          className={`space-y-3 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          style={{ transitionDelay: "150ms" }}
        >
          {BATTLES.map((b, i) => (
            <div
              key={i}
              className="bg-white/[.04] border border-white/[.08] rounded-2xl p-4 flex items-center gap-4"
            >
              <div className="flex items-center gap-2 flex-1">
                <span className="text-3xl">{b.atkEmoji}</span>
                <div>
                  <p className="font-['Jost',sans-serif] font-bold text-white text-sm">{b.atkName}</p>
                  <p className="text-[#999] text-xs">@{b.attacker}</p>
                </div>
              </div>

              <div className="text-center px-3">
                <div className={`font-mono text-xs font-bold px-2.5 py-1 rounded-full ${b.won ? "bg-[#1a9a4a]/20 text-[#4ade80]" : "bg-[#d63031]/20 text-[#f87171]"}`}>
                  {b.won ? "WON" : "LOST"}
                </div>
                <p className="font-mono text-[#6c5ce7] font-bold text-sm mt-1">-{b.damage} HP</p>
              </div>

              <div className="flex items-center gap-2 flex-1 justify-end">
                <div className="text-right">
                  <p className="font-['Jost',sans-serif] font-bold text-white text-sm">{b.defName}</p>
                  <p className="text-[#999] text-xs">@{b.defender}</p>
                </div>
                <span className="text-3xl">{b.defEmoji}</span>
              </div>
            </div>
          ))}
        </div>

        <div
          className={`text-center mt-8 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          style={{ transitionDelay: "300ms" }}
        >
          <button
            onClick={() => signIn("github", { redirectTo: "/dashboard" })}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#6c5ce7] text-white text-sm font-semibold hover:bg-[#5b4fd4] transition-colors"
          >
            <GithubIcon className="w-4 h-4" />
            Start Battling
          </button>
        </div>
      </div>
    </section>
  );
}
