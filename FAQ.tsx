
import React, { useState } from 'react';
import { BUILDINGS, RESEARCH, SHIPS, DEFENSE, GAME_CONFIG } from './registry';
import { formatNumber } from './utils';

export const FAQView = () => {
  const [openChapters, setOpenChapters] = useState<Record<number, boolean>>({ 1: true });

  const toggleChapter = (id: number) => {
    setOpenChapters(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const renderCost = (cost: any) => Object.entries(cost).filter(([_, v]) => (v as number) > 0).map(([k, v]) => `${formatNumber(v as number)} ${k}`).join(', ');

  const ChapterWrapper = ({ id, title, children }: { id: number; title: string; children?: React.ReactNode }) => {
    const isOpen = openChapters[id];
    return (
      <section className="space-y-6 border-b border-[var(--arrival-border)] pb-8 last:border-none">
        <div 
          onClick={() => toggleChapter(id)}
          className="flex items-center justify-between group cursor-pointer select-none py-2"
        >
          <div className="flex items-center gap-4">
            <span className={`text-[10px] font-mono transition-colors duration-500 ${isOpen ? 'text-[var(--arrival-accent)]' : 'text-[var(--arrival-ink-dim)] opacity-40'}`}>
              {id.toString().padStart(2, '0')}
            </span>
            <h3 className={`text-[12px] md:text-[15px] font-orbitron uppercase tracking-widest transition-all duration-500 ${isOpen ? 'text-[var(--arrival-ink)] translate-x-2' : 'text-[var(--arrival-ink-dim)] group-hover:text-[var(--arrival-ink)]'}`}>
              {title}
            </h3>
          </div>
          <span className={`text-lg font-light transition-transform duration-500 ${isOpen ? 'rotate-45 text-[var(--arrival-accent)]' : 'text-[var(--arrival-ink-dim)] opacity-20'}`}>
            +
          </span>
        </div>
        
        <div className={`grid transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
          <div className="overflow-hidden">
            <div className="pt-4 pb-2">
              {children}
            </div>
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="max-w-6xl mx-auto py-8 md:py-16 space-y-12 md:space-y-16 pb-40 arrival-fade px-4 md:px-8 w-full overflow-hidden">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-[var(--arrival-border)] pb-12">
        <div className="space-y-3">
          <h2 className="text-2xl md:text-5xl font-orbitron font-extralight uppercase tracking-[0.5em] text-[var(--arrival-ink)]">Technical Bible</h2>
          <div className="flex gap-4 items-center">
            <span className="text-[7px] md:text-[9px] text-[var(--arrival-accent)] tracking-[0.6em] uppercase font-bold">Protocol v6.8.0</span>
            <div className="h-[1px] w-20 bg-[var(--arrival-border)]"></div>
            <span className="text-[7px] md:text-[9px] text-[var(--arrival-ink-dim)] tracking-[0.4em] uppercase">Master Imperial Archive</span>
          </div>
        </div>
        <div className="hidden md:block text-right">
          <p className="text-[8px] font-mono text-[var(--arrival-ink-dim)] opacity-40 leading-relaxed uppercase">
            Sector Logic: Asynchronous Genesis<br />
            Auth: Grand Commander Level 10
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* 01: INFRASTRUCTURE ARRAY */}
        <ChapterWrapper id={1} title="Infrastructure Array">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass-card p-6 space-y-4">
              <h4 className="text-[9px] font-bold uppercase tracking-widest text-[var(--arrival-accent)]">Resource Extraction Logic</h4>
              <p className="text-[10px] text-[var(--arrival-ink-dim)] leading-relaxed">
                Resource yields are calculated using a per-tick asynchronous engine.
              </p>
              <ul className="text-[9px] text-[var(--arrival-ink-dim)] space-y-2">
                <li>• <span className="text-[var(--arrival-ink)]">Metal & Crystal:</span> Base production scales exponentially with Mine levels. (Formula: <span className="font-mono">30 * L * 1.1^L</span>)</li>
                <li>• <span className="text-[var(--arrival-ink)]">Deuterium:</span> Yield is inversely proportional to planetary temperature. Cold planets (Slots 13-15) produce significantly more.</li>
                <li>• <span className="text-[var(--arrival-ink)]">Efficiency:</span> If Energy consumption exceeds production, all mines operate at <span className="text-red-400">TotalPower / RequiredPower</span> efficiency.</li>
              </ul>
            </div>
            <div className="glass-card p-6 space-y-4">
              <h4 className="text-[9px] font-bold uppercase tracking-widest text-[var(--arrival-accent)]">Storage & Protection</h4>
              <p className="text-[10px] text-[var(--arrival-ink-dim)] leading-relaxed">
                Logistics capacity is governed by high-density molecular compression.
              </p>
              <ul className="text-[9px] text-[var(--arrival-ink-dim)] space-y-2">
                <li>• <span className="text-[var(--arrival-ink)]">Storage Cap:</span> Every level provides a ~65% increase in total capacity. Total capacity = <span className="font-mono">12,500 * exp(20*L/33)</span>.</li>
                <li>• <span className="text-[var(--arrival-ink)]">Orbital Protection:</span> 12% of total storage is hardened against raids and cannot be looted by attackers.</li>
                <li>• <span className="text-[var(--arrival-ink)]">Base Buffer:</span> Every sector has a guaranteed 1,250 unit baseline protection regardless of storage level.</li>
              </ul>
            </div>
          </div>
        </ChapterWrapper>

        {/* 02: RESEARCH ARRAY */}
        <ChapterWrapper id={2} title="Research Array">
          <div className="glass-card p-8 rounded-sm space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-[var(--arrival-accent)] uppercase">Drive & Propulsion Systems</h4>
                <ul className="text-[9px] text-[var(--arrival-ink-dim)] space-y-2">
                  <li>• <span className="text-[var(--arrival-ink)]">Combustion Drive:</span> Low-tier (+10% Speed/Lvl). Powers Cargos and Light Fighters.</li>
                  <li>• <span className="text-[var(--arrival-ink)]">Impulse Drive:</span> Mid-tier (+20% Speed/Lvl). Powers Cruisers and Heavy Fighters.</li>
                  <li>• <span className="text-[var(--arrival-ink)]">Hyperspace Drive:</span> High-tier (+30% Speed/Lvl). Powers Battleships and Capital Ships.</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-[var(--arrival-accent)] uppercase">Empire Scaling</h4>
                <ul className="text-[9px] text-[var(--arrival-ink-dim)] space-y-2">
                  <li>• <span className="text-[var(--arrival-ink)]">Astrophysics:</span> Unlocks additional colony slots. Formula: <span className="font-mono">floor(Level/2) + 2</span>.</li>
                  <li>• <span className="text-[var(--arrival-ink)]">Computer Tech:</span> Increases the number of concurrent fleet missions available.</li>
                  <li>• <span className="text-[var(--arrival-ink)]">Intergalactic Net (IRN):</span> Links all labs together, allowing the highest level lab to leverage research time from all other connected labs.</li>
                </ul>
              </div>
            </div>
            <div className="p-4 bg-blue-400/5 border border-blue-400/20">
               <h5 className="text-[8px] font-bold text-blue-400 uppercase mb-1">Combat Efficiency Bonuses</h5>
               <p className="text-[9px] text-[var(--arrival-ink-dim)] leading-relaxed">Weapon, Shielding, and Armor technologies provide a flat <b>10%</b> increase to base unit stats per level. These bonuses are multiplicative across different unit classes.</p>
            </div>
          </div>
        </ChapterWrapper>

        {/* 03: MOON GENESIS PROTOCOL */}
        <ChapterWrapper id={3} title="Moon Genesis Protocol">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass-card p-6 space-y-4">
              <h4 className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest">The Debris Coalescence Rule</h4>
              <p className="text-[9px] text-[var(--arrival-ink-dim)] leading-relaxed">
                When fleet elements are destroyed, <b>30%</b> of their Metal and Crystal cost is transformed into an orbital Debris Field.
              </p>
              <div className="p-3 bg-indigo-500/5 border border-indigo-400/20 rounded-sm space-y-2">
                <span className="text-[8px] font-mono block">Creation Formula:</span>
                <span className="text-[9px] font-mono text-indigo-300">Chance = floor(Total Debris / 100,000)%</span>
                <span className="text-[8px] opacity-40 uppercase block">Max Chance: {GAME_CONFIG.moon_max_chance * 100}%</span>
              </div>
            </div>
            <div className="glass-card p-6 space-y-4">
              <h4 className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest">Lunar Strategic Value</h4>
              <ul className="text-[9px] text-[var(--arrival-ink-dim)] space-y-2">
                <li>• <span className="text-[var(--arrival-ink)] font-bold">Stealth:</span> Moons provide a "ghost sector". Ships parked here are not visible to standard planetary espionage.</li>
                <li>• <span className="text-[var(--arrival-ink)] font-bold">Tactical Hardening:</span> Moons possess significantly higher natural armor for buildings than planets.</li>
                <li>• <span className="text-[var(--arrival-ink)] font-bold">Jump Gates (Future):</span> Unlocks instantaneous travel between your lunar outposts.</li>
              </ul>
            </div>
          </div>
        </ChapterWrapper>

        {/* 04: TRANSPORTATION & LOGISTICS */}
        <ChapterWrapper id={4} title="Transportation & Logistics">
          <div className="glass-card p-8 rounded-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <h4 className="text-[10px] font-bold uppercase text-[var(--arrival-accent)]">Sector Distance Metrics</h4>
                <div className="space-y-3 font-mono text-[8px]">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="opacity-60">Intra-Solar (Slot to Slot):</span>
                    <span className="text-[var(--arrival-accent)]">1,000 + 5 * |S1-S2|</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="opacity-60">Intra-Galaxy (System to System):</span>
                    <span className="text-[var(--arrival-accent)]">2,700 + 95 * |Sys1-Sys2|</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="opacity-60">Inter-Galaxy:</span>
                    <span className="text-[var(--arrival-accent)]">20,000 * |G1-G2|</span>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <h4 className="text-[10px] font-bold uppercase text-[var(--arrival-accent)]">Temporal Velocity Rules</h4>
                <p className="text-[9px] text-[var(--arrival-ink-dim)] leading-relaxed italic">
                  A fleet's arrival time is determined solely by the <b>slowest</b> vessel in the task force.
                </p>
                <div className="p-4 bg-black/10 border border-white/5 text-[9px] leading-relaxed">
                   Increasing propulsion tech doesn't just increase speed; it effectively warps the space-time denominator, leading to non-linear travel time reductions for long-range missions.
                </div>
              </div>
            </div>
          </div>
        </ChapterWrapper>

        {/* 05: ENGAGEMENT DOCTRINE */}
        <ChapterWrapper id={5} title="Engagement Doctrine">
          <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 glass-card border-b-2 border-red-500/20 rounded-sm space-y-4">
                 <h4 className="text-[9px] font-bold text-red-400 uppercase tracking-widest">The Explosion Law</h4>
                 <p className="text-[9px] text-[var(--arrival-ink-dim)] leading-relaxed">
                   When hull integrity drops below <b>70%</b>, every subsequent hit carries a catastrophic failure risk. Units with damaged hulls become increasingly fragile.
                   <br/><br/>
                   <span className="font-mono text-white/40 italic">Risk = 1 - (CurrentHull / MaxHull)</span>
                 </p>
              </div>
              <div className="p-6 glass-card border-b-2 border-yellow-400/20 rounded-sm space-y-4">
                 <h4 className="text-[9px] font-bold text-yellow-400 uppercase tracking-widest">Speed-Based Evasion Protocol</h4>
                 <div className="space-y-3">
                   <p className="text-[9px] text-[var(--arrival-ink-dim)] leading-relaxed">
                     High-velocity vessels can warp their space-time signatures to avoid projectiles entirely. This is essential for Light Fighter viability against Capital ships.
                   </p>
                   <div className="p-3 bg-yellow-400/5 border border-yellow-400/10 font-mono text-[9px] text-yellow-200/60">
                     Proc = min(15%, Speed / 250,000)
                   </div>
                   <p className="text-[8px] text-[var(--arrival-accent)] leading-relaxed">
                     <b>Strategic Impact:</b> Light Fighters (12.5k speed) possess a 5% baseline dodge, whereas high-tech Espionage Probes (100k+ speed) reach the 15% cap. This renders "swarm" tactics significantly more effective than their raw health suggests.
                   </p>
                 </div>
              </div>
              <div className="p-6 glass-card border-b-2 border-blue-400/20 rounded-sm space-y-4">
                 <h4 className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Rapid Fire (RF) Cycles</h4>
                 <div className="space-y-3">
                   <p className="text-[9px] text-[var(--arrival-ink-dim)] leading-relaxed">
                     Vessels with RF against specific targets have a high probability to re-engage immediately within the same round.
                   </p>
                   <div className="p-3 bg-blue-400/5 border border-blue-400/10 font-mono text-[9px] text-blue-200/60">
                     Re-Fire Chance = (RF_Value - 1) / RF_Value
                   </div>
                   <p className="text-[8px] text-[var(--arrival-accent)] leading-relaxed">
                     <b>Tactical Influence:</b> RF drastically shortens combat duration by maximizing damage-per-round. A fleet with high RF against its target can conclude an engagement in 1-2 rounds instead of the full 6, minimizing its own exposure to hull damage.
                   </p>
                 </div>
              </div>
              <div className="p-6 glass-card border-b-2 border-emerald-400/20 rounded-sm space-y-4">
                 <h4 className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Looting & Salvage</h4>
                 <p className="text-[9px] text-[var(--arrival-ink-dim)] leading-relaxed">
                   Victorious attackers retrieve <b>50%</b> of the target's unprotected resources, limited by fleet cargo capacity. Total retrieval = <span className="font-mono">min(CargoTotal, UnprotectedRes * 0.5)</span>.
                 </p>
              </div>
            </div>

            <div className="glass-card p-8 space-y-6 relative overflow-hidden">
               <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--arrival-accent)]">Temporal Resolution Analytics</h4>
               <p className="text-[9px] text-[var(--arrival-ink-dim)] leading-relaxed">
                 The interaction between <b>Evasion</b> and <b>Rapid Fire</b> determines the "Cleanliness" of a victory.
               </p>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[9px]">
                  <div className="space-y-2">
                     <span className="text-white uppercase font-bold text-[8px] block border-b border-white/10 pb-1">Outcome A: Decisive Strike</span>
                     <p className="opacity-60 leading-relaxed">High RF units (like Cruisers vs Light Fighters) eliminate targets before they can leverage evasion checks over multiple rounds. Results in low attacker hull loss.</p>
                  </div>
                  <div className="space-y-2">
                     <span className="text-white uppercase font-bold text-[8px] block border-b border-white/10 pb-1">Outcome B: Attrition Loop</span>
                     <p className="opacity-60 leading-relaxed">Low RF units firing at High Speed targets (e.g. Battleship vs Espionage Probe) trigger dozens of evasion checks, dragging the combat to the Round 6 cap and increasing the risk of "Explosion Law" triggers on both sides.</p>
                  </div>
               </div>
            </div>
            
            <div className="p-8 glass-card space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-4xl">⚔</div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--arrival-accent)]">Combat Mechanics Summary</h4>
              <p className="text-[9px] text-[var(--arrival-ink-dim)] leading-relaxed">
                Engagement lasts for a maximum of <b>6 rounds</b>. All units fire simultaneously at the start of each round. Shield arrays recharge completely at the end of every round, but hull damage persists. Following the battle, <b>70%</b> of destroyed planetary defense structures are automatically reconstructed.
              </p>
            </div>
          </div>
        </ChapterWrapper>

        {/* 06: ASSET INDEX */}
        <ChapterWrapper id={6} title="Imperial Technical Index">
          <div className="glass-card overflow-hidden rounded-sm">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-[8px] uppercase tracking-wider min-w-[800px]">
                <thead>
                  <tr className="bg-[var(--arrival-ink-dim)]/5 border-b border-[var(--arrival-border)] font-bold">
                    <th className="px-5 py-4">Asset</th>
                    <th className="px-5 py-4 text-emerald-400">Class</th>
                    <th className="px-5 py-4 text-red-400">Attack</th>
                    <th className="px-5 py-4 text-blue-300">Shield</th>
                    <th className="px-5 py-4 text-white/40">Hull</th>
                    <th className="px-5 py-4">Primary Cost</th>
                    <th className="px-5 py-4 text-yellow-500">Rapid Fire Against</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--arrival-border)] font-mono text-[var(--arrival-ink-dim)]">
                  {[...Object.values(SHIPS), ...Object.values(DEFENSE)].map(s => {
                    const rfList = Object.entries(s.rapidFire || {}).map(([id, val]) => `${SHIPS[id]?.name || DEFENSE[id]?.name || id} (x${val})`).join(', ');
                    return (
                      <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3.5 text-[var(--arrival-ink)] font-bold">{s.name}</td>
                        <td className="px-5 py-3.5 text-[7px]">{SHIPS[s.id] ? 'Vessel' : 'Station'}</td>
                        <td className="px-5 py-3.5 text-red-400/80">{formatNumber(s.stats.attack)}</td>
                        <td className="px-5 py-3.5 text-blue-300/80">{formatNumber(s.stats.shield || 0)}</td>
                        <td className="px-5 py-3.5">{formatNumber(s.stats.hull)}</td>
                        <td className="px-5 py-3.5 truncate max-w-[150px]">{renderCost(s.baseCost)}</td>
                        <td className="px-5 py-3.5 text-[7px] text-yellow-400/60 lowercase italic">{rfList || 'N/A'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </ChapterWrapper>
      </div>

      {/* Footer Branding */}
      <div className="pt-20 border-t border-[var(--arrival-border)] flex flex-col items-center gap-4 opacity-20 text-center">
        <span className="text-[30px]">⌬</span>
        <p className="text-[9px] font-orbitron tracking-[0.8em] uppercase">Core Protocol Tactical Archive</p>
        <p className="text-[7px] font-mono uppercase">© 2142 Allied Sector Management. High-Command Clearence Required.</p>
      </div>
    </div>
  );
};
