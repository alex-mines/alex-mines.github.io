# Stickman custom cursor for p1-website

## Context

`work/p1-website` is still the untouched P1 template: an `index.html` with a heading and two paragraphs, a small `style.css`, and a `StickmanPack/` folder of sprite sheets that nothing currently uses. The goal is to replace the ordinary mouse pointer with an animated stick figure that can be driven two ways, by chasing the mouse or by WASD with Enter to click, using the Run sheet while moving and the Punch sheet on click. Only the cursor is in scope; the rest of the page stays a blank template. The sprite sheets are read-only and must not be modified.

Four sprite states are in this pass: **Idle** at rest, **Run** while moving, **Punch** on Enter, and **Jump** on Space. Because Space is normally the page-down key, the stickman also takes over vertical scrolling in keyboard mode: Space stops scrolling the page, and walking into the top or bottom edge of the viewport scrolls it instead.

This is also the lecture 06 lab exercise, so the plan is the deliverable for now. `work/06/lab/feature-plan.md` has slots for you to fill in yourself, in your own words, and I will not write them for you.

## Information already gathered

The one real unknown was sprite geometry, and it is now measured rather than assumed:

| Sheet | Pixels | Grid (64x64 cells) | Frames |
|---|---|---|---|
| `StickmanPack/Idle/Thin.png` | 384 x 64 | 6 cols x 1 row | 6 |
| `StickmanPack/Run/Run.png` | 576 x 64 | 9 cols x 1 row | 9, figure faces **right** |
| `StickmanPack/Punch/Punch.png` | 256 x 192 | 4 cols x 3 rows | **10** (cells r2c2 and r2c3 are empty) |
| `StickmanPack/Jump/Jump.png` | 128 x 128 | 2 cols x 2 rows | **3** (cell r1c1 is empty): crouch, rising, full extension |

All row and column references in this document are **0-indexed**, and this matters more than it looks. In both sheets the empty cells are the **last** cells, so frames stay contiguous from cell 0 and the naive mapping in the animation table below (`col = i % cols`, `row = (i / cols) | 0`) plus an explicit frame count is correct. Had the blanks been interior, that mapping would have drawn two blank frames mid-animation and silently dropped the last two real ones.
| `StickmanPack/Jump/JumpDown.png` | 64 x 64 | single frame | 1: falling, arms out and legs tucked |
| `StickmanPack/Jump/JumpUp.png` | 64 x 64 | single frame | **unused, see below** |

Also confirmed by decoding the pixels: every sheet is 32-bit RGBA, and **alpha is strictly binary, 0 or 255, on every sheet, with no anti-aliasing at all**. That binary alpha is the fact the mask approach rests on, because `mask-image` masks by alpha, so a hard-edged shape recolors cleanly.

The ink is *almost* one color, `#141013`, but not quite: `Punch.png` also carries **14 pixels of pure `#000000`**, all in cell r1c3 (frame index 7), tracing the extended punching arm from (31,26) to (44,31). This has no effect under alpha masking, since both colors are fully opaque, and it is recorded here only because it would start to matter if anyone later switched to `mask-mode: luminance` or used a sheet as a plain `background-image`.

Where the figure sits inside its 64x64 cell varies by sheet, so there is no single bounding box:

| Sheet | x range | y range |
|---|---|---|
| Idle | 23..36 | 9..60 |
| Run (union of 9 frames) | 9..48 | 9..60 |
| Punch (union of 10 frames) | 19..47 | 8..60 |
| Jump | 22..36 | 6..60 |
| JumpDown | 15..41 | 9..58 |

The union is roughly **x 9..48, y 6..60**. Note the feet sit at y=60 in nearly every sheet, so the figure fills the cell vertically and is not centred in it; this is what the hotspot decision below has to account for.

