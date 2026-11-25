import type { ICompanion } from "@/types";
import { CompanionCard } from "./CompanionCard";
import s from "./companion-card.module.css";

export function PokemonCard({ companion }: { companion: ICompanion }) {
  return <CompanionCard companion={companion} className={s.showcase} />;
}
