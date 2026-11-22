// Demo data. People, practices, IDs and clinical records are fictional.
// Hospitals, accreditation, published price ranges, visa fees, codes and rules are real (Nov 2026).

export const FX = 85; // INR per USD used for display

export type CaseId = "lakshmi" | "mark";
export type PersonaId = "patient" | "family" | "usdoc" | "india";

export interface Clinician { name: string; org: string; npi: string; phone: string; address: string; specialty: string }
export interface FamilyMember { name: string; relation: string; location: string; phone: string; email: string; perms: { clinical: boolean; travel: boolean; payments: boolean } }

export interface CaseData {
  id: CaseId;
  cohort: "A" | "B";
  cohortLabel: string;
  patient: { first: string; last: string; dob: string; sex: "female" | "male"; age: number; phone: string; email: string; address: string; city: string; state: string; zip: string; passport: string; citizenship: string; oci?: string };
  coverage: { kind: "medicare" | "selfpay"; label: string; memberId: string; supplemental?: string; mac?: { name: string; payerId: string } };
  pcp: Clinician;
  cardiologist: Clinician;
  family: FamilyMember[];
  needsVisa: boolean;
  attendant: { name: string; relation: string; passport?: string };
  clinical: {
    problems: { code: string; display: string }[];
    allergies: string;
    cath: { date: string; text: string; lesions: { vessel: string; stenosis: number }[]; syntax: number };
    echo: { date: string; text: string; lvef: number };
    labs: { code: string; display: string; value: number; unit: string; date: string }[];
    meds: { name: string; rxnorm?: string; dose: string }[];
    sts: number;
    recommendation: string;
    grafts: string[];
  };
  dates: { onboard: string; arrive: string; admit: string; surgery: string; discharge: string; fly: string; usVisit: string };
  feeUsd: number;
  coverUsd?: number;
  visaUsd?: number;
}

export const HOSPITALS = [
  {
    id: "nh", name: "Narayana Health City", city: "Bengaluru, Karnataka", accreditation: ["JCI", "NABH"],
    surgeon: { name: "Dr. S. Ananthakrishnan", title: "Senior Consultant, Cardiac Surgery", reg: "KMC 48213 (demo)" },
    facts: ["Hospital reports 5,000+ cardiac surgeries a year", "Published CABG range: ₹1.82–2.42 lakh general ward, ₹6–6.5 lakh private room (Apr 2026)", "International desk issues English discharge packs"],
    languages: "English, Tamil, Kannada, Hindi", address: "258/A Bommasandra Industrial Area, Hosur Road, Bengaluru 560099"
  },
  {
    id: "ap", name: "Apollo Hospitals, Greams Road", city: "Chennai, Tamil Nadu", accreditation: ["JCI", "NABH"],
    surgeon: { name: "Dr. K. Venkatesh", title: "Consultant, Cardiothoracic Surgery", reg: "TNMC 77120 (demo)" },
    facts: ["Apollo group holds 8 JCI-accredited facilities", "Large NRI patient flow from the US", "Package quote on request"],
    languages: "English, Tamil, Telugu", address: "21 Greams Lane, Off Greams Road, Chennai 600006"
  },
  {
    id: "md", name: "Medanta – The Medicity", city: "Gurugram, Haryana", accreditation: ["JCI", "NABH"],
    surgeon: { name: "Dr. A. Bhatia", title: "Director, Cardiac Surgery", reg: "HMC 30561 (demo)" },
    facts: ["Large heart institute", "Package quote on request", "Farther from family in South India"],
    languages: "English, Hindi", address: "CH Baktawar Singh Road, Sector 38, Gurugram 122001"
  }
] as const;
export type HospitalId = (typeof HOSPITALS)[number]["id"];