**`JumpUp.png` is redundant.** A pixel-exact comparison shows it is byte-for-byte identical to `Jump.png` cell r1c0, zero differing pixels out of 4096. `JumpDown.png`, by contrast, is a genuinely distinct pose that does **not** appear anywhere in `Jump.png`. So a complete jump is `Jump.png` for the ascent plus `JumpDown.png` for the descent, and `JumpUp.png` is never loaded. Jump is the only state in this feature that spans two files.

Nothing else needs to be acquired. Two gaps worth naming, both about the page rather than the assets:

- `index.html` currently contains **no links, no buttons, and no form fields**, so there is nothing for Enter to click and no way to test that WASD and Space stay out of the way while typing.
- The page is also **shorter than one viewport**, a heading and two paragraphs, so it does not scroll at all. Neither the Space suppression nor the edge auto-scroll can be observed on it as it stands.

Rather than putting throwaway scaffolding into `index.html`, which is the actual P1 deliverable page, the plan adds a **separate `cursor-test.html`** carrying one `<a>`, one `<button>`, one `<input type="text">`, and enough filler to make the page a few screens tall, with the test link below the fold. `index.html` gets only the two lines that load the feature. The test page can be deleted once the real site content exists, or kept as a dev page.

## Decisions made

- **Not a real CSS cursor.** `cursor: url()` cannot animate and is size-capped in several browsers. The stickman is a `position: fixed` DOM element tracking the pointer in viewport coordinates, and the native arrow is hidden with `cursor: none`.
- **Chase with lag.** The sprite eases toward the pointer at a capped speed, plays Run while catching up and Idle once it arrives. Snapping exactly to the pointer would flash two or three Run frames per movement and read as flicker.
- **Idle is a real looping state**, `Idle/Thin.png` at 6 frames, not a held Run frame. A cursor is stationary most of the time, so this is the state the user actually looks at, and a frozen frame would make the whole thing read as broken rather than at rest. It runs slower than Run (around 8 fps against 14) so resting does not look twitchy.
- **Jump is a render offset, not a move.** The stickman flies freely in both axes, so there is no ground plane and no gravity to jump against. Space therefore plays the jump sprites while applying a temporary parabolic offset to the **drawing only**. The tracked position and the hotspot stay exactly where they were, which means a jump can never mis-aim a punch, and in follow mode the arc does not fight the chase that would otherwise pull the sprite straight back down. Same principle as the punch: animation without moving the hotspot.
- **Enter really activates.** Punch animation plus `document.elementFromPoint()` at the hotspot, then focus and click whatever is there. The stickman becomes a real input device rather than decoration.
- **Space never scrolls, and edge auto-scroll replaces it.** Space is the page-down key in every browser, so jumping without suppressing it would page the document down on every press. Suppressing it removes a scrolling affordance, so the stickman gets its own: walking into the top or bottom band of the viewport scrolls the page. The two changes are one decision, not two, and shipping the first without the second would leave keys mode with no way to move down a long page. Arrow keys, PageUp/PageDown, and the wheel are all untouched and still scroll normally.
- **Mask, not image.** The PNGs are used as `mask-image` with `background-color`, so the figure takes a CSS color and stays visible in both light and dark mode. `style.css` sets `color-scheme: light dark`, so a hard-coded black stickman would vanish on a dark background. The assets are still never modified, only referenced.
- **Rendered at native 64px, 1:1.** `image-rendering: pixelated` is not reliably honored on masks, so the way to keep a 1px-line drawing crisp is to never scale it. Changing the display size later means revisiting this.
- **JS-driven frames, not CSS `steps()`.** A CSS keyframe animation handles the single-row Idle and Run loops fine, but Punch is one-shot and wraps across three rows, and Jump is one-shot, timed to a physical arc, and split across two files. One `requestAnimationFrame` loop drives all five sheets uniformly and keeps the awkward cases from needing their own special handling.

## Files

**New — `work/p1-website/cursor.css`**

