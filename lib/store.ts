"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CaseId, PersonaId } from "./data";
import { CaseState, Preset, preset } from "./flow";

export interface Toast { id: number; text: string }
interface Store {
  caseId: CaseId;
  persona: PersonaId;
  familyIdx: number;
  screens: Record<PersonaId, string>;
  cases: Record<CaseId, CaseState>;
  toasts: Toast[];
  setCase: (id: CaseId) => void;
  setPersona: (p: PersonaId, screen?: string) => void;
  setScreen: (screen: string) => void;
  setFamilyIdx: (i: number) => void;
  act: (actor: PersonaId | "system", text: string, fn: (s: CaseState) => void, caseId?: CaseId) => void;
  reset: (id: CaseId, p: Preset) => void;
  toast: (text: string) => void;
  dismiss: (id: number) => void;
}

const defaultScreens: Record<PersonaId, string> = { patient: "home", family: "home", usdoc: "worklist", india: "referrals" };

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      caseId: "mark",
      persona: "patient",
      familyIdx: 0,
      screens: { ...defaultScreens },
      cases: { lakshmi: preset("lakshmi", "surgery"), mark: preset("mark", "start") },
      toasts: [],
      setCase: id => set({ caseId: id, familyIdx: 0 }),
      setPersona: (p, screen) => set(st => ({ persona: p, screens: screen ? { ...st.screens, [p]: screen } : st.screens })),
      setScreen: screen => set(st => ({ screens: { ...st.screens, [st.persona]: screen } })),
      setFamilyIdx: i => set({ familyIdx: i }),
      act: (actor, text, fn, caseId) => {
        const id = caseId ?? get().caseId;
        const next: CaseState = JSON.parse(JSON.stringify(get().cases[id]));
        fn(next);
        next.log = [{ at: new Date().toISOString(), actor, text }, ...next.log].slice(0, 80);
        set(st => ({ cases: { ...st.cases, [id]: next } }));
        get().toast(text);
      },
      reset: (id, p) => set(st => ({ cases: { ...st.cases, [id]: preset(id, p) }, screens: { ...defaultScreens } })),
      toast: text => { const id = Date.now() + Math.random(); set(st => ({ toasts: [...st.toasts, { id, text }] })); setTimeout(() => get().dismiss(id), 2600); },
      dismiss: id => set(st => ({ toasts: st.toasts.filter(t => t.id !== id) }))
    }),
    { name: "heartbridge-demo-v1", partialize: s => ({ caseId: s.caseId, persona: s.persona, familyIdx: s.familyIdx, screens: s.screens, cases: s.cases }) }
  )
);

// Keep several open tabs in sync (e.g. patient in one tab, doctor in another).
if (typeof window !== "undefined") {
  window.addEventListener("storage", e => {
    if (e.key !== "heartbridge-demo-v1" || !e.newValue) return;
    try { const parsed = JSON.parse(e.newValue); if (parsed?.state?.cases) useStore.setState({ cases: parsed.state.cases }); } catch { /* ignore */ }
  });
}
