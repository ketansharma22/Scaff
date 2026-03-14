"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/auth/supabase-browser";

export default function ResetPasswordPage() {
  const router    = useRouter();
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [done, setDone]           = useState(false);
  const sb = getSupabaseBrowser();

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true); setError("");
    const { error } = await sb.auth.updateUser({ password });
    if (error) { setError(error.message); setLoading(false); }
    else { setDone(true); setTimeout(() => router.push("/"), 2500); }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#050505", fontFamily: "'DM Sans', system-ui, sans-serif",
      backgroundImage: "radial-gradient(ellipse at 50% 0%, rgba(77,158,247,0.08) 0%, transparent 60%)",
    }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{ width: 420, padding: "44px 40px", borderRadius: 20, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, #4d9ef7, #a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#fff" }}>A</div>
          <span style={{ fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>Scaff</span>
        </div>

        {done ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: "center", padding: "20px 0" }}>
            <CheckCircle2 size={44} style={{ color: "#4ade80", margin: "0 auto 16px" }} />
            <p style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 6 }}>Password updated!</p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Redirecting you to the app…</p>
          </motion.div>
        ) : (
          <>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", marginBottom: 6 }}>Set new password</h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 28 }}>Choose a strong password for your account.</p>

            <form onSubmit={handle} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "New password", val: password, set: setPassword, placeholder: "Min 8 characters", ac: "new-password" },
                { label: "Confirm password", val: confirm, set: setConfirm, placeholder: "Repeat password", ac: "new-password" },
              ].map((f, i) => (
                <div key={f.label}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 6 }}>{f.label}</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPass ? "text" : "password"} required
                      value={f.val} onChange={e => f.set(e.target.value)}
                      placeholder={f.placeholder} autoComplete={f.ac}
                      style={{ width: "100%", padding: "12px 44px 12px 14px", borderRadius: 10, boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 14, outline: "none", transition: "border-color 0.2s", fontFamily: "inherit" }}
                      onFocus={e => (e.currentTarget.style.borderColor = "rgba(77,158,247,0.5)")}
                      onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                    />
                    {i === 0 && (
                      <button type="button" onClick={() => setShowPass(s => !s)}
                        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: 0 }}>
                        {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {error && (
                <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
                  <p style={{ fontSize: 12, color: "#f87171" }}>{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading}
                style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", cursor: loading ? "not-allowed" : "pointer", background: "linear-gradient(135deg, #4d9ef7, #a78bfa)", color: "#fff", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4, opacity: loading ? 0.7 : 1 }}>
                {loading ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Updating…</> : "Update password"}
              </button>
            </form>
          </>
        )}
      </motion.div>
      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