- `.stickman-active` on `<html>` (added by JS only after successful init) carries `cursor: none`, so a JS failure or a blocked script leaves the normal arrow rather than an invisible one. It has to be written as `html.stickman-active, html.stickman-active * { cursor: none !important; }` rather than a bare rule on `<html>`: `cursor` does inherit, but browser UA stylesheets set `cursor: pointer` on `a:any-link` and `cursor: text` on text inputs and textareas, and those UA rules beat an inherited value. Without the descendant rule the native pointer comes back on exactly the link, button, and input the test page adds, which is the most visible way this feature can look half-finished.
- `#stickman`: `position: fixed; left: 0; top: 0; width: 64px; height: 64px; pointer-events: none; z-index: 2147483647; will-change: transform;` and the mask block, both prefixed and unprefixed (`-webkit-mask-*` is still needed for Safari).
- `mask-repeat: no-repeat` explicitly, since the CSS default is `repeat`. None of the frame offsets in this plan actually tile into the visible 64x64 box, so this fixes no current bug; it is one line of insurance for the moment a sheet or the display size changes.
- Mask URLs written **relative** (`url("StickmanPack/Run/Run.png")`, never a leading `/`). `cursor.css` sits at the repo root so this resolves correctly, and the P1 README calls leading-slash paths the single most common way this project breaks.
- The sheet, sheet size, and frame offset come from CSS custom properties that JS sets; the color comes from one `--stickman-ink` variable defaulting to `currentColor`.
- **No `@media (prefers-reduced-motion: reduce)` block.** An earlier draft had one paired with the JS bail-out, but the two contradict each other: the JS bails out before creating the element or adding `.stickman-active`, so a CSS block targeting them could never apply to anything. Reduced motion is handled in JS only.

**New — `work/p1-website/cursor.js`** (loaded `defer`, creates its own DOM, so a no-JS visitor sees nothing unusual)

1. **Bail-outs first**, three of them. Do nothing unless `matchMedia('(pointer: fine)').matches` — no custom cursor on touch devices. Do nothing when `prefers-reduced-motion: reduce`. Do nothing when the `localStorage` preference set by the Escape toggle in step 15 says off, read inside a `try/catch` because storage throws outright in some privacy modes. That third one is easy to leave out, and without it the toggle is write-only: the preference is saved and then never honoured on the next load. Only after passing all three, create the element and add `.stickman-active`.
2. **Sprite element**: `<div id="stickman" aria-hidden="true">`, appended to `<body>`. `aria-hidden` plus `pointer-events: none` means it is invisible to screen readers and never hit-tests itself.
3. **Animation table**: one object per state holding sheet URL, sheet dimensions, column count, frame count, fps, and whether it loops. Frame `i` maps to `col = i % cols`, `row = (i / cols) | 0`, and a mask position of `-(col*64)px -(row*64)px`. The explicit frame count is what keeps Punch off its two empty cells and Jump off its one.

   | State | Sheet | Frames | fps | Loops |
   |---|---|---|---|---|
   | `idle` | `Idle/Thin.png` | 6 | ~8 | yes |
   | `run` | `Run/Run.png` | 9 | ~14 | yes |
   | `punch` | `Punch/Punch.png` | 10 | ~18 | no, one-shot |
   | `jumpUp` | `Jump/Jump.png` | 3 | driven by the arc | no |
   | `jumpDown` | `Jump/JumpDown.png` | 1 | held | no |

