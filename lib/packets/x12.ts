import { CASES, CaseId } from "../data";

const pad = (s: string, n: number) => (s + " ".repeat(n)).slice(0, n);
const d8 = (iso: string) => iso.replace(/-/g, "");

export interface ClaimLine { cpt: string; desc: string; charge: number; dx: string }
export const followUpLines = (): ClaimLine[] => [
  { cpt: "99214", desc: "Office visit, established patient, moderate complexity", charge: 210, dx: "1" },
  { cpt: "93000", desc: "Electrocardiogram, 12-lead, with interpretation", charge: 45, dx: "1" },
  { cpt: "93306", desc: "Transthoracic echocardiogram, complete, with Doppler", charge: 620, dx: "1" }
];

// ASC X12 005010X222A1 professional claim (837P) for the Medicare-billed US handover visit.
export function claim837P(id: CaseId): string {
  const c = CASES[id];
  const now = new Date();
  const yymmdd = now.toISOString().slice(2, 10).replace(/-/g, "");
  const ccyymmdd = now.toISOString().slice(0, 10).replace(/-/g, "");
  const hhmm = now.toISOString().slice(11, 16).replace(":", "");
  const ctrl = "000000417";
  const lines = followUpLines();
  const total = lines.reduce((a, l) => a + l.charge, 0);
  const prov = c.cardiologist;
  const mac = c.coverage.mac ?? { name: "MEDICARE", payerId: "00000" };
  const [pfirst, plast] = [c.patient.first.toUpperCase(), c.patient.last.toUpperCase()];
  const body: string[] = [
    `ST*837*0001*005010X222A1`,
    `BHT*0019*00*HB${ctrl}*${ccyymmdd}*${hhmm}*CH`,
    `NM1*41*2*HEARTBRIDGE DEMO*****46*HBDEMO01`,
    `PER*IC*CLAIMS DESK*TE*7325550100`,
    `NM1*40*2*${mac.name.split(" (")[0].toUpperCase().slice(0, 35)}*****46*${mac.payerId}`,
    `HL*1**20*1`,
    `PRV*BI*PXC*207RC0000X`,
    `NM1*85*2*${prov.org.toUpperCase()}*****XX*${prov.npi}`,
    `N3*200 SOMERSET ST`,
    `N4*NEW BRUNSWICK*NJ*089011234`,
    `REF*EI*221234567`,
    `HL*2*1*22*0`,
    `SBR*P*18*******MB`,
    `NM1*IL*1*${plast}*${pfirst}****MI*${c.coverage.memberId}`,
    `N3*${c.patient.address.toUpperCase()}`,
    `N4*${c.patient.city.toUpperCase()}*${c.patient.state}*${c.patient.zip}`,
    `DMG*D8*${d8(c.patient.dob)}*${c.patient.sex === "female" ? "F" : "M"}`,
    `NM1*PR*2*MEDICARE PART B*****PI*${mac.payerId}`,
    `CLM*HB${id.toUpperCase()}FU1*${total}***11:B:1*Y*A*Y*Y`,
    `HI*ABK:Z4812*ABF:Z951*ABF:I2510*ABF:E119`,
    `NM1*82*1*${prov.name.split(",")[0].split(" ").slice(-1)[0].toUpperCase()}*${prov.name.split(" ")[0].toUpperCase()}****XX*${prov.npi}`,
    `PRV*PE*PXC*207RC0000X`,
    ...lines.flatMap((l, i) => [`LX*${i + 1}`, `SV1*HC:${l.cpt}*${l.charge}*UN*1***${l.dx}`, `DTP*472*D8*${d8(c.dates.usVisit)}`])
  ];
  const st = [...body, `SE*${body.length + 1}*0001`];
  const isa = `ISA*00*${pad("", 10)}*00*${pad("", 10)}*ZZ*${pad("HBDEMO01", 15)}*ZZ*${pad(mac.payerId, 15)}*${yymmdd}*${hhmm}*^*00501*${ctrl}*0*T*:`;
  const gs = `GS*HC*HBDEMO01*${mac.payerId}*${ccyymmdd}*${hhmm}*417*X*005010X222A1`;
  return [isa, gs, ...st, `GE*1*417`, `IEA*1*${ctrl}`].join("~\n") + "~\n";
}
