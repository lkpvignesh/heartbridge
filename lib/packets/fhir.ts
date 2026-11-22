import { CASES, CaseId, EPISODE, HOSPITALS, MEDS, addDays } from "../data";
import { CaseState } from "../flow";

const uuid = (seed: string) => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, "0");
  const a = hex(h), b = hex(Math.imul(h, 31) ^ 0x9e3779b9), c = hex(Math.imul(h, 17) ^ 0x7f4a7c15), d = hex(Math.imul(h, 13) ^ 0x85ebca6b);
  return `${a}-${b.slice(0, 4)}-4${b.slice(5, 8)}-a${c.slice(1, 4)}-${c.slice(4)}${d}`.slice(0, 36);
};
const ref = (id: string) => ({ reference: `urn:uuid:${id}` });
const ICD = "http://hl7.org/fhir/sid/icd-10-cm";
const LOINC = "http://loinc.org";
const SNOMED = "http://snomed.info/sct";
const RXNORM = "http://www.nlm.nih.gov/research/umls/rxnorm";
const NPI = "http://hl7.org/fhir/sid/us-npi";

function core(id: CaseId) {
  const c = CASES[id];
  const pid = uuid(id + "patient"), cardId = uuid(id + "card"), pcpId = uuid(id + "pcp");
  const patient = {
    resourceType: "Patient", id: pid,
    meta: { profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"] },
    identifier: c.coverage.kind === "medicare" ? [{ system: "http://hl7.org/fhir/sid/us-mbi", value: c.coverage.memberId }] : [{ system: "urn:heartbridge:mrn", value: "HB-" + id.toUpperCase() + "-0001" }],
    name: [{ family: c.patient.last, given: [c.patient.first] }],
    gender: c.patient.sex, birthDate: c.patient.dob,
    telecom: [{ system: "phone", value: c.patient.phone }, { system: "email", value: c.patient.email }],
    address: [{ line: [c.patient.address], city: c.patient.city, state: c.patient.state, postalCode: c.patient.zip, country: "US" }]
  };
  const pract = (pr: typeof c.cardiologist, rid: string) => ({
    resourceType: "Practitioner", id: rid,
    identifier: [{ system: NPI, value: pr.npi }],
    name: [{ text: pr.name }],
    telecom: [{ system: "phone", value: pr.phone }],
    address: [{ text: pr.address }],
    qualification: [{ code: { text: pr.specialty } }]
  });
  return { c, pid, cardId, pcpId, patient, card: pract(c.cardiologist, cardId), pcp: pract(c.pcp, pcpId) };
}

function clinicalResources(id: CaseId, pid: string) {
  const c = CASES[id];
  const conditions = c.clinical.problems.map(p => ({
    resourceType: "Condition", id: uuid(id + p.code),
    clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }] },
    category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-category", code: "problem-list-item" }] }],
    code: { coding: [{ system: ICD, code: p.code, display: p.display }], text: p.display }, subject: ref(pid)
  }));
  const labs = c.clinical.labs.map(l => ({
    resourceType: "Observation", id: uuid(id + l.code), status: "final",
    category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "laboratory" }] }],
    code: { coding: [{ system: LOINC, code: l.code, display: l.display }] }, subject: ref(pid), effectiveDateTime: l.date,
    valueQuantity: { value: l.value, unit: l.unit, system: "http://unitsofmeasure.org" }
  }));
  const lvef = { resourceType: "Observation", id: uuid(id + "lvef"), status: "final", code: { coding: [{ system: LOINC, code: "10230-1", display: "Left ventricular ejection fraction" }] }, subject: ref(pid), effectiveDateTime: c.clinical.echo.date, valueQuantity: { value: c.clinical.echo.lvef, unit: "%" } };
  const cath = { resourceType: "DiagnosticReport", id: uuid(id + "cath"), status: "final", code: { coding: [{ system: LOINC, code: "18745-0", display: "Cardiac catheterization study" }] }, subject: ref(pid), effectiveDateTime: c.clinical.cath.date, conclusion: c.clinical.cath.text + ` SYNTAX score ${c.clinical.cath.syntax}.`, presentedForm: [{ contentType: "application/dicom", url: "https://pacs.example.com/studies/" + uuid(id + "dicom"), title: "Coronary angiogram cine (DICOM)" }] };
  const echo = { resourceType: "DiagnosticReport", id: uuid(id + "echo"), status: "final", code: { coding: [{ system: LOINC, code: "34552-0", display: "Cardiac 2D echo panel" }] }, subject: ref(pid), effectiveDateTime: c.clinical.echo.date, conclusion: c.clinical.echo.text, result: [ref(lvef.id)] };
  const meds = c.clinical.meds.map(m => ({ resourceType: "MedicationStatement", id: uuid(id + m.name), status: "active", medicationCodeableConcept: { coding: m.rxnorm ? [{ system: RXNORM, code: m.rxnorm, display: m.name }] : [], text: `${m.name} ${m.dose}` }, subject: ref(pid), dosage: [{ text: m.dose }] }));
  const allergy = { resourceType: "AllergyIntolerance", id: uuid(id + "nka"), clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical", code: "active" }] }, code: { coding: [{ system: SNOMED, code: "716186003", display: "No known allergy" }] }, patient: ref(pid) };
  return { conditions, labs, lvef, cath, echo, meds, allergy };
}

