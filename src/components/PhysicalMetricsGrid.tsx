/**
 * PowerLab - Physical Metrics & Analytical Telemetry Grid
 * 6 High-Impact Engineering Metric Cards & Bottom Theoretical Formula Banner
 * Exactly replicating RectifierLab's analytical presentation.
 */

import React, { useMemo } from 'react';
import {
  TopologyId,
  PowerMetrics,
  GridParams,
  ConverterControls,
} from '../types/powerTypes';
import { CheckCircle2, AlertTriangle, BookOpen } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';

interface PhysicalMetricsGridProps {
  topology: TopologyId;
  metrics: PowerMetrics;
  grid: GridParams;
  controls: ConverterControls;
  layout?: 'horizontal' | 'vertical';
}

export const PhysicalMetricsGrid: React.FC<PhysicalMetricsGridProps> = ({
  topology,
  metrics,
  grid,
  controls,
  layout = 'horizontal',
}) => {
  const Vm = Math.SQRT2 * grid.vRms;
  const alphaRad = (controls.firingAngleAlpha * Math.PI) / 180;
  const cosAlpha = Math.cos(alphaRad);

  // Analytical Ideal Theoretical V_dc formula and calculated value
  const { theoreticalTitle, theoreticalFormula, theoreticalVdc, theoreticalDesc } = useMemo(() => {
    let title = '1-Phase Fully-Controlled Bridge Converter — Analytical DC Voltage Equation';
    let formula = 'V_{dc} = \\frac{2\\,V_m}{\\pi}\\cos\\alpha';
    let vdc = ((2 * Vm) / Math.PI) * cosAlpha;
    let desc = 'Thyristor pairs conduct alternately during positive and negative half-cycles.';

    if (topology === '1P_HALF_WAVE') {
      if (controls.enableFwd) {
        title = '1-Phase Half-Wave Controlled Converter — Analytical DC Voltage Equation';
        formula = 'V_{dc} = \\frac{V_m}{2\\pi} (1 + \\cos\\alpha)';
        vdc = (Vm / (2 * Math.PI)) * (1 + cosAlpha);
        desc = 'Thyristor fired at angle α, conducting with freewheeling diode clamping output voltage to zero.';
      } else {
        title = '1-Phase Half-Wave Controlled Converter (RL Load without FWD)';
        formula = 'V_{dc} = \\frac{V_m}{2\\pi} (\\cos\\alpha - \\cos\\beta)';
        const betaRad = (metrics.extinctionAngleBeta * Math.PI) / 180;
        vdc = (Vm / (2 * Math.PI)) * (cosAlpha - Math.cos(betaRad));
        desc = 'Thyristor conducts from α to extinction angle β without freewheeling clamping.';
      }
    } else if (topology === '1P_FULL_BRIDGE_DIODE') {
      title = '1-Phase Full-Bridge Diode Rectifier — Analytical DC Voltage Equation';
      formula = 'V_{dc} = \\frac{2\\,V_m}{\\pi} = 0.9\\,V_{rms}';
      vdc = (2 * Vm) / Math.PI;
      desc = 'Uncontrolled diode bridge with natural commutation at voltage zero-crossings.';
    } else if (topology === '1P_SEMI_CONVERTER_SYM' || topology === '1P_SEMI_CONVERTER_ASYM') {
      title = '1-Phase Semi-Converter — Analytical DC Voltage Equation';
      formula = 'V_{dc} = \\frac{V_m}{\\pi} (1 + \\cos\\alpha)';
      vdc = (Vm / Math.PI) * (1 + cosAlpha);
      desc = 'Half-controlled bridge with internal freewheeling preventing negative output voltage.';
    } else if (topology === '3P_STAR_3PULSE') {
      title = '3-Phase 3-Pulse Star Converter — Analytical DC Voltage Equation';
      formula = 'V_{dc} = \\frac{3\\sqrt{3}\\,V_{ph,m}}{2\\pi}\\cos\\alpha = 0.827\\,V_{L,m}\\cos\\alpha';
      vdc = ((3 * Math.sqrt(3) * Vm) / (2 * Math.PI)) * cosAlpha;
      desc = '3-pulse star converter with neutral star return line.';
    } else if (topology === '3P_FULL_BRIDGE_6PULSE' || topology === 'DUAL_CONVERTER_4Q') {
      title = '3-Phase 6-Pulse Full-Bridge Converter — Analytical DC Voltage Equation';
      formula = 'V_{dc} = \\frac{3\\,V_{L,m}}{\\pi}\\cos\\alpha = 1.35\\,V_{L,rms}\\cos\\alpha';
      const VlinePeak = Math.sqrt(3) * Vm;
      vdc = ((3 * VlinePeak) / Math.PI) * cosAlpha;
      desc = 'Fully-controlled 6-pulse bridge with line-to-line commutation.';
    } else if (topology === '3P_SEMI_CONVERTER') {
      title = '3-Phase Semi-Converter — Analytical DC Voltage Equation';
      formula = 'V_{dc} = \\frac{3\\,V_{L,m}}{2\\pi} (1 + \\cos\\alpha)';
      const VlinePeak = Math.sqrt(3) * Vm;
      vdc = ((3 * VlinePeak) / (2 * Math.PI)) * (1 + cosAlpha);
      desc = 'Three thyristors and three diodes with freewheeling diodes.';
    } else if (topology === '3P_12PULSE_DUAL') {
      title = '3-Phase 12-Pulse Dual Converter — Analytical DC Voltage Equation';
      formula = 'V_{dc} = \\frac{6\\,V_{L,m}}{\\pi}\\cos\\alpha';
      const VlinePeak = Math.sqrt(3) * Vm;
      vdc = ((6 * VlinePeak) / Math.PI) * cosAlpha;
      desc = 'Series/Parallel 12-pulse converter with 30° star-delta phase cancellation.';
    } else if (topology === 'PWM_AFE_BOOST') {
      title = 'Active Front End (AFE) Boost Rectifier — Analytical Voltage Equation';
      formula = 'V_{dc} = \\frac{\\sqrt{3}\\,V_{L,m}}{m_a} = \\text{Boosted Link}';
      vdc = Math.sqrt(3) * Vm * 1.5;
      desc = 'Sinusoidal PWM bidirectional boost converter with unity power factor.';
    }

    return {
      theoreticalTitle: title,
      theoreticalFormula: formula,
      theoreticalVdc: Math.max(0, vdc),
      theoreticalDesc: desc,
    };
  }, [topology, Vm, cosAlpha, controls.enableFwd, metrics.extinctionAngleBeta]);

  return (
    <div className="space-y-4">
      {/* ================= 6 ENGINEERING METRIC CARDS ================= */}
      <div className={`grid gap-3 font-mono text-xs ${layout === 'vertical' ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'}`}>
        {/* Card 1: Avg DC Voltage */}
        <div className="p-3 rounded-xl bg-[#2c1e16]/90 border border-amber-900/40 shadow-lg shadow-amber-900/20 hover:shadow-amber-500/10 hover:border-amber-700/50 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-sans">Avg DC Voltage</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/60">
              V_dc
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-slate-100">{metrics.vDc.toFixed(1)} <span className="text-sm font-normal text-slate-400">V</span></div>
            <div className="text-[11px] text-slate-400 mt-0.5">V_rms = {metrics.vRms.toFixed(1)} V</div>
          </div>
        </div>

        {/* Card 2: Avg DC Current */}
        <div className="p-3 rounded-xl bg-[#2c1e16]/90 border border-amber-900/40 shadow-lg shadow-amber-900/20 hover:shadow-amber-500/10 hover:border-amber-700/50 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-sans">Avg DC Current</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60">
              I_dc
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-emerald-400">{metrics.iDc.toFixed(2)} <span className="text-sm font-normal text-slate-400">A</span></div>
            <div className="text-[11px] text-slate-400 mt-0.5">I_rms = {metrics.iRms.toFixed(2)} A</div>
          </div>
        </div>

        {/* Card 3: Output Power */}
        <div className="p-3 rounded-xl bg-[#2c1e16]/90 border border-amber-900/40 shadow-lg shadow-amber-900/20 hover:shadow-amber-500/10 hover:border-amber-700/50 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-sans">Output Power</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800/60">
              P_load
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-amber-400">{metrics.pActive.toFixed(1)} <span className="text-sm font-normal text-slate-400">W</span></div>
            <div className="text-[11px] text-slate-400 mt-0.5">S_in = {metrics.sApparent.toFixed(0)} VA</div>
          </div>
        </div>

        {/* Card 4: Power Factor */}
        <div className="p-3 rounded-xl bg-[#2c1e16]/90 border border-amber-900/40 shadow-lg shadow-amber-900/20 hover:shadow-amber-500/10 hover:border-amber-700/50 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-sans">Power Factor</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800/60">
              PF
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-purple-300">{metrics.tpf.toFixed(3)}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">cos(φ1) = {metrics.dpf.toFixed(3)}</div>
          </div>
        </div>

        {/* Card 5: Ripple Factor */}
        <div className="p-3 rounded-xl bg-[#2c1e16]/90 border border-amber-900/40 shadow-lg shadow-amber-900/20 hover:shadow-amber-500/10 hover:border-amber-700/50 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-sans">Ripple Factor</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800/60">
              RF
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-rose-400">{(metrics.rippleFactor / 100).toFixed(3)}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Form Factor FF = {metrics.formFactor.toFixed(2)}</div>
          </div>
        </div>

        {/* Card 6: Source THD_i */}
        <div className="p-3 rounded-xl bg-[#2c1e16]/90 border border-amber-900/40 shadow-lg shadow-amber-900/20 hover:shadow-amber-500/10 hover:border-amber-700/50 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-sans">Source THD_i</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/60">
              THD
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-cyan-400">{metrics.thdCurrent.toFixed(1)} <span className="text-sm font-normal text-slate-400">%</span></div>
            <div className="text-[11px] flex items-center gap-1 text-emerald-400 mt-0.5 font-semibold">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>{metrics.conductionMode === 'CCM' ? 'CCM Continuous' : 'DCM Discontinuous'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= BOTTOM THEORETICAL FORMULA BANNER ================= */}
      <div className="p-4 rounded-xl bg-[#2c1e16]/90 border border-amber-900/40 shadow-lg shadow-amber-900/20 hover:shadow-amber-500/10 hover:border-amber-700/50 transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left Explanation */}
        <div className="space-y-1 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span>{theoreticalTitle}</span>
          </div>
          <p className="text-xs text-slate-400 font-sans leading-relaxed">
            {theoreticalDesc}
          </p>
        </div>

        {/* Right Formula & Theoretical V_dc boxes */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto font-mono text-xs max-w-full">
          {/* Formula box */}
          <div className="p-2.5 rounded-lg bg-[#1a120b] border border-slate-800 space-y-0.5 overflow-x-auto max-w-full">
            <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">
              THEORETICAL FORMULA
            </span>
            <div className="text-xs sm:text-sm text-cyan-300 pt-2 pb-1 min-w-min whitespace-nowrap">
              <BlockMath math={theoreticalFormula} />
            </div>
          </div>

          {/* Theoretical value box */}
          <div className="p-2.5 rounded-lg bg-[#1a120b] border border-slate-800 space-y-0.5 min-w-[140px]">
            <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">
              IDEAL THEORETICAL V_DC
            </span>
            <div className="text-base sm:text-lg font-bold text-emerald-400">
              {theoreticalVdc.toFixed(1)} V
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
