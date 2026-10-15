/* Homepage bits that don't need a library: the fewer / fastest / more route switch, and turning the
   "last updated" date into "3 hours ago". */
const ROUTES = { few: ['24 min', '9.8 mi', 1], fast: ['19 min', '8.1 mi', 4], more: ['21 min', '8.6 mi', 5] };
const demo = document.querySelector('.routes-demo');
if (demo) {
  const svg = demo.querySelector('svg'), cams = svg.querySelector('.cams');
  const pick = (k) => {
    demo.querySelectorAll('[data-route]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.route === k)));
    svg.querySelectorAll('.route').forEach((p) => {
      p.classList.toggle('on', p.dataset.r === k);
      if (p.dataset.r === k) cams.before(p); // the chosen route draws over the others, under the cameras
    });
    cams.querySelectorAll('g').forEach((g) => g.classList.toggle('on', g.dataset.on.split(' ').includes(k)));
    const [t, d, n] = ROUTES[k];
    demo.querySelector('[data-m=time]').textContent = t;
    demo.querySelector('[data-m=dist]').textContent = d;
    demo.querySelector('[data-m=cams]').textContent = String(n);
  };
  demo.querySelectorAll('[data-route]').forEach((b) => b.addEventListener('click', () => pick(b.dataset.route)));
  pick('few');
}

for (const t of document.querySelectorAll('time[data-ago]')) {
  const h = (Date.now() - Date.parse(t.dateTime)) / 3.6e6;
  if (!(h >= 0)) continue;
  t.textContent = h < 1 ? 'less than an hour ago' : h < 48 ? Math.floor(h) + ' hour' + (Math.floor(h) === 1 ? '' : 's') + ' ago' : Math.floor(h / 24) + ' days ago';
  t.title = new Date(t.dateTime).toLocaleString();
}

// "/" jumps to the camera search, like the search shortcut on map sites.
const nearInput = document.getElementById('near-q');
document.addEventListener('keydown', (e) => {
  if (e.key !== '/' || !nearInput || e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target;
  if (t.closest && t.closest('input, textarea, select, [contenteditable]')) return;
  e.preventDefault();
  nearInput.scrollIntoView({ block: 'center' });
  nearInput.focus({ preventScroll: true });
});
