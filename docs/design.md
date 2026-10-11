# PolicySaathi Design System

This file is the source of truth for every visual decision in PolicySaathi. The `/design-system` skill enforces it. If something is not defined here, add it here first; do not invent a value in code.

**Status:** v2 — overrides v1. The palette, font and component polish below are deliberately modelled on [ContractIQ](https://contractaiapp.netlify.app/) at the user's explicit direction, superseding v1's "do not reuse the ContractIQ palette or fonts" rule. English-only UI: the product no longer ships Hindi copy in static interface chrome (labels, pills, tags, buttons). Confidence-meaning colours (green/amber/red) are still reserved for their one meaning and never used decoratively.

---

## 1. Design language: clean, modern, confident

PolicySaathi should feel like a sharp, modern SaaS product — the kind of clarity and polish a legal or finance tool uses to make dense documents feel approachable, not a government form and not a warm "family helper" app.

Three rules decide everything else:

1. **Colour is reserved for meaning.** Green, amber and red mean high, medium and low confidence. Red also means emergency. Ink (near-black) is the one primary action colour; blue is the one secondary accent (links, citation chips, tags). Never use green, amber or red for buttons, links or decoration.
2. **Built for one hand at a hospital desk.** Designed at 360px width first. Tap targets are at least 48px. Body text is at least 16px. The primary action sits at the bottom of the screen, within thumb reach.
3. **The source is always visible.** "From your policy" and "General guidance" look different at a glance. Every page citation looks tappable and opens the page.

Who it is for: a family member, 28 to 60, on a mid-range Android phone on a 4G connection, often stressed and short of time. UI copy is English only.

---

## 2. Colour tokens

Define every colour as a CSS variable in `globals.css`. Never write a hex value anywhere else.

### Brand and neutrals

| Token | Value | Use |
|---|---|---|
| `--color-brand` | `#0C0C0E` | Primary buttons — the one main action on a screen |
| `--color-brand-hover` | `#000000` | Pressed and hover state of the primary button |
| `--color-brand-tint` | `#F0F0F1` | Pressed state for secondary/text buttons, selected chip |
| `--color-on-brand` | `#FFFFFF` | Text and icons on brand (primary button label, emergency banner) |
| `--color-accent` | `#2F80D1` | Links, citation chips, "From your policy" tag, focus-adjacent highlights |
| `--color-accent-hover` | `#0D469E` | Pressed/hover state of accent elements |
| `--color-accent-tint` | `#E8F1FB` | Citation chip background, user chat bubble, clause quote background, selected state |
| `--color-bg` | `#F4F4F5` | Page background |
| `--color-surface` | `#FFFFFF` | Cards, assistant chat bubble, sheets, inputs |
| `--color-surface-sunken` | `#F0F0F1` | Disclaimer banner, skeleton loaders, disabled fields |
| `--color-text` | `#0C0C0E` | Body text and headings |
| `--color-text-muted` | `#6B6D76` | Labels, helper text, timestamps, disclaimer |
| `--color-text-disabled` | `#8F9193` | Disabled text only; never for readable content |
| `--color-border` | `#E6E7EA` | Card and divider lines (decorative) |
| `--color-border-strong` | `#C1C2C3` | Input and control outlines |
| `--color-focus` | `#115ACB` | Focus ring |

### Meaning colours

Each has a foreground for text and icons and a background for the pill or banner behind it. Values match ContractIQ's own status-colour scale, which already reserves green/red/amber for success/error/warning the same way this product needs.

| Meaning | Foreground token | Value | Background token | Value |
|---|---|---|---|---|
| High confidence, success | `--color-high` | `#0D720A` | `--color-high-bg` | `#E7F6E7` |
| Medium confidence, caution | `--color-medium` | `#B36800` | `--color-medium-bg` | `#FFF9F0` |
| Low confidence, error, emergency | `--color-low` | `#942528` | `--color-low-bg` | `#FAEBEB` |

Rules:
- `--color-brand` (ink) and `--color-accent` (blue) are never used to signal confidence or status.
- Green, amber and red are never used for decoration, buttons or links — only for confidence pills, the emergency banner, and inline status text.
- A meaning colour never appears alone. It always comes with an icon and a word (section 6.3).

There is no dark theme at MVP.

---

## 3. Typography

### Family

**Inter** for all UI text, loaded with `next/font/google`, weights 400, 500, 600, 700, `display: swap`.

Fallback stack: `Inter, system-ui, -apple-system, 'Segoe UI', sans-serif`.

UI copy — labels, buttons, pills, tags, headings, disclaimers — is English only. Free-form chat content (what a user types or an assistant answers) is unaffected by this and may contain any language the user writes in; it renders in the same font stack with the browser's normal script-fallback behaviour for any character Inter doesn't cover.

No monospace font. Policy clauses are shown in the clause quote block (section 6.6), in Inter.

### Scale

| Token | Size / line height | Weight | Use |
|---|---|---|---|
| `--text-display` | 32px / 40px | 600 | Landing headline, page titles |
| `--text-title` | 20px / 28px | 600 | Card titles, sheet titles, snapshot values |
| `--text-body` | 16px / 24px | 400 | Chat answers, body copy, inputs |
| `--text-body-strong` | 16px / 24px | 500 | Emphasis inside body, button labels |
| `--text-label` | 14px / 20px | 500 | Chips, tags, field labels |
| `--text-caption` | 13px / 18px | 400 | Timestamps, disclaimer, helper text |

Rules:
- Nothing readable is smaller than 13px, and nothing in a chat answer is smaller than 16px.
- No italics in buttons or labels; weight 500/600 carries emphasis instead.
- No all-caps labels.
- Numbers that matter (sum insured, limits, percentages) use weight 600–700.
- Amounts are written in Indian format with the rupee sign: ₹5,00,000.

---

## 4. Spacing, shape and elevation

### Spacing scale (4px base)

| Token | Value |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 24px |
| `--space-6` | 32px |
| `--space-7` | 48px |

- Page side padding: `--space-4`.
- Gap between cards: `--space-3`.
- Padding inside cards: `--space-4`.
- Gap between two tap targets: at least `--space-2`.

### Radius

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 8px | Inputs, quote blocks |
| `--radius-md` | 16px | Cards, sheets, floating panels |
| `--radius-pill` | 999px | Buttons with a text label, chips, tags, confidence pills |

Icon-only buttons (chat send, viewer controls, the dark-mode-style toggle pattern) are fully circular (`border-radius: 50%`), not `--radius-md`.

### Elevation

Cards carry a soft shadow plus a hairline border — ContractIQ's signature floating-panel look, not a flat line.

- `--shadow-card: 0 10px 40px rgba(20, 30, 60, 0.1)` — Policy Snapshot cards, document-status rows, any panel that should feel "lifted."
- `--shadow-float: 0 -2px 12px rgba(12, 12, 14, 0.08)` — sticky composer, bottom sheets.

---

## 5. Layout

- **Mobile first.** Design and test at 360 × 640. Content column is fluid up to a maximum of 560px, centred on larger screens. There is no separate desktop layout at MVP.
- **Zones on a policy screen, top to bottom:** app bar (56px) → content (scrolls) → sticky composer or primary action → safe-area padding.
- **Primary action at the bottom.** One primary button per screen, full width, in the bottom zone.
- **One column only.** No side-by-side panels on phones. The document viewer opens as a full-screen sheet over the chat.
- **Disclaimer placement:** a compact banner under the app bar on every screen that shows AI output.
- **Landing page hero:** small pill badge above the headline (e.g. "AI-Powered"), bold headline, one line of sub-copy, a single prominent primary button — ContractIQ's hero pattern, with PolicySaathi's own copy.
- **Page weight:** initial load at most 500 KB. No decorative images, no illustration library, no icon font.

---

## 6. Components

All interactive components have these states: default, pressed, focus-visible, disabled, and loading where relevant.

### 6.1 Buttons

| Variant | Background | Text | Border | Use |
|---|---|---|---|---|
| Primary | `--color-brand` | `--color-on-brand` | none | The one main action on a screen |
| Secondary | `--color-surface` | `--color-brand` | 1px `--color-border-strong` | Alternative action |
| Text | transparent | `--color-accent` | none | Low-emphasis action inside a card |
| Destructive | `--color-surface` | `--color-low` | 1px `--color-low` | Delete policy, delete account |

- Height 48px minimum, radius `--radius-pill`, label `--text-body-strong`.
- Pressed: primary uses `--color-brand-hover`; secondary/text use `--color-brand-tint` background.
- Disabled: `--color-surface-sunken` background, `--color-text-disabled` text.
- Loading: label replaced by a spinner plus a short word ("Uploading…"); the button keeps its width.

### 6.2 Inputs and OTP

- Text input: 48px high, `--color-surface` background, 1px `--color-border-strong`, radius `--radius-sm`, text `--text-body`. Label above in `--text-label`. Never use a placeholder as the label.
- Error: border `--color-low`, and a message below with the warning icon in `--color-low`.
- OTP input: six boxes, each 48 × 56px, digits in `--text-title`, numeric keypad, auto-advance, supports paste and SMS autofill.
- Chat composer: sticky at the bottom, multi-line up to four lines, send button 48 × 48px, circular, in brand.

### 6.3 Confidence pill

Used on every Policy Snapshot term.

| Level | Range | Icon (Lucide) | Label | Colours |
|---|---|---|---|---|
| High | 80% and above | `check-circle-2` | High | `--color-high` on `--color-high-bg` |
| Medium | 50 to 79% | `alert-circle` | Check this | `--color-medium` on `--color-medium-bg` |
| Low | below 50% | `alert-triangle` | Low | `--color-low` on `--color-low-bg` |

- Pill shape, `--text-label`, 16px icon, 28px high.
- Colour, icon and word always appear together.
- Low confidence also shows the line: "Low confidence. Please check this on page X."

### 6.4 Source tags

| Tag | Style | Text |
|---|---|---|
| Policy | Solid: `--color-accent` background, white text, `file-text` icon | From your policy |
| Guidance | Outlined: `--color-surface` background, 1px `--color-border-strong`, `--color-text-muted` text, `book-open` icon | General guidance, last verified <date> |

- Pill shape, `--text-label`, placed at the top of the answer.
- An answer that uses both sources shows two separate blocks, each with its own tag. Never merge them.

### 6.5 Citation chip

- Text "Page 12" with a `file-search` icon.
- `--color-accent-tint` background, `--color-accent` text, pill shape, 32px high with a 48px tap area.
- Tapping opens the document viewer at that page.
- If verification failed, the chip is replaced by a medium-confidence notice: "Could not verify this against the page."

### 6.6 Clause quote block

- Background `--color-accent-tint`, 3px left border in `--color-accent`, radius `--radius-sm`, padding `--space-3`.
- The clause stays in the original wording, in `--text-body`. The plain-language explanation follows below the block.

### 6.7 Chat

- **User bubble:** `--color-accent-tint` background, right-aligned, radius `--radius-md`, maximum width 85%.
- **Assistant bubble:** `--color-surface` background, `--shadow-card`, left-aligned, full width of the column.
- **Order inside an assistant answer:** source tag → direct answer → conditions that apply → clause quote block (if any) → citation chips → "Confirm with your insurer or TPA" line in `--text-body-strong` → feedback row (thumbs up, thumbs down).
- **Suggested-question chips:** outlined pills, horizontally scrollable, 40px high with a 48px tap area.
- **Waiting state:** three-dot typing indicator in `--color-text-muted`, then text streams in.

### 6.8 Policy Snapshot term card

- Card on `--color-surface`, `--shadow-card`, radius `--radius-md`.
- Row 1: term name in `--text-label`, muted.
- Row 2: value in `--text-title`, with the confidence pill on the right.
- Row 3: citation chip.
- Tapping the card expands it to show the source sentence in a clause quote block, a one-line plain meaning, and a "This looks wrong" text button.
- A term that was not found shows "Not found in your documents" in muted text, with no pill.
- Cards are grouped under the PRD's headings: Basics, What reduces a claim, When cover starts, What else is covered, What is not covered, Deadlines.

### 6.9 Upload

- One primary secondary-style button: "Choose PDF" (`file-up`).
- One line of helper text: "PDF only. Up to 5 MB and 60 pages."
- Each uploaded document shows as a row: file name and status (uploading with progress bar, processing, ready, failed with a Retry button), on `--shadow-card`.
- Missing-wording prompt: a medium-confidence banner with the PRD text.

### 6.10 Document viewer

- Full-screen sheet with a close button, page number ("Page 12 of 48") and previous/next controls, each 48px.
- Opens at the cited page. Where a text layer exists, the cited passage is highlighted with `--color-medium-bg`.
- If the file cannot be shown, fall back to the extracted text for that page.

### 6.11 Checklist

- Each item is a 48px-high row with a 24px checkbox, label in `--text-body`.
- Checked: checkbox filled with `--color-brand`, a `check` icon in white; the label stays fully readable (no strikethrough, no fading).
- A progress line above: "3 of 9 ready".

### 6.12 Banners and notices

| Type | Style | Use |
|---|---|---|
| Disclaimer | `--color-surface-sunken` background, `--text-caption`, muted text, `info` icon | Every screen with AI output |
| Notice | Meaning background and foreground, icon, one or two lines | Missing wording, low OCR quality, could-not-verify |
| Error | Low colours, `alert-triangle`, message, Retry button | Upload failed, chat failed, n8n unavailable |
| Emergency | Solid `--color-low` background, `--color-on-brand` text, `phone` icon, full width | Emergency or distress language only |

- The emergency notice is the only solid red element in the product. It shows the number 112 as a tap-to-call button and pauses the normal chat flow.
- The disclaimer uses the exact text from PRD section 9. Do not paraphrase it.

---

## 7. Icons

- Library: **Lucide React**. No other icon set, no emoji in the interface.
- Sizes: 20px in buttons and rows, 16px inside pills and chips, 24px in the app bar.
- Stroke width 2. Icon colour follows the text colour beside it.
- An icon that carries meaning has a text label or an `aria-label`. Decorative icons use `aria-hidden="true"`.

---

## 8. Motion

| Token | Value | Use |
|---|---|---|
| `--motion-fast` | 150ms ease-out | Fades, pressed states, chip selection |
| `--motion-base` | 250ms ease-out | Card expand, sheet open and close |

- Motion only explains: an answer arriving, a card opening, upload progress.
- No decorative animation, no parallax, no auto-playing motion.
- Respect `prefers-reduced-motion`: replace movement with an instant change.

---

## 9. States

Every screen and data component defines all of these:

| State | Pattern |
|---|---|
| Loading | Skeleton blocks in `--color-surface-sunken` matching the final layout; no full-screen spinners |
| Empty | One line saying what belongs here and one primary action ("Upload your policy") |
| Error | Error banner with the reason in plain words and a Retry button; nothing is lost |
| Slow connection | After 5 seconds of waiting, add the line "This is taking longer than usual. Your upload is safe." |
| Not found | "I can't find this in your documents." shown as a normal answer, not as an error |

---

## 10. Voice and wording

- Plain words, short sentences, the direct answer first. Reading level suitable for a Class 8 reader.
- Every insurance term is explained in one plain line the first time it appears in an answer.
- UI copy is English only. Free-form chat input and answers may be in any language the user and the LLM use; the interface chrome around it does not switch language.
- Never promise an outcome. Use "Your policy says…" and never "You will get…".
- Buttons name the action: "Upload policy", "Draft letter", "Delete this policy". Never "OK" or "Submit".

---

## 11. Accessibility

- WCAG 2.1 AA minimum. Text contrast at least 4.5:1; control outlines and icons at least 3:1.
- Tap targets at least 48 × 48px, with at least 8px between them.
- Visible focus on every interactive element: 3px outline in `--color-focus`, 2px offset.
- Meaning is never carried by colour alone.
- Everything works with the system font size raised to 200% without loss of content.
- Every input has a visible label. Errors are announced and linked to their field.
- The chat answer area is a polite live region so screen readers announce new answers.
- Full keyboard operation for the web app.

---

## 12. What not to do

- Do not add a third brand/accent colour beyond ink (`--color-brand`) and blue (`--color-accent`).
- Do not use green, amber or red for buttons, links, charts or decoration.
- Do not hide the source tag, citation chip or disclaimer to save space.
- Do not add Hindi (or any non-English) copy to static UI chrome — labels, buttons, pills, tags, headings. This does not restrict what a user types in chat or what the assistant answers in chat.
