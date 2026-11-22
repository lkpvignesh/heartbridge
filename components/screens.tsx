"use client";
import { useState } from "react";
import { BedDouble, CalendarCheck, ClipboardCheck, FileStack, FileSignature, FolderHeart, Home, Inbox, Pill, Plane, Receipt, Stethoscope, UserRound, Users, HeartHandshake, Activity, ScrollText, Hospital } from "lucide-react";
import { CASES, CaseId, EPISODE, HOSPITALS, MEDS, PersonaId, QUOTE, fmtDate, inr } from "@/lib/data";
import { CaseState, nextStep } from "@/lib/flow";
import { packets, download } from "@/lib/packets";
import { useStore } from "@/lib/store";
import { ActivityLog, BillVsQuote, ClinicalSummary, ConsentList, CtdIndiaToUs, CtdUsToIndia, DocsLibrary, EpisodeFeed, Journey, MedTable, PlanSummary, PriceRange, RecordsPull, useCase } from "./shared";
import { Badge, Button, Card, Empty, KV, PageHeader, Section, cx } from "./ui";

type NavItem = { id: string; label: string; icon: import("lucide-react").LucideIcon };
export const NAV: Record<PersonaId, (id: CaseId, s: CaseState, familyIdx: number) => NavItem[]> = {
  patient: (id, s) => [
    { id: "home", label: "My journey", icon: Home },
    { id: "profile", label: "Profile and consents", icon: UserRound },
    { id: "records", label: "Medical records", icon: FolderHeart },
    { id: "plan", label: "Plan and price", icon: ClipboardCheck },
    ...(CASES[id].needsVisa ? [{ id: "visa", label: "Medical visa", icon: Plane }] : []),
    { id: "stay", label: "Hospital stay", icon: BedDouble },
    ...(s.dischargePack ? [{ id: "bill", label: "Bill vs quote", icon: Receipt }] : []),
    { id: "back", label: "Back home", icon: HeartHandshake },
    { id: "docs", label: "Documents", icon: FileStack }
  ],
  family: (id, s, fi) => [
    { id: "home", label: "Journey", icon: Home },
    { id: "stay", label: "Hospital updates", icon: Activity },
    { id: "approvals", label: "Approvals", icon: ClipboardCheck },
    ...(s.dischargePack && CASES[id].family[Math.min(fi, CASES[id].family.length - 1)].perms.payments ? [{ id: "bill", label: "Bill vs quote", icon: Receipt }] : []),
    { id: "docs", label: "Documents", icon: FileStack }
  ],
  usdoc: () => [
    { id: "worklist", label: "Patients", icon: Users },
    { id: "records", label: "Records summary", icon: FolderHeart },
    { id: "surgeon", label: "India surgeon", icon: Stethoscope },
    { id: "ctd1", label: "US → India document", icon: FileSignature },
    { id: "plan", label: "Plan approval", icon: ClipboardCheck },
    { id: "handover", label: "India → US handover", icon: ScrollText },
    { id: "meds", label: "Medications", icon: Pill },
    { id: "followup", label: "Follow-up and claims", icon: CalendarCheck },
    { id: "docs", label: "Documents", icon: FileStack }
  ],
  india: (id) => [
    { id: "referrals", label: "Referrals", icon: Inbox },
    { id: "referral", label: "Case and package", icon: FileSignature },
    ...(CASES[id].needsVisa ? [{ id: "visa", label: "Visa letter", icon: Plane }] : []),
    { id: "inpatient", label: "Inpatient updates", icon: Hospital },
    { id: "discharge", label: "Discharge pack", icon: ScrollText },
    { id: "docs", label: "Documents", icon: FileStack }
  ]
};

