import React, { useState } from 'react';
import { Database, GitCommit, FileCheck, Copy, Download, Check, ShieldAlert } from 'lucide-react';
import { VendorRecord, DispatchResponse } from '../types';

interface EnterpriseTruthProps {
  vendors: VendorRecord[];
  dispatchResult: DispatchResponse | null;
  vetoMode: boolean;
}

export const EnterpriseTruth: React.FC<EnterpriseTruthProps> = ({
  vendors,
  dispatchResult,
  vetoMode
}) => {
  const [copied, setCopied] = useState(false);

  const audit = dispatchResult?.audit;
  const isTainted = dispatchResult?.evaluation?.provenance?.beneficiary_account?.trust_state === 'TAINTED';
  const isBlocked = dispatchResult?.evaluation?.decision === 'BLOCK';

  const handleCopyJson = () => {
    if (audit) {
      navigator.clipboard.writeText(JSON.stringify(audit, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportJson = () => {
    if (audit) {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(audit, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `audit_${audit.audit_id}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }
  };

  return (
    <div className="bg-[#F4F1EA] border border-[#E2E8F0] rounded-lg p-4 flex flex-col space-y-4 shadow-sm h-full overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between border-b border-gray-300 pb-2.5">
        <h2 className="text-sm font-bold tracking-wider text-gray-900 font-mono uppercase flex items-center space-x-2">
          <Database className="w-4 h-4 text-blue-600" />
          <span>ENTERPRISE TRUTH</span>
        </h2>
        <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-300 font-semibold">
          ERP AUTHORITATIVE
        </span>
      </div>

      {/* 12.1 VERIFIED VENDOR REGISTRY */}
      <div className="bg-white border border-gray-300 rounded p-3 space-y-2 shadow-xs">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-gray-800 font-mono uppercase">
            VERIFIED ENTERPRISE VENDOR REGISTRY
          </span>
          <span className="text-[10px] text-gray-500 font-mono">SQLite (veto.db)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 text-[10px] uppercase bg-gray-50">
                <th className="py-1.5 px-2">ID</th>
                <th className="py-1.5 px-2">Vendor</th>
                <th className="py-1.5 px-2">Verified Account</th>
                <th className="py-1.5 px-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vendors.map((v) => {
                const isActive = v.name.includes("ABC");
                return (
                  <tr
                    key={v.vendor_id}
                    className={
                      isActive
                        ? 'bg-blue-50/90 font-semibold text-blue-900 border-l-2 border-blue-600'
                        : 'text-gray-700'
                    }
                  >
                    <td className="py-1.5 px-2 font-mono text-[11px]">{v.vendor_id}</td>
                    <td className="py-1.5 px-2">{v.name}</td>
                    <td className="py-1.5 px-2 text-emerald-700 font-bold">{v.verified_account}</td>
                    <td className="py-1.5 px-2">
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded font-bold">
                        {v.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 12.2 CAUSAL LINEAGE GRAPH */}
      <div className="bg-white border border-gray-300 rounded p-3 space-y-2 shadow-xs">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-gray-800 font-mono uppercase flex items-center space-x-1.5">
            <GitCommit className="w-3.5 h-3.5 text-blue-600" />
            <span>CAUSAL LINEAGE GRAPH</span>
          </span>
          <span className="text-[10px] text-gray-500 font-mono">DYNAMIC PROVENANCE</span>
        </div>

        {/* SVG DYNAMIC GRAPH */}
        <div className="bg-[#0F1117] rounded p-3 border border-gray-800 flex flex-col items-center justify-center min-h-[220px]">
          <svg className="w-full h-[210px]" viewBox="0 0 320 200">
            <defs>
              <marker id="arrow-emerald" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#10B981" />
              </marker>
              <marker id="arrow-red" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#EF4444" />
              </marker>
              <marker id="arrow-blue" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#2563EB" />
              </marker>
            </defs>

            {/* NODES */}
            {/* 1. Human Mandate */}
            <g transform="translate(20, 20)">
              <rect width="120" height="32" rx="4" fill="#065F46" stroke="#10B981" strokeWidth="1.5" />
              <text x="60" y="20" fill="#ECFDF5" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">
                HUMAN MANDATE
              </text>
            </g>

            {/* 2. Untrusted Invoice */}
            <g transform="translate(180, 20)">
              <rect
                width="120"
                height="32"
                rx="4"
                fill={isTainted ? "#7F1D1D" : "#065F46"}
                stroke={isTainted ? "#EF4444" : "#10B981"}
                strokeWidth="1.5"
              />
              <text x="60" y="20" fill="#FFF" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">
                {isTainted ? "UNTRUSTED INVOICE" : "CLEAN INVOICE"}
              </text>
            </g>

            {/* 3. Account Node */}
            <g transform="translate(180, 80)">
              <rect
                width="120"
                height="32"
                rx="4"
                fill={isTainted ? "#450A0A" : "#064E3B"}
                stroke={isTainted ? "#F87171" : "#34D399"}
                strokeWidth="1.5"
              />
              <text x="60" y="20" fill="#FFF" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">
                {dispatchResult ? dispatchResult.candidate_parameters.beneficiary_account : "ACCOUNT #9928"}
              </text>
            </g>

            {/* 4. VETO GATEWAY */}
            <g transform="translate(100, 135)">
              <rect
                width="120"
                height="32"
                rx="4"
                fill={vetoMode ? "#1E293B" : "#312E81"}
                stroke={vetoMode ? "#3B82F6" : "#6366F1"}
                strokeWidth="2"
              />
              <text x="60" y="20" fill="#93C5FD" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">
                {vetoMode ? "VETO GATEWAY" : "GATEWAY BYPASSED"}
              </text>
            </g>

            {/* 5. MOCK BANK */}
            <g transform="translate(230, 135)">
              <rect
                width="80"
                height="32"
                rx="4"
                fill={isBlocked ? "#1F2937" : !vetoMode && isTainted ? "#991B1B" : "#065F46"}
                stroke={isBlocked ? "#4B5563" : !vetoMode && isTainted ? "#EF4444" : "#10B981"}
                strokeWidth="1.5"
                opacity={isBlocked ? 0.4 : 1}
              />
              <text
                x="40"
                y="20"
                fill={isBlocked ? "#9CA3AF" : "#FFF"}
                fontSize="9"
                fontFamily="JetBrains Mono"
                fontWeight="bold"
                textAnchor="middle"
              >
                MOCK BANK
              </text>
            </g>

            {/* CONNECTING LINES */}
            {/* Mandate to Gateway */}
            <path d="M 80,52 L 80,95 L 130,135" fill="none" stroke="#10B981" strokeWidth="1.5" markerEnd="url(#arrow-emerald)" />

            {/* Invoice to Account */}
            <path d="M 240,52 L 240,80" fill="none" stroke={isTainted ? "#EF4444" : "#10B981"} strokeWidth="1.5" markerEnd={isTainted ? "url(#arrow-red)" : "url(#arrow-emerald)"} />

            {/* Account to Gateway */}
            <path d="M 240,112 L 200,135" fill="none" stroke={isTainted ? "#EF4444" : "#10B981"} strokeWidth="1.5" markerEnd={isTainted ? "url(#arrow-red)" : "url(#arrow-emerald)"} />

            {/* Gateway to Bank Flow */}
            {isBlocked ? (
              /* BARRIER X WHEN BLOCKED */
              <g transform="translate(210, 140)">
                <line x1="0" y1="0" x2="16" y2="20" stroke="#EF4444" strokeWidth="3" />
                <line x1="16" y1="0" x2="0" y2="20" stroke="#EF4444" strokeWidth="3" />
                <text x="8" y="30" fill="#EF4444" fontSize="8" fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">
                  INTERCEPTED
                </text>
              </g>
            ) : (
              <path
                d="M 220,151 L 230,151"
                fill="none"
                stroke={!vetoMode && isTainted ? "#EF4444" : "#10B981"}
                strokeWidth="2"
                markerEnd={!vetoMode && isTainted ? "url(#arrow-red)" : "url(#arrow-emerald)"}
              />
            )}
          </svg>
        </div>
      </div>

      {/* 12.3 TAMPER-EVIDENT AUDIT DOSSIER */}
      <div className="bg-white border border-gray-300 rounded p-3 space-y-2 shadow-xs flex-1 flex flex-col">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-gray-800 font-mono uppercase flex items-center space-x-1">
            <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>TAMPER-EVIDENT AUDIT DOSSIER</span>
          </span>
          {audit && (
            <span className="text-[10px] text-emerald-700 font-mono font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              {audit.gateway_latency_ms} ms
            </span>
          )}
        </div>

        <div className="bg-[#141720] border border-gray-800 rounded p-2.5 text-[11px] font-mono text-gray-300 flex-1 overflow-y-auto custom-scrollbar max-h-[190px]">
          {audit ? (
            <pre className="whitespace-pre-wrap font-mono text-gray-300">{JSON.stringify(audit, null, 2)}</pre>
          ) : (
            <span className="text-gray-500 italic text-[11px]">No audit dossier generated yet. Run dispatch.</span>
          )}
        </div>

        {audit && (
          <div className="flex space-x-2 pt-1">
            <button
              onClick={handleCopyJson}
              className="flex-1 py-1.5 px-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-xs font-mono font-semibold text-gray-800 flex items-center justify-center space-x-1 transition-all"
              id="copy-audit-json-btn"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-600" />}
              <span>{copied ? 'COPIED!' : '[ COPY AUDIT JSON ]'}</span>
            </button>

            <button
              onClick={handleExportJson}
              className="py-1.5 px-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-xs font-mono font-semibold text-gray-800 flex items-center justify-center space-x-1 transition-all"
              id="export-audit-json-btn"
            >
              <Download className="w-3.5 h-3.5 text-gray-600" />
              <span>EXPORT</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