export const CASES: Record<CaseId, CaseData> = {
  lakshmi: {
    id: "lakshmi", cohort: "A", cohortLabel: "Indian-born senior · US citizen with OCI card · Medicare",
    patient: { first: "Lakshmi", last: "Raghavan", dob: "1958-03-14", sex: "female", age: 68, phone: "(732) 555-0148", email: "lakshmi.r@example.com", address: "41 Grove Ave", city: "Edison", state: "NJ", zip: "08820", passport: "US 5XX XXX 214", citizenship: "United States", oci: "A21XXXX88 (verified)" },
    coverage: { kind: "medicare", label: "Original Medicare (Parts A & B) + Medigap Plan G", memberId: "1EG4TE5MK73", supplemental: "Medigap Plan G (demo carrier)", mac: { name: "Novitas Solutions (JL, New Jersey Part B)", payerId: "12402" } },
    pcp: { name: "Meera Nair, MD", org: "Edison Family Medicine", npi: "1234567893", phone: "(732) 555-0102", address: "1 Main St, Edison NJ 08817", specialty: "Family medicine" },
    cardiologist: { name: "Rahul Menon, MD, FACC", org: "Raritan Heart Associates", npi: "1497758544", phone: "(732) 555-0190", address: "200 Somerset St, New Brunswick NJ 08901", specialty: "Cardiology" },
    family: [
      { name: "Arjun Raghavan", relation: "Son", location: "Edison, NJ", phone: "(732) 555-0177", email: "arjun.r@example.com", perms: { clinical: true, travel: true, payments: true } },
      { name: "Priya Raghavan", relation: "Daughter · India point of contact", location: "Bengaluru", phone: "+91 98450 55501", email: "priya.r@example.com", perms: { clinical: true, travel: true, payments: false } }
    ],
    needsVisa: false,
    attendant: { name: "Priya Raghavan", relation: "Daughter (lives in Bengaluru)" },
    clinical: {
      problems: [
        { code: "I20.89", display: "Other forms of angina pectoris (stable, CCS II)" },
        { code: "I25.10", display: "Atherosclerotic heart disease of native coronary artery" },
        { code: "E11.9", display: "Type 2 diabetes mellitus without complications" },
        { code: "I10", display: "Essential (primary) hypertension" },
        { code: "E78.5", display: "Hyperlipidemia, unspecified" }
      ],
      allergies: "No known drug allergies",
      cath: { date: "2026-10-21", text: "Left main normal. Proximal LAD 90%. OM1 80%. Mid RCA 85%. Three-vessel disease.", lesions: [{ vessel: "Proximal LAD", stenosis: 90 }, { vessel: "OM1", stenosis: 80 }, { vessel: "Mid RCA", stenosis: 85 }], syntax: 28 },
      echo: { date: "2026-10-14", text: "LVEF 50%. Mild inferior hypokinesis. No significant valve disease.", lvef: 50 },
      labs: [
        { code: "4548-4", display: "Hemoglobin A1c", value: 7.4, unit: "%", date: "2026-10-12" },
        { code: "13457-7", display: "LDL cholesterol (calculated)", value: 112, unit: "mg/dL", date: "2026-10-12" },
        { code: "2160-0", display: "Creatinine", value: 0.9, unit: "mg/dL", date: "2026-10-12" },
        { code: "33914-3", display: "eGFR", value: 72, unit: "mL/min/1.73m2", date: "2026-10-12" },
        { code: "718-7", display: "Hemoglobin", value: 12.1, unit: "g/dL", date: "2026-10-12" }
      ],
      meds: [
        { name: "Aspirin", rxnorm: "243670", dose: "81 mg daily" },
        { name: "Metoprolol succinate ER", rxnorm: "866427", dose: "25 mg daily" },
        { name: "Atorvastatin", rxnorm: "617312", dose: "40 mg daily" },
        { name: "Metformin", rxnorm: "861004", dose: "1000 mg twice daily" },
        { name: "Lisinopril", rxnorm: "314076", dose: "10 mg daily" },
        { name: "Nitroglycerin SL", rxnorm: "198039", dose: "0.4 mg as needed" }
      ],
      sts: 1.4, recommendation: "Heart team recommends CABG ×3", grafts: ["LIMA–LAD", "SVG–OM1", "SVG–RCA"]
    },
    dates: { onboard: "2026-11-02", arrive: "2026-11-18", admit: "2026-11-20", surgery: "2026-11-21", discharge: "2026-11-27", fly: "2026-12-03", usVisit: "2026-12-08" },
    feeUsd: 2500
  },
  mark: {
    id: "mark", cohort: "B", cohortLabel: "Uninsured US citizen · needs e-Medical visa",
    patient: { first: "Mark", last: "Delaney", dob: "1970-07-02", sex: "male", age: 56, phone: "(512) 555-0136", email: "mark.delaney@example.com", address: "1807 Holly St", city: "Austin", state: "TX", zip: "78702", passport: "US 6XX XXX 907", citizenship: "United States" },
    coverage: { kind: "selfpay", label: "Uninsured · self-pay", memberId: "—" },
    pcp: { name: "James Okafor, MD", org: "Eastside Community Clinic (sliding fee)", npi: "1760493852", phone: "(512) 555-0110", address: "900 E 7th St, Austin TX 78702", specialty: "Internal medicine" },
    cardiologist: { name: "Elena Ruiz, MD", org: "Capital Cash-Pay Cardiology", npi: "1588917611", phone: "(512) 555-0181", address: "3000 N Lamar Blvd, Austin TX 78705", specialty: "Cardiology" },
    family: [
      { name: "Karen Delaney", relation: "Wife · travelling attendant", location: "Austin, TX", phone: "(512) 555-0137", email: "karen.d@example.com", perms: { clinical: true, travel: true, payments: true } }
    ],
    needsVisa: true,
    attendant: { name: "Karen Delaney", relation: "Wife", passport: "US 6XX XXX 118" },
    clinical: {
      problems: [
        { code: "I20.89", display: "Other forms of angina pectoris (exertional)" },
        { code: "I25.10", display: "Atherosclerotic heart disease of native coronary artery" },
        { code: "I10", display: "Essential (primary) hypertension" },
        { code: "E78.5", display: "Hyperlipidemia, unspecified" },
        { code: "Z87.891", display: "Personal history of nicotine dependence" }
      ],
      allergies: "No known drug allergies",
      cath: { date: "2026-11-10", text: "Proximal LAD 85%. LCx 75%. Proximal RCA 90%. Three-vessel disease. Cash-pay cath (GFE $3,450).", lesions: [{ vessel: "Proximal LAD", stenosis: 85 }, { vessel: "LCx", stenosis: 75 }, { vessel: "Proximal RCA", stenosis: 90 }], syntax: 24 },
      echo: { date: "2026-11-03", text: "Stress echo: inducible ischaemia, anterior and inferior walls. Resting LVEF 55%.", lvef: 55 },
      labs: [
        { code: "4548-4", display: "Hemoglobin A1c", value: 5.8, unit: "%", date: "2026-11-03" },
        { code: "13457-7", display: "LDL cholesterol (calculated)", value: 141, unit: "mg/dL", date: "2026-11-03" },
        { code: "2160-0", display: "Creatinine", value: 1.1, unit: "mg/dL", date: "2026-11-03" },
        { code: "33914-3", display: "eGFR", value: 79, unit: "mL/min/1.73m2", date: "2026-11-03" },
        { code: "718-7", display: "Hemoglobin", value: 14.6, unit: "g/dL", date: "2026-11-03" }
      ],
      meds: [
        { name: "Aspirin", rxnorm: "243670", dose: "81 mg daily" },
        { name: "Atorvastatin", rxnorm: "259255", dose: "80 mg daily" },
        { name: "Metoprolol tartrate", rxnorm: "866514", dose: "25 mg twice daily" },
        { name: "Amlodipine", rxnorm: "308135", dose: "5 mg daily" },
        { name: "Nitroglycerin SL", rxnorm: "198039", dose: "0.4 mg as needed" }
      ],
      sts: 0.9, recommendation: "Heart team recommends CABG ×3", grafts: ["LIMA–LAD", "SVG–LCx", "SVG–RCA"]
    },
    dates: { onboard: "2026-11-15", arrive: "2027-01-10", admit: "2027-01-12", surgery: "2027-01-13", discharge: "2027-01-19", fly: "2027-01-25", usVisit: "2027-01-29" },
    feeUsd: 3750, coverUsd: 650, visaUsd: 205
  }
};

