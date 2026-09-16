import React, { useEffect, useRef } from 'react';
import { Terminal, ShieldAlert, ShieldCheck, CheckCircle2, AlertOctagon, Landmark } from 'lucide-react';
import { DispatchResponse, DispatchStageLog } from '../types';

interface DualKernelTraceProps {
  dispatchResult: DispatchResponse | null;
  vetoMode: boolean;
  isDispatching: boolean;
  visibleLogs: DispatchStageLog[];
}

export const DualKernelTrace: React.FC<DualKernelTraceProps> = ({
  dispatchResult,
  vetoMode,
  isDispatching,
  visibleLogs
}) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleLogs, dispatchResult]);

  const candidates = dispatchResult?.candidate_parameters;
  const evaluation = dispatchResult?.evaluation;
  const isTainted = evaluation?.provenance?.beneficiary_account?.trust_state === 'TAINTED';
  const decision = evaluation?.decision;
  const bankCalls = dispatchResult ? dispatchResult.bank_call_count : 0;

  return (
    <div className="bg-[#141720] border border-gray-800 rounded-lg flex flex-col h-full shadow-xl overflow-hidden">
      {/* TERMINAL HEADER */}
      <div className="bg-[#0B0D13] px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block"></span>
          </div>
          <span className="text-xs font-mono font-bold text-gray-400 ml-2">
            VETO-DUALKERNEL LIVE SECURITY TRACE
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-blue-400" />
          <span className="text-[11px] font-mono text-gray-400">CONSOLE ACTIVE</span>
        </div>
      </div>

      {/* TERMINAL BODY */}
      <div className="flex-1 p-4 font-mono text-xs overflow-y-auto custom-scrollbar space-y-4 bg-[#0F1117]">
        {!dispatchResult && visibleLogs.length === 0 && !isDispatching && (
          <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2 py-16">
            <Terminal className="w-10 h-10 text-gray-700 mb-1" />
            <p className="font-mono text-sm text-gray-400">AWAITING DISPATCH TRIGGER</p>
            <p className="text-xs text-gray-600">Click [ DISPATCH TO AGENT ] to initiate zero-trust execution trace</p>
          </div>
        )}

        {/* LOG MESSAGES STREAMING */}
        <div className="space-y-1.5">
          {visibleLogs.map((log, idx) => (
            <div key={idx} className="flex space-x-3 text-gray-300">
              <span className="text-gray-500 select-none">{log.timestamp}</span>
              <span className="text-blue-400 font-bold select-none">{log.stage}</span>
              <span className="flex-1">{log.message}</span>
            </div>
          ))}
        </div>

        {/* CANDIDATE PARAMETERS BOX (STAGE 1) */}
        {candidates && visibleLogs.some(l => l.stage === 'STAGE 1' && l.message.includes('emitted')) && (
          <div className="bg-[#1A1E2E] border border-blue-900/60 rounded p-3 text-xs space-y-1.5 my-2">
            <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-1 flex justify-between">
              <span>[KERNEL 01] PROPOSED CANDIDATE PARAMETERS</span>
              <span className="text-gray-400 text-[10px]">SANDBOXED INGESTION</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-gray-300">
              <div><span className="text-gray-500">vendor:</span> <span className="text-white font-bold">"{candidates.vendor}"</span></div>
              <div><span className="text-gray-500">invoice_id:</span> <span className="text-white">"#{candidates.invoice_id}"</span></div>
              <div><span className="text-gray-500">amount:</span> <span className="text-emerald-400 font-bold">₹5,00,000</span></div>
              <div>
                <span className="text-gray-500">beneficiary_account:</span>{' '}
                <span className={`font-bold ${candidates.has_injection ? 'text-red-400 underline decoration-red-500' : 'text-emerald-400'}`}>
                  "{candidates.beneficiary_account}"
                </span>
              </div>
            </div>
          </div>
        )}

        {/* LINEAGE & NODE ORIGIN RECONCILIATION BOX (STAGE 2) */}
        {evaluation && visibleLogs.some(l => l.stage === 'STAGE 2') && (
          <div className="bg-[#1C1520] border border-red-900/40 rounded p-3 space-y-2 my-2">
            <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
              <span>[STAGE 2] CAUSAL LINEAGE & NODE ORIGIN TRACE</span>
              <span className="text-gray-500 text-[10px]">ERP REGISTRY QUERY</span>
            </div>

            <div className="bg-[#11131C] p-2 rounded text-[11px] text-gray-300 font-mono space-y-1">
              <p className="text-blue-300">SELECT verified_account FROM erp_vendors WHERE name = '{candidates?.vendor}';</p>
              <div className="flex items-center justify-between text-xs pt-0.5">
                <span>Enterprise Truth Account: <strong className="text-emerald-400">{evaluation.expected_account}</strong></span>
                <span>Extracted Document Account: <strong className={isTainted ? 'text-red-400' : 'text-emerald-400'}>{evaluation.received_account}</strong></span>
              </div>
              <div className="text-[10px] text-amber-300/80 pt-1 border-t border-gray-800">
                <span>Node Origin Trace: </span>
                <span className="text-gray-300 font-semibold">
                  Invoice Text ➔ Extracted {evaluation.received_account} ➔ {isTainted ? 'TAINTED' : 'VERIFIED'}
                </span>
              </div>
            </div>

            {/* TAINT FLIP & EXECUTION BOUNDARY BADGE */}
            {isTainted ? (
              <div className="bg-red-950/80 border border-red-600 rounded p-2.5 flex items-center justify-between text-red-200">
                <div className="flex items-center space-x-2">
                  <AlertOctagon className="w-5 h-5 text-red-500 shrink-0" />
                  <div>
                    <div className="font-bold text-xs text-red-400">
                      TAINTED ➔ VETO BLOCK ➔ bank_call_count = {bankCalls}
                    </div>
                    <div className="text-[11px] text-red-300 font-mono">
                      MISMATCH DETECTED: {evaluation.received_account} != {evaluation.expected_account}
                    </div>
                  </div>
                </div>
                <span className="bg-red-600 text-white font-bold text-xs px-2.5 py-1 rounded">TAINTED</span>
              </div>
            ) : (
              <div className="bg-emerald-950/80 border border-emerald-600 rounded p-2.5 flex items-center justify-between text-emerald-200">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-bold text-xs text-emerald-400">
                      VERIFIED ➔ VETO ALLOW ➔ bank_call_count = {bankCalls}
                    </div>
                    <div className="text-[11px] text-emerald-300 font-mono">
                      INVARIANT MATCH: {evaluation.received_account} == {evaluation.expected_account}
                    </div>
                  </div>
                </div>
                <span className="bg-emerald-600 text-white font-bold text-xs px-2.5 py-1 rounded">VERIFIED</span>
              </div>
            )}
          </div>
        )}

        {/* FINAL ACTUATION KERNEL OUTCOME (STAGE 3) */}
        {evaluation && visibleLogs.some(l => l.stage === 'STAGE 3' && (l.message.includes('HTTP 200') || l.message.includes('VETO BLOCK') || l.message.includes('ABORT'))) && (
          <div className="mt-4 pt-2">
            {decision === 'BLOCK' ? (
              /* VETO ON & BLOCKED OUTCOME */
              <div className="bg-emerald-950/90 border-2 border-emerald-500 rounded-lg p-4 text-emerald-100 shadow-lg space-y-2">
                <div className="flex items-center justify-between border-b border-emerald-800/80 pb-2">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                    <div>
                      <span className="font-bold text-sm text-emerald-300 font-mono tracking-wide block">
                        EXECUTION BOUNDARY PROVED — ZERO FUNDS MOVED
                      </span>
                      <span className="text-[10px] text-emerald-400/80 font-mono">
                        TAINTED ➔ VETO BLOCK ➔ bank_call_count = {bankCalls}
                      </span>
                    </div>
                  </div>
                  <span className="bg-emerald-900 text-emerald-200 text-xs px-2.5 py-1 rounded border border-emerald-600 font-bold">
                    HTTP 403 FORBIDDEN
                  </span>
                </div>
                <div className="text-xs font-mono space-y-1 text-emerald-200/90">
                  <p>✓ VETO Gateway intercepted tainted parameter before network egress.</p>
                  <p>✓ Local Mock Banking API was NEVER called (bank_call_count = {bankCalls}).</p>
                  <p className="text-emerald-400 font-bold">Target Account: {evaluation.received_account} (BLOCKED)</p>
                  <p className="text-emerald-300 font-bold">Transaction Amount: ₹5,00,000 (PROTECTED)</p>
                </div>
              </div>
            ) : isTainted ? (
              /* VETO OFF & EXFILTRATED OUTCOME */
              <div className="bg-red-950/90 border-2 border-red-500 rounded-lg p-4 text-red-100 shadow-lg space-y-2 animate-bounce-once">
                <div className="flex items-center justify-between border-b border-red-800/80 pb-2">
                  <div className="flex items-center space-x-2">
                    <ShieldAlert className="w-6 h-6 text-red-400" />
                    <div>
                      <span className="font-bold text-sm text-red-200 font-mono tracking-wide block">
                        PAYMENT EXECUTED — CORPORATE LOSS DETECTED
                      </span>
                      <span className="text-[10px] text-red-300 font-mono">
                        TAINTED ➔ VETO BYPASSED ➔ bank_call_count = {bankCalls}
                      </span>
                    </div>
                  </div>
                  <span className="bg-red-900 text-red-200 text-xs px-2.5 py-1 rounded border border-red-600 font-bold">
                    HTTP 200 OK
                  </span>
                </div>
                <div className="text-xs font-mono space-y-1 text-red-200">
                  <p className="font-bold text-red-300 text-sm">₹5,00,000 EXFILTRATED TO MALICIOUS ACCOUNT {evaluation.received_account}</p>
                  <p>⚠️ VETO execution gate was DISABLED. Tainted parameters reached privileged bank API.</p>
                </div>
              </div>
            ) : (
              /* CLEAN INVOICE ALLOWED OUTCOME */
              <div className="bg-blue-950/90 border-2 border-blue-500 rounded-lg p-4 text-blue-100 shadow-lg space-y-2">
                <div className="flex items-center justify-between border-b border-blue-800/80 pb-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-6 h-6 text-blue-400" />
                    <div>
                      <span className="font-bold text-sm text-blue-200 font-mono tracking-wide block">
                        PROVENANCE VERIFIED — PAYMENT ALLOWED
                      </span>
                      <span className="text-[10px] text-blue-300 font-mono">
                        VERIFIED ➔ VETO ALLOW ➔ bank_call_count = {bankCalls}
                      </span>
                    </div>
                  </div>
                  <span className="bg-blue-900 text-blue-200 text-xs px-2.5 py-1 rounded border border-blue-600 font-bold">
                    HTTP 200 OK
                  </span>
                </div>
                <div className="text-xs font-mono space-y-1 text-blue-200">
                  <p>✓ Beneficiary account matches verified enterprise vendor registry ({evaluation.expected_account}).</p>
                  <p>✓ Mock payment of ₹5,00,000 settled with signed VETO token.</p>
                  <p className="text-emerald-400 font-bold">bank_call_count = {bankCalls}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};
