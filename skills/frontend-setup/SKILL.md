---
name: frontend-setup
description: >
  Scaffolds the PolicySaathi frontend in `policysaathi/`: a Next.js 14 (App Router)
  project with TypeScript, set up as a mobile-first installable PWA with a bilingual
  (English and Hindi) landing page, then runs the app end to end.
  Use this skill whenever the user asks to:
  - Set up the Next.js project or folder structure
  - Bootstrap the frontend with all dependencies
  - Get the landing page up and running
  - Start the app project (even casually, e.g. "let's set up Next.js" or "new Next app")
---

# Frontend Setup Skill

Scaffold a complete Next.js 14 (App Router) project by writing all files, then start the dev server.

**Stack: Next.js 14 + TypeScript.** If the engineering document specifies something different, confirm with the user before using it. Never switch stacks silently.

All application code lives in `policysaathi/`. Documents never go inside the app folder.

Do every step in order.

---

## Step 1 — Read the engineering document and design system

Read `docs/engineering/engineering-doc.md`. Take from it:
- The folder structure (section "Folder Structure")
- Any additional dependencies (UI library, state management)

Read `docs/design.md`. Take the color tokens and fonts from it.

If the engineering document names a different framework or language, ask with `AskUserQuestion`:
- **Question:** "The engineering doc specifies [X]. Use that, or the default (Next.js 14 + TypeScript)?"

If `docs/design.md` does not exist, tell the user the scaffold will use neutral placeholder tokens and that `/design-system` must be run before any feature UI is built.

---

## Step 2 — Confirm the project folder

Use `AskUserQuestion`:

**Question:** "Scaffold the app in `policysaathi/` at the repository root?"
**Options:**
- **Yes, use `policysaathi/`** (default)
- **Use a different folder** — the user types the path

**Never delete a folder.** If the chosen folder exists and is not empty, list what is in it and ask before overwriting any file.

---

## Step 3 — Create the folders

Create `policysaathi/` with `src/app/` and `public/`. Add the empty folders named in the engineering document's folder structure (for example `src/lib/n8n/`, `src/lib/security/`, `src/components/`), each with a `.gitkeep`.

---

## Step 4 — Write `package.json`

```json
{
  "name": "policysaathi",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^14.2.25",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "typescript": "^5"
  }
}
```

This app protects its routes in middleware, so do not pin an old Next.js 14 patch release. Check the current Next.js security advisories and use a patched version.

---

## Step 5 — Write `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## Step 6 — Write `next.config.mjs`

```js
/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
```

---

## Step 7 — Write `src/app/manifest.ts` (PWA)

```ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PolicySaathi',
    short_name: 'PolicySaathi',
    description: 'Know what your health policy pays, before the bill.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
```

Replace `background_color` and `theme_color` with the surface and primary tokens from `docs/design.md` when it exists. Tell the user the two icon files must be added to `public/`; do not invent a logo.

---

## Step 8 — Write `src/app/layout.tsx`

```tsx
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PolicySaathi',
  description: 'Know what your health policy pays, before the bill.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

If `docs/design.md` names fonts, load them with `next/font` here, including a Devanagari face for Hindi.

---

## Step 9 — Write `src/app/globals.css`

All colors live here as CSS variables and nowhere else. If `docs/design.md` exists, use its token names and values. If not, use the neutral placeholders below and keep the comment.

```css
/* PLACEHOLDER TOKENS — replace with docs/design.md before building feature UI */
:root {
  --color-surface: #ffffff;
  --color-text: #1a1a1a;
  --color-text-muted: #555555;
  --color-primary: #1a4fd6;
  --color-on-primary: #ffffff;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, 'Noto Sans Devanagari', sans-serif;
  background: var(--color-surface);
  color: var(--color-text);
  line-height: 1.6;
}

.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1rem;
  padding: 1.5rem 1rem;
  max-width: 32rem;
  margin: 0 auto;
}

.headline { font-size: 1.75rem; font-weight: 700; line-height: 1.25; }
.headline-hi { font-size: 1.25rem; color: var(--color-text-muted); }

.btn-primary {
  display: block;
  min-height: 48px;
  padding: 0.875rem 1.5rem;
  border-radius: 12px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-weight: 600;
  font-size: 1rem;
  text-align: center;
  text-decoration: none;
}
.btn-primary:focus-visible { outline: 3px solid var(--color-text); outline-offset: 2px; }

.disclaimer { font-size: 0.8125rem; color: var(--color-text-muted); }
```

---

## Step 10 — Write `src/app/page.tsx` (the landing page)

> **Server Component rule:** `page.tsx` is a Server Component. Never use `onClick`, `onMouseOver` or any other event handler prop here. Use CSS classes for hover and focus effects. Add `'use client'` only to components that need state, effects or browser events.

```tsx
export default function Home() {
  return (
    <main className="page">
      <h1 className="headline">Know what your health policy pays, before the bill.</h1>
      <p className="headline-hi" lang="hi">
        बिल आने से पहले जानिए, आपकी हेल्थ पॉलिसी क्या देगी।
      </p>
      <a href="/login" className="btn-primary">Check my policy</a>
      <p className="disclaimer">{/* Use the exact disclaimer text from PRD section 9 */}</p>
    </main>
  )
}
```

Fill the disclaimer with the exact text from PRD section 9; do not paraphrase it. The Hindi headline is a draft and needs the user's approval. The sign-in page does not exist yet; it is built in Stage 4. Say all three things to the user.

---

## Step 11 — Show the final folder structure

```
policysaathi/
├── next.config.mjs
├── package.json
├── tsconfig.json
├── public/                 ← add icon-192.png and icon-512.png
└── src/
    └── app/
        ├── layout.tsx      ← root layout (metadata, viewport)
        ├── manifest.ts     ← PWA manifest
        ├── globals.css     ← design tokens and base styles
        └── page.tsx        ← bilingual landing page
```

Plus the empty folders from the engineering document.

---

## Step 12 — Run the app

```bash
cd <project-path> && npm install && (nohup npm run dev -- --port 3000 > dev-server.log 2>&1 &)
sleep 8 && cat dev-server.log
```

Then run `npm run typecheck`. Zero errors required.

**If the server starts**, tell the user:
> Your Next.js app is scaffolded and running in `policysaathi/` at **http://localhost:3000**. Open it at phone width to check the layout. Let me know when you're ready to move to Stage 4 — Feature Implementation.

**If npm is blocked or the server fails**, give the user:

```bash
cd policysaathi
npm install && npm run dev
```

---

## Notes

- Mobile first. The primary user is on a mid-range Android phone on a 4G hospital connection. Keep the initial page light; do not add a UI library unless the engineering document names one.
- Tap targets are at least 48px high.
- No hex values outside `globals.css` and `manifest.ts`.
- Port 3000 is the default. If it is in use, try 3001.
- Use the App Router. Do not use `pages/` unless the user asks.
- Do not explain every file. Confirm each was written, then move on.
