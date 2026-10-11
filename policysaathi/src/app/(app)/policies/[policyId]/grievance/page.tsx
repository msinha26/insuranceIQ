'use client'

import { useRouter, useParams } from 'next/navigation'

const SUGGESTED_QUESTIONS = [
  'How do I get cashless approval?',
  'What documents do I need for reimbursement?',
  'My claim was rejected, what can I do?',
  'How do I escalate a grievance?',
]

export default function GrievancePage() {
  const router = useRouter()
  const params = useParams<{ policyId: string }>()

  function askQuestion(question: string) {
    router.push(`/policies/${params.policyId}/chat?q=${encodeURIComponent(question)}`)
  }

  return (
    <main className="page page-scroll">
      <h1 className="headline">Claims &amp; Grievance Guide</h1>
      <p className="body-text">
        Ask how a claim or grievance process works, or draft a letter to escalate a rejected or reduced claim.
      </p>

      <div className="suggested-chip-row">
        {SUGGESTED_QUESTIONS.map((question) => (
          <button key={question} type="button" className="suggested-chip" onClick={() => askQuestion(question)}>
            {question}
          </button>
        ))}
      </div>

      <a href={`/policies/${params.policyId}/grievance/letter`} className="btn-primary">
        Draft a grievance letter
      </a>
    </main>
  )
}
