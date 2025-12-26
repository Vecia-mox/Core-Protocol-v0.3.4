
import { Ship, Resources, CombatRound, DebrisField, CombatUnit } from './types';
import { SHIPS, DEFENSE, GAME_CONFIG } from './registry';

/**
 * Encapsulates round-specific damage yields for analytics.
 */
interface DamageStats {
  total: number;
  shield: number;
  hull: number;
  rapidFires: number;
  dodges: number;
}

/**
 * Represents a single combat element (Ship or Defense Structure).
 * Implements Rule 05: Tactical Engagement Rules (Explosion Law) 
 * and Speed-Based Evasion (Rule 05.B).
 */
class Unit implements CombatUnit {
  typeId: string;
  hull: number;
  maxHull: number;
  shield: number;
  maxShield: number;
  attack: number;
  cargo: number;
  speed: number;
  isDead: boolean = false;

  constructor(id: string, stats: Ship['stats']) {
    this.typeId = id;
    this.hull = stats.hull;
    this.maxHull = stats.hull;
    this.shield = stats.shield || 0;
    this.maxShield = stats.shield || 0;
    this.attack = stats.attack;
    // Cargo property initialized from ship definitions (defaults to 0 for units without cargo capacity)
    this.cargo = stats.cargo || 0;
    // Speed property initialized from registry stats (defaults to 0 for stationary units)
    this.speed = stats.speed || 0;
  }

  /**
   * Restores energy-based defensive arrays to maximum.
   */
  resetShield() {
    if (!this.isDead) {
      this.shield = this.maxShield;
    }
  }

  /**
   * Processes an incoming strike.
   * Includes Speed-Based Evasion logic (Rule 05.B).
   * @returns Breakdown of damage applied to components.
   */
  takeHit(damage: number): { shieldDmg: number; hullDmg: number; dodged: boolean } {
    if (this.isDead || damage <= 0) return { shieldDmg: 0, hullDmg: 0, dodged: false };

    /**
     * Speed Evasion Logic (Rule 05.B)
     * High velocity units can warp space-time signatures to avoid incoming projectiles.
     * Formula: 1% evasion chance per 2500 units of speed.
     * Hard Cap: 15% total evasion probability (0.15).
     */
    const evasionChance = Math.min(0.15, this.speed / 250000);
    if (evasionChance > 0 && Math.random() < evasionChance) {
      return { shieldDmg: 0, hullDmg: 0, dodged: true };
    }

    let shieldDmg = 0;
    let hullDmg = 0;

    // Shield Displacement
    if (damage > this.shield) {
      shieldDmg = this.shield;
      const piercingDmg = damage - this.shield;
      this.shield = 0;
      
      // Kinetic Impact on Hull
      hullDmg = piercingDmg;
      this.hull -= hullDmg;
    } else {
      shieldDmg = damage;
      this.shield -= damage;
    }

    // Explosion Probability (Technical Bible Rule 05)
    // Risk = 1 - (CurrentHull/MaxHull) once integrity < 70%
    if (!this.isDead && this.hull < this.maxHull * 0.7) {
      const risk = 1 - (this.hull / this.maxHull);
      if (Math.random() < risk) {
        this.isDead = true;
      }
    }

    if (this.hull <= 0) {
      this.isDead = true;
      this.hull = 0;
    }

    return { shieldDmg, hullDmg, dodged: false };
  }
}

/**
 * Manages a group of combat units and their offensive sequences.
 */
class Fleet {
  units: Unit[];

  constructor(shipComp: Record<string, number>, defenseComp: Record<string, number> = {}) {
    this.units = [];
    
    // Initialize Ships
    Object.entries(shipComp).forEach(([id, count]) => {
      const proto = SHIPS[id];
      if (proto) {
        for (let i = 0; i < count; i++) {
          this.units.push(new Unit(id, proto.stats));
        }
      }
    });

    // Initialize Defense
    Object.entries(defenseComp).forEach(([id, count]) => {
      const proto = DEFENSE[id];
      if (proto) {
        for (let i = 0; i < count; i++) {
          this.units.push(new Unit(id, proto.stats));
        }
      }
    });
  }

