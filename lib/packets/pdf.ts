import { jsPDF } from "jspdf";
import { CASES, CaseId, EPISODE, FX, HOSPITALS, MEDS, QUOTE, QUOTE_HIGH, QUOTE_LOW, fmtDate } from "../data";
import { CaseState, billedTotal } from "../flow";
import { followUpLines } from "./x12";

const inrP = (v: number) => "INR " + Math.round(v).toLocaleString("en-IN");
const usdP = (v: number) => "USD " + Math.round(v).toLocaleString("en-US");
const TEAL: [number, number, number] = [24, 79, 70];
const MUTED: [number, number, number] = [102, 113, 109];

class Doc {
  pdf = new jsPDF({ unit: "pt", format: "letter" });
  y = 0;
  W = 612; M = 54;
  constructor(title: string, issuer: string, sub?: string) {
    const p = this.pdf;
    p.setFillColor(...TEAL); p.rect(0, 0, this.W, 6, "F");
    p.setFont("helvetica", "bold"); p.setFontSize(10); p.setTextColor(...TEAL); p.text(issuer, this.M, 34);
    p.setFont("helvetica", "normal"); p.setTextColor(...MUTED); p.setFontSize(8.5); p.text("Generated " + new Date().toLocaleString("en-US") + " · DEMO DOCUMENT · fictional patient data", this.M, 47);
    p.setTextColor(20, 30, 28); p.setFont("helvetica", "bold"); p.setFontSize(18); p.text(title, this.M, 76);
    this.y = 92;
    if (sub) { p.setFont("helvetica", "normal"); p.setFontSize(10); p.setTextColor(...MUTED); this.wrap(sub, 10); }
    this.y += 6; p.setDrawColor(225, 230, 228); p.line(this.M, this.y, this.W - this.M, this.y); this.y += 18;
  }
  room(h: number) { if (this.y + h > 740) { this.pdf.addPage(); this.y = 54; } }
  wrap(text: string, size = 10, bold = false, color: [number, number, number] = [20, 30, 28]) {
    const p = this.pdf; p.setFont("helvetica", bold ? "bold" : "normal"); p.setFontSize(size); p.setTextColor(...color);
    const lines = p.splitTextToSize(text, this.W - this.M * 2);
    for (const l of lines) { this.room(size + 4); p.text(l, this.M, this.y); this.y += size + 4; }
  }
  h(t: string) { this.y += 6; this.room(30); this.pdf.setFont("helvetica", "bold"); this.pdf.setFontSize(11); this.pdf.setTextColor(...TEAL); this.pdf.text(t, this.M, this.y); this.y += 16; }
  p(t: string) { this.wrap(t, 10); this.y += 2; }
  kv(rows: [string, string][]) {
    for (const [k, v] of rows) {
      const p = this.pdf; p.setFontSize(10);
      const lines = p.splitTextToSize(v, this.W - this.M * 2 - 150);
      this.room(lines.length * 14);
      p.setFont("helvetica", "normal"); p.setTextColor(...MUTED); p.text(k, this.M, this.y);
      p.setTextColor(20, 30, 28); p.text(lines, this.M + 150, this.y); this.y += lines.length * 14;
    }
    this.y += 4;
  }
  table(head: string[], rows: string[][], widths: number[], alignRight: number[] = []) {
    const p = this.pdf; const x0 = this.M;
    const draw = (cells: string[], bold: boolean) => {
      p.setFont("helvetica", bold ? "bold" : "normal"); p.setFontSize(9);
      const wrapped = cells.map((c, i) => p.splitTextToSize(c, widths[i] - 8));
      const h = Math.max(...wrapped.map(w => w.length)) * 12 + 6;
      this.room(h);
      let x = x0;
      wrapped.forEach((w, i) => { p.setTextColor(...(bold ? MUTED : [20, 30, 28] as [number, number, number])); if (alignRight.includes(i)) p.text(w, x + widths[i] - 4, this.y + 10, { align: "right" }); else p.text(w, x + 4, this.y + 10); x += widths[i]; });
      this.y += h; p.setDrawColor(230, 233, 232); p.line(x0, this.y - 2, x0 + widths.reduce((a, b) => a + b, 0), this.y - 2);
    };
    draw(head, true); rows.forEach(r => draw(r, false)); this.y += 8;
  }
  sign(label: string, who: string, signed: boolean) {
    this.y += 10; this.room(50); const p = this.pdf;
    p.setDrawColor(200, 205, 203); p.line(this.M, this.y + 24, this.M + 230, this.y + 24);
    p.setFont("helvetica", "italic"); p.setFontSize(12); p.setTextColor(...TEAL);
    if (signed) p.text("e-signed: " + who, this.M + 4, this.y + 18);
    p.setFont("helvetica", "normal"); p.setFontSize(9); p.setTextColor(...MUTED);
    p.text(`${label}${signed ? " · signed " + new Date().toLocaleDateString("en-US") : " · NOT YET SIGNED"}`, this.M, this.y + 36); this.y += 50;
  }
  blob() { return this.pdf.output("blob"); }
}

