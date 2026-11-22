"use client";
import { useEffect, useMemo, useState } from "react";
import { Check, Circle, Download, Eye, FileJson, FileText, FileCode2, Lock, X } from "lucide-react";
import { CASES, EPISODE, FX, HOSPITALS, MEDS, PersonaId, QUOTE, QUOTE_HIGH, QUOTE_LOW, RECORD_SOURCES, addDays, fmtDate, inr, usd } from "@/lib/data";
import { STAGES, STEPS, applicable, billedTotal, nextStep, stageStatus } from "@/lib/flow";
import { download, packets, preview, Packet } from "@/lib/packets";
import { useStore } from "@/lib/store";
import { Avatar, Badge, Button, Card, Empty, KV, cx } from "./ui";

export function useCase() {
  const caseId = useStore(s => s.caseId);
  const st = useStore(s => s.cases[s.caseId]);
  const act = useStore(s => s.act);
  const persona = useStore(s => s.persona);
  const familyIdx = useStore(s => s.familyIdx);
  const c = CASES[caseId];
  const hospital = HOSPITALS.find(h => h.id === (st.match ?? "nh"))!;
  const viewer = persona === "family" ? c.family[Math.min(familyIdx, c.family.length - 1)] : null;
  const canSeePayments = persona === "patient" || persona === "india" || (persona === "family" && !!viewer?.perms.payments);
  return { caseId, c, s: st, act, persona, hospital, viewer, canSeePayments };
}

export const personaLabel = (p: PersonaId, caseId: keyof typeof CASES, familyIdx = 0) => {
  const c = CASES[caseId];
  if (p === "patient") return { name: `${c.patient.first} ${c.patient.last}`, role: "Patient", initials: c.patient.first[0] + c.patient.last[0], tone: "brand" as const };
  if (p === "family") { const f = c.family[Math.min(familyIdx, c.family.length - 1)]; return { name: f.name, role: f.relation.split("·")[0].trim(), initials: f.name.split(" ").map(x => x[0]).join(""), tone: "accent" as const }; }
  if (p === "usdoc") return { name: "Dr. " + c.cardiologist.name.split(",")[0].replace(/,? MD.*/, ""), role: "US cardiologist", initials: c.cardiologist.name.split(" ").slice(0, 2).map(x => x[0]).join(""), tone: "slate" as const };
  return { name: "India care team", role: "Surgeon + international desk", initials: "IN", tone: "india" as const };
};

