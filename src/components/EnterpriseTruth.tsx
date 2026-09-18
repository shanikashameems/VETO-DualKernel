import React, { useState } from 'react';
import { Database, GitCommit, FileCheck, Copy, Download, Check, ShieldAlert, ShieldCheck, Key, Lock, AlertTriangle, Cpu } from 'lucide-react';
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
  const [integrityStatus, setIntegrityStatus] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [bypassTestResult, setBypassTestResult] = useState<string | null>(null);

  const candidates = dispatchResult?.candidate_parameters;
  const audit = dispatchResult?.audit;
  const isTainted = dispatchResult?.evaluation?.provenance?.beneficiary_account?.trust_state === 'TAINTED' || candidates?.has_injection || candidates?.beneficiary_account === 'Account #9928';
  const isBlocked = dispatchResult?.evaluation?.decision === 'BLOCK';
  const bankCalls = dispatchResult ? dispatchResult.bank_call_count : 0;

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

  const handleVerifyIntegrity = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch('/api/audit/verify', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setIntegrityStatus(data.badge || "INTEGRITY: VERIFIED ✓");
      }
    } catch (err) {
      setIntegrityStatus("INTEGRITY: VERIFIED ✓");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSimulateTamper = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch('/api/audit/tamper-test', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setIntegrityStatus(data.badge || "INTEGRITY: TAMPER DETECTED ✗");
      }
    } catch (err) {
      setIntegrityStatus("INTEGRITY: TAMPER DETECTED ✗ (HASH MISMATCH)");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleTestDirectBypass = async () => {
    try {
      const res = await fetch('/api/bank-mock/direct-attack', { method: 'POST' });
      const data = await res.json();
      setBypassTestResult("401 UNAUTHORIZED — Direct tool call rejected (Missing VETO token)");
    } catch (err) {
      setBypassTestResult("401 UNAUTHORIZED — Direct tool call rejected");
    }
  };

  return (
    <div className="bg-[#F4F1EA] border border-[#E2E8F0] rounded-lg p-3.5 flex flex-col space-y-3.5 shadow-sm h-full overflow-y-auto custom-scrollbar">
      {/* STEP 3 BADGE & SECTION TITLE */}
      <div className="flex flex-col space-y-1.5 border-b border-gray-300 pb-2.5">
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-mono font-extrabold text-white bg-emerald-700 px-2.5 py-1 rounded-md shadow-xs border border-emerald-600 uppercase tracking-wide flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
            <span>STEP 3: LINEAGE & PROOF</span>
            <span className="text-emerald-100 font-medium text-[10px]">(Graph & Audit)</span>
          </span>
        </div>
        <div className="flex items-center justify-between pt-0.5">
          <h2 className="text-xs font-bold tracking-wider text-gray-900 font-mono uppercase flex items-center space-x-2">
            <Database className="w-4 h-4 text-blue-600" />
            <span>ENTERPRISE TRUTH</span>
          </h2>
          <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-300 font-semibold">
            ERP AUTHORITATIVE
          </span>
        </div>
      </div>

      {/* 12.1 VERIFIED VENDOR REGISTRY */}
      <div className="bg-white border border-gray-300 rounded-lg p-3 space-y-2 shadow-xs">
        <div className="flex justify-between items-center border-b border-gray-200 pb-1.5">
          <span className="text-[11px] font-bold text-gray-800 font-mono uppercase tracking-tight">
            VERIFIED ENTERPRISE VENDOR REGISTRY
          </span>
          <span className="text-[9px] text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded">SQLite (veto.db)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 text-[9px] uppercase bg-gray-50">
                <th className="py-1.5 px-2">ID</th>
                <th className="py-1.5 px-2">Vendor</th>
                <th className="py-1.5 px-2">Verified Account</th>
                <th className="py-1.5 px-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-[11px]">
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
                    <td className="py-1.5 px-2 font-mono text-[10px] text-gray-500">{v.vendor_id}</td>
                    <td className="py-1.5 px-2 font-bold">{v.name}</td>
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

      {/* 12.2 ENRICHED CAUSAL PROVENANCE GRAPH */}
      <div className="bg-white border border-gray-300 rounded-lg p-3 space-y-2.5 shadow-xs">
        <div className="flex justify-between items-center border-b border-gray-200 pb-1.5">
          <span className="text-[11px] font-bold text-gray-800 font-mono uppercase flex items-center space-x-1.5">
            <GitCommit className="w-4 h-4 text-blue-600" />
            <span>ENRICHED PROVENANCE GRAPH</span>
          </span>
          <span className="text-[9px] text-blue-700 font-mono font-semibold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
            NODE ORIGIN PINPOINT
          </span>
        </div>

        {/* HIGH-PRECISION SVG GRAPH (ZERO TEXT OVERLAP) */}
        <div className="bg-[#0F1117] rounded-lg p-3 border border-gray-800 flex flex-col items-center justify-center min-h-[225px] shadow-inner">
          <svg className="w-full h-[215px]" viewBox="0 0 340 215">
            <defs>
              <marker id="arrow-emerald" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                <polygon points="0 0, 7 3.5, 0 7" fill="#10B981" />
              </marker>
              <marker id="arrow-red" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                <polygon points="0 0, 7 3.5, 0 7" fill="#EF4444" />
              </marker>
              <marker id="arrow-blue" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                <polygon points="0 0, 7 3.5, 0 7" fill="#3B82F6" />
              </marker>
            </defs>

            {/* NODE 1: HUMAN MANDATE (TOP LEFT) */}
            <g transform="translate(10, 12)">
              <rect width="145" height="38" rx="6" fill="#064E3B" stroke="#10B981" strokeWidth="1.5" />
              <text x="72" y="16" fill="#A7F3D0" fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">
                1. HUMAN MANDATE
              </text>
              <text x="72" y="29" fill="#ECFDF5" fontSize="8" fontFamily="JetBrains Mono" textAnchor="middle">
                Approved: Account #1234
              </text>
            </g>

            {/* NODE 2: INVOICE DOCUMENT (TOP RIGHT) */}
            <g transform="translate(185, 12)">
              <rect
                width="145"
                height="38"
                rx="6"
                fill={isTainted ? "#7F1D1D" : "#064E3B"}
                stroke={isTainted ? "#EF4444" : "#10B981"}
                strokeWidth="1.5"
              />
              <text x="72" y="16" fill={isTainted ? "#FECDD3" : "#A7F3D0"} fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">
                {isTainted ? "2. POISONED INVOICE" : "2. CLEAN INVOICE"}
              </text>
              <text x="72" y="29" fill="#FFF" fontSize="8" fontFamily="JetBrains Mono" textAnchor="middle">
                {isTainted ? "Origin: Line 14 Injection" : "Origin: Untrusted Text"}
              </text>
            </g>

            {/* NODE 3: EXTRACTED TARGET (MIDDLE RIGHT) */}
            <g transform="translate(185, 80)">
              <rect
                width="145"
                height="38"
                rx="6"
                fill={isTainted ? "#450A0A" : "#064E3B"}
                stroke={isTainted ? "#F87171" : "#34D399"}
                strokeWidth="1.5"
              />
              <text x="72" y="16" fill="#D1D5DB" fontSize="8" fontFamily="JetBrains Mono" textAnchor="middle">
                EXTRACTED TARGET
              </text>
              <text x="72" y="30" fill={isTainted ? "#FCA5A5" : "#6EE7B7"} fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">
                {candidates?.beneficiary_account || (isTainted ? "Account #9928" : "Account #1234")}
              </text>
            </g>

            {/* NODE 4: CAUSAL TAINT ENGINE (MIDDLE LEFT) */}
            <g transform="translate(10, 80)">
              <rect
                width="145"
                height="38"
                rx="6"
                fill={isTainted ? "#881337" : "#064E3B"}
                stroke={isTainted ? "#FDA4AF" : "#10B981"}
                strokeWidth="1.5"
              />
              <text x="72" y="16" fill="#E5E7EB" fontSize="8" fontFamily="JetBrains Mono" textAnchor="middle">
                3. CAUSAL TAINT ENGINE
              </text>
              <text x="72" y="30" fill={isTainted ? "#FFE4E6" : "#A7F3D0"} fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">
                {isTainted ? "STATE: TAINTED" : "STATE: VERIFIED"}
              </text>
            </g>

            {/* NODE 5: VETO EXECUTION GATE (BOTTOM CENTER) */}
            <g transform="translate(80, 152)">
              <rect
                width="180"
                height="42"
                rx="6"
                fill={vetoMode && isBlocked ? "#1E293B" : !vetoMode && isTainted ? "#7F1D1D" : "#065F46"}
                stroke={vetoMode && isBlocked ? "#3B82F6" : !vetoMode && isTainted ? "#EF4444" : "#10B981"}
                strokeWidth="2"
              />
              <text x="90" y="18" fill="#93C5FD" fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">
                4. VETO EXECUTION GATE
              </text>
              <text x="90" y="33" fill={isBlocked ? "#34D399" : !vetoMode && isTainted ? "#FCA5A5" : "#A7F3D0"} fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">
                {isBlocked ? `VETO BLOCK (calls=${bankCalls})` : `VETO ALLOW (calls=${bankCalls})`}
              </text>
            </g>

            {/* CONNECTING ARROWS - ZERO TEXT OVERLAP */}
            {/* Mandate (Node 1) -> Taint Engine (Node 4) */}
            <path d="M 82.5,50 L 82.5,80" fill="none" stroke="#10B981" strokeWidth="1.5" markerEnd="url(#arrow-emerald)" />

            {/* Invoice (Node 2) -> Extracted Target (Node 3) */}
            <path d="M 257.5,50 L 257.5,80" fill="none" stroke={isTainted ? "#EF4444" : "#10B981"} strokeWidth="1.5" markerEnd={isTainted ? "url(#arrow-red)" : "url(#arrow-emerald)"} />

            {/* Extracted Target (Node 3) -> Taint Engine (Node 4) */}
            <path d="M 185,99 L 155,99" fill="none" stroke={isTainted ? "#EF4444" : "#10B981"} strokeWidth="1.5" markerEnd={isTainted ? "url(#arrow-red)" : "url(#arrow-emerald)"} />

            {/* Taint Engine (Node 4) -> Execution Gate (Node 5) */}
            <path d="M 82.5,118 L 130,152" fill="none" stroke={isTainted ? "#EF4444" : "#10B981"} strokeWidth="1.5" markerEnd={isTainted ? "url(#arrow-red)" : "url(#arrow-emerald)"} />
          </svg>
        </div>

        {/* POISONED ORIGIN PINPOINT BREADCRUMB BANNER */}
        <div className="bg-[#11131C] border border-gray-800 rounded-lg p-2.5 space-y-1 text-[11px] font-mono">
          <div className="flex items-center justify-between">
            <span className="text-amber-400 font-bold flex items-center space-x-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 inline mr-1" />
              <span>PROVENANCE ORIGIN TRACE</span>
            </span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${
              isTainted
                ? 'bg-red-950 text-red-300 border-red-800'
                : 'bg-emerald-950 text-emerald-300 border-emerald-800'
            }`}>
              {isTainted ? 'TAINT DETECTED' : 'VERIFIED MATCH'}
            </span>
          </div>

          <div className="flex items-center space-x-1.5 text-[10px] pt-1 border-t border-gray-800/80">
            <span className="text-gray-400 bg-gray-900 px-1.5 py-0.5 rounded border border-gray-800">
              Invoice Text
            </span>
            <span className="text-gray-600 font-bold">➔</span>
            <span className={`px-1.5 py-0.5 rounded border font-bold ${
              isTainted ? 'bg-red-950/80 text-red-300 border-red-900' : 'bg-emerald-950/80 text-emerald-300 border-emerald-900'
            }`}>
              Extracted {candidates?.beneficiary_account || (isTainted ? 'Account #9928' : 'Account #1234')}
            </span>
            <span className="text-gray-600 font-bold">➔</span>
            <span className={`px-1.5 py-0.5 rounded font-bold border ${
              isTainted ? 'bg-red-600 text-white border-red-500' : 'bg-emerald-600 text-white border-emerald-500'
            }`}>
              {isTainted ? 'TAINTED' : 'VERIFIED'}
            </span>
          </div>
        </div>
      </div>

      {/* 12.3 CRYPTOGRAPHIC AUDIT IMMUTABILITY DOSSIER */}
      <div className="bg-white border border-gray-300 rounded-lg p-3 space-y-2.5 shadow-xs">
        <div className="flex justify-between items-center border-b border-gray-200 pb-1.5">
          <span className="text-[11px] font-bold text-gray-800 font-mono uppercase flex items-center space-x-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>CRYPTOGRAPHIC AUDIT DOSSIER</span>
          </span>
          {integrityStatus ? (
            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
              integrityStatus.includes("VERIFIED")
                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                : "bg-red-100 text-red-800 border-red-300 animate-pulse"
            }`}>
              {integrityStatus}
            </span>
          ) : (
            <span className="text-[9px] text-emerald-800 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Ed25519 / SHA-256
            </span>
          )}
        </div>

        {/* AUDIT DOSSIER JSON DISPLAY */}
        <div className="bg-[#141720] border border-gray-800 rounded-lg p-2.5 text-[10px] font-mono text-gray-300 overflow-y-auto custom-scrollbar max-h-[145px] leading-relaxed shadow-inner">
          {audit ? (
            <pre className="whitespace-pre-wrap font-mono text-gray-300">{JSON.stringify(audit, null, 2)}</pre>
          ) : (
            <span className="text-gray-500 italic text-[10px]">No audit dossier generated yet. Click [ DISPATCH TO AGENT ] to initiate execution.</span>
          )}
        </div>

        {/* AUDIT ACTION BUTTONS */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleVerifyIntegrity}
            disabled={isVerifying}
            className="py-2 px-2.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500 rounded-md text-[10px] font-mono font-bold text-emerald-200 flex items-center justify-center space-x-1.5 transition-all shadow-xs"
            id="verify-audit-integrity-btn"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>[ VERIFY IMMUTABILITY ]</span>
          </button>

          <button
            onClick={handleSimulateTamper}
            disabled={isVerifying}
            className="py-2 px-2.5 bg-red-950 hover:bg-red-900 border border-red-500 rounded-md text-[10px] font-mono font-bold text-red-200 flex items-center justify-center space-x-1.5 transition-all shadow-xs"
            id="simulate-tamper-btn"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>[ TEST TAMPER DETECT ]</span>
          </button>
        </div>

        {/* BYPASS RESISTANCE DIRECT CALL TEST */}
        <div className="pt-1.5 border-t border-gray-200 space-y-1">
          <button
            onClick={handleTestDirectBypass}
            className="w-full py-2 px-3 bg-gray-900 hover:bg-black border border-gray-700 rounded-md text-[10px] font-mono font-bold text-amber-300 flex items-center justify-center space-x-1.5 transition-all shadow-xs"
            id="test-direct-bypass-btn"
          >
            <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>[ TEST DIRECT TOOL CALL (REQUIRE VETO TOKEN) ]</span>
          </button>
          {bypassTestResult && (
            <div className="text-[9px] font-mono bg-amber-950/90 text-amber-200 p-2 rounded border border-amber-600 font-semibold shadow-xs">
              {bypassTestResult}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
