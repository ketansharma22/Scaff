"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, User, ChevronDown, Settings } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";

export default function UserMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  if (!user) return null;

  const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const email = user.email || "";
  const avatar = user.user_metadata?.avatar_url;
  const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8, padding: "5px 10px 5px 5px",
          borderRadius: 99, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          cursor: "pointer", transition: "all 0.15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
        onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}>
        {/* Avatar */}
        {avatar ? (
          <img src={avatar} alt={name} style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <div style={{
            width: 26, height: 26, borderRadius: "50%",
            background: "linear-gradient(135deg, #4d9ef7, #a78bfa)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 800, color: "#fff",
          }}>{initials}</div>
        )}
        <span style={{ fontSize: 12, fontWeight: 600, color: "#e5e7eb", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name}
        </span>
        <ChevronDown size={11} style={{ color: "#6b7280", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0, minWidth: 200, zIndex: 100,
              background: "#0e0e0e", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12,
              overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            }}>
            {/* User info */}
            <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{name}</p>
              <p style={{ fontSize: 11, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</p>
            </div>

            {/* Menu items */}
            <div style={{ padding: "6px" }}>
              {[
                { label: "Profile", icon: User, action: () => window.location.href = "/settings?tab=profile" },
                { label: "Settings", icon: Settings, action: () => window.location.href = "/settings?tab=settings" },
              ].map(item => (
                <button key={item.label} onClick={() => { item.action(); setOpen(false); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, border: "none", background: "none", cursor: "pointer", color: "#9ca3af", fontSize: 13, textAlign: "left", transition: "all 0.12s" }}
                  onMouseEnter={e => { (e.currentTarget.style.background = "rgba(255,255,255,0.05)"); (e.currentTarget.style.color = "#fff"); }}
                  onMouseLeave={e => { (e.currentTarget.style.background = "none"); (e.currentTarget.style.color = "#9ca3af"); }}>
                  <item.icon size={13} />
                  {item.label}
                </button>
              ))}

              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />

              <button onClick={() => { signOut(); setOpen(false); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, border: "none", background: "none", cursor: "pointer", color: "#f87171", fontSize: 13, textAlign: "left", transition: "background 0.12s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(248,113,113,0.08)")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                <LogOut size={13} />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
