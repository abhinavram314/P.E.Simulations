/**
 * PowerLab - Rigorous Power Electronics & Semiconductor Physics Kernel
 * State-space calculations, piecewise boundary solvers, transcendental DCM solvers,
 * commutation overlap dynamics, semiconductor switching transients, and DFT analysis.
 */

import {
  TopologyId,
  GridParams,
  SemiconductorParams,
  LoadParams,
  ConverterControls,
  SimulationStep,
  PowerMetrics,
  HarmonicComponent,
  SimulationResult,
  SwitchState,
} from '../types/powerTypes';

// Numerical constants
const BASE_POINTS = 1080; // High resolution for 1-cycle WT [0, 2PI] (3 points per degree)
const TWO_PI = 2 * Math.PI;

/**
 * Solves transcendental extinction equation for DCM in RL / RLE load:
 * f(beta) = sin(beta - phi) - sin(alpha - phi)*exp(-(beta - alpha)/(w*tau)) - (E/Vm)*(1 - exp(-(beta - alpha)/(w*tau))) = 0
 */
export function solveExtinctionAngleBeta(
  alphaRad: number,
  phi: number,
  wTau: number,
  eVmRatio: number,
  maxPeriodAngle: number
): { betaRad: number; isDcm: boolean } {
  // If wTau is negligible or pure R
  if (wTau < 1e-4) {
    // Pure R or R with negligible L
    // Current drops to 0 when sin(wt) <= eVmRatio
    const asinVal = Math.asin(Math.max(-1, Math.min(1, eVmRatio)));
    let beta = Math.PI - asinVal;
    while (beta <= alphaRad && beta < TWO_PI) {
      beta += Math.PI;
    }
    return {
      betaRad: Math.min(beta, alphaRad + maxPeriodAngle),
      isDcm: beta < alphaRad + maxPeriodAngle,
    };
  }

  const f = (b: number): number => {
    const expTerm = Math.exp(-(b - alphaRad) / wTau);
    return Math.sin(b - phi) - Math.sin(alphaRad - phi) * expTerm - eVmRatio * (1 - expTerm);
  };

  // Check at the boundary of next firing
  const fAtNext = f(alphaRad + maxPeriodAngle);
  if (fAtNext > 0.001) {
    // Current has not dropped to 0 before the next thyristor triggers -> Continuous Conduction Mode (CCM)
    return {
      betaRad: alphaRad + maxPeriodAngle,
      isDcm: false,
    };
  }

  // Use bisection / hybrid Newton-Raphson to find zero in (alphaRad, alphaRad + maxPeriodAngle)
  let low = alphaRad + 0.005;
  let high = alphaRad + maxPeriodAngle;
  let mid = (low + high) / 2;

  // Verify bracket
  const fLow = f(low);
  const fHigh = f(high);

  if (fLow * fHigh <= 0) {
    for (let iter = 0; iter < 40; iter++) {
      mid = (low + high) / 2;
      const fMid = f(mid);
      if (Math.abs(fMid) < 1e-5) break;
      if (fLow * fMid < 0) {
        high = mid;
      } else {
        low = mid;
      }
    }
    return { betaRad: mid, isDcm: true };
  }

  // Fallback stepping scan
  const steps = 100;
  const dAngle = (maxPeriodAngle - 0.01) / steps;
  let prevAngle = alphaRad + 0.01;
  let prevVal = f(prevAngle);

  for (let i = 1; i <= steps; i++) {
    const currAngle = alphaRad + 0.01 + i * dAngle;
    const currVal = f(currAngle);
    if (prevVal * currVal <= 0) {
      // Linear interpolation root
      const root = prevAngle - (prevVal * (currAngle - prevAngle)) / (currVal - prevVal);
      return { betaRad: root, isDcm: true };
    }
    prevAngle = currAngle;
    prevVal = currVal;
  }

  return { betaRad: alphaRad + maxPeriodAngle, isDcm: false };
}

/**
 * Calculates commutation overlap angle mu for a given topology
 */
export function calculateCommutationOverlap(
  alphaRad: number,
  omega: number,
  Ls: number,
  Idc: number,
  Vpeak: number,
  pulseNumber: number
): { muRad: number; deltaVdc: number } {
  if (Ls <= 1e-7 || Idc <= 1e-3 || Vpeak <= 1e-3) {
    return { muRad: 0, deltaVdc: 0 };
  }

  // For a controlled bridge: cos(alpha + mu) = cos(alpha) - (2 * omega * Ls * Idc) / Vpeak
  // (where Vpeak is line-to-line peak for bridge rectifiers)
  const factor = (2 * omega * Ls * Idc) / Vpeak;
  const cosAlpha = Math.cos(alphaRad);
  const cosAlphaPlusMu = cosAlpha - factor;

  let muRad = 0;
  if (cosAlphaPlusMu >= -1 && cosAlphaPlusMu <= 1) {
    const alphaPlusMu = Math.acos(cosAlphaPlusMu);
    muRad = Math.max(0, alphaPlusMu - alphaRad);
  } else if (cosAlphaPlusMu < -1) {
    // Commutation failure limit reached!
    muRad = Math.PI - alphaRad;
  }

  // Commutation voltage drop: Delta V_dc = (p / 2pi) * omega * Ls * Idc
  const deltaVdc = (pulseNumber / TWO_PI) * omega * Ls * Idc;

  return { muRad, deltaVdc };
}

