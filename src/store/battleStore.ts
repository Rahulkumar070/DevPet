import { create } from "zustand";
import { BattleTurn } from "@/types";

interface BattleStore {
  activeBattleId: string | null;
  turns: BattleTurn[];
  challengerHp: number;
  defenderHp: number;
  challengerMaxHp: number;
  defenderMaxHp: number;
  isComplete: boolean;
  winnerId: string | null;
  setActiveBattle: (id: string) => void;
  addTurn: (turn: BattleTurn) => void;
  setTurns: (turns: BattleTurn[]) => void;
  setHps: (c: number, d: number) => void;
  setMaxHps: (c: number, d: number) => void;
  completeBattle: (winnerId: string) => void;
  resetBattle: () => void;
}

export const useBattleStore = create<BattleStore>((set) => ({
  activeBattleId: null,
  turns: [],
  challengerHp: 0,
  defenderHp: 0,
  challengerMaxHp: 0,
  defenderMaxHp: 0,
  isComplete: false,
  winnerId: null,
  setActiveBattle: (id) => set({ activeBattleId: id }),
  addTurn: (turn) => set((s) => ({ turns: [...s.turns, turn] })),
  setTurns: (turns) => set({ turns }),
  setHps: (challengerHp, defenderHp) => set({ challengerHp, defenderHp }),
  setMaxHps: (challengerMaxHp, defenderMaxHp) =>
    set({ challengerMaxHp, defenderMaxHp }),
  completeBattle: (winnerId) => set({ isComplete: true, winnerId }),
  resetBattle: () =>
    set({
      activeBattleId: null,
      turns: [],
      challengerHp: 0,
      defenderHp: 0,
      challengerMaxHp: 0,
      defenderMaxHp: 0,
      isComplete: false,
      winnerId: null,
    }),
}));
