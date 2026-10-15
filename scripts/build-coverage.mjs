// Builds the camera coverage data behind the homepage 3D map, the live numbers and the state pages.
//
//   node scripts/build-coverage.mjs --fetch          ask NitoPath's public `cameras` function (what the
//                                                   daily GitHub Action runs)
//   node scripts/build-coverage.mjs --csv file.csv   use a saved pull with columns lat,lng,n
//
// It counts cameras in half-degree squares (about 35 x 30 miles), places each square on a US map,
// works out its state, and writes:
//   assets/data/coverage.json   squares, state outlines and totals for the browser
//   _data/coverage.json         state totals and rankings for Jekyll
//   states/<state>.html         one page per state (front matter only; _layouts/state.html draws it)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { feature, mesh } from 'topojson-client';
import { geoAlbersUsa, geoContains, geoDistance, geoPath } from 'd3-geo';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SUPABASE_URL = 'https://fqwllcpaadrwujyzddda.supabase.co';
const SUPABASE_KEY = 'sb_publishable_U9mj_OskHw6ZotXFKjng9g_dI6BBZJS'; // public, same key the web app ships
const CELL = 0.5;
// Map space: d3's Albers USA projection, 975 x 610 like the us-atlas examples, with Alaska and Hawaii inset.
const proj = geoAlbersUsa().scale(1300).translate([487.5, 305]);
const pathGen = geoPath(proj);

const args = process.argv.slice(2);
const rows = args.includes('--fetch') ? await fetchCells()
  : args.includes('--csv') ? readCsv(args[args.indexOf('--csv') + 1])
  : (console.error('Pass --fetch or --csv <file>'), process.exit(1));
if (rows.length < 500) throw new Error(`Only ${rows.length} squares came back; refusing to overwrite the map`);