/**
 * 64-Point Discrete Fourier Transform for extracting harmonics, THD, and Power Factor components
 */
export function computeDiscreteFourierTransform(
  signal: number[],
  dt: number,
  fundamentalFreq: number
): HarmonicComponent[] {
  const N = signal.length;
  const harmonics: HarmonicComponent[] = [];
  const maxHarmonic = 32;

  // Calculate fundamental component for THD reference
  let fundRms = 0;

  for (let h = 1; h <= maxHarmonic; h++) {
    let re = 0;
    let im = 0;

    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * h * n) / N;
      re += signal[n] * Math.cos(angle);
      im -= signal[n] * Math.sin(angle);
    }

    re = (2 / N) * re;
    im = (2 / N) * im;

    const magnitude = Math.hypot(re, im);
    const rms = magnitude / Math.SQRT2;
    const phaseRad = Math.atan2(im, re);
    const phaseDeg = (phaseRad * 180) / Math.PI;

    if (h === 1) {
      fundRms = Math.max(1e-5, rms);
    }

    const thdContribution = h === 1 ? 100 : (rms / fundRms) * 100;

    harmonics.push({
      order: h,
      frequency: h * fundamentalFreq,
      magnitude,
      rms,
      phaseDeg,
      thdContribution,
    });
  }

  return harmonics;
}

/**
 * Core dynamic physics simulation engine
 */
