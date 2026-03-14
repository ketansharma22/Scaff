"use client";
import { useMemo, useState } from "react";
import ReactFlow, {
  Background, Controls, MiniMap,
  Node, Edge, BackgroundVariant,
  useNodesState, useEdgesState,
  MarkerType, Panel, NodeProps,
  Handle, Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { motion } from "framer-motion";
import type { GenResult } from "@/lib/api/client";

interface P { result: GenResult; }

// ── Data event types ───────────────────────────────────────────────────────
const EVENT_COLORS = {
  "user_action":   { color: "#4d9ef7", bg: "rgba(77,158,247,0.12)",  label: "User Action"   },
  "api_call":      { color: "#a78bfa", bg: "rgba(167,139,250,0.12)", label: "API Call"      },
  "db_write":      { color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  label: "DB Write"      },
  "db_read":       { color: "#4ade80", bg: "rgba(74,222,128,0.12)",  label: "DB Read"       },
  "cache_check":   { color: "#f97316", bg: "rgba(249,115,22,0.12)",  label: "Cache"         },
  "async_event":   { color: "#f87171", bg: "rgba(248,113,113,0.12)", label: "Async Event"   },
  "response":      { color: "#34d399", bg: "rgba(52,211,153,0.12)",  label: "Response"      },
};

type EventType = keyof typeof EVENT_COLORS;

interface FlowNode {
  id: string; label: string; type: EventType;
  desc?: string; x: number; y: number;
}

interface FlowEdge {
  from: string; to: string; label: string; type: EventType; animated?: boolean;
}

function buildDataFlow(result: GenResult): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const bp  = result.blueprint;
  const req = result.requirements;
  const hasAuth    = req.features?.some(f => f.includes("auth"));
  const hasCache   = !!bp.cache;
  const hasQueue   = !!bp.message_bus;
  const hasSearch  = !!bp.search_engine;
  const db         = bp.primary_db || "PostgreSQL";

  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];

  // ── Flow: User creates a resource ──────────────────────────────────────
  nodes.push(
    { id: "user",     label: "👤 User",           type: "user_action", desc: "Browser or mobile app", x: 400, y: 0    },
    { id: "gateway",  label: "🛡️ API Gateway",     type: "api_call",    desc: "Rate limit · Auth · Route", x: 400, y: 120 },
  );

  if (hasAuth) {
    nodes.push({ id: "auth",  label: "🔐 Auth Check",   type: "api_call",  desc: "Verify JWT token", x: 700, y: 120 });
    edges.push({ from: "gateway", to: "auth",    label: "verify token",  type: "api_call" });
    edges.push({ from: "auth",    to: "gateway", label: "✓ valid",       type: "response" });
  }

  nodes.push({ id: "api",    label: "⚙️ API Service",   type: "api_call",    desc: "Business logic · Validation", x: 400, y: 240 });
  edges.push({ from: "user",    to: "gateway", label: "POST /resource", type: "user_action", animated: true });
  edges.push({ from: "gateway", to: "api",     label: "route request",  type: "api_call"    });

  // Cache check
  if (hasCache) {
    nodes.push({ id: "cache",  label: `⚡ ${bp.cache}`,  type: "cache_check", desc: "Check cache first", x: 100, y: 340 });
    edges.push({ from: "api", to: "cache",  label: "check cache",    type: "cache_check" });
    edges.push({ from: "cache", to: "api",  label: "miss → fetch DB", type: "cache_check" });
  }

  // DB write
  nodes.push({ id: "db",     label: `🐘 ${db}`,          type: "db_write",    desc: "Persist data", x: 400, y: 360 });
  edges.push({ from: "api",  to: "db",    label: "INSERT / UPDATE",  type: "db_write", animated: true });
  edges.push({ from: "db",   to: "api",   label: "row returned",     type: "db_read"  });

  if (hasCache) {
    edges.push({ from: "api", to: "cache", label: "update cache",    type: "cache_check" });
  }

  // Async queue
  if (hasQueue) {
    nodes.push({ id: "queue",  label: `📨 ${bp.message_bus}`,  type: "async_event", desc: "Async event published", x: 700, y: 360 });
    nodes.push({ id: "worker", label: "🛠️ Worker",              type: "async_event", desc: "Email · Webhooks · Jobs", x: 700, y: 480 });
    edges.push({ from: "api",    to: "queue",  label: "publish event", type: "async_event", animated: true });
    edges.push({ from: "queue",  to: "worker", label: "consume",       type: "async_event", animated: true });
    edges.push({ from: "worker", to: "db",     label: "update status", type: "db_write"  });
  }

  // Search index
  if (hasSearch) {
    nodes.push({ id: "search", label: `🔍 ${bp.search_engine}`, type: "db_write", desc: "Search index updated", x: 100, y: 480 });
    edges.push({ from: hasQueue ? "worker" : "api", to: "search", label: "index document", type: "async_event" });
  }

  // Response
  nodes.push({ id: "resp",   label: "✅ Response",        type: "response",    desc: "JSON response to client", x: 400, y: 500 });
  edges.push({ from: "api",  to: "resp",  label: "201 Created",      type: "response", animated: true });
  edges.push({ from: "resp", to: "user",  label: "render UI",        type: "response" });

  return { nodes, edges };
}

