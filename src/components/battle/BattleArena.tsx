"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ICompanion, SPECIES_EMOJI, BattleTurn } from "@/types";

interface Props {
  challengerCompanion: ICompanion;
  defenderCompanion: ICompanion;
  currentUserId: string;
  turns: BattleTurn[];
  winnerId: string | null;
  challengerXp: number;
  defenderXp: number;
}

interface Frag {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  dx: number;
  dy: number;
  rot: number;
}

const hpColor = (p: number) =>
  p > 60 ? "#1a9a4a" : p > 30 ? "#c17d10" : "#d63031";

const rarityGrad = (r: string) => {
  const map: Record<string, string> = {
    legendary: "linear-gradient(90deg,#f59e0b,#fbbf24)",
    epic: "linear-gradient(90deg,#a855f7,#c084fc)",
    rare: "linear-gradient(90deg,#6ab4f7,#4a9edf)",
    uncommon: "linear-gradient(90deg,#22c55e,#4ade80)",
  };
  return map[r] || "linear-gradient(90deg,#9ca3af,#d1d5db)";
};

export function BattleArena({
  challengerCompanion,
  defenderCompanion,
  currentUserId,
  turns,
  winnerId,
  challengerXp,
  defenderXp,
}: Props) {
  const cMax = Math.floor(
    50 +
      (challengerCompanion?.stats?.FOCUS || 50) * 0.5 +
      (challengerCompanion?.level || 1) * 2,
  );
  const dMax = Math.floor(
    50 +
      (defenderCompanion?.stats?.FOCUS || 50) * 0.5 +
      (defenderCompanion?.level || 1) * 2,
  );
  const cEmoji = SPECIES_EMOJI[challengerCompanion?.species] || "🐾";
  const dEmoji = SPECIES_EMOJI[defenderCompanion?.species] || "🐾";
  const cWon = String(winnerId) === String(challengerCompanion?.userId);
  const userWon = String(winnerId) === String(currentUserId);
  const myXp =
    String(currentUserId) === String(challengerCompanion?.userId)
      ? challengerXp
      : defenderXp;

  const [phase, setPhase] = useState<
    "init" | "entrance" | "fight" | "shatter" | "victory"
  >("init");
  const [ti, setTi] = useState(0);
  const [cHp, setCHp] = useState(100);
  const [dHp, setDHp] = useState(100);
  const [atk, setAtk] = useState<"L" | "R" | null>(null);
  const [hit, setHit] = useState<"L" | "R" | null>(null);
  const [fl, setFl] = useState<string | null>(null);
  const [pop, setPop] = useState<{
    s: "L" | "R";
    d: number;
    c: boolean;
  } | null>(null);
  const [frags, setFrags] = useState<Frag[]>([]);
  const [loser, setLoser] = useState<"L" | "R" | null>(null);
  const [showWin, setShowWin] = useState(false);

  const mountedRef = useRef(true);
  const startedRef = useRef(false);

  // Track mount state for strict mode safety
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Safe delay that checks mount state
  const delay = useCallback(
    (ms: number) =>
      new Promise<boolean>((resolve) => {
        setTimeout(() => {
          resolve(mountedRef.current);
        }, ms);
      }),
    [],
  );

  const runBattle = useCallback(async () => {
    console.log("[BattleArena] Starting animation with", turns.length, "turns");

    setCHp(100);
    setDHp(100);
    setTi(0);
    setFrags([]);
    setLoser(null);
    setShowWin(false);
    setAtk(null);
    setHit(null);
    setFl(null);
    setPop(null);

    // Entrance
    setPhase("entrance");
    if (!(await delay(1500))) return;

    // Fight
    setPhase("fight");
    if (!(await delay(400))) return;

    const cId = String(challengerCompanion?._id || "");

    for (let i = 0; i < turns.length; i++) {
      const t = turns[i];
      const isL = String(t.attackerCompanionId) === cId;
      const a: "L" | "R" = isL ? "L" : "R";
      const d: "L" | "R" = isL ? "R" : "L";

      setTi(i + 1);

      // Lunge
      setAtk(a);
      if (!(await delay(250))) return;

      // Hit
      setAtk(null);
      setHit(d);
      setFl(t.crit ? "rgba(193,125,16,.15)" : "rgba(214,48,49,.1)");
      setPop({ s: d, d: t.damage, c: t.crit });

      // Update HP
      if (isL) {
        setCHp(Math.max(0, (t.attackerHp / cMax) * 100));
        setDHp(Math.max(0, (t.defenderHp / dMax) * 100));
      } else {
        setDHp(Math.max(0, (t.attackerHp / dMax) * 100));
        setCHp(Math.max(0, (t.defenderHp / cMax) * 100));
      }

      if (!(await delay(150))) return;
      setFl(null);
      if (!(await delay(250))) return;
      setHit(null);
      setPop(null);
      if (!(await delay(350))) return;

      if (t.defenderHp <= 0 || t.attackerHp <= 0) break;
    }

    // Shatter
    if (!(await delay(400))) return;
    const ls: "L" | "R" = cWon ? "R" : "L";
    setLoser(ls);
    setPhase("shatter");

    const nf: Frag[] = [];
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 4; c++) {
        const ang = Math.random() * 360;
        const dist = 60 + Math.random() * 160;
        nf.push({
          id: r * 4 + c,
          x: c * 25,
          y: r * 20,
          w: 25,
          h: 20,
          dx: Math.cos((ang * Math.PI) / 180) * dist,
          dy: Math.sin((ang * Math.PI) / 180) * dist + 50,
          rot: (Math.random() - 0.5) * 720,
        });
      }
    setFrags(nf);
    setFl("rgba(214,48,49,.12)");
    if (!(await delay(100))) return;
    setFl(null);

    // Victory
    if (!(await delay(800))) return;
    setPhase("victory");
    setShowWin(true);
    console.log("[BattleArena] Animation complete");
  }, [turns, challengerCompanion, cMax, dMax, cWon, delay]);

  // Auto-start
  useEffect(() => {
    if (turns.length > 0 && winnerId && !startedRef.current) {
      startedRef.current = true;
      // Small delay to let framer-motion initialize
      const t = setTimeout(() => {
        if (mountedRef.current) runBattle();
      }, 100);
      return () => clearTimeout(t);
    }
  }, [turns, winnerId, runBattle]);

  // No turns yet
  if (!turns || turns.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-5xl animate-pulse">⚔️</div>
      </div>
    );
  }

  // Waiting to start
  if (phase === "init") {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="flex items-center gap-6 sm:gap-10">
          <div className="text-center">
            <div
              className="text-5xl sm:text-6xl mb-2"
              style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,.1))" }}
            >
              {cEmoji}
            </div>
            <div
              className="text-sm font-bold"

            >
              {challengerCompanion?.name || "???"}
            </div>
            <div className="text-[10px] text-subtle">
              Lv.{challengerCompanion?.level || 1}
            </div>
          </div>
          <div
            className="text-2xl font-black text-[#e6c192]"

          >
            VS
          </div>
          <div className="text-center">
            <div
              className="text-5xl sm:text-6xl mb-2"
              style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,.1))" }}
            >
              {dEmoji}
            </div>
            <div
              className="text-sm font-bold"

            >
              {defenderCompanion?.name || "???"}
            </div>
            <div className="text-[10px] text-subtle">
              Lv.{defenderCompanion?.level || 1}
            </div>
          </div>
        </div>
        <div className="text-[11px] text-subtle animate-pulse">
          {turns.length} turns · Starting battle...
        </div>
      </div>
    );
  }

  // Main animation view
  return (
    <div
      className="relative w-full py-4 sm:py-8 overflow-hidden"
      style={{ minHeight: 340 }}
    >
      {/* Flash */}
      <AnimatePresence>
        {fl && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none z-30"
            style={{ background: fl }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.08 }}
          />
        )}
      </AnimatePresence>

      {/* Turn counter */}
      {phase === "fight" && ti > 0 && (
        <div className="absolute top-2 sm:top-4 left-1/2 -translate-x-1/2 z-10 font-mono text-[11px] text-subtle bg-surface border border-edge px-3 py-1 rounded-full shadow-sm">
          Turn {ti} / {turns.length}
        </div>
      )}

      {/* Cards + VS */}
      <div className="flex items-center justify-center gap-2 sm:gap-6 md:gap-12 px-2 sm:px-4">
        {/* LEFT CARD */}
        <motion.div
          className="relative w-[130px] sm:w-[150px] md:w-[180px]"
          initial={{ x: -200, opacity: 0 }}
          animate={{
            x: atk === "L" ? 35 : 0,
            opacity:
              loser === "L" && (phase === "shatter" || phase === "victory")
                ? 0
                : 1,
            scale:
              phase === "victory" && cWon
                ? 1.08
                : phase === "victory" && !cWon
                  ? 0.8
                  : 1,
            y: phase === "victory" && cWon ? -12 : 0,
            rotate: hit === "L" ? [0, -4, 4, -2, 0] : 0,
          }}
          transition={{ type: "spring", stiffness: 160, damping: 20 }}
        >
          <div
            className={`bg-surface rounded-xl sm:rounded-2xl border-2 p-3 sm:p-4 md:p-5 text-center shadow-lg relative overflow-hidden ${phase === "victory" && cWon ? "border-[#c17d10]/30 shadow-[0_0_30px_rgba(193,125,16,.15)]" : "border-edge"}`}
          >
            <div
              className="absolute top-0 left-0 right-0 h-[3px]"
              style={{
                background: rarityGrad(challengerCompanion?.rarity || "common"),
              }}
            />
            {phase === "victory" && cWon && (
              <motion.div
                className="absolute -top-7 left-1/2 -translate-x-1/2 text-2xl z-10"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", delay: 0.3 }}
              >
                👑
              </motion.div>
            )}
            <div
              className="text-4xl sm:text-5xl md:text-6xl mb-2"
              style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,.1))" }}
            >
              {cEmoji}
            </div>
            <div
              className="text-xs sm:text-sm font-bold truncate"

            >
              {challengerCompanion?.name}
            </div>
            <div className="text-[9px] sm:text-[10px] text-subtle mb-2">
              Lv.{challengerCompanion?.level}
            </div>
            <div className="text-[8px] font-mono font-semibold text-subtle mb-1 text-right">
              HP
            </div>
            <div className="h-1.5 sm:h-2 bg-inset rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: hpColor(cHp) }}
                animate={{ width: `${cHp}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
          {/* Fragments */}
          {loser === "L" &&
            frags.map((f) => (
              <motion.div
                key={f.id}
                className="absolute bg-surface border border-edge rounded-sm shadow-sm"
                style={{
                  left: `${f.x}%`,
                  top: `${f.y}%`,
                  width: `${f.w}%`,
                  height: `${f.h}%`,
                }}
                initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                animate={{
                  x: f.dx,
                  y: f.dy,
                  rotate: f.rot,
                  opacity: 0,
                  scale: 0.1,
                }}
                transition={{ duration: 0.9 }}
              />
            ))}
        </motion.div>

        {/* VS */}
        <motion.div
          className="shrink-0"
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: 1,
            opacity: phase === "shatter" || phase === "victory" ? 0 : 1,
          }}
          transition={{ delay: 0.5, type: "spring" }}
        >
          <div
            className="text-xl sm:text-2xl md:text-3xl font-black bg-gradient-to-r from-[#c17d10] to-[#d63031] bg-clip-text text-transparent"

          >
            VS
          </div>
        </motion.div>

        {/* RIGHT CARD */}
        <motion.div
          className="relative w-[130px] sm:w-[150px] md:w-[180px]"
          initial={{ x: 200, opacity: 0 }}
          animate={{
            x: atk === "R" ? -35 : 0,
            opacity:
              loser === "R" && (phase === "shatter" || phase === "victory")
                ? 0
                : 1,
            scale:
              phase === "victory" && !cWon
                ? 1.08
                : phase === "victory" && cWon
                  ? 0.8
                  : 1,
            y: phase === "victory" && !cWon ? -12 : 0,
            rotate: hit === "R" ? [0, 4, -4, 2, 0] : 0,
          }}
          transition={{ type: "spring", stiffness: 160, damping: 20 }}
        >
          <div
            className={`bg-surface rounded-xl sm:rounded-2xl border-2 p-3 sm:p-4 md:p-5 text-center shadow-lg relative overflow-hidden ${phase === "victory" && !cWon ? "border-[#c17d10]/30 shadow-[0_0_30px_rgba(193,125,16,.15)]" : "border-edge"}`}
          >
            <div
              className="absolute top-0 left-0 right-0 h-[3px]"
              style={{
                background: rarityGrad(defenderCompanion?.rarity || "common"),
              }}
            />
            {phase === "victory" && !cWon && (
              <motion.div
                className="absolute -top-7 left-1/2 -translate-x-1/2 text-2xl z-10"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", delay: 0.3 }}
              >
                👑
              </motion.div>
            )}
            <div
              className="text-4xl sm:text-5xl md:text-6xl mb-2"
              style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,.1))" }}
            >
              {dEmoji}
            </div>
            <div
              className="text-xs sm:text-sm font-bold truncate"

            >
              {defenderCompanion?.name}
            </div>
            <div className="text-[9px] sm:text-[10px] text-subtle mb-2">
              Lv.{defenderCompanion?.level}
            </div>
            <div className="text-[8px] font-mono font-semibold text-subtle mb-1 text-right">
              HP
            </div>
            <div className="h-1.5 sm:h-2 bg-inset rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: hpColor(dHp) }}
                animate={{ width: `${dHp}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
          {/* Fragments */}
          {loser === "R" &&
            frags.map((f) => (
              <motion.div
                key={f.id}
                className="absolute bg-surface border border-edge rounded-sm shadow-sm"
                style={{
                  left: `${f.x}%`,
                  top: `${f.y}%`,
                  width: `${f.w}%`,
                  height: `${f.h}%`,
                }}
                initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                animate={{
                  x: f.dx,
                  y: f.dy,
                  rotate: f.rot,
                  opacity: 0,
                  scale: 0.1,
                }}
                transition={{ duration: 0.9 }}
              />
            ))}
        </motion.div>
      </div>

      {/* Damage popup */}
      <AnimatePresence>
        {pop && (
          <motion.div
            className={`absolute top-[30%] z-20 font-mono font-bold pointer-events-none ${pop.c ? "text-lg sm:text-2xl text-[#e6c192]" : "text-base sm:text-xl text-[#edb2b3]"}`}
            style={{
              left: pop.s === "R" ? "62%" : "18%",
              textShadow: pop.c
                ? "0 0 12px rgba(193,125,16,.4)"
                : "0 0 8px rgba(214,48,49,.3)",
            }}
            initial={{ y: 0, opacity: 0, scale: 0.5 }}
            animate={{ y: -30, opacity: 1, scale: 1 }}
            exit={{ y: -60, opacity: 0 }}
          >
            {pop.c ? `${pop.d} CRIT!` : `-${pop.d}`}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Victory */}
      {showWin && (
        <motion.div
          className="mt-6 sm:mt-10 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-3xl sm:text-4xl mb-2">
            {userWon ? "🏆" : "💀"}
          </div>
          <h2
            className="text-xl sm:text-2xl md:text-3xl font-black mb-1"
            style={{
              color: userWon ? "#c17d10" : "#999",
            }}
          >
            {userWon ? "VICTORY!" : "DEFEAT"}
          </h2>
          <p className="text-xs sm:text-sm text-subtle mb-3">
            {(cWon ? challengerCompanion : defenderCompanion)?.name} wins!
          </p>
          <div className="inline-flex items-center gap-2 font-mono text-sm sm:text-lg font-bold text-[#a9d5ba] bg-[#1a9a4a]/[.06] px-4 sm:px-6 py-2 rounded-xl border border-[#1a9a4a]/10">
            ⚡ +{myXp} XP
          </div>
        </motion.div>
      )}

      {/* Battle log */}
      {phase === "fight" && ti > 0 && (
        <div className="mt-4 sm:mt-6 bg-surface border border-edge rounded-xl p-3 max-w-sm mx-auto shadow-sm">
          {turns
            .slice(0, ti)
            .reverse()
            .slice(0, 3)
            .map((t) => (
              <div
                key={t.turn}
                className="text-[11px] sm:text-[12px] text-subtle py-1 font-mono"
              >
                <span className="text-subtle">T{t.turn}</span>{" "}
                <span className="font-semibold text-ink">
                  {t.attackerName}
                </span>
                {" → "}
                <span
                  className={
                    t.crit ? "font-bold text-[#e6c192]" : "text-[#edb2b3]"
                  }
                >
                  {t.damage}
                  {t.crit && " CRIT!"}
                </span>
              </div>
            ))}
        </div>
      )}

      {/* Replay */}
      {showWin && (
        <div className="text-center mt-4">
          <button
            onClick={() => {
              startedRef.current = false;
              setPhase("init");
              setTimeout(() => runBattle(), 200);
            }}
            className="text-[12px] font-semibold text-subtle hover:text-ink transition-colors"
          >
            ↺ Replay
          </button>
        </div>
      )}
    </div>
  );
}