// Binding package quote lines (INR). [label, quotedMax, billed, kind]
export interface QuoteLine { id: string; label: string; low: number; high: number; billed: number; kind: "fixed" | "trigger" | "capped" | "included"; note: string }
export const QUOTE: QuoteLine[] = [
  { id: "pkg", label: "CABG package · private room · 7 days incl. 2 ICU days", low: 590000, high: 650000, billed: 620000, kind: "fixed", note: "Surgeon, anaesthesia, OT, ICU, room, standard drugs and consumables" },
  { id: "preadm", label: "Pre-admission tests and anaesthesia evaluation", low: 18000, high: 24000, billed: 21000, kind: "fixed", note: "Bloods, ECG, chest X-ray, carotid Doppler" },
  { id: "icu", label: "Extra ICU day", low: 0, high: 56000, billed: 28000, kind: "trigger", note: "₹28,000 per day; needs family approval" },
  { id: "blood", label: "Blood products beyond 2 units", low: 0, high: 18000, billed: 9000, kind: "trigger", note: "₹4,500 per unit" },
  { id: "pharm", label: "Pharmacy beyond package", low: 0, high: 40000, billed: 12400, kind: "capped", note: "Capped at ₹40,000" },
  { id: "disp", label: "Surgical disposables", low: 0, high: 0, billed: 18500, kind: "included", note: "Included in package" }
];
export const QUOTE_LOW = QUOTE.reduce((a, q) => a + q.low, 0);
export const QUOTE_HIGH = QUOTE.reduce((a, q) => a + q.high, 0);