export function Journey({ compact = false }: { compact?: boolean }) {
  const { caseId, s } = useCase();
  const steps = applicable(caseId, s);
  const n = nextStep(caseId, s);
  return (
    <div>
      <div className="grid grid-cols-5 gap-2">
        {STAGES.map(stage => {
          const st = stageStatus(caseId, s, stage);
          return (
            <div key={stage} className="min-w-0">
              <div className={cx("h-1.5 rounded-full", st === "done" ? "bg-brand-500" : st === "active" ? "bg-accent-500" : st === "skipped" ? "bg-line/60" : "bg-line")} />
              <div className={cx("mt-2 truncate text-xs sm:text-sm", st === "upcoming" || st === "skipped" ? "text-muted" : "font-medium")}>{stage}</div>
              <div className="text-xs text-muted">{st === "done" ? "Done" : st === "active" ? "In progress" : st === "skipped" ? "Not needed" : "Upcoming"}</div>
            </div>
          );
        })}
      </div>
      {!compact && (
        <ol className="mt-8 divide-y divide-line">
          {steps.map(step => {
            const done = step.done(s), cur = n?.id === step.id;
            return (
              <li key={step.id} className="flex items-center gap-4 py-3.5">
                <span className={cx("grid h-7 w-7 flex-none place-items-center rounded-full", done ? "bg-brand-500 text-white" : cur ? "bg-accent-500 text-white" : "border border-line text-muted")}>{done ? <Check size={15} /> : <Circle size={8} fill="currentColor" />}</span>
                <div className="min-w-0 flex-1">
                  <div className={cx("text-[15px]", !done && !cur && "text-muted")}>{step.title}</div>
                  <div className="text-xs text-muted">{step.stage} · {step.ownerLabel(caseId)}</div>
                </div>
                {cur && <Badge tone="active">Next</Badge>}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export function RecordsPull({ onDone, running }: { onDone?: () => void; running: boolean }) {
  const { c, s } = useCase();
  const sources = RECORD_SOURCES(c);
  const [prog, setProg] = useState<number[]>(sources.map(() => (s.recordsPulled ? 100 : 0)));
  useEffect(() => {
    if (!running) return;
    let t = 0;
    const h = setInterval(() => {
      t += 1;
      setProg(p => p.map((v, i) => Math.min(100, v + (8 + i * 3) * (t > i * 2 ? 1 : 0))));
    }, 120);
    return () => clearInterval(h);
  }, [running]);
  useEffect(() => { if (running && prog.every(v => v >= 100)) onDone?.(); }, [prog, running, onDone]);
  const total = sources.reduce((a, x) => a + x.docs, 0);
  return (
    <div className="divide-y divide-line">
      {sources.map((src, i) => (
        <div key={src.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2 py-4">
          <div className="min-w-0"><div className="font-medium">{src.name}</div><div className="text-sm text-muted">{src.kind} · {src.detail}</div></div>
          <div className="text-sm tabular text-muted">{prog[i] >= 100 ? `${src.docs} documents` : prog[i] > 0 ? "Retrieving…" : "Waiting"}</div>
          <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: prog[i] + "%" }} /></div>
        </div>
      ))}
      <div className="pt-4 text-sm text-muted">{s.recordsPulled ? `${total} documents received and summarised. Every statement in the summary links back to its source.` : "Simulated pull: in production this runs through a records partner (e.g. Particle Health or Metriport) using the patient's Right of Access."}</div>
    </div>
  );
}

export function ClinicalSummary() {
  const { c } = useCase();
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card><h3 className="mb-4 font-semibold">Conditions</h3><ul className="space-y-2.5 text-[15px]">{c.clinical.problems.map(p => <li key={p.code} className="flex gap-3"><span className="w-16 flex-none text-sm tabular text-muted">{p.code}</span><span>{p.display}</span></li>)}</ul></Card>
      <Card><h3 className="mb-4 font-semibold">Coronary angiography</h3><p className="text-sm text-muted">{fmtDate(c.clinical.cath.date)} · SYNTAX {c.clinical.cath.syntax}</p>
        <div className="mt-4 space-y-3">{c.clinical.cath.lesions.map(l => <div key={l.vessel}><div className="flex justify-between text-sm"><span>{l.vessel}</span><span className="tabular">{l.stenosis}%</span></div><div className="mt-1 h-2 rounded-full bg-line"><div className="h-full rounded-full bg-flag-500/80" style={{ width: l.stenosis + "%" }} /></div></div>)}</div></Card>
      <Card><h3 className="mb-4 font-semibold">Echo and labs</h3><p className="mb-4 text-[15px]">{c.clinical.echo.text}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{c.clinical.labs.map(l => <div key={l.code} className="rounded-xl bg-canvas p-3"><div className="text-xs text-muted">{l.display}</div><div className="mt-1 font-semibold tabular">{l.value} <span className="text-xs font-normal text-muted">{l.unit}</span></div></div>)}</div></Card>
      <Card><h3 className="mb-4 font-semibold">Medications</h3><ul className="space-y-2 text-[15px]">{c.clinical.meds.map(m => <li key={m.name} className="flex justify-between gap-4"><span>{m.name}</span><span className="text-muted">{m.dose}</span></li>)}</ul>
        <div className="mt-5 rounded-xl bg-brand-50 p-4 text-sm"><b>{c.clinical.recommendation}</b> · STS predicted mortality {c.clinical.sts}%</div></Card>
    </div>
  );
}

function DocFrame({ title, status, children, footer }: { title: string; status: React.ReactNode; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <Card pad={false} className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-canvas/60 px-6 py-4"><h3 className="font-semibold">{title}</h3>{status}</div>
      <div className="space-y-5 px-6 py-6 text-[15px] leading-relaxed">{children}</div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-line px-6 py-4 text-sm text-muted">{footer}</div>
    </Card>
  );
}
const H = ({ children }: { children: React.ReactNode }) => <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-600">{children}</div>;

export function CtdUsToIndia() {
  const { c, s, hospital } = useCase();
  return (
    <DocFrame title="Care-transition document · US → India" status={<Badge tone={s.ctd1Signed ? "done" : "active"}>{s.ctd1Signed ? "Signed and shared" : "Draft · awaiting signature"}</Badge>}
      footer={<><span>From {c.cardiologist.name} · NPI {c.cardiologist.npi}</span><span>To {hospital.surgeon.name}, {hospital.name}</span></>}>
      <div><H>Reason for referral</H>{c.clinical.recommendation} ({c.clinical.grafts.join(", ")}). Patient prefers surgery in India; the US cardiologist remains physician of record.</div>
      <div><H>Diagnoses</H>{c.clinical.problems.map(p => p.display).join(" · ")}</div>
      <div><H>Investigations</H>{c.clinical.cath.text} SYNTAX {c.clinical.cath.syntax}. {c.clinical.echo.text}</div>
      <div><H>Labs</H>{c.clinical.labs.map(l => `${l.display} ${l.value} ${l.unit}`).join(" · ")}</div>
      <div><H>Medications and allergies</H>{c.clinical.meds.map(m => `${m.name} ${m.dose}`).join(" · ")}. {c.clinical.allergies}.</div>
      <div><H>Requests</H>STS predicted mortality {c.clinical.sts}%. Confirm the binding package before admission; release the English discharge pack, operative note and echo images on discharge day.</div>
    </DocFrame>
  );
}

export function CtdIndiaToUs() {
  const { c, s, hospital } = useCase();
  return (
    <DocFrame title="Care-transition document · India → US" status={<Badge tone={s.ctd2Signed ? "done" : "active"}>{s.ctd2Signed ? "Signed by surgeon" : "Draft"}</Badge>}
      footer={<><span>From {hospital.surgeon.name}, {hospital.name}</span><span>To {c.cardiologist.name}</span></>}>
      <div><H>Procedure</H>{fmtDate(c.dates.surgery)}: CABG ×3 ({c.clinical.grafts.join(", ")}), on-pump. No intra-operative complications. Sternal wires in place; no implanted device.</div>
      <div><H>Hospital course</H>Extubated on surgery day; one extra precautionary ICU day; drains out day 2; walking 120 m by day 4; discharged {fmtDate(c.dates.discharge)}.</div>
      <div><H>Discharge findings</H>Echo: LVEF 50%, small pericardial effusion, no action. Wound clean. Negative screen for carbapenem-resistant organisms.</div>
      <div><H>For the US team</H>Suggested aftercare codes Z95.1 and Z48.812. Cardiac rehab referral enclosed (qualifying event: CABG). Medication mapping attached for review.</div>
    </DocFrame>
  );
}

export function PlanSummary() {
  const { c, hospital } = useCase();
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card><h3 className="mb-4 font-semibold">When</h3><KV rows={[["Arrive", fmtDate(c.dates.arrive)], ["Admission", fmtDate(c.dates.admit)], ["Surgery", fmtDate(c.dates.surgery)], ["Discharge", fmtDate(c.dates.discharge)], ["Fit to fly", fmtDate(c.dates.fly)], ["US handover", fmtDate(c.dates.usVisit)]]} /></Card>
      <Card><h3 className="mb-4 font-semibold">What</h3><p className="text-[15px] leading-relaxed">{c.clinical.recommendation}: {c.clinical.grafts.join(", ")}. About 4 hours under general anaesthesia.</p><p className="mt-3 text-sm leading-relaxed text-muted">2 ICU days and 5 ward days, then about a week nearby until cleared to fly (10–14 days after surgery). No change of procedure without family approval.</p></Card>
      <Card><h3 className="mb-4 font-semibold">Who</h3><KV rows={[["Surgeon", <span key="s">{hospital.surgeon.name}<br /><span className="text-sm text-muted">{hospital.name}</span></span>], ["US doctor", c.cardiologist.name.split(",")[0]], ["Attendant", c.attendant.name]]} /></Card>
    </div>
  );
}

export function PriceRange() {
  const { c, canSeePayments } = useCase();
  if (!canSeePayments) return <Empty title="Payment details are private">The patient hasn't shared payments with you.</Empty>;
  const rows: [string, number, number][] = [["Hospital package and priced extras (paid to hospital)", QUOTE_LOW / FX, QUOTE_HIGH / FX], ["HeartBridge coordination fee (flat)", c.feeUsd, c.feeUsd]];
  if (c.coverUsd) rows.push(["Complication cover (required, estimate)", 500, 800]);
  if (c.visaUsd) rows.push(["e-Medical + attendant visa fees", c.visaUsd, c.visaUsd]);
  if (c.coverage.kind === "selfpay") rows.push(["US follow-up, echo and rehab (Good Faith Estimates)", 2900, 3600]);
  const lo = rows.reduce((a, r) => a + r[1], 0), hi = rows.reduce((a, r) => a + r[2], 0);
  return (
    <Card>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><div className="text-sm text-muted">Estimated episode total</div><div className="mt-1 text-3xl font-semibold tabular">{usd(lo)} – {usd(hi)}</div></div>
        <div className="max-w-xs text-sm text-muted">{c.coverage.kind === "selfpay" ? "US cash CABG reference: about $55,700 bundled to $75,000 facility-only." : "Medicare covers the US visits and rehab, not the India procedure."}</div>
      </div>
      <div className="divide-y divide-line">{rows.map(r => <div key={r[0]} className="flex flex-wrap justify-between gap-2 py-3 text-[15px]"><span>{r[0]}</span><span className="tabular text-muted">{r[1] === r[2] ? usd(r[1]) : `${usd(r[1])} – ${usd(r[2])}`}</span></div>)}</div>
      <p className="mt-4 text-xs text-muted">Hospital range {inr(QUOTE_LOW)} – {inr(QUOTE_HIGH)} at ₹{FX}/$. Published Narayana range for CABG, private room: ₹6–6.5 lakh (Apr 2026). Flights and stay not included. HeartBridge never holds patient funds.</p>
    </Card>
  );
}

export function BillVsQuote() {
  const { s, canSeePayments } = useCase();
  if (!canSeePayments) return <Empty title="Bill is private">Only the patient and family members with payment access can see the bill.</Empty>;
  if (!s.dischargePack) return <Empty title="The bill appears after discharge">Once the hospital releases the itemised bill, HeartBridge audits it against the binding quote and shows it here.</Empty>;
  const total = billedTotal(s, QUOTE);
  return (
    <Card>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><div className="text-sm text-muted">Final bill</div><div className="mt-1 text-3xl font-semibold tabular">{inr(total)} <span className="text-lg font-normal text-muted">({usd(total / FX)})</span></div></div>
        <Badge tone={total <= QUOTE_HIGH ? "done" : "flag"}>{total <= QUOTE_HIGH ? "Within quote" : "Above quote"}</Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-[15px]">
          <thead><tr className="border-b border-line text-left text-xs text-muted"><th className="py-2 font-medium">Quote line</th><th className="py-2 text-right font-medium">Quoted up to</th><th className="py-2 text-right font-medium">Billed</th></tr></thead>
          <tbody>{QUOTE.map(q => {
            const billed = q.id === "icu" && s.icu !== "approved" ? 0 : q.billed;
            return (
              <tr key={q.id} className="border-b border-line align-top">
                <td className="py-3 pr-4">{q.label}<div className={cx("text-xs", q.kind === "included" ? "text-flag-500" : "text-muted")}>{q.kind === "included" ? "Billed separately but included in package · reversed after audit" : q.note}</div></td>
                <td className="py-3 text-right tabular text-muted">{q.high ? inr(q.high) : "Included"}</td>
                <td className="py-3 text-right tabular">{q.kind === "included" ? <s className="text-muted">{inr(q.billed)}</s> : billed ? inr(billed) : "—"}</td>
              </tr>);
          })}</tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-muted">Quote range {inr(QUOTE_LOW)} – {inr(QUOTE_HIGH)}. Coronary stent lines, when used, show brand and the NPPA-capped price (DES ₹39,186 from 1 Apr 2026).</p>
    </Card>
  );
}

export function MedTable({ editable = false }: { editable?: boolean }) {
  const { s, act } = useCase();
  return (
    <Card pad={false} className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-[15px]">
        <thead><tr className="border-b border-line text-left text-xs text-muted"><th className="px-6 py-3 font-medium">Prescribed in India</th><th className="py-3 font-medium">US equivalent</th><th className="py-3 font-medium">Note</th><th className="px-6 py-3 text-right font-medium">Status</th></tr></thead>
        <tbody>{MEDS.map((m, i) => (
          <tr key={m.india} className="border-b border-line last:border-0">
            <td className="px-6 py-4"><div className="font-medium">{m.india}</div><div className="text-sm text-muted">{m.indiaDose}</div></td>
            <td className="py-4 pr-4"><div>{m.us}</div><div className="text-sm text-muted">{m.usDose} · RxNorm {m.rxnorm}</div></td>
            <td className="py-4 pr-4 text-sm text-muted">{m.note}</td>
            <td className="px-6 py-4 text-right">{s.meds[i] ? <Badge tone="done">Approved</Badge> : editable ? <Button size="sm" variant="secondary" onClick={() => act("usdoc", `Approved ${m.us}`, x => { x.meds[i] = true; })}>Approve</Button> : <Badge tone="active">With US doctor</Badge>}</td>
          </tr>))}</tbody>
      </table>
    </Card>
  );
}

export function EpisodeFeed() {
  const { c, s } = useCase();
  const [sel, setSel] = useState<number | null>(null);
  if (s.day < 0) return <Empty title="Live updates start on arrival">Hospital events, surgery-day progress and vitals appear here as they happen, shared by permission.</Empty>;
  const d = sel === null || sel > s.day ? s.day : sel;
  const day = EPISODE[d];
  const extra = s.updates.filter(u => u.day === d);
  const events = [...day.events.map(e => ({ ...e, posted: false })), ...extra.map(u => ({ time: u.time, text: u.text, source: u.author, posted: true }))].sort((a, b) => a.time.localeCompare(b.time));
  return (
    <div>
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {EPISODE.map((e, i) => (
          <button key={e.key} disabled={i > s.day} onClick={() => setSel(i)}
            className={cx("flex-none rounded-xl border px-4 py-2.5 text-left transition", i === d ? "border-brand-500 bg-brand-50" : "border-line bg-white hover:bg-canvas", i > s.day && "opacity-40")}>
            <div className="text-sm font-medium">{e.label}</div><div className="text-xs text-muted">{fmtDate(addDays(c.dates.surgery, e.offset), { day: "numeric", month: "short" })}</div>
          </button>))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card>
          <div className="mb-2 flex items-center justify-between"><h3 className="font-semibold">{day.label} · {fmtDate(addDays(c.dates.surgery, day.offset), { weekday: "short", day: "numeric", month: "short" })}</h3>{d === s.day && s.day < EPISODE.length - 1 && <Badge tone="active">Live</Badge>}</div>
          <ol className="divide-y divide-line">
            {events.map((e, i) => (
              <li key={i} className="grid grid-cols-[64px_minmax(0,1fr)] gap-4 py-4">
                <time className="font-semibold tabular text-brand-600">{e.time}</time>
                <div><div className="text-[15px]">{e.text}</div><div className="text-xs text-muted">{e.source}{e.posted ? " · posted by care team" : ""}</div></div>
              </li>))}
          </ol>
        </Card>
        <div className="space-y-5">
          {day.vitals && <Card><h3 className="mb-4 font-semibold">Latest vitals</h3><div className="grid grid-cols-2 gap-3">
            {[["Heart rate", day.vitals.hr + " bpm"], ["Blood pressure", day.vitals.bp], ["SpO₂", day.vitals.spo2 + "%"], ["Temperature", day.vitals.temp ? day.vitals.temp + " °C" : "—"]].map(([k, v]) => <div key={k} className="rounded-xl bg-canvas p-3"><div className="text-xs text-muted">{k}</div><div className="mt-1 font-semibold tabular">{v}</div></div>)}
          </div></Card>}
          {s.icu !== "none" && <Card><h3 className="mb-2 font-semibold">Extra ICU day</h3><p className="text-sm text-muted">Priced trigger in the binding quote (₹28,000).</p><div className="mt-3"><Badge tone={s.icu === "approved" ? "done" : s.icu === "pending" ? "active" : "flag"}>{s.icu === "approved" ? "Approved by family" : s.icu === "pending" ? "Awaiting family approval" : "Declined"}</Badge></div></Card>}
        </div>
      </div>
    </div>
  );
}

const kindIcon = (k: Packet["kind"]) => k === "PDF" ? <FileText size={18} /> : k === "FHIR R4" ? <FileJson size={18} /> : <FileCode2 size={18} />;

export function DocsLibrary() {
  const { caseId, s, persona, canSeePayments } = useCase();
  const list = useMemo(() => packets(caseId, s).filter(p => p.audience.includes(persona)), [caseId, s, persona]);
  const [view, setView] = useState<{ p: Packet; content: string } | null>(null);
  const open = async (p: Packet) => setView({ p, content: await preview(p) });
  return (
    <div>
      <div className="grid gap-3">
        {list.map(p => {
          const locked = p.payments && !canSeePayments;
          return (
            <Card key={p.id} className="flex flex-wrap items-center gap-4 !py-4">
              <span className={cx("grid h-10 w-10 flex-none place-items-center rounded-xl", p.ready ? "bg-brand-50 text-brand-600" : "bg-canvas text-muted")}>{kindIcon(p.kind)}</span>
              <div className="min-w-0 flex-1"><div className="font-medium">{p.title}</div><div className="text-sm text-muted">{p.kind} · {p.detail}</div></div>
              {locked ? <Badge tone="upcoming"><Lock size={12} /> Private</Badge> : !p.ready ? <Badge tone="upcoming">Not yet generated</Badge> : (
                <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => open(p)}><Eye size={15} /> Preview</Button><Button size="sm" variant="secondary" onClick={() => download(p)}><Download size={15} /> Download</Button></div>)}
            </Card>);
        })}
      </div>
      {view && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={() => setView(null)}>
          <div className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-5 py-3"><div><div className="font-medium">{view.p.title}</div><div className="text-xs text-muted">{view.p.filename}</div></div><div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => download(view.p)}><Download size={15} /> Download</Button><Button size="sm" variant="ghost" onClick={() => setView(null)}><X size={16} /></Button></div></div>
            {view.p.kind === "PDF" ? <iframe title="preview" src={view.content} className="flex-1" /> : <pre className="flex-1 overflow-auto bg-canvas p-5 text-xs leading-relaxed">{view.content}</pre>}
          </div>
        </div>)}
    </div>
  );
}

export function ActivityLog() {
  const { s } = useCase();
  return (
    <Card pad={false}><ol className="max-h-[420px] divide-y divide-line overflow-auto">{s.log.map((l, i) => (
      <li key={i} className="flex gap-4 px-6 py-3 text-sm"><span className="w-28 flex-none tabular text-muted">{new Date(l.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span><span className="w-28 flex-none text-muted">{l.actor === "usdoc" ? "US doctor" : l.actor === "india" ? "India team" : l.actor}</span><span>{l.text}</span></li>))}</ol></Card>
  );
}

export function ConsentList({ editable }: { editable: boolean }) {
  const { c, s, act } = useCase();
  const items: [keyof typeof s.consents, string, string][] = [
    ["hipaa", "HIPAA authorisation", "Release records to HeartBridge and the matched Indian hospital (45 CFR 164.508)"],
    ["network", "National network access", "Individual access request via TEFCA, Carequality and CommonWell through a records partner"],
    ["claims", c.coverage.kind === "medicare" ? "Medicare claims (Blue Button 2.0)" : "Imaging release", c.coverage.kind === "medicare" ? "3 years of claims history to complete the picture" : "Cath lab images (DICOM) from the cash-pay provider"],
    ["dpdp", "India data consent (DPDP Act)", "Per-recipient consent for the Indian hospital to process your records"],
    ["family", "Family sharing", "Share updates with family members using the permissions you set"],
    ["messaging", "Alerts and calls", "WhatsApp alerts carry links only, never clinical detail; calls from HeartBridge"]
  ];
  return (
    <div className="divide-y divide-line">
      {items.map(([k, t, d]) => (
        <label key={k} className="flex cursor-pointer items-start gap-4 py-4">
          <input type="checkbox" className="mt-1 h-5 w-5 accent-[#184f46]" checked={s.consents[k]} disabled={!editable}
            onChange={e => act("patient", `${e.target.checked ? "Granted" : "Withdrew"} consent: ${t}`, x => { x.consents[k] = e.target.checked; })} />
          <span><span className="block font-medium">{t}</span><span className="text-sm text-muted">{d}</span></span>
        </label>))}
    </div>
  );
}
