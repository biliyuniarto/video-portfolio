const root = document.documentElement;
const filterGroup = document.querySelector('.filters');
const filterButtons = [...document.querySelectorAll('[data-filter]')];
const cards = [...document.querySelectorAll('.work-card')];
const workGrid = document.querySelector('[data-work-grid]');
const modal = document.querySelector('.video-modal');
const modalPanel = modal.querySelector('.modal-panel');
const modalVideo = document.querySelector('#modal-video');
const modalTitle = document.querySelector('#modal-title');
const modalCategory = document.querySelector('#modal-category');
const modalRole = document.querySelector('#modal-role');
const modalCounter = document.querySelector('#modal-counter');
const modalClose = modal.querySelector('.modal-close');
const modalBackdrop = modal.querySelector('.modal-backdrop');
const progressBar = document.querySelector('.scroll-progress div');
const header = document.querySelector('.site-header');
const heroPanel = document.querySelector('[data-tilt-panel]');
const heroVideo = document.querySelector('[data-hero-video]');
const loader = document.querySelector('.loader');
const toast = document.querySelector('.toast');
const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const reduced = prefersReducedMotion.matches;
const richPointer = supportsHover.matches && !reduced;

let activePreview = null;
let closingTimer = null;
let lastFocused = null;
let playlist = [];
let playlistIndex = 0;

root.classList.add('motion-ready');

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (from, to, amount) => from + (to - from) * amount;

/* ---------- Reveal on scroll ---------- */

const revealObserver = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        entry.target.dispatchEvent(new CustomEvent('reveal'));
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8%' })
  : null;

function observeReveal(element) {
  if (element.hidden) return;
  if (revealObserver) revealObserver.observe(element);
  else {
    element.classList.add('is-visible');
    element.dispatchEvent(new CustomEvent('reveal'));
  }
}

/* ---------- Hero title: split into characters ---------- */

const heroCopy = document.querySelector('[data-reveal="hero-copy"]');
let charIndex = 0;
document.querySelectorAll('[data-split]').forEach((line) => {
  const words = line.textContent.trim().split(/\s+/);
  line.textContent = '';
  words.forEach((word, wordIndex) => {
    const wordEl = document.createElement('span');
    wordEl.className = 'word';
    [...word].forEach((letter) => {
      const char = document.createElement('span');
      char.className = 'char';
      char.textContent = letter;
      char.style.setProperty('--ci', String(charIndex));
      charIndex += 1;
      wordEl.append(char);
    });
    line.append(wordEl);
    if (wordIndex < words.length - 1) line.append(' ');
  });
});

heroCopy.addEventListener('reveal', () => {
  window.setTimeout(() => heroCopy.classList.add('chars-in'), 1000 + charIndex * 28);
}, { once: true });

if (richPointer) {
  document.querySelectorAll('.hero h1 .char').forEach((char) => {
    char.addEventListener('pointerenter', () => {
      if (!heroCopy.classList.contains('chars-in')) return;
      char.classList.add('is-bumped');
      window.setTimeout(() => char.classList.remove('is-bumped'), 380);
    });
  });
}

/* ---------- Intro loader ---------- */

function startPage() {
  document.querySelectorAll('[data-reveal]').forEach(observeReveal);
  if (!reduced) heroVideo.play().catch(() => {});
}

function hasSeenIntro() {
  try { return window.sessionStorage.getItem('by-intro') === '1'; } catch { return false; }
}

function markIntroSeen() {
  try { window.sessionStorage.setItem('by-intro', '1'); } catch { /* storage unavailable */ }
}

