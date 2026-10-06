/**
 * PowerLab - SPICE Netlist Viewer & Exporter Modal
 * Inspects, copies, and downloads LTspice/ngspice-compatible .cir simulation decks.
 */

import React, { useState } from 'react';
import {
  TopologyId,
  GridParams,
  SemiconductorParams,
  LoadParams,
  ConverterControls,
} from '../types/powerTypes';
import { generateSpiceNetlist } from '../engine/spiceNetlistGenerator';
import { FileCode, X, Copy, Check, Download } from 'lucide-react';

interface SpiceNetlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  topology: TopologyId;
  grid: GridParams;
  semi: SemiconductorParams;
  load: LoadParams;
  controls: ConverterControls;
}

export const SpiceNetlistModal: React.FC<SpiceNetlistModalProps> = ({
  isOpen,
  onClose,
  topology,
  grid,
  semi,
  load,
  controls,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const netlist = generateSpiceNetlist(topology, grid, semi, load, controls);

  const handleCopy = () => {
    navigator.clipboard.writeText(netlist);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([netlist], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `powerlab_${topology.toLowerCase()}_deck.cir`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-mono">
                SPICE / LTspice Netlist (.cir Deck)
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Production-Ready Netlist with Device Subcircuits, Pulse Delays & Transient Directives
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 text-xs font-mono font-medium transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .cir</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Netlist Text Area */}
        <div className="p-6 overflow-y-auto">
          <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed shadow-inner select-all">
            {netlist}
          </pre>
        </div>
      </div>
    </div>
  );
};
