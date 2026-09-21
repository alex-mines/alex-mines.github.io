# p1-website: project context

## What this is
- CSCI 498E/598E Project 1: personal website on GitHub Pages. Due Tue 2026-09-22 (Canvas is the record). Individual, 20% of grade.
- Graded on judgment and process, not looks. Deliverables: live Pages URL, `DECISIONS.md`, `verification/` (screenshot.png with URL bar, fetch.txt, 3-line README), 3-5 min video, 3 classmate comments on Canvas.
- Site goal (DECISIONS.md Q1): personal portfolio/resume for employers, with a video-game feel.
- Plain HTML/CSS, no build step. Repo is public: no secrets, no private info in commits. Keep `.nojekyll`. Use relative paths only (`style.css`, never `/style.css`).
- `DECISIONS.md` is the user's own writing. Never answer its questions for them (Q3, the overruled-agent question, especially).

## Visual style
- Comic-book look with retro styling: fun display fonts (e.g. Google Fonts comic/retro faces) for headings, bold outlines, halftone/panel-style sections, saturated colors.
- Must coexist with the video-game stickman cursor and stay readable: body text in a legible font, sufficient contrast in light and dark mode (see `RESOURCES.md`).

## Content source
- Personal info (experience, education, skills, photo) comes from `Resume Resources/`: `current resume.pdf`, `headshot.jpg`, `Unofficial Transcript.pdf`. Use these instead of inventing content; ask when something is missing.
- The repo is public: only publish what belongs on a resume. Never put transcript details (grades, student ID) or contact info the user has not approved on the site or in commits.

## Files
- `index.html`: deliverable page. First content draft (comic-issue layout, game-named chapters) plus the cursor's two lines (`cursor.css` in head, deferred `cursor.js` before `</body>`). Keep free of test scaffolding.
- `style.css`: site styles. Bangers + Atkinson Hyperlegible, paper/ink/red accent/caption yellow tokens, dark mode via `prefers-color-scheme`, sets `--stickman-ink`.
- `img/headshot.jpg`: 600x800 web crop of the headshot, re-encoded (no EXIF).
- `cursor.css`, `cursor.js`: stickman cursor feature, self-contained.
- `cursor-test.html`: dev test page for the cursor. Deletable later.
- `cursor-plan.md`: cursor design doc and verification checklist. Source of truth for cursor behavior; read it before changing the cursor.
- `StickmanPack/**`: read-only sprite sheets. Reference by URL, never modify.
- `RESOURCES.md`: design/accessibility guidance from the course.
- `Resume Resources/`: source material for site content (see above).

## Stickman cursor (implemented)
- A sprite-animated stickman replaces the native cursor: follows the mouse, or moves with W/A/S/D, Space jumps, Enter/click punches (and clicks what it hits). Keys mode auto-scrolls near the top/bottom edges.
- Sprites are CSS masks tinted by `currentColor`, so the figure follows light/dark mode.
- Accessibility: disabled for touch/coarse pointers and `prefers-reduced-motion`; Escape toggles it (persisted in `localStorage`); keys are ignored while typing in form controls. Failure leaves the normal cursor.
- Removable by deleting `cursor.css`, `cursor.js`, and their two lines in `index.html`. Keep it isolated from `style.css`.

## Dev environment
- Windows 11. `python3` resolves to the Microsoft Store stub and fails; use `py -m http.server 8000` from this folder, then open `http://localhost:8000/`. Serve over http, not `file://`.
- Never trust an agent's "deployed OK" claim: check the live URL yourself (the P1 verification habit from lecture 03).

## Working notes
- This folder is its own git repo (origin `alex-mines/alex-mines.github.io`, branch `main`). `.idea/` is gitignored.
- Do not add Claude as a commit contributor (no Co-Authored-By or similar trailers).
- Follow the parent course rules: user directs, agent builds and narrates; never fill in DECISIONS.md, logs, or checklists for them.
- Keep responses concise, engineering language, token-efficient. Also point out what was missing or how the prompt phrasing could be improved.