4. **Preload**: `new Image().src = url` for all five sheets at init, so the first punch or jump does not show a blank frame while the browser fetches.
5. **Single rAF loop** doing, in order: integrate position, apply edge auto-scroll, pick the state, advance the frame clock, write one `transform` and one mask position. Every visual update goes through this loop; nothing writes styles or scrolls from an event handler.
6. **Two modes.** `pointermove` sets mode to follow and updates the target. Any of WASD, Space, or Enter sets mode to keys, so pressing Space first works without having to walk somewhere first. In follow mode position eases toward the target at a capped speed with a small deadzone; in keys mode it integrates velocity from held keys, clamped to the viewport.
7. **State selection**, checked in this priority order each frame: **punch** while its one-shot timer runs, else **jump** while its arc timer runs (`jumpUp` on the way up, `jumpDown` past the apex), else **run** above a small speed threshold, else **idle**. Facing flips with `scaleX(-1)` on negative horizontal velocity, holding the last facing at rest, since the art faces right.

   Punch outranking jump means Enter mid-jump gives an air punch, with the arc continuing underneath it. That is a deliberate consequence of running the arc as an independent timer rather than as a state, and it is worth keeping. WASD also stays live in the air, so you can drift while jumping.

8. **Jump arc**: one `jumpTimer` counting a fixed duration, around 450ms. Vertical render offset is a parabola peaking near 40px, `offset = -peak * 4 * t * (1 - t)` for `t` in 0..1, added to the sprite's `translate` and to nothing else. The three `Jump.png` frames are spread across the ascent, `t < 0.5`, and `JumpDown.png` is held for the descent. On expiry the state falls through to run or idle by the rules above. Peak height and duration are named constants; they are the two values worth tuning by eye.
9. **Hotspot at the cell center (32, 32)**, so the sprite is drawn at `translate(x - 32, y - 32 + jumpOffset)`. Center is chosen because `scaleX(-1)` mirrors about it, meaning the hotspot does not jump when the figure turns around. Keep `HOTSPOT_X` and `HOTSPOT_Y` as named constants, they are worth tuning by eye.

   Two known consequences of centring, both accepted. The figure is **not** centred in its cell, per the measured table above: its feet are at y=60 and its head near y=9, so (32, 32) lands at roughly chest height rather than underfoot. And in the Punch frames the fist reaches x=47 while the click lands at x=32, so the stickman visibly punches about 15px past whatever it actually activates. Tracking the fist would mean a per-frame hotspot that moves as the punch extends and flips with facing, which is a lot of complexity for a cursor whose position needs to be predictable above all. The mirroring argument wins.
10. **Edge auto-scroll**, evaluated in the rAF loop right after the position integrates, so it is frame-rate independent:
    - **Keys mode only.** In follow mode the stickman tracks a real mouse that cannot leave the viewport, so an edge band would fire every time you moved the pointer toward the bottom of the screen, which is a completely ordinary thing to do. Restricting it to keys mode is what keeps this from being infuriating.
    - **Both vertical edges**, not just the bottom. Bottom-only would let you walk down a long page and then strand you there with no way back up.
    - **Band of about 80px** from the top and bottom viewport edges, measured against the **hotspot**, not the drawn sprite. Keying off the drawing would make a jump near the bottom trigger a scroll purely because the arc lifted the picture, which is the same hotspot-versus-drawing distinction the punch relies on.
    - **Speed ramps with depth into the band**, zero at the band's inner edge up to roughly 900 px/s at the viewport edge, so a small overlap nudges and a hard press moves. Applied as `window.scrollBy(0, v * dt)`. Not `behavior: 'smooth'`, which runs its own animation and would fight the loop.
    - **No horizontal scroll.** `style.css` caps the body at `65ch` and centres it, so the page has no horizontal overflow to scroll.
    - The browser clamps at the document ends on its own, so no extra bounds check is needed. The sprite is `position: fixed`, so it stays put on screen while the content moves underneath it, and because the hotspot is in viewport coordinates `elementFromPoint` keeps returning whatever is now under it.
