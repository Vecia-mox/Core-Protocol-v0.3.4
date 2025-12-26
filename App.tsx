
import React, { useState, useEffect, useMemo } from 'react';
import { useGameState, calculateTotalPoints } from './store';
import { BUILDINGS, RESEARCH, SHIPS, DEFENSE, GAME_CONFIG } from './registry';
import { formatNumber, calculateCost, calculateBuildTime, formatDuration, getProductionRates, calculateCapacity, calculateProtection } from './utils';
import { PlanetState, UserState, Resources, Cost, Coordinate, EventTask, CombatReport, SystemLog, FleetMission } from './types';
import { FAQView } from './FAQ';

/**
 * Tactical Context Menu (Reused for various UI interactions)
 */
const TacticalMenu = ({ x, y, title, subtitle, items, onClose, footer }: { x: number, y: number, title: string, subtitle?: string, items: { label: string, value: string | React.ReactNode, sublabel?: string, color?: string, onClick?: () => void }[], onClose: () => void, footer?: string }) => {
  const isRightSide = x > window.innerWidth / 2;
  const isBottomSide = y > window.innerHeight / 2;

  return (
    <div className="fixed inset-0 z-[2000] cursor-default bg-black/5 backdrop-blur-[1px]" onClick={onClose}>
      <div 
        className="absolute w-56 md:w-64 glass-card shadow-[var(--card-shadow)] overflow-hidden rounded-sm arrival-fade" 
        style={{ 
          left: isRightSide ? Math.max(8, x - 230) : Math.min(window.innerWidth - 230, x + 8), 
          top: isBottomSide ? Math.max(8, y - 230) : Math.min(window.innerHeight - 250, y + 8) 
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-[var(--arrival-ink-dim)]/5 px-3 py-2 border-b border-[var(--arrival-border)] relative">
          <div className="absolute top-0 left-0 w-[1px] h-full bg-[var(--arrival-accent)] opacity-40"></div>
          <span className="text-[6px] uppercase tracking-[0.4em] text-[var(--arrival-accent)] font-semibold block mb-0.5">{title}</span>
          {subtitle && <div className="text-[8px] font-orbitron text-[var(--arrival-ink)] truncate font-light uppercase tracking-widest">{subtitle}</div>}
        </div>
        <div className="p-0.5 space-y-px max-h-60 overflow-y-auto custom-scrollbar">
          {items.map((item, idx) => (
            <div key={idx} onClick={() => { item.onClick?.(); onClose(); }} className={`w-full text-left px-3 py-2 text-[8px] uppercase tracking-[0.2em] transition-all flex justify-between items-center group ${item.onClick ? 'hover:bg-[var(--arrival-ink-dim)]/10 cursor-pointer' : 'cursor-default'}`}>
              <div className="flex flex-col">
                <span className={`transition-colors ${item.onClick ? 'text-[var(--arrival-ink-dim)] group-hover:text-[var(--arrival-ink)]' : 'text-[var(--arrival-ink)] font-bold'}`}>{item.label}</span>
                {item.sublabel && <span className="text-[5px] font-mono opacity-20 group-hover:opacity-40 tracking-tight mt-0.5">{item.sublabel}</span>}
              </div>
              <span className={`font-mono text-[9px] ${item.color || 'text-[var(--arrival-ink-dim)]'}`}>{item.value}</span>
            </div>
          ))}
        </div>
        {footer && <button className="w-full py-2 bg-[var(--arrival-ink-dim)]/5 text-[6px] uppercase tracking-[0.4em] text-[var(--arrival-ink-dim)] hover:text-[var(--arrival-ink)] transition-all text-center border-t border-[var(--arrival-border)]" onClick={onClose}>{footer}</button>}
      </div>
    </div>
  );
};

/**
 * Detailed Resource Readout Overlay
 */
const ResourceDetailModal = ({ resource, stats, onClose }: { resource: string, stats: any, onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="w-full max-sm:max-w-xs max-w-sm glass-card rounded-sm overflow-hidden arrival-fade border-t-2 border-t-[var(--arrival-accent)]" onClick={e => e.stopPropagation()}>
        <div className="bg-[var(--arrival-ink-dim)]/5 p-4 flex justify-between items-center border-b border-[var(--arrival-border)]">
          <div className="flex flex-col">
            <span className="text-[6px] uppercase tracking-[0.4em] text-[var(--arrival-accent)] font-semibold">Sensor Array</span>
            <h3 className="text-xs font-orbitron text-[var(--arrival-ink)] uppercase tracking-widest">{resource} LOGISTICS</h3>
          </div>
          <button onClick={onClose} className="text-[10px] opacity-40 hover:opacity-100 transition-opacity">✕</button>
        </div>
        
        <div className="p-4 space-y-6">
          <div className="space-y-3">
             <span className="text-[7px] uppercase tracking-[0.2em] text-[var(--arrival-ink-dim)] font-bold">Extraction Efficiency</span>
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-[var(--arrival-ink-dim)]/5 p-3 rounded-sm border border-[var(--arrival-border)]">
                  <span className="text-[5px] uppercase text-[var(--arrival-ink-dim)] block mb-1">Hourly Delta</span>
                  <span className="text-sm font-mono text-[var(--arrival-ink)]">+{formatNumber(stats.rate)}</span>
                </div>
                <div className="bg-[var(--arrival-ink-dim)]/5 p-3 rounded-sm border border-[var(--arrival-border)]">
                  <span className="text-[5px] uppercase text-[var(--arrival-ink-dim)] block mb-1">24h Projection</span>
                  <span className="text-sm font-mono text-[var(--arrival-accent)]">+{formatNumber(stats.rate * 24)}</span>
                </div>
             </div>
          </div>

          <div className="space-y-3">
             <span className="text-[7px] uppercase tracking-[0.2em] text-[var(--arrival-ink-dim)] font-bold">Storage Infrastructure</span>
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-[var(--arrival-ink-dim)]/5 p-3 rounded-sm border border-[var(--arrival-border)]">
                  <span className="text-[5px] uppercase text-[var(--arrival-ink-dim)] block mb-1">Total Capacity</span>
                  <span className="text-sm font-mono text-[var(--arrival-ink)]">{formatNumber(stats.capacity)}</span>
                </div>
                <div className="bg-[var(--arrival-ink-dim)]/5 p-3 rounded-sm border border-[var(--arrival-border)]">
                  <span className="text-[5px] uppercase text-emerald-400/60 block mb-1">Orbital Protection</span>
                  <span className="text-sm font-mono text-emerald-400/80">{formatNumber(stats.protectedAmount)}</span>
                </div>
             </div>
          </div>

          {resource !== 'POWER' && (
            <div className="space-y-3 pt-2 border-t border-[var(--arrival-border)]">
               <span className="text-[7px] uppercase tracking-[0.2em] text-[var(--arrival-accent)] font-bold">Exact Stockpile</span>
               <div className="bg-black/20 p-3 rounded-sm border border-[var(--arrival-border)] flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[var(--arrival-ink)]">{formatNumber(stats.currentValue, true)}</span>
                  <span className="text-[5px] font-mono text-[var(--arrival-ink-dim)] uppercase">Units</span>
               </div>
            </div>
          )}

          {resource !== 'POWER' && (
            <div className="p-3 border-l-2 border-[var(--arrival-accent)]/20 bg-[var(--arrival-accent)]/5 italic text-[8px] text-[var(--arrival-ink-dim)] leading-relaxed">
              * Notice: Storage capacity is governed by local Tier Level infrastructure. Production halts at 100% capacity threshold.
            </div>
          )}
        </div>

        <button 
          onClick={onClose}
          className="w-full py-3 bg-[var(--arrival-ink-dim)]/10 text-[7px] font-orbitron uppercase tracking-[0.6em] text-[var(--arrival-ink-dim)] hover:text-[var(--arrival-ink)] transition-all border-t border-[var(--arrival-border)]"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
};

const Header = ({ playerName, theme, unreadCount, onToggleTheme, onLogsClick, onFaqClick, onProfileClick, lastSync }: any) => (
  <header className="px-4 md:px-12 py-3 md:py-6 flex justify-between items-center z-50 relative shrink-0 border-b border-[var(--arrival-border)]">
    <div className="flex flex-col">
      <div className="flex items-center gap-2">
        <h1 
          className="text-[10px] md:text-base font-orbitron font-extralight tracking-[0.4em] text-[var(--arrival-ink)] hover:text-[var(--arrival-accent)] cursor-pointer transition-colors"
          onClick={onProfileClick}
        >
          {playerName.toUpperCase()}
        </h1>
        <div className="flex items-center gap-1.5 ml-4 group relative">
           <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.4)]"></div>
           <span className="text-[5px] uppercase tracking-widest text-emerald-400/60 font-bold hidden sm:inline">DB-LINK: ACTIVE</span>
           <div className="absolute top-6 left-0 invisible group-hover:visible glass-card p-2 rounded-sm whitespace-nowrap z-[1000]">
              <span className="text-[6px] uppercase text-[var(--arrival-ink-dim)]">Last Core Sync: {new Date(lastSync).toLocaleTimeString()}</span>
           </div>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-3 md:gap-6">
      <button className="text-[6px] font-light uppercase tracking-[0.2em] text-[var(--arrival-ink-dim)] hover:text-[var(--arrival-ink)] transition-all relative" onClick={onLogsClick}>
        Logs
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-2 bg-[var(--arrival-accent)] text-[var(--arrival-bg)] text-[5px] font-bold px-1 rounded-full animate-pulse">{unreadCount}</span>
        )}
      </button>
      <button className="text-[6px] font-light uppercase tracking-[0.2em] text-[var(--arrival-ink-dim)] hover:text-[var(--arrival-ink)] transition-all" onClick={onFaqClick}>FAQ</button>
      <div className="h-2 w-[1px] bg-[var(--arrival-border)]"></div>
      <button className="w-6 h-6 rounded-full border border-[var(--arrival-border)] flex items-center justify-center text-[8px] text-[var(--arrival-ink-dim)] transition-all hover:bg-[var(--arrival-ink-dim)]/5 hover:text-[var(--arrival-ink)]" onClick={onToggleTheme}>
        {theme === 'dark' ? '○' : '●'}
      </button>
    </div>
  </header>
);

