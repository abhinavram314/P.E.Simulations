/**
 * PowerLab / RectifierLab - Studio Header & Central Playback Console
 * Topology selection, high-precision clock engine, speed controls,
 * and analysis modals matching RectifierLab.
 */

import React, { useState, useEffect } from 'react';
import { TopologyId } from '../types/powerTypes';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Download,
  FileCode,
  BookOpen,
  Compass,
  Zap,
  Activity,
  Maximize,
  Minimize,
  X,
} from 'lucide-react';

export type ViewMode = 'SCHEMATIC' | 'WAVEFORMS' | 'HYBRID';

interface HeaderConsoleProps {
  topology: TopologyId;
  onSelectTopology: (t: TopologyId) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onRestart: () => void;
  frequency: number;
  onChangeFrequency: (f: number) => void;
  onOpenDerivations: () => void;
  onOpenParkVector: () => void;
  onOpenSpiceNetlist: () => void;
  onExportCsv: () => void;
  onResetAll: () => void;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
}

export const HeaderConsole: React.FC<HeaderConsoleProps> = ({
  topology,
  onSelectTopology,
  isPlaying,
  onTogglePlay,
  onStepForward,
  onStepBackward,
  onRestart,
  frequency,
  onChangeFrequency,
  onOpenDerivations,
  onOpenParkVector,
  onOpenSpiceNetlist,
  onExportCsv,
  onResetAll,
  viewMode,
  onChangeViewMode,
}) => {
  const freqOptions = [50, 60, 100, 200, 400];

  return (
    <div className="w-full flex flex-col">
      {/* ================= TOP STUDIO HEADER ================= */}
      <header className="w-full bg-slate-950/95 border-b border-amber-900/60/80 px-4 py-2.5 shadow-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
        {/* Logo & Studio Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-500/10">
            <Zap className="w-5 h-5 fill-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-100 tracking-tight font-sans">24EE10026_ABHINAV</span>
              <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                FULL SCREEN STUDIO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Interactive Single-Phase & Three-Phase Diode/Thyristor Bridge Converter Simulation
            </p>
          </div>
        </div>

        {/* Action Buttons & View Modes */}
        <div className="flex items-center gap-2 text-xs font-mono">
          {/* View Mode Segmented Control */}
          <div className="flex bg-[#2c1e16] border border-amber-900/60 rounded-lg overflow-hidden shadow-md shadow-amber-900/20 mr-2">
            <button
              onClick={() => onChangeViewMode('SCHEMATIC')}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition ${viewMode === 'SCHEMATIC' ? 'bg-blue-900/60 text-blue-300 font-bold border-b-2 border-blue-500' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Activity className="w-3.5 h-3.5" />
              Circuit Schematic
            </button>
            <button
              onClick={() => onChangeViewMode('WAVEFORMS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition border-l border-amber-900/60 ${viewMode === 'WAVEFORMS' ? 'bg-cyan-900/60 text-cyan-300 font-bold border-b-2 border-cyan-500' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Activity className="w-3.5 h-3.5" />
              Waveforms
            </button>
            <button
              onClick={() => onChangeViewMode('HYBRID')}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition border-l border-amber-900/60 ${viewMode === 'HYBRID' ? 'bg-sky-900/60 text-amber-300 font-bold border-b-2 border-sky-500' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Activity className="w-3.5 h-3.5" />
              Hybrid Mode
              <span className="text-[9px] text-amber-400/80 ml-1">SIDE-BY-SIDE</span>
            </button>
          </div>

          <button
            onClick={onOpenDerivations}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-600/60 text-amber-300 hover:bg-amber-950/70 transition font-medium"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Waveform Analysis & Derivations</span>
          </button>

          <button
            onClick={onOpenParkVector}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#2c1e16] hover:bg-amber-900/40 hover:shadow-lg hover:shadow-amber-700/20 border border-amber-900/60 text-slate-300 hover:text-amber-300 hover:border-slate-700 transition"
          >
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Park d-q</span>
          </button>

          <button
            onClick={onOpenSpiceNetlist}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#2c1e16] hover:bg-amber-900/40 hover:shadow-lg hover:shadow-amber-700/20 border border-amber-900/60 text-slate-300 hover:text-amber-300 hover:border-slate-700 transition"
          >
            <FileCode className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">SPICE Deck</span>
          </button>

          <button
            onClick={onExportCsv}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#2c1e16] hover:bg-amber-900/40 hover:shadow-lg hover:shadow-amber-700/20 border border-amber-900/60 text-slate-300 hover:text-amber-300 hover:border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">CSV Data</span>
          </button>

          <button
            onClick={onResetAll}
            title="Reset All Parameters"
            className="p-1.5 rounded-lg bg-[#2c1e16] hover:bg-amber-900/40 hover:shadow-lg hover:shadow-amber-700/20 border border-amber-900/60 text-slate-400 hover:text-amber-300 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ================= CENTRAL PLAYBACK CONSOLE BAR ================= */}
      <div className="w-full bg-slate-950 border-b border-amber-900/60/80 px-4 py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          {/* Main Run Real-Time button */}
          <button
            onClick={onTogglePlay}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-mono font-bold transition-all shadow-md ${
              isPlaying
                ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-amber-500/20'
                : 'bg-blue-500 hover:bg-blue-400 text-slate-950 shadow-blue-500/20'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause Real-Time</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run Real-Time</span>
              </>
            )}
          </button>

          {/* Step Backward */}
          <button
            onClick={onStepBackward}
            title="Step Backward (wt - 5°)"
            className="p-2 rounded-lg bg-[#2c1e16] hover:bg-amber-900/40 hover:shadow-lg hover:shadow-amber-700/20 hover:bg-slate-800 border border-amber-900/60 text-slate-300 transition"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Step Forward */}
          <button
            onClick={onStepForward}
            title="Step Forward (wt + 5°)"
            className="p-2 rounded-lg bg-[#2c1e16] hover:bg-amber-900/40 hover:shadow-lg hover:shadow-amber-700/20 hover:bg-slate-800 border border-amber-900/60 text-slate-300 transition"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Restart */}
          <button
            onClick={onRestart}
            title="Restart Cycle (wt = 0°)"
            className="p-2 rounded-lg bg-[#2c1e16] hover:bg-amber-900/40 hover:shadow-lg hover:shadow-amber-700/20 hover:bg-slate-800 border border-amber-900/60 text-slate-300 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Frequency Control (Replaced Speed Slider) */}
        <div className="flex items-center gap-3 bg-[#2c1e16] hover:bg-amber-900/40 hover:shadow-lg hover:shadow-amber-700/20/80 border border-amber-900/60 px-3 py-1 rounded-lg text-xs font-mono">
          <span className="text-slate-400 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Freq:</span>
          </span>

          <input
            type="range"
            min="10"
            max="400"
            step="5"
            value={frequency}
            onChange={(e) => onChangeFrequency(Number(e.target.value))}
            className="w-24 md:w-36 accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />

          <span className="text-cyan-300 font-bold min-w-[36px]">
            {frequency}Hz
          </span>

          <div className="flex items-center gap-1 border-l border-amber-900/60 pl-2">
            {freqOptions.map((f) => (
              <button
                key={f}
                onClick={() => onChangeFrequency(f)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                  Math.abs(frequency - f) < 0.1
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-amber-900/60'
                }`}
              >
                {f}Hz
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
