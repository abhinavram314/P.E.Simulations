import React, { useEffect, useRef, useState } from 'react';
import { TopologyId, SimulationStep, HarmonicComponent, PowerMetrics } from '../types/powerTypes';
import { Settings2, Maximize2, Minimize2, Activity } from 'lucide-react';

interface OscilloscopeViewProps {
  topology: TopologyId;
  steps: SimulationStep[];
  currentStepIndex: number;
  harmonics: HarmonicComponent[];
  metrics: PowerMetrics;
  onScrubPhase: (phaseDeg: number) => void;
  numCycles: number;
  onChangeCycles: (c: number) => void;
}

export const OscilloscopeView: React.FC<OscilloscopeViewProps> = ({
  topology,
  steps,
  currentStepIndex,
  onScrubPhase,
  numCycles,
  onChangeCycles,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1000, height: 650 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setCanvasSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isFullscreen]);

  const activeStep = hoverIndex !== null && steps[hoverIndex] ? steps[hoverIndex] : steps[currentStepIndex];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || steps.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    const is3Phase = topology.startsWith('3P') || topology === 'PWM_AFE_BOOST';
    const numPanels = is3Phase ? 5 : 4;
    const panelH = height / numPanels;

    // Draw Graticule
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    for (let c = 0; c <= 12; c++) {
      const x = (c * width) / 12;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let r = 0; r <= numPanels * 2; r++) {
      const y = r * (panelH / 2);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Zero-Volt lines
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    for (let p = 0; p < numPanels; p++) {
      const centerY = p * panelH + panelH / 2;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();
    }

    const mapX = (i: number) => (i / (steps.length - 1)) * width;

    // Draw helper (Dynamic Sweep Effect)
    const drawWaveform = (
      dataFn: (s: SimulationStep) => number,
      maxVal: number,
      panelIdx: number,
      color: string,
      lineWidth: number
    ) => {
      // 1. Draw "Old" faded trace (future data being overwritten)
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.2; // Faded
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      for (let i = currentStepIndex; i < steps.length; i++) {
        const x = mapX(i);
        const y = panelIdx * panelH + panelH / 2 - (dataFn(steps[i]) / maxVal) * (panelH * 0.45);
        if (i === currentStepIndex) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      
      // 2. Draw "New" bright trace (sweeping from left)
      ctx.globalAlpha = 1.0;
      ctx.beginPath();
      for (let i = 0; i <= currentStepIndex; i++) {
        const x = mapX(i);
        const y = panelIdx * panelH + panelH / 2 - (dataFn(steps[i]) / maxVal) * (panelH * 0.45);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // 3. Draw bright beam dot at the leading edge
      if (currentStepIndex < steps.length) {
        const hx = mapX(currentStepIndex);
        const hy = panelIdx * panelH + panelH / 2 - (dataFn(steps[currentStepIndex]) / maxVal) * (panelH * 0.45);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(hx, hy, lineWidth * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawLabel = (text: string, panelIdx: number, color: string = '#cbd5e1', yOffset: number = 16) => {
      ctx.fillStyle = color;
      ctx.font = '11px monospace';
      ctx.fillText(text, 10, panelIdx * panelH + yOffset);
    };

    if (is3Phase) {
      const maxV_AC = Math.max(10, ...steps.map(s => Math.max(Math.abs(s.vsa), Math.abs(s.vsb), Math.abs(s.vsc)))) * 1.1;
      const maxV_Line = Math.max(10, ...steps.map(s => Math.max(Math.abs(s.vsa - s.vsb), Math.abs(s.vsb - s.vsc), Math.abs(s.vsc - s.vsa)))) * 1.1;
      const maxI_AC = Math.max(1, ...steps.map(s => Math.max(Math.abs(s.isa), Math.abs(s.isb), Math.abs(s.isc)))) * 1.2;
      const maxV_DC = Math.max(10, ...steps.map(s => Math.abs(s.vo))) * 1.1;
      const maxI_DC = Math.max(1, ...steps.map(s => Math.abs(s.io))) * 1.2;

      // Phase Voltages
      drawWaveform(s => s.vsa, maxV_AC, 0, '#06b6d4', 2.0); // Cyan
      drawWaveform(s => s.vsb, maxV_AC, 0, '#10b981', 2.0); // Emerald
      drawWaveform(s => s.vsc, maxV_AC, 0, '#f59e0b', 2.0); // Amber
      drawLabel('AC Phase Voltages (vsa, vsb, vsc)', 0);

      // Line Voltages
      drawWaveform(s => s.vsa - s.vsb, maxV_Line, 1, '#6366f1', 2.0); // Indigo
      drawWaveform(s => s.vsb - s.vsc, maxV_Line, 1, '#ec4899', 2.0); // Pink
      drawWaveform(s => s.vsc - s.vsa, maxV_Line, 1, '#8b5cf6', 2.0); // Violet
      drawLabel('AC Line Voltages (vab, vbc, vca)', 1);

      // Phase Currents
      drawWaveform(s => s.isa, maxI_AC, 2, '#38bdf8', 2.0);
      drawWaveform(s => s.isb, maxI_AC, 2, '#34d399', 2.0);
      drawWaveform(s => s.isc, maxI_AC, 2, '#fbbf24', 2.0);
      drawLabel('AC Phase Currents (isa, isb, isc)', 2);

      // DC Voltage
      drawWaveform(s => s.vo, maxV_DC, 3, '#f59e0b', 2.5);
      drawLabel('DC Load Voltage (vo)', 3);

      // DC Current
      drawWaveform(s => s.io, maxI_DC, 4, '#10b981', 2.5);
      drawLabel('DC Load Current (io)', 4);
    } else {
      const maxV_AC = Math.max(10, ...steps.map(s => Math.abs(s.vs))) * 1.1;
      const maxI_AC = Math.max(1, ...steps.map(s => Math.abs(s.is))) * 1.2;
      const maxV_DC = Math.max(10, ...steps.map(s => Math.abs(s.vo))) * 1.1;
      const maxI_DC = Math.max(1, ...steps.map(s => Math.abs(s.io))) * 1.2;

      drawWaveform(s => s.vs, maxV_AC, 0, '#06b6d4', 2.0);
      drawLabel('AC Source Voltage (vs)', 0);

      drawWaveform(s => s.is, maxI_AC, 1, '#38bdf8', 2.0);
      drawLabel('AC Source Current (is)', 1);

      drawWaveform(s => s.vo, maxV_DC, 2, '#f59e0b', 2.5);
      drawLabel('DC Load Voltage (vo)', 2);

      drawWaveform(s => s.io, maxI_DC, 3, '#10b981', 2.5);
      drawLabel('DC Load Current (io)', 3);
    }

    // Cursor
    const currentX = mapX(currentStepIndex);
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(currentX, 0);
    ctx.lineTo(currentX, height);
    ctx.stroke();
    ctx.setLineDash([]);

    if (hoverIndex !== null && mousePos) {
      const hx = mapX(hoverIndex);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(hx, 0);
      ctx.lineTo(hx, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, mousePos.y);
      ctx.lineTo(width, mousePos.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [steps, topology, currentStepIndex, hoverIndex, mousePos, canvasSize]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });
    const idx = Math.floor((x / rect.width) * steps.length);
    setHoverIndex(Math.max(0, Math.min(steps.length - 1, idx)));
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setMousePos(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoverIndex !== null && steps[hoverIndex]) {
      onScrubPhase(steps[hoverIndex].wtDeg);
    }
  };

  return (
    <div className={`flex flex-col bg-[#2c1e16] border border-amber-900/40 rounded-xl overflow-hidden shadow-2xl shadow-orange-950/40 relative transition-all ${isFullscreen ? 'fixed inset-0 z-50 h-screen w-screen rounded-none' : 'h-full'}`}>
      <div className="bg-[#1a120b] px-4 py-2 border-b border-slate-800 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-500" />
          <span className="text-xs font-bold text-slate-200 tracking-wider">OSCILLOSCOPE</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-amber-300 font-mono">CYCLES:</span>
            <div className="flex bg-[#2c1e16] rounded border border-amber-900/40">
              {[1, 2, 3, 4, 6].map(c => (
                <button
                  key={c}
                  onClick={() => onChangeCycles(c)}
                  className={`px-2 py-0.5 text-[10px] font-bold transition ${numCycles === c ? 'bg-orange-600 text-white' : 'text-amber-300 hover:text-white'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          {isFullscreen ? (
            <button
              onClick={() => setIsFullscreen(false)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-red-950/80 border border-red-800/80 text-red-300 hover:bg-red-900 hover:text-red-100 transition shadow-md shadow-red-900/20"
            >
              <Minimize2 className="w-4 h-4" />
              <span className="text-xs font-bold font-mono">EXIT ENLARGED</span>
            </button>
          ) : (
            <button
              onClick={() => setIsFullscreen(true)}
              title="Expand Waveforms"
              className="p-1 rounded bg-amber-900/30 text-amber-200 hover:text-white hover:bg-amber-700/50 transition"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <div ref={containerRef} className="relative flex-1 w-full bg-[#1a120b] p-2 cursor-crosshair">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="w-full h-full object-fill rounded shadow-inner"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        />
        {activeStep && (
          <div className="absolute top-4 right-4 bg-[#2c1e16]/90 border border-amber-800/60 shadow-lg shadow-amber-900/20 p-3 rounded-lg backdrop-blur-md shadow-2xl pointer-events-none text-[10px] font-mono grid grid-cols-2 gap-x-6 gap-y-1 z-20">
            <div className="text-amber-300">Phase (ωt)</div>
            <div className="text-yellow-400 font-bold text-right">{activeStep.wtDeg.toFixed(1)}°</div>
            <div className="text-amber-300">Time (ms)</div>
            <div className="text-cyan-300 font-bold text-right">{(activeStep.time * 1000).toFixed(2)}</div>
            <div className="text-amber-300">Load Volts (vo)</div>
            <div className="text-amber-400 font-bold text-right">{activeStep.vo.toFixed(1)} V</div>
            <div className="text-amber-300">Load Amps (io)</div>
            <div className="text-emerald-400 font-bold text-right">{activeStep.io.toFixed(2)} A</div>
            {topology.startsWith('1P') && (
              <>
                <div className="text-amber-300">Source Volts (vs)</div>
                <div className="text-cyan-400 font-bold text-right">{activeStep.vs.toFixed(1)} V</div>
              </>
            )}
            {topology.startsWith('3P') && (
              <>
                <div className="text-amber-300">Source (vsa)</div>
                <div className="text-cyan-400 font-bold text-right">{activeStep.vsa.toFixed(1)} V</div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