const LogogramMeter = ({ value, capacity, protectedAmount, label, rate, color = "var(--arrival-accent)", isWarning, onClick }: any) => {
  const size = 30; 
  const stroke = 1;
  const radius = (size / 2) - (stroke * 2);
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.max(0, Math.min(100, (value / (capacity || 1)) * 100));
  const isFull = value >= capacity && label !== 'Power';
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div 
      onClick={onClick} 
      className={`flex items-center gap-1.5 md:gap-3 group cursor-pointer transition-all duration-700 py-1 md:py-1.5 px-1.5 md:px-4 rounded-sm ${isWarning || isFull ? 'bg-red-500/5' : ''}`}
      title={`Exact ${label}: ${formatNumber(value, true)}`}
    >
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90 w-full h-full opacity-10">
          <circle cx={size/2} cy={size/2} r={radius} stroke="currentColor" strokeWidth={stroke} fill="transparent" />
        </svg>
        <svg className="absolute inset-0 transform -rotate-90 w-full h-full">
          <circle 
            cx={size/2} cy={size/2} r={radius} 
            stroke={isWarning || isFull ? '#f87171' : color} 
            strokeWidth={stroke} fill="transparent" 
            strokeDasharray={circumference} 
            strokeDashoffset={offset} 
            className="logogram-ring" 
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-[5px] font-mono ${isFull ? 'text-red-400 animate-pulse' : 'text-[var(--arrival-ink-dim)]'} group-hover:text-[var(--arrival-ink)] transition-colors`}>{Math.floor(percentage)}%</span>
        </div>
      </div>
      <div className="flex flex-col min-w-[40px] md:min-w-[50px]">
        <div className="flex items-center gap-1">
          <span className={`text-[5px] md:text-[6px] uppercase tracking-[0.2em] mb-0.5 font-semibold ${isWarning || isFull ? 'text-red-400' : 'text-[var(--arrival-ink-dim)]'}`}>{label}</span>
          {isFull && <span className="text-[4px] text-red-400 uppercase font-bold animate-pulse">Full</span>}
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`text-[9px] md:text-sm font-mono font-light leading-none tracking-tight ${isFull ? 'text-red-400' : 'text-[var(--arrival-ink)]'}`}>{formatNumber(value)}</span>
          {rate !== undefined && !isFull && (
            <span className="text-[5px] font-mono text-[var(--arrival-ink-dim)] opacity-40">+{formatNumber(rate)}</span>
          )}
        </div>
      </div>
    </div>
  );
};

const InfrastructureTile = ({ entity, level, onUpgrade, resources, activeEvent, isLocked, buildings, research, tab, queueCount, queueLimit, isBoosted }: any) => {
  const [qty, setQty] = useState(1);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const cost = calculateCost(entity.baseCost, entity.multiplier, level);
  const totalCost = tab === 'shipyard' ? {
    metal: (cost.metal || 0) * qty,
    crystal: (cost.crystal || 0) * qty,
    deuterium: (cost.deuterium || 0) * qty,
  } : cost;

  const buildTime = calculateBuildTime(cost, buildings.robotics_factory || 0, buildings.nanite_factory || 0, isBoosted);
  const totalTime = tab === 'shipyard' ? buildTime * qty : buildTime;

  const canAfford = resources.metal >= (totalCost.metal || 0) && resources.crystal >= (totalCost.crystal || 0) && resources.deuterium >= (totalCost.deuterium || 0);
  const isQueueFull = queueLimit !== undefined && queueCount >= queueLimit;

  useEffect(() => {
    if (activeEvent) {
      const timer = setInterval(() => {
        const remaining = Math.max(0, Math.floor((activeEvent.finishTime - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) clearInterval(timer);
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setTimeLeft(null);
    }
  }, [activeEvent]);

  const requirements = entity.requirements || {};
  const reqList = Object.entries(requirements).map(([id, reqLevel]) => {
    const reqEntity = BUILDINGS[id] || RESEARCH[id];
    const currentLevel = (buildings[id] || 0) + (research[id] || 0);
    const met = currentLevel >= (reqLevel as number);
    return { name: reqEntity?.name || id, required: reqLevel, current: currentLevel, met };
  });

  return (
    <div className={`infrastructure-tile glass-card p-3 md:p-5 flex flex-col md:flex-row items-start gap-3 md:gap-6 rounded-sm group overflow-hidden relative ${isLocked ? 'opacity-30 grayscale' : ''} ${activeEvent ? 'is-active-task' : ''}`}>
      {activeEvent && (
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[var(--arrival-accent)]/5 animate-pulse-active opacity-30"></div>
          <div className="absolute top-0 left-0 w-full h-[1px] bg-[var(--arrival-accent)]/20 animate-scanning-line"></div>
        </div>
      )}

      <div className="flex-1 w-full relative z-10">
        <div className="flex items-baseline gap-2 mb-0.5">
          <h3 className="text-[10px] md:text-sm font-orbitron font-light text-[var(--arrival-ink)] uppercase tracking-widest">{entity.name}</h3>
          {tab !== 'shipyard' && <span className="text-[7px] font-mono text-[var(--arrival-ink-dim)]">Lvl {level}</span>}
          {isBoosted && <span className="text-[6px] text-[var(--arrival-accent)] font-bold animate-pulse px-1 bg-[var(--arrival-accent)]/10 rounded-sm">BOOSTED (15x)</span>}
        </div>
        <p className="text-[8px] text-[var(--arrival-ink-dim)] font-light leading-relaxed mb-3 max-w-xl line-clamp-2 md:line-clamp-none">{entity.description}</p>
        
        {reqList.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {reqList.map((req, i) => (
              <div key={i} className={`text-[6px] uppercase tracking-widest px-1.5 py-0.5 border rounded-sm transition-colors duration-500 ${req.met ? 'border-[var(--arrival-border)] text-[var(--arrival-ink-dim)]' : 'border-red-500/40 text-red-400 font-bold'}`}>
                {req.name}: {req.current}/{req.required}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-x-3 md:gap-x-6 gap-y-1.5">
          {Object.entries(totalCost).filter(([_, v]) => (v as number) > 0).map(([res, val]) => (
            <div key={res} className="flex flex-col">
              <span className="text-[5px] uppercase tracking-widest text-[var(--arrival-ink-dim)] mb-0.5 font-semibold">{res}</span>
              <span className={`text-[9px] md:text-[10px] font-mono ${resources[res] >= (val as number) ? 'text-[var(--arrival-ink)]' : 'text-red-500 font-semibold'}`}>{formatNumber(val as number)}</span>
            </div>
          ))}
          <div className="flex flex-col border-l border-[var(--arrival-border)] pl-3 md:pl-5">
            <span className="text-[5px] uppercase tracking-widest text-[var(--arrival-ink-dim)] mb-0.5 font-semibold">Time</span>
            <span className={`text-[9px] md:text-[10px] font-mono text-[var(--arrival-accent)]`}>{formatDuration(totalTime)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 w-full md:w-32 self-center relative z-10">
        {tab === 'shipyard' && !activeEvent && (
          <div className="flex items-center gap-1.5 bg-[var(--arrival-ink-dim)]/5 border border-[var(--arrival-border)] px-1.5 py-0.5">
            <span className="text-[5px] font-semibold text-[var(--arrival-ink-dim)] uppercase">#</span>
            <input 
              type="number" min="1" max="999" value={qty} 
              onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="bg-transparent text-[var(--arrival-ink)] font-mono text-center w-full focus:outline-none text-[8px]" 
            />
          </div>
        )}
        <button 
          disabled={!canAfford || !!activeEvent || isLocked || isQueueFull}
          onClick={() => onUpgrade(entity, level, totalCost as Resources, totalTime, qty)}
          className={`w-full py-1.5 md:py-2 text-[6px] font-semibold uppercase tracking-[0.3em] border transition-all duration-700 relative overflow-hidden ${activeEvent ? 'border-[var(--arrival-accent)] text-[var(--arrival-accent)] bg-[var(--arrival-accent)]/10 shadow-[0_0_15px_rgba(179,205,224,0.15)]' : isQueueFull ? 'border-red-500/20 text-[var(--arrival-ink-dim)]' : canAfford && !isLocked ? 'border-[var(--arrival-ink-dim)]/20 text-[var(--arrival-ink-dim)] hover:text-[var(--arrival-ink)] hover:bg-[var(--arrival-ink-dim)]/5 active:scale-95' : 'border-[var(--arrival-border)] text-[var(--arrival-ink-dim)]/30 cursor-not-allowed'}`}
        >
          {timeLeft !== null ? formatDuration(timeLeft) : isQueueFull ? 'Queue Full' : activeEvent ? 'Active' : isLocked ? 'Locked' : 'Deploy'}
          {activeEvent && (
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer-btn"></div>
          )}
        </button>
      </div>
    </div>
  );
};

const ProfileView = ({ user, onUpdate, onHardReset }: { user: UserState, onUpdate: (name: string, bio: string, nameChanged: boolean) => void, onHardReset: () => void }) => {
  const [name, setName] = useState(user.playerName);
  const [bio, setBio] = useState(user.bio);
  const [hasChangedName, setHasChangedName] = useState(false);

  const handleSave = () => {
    onUpdate(name, bio, hasChangedName);
    setHasChangedName(false);
  };

  const handleNameChange = (val: string) => {
    if (user.nameChangeAvailable) {
      setName(val);
      setHasChangedName(true);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-12 space-y-12 pb-40 arrival-fade px-4 sm:px-0 overflow-hidden w-full">
      <div className="flex flex-col items-center space-y-6">
        <div className="relative w-24 h-24 md:w-32 md:h-32 shrink-0">
          <div className="absolute inset-0 border border-[var(--arrival-accent)]/20 rounded-full animate-spin-slow"></div>
          <div className="absolute inset-2 border-2 border-[var(--arrival-accent)] rounded-full flex items-center justify-center overflow-hidden bg-[var(--arrival-bg)]">
            <span className="text-3xl md:text-5xl opacity-40">⌬</span>
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--arrival-accent)]/10 to-transparent"></div>
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 glass-card rounded-full flex items-center justify-center text-[8px] text-[var(--arrival-accent)]">ID</div>
        </div>
        <div className="text-center">
          <h2 className="text-sm md:text-xl font-orbitron font-extralight uppercase tracking-[0.4em] text-[var(--arrival-ink)]">System Identity</h2>
          <p className="text-[8px] text-[var(--arrival-ink-dim)] uppercase tracking-widest mt-1">Classification: Commander</p>
        </div>
      </div>

      <div className="space-y-8 w-full">
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <label className="text-[7px] uppercase tracking-[0.4em] text-[var(--arrival-ink-dim)] font-semibold">Designation</label>
            {!user.nameChangeAvailable && <span className="text-[6px] text-red-400/60 uppercase italic tracking-widest">Protocol Locked</span>}
          </div>
          <input 
            type="text" 
            value={name} 
            disabled={!user.nameChangeAvailable}
            onChange={(e) => handleNameChange(e.target.value)}
            className={`w-full bg-[var(--arrival-mist)] border ${!user.nameChangeAvailable ? 'border-[var(--arrival-border)]' : 'border-[var(--arrival-accent)]/30 focus:border-[var(--arrival-accent)]'} p-3 font-orbitron text-[10px] md:text-sm tracking-widest uppercase text-[var(--arrival-ink)] outline-none transition-all rounded-sm`}
            placeholder="Assign Name..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-[7px] uppercase tracking-[0.4em] text-[var(--arrival-ink-dim)] font-semibold">Biological / Cybernetic Summary</label>
          <textarea 
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full h-32 bg-[var(--arrival-mist)] border border-[var(--arrival-border)] p-3 font-mono text-[9px] text-[var(--arrival-ink-dim)] outline-none focus:border-[var(--arrival-accent)]/40 transition-all rounded-sm resize-none"
            placeholder="Initialize summary..."
          />
        </div>

        <button 
          onClick={handleSave}
          className="w-full py-3 bg-[var(--arrival-accent)]/5 border border-[var(--arrival-accent)]/20 text-[7px] font-orbitron uppercase tracking-[0.6em] text-[var(--arrival-ink)] hover:bg-[var(--arrival-accent)]/10 hover:border-[var(--arrival-accent)]/60 transition-all active:scale-95"
        >
          Commit Changes
        </button>
      </div>

      <div className="space-y-6 pt-12 border-t border-red-500/10">
         <h3 className="text-[9px] font-orbitron text-red-400 uppercase tracking-[0.4em]">Danger Zone: Database Management</h3>
         <p className="text-[9px] text-[var(--arrival-ink-dim)] leading-relaxed italic">
            Executing a Hard Reset will permanently purge all planetary records, research archives, and naval configurations from the local browser environment. This action is irreversible.
         </p>
         <button 
           onClick={onHardReset}
           className="w-full py-3 bg-red-500/5 border border-red-500/20 text-[7px] font-orbitron uppercase tracking-[0.6em] text-red-400 hover:bg-red-500/10 hover:border-red-500/60 transition-all"
         >
           Wipe Core Database
         </button>
      </div>
    </div>
  );
};

const LogsView = ({ reports, systemLogs, onClear, initialReportId }: { reports: CombatReport[], systemLogs: SystemLog[], onClear: () => void, initialReportId: string | null }) => {
  const [selectedReport, setSelectedReport] = useState<CombatReport | null>(null);

  useEffect(() => {
    if (initialReportId) {
      const r = reports.find(x => x.id === initialReportId);
      if (r) setSelectedReport(r);
    }
  }, [initialReportId, reports]);

  const renderCombatAnalytics = (r: CombatReport) => {
    const totalA = r.rounds.reduce((acc, rnd) => acc + rnd.attackerDamage, 0);
    const hullA = r.rounds.reduce((acc, rnd) => acc + rnd.attackerHullDamage, 0);
    const shieldA = r.rounds.reduce((acc, rnd) => acc + rnd.attackerShieldDamage, 0);
    const rfA = r.rounds.reduce((acc, rnd) => acc + rnd.attackerRapidFires, 0);

    return (
      <div className="space-y-8 bg-[var(--arrival-bg)] p-6 rounded-sm border-t border-[var(--arrival-accent)]/20">
        <div className="flex justify-between items-center border-b border-white/5 pb-4">
           <h3 className="text-xs font-orbitron uppercase tracking-widest text-[var(--arrival-accent)]">Engagement Outcome Analytics</h3>
           <button onClick={() => setSelectedReport(null)} className="text-[8px] opacity-40 hover:opacity-100">CLOSE ANALYTICS</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
           <div className="space-y-1">
              <span className="text-[6px] uppercase opacity-40">Gross Damage</span>
              <span className="block font-mono text-sm">{formatNumber(totalA)}</span>
           </div>
           <div className="space-y-1">
              <span className="text-[6px] uppercase opacity-40 text-emerald-400">Kinetic Impact</span>
              <span className="block font-mono text-sm text-emerald-400">{formatNumber(hullA)}</span>
           </div>
           <div className="space-y-1">
              <span className="text-[6px] uppercase opacity-40 text-blue-400">Shield Displacement</span>
              <span className="block font-mono text-sm text-blue-400">{formatNumber(shieldA)}</span>
           </div>
           <div className="space-y-1">
              <span className="text-[6px] uppercase opacity-40 text-[var(--arrival-accent)]">Tactical Successions</span>
              <span className="block font-mono text-sm text-[var(--arrival-accent)]">{formatNumber(rfA)} RF</span>
           </div>
        </div>
        
        <div className="p-4 bg-[var(--arrival-mist)] border border-[var(--arrival-border)] rounded-sm space-y-4">
           <div className="flex justify-between items-end border-b border-white/5 pb-2">
              <span className="text-[7px] uppercase tracking-widest text-emerald-400 font-bold">Logistics Analysis</span>
              <div className="flex gap-4">
                 <span className="text-[6px] uppercase opacity-40">Initial Cap: {formatNumber(r.initialCargoCapacity)}</span>
                 <span className="text-[6px] uppercase opacity-40">Surviving Cap: {formatNumber(r.survivingCargoCapacity)}</span>
              </div>
           </div>
           {r.loot && (r.loot.metal > 0 || r.loot.crystal > 0 || r.loot.deuterium > 0) ? (
             <div className="flex gap-6 text-[9px] font-mono">
                {r.loot.metal > 0 && <span className="text-blue-300">Metal: {formatNumber(r.loot.metal, true)}</span>}
                {r.loot.crystal > 0 && <span className="text-cyan-300">Crystal: {formatNumber(r.loot.crystal, true)}</span>}
                {r.loot.deuterium > 0 && <span className="text-purple-300">Deut: {formatNumber(r.loot.deuterium, true)}</span>}
             </div>
           ) : (
             <div className="text-[8px] font-mono opacity-20 uppercase tracking-widest">No resources retrieved</div>
           )}
        </div>
        
        <div className="space-y-4">
           <span className="text-[7px] uppercase tracking-widest opacity-20">Temporal Engagement Sequence</span>
           <div className="space-y-2">
              {r.rounds.map((rnd, i) => (
                <div key={i} className="flex items-center gap-4 text-[8px] font-mono opacity-60 hover:opacity-100 transition-opacity">
                   <span className="opacity-20">R{i+1}</span>
                   <div className="flex-1 h-[2px] bg-white/5 relative">
                      <div className="absolute top-0 left-0 h-full bg-blue-400" style={{ width: `${(rnd.attackerShieldDamage / (rnd.attackerDamage || 1)) * 100}%` }}></div>
                      <div className="absolute top-0 right-0 h-full bg-emerald-400 opacity-40" style={{ width: `${(rnd.attackerHullDamage / (rnd.attackerDamage || 1)) * 100}%` }}></div>
                   </div>
                   <span className="w-16 text-right">{formatNumber(rnd.attackerDamage)}</span>
                </div>
              ))}
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-12 pb-40 arrival-fade px-4 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-[var(--arrival-border)] pb-8 relative">
        <div className="space-y-1">
           <h2 className="text-xl md:text-3xl font-orbitron font-extralight uppercase tracking-[0.4em] text-[var(--arrival-ink)]">Central Command Log</h2>
           <p className="text-[8px] text-[var(--arrival-ink-dim)] uppercase tracking-widest">Archive Frequency: Stable | Latency: 2.4ms</p>
        </div>
        <button 
          onClick={onClear}
          className="absolute top-0 right-0 p-2 md:p-3 bg-[var(--arrival-ink-dim)]/5 hover:bg-red-500/10 text-[10px] text-[var(--arrival-ink-dim)] hover:text-red-400 transition-all rounded-sm border border-[var(--arrival-border)] flex items-center justify-center group"
          title="Clear Command Logs"
        >
          <span className="hidden md:inline mr-2 text-[6px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Flush Archive</span>
          🗑
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        <div className="lg:col-span-2 space-y-6">
           <h3 className="text-[10px] font-orbitron text-[var(--arrival-ink-dim)] uppercase tracking-[0.4em]">Sector Activity Stream</h3>
           <div className="space-y-3">
              {systemLogs.length === 0 ? (
                <div className="py-20 text-center opacity-10 italic text-[9px] uppercase tracking-widest">No active communications detected</div>
              ) : (
                systemLogs.map(log => (
                  <div key={log.id} className="bg-[var(--arrival-bg)] p-4 rounded-sm hover:bg-white/[0.02] transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                       <span className={`text-[6px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${log.type === 'CONSTRUCTION' ? 'bg-blue-400/10 text-blue-400' : log.type === 'RESEARCH' ? 'bg-purple-400/10 text-purple-400' : 'bg-emerald-400/10 text-emerald-400'}`}>
                          {log.type}
                       </span>
                       <span className="text-[8px] font-mono opacity-20">{new Date(log.time).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[10px] text-[var(--arrival-ink)] leading-relaxed">{log.message}</p>
                    {log.planetName && <span className="text-[7px] uppercase opacity-40 mt-2 block tracking-tighter">Loc: {log.planetName}</span>}
                  </div>
                ))
              )}
           </div>
        </div>

        <div className="space-y-6">
           <h3 className="text-[10px] font-orbitron text-[var(--arrival-ink-dim)] uppercase tracking-[0.4em]">Combat Archives</h3>
           <div className="space-y-3">
              {reports.length === 0 ? (
                <div className="py-20 text-center border-l-2 border-white/5 pl-6 opacity-10 italic text-[9px] uppercase tracking-widest">No hostile engagements recorded</div>
              ) : (
                reports.map(r => (
                  <div key={r.id} onClick={() => setSelectedReport(r)} className="p-4 bg-[var(--arrival-bg)] rounded-sm cursor-pointer hover:bg-white/[0.03] transition-all border-l-2 border-transparent hover:border-[var(--arrival-accent)] group">
                    <div className="flex justify-between items-center mb-1">
                       <span className={`text-[8px] font-bold uppercase ${r.winner === 'attacker' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {r.winner === 'attacker' ? 'Victory' : 'Defeat'}
                       </span>
                       <span className="text-[7px] font-mono opacity-20">{new Date(r.time).toLocaleDateString()}</span>
                    </div>
                    <div className="text-[9px] text-[var(--arrival-ink-dim)] group-hover:text-[var(--arrival-ink)] transition-colors">Target: {r.defenderPlanetName}</div>
                    <div className="mt-3 flex gap-4 text-[7px] uppercase opacity-40">
                       <span>{r.rounds.length} Rounds</span>
                       <span>{formatNumber(r.rounds.reduce((a, b) => a + b.attackerDamage, 0))} DMG</span>
                    </div>
                  </div>
                ))
              )}
           </div>
        </div>
      </div>

      {selectedReport && (
        <div className="fixed inset-0 z-[4000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setSelectedReport(null)}>
           <div className="w-full max-w-2xl overflow-y-auto max-h-[90vh] custom-scrollbar" onClick={e => e.stopPropagation()}>
              {renderCombatAnalytics(selectedReport)}
           </div>
        </div>
      )}
    </div>
  );
};

