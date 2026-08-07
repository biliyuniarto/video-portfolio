const filterButtons = [...document.querySelectorAll('[data-filter]')];
const cards = [...document.querySelectorAll('.work-card')];
const dialog = document.querySelector('.video-modal');
const modalPanel = dialog.querySelector('.modal-panel');
const modalVideo = document.querySelector('#modal-video');
const modalTitle = document.querySelector('#modal-title');
const modalRole = document.querySelector('#modal-role');

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    filterButtons.forEach((item) => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    cards.forEach((card) => {
      card.hidden = filter !== 'All' && card.dataset.category !== filter;
    });
  });
});

function openVideo(media) {
  modalTitle.textContent = media.dataset.title;
  modalRole.textContent = media.dataset.role;
  modalVideo.src = media.dataset.video;
  modalPanel.classList.toggle('portrait', media.dataset.orientation === 'portrait');
  dialog.showModal();
  modalVideo.play().catch(() => {});
}

cards.forEach((card) => {
  const media = card.querySelector('.work-media');
  media.addEventListener('click', () => openVideo(media));
  card.querySelector('[data-open-video]').addEventListener('click', () => openVideo(media));
});

function closeVideo() {
  modalVideo.pause();
  modalVideo.removeAttribute('src');
  modalVideo.load();
  dialog.close();
}

dialog.querySelector('.modal-close').addEventListener('click', closeVideo);
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) closeVideo();
});
