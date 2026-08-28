// ── Component loader ──────────────────────────────────
function loadHTML(id, url, callback) {
  const el = document.getElementById(id);
  if (!el) return Promise.resolve();
  return fetch(url)
    .then(r => r.text())
    .then(html => {
      el.innerHTML = html;
      if (callback) callback();
    });
}

// ── Active nav link ───────────────────────────────────
function initNav() {
  const page = document.documentElement.dataset.page;
  document.querySelectorAll('[data-nav]').forEach(a => {
    if (a.dataset.nav === page) a.style.color = '#3a80c8';
  });

  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  if (!hamburger || !mobileMenu) return;

  hamburger.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    document.body.style.overflow = open ? 'hidden' : '';
    const bars  = document.getElementById('icon-bars');
    const close = document.getElementById('icon-close');
    if (bars)  bars.classList.toggle('hidden', open);
    if (close) close.classList.toggle('hidden', !open);
  });
}

// ── Close mobile menu (global, used by onclick attrs) ─
function closeMobileMenu() {
  const mobileMenu = document.getElementById('mobile-menu');
  if (!mobileMenu) return;
  mobileMenu.classList.remove('open');
  document.body.style.overflow = '';
  const bars  = document.getElementById('icon-bars');
  const close = document.getElementById('icon-close');
  if (bars)  bars.classList.remove('hidden');
  if (close) close.classList.add('hidden');
}

// ── Scroll reveal ─────────────────────────────────────
function initReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('revealed'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('[data-reveal]').forEach(el => obs.observe(el));
}

// ── Smooth scroll ─────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
  });
});

// ── Resize handler ────────────────────────────────────
window.addEventListener('resize', () => {
  if (window.innerWidth >= 768) closeMobileMenu();
});

// ── Boot ─────────────────────────────────────────────
Promise.all([
  loadHTML('nav-root',    'components/nav.html',    initNav),
  loadHTML('footer-root', 'components/footer.html', null),
]).then(() => {
  // If nav-root wasn't in the DOM, the nav is inlined directly into the page
  // and loadHTML's callback never fired — run initNav now so the hamburger
  // click handler gets attached on mobile.
  if (!document.getElementById('nav-root')) initNav();
  initReveal();
});