export function simulateConverter(
  topology: TopologyId,
  grid: GridParams,
  semi: SemiconductorParams,
  load: LoadParams,
  controls: ConverterControls,
  numCycles: number = 3
): SimulationResult {
  const omega = TWO_PI * grid.frequency;
  const alphaRad = (controls.firingAngleAlpha * Math.PI) / 180;
  const Vm = Math.SQRT2 * grid.vRms; // Peak phase or line voltage
  const R = Math.max(0.1, load.r);
  const L = Math.max(1e-5, load.l);
  const E = load.e;
  const tau = L / R;
  const wTau = omega * tau;
  const phi = Math.atan2(omega * L, R);

  // Setup arrays
  const steps: SimulationStep[] = [];
  
  const totalPoints = 1080 * numCycles;
  const dAngle = TWO_PI / 1080; // step size remains 1/3 degree
  const dt = 1 / (grid.frequency * 1080);

  // Pulse count based on topology
  let pulseNumber = 2;
  let periodAngle = Math.PI;

  switch (topology) {
    case '1P_HALF_WAVE':
      pulseNumber = 1;
      periodAngle = TWO_PI;
      break;
    case '1P_CENTER_TAP':
    case '1P_FULL_BRIDGE_DIODE':
    case '1P_FULL_BRIDGE_SCR':
    case '1P_SEMI_CONVERTER_SYM':
    case '1P_SEMI_CONVERTER_ASYM':
      pulseNumber = 2;
      periodAngle = Math.PI;
      break;
    case '3P_STAR_3PULSE':
      pulseNumber = 3;
      periodAngle = (2 * Math.PI) / 3;
      break;
    case '3P_FULL_BRIDGE_6PULSE':
    case '3P_SEMI_CONVERTER':
    case 'DUAL_CONVERTER_4Q':
      pulseNumber = 6;
      periodAngle = Math.PI / 3;
      break;
    case '3P_12PULSE_DUAL':
      pulseNumber = 12;
      periodAngle = Math.PI / 6;
      break;
    case 'PWM_AFE_BOOST':
      pulseNumber = 6;
      periodAngle = Math.PI / 3;
      break;
  }

  // Determine initial estimate of extinction angle beta
  const eVmRatio = Math.min(0.98, Math.max(-0.98, E / (Vm || 1)));
  const { betaRad, isDcm } = solveExtinctionAngleBeta(alphaRad, phi, wTau, eVmRatio, periodAngle);

  // Preliminary average current estimation for commutation overlap calculation
  let estimatedVdc = 0;
  if (topology === '1P_HALF_WAVE') {
    estimatedVdc = (Vm / TWO_PI) * (1 + Math.cos(alphaRad));
  } else if (topology === '1P_FULL_BRIDGE_SCR' || topology === '1P_CENTER_TAP') {
    estimatedVdc = ((2 * Vm) / Math.PI) * Math.cos(alphaRad);
  } else if (topology === '1P_FULL_BRIDGE_DIODE') {
    estimatedVdc = (2 * Vm) / Math.PI;
  } else if (topology === '1P_SEMI_CONVERTER_SYM' || topology === '1P_SEMI_CONVERTER_ASYM') {
    estimatedVdc = (Vm / Math.PI) * (1 + Math.cos(alphaRad));
  } else if (topology === '3P_STAR_3PULSE') {
    estimatedVdc = ((3 * Math.sqrt(3) * Vm) / (2 * Math.PI)) * Math.cos(alphaRad);
  } else if (topology === '3P_FULL_BRIDGE_6PULSE' || topology === 'DUAL_CONVERTER_4Q') {
    const VlinePeak = Math.sqrt(3) * Vm;
    estimatedVdc = ((3 * VlinePeak) / Math.PI) * Math.cos(alphaRad);
  } else if (topology === '3P_SEMI_CONVERTER') {
    const VlinePeak = Math.sqrt(3) * Vm;
    estimatedVdc = ((3 * VlinePeak) / (2 * Math.PI)) * (1 + Math.cos(alphaRad));
  } else if (topology === '3P_12PULSE_DUAL') {
    const VlinePeak = Math.sqrt(3) * Vm;
    estimatedVdc = ((6 * VlinePeak) / Math.PI) * Math.cos(alphaRad);
  } else if (topology === 'PWM_AFE_BOOST') {
    estimatedVdc = Math.sqrt(3) * Vm * 1.35 * controls.pwmModulationIndex;
  }

  // If inverting / quadrant target
  if (controls.quadrantTarget === 2 || controls.quadrantTarget === 4) {
    if (controls.firingAngleAlpha < 90) {
      // Inverter mode usually has alpha > 90
    }
  }

  const estimatedIdc = Math.max(0.1, (estimatedVdc - E) / R);
  const VlinePeakForOverlap = topology.startsWith('3P') ? Math.sqrt(3) * Vm : Vm;

  const { muRad, deltaVdc } = calculateCommutationOverlap(
    alphaRad,
    omega,
    grid.sourceInductanceLs,
    estimatedIdc,
    VlinePeakForOverlap,
    pulseNumber
  );

  // State variable integration for load current i_o and capacitor filter
  let current_io = estimatedIdc; // Seed near steady state
  let current_vCap = estimatedVdc;

  // Perform an extended pre-run to ensure steady-state before sampling
  // Time constant tau = L / R (already declared). We want at least 5*tau for settling.
  const cyclesNeeded = Math.ceil(5 * tau * grid.frequency);
  const preRunCycles = Math.max(10, Math.min(200, cyclesNeeded));
  
  for (let preStep = 0; preStep < 1080 * preRunCycles; preStep++) {
    const wt = preStep * dAngle;
    const { voRaw } = calculateRawInstantaneousVoltage(
      wt,
      topology,
      Vm,
      alphaRad,
      betaRad,
      isDcm,
      muRad,
      controls
    );

    // Dynamic forward voltage drop of conducting switches
    const switchesDrop = semi.vf0 + current_io * semi.rd;
    const voEffective = Math.max(E, voRaw - switchesDrop);

    // Di/dt = (vo - R*io - E) / L
    const di_dt = (voEffective - R * current_io - E) / L;
    current_io += di_dt * dt;
    if (current_io < 0) current_io = 0;

    // Filter C dynamics if RC / RLC
    if (load.type === 'RC' || load.type === 'RLC') {
      const C = Math.max(1e-6, load.c);
      const ic = current_io - current_vCap / R;
      current_vCap += (ic / C) * dt;
    }
  }

  // Now sample full fundamental cycle [0, 2PI]
  let sumVo = 0;
  let sumVoSq = 0;
  let sumIo = 0;
  let sumIoSq = 0;
  let sumIsSq = 0;
  let sumP = 0;
  let sumSecCurrent = 0;

  for (let i = 0; i < totalPoints; i++) {
    const wt = i * dAngle;
    const wtDeg = (wt * 180) / Math.PI;
    const t = wt / omega;

    // Source voltages (3-phase balanced)
    const vsa = Vm * Math.sin(wt);
    const vsb = Vm * Math.sin(wt - (2 * Math.PI) / 3);
    const vsc = Vm * Math.sin(wt + (2 * Math.PI) / 3);
    const vs = vsa;

    // Output voltage raw waveform & switch status
    const { voRaw, isOverlapping, activeSwitchIds, t1State, activePairName } = calculateRawInstantaneousVoltage(
      wt,
      topology,
      Vm,
      alphaRad,
      betaRad,
      isDcm,
      muRad,
      controls
    );

    // Semiconductor switch drop
    const drop = activeSwitchIds.length > 0 ? (semi.vf0 + current_io * semi.rd) * (activeSwitchIds.length / 2) : 0;
    let vo = Math.max(-Vm * 1.5, voRaw - drop);

    // In DCM when current is zero, vo equals back-EMF E
    if (isDcm && current_io <= 0.001) {
      vo = E;
    }

    // State ODE update
    const di_dt = (vo - R * current_io - E) / L;
    current_io += di_dt * dt;
    if (current_io < 0) current_io = 0;

    const io = current_io;

    // Source current calculation based on active topology
    const { is, isa, isb, isc } = calculateSourceCurrents(
      topology,
      wt,
      io,
      alphaRad,
      betaRad,
      isDcm,
      muRad,
      controls
    );

    // Switch T1 behavior (Voltage, Gate Pulse, Reverse Recovery)
    const { vt1, ig1, inReverseRecovery } = calculateSwitchT1Physics(
      topology,
      wt,
      Vm,
      alphaRad,
      isOverlapping,
      t1State.isConducting,
      current_io,
      semi
    );

    // Generate detailed switches status list for schematic vector
    const switchStates = buildDetailedSwitchStates(
      topology,
      activeSwitchIds,
      io,
      Vm,
      wt,
      semi,
      isOverlapping
    );

    steps.push({
      wt,
      wtDeg,
      time: t,
      vs,
      vsa,
      vsb,
      vsc,
      vo,
      io,
      is,
      isa,
      isb,
      isc,
      vt1,
      ig1,
      isOverlapping,
      switchStates,
      alphaRad,
      vCap: current_vCap,
      activePairName,
    });

    sumVo += vo;
    sumVoSq += vo * vo;
    sumIo += io;
    sumIoSq += io * io;
    sumIsSq += is * is;
    sumP += vs * is;
    sumSecCurrent += is;
  }

  // Compute Metrics & Averages
  const vDc = sumVo / totalPoints;
  const vRms = Math.sqrt(Math.max(0, sumVoSq / totalPoints));
  const iDc = sumIo / totalPoints;
  const iRms = Math.sqrt(Math.max(0, sumIoSq / totalPoints));
  const isRms = Math.sqrt(Math.max(0, sumIsSq / totalPoints));
  const pActive = sumP / totalPoints;

  // DFT on Source Current and Output Voltage
  const sourceCurrentWave = steps.map((s) => s.is);
  const outputVoltageWave = steps.map((s) => s.vo);

  const harmonicsSourceCurrent = computeDiscreteFourierTransform(
    sourceCurrentWave,
    dt,
    grid.frequency
  );
  const harmonicsOutputVoltage = computeDiscreteFourierTransform(
    outputVoltageWave,
    dt,
    grid.frequency
  );

  const fundIs = harmonicsSourceCurrent[0];
  const is1Rms = fundIs ? fundIs.rms : isRms;
  const phi1Deg = fundIs ? fundIs.phaseDeg : 0;
  const phi1Rad = (phi1Deg * Math.PI) / 180;

  // Power Factors & Harmonic Metrics
  const dpf = Math.cos(phi1Rad);
  const thdCurrentVal = is1Rms > 1e-4 ? Math.sqrt(Math.max(0, isRms * isRms - is1Rms * is1Rms)) / is1Rms : 0;
  const thdCurrent = thdCurrentVal * 100;
  const hf = 1 / Math.sqrt(1 + thdCurrentVal * thdCurrentVal);
  const tpf = Math.abs(dpf * hf);

  const sApparent = grid.vRms * isRms;
  const qReactive = Math.sqrt(Math.max(0, sApparent * sApparent - pActive * pActive));

  const formFactor = vDc > 1e-3 ? vRms / vDc : 1;
  const rippleFactor = Math.sqrt(Math.max(0, formFactor * formFactor - 1)) * 100;

  // Circuit Commutation Time (tc) check
  // For line commutated inverters/rectifiers, reverse bias angle is gamma = pi - alpha (or 2pi/p - alpha)
  const gammaRad = Math.max(0, Math.PI - alphaRad - muRad);
  const circuitCommutationTimeTc = (gammaRad / omega) * 1e6; // in microseconds
  const turnOffMarginOk = circuitCommutationTimeTc > semi.turnOffTimeTq * 1e6;

  // Conduction Mode check
  let conductionMode: 'CCM' | 'DCM' | 'COMMUTATION_FAILURE' = isDcm ? 'DCM' : 'CCM';
  if (alphaRad + muRad >= Math.PI && topology !== 'PWM_AFE_BOOST') {
    conductionMode = 'COMMUTATION_FAILURE';
  }

  // Transformer Core Magnetics & DC Bias Flux
  // Unbalanced DC secondary current creates DC flux Phi_dc = (N * I_dc) / Reluctance
  const coreDcFluxPhiDc = Math.abs(sumSecCurrent / totalPoints) * 0.002;
  const coreSaturationRisk = topology === '1P_HALF_WAVE' || coreDcFluxPhiDc > 0.05;

  // Semiconductor Losses
  const totalConductionLoss = semi.vf0 * iDc + semi.rd * iRms * iRms;
  const totalSwitchingLoss = 0.5 * grid.frequency * semi.qrr * Vm;

  const metrics: PowerMetrics = {
    vDc,
    vRms,
    iDc,
    iRms,
    isRms,
    is1Rms,
    pActive,
    qReactive,
    sApparent,
    dpf,
    hf,
    tpf,
    thdCurrent,
    formFactor,
    rippleFactor,
    commutationOverlapMu: (muRad * 180) / Math.PI,
    commutationVoltageDrop: deltaVdc,
    extinctionAngleBeta: (betaRad * 180) / Math.PI,
    conductionMode,
    circuitCommutationTimeTc,
    turnOffMarginOk,
    coreDcFluxPhiDc,
    coreSaturationRisk,
    totalConductionLoss,
    totalSwitchingLoss,
  };

  // Park (dq) vector trajectory computation
  const valpha: number[] = [];
  const vbeta: number[] = [];
  const vd: number[] = [];
  const vq: number[] = [];
  const ialpha: number[] = [];
  const ibeta: number[] = [];

  for (let k = 0; k < steps.length; k += 4) {
    const s = steps[k];
    // Clarke Transform (stationary frame alpha-beta)
    const va = s.vsa;
    const vb = s.vsb;
    const vc = s.vsc;

    const v_a = (2 / 3) * (va - 0.5 * vb - 0.5 * vc);
    const v_b = (2 / 3) * ((Math.sqrt(3) / 2) * (vb - vc));
    valpha.push(v_a);
    vbeta.push(v_b);

    // Park Transform (synchronous dq frame)
    const theta = s.wt;
    const v_d = v_a * Math.cos(theta) + v_b * Math.sin(theta);
    const v_q = -v_a * Math.sin(theta) + v_b * Math.cos(theta);
    vd.push(v_d);
    vq.push(v_q);

    // Current Clarke
    const i_a = (2 / 3) * (s.isa - 0.5 * s.isb - 0.5 * s.isc);
    const i_b = (2 / 3) * ((Math.sqrt(3) / 2) * (s.isb - s.isc));
    ialpha.push(i_a);
    ibeta.push(i_b);
  }

  return {
    steps,
    metrics,
    harmonicsSourceCurrent,
    harmonicsOutputVoltage,
    parkVector: {
      valpha,
      vbeta,
      vd,
      vq,
      ialpha,
      ibeta,
    },
  };
}

