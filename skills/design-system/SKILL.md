---
name: design-system
description: >
  Enforces the project's design system on every UI component, page, and style
  decision. Always apply this skill when writing any frontend code — components,
  layouts, pages, CSS, Tailwind classes, or inline styles. Trigger when the user
  asks to build a page, component, UI, screen, layout, or anything visual. Also
  trigger when the user says "make it look like the design", "follow the design
  system", "use our colors", or "style this properly". Never use arbitrary
  colors, spacing, or typography that are not defined in the design system.
---

## Design System Source of Truth

All design tokens, colors, typography, spacing, components, and rules live in:

**`docs/design.md`**

Before writing any UI code, **read `docs/design.md` in full**. Every decision — colors, spacing, fonts, component styles, layout — must come from that file.

Do not reuse the ContractIQ palette and fonts unless the user decides to. That design is a desktop enterprise look; PolicySaathi is a consumer app used on a phone at a hospital desk.

If `docs/design.md` does not exist yet, create it by asking the user the following questions with `AskUserQuestion`, then write the file:

1. What visual personality should PolicySaathi have? (e.g. "calm and trustworthy", "friendly and plain")
2. What are the primary brand colors? (provide hex values if known, or describe the mood)
3. What fonts should be used for English and for Hindi (Devanagari)?
4. Are there any existing designs, Figma files, or brand guidelines to reference?

Once you have the answers, generate `docs/design.md` with the full design system — color tokens (brand, semantic, surface, text), typography scale, spacing scale, layout zones, component specs, icon library (Lucide React), motion, and accessibility rules.

`docs/design.md` must include these PolicySaathi-specific parts:

- **Mobile-first layout:** designed at 360px width first; one-handed use; primary actions within thumb reach
- **Typography for two scripts:** a Devanagari face paired with the Latin face, with line height tested for Hindi text; body text no smaller than 16px
- **Confidence tokens:** green (80% and above), amber (50–79%), red (below 50%), each defined as a color **plus an icon and a text label**, so the meaning never depends on color alone
- **Source tags:** distinct styles for "From your policy" and "General guidance, last verified <date>"
- **Components:** Policy Snapshot term card (value, page, confidence, expandable source sentence), chat bubble, page-citation chip, suggested-question chip, upload and camera capture, document viewer, disclaimer banner, emergency notice, checklist with tick boxes, OTP input
- **States:** loading, empty, error with retry, and slow-connection states for upload and chat

---

## Rules (always apply)

1. Never use colors, spacing, or fonts not defined in `docs/design.md`
2. Never hardcode hex values — always reference the named token
3. Always use the component specs from `docs/design.md`
4. Always use the icon library and size specified in `docs/design.md`
5. Always keep transitions at the duration and easing defined in `docs/design.md`
6. WCAG 2.1 AA minimum — maintain 4.5:1 text contrast ratio
7. Keyboard navigation and visible focus states on all interactive elements
8. Tap targets at least 48px in both dimensions
9. Never convey confidence, status or source by color alone
10. Mark Hindi text with `lang="hi"`; quoted policy clauses stay in the original English
11. Every screen that shows AI output carries the disclaimer, using the exact text in PRD section 9
