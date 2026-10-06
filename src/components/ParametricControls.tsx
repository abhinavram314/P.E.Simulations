/**
 * PowerLab - Parametric Controls
 * Structured directly after RectifierLab with 3 Interactive Panels:
 * 1. Converter Topology & Quick Device Setup
 * 2. Firing Angle α & Freewheeling Diode (D_FW) Toggle
 * 3. Load & Source Parameters (R, RL, RLE, Source RMS, Inductance)
 */

import React from 'react';
import {
  TopologyId,
  GridParams,
  SemiconductorParams,
  LoadParams,
  ConverterControls,
  SimulationStep,
} from '../types/powerTypes';
import { Sliders, Cpu, Activity, Zap, CheckCircle2 } from 'lucide-react';

interface ParametricControlsProps {
  topology: TopologyId;
  onSelectTopology: (t: TopologyId) => void;
  grid: GridParams;
  semi: SemiconductorParams;
  load: LoadParams;
  controls: ConverterControls;
  currentStep: SimulationStep;
  onChangeGrid: (g: Partial<GridParams>) => void;
  onChangeSemi: (s: Partial<SemiconductorParams>) => void;
  onChangeLoad: (l: Partial<LoadParams>) => void;
  onChangeControls: (c: Partial<ConverterControls>) => void;
  layout?: 'horizontal' | 'vertical';
}