/**
 * Calculates raw instantaneous output voltage for given topology at phase angle wt
 */
function calculateRawInstantaneousVoltage(
  wt: number,
  topology: TopologyId,
  Vm: number,
  alphaRad: number,
  betaRad: number,
  isDcm: boolean,
  muRad: number,
  controls: ConverterControls
): {
  voRaw: number;
  isOverlapping: boolean;
  activeSwitchIds: string[];
  t1State: { isConducting: boolean };
  activePairName: string;
} {
  let voRaw = 0;
  let isOverlapping = false;
  let activeSwitchIds: string[] = [];
  let t1IsConducting = false;
  let activePairName = 'OFF';

  // Normalized angle in cycle [0, 2pi)
  const wtMod2Pi = wt % TWO_PI;

  switch (topology) {
    case '1P_HALF_WAVE': {
      if (controls.enableFwd) {
        const inOverlap = wtMod2Pi >= alphaRad && wtMod2Pi < alphaRad + muRad;
        if (inOverlap) {
          isOverlapping = true;
          voRaw = 0;
          activeSwitchIds = ['T1', 'DFW'];
          t1IsConducting = true;
          activePairName = 'T1 / DFW (μ)';
        } else if (wtMod2Pi >= alphaRad && wtMod2Pi < Math.PI) {
          voRaw = Vm * Math.sin(wtMod2Pi);
          activeSwitchIds = ['T1'];
          t1IsConducting = true;
          activePairName = 'T1';
        } else {
          voRaw = 0;
          activeSwitchIds = ['DFW'];
          activePairName = 'DFW';
        }
      } else {
        // Without Freewheeling Diode:
        // Switch T1 conducts from alpha to beta (can pull output negative!)
        const turnOffPt = isDcm ? betaRad : alphaRad + TWO_PI;
        
        // Handle wrap-around for continuous conduction or DCM crossing 2PI
        const isConducting = isDcm 
          ? (wtMod2Pi >= alphaRad && wtMod2Pi < turnOffPt) || (turnOffPt > TWO_PI && wtMod2Pi < (turnOffPt - TWO_PI))
          : true; // If not DCM, it conducts continuously

        if (isConducting) {
          voRaw = Vm * Math.sin(wtMod2Pi);
          activeSwitchIds = ['T1'];
          t1IsConducting = true;
          activePairName = 'T1';
        } else {
          voRaw = 0;
          activeSwitchIds = [];
          activePairName = 'OFF';
        }
      }
      break;
    }

    case '1P_CENTER_TAP':
    case '1P_FULL_BRIDGE_SCR': {
      if (controls.enableFwd) {
        // With FWD connected: clamps negative excursions
        if (wtMod2Pi >= alphaRad && wtMod2Pi < Math.PI) {
          voRaw = Vm * Math.sin(wtMod2Pi);
          activeSwitchIds = ['T1', 'T2'];
          t1IsConducting = true;
          activePairName = 'T1-T2';
        } else if (wtMod2Pi >= Math.PI && wtMod2Pi < Math.PI + alphaRad) {
          voRaw = 0;
          activeSwitchIds = ['DFW'];
          activePairName = 'DFW';
        } else if (wtMod2Pi >= Math.PI + alphaRad && wtMod2Pi < TWO_PI) {
          voRaw = -Vm * Math.sin(wtMod2Pi);
          activeSwitchIds = ['T3', 'T4'];
          activePairName = 'T3-T4';
        } else {
          voRaw = 0;
          activeSwitchIds = ['DFW'];
          activePairName = 'DFW';
        }
      } else {
        // Standard fully-controlled full-bridge (can be 2-quadrant)
        const pulse1Start = alphaRad;
        const pulse1End = isDcm ? Math.min(alphaRad + Math.PI, betaRad) : alphaRad + Math.PI;
        const pulse2Start = alphaRad + Math.PI;
        const pulse2End = isDcm
          ? Math.min(alphaRad + TWO_PI, betaRad + Math.PI)
          : alphaRad + TWO_PI;

        const inOverlap1 = wtMod2Pi >= pulse1Start && wtMod2Pi < pulse1Start + muRad;
        const inOverlap2 = wtMod2Pi >= pulse2Start && wtMod2Pi < pulse2Start + muRad;

        if (inOverlap1 || inOverlap2) {
          isOverlapping = true;
          voRaw = 0;
          activeSwitchIds = ['T1', 'T2', 'T3', 'T4'];
          t1IsConducting = true;
          activePairName = inOverlap1 ? 'T1-T2 / T3-T4 (μ)' : 'T3-T4 / T1-T2 (μ)';
        } else if (wtMod2Pi >= pulse1Start && wtMod2Pi < pulse1End) {
          voRaw = Vm * Math.sin(wtMod2Pi);
          activeSwitchIds = ['T1', 'T2'];
          t1IsConducting = true;
          activePairName = 'T1-T2';
        } else if (
          (wtMod2Pi >= pulse2Start && wtMod2Pi < pulse2End) ||
          (pulse2End > TWO_PI && wtMod2Pi < pulse2End - TWO_PI)
        ) {
          voRaw = -Vm * Math.sin(wtMod2Pi);
          activeSwitchIds = ['T3', 'T4'];
          activePairName = 'T3-T4';
        } else {
          voRaw = 0;
          activePairName = 'OFF';
        }
      }
      break;
    }

    case '1P_FULL_BRIDGE_DIODE': {
      const isPos = Math.sin(wtMod2Pi) >= 0;
      voRaw = Math.abs(Vm * Math.sin(wtMod2Pi));
      activeSwitchIds = isPos ? ['D1', 'D2'] : ['D3', 'D4'];
      t1IsConducting = isPos;
      activePairName = isPos ? 'D1-D2' : 'D3-D4';
      break;
    }

    case '1P_SEMI_CONVERTER_SYM':
    case '1P_SEMI_CONVERTER_ASYM': {
      const sinVal = Math.sin(wtMod2Pi);
      if (wtMod2Pi >= alphaRad && wtMod2Pi < Math.PI) {
        voRaw = Vm * sinVal;
        activeSwitchIds = ['T1', 'D2'];
        t1IsConducting = true;
        activePairName = 'T1-D2';
      } else if (wtMod2Pi >= Math.PI && wtMod2Pi < Math.PI + alphaRad) {
        voRaw = 0;
        activeSwitchIds = ['DFW'];
        activePairName = 'DFW';
      } else if (wtMod2Pi >= Math.PI + alphaRad && wtMod2Pi < TWO_PI) {
        voRaw = -Vm * sinVal;
        activeSwitchIds = ['T2', 'D1'];
        activePairName = 'T2-D1';
      } else {
        voRaw = 0;
        activeSwitchIds = ['DFW'];
        activePairName = 'DFW';
      }
      break;
    }

    case '3P_STAR_3PULSE': {
      const vA = Vm * Math.sin(wtMod2Pi);
      const vB = Vm * Math.sin(wtMod2Pi - (2 * Math.PI) / 3);
      const vC = Vm * Math.sin(wtMod2Pi + (2 * Math.PI) / 3);

      const fireT1 = Math.PI / 6 + alphaRad;
      const normAngle = (wtMod2Pi - fireT1 + TWO_PI) % TWO_PI;
      const period = (2 * Math.PI) / 3;

      if (normAngle < period) {
        voRaw = vA;
        activeSwitchIds = ['T1'];
        t1IsConducting = true;
        activePairName = 'T1';
      } else if (normAngle < 2 * period) {
        voRaw = vB;
        activeSwitchIds = ['T2'];
        activePairName = 'T2';
      } else {
        voRaw = vC;
        activeSwitchIds = ['T3'];
        activePairName = 'T3';
      }
      break;
    }

    case '3P_FULL_BRIDGE_6PULSE':
    case 'DUAL_CONVERTER_4Q': {
      const VlinePeak = Math.sqrt(3) * Vm;
      const baseAngle = (wtMod2Pi - alphaRad - Math.PI / 3 + TWO_PI) % TWO_PI;
      const sector = Math.floor((baseAngle * 6) / TWO_PI);
      const angleInSector = baseAngle - (sector * Math.PI) / 3;

      const switchPairs = [
        ['T1', 'T6'],
        ['T1', 'T2'],
        ['T3', 'T2'],
        ['T3', 'T4'],
        ['T5', 'T4'],
        ['T5', 'T6'],
      ];
      activeSwitchIds = switchPairs[sector % 6] || ['T1', 'T6'];
      t1IsConducting = activeSwitchIds.includes('T1');
      activePairName = activeSwitchIds.join('-');

      if (angleInSector < muRad) {
        isOverlapping = true;
        voRaw = VlinePeak * Math.sin(angleInSector + Math.PI / 3) * 0.5;
        activePairName += ' (μ)';
      } else {
        voRaw = VlinePeak * Math.sin(angleInSector + Math.PI / 3);
      }
      break;
    }

    case '3P_SEMI_CONVERTER': {
      const VlinePeak = Math.sqrt(3) * Vm;
      const baseAngle = (wtMod2Pi - alphaRad + TWO_PI) % TWO_PI;
      const sector = Math.floor((baseAngle * 3) / TWO_PI);
      const angleInSector = baseAngle - (sector * (2 * Math.PI)) / 3;

      if (angleInSector < (2 * Math.PI) / 3 - alphaRad) {
        voRaw = VlinePeak * Math.abs(Math.sin(angleInSector + Math.PI / 3));
        const pairs = [['T1', 'D2'], ['T3', 'D4'], ['T5', 'D6']];
        activeSwitchIds = pairs[sector % 3];
        activePairName = activeSwitchIds.join('-');
      } else {
        voRaw = 0;
        activeSwitchIds = ['DFW'];
        activePairName = 'DFW';
      }
      t1IsConducting = activeSwitchIds.includes('T1');
      break;
    }

    case '3P_12PULSE_DUAL': {
      const VlinePeak = Math.sqrt(3) * Vm;
      const baseAngle1 = (wtMod2Pi - alphaRad + TWO_PI) % TWO_PI;
      const sector = Math.floor((baseAngle1 * 12) / TWO_PI);
      const angleInSector = baseAngle1 - (sector * Math.PI) / 6;

      const voBridge1 = VlinePeak * Math.sin(angleInSector + Math.PI / 3);
      const voBridge2 = VlinePeak * Math.sin(angleInSector + Math.PI / 3 + Math.PI / 6);
      voRaw = (voBridge1 + voBridge2) * 0.96;
      activeSwitchIds = ['T1_Y', 'T6_Y', 'T1_D', 'T6_D'];
      t1IsConducting = true;
      activePairName = '12P Y-Δ';
      break;
    }

    case 'PWM_AFE_BOOST': {
      const ma = controls.pwmModulationIndex;
      const mf = controls.pwmCarrierFreq / 50;
      const carrier = (Math.asin(Math.sin(mf * wtMod2Pi)) / Math.PI) * 2;
      const referenceA = ma * Math.sin(wtMod2Pi);
      const gateA = referenceA > carrier;

      const boostDcBus = Math.sqrt(3) * Vm * 1.5;
      voRaw = boostDcBus;
      activeSwitchIds = gateA ? ['S1_IGBT', 'S4_IGBT'] : ['D1_FWD', 'D4_FWD'];
      t1IsConducting = gateA;
      activePairName = gateA ? 'S1-S4' : 'D1-D4';
      break;
    }
  }

  return {
    voRaw,
    isOverlapping,
    activeSwitchIds,
    t1State: { isConducting: t1IsConducting },
    activePairName,
  };
}

