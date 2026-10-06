/**
 * PowerLab - Rigorous Physical and Mathematical LaTeX Derivations
 * Formatted equations and explanations for analytical verification
 */

import { TopologyId } from '../types/powerTypes';

export interface DerivationSection {
  title: string;
  latexFormula: string;
  explanation: string;
  notes?: string[];
}

export function getDerivationsForTopology(topology: TopologyId): DerivationSection[] {
  const commonSections: DerivationSection[] = [
    {
      title: '1. Commutation Overlap Angle (μ) & Voltage Regulation Drop',
      latexFormula: `\\cos(\\alpha + \\mu) = \\cos(\\alpha) - \\frac{2\\,\\omega\\,L_s\\,I_{dc}}{V_{line,peak}} \\implies \\mu = \\arccos\\left(\\cos\\alpha - \\frac{2\\,\\omega L_s I_{dc}}{V_{line,peak}}\\right) - \\alpha`,
      explanation:
        'When source line inductance Ls > 0, incoming and outgoing thyristors conduct simultaneously during the commutation interval μ. During this interval, the AC line reactance absorbs the commutation voltage, producing an average DC output reduction:',
      notes: [
        'Average Commutation Voltage Drop: \\Delta V_{dc} = \\frac{p}{2\\pi}\\,\\omega\\,L_s\\,I_{dc}',
        'For alpha + mu >= 180°, line-commutated inverters experience Commutation Failure.',
      ],
    },
    {
      title: '2. Transcendental Boundary Equation for Extinction Angle (β) in DCM',
      latexFormula: `\\sin(\\beta - \\phi) - \\sin(\\alpha - \\phi)\\,e^{-\\frac{\\beta - \\alpha}{\\omega\\,\\tau}} - \\frac{E}{V_m}\\left(1 - e^{-\\frac{\\beta - \\alpha}{\\omega\\,\\tau}}\\right) = 0`,
      explanation:
        'In Discontinuous Conduction Mode (DCM) with an R-L-E active load, load current io(wt) falls to zero at extinction angle β. The exact value of β cannot be written in closed-form elementary algebra and is solved by our Newton-Raphson boundary solver.',
      notes: [
        'Load impedance angle: \\phi = \\arctan\\left(\\frac{\\omega L}{R}\\right)',
        'Normalized electrical time constant: \\omega\\tau = \\frac{\\omega L}{R}',
        'Boundary condition: If f(alpha + 2pi/p) > 0, the converter operates in CCM; otherwise DCM.',
      ],
    },
    {
      title: '3. Harmonic Fourier Decomposition & Distortion Power Factor',
      latexFormula: `i_s(\\omega t) = \\sum_{h=1,3,5\\dots}^{\\infty} \\left[ a_h \\cos(h\\omega t) + b_h \\sin(h\\omega t) \\right] = \\sqrt{2}\\,I_{1,rms}\\sin(\\omega t - \\phi_1) + \\sum_{h > 1} \\sqrt{2}\\,I_{h,rms}\\sin(h\\omega t - \\phi_h)`,
      explanation:
        'Non-linear switching produces harmonic currents that pollute the power grid. Power quality figures of merit are defined rigorously as:',
      notes: [
        'Displacement Power Factor (DPF): DPF = \\cos(\\phi_1)',
        'Total Harmonic Distortion (THD_i): THD_i = \\frac{\\sqrt{I_{rms}^2 - I_{1,rms}^2}}{I_{1,rms}}',
        'Distortion Factor (HF): HF = \\frac{1}{\\sqrt{1 + THD_i^2}}',
        'True Power Factor (TPF): TPF = DPF \\times HF = \\frac{P}{S}',
      ],
    },
    {
      title: '4. Semiconductor Non-Linear Conduction & Snubber dv/dt Limits',
      latexFormula: `v_{switch}(\\omega t) = V_{F0} + r_d \\cdot i(\\omega t) \\quad \\text{(Conducting)} \\qquad \\left|\\frac{dv}{dt}\\right|_{max} = \\frac{V_{peak}}{R_s\\,C_s}`,
      explanation:
        'Switches are modeled with piecewise threshold voltage VF0 and dynamic slope resistance rd. Reverse recovery transient charge Qrr and snubber damping prevent catastrophic dv/dt false turn-on.',
    },
  ];

  switch (topology) {
    case '1P_HALF_WAVE':
      return [
        {
          title: 'Single-Phase Half-Wave Average & RMS DC Voltage',
          latexFormula: `V_{dc} = \\frac{V_m}{2\\pi}(1 + \\cos\\alpha) \\qquad V_{rms} = \\frac{V_m}{2}\\sqrt{\\frac{1}{\\pi}\\left((\\pi - \\alpha) + \\frac{1}{2}\\sin(2\\alpha)\\right)}`,
          explanation:
            'Due to half-wave rectification, unidirectional secondary current causes massive DC magnetizing bias flux Phi_dc in transformer cores, causing magnetic saturation.',
        },
        ...commonSections,
      ];

    case '1P_FULL_BRIDGE_SCR':
    case '1P_CENTER_TAP':
      return [
        {
          title: 'Single-Phase Fully-Controlled Full-Bridge Average Output Voltage',
          latexFormula: `V_{dc} = \\frac{2\\,V_m}{\\pi}\\cos\\alpha - \\frac{2\\,\\omega\\,L_s\\,I_{dc}}{\\pi}`,
          explanation:
            'In CCM, output voltage can become negative for firing angles alpha > 90°, allowing 2-quadrant operation (Rectification: alpha < 90°, Line-Commutated Inversion: alpha > 90° with active E load).',
        },
        {
          title: 'Form Factor and Ripple Factor',
          latexFormula: `FF = \\frac{V_{rms}}{V_{dc}} = \\frac{\\frac{V_m}{\\sqrt{2}}}{\\frac{2V_m}{\\pi}\\cos\\alpha} = \\frac{\\pi}{2\\sqrt{2}\\cos\\alpha} \\qquad RF = \\sqrt{FF^2 - 1}`,
          explanation: 'Harmonic ripple increases rapidly as firing angle alpha approaches 90°.',
        },
        ...commonSections,
      ];

    case '1P_SEMI_CONVERTER_SYM':
    case '1P_SEMI_CONVERTER_ASYM':
      return [
        {
          title: 'Single-Phase Semi-Converter Average Output Voltage',
          latexFormula: `V_{dc} = \\frac{V_m}{\\pi}(1 + \\cos\\alpha) - \\frac{\\omega\\,L_s\\,I_{dc}}{\\pi}`,
          explanation:
            'Freewheeling action clamps the output to zero during reverse line voltage intervals, preventing negative DC voltage and improving the displacement factor.',
        },
        ...commonSections,
      ];

    case '3P_FULL_BRIDGE_6PULSE':
      return [
        {
          title: 'Three-Phase 6-Pulse Full-Bridge Average Output Voltage',
          latexFormula: `V_{dc} = \\frac{3\\,V_{L,peak}}{\\pi}\\cos\\alpha = \\frac{3\\sqrt{3}\\,V_{ph,peak}}{\\pi}\\cos\\alpha = 1.35\\,V_{L,rms}\\cos\\alpha`,
          explanation:
            'The 6-pulse bridge produces characteristic harmonic currents of order h = 6k ± 1 (5th, 7th, 11th, 13th...). Lowest harmonic is 5th (250Hz/300Hz), requiring smaller filtering than 1-phase.',
        },
        ...commonSections,
      ];

    case '3P_12PULSE_DUAL':
      return [
        {
          title: '12-Pulse Dual Converter Phase Cancellation',
          latexFormula: `V_{dc,12P} = \\frac{6\\,V_{L,peak}}{\\pi}\\cos\\alpha \\qquad i_s(\\omega t) = i_{s,Y}(\\omega t) + \\frac{1}{\\sqrt{3}} i_{s,\\Delta}(\\omega t)`,
          explanation:
            'By using Y-Y and Y-Δ transformer phase displacement (30° phase shift), the 5th and 7th harmonics cancel out perfectly on the primary grid, leaving only h = 12k ± 1 (11th, 13th, 23rd, 25th...).',
        },
        ...commonSections,
      ];

    case 'PWM_AFE_BOOST':
      return [
        {
          title: 'Active Front End (AFE) Boost & Synchronous dq State Equations',
          latexFormula: `L \\frac{d i_d}{dt} = -R\\,i_d + \\omega L\\,i_q + v_{d,grid} - v_{d,conv} \\qquad C \\frac{d V_{dc}}{dt} = \\frac{3}{2}\\frac{v_{d,grid}\\,i_d}{V_{dc}} - \\frac{V_{dc}}{R_{load}}`,
          explanation:
            'Under decoupled vector control in the rotating dq synchronous reference frame, iq controls reactive power (Q=0 for unity power factor, DPF=1.0), while id controls the boosted DC link bus voltage.',
        },
        ...commonSections,
      ];

    default:
      return commonSections;
  }
}
