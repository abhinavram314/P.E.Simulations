/**
 * PowerLab - Dynamic Vector Schematic Canvas
 * 100% Electronically Complete Circuits with Solder Junctions,
 * Freewheeling Diode (D_FW) Parallel Branch, Switch Stresses,
 * and Real-Time Closed-Loop Current Flow Animations.
 */

import React, { useMemo, useState } from 'react';
import {
  TopologyId,
  SimulationStep,
  PowerMetrics,
  GridParams,
  SemiconductorParams,
  LoadParams,
  ConverterControls,
} from '../types/powerTypes';
import { AlertTriangle, Shield, Gauge, Info, CheckCircle2 } from 'lucide-react';

interface SchematicCanvasProps {
  topology: TopologyId;
  currentStep: SimulationStep;
  metrics: PowerMetrics;
  grid: GridParams;
  semi: SemiconductorParams;
  load: LoadParams;
  controls: ConverterControls;
  onToggleFwd?: () => void;
}

export const SchematicCanvas: React.FC<SchematicCanvasProps> = ({
  topology,
  currentStep,
  metrics,
  grid,
  semi,
  load,
  controls,
  onToggleFwd,
}) => {
  const [selectedSwitch, setSelectedSwitch] = useState<string | null>(null);

  // Speed of current loop animation mapped to current amplitude
  const animSpeedSec = useMemo(() => {
    const i = Math.max(0.1, currentStep.io);
    return Math.max(0.3, Math.min(2.0, 1.4 / i));
  }, [currentStep.io]);

  // Lookup switch state by id
  const getSwitch = (id: string) => {
    return (
      currentStep.switchStates.find((s) => s.id === id) || {
        id,
        name: id,
        isConducting: false,
        forwardCurrent: 0,
        voltageStress: 0,
        inReverseRecovery: false,
        snubberCurrent: 0,
        gatePulseActive: false,
      }
    );
  };

  const isFwdConducting = currentStep.activePairName === 'DFW' || currentStep.switchStates.some(s => s.id === 'DFW' && s.isConducting);

  return (
    <div className="relative w-full h-full min-h-[460px] bg-[#1a120b]/95 rounded-xl border border-amber-900/40 p-4 flex flex-col justify-between shadow-2xl backdrop-blur-md">
      {/* Top Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 z-10 mb-2">
        <div className="flex items-center gap-2">
          {/* Angle & Current Chip */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#2c1e16] border border-amber-900/50 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-slate-300">wt = {currentStep.wtDeg.toFixed(1)}°</span>
            <span className="text-slate-600">|</span>
            <span className="text-emerald-400 font-semibold">{currentStep.io.toFixed(2)} A</span>
          </div>

          {/* Active Conducting Pair */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#2c1e16] border border-amber-900/50 text-xs font-mono">
            <span className="text-slate-400 text-[11px]">Active Pair:</span>
            <span className="text-amber-400 font-bold">{currentStep.activePairName || 'OFF'}</span>
          </div>

          {currentStep.isOverlapping && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-950/80 border border-amber-600/80 text-xs text-amber-300 font-mono animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Overlap μ ({metrics.commutationOverlapMu.toFixed(1)}°)</span>
            </div>
          )}

          {metrics.coreSaturationRisk && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-950/80 border border-rose-700 text-xs text-rose-300 font-mono">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>DC Bias (Φdc={metrics.coreDcFluxPhiDc.toFixed(3)} Wb)</span>
            </div>
          )}
        </div>

        {/* Legend & Snubber badge */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <span className="text-slate-300">Conducting</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-700" />
            <span className="text-slate-400">Blocking</span>
          </div>
          {controls.enableFwd && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-800/60 text-emerald-300">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>D_FW Connected</span>
            </div>
          )}
          {semi.enableSnubber && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-950/50 border border-blue-800/60 text-blue-300">
              <Shield className="w-3 h-3 text-blue-400" />
              <span>Snubber</span>
            </div>
          )}
        </div>
      </div>

      {/* Main SVG Schematic Canvas */}
      <div className="relative flex-1 w-full flex items-center justify-center">
        <svg
          viewBox="-40 -40 1000 560" preserveAspectRatio="xMidYMid meet"
          className="w-full h-full min-h-[300px] select-none"
          style={{ overflow: 'visible' }}
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="schematicGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>

            {/* Glowing filters for active conduction paths - using userSpaceOnUse to prevent 0-height clipping bugs on horizontal wires */}
            <filter id="glowGreen" x="-200" y="-200" width="1400" height="1000" filterUnits="userSpaceOnUse">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glowAmber" x="-200" y="-200" width="1400" height="1000" filterUnits="userSpaceOnUse">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glowCyan" x="-200" y="-200" width="1400" height="1000" filterUnits="userSpaceOnUse">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid Background */}
          <rect width="920" height="480" fill="url(#schematicGrid)" rx="10" />

          {/* Render Full Topologies with 100% Circuit Completeness */}
          {topology.startsWith('3P') || topology === 'DUAL_CONVERTER_4Q' ? (
            <ThreePhaseBridgeSchematic
              topology={topology}
              currentStep={currentStep}
              getSwitch={getSwitch}
              animSpeedSec={animSpeedSec}
              grid={grid}
              semi={semi}
              load={load}
              controls={controls}
              onSelectSwitch={setSelectedSwitch}
            />
          ) : topology === '1P_HALF_WAVE' ? (
            <SinglePhaseHalfWaveSchematic
              topology={topology}
              currentStep={currentStep}
              getSwitch={getSwitch}
              animSpeedSec={animSpeedSec}
              grid={grid}
              semi={semi}
              load={load}
              controls={controls}
              onSelectSwitch={setSelectedSwitch}
              onToggleFwd={onToggleFwd}
            />
          ) : (
            <SinglePhaseBridgeSchematic
              topology={topology}
              currentStep={currentStep}
              getSwitch={getSwitch}
              animSpeedSec={animSpeedSec}
              grid={grid}
              semi={semi}
              load={load}
              controls={controls}
              onSelectSwitch={setSelectedSwitch}
              onToggleFwd={onToggleFwd}
            />
          )}
        </svg>

        {/* Floating Switch Inspection Tooltip Modal */}
        {selectedSwitch && (
          <div className="absolute bottom-4 right-4 bg-[#2c1e16]/95 border border-slate-700/80 p-3 rounded-lg shadow-2xl backdrop-blur-md max-w-xs z-30 font-mono text-xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-amber-900/50 mb-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-100">
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                <span>Switch Telemetry: {selectedSwitch}</span>
              </div>
              <button
                onClick={() => setSelectedSwitch(null)}
                className="text-slate-400 hover:text-white px-1 rounded"
              >
                ✕
              </button>
            </div>
            {(() => {
              const sw = getSwitch(selectedSwitch);
              return (
                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className={sw.isConducting ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                      {sw.isConducting ? 'ON (Conducting)' : 'OFF (Blocking)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current i_T:</span>
                    <span className="text-emerald-300 font-semibold">{sw.forwardCurrent.toFixed(2)} A</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Voltage v_T:</span>
                    <span className={sw.isConducting ? 'text-emerald-400' : 'text-amber-300'}>
                      {sw.isConducting ? `+${(semi.vf0 + sw.forwardCurrent * semi.rd).toFixed(2)} V` : `${sw.voltageStress.toFixed(1)} V`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Conduction Loss:</span>
                    <span className="text-slate-200">
                      {(sw.forwardCurrent * (semi.vf0 + sw.forwardCurrent * semi.rd)).toFixed(2)} W
                    </span>
                  </div>
                  {semi.enableSnubber && (
                    <div className="flex justify-between text-blue-300">
                      <span>Snubber Leakage:</span>
                      <span>{sw.snubberCurrent.toFixed(2)} mA</span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Footer Info / Conduction Loop Legend */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-slate-500" />
          <span>Interactive schematic: click switches to inspect forward drops & stresses. Animated dots follow real conduction loops.</span>
        </div>
        <div className="flex items-center gap-3">
          <span>R={load.r}Ω</span>
          <span>L={(load.l * 1000).toFixed(1)}mH</span>
          <span>E={load.e}V</span>
          <span>Ls={(grid.sourceInductanceLs * 1000).toFixed(2)}mH</span>
        </div>
      </div>
    </div>
  );
};

// =========================================================================================
// SINGLE-PHASE FULL-BRIDGE / SEMI-CONVERTER SCHEMATIC (100% Complete Closed Circuit)
// =========================================================================================
interface SubSchematicProps {
  topology: TopologyId;
  currentStep: SimulationStep;
  getSwitch: (id: string) => any;
  animSpeedSec: number;
  grid: GridParams;
  semi: SemiconductorParams;
  load: LoadParams;
  controls: ConverterControls;
  onSelectSwitch: (id: string) => void;
  onToggleFwd?: () => void;
}

const SinglePhaseBridgeSchematic: React.FC<SubSchematicProps> = ({
  topology,
  currentStep,
  getSwitch,
  animSpeedSec,
  grid,
  semi,
  load,
  controls,
  onSelectSwitch,
  onToggleFwd,
}) => {
  const isScrBridge = topology === '1P_FULL_BRIDGE_SCR' || topology === '1P_CENTER_TAP';
  const isSemi = topology === '1P_SEMI_CONVERTER_SYM' || topology === '1P_SEMI_CONVERTER_ASYM';

  const t1 = getSwitch('T1');
  const t2 = getSwitch(isSemi ? 'D2' : isScrBridge ? 'T2' : 'D2');
  const t3 = getSwitch(isSemi ? 'D1' : isScrBridge ? 'T3' : 'D3');
  const t4 = getSwitch(isSemi ? 'D2' : isScrBridge ? 'T4' : 'D4');
  const dfw = getSwitch('DFW');

  const t1Conducting = t1.isConducting;
  const t2Conducting = t2.isConducting;
  const t3Conducting = t3.isConducting;
  const t4Conducting = t4.isConducting;
  const isPair1 = currentStep.activePairName.includes('T1') || (t1Conducting && t2Conducting);
  const isPair2 = currentStep.activePairName.includes('T3') || currentStep.activePairName.includes('T4') || (t3Conducting && t4Conducting);
  const isDfwActive = currentStep.activePairName === 'DFW' || (controls.enableFwd && currentStep.vo <= 0.1 && currentStep.io > 0.05);

  return (
    <g>
      {/* ================= AC VOLTAGE SOURCE ================= */}
      <g transform="translate(110, 240)">
        <circle cx="0" cy="0" r="32" fill="#090d16" stroke="#38bdf8" strokeWidth="2.5" />
        {/* Sine wave glyph */}
        <path
          d="M -16 0 Q -8 -18 0 0 T 16 0"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <text x="0" y="48" fill="#94a3b8" fontSize="11" textAnchor="middle" fontFamily="monospace">
          v_s: {currentStep.vs.toFixed(1)}V
        </text>
        <text x="0" y="-40" fill="#38bdf8" fontSize="12" textAnchor="middle" fontWeight="bold">
          AC GRID ({grid.vRms}V RMS)
        </text>
      </g>

      {/* Source Line Inductance (Ls) on AC Line 1 */}
      <g transform="translate(180, 160)">
        <path
          d="M 0 0 C 8 -12 16 -12 24 0 C 32 -12 40 -12 48 0 C 56 -12 64 -12 72 0"
          fill="none"
          stroke="#94a3b8"
          strokeWidth="2.5"
        />
        <text x="36" y="-14" fill="#cbd5e1" fontSize="11" textAnchor="middle" fontFamily="monospace">
          Ls: {(grid.sourceInductanceLs * 1000).toFixed(1)}mH
        </text>
      </g>

      {/* AC Line 1 (L): Source -> Ls -> Bridge Leg 1 Midpoint (340, 240) */}
      <path
        d="M 110 208 L 110 160 L 180 160 M 252 160 L 340 160 L 340 240"
        fill="none"
        stroke={isPair1 ? '#10b981' : '#334155'}
        strokeWidth={isPair1 ? 3 : 2}
        filter={isPair1 ? 'url(#glowGreen)' : undefined}
      />

      {/* AC Line 2 (N): Source -> Bridge Leg 2 Midpoint (480, 240) */}
      <path
        d="M 110 272 L 110 320 L 480 320 L 480 240"
        fill="none"
        stroke={isPair2 ? '#10b981' : '#334155'}
        strokeWidth={isPair2 ? 3 : 2}
        filter={isPair2 ? 'url(#glowGreen)' : undefined}
      />

      {/* SOLDER JUNCTIONS at Midpoint Inputs */}
      <circle cx="340" cy="240" r="4.5" fill={isPair1 ? '#10b981' : '#475569'} />
      <circle cx="480" cy="240" r="4.5" fill={isPair2 ? '#10b981' : '#475569'} />

      {/* ================= BRIDGE LEGS ================= */}
      {/* Leg 1 Wires: Top rail (340, 110) down to Midpoint (340, 240) down to Bottom rail (340, 370) */}
      <path
        d="M 340 110 L 340 145 M 340 205 L 340 240 L 340 275 M 340 335 L 340 370"
        stroke="#475569"
        strokeWidth="2.5"
      />

      {/* Leg 2 Wires: Top rail (480, 110) down to Midpoint (480, 240) down to Bottom rail (480, 370) */}
      <path
        d="M 480 110 L 480 145 M 480 205 L 480 240 L 480 275 M 480 335 L 480 370"
        stroke="#475569"
        strokeWidth="2.5"
      />

      {/* Switch 1 (T1) - Leg 1 Upper (Centered at 340, 175) */}
      <ThyristorComponent
        x={340}
        y={175}
        name={isScrBridge || isSemi ? 'T1' : 'D1'}
        isThyristor={isScrBridge || isSemi}
        switchState={t1}
        onClick={() => onSelectSwitch('T1')}
      />

      {/* Switch 4 (T4) - Leg 1 Lower (Centered at 340, 305) */}
      <ThyristorComponent
        x={340}
        y={305}
        name={isScrBridge ? 'T4' : 'D4'}
        isThyristor={isScrBridge}
        switchState={t4}
        onClick={() => onSelectSwitch(isScrBridge ? 'T4' : 'D4')}
      />

      {/* Switch 3 (T3) - Leg 2 Upper (Centered at 480, 175) */}
      <ThyristorComponent
        x={480}
        y={175}
        name={isScrBridge ? 'T3' : isSemi ? 'D1' : 'D3'}
        isThyristor={isScrBridge}
        switchState={t3}
        onClick={() => onSelectSwitch(isScrBridge ? 'T3' : isSemi ? 'D1' : 'D3')}
      />

      {/* Switch 2 (T2) - Leg 2 Lower (Centered at 480, 305) */}
      <ThyristorComponent
        x={480}
        y={305}
        name={isScrBridge ? 'T2' : isSemi ? 'D2' : 'D2'}
        isThyristor={isScrBridge}
        switchState={t2}
        onClick={() => onSelectSwitch(isScrBridge ? 'T2' : 'D2')}
      />

      {/* ================= DC BUS RAILS ================= */}
      {/* Top Positive DC Bus Rail (+) from (340, 110) across to (740, 110) */}
      <path
        d="M 340 110 L 740 110"
        fill="none"
        stroke={currentStep.vo > 0 ? '#10b981' : '#475569'}
        strokeWidth={currentStep.vo > 0 ? 3 : 2}
        filter={currentStep.vo > 0 ? 'url(#glowGreen)' : undefined}
      />
      <text x="730" y="95" fill="#10b981" fontSize="13" fontWeight="bold">
        + DC Bus (v_o = {currentStep.vo.toFixed(1)}V)
      </text>

      {/* Bottom Negative DC Bus Rail (-) from (340, 370) across to (740, 370) */}
      <path
        d="M 340 370 L 740 370"
        fill="none"
        stroke="#475569"
        strokeWidth="2.5"
      />
      <text x="730" y="395" fill="#64748b" fontSize="13" fontWeight="bold">
        - DC Bus (GND)
      </text>

      {/* Solder Junction Dots on Rails */}
      <circle cx="340" cy="110" r="4.5" fill="#10b981" />
      <circle cx="480" cy="110" r="4.5" fill="#10b981" />
      <circle cx="610" cy="110" r="4.5" fill="#10b981" />
      <circle cx="740" cy="110" r="4.5" fill="#10b981" />

      <circle cx="340" cy="370" r="4.5" fill="#475569" />
      <circle cx="480" cy="370" r="4.5" fill="#475569" />
      <circle cx="610" cy="370" r="4.5" fill="#475569" />
      <circle cx="740" cy="370" r="4.5" fill="#475569" />

      {/* ================= FREEWHEELING DIODE (D_FW) BRANCH ================= */}
      <g transform="translate(610, 240)">
        {/* Wire from top rail (610, 110) to cathode (610, 210) */}
        <path d="M 0 -130 L 0 -30" stroke={isDfwActive ? '#f59e0b' : '#475569'} strokeWidth={isDfwActive ? 3 : 2} />

        {/* Diode D_FW centered at (0, 0), oriented cathode UP to (+) rail */}
        <g transform="rotate(180)">
          <ThyristorComponent
            x={0}
            y={0}
            name="D_FW"
            isThyristor={false}
            switchState={{
              isConducting: isDfwActive,
              forwardCurrent: isDfwActive ? currentStep.io : 0,
              voltageStress: isDfwActive ? 0.9 : currentStep.vo,
              inReverseRecovery: false,
            }}
            onClick={() => onSelectSwitch('DFW')}
          />
        </g>

        {/* Wire from anode (610, 270) down to bottom rail (610, 370) */}
        <path d="M 0 30 L 0 130" stroke={isDfwActive ? '#f59e0b' : '#475569'} strokeWidth={isDfwActive ? 3 : 2} />

        {/* Status indicator badge */}
        <g transform="translate(24, 0)">
          <rect x="-4" y="-12" width="76" height="24" rx="4" fill={controls.enableFwd ? '#0f172a' : '#1e1e24'} stroke={isDfwActive ? '#f59e0b' : '#334155'} strokeWidth="1" />
          <text x="34" y="4" fill={isDfwActive ? '#f59e0b' : controls.enableFwd ? '#10b981' : '#64748b'} fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
            {isDfwActive ? 'ACTIVE' : controls.enableFwd ? 'FWD ON' : 'FWD OFF'}
          </text>
        </g>
      </g>

      {/* ================= LOAD IMPEDANCE SECTION (x = 740) ================= */}
      <g transform="translate(740, 240)">
        {/* Top Wire into Load */}
        <path d="M 0 -130 L 0 -85" stroke="#10b981" strokeWidth="2.5" />

        {/* Resistor R */}
        <g transform="translate(0, -65)">
          <path
            d="M 0 -20 L 0 -15 L -8 -10 L 8 -5 L -8 0 L 8 5 L -8 10 L 8 15 L 0 20"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2.5"
          />
          <text x="20" y="5" fill="#fcd34d" fontSize="11" fontFamily="monospace">
            R = {load.r} Ω
          </text>
        </g>

        {/* Inductor L */}
        <g transform="translate(0, 0)">
          <path
            d="M 0 -25 C 14 -25 14 -10 0 -10 C 14 -10 14 5 0 5 C 14 5 14 20 0 20 L 0 25"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
          />
          <text x="20" y="5" fill="#7dd3fc" fontSize="11" fontFamily="monospace">
            L = {(load.l * 1000).toFixed(1)} mH
          </text>
        </g>

        {/* Back-EMF Battery / DC Machine E */}
        <g transform="translate(0, 65)">
          <line x1="-16" y1="-8" x2="16" y2="-8" stroke="#ec4899" strokeWidth="3" />
          <line x1="-8" y1="2" x2="8" y2="2" stroke="#ec4899" strokeWidth="2" />
          <line x1="-16" y1="12" x2="16" y2="12" stroke="#ec4899" strokeWidth="3" />
          <line x1="-8" y1="22" x2="8" y2="22" stroke="#ec4899" strokeWidth="2" />
          <text x="20" y="10" fill="#f472b6" fontSize="11" fontFamily="monospace">
            Back-EMF E = {load.e} V
          </text>
        </g>

        {/* Bottom Wire from Load to Bottom Rail */}
        <path d="M 0 95 L 0 130" stroke="#475569" strokeWidth="2.5" />
      </g>

      {/* ================= REAL-TIME ANIMATED CURRENT FLOW LOOPS ================= */}
      {currentStep.io > 0.05 && (
        <>
          {/* Pair 1 Conduction Loop: Source -> Ls -> (340, 240) -> T1 -> (340, 110) -> (740, 110) -> Load -> (740, 370) -> (480, 370) -> T2 -> (480, 240) -> Source */}
          {isPair1 && !isDfwActive && (
            <path
              d="M 110 160 L 340 160 L 340 240 L 340 110 L 740 110 L 740 370 L 480 370 L 480 240 L 480 320 L 110 320 L 110 208"
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              className="animate-current-flow"
              style={{ animationDuration: `${animSpeedSec}s` }}
              opacity={0.85}
            />
          )}

          {/* Pair 2 Conduction Loop: Source -> (480, 240) -> T3 -> (480, 110) -> (740, 110) -> Load -> (740, 370) -> (340, 370) -> T4 -> (340, 240) -> Ls -> Source */}
          {isPair2 && !isDfwActive && (
            <path
              d="M 110 320 L 480 320 L 480 240 L 480 110 L 740 110 L 740 370 L 340 370 L 340 240 L 340 160 L 110 160 L 110 272"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
              className="animate-current-flow"
              style={{ animationDuration: `${animSpeedSec}s` }}
              opacity={0.85}
            />
          )}

          {/* Freewheeling Diode Loop: DFW (610, 110) -> (740, 110) -> Load -> (740, 370) -> (610, 370) -> DFW (610, 110) */}
          {isDfwActive && (
            <path
              d="M 610 110 L 740 110 L 740 370 L 610 370 L 610 110"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="3"
              className="animate-current-flow"
              style={{ animationDuration: `${animSpeedSec}s` }}
              opacity={0.9}
            />
          )}
        </>
      )}
    </g>
  );
};

// =========================================================================================
// SINGLE-PHASE HALF-WAVE SCHEMATIC (100% Complete Closed Circuit with D_FW & Ground Return)
// =========================================================================================
const SinglePhaseHalfWaveSchematic: React.FC<SubSchematicProps> = ({
  currentStep,
  getSwitch,
  animSpeedSec,
  grid,
  semi,
  load,
  controls,
  onSelectSwitch,
}) => {
  const t1 = getSwitch('T1');
  const isT1Conducting = t1.isConducting;
  const isDfwActive = currentStep.activePairName === 'DFW' || (controls.enableFwd && currentStep.vo <= 0.1 && currentStep.io > 0.05);

  return (
    <g>
      {/* AC Voltage Source */}
      <g transform="translate(130, 240)">
        <circle cx="0" cy="0" r="32" fill="#090d16" stroke="#38bdf8" strokeWidth="2.5" />
        <path d="M -16 0 Q -8 -18 0 0 T 16 0" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
        <text x="0" y="48" fill="#94a3b8" fontSize="11" textAnchor="middle" fontFamily="monospace">
          v_s: {currentStep.vs.toFixed(1)}V
        </text>
        <text x="0" y="-40" fill="#38bdf8" fontSize="12" textAnchor="middle" fontWeight="bold">
          AC SOURCE ({grid.vRms}V)
        </text>
      </g>

      {/* Source Line Inductor (Ls) */}
      <g transform="translate(210, 130)">
        <path
          d="M 0 0 C 8 -12 16 -12 24 0 C 32 -12 40 -12 48 0 C 56 -12 64 -12 72 0"
          fill="none"
          stroke="#94a3b8"
          strokeWidth="2.5"
        />
        <text x="36" y="-14" fill="#cbd5e1" fontSize="11" textAnchor="middle" fontFamily="monospace">
          Ls: {(grid.sourceInductanceLs * 1000).toFixed(1)}mH
        </text>
      </g>

      {/* Wire from AC Source Top (130, 208) to Ls (210, 130) */}
      <path
        d="M 130 208 L 130 130 L 210 130"
        stroke={isT1Conducting ? '#10b981' : '#334155'}
        strokeWidth={isT1Conducting ? 3 : 2}
        fill="none"
      />

      {/* Wire from Ls (282, 130) to Thyristor T1 Anode (360, 130) */}
      <path
        d="M 282 130 L 360 130"
        stroke={isT1Conducting ? '#10b981' : '#334155'}
        strokeWidth={isT1Conducting ? 3 : 2}
        fill="none"
      />

      {/* Thyristor Switch T1 (Horizontal series switch centered at 400, 130) */}
      <g transform="translate(400, 130) rotate(-90)">
        <ThyristorComponent
          x={0}
          y={0}
          name="T1"
          isThyristor={true}
          switchState={t1}
          onClick={() => onSelectSwitch('T1')}
        />
      </g>

      {/* Top DC Rail from T1 Cathode (440, 130) across to D_FW (600, 130) and Load (740, 130) */}
      <path
        d="M 440 130 L 740 130"
        stroke={isT1Conducting ? '#10b981' : '#475569'}
        strokeWidth={isT1Conducting ? 3 : 2}
        fill="none"
        filter={isT1Conducting ? 'url(#glowGreen)' : undefined}
      />
      <text x="730" y="112" fill="#10b981" fontSize="13" fontWeight="bold">
        + V_dc ({currentStep.vo.toFixed(1)}V)
      </text>

      {/* Bottom Continuous Return Rail from Load (740, 350) back to Source (130, 272) */}
      <path
        d="M 740 350 L 130 350 L 130 272"
        stroke={isT1Conducting ? '#10b981' : '#475569'}
        strokeWidth={isT1Conducting ? 3 : 2}
        fill="none"
      />
      <text x="730" y="375" fill="#64748b" fontSize="13" fontWeight="bold">
        - Neutral / Return Line
      </text>

      {/* Solder Junction Dots */}
      <circle cx="600" cy="130" r="4.5" fill="#10b981" />
      <circle cx="740" cy="130" r="4.5" fill="#10b981" />
      <circle cx="600" cy="350" r="4.5" fill="#475569" />
      <circle cx="740" cy="350" r="4.5" fill="#475569" />
      <circle cx="130" cy="350" r="4.5" fill="#475569" />

      {/* Earth Ground Symbol at (130, 350) */}
      <g transform="translate(130, 350)">
        <line x1="0" y1="0" x2="0" y2="16" stroke="#64748b" strokeWidth="2" />
        <line x1="-12" y1="16" x2="12" y2="16" stroke="#64748b" strokeWidth="2.5" />
        <line x1="-7" y1="21" x2="7" y2="21" stroke="#64748b" strokeWidth="2" />
        <line x1="-3" y1="26" x2="3" y2="26" stroke="#64748b" strokeWidth="1.5" />
      </g>

      {/* Freewheeling Diode (D_FW) at x = 600 */}
      <g transform="translate(600, 240)">
        <path d="M 0 -110 L 0 -30" stroke={isDfwActive ? '#f59e0b' : '#475569'} strokeWidth={isDfwActive ? 3 : 2} />
        <g transform="rotate(180)">
          <ThyristorComponent
            x={0}
            y={0}
            name="D_FW"
            isThyristor={false}
            switchState={{
              isConducting: isDfwActive,
              forwardCurrent: isDfwActive ? currentStep.io : 0,
              voltageStress: isDfwActive ? 0.9 : currentStep.vo,
              inReverseRecovery: false,
            }}
            onClick={() => onSelectSwitch('DFW')}
          />
        </g>
        <path d="M 0 30 L 0 110" stroke={isDfwActive ? '#f59e0b' : '#475569'} strokeWidth={isDfwActive ? 3 : 2} />

        <g transform="translate(24, 0)">
          <rect x="-4" y="-12" width="76" height="24" rx="4" fill={controls.enableFwd ? '#0f172a' : '#1e1e24'} stroke={isDfwActive ? '#f59e0b' : '#334155'} strokeWidth="1" />
          <text x="34" y="4" fill={isDfwActive ? '#f59e0b' : controls.enableFwd ? '#10b981' : '#64748b'} fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
            {isDfwActive ? 'ACTIVE' : controls.enableFwd ? 'FWD ON' : 'FWD OFF'}
          </text>
        </g>
      </g>

      {/* Load R-L-E at x = 740 */}
      <g transform="translate(740, 240)">
        <path d="M 0 -110 L 0 -75" stroke="#10b981" strokeWidth="2.5" />
        {/* Resistor */}
        <g transform="translate(0, -55)">
          <path d="M 0 -18 L 0 -14 L -8 -9 L 8 -4 L -8 1 L 8 6 L -8 11 L 8 16 L 0 20" stroke="#f59e0b" strokeWidth="2.5" fill="none" />
          <text x="18" y="4" fill="#fcd34d" fontSize="11" fontFamily="monospace">R={load.r}Ω</text>
        </g>
        {/* Inductor */}
        <g transform="translate(0, 5)">
          <path d="M 0 -22 C 14 -22 14 -9 0 -9 C 14 -9 14 4 0 4 C 14 4 14 17 0 17 L 0 22" stroke="#38bdf8" strokeWidth="2.5" fill="none" />
          <text x="18" y="4" fill="#7dd3fc" fontSize="11" fontFamily="monospace">L={(load.l * 1000).toFixed(0)}mH</text>
        </g>
        {/* DC EMF */}
        <g transform="translate(0, 65)">
          <line x1="-16" y1="-8" x2="16" y2="-8" stroke="#ec4899" strokeWidth="3" />
          <line x1="-8" y1="2" x2="8" y2="2" stroke="#ec4899" strokeWidth="2" />
          <text x="18" y="2" fill="#f472b6" fontSize="11" fontFamily="monospace">E={load.e}V</text>
        </g>
        <path d="M 0 85 L 0 110" stroke="#475569" strokeWidth="2.5" />
      </g>

      {/* Closed-loop Animated Electron Flow */}
      {currentStep.io > 0.05 && (
        <>
          {/* Main Conduction Loop through T1 */}
          {isT1Conducting && !isDfwActive && (
            <path
              d="M 130 130 L 400 130 L 740 130 L 740 350 L 130 350 L 130 208"
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              className="animate-current-flow"
              style={{ animationDuration: `${animSpeedSec}s` }}
              opacity={0.85}
            />
          )}

          {/* Freewheeling Diode Loop through DFW */}
          {isDfwActive && (
            <path
              d="M 600 130 L 740 130 L 740 350 L 600 350 L 600 130"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="3"
              className="animate-current-flow"
              style={{ animationDuration: `${animSpeedSec}s` }}
              opacity={0.9}
            />
          )}
        </>
      )}
    </g>
  );
};

// =========================================================================================
// THREE-PHASE BRIDGE SCHEMATIC (100% Complete Closed Circuit)
// =========================================================================================
const ThreePhaseBridgeSchematic: React.FC<SubSchematicProps> = ({
  topology,
  currentStep,
  getSwitch,
  animSpeedSec,
  grid,
  semi,
  load,
  controls,
  onSelectSwitch,
}) => {
  const isAFE = topology === 'PWM_AFE_BOOST';
  const is3PulseStar = topology === '3P_STAR_3PULSE';
  const isSemi = topology === '3P_SEMI_CONVERTER';

  return (
    <g>
      {/* 3-Phase AC Source (Star configuration) */}
      <g transform="translate(90, 240)">
        <circle cx="0" cy="0" r="36" fill="#090d16" stroke="#38bdf8" strokeWidth="2.5" />
        <text x="0" y="-45" fill="#38bdf8" fontSize="12" textAnchor="middle" fontWeight="bold">
          3Φ GRID ({grid.vRms}V)
        </text>

        {/* 3 star windings radiating from neutral (0, 0) */}
        <line x1="0" y1="0" x2="-18" y2="-22" stroke="#ef4444" strokeWidth="2.5" />
        <line x1="0" y1="0" x2="22" y2="0" stroke="#eab308" strokeWidth="2.5" />
        <line x1="0" y1="0" x2="-18" y2="22" stroke="#3b82f6" strokeWidth="2.5" />

        <text x="-24" y="-24" fill="#ef4444" fontSize="10" fontWeight="bold">A</text>
        <text x="28" y="4" fill="#eab308" fontSize="10" fontWeight="bold">B</text>
        <text x="-24" y="28" fill="#3b82f6" fontSize="10" fontWeight="bold">C</text>
        <text x="0" y="4" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">N</text>
      </g>

      {/* Source Line Reactances Ls A, B, C */}
      <g transform="translate(160, 160)">
        <path d="M 0 0 C 6 -10 12 -10 18 0 C 24 -10 30 -10 36 0" fill="none" stroke="#ef4444" strokeWidth="2.5" />
        <text x="18" y="-12" fill="#ef4444" fontSize="10" textAnchor="middle">Ls,a</text>
      </g>
      <g transform="translate(160, 240)">
        <path d="M 0 0 C 6 -10 12 -10 18 0 C 24 -10 30 -10 36 0" fill="none" stroke="#eab308" strokeWidth="2.5" />
        <text x="18" y="-12" fill="#eab308" fontSize="10" textAnchor="middle">Ls,b</text>
      </g>
      <g transform="translate(160, 320)">
        <path d="M 0 0 C 6 -10 12 -10 18 0 C 24 -10 30 -10 36 0" fill="none" stroke="#3b82f6" strokeWidth="2.5" />
        <text x="18" y="-12" fill="#3b82f6" fontSize="10" textAnchor="middle">Ls,c</text>
      </g>

      {/* Grid Connecting Lines to Bridge Leg Midpoints */}
      {/* Phase A -> Leg 1 (290, 240) */}
      <path d="M 72 218 L 160 160 M 196 160 L 290 160 L 290 240" stroke="#ef4444" strokeWidth="2" fill="none" />
      {/* Phase B -> Leg 2 (400, 240) */}
      <path d="M 112 240 L 160 240 M 196 240 L 400 240" stroke="#eab308" strokeWidth="2" fill="none" />
      {/* Phase C -> Leg 3 (510, 240) */}
      <path d="M 72 262 L 160 320 M 196 320 L 510 320 L 510 240" stroke="#3b82f6" strokeWidth="2" fill="none" />

      {/* Solder Junction Dots at Phase Inputs */}
      <circle cx="290" cy="240" r="4" fill="#ef4444" />
      <circle cx="400" cy="240" r="4" fill="#eab308" />
      <circle cx="510" cy="240" r="4" fill="#3b82f6" />

      {/* Neutral return wire for 3-Pulse Star */}
      {is3PulseStar && (
        <path d="M 90 240 L 90 380 L 740 380" stroke="#64748b" strokeWidth="2.5" strokeDasharray="4 4" fill="none" />
      )}

      {/* Top Positive DC Bus Rail (+) from (290, 100) to (740, 100) */}
      <path d="M 290 100 L 740 100" stroke="#10b981" strokeWidth="3" fill="none" filter="url(#glowGreen)" />
      <text x="730" y="86" fill="#10b981" fontSize="13" fontWeight="bold">
        + V_dc ({currentStep.vo.toFixed(1)}V)
      </text>

      {/* Bottom Negative DC Bus Rail (-) */}
      {!is3PulseStar && (
        <path d="M 290 380 L 740 380" stroke="#475569" strokeWidth="2.5" fill="none" />
      )}
      <text x="730" y="405" fill="#64748b" fontSize="13" fontWeight="bold">
        {is3PulseStar ? 'Neutral Star Return (N)' : '- Return Bus'}
      </text>

      {/* Rail Solder Junctions */}
      <circle cx="290" cy="100" r="4.5" fill="#10b981" />
      <circle cx="400" cy="100" r="4.5" fill="#10b981" />
      <circle cx="510" cy="100" r="4.5" fill="#10b981" />
      <circle cx="630" cy="100" r="4.5" fill="#10b981" />
      <circle cx="740" cy="100" r="4.5" fill="#10b981" />

      <circle cx="290" cy="380" r="4.5" fill="#475569" />
      <circle cx="400" cy="380" r="4.5" fill="#475569" />
      <circle cx="510" cy="380" r="4.5" fill="#475569" />
      <circle cx="630" cy="380" r="4.5" fill="#475569" />
      <circle cx="740" cy="380" r="4.5" fill="#475569" />

      {/* Leg 1 Wires & Switches: T1 (170) and T4 (310) */}
      <path d="M 290 100 L 290 140 M 290 200 L 290 280 M 290 340 L 290 380" stroke="#475569" strokeWidth="2.5" />
      <ThyristorComponent
        x={290}
        y={170}
        name={isAFE ? 'S1' : 'T1'}
        isThyristor={!isAFE}
        switchState={getSwitch(isAFE ? 'S1_IGBT' : 'T1')}
        onClick={() => onSelectSwitch(isAFE ? 'S1_IGBT' : 'T1')}
      />
      {!is3PulseStar && (
        <ThyristorComponent
          x={290}
          y={310}
          name={isAFE ? 'S4' : isSemi ? 'D4' : 'T4'}
          isThyristor={!isAFE && !isSemi}
          switchState={getSwitch(isAFE ? 'S4_IGBT' : isSemi ? 'D4' : 'T4')}
          onClick={() => onSelectSwitch(isAFE ? 'S4_IGBT' : isSemi ? 'D4' : 'T4')}
        />
      )}

      {/* Leg 2 Wires & Switches: T3 / T2 */}
      <path d="M 400 100 L 400 140 M 400 200 L 400 280 M 400 340 L 400 380" stroke="#475569" strokeWidth="2.5" />
      <ThyristorComponent
        x={400}
        y={170}
        name={isAFE ? 'S3' : is3PulseStar ? 'T2' : 'T3'}
        isThyristor={!isAFE}
        switchState={getSwitch(isAFE ? 'S3_IGBT' : is3PulseStar ? 'T2' : 'T3')}
        onClick={() => onSelectSwitch(isAFE ? 'S3_IGBT' : is3PulseStar ? 'T2' : 'T3')}
      />
      {!is3PulseStar && (
        <ThyristorComponent
          x={400}
          y={310}
          name={isAFE ? 'S6' : isSemi ? 'D6' : 'T6'}
          isThyristor={!isAFE && !isSemi}
          switchState={getSwitch(isAFE ? 'S6_IGBT' : isSemi ? 'D6' : 'T6')}
          onClick={() => onSelectSwitch(isAFE ? 'S6_IGBT' : isSemi ? 'D6' : 'T6')}
        />
      )}

      {/* Leg 3 Wires & Switches: T5 / T2 */}
      <path d="M 510 100 L 510 140 M 510 200 L 510 280 M 510 340 L 510 380" stroke="#475569" strokeWidth="2.5" />
      <ThyristorComponent
        x={510}
        y={170}
        name={isAFE ? 'S5' : is3PulseStar ? 'T3' : 'T5'}
        isThyristor={!isAFE}
        switchState={getSwitch(isAFE ? 'S5_IGBT' : is3PulseStar ? 'T3' : 'T5')}
        onClick={() => onSelectSwitch(isAFE ? 'S5_IGBT' : is3PulseStar ? 'T3' : 'T5')}
      />
      {!is3PulseStar && (
        <ThyristorComponent
          x={510}
          y={310}
          name={isAFE ? 'S2' : isSemi ? 'D2' : 'T2'}
          isThyristor={!isAFE && !isSemi}
          switchState={getSwitch(isAFE ? 'S2_IGBT' : isSemi ? 'D2' : 'T2')}
          onClick={() => onSelectSwitch(isAFE ? 'S2_IGBT' : isSemi ? 'D2' : 'T2')}
        />
      )}

      {/* Freewheeling Diode (D_FW) at x = 630 */}
      <g transform="translate(630, 240)">
        <path d="M 0 -140 L 0 -30 M 0 30 L 0 140" stroke="#475569" strokeWidth="2" />
        <g transform="rotate(180)">
          <ThyristorComponent
            x={0}
            y={0}
            name="D_FW"
            isThyristor={false}
            switchState={{
              isConducting: currentStep.activePairName === 'DFW',
              forwardCurrent: currentStep.activePairName === 'DFW' ? currentStep.io : 0,
              voltageStress: currentStep.activePairName === 'DFW' ? 0.9 : currentStep.vo,
              inReverseRecovery: false,
            }}
            onClick={() => onSelectSwitch('DFW')}
          />
        </g>
      </g>

      {/* Load R-L-E at x = 740 */}
      <g transform="translate(740, 240)">
        <path d="M 0 -140 L 0 -85" stroke="#10b981" strokeWidth="2.5" />
        <g transform="translate(0, -65)">
          <path d="M 0 -20 L 0 -15 L -8 -10 L 8 -5 L -8 0 L 8 5 L -8 10 L 8 15 L 0 20" stroke="#f59e0b" strokeWidth="2.5" fill="none" />
          <text x="18" y="4" fill="#fcd34d" fontSize="11" fontFamily="monospace">R={load.r}Ω</text>
        </g>
        <g transform="translate(0, 0)">
          <path d="M 0 -25 C 14 -25 14 -10 0 -10 C 14 -10 14 5 0 5 C 14 5 14 20 0 20 L 0 25" stroke="#38bdf8" strokeWidth="2.5" fill="none" />
          <text x="18" y="4" fill="#7dd3fc" fontSize="11" fontFamily="monospace">L={(load.l * 1000).toFixed(0)}mH</text>
        </g>
        <g transform="translate(0, 65)">
          <line x1="-16" y1="-8" x2="16" y2="-8" stroke="#ec4899" strokeWidth="3" />
          <line x1="-8" y1="2" x2="8" y2="2" stroke="#ec4899" strokeWidth="2" />
          <text x="18" y="2" fill="#f472b6" fontSize="11" fontFamily="monospace">E={load.e}V</text>
        </g>
        <path d="M 0 95 L 0 140" stroke="#475569" strokeWidth="2.5" />
      </g>
    </g>
  );
};

// =========================================================================================
// THYRISTOR / DIODE VECTOR COMPONENT WITH PRECISE TERMINALS
// =========================================================================================
interface ThyristorProps {
  x: number;
  y: number;
  name: string;
  isThyristor: boolean;
  switchState: {
    isConducting: boolean;
    forwardCurrent: number;
    voltageStress: number;
    inReverseRecovery: boolean;
    gatePulseActive?: boolean;
  };
  onClick: () => void;
}

const ThyristorComponent: React.FC<ThyristorProps> = ({
  x,
  y,
  name,
  isThyristor,
  switchState,
  onClick,
}) => {
  const { isConducting, forwardCurrent, voltageStress, inReverseRecovery, gatePulseActive } = switchState;

  const color = isConducting ? '#10b981' : inReverseRecovery ? '#f59e0b' : '#64748b';
  const glow = isConducting ? 'url(#glowGreen)' : inReverseRecovery ? 'url(#glowAmber)' : undefined;

  return (
    <g transform={`translate(${x}, ${y})`} className="cursor-pointer group" onClick={onClick}>
      {/* Click hitbox */}
      <rect x="-28" y="-30" width="56" height="60" fill="transparent" />

      {/* Terminal wires extending to top and bottom connection nodes */}
      <line x1="0" y1="-30" x2="0" y2="-12" stroke={color} strokeWidth="2.5" />
      <line x1="0" y1="12" x2="0" y2="30" stroke={color} strokeWidth="2.5" />

      {/* Background radial glow */}
      {isConducting && (
        <circle cx="0" cy="0" r="24" fill="#10b981" fillOpacity="0.14" className="animate-pulse" />
      )}

      {/* Diode Triangle */}
      <path
        d="M -16 -12 L 16 -12 L 0 12 Z"
        fill={isConducting ? '#10b981' : '#1e293b'}
        stroke={color}
        strokeWidth="2.5"
        filter={glow}
      />

      {/* Cathode Bar */}
      <line x1="-16" y1="12" x2="16" y2="12" stroke={color} strokeWidth="3" />

      {/* Thyristor Gate Terminal */}
      {isThyristor && (
        <g>
          <path
            d="M 6 12 L 18 22"
            fill="none"
            stroke={gatePulseActive ? '#38bdf8' : '#64748b'}
            strokeWidth="2"
          />
          {gatePulseActive && (
            <circle cx="18" cy="22" r="4" fill="#38bdf8" className="animate-ping" />
          )}
        </g>
      )}

      {/* Label Badge */}
      <text
        x="-22"
        y="-2"
        fill={isConducting ? '#34d399' : '#cbd5e1'}
        fontSize="11"
        fontWeight="bold"
        fontFamily="monospace"
        textAnchor="end"
      >
        {name}
      </text>

      {/* Instantaneous Reading */}
      <g transform="translate(24, -2)">
        {isConducting ? (
          <text fill="#34d399" fontSize="10" fontFamily="monospace" fontWeight="semibold">
            +{forwardCurrent.toFixed(1)}A
          </text>
        ) : (
          <text fill="#94a3b8" fontSize="9" fontFamily="monospace">
            {voltageStress > 10 ? `-${voltageStress.toFixed(0)}V` : '0V'}
          </text>
        )}
      </g>
    </g>
  );
};
