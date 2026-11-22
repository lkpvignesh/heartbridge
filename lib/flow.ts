import { CASES, CaseId, EPISODE, HospitalId, MEDS, PersonaId } from "./data";

export interface LogEntry { at: string; actor: PersonaId | "system"; text: string }
export interface Update { day: number; time: string; text: string; author: string }

export interface CaseState {
  profileDone: boolean;
  consents: { hipaa: boolean; network: boolean; claims: boolean; dpdp: boolean; family: boolean; messaging: boolean };
  recordsPulled: boolean;
  match: HospitalId | null;
  ctd1Signed: boolean;
  indiaAccepted: boolean;
  docApproved: boolean;
  patientApproved: boolean;
  visa: { letter: boolean; selfManaged: boolean; formDone: boolean; submitted: boolean; granted: boolean };
  arrived: boolean;
  day: number; // index into EPISODE, -1 before arrival
  icu: "none" | "pending" | "approved" | "declined";
  updates: Update[];
  dischargePack: boolean;
  ctd2Signed: boolean;
  billReviewed: boolean;
  ctd2Accepted: boolean;
  meds: boolean[];
  apptBooked: boolean;
  claimIssued: boolean;
  closed: boolean;
  log: LogEntry[];
}

export const blank = (): CaseState => ({
  profileDone: false,
  consents: { hipaa: false, network: false, claims: false, dpdp: false, family: false, messaging: false },
  recordsPulled: false, match: null, ctd1Signed: false, indiaAccepted: false, docApproved: false, patientApproved: false,
  visa: { letter: false, selfManaged: false, formDone: false, submitted: false, granted: false },
  arrived: false, day: -1, icu: "none", updates: [], dischargePack: false, ctd2Signed: false, billReviewed: false,
  ctd2Accepted: false, meds: MEDS.map(() => false), apptBooked: false, claimIssued: false, closed: false,
  log: [{ at: new Date().toISOString(), actor: "system", text: "Case created" }]
});

export type Preset = "start" | "approved" | "surgery" | "discharged";
export const PRESETS: { id: Preset; label: string; hint: string }[] = [
  { id: "start", label: "From the beginning", hint: "Onboarding onwards" },
  { id: "approved", label: "Plan approved", hint: "Ready to travel" },
  { id: "surgery", label: "Surgery day", hint: "Live hospital updates" },
  { id: "discharged", label: "Discharged", hint: "Bill and handover" }
];

export function preset(id: CaseId, p: Preset): CaseState {
  const c = CASES[id];
  const s = blank();
  if (p === "start") return s;
  Object.assign(s, { profileDone: true, recordsPulled: true, match: "nh", ctd1Signed: true, indiaAccepted: true, docApproved: true, patientApproved: true });
  s.consents = { hipaa: true, network: true, claims: true, dpdp: true, family: true, messaging: true };
  if (c.needsVisa) s.visa = { letter: true, selfManaged: false, formDone: true, submitted: true, granted: p !== "approved" };
  if (p === "approved") return s;
  s.visa.granted = true;
  s.arrived = true;
  s.day = 3;
  if (p === "surgery") return s;
  s.day = EPISODE.length - 1; s.icu = "approved"; s.dischargePack = true; s.ctd2Signed = true;
  return s;
}

export interface Step { id: string; stage: Stage; title: string; owner: PersonaId; ownerLabel: (id: CaseId) => string; done: (s: CaseState) => boolean; applies?: (id: CaseId, s: CaseState) => boolean; screen: string }
export type Stage = "Onboarding" | "Pre-op clarity" | "Medical visa" | "Care delivery" | "Post-surgical care";
export const STAGES: Stage[] = ["Onboarding", "Pre-op clarity", "Medical visa", "Care delivery", "Post-surgical care"];

const pat = (id: CaseId) => CASES[id].patient.first;
const doc = (id: CaseId) => "Dr. " + CASES[id].cardiologist.name.split(",")[0].split(" ").slice(-1)[0];
const payer = (id: CaseId) => CASES[id].family.find(f => f.perms.payments)?.name.split(" ")[0] ?? pat(id);

