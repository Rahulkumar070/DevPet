"use client";
import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { HeroSection } from "@/components/landing/HeroSection";
import { HatchDemo } from "@/components/landing/HatchDemo";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { LeaderboardPreview } from "@/components/landing/LeaderboardPreview";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { GithubIcon } from "@/components/icons/GithubIcon";

function CTASection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="py-20 px-4 bg-[#f5f3ed]">
      <div
        ref={ref}
        className={`max-w-2xl mx-auto text-center transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
      >
        <div className="text-5xl mb-5">🐾</div>
        <h2 className="font-['Jost',sans-serif] text-3xl font-extrabold tracking-tight mb-3">
          Ready to hatch your companion?
        </h2>
        <p className="text-[#6b6b6b] text-base mb-7">
          Join thousands of developers who are levelling up their coding habits with DevPet.
          Sign in with GitHub — it takes 10 seconds.
        </p>
        <button
          onClick={() => signIn("github", { redirectTo: "/dashboard" })}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#1a1a1a] text-white text-sm font-semibold shadow-lg hover:bg-[#333] transition-colors"
        >
          <GithubIcon className="w-4 h-4" />
          Sign in with GitHub — it&apos;s free
        </button>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroSection />
      <HatchDemo />
      <FeatureGrid />
      <LeaderboardPreview />
      <CTASection />
      <Footer />
    </main>
  );
}
