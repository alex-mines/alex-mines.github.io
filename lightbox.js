/* Photo lightbox for adventures.html.

   Progressive enhancement. In the markup every photo is already a plain
   link to its full-size file, so with this script deleted, blocked, or
   broken the photos still open - just in a new page instead of over the
   current one. Nothing here is required for the page to work.

   The one piece of coordination with the rest of the site: cursor.js
   listens for Escape on window to toggle the stickman. While the
   lightbox is open Escape has to close the lightbox and nothing else,
   so the handler below runs in the capture phase on document and stops
   the event before it can reach cursor.js. */

(function () {
  'use strict';

  var SELECTOR = '.shot-frame';

  var links = Array.prototype.slice.call(document.querySelectorAll(SELECTOR));
  if (!links.length) return;

  // Every photo on the page, in document order, so the arrows can walk
  // the whole issue rather than one trip at a time.
  var shots = links.map(function (a) {
    var img = a.querySelector('img');
    return {
      link: a,
      full: a.getAttribute('href'),
      alt: img ? img.getAttribute('alt') : '',
      caption: a.getAttribute('data-caption') || ''
    };
  });

  var index = -1;
  var lastFocus = null;
  var overlay, stage, image, caption, countEl, closeBtn, prevBtn, nextBtn;

  function build() {
    overlay = document.createElement('div');
    overlay.className = 'lb';
    overlay.hidden = true;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Photo viewer');

    overlay.innerHTML =
      '<div class="lb-stage"><img alt=""></div>' +
      '<p class="lb-caption"><span class="lb-text"></span>' +
      '<span class="lb-count"></span></p>' +
      '<button type="button" class="lb-close" aria-label="Close photo">X</button>' +
      '<button type="button" class="lb-prev" aria-label="Previous photo">&lsaquo;</button>' +
      '<button type="button" class="lb-next" aria-label="Next photo">&rsaquo;</button>';

    stage = overlay.querySelector('.lb-stage');
    image = overlay.querySelector('.lb-stage img');
    caption = overlay.querySelector('.lb-text');
    countEl = overlay.querySelector('.lb-count');
    closeBtn = overlay.querySelector('.lb-close');
    prevBtn = overlay.querySelector('.lb-prev');
    nextBtn = overlay.querySelector('.lb-next');

    closeBtn.addEventListener('click', close);
    prevBtn.addEventListener('click', function () { step(-1); });
    nextBtn.addEventListener('click', function () { step(1); });

    // Clicking the dark area closes; clicking the photo or a button does
    // not, so a mis-aimed click on the image itself is not punished.
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target === stage) close();
    });

    document.body.appendChild(overlay);
  }

  function show(i) {
    var shot = shots[i];
    index = i;

    image.src = shot.full;
    image.alt = shot.alt;
    caption.textContent = shot.caption;
    countEl.textContent = 'Photo ' + (i + 1) + ' of ' + shots.length;

    prevBtn.disabled = i === 0;
    nextBtn.disabled = i === shots.length - 1;
  }

  function step(delta) {
    var next = index + delta;
    if (next < 0 || next >= shots.length) return;
    show(next);
  }

  function open(i, trigger) {
    lastFocus = trigger || document.activeElement;
    show(i);
    overlay.hidden = false;

    // The page behind must not scroll while the overlay is up. Restored
    // on close rather than cleared, in case the page ever sets its own.
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  function close() {
    if (overlay.hidden) return;
    overlay.hidden = true;
    image.removeAttribute('src');
    image.alt = '';
    document.body.style.overflow = '';

    if (lastFocus && lastFocus.focus) {
      try { lastFocus.focus(); } catch (err) { /* gone from the DOM, fine */ }
    }
    lastFocus = null;
    index = -1;
  }

  /* Tab must not walk out of the overlay into the page behind it, which
     is still in the accessibility tree. Three controls, so cycling them
     by hand is simpler and more predictable than an inert polyfill. */
  function trapTab(e) {
    var order = [closeBtn, prevBtn, nextBtn].filter(function (b) {
      return !b.disabled;
    });
    var at = order.indexOf(document.activeElement);
    var to = e.shiftKey ? at - 1 : at + 1;

    if (at === -1) to = 0;
    else if (to < 0) to = order.length - 1;
    else if (to >= order.length) to = 0;

    e.preventDefault();
    order[to].focus();
  }

  function onKeyDown(e) {
    if (overlay.hidden) return;

    if (e.key === 'Escape') {
      // Capture phase plus this stop is what keeps cursor.js from also
      // toggling the stickman off on the same press.
      e.stopPropagation();
      e.preventDefault();
      close();
      return;
    }

    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); return; }
    if (e.key === 'Tab') { trapTab(e); }
  }

  build();

  links.forEach(function (a, i) {
    // Only now is it true: the link opens a dialog rather than a page.
    a.setAttribute('aria-haspopup', 'dialog');

    a.addEventListener('click', function (e) {
      // Let the browser have modified clicks: open in a new tab still
      // works the way the link says it does.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      open(i, a);
    });
  });

  document.addEventListener('keydown', onKeyDown, true);

  // Set last, so the "+" marker only appears once the lightbox is
  // actually wired up and able to open.
  document.documentElement.classList.add('lb-ready');
}());
