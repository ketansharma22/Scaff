import { create } from "zustand";
import type { GenResult, ProgressEvent } from "../api/client";

export type Stage =
  | "idle" | "started" | "parsing" | "parsed"
  | "deciding" | "decided" | "enhancing" | "enhanced"
  | "complete" | "error";

interface AppState {
  stage: Stage;
  events: ProgressEvent[];
  result: GenResult | null;
  error: string | null;
  rawInput: string;
  elapsed: number;
  emailNotifications: boolean;

  setStage: (s: Stage) => void;
  pushEvent: (e: ProgressEvent) => void;
  setResult: (r: GenResult) => void;
  setError: (e: string) => void;
  setRawInput: (t: string) => void;
  setElapsed: (n: number) => void;
  setEmailNotifs: (b: boolean) => void;
  reset: () => void;
}

export const useStore = create<AppState>((set) => ({
  stage: "idle", events: [], result: null, error: null, rawInput: "", elapsed: 0, emailNotifications: true,

  setStage: (stage) => set({ stage }),
  pushEvent: (e) => set((s) => ({ events: [...s.events, e], stage: e.stage as Stage })),
  setResult: (result) => set({ result, stage: "complete" }),
  setError: (error) => set({ error, stage: "error" }),
  setRawInput: (t) => set({ rawInput: t }),
  setElapsed: (n) => set({ elapsed: n }),
  setEmailNotifs: (b) => set({ emailNotifications: b }),
  reset: () => set({ stage: "idle", events: [], result: null, error: null, rawInput: "", elapsed: 0, emailNotifications: true }),
}));