/* ---------------- Patient ---------------- */
function PatientHome() {
  const { caseId, c, s, act } = useCase();
  const setScreen = useStore(st => st.setScreen);
  const n = nextStep(caseId, s);
  return (
    <>
      <PageHeader eyebrow={c.cohortLabel} title={`Hello, ${c.patient.first}`} desc={`Your elective CABG is planned for ${fmtDate(c.dates.surgery)}. Everything about the trip, the surgery and your care back home is tracked here, and shared with your family the way you choose.`} />
      <Card className="mb-8"><Journey /></Card>
      <div className="grid gap-5 md:grid-cols-3">
        <Card><div className="text-sm text-muted">Next up</div><div className="mt-2 text-[17px] font-medium">{n ? n.title : "All done"}</div><div className="mt-1 text-sm text-muted">{n ? (n.owner === "patient" ? "This one's yours" : `With ${n.ownerLabel(caseId)}`) : "Welcome home"}</div>{n?.owner === "patient" && <Button className="mt-4" size="sm" variant="accent" onClick={() => setScreen(n.screen)}>Open</Button>}</Card>
        <Card><div className="text-sm text-muted">Your US cardiologist</div><div className="mt-2 text-[17px] font-medium">{c.cardiologist.name}</div><div className="mt-1 text-sm text-muted">{c.cardiologist.org}<br />{c.cardiologist.phone}</div></Card>
        <Card><div className="text-sm text-muted">In India</div><div className="mt-2 text-[17px] font-medium">{s.match ? HOSPITALS.find(h => h.id === s.match)!.name : "Surgeon being matched"}</div><div className="mt-1 text-sm text-muted">{c.attendant.name} · {c.attendant.relation}</div></Card>
      </div>
      {!n?.id && !s.closed && null}
      {s.claimIssued && !s.closed && <Card className="mt-8 flex flex-wrap items-center justify-between gap-4"><div><div className="font-medium">Home and handed over?</div><div className="text-sm text-muted">Confirm once you've seen {c.cardiologist.name.split(",")[0]} after landing.</div></div><Button onClick={() => act("patient", "Patient confirmed handover; episode closed", x => { x.closed = true; })}>Confirm and close episode</Button></Card>}
    </>
  );
}

function PatientProfile() {
  const { c, s, act } = useCase();
  const [tab, setTab] = useState(0);
  const tabs = ["You", "US coverage", "US care team", "Family and India contact"];
  const field = (label: string, value: string, id: string) => (
    <div key={id}><label htmlFor={id} className="mb-1.5 block text-sm text-muted">{label}</label><input id={id} defaultValue={value} disabled={s.profileDone} className="h-11 w-full rounded-xl border border-line bg-white px-3.5 text-[16px] disabled:bg-canvas" /></div>);
  return (
    <>
      <PageHeader eyebrow="Onboarding" title="Profile and consents" desc="We prefill what we can. Check each section, then give consent so we can pull your records from US networks and share them with the doctors you choose." right={s.profileDone ? <Badge tone="done">Profile saved</Badge> : undefined} />
      <Card className="mb-8">
        <div className="mb-6 flex flex-wrap gap-2">{tabs.map((t, i) => <button key={t} onClick={() => setTab(i)} className={cx("rounded-full px-4 py-2 text-sm transition", tab === i ? "bg-brand-700 text-white" : "bg-canvas text-muted hover:text-ink")}>{i + 1}. {t}</button>)}</div>
        <div className="grid gap-5 sm:grid-cols-2">
          {tab === 0 && <>{field("First name", c.patient.first, "fn")}{field("Last name", c.patient.last, "ln")}{field("Date of birth", fmtDate(c.patient.dob), "dob")}{field("Phone", c.patient.phone, "ph")}{field("Email", c.patient.email, "em")}{field("Home address", `${c.patient.address}, ${c.patient.city} ${c.patient.state} ${c.patient.zip}`, "ad")}{field("Citizenship", c.patient.citizenship, "cz")}{field(c.patient.oci ? "OCI card" : "Passport", c.patient.oci ?? c.patient.passport, "oci")}</>}
          {tab === 1 && <>{field("Coverage", c.coverage.label, "cov")}{field(c.coverage.kind === "medicare" ? "Medicare Beneficiary Identifier" : "Member ID", c.coverage.memberId, "mbi")}{c.coverage.mac && field("Part B contractor", `${c.coverage.mac.name} · payer ${c.coverage.mac.payerId}`, "mac")}<div className="sm:col-span-2 rounded-xl bg-canvas p-4 text-sm text-muted">{c.coverage.kind === "medicare" ? "Medicare won't pay for planned surgery in India, but it does cover your US visits before and after, and cardiac rehab." : "As a self-pay patient, every scheduled US visit comes with a Good Faith Estimate under the No Surprises Act."}</div></>}
          {tab === 2 && <>{field("Primary care doctor", c.pcp.name, "pcp")}{field("PCP NPI", c.pcp.npi, "pcpn")}{field("Practice", c.pcp.org, "pcpo")}{field("PCP phone", c.pcp.phone, "pcpp")}{field("Cardiologist", c.cardiologist.name, "card")}{field("Cardiologist NPI", c.cardiologist.npi, "cardn")}{field("Practice", c.cardiologist.org, "cardo")}{field("Cardiologist phone", c.cardiologist.phone, "cardp")}</>}
          {tab === 3 && <div className="space-y-4 sm:col-span-2">{c.family.map(f => (
            <div key={f.name} className="rounded-xl border border-line p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><div className="font-medium">{f.name}</div><div className="text-sm text-muted">{f.relation} · {f.location} · {f.phone}</div></div>
              <div className="flex gap-2">{(["clinical", "travel", "payments"] as const).map(k => <Badge key={k} tone={f.perms[k] ? "done" : "upcoming"}>{k[0].toUpperCase() + k.slice(1)}</Badge>)}</div></div></div>))}
            {!c.family.some(f => f.relation.includes("India")) && <div className="rounded-xl bg-canvas p-4 text-sm text-muted">No family in India: your HeartBridge coordinator in Bengaluru will be your India point of contact.</div>}
          </div>}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          {tab < 3 && <Button variant="secondary" onClick={() => setTab(tab + 1)}>Next section</Button>}
          {!s.profileDone && <Button onClick={() => act("patient", "Profile, coverage and care team saved", x => { x.profileDone = true; })}>Save profile</Button>}
        </div>
      </Card>
      <Section title="Consents" desc="You can withdraw any of these at any time.">
        <Card><ConsentList editable={s.profileDone} />{!s.profileDone && <p className="pt-2 text-sm text-muted">Save your profile first.</p>}
          {s.profileDone && !Object.values(s.consents).every(Boolean) && <Button className="mt-4" variant="secondary" onClick={() => act("patient", "All consents granted", x => { Object.keys(x.consents).forEach(k => (x.consents as any)[k] = true); })}>Grant all</Button>}</Card>
      </Section>
    </>
  );
}

function PatientRecords() {
  const { s, act } = useCase();
  const [running, setRunning] = useState(false);
  const ready = Object.values(s.consents).every(Boolean);
  return (
    <>
      <PageHeader eyebrow="Onboarding" title="Your US medical records" desc="We pull your records from national networks, Medicare and your doctors, then build one summary your US cardiologist and Indian surgeon can both trust." right={!s.recordsPulled ? <Button disabled={!ready || running} onClick={() => setRunning(true)}>{running ? "Pulling…" : "Pull my records"}</Button> : <Badge tone="done">Records ready</Badge>} />
      {!ready && <div className="mb-6"><Empty title="Consents needed first">Grant consents in Profile and consents before we can request records.</Empty></div>}
      <Card className="mb-8"><RecordsPull running={running} onDone={() => { if (!s.recordsPulled) { setRunning(false); act("system", "Records pulled from 5 sources and summarised", x => { x.recordsPulled = true; }); } }} /></Card>
      {s.recordsPulled && <Section title="Clinical summary" desc="What your doctors see. Generated from the records above."><ClinicalSummary /></Section>}
    </>
  );
}

function PatientPlan() {
  const { c, s, act } = useCase();
  const ready = s.indiaAccepted && s.docApproved;
  return (
    <>
      <PageHeader eyebrow="Pre-op clarity" title="Your plan and price" desc="When, what and who, with a transparent price range. You approve once your US cardiologist has approved and the Indian surgeon has accepted." />
      <Card className="mb-8">
        <div className="grid gap-4 sm:grid-cols-4">
          {[["Indian surgeon chosen", !!s.match], ["US → India document signed", s.ctd1Signed], ["Surgeon accepted", s.indiaAccepted], ["US doctor approved", s.docApproved]].map(([t, ok]) => (
            <div key={t as string} className="flex items-center gap-3"><span className={cx("h-2.5 w-2.5 rounded-full", ok ? "bg-brand-500" : "bg-line")} /><span className={cx("text-sm", !ok && "text-muted")}>{t}</span></div>))}
        </div>
      </Card>
      {s.match ? <><Section title="Plan"><PlanSummary /></Section><Section title="Price range"><PriceRange /></Section></> : <Empty title="Your plan appears once your US cardiologist picks a surgeon" />}
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div><div className="font-medium">{s.patientApproved ? "You approved this plan" : "Approve plan and price range"}</div><div className="text-sm text-muted">{ready ? `Approving confirms ${fmtDate(c.dates.surgery)} and ${c.needsVisa ? "starts your visa" : "your travel dates"}.` : "Available after the surgeon accepts and your US doctor approves."}</div></div>
        <Button variant="accent" disabled={!ready || s.patientApproved} onClick={() => act("patient", "Patient approved plan and price range", x => { x.patientApproved = true; })}>{s.patientApproved ? "Approved" : "Approve"}</Button>
      </Card>
    </>
  );
}

function PatientVisa() {
  const { c, s, act } = useCase();
  const store = useStore();
  const [route, setRoute] = useState<"direct" | "vendor">("direct");
  const submit = () => {
    act("patient", "e-Medical and attendant visa applications submitted", x => { x.visa.formDone = true; x.visa.submitted = true; });
    const id = store.caseId;
    setTimeout(() => useStore.getState().act("system", "Visas granted: ETA issued for patient and attendant", x => { x.visa.granted = true; }, id), 3500);
  };
  const steps: [string, string, boolean][] = [["Hospital invitation letter", "Issued on the MHA Medical Visa (FRRO) portal by the hospital", s.visa.letter], ["Applications submitted", "Patient e-Medical and attendant e-Medical Attendant", s.visa.submitted], ["Visas granted", "Electronic Travel Authorisation by email", s.visa.granted]];
  return (
    <>
      <PageHeader eyebrow="Medical visa" title="e-Medical visas for you and your attendant" desc={`${c.patient.first} is a US citizen without an OCI card, so you and ${c.attendant.name} each need an e-Medical visa. Current rules shown; India announced new M-1/M-2 categories on 11 Nov 2026 but hasn't notified them yet.`} />
      <div className="mb-8 grid gap-4 md:grid-cols-3">{steps.map(([t, d, ok], i) => <Card key={t}><div className="flex items-center justify-between"><span className="text-sm text-muted">Step {i + 1}</span><Badge tone={ok ? "done" : (i === 0 ? s.patientApproved : steps[i - 1][2]) ? "active" : "upcoming"}>{ok ? "Done" : "Pending"}</Badge></div><div className="mt-3 font-medium">{t}</div><div className="mt-1 text-sm text-muted">{d}</div></Card>)}</div>
      {s.visa.selfManaged ? <Empty title="You're handling the visa yourself">We'll still remind you of the invitation letter and travel dates.</Empty> : (
        <Card>
          <h3 className="mb-1 font-semibold">Application</h3><p className="mb-6 text-sm text-muted">Prefilled from your profile and the hospital letter. $100 per visa plus about 2.5% bank fee. Apply at least 4 days before travel; e-Medical visas can&apos;t be extended.</p>
          <div className="grid gap-5 md:grid-cols-2">
            {[[`${c.patient.first} ${c.patient.last}`, c.patient.passport, "e-Medical visa"], [c.attendant.name, c.attendant.passport ?? "", "e-Medical Attendant visa"]].map(([n, p, t]) => (
              <div key={n} className="rounded-xl border border-line p-4"><div className="font-medium">{n}</div><div className="mb-3 text-sm text-muted">{t}</div><KV rows={[["Passport", p], ["Arrival", `${fmtDate(c.dates.arrive)} · Bengaluru (BLR)`], ["Hospital ref", s.visa.letter ? "NH/IMV/2026/11842" : "Awaiting letter"], ["Documents", "Photo, passport page, Annexure A, US doctor letter, proof of funds"]]} /></div>))}
          </div>
          <fieldset className="mt-6"><legend className="mb-2 text-sm text-muted">How to file</legend><div className="flex flex-wrap gap-3">
            {([["direct", "File on indianvisaonline.gov.in, tracked here"], ["vendor", "Use a third-party e-visa service, tracked here"]] as const).map(([k, t]) => <label key={k} className={cx("flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm", route === k ? "border-brand-500 bg-brand-50" : "border-line")}><input type="radio" name="route" checked={route === k} onChange={() => setRoute(k)} className="accent-[#1F7A72]" />{t}</label>)}
          </div></fieldset>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="accent" disabled={!s.visa.letter || s.visa.submitted} onClick={submit}>{s.visa.granted ? "Visas granted" : s.visa.submitted ? "Under review…" : "Submit both applications"}</Button>
            {!s.visa.submitted && <Button variant="secondary" onClick={() => act("patient", "Patient chose to handle the visa outside HeartBridge", x => { x.visa.selfManaged = true; })}>I&apos;ll do it myself</Button>}
          </div>
          {!s.visa.letter && <p className="mt-3 text-sm text-muted">Waiting for the hospital&apos;s invitation letter.</p>}
        </Card>)}
    </>
  );
}

