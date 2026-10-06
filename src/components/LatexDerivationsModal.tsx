/**
 * PowerLab - Physical LaTeX Derivations Modal
 * Formatted analytical expressions, transcendental DCM boundary proofs,
 * commutation overlap equations, and harmonic formulas.
 */

import React from 'react';
import { TopologyId } from '../types/powerTypes';
import { getDerivationsForTopology } from '../engine/latexDerivations';
import { BookOpen, X, Check, Copy } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';

interface LatexDerivationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  topology: TopologyId;
}

export const LatexDerivationsModal: React.FC<LatexDerivationsModalProps> = ({
  isOpen,
  onClose,
  topology,
}) => {
  const sections = getDerivationsForTopology(topology);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-mono">
                Rigorous Mathematical & Physical Derivations
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                State-Space Formulations, Overlap Integrals & Boundary Equations for {topology}
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

        {/* Content Body with clean scrollable mathematical cards */}
        <div className="p-6 overflow-y-auto space-y-6">
          {sections.map((sec, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 shadow-md space-y-3"
            >
              <h3 className="text-sm font-bold text-amber-300 font-mono flex items-center gap-2">
                <span>{sec.title}</span>
              </h3>

              {/* Formula Block */}
              <div className="px-4 py-2 bg-slate-900/90 border border-slate-800 rounded-lg text-cyan-300 overflow-x-auto shadow-inner min-w-min whitespace-nowrap">
                <BlockMath math={sec.latexFormula} />
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-sans">{sec.explanation}</p>

              {sec.notes && sec.notes.length > 0 && (
                <ul className="space-y-1.5 pt-2 border-t border-slate-900">
                  {sec.notes.map((note, nIdx) => (
                    <li key={nIdx} className="text-xs text-slate-400 font-mono flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5">▸</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
