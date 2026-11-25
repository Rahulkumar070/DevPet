"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, PawPrint, Trophy } from "lucide-react";
import { CompanionCard } from "@/components/companion/CompanionCard";
import { CompanionCardSkeleton } from "@/components/companion/CompanionCardSkeleton";
import type { ICompanion } from "@/types";
import s from "./profile.module.css";

export default function CompanionPublicClient({ slug }: { slug: string }) {
  const { data: companion, isLoading } = useQuery<ICompanion & { ownerUsername?: string }>({
    queryKey: ["companion", "public", slug],
    queryFn: async () => {
      const response = await fetch(`/api/companion/${slug}`);
      if (!response.ok) throw new Error("Companion unavailable");
      return response.json();
    },
  });

  return <main className={s.page}>
    <div className={s.column}>
      <nav aria-label="Companion navigation"><Link href="/"><ArrowLeft size={14} />Home</Link>
        <Link href="/login">Hatch yours <PawPrint size={14} /></Link>
      </nav>
      {isLoading ? <CompanionCardSkeleton /> : companion ? <>
        <h1 className="sr-only">{companion.name}’s companion profile</h1>
        <CompanionCard key={slug} companion={companion} showActions={companion.isPublic} />
        <footer>
          {companion.ownerUsername && <span>Owned by <b>@{companion.ownerUsername}</b></span>}
          <span><Trophy size={14} />{companion.battleWins} {companion.battleWins === 1 ? "win" : "wins"}</span>
        </footer>
      </> : <section className={s.empty}><PawPrint size={32} /><h1>Companion unavailable</h1>
        <p>This companion may be private or its link may have changed.</p></section>}
    </div>
  </main>;
}
