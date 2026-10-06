/**
 * PowerLab - Rigorous Power Electronics & Semiconductor Physics Laboratory
 * Principal Application Component integrating State-Space Solver Kernel,
 * Dynamic Vector Schematic, Multi-Channel Oscilloscope, Parametric Controls, and Telemetry.
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  TopologyId,
  GridParams,
  SemiconductorParams,
  LoadParams,
  ConverterControls,
} from './types/powerTypes';
import { simulateConverter } from './engine/physicsEngine';
import { HeaderConsole, ViewMode } from './components/HeaderConsole';
import { SchematicCanvas } from './components/SchematicCanvas';
import { OscilloscopeView } from './components/OscilloscopeView';
import { ParametricControls } from './components/ParametricControls';
import { PhysicalMetricsGrid } from './components/PhysicalMetricsGrid';
import { LatexDerivationsModal } from './components/LatexDerivationsModal';
import { ParkVectorModal } from './components/ParkVectorModal';
import { SpiceNetlistModal } from './components/SpiceNetlistModal';

export default function App() {
  // Top-Level Topology Selection (Matching RectifierLab initial state)
  const [topology, setTopology] = useState<TopologyId>('1P_HALF_WAVE');
  
  // View Mode
  const [viewMode, setViewMode] = useState<ViewMode>('HYBRID');

  // Physical Parameters State
  const [grid, setGrid] = useState<GridParams>({
    vRms: 230,
    frequency: 50,
    sourceInductanceLs: 0.0015, // 1.5 mH
    sourceResistanceRs: 0.05,
  });

  const [semi, setSemi] = useState<SemiconductorParams>({
    vf0: 1.0,
    rd: 0.015,
    trr: 2e-6,
    qrr: 25e-6,
    latchingCurrentIl: 0.15,
    holdingCurrentIh: 0.08,
    turnOffTimeTq: 40e-6,
    enableSnubber: true,
    snubberRs: 47,
    snubberCs: 100e-9,
  });

  const [load, setLoad] = useState<LoadParams>({
    type: 'RL',
    r: 15,
    l: 0.035, // 35 mH
    e: 15, // 15V Back-EMF
    c: 220e-6,
  });

  const [controls, setControls] = useState<ConverterControls>({
    firingAngleAlpha: 30, // 30 deg as in RectifierLab screenshot
    pwmModulationIndex: 0.85,
    pwmCarrierFreq: 1500,
    dualConverterMode: 'non_circulating',
    quadrantTarget: 1,
    enableFwd: true, // Freewheeling Diode Connected
  });

  // Playback & Clock State
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [phaseDeg, setPhaseDeg] = useState<number>(0);

  // Modals
  const [showDerivations, setShowDerivations] = useState<boolean>(false);
  const [showParkVector, setShowParkVector] = useState<boolean>(false);
  const [showSpiceNetlist, setShowSpiceNetlist] = useState<boolean>(false);

  // Number of cycles to loop over (can be dynamically toggled)
  const [numCycles, setNumCycles] = useState<number>(3);
  const maxPhaseDeg = 360 * numCycles;

  // Run Physics Engine Simulation Kernel
  const simulationResult = useMemo(() => {
    return simulateConverter(topology, grid, semi, load, controls, numCycles);
  }, [topology, grid, semi, load, controls, numCycles]);

  // Current Step index in the 1080*numCycles-point cycle
  const currentStepIndex = useMemo(() => {
    const totalSteps = simulationResult.steps.length;
    if (totalSteps === 0) return 0;
    const normDeg = ((phaseDeg % maxPhaseDeg) + maxPhaseDeg) % maxPhaseDeg;
    const idx = Math.floor((normDeg / maxPhaseDeg) * totalSteps);
    return Math.max(0, Math.min(totalSteps - 1, idx));
  }, [phaseDeg, maxPhaseDeg, simulationResult.steps.length]);

  const currentStep = simulationResult.steps[currentStepIndex] || simulationResult.steps[0];

  // Animation Loop (requestAnimationFrame)
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    let animFrameId: number;

    const tick = (now: number) => {
      if (lastTimeRef.current !== null && isPlaying) {
        const deltaSec = (now - lastTimeRef.current) / 1000;
        // visualSpeedFactor scales real-time physics to naked-eye observable speed
        const visualSpeedFactor = 0.005; 
        const dDeg = grid.frequency * 360 * deltaSec * visualSpeedFactor;
        setPhaseDeg((prev) => (prev + dDeg) % maxPhaseDeg);
      }
      lastTimeRef.current = now;
      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameId);
  }, [isPlaying, grid.frequency, maxPhaseDeg]);

  // Playback handlers
  const handleTogglePlay = () => setIsPlaying((p) => !p);
  const handleStepForward = () => setPhaseDeg((prev) => (prev + 5) % maxPhaseDeg);
  const handleStepBackward = () => setPhaseDeg((prev) => (prev - 5 + maxPhaseDeg) % maxPhaseDeg);
  const handleRestart = () => setPhaseDeg(0);
  const handleScrubPhase = useCallback((deg: number) => {
    setIsPlaying(false);
    setPhaseDeg(((deg % maxPhaseDeg) + maxPhaseDeg) % maxPhaseDeg);
  }, [maxPhaseDeg]);

  const handleToggleFwd = () => {
    setControls((prev) => ({ ...prev, enableFwd: !prev.enableFwd }));
  };

  // Reset defaults handler
  const handleResetDefaults = () => {
    setGrid({
      vRms: 230,
      frequency: 50,
      sourceInductanceLs: 0.0015,
      sourceResistanceRs: 0.05,
    });
    setSemi({
      vf0: 1.0,
      rd: 0.015,
      trr: 2e-6,
      qrr: 25e-6,
      latchingCurrentIl: 0.15,
      holdingCurrentIh: 0.08,
      turnOffTimeTq: 40e-6,
      enableSnubber: true,
      snubberRs: 47,
      snubberCs: 100e-9,
    });
    setLoad({
      type: 'RL',
      r: 15,
      l: 0.035,
      e: 15,
      c: 220e-6,
    });
    setControls({
      firingAngleAlpha: 30,
      pwmModulationIndex: 0.85,
      pwmCarrierFreq: 1500,
      dualConverterMode: 'non_circulating',
      quadrantTarget: 1,
      enableFwd: true,
    });
    setPhaseDeg(0);
  };

  // CSV Vector Export
  const handleExportCsv = () => {
    const headers = [
      'phase_deg',
      'time_ms',
      'vs_V',
      'vo_V',
      'is_A',
      'io_A',
      'vt1_V',
      'ig1_A',
      'active_pair',
      'overlap_commutation',
    ];
    const rows = simulationResult.steps.map((s) => [
      s.wtDeg.toFixed(2),
      (s.time * 1000).toFixed(4),
      s.vs.toFixed(2),
      s.vo.toFixed(2),
      s.is.toFixed(3),
      s.io.toFixed(3),
      s.vt1.toFixed(2),
      s.ig1,
      s.activePairName,
      s.isOverlapping ? 1 : 0,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `powerlab_${topology.toLowerCase()}_waveforms.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#1a120b] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 1. STUDIO HEADER & PLAYBACK CONSOLE */}
      <HeaderConsole
        topology={topology}
        onSelectTopology={setTopology}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onStepForward={handleStepForward}
        onStepBackward={handleStepBackward}
        onRestart={handleRestart}
        frequency={grid.frequency}
        onChangeFrequency={(f) => setGrid((prev) => ({ ...prev, frequency: f }))}
        onOpenDerivations={() => setShowDerivations(true)}
        onOpenParkVector={() => setShowParkVector(true)}
        onOpenSpiceNetlist={() => setShowSpiceNetlist(true)}
        onExportCsv={handleExportCsv}
        onResetAll={handleResetDefaults}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
      />

      {/* MAIN SCIENTIFIC LABORATORY WORKSPACE */}
      <main className={`flex-1 p-3 md:p-4 gap-4 w-full mx-auto flex flex-col ${viewMode === 'HYBRID' ? 'max-w-full overflow-y-auto' : 'max-w-[1720px] overflow-y-auto'}`}>
        
        {viewMode === 'HYBRID' ? (
          /* HYBRID MODE: Full Screen 50/50 Split with Bottom Controls */
          <div className="flex flex-col gap-4">
            <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-4 min-h-[600px] h-[75vh]">
              <div className="flex flex-col min-h-0 bg-[#2c1e16] border border-amber-900/40 rounded-xl overflow-hidden shadow-2xl shadow-orange-950/50 relative">
                <SchematicCanvas
                  topology={topology}
                  currentStep={currentStep}
                  metrics={simulationResult.metrics}
                  grid={grid}
                  semi={semi}
                  load={load}
                  controls={controls}
                  onToggleFwd={handleToggleFwd}
                />
              </div>
              <div className="flex flex-col min-h-0">
                <OscilloscopeView
                  topology={topology}
                  steps={simulationResult.steps}
                  currentStepIndex={currentStepIndex}
                  harmonics={simulationResult.harmonicsSourceCurrent}
                  metrics={simulationResult.metrics}
                  onScrubPhase={handleScrubPhase}
                  numCycles={numCycles}
                  onChangeCycles={setNumCycles}
                />
              </div>
            </div>

            {/* Bottom Controls & Metrics (Hybrid Mode) */}
            <div className="mt-2 w-full max-w-[1720px] mx-auto flex flex-col gap-4">
              <ParametricControls
                topology={topology}
                onSelectTopology={setTopology}
                grid={grid}
                semi={semi}
                load={load}
                controls={controls}
                currentStep={currentStep}
                onChangeGrid={(g) => setGrid((prev) => ({ ...prev, ...g }))}
                onChangeSemi={(s) => setSemi((prev) => ({ ...prev, ...s }))}
                onChangeLoad={(l) => setLoad((prev) => ({ ...prev, ...l }))}
                onChangeControls={(c) => setControls((prev) => ({ ...prev, ...c }))}
                layout="horizontal"
              />
              <PhysicalMetricsGrid
                topology={topology}
                metrics={simulationResult.metrics}
                grid={grid}
                controls={controls}
                layout="horizontal"
              />
            </div>
          </div>
        ) : (
          /* SINGLE MODE: Left Sidebar Controls + Main Viewer */
          <div className="flex flex-col xl:flex-row gap-4 h-full">
            {/* Sidebar Controls */}
            <div className="w-full xl:w-[380px] flex-shrink-0 flex flex-col gap-4">
              <ParametricControls
                topology={topology}
                onSelectTopology={setTopology}
                grid={grid}
                semi={semi}
                load={load}
                controls={controls}
                currentStep={currentStep}
                onChangeGrid={(g) => setGrid((prev) => ({ ...prev, ...g }))}
                onChangeSemi={(s) => setSemi((prev) => ({ ...prev, ...s }))}
                onChangeLoad={(l) => setLoad((prev) => ({ ...prev, ...l }))}
                onChangeControls={(c) => setControls((prev) => ({ ...prev, ...c }))}
                layout="vertical"
              />
              <PhysicalMetricsGrid
                topology={topology}
                metrics={simulationResult.metrics}
                grid={grid}
                controls={controls}
                layout="vertical"
              />
            </div>
            
            {/* Main Viewer */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0">
              {viewMode === 'SCHEMATIC' && (
                <div className="flex-1 flex flex-col bg-[#2c1e16] border border-amber-900/40 rounded-xl overflow-hidden shadow-2xl shadow-orange-950/50 relative min-h-[500px]">
                  <SchematicCanvas
                    topology={topology}
                    currentStep={currentStep}
                    metrics={simulationResult.metrics}
                    grid={grid}
                    semi={semi}
                    load={load}
                    controls={controls}
                    onToggleFwd={handleToggleFwd}
                  />
                </div>
              )}
              {viewMode === 'WAVEFORMS' && (
                <div className="flex-1 flex flex-col min-h-[500px]">
                  <OscilloscopeView
                    topology={topology}
                    steps={simulationResult.steps}
                    currentStepIndex={currentStepIndex}
                    harmonics={simulationResult.harmonicsSourceCurrent}
                    metrics={simulationResult.metrics}
                    onScrubPhase={handleScrubPhase}
                    numCycles={numCycles}
                    onChangeCycles={setNumCycles}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* VIEW MODALS */}
      <LatexDerivationsModal
        isOpen={showDerivations}
        onClose={() => setShowDerivations(false)}
        topology={topology}
      />

      <ParkVectorModal
        isOpen={showParkVector}
        onClose={() => setShowParkVector(false)}
        result={simulationResult}
        currentStep={currentStep}
      />

      <SpiceNetlistModal
        isOpen={showSpiceNetlist}
        onClose={() => setShowSpiceNetlist(false)}
        topology={topology}
        grid={grid}
        semi={semi}
        load={load}
        controls={controls}
      />
    </div>
  );
}