const hosp = (s: CaseState) => HOSPITALS.find(h => h.id === (s.match ?? "nh"))!;

export function ctd1Pdf(id: CaseId, s: CaseState) {
  const c = CASES[id], h = hosp(s);
  const d = new Doc("Care-transition document: US to India", "HeartBridge · International Patient Summary", `Prepared from pulled records for ${h.surgeon.name}, ${h.name}. Each statement is traceable to its source document in the FHIR bundle.`);
  d.kv([["Patient", `${c.patient.first} ${c.patient.last} · DOB ${fmtDate(c.patient.dob)} · ${c.patient.sex}`], ["Coverage", c.coverage.label], ["Referring physician", `${c.cardiologist.name}, ${c.cardiologist.org} · NPI ${c.cardiologist.npi}`], ["Receiving surgeon", `${h.surgeon.name}, ${h.surgeon.title}, ${h.name}`], ["Planned surgery", fmtDate(c.dates.surgery)]]);
  d.h("Reason for referral"); d.p(`${c.clinical.recommendation} (${c.clinical.grafts.join(", ")}). Patient prefers surgery in India. The US cardiologist remains physician of record; surgical opinion returns physician to physician.`);
  d.h("Problems"); d.table(["ICD-10-CM", "Description"], c.clinical.problems.map(p => [p.code, p.display]), [90, 414]);
  d.h("Investigations"); d.p(`Coronary angiography ${fmtDate(c.clinical.cath.date)}: ${c.clinical.cath.text} SYNTAX score ${c.clinical.cath.syntax}.`); d.p(`Echocardiography ${fmtDate(c.clinical.echo.date)}: ${c.clinical.echo.text}`);
  d.table(["Lab (LOINC)", "Value", "Date"], c.clinical.labs.map(l => [`${l.display} (${l.code})`, `${l.value} ${l.unit}`, fmtDate(l.date)]), [280, 120, 104]);
  d.h("Medications and allergies"); d.table(["Medication", "Dose", "RxNorm"], c.clinical.meds.map(m => [m.name, m.dose, m.rxnorm ?? ""]), [220, 184, 100]); d.p(c.clinical.allergies + ".");
  d.h("Risk and requests"); d.p(`STS predicted 30-day mortality ${c.clinical.sts}%. Please confirm the binding package before admission and release the English discharge pack, operative note and echo images (DICOM) on the day of discharge.`);
  d.sign("Referring physician", c.cardiologist.name, s.ctd1Signed);
  return d.blob();
}

