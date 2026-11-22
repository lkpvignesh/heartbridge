# HeartBridge prototype

A connected, clickable prototype of an India–US cardiac care concierge. One case record is shared by four personas: the **patient**, the **patient's family**, the **US cardiologist** and the **India care team** (surgeon plus international desk). Each step of the episode waits for the right person, and a banner tells you who acts next and switches you to them.

Demo data: patients, doctors, NPIs and medical records are fictional. Record pulls, visa processing and payer submission are simulated. Generated files are real formats: FHIR R4 JSON bundles, PDFs, and an ASC X12 005010X222A1 (837P) claim. Hospitals, accreditation, published prices, codes and rules are real as of November 2026.

## Run locally

Requires Node.js 18.17 or newer.

```bash
npm install
npm run dev
# open http://localhost:3000
```

Production build: `npm run build && npm start`.

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel, choose **Add New → Project**, import the repository and keep the defaults (framework: Next.js).
3. Deploy. No environment variables or database are needed.

Or from the command line: `npx vercel` (preview) and `npx vercel --prod`.

## How the demo works

- **Two demo cases** (top bar):
  - **Mark Delaney**: uninsured US citizen in Austin. Starts at onboarding and needs e-Medical visas for himself and his wife, so you can walk the whole flow.
  - **Lakshmi Raghavan**: Indian-born senior in Edison, NJ, on Medicare with an OCI card, so no visa step. Starts on surgery day.
- **Persona switcher**: Patient, Family, US doctor, India team. In Lakshmi's case, Family has two members with different permissions. Arjun can see payments; Priya can't.
- **Next-step banner**: shows the current gating step. Press **Switch to …** to jump to the persona and screen that must act.
- **Reset**: restarts the current case from the beginning, plan approved, surgery day or discharged.
- State is saved in the browser and syncs across tabs. You can open the patient in one tab and the doctor in another.

### The flow (gating owner in brackets)

1. **Onboarding**: profile, coverage, US care team with NPIs, family and India contact (patient), then consents (patient), then a simulated record pull from national networks and Medicare Blue Button (patient).
2. **Pre-op clarity**, in this order:
   - Choose an Indian surgeon (US doctor).
   - Sign the platform-generated US → India care-transition document (US doctor).
   - Accept the case and issue a binding package (India team).
   - Approve the plan (US doctor).
   - Approve the plan and price range (patient).
3. **Medical visa**, for US citizens without OCI only: the invitation letter on the FRRO portal (India team), then the e-Medical and attendant applications, which can be tracked here or handled outside (patient). The approval is simulated.
4. **Care delivery**:
   - Check in on arrival (patient).
   - Daily hospital events, surgery-day timeline and vitals (India team).
   - Extra ICU day under a priced trigger (family member with payment access).
   - Discharge pack, itemised bill and the India → US document (India team).
5. **Post-surgical care**:
   - Review the bill against the quote, shown only after discharge and only to the patient and payment-permitted family (patient).
   - Accept the handover document (US doctor).
   - Approve the medication mapping (US doctor).
   - Book the handover visit and rehab (US doctor).
   - Generate the claim (Medicare 837P and CMS-1500) or a Good Faith Estimate for self-pay (US doctor).
   - Close the episode (patient).

### Generated data packets (Documents screen)

| Packet | Format |
|---|---|
| Pulled US records: Patient, Coverage, Conditions (ICD-10-CM), labs (LOINC), cath and echo reports, medications (RxNorm), Consent | FHIR R4 collection bundle |
| Care-transition document, US → India (International Patient Summary composition) | FHIR R4 document bundle and PDF |
| Discharge summary, India → US (ABDM DischargeSummaryRecord profile) | FHIR R4 document bundle and PDF |
| Pre-op plan and price range, visa invitation letter, itemised bill vs quote, medication mapping, coverage summary | PDF |
| Follow-up claim for the Medicare-billed US visit | X12 837P and CMS-1500 PDF |
| Good Faith Estimate for self-pay follow-up | PDF |

## Code map

- `lib/data.ts`: demo cases, hospitals, quote lines, episode days, medication mapping
- `lib/flow.ts`: case state, gating steps and owners, presets
- `lib/store.ts`: Zustand store with persistence and cross-tab sync
- `lib/packets/`: FHIR builders, PDF builders (jsPDF), X12 837P generator
- `components/Shell.tsx`: top bar, persona switcher, next-step banner, sidebar
- `components/screens.tsx`: all persona screens
- `components/shared.tsx`: shared views (journey, documents, bill, medications, care-transition documents)
