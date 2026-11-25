import { Stats } from "@/types";

export interface BattleTurn {
  turn: number;
  attackerCompanionId: string;
  attackerName: string;
  damage: number;
  crit: boolean;
  defenderHp: number;
  attackerHp: number;
}

export interface BattleFighter {
  companionId: string;
  name: string;
  stats: Stats;
  level: number;
}

export interface BattleResult {
  turns: BattleTurn[];
  winnerId: string;
  winnerCompanionId: string;
  challengerFinalHp: number;
  defenderFinalHp: number;
}

export function companionMaxHp(focus: number, level: number) {
  return Math.floor(50 + focus * 0.5 + level * 2);
}

function calcStats(fighter: BattleFighter) {
  const { GRIND, FOCUS, SHIP, SQUASH, VIBE } = fighter.stats;
  return {
    maxHp: companionMaxHp(FOCUS, fighter.level),
    attack: Math.floor(GRIND * 0.4 + SHIP * 0.2 + fighter.level),
    defense: Math.floor(FOCUS * 0.3 + SQUASH * 0.2),
    speed: Math.floor(SHIP * 0.3 + VIBE * 0.2),
    critChance: Math.min(0.5, VIBE / 200),
  };
}

export function runBattle(
  challenger: BattleFighter,
  defender: BattleFighter,
  challengerUserId: string,
  defenderUserId: string,
): BattleResult {
  const cs = calcStats(challenger);
  const ds = calcStats(defender);

  let challengerHp = cs.maxHp;
  let defenderHp = ds.maxHp;

  const turns: BattleTurn[] = [];
  const challengerFirst = cs.speed >= ds.speed;

  for (let turn = 1; turn <= 20; turn++) {
    if (challengerHp <= 0 || defenderHp <= 0) break;

    const isChallenger = challengerFirst ? turn % 2 === 1 : turn % 2 === 0;
    const attacker = isChallenger
      ? { ...challenger, ...cs }
      : { ...defender, ...ds };
    const defenderStats = isChallenger ? ds : cs;

    let damage = Math.max(1, attacker.attack - defenderStats.defense / 2);
    const crit = Math.random() < attacker.critChance;
    if (crit) damage = Math.floor(damage * 1.5);
    damage = Math.floor(damage);

    if (isChallenger) {
      defenderHp = Math.max(0, defenderHp - damage);
    } else {
      challengerHp = Math.max(0, challengerHp - damage);
    }

    turns.push({
      turn,
      attackerCompanionId: isChallenger ? challenger.companionId : defender.companionId,
      attackerName: isChallenger ? challenger.name : defender.name,
      damage,
      crit,
      defenderHp: isChallenger ? defenderHp : challengerHp,
      attackerHp: isChallenger ? challengerHp : defenderHp,
    });
  }

  const challengerWon = defenderHp <= 0 || challengerHp > defenderHp;
  return {
    turns,
    winnerId: challengerWon ? challengerUserId : defenderUserId,
    winnerCompanionId: challengerWon
      ? challenger.companionId
      : defender.companionId,
    challengerFinalHp: challengerHp,
    defenderFinalHp: defenderHp,
  };
}

export function calculateBattleXP(
  isWinner: boolean,
  opponentLevel: number,
): number {
  const base = isWinner ? 25 : 10;
  const levelBonus = Math.floor(opponentLevel * 0.5);
  return base + levelBonus;
}
