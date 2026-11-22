"use client";
import { useState } from "react";
import { ArrowRight, ChevronDown, RotateCcw } from "lucide-react";
import { Logo } from "./Logo";
import { CASES, CaseId, PersonaId } from "@/lib/data";
import { PRESETS, nextStep } from "@/lib/flow";
import { useStore } from "@/lib/store";
import { personaLabel, useCase } from "./shared";
import { Avatar, Button, cx } from "./ui";
import { NAV, Screen } from "./screens";

const PERSONAS: PersonaId[] = ["patient", "family", "usdoc", "india"];

function TopBar() {
  const { caseId, persona } = useCase();
  const familyIdx = useStore(s => s.familyIdx);
  const setCase = useStore(s => s.setCase), setPersona = useStore(s => s.setPersona), reset = useStore(s => s.reset);
  const [menu, setMenu] = useState(false);
  return (
    <header className="z-40 lg:sticky lg:top-0 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3 lg:px-8">
        <a href="/" className="flex items-center"><Logo size={30} /></a>
        <div className="flex items-center gap-1 rounded-xl bg-canvas p-1">
          {(Object.keys(CASES) as CaseId[]).map(id => (
            <button key={id} onClick={() => setCase(id)} className={cx("rounded-lg px-3 py-1.5 text-sm transition", caseId === id ? "bg-white font-medium shadow-sm" : "text-muted hover:text-ink")}>
              {CASES[id].patient.first} <span className="text-muted">· {CASES[id].cohort === "A" ? "Medicare, OCI" : "Uninsured, visa"}</span>
            </button>))}
        </div>
        <div className="flex-1" />
        <nav aria-label="Switch persona" className="flex flex-wrap items-center gap-1 rounded-xl bg-canvas p-1">
          {PERSONAS.map(p => { const l = personaLabel(p, caseId, familyIdx); return (
            <button key={p} onClick={() => setPersona(p)} className={cx("flex items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-3 text-sm transition", persona === p ? "bg-white shadow-sm" : "text-muted hover:text-ink")}>
              <Avatar initials={l.initials} tone={l.tone} size={26} /><span className="hidden sm:inline">{p === "patient" ? "Patient" : p === "family" ? "Family" : p === "usdoc" ? "US doctor" : "India team"}</span>
            </button>); })}
        </nav>
        <div className="relative">
          <Button size="sm" variant="secondary" onClick={() => setMenu(m => !m)}><RotateCcw size={14} /> Reset <ChevronDown size={14} /></Button>
          {menu && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-line bg-white p-2 shadow-xl">
              <div className="px-3 py-2 text-xs text-muted">Restart {CASES[caseId].patient.first}&apos;s case from…</div>
              {PRESETS.map(p => <button key={p.id} onClick={() => { reset(caseId, p.id); setMenu(false); }} className="block w-full rounded-xl px-3 py-2.5 text-left hover:bg-canvas"><div className="text-sm font-medium">{p.label}</div><div className="text-xs text-muted">{p.hint}</div></button>)}
            </div>)}
        </div>
      </div>
    </header>
  );
}

function NextBanner() {
  const { caseId, c, s, persona } = useCase();
  const setPersona = useStore(st => st.setPersona), setScreen = useStore(st => st.setScreen), setFamilyIdx = useStore(st => st.setFamilyIdx);
  const n = nextStep(caseId, s);
  if (!n) return (
    <div className="border-b border-line bg-brand-50"><div className="mx-auto max-w-[1320px] px-5 py-3 text-sm text-brand-700 lg:px-8">Episode complete. {c.patient.first} is home and handed over to Dr. {c.cardiologist.name.split(",")[0].replace(/, MD.*/, "")}.</div></div>
  );
  const mine = n.owner === persona;
  const go = () => {
    if (n.owner === "family") { const i = c.family.findIndex(f => f.perms.payments); setFamilyIdx(Math.max(0, i)); }
    if (mine) setScreen(n.screen); else setPersona(n.owner, n.screen);
  };
  const who = personaLabel(n.owner, caseId, n.owner === "family" ? Math.max(0, c.family.findIndex(f => f.perms.payments)) : 0);
  return (
    <div className={cx("border-b", mine ? "border-accent-100 bg-accent-50" : "border-line bg-white")}>
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 lg:px-8">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">{n.stage}</span>
        <span className="text-[15px]">{mine ? <b className="font-semibold">Your turn: </b> : <span className="text-muted">Waiting on {who.name}: </span>}{n.title}</span>
        <div className="flex-1" />
        <Button size="sm" variant={mine ? "accent" : "primary"} onClick={go}>{mine ? "Go to task" : `Switch to ${who.role}`} <ArrowRight size={15} /></Button>
      </div>
    </div>
  );
}

function Sidebar() {
  const { caseId, c, s, persona } = useCase();
  const screen = useStore(st => st.screens[st.persona]);
  const setScreen = useStore(st => st.setScreen);
  const familyIdx = useStore(st => st.familyIdx), setFamilyIdx = useStore(st => st.setFamilyIdx);
  const l = personaLabel(persona, caseId, familyIdx);
  const items = NAV[persona](caseId, s, familyIdx);
  const n = nextStep(caseId, s);
  return (
    <aside className="lg:sticky lg:top-[132px] lg:self-start">
      <div className="mb-6 flex items-center gap-3"><Avatar initials={l.initials} tone={l.tone} size={44} /><div className="min-w-0"><div className="truncate font-semibold">{l.name}</div><div className="text-sm text-muted">{l.role}</div></div></div>
      {persona === "family" && c.family.length > 1 && (
        <div className="mb-6"><label htmlFor="fam" className="mb-1 block text-xs text-muted">Signed in as</label>
          <select id="fam" value={familyIdx} onChange={e => setFamilyIdx(+e.target.value)} className="h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px]">
            {c.family.map((f, i) => <option key={f.name} value={i}>{f.name} · {f.relation.split("·")[0].trim()}</option>)}
          </select></div>)}
      <nav className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
        {items.map(it => {
          const hot = n && n.owner === persona && n.screen === it.id;
          return (
            <button key={it.id} onClick={() => setScreen(it.id)} className={cx("flex flex-none items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left text-[15px] transition", screen === it.id ? "bg-white font-medium shadow-sm ring-1 ring-line" : "text-muted hover:bg-white/70 hover:text-ink")}>
              <span className="flex items-center gap-3"><it.icon size={17} />{it.label}</span>{hot && <span className="h-2 w-2 rounded-full bg-accent-500" />}
            </button>);
        })}
      </nav>
    </aside>
  );
}

function Toasts() {
  const toasts = useStore(s => s.toasts);
  return <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">{toasts.slice(-2).map(t => <div key={t.id} className="rounded-xl bg-ink px-4 py-2.5 text-sm text-white shadow-lg">{t.text}</div>)}</div>;
}

export default function Shell() {
  return (
    <div className="min-h-screen">
      <TopBar />
      <div className="z-30 lg:sticky lg:top-[61px]"><NextBanner /></div>
      <div className="mx-auto grid max-w-[1320px] gap-8 px-5 py-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12 lg:px-8 lg:py-10">
        <Sidebar />
        <main className="min-w-0"><Screen /></main>
      </div>
      <footer className="mx-auto max-w-[1320px] px-5 pb-10 text-xs text-muted lg:px-8">Demo prototype. Patients, doctors, IDs and medical records are fictional; record pulls, visa processing and payer submission are simulated. Hospitals, accreditation, published prices, codes and rules are real as of Nov 2026.</footer>
      <Toasts />
    </div>
  );
}
