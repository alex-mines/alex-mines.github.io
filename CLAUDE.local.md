# p1-website: project context

## What this is
- CSCI 498E/598E Project 1: personal website on GitHub Pages. Due Tue 2026-09-22 (Canvas is the record). Individual, 20% of grade.
- Graded on judgment and process, not looks. Deliverables: live Pages URL, `DECISIONS.md`, `verification/` (screenshot.png with URL bar, fetch.txt, 3-line README), 3-5 min video, 3 classmate comments on Canvas.
- Site goal (DECISIONS.md Q1): personal portfolio/resume for employers, with a video-game feel.
- Plain HTML/CSS, no build step. Repo is public: no secrets, no private info in commits. Keep `.nojekyll`. Use relative paths only (`style.css`, never `/style.css`).
- `DECISIONS.md` is the user's own writing. Never answer its questions for them (Q3, the overruled-agent question, especially).

## Files
- `index.html`: deliverable page. Still template content plus the two feature lines (`cursor.css` link in head, `cursor.js` deferred before `</body>`). Keep free of test scaffolding.
- `style.css`: template base. `color-scheme: light dark`, body `max-width: 65ch`, centered. Do not edit for cursor work.
- `cursor.css`, `cursor.js`: the stickman cursor feature (self-contained, removable by deleting both plus the two lines in index.html).
- `cursor-test.html`: dev scaffolding with a button, text input, in-page anchor link, and filler for scrolling. Runs the `cursor-plan.md` verification checklist. Deletable later.
- `cursor-plan.md`: design doc and 21-step verification checklist. Source of truth for intent.
- `StickmanPack/**`: read-only sprite sheets. Reference by URL only, never modify. `JumpUp.png` is unused (identical to Jump.png cell r1c0).
- `RESOURCES.md`: design/accessibility guidance from the course.

## Stickman cursor: design (implemented, per cursor-plan.md)
- Not a CSS `cursor:`. A `position: fixed` `#stickman` div (64x64, `pointer-events: none`, max z-index, `aria-hidden`) tracks the pointer; native cursor hidden via `html.stickman-active, html.stickman-active * { cursor: none !important; }`. The class is added by JS only after init, so failures leave the normal arrow. The descendant rule is required: UA styles set cursor on links/inputs.
- Sprites are used as `mask-image` with `background-color: var(--stickman-ink, currentColor)` so the figure follows light/dark mode. Alpha is binary. Rendered 1:1 at 64px (do not scale; masks are not reliably pixelated). `mask-repeat: no-repeat`.
- Sheets (64px cells, contiguous frames from cell 0, `col = i % cols`, `row = i / cols | 0`): Idle 6f @8fps, Run 9f @14fps (faces right), Punch 10f @18fps (4x3 grid, last 2 cells empty), Jump 3f (2x2 grid, last cell empty) for ascent, JumpDown 1f for descent.
- One `requestAnimationFrame` loop does everything, in order: integrate position, edge auto-scroll, pick state, advance frame clock, write one transform + mask position. No style writes or scrolling from event handlers.
- Modes: `pointermove` sets follow mode (eased chase, speed capped, deadzone). W/A/S/D/Space/Enter set keys mode (velocity from held keys, clamped to viewport, diagonals normalized).
- State priority: punch (one-shot timer) > jump (independent ~450ms timer; up frames for t<0.5, JumpDown after) > run (speed > threshold) > idle. Flip with `scaleX(-1)` on leftward velocity; hold last facing at rest.
- Jump is a render-only parabolic offset (peak 40px). Tracked position and hotspot never move, so jumps cannot mis-aim a punch. Punch mid-jump is intended (air punch).
- Hotspot is cell center (32,32) (`HOTSPOT_X/Y` constants), so mirroring does not shift it. Accepted trade-off: the fist reaches ~15px past the click point.
- Enter: `preventDefault`, punch, `elementFromPoint(x, y)` -> `.closest(interactive)` -> focus + click; otherwise dispatch a bubbling MouseEvent click at the hotspot. Real mouse `pointerdown` also punches.
- Space: `preventDefault` on **keydown** (not keyup/keypress) to stop page-down scroll; ignore `e.repeat`; ignore if a jump is running.
- Edge auto-scroll: keys mode only (otherwise it fires whenever the mouse nears the bottom). Both top and bottom bands of 80px, measured against the hotspot not the drawing, speed ramps to 900 px/s at the edge, `window.scrollBy` (not smooth). No horizontal scroll. Wheel, arrows, PageUp/PageDown untouched.
- `shouldIgnoreKey(e)`: bail when target/activeElement is a typing control (input/textarea/select/contenteditable), when focus is on an interactive element (`a[href], button, input, select, textarea, summary, [tabindex]`), and (for Enter/Space) on auto-repeat. `keyup` is deliberately unguarded so keys cannot stick; `blur` releases all keys.
- Bail-outs: hard exit (no element, no listeners) if no `matchMedia`, not `(pointer: fine)`, or `prefers-reduced-motion: reduce`. Soft exit for the Escape toggle: element and listeners always built, `active` flag gates the loop, Escape is handled before the `active` check so it can be re-enabled. Preference persists in `localStorage['stickman-cursor']` ('on'/'off'), read at init and wrapped in try/catch.
- Not in this pass: making CSS `:hover` follow the stickman in keys mode (site has no hover styles yet).

## Dev environment
- Windows 11. `python3` resolves to the Microsoft Store stub and fails; use `py -m http.server 8000` from this folder, then open `http://localhost:8000/cursor-test.html`. Serve over http, not `file://`.
- Never trust an agent's "deployed OK" claim: check the live URL yourself (the P1 verification habit from lecture 03).

## Working notes
- This folder is its own git repo (origin on GitHub, branch `main`). `.idea/` is gitignored.
- Do not add Claude as a commit contributor (no Co-Authored-By or similar trailers).
- Follow the parent course rules: user directs, agent builds and narrates; never fill in DECISIONS.md, logs, or checklists for them.
- Keep responses concise, engineering language, token-efficient. Also point out what was missing or how the prompt phrasing could be improved.
