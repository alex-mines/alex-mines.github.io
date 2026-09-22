/* Stickman custom cursor.

   A position:fixed sprite replaces the native pointer. It can be driven by
   the mouse (it chases the pointer) or by the keyboard (WASD or the arrow keys
   to move, Enter to activate whatever it is standing on, Space to jump). Escape
   turns it off and the preference survives a reload.

   Every visual update happens in the one requestAnimationFrame loop at the
   bottom. Nothing writes styles or scrolls from an event handler. */

(function () {
  'use strict';

  /* ---- Bail-outs -------------------------------------------------------
     A custom cursor makes no sense without a real pointing device, and an
     animated one is exactly what prefers-reduced-motion is asking us not
     to do. Both are hard exits: no element, no listeners, nothing. */

  if (!window.matchMedia) return;
  if (!matchMedia('(pointer: fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* ---- Tuning ---------------------------------------------------------- */

  var STORAGE_KEY = 'stickman-cursor';

  var CELL = 64;            // sprite cell size; sheets are grids of these
  var HOTSPOT_X = 32;       // the click point inside the cell, and the
  var HOTSPOT_Y = 32;       // point scaleX(-1) mirrors about

  var FOLLOW_EASE = 12;     // per second; higher catches up sooner
  var FOLLOW_SPEED = 1100;  // px/s cap while chasing
  var FOLLOW_DEADZONE = 1.5;

  var KEY_SPEED = 460;      // px/s in keyboard mode
  var RUN_THRESHOLD = 25;   // px/s above which Run plays instead of Idle
  var FACE_THRESHOLD = 5;   // px/s of horizontal motion before it turns

  var JUMP_MS = 450;
  var JUMP_PEAK = 40;       // px; the top of the arc, drawing only

  var EDGE_BAND = 80;       // px band at top/bottom that auto-scrolls
  var EDGE_MAX_SPEED = 900; // px/s at the very edge of the viewport

  /* ---- Sheets ----------------------------------------------------------
     Frame i maps to col = i % cols, row = (i / cols) | 0. That works only
     because every sheet's empty cells are trailing ones, so real frames
     run contiguously from cell 0; `frames` is what keeps Punch off its two
     blanks and Jump off its one. Jump.png covers the ascent and
     JumpDown.png the descent; JumpUp.png is byte-identical to Jump.png
     cell r1c0 and is deliberately never loaded. */

  var SHEETS = {
    idle:     { url: 'StickmanPack/Idle/Thin.png',     w: 384, h: 64,  cols: 6, frames: 6,  fps: 8 },
    run:      { url: 'StickmanPack/Run/Run.png',       w: 576, h: 64,  cols: 9, frames: 9,  fps: 14 },
    punch:    { url: 'StickmanPack/Punch/Punch.png',   w: 256, h: 192, cols: 4, frames: 10, fps: 18 },
    jumpUp:   { url: 'StickmanPack/Jump/Jump.png',     w: 128, h: 128, cols: 2, frames: 3,  fps: 0 },
    jumpDown: { url: 'StickmanPack/Jump/JumpDown.png', w: 64,  h: 64,  cols: 1, frames: 1,  fps: 0 }
  };

  var PUNCH_MS = (SHEETS.punch.frames / SHEETS.punch.fps) * 1000;

  // So the first punch or jump does not flash a blank frame while the
  // browser fetches the sheet.
  Object.keys(SHEETS).forEach(function (k) {
    var img = new Image();
    img.src = SHEETS[k].url;
  });

  /* ---- State ----------------------------------------------------------- */

  var el = document.createElement('div');
  el.id = 'stickman';
  el.setAttribute('aria-hidden', 'true'); // decoration; screen readers skip it
  el.style.display = 'none';

  var active = false;
  var mode = 'follow';                    // 'follow' | 'keys'

  var x = window.innerWidth / 2;
  var y = window.innerHeight / 2;
  var targetX = x, targetY = y;
  var velX = 0, velY = 0;
  var facing = 1;

  // Each arrow key maps onto its WASD twin, so both schemes share one set
  // of held flags. Two keys for one direction count separately: releasing
  // W while ArrowUp is still held must not stop the walk.
  var MOVE_KEYS = {
    w: 'up', ArrowUp: 'up', a: 'left', ArrowLeft: 'left',
    s: 'down', ArrowDown: 'down', d: 'right', ArrowRight: 'right'
  };
  var keys = {};                          // held movement key -> true

  function held(dir) {
    for (var k in keys) if (keys[k] && MOVE_KEYS[k] === dir) return true;
    return false;
  }

  var punchTimer = -1;                    // -1 means not running
  var jumpTimer = -1;
  var frameClock = 0;

  var currentState = null;
  var rafId = 0;
  var lastT = 0;

  /* ---- Preference ------------------------------------------------------
     localStorage throws outright in some privacy modes, so both sides are
     wrapped and a failure just means the preference does not persist. */

  function readPref() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (err) { return null; }
  }

  function writePref(value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch (err) { /* ignore */ }
  }

  /* ---- Key guards ------------------------------------------------------
     Without these, typing "a" into a form field walks the stickman across
     the screen and Space both types a space and jumps. */

  function isTypingTarget(node) {
    if (!node || node.nodeType !== 1) return false;
    var tag = node.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    return !!node.isContentEditable;
  }

  function shouldIgnoreKey(e, isActivation) {
    if (isTypingTarget(e.target)) return true;

    var focused = document.activeElement;
    if (isTypingTarget(focused)) return true;

    // Movement keys have no native meaning on a focused button or link, so
    // only the activation keys defer to focus. Otherwise a punched button
    // keeps focus and WASD goes dead. Arrow keys do mean something on a
    // select or a text field, but those are already typing targets above.
    if (!isActivation) return false;

    // Enter and Space are the browser's own activation keys. Someone who
    // reached a link by Tab must keep getting native behaviour instead of
    // having us punch at wherever the stickman happens to be standing.
    if (focused && focused.closest &&
        focused.closest('a[href], button, input, select, textarea, summary, [tabindex]')) {
      return true;
    }
    return false;
  }

  /* ---- Actions ---------------------------------------------------------- */

  function startPunch() {
    punchTimer = 0;
  }

  function activateAtHotspot() {
    // The true hotspot, not the jump-offset drawing, so a mid-air punch
    // still hits what the stickman was standing on.
    var under = document.elementFromPoint(x, y);
    if (!under) return;

    var hit = under.closest
      ? under.closest('a[href], button, [role="button"], input, select, textarea, summary, label')
      : null;

    if (hit) {
      // Focus only typing controls, so the user can type right after. A
      // focused button would make shouldIgnoreKey swallow Enter/Space next.
      if (isTypingTarget(hit)) {
        try { hit.focus(); } catch (err) { /* not focusable, fine */ }
      }
      hit.click();
      return;
    }

    // Nothing obviously clickable, so dispatch at the hotspot anyway and
    // let any custom handler on the page see it.
    under.dispatchEvent(new MouseEvent('click', {
      bubbles: true, cancelable: true, view: window, clientX: x, clientY: y
    }));
  }

  function setActive(on) {
    if (on === active) return;
    active = on;

    if (on) {
      document.documentElement.classList.add('stickman-active');
      el.style.display = '';
      lastT = 0;
      rafId = requestAnimationFrame(tick);
    } else {
      document.documentElement.classList.remove('stickman-active');
      el.style.display = 'none';
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      // Stopping the loop is also what stops any in-flight edge scroll,
      // since scrolling only ever happens inside it.
      keys = {};
      punchTimer = -1;
      jumpTimer = -1;
    }
  }

  /* ---- Events ----------------------------------------------------------- */

  function onPointerMove(e) {
    if (!active) return;
    mode = 'follow';
    targetX = e.clientX;
    targetY = e.clientY;
  }

  function onPointerDown() {
    if (!active) return;
    startPunch(); // real mouse clicks punch too, so both schemes match
  }

  function onKeyDown(e) {
    // Checked before the active guard, otherwise there is no way to turn
    // the cursor back on once it has been switched off.
    if (e.key === 'Escape') {
      setActive(!active);
      writePref(active ? 'on' : 'off');
      return;
    }

    if (!active) return;
    var key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    var isActivation = key === ' ' || key === 'Spacebar' || key === 'Enter';
    if (shouldIgnoreKey(e, isActivation)) return;

    if (MOVE_KEYS.hasOwnProperty(key)) {
      if (key.indexOf('Arrow') === 0) {
        // Already handled, e.g. by the open lightbox paging photos, so the
        // arrows belong to it and the stickman stays put.
        if (e.defaultPrevented) return;
        // Otherwise the arrows' default is a page scroll, fighting the
        // edge auto-scroll while you walk.
        e.preventDefault();
      }
      keys[key] = true;
      mode = 'keys';
      return;
    }

    if (key === ' ' || key === 'Spacebar') {
      // keydown is the event whose default action is the page scroll.
      // Preventing it on keyup or keypress does nothing at all, and the
      // page still scrolls out from under you.
      e.preventDefault();
      if (e.repeat) return;        // holding Space must not restart the arc
      mode = 'keys';
      if (jumpTimer < 0) jumpTimer = 0;
      return;
    }

    if (key === 'Enter') {
      e.preventDefault();
      if (e.repeat) return;        // holding Enter must not freeze frame 0
      mode = 'keys';
      startPunch();
      activateAtHotspot();
    }
  }

  function onKeyUp(e) {
    // Deliberately not guarded: a key pressed on the page and released
    // after focus moved must still clear, or it sticks down forever.
    var key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (MOVE_KEYS.hasOwnProperty(key)) keys[key] = false;
  }

  function releaseAllKeys() {
    keys = {};
  }

  /* ---- The loop ---------------------------------------------------------
     Order matters: integrate position, auto-scroll, pick the state,
     advance the frame clock, then write exactly one transform and one mask
     position. */

  function tick(now) {
    rafId = requestAnimationFrame(tick);

    if (!lastT) { lastT = now; return; }
    var dt = (now - lastT) / 1000;
    lastT = now;
    if (dt > 0.1) dt = 0.1;  // a backgrounded tab must not teleport it
    frameClock += dt;

    var prevX = x, prevY = y;

    if (mode === 'follow') {
      var dx = targetX - x, dy = targetY - y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > FOLLOW_DEADZONE) {
        // Easing with a speed cap: it catches up quickly over a long gap
        // but does not snap, which would flash two or three Run frames per
        // movement and read as flicker.
        var step = Math.min(dist, Math.min(dist * FOLLOW_EASE, FOLLOW_SPEED) * dt);
        x += (dx / dist) * step;
        y += (dy / dist) * step;
      }
    } else {
      var kx = (held('right') ? 1 : 0) - (held('left') ? 1 : 0);
      var ky = (held('down') ? 1 : 0) - (held('up') ? 1 : 0);
      if (kx || ky) {
        var len = Math.sqrt(kx * kx + ky * ky);  // so diagonals are not faster
        x += (kx / len) * KEY_SPEED * dt;
        y += (ky / len) * KEY_SPEED * dt;
      }
    }

    x = Math.max(0, Math.min(window.innerWidth - 1, x));
    y = Math.max(0, Math.min(window.innerHeight - 1, y));

    velX = (x - prevX) / dt;
    velY = (y - prevY) / dt;

    /* Edge auto-scroll. Keys mode only: in follow mode this would fire
       every time the mouse moved toward the bottom of the screen, which is
       an entirely ordinary thing to do. Measured against the hotspot, not
       the drawing, so a jump near the bottom does not scroll the page just
       because the arc lifted the picture. The browser clamps at the
       document ends by itself. */
    if (mode === 'keys') {
      var scroll = 0;
      if (y < EDGE_BAND) {
        scroll = -EDGE_MAX_SPEED * (1 - y / EDGE_BAND);
      } else if (y > window.innerHeight - EDGE_BAND) {
        scroll = EDGE_MAX_SPEED * (1 - (window.innerHeight - y) / EDGE_BAND);
      }
      if (scroll) window.scrollBy(0, scroll * dt);
    }

    if (punchTimer >= 0) {
      punchTimer += dt * 1000;
      if (punchTimer >= PUNCH_MS) punchTimer = -1;
    }
    if (jumpTimer >= 0) {
      jumpTimer += dt * 1000;
      if (jumpTimer >= JUMP_MS) jumpTimer = -1;
    }

    /* The arc is an independent timer rather than a state, which is why
       punch can outrank jump below and still leave the stickman flying:
       Enter mid-jump gives an air punch with the arc continuing underneath
       it. Offset applies to the drawing only, never to x/y, so a jump can
       never mis-aim a punch. */
    var jumpOffset = 0;
    if (jumpTimer >= 0) {
      var t = jumpTimer / JUMP_MS;
      jumpOffset = -JUMP_PEAK * 4 * t * (1 - t);
    }

    var state, frame;
    var speed = Math.sqrt(velX * velX + velY * velY);

    if (punchTimer >= 0) {
      state = 'punch';
      frame = Math.min(SHEETS.punch.frames - 1,
                       Math.floor(punchTimer / 1000 * SHEETS.punch.fps));
    } else if (jumpTimer >= 0) {
      var jt = jumpTimer / JUMP_MS;
      if (jt < 0.5) {
        state = 'jumpUp';
        frame = Math.min(SHEETS.jumpUp.frames - 1,
                         Math.floor((jt / 0.5) * SHEETS.jumpUp.frames));
      } else {
        state = 'jumpDown';
        frame = 0;
      }
    } else if (speed > RUN_THRESHOLD) {
      state = 'run';
      frame = Math.floor(frameClock * SHEETS.run.fps) % SHEETS.run.frames;
    } else {
      state = 'idle';
      frame = Math.floor(frameClock * SHEETS.idle.fps) % SHEETS.idle.frames;
    }

    // The art faces right, so only a leftward move flips it; at rest it
    // keeps whichever way it was last facing.
    if (velX > FACE_THRESHOLD) facing = 1;
    else if (velX < -FACE_THRESHOLD) facing = -1;

    var sheet = SHEETS[state];
    if (state !== currentState) {
      el.style.setProperty('--stickman-sheet', 'url("' + sheet.url + '")');
      el.style.setProperty('--stickman-sheet-size', sheet.w + 'px ' + sheet.h + 'px');
      currentState = state;
    }

    var col = frame % sheet.cols;
    var row = (frame / sheet.cols) | 0;
    el.style.setProperty('--stickman-frame', (-col * CELL) + 'px ' + (-row * CELL) + 'px');

    // transform-origin is the cell centre, which is the hotspot, so
    // scaleX(-1) mirrors about it and turning around does not shift the
    // click point.
    el.style.transform =
      'translate(' + (x - HOTSPOT_X) + 'px,' + (y - HOTSPOT_Y + jumpOffset) + 'px)' +
      (facing < 0 ? ' scaleX(-1)' : '');
  }

  /* ---- Init -------------------------------------------------------------- */

  document.body.appendChild(el);

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', onPointerDown, { passive: true });
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', releaseAllKeys);

  // Read, not just write: without this the Escape preference is saved and
  // then ignored on every subsequent load.
  setActive(readPref() !== 'off');
}());
