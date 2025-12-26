
import { useState, useEffect, useCallback, useRef } from 'react';
import { UserState, PlanetState, Resources, EventTask, CombatReport, SystemLog, FleetMission, Coordinate, DebrisField, MoonState } from './types';
import { getProductionRates, calculateCapacity, calculateProtection, calculateDistance, calculateFlightTime, generatePlanetProperties, formatNumber } from './utils';
import { SHIPS, DEFENSE, BUILDINGS, RESEARCH, GAME_CONFIG } from './registry';
import { runCombatSimulation } from './combat';

const STORAGE_KEY = 'CORE_PROTOCOL_DB_V1';

const generateRandomName = () => {
  const prefix = ['Apex', 'Delta', 'Sigma', 'Xenon', 'Omega', 'Vortex', 'Echo', 'Nebula'];
  const suffix = Math.floor(100 + Math.random() * 899);
  return `${prefix[Math.floor(Math.random() * prefix.length)]}`;
};

const INITIAL_STATE: UserState = {
  id: 'u1-player',
  playerName: generateRandomName(),
  bio: "Status: Active. Protocol: Core. Log entry #0: Awakening in the prime sector.",
  nameChangeAvailable: true,
  research: {},
  currentPlanetId: 'p1',
  planets: [
    {
      id: 'p1',
      ownerId: 'u1-player',
      name: 'Prime Core',
      coords: { galaxy: 1, system: 42, slot: 1 },
      resources: { metal: 10000, crystal: 8000, deuterium: 5000, energy: 0 },
      lastUpdate: Date.now(),
      buildings: {},
      ships: {},
      defense: {},
      maxTemp: 140,
    }
  ],
  events: [],
  fleetMissions: [],
  combatReports: [],
  systemLogs: [],
  debrisFields: {},
  lastLogsSeenTimestamp: Date.now(),
  boostEndTime: Date.now() + 24 * 60 * 60 * 1000 // 24 Hours Boost
};

export const calculateTotalPoints = (planet: PlanetState, research: Record<string, number>) => {
  const calculateEntityPoints = (buildings: Record<string, number>, ships: Record<string, number>, defense: Record<string, number>) => {
    const buildingPoints = Object.values(buildings).reduce((a, b) => a + (b as number), 0) * 100;
    const shipPoints = Object.values(ships).reduce((a, b) => a + (b as number), 0) * 50;
    const defensePoints = Object.values(defense).reduce((a, b) => a + (b as number), 0) * 50;
    return buildingPoints + shipPoints + defensePoints;
  };

  let total = calculateEntityPoints(planet.buildings, planet.ships, planet.defense);
  
  if (planet.moon) {
    total += calculateEntityPoints(planet.moon.buildings, planet.moon.ships, planet.moon.defense);
  }

  const researchPoints = Object.values(research).reduce((a, b) => a + (b as number), 0) * 150;
  return total + researchPoints;
};