export const STEPS: Step[] = [
  { id: "profile", stage: "Onboarding", title: "Complete profile, coverage and care team", owner: "patient", ownerLabel: pat, done: s => s.profileDone, screen: "profile" },
  { id: "consents", stage: "Onboarding", title: "Give consent to pull records and share with family", owner: "patient", ownerLabel: pat, done: s => Object.values(s.consents).every(Boolean), screen: "profile" },
  { id: "records", stage: "Onboarding", title: "Pull US medical records", owner: "patient", ownerLabel: pat, done: s => s.recordsPulled, screen: "records" },
  { id: "match", stage: "Pre-op clarity", title: "Choose an Indian surgeon to work with", owner: "usdoc", ownerLabel: doc, done: s => !!s.match, screen: "surgeon" },
  { id: "ctd1", stage: "Pre-op clarity", title: "Sign the US → India care-transition document", owner: "usdoc", ownerLabel: doc, done: s => s.ctd1Signed, screen: "ctd1" },
  { id: "accept", stage: "Pre-op clarity", title: "Accept the case and issue a binding package", owner: "india", ownerLabel: () => "India care team", done: s => s.indiaAccepted, screen: "referral" },
  { id: "docApprove", stage: "Pre-op clarity", title: "Approve the pre-op plan", owner: "usdoc", ownerLabel: doc, done: s => s.docApproved, screen: "plan" },
  { id: "patientApprove", stage: "Pre-op clarity", title: "Approve the plan and price range", owner: "patient", ownerLabel: pat, done: s => s.patientApproved, screen: "plan" },
  { id: "visaLetter", stage: "Medical visa", title: "Issue the medical visa invitation letter", owner: "india", ownerLabel: () => "India care team", done: s => s.visa.letter, applies: id => CASES[id].needsVisa, screen: "visa" },
  { id: "visaApply", stage: "Medical visa", title: "Submit e-Medical visa applications", owner: "patient", ownerLabel: pat, done: s => s.visa.granted || s.visa.selfManaged, applies: id => CASES[id].needsVisa, screen: "visa" },
  { id: "arrive", stage: "Care delivery", title: "Check in on arrival in India", owner: "patient", ownerLabel: pat, done: s => s.arrived, screen: "stay" },
  { id: "icu", stage: "Care delivery", title: "Approve the extra ICU day (priced in quote)", owner: "family", ownerLabel: payer, done: s => s.icu !== "pending", applies: (_, s) => s.icu === "pending", screen: "approvals" },
  { id: "care", stage: "Care delivery", title: "Post daily updates through to discharge", owner: "india", ownerLabel: () => "India care team", done: s => s.day >= EPISODE.length - 1, screen: "inpatient" },
  { id: "discharge", stage: "Care delivery", title: "Release discharge pack, itemised bill and India → US document", owner: "india", ownerLabel: () => "India care team", done: s => s.dischargePack && s.ctd2Signed, screen: "discharge" },
  { id: "bill", stage: "Post-surgical care", title: "Review the final bill against the quote", owner: "patient", ownerLabel: pat, done: s => s.billReviewed, screen: "bill" },
  { id: "ctd2", stage: "Post-surgical care", title: "Accept the India → US document into the chart", owner: "usdoc", ownerLabel: doc, done: s => s.ctd2Accepted, screen: "handover" },
  { id: "meds", stage: "Post-surgical care", title: "Approve the medication mapping", owner: "usdoc", ownerLabel: doc, done: s => s.meds.every(Boolean), screen: "meds" },
  { id: "appt", stage: "Post-surgical care", title: "Book the handover visit and cardiac rehab", owner: "usdoc", ownerLabel: doc, done: s => s.apptBooked, screen: "followup" },
  { id: "claim", stage: "Post-surgical care", title: "Generate the follow-up claim or Good Faith Estimate", owner: "usdoc", ownerLabel: doc, done: s => s.claimIssued, screen: "followup" },
  { id: "close", stage: "Post-surgical care", title: "Confirm you're home and handed over", owner: "patient", ownerLabel: pat, done: s => s.closed, screen: "home" }
];

export const applicable = (id: CaseId, s: CaseState) => STEPS.filter(st => !st.applies || st.applies(id, s) || (st.id === "icu" && s.icu !== "none"));
export const nextStep = (id: CaseId, s: CaseState) => applicable(id, s).find(st => !st.done(s)) ?? null;

export function stageStatus(id: CaseId, s: CaseState, stage: Stage): "done" | "active" | "upcoming" | "skipped" {
  const steps = applicable(id, s).filter(st => st.stage === stage);
  if (!steps.length) return "skipped";
  if (steps.every(st => st.done(s))) return "done";
  const n = nextStep(id, s);
  return n && n.stage === stage ? "active" : steps.some(st => st.done(s)) ? "active" : "upcoming";
}

export const billedTotal = (s: CaseState, quote: { id: string; billed: number; kind: string }[]) =>
  quote.reduce((a, q) => a + (q.kind === "included" ? 0 : q.id === "icu" && s.icu !== "approved" ? 0 : q.billed), 0);