export function planPdf(id: CaseId, s: CaseState) {
  const c = CASES[id], h = hosp(s);
  const d = new Doc("Pre-op plan and price range", "HeartBridge · Pre-op clarity", `${c.patient.first} ${c.patient.last} · elective CABG at ${h.name}`);
  d.h("When"); d.kv([["Fly out / arrive", fmtDate(c.dates.arrive)], ["Admission", fmtDate(c.dates.admit)], ["Surgery", fmtDate(c.dates.surgery)], ["Planned discharge", fmtDate(c.dates.discharge)], ["Fit to fly (10–14 days)", fmtDate(c.dates.fly)], ["US handover visit", fmtDate(c.dates.usVisit)]]);
  d.h("What"); d.p(`${c.clinical.recommendation}: ${c.clinical.grafts.join(", ")}. About 4 hours under general anaesthesia. Expected 2 ICU days and 5 ward days, then about a week nearby before flying. No change of procedure without family approval.`);
  d.h("Who"); d.kv([["Surgeon", `${h.surgeon.name}, ${h.name}`], ["US cardiologist", c.cardiologist.name], ["India point of contact", c.family.find(f => f.relation.includes("India"))?.name ?? "HeartBridge coordinator, Bengaluru"], ["Attendant", `${c.attendant.name} (${c.attendant.relation})`]]);
  d.h("Binding hospital package (paid directly to hospital)");
  d.table(["Line", "Low", "High", "Basis"], QUOTE.map(q => [q.label, q.low ? inrP(q.low) : "-", q.high ? inrP(q.high) : "Included", q.note]), [200, 80, 80, 144], [1, 2]);
  const extras: [string, number, number][] = [["Hospital package range", QUOTE_LOW / FX, QUOTE_HIGH / FX], ["HeartBridge coordination fee (flat)", c.feeUsd, c.feeUsd]];
  if (c.coverUsd) extras.push(["Complication cover (required, est.)", 500, 800]);
  if (c.visaUsd) extras.push(["e-Medical + attendant visa fees", c.visaUsd, c.visaUsd]);
  if (c.coverage.kind === "selfpay") extras.push(["US follow-up, echo, rehab (Good Faith Estimates)", 2900, 3600]);
  d.h("Episode estimate (USD at INR " + FX + ")");
  d.table(["Item", "Low", "High"], [...extras.map(e => [e[0], usdP(e[1]), usdP(e[2])]), ["Total", usdP(extras.reduce((a, e) => a + e[1], 0)), usdP(extras.reduce((a, e) => a + e[2], 0))]], [300, 100, 104], [1, 2]);
  d.p(c.coverage.kind === "medicare" ? "Medicare does not pay for the India procedure (SSA §1862(a)(4)). US pre-op and follow-up visits and cardiac rehab are billed to Medicare as usual." : "US cash CABG reference: about USD 55,700 bundled (Sidecar Health) to USD 75,000 facility fee only (JAHA 2024).");
  d.sign("Approved by US cardiologist", c.cardiologist.name, s.docApproved);
  d.sign("Approved by patient", `${c.patient.first} ${c.patient.last}`, s.patientApproved);
  return d.blob();
}

export function visaLetterPdf(id: CaseId, s: CaseState) {
  const c = CASES[id], h = hosp(s);
  const d = new Doc("Medical visa invitation letter", `${h.name} · International Patient Services`, "Demo rendering. Real letters are system-generated on the MHA Medical/Ayush Visa (FRRO) portal by a registered hospital.");
  d.kv([["Reference", "NH/IMV/2026/11842"], ["Date", new Date().toLocaleDateString("en-GB")], ["To", "Bureau of Immigration / Indian visa authorities"]]);
  d.p(`This is to confirm that ${c.patient.first} ${c.patient.last} (US passport ${c.patient.passport}, DOB ${fmtDate(c.patient.dob)}) has been accepted for elective coronary artery bypass grafting at ${h.name}, ${h.address}, under ${h.surgeon.name}, ${h.surgeon.title}.`);
  d.p(`Planned admission ${fmtDate(c.dates.admit)}; surgery ${fmtDate(c.dates.surgery)}; expected hospital stay 7 days, followed by recovery near the hospital until clearance to fly (about ${fmtDate(c.dates.fly)}).`);
  d.p(`${c.attendant.name} (${c.attendant.relation}${c.attendant.passport ? ", US passport " + c.attendant.passport : ""}) will accompany the patient as medical attendant.`);
  d.h("Supporting documents attached to the application");
  d.table(["Document", "Status"], [["Passport bio page (patient, attendant)", "Uploaded"], ["Photograph", "Uploaded"], ["Annexure A", "Completed"], ["US cardiologist referral (care-transition document)", s.ctd1Signed ? "Signed" : "Pending"], ["Proof of funds", "Uploaded"]], [380, 124]);
  d.sign("International Patient Services", h.name, s.visa.letter);
  return d.blob();
}

