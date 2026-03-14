"use client";
import Link from "next/link";
import { useStore } from "@/lib/store/appStore";
import UserMenu from "./UserMenu";

export default function Header() {
  const { blueprint } = useStore((s) => ({ blueprint: s.result?.blueprint }));

  return (
    <header
      className="sticky top-0 z-50 px-5 py-3"
      style={{
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold"
            style={{
              background: "linear-gradient(135deg,#1a6ef7,#5b3ff7)",
              boxShadow: "0 0 12px rgba(26,110,247,0.4)",
            }}
          >
            ⚡
          </div>
          <span className="text-[14px] font-bold tracking-[-0.3px] text-white">Scaff</span>
        </Link>

        {/* Current blueprint breadcrumb */}
        {blueprint && (
          <>
            <span className="text-xs mx-1" style={{ color: "var(--t4)" }}>/</span>
            <span className="text-xs font-mono" style={{ color: "var(--t3)" }}>
              {blueprint.architecture_pattern?.replace(/_/g, " ")}
            </span>
          </>
        )}

        <div className="flex-1" />

        {/* Right side */}
        <span className="text-[10px] font-mono hidden sm:block" style={{ color: "var(--t4)" }}>
          v0.1.0
        </span>

        <UserMenu />   {/* ← the only addition */}
      </div>
    </header>
  );
}
