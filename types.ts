
export interface Resources {
  metal: number;
  crystal: number;
  deuterium: number;
  energy: number;
}

export type ResourceType = keyof Omit<Resources, 'energy'>;

export interface Cost {
  metal?: number;
  crystal?: number;
  deuterium?: number;
  energy?: number;
}

export interface Coordinate {
  galaxy: number;
  system: number;
  slot: number;
}

export interface EntityRequirement {
  [key: string]: number;
}

export interface GameEntity {
  id: string;
  name: string;
  description: string;
  baseCost: Cost;
  multiplier: number;
  requirements?: EntityRequirement;
}

export interface Building extends GameEntity {
  productionFormula?: (level: number) => number;
  energyConsumption?: (level: number) => number;
  energyProduction?: (level: number) => number;
}

export interface Research extends GameEntity {
  stats?: {
    hull: number;
    shield: number;
    attack: number;
  };
}

export interface Ship extends GameEntity {
  stats: {
    hull: number;
    shield: number;
    attack: number;
    cargo?: number;
    speed?: number;
  };
  rapidFire: Record<string, number>;
}

export interface EventTask {
  id: string;
  type: 'BUILDING' | 'RESEARCH' | 'SHIPYARD';
  targetId: string;
  finishTime: number;
  startTime: number;
  planetId: string;
  count?: number; 
}

export type MissionType = 'ATTACK' | 'TRANSPORT' | 'DEPLOY' | 'RECYCLE' | 'DESTROY' | 'ESPIONAGE' | 'COLONIZE';

export interface FleetMission {
  id: string;
  type: MissionType;
  originPlanetId: string;
  targetCoords: Coordinate;
  ships: Record<string, number>;
  resources: Resources;
  startTime: number;
  arrivalTime: number;
  returnTime?: number;
  isReturning: boolean;
}

export interface DebrisField {
  metal: number;
  crystal: number;
}

export interface MoonState {
  size: number;
  resources: Resources;
  lastUpdate: number;
  buildings: Record<string, number>;
  ships: Record<string, number>;
  defense: Record<string, number>;
}

export interface CombatUnit {
  typeId: string;
  hull: number;
  maxHull: number;
  shield: number;
  maxShield: number;
  attack: number;
  speed: number;
  cargo: number;
  isDead: boolean;
}

export interface CombatRound {
  attackerAttackers: number;
  defenderAttackers: number;
  attackerDamage: number;
  defenderDamage: number;
  // Advanced Analytics
  attackerShieldDamage: number;
  attackerHullDamage: number;
  attackerRapidFires: number;
  attackerDodges: number;
  defenderShieldDamage: number;
  defenderHullDamage: number;
  defenderRapidFires: number;
  defenderDodges: number;
}

export interface CombatReport {
  id: string;
  time: number;
  attackerId: string;
  defenderId: string;
  defenderPlanetName: string;
  targetCoords: Coordinate;
  winner: 'attacker' | 'defender' | 'draw';
  rounds: CombatRound[];
  totalAttackerDamage: number;
  totalDefenderDamage: number;
  initialAttackerHull: number;
  initialDefenderHull: number;
  attackerShieldsRemaining: number;
  defenderShieldsRemaining: number;
  loot: Resources;
  initialCargoCapacity: number;
  survivingCargoCapacity: number;
  repairedDefense: Record<string, number>;
}

export interface SystemLog {
  id: string;
  time: number;
  type: 'CONSTRUCTION' | 'RESEARCH' | 'PRODUCTION' | 'MISSION';
  message: string;
  planetName?: string;
}

export type HonorStatus = 'honorable' | 'neutral' | 'bandit';

export interface PlanetState {
  id: string;
  name: string;
  coords: Coordinate;
  resources: Resources;
  lastUpdate: number;
  buildings: Record<string, number>;
  ships: Record<string, number>;
  defense: Record<string, number>;
  maxTemp: number;
  ownerId: string;
  moon?: MoonState;
}

export interface UserState {
  id: string;
  playerName: string;
  bio: string;
  nameChangeAvailable: boolean;
  research: Record<string, number>;
  planets: PlanetState[];
  currentPlanetId: string;
  events: EventTask[];
  fleetMissions: FleetMission[];
  combatReports: CombatReport[];
  systemLogs: SystemLog[];
  debrisFields: Record<string, DebrisField>; // key: "G:S:Sl"
  lastLogsSeenTimestamp: number;
  boostEndTime: number; // New Player Boost
}
