/**
 * PowerLab - Rigorous Power Electronics & Semiconductor Physics Laboratory
 * Comprehensive Types for Topologies, Switches, Magnetics, and Solvers
 */

export type TopologyId =
  | '1P_HALF_WAVE'
  | '1P_CENTER_TAP'
  | '1P_FULL_BRIDGE_DIODE'
  | '1P_FULL_BRIDGE_SCR'
  | '1P_SEMI_CONVERTER_SYM'
  | '1P_SEMI_CONVERTER_ASYM'
  | '3P_STAR_3PULSE'
  | '3P_FULL_BRIDGE_6PULSE'
  | '3P_SEMI_CONVERTER'
  | '3P_12PULSE_DUAL'
  | 'DUAL_CONVERTER_4Q'
  | 'PWM_AFE_BOOST';

export type LoadType = 'R' | 'RL' | 'RLE' | 'RC' | 'RLC';

export interface GridParams {
  vRms: number; // RMS Line-to-Neutral or Line-to-Line (V)
  frequency: number; // Hz (e.g. 50 or 60)
  sourceInductanceLs: number; // H (Source line inductance)
  sourceResistanceRs: number; // Ohm (Source line resistance)
}

export interface SemiconductorParams {
  vf0: number; // Forward threshold voltage drop (V)
  rd: number; // Dynamic on-state resistance (Ohm)
  trr: number; // Reverse recovery time (s)
  qrr: number; // Reverse recovery charge (C)
  latchingCurrentIl: number; // Latching current (A)
  holdingCurrentIh: number; // Holding current (A)
  turnOffTimeTq: number; // Device turn-off time (s)
  enableSnubber: boolean; // RC Snubber enabled
  snubberRs: number; // Snubber resistance (Ohm)
  snubberCs: number; // Snubber capacitance (F)
}

export interface LoadParams {
  type: LoadType;
  r: number; // Resistance (Ohm)
  l: number; // Inductance (H)
  e: number; // Back-EMF (V)
  c: number; // Filter capacitance (F)
}

export interface ConverterControls {
  firingAngleAlpha: number; // Gate trigger angle (deg, 0 - 180)
  extinctionBetaManual?: number; // Override if desired
  pwmModulationIndex: number; // For PWM AFE (ma, 0.1 - 1.2)
  pwmCarrierFreq: number; // Hz
  dualConverterMode: 'circulating' | 'non_circulating';
  quadrantTarget: 1 | 2 | 3 | 4;
  enableFwd: boolean; // Freewheeling diode D_FW connected
}

export interface SwitchState {
  id: string;
  name: string;
  isConducting: boolean;
  forwardCurrent: number;
  voltageStress: number;
  inReverseRecovery: boolean;
  snubberCurrent: number;
  gatePulseActive: boolean;
}

export interface HarmonicComponent {
  order: number;
  frequency: number;
  magnitude: number;
  rms: number;
  phaseDeg: number;
  thdContribution: number;
}

export interface SimulationStep {
  wt: number; // rad
  wtDeg: number; // degrees [0, 360)
  time: number; // seconds
  vs: number; // instantaneous source voltage
  vsa: number; // phase A (for 3-phase)
  vsb: number; // phase B
  vsc: number; // phase C
  vo: number; // instantaneous output dc voltage
  io: number; // instantaneous load current
  is: number; // instantaneous source current
  isa: number;
  isb: number;
  isc: number;
  vt1: number; // Voltage across primary switch T1
  ig1: number; // Gate pulse for switch T1
  isOverlapping: boolean; // Overlap commutation flag
  switchStates: SwitchState[];
  alphaRad: number;
  vCap: number; // capacitor voltage if filtered
  activePairName: string; // Active conduction pair (e.g. 'T1', 'DFW', 'T1-T2', 'T3-T4')
}

export interface PowerMetrics {
  vDc: number; // Average output voltage (V)
  vRms: number; // True RMS output voltage (V)
  iDc: number; // Average output current (A)
  iRms: number; // True RMS output current (A)
  isRms: number; // Source RMS current (A)
  is1Rms: number; // Fundamental source RMS current (A)
  pActive: number; // Active Power (W)
  qReactive: number; // Reactive Power (VAR)
  sApparent: number; // Apparent Power (VA)
  dpf: number; // Displacement Power Factor cos(phi_1)
  hf: number; // Distortion factor
  tpf: number; // True Power Factor (DPF * HF)
  thdCurrent: number; // Total Harmonic Distortion (%)
  formFactor: number; // Form factor FF = V_rms / V_dc
  rippleFactor: number; // Ripple Factor RF = sqrt(FF^2 - 1) * 100 (%)
  commutationOverlapMu: number; // Overlap angle mu (deg)
  commutationVoltageDrop: number; // Overlap voltage drop deltaV_dc (V)
  extinctionAngleBeta: number; // Extinction angle beta (deg)
  conductionMode: 'CCM' | 'DCM' | 'COMMUTATION_FAILURE';
  circuitCommutationTimeTc: number; // tc (us)
  turnOffMarginOk: boolean; // tc > tq check
  coreDcFluxPhiDc: number; // Transformer DC magnetizing bias flux (Wb)
  coreSaturationRisk: boolean;
  totalConductionLoss: number; // Switch conduction loss (W)
  totalSwitchingLoss: number; // Switch recovery / switching loss (W)
}

export interface SimulationResult {
  steps: SimulationStep[];
  metrics: PowerMetrics;
  harmonicsSourceCurrent: HarmonicComponent[];
  harmonicsOutputVoltage: HarmonicComponent[];
  parkVector: {
    valpha: number[];
    vbeta: number[];
    vd: number[];
    vq: number[];
    ialpha: number[];
    ibeta: number[];
  };
}