11. **Key guards, which are the part that matters.** One `shouldIgnoreKey(e)` used by every handler, checking three things in order:
    - **Typing.** Bail if the event target is an `<input>`, `<textarea>`, `<select>`, or `contenteditable`. Without this, typing "a" into a form field walks the stickman across the screen, and Space types a space *and* jumps.
    - **Focused controls.** Bail if `document.activeElement` is an interactive element, matched with `.closest('a[href], button, input, select, textarea, summary, [tabindex]')`. Enter and Space are the browser's own activation keys, so a visitor who reached a link by Tab must keep getting native behavior rather than having us hijack it and punch at wherever the stickman happens to be standing.
    - **Auto-repeat.** Bail on `e.repeat` for Enter and Space. Holding either fires keydown continuously, which would restart the punch or the jump every frame and freeze it on frame 0.
12. **Enter handling**: after the guards, `preventDefault()`, set mode to keys, start the punch, then `document.elementFromPoint(hx, hy)`, `.closest('a, button, [role="button"], input, summary, label')`, then `.focus()` and `.click()`. If nothing matches, dispatch a bubbling `MouseEvent('click', { clientX, clientY })` at the hotspot so custom handlers still see it. Note that `elementFromPoint` uses the true hotspot, not the jump-offset drawing, so a mid-air punch still hits what the stickman was standing on.
13. **Space handling**: after the guards, `preventDefault()` on **`keydown`**, which is the event whose default action is the scroll. Preventing it on `keyup` or `keypress` does nothing and the page still scrolls, and that is the shape this bug takes when it appears. Then set mode to keys and start the jump arc, ignoring the press if a jump is already running so the arc cannot be restarted mid-flight. Note the guards in step 11 deliberately let Space through to the browser when focus is in a text field or on a button, because a space character and a button press are both correct there.
14. **Real mouse clicks play the punch too**, so both control schemes behave the same.
15. **Escape hatch**: a toggle key (Escape) removes `.stickman-active`, cancels any in-flight edge scroll, and restores the native arrow. Persist the preference in `localStorage` inside a `try/catch`, since storage throws outright in some privacy modes. This is also the way out if the auto-scroll ever misbehaves.

**New — `work/p1-website/cursor-test.html`** (the scaffolding, kept out of the deliverable page)

- Loads `style.css`, `cursor.css`, and `cursor.js`, exactly as `index.html` does, so it exercises the real thing.
- One `<a href="#target">`, one `<button>`, and one `<input type="text">`, so Enter has something real to hit and the typing and focus guards have something to be tested against. The link is an **in-page anchor** deliberately: a link that navigates away ends the test session and loses all state, whereas an anchor jump is just as observable and leaves you where you are.
- Enough filler content to make the page a few viewports tall, with the link placed below the fold. Without it there is no scrollbar, and neither the Space suppression nor the edge auto-scroll can be verified at all.

**Edited — `work/p1-website/index.html`** (two lines, nothing else)

- `<link rel="stylesheet" href="cursor.css">` in `<head>`, after the existing `style.css`.
- `<script src="cursor.js" defer></script>` before `</body>`.
- No test controls and no filler. `index.html` is the P1 deliverable page and should hold real content when there is some, not scaffolding waiting to be deleted.

**Untouched**

- `StickmanPack/**` — referenced by URL only, never read into a build step, never rewritten.
- `style.css` — the feature is self-contained in `cursor.css`, which keeps it easy to rip out.

## Not in this pass

Making CSS `:hover` follow the stickman in keys mode. It would mean toggling a `.stickman-hover` class on the element under the hotspot each time that element changes, and the site has no hover styles today, so it would be a no-op. Worth revisiting once the page has real content.

## Verification

Serve the folder and open it, rather than opening the file directly, because `file://` blocks some resource loads:

```
cd work/p1-website
py -m http.server 8000
```

Note that `python3` is what the P1 README suggests, but on this machine it resolves to the Microsoft Store stub and fails; `py` and `python` both work.

Then, at **`http://localhost:8000/cursor-test.html`**, which is the page with the controls and the scrollable height. Steps 19 and 20 move to `index.html`.

