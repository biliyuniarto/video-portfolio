const filterButtons = [...document.querySelectorAll('[data-filter]')];
const cards = [...document.querySelectorAll('.work-card')];
const modal = document.querySelector('.video-modal');
const modalPanel = modal.querySelector('.modal-panel');
const modalVideo = document.querySelector('#modal-video');
const modalTitle = document.querySelector('#modal-title');
const modalCategory = document.querySelector('#modal-category');
const modalRole = document.querySelector('#modal-role');
const modalClose = modal.querySelector('.modal-close');
const modalBackdrop = modal.querySelector('.modal-backdrop');
const progressBar = document.querySelector('.scroll-progress div');
const heroStage = document.querySelector('.hero-stage');
const heroVideo = document.querySelector('[data-hero-video]');
const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let activePreview = null;
let closingTimer = null;
let lastFocused = null;

document.documentElement.classList.add('motion-ready');
if (!prefersReducedMotion.matches) heroVideo.play().catch(() => {});

const revealObserver = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8%' })
  : null;

function observeReveal(element) {
  if (element.hidden) return;
  if (revealObserver) revealObserver.observe(element);
  else element.classList.add('is-visible');
}

document.querySelectorAll('[data-reveal]').forEach(observeReveal);

let scrollTicking = false;
function updateScrollProgress() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
  progressBar.style.transform = `scaleX(${Math.min(1, Math.max(0, progress))})`;
  scrollTicking = false;
}

function requestScrollProgress() {
  if (scrollTicking) return;
  scrollTicking = true;
  window.requestAnimationFrame(updateScrollProgress);
}

updateScrollProgress();
window.addEventListener('scroll', requestScrollProgress, { passive: true });
window.addEventListener('resize', requestScrollProgress, { passive: true });

function resetHeroStage() {
  heroStage.style.setProperty('--stage-x', '0');
  heroStage.style.setProperty('--stage-y', '0');
}

heroStage.addEventListener('pointermove', (event) => {
  if (event.pointerType === 'touch') return;
  const bounds = heroStage.getBoundingClientRect();
  const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
  const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
  heroStage.style.setProperty('--stage-x', x.toFixed(3));
  heroStage.style.setProperty('--stage-y', y.toFixed(3));
});
heroStage.addEventListener('pointerleave', resetHeroStage);

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

function openVideo(media) {
  window.clearTimeout(closingTimer);
  stopPreview();
  lastFocused = document.activeElement;

  const card = media.closest('.work-card');
  const poster = media.querySelector('img');
  modalTitle.textContent = media.dataset.title;
  modalCategory.textContent = card.dataset.category;
  modalRole.textContent = media.dataset.role;
  modalVideo.poster = poster ? poster.currentSrc || poster.src : '';
  modalVideo.src = media.dataset.video;
  modalPanel.classList.toggle('portrait', media.dataset.orientation === 'portrait');
  modal.classList.remove('is-closing');
  modal.hidden = false;
  modal.setAttribute('aria-label', `${media.dataset.title} video player`);
  document.body.classList.add('modal-open');
  modalClose.focus({ preventScroll: true });
  modalVideo.play().catch(() => {});
}

function closeVideo() {
  if (modal.hidden || modal.classList.contains('is-closing')) return;
  modalVideo.pause();
  modal.classList.add('is-closing');
  closingTimer = window.setTimeout(() => {
    modal.hidden = true;
    modal.classList.remove('is-closing');
    modalPanel.classList.remove('portrait');
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

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    stopPreview();
    const filter = button.dataset.filter;
    let visibleIndex = 0;

    filterButtons.forEach((item) => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });

    cards.forEach((card) => {
      const visible = filter === 'All' || card.dataset.category === filter;
      card.hidden = !visible;
      if (!visible) return;
      card.style.setProperty('--card-index', String(visibleIndex));
      visibleIndex += 1;
      card.classList.remove('is-visible');
      window.requestAnimationFrame(() => observeReveal(card));
    });

    window.requestAnimationFrame(updateScrollProgress);
  });
});

modalClose.addEventListener('click', closeVideo);
modalBackdrop.addEventListener('click', closeVideo);
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeVideo();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopPreview();
});