const entries = (rs: any[]) => rs.map(r => ({ fullUrl: `urn:uuid:${r.id}`, resource: r }));

export function recordsBundle(id: CaseId, s: CaseState) {
  const { c, pid, patient, card, pcp } = core(id);
  const k = clinicalResources(id, pid);
  const coverage = c.coverage.kind === "medicare"
    ? { resourceType: "Coverage", id: uuid(id + "cov"), status: "active", type: { text: "Medicare Part A and B" }, subscriberId: c.coverage.memberId, beneficiary: ref(pid), payor: [{ display: "Centers for Medicare & Medicaid Services" }] }
    : { resourceType: "Coverage", id: uuid(id + "cov"), status: "active", type: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/coverage-selfpay", code: "pay" }], text: "Self-pay" }, beneficiary: ref(pid), payor: [ref(pid)] };
  const consent = { resourceType: "Consent", id: uuid(id + "consent"), status: s.consents.hipaa ? "active" : "proposed", scope: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/consentscope", code: "patient-privacy" }] }, category: [{ coding: [{ system: LOINC, code: "64292-6", display: "Release of information consent" }] }], patient: ref(pid), dateTime: c.dates.onboard + "T10:00:00Z", policyRule: { text: "HIPAA authorization (45 CFR 164.508) to release records to HeartBridge and the matched Indian hospital; India DPDP consent per recipient" } };
  return {
    resourceType: "Bundle", id: uuid(id + "records"), type: "collection", timestamp: new Date().toISOString(),
    meta: { tag: [{ system: "urn:heartbridge", code: "demo-data", display: "Fictional demo record" }] },
    entry: entries([patient, coverage, card, pcp, consent, ...k.conditions, ...k.labs, k.lvef, k.cath, k.echo, ...k.meds, k.allergy])
  };
}

export function ctdUsToIndia(id: CaseId, s: CaseState) {
  const { c, pid, cardId, patient, card } = core(id);
  const k = clinicalResources(id, pid);
  const h = HOSPITALS.find(x => x.id === (s.match ?? "nh"))!;
  const org = { resourceType: "Organization", id: uuid(h.id), name: h.name, address: [{ text: h.address, country: "IN" }] };
  const surgeon = { resourceType: "Practitioner", id: uuid(h.id + "surgeon"), name: [{ text: h.surgeon.name }], identifier: [{ system: "urn:in:smc-registration", value: h.surgeon.reg }] };
  const sr = { resourceType: "ServiceRequest", id: uuid(id + "sr"), status: "active", intent: "order", code: { coding: [{ system: SNOMED, code: "232717009", display: "Coronary artery bypass grafting" }], text: c.clinical.recommendation + ` (${c.clinical.grafts.join(", ")})` }, subject: ref(pid), requester: ref(cardId), performer: [ref(surgeon.id)], occurrenceDateTime: c.dates.surgery, reasonCode: [{ coding: [{ system: ICD, code: "I25.10" }] }] };
  const comp = {
    resourceType: "Composition", id: uuid(id + "ctd1"), status: s.ctd1Signed ? "final" : "preliminary",
    type: { coding: [{ system: LOINC, code: "60591-5", display: "Patient summary Document" }] },
    subject: ref(pid), date: new Date().toISOString(), author: [ref(cardId)], title: "Care-transition document: US to India (International Patient Summary)",
    attester: s.ctd1Signed ? [{ mode: "legal", time: new Date().toISOString(), party: ref(cardId) }] : [],
    custodian: { display: "HeartBridge (demo)" },
    section: [
      { title: "Reason for referral", code: { coding: [{ system: LOINC, code: "42349-1", display: "Reason for referral" }] }, text: { status: "generated", div: `<div xmlns="http://www.w3.org/1999/xhtml">${c.clinical.recommendation}. US cardiologist remains physician of record.</div>` }, entry: [ref(sr.id)] },
      { title: "Problems", code: { coding: [{ system: LOINC, code: "11450-4" }] }, entry: k.conditions.map(x => ref(x.id)) },
      { title: "Medications", code: { coding: [{ system: LOINC, code: "10160-0" }] }, entry: k.meds.map(x => ref(x.id)) },
      { title: "Allergies", code: { coding: [{ system: LOINC, code: "48765-2" }] }, entry: [ref(k.allergy.id)] },
      { title: "Results", code: { coding: [{ system: LOINC, code: "30954-2" }] }, entry: [ref(k.cath.id), ref(k.echo.id), ...k.labs.map(x => ref(x.id))] },
      { title: "Plan of care and requests", code: { coding: [{ system: LOINC, code: "18776-5" }] }, text: { status: "generated", div: `<div xmlns="http://www.w3.org/1999/xhtml">STS predicted 30-day mortality ${c.clinical.sts}%. Please confirm the binding package before admission and send the English discharge pack, operative note and echo images on the day of discharge.</div>` } }
    ]
  };
  return { resourceType: "Bundle", id: uuid(id + "ctd1b"), type: "document", timestamp: new Date().toISOString(), identifier: { system: "urn:heartbridge:ctd", value: "CTD-US-IN-" + id.toUpperCase() }, entry: entries([comp, patient, card, org, surgeon, sr, ...k.conditions, ...k.meds, k.allergy, k.cath, k.echo, k.lvef, ...k.labs]) };
}

export function dischargeIndiaToUs(id: CaseId, s: CaseState) {
  const { c, pid, cardId, patient, card } = core(id);
  const h = HOSPITALS.find(x => x.id === (s.match ?? "nh"))!;
  const surgeon = { resourceType: "Practitioner", id: uuid(h.id + "surgeon"), name: [{ text: h.surgeon.name }], identifier: [{ system: "urn:in:smc-registration", value: h.surgeon.reg }] };
  const org = { resourceType: "Organization", id: uuid(h.id), name: h.name, address: [{ text: h.address, country: "IN" }] };
  const enc = { resourceType: "Encounter", id: uuid(id + "enc"), status: "finished", class: { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "IMP" }, subject: ref(pid), period: { start: c.dates.admit, end: c.dates.discharge }, serviceProvider: ref(org.id), hospitalization: { dischargeDisposition: { text: "Discharged to recovery stay near hospital" } } };
  const proc = { resourceType: "Procedure", id: uuid(id + "proc"), status: "completed", code: { coding: [{ system: SNOMED, code: "232717009", display: "Coronary artery bypass grafting" }], text: `CABG ×3 (${c.clinical.grafts.join(", ")}), on-pump` }, subject: ref(pid), encounter: ref(enc.id), performedDateTime: c.dates.surgery, performer: [{ actor: ref(surgeon.id) }], outcome: { text: "No intra-operative complications" }, note: [{ text: "Sternal stainless-steel wires in place. No implanted device." }] };
  const lvef = { resourceType: "Observation", id: uuid(id + "lvef-dc"), status: "final", code: { coding: [{ system: LOINC, code: "10230-1", display: "Left ventricular ejection fraction" }] }, subject: ref(pid), effectiveDateTime: addDays(c.dates.surgery, 4), valueQuantity: { value: 50, unit: "%" }, note: [{ text: "Small pericardial effusion, no action needed" }] };
  const meds = MEDS.map((m, i) => ({ resourceType: "MedicationRequest", id: uuid(id + "mr" + i), status: "active", intent: "order", subject: ref(pid), requester: ref(surgeon.id), medicationCodeableConcept: { coding: [{ system: RXNORM, code: m.rxnorm, display: `${m.us} (US equivalent)` }], text: `${m.india} ${m.indiaDose} (India brand)` }, dosageInstruction: [{ text: m.indiaDose }], note: [{ text: `US mapping: ${m.us} ${m.usDose}. ${m.note}. ${s.meds[i] ? "Approved by US cardiologist." : "Pending US cardiologist review."}` }] }));
  const updates = EPISODE.map(d => `${d.label}: ${d.events.map(e => e.text).join("; ")}`).join(" | ");
  const comp = {
    resourceType: "Composition", id: uuid(id + "ctd2"), status: s.ctd2Signed ? "final" : "preliminary",
    meta: { profile: ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/DischargeSummaryRecord"] },
    type: { coding: [{ system: LOINC, code: "18842-5", display: "Discharge summary" }] },
    subject: ref(pid), encounter: ref(enc.id), date: new Date().toISOString(), author: [ref(surgeon.id)], title: "Care-transition document: India to US (discharge summary)",
    attester: s.ctd2Signed ? [{ mode: "legal", time: new Date().toISOString(), party: ref(surgeon.id) }] : [],
    custodian: ref(org.id),
    section: [
      { title: "Procedure", code: { coding: [{ system: LOINC, code: "47519-4", display: "History of procedures" }] }, entry: [ref(proc.id)] },
      { title: "Hospital course", code: { coding: [{ system: LOINC, code: "8648-8", display: "Hospital course" }] }, text: { status: "generated", div: `<div xmlns="http://www.w3.org/1999/xhtml">${updates}</div>` } },
      { title: "Discharge findings", code: { coding: [{ system: LOINC, code: "30954-2" }] }, entry: [ref(lvef.id)] },
      { title: "Discharge medications", code: { coding: [{ system: LOINC, code: "10183-2", display: "Hospital discharge medications" }] }, entry: meds.map(m => ref(m.id)) },
      { title: "Instructions for US team", code: { coding: [{ system: LOINC, code: "8653-8", display: "Hospital discharge instructions" }] }, text: { status: "generated", div: `<div xmlns="http://www.w3.org/1999/xhtml">Suggested aftercare codes: Z95.1, Z48.812. Cardiac rehab referral (42 CFR 410.49 qualifying event: CABG). Screened negative for carbapenem-resistant organisms at discharge. Recipient: ${c.cardiologist.name}.</div>` } }
    ]
  };
  return { resourceType: "Bundle", id: uuid(id + "ctd2b"), type: "document", timestamp: new Date().toISOString(), identifier: { system: "urn:heartbridge:ctd", value: "CTD-IN-US-" + id.toUpperCase() }, entry: entries([comp, patient, card, surgeon, org, enc, proc, lvef, ...meds]) };
}
