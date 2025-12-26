
import { Cost, Resources, Coordinate } from './types';
import { BUILDINGS } from './registry';

/**
 * Formats numbers using the Imperial Abbreviation System:
 * 0 - 9,999: Raw number with commas (e.g. 8,450)
 * 10,000 - 999,999: k (e.g. 150k)
 * 1,000,000 - 999,999,999: M (e.g. 1.2M)
 * 1,000,000,000+: B (e.g. 1.5B)
 */
export const formatNumber = (num: number, exact: boolean = false): string => {
  if (exact) return Math.floor(num).toLocaleString();
  
  if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 10000) return Math.floor(num / 1000) + 'k';
  
  return Math.floor(num).toLocaleString();
};

export const calculateCost = (baseCost: Cost, multiplier: number, level: number): Cost => {
  const factor = Math.pow(multiplier, level);
  return {
    metal: baseCost.metal ? Math.floor(baseCost.metal * factor) : 0,
    crystal: baseCost.crystal ? Math.floor(baseCost.crystal * factor) : 0,
    deuterium: baseCost.deuterium ? Math.floor(baseCost.deuterium * factor) : 0,
    energy: baseCost.energy ? baseCost.energy : 0,
  };
};

/**
 * High-density molecular compression storage formula.
 * Base at Lvl 0: 12,500
 */
export const calculateCapacity = (level: number): number => {
  return Math.floor(5000 * 2.5 * Math.exp((20 * level) / 33));
};

/**
 * Calculates protected resource amount based on storage level.
 * Protected resources cannot be looted during combat.
 */
export const calculateProtection = (level: number): number => {
  if (level === 0) return 1250; // Base baseline protection for all sectors
  const cap = calculateCapacity(level);
  // Protection scales at ~12% of the storage capacity plus a level bonus
  return Math.floor(1250 + (cap * 0.12) + (level * 500));
};

export const calculateDistance = (from: Coordinate, to: Coordinate): number => {
  if (from.galaxy !== to.galaxy) return 20000 * Math.abs(from.galaxy - to.galaxy);
  if (from.system !== to.system) return 2700 + 95 * Math.abs(from.system - to.system);
  if (from.slot !== to.slot) return 1000 + 5 * Math.abs(from.slot - to.slot);
  return 5;
};

export const calculateFlightTime = (distance: number, maxSpeed: number, percentage: number = 100): number => {
  if (maxSpeed <= 0) return 0;
  return Math.floor((35000 / percentage) * Math.sqrt((distance * 10) / maxSpeed) + 10);
};

/**
 * Generates planetary properties based on orbital slot.
 */
export const generatePlanetProperties = (slot: number) => {
  let maxTemp = 40;
  let maxFields = 160;

  // Temperature Logic
  if (slot >= 1 && slot <= 3) maxTemp = Math.floor(80 + Math.random() * 60);
  else if (slot >= 4 && slot <= 12) maxTemp = Math.floor(20 + Math.random() * 40);
  else if (slot >= 13 && slot <= 15) maxTemp = Math.floor(-120 + Math.random() * 110);

  // Field Logic
  if (slot >= 7 && slot <= 9) maxFields = Math.floor(200 + Math.random() * 50);
  else if (slot >= 1 && slot <= 3) maxFields = Math.floor(120 + Math.random() * 40);
  else if (slot >= 13 && slot <= 15) maxFields = Math.floor(120 + Math.random() * 40);
  else maxFields = Math.floor(160 + Math.random() * 40);

  return { maxTemp, maxFields };
};

export const getProductionRates = (
  buildings: Record<string, number>, 
  ships: Record<string, number>, 
  maxTemp: number, 
  slot: number
): Resources & { efficiency: number; energyProduction: number; energyConsumption: number } => {
  const baseRates = { metal: 30, crystal: 20, deuterium: 10 };
  let metalProd = 0;
  let crystalProd = 0;
  let deutProd = 0;
  let energyProd = 0;
  let energyCons = 0;

  // Building Production and Consumption
  Object.entries(buildings).forEach(([id, level]) => {
    const b = BUILDINGS[id];
    if (!b || level === 0) return;

    if (b.productionFormula) {
      const baseVal = b.productionFormula(level);
      if (id === 'metal_mine') metalProd += baseVal;
      if (id === 'crystal_mine') crystalProd += baseVal;
      if (id === 'deut_synthesizer') {
        let modifier = (1.28 - 0.002 * maxTemp);
        deutProd += baseVal * modifier;
      }
    }
    if (b.energyProduction) energyProd += b.energyProduction(level);
    if (b.energyConsumption) energyCons += b.energyConsumption(level);
  });

  // Orbital Energy: Solar Satellites
  const satelliteCount = ships['solar_satellite'] || 0;
  if (satelliteCount > 0) {
    const energyPerSat = Math.floor((maxTemp + 140) / 6);
    energyProd += satelliteCount * energyPerSat;
  }

  let efficiency = 1;
  if (energyCons > energyProd) efficiency = energyProd === 0 ? 0 : Math.max(0, energyProd / energyCons);

  return {
    metal: (baseRates.metal + metalProd) * efficiency,
    crystal: (baseRates.crystal + crystalProd) * efficiency,
    deuterium: (baseRates.deuterium + deutProd) * efficiency,
    energy: energyProd - energyCons,
    energyProduction: energyProd,
    energyConsumption: energyCons,
    efficiency: efficiency
  };
};

export const calculateBuildTime = (cost: Cost, roboticsLevel: number, naniteLevel: number, isBoosted: boolean = false): number => {
  const totalRes = (cost.metal || 0) + (cost.crystal || 0);
  const baseHours = totalRes / 2500;
  const robotFactor = 1 / (roboticsLevel + 1);
  const naniteFactor = Math.pow(0.5, naniteLevel);
  const boostFactor = isBoosted ? 0.25 : 1;
  return Math.max(1, Math.floor(baseHours * robotFactor * naniteFactor * 3600 * boostFactor));
};

export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};
