// The Policy Snapshot's term list and grouping, taken verbatim from the
// PRD's Flow 3 step 3 — not a derived/placeholder list (see
// docs/prd-techspecs-review-feedback.md's FR-07 finding, which flagged an
// earlier draft of docs/specs/policy-snapshot.md for not matching this).

export interface SnapshotGroup {
  heading: string
  termKeys: string[]
}

export const SNAPSHOT_GROUPS: SnapshotGroup[] = [
  {
    heading: 'Basics',
    termKeys: [
      'insurer',
      'product_name',
      'policy_type',
      'policy_period',
      'members_covered',
      'sum_insured',
      'tpa_name_and_helpline',
    ],
  },
  {
    heading: 'What reduces a claim',
    termKeys: ['room_rent_limit', 'icu_limit', 'co_pay', 'deductible', 'disease_wise_sub_limits', 'consumables_cover'],
  },
  {
    heading: 'When cover starts',
    termKeys: [
      'initial_waiting_period',
      'specific_disease_waiting_period',
      'pre_existing_disease_waiting_period',
      'maternity_waiting_period',
    ],
  },
  {
    heading: 'What else is covered',
    termKeys: [
      'pre_post_hospitalisation_days',
      'daycare_procedures',
      'ayush_cover',
      'ambulance_limit',
      'restoration_benefit',
      'no_claim_bonus',
    ],
  },
  {
    heading: 'What is not covered',
    termKeys: ['key_exclusions'],
  },
  {
    heading: 'Deadlines',
    termKeys: ['claim_intimation_window', 'reimbursement_submission_window'],
  },
]

export const SNAPSHOT_TERM_LABELS: Record<string, string> = {
  insurer: 'Insurer',
  product_name: 'Product name',
  policy_type: 'Policy type',
  policy_period: 'Policy period',
  members_covered: 'Members covered',
  sum_insured: 'Sum insured',
  tpa_name_and_helpline: 'TPA name and helpline',
  room_rent_limit: 'Room rent limit',
  icu_limit: 'ICU limit',
  co_pay: 'Co-pay',
  deductible: 'Deductible',
  disease_wise_sub_limits: 'Disease-wise sub-limits',
  consumables_cover: 'Consumables cover',
  initial_waiting_period: 'Initial waiting period',
  specific_disease_waiting_period: 'Specific-disease waiting period',
  pre_existing_disease_waiting_period: 'Pre-existing disease waiting period',
  maternity_waiting_period: 'Maternity waiting period',
  pre_post_hospitalisation_days: 'Pre and post hospitalisation days',
  daycare_procedures: 'Daycare procedures',
  ayush_cover: 'AYUSH',
  ambulance_limit: 'Ambulance limit',
  restoration_benefit: 'Restoration benefit',
  no_claim_bonus: 'No-claim bonus',
  key_exclusions: 'Key exclusions',
  claim_intimation_window: 'Claim intimation window',
  reimbursement_submission_window: 'Reimbursement submission window',
}

export function labelForTerm(termKey: string): string {
  return SNAPSHOT_TERM_LABELS[termKey] ?? termKey
}