export const useGameState = () => {
  const [state, setState] = useState<UserState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.planets)) {
          return parsed;
        }
      } catch (e) {
        console.error("Critical: Failed to hydrate database state", e);
      }
    }
    return INITIAL_STATE;
  });

  const stateRef = useRef(state);
  const [lastSync, setLastSync] = useState<number>(Date.now());

  useEffect(() => {
    stateRef.current = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setLastSync(Date.now());
  }, [state]);

  const addLog = (prev: UserState, type: SystemLog['type'], message: string, planetName?: string): SystemLog[] => {
    const newLog: SystemLog = {
      id: Math.random().toString(36).substring(7),
      time: Date.now(),
      type,
      message,
      planetName
    };
    return [newLog, ...prev.systemLogs].slice(0, 100);
  };

  const updateResources = useCallback(() => {
    const now = Date.now();
    setState(prev => {
      const isBoostActive = now < prev.boostEndTime;
      const boostMult = isBoostActive ? 15 : 1;

      const newPlanets = prev.planets.map(p => {
        const secondsPassed = (now - p.lastUpdate) / 1000;
        const effectiveSeconds = Math.min(secondsPassed, 43200); 
        
        const rates = getProductionRates(p.buildings, p.ships, p.maxTemp, p.coords.slot);
        
        const metalCap = calculateCapacity(p.buildings.metal_storage || 0);
        const crystalCap = calculateCapacity(p.buildings.crystal_storage || 0);
        const deutCap = calculateCapacity(p.buildings.deut_tank || 0);

        const processProduction = (current: number, cap: number, rate: number): number => {
          if (current >= cap) return current;
          const added = (rate * boostMult * effectiveSeconds / 3600);
          return Math.min(cap, current + added);
        };

        return {
          ...p,
          lastUpdate: now,
          resources: {
            metal: processProduction(p.resources.metal, metalCap, rates.metal),
            crystal: processProduction(p.resources.crystal, crystalCap, rates.crystal),
            deuterium: processProduction(p.resources.deuterium, deutCap, rates.deuterium),
            energy: rates.energy,
          }
        };
      });

      const finishedEvents = prev.events.filter(e => e.finishTime <= now);
      const remainingEvents = prev.events.filter(e => e.finishTime > now);

      let nextUser = { ...prev, planets: newPlanets, events: remainingEvents };

      if (finishedEvents.length > 0) {
        finishedEvents.forEach(e => {
          const entity = BUILDINGS[e.targetId] || RESEARCH[e.targetId] || SHIPS[e.targetId] || DEFENSE[e.targetId];
          
          if (e.type === 'BUILDING') {
            const planetIdx = nextUser.planets.findIndex(p => p.id === e.planetId);
            if (planetIdx !== -1) {
              const p = nextUser.planets[planetIdx];
              nextUser.planets[planetIdx] = {
                ...p,
                buildings: { ...p.buildings, [e.targetId]: (p.buildings[e.targetId] || 0) + 1 }
              };
              nextUser.systemLogs = addLog(nextUser, 'CONSTRUCTION', `${entity?.name} upgraded to level ${(p.buildings[e.targetId] || 0) + 1}`, p.name);
            }
          } else if (e.type === 'RESEARCH') {
             nextUser.research = { ...nextUser.research, [e.targetId]: (nextUser.research[e.targetId] || 0) + (e.count || 1) };
             nextUser.systemLogs = addLog(nextUser, 'RESEARCH', `${entity?.name} research sequence finalized`, 'Empire Hub');
          } else if (e.type === 'SHIPYARD') {
             const planetIdx = nextUser.planets.findIndex(p => p.id === e.planetId);
             if (planetIdx !== -1) {
               const p = nextUser.planets[planetIdx];
               const isDefense = !!DEFENSE[e.targetId];
               const targetDict = isDefense ? 'defense' : 'ships';
               nextUser.planets[planetIdx] = {
                 ...p,
                 [targetDict]: { ...p[targetDict], [e.targetId]: (p[targetDict][e.targetId] || 0) + (e.count || 1) }
               };
               nextUser.systemLogs = addLog(nextUser, 'PRODUCTION', `Fabricated ${e.count || 1}x ${entity?.name}`, p.name);
             }
          }
        });
      }

      const finishedMissions = nextUser.fleetMissions.filter(m => (!m.isReturning && m.arrivalTime <= now) || (m.isReturning && m.returnTime && m.returnTime <= now));
      const remainingMissions = nextUser.fleetMissions.filter(m => !finishedMissions.includes(m));

      if (finishedMissions.length > 0) {
        finishedMissions.forEach(m => {
          const originPlanet = nextUser.planets.find(p => p.id === m.originPlanetId);
          if (m.isReturning) {
            const planetIdx = nextUser.planets.findIndex(p => p.id === m.originPlanetId);
            if (planetIdx !== -1) {
              const p = nextUser.planets[planetIdx];
              const newShips = { ...p.ships };
              Object.entries(m.ships).forEach(([id, count]) => {
                newShips[id] = (newShips[id] || 0) + (count as number);
              });
              const newRes = {
                ...p.resources,
                metal: p.resources.metal + m.resources.metal,
                crystal: p.resources.crystal + m.resources.crystal,
                deuterium: p.resources.deuterium + m.resources.deuterium,
              };
              nextUser.planets[planetIdx] = { ...p, ships: newShips, resources: newRes };
              nextUser.systemLogs = addLog(nextUser, 'MISSION', `Fleet mission return protocol executed`, p.name);
            }
          } else {
             if (m.type === 'COLONIZE') {
                const maxColonies = Math.floor((nextUser.research.astrophysics || 0) / 2) + 2;
                if (nextUser.planets.length < maxColonies) {
                   const { maxTemp } = generatePlanetProperties(m.targetCoords.slot);
                   const newPlanet: PlanetState = {
                      id: Math.random().toString(36).substring(7),
                      ownerId: nextUser.id,
                      name: 'Colony',
                      coords: m.targetCoords,
                      resources: { ...m.resources, energy: 0 },
                      lastUpdate: Date.now(),
                      buildings: {},
                      ships: { ...m.ships, colony_ship: (m.ships.colony_ship || 1) - 1 },
                      defense: {},
                      maxTemp
                   };
                   if (newPlanet.ships.colony_ship && newPlanet.ships.colony_ship <= 0) delete newPlanet.ships.colony_ship;
                   nextUser.planets.push(newPlanet);
                   nextUser.systemLogs = addLog(nextUser, 'MISSION', `New world initialized at ${m.targetCoords.galaxy}:${m.targetCoords.system}:${m.targetCoords.slot}`, 'Expansion Command');
                } else {
                   const duration = m.arrivalTime - m.startTime;
                   remainingMissions.push({ ...m, isReturning: true, returnTime: now + duration });
                   nextUser.systemLogs = addLog(nextUser, 'MISSION', `Colonization aborted: Empire Cap reached. Returning to origin.`, originPlanet?.name);
                }
             } else if (m.type === 'ATTACK') {
                const isBandit = m.targetCoords.slot === 16;
                const targetPlanet = nextUser.planets.find(p => p.coords.galaxy === m.targetCoords.galaxy && p.coords.system === m.targetCoords.system && p.coords.slot === m.targetCoords.slot);
                
                const defenderRes = targetPlanet ? targetPlanet.resources : (isBandit ? { metal: 25000, crystal: 15000, deuterium: 5000, energy: 0 } : { metal: 0, crystal: 0, deuterium: 0, energy: 0 });
                const defenderProt = targetPlanet ? {
                   metal: calculateProtection(targetPlanet.buildings.metal_storage || 0),
                   crystal: calculateProtection(targetPlanet.buildings.crystal_storage || 0),
                   deuterium: calculateProtection(targetPlanet.buildings.deut_tank || 0),
                   energy: 0
                } : { metal: 0, crystal: 0, deuterium: 0, energy: 0 };

                const combatResult = runCombatSimulation(
                   m.ships,
                   targetPlanet?.ships || {},
                   targetPlanet?.defense || {},
                   defenderRes,
                   defenderProt,
                   isBandit
                );

                const debrisKey = `${m.targetCoords.galaxy}:${m.targetCoords.system}:${m.targetCoords.slot}`;
                const currentDebris = nextUser.debrisFields[debrisKey] || { metal: 0, crystal: 0 };
                const totalNewDebris = combatResult.generatedDebris.metal + combatResult.generatedDebris.crystal;
                
                nextUser.debrisFields[debrisKey] = {
                  metal: currentDebris.metal + combatResult.generatedDebris.metal,
                  crystal: currentDebris.crystal + combatResult.generatedDebris.crystal
                };

                if (targetPlanet && !targetPlanet.moon && totalNewDebris > 0) {
                  const moonChance = Math.min(GAME_CONFIG.moon_max_chance, totalNewDebris / 100000);
                  if (Math.random() < moonChance) {
                    const pIdx = nextUser.planets.findIndex(p => p.id === targetPlanet.id);
                    const moon: MoonState = {
                      size: Math.floor(4000 + Math.random() * 5000),
                      resources: { metal: 0, crystal: 0, deuterium: 0, energy: 0 },
                      lastUpdate: Date.now(),
                      buildings: {},
                      ships: {},
                      defense: {}
                    };
                    nextUser.planets[pIdx].moon = moon;
                    nextUser.systemLogs = addLog(nextUser, 'MISSION', `CELSTIAL COALESCENCE: A moon has formed in the debris of ${targetPlanet.name}!`, targetPlanet.name);
                  }
                }

                if (targetPlanet) {
                   const pIdx = nextUser.planets.findIndex(p => p.id === targetPlanet.id);
                   const newShips: Record<string, number> = {};
                   const newDefense: Record<string, number> = {};
                   
                   combatResult.defenderSurviving.forEach(u => {
                      if (SHIPS[u.typeId]) {
                        newShips[u.typeId] = (newShips[u.typeId] || 0) + 1;
                      } else if (DEFENSE[u.typeId]) {
                        newDefense[u.typeId] = (newDefense[u.typeId] || 0) + 1;
                      }
                   });

                   Object.entries(combatResult.repairedDefense).forEach(([id, count]) => {
                      newDefense[id] = (newDefense[id] || 0) + (count as number);
                   });

                   nextUser.planets[pIdx] = {
                      ...nextUser.planets[pIdx],
                      ships: newShips,
                      defense: newDefense,
                      resources: {
                         metal: Math.max(0, targetPlanet.resources.metal - combatResult.loot.metal),
                         crystal: Math.max(0, targetPlanet.resources.crystal - combatResult.loot.crystal),
                         deuterium: Math.max(0, targetPlanet.resources.deuterium - combatResult.loot.deuterium),
                         energy: targetPlanet.resources.energy
                      }
                   };
                }

                const survivingAttackerShips: Record<string, number> = {};
                combatResult.attackerSurviving.forEach(u => survivingAttackerShips[u.typeId] = (survivingAttackerShips[u.typeId] || 0) + 1);

                const report: CombatReport = {
                   id: Math.random().toString(36).substring(7),
                   time: now,
                   attackerId: nextUser.id,
                   defenderId: targetPlanet?.ownerId || 'NPC',
                   defenderPlanetName: isBandit ? 'Bandit Outpost' : (targetPlanet?.name || 'Deep Space'),
                   targetCoords: m.targetCoords,
                   winner: combatResult.winner,
                   rounds: combatResult.rounds,
                   totalAttackerDamage: combatResult.totalAttackerDamage,
                   totalDefenderDamage: combatResult.totalDefenderDamage,
                   initialAttackerHull: combatResult.initialAttackerHull,
                   initialDefenderHull: combatResult.initialDefenderHull,
                   attackerShieldsRemaining: combatResult.attackerShieldsRemaining,
                   defenderShieldsRemaining: combatResult.defenderShieldsRemaining,
                   loot: combatResult.loot,
                   initialCargoCapacity: combatResult.initialCargoCapacity,
                   survivingCargoCapacity: combatResult.survivingCargoCapacity,
                   repairedDefense: combatResult.repairedDefense
                };
                nextUser.combatReports.unshift(report);

                const dist = calculateDistance(originPlanet?.coords || m.targetCoords, m.targetCoords);
                const returnTime = now + calculateFlightTime(dist, combatResult.missionSpeed || 2500) * 1000;

                remainingMissions.push({
                   ...m,
                   ships: survivingAttackerShips,
                   resources: combatResult.loot,
                   isReturning: true,
                   returnTime: returnTime
                });
                
                nextUser.systemLogs = addLog(nextUser, 'MISSION', `Combat finalized at ${m.targetCoords.galaxy}:${m.targetCoords.system}:${m.targetCoords.slot}. Result: ${combatResult.winner.toUpperCase()}`, originPlanet?.name);
             } else if (m.type === 'RECYCLE') {
                const debrisKey = `${m.targetCoords.galaxy}:${m.targetCoords.system}:${m.targetCoords.slot}`;
                const debris = nextUser.debrisFields[debrisKey];
                let collected = { metal: 0, crystal: 0 };
                
                if (debris) {
                  const capacity = Object.entries(m.ships).reduce((acc, [id, count]) => acc + ((SHIPS[id]?.stats.cargo || 0) * (count as number)), 0);
                  const totalDebris = debris.metal + debris.crystal;
                  const ratio = Math.min(1, capacity / (totalDebris || 1));
                  
                  collected.metal = Math.floor(debris.metal * ratio);
                  collected.crystal = Math.floor(debris.crystal * ratio);
                  
                  nextUser.debrisFields[debrisKey] = {
                    metal: Math.max(0, debris.metal - collected.metal),
                    crystal: Math.max(0, debris.crystal - collected.crystal)
                  };
                  if (nextUser.debrisFields[debrisKey].metal <= 0 && nextUser.debrisFields[debrisKey].crystal <= 0) {
                    delete nextUser.debrisFields[debrisKey];
                  }
                }

                const dist = calculateDistance(originPlanet?.coords || m.targetCoords, m.targetCoords);
                const slowestSpeed = Object.keys(m.ships).reduce((acc, id) => Math.min(acc, SHIPS[id]?.stats.speed || 2500), Infinity);
                const returnTime = now + calculateFlightTime(dist, slowestSpeed === Infinity ? 2500 : slowestSpeed) * 1000;

                remainingMissions.push({
                  ...m,
                  resources: { metal: collected.metal, crystal: collected.crystal, deuterium: 0, energy: 0 },
                  isReturning: true,
                  returnTime: returnTime
                });
                nextUser.systemLogs = addLog(nextUser, 'MISSION', `Debris extraction finalized at ${debrisKey}. Salvaged: ${formatNumber(collected.metal)}M, ${formatNumber(collected.crystal)}C`, originPlanet?.name);
             } else {
                const duration = m.arrivalTime - m.startTime;
                remainingMissions.push({
                  ...m,
                  isReturning: true,
                  returnTime: now + duration,
                });
                nextUser.systemLogs = addLog(nextUser, 'MISSION', `Mission reached target: ${m.type} at ${m.targetCoords.galaxy}:${m.targetCoords.system}:${m.targetCoords.slot}`, originPlanet?.name);
             }
          }
        });
      }
      return { ...nextUser, fleetMissions: remainingMissions };
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(updateResources, 1000);
    return () => clearInterval(interval);
  }, [updateResources]);

  const startEvent = (task: Omit<EventTask, 'id' | 'planetId' | 'startTime'>) => {
    const now = Date.now();
    const id = Math.random().toString(36).substring(7);

    const buildingCount = state.events.filter(e => e.type === 'BUILDING' && e.planetId === state.currentPlanetId).length;
    const researchCount = state.events.filter(e => e.type === 'RESEARCH').length;

    if (task.type === 'BUILDING' && buildingCount >= 2) return;
    if (task.type === 'RESEARCH' && researchCount >= 1) return;

    setState(prev => ({
      ...prev,
      events: [...prev.events, { ...task, id, startTime: now, planetId: prev.currentPlanetId }]
    }));
  };

  const launchMission = (mission: Omit<FleetMission, 'id' | 'startTime' | 'arrivalTime' | 'isReturning'>) => {
    const now = Date.now();
    const id = Math.random().toString(36).substring(7);
    const origin = state.planets.find(p => p.id === mission.originPlanetId);
    if (!origin) return;

    const dist = calculateDistance(origin.coords, mission.targetCoords);
    
    let slowestSpeed = Infinity;
    Object.keys(mission.ships).forEach(sid => {
      const ship = SHIPS[sid];
      if (ship && ship.stats.speed) slowestSpeed = Math.min(slowestSpeed, ship.stats.speed);
    });
    if (slowestSpeed === Infinity) slowestSpeed = 2500;

    const arrivalTime = now + calculateFlightTime(dist, slowestSpeed) * 1000;

    setState(prev => {
      const pIdx = prev.planets.findIndex(p => p.id === mission.originPlanetId);
      const newPlanets = [...prev.planets];
      const p = { ...newPlanets[pIdx] };
      
      const nextShips = { ...p.ships };
      Object.entries(mission.ships).forEach(([sid, count]) => {
        nextShips[sid] = (nextShips[sid] || 0) - (count as number);
        if (nextShips[sid] <= 0) delete nextShips[sid];
      });

      const nextRes = {
        ...p.resources,
        metal: p.resources.metal - mission.resources.metal,
        crystal: p.resources.crystal - mission.resources.crystal,
        deuterium: p.resources.deuterium - mission.resources.deuterium,
      };

      newPlanets[pIdx] = { ...p, ships: nextShips, resources: nextRes };

      return {
        ...prev,
        planets: newPlanets,
        fleetMissions: [...prev.fleetMissions, { ...mission, id, startTime: now, arrivalTime, isReturning: false }]
      };
    });
  };

  const deductResources = (cost: Resources) => {
    setState(prev => {
      const planetIdx = prev.planets.findIndex(p => p.id === prev.currentPlanetId);
      if (planetIdx === -1) return prev;
      const newPlanets = [...prev.planets];
      newPlanets[planetIdx] = {
        ...newPlanets[planetIdx],
        resources: {
          ...newPlanets[planetIdx].resources,
          metal: Math.max(0, newPlanets[planetIdx].resources.metal - (cost.metal || 0)),
          crystal: Math.max(0, newPlanets[planetIdx].resources.crystal - (cost.crystal || 0)),
          deuterium: Math.max(0, newPlanets[planetIdx].resources.deuterium - (cost.deuterium || 0)),
        }
      };
      return { ...prev, planets: newPlanets };
    });
  };

  const updateProfile = (name: string, bio: string, nameChanged: boolean) => {
    setState(prev => ({
      ...prev,
      playerName: name,
      bio: bio,
      nameChangeAvailable: prev.nameChangeAvailable && !nameChanged
    }));
  };

  const setPlanet = (id: string) => {
    setState(prev => ({ ...prev, currentPlanetId: id }));
  };

  const markLogsRead = () => {
    setState(prev => ({ ...prev, lastLogsSeenTimestamp: Date.now() }));
  };

  const clearLogs = () => {
    setState(prev => ({ ...prev, systemLogs: [], combatReports: [] }));
  };

  const hardReset = () => {
    if (confirm("WARNING: Irreversible Data Deletion. Purge all records from local core?")) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  };

  return {
    state,
    startEvent,
    launchMission,
    deductResources,
    setPlanet,
    updateProfile,
    markLogsRead,
    clearLogs,
    hardReset,
    lastSync,
    currentPlanet: state.planets.find(p => p.id === state.currentPlanetId)!,
  };
};
