# DeckMint

**deckmint.app** — A beautiful, desktop-feeling web application for structured AI image prompt management and generation.

It feels like a native creative tool (tight spacing, system fonts, excellent keyboard feel) while being a pure web app that you can run in any modern browser or install as a PWA.

Built from the principles in the May 2026 article “How to Use GPT-5.5 and ChatGPT Images 2.0” — focused on **usable, production-grade content** (IG cards, carousels, infographics, mockups, etc.) rather than generic art prompts.

## Core philosophy

- The 30 prompt templates are **first-class structured data**, not blobs.
- Every prompt has been reviewed and **honed tighter** for the image model: explicit proportions, exact on-image text quoted, consistency rules for series, clear guardrails.
- The UI exposes the article’s recommended six-part structure (Subject, Use case, Layout, Color, Typography, On-image text) as editable fields.
- Strong support for **carousel series consistency** and the **preserve / change** local-edit pattern.
- Beautiful, instantly recognizable visual mocks for every template (no waiting for generation just to browse).

## Current state (MVP+)

- Full library of all 30 honed templates with rich metadata
- Live variable replacement with sensible defaults from the article
- Prompt output updates instantly — one-click copy
- Smart CSS-based thumbnails that reflect the actual layout/color/type of each prompt
- **True structured 6-part editor** (Subject / Use case / Layout / Color / Typography / Style / exact on-image text) — the real prompt CMS heart
- Custom templates (save your structured edits as first-class reusable recipes; appear in a dedicated "Custom" filter, fully editable, deletable, and selectable)
  - Inline rename directly in the inspector header
  - Duplicate as new (copies live structured values)
  - Quick actions on custom cards (add to series, duplicate, delete)
  - "Apply these structured edits to entire current series" — propagate a refined recipe across a whole carousel in one click (from Structured tab or custom header)
- **Series builder** — drag-to-reorder (native), "Lock style from first" (enforces color/typography/style consistency across a carousel), per-slide private production notes, divergence indicators ("style ≠ first"), "S" badges, and rich exports (JSON pack + clean Markdown with notes and exact prompts)
- **Saved series packs / collections** — name and persist multiple carousels (with their notes and custom references). Load them from a list in the sidebar. "Save as pack" button right in the builder. Everything local-first.
- **Local asset production** — from any structured edit you can one-click export a real PNG that matches the visual you see + the exact prompt as a .txt sidecar. Full browsable history of everything you produced, with "load back into editor" and "use as reference for Edit Existing".
- Local-first persistence (structured edits, custom templates, current + saved series + notes + all your generated PNGs + prompts survive refresh)
- Dedicated “Edit Existing Image” mode using the preserve/change workflow
- Refined desktop aesthetic that feels excellent on macOS (system fonts, proper density, subtle borders) while working beautifully everywhere as a web app / PWA
- Customs integrate directly into series (add a saved custom template to a carousel and it exports with its full structured prompt)

## Tech stack

- React 19 + TypeScript + Vite
- Tailwind 4 + beautiful desktop-oriented design tokens (tight spacing, system fonts, subtle borders, Mac-like density)
- Zustand for state
- Framer Motion + Sonner + cmdk (power-user interactions and feedback)
- Pure-CSS smart visual mocks for all 30 templates (instant, distinctive, no external images or generation needed to browse)

This gives us **maximum flexibility for the best output and graphics** (live structured 6-part editor, visual zone previews later, real AI image generation integration, drag-and-drop series, etc.) while feeling like a polished creative desktop tool — not a generic website.

## Getting started (web dev mode)

```bash
cd deckmint   # (or the folder you cloned/renamed it to)
npm install
npm run dev
```

The app runs at http://localhost:1420.

You can install it as a Progressive Web App (PWA) from Chrome, Edge, or Safari for a more app-like experience (Add to Dock / desktop shortcut). No native compilation required.

## Roadmap focus (high-value directions)

1. Install Rust (if you don’t have it):
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. Install Tauri CLI (or use the one already in devDependencies):
   ```bash
   cargo install tauri-cli
   # or
   npm run tauri -- --version
   ```