/** The cameras function answers a 4-degree box with counts per half-degree square. */
async function fetchCells() {
  const boxes = [];
  const grid = (lat0, lat1, lng0, lng1) => {
    for (let lat = lat0; lat < lat1; lat += 4) for (let lng = lng0; lng < lng1; lng += 4) boxes.push([lat, lng]);
  };
  grid(24, 52, -126, -62);   // lower 48
  grid(48, 72, -172, -128);  // Alaska
  grid(16, 24, -164, -152);  // Hawaii
  const cells = new Map();
  for (const [lat, lng] of boxes) {
    const body = { bbox: { minLat: lat, minLng: lng, maxLat: lat + 4, maxLng: lng + 4 }, overview: true };
    let json;
    for (let attempt = 1; ; attempt++) {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/cameras`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY }, body: JSON.stringify(body),
      });
      if (res.ok) { json = await res.json(); break; }
      if (attempt === 3) throw new Error(`cameras ${res.status} for box ${lat},${lng}: ${await res.text()}`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
    for (const c of json.overview ?? []) {
      const key = `${Math.floor(c.lat / CELL)},${Math.floor(c.lng / CELL)}`;
      if ((cells.get(key)?.[2] ?? 0) < c.n) cells.set(key, [c.lat, c.lng, c.n]);
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  return [...cells.values()];
}

function readCsv(file) {
  return fs.readFileSync(file, 'utf8').trim().split('\n').slice(1)
    .map((l) => l.split(',').map(Number)).filter((r) => r.length === 3 && r[2] > 0);
}

const atlas = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules/us-atlas', f), 'utf8'));
const us = atlas('states-10m.json');
const countiesTopo = atlas('counties-10m.json');
// The 50 states and DC; territories have no map space in Albers USA.
const states = feature(us, us.objects.states).features.filter((f) => +f.id <= 56);
const counties = feature(countiesTopo, countiesTopo.objects.counties).features;

/** The feature whose outline passes closest to a point, and how far that is (radians). */
function nearest(features, lng, lat) {
  let d = Infinity, f = null;
  for (const feat of features) {
    const polys = feat.geometry.type === 'Polygon' ? [feat.geometry.coordinates] : feat.geometry.coordinates;
    for (const poly of polys) for (const pt of poly[0]) {
      const g = geoDistance(pt, [lng, lat]);
      if (g < d) { d = g; f = feat; }
    }
  }
  return { f, d };
}

/** A square's centre can sit over water (a bay, a lake shore); give it to a state whose edge is within ~17 miles. */
function stateOf(lng, lat) {
  const i = states.findIndex((f) => geoContains(f, [lng, lat]));
  if (i >= 0) return i;
  const { f, d } = nearest(states, lng, lat);
  return d <= (0.25 * Math.PI) / 180 ? states.indexOf(f) : -1;
}

const perState = states.map(() => ({ total: 0, areas: 0, cells: [] }));
const cells = [];
let total = 0;
for (const [lat, lng, n] of rows) {
  const p = proj([lng, lat]);
  if (!p) continue; // Canada, Mexico
  const si = stateOf(lng, lat);
  if (si < 0) continue;
  total += n;
  perState[si].total += n; perState[si].areas++; perState[si].cells.push([lat, lng, n]);
  cells.push([Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10, n, si]);
}
cells.sort((a, b) => a[2] - b[2]);

const slug = (name) => name.toLowerCase().replace(/[^a-z]+/g, '-');
const round = (v) => Math.round(v);
const stateRows = states.map((f, i) => {
  const b = pathGen.bounds(f), c = pathGen.centroid(f);
  return { i, name: f.properties.name, slug: slug(f.properties.name), id: f.id, ...perState[i],
    box: [round(b[0][0]), round(b[0][1]), round(b[1][0]), round(b[1][1])], center: [round(c[0]), round(c[1])] };
});
const ranked = stateRows.filter((s) => s.total > 0).sort((a, b) => b.total - a.total);
ranked.forEach((s, k) => { s.rank = k + 1; });

/** Busiest areas: squares grouped by the county at their centre ("around Cook County"), largest first. */
function busiest(s) {
  const inState = counties.filter((c) => c.id.slice(0, 2) === s.id);
  const byName = new Map();
  for (const [lat, lng, n] of s.cells) {
    const c = inState.find((f) => geoContains(f, [lng, lat])) ?? nearest(inState, lng, lat).f;
    const nm = c ? c.properties.name : null;
    const plain = !nm || /Parish$|Borough$|city$|Census Area$|Municipality$/.test(nm) || s.name === 'Louisiana' || s.name === 'Alaska';
    const name = nm ? nm + (plain ? '' : ' County') : 'Open country';
    const g = byName.get(name) ?? { name, n: 0, lat, lng, top: 0 };
    g.n += n;
    if (n > g.top) { g.top = n; g.lat = lat; g.lng = lng; }
    byName.set(name, g);
  }
  return [...byName.values()].sort((a, b) => b.n - a.n).slice(0, 8)
    .map((g) => ({ name: g.name, n: g.n, n_text: comma(g.n), lat: +g.lat.toFixed(3), lng: +g.lng.toFixed(3) }));
}

// State outlines as line segments for the 3D map, thinned to points at least ~1.2 map units apart.
const lines = (m) => m.coordinates.map((line) => {
  const pts = [];
  for (const q of line) {
    const p = proj(q);
    if (!p) continue;
    const x = Math.round(p[0] * 10) / 10, y = Math.round(p[1] * 10) / 10;
    const n = pts.length;
    if (n >= 2 && (x - pts[n - 2]) ** 2 + (y - pts[n - 1]) ** 2 < 1.4) continue;
    pts.push(x, y);
  }
  return pts;
}).filter((l) => l.length >= 4);

const updated = new Date().toISOString();
const browser = {
  updated, total, states: ranked.length, areas: cells.length,
  // [x, y, cameras, state index] in map units; state index points into `stateList`
  cells,
  stateList: stateRows.map((s) => [s.name, s.slug, s.total, s.center[0], s.center[1], ...s.box]),
  outline: { inner: lines(mesh(us, us.objects.states, (a, b) => a !== b)), outer: lines(mesh(us, us.objects.states, (a, b) => a === b)) },
};
fs.mkdirSync(path.join(ROOT, 'assets/data'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'assets/data/coverage.json'), JSON.stringify(browser));

const comma = (n) => n.toLocaleString('en-US');
const jekyll = {
  updated, total, total_text: comma(total), states: ranked.length, areas: cells.length, areas_text: comma(cells.length),
  ranking: ranked.map((s) => ({
    name: s.name, slug: s.slug, rank: s.rank, total: s.total, total_text: comma(s.total), areas: s.areas,
    bar: +((100 * s.total) / ranked[0].total).toFixed(1),
    share: +((100 * s.total) / total).toFixed(1), busiest: busiest(s),
  })),
};
fs.mkdirSync(path.join(ROOT, '_data'), { recursive: true });
fs.writeFileSync(path.join(ROOT, '_data/coverage.json'), JSON.stringify(jekyll, null, 1));

fs.mkdirSync(path.join(ROOT, 'states'), { recursive: true });
for (const s of stateRows) {
  const file = path.join(ROOT, 'states', `${s.slug}.html`);
  if (!s.total) { fs.rmSync(file, { force: true }); continue; }
  fs.writeFileSync(file, `---\nlayout: state\nstate: ${s.slug}\ntitle: License plate cameras in ${s.name}\npermalink: /states/${s.slug}/\n` +
    `description: How many automated license plate readers volunteers have mapped in ${s.name}, where they are, and how to drive with fewer or more of them.\n---\n`);
}
console.log(`${total.toLocaleString()} cameras in ${cells.length} squares across ${ranked.length} states (top: ${ranked.slice(0, 3).map((s) => `${s.name} ${s.total}`).join(', ')})`);