function runLoader() {
  if (!loader || reduced || hasSeenIntro()) {
    loader?.classList.add('is-gone');
    startPage();
    return;
  }

  const counter = loader.querySelector('[data-loader-count]');
  const duration = 1300;
  const startTime = performance.now();

  function tick(now) {
    const t = clamp((now - startTime) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    counter.textContent = String(Math.round(eased * 100)).padStart(3, '0');
    loader.style.setProperty('--load', eased.toFixed(3));
    if (t < 1) {
      window.requestAnimationFrame(tick);
      return;
    }
    markIntroSeen();
    window.setTimeout(() => {
      loader.classList.add('is-done');
      window.setTimeout(startPage, 250);
      window.setTimeout(() => loader.classList.add('is-gone'), 950);
    }, 180);
  }

  window.requestAnimationFrame(tick);
}

runLoader();

/* ---------- Scroll-driven effects ---------- */

const mediaItems = [...document.querySelectorAll('.work-media')];
const mediaImages = mediaItems.map((media) => media.querySelector('img'));
const processGrid = document.querySelector('.process-grid');
const approach = document.querySelector('.process-grid');
const manifestoCard = document.querySelector('[data-manifesto]');

// Wrap every word of an element (keeping inline tags like <em>) so it can be lit on scroll.
function splitWords(element) {
  const words = [];
  [...element.childNodes].forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      words.push(...splitWords(node));
      return;
    }
    if (node.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) return;
    const fragment = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) {
        fragment.append(part);
        return;
      }
      const span = document.createElement('span');
      span.className = 'word';
      span.textContent = part;
      fragment.append(span);
      words.push(span);
    });
    node.replaceWith(fragment);
  });
  return words;
}

const scrubbers = reduced ? [] : [
  { element: document.querySelector('.about-lead'), start: 0.88, span: 0.3 },
  { element: document.querySelector('[data-words]'), start: 0.85, span: 0.1 },
].filter((item) => item.element).map((item) => ({ ...item, words: splitWords(item.element) }));
const processSteps = processGrid ? [...processGrid.children] : [];

let lastScrollY = window.scrollY;
let scrollVelocity = 0;
let scrollTicking = false;

function updateOnScroll() {
  scrollTicking = false;
  const viewport = window.innerHeight;
  const scrollY = window.scrollY;
  const delta = scrollY - lastScrollY;
  lastScrollY = scrollY;
  scrollVelocity = clamp(scrollVelocity + delta * 0.08, -14, 14);

  const scrollable = root.scrollHeight - viewport;
  const progress = scrollable > 0 ? scrollY / scrollable : 0;
  progressBar.style.transform = `scaleX(${clamp(progress, 0, 1)})`;

  header.classList.toggle('is-scrolled', scrollY > 20);
  if (!document.body.classList.contains('modal-open')) {
    if (delta > 4 && scrollY > 320) header.classList.add('is-hidden');
    else if (delta < -4 || scrollY < 320) header.classList.remove('is-hidden');
  }

  if (reduced) return;

  // Read every rect first, then write, so the browser lays out only once per frame.
  const mediaRects = mediaItems.map((media) => (media.closest('[hidden]') ? null : media.getBoundingClientRect()));
  const processRect = processGrid ? processGrid.getBoundingClientRect() : null;
  const manifestoRect = manifestoCard ? manifestoCard.getBoundingClientRect() : null;
  const scrubRects = scrubbers.map(({ element }) => element.getBoundingClientRect());

  mediaItems.forEach((media, index) => {
    const rect = mediaRects[index];
    if (!rect || rect.bottom < -100 || rect.top > viewport + 100) return;
    const offset = (rect.top + rect.height / 2 - viewport / 2) / viewport;
    const range = rect.height * 0.05;
    mediaImages[index].style.translate = `0 ${clamp(offset * -range * 1.6, -range, range).toFixed(1)}px`;
  });

  if (processRect && processRect.top < viewport && processRect.bottom > 0) {
    const amount = clamp((viewport * 0.8 - processRect.top) / (processRect.height * 0.75), 0, 1);
    processGrid.style.setProperty('--process-progress', amount.toFixed(3));
    processSteps.forEach((step, index) => step.classList.toggle('is-lit', amount >= (index + 0.5) / processSteps.length));
  }

  if (manifestoRect && manifestoRect.top < viewport && manifestoRect.bottom > 0) {
    const grow = clamp((viewport - manifestoRect.top) / (viewport * 0.7), 0, 1);
    manifestoCard.style.setProperty('--grow', grow.toFixed(3));
  }

  scrubbers.forEach(({ words, start, span }, index) => {
    const rect = scrubRects[index];
    if (rect.top > viewport || rect.bottom < 0) return;
    const amount = clamp((viewport * start - rect.top) / (rect.height + viewport * span), 0, 1);
    const lit = amount * (words.length + 4);
    words.forEach((word, wordIndex) => {
      const value = clamp(lit - wordIndex, 0.16, 1).toFixed(2);
      if (word.style.getPropertyValue('--word-opacity') !== value) word.style.setProperty('--word-opacity', value);
    });
  });
}

