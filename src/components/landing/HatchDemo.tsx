"use client";
import { useEffect, useRef, useState } from "react";

const steps = [
  {
    num: "01",
    emoji: "🔗",
    title: "Connect GitHub",
    desc: "Sign in with your GitHub account. We analyze your commit history to determine your companion's unique traits.",
    color: "#2d5be3",
  },
  {
    num: "02",
    emoji: "🥚",
    title: "Hatch Your Companion",
    desc: "Your username seeds a deterministic generator. Species, rarity, stats — all uniquely yours. Shiny chance: 1%.",
    color: "#1a9a4a",
  },
  {
    num: "03",
    emoji: "⚔️",
    title: "Battle & Grow",
    desc: "Sync commits for XP. Battle other developers. Join guild wars. Watch your companion evolve through 3 stages.",
    color: "#d63031",
  },
];

function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}

export function HatchDemo() {
  const { ref, visible } = useFadeIn();

  return (
    <section id="how-it-works" className="py-20 px-4 bg-white">
      <div ref={ref} className="max-w-5xl mx-auto">
        <div
          className={`text-center mb-12 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <p className="text-xs font-semibold text-[#2d5be3] uppercase tracking-[1px] mb-2">How It Works</p>
          <h2 className="font-['Jost',sans-serif] text-3xl font-extrabold tracking-tight">Three steps to your companion</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <div
              key={step.num}
              className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              <div className="bg-[#fafaf6] border border-black/[.06] rounded-2xl p-6 h-full relative overflow-hidden">
                <div
                  className="absolute top-0 right-0 font-['Jost',sans-serif] font-extrabold text-[80px] leading-none text-right pr-4 pt-1 select-none"
                  style={{ color: step.color, opacity: 0.05 }}
                >
                  {step.num}
                </div>
                <div className="text-4xl mb-4">{step.emoji}</div>
                <div
                  className="text-[10px] font-bold uppercase tracking-[0.8px] mb-1"
                  style={{ color: step.color }}
                >
                  Step {step.num}
                </div>
                <h3 className="font-['Jost',sans-serif] font-bold text-base mb-2">{step.title}</h3>
                <p className="text-[#6b6b6b] text-sm leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
