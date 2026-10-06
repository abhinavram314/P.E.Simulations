/**
 * PowerLab - Park d-q & Clarke α-β Space Vector Trajectory Modal
 * Polar space vector visualization of 3-phase grid voltages and currents
 * in stationary Clarke frame and synchronous rotating Park frame.
 */

import React, { useRef, useEffect } from 'react';
import { SimulationResult, SimulationStep } from '../types/powerTypes';
import { Compass, X, Play, RotateCw } from 'lucide-react';

interface ParkVectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: SimulationResult;
  currentStep: SimulationStep;
}

export const ParkVectorModal: React.FC<ParkVectorModalProps> = ({
  isOpen,
  onClose,
  result,
  currentStep,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.4;

    // Clear
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, width, height);

    // Concentric polar grid circles
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    [0.25, 0.5, 0.75, 1.0].forEach((rRatio) => {
      ctx.beginPath();
      ctx.arc(cx, cy, radius * rRatio, 0, 2 * Math.PI);
      ctx.stroke();
    });

    // Radial spokes (every 30 deg)
    for (let deg = 0; deg < 360; deg += 30) {
      const rad = (deg * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + radius * Math.cos(rad), cy + radius * Math.sin(rad));
      ctx.stroke();
    }

    // Clarke Axes: alpha (horizontal) & beta (vertical)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    // Alpha axis
    ctx.beginPath();
    ctx.moveTo(cx - radius * 1.1, cy);
    ctx.lineTo(cx + radius * 1.1, cy);
    ctx.stroke();
    // Beta axis
    ctx.beginPath();
    ctx.moveTo(cx, cy - radius * 1.1);
    ctx.lineTo(cx, cy + radius * 1.1);
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = '11px monospace';
    ctx.fillText('+α', cx + radius * 1.12, cy + 4);
    ctx.fillText('+β', cx - 8, cy - radius * 1.12);

    // Trajectory trace of Voltage Space Vector (Valpha, Vbeta)
    const { valpha, vbeta, ialpha, ibeta } = result.parkVector;
    const maxVal = Math.max(1, ...valpha.map(Math.abs), ...vbeta.map(Math.abs));

    if (valpha.length > 0) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let k = 0; k < valpha.length; k++) {
        const x = cx + (valpha[k] / maxVal) * radius;
        const y = cy - (vbeta[k] / maxVal) * radius;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Trajectory trace of Current Space Vector (Ialpha, Ibeta)
    const maxI = Math.max(0.1, ...ialpha.map(Math.abs), ...ibeta.map(Math.abs));
    if (ialpha.length > 0) {
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let k = 0; k < ialpha.length; k++) {
        const x = cx + (ialpha[k] / maxI) * radius * 0.85;
        const y = cy - (ibeta[k] / maxI) * radius * 0.85;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Instantaneous Rotating Phasors
    const theta = currentStep.wt;

    // Synchronous Rotating d-q axes
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.7)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    // d-axis (aligned with rotating angle theta)
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + radius * Math.cos(theta), cy - radius * Math.sin(theta));
    ctx.stroke();
    ctx.fillStyle = '#eab308';
    ctx.fillText('d-axis', cx + (radius + 10) * Math.cos(theta), cy - (radius + 10) * Math.sin(theta));

    // q-axis (orthogonal: theta + pi/2)
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + radius * Math.cos(theta + Math.PI / 2), cy - radius * Math.sin(theta + Math.PI / 2));
    ctx.stroke();
    ctx.fillText('q-axis', cx + (radius + 10) * Math.cos(theta + Math.PI / 2), cy - (radius + 10) * Math.sin(theta + Math.PI / 2));
    ctx.setLineDash([]);

    // Instantaneous Voltage Vector Arrow
    const curValpha = (2 / 3) * (currentStep.vsa - 0.5 * currentStep.vsb - 0.5 * currentStep.vsc);
    const curVbeta = (2 / 3) * ((Math.sqrt(3) / 2) * (currentStep.vsb - currentStep.vsc));
    const vx = cx + (curValpha / maxVal) * radius;
    const vy = cy - (curVbeta / maxVal) * radius;

    ctx.strokeStyle = '#38bdf8';
    ctx.fillStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(vx, vy);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(vx, vy, 5, 0, 2 * Math.PI);
    ctx.fill();

    // Instantaneous Current Vector Arrow
    const curIalpha = (2 / 3) * (currentStep.isa - 0.5 * currentStep.isb - 0.5 * currentStep.isc);
    const curIbeta = (2 / 3) * ((Math.sqrt(3) / 2) * (currentStep.isb - currentStep.isc));
    const ix = cx + (curIalpha / maxI) * radius * 0.85;
    const iy = cy - (curIbeta / maxI) * radius * 0.85;

    ctx.strokeStyle = '#10b981';
    ctx.fillStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ix, iy);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(ix, iy, 5, 0, 2 * Math.PI);
    ctx.fill();
  }, [isOpen, result, currentStep]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-500/10 rounded-lg text-sky-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-mono">
                Park (d-q) & Clarke (α-β) Space Vector Vectorial Engine
              </h2>
              <p className="text-xs text-slate-400">
                Rotating Reference Frame Trajectory & Orthogonal Projections
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Canvas Polar Display */}
          <div className="md:col-span-2 flex items-center justify-center bg-slate-950 rounded-xl p-2 border border-slate-800 shadow-inner">
            <canvas ref={canvasRef} width={460} height={420} className="w-full h-auto max-w-[460px]" />
          </div>

          {/* Right Vector Telemetry Pane */}
          <div className="space-y-4 font-mono text-xs">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-sky-400 font-bold block text-sm">Voltage Space Vector v_s</span>
              <div className="flex justify-between text-slate-300">
                <span>Phase A:</span>
                <span>{currentStep.vsa.toFixed(1)} V</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Phase B:</span>
                <span>{currentStep.vsb.toFixed(1)} V</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Phase C:</span>
                <span>{currentStep.vsc.toFixed(1)} V</span>
              </div>
              <div className="pt-1 border-t border-slate-800 flex justify-between text-sky-300 font-semibold">
                <span>Magnitude |V_s|:</span>
                <span>{(Math.hypot(currentStep.vsa, currentStep.vsb, currentStep.vsc) * Math.sqrt(2 / 3)).toFixed(1)} V</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-emerald-400 font-bold block text-sm">Current Space Vector i_s</span>
              <div className="flex justify-between text-slate-300">
                <span>i_sa:</span>
                <span>{currentStep.isa.toFixed(2)} A</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>i_sb:</span>
                <span>{currentStep.isb.toFixed(2)} A</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>i_sc:</span>
                <span>{currentStep.isc.toFixed(2)} A</span>
              </div>
              <div className="pt-1 border-t border-slate-800 flex justify-between text-emerald-300 font-semibold">
                <span>Magnitude |I_s|:</span>
                <span>{currentStep.io.toFixed(2)} A</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 text-slate-400">
              <span className="text-amber-400 font-bold block">Synchronous Frame Angle (θ)</span>
              <div className="text-slate-200 text-sm font-bold">
                wt = {currentStep.wtDeg.toFixed(1)}° ({(currentStep.wt).toFixed(3)} rad)
              </div>
              <p className="text-[11px] leading-relaxed">
                In PWM AFE and synchronous machines, rotating d-q decoupling allows independent control of torque/active power (d-axis) and flux/reactive power (q-axis).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