1. **Follow mode** — move the mouse. The stickman chases it playing Run, then settles into the looping Idle. It faces left when moving left.
2. **Idle** — leave the mouse still for ten seconds. Idle cycles continuously through its 6 frames rather than freezing on one.
3. **Keys mode** — hold each of W, A, S, D. It moves in the right direction, runs while held, returns to Idle on release, and cannot be pushed off-screen.
4. **Punch** — press Enter with the stickman over the test link. The 10-frame punch plays once, does not loop, and the page jumps to the anchor. Press Enter over empty space: punch plays, nothing happens. Expect the fist to land visibly past the link, about 15px; that is the accepted hotspot trade-off in step 9, not a bug.
5. **Jump** — press Space. The stickman arcs up and back down, plays the 3 ascent frames then the falling pose, and lands in Idle. Press Space while running: it jumps and keeps drifting. Hold Space down: exactly one jump, not a stuttering loop.
6. **Space does not scroll** — scroll to the top, then press Space ten times in a row with focus on the page body. The scroll position does not move by a single pixel. This is the check with the most ways to pass by accident, so watch the scrollbar rather than the content.
7. **Edge auto-scroll down** — hold S until the stickman reaches the bottom band. The page scrolls down smoothly, faster the closer it gets to the edge, and stops of its own accord at the end of the document. The stickman stays put on screen while the content moves underneath it.
8. **Edge auto-scroll up** — hold W at the top band. The page scrolls back up and stops at the top. You can get back to where you started.
9. **Auto-scroll is keys-mode only** — move the mouse pointer to the very bottom of the window and leave it there. The page does **not** scroll. This is the one that makes the feature tolerable rather than infuriating, so it is worth checking deliberately.
10. **Jump near the bottom does not trigger a scroll** — walk to just above the bottom band and press Space. The arc lifts the drawing but the page stays put, because the band is measured against the hotspot.
11. **Jump does not move the hotspot** — stand on the test link, press Space, then press Enter at the top of the arc. The link still activates.
12. **The typing guard** — click into a text input, type `wasd`, then press Space. The letters and the space character all appear, the stickman neither moves nor jumps, and the page does not scroll away under you.
13. **The focus guard** — press Tab until the test link is focused, then press Enter. The browser follows the link natively; the stickman does not punch at some unrelated spot.
14. **The native cursor stays hidden on controls** — hover the link, the button, and the text input in turn. No hand, no I-beam, no arrow appears over any of them. This is the check for the UA-stylesheet override described in the `cursor.css` section, and without the `html.stickman-active *` rule all three fail while the rest of the page still looks fine.
15. **Other scrolling still works** — mouse wheel, arrow keys, and PageDown all scroll normally. Only Space was taken.
16. **Dark mode** — toggle Windows dark mode. The stickman is clearly visible against both backgrounds.
17. **Touch and reduced motion** — DevTools device toolbar, and DevTools rendering panel's "emulate prefers-reduced-motion". In both, the native arrow comes back and no sprite appears.
18. **Network tab** — `Thin.png`, `Run.png`, `Punch.png`, `Jump.png` and `JumpDown.png` all return 200, `JumpUp.png` is never requested, and there are no red 404s. Path bugs are the failure mode the P1 README warns about hardest, and this is what catches them.
19. **Toggle** — press Escape. Native arrow returns, sprite disappears, any in-flight scroll stops, page still works.
20. **The toggle survives a reload** — after step 19, refresh. The stickman stays off and the native arrow stays. Press Escape again and reload once more: it comes back on. This is what proves the `localStorage` preference is read at init and not merely written.
21. **`index.html` loads the feature clean** — open `http://localhost:8000/` and confirm the stickman appears, with no test controls and no filler on the page.

The checks most likely to actually fail are 18 (paths), then 14 (the UA `cursor` override), then 6 (`preventDefault` on the wrong event, so Space still scrolls), then 9 (auto-scroll leaking into follow mode), then 20 (a write-only preference), then 12.
