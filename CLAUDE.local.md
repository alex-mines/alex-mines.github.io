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
- `adventures.html`: second deliverable page, "Off the Clock". Comic field journal of the three backpacking/roadtrip stories (Ch. 6), summer sports (Ch. 7), and skiing (Ch. 8), built from `Resume Resources/Personal.md`. Loads `style.css`, `lightbox.css`, `cursor.css`, and both scripts.
- `style.css`: site styles, shared by both pages. Bangers + Atkinson Hyperlegible, paper/ink/red accent/caption yellow tokens, dark mode via `prefers-color-scheme`, sets `--stickman-ink`. Also holds `.issue-nav` (the masthead nav between pages) and the `.spread`/`.strip`/`.shot-frame` photo grid.
- `lightbox.css`, `lightbox.js`: click-to-enlarge photo viewer, self-contained the way the cursor is. Photos are plain links to the full-size file, so deleting both files leaves them working. `lightbox.js` takes Escape in the capture phase so it does not also toggle the stickman.
- `img/headshot.jpg`: 600x800 web crop of the headshot, re-encoded (no EXIF).
- `img/<trip>/*.jpg`: web copies of the trip photos, 1600px long edge plus a `-thumb` at 700px, all EXIF stripped. Folder names are lowercase-hyphenated because GitHub Pages is case-sensitive and Windows is not. HEIC originals live in `Resume Resources/Photo Originals/` (gitignored) and must never be committed: browsers do not render HEIC.
- `cursor.css`, `cursor.js`: stickman cursor feature, self-contained.
- `cursor-test.html`: dev test page for the cursor. Deletable later.
- `cursor-plan.md`: cursor design doc and verification checklist. Source of truth for cursor behavior; read it before changing the cursor.
- `StickmanPack/**`: read-only sprite sheets. Reference by URL, never modify.
- `RESOURCES.md`: design/accessibility guidance from the course.
- `Resume Resources/`: source material for site content (see above).

## Stickman cursor (implemented)
- A sprite-animated stickman replaces the native cursor: follows the mouse, or moves with W/A/S/D or the arrow keys, Space jumps, Enter/click punches (and clicks what it hits). Keys mode auto-scrolls near the top/bottom edges.
- Sprites are CSS masks tinted by `currentColor`, so the figure follows light/dark mode.
- Accessibility: disabled for touch/coarse pointers and `prefers-reduced-motion`; Escape toggles it (persisted in `localStorage`); keys are ignored while typing in form controls. Failure leaves the normal cursor.
- Removable by deleting `cursor.css`, `cursor.js`, and their two lines in `index.html`. Keep it isolated from `style.css`.

## Dev environment
- Windows 11. `python3` resolves to the Microsoft Store stub and fails; use `py -m http.server 8000` from this folder, then open `http://localhost:8000/`. Serve over http, not `file://`.
- `Pillow` and `pillow-heif` are installed into that Python (via `py -m ensurepip` then `py -m pip install`). They are what convert HEIC photos to web JPEGs; nothing on the site depends on them at runtime.
- The filesystem is case-insensitive but GitHub Pages is not, so a folder that differs only in case silently merges locally and 404s live. Check image paths against `git ls-files`, not against a local server.
- Never trust an agent's "deployed OK" claim: check the live URL yourself (the P1 verification habit from lecture 03).

## Working notes
- This folder is its own git repo (origin `alex-mines/alex-mines.github.io`, branch `main`). `.idea/` is gitignored.
- Do not add Claude as a commit contributor (no Co-Authored-By or similar trailers).
- Follow the parent course rules: user directs, agent builds and narrates; never fill in DECISIONS.md, logs, or checklists for them.
- Keep responses concise, engineering language, token-efficient. Also point out what was missing or how the prompt phrasing could be improved.