function requestScrollUpdate() {
  if (scrollTicking) return;
  scrollTicking = true;
  window.requestAnimationFrame(updateOnScroll);
}

updateOnScroll();
window.addEventListener('scroll', requestScrollUpdate, { passive: true });
window.addEventListener('resize', requestScrollUpdate, { passive: true });

/* ---------- Active nav link ---------- */

const navLinks = [...document.querySelectorAll('.site-header nav a:not(.nav-cta)')];
if ('IntersectionObserver' in window) {
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const link = navLinks.find((item) => item.getAttribute('href') === `#${entry.target.id}`);
      if (link) link.classList.toggle('is-active', entry.isIntersecting);
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  navLinks.forEach((link) => {
    const section = document.querySelector(link.getAttribute('href'));
    if (section) sectionObserver.observe(section);
  });
}

/* ---------- Infinite marquee that reacts to scroll ---------- */

const marqueeTrack = document.querySelector('[data-marquee]');
if (marqueeTrack && !reduced) {
  const group = marqueeTrack.querySelector('.marquee-group');
  let marqueeX = 0;
  let direction = -1;
  let running = true;
  let lastFrame = performance.now();

  function moveMarquee(now) {
    const dt = Math.min(64, now - lastFrame) / 16.67;
    lastFrame = now;
    if (Math.abs(scrollVelocity) > 0.4) direction = scrollVelocity > 0 ? -1 : 1;
    marqueeX += direction * (0.6 + Math.abs(scrollVelocity) * 0.6) * dt;
    scrollVelocity = lerp(scrollVelocity, 0, 0.08 * dt);
    const width = group.offsetWidth;
    if (width) {
      if (marqueeX <= -width) marqueeX += width;
      if (marqueeX > 0) marqueeX -= width;
    }
    marqueeTrack.style.transform = `translate3d(${marqueeX.toFixed(2)}px,0,0)`;
    if (running) window.requestAnimationFrame(moveMarquee);
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        lastFrame = performance.now();
        window.requestAnimationFrame(moveMarquee);
      } else if (!entry.isIntersecting) {
        running = false;
      }
    }).observe(marqueeTrack);
  }
  window.requestAnimationFrame(moveMarquee);
}

/* ---------- Count-up stats ---------- */