/**
 * Calculates instantaneous 3-phase line currents (isa, isb, isc) and primary single-phase is
 */
function calculateSourceCurrents(
  topology: TopologyId,
  wt: number,
  io: number,
  alphaRad: number,
  betaRad: number,
  isDcm: boolean,
  muRad: number,
  controls: ConverterControls
): { is: number; isa: number; isb: number; isc: number } {
  const wtMod2Pi = wt % TWO_PI;

  if (topology === '1P_HALF_WAVE') {
    let is = 0;
    if (controls.enableFwd) {
      if (muRad > 0 && wtMod2Pi >= alphaRad && wtMod2Pi < alphaRad + muRad) {
        is = io * ((wtMod2Pi - alphaRad) / muRad);
      } else if (wtMod2Pi >= alphaRad + muRad && wtMod2Pi < Math.PI) {
        is = io;
      }
    } else {
      const turnOffPt = isDcm ? betaRad : alphaRad + TWO_PI;
      const isConducting = isDcm 
        ? (wtMod2Pi >= alphaRad && wtMod2Pi < turnOffPt) || (turnOffPt > TWO_PI && wtMod2Pi < (turnOffPt - TWO_PI))
        : true;
      is = isConducting ? io : 0;
    }
    return { is, isa: is, isb: 0, isc: 0 };
  }

  if (
    topology === '1P_FULL_BRIDGE_SCR' ||
    topology === '1P_CENTER_TAP' ||
    topology === '1P_FULL_BRIDGE_DIODE'
  ) {
    let is = 0;
    const wtWrap = wtMod2Pi < alphaRad ? wtMod2Pi + TWO_PI : wtMod2Pi;
    
    if (muRad > 0 && wtWrap >= alphaRad && wtWrap < alphaRad + muRad) {
      is = -io + 2 * io * ((wtWrap - alphaRad) / muRad);
    } else if (wtWrap >= alphaRad + muRad && wtWrap < alphaRad + Math.PI) {
      is = io;
    } else if (muRad > 0 && wtWrap >= alphaRad + Math.PI && wtWrap < alphaRad + Math.PI + muRad) {
      is = io - 2 * io * ((wtWrap - (alphaRad + Math.PI)) / muRad);
    } else {
      is = -io;
    }
    return { is, isa: is, isb: 0, isc: 0 };
  }

  if (topology === '1P_SEMI_CONVERTER_SYM' || topology === '1P_SEMI_CONVERTER_ASYM') {
    let is = 0;
    if (wtMod2Pi >= alphaRad && wtMod2Pi < Math.PI) {
      is = io;
    } else if (wtMod2Pi >= Math.PI + alphaRad && wtMod2Pi < TWO_PI) {
      is = -io;
    }
    return { is, isa: is, isb: 0, isc: 0 };
  }

  if (topology.startsWith('3P') || topology === 'DUAL_CONVERTER_4Q') {
    // Standard quasi-square or 12-pulse line current synthesis
    const phaseA_pos = (wtMod2Pi - alphaRad + TWO_PI) % TWO_PI;
    let isa = 0;
    if (phaseA_pos >= Math.PI / 6 && phaseA_pos < (5 * Math.PI) / 6) {
      isa = io;
    } else if (phaseA_pos >= (7 * Math.PI) / 6 && phaseA_pos < (11 * Math.PI) / 6) {
      isa = -io;
    }

    const phaseB_pos = (wtMod2Pi - alphaRad - (2 * Math.PI) / 3 + TWO_PI) % TWO_PI;
    let isb = 0;
    if (phaseB_pos >= Math.PI / 6 && phaseB_pos < (5 * Math.PI) / 6) {
      isb = io;
    } else if (phaseB_pos >= (7 * Math.PI) / 6 && phaseB_pos < (11 * Math.PI) / 6) {
      isb = -io;
    }

    const isc = -isa - isb;
    return { is: isa, isa, isb, isc };
  }

  if (topology === 'PWM_AFE_BOOST') {
    // Near sinusoidal grid current with low THD
    const isa = io * 0.8 * Math.sin(wtMod2Pi);
    const isb = io * 0.8 * Math.sin(wtMod2Pi - (2 * Math.PI) / 3);
    const isc = io * 0.8 * Math.sin(wtMod2Pi + (2 * Math.PI) / 3);
    return { is: isa, isa, isb, isc };
  }

  return { is: io, isa: io, isb: 0, isc: 0 };
}

