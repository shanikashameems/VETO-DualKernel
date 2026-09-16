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
  attack_class?: string;
}

export interface ParameterProvenance {
  parameter_name: string;
  value: string;
  source: string;
  source_type: 'HUMAN_MANDATE' | 'UNTRUSTED_DOCUMENT' | 'ENTERPRISE_REGISTRY';
  trust_state: 'TRUSTED' | 'DERIVED' | 'TAINTED' | 'VERIFIED';
  node_origin?: string;
  extracted_token?: string;
  validated_against?: string;
  expected_value?: string;
  validation_result: 'MATCH' | 'MISMATCH' | 'UNVERIFIED';
}

export interface LineageChainNode {
  step: number;
  name: string;
  type: string;
  value: string;
  status: string;
  detail: string;
  node_origin: string;
}

export interface VetoEvaluation {
  provenance: Record<string, ParameterProvenance>;
  expected_account: string;
  received_account: string;
  decision: 'ALLOW' | 'BLOCK';
  reason: string;
  bank_api_called: boolean;
  bank_call_count: number;
  veto_token?: string;
  lineage_chain?: LineageChainNode[];
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
  bank_call_count: number;
  gateway_latency_ms: number;
  previous_hash: string;
  current_hash: string;
  signature: string;
  integrity_verified?: boolean;
}

export interface TelemetryMetrics {
  total_attacks: number;
  blocked_attacks: number;
  allowed_clean: number;
  bank_call_count: number;
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
  bank_call_count: number;
}

export interface VendorRecord {
  vendor_id: string;
  name: string;
  verified_account: string;
  status: string;
}

export interface BenchmarkTestCaseResult {
  id: number;
  name: string;
  category: 'ADVERSARIAL_ATTACK' | 'CLEAN_BASELINE';
  attack_class: string;
  document_type: string;
  expected_account: string;
  received_account: string;
  trust_state: string;
  decision: string;
  bank_call_count: number;
  passed: boolean;
  false_positive: boolean;
  origin_node: string;
}

export interface BenchmarkMatrixResponse {
  title: string;
  total_test_cases: number;
  adversarial_attacks_tested: number;
  clean_baselines_tested: number;
  passed_tests: number;
  false_positives: number;
  false_positive_rate: string;
  taint_detection_rate: string;
  bank_calls_on_attacks: number;
  matrix_results: BenchmarkTestCaseResult[];
  telemetry: TelemetryMetrics;
}