function PatientStay() {
  const { c, s, act } = useCase();
  const canArrive = s.patientApproved && (!c.needsVisa || s.visa.granted || s.visa.selfManaged);
  return (
    <>
      <PageHeader eyebrow="Care delivery" title="Hospital stay" desc="Every hospital event, the surgery-day timeline and vitals, as the care team posts them." right={!s.arrived ? <Button variant="accent" disabled={!canArrive} onClick={() => act("patient", "Checked in on arrival in Bengaluru", x => { x.arrived = true; x.day = 0; })}>I&apos;ve arrived in India</Button> : undefined} />
      {!s.arrived && !canArrive && <div className="mb-6"><Empty title="Check-in opens once your plan is approved">{c.needsVisa ? "and your visas are granted." : ""}</Empty></div>}
      <EpisodeFeed />
    </>
  );
}

function PatientBill() {
  const { s, act, persona } = useCase();
  return (
    <>
      <PageHeader eyebrow="After care delivery" title="Bill vs quote" desc="The hospital's itemised bill, audited line by line against the binding package you approved. Only you and family members with payment access see this." />
      <BillVsQuote />
      {persona === "patient" && s.dischargePack && <Card className="mt-6 flex flex-wrap items-center justify-between gap-4"><div><div className="font-medium">{s.billReviewed ? "You confirmed the bill" : "Does this match what you agreed?"}</div><div className="text-sm text-muted">Pay the hospital directly. HeartBridge never holds your money.</div></div><Button disabled={s.billReviewed} onClick={() => act("patient", "Patient reviewed and accepted the audited bill", x => { x.billReviewed = true; })}>{s.billReviewed ? "Confirmed" : "Confirm bill"}</Button></Card>}
    </>
  );
}