export interface DayEvent { time: string; text: string; source: string }
export interface EpisodeDay { key: string; label: string; offset: number; events: DayEvent[]; vitals?: { hr: number; bp: string; spo2: number; temp?: number } }
// offset in days relative to surgery date
export const EPISODE: EpisodeDay[] = [
  { key: "arrival", label: "Arrival", offset: -3, events: [{ time: "14:20", text: "Landed at Kempegowda International Airport; met by HeartBridge companion", source: "Companion" }, { time: "18:00", text: "Welcome call with international desk; admission documents confirmed", source: "International desk" }] },
  { key: "preadm", label: "Pre-admission", offset: -2, events: [{ time: "08:30", text: "Bloods, ECG, chest X-ray and carotid Doppler done", source: "Lab" }, { time: "12:10", text: "Anaesthesia review: fit for surgery", source: "Anaesthesia" }, { time: "16:00", text: "Surgeon met patient and family; informed consent signed in English", source: "Cardiac surgery" }], vitals: { hr: 68, bp: "136/82", spo2: 98 } },
  { key: "admit", label: "Admission", offset: -1, events: [{ time: "10:00", text: "Admitted to cardiac ward, private room 714", source: "Admissions" }, { time: "13:30", text: "Deposit receipt issued; paid directly to hospital", source: "Billing" }, { time: "21:00", text: "Nil by mouth from midnight", source: "Nursing" }], vitals: { hr: 66, bp: "132/80", spo2: 98 } },
  { key: "surgery", label: "Surgery day", offset: 0, events: [{ time: "07:05", text: "Moved to operating theatre 3", source: "OT" }, { time: "07:40", text: "Anaesthesia started", source: "Anaesthesia" }, { time: "08:25", text: "Surgery under way: CABG ×3, on-pump", source: "OT" }, { time: "12:15", text: "Surgery completed: three grafts placed, no complications", source: "Cardiac surgery" }, { time: "12:55", text: "Transferred to cardiac ICU", source: "ICU" }, { time: "18:40", text: "Breathing tube removed; awake and talking", source: "ICU" }], vitals: { hr: 84, bp: "118/70", spo2: 97, temp: 37.1 } },
  { key: "pod1", label: "Post-op day 1", offset: 1, events: [{ time: "07:30", text: "Sat in chair; chest drain output within range", source: "ICU" }, { time: "11:00", text: "Physiotherapy: breathing exercises", source: "Physio" }, { time: "17:00", text: "Surgeon recommends one more ICU day as a precaution", source: "Cardiac surgery" }], vitals: { hr: 88, bp: "122/74", spo2: 96, temp: 37.4 } },
  { key: "pod2", label: "Post-op day 2", offset: 2, events: [{ time: "09:00", text: "Chest drains removed", source: "ICU" }, { time: "15:00", text: "Moved back to private room", source: "Ward" }], vitals: { hr: 82, bp: "124/76", spo2: 97 } },
  { key: "pod4", label: "Post-op day 4", offset: 4, events: [{ time: "10:00", text: "Walked 120 m in corridor with physio", source: "Physio" }, { time: "14:00", text: "Echo: LVEF 50%, small pericardial effusion, no action needed", source: "Cardiology" }], vitals: { hr: 76, bp: "128/78", spo2: 98 } },
  { key: "discharge", label: "Discharge", offset: 6, events: [{ time: "10:30", text: "Discharge summary, operative note, echo images and medication list released in English", source: "Medical records" }, { time: "12:00", text: "Discharged to recovery stay", source: "Ward" }], vitals: { hr: 74, bp: "126/78", spo2: 98 } }
];

