import { FileUp, ScanSearch, MessageCircleQuestion, ShieldCheck } from 'lucide-react'

const HOW_IT_WORKS = [
  {
    icon: FileUp,
    title: 'Upload your policy',
    body: 'PDF only, under 5 MB. Your policy stays private to your account.',
  },
  {
    icon: ScanSearch,
    title: 'We read every page',
    body: 'Key terms are extracted with the exact page they come from — sum insured, waiting periods, exclusions and more.',
  },
  {
    icon: MessageCircleQuestion,
    title: 'Ask anything',
    body: "Get plain-English answers, always cited to your document — never a guess.",
  },
] as const

const FAQS = [
  {
    q: 'Does InsuranceIQ replace my insurer?',
    a: "No. InsuranceIQ explains what your policy document says. Your insurer makes the actual decision on any claim, and that decision may differ from what's in the document.",
  },
  {
    q: 'Is my policy data secure?',
    a: 'Yes. Your policy is private to your account, never used to train shared models, and you can delete it at any time.',
  },
  {
    q: 'Can I chat in Hindi?',
    a: 'Yes — you can type in English, Hindi or Hinglish, and InsuranceIQ answers in the same language.',
  },
  {
    q: 'What file types can I upload?',
    a: 'PDF only right now, up to 5 MB and 60 pages.',
  },
] as const

export default function Home() {
  return (
    <>
      <header className="site-nav">
        <a href="/" className="nav-logo">
          <span className="nav-logo-mark" aria-hidden="true" />
          InsuranceIQ
        </a>
        <nav className="nav-links" aria-label="Primary">
          <a href="#how-it-works">How it works</a>
          <a href="#security">Security</a>
          <a href="#faq">FAQ</a>
        </nav>
        <a href="/sign-in" className="nav-signin">Sign in</a>
      </header>

      <main className="landing-hero">
        <span className="hero-badge">AI-Powered · Understand any policy in minutes</span>
        <h1 className="headline">Know what your health policy pays, before the bill.</h1>
        <p className="body-text">
          Upload your policy and ask questions in plain English. Every answer comes only from your
          document, with the exact page cited.
        </p>
        <a href="/sign-in" className="btn-primary landing-cta">Check my policy</a>
        {/* Exact text from PRD section 9 — do not paraphrase, aside from the product name. */}
        <p className="disclaimer">
          InsuranceIQ explains your policy documents. It is not your insurer, and this is not
          legal, medical or financial advice. Your insurer&apos;s decision on a claim may differ.
          Confirm before you act.
        </p>
      </main>

      <section id="how-it-works" className="landing-section">
        <h2 className="landing-section-title">One Upload. Fully Understood.</h2>
        <div className="how-it-works-grid">
          {HOW_IT_WORKS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="how-step">
              <Icon size={20} aria-hidden="true" className="how-step-icon" />
              <h3 className="how-step-title">{title}</h3>
              <p className="how-step-body">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="security" className="landing-section landing-section-accent">
        <div className="security-callout">
          <ShieldCheck size={24} aria-hidden="true" className="security-callout-icon" />
          <div>
            <h2 className="landing-section-title">Your policy stays private</h2>
            <p className="body-text">
              Your uploaded policy is never used to train shared models and is never shared with
              your insurer. You can delete it, and everything linked to it, at any time.
            </p>
          </div>
        </div>
      </section>

      <section id="faq" className="landing-section">
        <h2 className="landing-section-title">Frequently Asked Questions</h2>
        <div className="faq-list">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="faq-item">
              <summary className="faq-question">{q}</summary>
              <p className="faq-answer">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <span className="footer-wordmark" aria-hidden="true">InsuranceIQ</span>
        <div className="footer-content">
          <div className="footer-brand">
            <span className="nav-logo">
              <span className="nav-logo-mark" aria-hidden="true" />
              InsuranceIQ
            </span>
            <p className="footer-tagline">
              Understand your health insurance policy — ask questions, get answers with the exact
              page cited.
            </p>
          </div>
          <div className="footer-column">
            <span className="footer-column-title">Product</span>
            <a href="#how-it-works">How it works</a>
            <a href="#security">Security</a>
            <a href="#faq">FAQ</a>
          </div>
        </div>
        <p className="footer-copyright">© InsuranceIQ 2026 · All rights reserved</p>
      </footer>
    </>
  )
}
