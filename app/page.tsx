import Link from "next/link";

const personas = [
  ["Patient", "Onboards, consents to record pulls, approves the plan and price, applies for the visa, checks in, reviews the bill."],
  ["Family", "Follows hospital updates and approves priced extras, with only the access the patient grants."],
  ["US doctor", "Chooses the Indian surgeon, signs the US → India document, approves the plan, accepts the handover, approves medicines, books follow-up and generates the claim."],
  ["India care team", "Accepts the case with a binding package, issues the visa letter, posts daily updates and releases the discharge pack."]
];
const cases = [
  ["Lakshmi Raghavan, 68", "Indian-born senior in Edison, NJ · US citizen with OCI card · Original Medicare + Medigap", "Opens on surgery day with live hospital updates."],
  ["Mark Delaney, 56", "Uninsured US citizen in Austin, TX · needs e-Medical visas for himself and his wife", "Opens at onboarding, so you can walk the whole flow."]
];

export default function Landing() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-16 lg:py-24">
      <div className="text-sm font-medium text-accent-600">HeartBridge · connected prototype</div>
      <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-[1.1] sm:text-5xl">Cardiac surgery in India, with the US care around it handled.</h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">One case record shared by the patient, their family, the US cardiologist and the Indian care team. Each step waits for the right person; switch personas to move the case forward.</p>
      <Link href="/demo" className="mt-8 inline-flex h-12 items-center rounded-xl bg-brand-700 px-6 font-medium text-white hover:bg-brand-900">Open the prototype</Link>
      <div className="mt-16 grid gap-5 md:grid-cols-2">
        {cases.map(([t, d, n]) => <div key={t} className="rounded-2xl border border-line bg-white p-6 shadow-soft"><div className="text-lg font-semibold">{t}</div><div className="mt-1 text-muted">{d}</div><div className="mt-4 text-sm">{n}</div></div>)}
      </div>
      <h2 className="mt-16 text-xl font-semibold">Four personas, one flow</h2>
      <div className="mt-6 grid gap-x-10 gap-y-6 md:grid-cols-2">
        {personas.map(([t, d]) => <div key={t}><div className="font-medium">{t}</div><div className="mt-1 text-[15px] leading-relaxed text-muted">{d}</div></div>)}
      </div>
      <p className="mt-16 text-xs text-muted">Demo data: patients, doctors, IDs and medical records are fictional. Record pulls, visa processing and payer submission are simulated; generated FHIR bundles, PDFs and X12 837P files are real formats. Hospitals, accreditation, published prices, codes and rules are real as of Nov 2026.</p>
    </main>
  );
}
