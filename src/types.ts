export interface HumanMandate {
  session_id: string;
  intent_directive: string;
  approved_entity: string;
  authorized_amount_cap: string;
  authorized_amount_numeric: number;
  provenance: string;
}

export interface CandidateParameters {
  vendor: string;
  invoice_id: string;
  amount: number;
  beneficiary_account: string;
  document_source: string;
  has_injection: boolean;
}

export interface ParameterProvenance {
  parameter_name: string;
  value: string;
  source: string;
  source_type: 'HUMAN_MANDATE' | 'UNTRUSTED_DOCUMENT' | 'ENTERPRISE_REGISTRY';
  trust_state: 'TRUSTED' | 'DERIVED' | 'TAINTED';
  validated_against?: string;
  expected_value?: string;
  validation_result: 'MATCH' | 'MISMATCH' | 'UNVERIFIED';
}

export interface VetoEvaluation {
  provenance: Record<string, ParameterProvenance>;
  expected_account: string;
  received_account: string;
  decision: 'ALLOW' | 'BLOCK';
  reason: string;
  bank_api_called: boolean;
}

export interface AuditRecord {
  audit_id: string;
  timestamp: string;
  mandate_id: string;
  vendor: string;
  invoice_id: string;
  amount: number;
  received_beneficiary: string;
  verified_beneficiary: string;
  provenance_state: 'TRUSTED' | 'TAINTED' | 'VERIFIED';
  decision: 'ALLOWED' | 'BLOCKED';
  reason: string;
  bank_api_called: boolean;
  gateway_latency_ms: number;
}

export interface TelemetryMetrics {
  total_attacks: number;
  blocked_attacks: number;
  allowed_clean: number;
  taint_detection_pct: number;
  avg_latency_ms: number;
  false_positive_pct: number;
}

export interface DispatchStageLog {
  stage: string;
  timestamp: string;
  message: string;
  detail?: any;
}

export interface DispatchResponse {
  document_type: string;
  veto_mode: boolean;
  mandate: HumanMandate;
  candidate_parameters: CandidateParameters;
  provenance: Record<string, ParameterProvenance>;
  evaluation: VetoEvaluation;
  bank_response?: any;
  audit: AuditRecord;
  logs: DispatchStageLog[];
  metrics: TelemetryMetrics;
}

export interface VendorRecord {
  vendor_id: string;
  name: string;
  verified_account: string;
  status: string;
}
