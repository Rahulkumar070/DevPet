"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, Diamond, Heart, Share2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { type ICompanion, HAT_EMOJI } from "@/types";
import { cn, xpProgressInCurrentLevel } from "@/lib/utils";
import { companionMaxHp } from "@/lib/battle/engine";
import { getMoodDescription } from "@/lib/companion/mood";
import { CompanionPortrait } from "./CompanionPortrait";
import s from "./companion-card.module.css";

interface CompanionCardProps {
  companion: ICompanion;
  size?: "sm" | "md" | "lg";
  showActions?: boolean;
  className?: string;
  onLike?: () => void;
}

function StatsPanel({ companion }: { companion: ICompanion }) {
  const progress = xpProgressInCurrentLevel(companion.xp);
  const maxLevel = companion.level >= 50;
  return <div className={s.statsPanel}>
    <dl className={s.stats}>{Object.entries(companion.stats).map(([stat, value]) =>
      <div key={stat}>
        <dt>{stat}</dt><dd>{value}</dd>
        <div aria-hidden="true" className={s.statTrack}><i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
      </div>
    )}</dl>
    <div className={s.xpLabel}><span>Level progress</span><strong>{maxLevel ? "Max level" : `${progress.current} / ${progress.needed} XP`}</strong></div>
    <progress className={s.progress} max={100} value={maxLevel ? 100 : progress.percent} aria-label="Progress within this level" />
  </div>;
}

export function CompanionCard({ companion, size = "md", showActions = false, className, onLike }: CompanionCardProps) {
  const [savedLike, setSavedLike] = useState<number>();
  const [liking, setLiking] = useState(false);
  const href = `/companion/${companion.shareSlug}`;
  const showProfileLink = size === "sm" && companion.isPublic && companion.shareSlug;
  const stage = ["Baby", "Teen", "Adult"][companion.evolutionStage - 1];
  const hp = companionMaxHp(companion.stats.FOCUS, companion.level);

  async function handleLike() {
    if (onLike) return onLike();
    setLiking(true);
    try {
      const response = await fetch(`/api/companion/${companion.shareSlug}`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not like companion");
      setSavedLike(result.likes);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not like companion");
    } finally {
      setLiking(false);
    }
  }

  async function handleShare() {
    const url = new URL(href, window.location.origin).href;
    try {
      if (navigator.share) await navigator.share({ title: companion.name, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Companion link copied");
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) toast.error("Could not share companion");
    }
  }

  return <article aria-label={`${companion.name} companion card`} data-rarity={companion.rarity}
    data-size={size} className={cn(s.card, className)}>
    <div className={s.scene}>
      <div className={s.orbit} aria-hidden="true" />
      <div className={s.edition}><span><Diamond size={11} fill="currentColor" />{companion.rarity}</span>
        {companion.shiny && <span><Sparkles size={11} />Shiny</span>}
      </div>
      <div className={s.hp}><Heart size={12} />{hp} HP</div>
      <div className={s.portrait} data-stage={companion.evolutionStage}>
        <CompanionPortrait species={companion.species} size={224} />
      </div>
    </div>
    <div className={s.body}>
      <div className={s.identity}>
        <div><p className={s.species}>{companion.species} <span>·</span> {stage}</p>
          <h3>{showProfileLink ? <Link href={href}>{companion.name}<ArrowUpRight size={16} /></Link> : companion.name}</h3>
        </div>
        <span className={s.level}>Lv. <b>{companion.level}</b></span>
      </div>
      <div className={s.traits}>
        <span title={getMoodDescription(companion.mood)}><i className={s.moodDot} />{companion.mood}</span>
        {companion.hat && <span><i aria-hidden="true">{HAT_EMOJI[companion.hat]}</i>{companion.hat}</span>}
        {companion.eye && <span><i aria-hidden="true">{companion.eye}</i><span className="sr-only">{companion.eye} </span>eyes</span>}
      </div>
      {size === "sm" ? <details className={s.disclosure}>
        <summary>Companion stats <ChevronDown size={14} /></summary><StatsPanel companion={companion} />
      </details> : <StatsPanel companion={companion} />}
      {size === "lg" && companion.personality && <blockquote className={s.quote}>{companion.personality}</blockquote>}
      {showActions && <div className={s.actions}>
        <button type="button" onClick={handleLike} aria-label={`Like ${companion.name}`} disabled={liking}><Heart size={15} />{savedLike ?? companion.likes}</button>
        <button type="button" onClick={handleShare}><Share2 size={15} />Share</button>
      </div>}
    </div>
  </article>;
}
