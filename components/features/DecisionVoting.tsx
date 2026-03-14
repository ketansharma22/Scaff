"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, ThumbsDown, MessageSquare, Check, Clock, X } from "lucide-react";
import type { GenResult } from "@/lib/api/client";

interface P { result: GenResult; }

type Vote = "accepted" | "rejected" | "pending";

interface Decision {
  id: string;
  decision: string;
  pros: string[];
  cons: string[];
  alternatives: string[];
  vote: Vote;
  note: string;
  votedAt?: string;
}

const VOTE_STYLE: Record<Vote, { bg: string; border: string; text: string; icon: React.ElementType; label: string }> = {
  accepted: { bg: "rgba(74,222,128,0.08)",  border: "rgba(74,222,128,0.25)",  text: "#4ade80", icon: ThumbsUp,   label: "Accepted"  },
  rejected: { bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.25)", text: "#f87171", icon: ThumbsDown, label: "Rejected"  },
  pending:  { bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.08)", text: "#6b7280", icon: Clock,      label: "Pending"   },
};

function DecisionCard({ d, onVote, onNote }: {
  d: Decision;
  onVote: (id: string, vote: Vote) => void;
  onNote: (id: string, note: string) => void;
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState(d.note);
  const vs = VOTE_STYLE[d.vote];

  return (
    <motion.div
      layout
      style={{
        borderRadius: 13, border: `1px solid ${vs.border}`,
        background: vs.bg, overflow: "hidden", transition: "border-color 0.2s, background 0.2s",
      }}>
      {/* Header */}
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <vs.icon size={13} style={{ color: vs.text, flexShrink: 0 }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{d.decision}</p>
            <span style={{ marginLeft: "auto", fontSize: 10, padding: "2px 8px", borderRadius: 99, background: `${vs.text}18`, border: `1px solid ${vs.text}33`, color: vs.text, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, flexShrink: 0 }}>
              {vs.label}
            </span>
          </div>

          {/* Pros / cons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <p style={{ fontSize: 9, color: "#4ade80", fontFamily: "'JetBrains Mono',monospace", marginBottom: 4 }}>PROS</p>
              {d.pros?.slice(0,3).map((p, i) => (
                <div key={i} style={{ display: "flex", gap: 5, marginBottom: 3 }}>
                  <Check size={9} style={{ color: "#4ade80", marginTop: 2, flexShrink: 0 }} />
                  <p style={{ fontSize: 11, color: "#d1d5db", lineHeight: 1.4 }}>{p}</p>
                </div>
              ))}
            </div>
            <div>
              <p style={{ fontSize: 9, color: "#f87171", fontFamily: "'JetBrains Mono',monospace", marginBottom: 4 }}>CONS</p>
              {d.cons?.slice(0,3).map((c, i) => (
                <div key={i} style={{ display: "flex", gap: 5, marginBottom: 3 }}>
                  <X size={9} style={{ color: "#f87171", marginTop: 2, flexShrink: 0 }} />
                  <p style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.4 }}>{c}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Alternatives */}
          {d.alternatives?.length > 0 && (
            <p style={{ fontSize: 10, color: "#6b7280", marginBottom: 10 }}>
              Alternatives: {d.alternatives.join(" · ")}
            </p>
          )}
        </div>
      </div>

      {/* Note */}
      <AnimatePresence>
        {noteOpen && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} style={{ overflow: "hidden" }}>
            <div style={{ padding: "0 16px 12px" }}>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Add a note about this decision…"
                rows={2}
                style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 10px", fontSize: 12, color: "#e5e7eb", resize: "none", outline: "none", fontFamily: "inherit", lineHeight: 1.5, boxSizing: "border-box" }}
              />
              <button onClick={() => { onNote(d.id, noteText); setNoteOpen(false); }}
                style={{ marginTop: 6, padding: "5px 12px", borderRadius: 7, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                Save note
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {d.note && !noteOpen && (
        <div style={{ padding: "0 16px 12px" }}>
          <div style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)", fontSize: 11, color: "#fbbf24", lineHeight: 1.5 }}>
            📝 {d.note}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 8 }}>
        <button onClick={() => onVote(d.id, d.vote === "accepted" ? "pending" : "accepted")}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
            background: d.vote === "accepted" ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${d.vote === "accepted" ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.08)"}`,
            color: d.vote === "accepted" ? "#4ade80" : "#6b7280",
          }}>
          <ThumbsUp size={11}/> Accept
        </button>
        <button onClick={() => onVote(d.id, d.vote === "rejected" ? "pending" : "rejected")}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
            background: d.vote === "rejected" ? "rgba(248,113,113,0.15)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${d.vote === "rejected" ? "rgba(248,113,113,0.3)" : "rgba(255,255,255,0.08)"}`,
            color: d.vote === "rejected" ? "#f87171" : "#6b7280",
          }}>
          <ThumbsDown size={11}/> Reject
        </button>
        <button onClick={() => setNoteOpen(o => !o)}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", marginLeft: "auto",
            background: noteOpen ? "rgba(251,191,36,0.1)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${noteOpen ? "rgba(251,191,36,0.25)" : "rgba(255,255,255,0.07)"}`,
            color: noteOpen ? "#fbbf24" : "#6b7280",
          }}>
          <MessageSquare size={11}/> {d.note ? "Edit note" : "Add note"}
        </button>
      </div>
    </motion.div>
  );
}