export function dischargePdf(id: CaseId, s: CaseState) {
  const c = CASES[id], h = hosp(s);
  const d = new Doc("Care-transition document: India to US", `${h.name} · Discharge summary`, `For ${c.cardiologist.name}, ${c.cardiologist.org}. Structured copy available as FHIR (ABDM DischargeSummaryRecord profile).`);
  d.kv([["Patient", `${c.patient.first} ${c.patient.last} · DOB ${fmtDate(c.patient.dob)}`], ["Admitted / discharged", `${fmtDate(c.dates.admit)} – ${fmtDate(c.dates.discharge)}`], ["Surgeon", `${h.surgeon.name} (${h.surgeon.reg})`]]);
  d.h("Procedure"); d.p(`${fmtDate(c.dates.surgery)}: CABG ×3 (${c.clinical.grafts.join(", ")}), on-pump. No intra-operative complications. Sternal stainless-steel wires in place; no implanted device.`);
  d.h("Hospital course"); EPISODE.forEach(e => d.p(`${e.label}: ${e.events.map(x => x.text).join("; ")}.`));
  if (s.updates.length) { d.h("Additional notes from care team"); s.updates.forEach(u => d.p(`${EPISODE[u.day]?.label ?? ""} ${u.time}: ${u.text}`)); }
  d.h("Discharge findings"); d.p("Echo post-op day 4: LVEF 50%, small pericardial effusion, no action needed. Wound clean. Screened negative for carbapenem-resistant organisms.");
  d.h("Discharge medications"); d.table(["India brand", "Dose", "US equivalent"], MEDS.map(m => [m.india, m.indiaDose, `${m.us} ${m.usDose}`]), [120, 170, 214]);
  d.h("For the US team"); d.p("Suggested aftercare codes: Z95.1 (presence of aortocoronary bypass graft), Z48.812 (aftercare following surgery on the circulatory system). Cardiac rehabilitation referral enclosed (qualifying event: CABG, 42 CFR 410.49). Avoid lifting over 5 kg for 6 weeks.");
  d.sign("Operating surgeon", h.surgeon.name, s.ctd2Signed);
  return d.blob();
}

export function billPdf(id: CaseId, s: CaseState) {
  const c = CASES[id], h = hosp(s);
  const total = billedTotal(s, QUOTE);
  const d = new Doc("Itemised bill vs binding quote", `${h.name} · audited by HeartBridge`, `${c.patient.first} ${c.patient.last} · ${fmtDate(c.dates.admit)} – ${fmtDate(c.dates.discharge)}`);
  d.table(["Quote line", "Quoted up to", "Billed", "Audit"], QUOTE.map(q => {
    const billed = q.id === "icu" && s.icu !== "approved" ? 0 : q.billed;
    const audit = q.kind === "included" ? "Billed separately but included in package: reversed" : q.kind === "trigger" ? (billed ? "Priced trigger, approved by family" : "Not used") : "Within quote";
    return [q.label, q.high ? inrP(q.high) : "Included", q.kind === "included" ? `${inrP(q.billed)} (reversed)` : billed ? inrP(billed) : "-", audit];
  }), [190, 90, 100, 124], [1, 2]);
  d.kv([["Total payable", `${inrP(total)} (${usdP(total / FX)})`], ["Quote range", `${inrP(QUOTE_LOW)} – ${inrP(QUOTE_HIGH)}`], ["Result", total <= QUOTE_HIGH ? "Within quote" : "Above quote: escalated"], ["Paid to", `${h.name} directly (HeartBridge never holds patient funds)`]]);
  return d.blob();
}

export function medMapPdf(id: CaseId, s: CaseState) {
  const c = CASES[id];
  const d = new Doc("Medication mapping: India to US", "HeartBridge · for US physician review", `${c.patient.first} ${c.patient.last} · reviewer ${c.cardiologist.name}`);
  d.table(["Prescribed in India", "US equivalent", "RxNorm", "Note", "Status"], MEDS.map((m, i) => [`${m.india} ${m.indiaDose}`, `${m.us} ${m.usDose}`, m.rxnorm, m.note, s.meds[i] ? "Approved" : "Pending"]), [120, 120, 54, 140, 70]);
  d.p("A 2–4 week supply travels with the patient under FDA personal importation guidance; US prescriptions replace it at the handover visit (Medicare Part D does not cover drugs bought abroad).");
  d.sign("Reviewed by", c.cardiologist.name, s.meds.every(Boolean));
  return d.blob();
}