function PatientBack() {
  const { c, s } = useCase();
  const items: [string, string, boolean][] = [
    ["India → US care-transition document", s.ctd2Signed ? "Signed by your surgeon" : "Prepared at discharge", s.ctd2Signed],
    [`Accepted by ${c.cardiologist.name.split(",")[0]}`, "Records and images in your US chart", s.ctd2Accepted],
    ["Medications reviewed", `${s.meds.filter(Boolean).length} of ${MEDS.length} approved for US prescriptions`, s.meds.every(Boolean)],
    ["Handover visit and cardiac rehab booked", `${fmtDate(c.dates.usVisit)} · ${c.cardiologist.org}`, s.apptBooked],
    [c.coverage.kind === "medicare" ? "Medicare claim prepared for the US visit" : "Good Faith Estimate for US follow-up", c.coverage.kind === "medicare" ? "The India procedure isn't billed to Medicare" : "Firm self-pay estimate under the No Surprises Act", s.claimIssued]
  ];
  return (
    <>
      <PageHeader eyebrow="Post-surgical care" title="Back home" desc={`Fit-to-fly check on ${fmtDate(c.dates.fly)} (10–14 days after surgery). Here's what's set up for you in the US.`} />
      <Card pad={false} className="mb-8 divide-y divide-line">{items.map(([t, d, ok]) => <div key={t} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"><div><div className="font-medium">{t}</div><div className="text-sm text-muted">{d}</div></div><Badge tone={ok ? "done" : s.dischargePack ? "active" : "upcoming"}>{ok ? "Done" : s.dischargePack ? "In progress" : "After discharge"}</Badge></div>)}</Card>
      <Section title="Coverage and cover"><Card><KV rows={c.coverage.kind === "medicare" ? [["Medicare A & B", "Pays for US visits, echo and cardiac rehab; not the India surgery"], ["Medigap Plan G", "Foreign travel emergency only (80%)"], ["Complication cover", "Declined (decision logged)"]] : [["Complication cover", "Up to 180 days, evacuation and repatriation · est. $650"], ["Travel insurance", "Trip and baggage only"], ["US readmission", "Self-pay cap pre-negotiated"]]} /></Card></Section>
      {s.dischargePack && <Section title="Medication mapping"><MedTable /></Section>}
    </>
  );
}

/* ---------------- Family ---------------- */
function FamilyHome() {
  const { c, s, viewer } = useCase();
  const last = s.day >= 0 ? EPISODE[s.day] : null;
  return (
    <>
      <PageHeader eyebrow={`Following ${c.patient.first}'s care`} title={`Hi ${viewer?.name.split(" ")[0]}`} desc={`You can see ${Object.entries(viewer?.perms ?? {}).filter(([, v]) => v).map(([k]) => k).join(", ")} details, as ${c.patient.first} chose.`} />
      <Card className="mb-8"><Journey compact /></Card>
      <Card><div className="text-sm text-muted">Latest from the hospital</div>{last ? <><div className="mt-2 text-[17px] font-medium">{last.label}: {last.events[last.events.length - 1].text}</div><div className="mt-1 text-sm text-muted">{last.events[last.events.length - 1].time} · {last.events[last.events.length - 1].source}</div></> : <div className="mt-2 text-muted">Updates start when {c.patient.first} arrives in India ({fmtDate(c.dates.arrive)}).</div>}</Card>
    </>
  );
}

function FamilyApprovals() {
  const { c, s, act, viewer } = useCase();
  const can = !!viewer?.perms.payments;
  return (
    <>
      <PageHeader eyebrow="Care delivery" title="Approvals" desc="Anything that changes the price beyond the base package needs a family decision. Only priced triggers from the approved quote can be requested." />
      {s.icu === "none" ? <Empty title="Nothing to approve right now" /> : (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-sm text-muted">Request from the India care team · {EPISODE[4].label}</div><div className="mt-2 text-xl font-semibold">One extra ICU day as a precaution</div><p className="mt-2 max-w-xl text-[15px] text-muted">The surgeon recommends one more day of ICU monitoring. This is a priced trigger in {c.patient.first}&apos;s binding quote: {inr(28000)} per day.</p></div><Badge tone={s.icu === "approved" ? "done" : s.icu === "pending" ? "active" : "flag"}>{s.icu}</Badge></div>
          {s.icu === "pending" && (can ? <div className="mt-6 flex gap-3"><Button variant="accent" onClick={() => act("family", `${viewer!.name} approved the extra ICU day`, x => { x.icu = "approved"; })}>Approve {inr(28000)}</Button><Button variant="secondary" onClick={() => act("family", `${viewer!.name} declined the extra ICU day`, x => { x.icu = "declined"; })}>Decline</Button></div> : <p className="mt-6 text-sm text-muted">Only family members with payment access can approve. Switch to {c.family.find(f => f.perms.payments)?.name}.</p>)}
        </Card>)}
    </>
  );
}

/* ---------------- US doctor ---------------- */
function DocWorklist() {
  const store = useStore();
  const setCase = useStore(s => s.setCase), setScreen = useStore(s => s.setScreen);
  return (
    <>
      <PageHeader eyebrow="HeartBridge physician portal" title="Patients" desc="Patients treated in India under your care. You stay physician of record before and after surgery." />
      <div className="grid gap-4">{(Object.keys(CASES) as CaseId[]).map(id => {
        const c = CASES[id], s = store.cases[id], n = nextStep(id, s);
        const mine = n?.owner === "usdoc";
        return (
          <Card key={id} className="flex flex-wrap items-center gap-5">
            <div className="min-w-0 flex-1"><div className="text-[17px] font-medium">{c.patient.first} {c.patient.last}, {c.patient.age}</div><div className="text-sm text-muted">Elective CABG · {fmtDate(c.dates.surgery)} · {c.coverage.label} · referred by {c.cardiologist.name.split(",")[0]}</div></div>
            <Badge tone={mine ? "active" : n ? "upcoming" : "done"}>{mine ? n!.title : n ? `With ${n.ownerLabel(id)}` : "Complete"}</Badge>
            <Button size="sm" variant={store.caseId === id ? "primary" : "secondary"} onClick={() => { setCase(id); setScreen(mine ? n!.screen : "records"); }}>Open</Button>
          </Card>);
      })}</div>
    </>
  );
}

function DocSurgeon() {
  const { c, s, act } = useCase();
  return (
    <>
      <PageHeader eyebrow="Pre-op clarity" title="Choose an Indian surgeon you can work with" desc={`Matched for ${c.patient.first} on procedure, accreditation, language and family location. HeartBridge confirms your choice with the surgeon on the patient's behalf.`} />
      <div className="grid gap-5 lg:grid-cols-3">{HOSPITALS.map(h => (
        <Card key={h.id} className={cx("flex flex-col", s.match === h.id && "ring-2 ring-brand-500")}>
          <div className="flex flex-wrap gap-2">{h.accreditation.map(a => <Badge key={a} tone="neutral">{a}</Badge>)}</div>
          <div className="mt-4 text-[17px] font-semibold">{h.surgeon.name}</div><div className="text-sm text-muted">{h.surgeon.title} · demo name</div>
          <div className="mt-3 font-medium">{h.name}</div><div className="text-sm text-muted">{h.city}</div>
          <ul className="mt-4 flex-1 space-y-2 text-sm text-muted">{h.facts.map(f => <li key={f}>· {f}</li>)}<li>· Languages: {h.languages}</li></ul>
          <Button className="mt-6" variant={s.match === h.id ? "primary" : "secondary"} disabled={!!s.match || !s.recordsPulled} onClick={() => act("usdoc", `Chose ${h.surgeon.name}, ${h.name}`, x => { x.match = h.id; })}>{s.match === h.id ? "Chosen" : "Choose"}</Button>
        </Card>))}</div>
      {!s.recordsPulled && <p className="mt-4 text-sm text-muted">Available once the patient&apos;s records are pulled.</p>}
    </>
  );
}

function DocCtd1() {
  const { s, act } = useCase();
  return (
    <>
      <PageHeader eyebrow="Pre-op clarity" title="US → India care-transition document" desc="Generated by HeartBridge from the pulled records. Review, then e-sign to share it with the Indian surgeon." right={s.match ? <Button variant="accent" disabled={s.ctd1Signed} onClick={() => act("usdoc", "Signed and shared the US → India care-transition document", x => { x.ctd1Signed = true; })}>{s.ctd1Signed ? "Signed" : "E-sign and share"}</Button> : undefined} />
      {s.match ? <CtdUsToIndia /> : <Empty title="Choose a surgeon first" />}
    </>
  );
}

function DocPlan() {
  const { c, s, act } = useCase();
  return (
    <>
      <PageHeader eyebrow="Pre-op clarity" title="Approve the pre-op plan" desc="The Indian surgeon's opinion and binding package come to you, doctor to doctor. You remain physician of record." right={<Button variant="accent" disabled={!s.indiaAccepted || s.docApproved} onClick={() => act("usdoc", "US cardiologist approved the pre-op plan", x => { x.docApproved = true; })}>{s.docApproved ? "Approved" : "Approve plan"}</Button>} />
      {!s.indiaAccepted && <div className="mb-6"><Empty title="Waiting for the Indian surgeon to accept">They review your signed document and return a binding package.</Empty></div>}
      <PlanSummary />
      <Section title="Surgeon's response"><Card><p className="text-[15px] leading-relaxed">{s.indiaAccepted ? `Accepted. Agree with ${c.clinical.recommendation.toLowerCase().replace("heart team recommends ", "")} (${c.clinical.grafts.join(", ")}). Patient is suitable for elective surgery. Binding package issued.` : "Not yet received."}</p></Card></Section>
    </>
  );
}

function DocHandover() {
  const { s, act } = useCase();
  return (
    <>
      <PageHeader eyebrow="Post-surgical care" title="India → US handover" desc="Discharge summary from the Indian surgeon, converted to a structured document for your chart." right={<Button variant="accent" disabled={!s.ctd2Signed || s.ctd2Accepted} onClick={() => act("usdoc", "Accepted the India → US document into the chart", x => { x.ctd2Accepted = true; })}>{s.ctd2Accepted ? "Accepted into chart" : "Accept into chart"}</Button>} />
      {s.dischargePack ? <CtdIndiaToUs /> : <Empty title="Arrives at discharge" />}
    </>
  );
}

function DocMeds() {
  const { s, act } = useCase();
  return (
    <>
      <PageHeader eyebrow="Post-surgical care" title="Medication mapping" desc="Indian discharge medicines mapped to US equivalents. A 2–4 week supply travels with the patient; approve to send US prescriptions." right={s.dischargePack ? <Button variant="accent" disabled={s.meds.every(Boolean)} onClick={() => act("usdoc", "Approved all medications; e-prescriptions sent", x => { x.meds = x.meds.map(() => true); })}>Approve all</Button> : undefined} />
      {s.dischargePack ? <MedTable editable /> : <Empty title="Available after discharge" />}
    </>
  );
}

function DocFollowup() {
  const { caseId, c, s, act } = useCase();
  const [slot, setSlot] = useState(1);
  const slots = ["09:00", "10:30", "14:00", "16:30"];
  const p = packets(caseId, s).filter(x => ["837", "1500", "gfe"].includes(x.id));
  return (
    <>
      <PageHeader eyebrow="Post-surgical care" title="Follow-up and claims" desc={`Book the post-landing handover on ${fmtDate(c.dates.usVisit)} and cardiac rehab, then prepare ${c.coverage.kind === "medicare" ? "the Medicare claim for the US visit" : "a Good Faith Estimate for the self-pay patient"}.`} />
      <Card className="mb-6">
        <h3 className="mb-1 font-semibold">Handover visit · {fmtDate(c.dates.usVisit, { weekday: "long", day: "numeric", month: "long" })}</h3><p className="mb-4 text-sm text-muted">{c.cardiologist.org}, {c.cardiologist.address}</p>
        <div className="flex flex-wrap gap-2">{slots.map((t, i) => <button key={t} disabled={s.apptBooked} onClick={() => setSlot(i)} className={cx("h-11 rounded-xl border px-4 text-sm tabular", slot === i ? "border-brand-500 bg-brand-50 font-medium" : "border-line")}>{t}</button>)}</div>
        <div className="mt-5 rounded-xl bg-canvas p-4 text-sm"><b>Cardiac rehab intake</b> · 36 sessions · {c.coverage.kind === "medicare" ? "Medicare Part B (qualifying event: CABG, 42 CFR 410.49)" : "Cash programme, $1,980"}</div>
        <Button className="mt-5" disabled={!s.ctd2Accepted || s.apptBooked} onClick={() => act("usdoc", `Booked handover ${fmtDate(c.dates.usVisit)} ${slots[slot]} and rehab intake`, x => { x.apptBooked = true; })}>{s.apptBooked ? "Booked" : "Book visit and rehab"}</Button>
        {!s.ctd2Accepted && <p className="mt-2 text-sm text-muted">Accept the India → US document first.</p>}
      </Card>
      <Card>
        <h3 className="mb-1 font-semibold">{c.coverage.kind === "medicare" ? "Medicare claim (claim-ready packet)" : "Good Faith Estimate"}</h3>
        <p className="mb-4 text-sm text-muted">{c.coverage.kind === "medicare" ? `99214 + 93000 + 93306 with Z48.812, Z95.1, I25.10 to ${c.coverage.mac?.name}. Generated as an X12 837P file and CMS-1500 data. Not submitted in the demo.` : "Handover visit, echo, ECG, labs and 36 rehab sessions, issued under the No Surprises Act."}</p>
        <div className="flex flex-wrap gap-3">
          <Button variant="accent" disabled={!s.apptBooked || s.claimIssued} onClick={() => act("usdoc", c.coverage.kind === "medicare" ? "Generated 837P claim-ready packet" : "Issued Good Faith Estimate", x => { x.claimIssued = true; })}>{s.claimIssued ? "Generated" : "Generate"}</Button>
          {s.claimIssued && p.map(x => <Button key={x.id} variant="secondary" onClick={() => download(x)}>Download {x.kind === "X12 837P" ? "837P" : x.title}</Button>)}
        </div>
      </Card>
    </>
  );
}

function DocRecords() {
  const { c, s } = useCase();
  return (<><PageHeader eyebrow="Pre-op clarity" title="Records summary" desc="Pulled from US networks and summarised. Each statement links to its source document." />{s.recordsPulled ? <ClinicalSummary /> : <Empty title={`Waiting for ${c.patient.first} to pull records`}>Records arrive once the patient grants consent and runs the pull.</Empty>}</>);
}

/* ---------------- India care team ---------------- */
function IndiaReferrals() {
  const store = useStore();
  const setCase = useStore(s => s.setCase), setScreen = useStore(s => s.setScreen);
  return (
    <>
      <PageHeader eyebrow="International patient services · cardiac surgery" title="Referrals from the US" desc="Cases referred through HeartBridge. Each arrives with a signed care-transition document from the patient's US cardiologist." />
      <div className="grid gap-4">{(Object.keys(CASES) as CaseId[]).map(id => {
        const c = CASES[id], s = store.cases[id], n = nextStep(id, s), mine = n?.owner === "india";
        return (
          <Card key={id} className="flex flex-wrap items-center gap-5">
            <div className="min-w-0 flex-1"><div className="text-[17px] font-medium">{c.patient.first} {c.patient.last}, {c.patient.age} · {c.patient.city}, {c.patient.state}</div><div className="text-sm text-muted">From {c.cardiologist.name} · surgery {fmtDate(c.dates.surgery)} · {c.needsVisa ? "needs e-Medical visa" : "OCI holder, no visa"}</div></div>
            <Badge tone={mine ? "active" : !s.ctd1Signed ? "upcoming" : n ? "neutral" : "done"}>{mine ? n!.title : !s.ctd1Signed ? "Awaiting US document" : n ? `With ${n.ownerLabel(id)}` : "Complete"}</Badge>
            <Button size="sm" variant="secondary" onClick={() => { setCase(id); setScreen(mine ? n!.screen : "referral"); }}>Open</Button>
          </Card>);
      })}</div>
    </>
  );
}

function IndiaReferral() {
  const { s, act } = useCase();
  return (
    <>
      <PageHeader eyebrow="Pre-op clarity" title="Case and binding package" desc="Review the US cardiologist's document, then accept the case and issue a binding package with priced triggers." right={<Button variant="accent" disabled={!s.ctd1Signed || s.indiaAccepted} onClick={() => act("india", "Case accepted; binding package issued", x => { x.indiaAccepted = true; })}>{s.indiaAccepted ? "Accepted" : "Accept and issue package"}</Button>} />
      {s.ctd1Signed ? <div className="mb-8"><CtdUsToIndia /></div> : <div className="mb-8"><Empty title="Waiting for the signed US → India document" /></div>}
      <Section title="Binding package" desc="Paid directly by the patient to the hospital. Only priced triggers can add cost, each with family approval.">
        <Card pad={false} className="overflow-x-auto"><table className="w-full min-w-[560px] text-[15px]"><thead><tr className="border-b border-line text-left text-xs text-muted"><th className="px-6 py-3 font-medium">Line</th><th className="py-3 text-right font-medium">Low</th><th className="px-6 py-3 text-right font-medium">High</th></tr></thead>
          <tbody>{QUOTE.map(q => <tr key={q.id} className="border-b border-line last:border-0"><td className="px-6 py-3">{q.label}<div className="text-xs text-muted">{q.note}</div></td><td className="py-3 text-right tabular text-muted">{q.low ? inr(q.low) : "—"}</td><td className="px-6 py-3 text-right tabular">{q.high ? inr(q.high) : "Included"}</td></tr>)}</tbody></table></Card>
      </Section>
    </>
  );
}

function IndiaVisa() {
  const { c, s, act } = useCase();
  return (
    <>
      <PageHeader eyebrow="Medical visa" title="Visa invitation letter" desc={`Generate on the MHA Medical/Ayush Visa (FRRO) portal for ${c.patient.first} and attendant ${c.attendant.name}. Required for e-Medical applications since 1 Apr 2025.`} right={<Button variant="accent" disabled={!s.patientApproved || s.visa.letter} onClick={() => act("india", "Visa invitation letter issued (NH/IMV/2026/11842)", x => { x.visa.letter = true; })}>{s.visa.letter ? "Issued" : "Generate letter"}</Button>} />
      <Card><KV rows={[["Patient", `${c.patient.first} ${c.patient.last} · ${c.patient.passport}`], ["Attendant", `${c.attendant.name} · ${c.attendant.passport ?? ""}`], ["Treatment", `Elective CABG · admission ${fmtDate(c.dates.admit)}`], ["Status", s.visa.letter ? "Issued · NH/IMV/2026/11842" : s.patientApproved ? "Ready to generate" : "After patient approves the plan"]]} /></Card>
    </>
  );
}

function IndiaInpatient() {
  const { c, s, act } = useCase();
  const [text, setText] = useState("Evening round: comfortable, pain controlled, walked to the window with physio. Plan unchanged.");
  const atEnd = s.day >= EPISODE.length - 1;
  const blocked = s.icu === "pending";
  const advance = () => act("india", `Posted ${EPISODE[s.day + 1].label} events`, x => { x.day += 1; if (EPISODE[x.day].key === "pod1" && x.icu === "none") x.icu = "pending"; });
  return (
    <>
      <PageHeader eyebrow="Care delivery" title="Inpatient updates" desc={`Post ${c.patient.first}'s hospital events; the patient and permitted family see them immediately.`} right={s.arrived && !atEnd ? <Button variant="accent" disabled={blocked} onClick={advance}>Post {EPISODE[s.day + 1].label.toLowerCase()} events</Button> : undefined} />
      {!s.arrived ? <Empty title="Patient hasn't checked in yet">Updates open once {c.patient.first} confirms arrival in India.</Empty> : (
        <>
          {blocked && <div className="mb-6 rounded-2xl bg-accent-50 p-5 text-[15px]">Extra ICU day requested under the priced trigger. Waiting for family approval before the next day can be posted.</div>}
          <Card className="mb-8"><label htmlFor="upd" className="mb-2 block text-sm text-muted">Add a note to {EPISODE[s.day].label}</label><textarea id="upd" value={text} onChange={e => setText(e.target.value)} rows={3} className="w-full rounded-xl border border-line p-3.5 text-[16px]" />
            <Button className="mt-3" variant="secondary" disabled={!text.trim()} onClick={() => { const t = new Date(); act("india", "Care team posted an update", x => { x.updates.push({ day: x.day, time: `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`, text: text.trim(), author: "Ward nurse, cardiac surgery" }); }); }}>Post note</Button></Card>
          <EpisodeFeed />
        </>)}
    </>
  );
}

function IndiaDischarge() {
  const { s, act } = useCase();
  const atEnd = s.day >= EPISODE.length - 1;
  return (
    <>
      <PageHeader eyebrow="Care delivery" title="Discharge pack" desc="Release the English discharge pack and itemised bill, then sign the India → US care-transition document." />
      <Card className="mb-6">
        <div className="divide-y divide-line">{[["Discharge summary (ABDM FHIR, English)", s.dischargePack], ["Operative note", s.dischargePack], ["Echo images (DICOM link)", s.dischargePack], ["Itemised bill mapped to package", s.dischargePack], ["Medication list", s.dischargePack], ["Form C departure report to FRRO (within 24 h)", s.dischargePack]].map(([t, ok]) => <div key={t as string} className="flex items-center justify-between py-3"><span>{t}</span><Badge tone={ok ? "done" : "upcoming"}>{ok ? "Released" : "Pending"}</Badge></div>)}</div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="accent" disabled={!atEnd || s.dischargePack} onClick={() => act("india", "Discharge pack and itemised bill released", x => { x.dischargePack = true; })}>{s.dischargePack ? "Released" : "Release discharge pack"}</Button>
          <Button disabled={!s.dischargePack || s.ctd2Signed} onClick={() => act("india", "Surgeon signed the India → US care-transition document", x => { x.ctd2Signed = true; })}>{s.ctd2Signed ? "Signed" : "Sign India → US document"}</Button>
        </div>
        {!atEnd && <p className="mt-3 text-sm text-muted">Available on discharge day.</p>}
      </Card>
      {s.dischargePack && <CtdIndiaToUs />}
    </>
  );
}

/* ---------------- Router ---------------- */
function DocsScreen() {
  return (<><PageHeader eyebrow="Data packets" title="Documents" desc="Every document is generated from the case as it stands: FHIR R4 bundles, signed PDFs and claim files. You only see what your role and the patient's permissions allow." /><DocsLibrary /><Section title="Activity"><ActivityLog /></Section></>);
}

export function Screen() {
  const persona = useStore(s => s.persona);
  const screen = useStore(s => s.screens[s.persona]);
  const caseId = useStore(s => s.caseId), cs = useStore(s => s.cases[s.caseId]), fi = useStore(s => s.familyIdx);
  const allowed = NAV[persona](caseId, cs, fi).map(n => n.id);
  const map: Record<PersonaId, Record<string, () => JSX.Element>> = {
    patient: { home: PatientHome, profile: PatientProfile, records: PatientRecords, plan: PatientPlan, visa: PatientVisa, stay: PatientStay, bill: PatientBill, back: PatientBack, docs: DocsScreen },
    family: { home: FamilyHome, stay: () => <><PageHeader eyebrow="Care delivery" title="Hospital updates" desc="Shared by the India care team as they happen." /><EpisodeFeed /></>, approvals: FamilyApprovals, bill: PatientBill, docs: DocsScreen },
    usdoc: { worklist: DocWorklist, records: DocRecords, surgeon: DocSurgeon, ctd1: DocCtd1, plan: DocPlan, handover: DocHandover, meds: DocMeds, followup: DocFollowup, docs: DocsScreen },
    india: { referrals: IndiaReferrals, referral: IndiaReferral, visa: IndiaVisa, inpatient: IndiaInpatient, discharge: IndiaDischarge, docs: DocsScreen }
  };
  const C = (allowed.includes(screen) && map[persona][screen]) || map[persona][allowed[0]];
  return <C />;
}
