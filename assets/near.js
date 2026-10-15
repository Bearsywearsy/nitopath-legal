/* "How many cameras are near you?": type a city, ZIP code or address (or use your location) and get
   the live count of mapped cameras within 10 miles, the nearest one, who runs them, and a small plot.
   It asks the same public functions the web app uses: `geocode` for the place and `cameras` (near mode)
   for the count, which also refreshes that area from OpenStreetMap if it is out of date. */
const API = 'https://fqwllcpaadrwujyzddda.supabase.co/functions/v1/';
const KEY = 'sb_publishable_U9mj_OskHw6ZotXFKjng9g_dI6BBZJS'; // public, same key the web app ships
const RADIUS_M = 16093; // 10 miles
const MI = 1609.344;
const fmt = (n) => n.toLocaleString('en-US');

async function call(name, body, signal) {
  const res = await fetch(API + name, {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: KEY }, body: JSON.stringify(body), signal,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Request failed (' + res.status + ')');
  return json;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

for (const root of document.querySelectorAll('[data-near]')) {
  const form = root.querySelector('form'), input = root.querySelector('input[type=search]');
  const list = root.querySelector('.near-suggest'), out = root.querySelector('.near-result');
  const locBtn = root.querySelector('[data-locate]');
  let suggestions = [], active = -1, typing, controller;

  function showSuggestions(items) {
    suggestions = items; active = -1;
    list.innerHTML = items.map((p, i) => '<li role="option" id="near-opt-' + i + '" data-i="' + i + '"><b>' + esc(p.name) + '</b>' +
      (p.label && p.label !== p.name ? '<span>' + esc(p.label) + '</span>' : '') + '</li>').join('');
    list.hidden = !items.length;
    input.setAttribute('aria-expanded', String(!!items.length));
  }
  function highlight(i) {
    active = i;
    list.querySelectorAll('li').forEach((li, k) => li.setAttribute('aria-selected', String(k === i)));
    input.setAttribute('aria-activedescendant', i >= 0 ? 'near-opt-' + i : '');
  }

  input.addEventListener('input', () => {
    clearTimeout(typing);
    const q = input.value.trim();
    if (q.length < 3) { showSuggestions([]); return; }
    typing = setTimeout(() => {
      call('geocode', { query: q }).then((r) => { if (input.value.trim() === q) showSuggestions((r.results || []).slice(0, 5)); }).catch(() => {});
    }, 250);
  });
  input.addEventListener('keydown', (e) => {
    if (list.hidden) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); highlight(Math.min(suggestions.length - 1, active + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(Math.max(-1, active - 1)); }
    else if (e.key === 'Escape') showSuggestions([]);
  });
  list.addEventListener('pointerdown', (e) => {
    const li = e.target.closest('li'); if (!li) return;
    e.preventDefault(); choose(suggestions[+li.dataset.i]);
  });
  input.addEventListener('blur', () => setTimeout(() => showSuggestions([]), 150));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (active >= 0) return choose(suggestions[active]);
    const q = input.value.trim();
    if (q.length < 2) { input.focus(); return; }
    status('Finding ' + esc(q) + '…');
    try {
      const r = await call('geocode', { query: q });
      if (!r.results || !r.results.length) return status('No place called “' + esc(q) + '” came up. Try a city and state, or a ZIP code.', true);
      choose(r.results[0]);
    } catch (err) { status('Search is not answering right now. Please try again in a moment.', true); }
  });

  locBtn?.addEventListener('click', () => {
    if (!navigator.geolocation) return status('This browser can’t share your location. Type a city or ZIP code instead.', true);
    status('Waiting for your location…');
    navigator.geolocation.getCurrentPosition(
      (p) => choose({ name: 'your location', label: '', lat: p.coords.latitude, lng: p.coords.longitude, here: true }),
      () => status('Location wasn’t shared. Type a city or ZIP code instead.', true),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  });

  function status(html, isError) {
    out.hidden = false;
    out.innerHTML = '<p class="near-status' + (isError ? ' err' : '') + '" role="status">' + html + '</p>';
  }

  async function choose(place) {
    showSuggestions([]);
    if (!place.here) input.value = place.label || place.name;
    controller?.abort(); controller = new AbortController();
    status('Counting cameras near ' + esc(place.name) + '… <span class="near-spin" aria-hidden="true"></span>');
    let r;
    try { r = await call('cameras', { near: { lat: place.lat, lng: place.lng }, radiusM: RADIUS_M }, controller.signal); }
    catch (err) { if (!controller.signal.aborted) status('The camera count is not answering right now. Please try again in a moment.', true); return; }
    render(place, r.cameras || [], r.coverage);
  }

  function render(place, cams, coverage) {
    const n = cams.length;
    const where = place.here ? 'you' : esc(place.name);
    const nearest = cams.reduce((m, c) => (c.distance_m != null && c.distance_m < m ? c.distance_m : m), Infinity);
    const ops = {};
    cams.forEach((c) => { const k = (c.operator || '').trim() || 'Operator not recorded'; ops[k] = (ops[k] || 0) + 1; });
    const topOps = Object.entries(ops).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const pending = coverage && coverage.pendingTiles > 0;

    out.hidden = false;
    out.innerHTML =
      '<div class="near-grid">' +
        '<div class="near-count">' +
          '<div class="near-big">' + fmt(n) + '</div>' +
          '<p class="near-what">mapped license plate camera' + (n === 1 ? '' : 's') + ' within 10 miles of ' + where + '</p>' +
          (n ? '<p class="near-sub">The nearest is ' + (nearest < 0.1 * MI ? 'less than 0.1 mi' : (nearest / MI).toFixed(1) + ' mi') + ' away.</p>' :
               '<p class="near-sub">None mapped yet. Volunteers add new ones every day, so a quiet area can still have cameras nobody has mapped.</p>') +
          (n ? '<ul class="near-rings">' + [1, 5, 10].map((mi) => '<li><b>' + fmt(cams.filter((c) => c.distance_m == null ? mi === 10 : c.distance_m <= mi * MI).length) +
            '</b><span>within ' + mi + ' mi</span></li>').join('') + '</ul>' : '') +
          (pending ? '<p class="near-sub">Part of this area is still being refreshed from OpenStreetMap, so the count may grow. Search again in a minute.</p>' : '') +
          (topOps.length ? '<p class="near-label">Who runs them</p><ul class="near-ops">' + topOps.map(([k, v]) =>
            '<li><span>' + esc(k) + '</span><b>' + fmt(v) + '</b></li>').join('') + '</ul>' : '') +
          '<div class="near-actions"><a class="btn" href="/app/">See them on the map</a><a class="btn ghost" href="/app/plan/">Plan a trip</a>' +
            (place.here ? '' : '<button type="button" class="btn ghost" data-share>Copy link</button>') + '</div>' +
        '</div>' +
        plot(place, cams) +
      '</div>';
    // A searched place (never "my location") goes into the address bar, so the result can be shared.
    if (!place.here) {
      const url = new URL(location.href);
      url.searchParams.set('near', input.value.trim()); url.hash = 'near';
      history.replaceState(null, '', url);
      out.querySelector('[data-share]')?.addEventListener('click', async (e) => {
        try { await navigator.clipboard.writeText(url.href); e.target.textContent = 'Link copied'; }
        catch { e.target.textContent = url.href; }
      });
    }
  }

  /** A small top-down plot: the 10-mile circle, rings at 2.5 and 5 miles, and a dot per camera. */
  function plot(place, cams) {
    const R = 120, cos = Math.cos(place.lat * Math.PI / 180);
    const dots = cams.map((c) => {
      const dx = (c.lng - place.lng) * 111320 * cos / RADIUS_M * R, dy = -(c.lat - place.lat) * 111320 / RADIUS_M * R;
      return Math.hypot(dx, dy) <= R + 2 ? '<circle cx="' + dx.toFixed(1) + '" cy="' + dy.toFixed(1) + '" r="3"/>' : '';
    }).join('');
    return '<svg class="near-plot" viewBox="-130 -130 260 260" role="img" aria-label="Plot of the cameras within 10 miles; the centre is the place you searched">' +
      '<circle class="ring" r="120"/><circle class="ring faint" r="60"/><circle class="ring faint" r="30"/>' +
      '<text x="0" y="-123">10 mi</text><text x="0" y="-63">5 mi</text>' +
      '<g class="dots">' + dots + '</g><circle class="me" r="6"/></svg>';
  }

  // A shared link (?near=Denver) runs the search straight away.
  const shared = new URLSearchParams(location.search).get('near');
  if (shared) { input.value = shared.slice(0, 200); form.requestSubmit(); }
}