// Galaxy Browser: Unified Navigation & Engagement
const GalaxyView = ({ state, currentPlanet, onColonize, onStrike, onRecycle, onViewReport }: any) => {
  const [galaxy, setGalaxy] = useState(currentPlanet.coords.galaxy);
  const [system, setSystem] = useState(currentPlanet.coords.system);
  const [selectedSlot, setSelectedSlot] = useState<{slot: number, x: number, y: number} | null>(null);

  const systemPlanets = state.planets.filter(p => p.coords.galaxy === galaxy && p.coords.system === system);
  const colonyShipAvailable = (currentPlanet.ships.colony_ship || 0) > 0;
  const recyclerAvailable = (currentPlanet.ships.recycler || 0) > 0;
  const combatShipAvailable = Object.keys(currentPlanet.ships).some(sid => SHIPS[sid] && SHIPS[sid].stats.attack > 0 && currentPlanet.ships[sid] > 0);
  
  const maxColonies = Math.floor((state.research.astrophysics || 0) / 2) + 2;
  const canColonize = state.planets.length < maxColonies;

  const galaxyItems = useMemo(() => {
    if (!selectedSlot) return [];
    
    const p = systemPlanets.find(x => x.coords.slot === selectedSlot.slot);
    const debris = state.debrisFields[`${galaxy}:${system}:${selectedSlot.slot}`];
    
    const items = [];

    // Find latest combat report for this specific slot
    const lastReport = state.combatReports.find((r: CombatReport) => 
      r.targetCoords.galaxy === galaxy && 
      r.targetCoords.system === system && 
      r.targetCoords.slot === selectedSlot.slot
    );

    if (lastReport) {
      items.push({
        label: "Last Engagement",
        value: lastReport.winner === 'attacker' ? "VICTORY" : "DEFEAT",
        color: lastReport.winner === 'attacker' ? "text-emerald-400" : "text-red-400",
        sublabel: `${new Date(lastReport.time).toLocaleDateString()} | Intel Available`,
        onClick: () => onViewReport(lastReport.id)
      });
    }

    // Slot 16 logic
    if (selectedSlot.slot === 16) {
      items.push({ 
        label: "Strike", 
        value: "⚔", 
        color: combatShipAvailable ? "text-red-400" : "text-gray-600", 
        sublabel: combatShipAvailable ? "Bounty Potential: High" : "No Combat Ships", 
        onClick: combatShipAvailable ? () => onStrike(galaxy, system, 16) : undefined 
      });
    } else if (p) {
      const isSelf = p.ownerId === state.id;
      items.push({ 
        label: isSelf ? "Station" : "Strike", 
        value: isSelf ? "🛡" : "⚔", 
        color: isSelf ? "text-blue-300" : "text-red-400", 
        sublabel: isSelf ? "Orbital Support" : "Raid Target", 
        onClick: combatShipAvailable && !isSelf ? () => onStrike(galaxy, system, selectedSlot.slot) : undefined 
      });
    } else {
      items.push({ 
        label: "Colonize", 
        value: "🛰", 
        color: colonyShipAvailable && canColonize ? "text-emerald-400" : "text-gray-600", 
        sublabel: colonyShipAvailable ? (canColonize ? "Deploy Vessel" : "Cap Reached") : "No Colony Ship",
        onClick: colonyShipAvailable && canColonize ? () => onColonize(galaxy, system, selectedSlot.slot) : undefined 
      });
    }

    // Debris context menu logic
    if (debris) {
      items.push({
        label: "Initiate Extraction",
        value: "♻",
        color: recyclerAvailable ? "text-purple-400" : "text-gray-600",
        sublabel: `${formatNumber(debris.metal + debris.crystal)} potential | ${currentPlanet.ships.recycler || 0} Recyclers ready for mission`,
        onClick: recyclerAvailable ? () => onRecycle(galaxy, system, selectedSlot.slot) : undefined
      });
    }

    return items;
  }, [selectedSlot, systemPlanets, colonyShipAvailable, canColonize, combatShipAvailable, recyclerAvailable, state.id, state.debrisFields, state.combatReports, galaxy, system, onStrike, onColonize, onRecycle, onViewReport, currentPlanet.ships]);

  return (
    <div className="max-w-2xl mx-auto py-4 md:py-8 space-y-4 md:space-y-8 pb-40 arrival-fade px-2 md:px-0 w-full overflow-hidden">
      {selectedSlot && (
        <TacticalMenu 
          x={selectedSlot.x} y={selectedSlot.y} title={`S: ${galaxy}:${system}:${selectedSlot.slot}`}
          items={galaxyItems} onClose={() => setSelectedSlot(null)} footer="Disconnect"
        />
      )}
      <div className="flex items-center justify-between border-b border-[var(--arrival-border)] pb-3 md:pb-5">
        <div className="flex items-center gap-4 md:gap-10">
          <div className="flex flex-col"><span className="text-[5px] md:text-[7px] opacity-20 uppercase tracking-[0.4em] mb-0.5">Galaxy</span><span className="text-[12px] md:text-base font-orbitron font-light text-[var(--arrival-ink)]">{galaxy}</span></div>
          <div className="flex flex-col"><span className="text-[5px] md:text-[7px] opacity-20 uppercase tracking-[0.4em] mb-0.5">System</span><span className="text-[12px] md:text-base font-orbitron font-light">{system.toString().padStart(3, '0')}</span></div>
          <div className="flex flex-col"><span className="text-[5px] md:text-[7px] opacity-20 uppercase tracking-[0.4em] mb-0.5">Colony Cap</span><span className="text-[12px] md:text-base font-orbitron font-light text-[var(--arrival-accent)]">{state.planets.length} / {maxColonies}</span></div>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setGalaxy(g => Math.max(1, g - 1))} className="w-6 h-6 border border-[var(--arrival-border)] hover:bg-[var(--arrival-ink-dim)]/5 rounded-full flex items-center justify-center text-[var(--arrival-ink-dim)] transition-colors text-[8px]">▲</button>
          <button onClick={() => setGalaxy(g => g + 1)} className="w-6 h-6 border border-[var(--arrival-border)] hover:bg-[var(--arrival-ink-dim)]/5 rounded-full flex items-center justify-center text-[var(--arrival-ink-dim)] transition-colors text-[8px]">▼</button>
          <button onClick={() => setSystem(s => Math.max(1, s - 1))} className="w-6 h-6 border border-[var(--arrival-border)] hover:bg-[var(--arrival-ink-dim)]/5 rounded-full flex items-center justify-center text-[var(--arrival-ink-dim)] transition-colors text-[8px]">◀</button>
          <button onClick={() => setSystem(s => s + 1)} className="w-6 h-6 border border-[var(--arrival-border)] hover:bg-[var(--arrival-ink-dim)]/5 rounded-full flex items-center justify-center text-[var(--arrival-ink-dim)] transition-colors text-[8px]">▶</button>
        </div>
      </div>
      <div className="grid gap-px bg-[var(--arrival-border)] border border-[var(--arrival-border)] w-full overflow-hidden rounded-sm">
        {Array.from({ length: 16 }, (_, i) => i + 1).map(slot => {
          const p = systemPlanets.find(x => x.coords.slot === slot);
          const debris = state.debrisFields[`${galaxy}:${system}:${slot}`];
          const isBandit = slot === 16;
          const hasMoon = p?.moon;

          return (
            <div key={slot} onClick={(e) => setSelectedSlot({slot, x: e.clientX, y: e.clientY})} className="p-2 md:p-4 bg-[var(--arrival-bg)] hover:bg-[var(--arrival-ink-dim)]/5 flex items-center justify-between group transition-all cursor-pointer w-full">
              <span className="font-mono text-[6px] md:text-[8px] opacity-10 group-hover:opacity-30 shrink-0">{slot.toString().padStart(2, '0')}</span>
              <div className="flex-1 px-4 truncate flex items-center gap-3">
                <span className={`text-[8px] md:text-[10px] font-orbitron tracking-widest uppercase font-light truncate ${isBandit ? 'text-red-400' : (p ? 'text-[var(--arrival-ink-dim)] group-hover:text-[var(--arrival-ink)]' : 'text-gray-800')}`}>
                  {isBandit ? "Bandit Outpost" : (p ? p.name : "Deep Void")}
                </span>
                {hasMoon && (
                  <span className="text-[8px] animate-pulse" title="Moon Presence">🌙</span>
                )}
                {debris && (
                  <div className="flex items-center gap-1.5 arrival-fade">
                    <span className="w-1 h-1 bg-purple-400/60 rounded-full animate-pulse"></span>
                    <span className="text-[5px] uppercase font-bold text-purple-400/40">Debris</span>
                  </div>
                )}
              </div>
              <span className={`text-[5px] font-mono uppercase tracking-tighter shrink-0 ${isBandit ? 'text-red-500 opacity-60' : 'opacity-5 group-hover:opacity-10'}`}>
                {isBandit ? 'Hostile' : (p ? (p.ownerId === state.id ? 'Self' : 'Occupied') : 'Empty')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const FleetOverview = ({ planet }: { planet: PlanetState }) => {
  const stats = useMemo(() => {
    let totalAttack = 0;
    let totalShield = 0;
    let totalHull = 0;
    let totalCargo = 0;
    let shipCount = 0;
    let defenseCount = 0;
    let totalMetalValue = 0;
    let totalCrystalValue = 0;
    let totalDeutValue = 0;
    let weightedSpeedSum = 0;
    
    Object.entries(planet.ships).forEach(([id, count]) => {
      const ship = SHIPS[id];
      const n = count as number;
      if (ship && n > 0) {
        totalAttack += n * ship.stats.attack;
        totalShield += n * ship.stats.shield;
        totalHull += n * ship.stats.hull;
        totalCargo += n * (ship.stats.cargo || 0);
        shipCount += n;
        totalMetalValue += n * (ship.baseCost.metal || 0);
        totalCrystalValue += n * (ship.baseCost.crystal || 0);
        totalDeutValue += n * (ship.baseCost.deuterium || 0);
        weightedSpeedSum += n * (ship.stats.speed || 0);
      }
    });

    Object.entries(planet.defense).forEach(([id, count]) => {
      const def = DEFENSE[id];
      const n = count as number;
      if (def && n > 0) {
        totalAttack += n * def.stats.attack;
        totalShield += n * def.stats.shield;
        totalHull += n * def.stats.hull;
        defenseCount += n;
        totalMetalValue += n * (def.baseCost.metal || 0);
        totalCrystalValue += n * (def.baseCost.crystal || 0);
        totalDeutValue += n * (def.baseCost.deuterium || 0);
      }
    });

    const averageMobility = shipCount > 0 ? weightedSpeedSum / shipCount : 0;
    const efficiencyFactor = totalHull > 0 ? (totalAttack + totalShield) / totalHull : 0;

    return { 
      totalAttack, totalShield, totalHull, totalCargo, 
      shipCount, defenseCount, 
      totalMetalValue, totalCrystalValue, totalDeutValue,
      averageMobility, efficiencyFactor
    };
  }, [planet]);

  const shipList = Object.entries(planet.ships).filter(([_, count]) => (count as number) > 0);
  const defenseList = Object.entries(planet.defense).filter(([_, count]) => (count as number) > 0);

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-40 arrival-fade px-2 md:px-0 w-full overflow-hidden">
      <div className="pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-[var(--arrival-accent)] animate-pulse shadow-[0_0_8px_var(--arrival-accent)] shrink-0"></div>
             <h2 className="text-sm md:text-2xl font-orbitron font-extralight uppercase tracking-[0.5em] text-[var(--arrival-ink)]">Fleet Command Output</h2>
          </div>
          <span className="text-[7px] font-mono opacity-20 uppercase tracking-[0.2em] block">Status: Sector Fortified | Signal: Stable</span>
        </div>
        <div className="text-left md:text-right flex flex-col items-start md:items-end">
          <span className="text-[10px] md:text-sm font-orbitron text-[var(--arrival-accent)] tracking-widest uppercase shrink-0">{stats.shipCount + stats.defenseCount} Combat Elements</span>
          <div className="flex gap-2 mt-1">
             <span className="text-[6px] font-mono text-emerald-400 uppercase tracking-tighter shrink-0">Efficiency: {stats.efficiencyFactor.toFixed(2)}x</span>
             <span className="text-[6px] font-mono opacity-20 uppercase tracking-tighter shrink-0">OS: Protocol 11.4</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 w-full">
        <div className="bg-[var(--arrival-bg)] p-4 md:p-6 space-y-1 relative group rounded-sm">
          <span className="text-[7px] uppercase tracking-[0.4em] text-red-400 font-semibold block">Strike Magnitude</span>
          <span className="text-sm md:text-2xl font-orbitron font-light text-[var(--arrival-ink)]">{formatNumber(stats.totalAttack)}</span>
          <div className="w-full h-[1px] bg-red-400/10 mt-2 rounded-full overflow-hidden"><div className="h-full bg-red-400 w-full animate-pulse-fast"></div></div>
        </div>
        <div className="bg-[var(--arrival-bg)] p-4 md:p-6 space-y-1 group rounded-sm">
          <span className="text-[7px] uppercase tracking-[0.4em] text-[var(--arrival-accent)] font-semibold block">Shield Density</span>
          <span className="text-sm md:text-2xl font-orbitron font-light text-[var(--arrival-ink)]">{formatNumber(stats.totalShield)}</span>
          <div className="w-full h-[1px] bg-[var(--arrival-accent)]/10 mt-2 rounded-full overflow-hidden"><div className="h-full bg-[var(--arrival-accent)] w-full opacity-60"></div></div>
        </div>
        <div className="bg-[var(--arrival-bg)] p-4 md:p-6 space-y-1 group rounded-sm">
          <span className="text-[7px] uppercase tracking-[0.4em] text-emerald-400 font-semibold block">Logistics Cap</span>
          <span className="text-sm md:text-2xl font-orbitron font-light text-[var(--arrival-ink)]">{formatNumber(stats.totalCargo)}</span>
          <div className="w-full h-[1px] bg-emerald-400/10 mt-2 rounded-full overflow-hidden"><div className="h-full bg-emerald-400 w-full opacity-40"></div></div>
        </div>
        <div className="bg-[var(--arrival-bg)] p-4 md:p-6 space-y-1 group rounded-sm">
          <span className="text-[7px] uppercase tracking-[0.4em] text-purple-400 font-semibold block">Net Mass</span>
          <span className="text-sm md:text-2xl font-orbitron font-light text-[var(--arrival-ink)]">{formatNumber(stats.totalHull)}</span>
          <div className="w-full h-[1px] bg-purple-400/10 mt-2 rounded-full overflow-hidden"><div className="h-full bg-purple-400 w-full opacity-40"></div></div>
        </div>
        <div className="bg-[var(--arrival-bg)] p-4 md:p-6 space-y-1 group max-lg:hidden rounded-sm">
          <span className="text-[7px] uppercase tracking-[0.4em] text-yellow-500 font-semibold block">Mobility Index</span>
          <span className="text-sm md:text-2xl font-orbitron font-light text-[var(--arrival-ink)]">{formatNumber(stats.averageMobility)}</span>
          <div className="w-full h-[1px] bg-yellow-500/10 mt-2 rounded-full overflow-hidden"><div className="h-full bg-yellow-500 w-full opacity-30"></div></div>
        </div>
      </div>

      <div className="bg-[var(--arrival-bg)] p-6 rounded-sm flex flex-col md:flex-row gap-8 items-center w-full overflow-hidden">
        <div className="flex-1 space-y-4 w-full">
          <h3 className="text-[8px] font-orbitron text-[var(--arrival-ink-dim)] uppercase tracking-[0.4em]">Capital Valuation Matrix</h3>
          <div className="grid grid-cols-3 gap-4 md:gap-8">
            <div className="flex flex-col min-w-0">
              <span className="text-[6px] uppercase tracking-widest text-blue-400/60 font-semibold truncate">Metal</span>
              <span className="text-xs md:text-lg font-mono font-light truncate">{formatNumber(stats.totalMetalValue)}</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[6px] uppercase tracking-widest text-cyan-400/60 font-semibold truncate">Crystal</span>
              <span className="text-xs md:text-lg font-mono font-light truncate">{formatNumber(stats.totalCrystalValue)}</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[6px] uppercase tracking-widest text-purple-400/60 font-semibold truncate">Deut</span>
              <span className="text-xs md:text-lg font-mono font-light truncate">{formatNumber(stats.totalDeutValue)}</span>
            </div>
          </div>
        </div>
        <div className="shrink-0 w-full md:w-auto md:text-right flex flex-col items-start md:items-end justify-center px-0 md:px-6 pt-4 md:pt-0">
          <span className="text-[7px] uppercase tracking-[0.6em] text-[var(--arrival-ink-dim)] mb-1 shrink-0">Total Net Worth</span>
          <span className="text-lg md:text-3xl font-orbitron font-extralight text-[var(--arrival-ink)] tracking-tighter truncate">{formatNumber(stats.totalMetalValue + stats.totalCrystalValue + stats.totalDeutValue)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full overflow-hidden">
        <div className="bg-[var(--arrival-bg)] p-4 md:p-8 space-y-8 min-w-0 rounded-sm">
          <div className="flex items-center justify-between pb-3">
            <span className="text-[9px] md:text-[14px] font-orbitron text-[var(--arrival-ink)] uppercase tracking-[0.3em] truncate">Vessel Array</span>
            <div className="flex items-baseline gap-2 shrink-0">
               <span className="text-[10px] font-mono text-[var(--arrival-accent)]">{stats.shipCount}</span>
               <span className="text-[6px] text-[var(--arrival-ink-dim)] uppercase tracking-widest hidden sm:inline">Active</span>
            </div>
          </div>
          <div className="space-y-4 w-full">
            {shipList.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center gap-4 opacity-20 italic">
                <span className="text-[7px] uppercase tracking-[0.4em]">Signal Null: No Vessels</span>
              </div>
            ) : (
              shipList.map(([id, count]) => {
                const ship = SHIPS[id];
                const n = count as number;
                return (
                  <div key={id} className="bg-[var(--arrival-ink-dim)]/5 p-4 rounded-sm flex flex-col sm:flex-row items-start justify-between group hover:bg-[var(--arrival-ink-dim)]/10 transition-all overflow-hidden w-full gap-4 sm:gap-2">
                    <div className="flex flex-col flex-1 min-w-0 w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] md:text-[10px] font-orbitron text-[var(--arrival-ink)] uppercase tracking-widest truncate">{ship.name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 w-full">
                         <div className="flex flex-col min-w-0"><span className="text-[5px] uppercase opacity-40 truncate">Offensive</span><span className="text-[8px] font-mono text-red-400/80 truncate">{formatNumber(ship.stats.attack)}</span></div>
                         <div className="flex flex-col min-w-0"><span className="text-[5px] uppercase opacity-40 truncate">Shield</span><span className="text-[8px] font-mono text-blue-400/80 truncate">{formatNumber(ship.stats.shield)}</span></div>
                         <div className="flex flex-col min-w-0"><span className="text-[5px] uppercase opacity-40 truncate">Hull</span><span className="text-[8px] font-mono text-emerald-400/80 truncate">{formatNumber(ship.stats.hull)}</span></div>
                         <div className="flex flex-col min-w-0"><span className="text-[5px] uppercase opacity-40 truncate">Cargo</span><span className="text-[8px] font-mono text-[var(--arrival-ink-dim)] truncate">{formatNumber(ship.stats.cargo || 0)}</span></div>
                      </div>
                    </div>
                    <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center sm:pl-4 w-full sm:w-auto pt-2 sm:pt-0">
                      <span className="sm:hidden text-[5px] uppercase opacity-20 font-bold">READY UNITS:</span>
                      <span className="text-sm md:text-2xl font-mono text-[var(--arrival-accent)] font-light leading-none tracking-tighter">{formatNumber(n)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-[var(--arrival-bg)] p-4 md:p-8 space-y-8 min-w-0 rounded-sm">
          <div className="flex items-center justify-between pb-3">
            <span className="text-[9px] md:text-[14px] font-orbitron text-[var(--arrival-ink)] uppercase tracking-[0.3em] truncate">Defense Array</span>
            <div className="flex items-baseline gap-2 shrink-0">
               <span className="text-[10px] font-mono text-red-400">{stats.defenseCount}</span>
               <span className="text-[6px] text-[var(--arrival-ink-dim)] uppercase tracking-widest hidden sm:inline">Static</span>
            </div>
          </div>
          <div className="space-y-4 w-full">
            {defenseList.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center gap-4 opacity-20 italic">
                <span className="text-[7px] uppercase tracking-[0.4em]">Surface Exposed</span>
              </div>
            ) : (
              defenseList.map(([id, count]) => {
                const def = DEFENSE[id];
                const n = count as number;
                return (
                  <div key={id} className="bg-[var(--arrival-ink-dim)]/5 p-4 rounded-sm flex flex-col sm:flex-row items-start justify-between group hover:bg-[var(--arrival-ink-dim)]/10 transition-all overflow-hidden w-full gap-4 sm:gap-2">
                    <div className="flex flex-col flex-1 min-w-0 w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] md:text-[10px] font-orbitron text-[var(--arrival-ink)] uppercase tracking-widest truncate">{def.name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 w-full">
                         <div className="flex flex-col min-w-0"><span className="text-[5px] uppercase opacity-40 truncate">Strike</span><span className="text-[8px] font-mono text-red-400/80 truncate">{formatNumber(def.stats.attack)}</span></div>
                         <div className="flex flex-col min-w-0"><span className="text-[5px] uppercase opacity-40 truncate">Shield</span><span className="text-[8px] font-mono text-blue-400/80 truncate">{formatNumber(def.stats.shield)}</span></div>
                         <div className="flex flex-col min-w-0"><span className="text-[5px] uppercase opacity-40 truncate">Armor</span><span className="text-[8px] font-mono text-emerald-400/80 truncate">{formatNumber(def.stats.hull)}</span></div>
                      </div>
                    </div>
                    <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center sm:pl-4 w-full sm:w-auto pt-2 sm:pt-0">
                      <span className="sm:hidden text-[5px] uppercase opacity-20 font-bold">FORTIFIED:</span>
                      <span className="text-sm md:text-2xl font-mono text-red-400 font-light leading-none tracking-tighter">{formatNumber(n)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const { state, startEvent, launchMission, deductResources, currentPlanet, updateProfile, markLogsRead, clearLogs, setPlanet, hardReset, lastSync } = useGameState();
  const [activeTab, setActiveTab] = useState('home');
  const [theme, setTheme] = useState('dark');
  const [selectedResDetail, setSelectedResDetail] = useState<{name: string, stats: any} | null>(null);
  const [targetedReportId, setTargetedReportId] = useState<string | null>(null);
  
  // New Player Boost logic
  const [boostRemaining, setBoostRemaining] = useState(0);
  const isBoostActive = boostRemaining > 0;

  useEffect(() => {
    const timer = setInterval(() => {
      const rem = Math.max(0, Math.floor((state.boostEndTime - Date.now()) / 1000));
      setBoostRemaining(rem);
    }, 1000);
    return () => clearInterval(timer);
  }, [state.boostEndTime]);

  // Planet Selector State
  const [showPlanetSelector, setShowPlanetSelector] = useState(false);
  const [selectorAnchor, setSelectorAnchor] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }, [theme]);

  // Handle Mark Logs as Read
  useEffect(() => {
    if (activeTab === 'logs') {
      markLogsRead();
    }
  }, [activeTab, state.systemLogs.length, state.combatReports.length, markLogsRead]);

  const unreadCount = useMemo(() => {
    const systemUnread = state.systemLogs.filter(l => l.time > state.lastLogsSeenTimestamp).length;
    const combatUnread = state.combatReports.filter(r => r.time > state.lastLogsSeenTimestamp).length;
    return systemUnread + combatUnread;
  }, [state.systemLogs, state.combatReports, state.lastLogsSeenTimestamp]);

  const ratesData = getProductionRates(currentPlanet.buildings, currentPlanet.ships, currentPlanet.maxTemp, currentPlanet.coords.slot);
  const { efficiency, energyProduction, energyConsumption, ...rates } = ratesData;
  const netEnergy = energyProduction - energyConsumption;
  
  const storageCaps = { 
    metal: calculateCapacity(currentPlanet.buildings.metal_storage || 0), 
    crystal: calculateCapacity(currentPlanet.buildings.crystal_storage || 0), 
    deuterium: calculateCapacity(currentPlanet.buildings.deut_tank || 0) 
  };
  
  const protectionLevels = {
    metal: calculateProtection(currentPlanet.buildings.metal_storage || 0),
    crystal: calculateProtection(currentPlanet.buildings.crystal_storage || 0),
    deuterium: calculateProtection(currentPlanet.buildings.deut_tank || 0)
  };

  const handleUpgrade = (entity: any, level: number, cost: Resources, duration: number, count: number = 1) => {
    deductResources(cost);
    startEvent({ 
      type: activeTab === 'research' ? 'RESEARCH' : activeTab === 'shipyard' ? 'SHIPYARD' : 'BUILDING', 
      targetId: entity.id, 
      finishTime: Date.now() + duration * 1000,
      count: count
    });
  };

  const handleColonize = (g: number, s: number, sl: number) => {
    launchMission({
      type: 'COLONIZE',
      originPlanetId: currentPlanet.id,
      targetCoords: { galaxy: g, system: s, slot: sl },
      ships: { colony_ship: 1 },
      resources: { metal: 0, crystal: 0, deuterium: 0, energy: 0 }
    });
  };

  const handleStrike = (g: number, s: number, sl: number) => {
     const ships: Record<string, number> = {};
     Object.entries(currentPlanet.ships).forEach(([sid, count]) => {
        const n = count as number;
        if (SHIPS[sid] && SHIPS[sid].stats.attack > 0 && n > 0) {
           ships[sid] = n;
        }
     });

     launchMission({
        type: 'ATTACK',
        originPlanetId: currentPlanet.id,
        targetCoords: { galaxy: g, system: s, slot: sl },
        ships: ships,
        resources: { metal: 0, crystal: 0, deuterium: 0, energy: 0 }
     });
  };

  const handleRecycle = (g: number, s: number, sl: number) => {
    const ships: Record<string, number> = {};
    if (currentPlanet.ships.recycler && currentPlanet.ships.recycler > 0) {
      ships.recycler = currentPlanet.ships.recycler;
    }

    launchMission({
      type: 'RECYCLE',
      originPlanetId: currentPlanet.id,
      targetCoords: { galaxy: g, system: s, slot: sl },
      ships: ships,
      resources: { metal: 0, crystal: 0, deuterium: 0, energy: 0 }
    });
  };

  const onViewReportFromGalaxy = (id: string) => {
    setTargetedReportId(id);
    setActiveTab('logs');
  };

  const infrastructureGroups = useMemo(() => {
    const categories = [
      {
        id: 'primary',
        label: 'Production & Energy',
        ids: ['metal_mine', 'crystal_mine', 'solar_plant', 'deut_synthesizer', 'fusion_reactor']
      },
      {
        id: 'logistics',
        label: 'Imperial Storage',
        ids: ['metal_storage', 'crystal_storage', 'deut_tank']
      },
      {
        id: 'fabrication',
        label: 'Industrial Hub',
        ids: ['research_lab', 'robotics_factory', 'shipyard']
      },
      {
        id: 'advanced',
        label: 'Strategic Expansion',
        ids: ['nanite_factory', 'missile_silo', 'space_dock', 'terraformer']
      }
    ];

    return categories.map(cat => ({
      ...cat,
      entities: cat.ids.map(id => BUILDINGS[id]).filter(Boolean)
    }));
  }, []);

  const researchGroups = useMemo(() => {
    const categories = [
      {
        id: 'core',
        label: 'Fundamental Sciences',
        ids: ['energy_tech', 'computer_tech', 'espionage_tech']
      },
      {
        id: 'propulsion',
        label: 'Advanced Propulsion',
        ids: ['combustion_drive', 'impulse_drive', 'hyperspace_drive']
      },
      {
        id: 'combat',
        label: 'Combat & Shielding Theory',
        ids: ['laser_tech', 'armor_tech', 'weapon_tech', 'ion_tech', 'shield_tech', 'plasma_tech']
      },
      {
        id: 'imperial',
        label: 'Expansion Protocol',
        ids: ['astrophysics', 'hyperspace_tech', 'intergalactic_net', 'graviton_tech']
      }
    ];

    return categories.map(cat => ({
      ...cat,
      entities: cat.ids.map(id => RESEARCH[id]).filter(Boolean)
    }));
  }, []);

  const shipyardGroups = useMemo(() => {
    const categories = [
      {
        id: 'logistics',
        label: 'Logistics & Orbital Support',
        ids: ['solar_satellite', 'espionage_probe', 'small_cargo', 'large_cargo', 'recycler']
      },
      {
        id: 'strike',
        label: 'Tactical Strike Elements',
        ids: ['light_fighter', 'heavy_fighter', 'cruiser']
      },
      {
        id: 'capital',
        label: 'Capital Class Vessels',
        ids: ['battleship', 'battlecruiser', 'bomber', 'destroyer', 'deathstar']
      },
      {
        id: 'special',
        label: 'Specialized Operations',
        ids: ['colony_ship', 'pathfinder']
      },
      {
        id: 'defense',
        label: 'Planetary Defense Grid',
        ids: ['rocket_launcher', 'light_laser', 'plasma_turret']
      }
    ];

    return categories.map(cat => ({
      ...cat,
      entities: cat.ids.map(id => SHIPS[id] || DEFENSE[id]).filter(Boolean)
    }));
  }, []);

  const planetSelectorItems = useMemo(() => {
    const items: any[] = [];
    state.planets.forEach(p => {
      const isCurrent = p.id === currentPlanet.id;
      items.push({
        label: p.name.toUpperCase(),
        value: `${p.coords.galaxy}:${p.coords.system}:${p.coords.slot}`,
        sublabel: isCurrent ? 'Active Location' : 'Orbital Link Ready',
        color: isCurrent ? 'text-[var(--arrival-accent)] font-bold' : 'text-[var(--arrival-ink-dim)]',
        onClick: isCurrent ? undefined : () => setPlanet(p.id)
      });
      
      if (p.moon) {
        items.push({
          label: `🌙 ${p.name.toUpperCase()} MOON`,
          value: 'Linked',
          sublabel: 'Planetary Satellite',
          color: 'text-indigo-300 opacity-60',
          onClick: () => {
            setPlanet(p.id);
          }
        });
      }
    });
    return items;
  }, [state.planets, currentPlanet.id, setPlanet]);

  return (
    <div className="h-screen flex flex-col font-sans relative overflow-hidden bg-[var(--arrival-bg)] text-[var(--arrival-ink)] font-light transition-colors duration-1000">
      <Header 
        playerName={state.playerName} 
        theme={theme} 
        unreadCount={unreadCount}
        lastSync={lastSync}
        onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} 
        onLogsClick={() => setActiveTab('logs')} 
        onFaqClick={() => setActiveTab('faq')} 
        onProfileClick={() => setActiveTab('profile')}
      />

      {showPlanetSelector && (
        <TacticalMenu 
          x={selectorAnchor.x} 
          y={selectorAnchor.y} 
          title="Sector Directory" 
          subtitle="Imperial Planetary Access"
          items={planetSelectorItems} 
          onClose={() => setShowPlanetSelector(false)} 
          footer="Disconnect Link"
        />
      )}

      <div className="px-4 md:px-12 py-1.5 md:py-2 flex flex-row items-center justify-around md:justify-center gap-2 md:gap-8 bg-[var(--arrival-mist)] border-b border-[var(--arrival-border)] relative z-50">
        <LogogramMeter 
          label="Metal" 
          value={currentPlanet.resources.metal} 
          capacity={storageCaps.metal} 
          protectedAmount={protectionLevels.metal} 
          rate={rates.metal * (isBoostActive ? 15 : 1)} 
          onClick={() => setSelectedResDetail({ name: 'METAL', stats: { rate: rates.metal * (isBoostActive ? 15 : 1), capacity: storageCaps.metal, protectedAmount: protectionLevels.metal, currentValue: currentPlanet.resources.metal } })}
        />
        <LogogramMeter 
          label="Crystal" 
          value={currentPlanet.resources.crystal} 
          capacity={storageCaps.crystal} 
          protectedAmount={protectionLevels.crystal} 
          rate={rates.crystal * (isBoostActive ? 15 : 1)} 
          color="#90e0ef" 
          onClick={() => setSelectedResDetail({ name: 'CRYSTAL', stats: { rate: rates.crystal * (isBoostActive ? 15 : 1), capacity: storageCaps.crystal, protectedAmount: protectionLevels.crystal, currentValue: currentPlanet.resources.crystal } })}
        />
        <LogogramMeter 
          label="Deut" 
          value={currentPlanet.resources.deuterium} 
          capacity={storageCaps.deuterium} 
          protectedAmount={protectionLevels.deuterium} 
          rate={rates.deuterium * (isBoostActive ? 15 : 1)} 
          color="#b79ced" 
          onClick={() => setSelectedResDetail({ name: 'DEUTERIUM', stats: { rate: rates.deuterium * (isBoostActive ? 15 : 1), capacity: storageCaps.deuterium, protectedAmount: protectionLevels.deuterium, currentValue: currentPlanet.resources.deuterium } })}
        />
        <LogogramMeter 
          label="Power" 
          value={netEnergy} 
          capacity={energyProduction} 
          protectedAmount={0} 
          isWarning={efficiency < 1} 
          color={efficiency < 1 ? '#f87171' : 'var(--arrival-accent)'} 
          onClick={() => setSelectedResDetail({ name: 'POWER', stats: { rate: energyProduction, capacity: energyProduction, protectedAmount: 0, currentValue: netEnergy } })}
        />
      </div>

      {selectedResDetail && (
        <ResourceDetailModal 
          resource={selectedResDetail.name} 
          stats={selectedResDetail.stats} 
          onClose={() => setSelectedResDetail(null)} 
        />
      )}

      <main className="flex-1 overflow-y-auto p-3 md:p-12 relative z-10 custom-scrollbar overflow-x-hidden">
        {activeTab === 'home' && (
          <div className="max-w-2xl mx-auto flex flex-col items-center space-y-8 md:space-y-12 pb-40 w-full overflow-hidden px-2 relative">
            
            {isBoostActive && (
              <div className="absolute top-0 right-0 p-3 glass-card border-r-2 border-r-[var(--arrival-accent)] arrival-fade z-20 shadow-[0_0_20px_rgba(179,205,224,0.1)]">
                <div className="text-[6px] uppercase tracking-widest text-[var(--arrival-accent)] font-bold mb-1">Temporal Acceleration (15x)</div>
                <div className="text-[10px] font-orbitron text-[var(--arrival-ink)] tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--arrival-accent)] animate-pulse shrink-0"></span>
                  {formatDuration(boostRemaining)}
                </div>
              </div>
            )}

            <div className="relative flex items-center justify-center w-40 h-40 md:w-64 md:h-64 arrival-fade">
              <div className="absolute inset-0 border border-[var(--arrival-accent)]/10 rounded-full animate-[spin_80s_linear_infinite]"></div>
              <div className="absolute inset-4 border border-[var(--arrival-border)] rounded-full animate-[spin_40s_linear_reverse_infinite]"></div>
              <div className="absolute inset-8 border border-[var(--arrival-accent)]/5 rounded-full border-dashed animate-[spin_120s_linear_infinite]"></div>
              
              <div className="absolute inset-0 flex items-center justify-center animate-[spin_15s_linear_infinite]">
                <div className="h-full w-[1px] bg-gradient-to-t from-transparent via-[var(--arrival-accent)]/20 to-transparent"></div>
              </div>
              
              <div className="relative w-2/5 h-2/5 rounded-full glass-card border-none shadow-[var(--arrival-glow)] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[var(--arrival-accent)]/5 to-transparent animate-pulse"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--arrival-accent)] animate-pulse shadow-[0_0_15px_var(--arrival-accent)] z-10"></div>
              </div>
            </div>

            <div className="text-center space-y-4 md:space-y-6 w-full">
              <div className="flex flex-col items-center gap-2 group">
                <span className="text-[6px] md:text-[8px] uppercase tracking-[0.6em] text-[var(--arrival-accent)] opacity-40 group-hover:opacity-100 transition-opacity">Active Sector Location</span>
                <h2 
                  onClick={(e) => {
                    setSelectorAnchor({ x: e.clientX, y: e.clientY });
                    setShowPlanetSelector(true);
                  }}
                  className="text-base md:text-4xl font-orbitron font-extralight text-[var(--arrival-ink)] hover:text-[var(--arrival-accent)] cursor-pointer tracking-[0.4em] arrival-fade truncate px-4 transition-all duration-500"
                >
                  {currentPlanet.name.toUpperCase()}
                  {currentPlanet.moon && <span className="ml-2 text-xs md:text-lg">🌙</span>}
                  <span className="ml-2 text-[10px] md:text-[14px] opacity-0 group-hover:opacity-40 transition-opacity inline-block align-middle">▾</span>
                </h2>
              </div>
              
              <div className="flex gap-6 md:gap-12 justify-center flex-wrap">
                 <div className="text-center"><span className="text-[5px] md:text-[7px] uppercase opacity-20 block mb-1 tracking-[0.4em]">Total Points</span><span className="text-[10px] md:text-base font-orbitron font-light text-[var(--arrival-accent)]">{formatNumber(calculateTotalPoints(currentPlanet, state.research))}</span></div>
                 <div className="text-center"><span className="text-[5px] md:text-[7px] uppercase opacity-20 block mb-1 tracking-[0.4em]">Coordinates</span><span className="text-[10px] md:text-base font-orbitron font-light">{currentPlanet.coords.galaxy}:{currentPlanet.coords.system}:{currentPlanet.coords.slot}</span></div>
              </div>
            </div>

            <div className="w-full space-y-3 md:space-y-5 arrival-fade">
               <div className="flex justify-between items-center border-b border-[var(--arrival-border)] pb-1.5">
                  <span className="text-[6px] md:text-[8px] font-orbitron uppercase tracking-[0.6em] text-[var(--arrival-ink-dim)]">Operational Manifest</span>
               </div>
               <div className="grid gap-1 md:gap-2 w-full">
                  {state.events.filter(e => e.planetId === currentPlanet.id || e.type === 'RESEARCH').length === 0 && state.fleetMissions.length === 0 ? (
                    <div className="py-8 md:py-12 text-center glass-card rounded-sm opacity-20 italic uppercase tracking-[0.4em] text-[6px] md:text-[8px]">Signal Null: No Active Tasks</div>
                  ) : (
                    <>
                      {state.events.filter(e => e.planetId === currentPlanet.id || e.type === 'RESEARCH').map(e => {
                        const entity = BUILDINGS[e.targetId] || RESEARCH[e.targetId] || SHIPS[e.targetId] || DEFENSE[e.targetId];
                        const rem = Math.max(0, Math.floor((e.finishTime - Date.now()) / 1000));
                        const total = Math.max(1, Math.floor((e.finishTime - e.startTime) / 1000));
                        return (
                          <div key={e.id} className="glass-card p-2 md:p-3.5 rounded-sm flex items-center justify-between overflow-hidden relative group w-full">
                             <div className="absolute top-0 left-0 bottom-0 bg-[var(--arrival-ink-dim)]/5" style={{ width: `${(1 - rem/total)*100}%` }}></div>
                             <div className="relative z-10 flex flex-col min-w-0">
                               <span className="text-[8px] md:text-[10px] font-orbitron font-light uppercase tracking-widest text-[var(--arrival-ink)] truncate">{entity?.name} {e.count && e.count > 1 ? `x${e.count}` : ''}</span>
                             </div>
                             <div className="relative z-10 font-mono text-[var(--arrival-accent)] text-[8px] flex items-center gap-2 md:gap-4 shrink-0">
                               <span>{formatDuration(rem)}</span>
                             </div>
                          </div>
                        );
                      })}
                      {state.fleetMissions.map(m => {
                        const rem = Math.max(0, Math.floor(((m.isReturning ? m.returnTime! : m.arrivalTime) - Date.now()) / 1000));
                        return (
                          <div key={m.id} className="glass-card p-2 md:p-3.5 rounded-sm flex items-center justify-between border-l-2 border-emerald-400/40">
                             <div className="flex flex-col">
                                <span className="text-[8px] md:text-[10px] font-orbitron font-light uppercase tracking-widest text-emerald-400/80">{m.type} {m.isReturning ? '(RETURNING)' : '(OUTBOUND)'}</span>
                                <span className="text-[6px] text-[var(--arrival-ink-dim)] uppercase">Dest: {m.targetCoords.galaxy}:{m.targetCoords.system}:{m.targetCoords.slot}</span>
                             </div>
                             <span className="font-mono text-[8px] text-emerald-400">{formatDuration(rem)}</span>
                          </div>
                        );
                      })}
                    </>
                  )}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'infrastructure' && (
          <div className="max-w-2xl mx-auto space-y-12 md:space-y-16 pb-40 w-full overflow-hidden px-2">
            <div className="border-b border-[var(--arrival-border)] pb-3 md:pb-5">
              <h2 className="text-[12px] md:text-lg font-orbitron font-extralight uppercase tracking-[0.5em] text-[var(--arrival-ink)]">Infrastructure Array</h2>
            </div>
            {infrastructureGroups.map(group => (
              <div key={group.id} className="space-y-4 md:space-y-6">
                <div className="flex items-center gap-3 opacity-60">
                  <div className="h-[1px] w-4 md:w-8 bg-[var(--arrival-accent)]"></div>
                  <h3 className="text-[7px] md:text-[9px] font-orbitron uppercase tracking-[0.4em] text-[var(--arrival-accent)] font-bold">{group.label}</h3>
                  <div className="h-[1px] flex-1 bg-[var(--arrival-border)]"></div>
                </div>
                <div className="flex flex-col gap-2 md:gap-3 w-full">
                  {group.entities.map(entity => {
                    const level = currentPlanet.buildings[entity.id] || 0;
                    const isLocked = !Object.entries(entity.requirements || {}).every(([id, req]) => (currentPlanet.buildings[id] || 0) + (state.research[id] || 0) >= (req as number));
                    const event = state.events.find(e => e.targetId === entity.id && e.planetId === currentPlanet.id);
                    return <InfrastructureTile 
                              key={entity.id} 
                              entity={entity} 
                              level={level} 
                              onUpgrade={handleUpgrade} 
                              resources={currentPlanet.resources} 
                              activeEvent={event} 
                              isLocked={isLocked} 
                              buildings={currentPlanet.buildings} 
                              research={state.research} 
                              tab={activeTab} 
                              queueCount={state.events.filter(e => e.type === 'BUILDING' && e.planetId === currentPlanet.id).length} 
                              queueLimit={2}
                              isBoosted={isBoostActive}
                           />;
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'research' && (
          <div className="max-w-2xl mx-auto space-y-12 md:space-y-16 pb-40 w-full overflow-hidden px-2">
            <div className="border-b border-[var(--arrival-border)] pb-3 md:pb-5">
              <h2 className="text-[12px] md:text-lg font-orbitron font-extralight uppercase tracking-[0.5em] text-[var(--arrival-ink)]">Research Array</h2>
            </div>
            {researchGroups.map(group => (
              <div key={group.id} className="space-y-4 md:space-y-6">
                <div className="flex items-center gap-3 opacity-60">
                  <div className="h-[1px] w-4 md:w-8 bg-[var(--arrival-accent)]"></div>
                  <h3 className="text-[7px] md:text-[9px] font-orbitron uppercase tracking-[0.4em] text-[var(--arrival-accent)] font-bold">{group.label}</h3>
                  <div className="h-[1px] flex-1 bg-[var(--arrival-border)]"></div>
                </div>
                <div className="flex flex-col gap-2 md:gap-3 w-full">
                  {group.entities.map(entity => {
                    const level = state.research[entity.id] || 0;
                    const isLocked = !Object.entries(entity.requirements || {}).every(([id, req]) => (currentPlanet.buildings[id] || 0) + (state.research[id] || 0) >= (req as number));
                    const event = state.events.find(e => e.targetId === entity.id && e.type === 'RESEARCH');
                    return <InfrastructureTile 
                              key={entity.id} 
                              entity={entity} 
                              level={level} 
                              onUpgrade={handleUpgrade} 
                              resources={currentPlanet.resources} 
                              activeEvent={event} 
                              isLocked={isLocked} 
                              buildings={currentPlanet.buildings} 
                              research={state.research} 
                              tab={activeTab} 
                              queueCount={state.events.filter(e => e.type === 'RESEARCH').length} 
                              queueLimit={1}
                              isBoosted={isBoostActive}
                           />;
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'shipyard' && (
          <div className="max-w-2xl mx-auto space-y-12 md:space-y-16 pb-40 w-full overflow-hidden px-2">
            <div className="border-b border-[var(--arrival-border)] pb-3 md:pb-5">
              <h2 className="text-[12px] md:text-lg font-orbitron font-extralight uppercase tracking-[0.5em] text-[var(--arrival-ink)]">Shipyard Array</h2>
            </div>
            {shipyardGroups.map(group => (
              <div key={group.id} className="space-y-4 md:space-y-6">
                <div className="flex items-center gap-3 opacity-60">
                  <div className="h-[1px] w-4 md:w-8 bg-[var(--arrival-accent)]"></div>
                  <h3 className="text-[7px] md:text-[9px] font-orbitron uppercase tracking-[0.4em] text-[var(--arrival-accent)] font-bold">{group.label}</h3>
                  <div className="h-[1px] flex-1 bg-[var(--arrival-border)]"></div>
                </div>
                <div className="flex flex-col gap-2 md:gap-3 w-full">
                  {group.entities.map(entity => {
                    const level = (currentPlanet.ships[entity.id] || 0) + (currentPlanet.defense[entity.id] || 0);
                    const isLocked = !Object.entries(entity.requirements || {}).every(([id, req]) => (currentPlanet.buildings[id] || 0) + (state.research[id] || 0) >= (req as number));
                    const event = state.events.find(e => e.targetId === entity.id && e.planetId === currentPlanet.id);
                    return <InfrastructureTile 
                              key={entity.id} 
                              entity={entity} 
                              level={level} 
                              onUpgrade={handleUpgrade} 
                              resources={currentPlanet.resources} 
                              activeEvent={event} 
                              isLocked={isLocked} 
                              buildings={currentPlanet.buildings} 
                              research={state.research} 
                              tab={activeTab} 
                              isBoosted={isBoostActive}
                           />;
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'profile' && <ProfileView user={state} onUpdate={updateProfile} onHardReset={hardReset} />}
        {activeTab === 'fleet' && <FleetOverview planet={currentPlanet} />}
        {activeTab === 'galaxy' && <GalaxyView state={state} currentPlanet={currentPlanet} onColonize={handleColonize} onStrike={handleStrike} onRecycle={handleRecycle} onViewReport={onViewReportFromGalaxy} />}
        {activeTab === 'logs' && <LogsView reports={state.combatReports} systemLogs={state.systemLogs} onClear={clearLogs} initialReportId={targetedReportId} />}
        {activeTab === 'faq' && <FAQView />}
      </main>

      <nav className="w-full flex justify-center py-3.5 md:py-7 bg-[var(--arrival-bg)] border-t border-[var(--arrival-border)] shrink-0 z-50 transition-colors">
        <div className="flex justify-around w-full max-md:max-w-full max-w-md px-4 md:px-12">
          {[{id:'home',icon:'○'},{id:'infrastructure',icon:'△'},{id:'research',icon:'◇'},{id:'shipyard',icon:'□'},{id:'fleet',icon:'⟁'},{id:'galaxy',icon:'⊹'}].map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); if (item.id !== 'logs') setTargetedReportId(null); }} className="flex flex-col items-center gap-2 group relative">
              <span className={`text-[14px] md:text-lg transition-all duration-700 ${activeTab === item.id ? 'text-[var(--arrival-ink)] scale-110' : 'text-[var(--arrival-ink-dim)] hover:text-[var(--arrival-ink)]/60 hover:scale-105'}`}>{item.icon}</span>
              <div className={`nav-dot ${activeTab === item.id ? 'active' : 'opacity-0'}`}></div>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