  get aliveUnits() {
    return this.units.filter(u => !u.isDead);
  }

  get count() {
    return this.aliveUnits.length;
  }

  get totalHull() {
    return this.units.reduce((acc, u) => acc + (u.isDead ? 0 : u.hull), 0);
  }

  get totalShield() {
    return this.units.reduce((acc, u) => acc + (u.isDead ? 0 : u.shield), 0);
  }

  get totalCargoCapacity() {
    return this.aliveUnits.reduce((acc, u) => acc + u.cargo, 0);
  }

  get slowestSpeed() {
    const speeds = this.aliveUnits.filter(u => u.speed > 0).map(u => u.speed);
    return speeds.length > 0 ? Math.min(...speeds) : 2500;
  }

  /**
   * Executes an offensive turn against a target fleet.
   */
  fireAt(targetFleet: Fleet, stats: DamageStats) {
    const attackers = this.aliveUnits;
    const targets = targetFleet.aliveUnits;
    
    if (attackers.length === 0 || targets.length === 0) return;

    attackers.forEach(attacker => {
      let continueFire = true;
      
      while (continueFire) {
        continueFire = false;
        
        // Standard random targeting
        const targetIndex = Math.floor(Math.random() * targets.length);
        const target = targets[targetIndex];
        if (!target || target.isDead) break;

        const result = target.takeHit(attacker.attack);
        
        if (result.dodged) {
          stats.dodges++;
        } else {
          stats.total += attacker.attack;
          stats.shield += result.shieldDmg;
          stats.hull += result.hullDmg;

          // Rapid Fire Logic (Probability = (RF-1)/RF)
          const proto = SHIPS[attacker.typeId] || DEFENSE[attacker.typeId];
          const rfChance = proto?.rapidFire?.[target.typeId];
          
          if (rfChance && rfChance > 1) {
            if (Math.random() < (rfChance - 1) / rfChance) {
              continueFire = true;
              stats.rapidFires++;
            }
          }
        }
      }
    });
  }

  syncShields() {
    this.units.forEach(u => u.resetShield());
  }
}

/**
 * Main Combat Engine.
 * Simulates up to 6 rounds of engagement.
 */
