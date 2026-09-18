import React from 'react';
import { ShieldCheck, ShieldAlert, Activity, Cpu, Landmark, Info } from 'lucide-react';

interface HeaderProps {
  vetoMode: boolean;
  setVetoMode: (mode: boolean) => void;
  isBackendOnline: boolean;
  bankCallCount: number;
}

export const Header: React.FC<HeaderProps> = ({ vetoMode, setVetoMode, isBackendOnline, bankCallCount }) => {
  const activeProxy = typeof window !== 'undefined' && !window.location.hostname.includes('localhost')
    ? `${window.location.host}/api`
    : 'localhost:8000/veto';

  return (
    <div className="flex flex-col border-b border-[#2D3748] bg-[#0F1117] text-white shadow-lg">
      {/* MAIN TOP HEADER BAR */}
      <header className="px-6 py-3.5 flex flex-col md:flex-row justify-between items-center">
        {/* LEFT: Branding & Execution Boundary */}
        <div className="flex items-center space-x-4 mb-3 md:mb-0">
          <div className="bg-[#1E2640] p-2.5 rounded border border-[#3B82F6]/40 text-[#2563EB]">
            <Cpu className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-white font-mono">VETO-DualKernel</h1>
              <span className="text-xs px-2 py-0.5 bg-blue-950 text-blue-400 border border-blue-800/80 rounded font-mono font-semibold">
                // EXECUTION BOUNDARY
              </span>
            </div>
            <p className="text-xs text-gray-400 font-sans tracking-wide">
              Zero-Trust Execution Gate for Agentic Finance
            </p>
          </div>
        </div>

        {/* CENTER: Active Proxy Status & Visible bank_call_count */}
        <div className="flex flex-wrap items-center justify-center gap-3 bg-[#141720] px-4 py-2 rounded border border-gray-800 text-xs font-mono mb-3 md:mb-0">
          <div className="flex items-center space-x-2">
            <Activity className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-400">PROXY:</span>
            <span className="text-gray-200">{activeProxy}</span>
          </div>
          
          <div className="h-3 w-px bg-gray-700 hidden sm:block"></div>

          {/* BANK CALL COUNT DISPLAY */}
          <div className="flex items-center space-x-2 bg-[#0B0D13] px-3 py-1 rounded border border-blue-900/60 text-blue-300">
            <Landmark className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-gray-400 text-[11px]">bank_call_count:</span>
            <span className="font-bold text-sm text-emerald-400 font-mono" id="bank-call-count-header">
              {bankCallCount}
            </span>
          </div>

          <div className="h-3 w-px bg-gray-700 hidden sm:block"></div>

          {isBackendOnline ? (
            <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>PROXY ONLINE</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 text-red-400 font-semibold">
              <span className="h-2 w-2 rounded-full bg-red-500"></span>
              <span>PROXY OFFLINE</span>
            </div>
          )}
        </div>

        {/* RIGHT: Hero Mode Switch */}
        <div className="flex items-center">
          <button
            onClick={() => setVetoMode(!vetoMode)}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded text-xs font-mono font-bold tracking-wider uppercase transition-all duration-200 shadow-md ${
              vetoMode
                ? 'bg-emerald-950/90 text-emerald-300 border-2 border-emerald-500 hover:bg-emerald-900 shadow-emerald-900/30'
                : 'bg-red-950/90 text-red-300 border-2 border-red-500 hover:bg-red-900 shadow-red-900/30 animate-pulse'
            }`}
            id="hero-mode-switch"
          >
            {vetoMode ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>[ MODE: VETO ENFORCED ]</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span>[ MODE: UNPROTECTED AGENT ]</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* PROMINENT TOP CONTEXT SUBTITLE BANNER */}
      <div className="bg-[#141824] border-t border-b border-blue-900/40 px-6 py-2 flex items-center space-x-2.5 text-xs text-blue-100 font-sans shadow-inner">
        <Info className="w-4 h-4 text-blue-400 shrink-0" />
        <p className="leading-relaxed">
          <strong className="text-white font-semibold">How this works:</strong> An autonomous AI reads an invoice to process payment. Toggle between <span className="text-red-300 font-bold font-mono px-1 py-0.5 bg-red-950/80 rounded border border-red-800">VETO OFF</span> and <span className="text-emerald-300 font-bold font-mono px-1 py-0.5 bg-emerald-950/80 rounded border border-emerald-800">VETO ON</span> to see how a hidden prompt injection steals ₹5,00,000—and how deterministic data provenance prevents it.
        </p>
      </div>
    </div>
  );
};