export const ParametricControls: React.FC<ParametricControlsProps> = ({
  topology,
  onSelectTopology,
  grid,
  semi,
  load,
  controls,
  currentStep,
  onChangeGrid,
  onChangeSemi,
  onChangeLoad,
  onChangeControls,
  layout = 'horizontal',
}) => {
  const is1P = !topology.startsWith('3P');
  const alphaPresets = [0, 30, 45, 60, 90, 120, 150];

  const isDfwActive =
    currentStep.activePairName === 'DFW' ||
    (controls.enableFwd && currentStep.vo <= 0.1 && currentStep.io > 0.05);

  // Quick Device Setup presets
  const handleQuickSetup = (mode: 'diodes' | 'thyristors' | 'semi') => {
    if (mode === 'diodes') {
      if (is1P) {
        onSelectTopology('1P_FULL_BRIDGE_DIODE');
      } else {
        onSelectTopology('3P_FULL_BRIDGE_6PULSE');
      }
      onChangeControls({ firingAngleAlpha: 0 });
    } else if (mode === 'thyristors') {
      if (is1P) {
        onSelectTopology('1P_FULL_BRIDGE_SCR');
      } else {
        onSelectTopology('3P_FULL_BRIDGE_6PULSE');
      }
      onChangeControls({ firingAngleAlpha: 45 });
    } else if (mode === 'semi') {
      if (is1P) {
        onSelectTopology('1P_SEMI_CONVERTER_SYM');
      } else {
        onSelectTopology('3P_SEMI_CONVERTER');
      }
      onChangeControls({ firingAngleAlpha: 45, enableFwd: true });
    }
  };

  return (
    <div className={`grid gap-4 ${layout === 'vertical' ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
      {/* ================= PANEL 1: CONVERTER TOPOLOGY ================= */}
      <div className="bg-slate-950/90 rounded-xl border border-amber-900/60/80 p-4 shadow-xl backdrop-blur-md flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center gap-2 pb-2.5 border-b border-amber-900/60/80 mb-3 text-xs font-mono font-semibold text-slate-300">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="uppercase tracking-wider">CONVERTER TOPOLOGY</span>
          </div>

          {/* Phase Selector: 1-Phase vs 3-Phase */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#2c1e16] shadow-md shadow-orange-950/30 hover:shadow-lg hover:shadow-amber-700/20 border border-amber-900/60 rounded-lg mb-3 text-xs font-mono">
            <button
              onClick={() => {
                if (!is1P) onSelectTopology('1P_FULL_BRIDGE_SCR');
              }}
              className={`py-1.5 px-3 rounded-md font-semibold transition-all ${
                is1P
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Single-Phase (1Φ)
            </button>
            <button
              onClick={() => {
                if (is1P) onSelectTopology('3P_FULL_BRIDGE_6PULSE');
              }}
              className={`py-1.5 px-3 rounded-md font-semibold transition-all ${
                !is1P
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Three-Phase (3Φ)
            </button>
          </div>

          {/* Sub-Topology Buttons */}
          {is1P ? (
            <div className="grid grid-cols-2 gap-2 mb-3 text-xs font-mono">
              <button
                onClick={() => onSelectTopology('1P_FULL_BRIDGE_SCR')}
                className={`py-1.5 px-2 rounded-lg border transition ${
                  topology === '1P_FULL_BRIDGE_SCR' || topology === '1P_FULL_BRIDGE_DIODE'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 font-bold'
                    : 'bg-[#2c1e16] shadow-md shadow-orange-950/30 hover:shadow-lg hover:shadow-amber-700/20 border-amber-900/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                Full-Bridge
              </button>
              <button
                onClick={() => onSelectTopology('1P_HALF_WAVE')}
                className={`py-1.5 px-2 rounded-lg border transition ${
                  topology === '1P_HALF_WAVE'
                    ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-md'
                    : 'bg-[#2c1e16] shadow-md shadow-orange-950/30 hover:shadow-lg hover:shadow-amber-700/20 border-amber-900/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                Half-Wave
              </button>
              <button
                onClick={() => onSelectTopology('1P_SEMI_CONVERTER_SYM')}
                className={`py-1.5 px-2 rounded-lg border transition ${
                  topology === '1P_SEMI_CONVERTER_SYM' || topology === '1P_SEMI_CONVERTER_ASYM'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 font-bold'
                    : 'bg-[#2c1e16] shadow-md shadow-orange-950/30 hover:shadow-lg hover:shadow-amber-700/20 border-amber-900/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                Semi-Converter
              </button>
              <button
                onClick={() => onSelectTopology('1P_CENTER_TAP')}
                className={`py-1.5 px-2 rounded-lg border transition ${
                  topology === '1P_CENTER_TAP'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 font-bold'
                    : 'bg-[#2c1e16] shadow-md shadow-orange-950/30 hover:shadow-lg hover:shadow-amber-700/20 border-amber-900/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                Center-Tapped
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 mb-3 text-xs font-mono">
              <button
                onClick={() => onSelectTopology('3P_FULL_BRIDGE_6PULSE')}
                className={`py-1.5 px-2 rounded-lg border transition ${
                  topology === '3P_FULL_BRIDGE_6PULSE'
                    ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-md'
                    : 'bg-[#2c1e16] shadow-md shadow-orange-950/30 hover:shadow-lg hover:shadow-amber-700/20 border-amber-900/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                6-Pulse Bridge
              </button>
              <button
                onClick={() => onSelectTopology('3P_STAR_3PULSE')}
                className={`py-1.5 px-2 rounded-lg border transition ${
                  topology === '3P_STAR_3PULSE'
                    ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-md'
                    : 'bg-[#2c1e16] shadow-md shadow-orange-950/30 hover:shadow-lg hover:shadow-amber-700/20 border-amber-900/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                3-Pulse Star
              </button>
              <button
                onClick={() => onSelectTopology('3P_SEMI_CONVERTER')}
                className={`py-1.5 px-2 rounded-lg border transition ${
                  topology === '3P_SEMI_CONVERTER'
                    ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-md'
                    : 'bg-[#2c1e16] shadow-md shadow-orange-950/30 hover:shadow-lg hover:shadow-amber-700/20 border-amber-900/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                3Φ Semi-Conv
              </button>
              <button
                onClick={() => onSelectTopology('3P_12PULSE_DUAL')}
                className={`py-1.5 px-2 rounded-lg border transition ${
                  topology === '3P_12PULSE_DUAL'
                    ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-md'
                    : 'bg-[#2c1e16] shadow-md shadow-orange-950/30 hover:shadow-lg hover:shadow-amber-700/20 border-amber-900/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                12-Pulse Dual
              </button>
            </div>
          )}
        </div>

        {/* Quick Device Setup */}
        <div className="pt-2 border-t border-slate-900">
          <span className="text-[11px] font-mono text-slate-400 block mb-1.5">Quick Device Setup:</span>
          <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
            <button
              onClick={() => handleQuickSetup('diodes')}
              className="py-1 px-2 rounded bg-[#2c1e16] shadow-md shadow-orange-950/30 hover:shadow-lg hover:shadow-amber-700/20 hover:bg-slate-800 border border-amber-900/60 text-slate-300 text-[11px] transition"
            >
              All Diodes
            </button>
            <button
              onClick={() => handleQuickSetup('thyristors')}
              className="py-1 px-2 rounded bg-[#2c1e16] shadow-md shadow-orange-950/30 hover:shadow-lg hover:shadow-amber-700/20 hover:bg-slate-800 border border-amber-900/60 text-slate-300 text-[11px] transition"
            >
              All Thyristors
            </button>
            <button
              onClick={() => handleQuickSetup('semi')}
              className="py-1 px-2 rounded bg-[#2c1e16] shadow-md shadow-orange-950/30 hover:shadow-lg hover:shadow-amber-700/20 hover:bg-slate-800 border border-amber-900/60 text-slate-300 text-[11px] transition"
            >
              Semi-Conv
            </button>
          </div>
        </div>
      </div>

      {/* ================= PANEL 2: FIRING ANGLE α & FWD ================= */}
      <div className="bg-slate-950/90 rounded-xl border border-amber-900/60/80 p-4 shadow-xl backdrop-blur-md flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center gap-2 pb-2.5 border-b border-amber-900/60/80 mb-3 text-xs font-mono font-semibold text-slate-300">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="uppercase tracking-wider">FIRING ANGLE α & FWD</span>
          </div>

          {/* Firing Angle Slider */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs font-mono mb-1">
              <span className="text-slate-300">Firing Angle (α):</span>
              <span className="text-amber-400 font-bold text-sm">{controls.firingAngleAlpha}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="180"
              step="1"
              value={controls.firingAngleAlpha}
              onChange={(e) => onChangeControls({ firingAngleAlpha: Number(e.target.value) })}
              className="w-full accent-amber-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />

            {/* Presets */}
            <div className="flex items-center justify-between gap-1 mt-2">
              {alphaPresets.map((deg) => (
                <button
                  key={deg}
                  onClick={() => onChangeControls({ firingAngleAlpha: deg })}
                  className={`flex-1 py-0.5 text-[11px] font-mono rounded border transition ${
                    controls.firingAngleAlpha === deg
                      ? 'bg-sky-500 text-slate-950 font-bold border-sky-400 shadow-sm'
                      : 'bg-[#2c1e16] shadow-md shadow-orange-950/30 hover:shadow-lg hover:shadow-amber-700/20 text-slate-300 border-amber-900/60 hover:border-slate-700'
                  }`}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Freewheeling Diode (D_FW) Controls */}
        <div className="pt-3 border-t border-slate-900 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300 font-medium">Freewheeling Diode (D_FW):</span>
            <button
              onClick={() => onChangeControls({ enableFwd: !controls.enableFwd })}
              className={`px-3 py-1 rounded text-xs font-bold transition border ${
                controls.enableFwd
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-600/70 shadow-sm'
                  : 'bg-[#2c1e16] shadow-md shadow-orange-950/30 hover:shadow-lg hover:shadow-amber-700/20 text-slate-400 border-amber-900/60 hover:text-slate-200'
              }`}
            >
              {controls.enableFwd ? 'Connected' : 'Disconnected'}
            </button>
          </div>

          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 text-[11px]">Diode Conduction:</span>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                isDfwActive
                  ? 'bg-sky-950/80 text-amber-300 border-sky-600/60 animate-pulse'
                  : 'bg-[#2c1e16] shadow-md shadow-orange-950/30 hover:shadow-lg hover:shadow-amber-700/20 text-slate-500 border-amber-900/60'
              }`}
            >
              {isDfwActive ? 'Active (Conducting)' : 'Reverse Blocking (Off)'}
            </span>
          </div>
        </div>
      </div>

      {/* ================= PANEL 3: LOAD & SOURCE PARAMETERS ================= */}
      <div className="bg-slate-950/90 rounded-xl border border-amber-900/60/80 p-4 shadow-xl backdrop-blur-md flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center gap-2 pb-2.5 border-b border-amber-900/60/80 mb-3 text-xs font-mono font-semibold text-slate-300">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="uppercase tracking-wider">LOAD & SOURCE PARAMETERS</span>
          </div>

          {/* Load Selector Buttons: R Load, RL Load, RLE Load */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#2c1e16] shadow-md shadow-orange-950/30 hover:shadow-lg hover:shadow-amber-700/20 border border-amber-900/60 rounded-lg mb-3 text-xs font-mono">
            {(['R', 'RL', 'RLE'] as const).map((t) => (
              <button
                key={t}
                onClick={() => onChangeLoad({ type: t })}
                className={`py-1 rounded font-semibold transition ${
                  load.type === t
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t} Load
              </button>
            ))}
          </div>

          {/* Sliders */}
          <div className="space-y-2.5 text-xs font-mono">
            {/* Resistance R */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">R (Resistance):</span>
                <span className="text-emerald-400 font-bold">{load.r} Ω</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={load.r}
                onChange={(e) => onChangeLoad({ r: Number(e.target.value) })}
                className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Inductance L (if RL or RLE) */}
            {load.type !== 'R' && (
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300">L (Inductance):</span>
                  <span className="text-amber-400 font-bold">
                    {load.l >= 1 ? `${load.l.toFixed(2)} H` : `${(load.l * 1000).toFixed(0)} mH`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.000"
                  max="1.000"
                  step="0.001"
                  value={load.l}
                  onChange={(e) => onChangeLoad({ l: Number(e.target.value) })}
                  className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-500 mt-1 px-1">
                  <span>0 mH</span>
                  <span>Very High (1 H)</span>
                </div>
              </div>
            )}

            {/* Source RMS */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Source RMS:</span>
                <span className="text-cyan-400 font-bold">{grid.vRms} V</span>
              </div>
              <input
                type="range"
                min="24"
                max="480"
                step="6"
                value={grid.vRms}
                onChange={(e) => onChangeGrid({ vRms: Number(e.target.value) })}
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Grid Frequency */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Frequency:</span>
                <span className="text-cyan-400 font-bold">{grid.frequency} Hz</span>
              </div>
              <input
                type="range"
                min="10"
                max="400"
                step="5"
                value={grid.frequency}
                onChange={(e) => onChangeGrid({ frequency: Number(e.target.value) })}
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Source Inductance Ls */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Source Inductance Ls:</span>
                <span className="text-indigo-400 font-bold">{(grid.sourceInductanceLs * 1000).toFixed(2)} mH</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.050"
                step="0.001"
                value={grid.sourceInductanceLs}
                onChange={(e) => onChangeGrid({ sourceInductanceLs: Number(e.target.value) })}
                className="w-full accent-indigo-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Back-EMF E (if RLE) */}
            {load.type === 'RLE' && (
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300">Back-EMF (E):</span>
                  <span className="text-pink-400 font-bold">{load.e} V</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="150"
                  step="5"
                  value={load.e}
                  onChange={(e) => onChangeLoad({ e: Number(e.target.value) })}
                  className="w-full accent-pink-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