export interface MedMap { india: string; indiaDose: string; us: string; usDose: string; rxnorm: string; note: string }
export const MEDS: MedMap[] = [
  { india: "Ecosprin 75", indiaDose: "75 mg once daily", us: "Aspirin", usDose: "81 mg once daily", rxnorm: "243670", note: "US low-dose strength is 81 mg" },
  { india: "Atorva 80", indiaDose: "80 mg at night", us: "Atorvastatin", usDose: "80 mg at night", rxnorm: "259255", note: "High-intensity statin after CABG" },
  { india: "Met XL 25", indiaDose: "25 mg once daily", us: "Metoprolol succinate ER", usDose: "25 mg once daily", rxnorm: "866427", note: "Same molecule and form" },
  { india: "Pan 40", indiaDose: "40 mg before breakfast · 4 weeks", us: "Pantoprazole", usDose: "40 mg before breakfast", rxnorm: "314200", note: "Stop after 4 weeks" },
  { india: "Lasix 20", indiaDose: "20 mg once daily · 5 days", us: "Furosemide", usDose: "20 mg once daily", rxnorm: "310429", note: "Short course; review at handover" },
  { india: "Cardace 2.5", indiaDose: "2.5 mg once daily", us: "Ramipril", usDose: "2.5 mg once daily", rxnorm: "845488", note: "Same class as prior lisinopril; US doctor to choose" },
  { india: "Dolo 650", indiaDose: "650 mg up to 3× daily as needed", us: "Acetaminophen", usDose: "650 mg as needed (max 3 g/day)", rxnorm: "313782", note: "Pain relief" }
];

export const RECORD_SOURCES = (c: CaseData) => [
  { id: "cq", name: "Carequality (via records partner)", kind: "Network", docs: 61, detail: "Hospital and specialist notes" },
  { id: "cw", name: "CommonWell Health Alliance", kind: "Network", docs: 88, detail: "Lab results and imaging reports" },
  c.coverage.kind === "medicare"
    ? { id: "bb", name: "Medicare Blue Button 2.0", kind: "Claims", docs: 41, detail: "3 years of Part A/B/D claims" }
    : { id: "cath", name: "Cash-pay cath lab portal", kind: "Imaging", docs: 4, detail: "Cath report and DICOM cine" },
  { id: "pcp", name: c.pcp.org, kind: "Direct request", docs: 12, detail: "Problem list and medications" },
  { id: "card", name: c.cardiologist.org, kind: "Direct request", docs: 6, detail: "Cath and echo reports" }
];

export const inr = (v: number) => "₹" + Math.round(v).toLocaleString("en-IN");
export const usd = (v: number) => "$" + Math.round(v).toLocaleString("en-US");
export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" });
export const addDays = (iso: string, n: number) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