// ── Custom node ────────────────────────────────────────────────────────────
function DataNode({ data }: NodeProps) {
  const ev = EVENT_COLORS[data.eventType as EventType] || EVENT_COLORS.api_call;
  return (
    <div style={{
      padding: "10px 14px", borderRadius: 11, minWidth: 140, maxWidth: 170,
      background: "#070707", border: `1px solid ${ev.color}55`,
      boxShadow: `0 0 16px ${ev.bg}, 0 4px 12px rgba(0,0,0,0.5)`,
      fontFamily: "'Cabinet Grotesk', system-ui, sans-serif",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: ev.color, boxShadow: `0 0 6px ${ev.color}`, flexShrink: 0 }} />
        <span style={{ fontSize: 9, fontWeight: 700, color: ev.color, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 0.5 }}>{ev.label}</span>
      </div>
      <p style={{ fontSize: 12, fontWeight: 700, color: "#fff", lineHeight: 1.2, marginBottom: 3 }}>{data.label}</p>
      {data.desc && <p style={{ fontSize: 10, color: "#6b7280", lineHeight: 1.3 }}>{data.desc}</p>}
      <Handle type="target" position={Position.Top}    style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left}   style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right}  style={{ opacity: 0 }} />
    </div>
  );
}

const nodeTypes = { dataNode: DataNode };

export default function DataFlowDiagram({ result }: P) {
  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => buildDataFlow(result), [result]);

  const rfNodes: Node[] = flowNodes.map(n => ({
    id: n.id, type: "dataNode",
    position: { x: n.x, y: n.y },
    data: { label: n.label, desc: n.desc, eventType: n.type },
  }));

  const rfEdges: Edge[] = flowEdges.map((e, i) => {
    const ev = EVENT_COLORS[e.type];
    return {
      id: `e-${i}`, source: e.from, target: e.to,
      animated: e.animated,
      label: e.label,
      labelStyle: { fill: ev.color, fontSize: 9, fontFamily: "'JetBrains Mono',monospace" },
      labelBgStyle: { fill: "#060606", fillOpacity: 0.9 },
      style: { stroke: ev.color, strokeWidth: 1.5, strokeDasharray: e.animated ? undefined : "4 3" },
      markerEnd: { type: MarkerType.ArrowClosed, color: ev.color },
    };
  });

  const [nodes, , onNodesChange] = useNodesState(rfNodes);
  const [edges, , onEdgesChange] = useEdgesState(rfEdges);

  const [activeFlow, setActiveFlow] = useState<string>("create");
  const flows = [
    { id: "create", label: "Create resource" },
    { id: "read",   label: "Read / List" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 3 }}>Data Flow Diagram</p>
          <p style={{ fontSize: 11, color: "#6b7280" }}>How data moves through your system for a typical request</p>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(EVENT_COLORS).slice(0, 5).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: v.color, boxShadow: `0 0 5px ${v.color}` }} />
              <span style={{ fontSize: 10, color: "#6b7280", fontFamily: "'JetBrains Mono',monospace" }}>{v.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Diagram */}
      <div style={{ height: 580, borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)", background: "#030303" }}>
        <ReactFlow
          nodes={nodes} edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3} maxZoom={2}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="rgba(255,255,255,0.04)" />
          <Controls showInteractive={false} />
          <MiniMap maskColor="rgba(0,0,0,0.92)" style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8 }} />

          <Panel position="top-left">
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 11, color: "#6b7280" }}>
              <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#374151", marginBottom: 6 }}>FLOW TYPE</p>
              <p style={{ color: "#4d9ef7", fontWeight: 600 }}>Create / Write Request</p>
              <p style={{ marginTop: 4, fontSize: 10 }}>Animated = realtime · Dashed = sync</p>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
