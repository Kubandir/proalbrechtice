// =============================================================================
// Ballot interactions: click-to-check, staged auto-reveal, live counter.
// No build step, no dependencies. Wrapped in IIFE so globals stay clean.
// =============================================================================
(() => {
  'use strict';

  const cntEl   = document.getElementById('cnt');
  const cntWrap = document.querySelector('.ballot-counter .cnt-num');
  const list    = document.querySelector('.ballot-list');
  const checks  = document.querySelectorAll('[data-check]');

  if (!list || !checks.length) return;

  const updateCount = () => {
    const n = document.querySelectorAll('[data-check].checked').length;
    if (!cntEl) return;
    cntEl.textContent = n;
    if (cntWrap) cntWrap.classList.toggle('full', n === 7);
  };

  // user click: toggle
  checks.forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('checked');
      updateCount();
    });
  });

  // staged auto-reveal — demonstrate the move when the list scrolls into view.
  // Respect reduced-motion: skip the cascade entirely.
  const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      checks.forEach((c, i) => {
        setTimeout(() => {
          c.classList.add('checked');
          updateCount();
        }, 350 + i * 230);
      });
      io.disconnect();
    });
  }, { threshold: 0.18 });

  io.observe(list);
})();

// =============================================================================
// Members v3:
//   - hover (desktop)        → panel opens in "preview" mode: giant portrait
//                              of that person + name only (poster).
//   - click                  → "locked" mode: portrait stays, bio + meta appear.
//   - mouseleave the strip   → closes (unless locked).
//   - click locked card / x  → unlocks & closes.
// All animations slow + deliberate (handled in CSS).
// =============================================================================
(() => {
  'use strict';

  const strip = document.getElementById('member-strip');
  if (!strip) return;
  const dataEl = document.getElementById('members-data');
  if (!dataEl) return;

  let DATA;
  try { DATA = JSON.parse(dataEl.textContent); } catch { return; }

  const cards = [...strip.querySelectorAll('.member')];
  const panel = strip.querySelector('.strip-panel');
  const els = {
    name:        document.getElementById('sp-name'),
    role:        document.getElementById('sp-role'),
    bio:         document.getElementById('sp-bio'),
    meta:        document.getElementById('sp-meta'),
    portrait:    document.getElementById('sp-portrait'),
    portraitNm:  document.getElementById('sp-portrait-name'),
    portraitRl:  document.getElementById('sp-portrait-role'),
  };
  const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const supportsHover  = window.matchMedia?.('(hover: hover)').matches;
  const isMobile       = window.matchMedia('(max-width: 880px)');

  let lockedKey = null;
  let activeKey = null;

  // image source from the card itself — keeps everything in sync without
  // hardcoding paths twice.
  const srcFor = (key) => {
    const card = cards.find(c => c.dataset.key === key);
    return card?.querySelector('.seal img')?.getAttribute('src') ?? '';
  };

  const shortRole = (role) => role.split('·')[0].trim();

  const fill = (key) => {
    const m = DATA[key];
    if (!m) return;
    els.name.textContent = m.name;
    els.role.textContent = m.role;
    els.bio.innerHTML    = m.bio.map(p => `<p>${p}</p>`).join('');
    els.meta.innerHTML   = m.meta.map(t => `<span>${t}</span>`).join('');
    // poster zone
    els.portrait.src         = srcFor(key);
    els.portrait.alt         = m.name;
    els.portraitNm.textContent = m.name;
    els.portraitRl.textContent = shortRole(m.role);
  };

  const setActive = (key, mode /* 'preview' | 'locked' | null */) => {
    // Mobile is a pure scroll feed — never set is-active, never open a panel.
    if (isMobile.matches) return;
    activeKey = key;
    cards.forEach(c => {
      const on = c.dataset.key === key;
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-expanded', on ? 'true' : 'false');
    });
    if (key) fill(key);
    strip.dataset.open = key ? 'true' : 'false';
    strip.dataset.mode = key ? (mode ?? 'preview') : 'idle';
  };

  // hover preview (desktop only)
  if (supportsHover && !prefersReduced) {
    cards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        if (lockedKey) return;
        setActive(card.dataset.key, 'preview');
      });
    });
    // Intentionally no mouseleave handler — the panel stays on whichever
    // person you last hovered. Returning to a "default" would lie about
    // what the user just looked at.
  }

  // click: lock / unlock
  cards.forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      const key = card.dataset.key;
      if (lockedKey === key) {
        lockedKey = null;
        // unlocking goes back to preview mode of the same card
        setActive(key, 'preview');
      } else {
        lockedKey = key;
        setActive(key, 'locked');
        requestAnimationFrame(() => maybeNudge());
      }
    });

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
      if (e.key === 'Escape' && lockedKey) {
        lockedKey = null; setActive(null, null); card.focus();
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const i = cards.indexOf(card);
        const next = cards[(i + (e.key === 'ArrowRight' ? 1 : -1) + cards.length) % cards.length];
        next.focus();
        if (lockedKey) { lockedKey = next.dataset.key; setActive(lockedKey, 'locked'); }
      }
    });
  });

  // ----- MOBILE: editorial vertical stack with one medailonek per card -----
  // Restructure each card so the portrait fills the top with name + role
  // overlaid like a magazine cover, position number as marginalia, bio in an
  // editorial column below.
  const buildMobile = () => {
    cards.forEach((card, i) => {
      if (card.querySelector('.m-bio')) return; // already mobilised
      const m = DATA[card.dataset.key];
      if (!m) return;

      const seal = card.querySelector('.seal');
      const nm   = card.querySelector('.nm');
      const rl   = card.querySelector('.rl');
      if (!seal || !nm || !rl) return;

      // wrap nm + rl in an overlay container, mount inside the seal so they
      // can sit on top of the portrait
      const label = document.createElement('div');
      label.className = 'm-label';
      label.appendChild(nm);
      label.appendChild(rl);
      seal.appendChild(label);

      // position chip top-right of portrait
      const pos = document.createElement('span');
      pos.className = 'm-pos';
      pos.textContent = String(i + 1).padStart(2, '0');
      seal.appendChild(pos);

      // bio + chips below
      const bio = document.createElement('div');
      bio.className = 'm-bio';
      bio.innerHTML =
        m.bio.map(p => `<p>${p}</p>`).join('') +
        `<div class="m-meta">${m.meta.map(t => `<span>${t}</span>`).join('')}</div>`;
      card.appendChild(bio);
    });
  };
  const teardownMobile = () => {
    cards.forEach(card => {
      const label = card.querySelector('.m-label');
      if (label) {
        // restore nm/rl back as siblings of seal in original order
        const nm = label.querySelector('.nm');
        const rl = label.querySelector('.rl');
        if (nm) card.appendChild(nm);
        if (rl) card.appendChild(rl);
        label.remove();
      }
      card.querySelector('.m-pos')?.remove();
      card.querySelector('.m-bio')?.remove();
      card.classList.remove('in-view');
    });
  };
  const clearActive = () => {
    cards.forEach(c => {
      c.classList.remove('is-active');
      c.setAttribute('aria-expanded', 'false');
    });
    strip.dataset.open = 'false';
    strip.dataset.mode = 'idle';
    lockedKey = null;
    activeKey = null;
  };

  const applyMobile = () => {
    if (isMobile.matches) {
      // strip any desktop active state that might have been set when the
      // page loaded wide and was then resized down
      clearActive();
      buildMobile();
      if (!prefersReduced && 'IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
          entries.forEach(e => {
            if (e.isIntersecting) {
              e.target.classList.add('in-view');
              io.unobserve(e.target);
            }
          });
        }, { threshold: 0.18 });
        cards.forEach(c => io.observe(c));
      } else {
        cards.forEach(c => c.classList.add('in-view'));
      }
    } else {
      teardownMobile();
    }
  };
  applyMobile();
  isMobile.addEventListener?.('change', applyMobile);

  // ----- DESKTOP: open the panel by default with the first member --------
  if (!isMobile.matches) {
    const first = cards[0]?.dataset.key;
    if (first) setActive(first, 'preview');
  }

  const maybeNudge = () => {
    const r = panel.getBoundingClientRect();
    if (r.bottom <= window.innerHeight - 12) return;
    const overflow = r.bottom - window.innerHeight + 24;
    window.scrollBy({ top: overflow, behavior: prefersReduced ? 'auto' : 'smooth' });
  };
})();
