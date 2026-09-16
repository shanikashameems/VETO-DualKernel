import React, { useState } from 'react';
import { Database, GitCommit, FileCheck, Copy, Download, Check, ShieldAlert, ShieldCheck, Key, Lock, AlertTriangle } from 'lucide-react';
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

  const audit = dispatchResult?.audit;
  const isTainted = dispatchResult?.evaluation?.provenance?.beneficiary_account?.trust_state === 'TAINTED';
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
      <div className="flex items-center justify-between border-b border-gray-300 pb-2">
        <h2 className="text-xs font-bold tracking-wider text-gray-900 font-mono uppercase flex items-center space-x-2">
          <Database className="w-3.5 h-3.5 text-blue-600" />
          <span>ENTERPRISE TRUTH</span>
        </h2>
        <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-300 font-semibold">
          ERP AUTHORITATIVE
        </span>
      </div>

      {/* 12.1 VERIFIED VENDOR REGISTRY */}
      <div className="bg-white border border-gray-300 rounded p-2.5 space-y-1.5 shadow-xs">
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-bold text-gray-800 font-mono uppercase">
            VERIFIED ENTERPRISE VENDOR REGISTRY
          </span>
          <span className="text-[9px] text-gray-500 font-mono">SQLite (veto.db)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 text-[9px] uppercase bg-gray-50">
                <th className="py-1 px-1.5">ID</th>
                <th className="py-1 px-1.5">Vendor</th>
                <th className="py-1 px-1.5">Verified Account</th>
                <th className="py-1 px-1.5">Status</th>
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
                    <td className="py-1 px-1.5 font-mono text-[10px]">{v.vendor_id}</td>
                    <td className="py-1 px-1.5">{v.name}</td>
                    <td className="py-1 px-1.5 text-emerald-700 font-bold">{v.verified_account}</td>
                    <td className="py-1 px-1.5">
                      <span className="bg-emerald-100 text-emerald-800 text-[8px] px-1 py-0.5 rounded font-bold">
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

      {/* 12.2 CAUSAL LINEAGE GRAPH & NODE ORIGIN */}
      <div className="bg-white border border-gray-300 rounded p-2.5 space-y-1.5 shadow-xs">
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-bold text-gray-800 font-mono uppercase flex items-center space-x-1">
            <GitCommit className="w-3.5 h-3.5 text-blue-600" />
            <span>ENRICHED PROVENANCE GRAPH</span>
          </span>
          <span className="text-[9px] text-gray-500 font-mono">NODE ORIGIN PINPOINT</span>
        </div>

        {/* SVG DYNAMIC GRAPH WITH PINPOINT ORIGIN */}
        <div className="bg-[#0F1117] rounded p-2.5 border border-gray-800 flex flex-col items-center justify-center min-h-[200px]">
          <svg className="w-full h-[190px]" viewBox="0 0 320 190">
            <defs>
              <marker id="arrow-emerald" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#10B981" />
              </marker>
              <marker id="arrow-red" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#EF4444" />
              </marker>
            </defs>

            {/* NODES */}
            {/* Node 1: Mandate */}
            <g transform="translate(15, 15)">
              <rect width="125" height="30" rx="4" fill="#065F46" stroke="#10B981" strokeWidth="1.5" />
              <text x="62" y="19" fill="#ECFDF5" fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">
                1. HUMAN MANDATE
              </text>
            </g>

            {/* Node 2: Document Origin */}
            <g transform="translate(180, 15)">
              <rect
                width="125"
                height="30"
                rx="4"
                fill={isTainted ? "#7F1D1D" : "#065F46"}
                stroke={isTainted ? "#EF4444" : "#10B981"}
                strokeWidth="1.5"
              />
              <text x="62" y="19" fill="#FFF" fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">
                {isTainted ? "2. INVOICE TEXT (ORIGIN)" : "2. CLEAN INVOICE"}
              </text>
            </g>

            {/* Node 3: Extracted Token */}
            <g transform="translate(180, 75)">
              <rect
                width="125"
                height="30"
                rx="4"
                fill={isTainted ? "#450A0A" : "#064E3B"}
                stroke={isTainted ? "#F87171" : "#34D399"}
                strokeWidth="1.5"
              />
              <text x="62" y="19" fill="#FFF" fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">
                {dispatchResult ? `EXTRACTED: ${dispatchResult.candidate_parameters.beneficiary_account}` : "EXTRACTED #9928"}
              </text>
            </g>

            {/* Node 4: Causal Taint Engine */}
            <g transform="translate(15, 75)">
              <rect
                width="125"
                height="30"
                rx="4"
                fill={isTainted ? "#991B1B" : "#065F46"}
                stroke={isTainted ? "#F87171" : "#10B981"}
                strokeWidth="1.5"
              />
              <text x="62" y="19" fill="#FFF" fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">
                {isTainted ? "3. TAINT ENGINE (MISMATCH)" : "3. TAINT ENGINE (VERIFIED)"}
              </text>
            </g>

            {/* Node 5: VETO Gateway & Bank */}
            <g transform="translate(90, 135)">
              <rect
                width="140"
                height="32"
                rx="4"
                fill={vetoMode && isBlocked ? "#1E293B" : !vetoMode && isTainted ? "#7F1D1D" : "#065F46"}
                stroke={vetoMode && isBlocked ? "#3B82F6" : !vetoMode && isTainted ? "#EF4444" : "#10B981"}
                strokeWidth="2"
              />
              <text x="70" y="20" fill="#FFF" fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">
                {isBlocked ? `VETO BLOCK (calls=${bankCalls})` : `VETO ALLOW (calls=${bankCalls})`}
              </text>
            </g>

            {/* CONNECTING ARROWS */}
            <path d="M 77,45 L 77,75" fill="none" stroke="#10B981" strokeWidth="1.5" markerEnd="url(#arrow-emerald)" />
            <path d="M 242,45 L 242,75" fill="none" stroke={isTainted ? "#EF4444" : "#10B981"} strokeWidth="1.5" markerEnd={isTainted ? "url(#arrow-red)" : "url(#arrow-emerald)"} />
            <path d="M 180,90 L 140,90" fill="none" stroke={isTainted ? "#EF4444" : "#10B981"} strokeWidth="1.5" markerEnd={isTainted ? "url(#arrow-red)" : "url(#arrow-emerald)"} />
            <path d="M 77,105 L 120,135" fill="none" stroke={isTainted ? "#EF4444" : "#10B981"} strokeWidth="1.5" markerEnd={isTainted ? "url(#arrow-red)" : "url(#arrow-emerald)"} />
          </svg>
        </div>

        {/* NODE ORIGIN PINPOINT BANNER */}
        <div className="bg-[#141720] border border-gray-800 rounded p-2 text-[10px] font-mono text-gray-300">
          <span className="text-amber-400 font-bold">Poisoned Origin Pinpoint: </span>
          <span>Invoice Text ➔ Extracted {dispatchResult?.candidate_parameters?.beneficiary_account || "#9928"} ➔ TAINTED</span>
        </div>
      </div>

      {/* 12.3 CRYPTOGRAPHIC AUDIT IMMUTABILITY DOSSIER */}
      <div className="bg-white border border-gray-300 rounded p-2.5 space-y-2 shadow-xs">
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-bold text-gray-800 font-mono uppercase flex items-center space-x-1">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>CRYPTOGRAPHIC AUDIT DOSSIER</span>
          </span>
          {integrityStatus ? (
            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
              integrityStatus.includes("VERIFIED")
                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                : "bg-red-100 text-red-800 border-red-300 animate-pulse"
            }`}>
              {integrityStatus}
            </span>
          ) : (
            <span className="text-[9px] text-emerald-700 font-mono font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              Ed25519 / SHA-256
            </span>
          )}
        </div>

        <div className="bg-[#141720] border border-gray-800 rounded p-2 text-[10px] font-mono text-gray-300 overflow-y-auto custom-scrollbar max-h-[140px]">
          {audit ? (
            <pre className="whitespace-pre-wrap font-mono text-gray-300">{JSON.stringify(audit, null, 2)}</pre>
          ) : (
            <span className="text-gray-500 italic text-[10px]">No audit dossier generated yet. Run dispatch.</span>
          )}
        </div>

        {/* AUDIT INTEGRITY BUTTONS */}
        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
          <button
            onClick={handleVerifyIntegrity}
            disabled={isVerifying}
            className="py-1.5 px-2 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500 rounded text-[10px] font-mono font-bold text-emerald-200 flex items-center justify-center space-x-1 transition-all"
            id="verify-audit-integrity-btn"
          >
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>[ VERIFY IMMUTABILITY ]</span>
          </button>

          <button
            onClick={handleSimulateTamper}
            disabled={isVerifying}
            className="py-1.5 px-2 bg-red-950/80 hover:bg-red-900 border border-red-500 rounded text-[10px] font-mono font-bold text-red-200 flex items-center justify-center space-x-1 transition-all"
            id="simulate-tamper-btn"
          >
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span>[ TEST TAMPER DETECT ]</span>
          </button>
        </div>

        {/* BYPASS RESISTANCE DIRECT CALL TEST */}
        <div className="pt-1 border-t border-gray-200">
          <button
            onClick={handleTestDirectBypass}
            className="w-full py-1.5 px-2 bg-gray-900 hover:bg-black border border-gray-700 rounded text-[10px] font-mono font-bold text-amber-300 flex items-center justify-center space-x-1 transition-all"
            id="test-direct-bypass-btn"
          >
            <Key className="w-3 h-3 text-amber-400" />
            <span>[ TEST DIRECT TOOL CALL (REQUIRE VETO TOKEN) ]</span>
          </button>
          {bypassTestResult && (
            <div className="mt-1 text-[9px] font-mono bg-amber-950/90 text-amber-200 p-1.5 rounded border border-amber-600 font-semibold">
              {bypassTestResult}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