3. The `src-tauri` folder and `tauri.conf.json` are already set up in this repo. You can run:
   ```bash
   npm run tauri dev
   ```

   This will compile the Rust side and give you a native window with the webview inside — still fast iteration.

(The native build instructions have been removed. This is now a pure web/PWA project focused on the prompt CMS experience.)

## Data model & honing notes

All 30 prompts live in `src/data/prompts.ts` as strongly typed `PromptTemplate` objects.

Each contains:
- Decomposed fields (layout, color, typography, style, on_image_text_structure…)
- Explicit `variables` + `defaults`
- A **honed `base_prompt`** (the one we actually output after substitution) that follows the article’s own advice more strictly than the raw source text
- `original_prompt` for reference / provenance
- `thumbnail_visual` + `visual_type` + `series_role` + `consistency_guidance`

While porting the article I tightened almost every prompt:
- Made on-image text explicitly “render these strings EXACTLY…”
- Added proportions and zone guidance
- For carousel interiors/closers: strong “must match the cover exactly” language
- Added “no other text”, “text must be crisp and contained”, legibility guardrails
- Clarified variable slots so the replacement UI is obvious and safe

The goal is the highest possible success rate when the user pastes the final prompt into ChatGPT Images 2.0 / gpt-image-2 / equivalent.

## Roadmap (from the original brief + our direction)

MVP (mostly here)
- [x] All 30 as structured data + honed prompts
- [x] Browse + filter + select
- [x] Live variable editing + copy
- [x] Visual thumbnail mocks
- [x] True structured 6-part editor (the prompt CMS)
- [x] Custom templates (save, browse, edit/rename inline, duplicate, quick actions, use in series, apply-to-series propagation)
- [x] Series builder with drag reorder, style lock from first, per-slide notes, divergence cues, customs in series, rich exports (JSON + Markdown)
- [x] Saved series packs / collections (name, persist, load from sidebar, "Save as pack")
- [x] Command palette (⌘K / Ctrl+K global — fast search + every important production action)
- [x] Live visual preview in the Structured editor (and on custom cards + generation history) — a rich reactive mock that reflects Color, Layout, Typography, On-image text, and Subject as you type. The "visual zone preview" that makes the CMS feel like a real production visual tool.
- [x] Real local asset workflow: "Generate / Export as PNG + prompt" buttons produce actual downloadable PNGs (rendered from the live structured preview) + the exact prompt as a sidecar. Full history of your produced visuals + prompts is saved locally, browsable, re-loadable into the editor, and usable as references for the Edit Existing flow. No external services or keys required.
- [x] Local persistence for edits + customs + live series + saved packs + notes
- [x] Preserve/Change edit mode
- [x] Cross-platform desktop aesthetic (feels excellent on macOS, solid on Windows/Linux — not a website clone)

Next (high-value items, all cross-platform)
- ~~True structured 6-part editor~~ (done — live, with per-field reset, override accenting, live assembled output, and "Save as custom template")
- ~~Drag-to-reorder + consistency enforcement + per-slide notes in the Series builder~~ (done — native DnD, "Lock style from first", divergence badges, inline notes, customs in series, Markdown + JSON export)
- ~~Custom user templates + direct integration into series~~ (done)
- ~~Rich exports (Markdown packs with notes, ready-to-paste bundles)~~ (done)
- Real image generation integration (optional/pluggable layer — "Generate preview" stubs exist; no AI lives in the core product by design)
- Per-template “Generate preview image” using the model + local caching (optional path)
- Visual zone / layout canvas preview that reflects the structured fields
- Collections, favorites, saved packs, import/export of full projects
- ~~Command palette~~ (done — ⌘K / Ctrl+K from anywhere: instant search + jump to any template or custom, plus the important production actions: add to series, lock style, apply structured to series, save/load packs, save as custom, etc. Feels like a real desktop creative tool)
- Platform-native touches (PWA install already works great; deeper OS integration can come later if desired)

All of the above are implementable in the current stack without forking the experience per OS.

## Philosophy reminder

This is not a generic prompt playground. It is a **prompt CMS + generator** whose value is making the article’s production system operational: structured, searchable, editable, reusable, and exportable at the quality level required for real social, blog, and marketing assets.

Enjoy building with it.

— The DeckMint project (deckmint.app)
