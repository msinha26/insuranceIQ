# PolicySaathi — Product Requirements Document

Oct 10, 2026 · @MS

**Status:** Draft · **Version:** 1.0 · **Author:** Product Team

**Scope:** Health insurance only (retail and employer group policies), India. Sold directly to patients and families.

**Agent scope:** Answers from the uploaded insurance documents, and guides on claim process and grievance escalation.

## 1. Problem

### What problem is this solving?

Indian families find out what their health policy actually pays at the hospital desk, when it is too late to choose differently. The policy is a 40–60 page English document full of room rent caps, sub-limits, co-pays and waiting periods. The person handling the admission is usually a son, daughter or spouse who has never read it. The result is surprise deductions, rejected claims, and no idea how to contest them.

PolicySaathi lets a family upload their policy, ask questions in plain English or Hindi, and get answers that cite the exact page and clause. It also walks them through the claim process and, when a claim is cut or rejected, the escalation route from the insurer's grievance officer to Bima Bharosa to the Insurance Ombudsman.

### Why is this problem worth solving?

**Quantified pain:**

- Insurers processed 3.26 crore health claims in FY2024-25. 87% were settled, 8% were repudiated and about 5% were pending at year end ([IRDAI Annual Report 2024-25, via Insurance Business](https://www.insurancebusinessmag.com/asia/news/life-insurance/irdai-cannot-explain-why-health-insurance-claims-go-unpaid-583814.aspx)). 8% is roughly 26 lakh repudiated claims a year.
- "Settled" does not mean "paid in full". In a LocalCircles survey of 18,989 claimants (2023–2025), only 32% reported full approval without complications; 29% said the claim was partially approved and 15% rejected for reasons they considered invalid ([The South First](https://thesouthfirst.com/health/gst-on-health-insurance/)). This is self-reported perception, not audited data.
- Health insurance was about 61% of all Insurance Ombudsman complaints in FY25, against about 11% of total insurance premiums ([Business Standard](https://bsppd.business-standard.com/finance/insurance/datanomics-insurance-plaints-double-in-six-years-driven-by-health-126060900002_1.html)).
- General and health insurance grievances on Bima Bharosa rose about 41% to 1,37,361 in FY2024-25 ([The South First](https://thesouthfirst.com/health/gst-on-health-insurance/)).
- About 58 crore lives are covered by health insurance and about 58% of claims are cashless ([Ditto, citing IRDAI AR 2024-25](https://www.joinditto.in/articles/general/irdai-annual-report/)). The remaining claims involve reimbursement paperwork handled by the family.
- IRDAI holds no data on why claims are denied (same Insurance Business article). Families have no benchmark for whether a rejection is normal.

**Prioritised customer problems** (frequency and severity scored 1–5; scores are expert judgment, to be validated with 8–10 user interviews):

| # | Problem | Freq | Sev | Score | Product fit |
| --- | --- | --- | --- | --- | --- |
| 1 | Don't know what is covered before or at admission (room rent caps, sub-limits, co-pay, waiting periods, exclusions) | 5 | 4 | 20 | Strong |
| 2 | Claim paid only in part, with unexplained deductions (consumables, proportionate deduction, "reasonable and customary") | 5 | 4 | 20 | Strong |
| 3 | Claim rejected for pre-existing disease, non-disclosure or waiting period | 3 | 5 | 15 | Strong |
| 4 | Cashless denied or hospital out of network; family must arrange cash | 3 | 5 | 15 | Partial |
| 5 | Cashless approval and discharge delays | 4 | 3 | 12 | Weak |
| 6 | Reimbursement paperwork confusion and repeated document queries | 4 | 3 | 12 | Partial |
| 7 | Can't decode a rejection letter or find the escalation route | 3 | 4 | 12 | Strong |
| 8 | Policy doesn't match what the agent promised | 3 | 4 | 12 | Weak |
| 9 | Eligible expenses go unclaimed (pre/post hospitalisation, daycare, ambulance) | 4 | 2 | 8 | Strong |

MVP targets problems 1, 3, 7 and 9, plus process guidance for 4 and 6. Problem 2 (decoding a settlement letter against the bill) is v1.1 because it needs a second document type. Problems 5 and 8 are insurer and sales-process failures; the product explains them but cannot fix them.

**Market gap:**

- Insurer and TPA apps and helplines answer for one insurer, are not neutral, and rarely cite the clause.
- Aggregators and advisors (Policybazaar, Ditto) focus on purchase. Claim help is tied to policies bought through them.
- Claim-assistance firms (Insurance Samadhan and similar) step in after rejection, are human-led, and typically charge a share of the recovered amount (assumed).
- Generic AI chat can read a PDF but has no health-policy term schema, no verified India claims and grievance knowledge, no Hindi-first design, and no separation between "what your policy says" and "general rules".

* **Coverfox COVER AI (launched 2 June 2026) is the closest direct competitor.** Coverfox is an IRDAI-licensed broker. Its Policy X-Ray lets a user upload a policy and get simplified explanations of coverage, exclusions, waiting periods, co-payments, room rent limits and restoration benefits. Its Health Policy Health Check assesses whether the policy is adequate and generates recommendations, and the platform stores policies across insurers in one place. Coverfox markets it as "no commission, no upsell" ([Coverfox](https://www.coverfox.com/news/introducing-cover-ai/), [CXO Digital Pulse](https://www.cxodigitalpulse.com/?p=55167), [Complete AI Training](https://completeaitraining.com/news/coverfox-launches-cover-ai-platform-to-help-consumers/)). Not confirmed from launch coverage: price, whether answers cite the page, Hindi support, and whether it helps with claims or grievance escalation. A hands-on teardown is needed before beta.

**Competitor table** (evidence level shows how far each row can be trusted; none has been tested hands-on):

| Player | Type | What it offers | Price to user | Evidence level |
| --- | --- | --- | --- | --- |
| [Coverfox COVER AI](https://www.coverfox.com/news/introducing-cover-ai/) | Licensed broker, AI assistant | Upload a policy for plain explanations of exclusions, waiting periods, co-pay, room rent limits; policy adequacy check with recommendations; multi-policy storage | Not confirmed; marketed as no commission, no upsell | Medium: company page and launch press |
| [fairClaims by Policygaido](https://hunted.space/product/fairclaims-by-policygaido) | Independent AI tool | Analyses a rejected or short-paid claim, identifies what is recoverable, generates grievance letters | Free | Low: Product Hunt listing only |
| [EzPolicy](https://hunted.space/product/ezpolicy) | Independent AI tool | Upload any policy for coverage, exclusions, waiting periods, hidden risks and a verdict; English, Hindi, Hinglish | Free | Low: Product Hunt listing only |
| [AskInsurance.ai](https://nas.com/askinsurance.ai/forms/boost-your-insurance-claim-approvals-) | Independent AI tool plus experts | Upload documents for term explanations; claim document checklists; expert help on claims | Not stated | Low: own community page only |
| [TermScope](https://peerlist.io/dsshah181/project/termscope--forensic-insurance-audit) | Independent AI tool (v0.1) | Upload a policy PDF; clauses extracted and scored red, yellow or green by a rule engine; health and term life | Not stated | Low: builder's project post |
| [Ditto](https://joinditto.in/claims-assistance) | Advisor and distributor (Zerodha-backed) | Human claim managers file and follow up claims and help take unresolved cases to the Ombudsman | Free, for policies bought through Ditto | Medium: company page |
| [ClaimBuddy](https://www.outlookbusiness.com/companies/claimbuddy-secures-5-million-in-series-a-funding) | Hospital-side claim assistance | Manages claims for patients through 250+ partner hospitals; 35,000+ patients served; raised $5M Series A in April 2024 | Paid by hospitals (assumed); not a direct-to-family product | Medium: press coverage, 2024 |
| Insurer and TPA chatbots | Insurer-owned | Claim intimation, status and FAQs for that insurer's own customers | Free | Low: [broker blog](https://jioinsure.in/health-insurance/blog/how-ai-chatbots-are-speeding-up-health-claim-processing) |
| Insurance Samadhan and similar | Human-led claim recovery | Takes up rejected claims on the customer's behalf | Share of recovered amount (assumed) | Low: not researched |
| Bima Sugam | Regulator-backed marketplace | Planned: buy, renew, claim and an integrated grievance dashboard | Free (planned) | Medium: not live for consumer transactions as of mid-2026 ([RTI Wiki](https://righttoinformation.wiki/bima-sugam-insurance-marketplace-irdai-2024)) |
| General AI assistants | Horizontal | Can read an uploaded PDF and answer in Hindi; no policy schema, no verified India process knowledge | Free tiers available | Not researched |

Reading across the table: policy explanation is offered free by a broker and by small tools, and rejection analysis with letter drafting is offered free by at least one small tool. No row combines verified, dated process guidance with page-checked citations and no distribution revenue, but that is a claim about what competitors advertise, not about what they do.

Uploading a policy and getting a plain-language explanation is no longer an open gap: COVER AI offers it, and several small free tools claim to as well (not yet verified). What PolicySaathi adds is narrower and unproven: page citations checked before display, a verified and dated claims and grievance Playbook, no policy recommendations, and no broker or insurer revenue. Whether competitors already match these, and whether families value them enough to pay, must be tested before beta.

**MOAT:**

The moat is thin today. Two of the four original sources are already matched or claimed by competitors, so they are stated here as table stakes, not defences.

1. **Table stakes, not a moat: health-policy term schema.** COVER AI and small tools already extract the same terms. PolicySaathi must match them; it cannot win on this.
2. **Table stakes, not a moat: neutrality.** PolicySaathi takes no commission and recommends no policy, but COVER AI markets itself as "no commission, no upsell" and the independent tools are also unaffiliated. Neutrality is a claim users cannot verify, so it differentiates only against a broker, and only if users care.
3. **Possible moat: verified Claims & Grievance Playbook.** SME-reviewed, sourced and dated entries, re-verified quarterly. Competitors advertise AI "trained on IRDAI regulations"; none advertises dated, human-verified guidance. This is defensible only if it is measurably more accurate, which the eval set must show.
4. **Possible moat: verifiable answers.** Page citations checked before display, and a published accuracy page. Trust built on being checkable is harder to copy than a feature list, but it is slow to build.
5. **Long-term moat, not available at launch: outcome data.** Opt-in, anonymised data on which clauses cause deductions, by insurer and product. This needs scale that a new entrant does not have.

If the beta shows users do not notice or value items 3 and 4, the product has no moat and should not proceed as a standalone B2C business.

### Why now?

The demand signals are strong, but the competitive window is already closing and a free regulator-backed platform is coming.

**Demand-side signals:**

- Health insurance's share of Insurance Ombudsman complaints rose from 38.64% in FY20 to 61.49% in FY25 ([Business Standard](https://bsppd.business-standard.com/finance/insurance/datanomics-insurance-plaints-double-in-six-years-driven-by-health-126060900002_1.html)).
- General and health insurance grievances on Bima Bharosa rose about 41% in FY2024-25 ([The South First](https://thesouthfirst.com/health/gst-on-health-insurance/)).
- Over 7 in 10 policyholders in the LocalCircles survey reported cumulative premium increases of 50% to 200% over three years (same source). People paying more are more likely to check what they are paying for.

**Technology enablers:**

- Current LLMs can hold a full policy in context, read photographed documents and answer in Hindi. Evidence: several teams, including solo builders, shipped policy-reading tools in 2026 (see competitor table). The same fact means the technology is not a barrier to entry.

**Competitive timing:**

- Coverfox launched COVER AI on 2 June 2026. Small free tools for policy explanation and for rejected-claim letters appeared in the same year. PolicySaathi would be a late entrant on explanation, not a first mover.

**Signals against:**

- Repudiated claims fell from about 11% in FY24 to about 8% in FY25, and settlement rose from 83% to 87% ([IndiaMedToday](https://indiamedtoday.com/record-health-insurance-claims-settled-in-fy25-average-payout-per-claim-declines/)). If this continues, the rejection problem shrinks.
- **Bima Sugam is a direct threat to the grievance guide.** The IRDAI-backed marketplace has launched its website; consumer transactions were not live as of mid-2026 ([RTI Wiki](https://righttoinformation.wiki/bima-sugam-insurance-marketplace-irdai-2024)). It is planned to include claim tracking and an integrated grievance dashboard ([Reliance General](https://www.reliancegeneral.co.in/Insurance/Knowledge-Center/Insurance-Reads/bima-sugam-portal-by-irdai.aspx)). If it delivers, a free official channel covers escalation filing. PolicySaathi would still explain what to argue, but not where to file.

**Net:** the need is real and growing; the timing advantage is weak. The case for building now rests on execution quality (accuracy, verifiability), not on being early.

### Why Agentic AI?

| Dimension | Detail |
| --- | --- |
| **What unstructured data is involved?** | Policy schedules, policy wordings, endorsements and group policy certificates, each insurer in its own layout. Many arrive as phone photos or scanned PDFs |
| **Why rule-based systems fail** | The same concept appears as "room rent limit", "accommodation charges up to 1% of SI" or a category name such as "single private AC room". Sub-limits sit in annexure tables. Templates break with every product revision |
| **Why LLMs are necessary** | Answering "will my father's knee replacement be covered?" needs the schedule (sum insured, members, start date), the wording (waiting periods, sub-limits, exclusions) and reasoning across them |
| **Why not just a generic chatbot?** | No structured snapshot, no enforced page citation, no refusal to predict claim approval, no verified India process knowledge, and no handling of health data under Indian privacy law |

## 2. User

### Who are you solving this problem for?

**Primary persona: the family claim-handler**

- **Who:** Adult child or spouse, 28–45, salaried, metro or tier 1 city, managing a parent's or partner's hospitalisation
- **Cover:** Employer group policy, sometimes with a retail family floater or a separate policy for parents
- **Behaviour:** Opens the policy for the first time at the hospital insurance desk. Juggles the desk, the TPA helpline and work. Comfortable with apps and UPI; reads English, often prefers to ask in Hinglish
- **Pain:** Has to decide on room type, hospital and whether to proceed, under time pressure, without knowing what the policy will pay. Learns about the room rent cap or co-pay from the final bill
- **Job to be done:** "Tell me in two minutes what this policy pays for this hospitalisation, and what I should do right now."

**Secondary persona: the senior or chronic patient**

- **Who:** 55+, with diabetes, hypertension, a cardiac condition or similar
- **Cover:** Retail policy bought through an agent years ago; premiums rising with age
- **Behaviour:** Relies on the agent or their children. Prefers Hindi or a regional language. Holds a paper policy or a WhatsApp-forwarded PDF
- **Pain:** Pre-existing disease clauses, waiting periods, co-pay and disease-wise sub-limits hit this group hardest. Most likely to face a rejection and least likely to escalate
- **Job to be done:** "Is my condition covered yet, and if they refuse, what can I do?"

**Tertiary persona: the self-employed breadwinner in a tier 2/3 city**

- **Who:** Shop owner, small trader or gig worker with no employer cover
- **Cover:** ₹3–5 lakh policy sold by an agent or bank
- **Behaviour:** Often uses a non-network hospital, so claims go through reimbursement. Mobile-only, low patience for long text
- **Pain:** Underinsured and short on cash. A partial settlement or a delayed reimbursement means borrowing
- **Job to be done:** "What papers do I need so the claim is not sent back?"

**Out of scope as users at MVP:** beneficiaries of government schemes (Ayushman Bharat PM-JAY, state schemes, CGHS, ESIC). These have no policy document of the kind this product reads, and a different grievance route.

## 3. Core Metrics, Prioritisation & Roadmap

### How will you know the problem is solved? (Core Metrics)

**North Star Metric:** Time from document upload to first grounded coverage answer

- **Baseline:** 30–60 minutes (reading the policy or waiting on a TPA helpline; assumed, to be measured in interviews)
- **Target:** ≤ 3 minutes
- **Tracked via:** Session logs (upload timestamp to first assistant answer carrying a valid page citation)

**Primary Metrics:**

| Metric | Baseline | Target | How tracked |
| --- | --- | --- | --- |
| Policy Snapshot extraction accuracy (F1) | None | ≥ 90% F1 on labelled policy set | Offline eval against SME-labelled policies |
| Chat groundedness | None | ≥ 95% of document answers grounded; ≤ 3% hallucinated | Monthly SME review of sampled Q&A |
| Citation correctness | None | ≥ 92% of cited pages contain the supporting clause | Offline eval and SME sample |
| Playbook answer accuracy | None | ≥ 97% correct against the verified Playbook | Offline eval on 60 process and grievance questions |
| Time to Policy Snapshot | None | ≤ 45 seconds P95 for ≤ 60 pages | Server-side timing logs |

**Secondary Metrics:**

| Metric | Baseline | Target | How tracked |
| --- | --- | --- | --- |
| Answer helpfulness | None | ≥ 75% thumbs-up on rated answers | Per-answer rating |
| Questions per uploaded policy | None | ≥ 5 | Query on chat\_messages |
| Return on next hospitalisation or renewal (180-day) | None | ≥ 25% | Session analytics |
| Free to paid conversion | None | ≥ 7% of signups (break-even level, see Pricing) | Payments table |
| Share of Hindi/Hinglish sessions | None | Track only | Language detection on user turns |
| AI cost per upload and per chat turn | None | ≤ ₹5 per upload; ≤ ₹0.50 per turn | Model billing logs |
| Snapshot correction rate | None | ≤ 10% of terms flagged wrong by users | Corrections / total terms |

Use is episodic (a hospitalisation or a renewal), so monthly retention is the wrong measure. The 180-day return metric replaces it.

### Prioritisation

#### Breaking the Agentic Workflow into Components

1. **Component A: Authentication & Session** (phone OTP)
2. **Component B: Document Upload & Text Extraction** (PDF text layer, plus OCR for scans and photos)
3. **Component C: Document Classification** (schedule, wording, group certificate, other)
4. **Component D: Policy Snapshot Extraction** (structured key terms with page and confidence)
5. **Component E: Policy Chat** (Q&A grounded in the uploaded documents)
6. **Component F: Claims & Grievance Guide** (answers from the verified Playbook, with drafted escalation letters)
7. **Component G: Query Router & Safety Layer** (document vs process vs out-of-scope; medical-emergency and claim-prediction refusals)
8. **Component H: Results Display** (document viewer, snapshot panel, chat)
9. **Component I: History, Feedback & Payments**

#### Risk Assessment per Component

| Component | Check | Result | Explanation |
| --- | --- | --- | --- |
| B: Text Extraction | Is ML necessary? | PASS | A large share of Indian policy copies are scans or phone photos (assumed; to be measured in alpha). OCR is required at MVP |
| B: Text Extraction | Can it meet accuracy requirements? | PARTIAL | Tables of sub-limits and low-quality photos are the weak spot. Pages below an OCR quality threshold are flagged, not silently used |
| C: Classification | Is ML necessary? | PASS | Users cannot tell a schedule from a wording. The system must detect a missing wording and say so |
| D: Snapshot Extraction | Is ML necessary? | PASS | Layout and phrasing vary by insurer and product version |
| D: Snapshot Extraction | Do we have data? | PARTIAL | No labelled set at launch. Policy wordings are public on insurer sites; schedules need opt-in or synthetic samples. SME labels 60 policies before beta |
| D: Snapshot Extraction | Can it meet accuracy requirements? | PARTIAL | Target ≥ 90% F1. Risk concentrates in sub-limit tables and conditional clauses ("co-pay applies above age 60") |
| D: Snapshot Extraction | How transparent? | PASS | Source sentence, page and confidence shown per term |
| E: Policy Chat | Can it meet accuracy requirements? | PARTIAL | Multi-clause questions (waiting period plus sub-limit plus exclusion) are where errors occur |
| E: Policy Chat | What are the laws? | PARTIAL | Health and financial data fall under the DPDP Act 2023; consent, purpose limitation and deletion are required. Legal review needed before beta |
| E: Policy Chat | What about bias? | PARTIAL | Likely weaker on public-sector insurer formats, group policies and Hindi queries. Eval set is segmented on these |
| F: Claims & Grievance Guide | Is ML necessary? | PARTIAL | The content is curated by humans; the LLM only retrieves and phrases it. It must not answer from model memory |
| F: Claims & Grievance Guide | Can it meet accuracy requirements? | PARTIAL | Rules change (IRDAI circulars). Each Playbook entry carries a source link and a last-verified date |
| G: Router & Safety | How easy to judge good vs bad? | PASS | Fixed test set of emergency, claim-prediction and off-topic prompts with expected behaviour |

#### Overall Risk Summary

| Component | Risk Level | Mitigation |
| --- | --- | --- |
| A: Authentication | Low | Managed OTP provider; rate limits on OTP sends |
| B: Text Extraction | Medium | OCR with per-page quality score; ask the user to re-photograph bad pages |
| C: Classification | Medium | Clear prompt when the wording is missing; answers limited to what the schedule supports |
| D: Snapshot Extraction | Medium | Few-shot prompting, offline eval, confidence flags, user correction |
| E: Policy Chat | Medium-High | Document-only prompt, mandatory citation, citation verifier, "not found" fallback |
| F: Claims & Grievance Guide | High | Answers only from the verified Playbook; quarterly SME re-verification; visible "general guidance" label and last-verified date |
| G: Router & Safety | Medium | Regression suite on every deploy |
| H: Results Display | Low | Mature PDF and image viewers; text fallback |
| I: History, Feedback & Payments | Low | Standard queries; UPI through a payment gateway |

#### Prioritised Stories (MVP Scope)

| Story ID | Title | Priority | Points | Status |
| --- | --- | --- | --- | --- |
| US-001 | Phone OTP sign-in | P0 | 3 | To Do |
| US-002 | Upload policy (PDF or photos) with OCR | P0 | 8 | To Do |
| US-003 | Document classification and missing-wording prompt | P0 | 3 | To Do |
| US-004 | Policy Snapshot with page and confidence | P0 | 8 | To Do |
| US-005 | Chat with policy, with page citation | P0 | 8 | To Do |
| US-006 | Claim process guidance (cashless and reimbursement) | P0 | 5 | To Do |
| US-007 | Grievance escalation guidance | P0 | 5 | To Do |
| US-008 | Safety behaviours (no claim prediction, emergency redirect) | P0 | 3 | To Do |
| US-009 | Hindi and Hinglish questions and answers | P1 | 5 | To Do |
| US-010 | Inline document viewer with jump-to-page | P1 | 5 | To Do |
| US-011 | Persistent chat and policy history | P1 | 3 | To Do |
| US-012 | Draft grievance letter | P1 | 5 | To Do |
| US-013 | Document checklist for reimbursement | P1 | 3 | To Do |
| US-014 | Per-answer feedback | P1 | 2 | To Do |
| US-015 | Delete my data | P0 | 3 | To Do |
| US-016 | Payment for pass or plan (UPI) | P1 | 5 | To Do |
| US-017 | Decode settlement or rejection letter | P2 | 8 | Backlog |
| US-018 | Share snapshot with family on WhatsApp | P2 | 3 | Backlog |

### Roadmap

| Release | Features Included | Duration |
| --- | --- | --- |
| **v0.1: Foundation** | Database and storage setup; landing page; phone OTP auth; consent screen; empty home | Weeks 1–2 |
| **v0.2: Upload & Snapshot** | PDF and photo upload; OCR; classification; Policy Snapshot with page, confidence and low-confidence flags | Weeks 3–6 |
| **v0.3: Policy Chat** | Grounded chat with citations; citation verifier; safety layer; document viewer with jump-to-page | Weeks 7–9 |
| **v0.4: Claims & Grievance Guide** | Playbook v1 (SME-verified); query router; claim process and escalation answers; reimbursement checklist; draft grievance letter | Weeks 10–12 |
| **v1.0: Launch** | Hindi and Hinglish; history; feedback; payments; data deletion; security and privacy audit; performance tuning | Weeks 13–16 |
| **v1.1: Post-Launch** | Decode settlement and rejection letters against the policy; WhatsApp share; two more languages (Tamil, Marathi; choice to be validated) | Weeks 17–22 |
| **v1.2: Growth** | WhatsApp chat channel; multiple-policy view (employer plus retail plus top-up); renewal and porting explainer; voice input | Weeks 23–30 |

**Dependencies:**

- Insurance SME (ex-claims or ex-TPA) contracted before v0.2 for labelling, and before v0.4 for the Playbook
- Legal review of DPDP compliance, terms of service and the "not advice" positioning before beta
- LLM and OCR vendor contracts with no-training terms and a clear data location before any real user document is processed
- Regulatory opinion on whether guidance of this kind needs any IRDAI registration (open question; see Assumptions)

**External Dependencies:**

| Dependency | Risk | Mitigation |
| --- | --- | --- |
| LLM API availability | Outage blocks snapshot and chat | Retry with backoff (3 attempts); second provider configured as fallback; clear error with retry |
| LLM pricing | Cost rises above the per-turn target | Monthly cost review; route simple turns to a smaller model |
| OCR quality on phone photos | Wrong numbers extracted from sub-limit tables | Per-page quality score; re-photograph prompt; numeric terms from low-quality pages always flagged |
| IRDAI rule changes | Playbook goes stale | Named owner; quarterly re-verification; circular watchlist; last-verified date shown to users |
| SMS OTP delivery | Sign-in fails | Secondary SMS provider; WhatsApp OTP fallback |

**Internal Risks:**

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| User uploads only the schedule, not the wording | High | High | Detect and say which questions cannot be answered; ask for the wording; v1.1 to look up public wordings by product name or UIN |
| User treats an answer as a claim guarantee and makes a costly decision | Medium | High | Agent never predicts approval or a payable amount; every coverage answer ends with what to confirm with the insurer or TPA |
| Wrong grievance guidance (deadline or forum) | Low | High | Playbook-only answers; SME sign-off; regression test set |
| Health data breach | Low | Critical | Row-level security, encryption, short-lived signed URLs, pre-launch penetration test |
| Low willingness to pay | High | High | Test pricing in beta before building payments beyond a basic pass |

## 4. MVP Features

### User Flows

#### Flow 1: New Visitor to Home

```
Landing Page → "Check my policy" → Phone number → OTP → Consent screen → Home
```

1. Landing page states the promise in one line ("Know what your health policy pays, before the bill"), in English and Hindi
2. User signs in with phone number and OTP; no password
3. Consent screen explains in plain language what is stored, for how long, and that documents are not used to train models. User must accept to continue
4. Home shows an empty state with one action: "Upload your policy"

#### Flow 2: Returning User

```
OTP sign-in → Home (my policies) → open a policy → Snapshot + Chat
```

1. Home lists uploaded policies with insurer, policy name, members covered and expiry date
2. Opening a policy restores its snapshot and previous chat

#### Flow 3: Core Flow, Upload to Answer

```
Upload (PDF or photos) → Text extraction / OCR → Classification 
→ Policy Snapshot → Suggested questions → Chat
```

1. **Upload:** User picks a PDF or takes photos of pages (up to 60 pages or 20 MB per policy; up to 3 documents per policy, for example schedule, wording, endorsement)
2. **Classification:** The system labels each document. If only a schedule is present it says: "This is your policy schedule. For waiting periods, sub-limits and exclusions I also need the policy wording booklet." The user can continue without it
3. **Policy Snapshot:** A card view of the terms that decide claim outcomes, each with value, page and confidence (colour-coded: green ≥ 80%, amber 50–79%, red < 50%):
   - **Basics:** insurer, product name, policy type (individual, floater, group), policy period, members covered, sum insured, TPA name and helpline
   - **What reduces a claim:** room rent limit, ICU limit, co-pay, deductible, disease-wise sub-limits, consumables cover
   - **When cover starts:** initial waiting period, specific-disease waiting period, pre-existing disease waiting period, maternity waiting period
   - **What else is covered:** pre and post hospitalisation days, daycare procedures, AYUSH, ambulance limit, restoration benefit, no-claim bonus
   - **What is not covered:** key permanent exclusions
   - **Deadlines:** claim intimation window, reimbursement submission window
4. **Suggested questions:** Chips such as "Is cataract surgery covered?", "Which room can I take without a deduction?", "How do I file a reimbursement claim?"
5. **Explainability:** Each snapshot term expands to show the verbatim source sentence and a one-line plain-language meaning
6. **Correction:** User can flag a term as wrong and enter the right value; the original is kept for the feedback loop

#### Flow 4: Ask About My Policy

```
Type or tap a question → Router: document question → Grounded answer + [Page X] citation
```

1. User asks, in English, Hindi or Hinglish, for example "Papa ka knee replacement cover hoga kya?"
2. The agent answers in the user's language from the uploaded documents only, cites the page, and states the conditions that apply (waiting period, sub-limit, co-pay)
3. Tapping the citation opens the document at that page
4. Every coverage answer ends with a "Confirm with your insurer or TPA" line naming what to confirm
5. If the answer is not in the documents the agent says so and, where relevant, names the missing document

#### Flow 5: Claim Process and Grievance Guidance

```
Process or grievance question → Router: Playbook question → Playbook answer, labelled "General guidance" 
→ personalised with policy facts (TPA, deadlines) → optional draft letter
```

1. User asks "How do I get cashless approval?" or "My claim was rejected for pre-existing disease, what can I do?"
2. The agent answers from the verified Playbook, labelled "General guidance, last verified on \<date>", and fills in policy-specific facts with citations (TPA helpline, intimation deadline)
3. For grievances it lays out the ladder: insurer's Grievance Redressal Officer, then IRDAI Bima Bharosa, then the Insurance Ombudsman, with what to file, where, and the time limits from the Playbook
4. On request it drafts a grievance letter using the policy number, member name and the clause the user is contesting. The user edits and sends it; the agent never files anything

### Functional Requirements

**User Stories:**

| ID | User Story | Acceptance Criteria | Priority |
| --- | --- | --- | --- |
| US-001 | As a family member, I want to sign in with my phone number so that I don't need a password at the hospital | OTP delivered within 30 seconds; sign-in completes within 60 seconds; wrong OTP gives a clear error | P0 |
| US-002 | As a user, I want to upload my policy as a PDF or photos so that I can use whatever copy I have | Accepts PDF, JPG, PNG up to 20 MB and 60 pages; scanned pages are OCR'd; unreadable pages are named and can be re-uploaded | P0 |
| US-003 | As a user, I want to be told if I uploaded the wrong or incomplete document so that I know what answers to trust | Each document labelled as schedule, wording, group certificate or other; missing wording produces a visible prompt | P0 |
| US-004 | As a user, I want a one-screen summary of my policy so that I know the limits before admission | Snapshot shown within 45 seconds P95; each term has value, page and confidence; terms not found are shown as "Not found in your documents" | P0 |
| US-005 | As a user, I want to ask questions about my policy so that I don't have to read it | Answer within 12 seconds P95; every document answer carries a page citation; absent information returns "not found" | P0 |
| US-006 | As a user, I want step-by-step claim guidance so that I know what to do at the hospital | Cashless and reimbursement steps come from the Playbook, are labelled as general guidance, and include my TPA and deadlines when present in the policy | P0 |
| US-007 | As a user whose claim was cut or rejected, I want to know how to escalate so that I don't give up | Answer lists the three escalation levels with links, required documents and time limits from the Playbook | P0 |
| US-008 | As a user, I want the assistant to be honest about its limits so that I don't rely on it wrongly | It refuses to predict approval or an amount; redirects medical emergencies to 112 and the hospital; declines medical advice | P0 |
| US-009 | As a Hindi speaker, I want to ask and read in Hindi so that I understand the answer | Hindi and Hinglish input detected; answer in the same language; quoted clause stays in the original English with a Hindi explanation | P1 |
| US-010 | As a user, I want to see the cited page so that I can show it at the insurance desk | Tapping a citation opens the viewer at that page with the passage highlighted where a text layer exists | P1 |
| US-011 | As a user, I want my policy and chat saved so that I can return at discharge or renewal | Reopening a policy loads its snapshot and chat history | P1 |
| US-012 | As a user, I want a draft grievance letter so that I can escalate without a lawyer | Draft includes policy number, claim reference if given, the contested clause with page, and the relief sought; exportable as text or PDF | P1 |
| US-013 | As a user filing reimbursement, I want a document checklist so that my claim is not sent back | Checklist from the Playbook, merged with any policy-specific document list, with tick boxes | P1 |
| US-014 | As a user, I want to rate an answer so that the product improves | Thumbs up or down with optional comment on every answer | P1 |
| US-015 | As a user, I want to delete my documents and chats so that my health data is not kept | Deletion removes files, extracted text, snapshot and chats within 24 hours; confirmation shown | P0 |
| US-016 | As a user, I want to pay by UPI so that I can keep asking during a hospital stay | Payment completes in-app; entitlement active within 10 seconds | P1 |

**Functional Requirements Table:**

| ID | Requirement | Priority | Notes |
| --- | --- | --- | --- |
| FR-01 | Sign-in by phone OTP; session persists for 30 days on the device | P0 | No email or password at MVP |
| FR-02 | Explicit consent captured and stored before the first upload | P0 | Versioned consent text; timestamp per user |
| FR-03 | Accept PDF and image uploads within limits; reject others with a clear message | P0 | Up to 3 documents grouped under one policy |
| FR-04 | Extract text once at upload with `[DOC n][PAGE n]` markers; OCR pages without a text layer; store text in the database, then call the n8n ingestion workflow to chunk, embed and store the policy in the vector DB | P0 | Chat reads chunks retrieved by the n8n RAG workflow, never the file |
| FR-05 | Compute a per-page OCR quality score; flag numeric terms taken from low-quality pages | P0 | Protects against misread limits |
| FR-06 | Classify each document and detect a missing wording | P0 | Classes: schedule, wording, group certificate, endorsement, other |
| FR-07 | Produce the Policy Snapshot with term, value, page, confidence and source sentence | P0 | "Not found" is a valid value |
| FR-08 | Route each user turn to: document, Playbook, both, or out-of-scope | P0 | Router output logged for eval |
| FR-09 | Document answers must cite `[Page X]` and pass the citation verifier before display | P0 | Failed verification triggers one regeneration, then a "could not verify" notice |
| FR-10 | Process and grievance answers must come only from Playbook entries and show the "General guidance" label and last-verified date | P0 | No Playbook entry means the agent says it does not have verified guidance |
| FR-11 | Agent must not predict claim approval, state a payable amount as certain, give medical advice, or recommend buying or porting a specific policy | P0 | Enforced in prompt and tested in regression suite |
| FR-12 | Answers in English, Hindi or Hinglish matching the user's turn | P1 | Clause quotes stay in source language |
| FR-13 | Document viewer with jump-to-page; text fallback if the file is unavailable | P1 | 1-hour signed URLs |
| FR-14 | Generate an editable grievance letter draft from policy facts and user-provided claim details | P1 | Clearly marked as a draft for the user to send |
| FR-15 | Save all messages with role, route, citations and timestamp | P1 | Linked to session, policy and user |
| FR-16 | User-initiated deletion of a policy or the whole account | P0 | Hard delete of files and text |
| FR-17 | All tables protected by row-level security on user id | P0 | Verified by cross-account tests in CI |
| FR-18 | Disclaimer on every screen with AI output | P0 | Text in section 9 |

### Agent Capabilities & System Behaviour

| Component | Input | Output | Autonomy Level | Human-in-Loop Trigger |
| --- | --- | --- | --- | --- |
| Text Extractor / OCR | Uploaded PDF or images | Text with document and page markers; per-page quality score | Fully autonomous | Page quality below threshold: ask the user to re-photograph |
| Document Classifier | Extracted text | Document class; missing-wording flag | Fully autonomous | Class "other": ask the user to confirm it is a health policy |
| Snapshot Extractor | Policy text | JSON list of terms with value, page, confidence, source sentence | Autonomous + review | Confidence < 50%: warning and "verify in document" |
| Query Router | User turn + recent history | Route label | Fully autonomous | None |
| Policy Chat Agent | Question + policy chunks retrieved by the n8n RAG workflow + snapshot + history | Answer with page citation | Suggests, human decides | Always: user confirms with insurer or TPA before acting |
| Claims & Grievance Guide | Question + retrieved Playbook entries + policy facts | Step-by-step guidance; optional letter draft | Suggests, human decides | Always: user sends any letter or complaint themselves |
| Safety Layer | User turn + draft answer | Pass, rewrite or refuse | Fully autonomous | Emergency or distress language: show emergency numbers and stop the normal flow |

## 5. Constraints

**Performance constraints:**

- Policy Snapshot displayed ≤ 45 seconds P95 after upload for policies up to 60 pages (OCR included).
- Chat response ≤ 12 seconds P95; first token streamed within 3 seconds.
- OTP delivered within 30 seconds.
- Must work on a mid-range Android phone on a 4G hospital connection; initial page weight ≤ 500 KB (assumed target).

**Upload & document constraints:**

- PDF, JPG and PNG only; **20 MB** and **60 pages** per policy; up to 3 documents per policy.
- Documents in **English** only at MVP (Indian policy documents are issued in English; vernacular copies are out of scope).
- Conversation in **English, Hindi and Hinglish** at MVP.
- **Health indemnity policies** only: individual, family floater, group, and top-up. Fixed-benefit plans (critical illness, hospital cash), personal accident, life and motor are out of scope.
- Government schemes (PM-JAY, CGHS, ESIC, state schemes) are out of scope.

**Cost constraints:**

- AI cost ≤ ₹5 per uploaded policy (OCR plus snapshot) and ≤ ₹0.50 per chat turn.
- Free-tier cost per signup ≤ ₹10.

**Scalability constraints:**

- 200 concurrent uploads and 1,000 concurrent chat sessions without degradation at launch.

**Reliability & security constraints:**

- 99.5% uptime. Model or OCR errors are caught and shown with a retry option; no silent failures.
- Encryption at rest (AES-256) and in transit (TLS 1.2 or higher). Row-level security on every table. Signed URLs expire in 1 hour.
- Data stored in an India region. LLM and OCR vendors contractually barred from training on user content.

**Regulatory & compliance constraints:**

- DPDP Act 2023: explicit consent, stated purpose, deletion on request, breach notification, and a named grievance contact. Policies carry health and financial data, so the product is designed to the strictest reading. Legal sign-off is required before beta.
- Users must be 18 or over; no accounts for minors.
- The product is an information and document-explanation tool. It does not sell, solicit or recommend insurance, and does not act as the user's representative before an insurer or the Ombudsman.
- Data retention: documents and chats kept for 12 months after last access, then deleted. Users can delete at any time.

**Usability constraints:**

- Usable by someone who has never read an insurance policy. Every insurance term in an answer is explained in one plain line.
- Text at a reading level suitable for a Class 8 reader; Hindi in Devanagari, with Hinglish accepted as input.
- WCAG 2.1 AA; large tap targets for one-handed use.

## 6. Technical Requirements

### Architecture Overview

**Policy ingestion and policy chat run in two n8n workflows, not in the app.** The app is the interface and the caller. Uploading a policy calls Workflow 1, which chunks, embeds and stores the insurance policy in a vector DB. Asking a policy question in chat calls Workflow 2, which retrieves the relevant chunks and answers (RAG).

|  | Workflow 1: Policy Ingestion | Workflow 2: Policy RAG |
| --- | --- | --- |
| When it runs | The user uploads a policy document | The user asks a question about the policy in chat |
| Called by | Upload API route, by server-side webhook | Chat API route, by server-side webhook |
| Input | User id, policy id, document id, short-lived signed URL to the file | User id, policy id, the question, recent chat turns |
| Steps | Extract text (OCR for scans and photos), split into chunks, embed each chunk, store chunks and embeddings in the vector DB | Embed the question, retrieve the best-matching chunks for that policy, send question and chunks to the LLM |
| Output | Status (processing, ready, failed), chunk count, unreadable pages | Answer with page citations, the chunks used, a not-found flag |

Rules for both workflows:

- Every chunk is stored with user id, policy id, document id, page number and chunk index. The page number is what makes page citations possible.
- Retrieval is always filtered by user id and policy id, so one family never receives another's policy text.
- The browser never calls n8n. The API route authenticates the user, then calls the webhook with a server-side secret.
- Ingestion is idempotent: re-running it for a document replaces its chunks.
- Deleting a policy or an account also deletes its chunks and embeddings.
- If n8n is unavailable, upload and chat show a clear error with retry; the uploaded file is preserved.

Open decisions for the engineering plan: n8n Cloud or self-hosted and its region, the vector DB (Supabase pgvector or a separate store), the embedding model, chunk size and overlap, whether OCR runs inside Workflow 1, how the Policy Snapshot is produced, and whether Playbook questions also go through n8n.

A mobile-first web app (installable PWA) with a thin serverless backend and one managed backend platform for auth, database and file storage.

**Component layers:**

- **Frontend (React PWA):** OTP sign-in, consent, upload and camera capture, Policy Snapshot, chat, document viewer, history, payments.
- **Backend API (serverless functions):** Authenticates the user, stores the upload and calls the two n8n workflows by server-side webhook. It does not chunk, embed or answer policy questions itself. Model and OCR keys never reach the client.
- **OCR service:** Converts scanned pages and photos to text with layout and table structure, and returns a per-page quality score.
- **LLM API:** Classification, snapshot extraction, routing, chat and letter drafting.
- **Playbook store:** A small, versioned set of SME-verified entries (target about 80 at launch) with source link and last-verified date, stored in Postgres with embeddings for retrieval.
- **Platform (Supabase, India region):** Phone auth, Postgres with row-level security, file storage, realtime for chat streaming.
- **Payments:** UPI through a payment gateway (for example Razorpay).

**Core tables:** `users`, `consents`, `policies`, `documents` (with `document_text`, `doc_class`, `ocr_quality`), `snapshot_terms`, `chat_sessions`, `chat_messages` (with `route` and `citations`), `playbook_entries`, `answer_feedback`, `payments`.

### Model Requirements

| Criteria | Requirement | Rationale |
| --- | --- | --- |
| Model | A current-generation LLM with strong long-document reasoning and Hindi capability; chosen by bake-off before v0.2 | Model line-ups and prices change quickly; the choice should rest on the eval set, not on a name fixed in this PRD |
| Context window | ≥ 128k tokens | A 60-page policy is roughly 40,000–60,000 tokens (assumed); room needed for prompt, snapshot and history |
| Structured output | Schema-constrained JSON for classification, snapshot and routing | Removes unparseable responses |
| Output limits | 3,000 tokens for snapshot; 800 for chat; 1,200 for letter drafts | Chat answers must be short enough to read on a phone |
| Temperature | 0 to 0.1 for snapshot and routing; 0.3 for chat | Deterministic extraction; natural phrasing in chat |
| Prompt caching | Not needed for policy text under RAG; useful for the system prompt | Only the retrieved chunks are sent on each turn, so policy text is not repeated |
| Latency | ≤ 10 seconds P95 per chat call | Supports the 12-second chat target |
| Data terms | No training on inputs; retention ≤ 30 days or zero-retention option | Health data |

### Model Selection & Cost Trade-offs

| Item | What we use | Why | Trade-off |
| --- | --- | --- | --- |
| LLM for snapshot | Larger model tier | Accuracy on sub-limit tables and conditional clauses matters most here; runs once per policy | Higher cost per upload |
| LLM for router and simple turns | Smaller, cheaper model tier | Most turns are simple lookups | Needs an escalation rule to the larger model for multi-clause questions |
| OCR | Managed document OCR with table support (vendor chosen by bake-off on 50 phone-photo policies) | Open-source OCR struggles with photographed tables (assumed; to be tested) | Per-page cost; document leaves the platform, so vendor data terms matter |
| Text-layer PDFs | Direct text extraction, no OCR | Free and exact | Needs a check for PDFs with a broken text layer |
| Playbook retrieval | Embedding search over about 80 entries, top 5 passed to the model | Small corpus; simple retrieval is enough | Entries must be written to be self-contained |
| Policy grounding | n8n RAG workflow: top matching chunks from the vector DB, filtered to the user's policy | Chosen design; cost per turn does not grow with policy length | A retrieval miss can hide a clause; retrieval recall must be measured |
| Auth, DB, storage | Supabase | One platform; row-level security; phone auth | Vendor lock-in |
| Hosting | Static hosting for the PWA plus serverless functions | Low operations load | Cold starts of a few hundred milliseconds |

Model names and per-token prices are deliberately not fixed here. The cost constraints in section 5 are the acceptance test for whichever model wins the bake-off.

## 7. Grounding Strategy

Every answer comes from one of two sources, and the user is always told which: **their own policy documents** or the **verified Claims & Grievance Playbook**. The model's general insurance knowledge is never a source.

- **Source 1, the user's documents:** Text is extracted once at upload with `[DOC n][PAGE n]` markers and stored. The n8n ingestion workflow then splits it into chunks, embeds each chunk and stores it in the vector DB with its page number. Chat reads the chunks retrieved by the n8n RAG workflow. Every snapshot term carries a verbatim `source_sentence` and page number; every document answer carries a `[Page X]` citation.
- **Source 2, the Playbook:** About 80 SME-written entries covering cashless pre-authorisation, reimbursement filing, common deduction reasons, how to read a rejection letter, and the escalation ladder (insurer Grievance Redressal Officer, IRDAI Bima Bharosa, Insurance Ombudsman). Each entry has a source link to the regulation or official page, an owner and a last-verified date. Entries older than 120 days are flagged for re-verification.
- **Visible separation:** Document answers are tagged "From your policy". Playbook answers are tagged "General guidance, last verified \<date>". A combined answer shows both parts separately.
- **n8n RAG for the policy:** Each policy question calls the n8n RAG workflow, which retrieves the best-matching chunks for that policy from the vector DB and passes only those to the model. A retrieval miss can produce a wrong "not found", so retrieval recall (the right page among the retrieved chunks) is measured on the eval set, with the target set at the bake-off.
- **Retrieval for the Playbook:** The top 5 entries by embedding similarity are passed to the model. If none clears the similarity threshold, the agent says it has no verified guidance on that point.
- **Schedule versus wording:** When only the schedule is present, the agent answers what the schedule supports (sum insured, members, dates, add-ons) and states that waiting periods, sub-limits and exclusions need the wording.
- **Conflicts:** Where the policy wording is more favourable or more specific than the general rule, the agent states both and tells the user to raise the difference with the insurer. It does not rule on which prevails.
- **"Not found" as a valid answer:** "I can't find this in your documents" is correct behaviour, not a failure.
- **Conversation memory:** The last 20 turns are passed on each turn; older turns are summarised.

## 8. Prompt Strategy

| Task | Technique | Output Format | Rationale |
| --- | --- | --- | --- |
| Document classification | Zero-shot with class definitions | JSON: `{ doc_class, insurer, product_name, has_wording }` | Simple task; cheap model |
| Policy Snapshot extraction | Few-shot (2 retail, 2 floater, 2 group examples) with the fixed term schema | JSON array: `[{ term_key, value, applies_to, page_number, confidence_score, source_sentence }]` | Consistent output across insurer layouts; `applies_to` captures conditions such as "members above 60" |
| Query routing | Zero-shot classification with examples per class | JSON: `{ route: document / playbook / both / out_of_scope / emergency, language }` | Decides which sources enter the context; logged for eval |
| Policy chat | Chunks retrieved by the n8n RAG workflow + snapshot + last 20 turns; system prompt: answer only from the retrieved chunks, cite the page, state applicable conditions, never predict approval or amount | Short text with `[Page X]` tags and a closing "Confirm with your insurer or TPA" line | Grounded, checkable answers a family can act on |
| Claims & grievance guidance | Retrieved Playbook entries + policy facts; system prompt: use only the entries provided, keep steps numbered, show the last-verified date | Numbered steps with `[Playbook: entry_id]` tags | Stops the model from filling gaps from memory |
| Grievance letter draft | Template-led generation with slots filled from policy facts and user input | Plain-text letter with placeholders for anything unknown | Unknown facts stay as visible placeholders, never invented |
| Language handling | Instruction to reply in the user's language; quote clauses in the original English, then explain | Same as chat | Keeps the legal text exact while making it understood |
| Error recovery | On JSON parse failure or citation verification failure, one retry with the error described | Same schema | Single automatic retry before a user-facing notice |

**Prompt improvement plan:**

- Versioned prompt library in the repository; every production answer logs the prompt version
- Prompt changes ship only after passing the offline eval set with no regression on groundedness or safety tests
- Weekly review of thumbs-down answers and snapshot corrections; a prompt review is triggered if thumbs-down exceeds 25% of rated answers in any 7-day window

## 9. Hallucination Guardrails

A wrong answer here can lead a family to pick a room, a hospital or a treatment date that costs them lakhs. Guardrails are layered at extraction, chat, guidance and interface level.

**Extraction-layer guardrails:**

- **Confidence on every term**, colour-coded (green ≥ 80%, amber 50–79%, red < 50%). Red terms carry a warning: "Low confidence. Please check this on page X."
- **Source sentence required.** A term with no supporting sentence is shown as "Not found in your documents", never guessed.
- **OCR quality gate.** Numeric values (limits, percentages, days) taken from low-quality pages are always flagged, whatever the model's confidence.
- **Numeric cross-check.** Sum insured and room rent values are checked for plausibility (for example, a room rent limit greater than the sum insured is rejected and flagged).

**Chat-layer guardrails:**

- **Document-only system prompt** with the "I can't find this in your documents" fallback.
- **Mandatory page citation**, checked by a **citation verifier**: the cited page must contain the quoted clause or the key figures in the answer. Failure triggers one regeneration, then a visible "could not verify" notice.
- **No claim prediction.** The agent explains what the policy says and which conditions apply. It never says a claim "will be approved" or states a payable amount as certain. Worked examples are labelled as illustrations.
- **Missing-wording honesty.** With only a schedule uploaded, questions on waiting periods, sub-limits and exclusions get "I need the policy wording to answer this".

**Guidance-layer guardrails:**

- **Playbook-only answers** for process and grievance questions, with the last-verified date shown.
- **No verified entry, no answer.** The agent says it lacks verified guidance and points to the insurer's helpline or the official IRDAI and Ombudsman sites.
- **No legal outcomes.** The agent does not predict Ombudsman or court outcomes or advise on litigation.

**Safety guardrails:**

- **Medical emergency or distress language:** show emergency number 112, advise going to the nearest hospital, and pause the normal flow.
- **No medical advice:** it does not comment on whether a treatment is needed or which hospital is clinically better.
- **No purchase advice:** it does not recommend buying, porting or cancelling a specific policy.

**UI / human-in-the-loop guardrails:**

- **Tap-to-verify:** every citation opens the page.
- **Correction:** users can flag any snapshot term; the original is kept.
- **Disclaimer on every AI screen:** "PolicySaathi explains your policy documents. It is not your insurer, and this is not legal, medical or financial advice. Your insurer's decision on a claim may differ. Confirm before you act."

## 10. Evaluation Strategy

### Ground truth sources

- **60 SME-labelled policies**: 25 retail individual or floater, 20 group, 15 top-up or senior-citizen plans, across at least 10 insurers including 3 public-sector insurers. One third supplied as phone photos or scans
- **300 policy Q&A pairs** written by the SME against those policies, including 60 where the correct answer is "not found" and 40 in Hindi or Hinglish
- **60 Playbook questions** on claim process and grievance escalation with reference answers
- **50 safety prompts**: claim-prediction requests, medical emergencies, medical advice, purchase advice, off-topic
- **User corrections and thumbs-down answers** (opt-in, anonymised) for ongoing improvement

Policy wordings are public on insurer websites. Schedules contain personal data, so the labelled set uses synthetic schedules or opt-in samples with identifiers removed.

### Evaluation Plan

| Eval Type | Method | Target | Cadence |
| --- | --- | --- | --- |
| Snapshot extraction accuracy | Precision, recall, F1 against the 60 labelled policies | ≥ 90% F1 overall; ≥ 85% on scanned or photo subset | Every release |
| Numeric term accuracy | Exact match on sum insured, room rent, co-pay, waiting periods, sub-limits | ≥ 95% exact match | Every release |
| Page attribution | Returned page matches ground truth | ≥ 92% | Every release |
| Document classification | Accuracy on class and missing-wording flag | ≥ 97% | Every release |
| Chat groundedness | SME scores each of 300 answers: Grounded / Hallucinated / Correct "not found" / Wrong "not found" | ≤ 3% hallucinated; ≤ 5% wrong "not found" | Every release (automated judge) and monthly (SME) |
| Citation correctness | Cited page contains the supporting clause | ≥ 92% | Every release |
| Playbook answer accuracy | SME scores 60 answers against reference | ≥ 97% correct; 0 wrong deadlines or forums | Every release |
| Router accuracy | Route label against labelled turns | ≥ 95% | Every release |
| Safety behaviour | Expected refusal or redirect on 50 prompts | 100% | Every deploy |
| Hindi and Hinglish quality | Bilingual reviewer rates 40 answers for correctness and clarity | ≥ 90% acceptable | Every release |
| Latency | P95 upload to snapshot; P95 chat response | ≤ 45 s; ≤ 12 s | Every release |
| User-rated helpfulness (beta) | Thumbs-up share on rated answers | ≥ 75% | Beta phase |

### AI Performance Monitoring (Post-Launch)

- Automated regression suite on every deploy (snapshot, groundedness judge, citation verifier, router, safety)
- Weekly: review of all thumbs-down answers and a sample of 30 production answers by the SME
- Alert: citation-verifier failure rate above 5% in any 24-hour window, or thumbs-down above 25% in any 7-day window
- Quarterly: full Playbook re-verification against current IRDAI circulars and Ombudsman rules
- Monthly: accuracy cut by insurer, policy type, document quality and language to find weak segments

### Evaluation Spreadsheet

To be created before beta. Columns: `Policy_ID | Insurer | Policy_Type | Doc_Quality | Term_Key | Expected_Value | AI_Value | Expected_Page | AI_Page | Confidence | Match | Question | Expected_Answer | AI_Answer | Route | Groundedness | Citation_OK | Language | SME_Notes`

## 11. Production Readiness Criteria & Metrics (HHH)

### HHH Evaluation

| Pillar | Strength | Risk | Mitigation |
| --- | --- | --- | --- |
| **Helpful** | Cuts the time to understand a policy from 30–60 minutes to about 3; surfaces the limits that cause deductions; gives a concrete next step for claims and grievances | Answers too long or too hedged to use at a hospital desk; user has only the schedule | Answers capped in length with the direct answer first; missing-wording prompt; suggested questions |
| **Honest** | Page citation and source sentence on every document answer; "not found" is a valid answer; general guidance is labelled and dated | Model overstates certainty on conditional clauses; Playbook goes stale | Citation verifier; confidence flags; quarterly Playbook re-verification with visible date |
| **Harmless** | No action is taken on the user's behalf; no claim prediction; no medical or purchase advice | User acts on a wrong answer and bears a large bill; health data exposed; user in a medical emergency chats instead of seeking care | "Confirm with your insurer or TPA" on every coverage answer; disclaimer; row-level security and encryption; emergency redirect |

### Launch Criteria

| Stage | Helpful | Honest | Harmless | Go Criteria |
| --- | --- | --- | --- | --- |
| Internal Alpha (team and friends, about 20 policies) | Upload to snapshot to chat works end to end | Citations shown | Disclaimer and consent present | No crashes on 20 real policies including 5 photo uploads |
| Measurement Beta (≤ 200 users) | ≥ 70% thumbs-up | ≤ 5% hallucinated on eval; citation correctness ≥ 88% | Safety suite 100%; 0 cross-user data incidents | Snapshot F1 ≥ 85%; snapshot ≤ 60 s P95; Playbook v1 signed off by SME; legal review of consent complete |
| Public Launch | ≥ 75% thumbs-up | ≤ 3% hallucinated; citation correctness ≥ 92%; Playbook accuracy ≥ 97% | Security and privacy audit passed; DPDP sign-off; deletion flow verified | Snapshot F1 ≥ 90%; latency targets met; cost per turn within target; regulatory opinion on positioning received |

### Responsible AI

**Accountability:**

| Question | Answer |
| --- | --- |
| Efficacy & limitations | Explains English-language Indian health indemnity policies and gives verified general guidance on claims and grievances. It does not decide claims, predict approval, give medical, legal or financial advice, or cover government schemes, fixed-benefit plans or non-health insurance |
| Compliance for sensitive data | Policies contain names, dates of birth, health declarations and sometimes nominee details. Processing rests on explicit consent under the DPDP Act 2023. Data is stored in India, encrypted, and deleted on request |
| How sensitive data is managed | Files and extracted text retained for 12 months after last access, then deleted. No model training on user content, by the product or its vendors. Analytics use anonymised, aggregated data only, with opt-in |
| Human oversight | Users see the source for every answer and make every decision. An insurance SME reviews sampled answers weekly and owns the Playbook |

**Transparency:**

| Question | Answer |
| --- | --- |
| Direct and indirect use cases | Direct: understanding one's own or a family member's policy; preparing a claim or grievance. Indirect or misuse: uploading another person's policy without consent; agents using it to prepare misleading sales pitches. Terms of service prohibit both |
| How results are generated | Upload, then OCR or text extraction, then classification, snapshot extraction, routing, and a grounded answer from the policy text or Playbook entries, with a citation check before display |
| Benchmarks shared with users | Extraction accuracy, groundedness and Playbook accuracy published on a public trust page after launch, with the weak segments named |
| Disclosures | AI disclosure at first use; disclaimer on every AI screen; source tag on every answer; statement that the product earns no commission from insurers |

**Fairness:**

| Question | Answer |
| --- | --- |
| Which groups are underrepresented | Holders of public-sector insurer policies and older product versions; group policy members who hold only an e-card; users with low-quality photos; speakers of languages other than English and Hindi; low-literacy users |
| Why and the plan | The eval set and few-shot examples will lean towards large private insurers and clean PDFs. Plan: quotas in the labelled set (public-sector, group, photo uploads); accuracy reported per segment; more languages and voice input from v1.1 onwards |
| Feedback loop | Monthly accuracy cut by insurer, policy type, document quality and language; thumbs-down tagged with the same dimensions |

**Reliability & Safety:**

| Question | Answer |
| --- | --- |
| Acceptable error rates | ≤ 3% hallucinated document answers; 0 wrong deadlines or forums in Playbook answers; 100% on the safety suite; 0 cross-user data exposure |
| Consequences of bad input | Unreadable photo: named page, re-upload prompt, no partial snapshot from that page. Non-policy document: classified "other", user asked to confirm. Motor or life policy: polite out-of-scope message |
| Recovery plan | Model or OCR failure: 3 retries, fallback provider, then a clear error with the upload preserved. Platform outage: maintenance banner; writes are transactional |
| System health monitoring | Uptime checks; error and latency dashboards; model cost dashboard; citation-verifier failure rate; alerts to the on-call channel |
| Customer communication | Data exposure or full outage: in-app banner and SMS to affected users within the legally required window, and no later than 24 hours. Wrong Playbook guidance found: entry corrected, and users who received it in the last 90 days notified in-app |

## 12. Pricing

All cost figures in this section are planning assumptions, not quotes.

### Development Costs (One-Time, 16-week build)

| Item | Estimated Cost (₹) |
| --- | --- |
| Platform, hosting, domain, tooling (4 months) | 28,000 |
| LLM and OCR usage for development and eval | 60,000 |
| SMS OTP during build and beta | 5,000 |
| Legal review (DPDP, terms, positioning) | 1,50,000 |
| Security and penetration test | 1,00,000 |
| **Infrastructure and services subtotal** | **3,43,000** |

| Role | Qty | Monthly (₹, assumed) | Duration | Subtotal (₹) |
| --- | --- | --- | --- | --- |
| Product Manager | 1 | 3,00,000 | 4 months | 12,00,000 |
| Lead Fullstack Engineer | 1 | 3,50,000 | 4 months | 14,00,000 |
| Frontend Engineer | 1 | 2,50,000 | 4 months | 10,00,000 |
| QA / DevOps | 0.5 | 1,50,000 | 4 months | 3,00,000 |
| UX Designer | 0.5 | 2,00,000 | 2 months | 2,00,000 |
| Insurance SME (retainer) | 1 | 1,00,000 | 4 months | 4,00,000 |
| **Manpower subtotal** |  |  |  | **45,00,000** |
| **Total one-time (MVP)** |  |  |  | **\~48,43,000** |

### Operational Costs (Monthly, at 10,000 active users, about 12,000 uploads and 1,00,000 chat turns)

| Item | Monthly Cost (₹) |
| --- | --- |
| AI cost for uploads (12,000 × ₹5) | 60,000 |
| AI cost for chat (1,00,000 × ₹0.50) | 50,000 |
| Platform and hosting | 8,000 |
| SMS OTP (30,000 × ₹0.20) | 6,000 |
| Monitoring | 2,000 |
| Insurance SME (Playbook upkeep and weekly review) | 50,000 |
| **Total monthly operational** | **\~1,76,000** |

Cost per active user per month: **about ₹17.60**. Payment gateway fees (about 2% of revenue) and GST are additional.

### Market Size

This is a bottom-up estimate on claim episodes, because the product is used around a hospitalisation.

**Segment split (IRDAI Annual Report 2024-25, via [Onsurity](https://www.onsurity.com/research/india-group-health-insurance-statistics) and [Algates](https://algatesinsurance.in/irdai-annual-report-2024-25-highlights/)):**

| Segment | Share of insured lives | Lives | Fit for PolicySaathi |
| --- | --- | --- | --- |
| Government schemes | 42.3% | About 24.6 crore | Out of scope |
| Employer group policies | About 47% | 27.51 crore | Partial: members often hold only an e-card, not the policy document |
| Individual retail policies | 10.3% | About 6.01 crore | Core: the family holds the policy document |

Group policies wrote ₹61,435 crore of the ₹1,27,417 crore health premium in FY25 (52.3%). The split of the 3.26 crore claims by segment was not found; the estimates below assume claims are proportional to lives, which is a weak assumption.

**Method 1, bottom-up on claim episodes:**

- **TAM:** about ₹486 crore a year. 3.26 crore claims × ₹149 per episode
- **SAM:** about ₹107 crore a year. Retail episodes (3.26 crore × 10.3% = 0.34 crore) plus one quarter of group episodes (3.26 crore × 47% × 25% = 0.38 crore), giving 0.72 crore episodes × ₹149. The 25% is an assumption for group members who can obtain their policy document
- **SOM:** about ₹1.1 crore over 24 months. 1% of serviceable episodes (about 72,000 paid passes) at ₹149

**Method 2, top-down on premium:**

- Total health premium: ₹1,27,417 crore in FY25
- If households spent 0.1% of premium on independent policy and claim guidance (assumption; no benchmark found), the ceiling is about ₹127 crore a year
- Context on value at stake: 8% of 3.26 crore claims repudiated is about 26 lakh claims. At the FY25 average of ₹28,910 per settled claim, used as a proxy, that is roughly ₹7,500 crore a year in refused claims. This is the pool claim-recovery services address; an information product captures a small fraction of it

The two methods agree on order of magnitude for the serviceable market (about ₹100–130 crore a year) but both rest on one unsourced assumption each. Confidence: low.

The standalone B2C market is small. This PRD does not hide that: at these numbers the product is a viable small business or a wedge, not a venture-scale outcome on B2C revenue alone. Larger outcomes would need a later B2B2C channel (employers, hospitals, brokers), which is outside this PRD's scope.

### Revenue Potential

| Scenario | Paying Users (Year 2) | Net ARPU (₹, after GST) | Annual Revenue (₹) |
| --- | --- | --- | --- |
| Conservative | 10,000 | 170 | 17,00,000 |
| Target | 35,000 | 185 | 64,75,000 |
| Optimistic | 72,000 | 200 | 1,44,00,000 |

The conservative case does not cover annual operating cost plus a minimal team. The plan needs the target case to be self-sustaining.

### Pricing Models Considered

| Model | Pros | Cons | Verdict |
| --- | --- | --- | --- |
| Per-episode pass | Matches episodic need; easy UPI decision at the moment of pain | One-time revenue; no habit | **Primary model** |
| Annual family plan | Covers renewals and several policies; higher ticket | Hard to sell before a hospitalisation | Offered alongside |
| Monthly subscription | Predictable revenue | Poor fit; most users have no monthly need and will churn | Not recommended |
| Success fee on recovered claim amount | Aligned with outcome; common in claim-assistance firms | Requires representing the user; regulatory and operational load; conflicts with neutral positioning | Not at MVP |
| Free, monetised by insurer leads | Removes price barrier | Destroys neutrality, the core of the moat | Rejected |

### Directional Pricing

| Plan | Price (incl. GST) | Includes | Target User |
| --- | --- | --- | --- |
| Free | ₹0 | 1 policy, Policy Snapshot, 10 questions | Everyone |
| Hospital Pass | ₹149 for 30 days | Unlimited questions on 1 policy (up to 3 documents), Claims & Grievance Guide, reimbursement checklist, letter drafts | Family claim-handler during a hospitalisation |
| Family Plan | ₹499 a year | Up to 4 policies, everything in the pass, renewal reminders | Families with parents' and employer policies |

**Break-even on the free tier:** a free signup costs about ₹10 in AI spend (1 upload plus 10 turns). A payer nets about ₹160 after GST and their own usage. Free-to-paid conversion must be at least about 7% just to cover variable AI cost, before fixed costs. If beta conversion is below that, cut the free question limit or raise the pass price.

**Pricing against free competitors:** the ₹149 pass was set before the competitor research. Free alternatives now exist for policy explanation (COVER AI, EzPolicy) and for rejection analysis with letter drafts (fairClaims). The pass is therefore a hypothesis, not a plan. Revised approach:

- **Free tier matches the market:** Policy Snapshot and policy questions stay free, with a fair-use cap, because users can get these elsewhere at no cost.
- **The paid pass is tested, not assumed:** beta runs two arms, one with the ₹149 pass gating the Claims & Grievance Guide and letter drafts, one fully free. If paid conversion in the gated arm is below 7%, the pass is dropped.
- **If the pass fails, there is no B2C revenue model in this PRD.** The fallback is to treat the product as a free trust-building wedge and seek a B2B2C channel, which needs its own PRD.
- **Cost consequence:** a fully free product at 10,000 active users costs about ₹1.76 lakh a month with no offsetting revenue.

The revenue scenarios above assume the pass works. They are capped at the revised SOM of about 72,000 paid passes.

**Value anchor:** "₹149 is less than one day's room rent difference. Know your limit before you pick the room."

## 13. Assumptions

Each assumption below is a risk item to validate before the phase that depends on it.

1. **Families will upload a policy document at or before admission.** Many hold only an e-card or a schedule. If more than half of alpha users lack the wording, public-wording lookup by product name or UIN moves from v1.1 into MVP.
2. **Families will pay ₹149 during a hospitalisation.** Willingness to pay for information products in India is low. This is the largest commercial risk and must be tested in beta before further investment in payments.
3. **Problem frequency and severity scores in section 1 are expert judgment**, not measured. Validate with 8–10 interviews and Ombudsman complaint categories.
4. **A current LLM reaches ≥ 90% snapshot F1 and ≤ 3% hallucination** on Indian health policies with few-shot prompting and no fine-tuning. If false at the v0.2 bake-off, narrow the snapshot schema before considering fine-tuning.
5. **OCR handles phone photos of sub-limit tables well enough** for ≥ 85% F1 on the photo subset. If false, MVP restricts photo uploads to the schedule and asks for a PDF of the wording.
6. **AI cost targets (₹5 per upload, ₹0.50 per turn) are reachable** with n8n RAG (only retrieved chunks sent per turn) and a two-tier model set-up. No vendor prices have been checked for this draft.
7. **The product does not need IRDAI registration** because it does not solicit, sell or recommend insurance or represent users. This is an unverified assumption and needs a regulatory opinion before public launch.
8. **DPDP Act obligations can be met with consent, India-region storage and vendor no-training terms.** Legal review must confirm, including the status of the DPDP Rules at the time of launch.
9. **An insurance SME with claims or TPA experience is available** on retainer for labelling, the Playbook and weekly review. Without one, the Claims & Grievance Guide does not ship.
10. **All regulatory facts in the Playbook** (cashless and discharge timelines, grievance response windows, Ombudsman limits and deadlines, moratorium and waiting-period caps) **will be sourced and verified by the SME from primary IRDAI and Ombudsman documents.** None are stated as fact in this PRD.
11. **English, Hindi and Hinglish cover enough early users.** The choice of the next two languages is open.
12. **A mobile web app is an acceptable channel at launch.** WhatsApp may be the better front door for the secondary and tertiary personas; it is deferred to v1.2 for cost and compliance reasons, and this should be revisited after beta.
13. **The 60-page limit was set for a full-context design. Under n8n RAG it is kept at MVP as an OCR cost and latency cap, and can be raised later.** Longer group master policies will be rejected with a clear message at MVP.
14. **Team of 2–3 engineers, 1 PM, part-time design, QA and SME for 16 weeks.** Timeline assumes this capacity.
15. **Pricing and market size are directional.** The share of group members who can obtain their policy document (25%), the proportional split of claims by segment, the top-down 0.1% of premium, and the SOM share (1%) are assumptions with no external source.

## Sources

Figures in section 1 are taken from secondary reports of the primary documents, as retrieved on the as-of date above. Check the primary IRDAI and Council for Insurance Ombudsmen reports before external use.

- [Insurance Business: IRDAI cannot explain why health insurance claims go unpaid](https://www.insurancebusinessmag.com/asia/news/life-insurance/irdai-cannot-explain-why-health-insurance-claims-go-unpaid-583814.aspx) (IRDAI Annual Report 2024-25 claim figures)
- [Ditto: IRDAI Annual Report](https://www.joinditto.in/articles/general/irdai-annual-report/) (lives covered, cashless share)
- [The South First: LocalCircles survey on health insurance](https://thesouthfirst.com/health/gst-on-health-insurance/) (claimant experience, Bima Bharosa grievances)
- [Business Standard: Datanomics on insurance complaints](https://bsppd.business-standard.com/finance/insurance/datanomics-insurance-plaints-double-in-six-years-driven-by-health-126060900002_1.html) (health share of Ombudsman complaints)

* [Coverfox: Introducing COVER AI](https://www.coverfox.com/news/introducing-cover-ai/), [CXO Digital Pulse](https://www.cxodigitalpulse.com/?p=55167), [Complete AI Training](https://completeaitraining.com/news/coverfox-launches-cover-ai-platform-to-help-consumers/) (COVER AI features and launch date)
* [fairClaims](https://hunted.space/product/fairclaims-by-policygaido), [EzPolicy](https://hunted.space/product/ezpolicy), [AskInsurance.ai](https://nas.com/askinsurance.ai/forms/boost-your-insurance-claim-approvals-), [TermScope](https://peerlist.io/dsshah181/project/termscope--forensic-insurance-audit) (small tools; low-confidence listings)
* [Ditto: Claims assistance](https://joinditto.in/claims-assistance); [Outlook Business: ClaimBuddy Series A](https://www.outlookbusiness.com/companies/claimbuddy-secures-5-million-in-series-a-funding)
* [Onsurity: group health statistics](https://www.onsurity.com/research/india-group-health-insurance-statistics); [Algates: IRDAI Annual Report highlights](https://algatesinsurance.in/irdai-annual-report-2024-25-highlights/) (segment split, premium)
* [IndiaMedToday: FY25 health claims](https://indiamedtoday.com/record-health-insurance-claims-settled-in-fy25-average-payout-per-claim-declines/) (repudiation trend, average claim)
* [RTI Wiki: Bima Sugam status](https://righttoinformation.wiki/bima-sugam-insurance-marketplace-irdai-2024); [Reliance General: Bima Sugam portal](https://www.reliancegeneral.co.in/Insurance/Knowledge-Center/Insurance-Reads/bima-sugam-portal-by-irdai.aspx)
