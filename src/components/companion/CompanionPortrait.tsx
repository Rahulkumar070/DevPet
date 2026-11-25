import Image from "next/image";
import { PawPrint } from "lucide-react";
import { SPECIES_EMOJI } from "@/types";

export function CompanionPortrait({ species, size, className }: {
  species: string;
  size: number;
  className?: string;
}) {
  if (!Object.hasOwn(SPECIES_EMOJI, species)) {
    return <PawPrint size={size} className={className} aria-hidden="true" />;
  }
  return <Image src={`/companions/${species}.webp`} alt="" width={size} height={size}
    className={className} unoptimized />;
}