/**
 * Calculates physical voltage across switch T1, gate pulse, and reverse recovery dynamics
 */
function calculateSwitchT1Physics(
  topology: TopologyId,
  wt: number,
  Vm: number,
  alphaRad: number,
  isOverlapping: boolean,
  isConducting: boolean,
  io: number,
  semi: SemiconductorParams
): { vt1: number; ig1: number; inReverseRecovery: boolean } {
  let vt1 = 0;
  let ig1 = 0;
  let inReverseRecovery = false;

  const wtMod2Pi = wt % TWO_PI;
  // Gate pulse duration 15 degrees around alpha
  const gatePulseWidth = (15 * Math.PI) / 180;
  if (wtMod2Pi >= alphaRad && wtMod2Pi < alphaRad + gatePulseWidth) {
    ig1 = 1; // 1A gate trigger pulse
  }

  if (isConducting) {
    vt1 = semi.vf0 + io * semi.rd; // forward on-state drop
  } else {
    // Reverse or forward blocking voltage
    const vs = Vm * Math.sin(wtMod2Pi);
    vt1 = -vs; // switch blocks line voltage

    // Reverse recovery check immediately after conduction ceases
    const turnOffAngle = alphaRad + Math.PI;
    const recoveryAngleWidth = 0.08; // ~4.5 degrees
    if (wtMod2Pi >= turnOffAngle && wtMod2Pi < turnOffAngle + recoveryAngleWidth) {
      inReverseRecovery = true;
      // High transient recovery reverse voltage peak (inductive kick dampened by snubber)
      const snubberDamping = semi.enableSnubber ? 0.35 : 1.0;
      vt1 = -Vm * 1.45 * snubberDamping * Math.exp(-(wtMod2Pi - turnOffAngle) / 0.02);
    }
  }

  return { vt1, ig1, inReverseRecovery };
}

