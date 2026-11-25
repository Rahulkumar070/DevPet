"use client";
import { useEffect, useRef, useState } from "react";
import { GithubIcon } from "@/components/icons/GithubIcon";
import { MessageCircle, Swords, Sparkles, Heart, Users } from "lucide-react";

const features = [
  {
    icon: GithubIcon,
    title: "GitHub XP",
    desc: "Every commit grows your companion. More code = more XP. Sync automatically with our VSCode extension.",
    accent: "#1a1a1a",
    bg: "#f5f3ed",
  },
  {
    icon: MessageCircle,
    title: "AI Chat",
    desc: "Talk to your companion with persistent memory. They remember your history and develop personality.",
    accent: "#2d5be3",
    bg: "#eef2fe",
  },
  {
    icon: Swords,
    title: "Battles",
    desc: "Challenge other developers in async battles. Stats are calculated from your real coding activity.",
    accent: "#d63031",
    bg: "#fef5f5",
  },
  {
    icon: Sparkles,
    title: "Evolution",
    desc: "Three evolution stages. Keep coding to unlock Teen and Adult forms with enhanced visuals and stats.",
    accent: "#6c5ce7",
    bg: "#f4f2fe",
  },
  {
    icon: Heart,
    title: "Mood System",
    desc: "Your companion has feelings. Code often to keep them happy and unlock special interactions.",
    accent: "#d63031",
    bg: "#fef5f5",
  },
  {
    icon: Users,
    title: "Guild Wars",
    desc: "Form squads with other developers. Compete in weekly XP challenges and guild battles.",
    accent: "#c17d10",
    bg: "#fff8ed",
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
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}

export function FeatureGrid() {
  const { ref, visible } = useFadeIn();

  return (
    <section className="py-20 px-4 bg-[#f5f3ed]">
      <div ref={ref} className="max-w-6xl mx-auto">
        <div
          className={`text-center mb-12 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <p className="text-xs font-semibold text-[#2d5be3] uppercase tracking-[1px] mb-2">Features</p>
          <h2 className="font-['Jost',sans-serif] text-3xl font-extrabold tracking-tight">Everything you need</h2>
          <p className="text-[#999] mt-2 text-sm">Gamify your development workflow</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`transition-all duration-600 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="bg-white border border-black/[.06] rounded-2xl p-6 h-full hover:shadow-md transition-shadow">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: f.bg }}
                >
                  <f.icon className="w-5 h-5" style={{ color: f.accent }} />
                </div>
                <h3 className="font-['Jost',sans-serif] font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-[#6b6b6b] leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
