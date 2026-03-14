import axios from "axios";

export const http = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  timeout: 180_000,
  headers: { "Content-Type": "application/json" },
});

// ── Domain types ───────────────────────────────────────────────────────────

export interface UserScale { current: number; target: number; growth_rate: string; }
export interface DataChars { write_heavy:boolean; read_heavy:boolean; relational:boolean; unstructured:boolean; estimated_db_size_gb:number; }

export interface RequirementsSpec {
  user_scale: UserScale;
  traffic_pattern: string;
  features: string[];
  data_characteristics: DataChars;
  compliance: string[];
  team_size: number;
  budget_tier: string;
  latency_sla_ms: number;
  availability_sla_percent: number;
  parse_confidence: number;
  parse_method: string;
}

export interface ServiceSpec {
  name: string;
  responsibility: string;
  tech_stack: string[];
  scales_independently: boolean;
  min_replicas: number;
  max_replicas: number;
}

export interface DataStoreSpec {
  name: string;
  engine: string;
  purpose: string;
  replication: boolean;
  notes: string;
}

export interface CommunicationPattern {
  from_service: string;
  to_service: string;
  protocol: string;
  pattern: string;
  notes: string;
}

export interface ScalingTier {
  current_tier: string;
  next_trigger: string;
  actions: string[];
}

export interface TradeOff {
  decision: string;
  pros: string[];
  cons: string[];
  alternatives: string[];
}

export interface CostEstimate {
  monthly_usd_low: number;
  monthly_usd_high: number;
  biggest_cost_driver: string;
  notes: string;
}

export interface Blueprint {
  architecture_pattern: string;
  deployment_model: string;
  primary_db: string;
  cache: string | null;
  search_engine: string | null;
  message_bus: string | null;
  realtime_transport: string | null;
  services: ServiceSpec[];
  data_stores: DataStoreSpec[];
  communication_patterns: CommunicationPattern[];
  scaling_strategy: ScalingTier[];
  trade_offs: TradeOff[];
  cost_estimate: CostEstimate | null;
  applied_rules: string[];
  recommendations: string[];
  enhancement_method: string;
}

export interface GenResult {
  requirements: RequirementsSpec;
  blueprint: Blueprint;
}

export interface ProgressEvent {
  stage: string;
  message?: string;
  [k: string]: unknown;
}

// ── API calls ──────────────────────────────────────────────────────────────

export async function generateSync(raw_input: string): Promise<GenResult> {
  const { data } = await http.post<GenResult>("/v1/generate/sync", { raw_input });
  return data;
}

export async function startJob(raw_input: string): Promise<{ job_id: string }> {
  const { data } = await http.post("/v1/generate", { raw_input });
  return data;
}

export async function getJob(job_id: string): Promise<{ status: string; result?: GenResult }> {
  const { data } = await http.get(`/v1/generate/${job_id}`);
  return data;
}

export function openStream(
  job_id: string,
  onEvent: (e: ProgressEvent) => void,
  onDone: () => void,
  onError: (msg: string) => void,
): () => void {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const es = new EventSource(`${base}/v1/generate/${job_id}/stream`);
  es.onmessage = (m) => {
    try {
      const ev: ProgressEvent = JSON.parse(m.data);
      onEvent(ev);
      if (ev.stage === "complete") { es.close(); onDone(); }
      if (ev.stage === "error")    { es.close(); onError(ev.message || "Failed"); }
    } catch { /* ignore */ }
  };
  es.onerror = () => { es.close(); onError("Connection lost"); };
  return () => es.close();
}