export const runCombatSimulation = (
  attackerComp: Record<string, number>,
  defenderShipComp: Record<string, number>,
  defenderBaseComp: Record<string, number>,
  targetResources: Resources = { metal: 0, crystal: 0, deuterium: 0, energy: 0 },
  targetProtection: Resources = { metal: 0, crystal: 0, deuterium: 0, energy: 0 },
  isBandit: boolean = false
) => {
  const attackers = new Fleet(attackerComp);
  const initialCargoCapacity = attackers.totalCargoCapacity;
  const initialAttackerHull = attackers.totalHull;
  
  // Bandit Force Generation (Slot 16)
  const effectiveDefenderShipComp = { ...defenderShipComp };
  if (isBandit && Object.keys(effectiveDefenderShipComp).length === 0) {
    effectiveDefenderShipComp['light_fighter'] = 1;
  }

  const defenders = new Fleet(effectiveDefenderShipComp, defenderBaseComp);
  const initialDefenderHull = defenders.totalHull;

  const rounds: CombatRound[] = [];
  let winner: 'attacker' | 'defender' | 'draw' = 'draw';
  
  let totalAttackerDamage = 0;
  let totalDefenderDamage = 0;

  for (let r = 0; r < 6; r++) {
    const aCount = attackers.count;
    const dCount = defenders.count;

    if (aCount === 0 || dCount === 0) break;

    const aStats: DamageStats = { total: 0, shield: 0, hull: 0, rapidFires: 0, dodges: 0 };
    const dStats: DamageStats = { total: 0, shield: 0, hull: 0, rapidFires: 0, dodges: 0 };

    // Simultaneous Exchange Turn
    attackers.fireAt(defenders, aStats);
    defenders.fireAt(attackers, dStats);

    // End of Round: Shield Recharge
    attackers.syncShields();
    defenders.syncShields();

    totalAttackerDamage += aStats.total;
    totalDefenderDamage += dStats.total;

    rounds.push({
      attackerAttackers: aCount,
      defenderAttackers: dCount,
      attackerDamage: aStats.total,
      attackerShieldDamage: aStats.shield,
      attackerHullDamage: aStats.hull,
      attackerRapidFires: aStats.rapidFires,
      attackerDodges: dStats.dodges, // Dodges by defender fleet when attacked by attackers
      defenderDamage: dStats.total,
      defenderShieldDamage: dStats.shield,
      defenderHullDamage: dStats.hull,
      defenderRapidFires: dStats.rapidFires,
      defenderDodges: aStats.dodges, // Dodges by attacker fleet when attacked by defenders
    });
  }

  const finalA = attackers.count;
  const finalD = defenders.count;

  if (finalA > 0 && finalD === 0) winner = 'attacker';
  else if (finalD > 0 && finalA === 0) winner = 'defender';

  // Calculate final shield state post-combat
  const attackerShieldsRemaining = attackers.totalShield;
  const defenderShieldsRemaining = defenders.totalShield;

  // Loot Calculation Logic
  let loot: Resources = { metal: 0, crystal: 0, deuterium: 0, energy: 0 };
  const survivingCargoCapacity = attackers.totalCargoCapacity;
  
  if (winner === 'attacker' && survivingCargoCapacity > 0) {
    const availMetal = Math.max(0, (targetResources.metal - targetProtection.metal) * 0.5);
    const availCrystal = Math.max(0, (targetResources.crystal - targetProtection.crystal) * 0.5);
    const availDeut = Math.max(0, (targetResources.deuterium - targetProtection.deuterium) * 0.5);
    
    const totalPotentialLoot = availMetal + availCrystal + availDeut;
    
    if (totalPotentialLoot > survivingCargoCapacity) {
      const ratio = survivingCargoCapacity / totalPotentialLoot;
      loot.metal = Math.floor(availMetal * ratio);
      loot.crystal = Math.floor(availCrystal * ratio);
      loot.deuterium = Math.floor(availDeut * ratio);
    } else {
      loot.metal = Math.floor(availMetal);
      loot.crystal = Math.floor(availCrystal);
      loot.deuterium = Math.floor(availDeut);
    }
  }

  // Debris Field Calculation
  const generatedDebris: DebrisField = { metal: 0, crystal: 0 };
  
  const calculateUnitLosses = (units: Unit[]) => {
    units.forEach(u => {
      if (u.isDead) {
        const proto = SHIPS[u.typeId] || DEFENSE[u.typeId];
        if (proto) {
          generatedDebris.metal += (proto.baseCost.metal || 0) * GAME_CONFIG.debris_ratio;
          generatedDebris.crystal += (proto.baseCost.crystal || 0) * GAME_CONFIG.debris_ratio;
        }
      }
    });
  };

  calculateUnitLosses(attackers.units);
  calculateUnitLosses(defenders.units);

  // Defense Restoration (Rule 05: 70% repair chance)
  const repairedDefense: Record<string, number> = {};
  Object.keys(defenderBaseComp).forEach(id => {
    const originalCount = defenderBaseComp[id];
    const survivedCount = defenders.units.filter(u => u.typeId === id && !u.isDead).length;
    const destroyed = originalCount - survivedCount;
    if (destroyed > 0) {
      repairedDefense[id] = Math.floor(destroyed * 0.7);
    }
  });

  const missionSpeed = attackers.slowestSpeed;

  return { 
    winner, 
    rounds, 
    totalAttackerDamage,
    totalDefenderDamage,
    initialAttackerHull,
    initialDefenderHull,
    attackerShieldsRemaining,
    defenderShieldsRemaining,
    repairedDefense,
    loot,
    missionSpeed,
    initialCargoCapacity,
    survivingCargoCapacity,
    generatedDebris,
    attackerSurviving: attackers.aliveUnits,
    defenderSurviving: defenders.aliveUnits
  };
};