function formatCount(element, value) {
  if (element.dataset.format === 'time') {
    const total = Math.round(value);
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return String(Math.round(value)).padStart(Number(element.dataset.pad || 0), '0');
}

document.querySelectorAll('[data-count]').forEach((number) => {
  const target = Number(number.dataset.count);
  const host = number.closest('[data-reveal]');
  if (reduced || !host) return;
  number.textContent = formatCount(number, 0);
  host.addEventListener('reveal', () => {
    const start = performance.now();
    const duration = 1600;
    function step(now) {
      const t = clamp((now - start) / duration, 0, 1);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      number.textContent = formatCount(number, target * eased);
      if (t < 1) window.requestAnimationFrame(step);
    }
    window.setTimeout(() => window.requestAnimationFrame(step), 200);
  }, { once: true });
});

/* ---------- Capability chips stagger ---------- */

document.querySelectorAll('.capability-panel span').forEach((chip, index) => chip.style.setProperty('--i', String(index)));

/* ---------- Custom cursor ---------- */

if (richPointer) {
  root.classList.add('has-cursor');
  const cursor = document.querySelector('.cursor');
  cursor.classList.add('is-hidden');
  const dot = cursor.querySelector('.cursor-dot');
  const ring = cursor.querySelector('.cursor-ring');
  const label = cursor.querySelector('.cursor-label');
  const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const ringPos = { ...target };
  let cursorVisible = false;

  window.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    target.x = event.clientX;
    target.y = event.clientY;
    dot.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`;
    if (!cursorVisible) {
      cursorVisible = true;
      ringPos.x = target.x;
      ringPos.y = target.y;
      cursor.classList.remove('is-hidden');
    }
  }, { passive: true });

  document.addEventListener('pointerover', (event) => {
    const el = event.target instanceof Element ? event.target : null;
    if (!el) return;
    const media = el.closest('[data-cursor]');
    const link = el.closest('a, button, [data-magnetic]');
    cursor.classList.toggle('is-media', Boolean(media));
    cursor.classList.toggle('is-link', Boolean(link) && !media);
    cursor.classList.toggle('is-inverse', Boolean(el.closest('.manifesto-card, .contact-card')));
    if (media) label.textContent = media.dataset.cursor || 'Play';
  });

  document.addEventListener('pointerleave', () => {
    cursorVisible = false;
    cursor.classList.add('is-hidden');
  });

  // The ring eases toward the pointer and stops its loop once it has caught up.
  let ringMoving = false;
  function followRing() {
    ringPos.x = lerp(ringPos.x, target.x, 0.18);
    ringPos.y = lerp(ringPos.y, target.y, 0.18);
    ring.style.transform = `translate3d(${ringPos.x.toFixed(1)}px, ${ringPos.y.toFixed(1)}px, 0)`;
    if (Math.abs(target.x - ringPos.x) + Math.abs(target.y - ringPos.y) > 0.3) window.requestAnimationFrame(followRing);
    else ringMoving = false;
  }
  window.addEventListener('pointermove', () => {
    if (ringMoving) return;
    ringMoving = true;
    window.requestAnimationFrame(followRing);
  }, { passive: true });
}

/* ---------- Magnetic buttons ---------- */

if (richPointer) {
  document.querySelectorAll('[data-magnetic]').forEach((element) => {
    element.addEventListener('pointermove', (event) => {
      const bounds = element.getBoundingClientRect();
      const x = event.clientX - bounds.left - bounds.width / 2;
      const y = event.clientY - bounds.top - bounds.height / 2;
      element.style.transition = 'transform .15s ease-out, background .2s ease, color .2s ease, border-color .2s ease';
      element.style.transform = `translate(${(x * 0.25).toFixed(1)}px, ${(y * 0.35).toFixed(1)}px)`;
    });
    element.addEventListener('pointerleave', () => {
      element.style.transition = 'transform .6s cubic-bezier(.16,1,.3,1), background .2s ease, color .2s ease, border-color .2s ease';
      element.style.transform = '';
    });
  });
}

/* ---------- Hero panel tilt ---------- */

if (richPointer && heroPanel) {
  heroPanel.addEventListener('reveal', () => {
    window.setTimeout(() => heroPanel.classList.add('is-settled'), 1300);
  }, { once: true });
  heroPanel.addEventListener('pointermove', (event) => {
    if (!heroPanel.classList.contains('is-settled')) return;
    const bounds = heroPanel.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    heroPanel.classList.add('is-tilting');
    heroPanel.style.setProperty('--rx', `${(-y * 5).toFixed(2)}deg`);
    heroPanel.style.setProperty('--ry', `${(x * 6).toFixed(2)}deg`);
  });
  heroPanel.addEventListener('pointerleave', () => {
    heroPanel.classList.remove('is-tilting');
    heroPanel.style.setProperty('--rx', '0deg');
    heroPanel.style.setProperty('--ry', '0deg');
  });
}

/* ---------- Contact spotlight ---------- */

const spotlight = document.querySelector('[data-spotlight]');
if (spotlight && richPointer) {
  spotlight.addEventListener('pointermove', (event) => {
    const bounds = spotlight.getBoundingClientRect();
    spotlight.style.setProperty('--mx', `${(((event.clientX - bounds.left) / bounds.width) * 100).toFixed(1)}%`);
    spotlight.style.setProperty('--my', `${(((event.clientY - bounds.top) / bounds.height) * 100).toFixed(1)}%`);
  });
}

/* ---------- Copy email ---------- */

let toastTimer = null;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2200);
}

document.querySelectorAll('[data-copy-email]').forEach((button) => {
  button.addEventListener('click', async () => {
    const email = button.dataset.copyEmail;
    try {
      await navigator.clipboard.writeText(email);
      showToast('Email copied ✓');
    } catch {
      showToast(email);
    }
  });
});

/* ---------- Work cards: tilt + hover preview ---------- */

function stopPreview(media = activePreview) {
  if (!media) return;
  const preview = media.querySelector('.work-preview');
  if (preview) {
    preview.pause();
    preview.removeAttribute('src');
    preview.remove();
  }
  media.classList.remove('is-previewing');
  if (activePreview === media) activePreview = null;
}

function startPreview(media) {
  if (!supportsHover.matches || media === activePreview) return;
  stopPreview();

  const preview = document.createElement('video');
  preview.className = 'work-preview';
  preview.muted = true;
  preview.loop = true;
  preview.playsInline = true;
  preview.preload = 'metadata';
  preview.setAttribute('aria-hidden', 'true');
  preview.src = media.dataset.video;

  const poster = media.querySelector('img');
  if (poster) preview.poster = poster.currentSrc || poster.src;
  media.insertBefore(preview, media.querySelector('.preview-label'));
  media.classList.add('is-previewing');
  activePreview = media;
  preview.play().catch(() => stopPreview(media));
}

function resetTilt(media) {
  media.classList.remove('is-tilting');
  media.style.setProperty('--rx', '0deg');
  media.style.setProperty('--ry', '0deg');
}

if (richPointer) {
  mediaItems.forEach((media) => {
    media.addEventListener('pointermove', (event) => {
      const bounds = media.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width;
      const y = (event.clientY - bounds.top) / bounds.height;
      media.classList.add('is-tilting');
      media.style.setProperty('--rx', `${((0.5 - y) * 7).toFixed(2)}deg`);
      media.style.setProperty('--ry', `${((x - 0.5) * 9).toFixed(2)}deg`);
      media.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
      media.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
    });
    media.addEventListener('pointerleave', () => resetTilt(media));
  });
}

/* ---------- Video modal with playlist ---------- */

function filmFromMedia(media) {
  const poster = media.querySelector('img');
  return {
    video: media.dataset.video,
    title: media.dataset.title,
    role: media.dataset.role,
    category: media.closest('.work-card').dataset.category,
    portrait: media.dataset.orientation === 'portrait',
    poster: poster ? poster.currentSrc || poster.src : '',
  };
}

const showreelFilm = {
  video: 'showreel.mp4',
  title: 'Showreel',
  role: 'Selected work · 2026',
  category: 'Showreel',
  portrait: false,
  poster: 'showreel.webp',
};

function loadFilm(film, direction = 0) {
  modalTitle.textContent = film.title;
  modalCategory.textContent = film.category;
  modalRole.textContent = film.role;
  modalVideo.poster = film.poster;
  modalVideo.src = film.video;
  modalPanel.classList.toggle('portrait', film.portrait);
  modalPanel.classList.toggle('is-single', playlist.length < 2);
  modalCounter.textContent = `${String(playlistIndex + 1).padStart(2, '0')} / ${String(playlist.length).padStart(2, '0')}`;
  modal.setAttribute('aria-label', `${film.title} video player`);
  if (direction) {
    modalVideo.style.setProperty('--swap-dir', String(direction));
    modalVideo.classList.remove('is-swapping');
    void modalVideo.offsetWidth;
    modalVideo.classList.add('is-swapping');
  }
  modalVideo.play().catch(() => {});
}

function openPlaylist(list, index) {
  window.clearTimeout(closingTimer);
  stopPreview();
  if (modal.hidden) lastFocused = document.activeElement;
  playlist = list;
  playlistIndex = index;
  modal.classList.remove('is-closing');
  modal.hidden = false;
  document.body.classList.add('modal-open');
  header.classList.remove('is-hidden');
  loadFilm(playlist[playlistIndex]);
  modalClose.focus({ preventScroll: true });
}

function openVideo(media) {
  const visibleMedia = cards.filter((card) => !card.hidden).map((card) => card.querySelector('.work-media'));
  openPlaylist(visibleMedia.map(filmFromMedia), Math.max(0, visibleMedia.indexOf(media)));
}

function stepVideo(direction) {
  if (modal.hidden || playlist.length < 2) return;
  playlistIndex = (playlistIndex + direction + playlist.length) % playlist.length;
  loadFilm(playlist[playlistIndex], direction);
}

function closeVideo() {
  if (modal.hidden || modal.classList.contains('is-closing')) return;
  modalVideo.pause();
  modal.classList.add('is-closing');
  closingTimer = window.setTimeout(() => {
    modal.hidden = true;
    modal.classList.remove('is-closing');
    modalPanel.classList.remove('portrait', 'is-single');
    modalVideo.classList.remove('is-swapping');
    modalVideo.removeAttribute('src');
    modalVideo.removeAttribute('poster');
    modalVideo.load();
    document.body.classList.remove('modal-open');
    if (lastFocused instanceof HTMLElement) lastFocused.focus({ preventScroll: true });
  }, 280);
}

cards.forEach((card) => {
  const media = card.querySelector('.work-media');
  const openButton = card.querySelector('[data-open-video]');
  media.addEventListener('mouseenter', () => startPreview(media));
  media.addEventListener('mouseleave', () => stopPreview(media));
  media.addEventListener('focus', () => startPreview(media));
  media.addEventListener('blur', () => stopPreview(media));
  media.addEventListener('click', () => openVideo(media));
  openButton.addEventListener('click', () => openVideo(media));
});

document.querySelectorAll('[data-open-reel]').forEach((trigger) => {
  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    openPlaylist([showreelFilm], 0);
  });
});

document.querySelectorAll('[data-open-index]').forEach((button) => {
  button.addEventListener('click', () => {
    const allMedia = cards.map((card) => card.querySelector('.work-media'));
    openPlaylist(allMedia.map(filmFromMedia), Number(button.dataset.openIndex));
  });
});

modal.querySelectorAll('[data-modal-step]').forEach((button) => {
  button.addEventListener('click', () => stepVideo(Number(button.dataset.modalStep)));
});
modalClose.addEventListener('click', closeVideo);
modalBackdrop.addEventListener('click', closeVideo);

window.addEventListener('keydown', (event) => {
  if (modal.hidden) return;
  if (event.key === 'Escape') closeVideo();
  else if (event.key === 'ArrowRight' && event.target !== modalVideo) stepVideo(1);
  else if (event.key === 'ArrowLeft' && event.target !== modalVideo) stepVideo(-1);
  else if (event.key === 'Tab') {
    const focusable = [...modal.querySelectorAll('button:not(.modal-backdrop), video')]
      .filter((el) => el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopPreview();
});

/* ---------- Filters with sliding pill ---------- */

const pill = document.createElement('span');
pill.className = 'filter-pill';
pill.setAttribute('aria-hidden', 'true');
filterGroup.prepend(pill);
filterGroup.classList.add('has-pill');

filterButtons.forEach((button) => {
  const filter = button.dataset.filter;
  const count = filter === 'All' ? cards.length : cards.filter((card) => card.dataset.category === filter).length;
  const badge = document.createElement('span');
  badge.className = 'filter-count';
  badge.setAttribute('aria-hidden', 'true');
  badge.textContent = String(count);
  button.append(badge);
});

function movePill() {
  const active = filterButtons.find((button) => button.classList.contains('active'));
  if (!active) return;
  pill.style.width = `${active.offsetWidth}px`;
  pill.style.height = `${active.offsetHeight}px`;
  pill.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
}

movePill();
window.addEventListener('resize', movePill, { passive: true });
if (document.fonts) document.fonts.ready.then(movePill);

let filterTimer = null;
filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    if (button.classList.contains('active')) return;
    stopPreview();
    const filter = button.dataset.filter;

    filterButtons.forEach((item) => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    movePill();

    window.clearTimeout(filterTimer);
    workGrid.classList.add('is-filtering');
    filterTimer = window.setTimeout(() => {
      let visibleIndex = 0;
      cards.forEach((card) => {
        const visible = filter === 'All' || card.dataset.category === filter;
        card.hidden = !visible;
        if (!visible) return;
        card.style.setProperty('--card-index', String(visibleIndex));
        visibleIndex += 1;
        card.classList.remove('is-visible');
        window.requestAnimationFrame(() => observeReveal(card));
      });
      workGrid.classList.remove('is-filtering');
      requestScrollUpdate();
    }, reduced ? 0 : 250);
  });
});

/* ---------- Ambient light streaks ---------- */

// Rendered at reduced resolution (the streaks are soft anyway), paused while the
// page scrolls, and drawn once as a still frame on low-power or touch devices.
const streakCanvas = document.querySelector('.streaks');
if (streakCanvas && streakCanvas.getContext) {
  const ctx = streakCanvas.getContext('2d');
  const lowPower = reduced
    || !supportsHover.matches
    || (navigator.hardwareConcurrency || 8) <= 4
    || Boolean(navigator.connection && navigator.connection.saveData);
  const renderScale = 0.6;
  const bundles = [
    { y: 0.32, slope: -0.32, amp: 0.16, freq: 0.0022, speed: 0.22, spread: 150, strands: 16, hue: 78, phase: 0 },
    { y: 0.78, slope: 0.12, amp: 0.1, freq: 0.0016, speed: -0.16, spread: 110, strands: 11, hue: 160, phase: 2.1 },
  ];
  const sparks = Array.from({ length: 24 }, () => ({ x: Math.random(), b: Math.random() < 0.7 ? 0 : 1, o: Math.random() - 0.5, v: 0.0006 + Math.random() * 0.0014, r: Math.random() * 1.4 + 0.5 }));
  let width = 0;
  let height = 0;
  let lastDraw = 0;
  let lastScrollAt = 0;
  let running = false;

  function resizeStreaks() {
    width = window.innerWidth;
    height = window.innerHeight;
    streakCanvas.width = Math.round(width * renderScale);
    streakCanvas.height = Math.round(height * renderScale);
    ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
  }

  function bundlePoint(bundle, x, t, offset) {
    const base = height * bundle.y + (x - width / 2) * bundle.slope
      + Math.sin(x * bundle.freq + t * bundle.speed + bundle.phase) * height * bundle.amp
      + Math.sin(x * bundle.freq * 2.3 - t * bundle.speed * 1.6) * height * bundle.amp * 0.3;
    const pinch = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(x * 0.0035 + t * 0.35 + bundle.phase));
    return base + offset * bundle.spread * pinch;
  }

  function tracePath(bundle, t, offset, step) {
    ctx.beginPath();
    for (let x = -40; x <= width + 40; x += step) {
      const y = bundlePoint(bundle, x, t, offset);
      if (x === -40) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  }

  function drawStreaks(now) {
    const t = now / 1000;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';
    const step = 26;

    bundles.forEach((bundle) => {
      tracePath(bundle, t, 0, step);
      ctx.strokeStyle = `hsla(${bundle.hue}, 95%, 60%, 0.07)`;
      ctx.lineWidth = 22;
      ctx.stroke();
      for (let i = 0; i < bundle.strands; i += 1) {
        const offset = i / (bundle.strands - 1) - 0.5;
        const center = 1 - Math.abs(offset) * 2;
        tracePath(bundle, t, offset, step);
        ctx.strokeStyle = `hsla(${bundle.hue + offset * 40}, 90%, ${55 + center * 15}%, ${0.06 + center * 0.18})`;
        ctx.lineWidth = 0.8 + center * 1.1;
        ctx.stroke();
      }
    });

    sparks.forEach((spark) => {
      if (!lowPower) spark.x = (spark.x + spark.v) % 1.05;
      const x = spark.x * width;
      const y = bundlePoint(bundles[spark.b], x, t, spark.o);
      ctx.fillStyle = `hsla(${bundles[spark.b].hue}, 100%, 75%, ${0.35 + Math.sin(t * 3 + spark.o * 10) * 0.25})`;
      ctx.fillRect(x - spark.r, y - spark.r, spark.r * 2, spark.r * 2);
    });
    ctx.globalCompositeOperation = 'source-over';
  }

  function loop(now) {
    if (document.hidden) {
      running = false;
      return;
    }
    const scrolling = now - lastScrollAt < 180;
    const modalOpen = document.body.classList.contains('modal-open');
    if (!scrolling && !modalOpen && now - lastDraw > 40) {
      lastDraw = now;
      drawStreaks(now);
    }
    window.requestAnimationFrame(loop);
  }

  function start() {
    if (running || lowPower) return;
    running = true;
    window.requestAnimationFrame(loop);
  }

  resizeStreaks();
  drawStreaks(performance.now());
  window.addEventListener('resize', () => {
    resizeStreaks();
    drawStreaks(performance.now());
  }, { passive: true });
  window.addEventListener('scroll', () => { lastScrollAt = performance.now(); }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) start();
  });
  start();
}
