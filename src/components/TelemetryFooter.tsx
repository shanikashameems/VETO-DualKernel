import React from 'react';
import { Activity, ShieldCheck, ShieldAlert, Zap, RefreshCw, Play } from 'lucide-react';
import { TelemetryMetrics } from '../types';

interface TelemetryFooterProps {
  metrics: TelemetryMetrics;
  onResetDemo: () => void;
  onRunBenchmark: () => void;
  isRunningBenchmark: boolean;
}

export const TelemetryFooter: React.FC<TelemetryFooterProps> = ({
  metrics,
  onResetDemo,
  onRunBenchmark,
  isRunningBenchmark
}) => {
  const [showToast, setShowToast] = React.useState(false);

  const handleBenchmarkClick = async () => {
    await onRunBenchmark();
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <footer className="bg-[#0F1117] text-gray-300 border-t border-[#2D3748] px-6 py-3 flex flex-col md:flex-row justify-between items-center text-xs font-mono shadow-inner space-y-2 md:space-y-0 relative">
      {showToast && (
        <div className="absolute -top-10 right-6 bg-emerald-900 border border-emerald-500 text-emerald-100 px-3 py-1.5 rounded shadow-lg text-xs font-mono font-bold flex items-center space-x-1.5 animate-bounce">
          <Zap className="w-4 h-4 text-emerald-400" />
          <span>+10 AUTOMATED BENCHMARK TESTS EXECUTED! METRICS UPDATED.</span>
        </div>
      )}

      {/* LEFT: Metric items */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 md:gap-6 w-full md:w-auto">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-blue-400 shrink-0" />
          <div>
            <span className="text-gray-500 block text-[10px] uppercase">ATTACKS TESTED</span>
            <span className="text-white font-bold text-sm">{metrics.total_attacks}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          <div>
            <span className="text-gray-500 block text-[10px] uppercase">BLOCKED</span>
            <span className="text-red-400 font-bold text-sm">
              {metrics.blocked_attacks} / {metrics.total_attacks}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <span className="text-gray-500 block text-[10px] uppercase">TAINT DETECTION</span>
            <span className="text-emerald-400 font-bold text-sm">{metrics.taint_detection_pct}%</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <span className="text-gray-500 block text-[10px] uppercase">AVG OVERHEAD</span>
            <span className="text-amber-300 font-bold text-sm">{metrics.avg_latency_ms} ms</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
          <div>
            <span className="text-gray-500 block text-[10px] uppercase">FALSE POSITIVE</span>
            <span className="text-blue-300 font-bold text-sm">{metrics.false_positive_pct}%</span>
          </div>
        </div>
      </div>

      {/* RIGHT: Action controls */}
      <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
        <button
          onClick={handleBenchmarkClick}
          disabled={isRunningBenchmark}
          className="px-3 py-1.5 bg-blue-900/60 hover:bg-blue-800 border border-blue-600 rounded text-[11px] font-mono font-bold text-blue-200 flex items-center space-x-1.5 transition-all shadow-xs"
          id="run-benchmark-btn"
        >
          <Play className={`w-3.5 h-3.5 text-blue-400 ${isRunningBenchmark ? 'animate-spin' : ''}`} />
          <span>{isRunningBenchmark ? 'RUNNING 10 TESTS...' : '[ RUN 10 ATTACK TESTS ]'}</span>
        </button>

        <button
          onClick={onResetDemo}
          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-[11px] font-mono text-gray-300 flex items-center space-x-1.5 transition-all"
          id="reset-demo-btn"
        >
          <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
          <span>[ RESET DEMO ]</span>
        </button>
      </div>
    </footer>
  );
};
