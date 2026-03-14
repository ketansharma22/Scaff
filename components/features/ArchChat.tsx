"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles, RotateCcw } from "lucide-react";
import type { GenResult } from "@/lib/api/client";

interface P { result: GenResult; }

interface Message { role: "user" | "assistant"; content: string; }

const SUGGESTED = [
  "How would I add Stripe payments to this?",
  "What's the best way to implement search?",
  "How do I handle file uploads at scale?",
  "What monitoring stack should I use?",
  "How would I add multi-tenancy?",
  "What are the biggest scaling risks?",
];

async function askGroq(messages: Message[], blueprint: GenResult): Promise<string> {
  const systemPrompt = `You are a senior software architect advising on a specific system architecture.

Here is the architecture we're discussing:
- Pattern: ${blueprint.blueprint.architecture_pattern}
- Deployment: ${blueprint.blueprint.deployment_model}  
- Primary DB: ${blueprint.blueprint.primary_db}
- Cache: ${blueprint.blueprint.cache || "none"}
- Search: ${blueprint.blueprint.search_engine || "none"}
- Message Bus: ${blueprint.blueprint.message_bus || "none"}
- Services: ${blueprint.blueprint.services?.map(s => s.name).join(", ") || "api"}
- Target users: ${blueprint.requirements.user_scale?.target?.toLocaleString()}
- Features: ${blueprint.requirements.features?.join(", ") || "none specified"}
- Budget: ${blueprint.blueprint.cost_estimate ? `$${blueprint.blueprint.cost_estimate.monthly_usd_low}–$${blueprint.blueprint.cost_estimate.monthly_usd_high}/mo` : "unknown"}

Be specific, practical, and concise. Give concrete recommendations with real tools and services. 
Format your response with clear sections when needed. Keep answers under 300 words.`;

  const resp = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  });

  if (!resp.ok) throw new Error(`API error ${resp.status}`);
  const data = await resp.json();
  return data.content?.[0]?.text || "No response received.";
}

function MessageBubble({ msg, index }: { msg: Message; index: number }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      style={{ display: "flex", gap: 10, alignItems: "flex-start", flexDirection: isUser ? "row-reverse" : "row" }}>
      {/* Avatar */}
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: isUser ? "rgba(77,158,247,0.15)" : "rgba(167,139,250,0.15)",
        border: `1px solid ${isUser ? "rgba(77,158,247,0.25)" : "rgba(167,139,250,0.25)"}`,
      }}>
        {isUser ? <User size={13} style={{ color: "#4d9ef7" }} /> : <Bot size={13} style={{ color: "#a78bfa" }} />}
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth: "75%",
        padding: "10px 14px",
        borderRadius: isUser ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
        background: isUser ? "rgba(77,158,247,0.1)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${isUser ? "rgba(77,158,247,0.2)" : "rgba(255,255,255,0.07)"}`,
        fontSize: 13,
        color: "#e5e7eb",
        lineHeight: 1.6,
        whiteSpace: "pre-wrap",
      }}>
        {msg.content}
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.25)" }}>
        <Bot size={13} style={{ color: "#a78bfa" }} />
      </div>
      <div style={{ display: "flex", gap: 4, padding: "10px 14px", borderRadius: "4px 14px 14px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {[0,1,2].map(i => (
          <motion.div key={i} animate={{ opacity: [0.3,1,0.3], y: [0,-3,0] }} transition={{ duration: 0.8, delay: i*0.15, repeat: Infinity }}
            style={{ width: 5, height: 5, borderRadius: "50%", background: "#a78bfa" }} />
        ))}
      </div>
    </div>
  );
}

export default function ArchChat({ result }: P) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: `Hi! I'm your architecture advisor for this **${result.blueprint.architecture_pattern?.replace(/_/g," ")}** setup.\n\nI know your full stack — ${result.blueprint.primary_db}, ${result.blueprint.services?.length || 0} services, targeting ${result.requirements.user_scale?.target?.toLocaleString()} users. Ask me anything about scaling, adding features, or technical decisions.` }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput("");
    setError("");
    const userMsg: Message = { role: "user", content: q };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setLoading(true);
    try {
      const reply = await askGroq(newMsgs, result);
      setMessages(m => [...m, { role: "assistant", content: reply }]);
    } catch (e: any) {
      setError("Failed to get response. Make sure the app is connected to the API.");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 220px)", minHeight: 500, borderRadius: 14, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden", background: "#060606" }}>
      {/* Header */}
      <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.02)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.25)" }}>
            <Sparkles size={14} style={{ color: "#a78bfa" }} />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Architecture Advisor</p>
            <p style={{ fontSize: 10, color: "#6b7280" }}>Powered by Claude · knows your full stack</p>
          </div>
        </div>
        <button onClick={() => setMessages([{ role: "assistant", content: `Hi again! Ask me anything about your ${result.blueprint.architecture_pattern?.replace(/_/g," ")} architecture.` }])}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#374151", display: "flex", alignItems: "center", gap: 4, fontSize: 11, padding: "4px 8px", borderRadius: 6 }}
          onMouseEnter={e => (e.currentTarget.style.color = "#9ca3af")}
          onMouseLeave={e => (e.currentTarget.style.color = "#374151")}>
          <RotateCcw size={11} /> Clear
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((m, i) => <MessageBubble key={i} msg={m} index={i} />)}
        {loading && <TypingIndicator />}
        {error && <p style={{ fontSize: 11, color: "#f87171", textAlign: "center" }}>{error}</p>}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div style={{ padding: "0 18px 12px", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SUGGESTED.map(s => (
            <button key={s} onClick={() => send(s)}
              style={{ fontSize: 11, padding: "5px 10px", borderRadius: 99, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#9ca3af", cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => { (e.currentTarget.style.background = "rgba(255,255,255,0.07)"); (e.currentTarget.style.color = "#e5e7eb"); }}
              onMouseLeave={e => { (e.currentTarget.style.background = "rgba(255,255,255,0.03)"); (e.currentTarget.style.color = "#9ca3af"); }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)", display: "flex", gap: 8, alignItems: "flex-end" }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask anything about your architecture…"
          rows={1}
          style={{
            flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10, padding: "9px 12px", fontSize: 13, color: "#e5e7eb",
            resize: "none", outline: "none", fontFamily: "inherit", lineHeight: 1.5,
            maxHeight: 100, overflowY: "auto",
          }}
        />
        <button onClick={() => send()} disabled={!input.trim() || loading}
          style={{
            width: 36, height: 36, borderRadius: 9, border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed",
            background: input.trim() && !loading ? "#4d9ef7" : "rgba(255,255,255,0.06)",
            color: input.trim() && !loading ? "#fff" : "#374151",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            transition: "all 0.15s",
          }}>
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