/**
 * Builds list of individual switch states for schematic rendering
 */
function buildDetailedSwitchStates(
  topology: TopologyId,
  activeIds: string[],
  io: number,
  Vm: number,
  wt: number,
  semi: SemiconductorParams,
  isOverlapping: boolean
): SwitchState[] {
  const switchIdsByTopology: Record<TopologyId, string[]> = {
    '1P_HALF_WAVE': ['T1'],
    '1P_CENTER_TAP': ['T1', 'T2'],
    '1P_FULL_BRIDGE_DIODE': ['D1', 'D2', 'D3', 'D4'],
    '1P_FULL_BRIDGE_SCR': ['T1', 'T2', 'T3', 'T4'],
    '1P_SEMI_CONVERTER_SYM': ['T1', 'T2', 'D1', 'D2'],
    '1P_SEMI_CONVERTER_ASYM': ['T1', 'T2', 'D1', 'D2', 'DFW'],
    '3P_STAR_3PULSE': ['T1', 'T2', 'T3'],
    '3P_FULL_BRIDGE_6PULSE': ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'],
    '3P_SEMI_CONVERTER': ['T1', 'T3', 'T5', 'D2', 'D4', 'D6'],
    '3P_12PULSE_DUAL': ['T1_Y', 'T2_Y', 'T3_Y', 'T4_Y', 'T5_Y', 'T6_Y', 'T1_D', 'T2_D', 'T3_D', 'T4_D', 'T5_D', 'T6_D'],
    'DUAL_CONVERTER_4Q': ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T1_N', 'T2_N', 'T3_N', 'T4_N', 'T5_N', 'T6_N'],
    'PWM_AFE_BOOST': ['S1_IGBT', 'S2_IGBT', 'S3_IGBT', 'S4_IGBT', 'S5_IGBT', 'S6_IGBT'],
  };

  const allIds = switchIdsByTopology[topology] || ['T1', 'T2', 'T3', 'T4'];

  return allIds.map((id) => {
    const isConducting = activeIds.includes(id);
    const forwardCurrent = isConducting ? io : 0;
    const voltageStress = isConducting ? semi.vf0 + io * semi.rd : Math.abs(Vm * Math.sin(wt));
    const inReverseRecovery = !isConducting && isOverlapping;
    const snubberCurrent = !isConducting && semi.enableSnubber ? (voltageStress / semi.snubberRs) * 0.1 : 0;

    return {
      id,
      name: id,
      isConducting,
      forwardCurrent,
      voltageStress,
      inReverseRecovery,
      snubberCurrent,
      gatePulseActive: isConducting && id.startsWith('T'),
    };
  });
}
