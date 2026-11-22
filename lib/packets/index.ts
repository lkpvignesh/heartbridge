import { CASES, CaseId, PersonaId } from "../data";
import { CaseState } from "../flow";
import { ctdUsToIndia, dischargeIndiaToUs, recordsBundle } from "./fhir";
import { billPdf, cms1500Pdf, ctd1Pdf, dischargePdf, gfePdf, insurancePdf, medMapPdf, planPdf, visaLetterPdf } from "./pdf";
import { claim837P } from "./x12";

export type Kind = "FHIR R4" | "PDF" | "X12 837P";
export interface Packet { id: string; title: string; detail: string; kind: Kind; filename: string; ready: boolean; audience: PersonaId[]; payments?: boolean; build: () => Blob }

const json = (o: unknown) => new Blob([JSON.stringify(o, null, 2)], { type: "application/fhir+json" });
const ALL: PersonaId[] = ["patient", "family", "usdoc", "india"];

export function packets(id: CaseId, s: CaseState): Packet[] {
  const c = CASES[id];
  const slug = `${c.patient.last.toLowerCase()}-${c.patient.first.toLowerCase()}`;
  const list: Packet[] = [
    { id: "records", title: "Pulled US medical records", detail: "Patient, coverage, conditions, labs, cath and echo reports, medications, consent", kind: "FHIR R4", filename: `${slug}-us-records.fhir.json`, ready: s.recordsPulled, audience: ["patient", "usdoc"], build: () => json(recordsBundle(id, s)) },
    { id: "ctd1-json", title: "Care-transition document, US to India", detail: "International Patient Summary document bundle", kind: "FHIR R4", filename: `${slug}-ctd-us-to-india.fhir.json`, ready: !!s.match, audience: ["patient", "usdoc", "india"], build: () => json(ctdUsToIndia(id, s)) },
    { id: "ctd1-pdf", title: "Care-transition document, US to India", detail: s.ctd1Signed ? "Signed by US cardiologist" : "Draft, awaiting signature", kind: "PDF", filename: `${slug}-ctd-us-to-india.pdf`, ready: !!s.match, audience: ["patient", "family", "usdoc", "india"], build: () => ctd1Pdf(id, s) },
    { id: "plan", title: "Pre-op plan and price range", detail: "When, what, who; binding package and episode estimate", kind: "PDF", filename: `${slug}-preop-plan.pdf`, ready: s.indiaAccepted, audience: ALL, payments: true, build: () => planPdf(id, s) },
    { id: "visa", title: "Medical visa invitation letter", detail: "For patient and attendant", kind: "PDF", filename: `${slug}-visa-invitation.pdf`, ready: c.needsVisa && s.visa.letter, audience: ["patient", "family", "india"], build: () => visaLetterPdf(id, s) },
    { id: "ctd2-json", title: "Discharge summary, India to US", detail: "ABDM DischargeSummaryRecord-profiled document bundle", kind: "FHIR R4", filename: `${slug}-ctd-india-to-us.fhir.json`, ready: s.dischargePack, audience: ["patient", "usdoc", "india"], build: () => json(dischargeIndiaToUs(id, s)) },
    { id: "ctd2-pdf", title: "Care-transition document, India to US", detail: s.ctd2Signed ? "Signed by surgeon" : "Draft", kind: "PDF", filename: `${slug}-ctd-india-to-us.pdf`, ready: s.dischargePack, audience: ALL, build: () => dischargePdf(id, s) },
    { id: "bill", title: "Itemised bill vs quote", detail: "Audited line by line", kind: "PDF", filename: `${slug}-bill-vs-quote.pdf`, ready: s.dischargePack, audience: ["patient", "family", "india"], payments: true, build: () => billPdf(id, s) },
    { id: "meds", title: "Medication mapping", detail: "India brands to US equivalents with RxNorm", kind: "PDF", filename: `${slug}-medication-mapping.pdf`, ready: s.dischargePack, audience: ["patient", "family", "usdoc"], build: () => medMapPdf(id, s) },
    { id: "ins", title: "Coverage and cover summary", detail: "What each policy pays for", kind: "PDF", filename: `${slug}-coverage.pdf`, ready: s.dischargePack, audience: ["patient", "family", "usdoc"], payments: true, build: () => insurancePdf(id) }
  ];
  if (c.coverage.kind === "medicare") {
    list.push({ id: "837", title: "Follow-up claim (Medicare Part B)", detail: "ASC X12 005010X222A1 professional claim", kind: "X12 837P", filename: `${slug}-followup-837p.x12`, ready: s.claimIssued, audience: ["usdoc", "patient"], build: () => new Blob([claim837P(id)], { type: "text/plain" }) });
    list.push({ id: "1500", title: "CMS-1500 claim data", detail: "Human-readable claim for the handover visit", kind: "PDF", filename: `${slug}-cms1500.pdf`, ready: s.claimIssued, audience: ["usdoc", "patient"], build: () => cms1500Pdf(id) });
  } else {
    list.push({ id: "gfe", title: "Good Faith Estimate", detail: "Self-pay estimate for US follow-up under the No Surprises Act", kind: "PDF", filename: `${slug}-good-faith-estimate.pdf`, ready: s.claimIssued, audience: ["usdoc", "patient", "family"], payments: true, build: () => gfePdf(id) });
  }
  return list;
}

export function download(p: Packet) {
  const url = URL.createObjectURL(p.build());
  const a = document.createElement("a");
  a.href = url; a.download = p.filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function preview(p: Packet): Promise<string> {
  const b = p.build();
  return p.kind === "PDF" ? URL.createObjectURL(b) : await b.text();
}
