"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { User as UserIcon, Settings, LogOut, ArrowLeft, Loader2, ShieldAlert } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth/AuthContext";
import { useStore } from "@/lib/store/appStore";
import Header from "@/components/layout/Header";
import { getSupabaseBrowser } from "@/lib/auth/supabase-browser";

function SettingsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading: authLoading, signOut } = useAuth();
    const [activeTab, setActiveTab] = useState("profile");
    const [name, setName] = useState("");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });
    const sb = getSupabaseBrowser();
    const { theme, setTheme } = useTheme();
    const { emailNotifications, setEmailNotifs } = useStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    // Sync tab from URL
    useEffect(() => {
        const tab = searchParams.get("tab");
        if (tab === "profile" || tab === "settings") {
            setActiveTab(tab);
        }
    }, [searchParams]);

    // Load user data
    useEffect(() => {
        if (user) {
            setName(user.user_metadata?.full_name || "");
        }
    }, [user]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ text: "", type: "" });

        try {
            const { error } = await sb.auth.updateUser({
                data: { full_name: name.trim() }
            });

            if (error) throw error;

            setMessage({ text: "Profile updated successfully.", type: "success" });
            setTimeout(() => setMessage({ text: "", type: "" }), 3000);
        } catch (err: any) {
            setMessage({ text: err.message || "Failed to update profile", type: "error" });
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
            </div>
        );
    }

    const email = user.email || "";
    const avatar = user.user_metadata?.avatar_url;
    const initials = (name || email.split("@")[0] || "U").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <div className="flex-1 w-full max-w-5xl mx-auto px-5 py-8 md:py-12 flex flex-col md:flex-row gap-8">

                {/* Sidebar */}
                <div className="w-full md:w-64 flex-shrink-0">
                    <button onClick={() => router.push("/")}
                        className="flex items-center gap-2 text-xs font-mono text-gray-400 hover:text-gray-200 mb-8 transition-colors">
                        <ArrowLeft size={12} /> Back to dashboard
                    </button>

                    <h2 className="text-xl font-bold text-white mb-6 tracking-tight">Account</h2>

                    <nav className="flex flex-col gap-2">
                        {[
                            { id: "profile", label: "Profile", icon: UserIcon },
                            { id: "settings", label: "Settings", icon: Settings },
                        ].map(t => (
                            <button key={t.id} onClick={() => { setActiveTab(t.id); router.replace(`/settings?tab=${t.id}`); }}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === t.id
                                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent"
                                    }`}>
                                <t.icon size={16} />
                                {t.label}
                            </button>
                        ))}

                        <div className="h-px bg-white/10 my-2" />

                        <button onClick={signOut}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all border border-transparent">
                            <LogOut size={16} />
                            Sign out
                        </button>
                    </nav>
                </div>

                {/* Content Area */}
                <div className="flex-1 min-w-0">
                    <AnimatePresence mode="wait">
                        {activeTab === "profile" && (
                            <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-2">Public Profile</h3>
                                    <p className="text-sm text-gray-400">Manage your publicly visible information.</p>
                                </div>

                                <div className="p-6 rounded-xl border border-white/5 bg-white/[0.02]">
                                    <div className="flex items-center gap-6 mb-8 border-b border-white/5 pb-8">
                                        {avatar ? (
                                            <img src={avatar} alt={name} className="w-20 h-20 rounded-full object-cover border-2 border-white/10" />
                                        ) : (
                                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white border-2 border-white/10 shadow-lg cursor-pointer hover:opacity-90 transition-opacity">
                                                {initials}
                                            </div>
                                        )}
                                        <div>
                                            <button className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-white transition-all cursor-not-allowed opacity-50">
                                                Upload Avatar
                                            </button>
                                            <p className="text-xs text-gray-500 mt-2">Uploading avatars is disabled in MVP.</p>
                                        </div>
                                    </div>

                                    <form onSubmit={handleUpdateProfile} className="flex flex-col gap-5 max-w-md">
                                        <div>
                                            <label className="block text-xs font-mono text-gray-400 mb-2">DISPLAY NAME</label>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={e => setName(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                                                placeholder="Your name"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-mono text-gray-400 mb-2">EMAIL ADDRESS</label>
                                            <input
                                                type="email"
                                                value={email}
                                                disabled
                                                className="w-full bg-white/5 border border-transparent rounded-lg px-4 py-2.5 text-sm text-gray-500 cursor-not-allowed"
                                            />
                                            <p className="text-xs text-gray-500 mt-2">Your email address cannot be changed.</p>
                                        </div>

                                        {message.text && (
                                            <div className={`p-3 rounded-lg text-xs font-medium ${message.type === "success" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                                                {message.text}
                                            </div>
                                        )}

                                        <div className="pt-2">
                                            <button
                                                type="submit"
                                                disabled={saving || name.trim() === (user.user_metadata?.full_name || "")}
                                                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold text-white transition-all shadow-lg flex items-center gap-2"
                                            >
                                                {saving && <Loader2 size={14} className="animate-spin" />}
                                                {saving ? "Saving..." : "Save Changes"}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === "settings" && (
                            <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-2">App Settings</h3>
                                    <p className="text-sm text-gray-400">Manage your workspace preferences.</p>
                                </div>

                                <div className="p-6 rounded-xl border border-white/5 bg-white/[0.02]">
                                    <h4 className="text-sm font-semibold text-white mb-4">Preferences</h4>
                                    <div className="flex items-center justify-between py-3 border-b border-white/5">
                                        <div>
                                            <p className="text-sm font-medium text-white transition-colors dark:text-white text-gray-900">Theme</p>
                                            <p className="text-xs text-gray-500">Choose between light and dark mode.</p>
                                        </div>
                                        {mounted ? (
                                            <select
                                                value={theme}
                                                onChange={e => setTheme(e.target.value)}
                                                className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none dark:bg-black/40 bg-gray-100 dark:text-white text-gray-900"
                                            >
                                                <option value="dark">Dark</option>
                                                <option value="light">Light</option>
                                                <option value="system">System</option>
                                            </select>
                                        ) : (
                                            <div className="w-20 h-8 rounded-lg bg-white/5 animate-pulse" />
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between py-3">
                                        <div>
                                            <p className="text-sm font-medium text-white transition-colors dark:text-white text-gray-900">Email Notifications</p>
                                            <p className="text-xs text-gray-500">Receive updates about new architecture patterns.</p>
                                        </div>
                                        <button
                                            onClick={() => setEmailNotifs(!emailNotifications)}
                                            className={`w-10 h-5 rounded-full relative transition-colors ${emailNotifications ? "bg-blue-500" : "bg-white/10 dark:bg-white/10 bg-gray-300"}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 shadow-sm transition-all ${emailNotifications ? "right-0.5" : "left-0.5 bg-gray-400 dark:bg-gray-400 bg-white"}`} />
                                        </button>
                                    </div>
                                </div>

                                {/* Danger Zone */}
                                <div className="mt-8">
                                    <h4 className="text-sm font-semibold text-red-400 mb-4 flex items-center gap-2">
                                        <ShieldAlert size={16} /> Danger Zone
                                    </h4>
                                    <div className="p-6 rounded-xl border border-red-500/20 bg-red-500/5 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                                        <div>
                                            <p className="text-sm font-medium text-white transition-colors dark:text-white text-gray-900 mb-1">Delete Account</p>
                                            <p className="text-xs text-gray-400 max-w-sm">Permanently delete your account and all saved blueprints. This action cannot be undone.</p>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                if (!confirm("Are you sure? This cannot be undone.")) return;
                                                try {
                                                    const { error } = await sb.rpc('delete_user');
                                                    if (error && error.message.includes('Could not find')) {
                                                        throw new Error("Account deletion requires support contact in this MVP.");
                                                    } else if (error) {
                                                        throw error;
                                                    }
                                                    signOut();
                                                } catch (err: any) {
                                                    alert(err.message || "Failed to delete account");
                                                }
                                            }}
                                            className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-sm font-medium text-red-400 transition-all flex-shrink-0">
                                            Delete Account
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

            </div>
        </div>
    );
}

export default function SettingsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
            </div>
        }>
            <SettingsContent />
        </Suspense>
    );
}