export default function DecisionVoting({ result }: P) {
  const [decisions, setDecisions] = useState<Decision[]>(() =>
    (result.blueprint.trade_offs || []).map((t, i) => ({
      id: String(i),
      decision: t.decision,
      pros: t.pros || [],
      cons: t.cons || [],
      alternatives: t.alternatives || [],
      vote: "pending" as Vote,
      note: "",
    }))
  );

  // Persist votes in localStorage
  useEffect(() => {
    try {
      const key = `votes_${result.blueprint.architecture_pattern}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const savedVotes: Record<string, { vote: Vote; note: string }> = JSON.parse(saved);
        setDecisions(ds => ds.map(d => savedVotes[d.id] ? { ...d, ...savedVotes[d.id] } : d));
      }
    } catch {}
  }, []);

  const persist = (ds: Decision[]) => {
    try {
      const key = `votes_${result.blueprint.architecture_pattern}`;
      const toSave = Object.fromEntries(ds.map(d => [d.id, { vote: d.vote, note: d.note }]));
      localStorage.setItem(key, JSON.stringify(toSave));
    } catch {}
  };

  const onVote = (id: string, vote: Vote) => {
    const next = decisions.map(d => d.id === id ? { ...d, vote, votedAt: new Date().toISOString() } : d);
    setDecisions(next); persist(next);
  };

  const onNote = (id: string, note: string) => {
    const next = decisions.map(d => d.id === id ? { ...d, note } : d);
    setDecisions(next); persist(next);
  };

  const accepted = decisions.filter(d => d.vote === "accepted").length;
  const rejected = decisions.filter(d => d.vote === "rejected").length;
  const pending  = decisions.filter(d => d.vote === "pending").length;

  if (decisions.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "#374151", fontSize: 12 }}>
        No architectural trade-offs were generated. Try regenerating with more detailed requirements.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Summary bar */}
      <div style={{ display: "flex", gap: 8 }}>
        {[
          { label: "Accepted", val: accepted, color: "#4ade80" },
          { label: "Rejected", val: rejected, color: "#f87171" },
          { label: "Pending",  val: pending,  color: "#6b7280" },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", textAlign: "center" }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1, marginBottom: 3 }}>{s.val}</p>
            <p style={{ fontSize: 10, color: "#6b7280" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {decisions.map(d => (
          <DecisionCard key={d.id} d={d} onVote={onVote} onNote={onNote} />
        ))}
      </div>

      <p style={{ fontSize: 11, color: "#374151", textAlign: "center" }}>
        Votes and notes are saved in your browser automatically
      </p>
    </div>
  );
}