export function cms1500Pdf(id: CaseId) {
  const c = CASES[id], lines = followUpLines();
  const d = new Doc("Health insurance claim (CMS-1500 data)", "HeartBridge · claim-ready packet", "Field values for the US handover visit. The matching X12 837P file is included in the packet. Demo: not submitted.");
  d.kv([["1. Insurance type", "Medicare"], ["1a. Insured ID (MBI)", c.coverage.memberId], ["2. Patient name", `${c.patient.last.toUpperCase()}, ${c.patient.first.toUpperCase()}`], ["3. Birth date / sex", `${fmtDate(c.patient.dob)} · ${c.patient.sex === "female" ? "F" : "M"}`], ["5. Patient address", `${c.patient.address}, ${c.patient.city} ${c.patient.state} ${c.patient.zip}`], ["11. Payer", `${c.coverage.mac?.name} · payer ID ${c.coverage.mac?.payerId}`], ["21. Diagnoses (ICD-10)", "A Z48.812 · B Z95.1 · C I25.10 · D E11.9"], ["24J/33a. NPI", c.cardiologist.npi], ["32. Service facility", `${c.cardiologist.org}, ${c.cardiologist.address}`]]);
  d.table(["24A. Date", "24B. POS", "24D. CPT", "Description", "24E", "24F. Charge"], lines.map(l => [fmtDate(c.dates.usVisit), "11", l.cpt, l.desc, "A", usdP(l.charge)]), [70, 46, 54, 214, 30, 90], [5]);
  d.kv([["28. Total charge", usdP(lines.reduce((a, l) => a + l.charge, 0))], ["Note", "Surgery performed abroad is not billed. Post-op visits are billed as ordinary E/M services, not a global surgical package."]]);
  return d.blob();
}

export function gfePdf(id: CaseId) {
  const c = CASES[id];
  const items: [string, string, number][] = [["99214", "Handover visit with cardiologist", 310], ["93306", "Transthoracic echocardiogram", 480], ["93798", "Cardiac rehabilitation, 36 sessions", 1980], ["93000", "ECG", 60], ["80053", "Comprehensive metabolic panel", 45]];
  const d = new Doc("Good Faith Estimate", `${c.cardiologist.org} · for self-pay patient`, "Issued under the No Surprises Act (45 CFR 149.610). You may dispute a bill that is $400 or more above this estimate within 120 days.");
  d.kv([["Patient", `${c.patient.first} ${c.patient.last} · DOB ${fmtDate(c.patient.dob)}`], ["Provider", `${c.cardiologist.name} · NPI ${c.cardiologist.npi}`], ["Scheduled", `Handover visit ${fmtDate(c.dates.usVisit)}`], ["Diagnoses", "Z48.812, Z95.1, I25.10"]]);
  d.table(["CPT", "Service", "Expected cost"], items.map(i => [i[0], i[1], usdP(i[2])]), [70, 320, 114], [2]);
  d.kv([["Total estimate", usdP(items.reduce((a, i) => a + i[2], 0))]]);
  return d.blob();
}

export function insurancePdf(id: CaseId) {
  const c = CASES[id];
  const d = new Doc("Coverage and cover summary", "HeartBridge · insurance documentation", `${c.patient.first} ${c.patient.last}`);
  if (c.coverage.kind === "medicare") {
    d.table(["Coverage", "What it pays for in this episode"], [["Original Medicare (A & B) · MBI " + c.coverage.memberId, "Not the India surgery (SSA §1862(a)(4)). Yes for US pre-op visits, handover, echo and cardiac rehab (42 CFR 410.49 lists CABG; no US-location rule)."], ["Medigap Plan G", "Foreign travel emergency: 80% of emergency care abroad. Not planned surgery."], ["Complication cover", "Declined by family (decision logged)."]], [200, 304]);
  } else {
    d.table(["Coverage", "What it pays for in this episode"], [["Medical travel complication cover (quote)", "Complications up to 180 days after surgery, evacuation and repatriation. Secondary payer. Est. USD 650; cardiac eligibility confirmed before binding."], ["Travel insurance", "Trip and baggage only; excludes the planned procedure."], ["US emergency readmission", "Self-pay cash cap pre-negotiated with a US hospital (demo)."]], [200, 304]);
  }
  return d.blob();
}
