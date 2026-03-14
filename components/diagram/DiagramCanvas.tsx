"use client";
import { useMemo, useState, useCallback } from "react";
import ReactFlow, {
  Background, Controls, MiniMap,
  Node, Edge, BackgroundVariant,
  useNodesState, useEdgesState,
  MarkerType, Panel, NodeProps,
  Handle, Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import { X, Maximize2, Minimize2, Info, Zap, Database, Server, Globe, Shield, GitBranch, Radio } from "lucide-react";
import type { Blueprint } from "@/lib/api/client";

interface P { blueprint: Blueprint; }

// ── Node color palette by type ─────────────────────────────────────────────
const NODE_PALETTE: Record<string, { bg: string; border: string; glow: string; text: string; icon: React.ElementType; badge: string }> = {
  client:     { bg: "#0a0f1e", border: "#3b82f6", glow: "rgba(59,130,246,0.3)",  text: "#60a5fa", icon: Globe,      badge: "CLIENT"    },
  gateway:    { bg: "#0f0a1e", border: "#8b5cf6", glow: "rgba(139,92,246,0.3)",  text: "#a78bfa", icon: Shield,     badge: "GATEWAY"   },
  service:    { bg: "#0a1628", border: "#1d4ed8", glow: "rgba(29,78,216,0.25)",  text: "#4d9ef7", icon: Server,     badge: "SERVICE"   },
  worker:     { bg: "#180d05", border: "#c2410c", glow: "rgba(194,65,12,0.25)",  text: "#fb923c", icon: Zap,        badge: "WORKER"    },
  postgresql: { bg: "#160f00", border: "#92400e", glow: "rgba(146,64,14,0.3)",   text: "#fbbf24", icon: Database,   badge: "POSTGRES"  },
  mongodb:    { bg: "#001a0a", border: "#15803d", glow: "rgba(21,128,61,0.3)",   text: "#4ade80", icon: Database,   badge: "MONGO"     },
  redis:      { bg: "#1a0500", border: "#dc2626", glow: "rgba(220,38,38,0.25)",  text: "#f87171", icon: Zap,        badge: "REDIS"     },
  cache:      { bg: "#1a0500", border: "#dc2626", glow: "rgba(220,38,38,0.25)",  text: "#f87171", icon: Zap,        badge: "CACHE"     },
  opensearch: { bg: "#100018", border: "#7c3aed", glow: "rgba(124,58,237,0.3)",  text: "#a78bfa", icon: GitBranch,  badge: "SEARCH"    },
  kafka:      { bg: "#001418", border: "#0e7490", glow: "rgba(14,116,144,0.3)",  text: "#38bdf8", icon: Radio,      badge: "KAFKA"     },
  queue:      { bg: "#001418", border: "#0e7490", glow: "rgba(14,116,144,0.3)",  text: "#38bdf8", icon: Radio,      badge: "QUEUE"     },
  default:    { bg: "#0f0f0f", border: "#374151", glow: "rgba(55,65,81,0.2)",    text: "#9ca3af", icon: Server,     badge: "SERVICE"   },
};

const EMOJI: Record<string, string> = {
  client:"🌐", gateway:"🛡️", service:"⚙️", worker:"🛠️",
  postgresql:"🐘", mongodb:"🍃", redis:"⚡", cache:"⚡",
  opensearch:"🔍", kafka:"📨", queue:"📨", default:"📦",
};

function getPalette(name: string, engine?: string) {
  const key = (engine || name || "").toLowerCase().replace(/[_\s-]/g, "");
  return NODE_PALETTE[key] || NODE_PALETTE[name?.toLowerCase()?.replace(/[_\s-]/g,"")] || NODE_PALETTE.default;
}

function getEmoji(name: string, engine?: string) {
  const key = (engine || name || "").toLowerCase().replace(/[_\s-]/g, "");
  return EMOJI[key] || EMOJI[name?.toLowerCase()?.replace(/[_\s-]/g,"")] || EMOJI.default;
}

// ── Custom Node Component ──────────────────────────────────────────────────
function ArchNode({ data, selected }: NodeProps) {
  const p = data.palette;
  const Icon = p.icon;
  return (
    <div
      style={{
        background: p.bg,
        border: `1px solid ${selected ? "#fff" : p.border}`,
        borderRadius: 14,
        padding: "12px 16px",
        minWidth: 140,
        maxWidth: 170,
        cursor: "pointer",
        boxShadow: selected
          ? `0 0 0 2px ${p.border}, 0 0 32px ${p.glow}, 0 8px 32px rgba(0,0,0,0.6)`
          : `0 0 20px ${p.glow}, 0 4px 16px rgba(0,0,0,0.5)`,
        transition: "all 0.2s ease",
        fontFamily: "'Cabinet Grotesk', system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Glow inner */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: 14,
        background: `radial-gradient(ellipse at 50% 0%, ${p.glow} 0%, transparent 65%)`,
        pointerEvents: "none",
      }}/>

      {/* Badge */}
      <div style={{
        position: "absolute", top: 8, right: 10,
        fontSize: 8, fontWeight: 700, letterSpacing: 1,
        color: p.text, opacity: 0.6,
        fontFamily: "'JetBrains Mono', monospace",
      }}>{p.badge}</div>

      {/* Icon + emoji */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: `${p.border}22`, border: `1px solid ${p.border}44`,
          fontSize: 16,
        }}>
          {data.emoji}
        </div>
        <Icon size={12} style={{ color: p.text, opacity: 0.7 }} />
      </div>

      {/* Label */}
      <p style={{
        fontSize: 13, fontWeight: 700, color: "#fff",
        lineHeight: 1.2, marginBottom: 4,
        textTransform: "capitalize",
      }}>
        {data.label}
      </p>

      {/* Subtitle */}
      {data.subtitle && (
        <p style={{
          fontSize: 9, color: p.text, opacity: 0.7,
          fontFamily: "'JetBrains Mono', monospace",
          lineHeight: 1.3,
        }}>
          {data.subtitle}
        </p>
      )}

      {/* Replicas badge */}
      {data.replicas && (
        <div style={{
          marginTop: 6, display: "inline-flex", alignItems: "center", gap: 3,
          padding: "2px 6px", borderRadius: 99,
          background: `${p.border}18`, border: `1px solid ${p.border}33`,
          fontSize: 9, color: p.text,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          ×{data.replicas}
        </div>
      )}

      <Handle type="target" position={Position.Top}    style={{ opacity: 0, width: 8, height: 8 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, width: 8, height: 8 }} />
      <Handle type="target" position={Position.Left}   style={{ opacity: 0, width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right}  style={{ opacity: 0, width: 8, height: 8 }} />
    </div>
  );
}

// ── Tier label node ────────────────────────────────────────────────────────
function TierLabelNode({ data }: NodeProps) {
  return (
    <div style={{
      padding: "4px 14px", borderRadius: 99,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)",
      fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
      color: "rgba(255,255,255,0.25)",
      fontFamily: "'JetBrains Mono', monospace",
      textTransform: "uppercase",
      pointerEvents: "none",
    }}>
      {data.label}
    </div>
  );
}

const nodeTypes = { arch: ArchNode, tierLabel: TierLabelNode };

// ── Graph builder ──────────────────────────────────────────────────────────
function buildGraph(bp: Blueprint): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const idMap: Record<string, string> = {};

  const NODE_W = 160;
  const NODE_H = 110;
  const GAP_X  = 60;
  const GAP_Y  = 100;

  // ── Tier definitions ──
  // Tier 0: Client layer
  // Tier 1: Gateway / API layer
  // Tier 2: Services layer
  // Tier 3: Data layer

  const svcs = bp.services?.length > 0 ? bp.services : [
    { name: "api", responsibility: "Core REST API", tech_stack: ["FastAPI"], min_replicas: 1, max_replicas: 4, scales_independently: true },
    ...(bp.cache ? [{ name: "worker", responsibility: "Background jobs", tech_stack: ["Celery"], min_replicas: 1, max_replicas: 2, scales_independently: true }] : []),
  ];

  const stores = bp.data_stores?.length > 0 ? bp.data_stores : [
    { name: bp.primary_db || "postgresql", engine: bp.primary_db || "postgresql", purpose: "Primary DB", replication: false, notes: "" },
    ...(bp.cache ? [{ name: bp.cache, engine: bp.cache, purpose: "Cache", replication: false, notes: "" }] : []),
  ];

  // Classify services into tiers
  const gatewayNames = ["api_gateway", "gateway", "load_balancer", "nginx", "traefik", "api"];
  const workerNames  = ["worker", "celery", "job", "scheduler", "cron", "processor"];

  const gatewayServices = svcs.filter(s => gatewayNames.some(g => s.name.toLowerCase().includes(g)));
  const workerServices  = svcs.filter(s => workerNames.some(w => s.name.toLowerCase().includes(w)) && !gatewayNames.some(g => s.name.toLowerCase().includes(g)));
  const coreServices    = svcs.filter(s => !gatewayServices.includes(s) && !workerServices.includes(s));

  let nodeId = 0;
  const mkId = () => `n-${nodeId++}`;

  // ── Tier label nodes ──
  const tiers = [
    { label: "── Client Layer ──",   y: -50 },
    { label: "── Gateway Layer ──",  y: NODE_H + GAP_Y - 50 },
    { label: "── Service Layer ──",  y: (NODE_H + GAP_Y) * 2 - 50 },
    { label: "── Data Layer ──",     y: (NODE_H + GAP_Y) * 3 - 50 },
  ];

  const canvasW = Math.max(svcs.length, stores.length) * (NODE_W + GAP_X);

  tiers.forEach((t, i) => {
    const tid = mkId();
    nodes.push({
      id: tid, type: "tierLabel",
      position: { x: canvasW / 2 - 80, y: t.y },
      data: { label: t.label },
      draggable: false, selectable: false,
    });
  });

  // ── Client node ──
  const clientId = mkId();
  nodes.push({
    id: clientId, type: "arch",
    position: { x: canvasW / 2 - NODE_W / 2, y: 0 },
    data: {
      label: "Browser / Mobile",
      emoji: "🌐",
      subtitle: "Web · iOS · Android",
      palette: NODE_PALETTE.client,
    },
  });
  idMap["client"] = clientId;

  // ── Gateway tier ──
  const gwY = NODE_H + GAP_Y;
  const gwServices = gatewayServices.length > 0 ? gatewayServices : [{ name: "api_gateway", responsibility: "Load balancer & rate limiting", tech_stack: ["Nginx"], min_replicas: 1, max_replicas: 2, scales_independently: true }];
  const gwStartX = canvasW / 2 - (gwServices.length * (NODE_W + GAP_X) - GAP_X) / 2;

  gwServices.forEach((s, i) => {
    const id = mkId();
    idMap[s.name] = id;
    const p = getPalette("gateway");
    nodes.push({
      id, type: "arch",
      position: { x: gwStartX + i * (NODE_W + GAP_X), y: gwY },
      data: {
        label: s.name.replace(/_/g, " "),
        emoji: "🛡️",
        subtitle: s.tech_stack?.[0] || "Gateway",
        replicas: s.max_replicas > 1 ? `${s.min_replicas}–${s.max_replicas}` : null,
        palette: NODE_PALETTE.gateway,
        meta: s,
      },
    });
    // client → gateway
    edges.push({
      id: `e-client-${id}`, source: clientId, target: id,
      animated: true,
      label: "HTTPS",
      labelStyle: { fill: "#6b7280", fontSize: 9, fontFamily: "'JetBrains Mono',monospace" },
      labelBgStyle: { fill: "#050505", fillOpacity: 0.9 },
      style: { stroke: "#3b82f6", strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#3b82f6" },
    });
  });

  // ── Service tier ──
  const svcY = (NODE_H + GAP_Y) * 2;
  const allCoreAndWorker = [...coreServices, ...workerServices];
  const svcStartX = canvasW / 2 - (allCoreAndWorker.length * (NODE_W + GAP_X) - GAP_X) / 2;

  allCoreAndWorker.forEach((s, i) => {
    const id = mkId();
    idMap[s.name] = id;
    const isWorker = workerServices.includes(s);
    const p = isWorker ? NODE_PALETTE.worker : getPalette(s.name);
    nodes.push({
      id, type: "arch",
      position: { x: svcStartX + i * (NODE_W + GAP_X), y: svcY },
      data: {
        label: s.name.replace(/_/g, " "),
        emoji: isWorker ? "🛠️" : "⚙️",
        subtitle: s.tech_stack?.[0] || "",
        replicas: s.max_replicas > 1 ? `${s.min_replicas}–${s.max_replicas}` : null,
        palette: p,
        meta: s,
      },
    });

    // gateway → service
    const gwId = Object.values(idMap).find(v =>
      nodes.find(n => n.id === v && n.data?.palette === NODE_PALETTE.gateway)
    );
    if (gwId) {
      edges.push({
        id: `e-gw-${id}`, source: gwId, target: id,
        style: { stroke: "rgba(139,92,246,0.5)", strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(139,92,246,0.6)" },
      });
    }
  });

  // ── Data tier ──
  const dsY = (NODE_H + GAP_Y) * 3;
  const dsStartX = canvasW / 2 - (stores.length * (NODE_W + GAP_X) - GAP_X) / 2;

  stores.forEach((d, i) => {
    const id = mkId();
    idMap[d.name] = id; idMap[d.engine] = id;
    const p = getPalette(d.name, d.engine);
    nodes.push({
      id, type: "arch",
      position: { x: dsStartX + i * (NODE_W + GAP_X), y: dsY },
      data: {
        label: d.name.replace(/_/g, " "),
        emoji: getEmoji(d.name, d.engine),
        subtitle: d.engine !== d.name ? d.engine : d.purpose?.slice(0, 20),
        palette: p,
        meta: d,
      },
    });
  });

  // ── Communication pattern edges ──
  if (bp.communication_patterns?.length > 0) {
    bp.communication_patterns.forEach((cp, i) => {
      const src = idMap[cp.from_service] || idMap[cp.from_service?.toLowerCase()];
      const tgt = idMap[cp.to_service]   || idMap[cp.to_service?.toLowerCase()];
      if (!src || !tgt || src === tgt) return;
      const isAsync = cp.pattern === "async";
      edges.push({
        id: `e-cp-${i}`, source: src, target: tgt,
        animated: isAsync,
        label: cp.protocol,
        labelStyle: { fill: isAsync ? "#fb923c" : "#6b7280", fontSize: 9, fontFamily: "'JetBrains Mono',monospace" },
        labelBgStyle: { fill: "#050505", fillOpacity: 0.9 },
        style: {
          stroke: isAsync ? "rgba(251,146,60,0.6)" : "rgba(255,255,255,0.15)",
          strokeWidth: 1.5,
          strokeDasharray: isAsync ? "6 3" : undefined,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: isAsync ? "rgba(251,146,60,0.7)" : "rgba(255,255,255,0.25)" },
      });
    });
  } else {
    // Default: connect first service to all data stores
    const firstSvcId = allCoreAndWorker[0] ? idMap[allCoreAndWorker[0].name] : null;
    if (firstSvcId) {
      stores.forEach((d, i) => {
        const did = idMap[d.engine] || idMap[d.name];
        if (did) {
          edges.push({
            id: `e-default-ds-${i}`, source: firstSvcId, target: did,
            style: { stroke: "rgba(255,255,255,0.1)", strokeWidth: 1.5, strokeDasharray: "4 3" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(255,255,255,0.2)" },
          });
        }
      });
    }
  }

  return { nodes, edges };
}

// ── Node Detail Panel ──────────────────────────────────────────────────────
function NodeDetailPanel({ node, onClose }: { node: Node | null; onClose: () => void }) {
  if (!node) return null;
  const { data } = node;
  const p = data.palette;
  const meta = data.meta;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
        style={{
          position: "absolute", top: 16, right: 16, width: 260, zIndex: 10,
          background: "#080808", border: `1px solid ${p.border}44`,
          borderRadius: 14, overflow: "hidden",
          boxShadow: `0 0 40px ${p.glow}, 0 8px 32px rgba(0,0,0,0.8)`,
          fontFamily: "'Cabinet Grotesk', system-ui, sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", background: `${p.border}0d` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ fontSize: 20 }}>{data.emoji}</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", textTransform: "capitalize" }}>{data.label}</p>
              <p style={{ fontSize: 9, color: p.text, fontFamily: "'JetBrains Mono',monospace", marginTop: 1 }}>{p.badge}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: 4, borderRadius: 6 }}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {data.subtitle && (
            <div>
              <p style={{ fontSize: 10, color: "#6b7280", marginBottom: 3, fontFamily: "'JetBrains Mono',monospace" }}>TECH</p>
              <p style={{ fontSize: 12, color: "#e5e7eb" }}>{data.subtitle}</p>
            </div>
          )}

          {meta?.responsibility && (
            <div>
              <p style={{ fontSize: 10, color: "#6b7280", marginBottom: 3, fontFamily: "'JetBrains Mono',monospace" }}>RESPONSIBILITY</p>
              <p style={{ fontSize: 12, color: "#d1d5db", lineHeight: 1.5 }}>{meta.responsibility}</p>
            </div>
          )}

          {meta?.tech_stack?.length > 0 && (
            <div>
              <p style={{ fontSize: 10, color: "#6b7280", marginBottom: 6, fontFamily: "'JetBrains Mono',monospace" }}>STACK</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {meta.tech_stack.map((t: string) => (
                  <span key={t} style={{ padding: "2px 8px", borderRadius: 99, fontSize: 10, background: `${p.border}18`, border: `1px solid ${p.border}33`, color: p.text, fontFamily: "'JetBrains Mono',monospace" }}>{t}</span>
                ))}
              </div>
            </div>
          )}

          {meta?.min_replicas != null && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "MIN REPLICAS", val: meta.min_replicas },
                { label: "MAX REPLICAS", val: meta.max_replicas },
              ].map(({ label, val }) => (
                <div key={label} style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p style={{ fontSize: 9, color: "#6b7280", marginBottom: 3, fontFamily: "'JetBrains Mono',monospace" }}>{label}</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: p.text }}>{val}</p>
                </div>
              ))}
            </div>
          )}

          {meta?.purpose && (
            <div>
              <p style={{ fontSize: 10, color: "#6b7280", marginBottom: 3, fontFamily: "'JetBrains Mono',monospace" }}>PURPOSE</p>
              <p style={{ fontSize: 12, color: "#d1d5db", lineHeight: 1.5 }}>{meta.purpose}</p>
            </div>
          )}

          {meta?.replication != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: meta.replication ? "#4ade80" : "#6b7280", boxShadow: meta.replication ? "0 0 8px #4ade80" : "none" }} />
              <span style={{ fontSize: 11, color: meta.replication ? "#4ade80" : "#6b7280" }}>
                {meta.replication ? "Replication enabled" : "Single instance"}
              </span>
            </div>
          )}

          {meta?.notes && (
            <div style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.15)" }}>
              <p style={{ fontSize: 11, color: "#fbbf24", lineHeight: 1.5 }}>💡 {meta.notes}</p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Legend ─────────────────────────────────────────────────────────────────
function DiagramLegend() {
  const items = [
    { color: "#3b82f6", label: "Client" },
    { color: "#8b5cf6", label: "Gateway" },
    { color: "#1d4ed8", label: "Service" },
    { color: "#c2410c", label: "Worker" },
    { color: "#92400e", label: "Database" },
    { color: "#dc2626", label: "Cache" },
    { color: "#0e7490", label: "Queue" },
  ];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
      padding: "10px 16px",
      borderTop: "1px solid rgba(255,255,255,0.05)",
      background: "rgba(0,0,0,0.5)",
    }}>
      <span style={{ fontSize: 10, color: "#374151", fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1 }}>LEGEND</span>
      {items.map(i => (
        <div key={i.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: 3, background: i.color, boxShadow: `0 0 6px ${i.color}` }} />
          <span style={{ fontSize: 10, color: "#6b7280", fontFamily: "'JetBrains Mono',monospace" }}>{i.label}</span>
        </div>
      ))}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 20, height: 1, background: "#3b82f6" }} />
          <span style={{ fontSize: 10, color: "#6b7280", fontFamily: "'JetBrains Mono',monospace" }}>Sync</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 20, height: 1, background: "#fb923c", borderTop: "1px dashed #fb923c" }} />
          <span style={{ fontSize: 10, color: "#6b7280", fontFamily: "'JetBrains Mono',monospace" }}>Async</span>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function DiagramCanvas({ blueprint }: P) {
  const { nodes: initNodes, edges: initEdges } = useMemo(() => buildGraph(blueprint), [blueprint]);
  const [nodes, , onNodesChange] = useNodesState(initNodes);
  const [edges, , onEdgesChange] = useEdgesState(initEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === "tierLabel") return;
    setSelectedNode(prev => prev?.id === node.id ? null : node);
  }, []);

  const onPaneClick = useCallback(() => setSelectedNode(null), []);

  const height = fullscreen ? "100vh" : "calc(100vh - 180px)";

  return (
    <div style={{
      position: fullscreen ? "fixed" : "relative",
      inset: fullscreen ? 0 : undefined,
      zIndex: fullscreen ? 9999 : undefined,
      borderRadius: fullscreen ? 0 : 16,
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.06)",
      background: "#030303",
      height,
      minHeight: 520,
    }}>
      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView fitViewOptions={{ padding: 0.18 }}
        minZoom={0.15} maxZoom={3}
        attributionPosition="bottom-left"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(255,255,255,0.04)" />

        <Controls
          showInteractive={false}
          style={{ bottom: 60, left: 16 }}
        />

        <MiniMap
          nodeColor={n => (n.data as any)?.palette?.border || "#333"}
          maskColor="rgba(0,0,0,0.92)"
          style={{
            background: "#0a0a0a",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 10,
            bottom: 60,
          }}
          zoomable pannable
        />

        {/* Fullscreen toggle */}
        <Panel position="top-right">
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setFullscreen(f => !f)}
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                cursor: "pointer", color: "#9ca3af",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "0 10px", borderRadius: 8,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              fontSize: 10, color: "#6b7280",
              fontFamily: "'JetBrains Mono',monospace",
            }}>
              <Info size={11} />
              Click nodes for details
            </div>
          </div>
        </Panel>

        {/* Node detail panel */}
        {selectedNode && (
          <Panel position="top-right" style={{ marginTop: 48 }}>
            <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
          </Panel>
        )}
      </ReactFlow>

      <DiagramLegend />
    </div>
  );
}
