/* Thanksgiving decorations for nitopath.com.
   Loaded only while <html> has the `thanksgiving` class (November 1 through Thanksgiving Day; see the
   script in _layouts/default.html), so the rest of the year it costs nothing. Everything is drawn here
   as SVG or on a canvas: no images, no libraries.

   - A turkey crew under the hero buttons: the boss in gold aviators fans his tail, follows the
     pointer and turns to face it; the others strut past. Tap any turkey and it gobbles.
   - Falling leaves with depth (far, middle and near layers) on a canvas, blown by scrolling and
     pushed aside by the pointer; a gobble throws a handful into the air.
   - A garland of leaves and acorns swaying under the header.
   - A harvest scene above the footer on every page: corn, hay, pumpkins, wheat, a cornucopia,
     a wooden sign, and turkeys wandering through it. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  if (!root.classList.contains('thanksgiving')) return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  var uid = 0;

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function el(html) { var t = doc.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }
  function f1(n) { return Math.round(n * 10) / 10; }

  /* ---------- Shared SVG paint (gradients and patterns, defined once for every drawing) ---------- */
  var DEFS = '<svg class="tg-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>' +
    // Tail: concentric bands from the base out, like a real bronze tom: brown, chestnut, black band, cream tip.
    '<radialGradient id="tgTail" gradientUnits="userSpaceOnUse" cx="92" cy="118" r="90">' +
      '<stop offset="0" stop-color="#26150a"/><stop offset=".32" stop-color="#4a2913"/><stop offset=".5" stop-color="#7a4418"/>' +
      '<stop offset=".63" stop-color="#a65e24"/><stop offset=".72" stop-color="#c47c36"/><stop offset=".76" stop-color="#6b3c17"/>' +
      '<stop offset=".79" stop-color="#140b05"/><stop offset=".86" stop-color="#140b05"/><stop offset=".885" stop-color="#d9c08e"/>' +
      '<stop offset="1" stop-color="#f7ecd2"/></radialGradient>' +
    '<radialGradient id="tgCov" gradientUnits="userSpaceOnUse" cx="92" cy="118" r="62">' +
      '<stop offset="0" stop-color="#2a180b"/><stop offset=".55" stop-color="#5a3517"/><stop offset=".74" stop-color="#93602a"/>' +
      '<stop offset=".82" stop-color="#2d5c52"/><stop offset=".88" stop-color="#160d06"/><stop offset=".93" stop-color="#b98b4e"/>' +
      '<stop offset="1" stop-color="#e2c48b"/></radialGradient>' +
    '<radialGradient id="tgBody" cx=".62" cy=".3" r=".8"><stop offset="0" stop-color="#9a6230"/><stop offset=".35" stop-color="#5e3515"/>' +
      '<stop offset=".75" stop-color="#2c170a"/><stop offset="1" stop-color="#160b05"/></radialGradient>' +
    '<linearGradient id="tgSheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3fa58e" stop-opacity="0"/>' +
      '<stop offset=".45" stop-color="#3fa58e" stop-opacity=".28"/><stop offset=".6" stop-color="#d98a3a" stop-opacity=".3"/>' +
      '<stop offset="1" stop-color="#d98a3a" stop-opacity="0"/></linearGradient>' +
    '<pattern id="tgScale" width="9" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)">' +
      '<path d="M0 7Q4.5 0 9 7" fill="none" stroke="#e0a560" stroke-opacity=".38" stroke-width="1.1"/>' +
      '<path d="M-4.5 3.5Q0-3.5 4.5 3.5M4.5 3.5Q9-3.5 13.5 3.5" fill="none" stroke="#1a0e06" stroke-opacity=".35" stroke-width=".9"/></pattern>' +
    '<pattern id="tgBar" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(62)">' +
      '<rect width="5" height="5" fill="#3a2212"/><rect width="1.7" height="5" fill="#b9a07a"/></pattern>' +
    '<linearGradient id="tgSkin" x1="0" y1="1" x2=".4" y2="0"><stop offset="0" stop-color="#6e1d1d"/><stop offset=".55" stop-color="#b23a3f"/>' +
      '<stop offset="1" stop-color="#d9757a"/></linearGradient>' +
    '<radialGradient id="tgHead" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#f2fbff"/><stop offset=".55" stop-color="#a9d6ec"/>' +
      '<stop offset="1" stop-color="#5f9fc4"/></radialGradient>' +
    '<radialGradient id="tgRed" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ff7a6e"/><stop offset=".5" stop-color="#d4262b"/>' +
      '<stop offset="1" stop-color="#7d1015"/></radialGradient>' +
    '<linearGradient id="tgLens" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b3b44"/><stop offset=".45" stop-color="#0b0b10"/>' +
      '<stop offset=".7" stop-color="#232331"/><stop offset="1" stop-color="#57405e"/></linearGradient>' +
    '<linearGradient id="tgGold" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a6a1c"/><stop offset=".5" stop-color="#ffe28a"/>' +
      '<stop offset="1" stop-color="#a77d22"/></linearGradient>' +
    // Harvest props.
    '<radialGradient id="tgPump" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#ffb347"/><stop offset=".55" stop-color="#ec7a12"/>' +
      '<stop offset="1" stop-color="#a5460a"/></radialGradient>' +
    '<radialGradient id="tgPumpW" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#fffaf0"/><stop offset=".6" stop-color="#eadfc8"/>' +
      '<stop offset="1" stop-color="#b9a582"/></radialGradient>' +
    '<radialGradient id="tgPumpG" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#7bbf6a"/><stop offset=".6" stop-color="#3f7d3a"/>' +
      '<stop offset="1" stop-color="#1f4a22"/></radialGradient>' +
    '<linearGradient id="tgStem" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4b5d25"/><stop offset=".5" stop-color="#8a8a3c"/>' +
      '<stop offset="1" stop-color="#3f4a1c"/></linearGradient>' +
    '<linearGradient id="tgHay" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6d77a"/><stop offset=".55" stop-color="#d9a940"/>' +
      '<stop offset="1" stop-color="#9c7020"/></linearGradient>' +
    '<linearGradient id="tgHayEnd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3d27a"/><stop offset="1" stop-color="#b8852b"/></linearGradient>' +
    '<pattern id="tgWicker" width="8" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)">' +
      '<rect width="8" height="6" fill="#8a5a24"/><path d="M0 3Q2 0 4 3T8 3" fill="none" stroke="#d9a75a" stroke-width="2"/>' +
      '<path d="M0 6Q2 3 4 6T8 6" fill="none" stroke="#5a3613" stroke-width="1"/></pattern>' +
    '<radialGradient id="tgApple" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#ff8a7a"/><stop offset=".5" stop-color="#c81e2a"/>' +
      '<stop offset="1" stop-color="#6e0d14"/></radialGradient>' +
    '<radialGradient id="tgGrape" cx=".35" cy=".3" r=".7"><stop offset="0" stop-color="#b48ad8"/><stop offset=".6" stop-color="#5b2a86"/>' +
      '<stop offset="1" stop-color="#2c1145"/></radialGradient>' +
    '<radialGradient id="tgPear" cx=".35" cy=".35" r=".75"><stop offset="0" stop-color="#f4f08a"/><stop offset=".6" stop-color="#c4b62e"/>' +
      '<stop offset="1" stop-color="#7a6a12"/></radialGradient>' +
    '<linearGradient id="tgWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9824a"/><stop offset=".5" stop-color="#94602f"/>' +
      '<stop offset="1" stop-color="#6b4220"/></linearGradient>' +
    '<linearGradient id="tgCorn" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b8913f"/><stop offset=".5" stop-color="#e7c97a"/>' +
      '<stop offset="1" stop-color="#a27a30"/></linearGradient>' +
    '<linearGradient id="tgGround" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a5a2a"/><stop offset=".35" stop-color="#5b3f1d"/>' +
      '<stop offset="1" stop-color="#2f200e"/></linearGradient>' +
    '<radialGradient id="tgShadow"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>' +
    '</defs></svg>';

  /* ---------- The turkey ---------- */
  // One drawing, facing right, in a 200 x 200 box; the fan pivots at (92, 118).
  function feather(len, i, cls, fill) {
    var y = 118 - len;
    return '<g class="' + cls + '" style="--i:' + i + '">' +
      '<path d="M89.5 118C' + f1(81 - len * .02) + ' ' + f1(118 - len * .4) + ' ' + f1(80 - len * .02) + ' ' + f1(118 - len * .86) + ' 84.5 ' + f1(y + 3) +
      'Q92 ' + f1(y - 2.5) + ' 99.5 ' + f1(y + 3) + 'C' + f1(104 + len * .02) + ' ' + f1(118 - len * .86) + ' ' + f1(103 + len * .02) + ' ' + f1(118 - len * .4) + ' 94.5 118Z" fill="' + fill +
      '" stroke="#120a05" stroke-opacity=".55" stroke-width=".8"/>' +
      '<path d="M92 116V' + f1(y + len * .06) + '" stroke="#e8cf9c" stroke-opacity=".35" stroke-width=".9"/></g>';
  }
  function turkeySVG(opts) {
    var s = '', i;
    s += '<ellipse class="tk-shadow" cx="112" cy="197" rx="46" ry="5" fill="url(#tgShadow)"/>';
    // Far leg, behind everything.
    s += '<g class="tk-leg tk-leg-far"><path d="M106 160L104 192M104 192L93 195.5M104 192L106 198M104 192L114 196M104 192L99 188M105 178L100 176" ' +
      'stroke="#7d5640" stroke-width="4.2" stroke-linecap="round" fill="none"/></g>';
    s += '<g class="tk-fan">';
    for (i = -7; i <= 7; i++) s += feather(88 - Math.abs(i) * .6, i, 'tk-f', 'url(#tgTail)');
    s += '</g><g class="tk-cov">';
    for (i = -6; i <= 6; i++) s += feather(60 - Math.abs(i) * .5, i, 'tk-c', 'url(#tgCov)');
    s += '</g>';
    // Body, scaled and sheened like bronze plumage.
    var body = 'M66 130C64 104 92 92 118 96C142 100 154 118 149 139C144 160 122 171 100 168C80 166 68 152 66 130Z';
    s += '<g class="tk-body"><path d="' + body + '" fill="url(#tgBody)"/><path d="' + body + '" fill="url(#tgScale)"/>' +
      '<path d="' + body + '" fill="url(#tgSheen)"/>';
    // Folded wing with barred flight feathers and copper coverts.
    s += '<path d="M84 124C98 110 126 112 138 128C134 144 110 158 72 161C68 150 73 134 84 124Z" fill="url(#tgBar)" stroke="#1a0e06" stroke-width="1"/>' +
      '<path d="M85 122C100 111 125 112 137 127C128 140 104 145 84 141Z" fill="#6e3f17"/>' +
      '<path d="M85 122C100 111 125 112 137 127C128 140 104 145 84 141Z" fill="url(#tgScale)"/>' +
      '<path d="M88 140C106 142 124 136 134 129" stroke="#e7b46a" stroke-opacity=".5" stroke-width="1.2" fill="none"/>' +
      '<path d="M78 150C96 150 116 144 130 136M76 156C96 156 114 150 126 142" stroke="#1a0e06" stroke-opacity=".5" stroke-width="1" fill="none"/>';
    // Beard of the tom.
    s += '<g class="tk-beard" stroke="#0e0804" stroke-width="1.5" stroke-linecap="round" fill="none">' +
      '<path d="M145 124q4 14 3 30M147 124q4 14 6 28M143 125q2 14 1 28M146 125q1 16-2 30"/></g></g>';
    // Near leg.
    s += '<g class="tk-leg tk-leg-near"><path d="M120 158L120 191M120 191L109 195M120 191L123 198M120 191L131 195M120 191L115 187M120 176L114 175" ' +
      'stroke="#a9775a" stroke-width="4.6" stroke-linecap="round" fill="none"/>' +
      '<path d="M118.2 166h3.6M118.2 172h3.6M118.2 178h3.6M118.2 184h3.6" stroke="#6e4a36" stroke-width=".9"/></g>';
    // Neck and head.
    s += '<g class="tk-head"><path d="M127 112C133 98 145 93 146 81C146.5 75 145 70 147 64L160.5 67C161 74 158.5 81 157.5 89C155.5 101 152 109 148 117Z" fill="url(#tgSkin)"/>';
    var bumps = [[157.5, 72, 2.2], [156.8, 80, 2.4], [155.2, 89, 2.6], [152.8, 98, 2.4], [150, 106, 2.1], [147.5, 76, 1.6], [146.5, 90, 1.7]];
    for (i = 0; i < bumps.length; i++) s += '<circle cx="' + bumps[i][0] + '" cy="' + bumps[i][1] + '" r="' + bumps[i][2] + '" fill="#c8484d" stroke="#6e1418" stroke-width=".5"/>';
    s += '<path d="M123 113C129 103 141 101 150 108C151 118 141 124 126 121Z" fill="#4a2a12"/><path d="M123 113C129 103 141 101 150 108C151 118 141 124 126 121Z" fill="url(#tgScale)"/>';
    s += '<g class="tk-wattle"><path d="M160 64C165.5 70 165.5 80 159.5 86.5C153.5 90 148 85 149 77.5C150 71 155 66 160 64Z" fill="url(#tgRed)"/>' +
      '<path d="M156 72c2.5 3 3 7.5 1 11 stroke="#ffb0a8" stroke-opacity=".6" stroke-width="1.2" fill="none" stroke-linecap="round"/></g>' +
      '<ellipse cx="154" cy="58" rx="13" ry="12" fill="url(#tgHead)"/>' +
      '<path d="M143 52c4-6 12-8 18-4" stroke="#e98a8a" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      '<path d="M164 55Q175 57 176.5 62Q171 64.5 164 63.5Z" fill="#e6bf7c" stroke="#8a6a35" stroke-width=".7"/>' +
      '<path d="M165 60.5h9" stroke="#8a6a35" stroke-width=".6"/>';
    if (opts.shades) {
      s += '<g class="tk-shades"><path d="M143 54L150 52.5" stroke="url(#tgGold)" stroke-width="1.6" stroke-linecap="round"/>' +
        '<path d="M149.5 50.5L166 50.5C167.5 55 164.5 61.5 158.5 61.5C152.5 61.5 149.5 56.5 149.5 50.5Z" fill="url(#tgLens)" stroke="url(#tgGold)" stroke-width="1.3"/>' +
        '<path d="M152.5 53l5-1.2M153.5 56.5l3.5-.9" stroke="#fff" stroke-opacity=".75" stroke-width="1.1" stroke-linecap="round"/></g>';
    } else {
      s += '<g class="tk-eye"><circle cx="157.5" cy="55" r="3.1" fill="#fff6dc"/><circle class="tk-pupil" cx="158" cy="55" r="2" fill="#160b04"/>' +
        '<circle cx="158.6" cy="54.3" r=".6" fill="#fff"/><ellipse class="tk-lid" cx="157.5" cy="55" rx="3.6" ry="3.6" fill="#9fcde6"/></g>';
    }
    s += '<g class="tk-snood"><path d="M160 47.5C165 46 168 51 168.5 58C169 64 172 68.5 171 73.5C169 75.5 167 72.5 166.5 67C166 61 163 55.5 160 52Z" fill="url(#tgRed)"/></g></g>';
    return '<svg class="tk" viewBox="-12 8 214 194" aria-hidden="true" focusable="false">' + s + '</svg>';
  }

  var GOBBLES = ['Gobble gobble!', 'GOBBLE!', 'Gobble?', 'Happy Thanksgiving!', 'Gobble gobble gobble!', 'Not the cameras, the stuffing!'];
  function makeTurkey(kind, opts) {
    opts = opts || {};
    var w = doc.createElement('div');
    w.className = 'tg-turkey tg-' + kind + (opts.cls ? ' ' + opts.cls : '');
    w.setAttribute('role', 'button');
    w.setAttribute('tabindex', '-1');
    w.setAttribute('aria-label', 'Turkey. Tap it to make it gobble.');
    w.innerHTML = '<div class="tk-flip">' + turkeySVG(opts) + '</div><span class="tk-say" aria-hidden="true"></span>';
    w.addEventListener('click', function (e) { e.preventDefault(); gobble(w); });
    return w;
  }
  var gobbleCount = 0;
  function gobble(w) {
    var say = w.querySelector('.tk-say');
    w.classList.remove('gobbling'); void w.offsetWidth; w.classList.add('gobbling');
    say.textContent = gobbleCount < 2 ? GOBBLES[gobbleCount] : pick(GOBBLES);
    gobbleCount++;
    clearTimeout(w._gt);
    w._gt = setTimeout(function () { w.classList.remove('gobbling'); }, 1500);
    var r = w.getBoundingClientRect();
    leafSystems.forEach(function (L) { L.burst(r.left + r.width * .45, r.top + r.height * .35, 14); });
  }

  /* ---------- Harvest props ---------- */
  function pumpkin(x, y, r, tone) {
    var g = tone === 'w' ? 'url(#tgPumpW)' : tone === 'g' ? 'url(#tgPumpG)' : 'url(#tgPump)';
    var line = tone === 'w' ? '#9c8a68' : tone === 'g' ? '#173a19' : '#8a3a08';
    var h = r * .82, s = '<g class="tg-pumpkin">';
    s += '<ellipse cx="' + f1(x) + '" cy="' + f1(y - 1) + '" rx="' + f1(r * 1.05) + '" ry="' + f1(r * .16) + '" fill="url(#tgShadow)"/>';
    var ribs = [[-.62, .5], [.62, .5], [-.32, .62], [.32, .62], [0, .55]];
    for (var i = 0; i < ribs.length; i++) {
      s += '<ellipse cx="' + f1(x + ribs[i][0] * r) + '" cy="' + f1(y - h) + '" rx="' + f1(ribs[i][1] * r) + '" ry="' + f1(h) + '" fill="' + g +
        '" stroke="' + line + '" stroke-opacity=".55" stroke-width="' + f1(Math.max(.6, r * .035)) + '"/>';
    }
    s += '<path d="M' + f1(x - r * .06) + ' ' + f1(y - h * 1.9) + 'c' + f1(r * .02) + ' ' + f1(-r * .28) + ' ' + f1(r * .1) + ' ' + f1(-r * .4) + ' ' + f1(r * .28) + ' ' + f1(-r * .42) +
      'l' + f1(r * .04) + ' ' + f1(r * .12) + 'c' + f1(-r * .12) + ' ' + f1(r * .04) + ' ' + f1(-r * .16) + ' ' + f1(r * .18) + ' ' + f1(-r * .12) + ' ' + f1(r * .34) + 'z" fill="url(#tgStem)" stroke="#2c3510" stroke-width=".6"/>';
    s += '<path d="M' + f1(x + r * .05) + ' ' + f1(y - h * 1.9) + 'c' + f1(r * .3) + ' ' + f1(-r * .1) + ' ' + f1(r * .45) + ' ' + f1(r * .12) + ' ' + f1(r * .3) + ' ' + f1(r * .22) +
      's' + f1(-r * .2) + ' ' + f1(-r * .2) + ' 0 ' + f1(-r * .3) + '" stroke="#5b6b22" stroke-width="' + f1(Math.max(.7, r * .04)) + '" fill="none"/>';
    s += '<ellipse cx="' + f1(x - r * .35) + '" cy="' + f1(y - h * 1.35) + '" rx="' + f1(r * .14) + '" ry="' + f1(r * .3) + '" fill="#fff" fill-opacity=".18" transform="rotate(-25 ' + f1(x - r * .35) + ' ' + f1(y - h * 1.35) + ')"/>';
    return s + '</g>';
  }
  function hay(x, y, w, h) {
    var s = '<g class="tg-hay"><ellipse cx="' + f1(x + w / 2) + '" cy="' + f1(y) + '" rx="' + f1(w * .6) + '" ry="5" fill="url(#tgShadow)"/>';
    s += '<rect x="' + f1(x) + '" y="' + f1(y - h) + '" width="' + f1(w) + '" height="' + f1(h) + '" rx="6" fill="url(#tgHay)" stroke="#8a6118" stroke-width="1"/>';
    s += '<path d="M' + f1(x + w) + ' ' + f1(y - h + 4) + 'l9-5v' + f1(h - 6) + 'l-9 6z" fill="url(#tgHayEnd)" stroke="#8a6118" stroke-width=".8"/>';
    s += '<path d="M' + f1(x + 4) + ' ' + f1(y - h) + 'l9-6h' + f1(w - 4) + 'l-9 6z" fill="#f8e29a" stroke="#a87a26" stroke-width=".8"/>';
    var straw = '';
    for (var i = 0; i < w * h / 55; i++) {
      var sx = x + rnd(3, w - 3), sy = y - h + rnd(3, h - 3), a = rnd(-.5, .5), l = rnd(5, 11);
      straw += 'M' + f1(sx) + ' ' + f1(sy) + 'l' + f1(Math.cos(a) * l) + ' ' + f1(Math.sin(a) * l);
    }
    s += '<path d="' + straw + '" stroke="#a5781f" stroke-opacity=".7" stroke-width=".9" stroke-linecap="round"/>';
    s += '<path d="M' + f1(x + w * .28) + ' ' + f1(y - h) + 'v' + f1(h) + 'M' + f1(x + w * .72) + ' ' + f1(y - h) + 'v' + f1(h) + '" stroke="#7a3d12" stroke-width="2.4"/>';
    var wisps = '';
    for (i = 0; i < 9; i++) { var wx = x + rnd(0, w); wisps += 'M' + f1(wx) + ' ' + f1(y - h + 1) + 'l' + f1(rnd(-4, 4)) + ' ' + f1(rnd(-8, -4)); }
    s += '<path d="' + wisps + '" stroke="#f6d77a" stroke-width="1" stroke-linecap="round"/>';
    return s + '</g>';
  }
  function corn(x, y, h, flip) {
    var k = flip ? -1 : 1, s = '<g class="tg-corn" style="transform-origin:' + f1(x) + 'px ' + f1(y) + 'px;animation-delay:' + f1(rnd(-4, 0)) + 's">';
    s += '<path d="M' + f1(x) + ' ' + f1(y) + 'C' + f1(x + k * 3) + ' ' + f1(y - h * .5) + ' ' + f1(x - k * 2) + ' ' + f1(y - h * .8) + ' ' + f1(x + k * 4) + ' ' + f1(y - h) + '" stroke="url(#tgCorn)" stroke-width="5" fill="none" stroke-linecap="round"/>';
    var leaves = [[.25, 1, .55], [.38, -1, .6], [.52, 1, .5], [.66, -1, .45], [.8, 1, .38], [.9, -1, .3]];
    for (var i = 0; i < leaves.length; i++) {
      var ly = y - h * leaves[i][0], d = leaves[i][1] * k, L = h * leaves[i][2];
      s += '<path d="M' + f1(x) + ' ' + f1(ly) + 'C' + f1(x + d * L * .35) + ' ' + f1(ly - L * .5) + ' ' + f1(x + d * L * .8) + ' ' + f1(ly - L * .25) + ' ' + f1(x + d * L) + ' ' + f1(ly + L * .3) +
        'C' + f1(x + d * L * .7) + ' ' + f1(ly - L * .12) + ' ' + f1(x + d * L * .35) + ' ' + f1(ly - L * .28) + ' ' + f1(x) + ' ' + f1(ly + 4) + 'Z" fill="#c9a252" stroke="#8c6a2a" stroke-width=".8"/>';
    }
    var ey = y - h * .48;
    s += '<path d="M' + f1(x + k * 2) + ' ' + f1(ey) + 'c' + f1(k * 9) + ' -6 ' + f1(k * 12) + ' -20 ' + f1(k * 8) + ' -30c' + f1(-k * 6) + ' 6 ' + f1(-k * 10) + ' 18 ' + f1(-k * 8) + ' 30z" fill="#e0a83c" stroke="#9a6218" stroke-width=".8"/>' +
      '<path d="M' + f1(x + k * 4) + ' ' + f1(ey - 4) + 'c' + f1(k * 4) + ' -6 ' + f1(k * 5) + ' -14 ' + f1(k * 4) + ' -21M' + f1(x + k * 6) + ' ' + f1(ey - 6) + 'c' + f1(k * 2) + ' -5 ' + f1(k * 3) + ' -12 ' + f1(k * 2) + ' -18" stroke="#b2441a" stroke-width="1.6" fill="none"/>' +
      '<path d="M' + f1(x) + ' ' + f1(ey + 2) + 'c' + f1(k * 12) + ' -2 ' + f1(k * 16) + ' -16 ' + f1(k * 12) + ' -28c' + f1(-k * 2) + ' 12 ' + f1(-k * 8) + ' 20 ' + f1(-k * 12) + ' 28z" fill="#c9a252" stroke="#8c6a2a" stroke-width=".8"/>';
    var tx = x + k * 4, ty = y - h;
    s += '<path d="M' + f1(tx) + ' ' + f1(ty) + 'l-7-12M' + f1(tx) + ' ' + f1(ty) + 'l1-15M' + f1(tx) + ' ' + f1(ty) + 'l8-11M' + f1(tx) + ' ' + f1(ty) + 'l-11-5M' + f1(tx) + ' ' + f1(ty) + 'l11-3" stroke="#d8b25e" stroke-width="1.4" stroke-linecap="round"/>';
    return s + '</g>';
  }
  function wheat(x, y, h, lean) {
    var s = '<g class="tg-wheat" style="transform-origin:' + f1(x) + 'px ' + f1(y) + 'px;animation-delay:' + f1(rnd(-3, 0)) + 's">';
    for (var j = -2; j <= 2; j++) {
      var a = (lean + j * 9) * Math.PI / 180, hx = x + Math.sin(a) * h, hy = y - Math.cos(a) * h;
      s += '<path d="M' + f1(x + j) + ' ' + f1(y) + 'Q' + f1(x + Math.sin(a) * h * .5) + ' ' + f1(y - h * .55) + ' ' + f1(hx) + ' ' + f1(hy) + '" stroke="#c8a04a" stroke-width="1.2" fill="none"/>';
      for (var k = 0; k < 6; k++) {
        var t = k * 3.2, gx = hx + Math.sin(a) * t, gy = hy - Math.cos(a) * t;
        s += '<ellipse cx="' + f1(gx - 1.8) + '" cy="' + f1(gy) + '" rx="1.6" ry="3" fill="#e7c06a" transform="rotate(' + f1(lean + j * 9 - 25) + ' ' + f1(gx - 1.8) + ' ' + f1(gy) + ')"/>' +
          '<ellipse cx="' + f1(gx + 1.8) + '" cy="' + f1(gy) + '" rx="1.6" ry="3" fill="#d9ad52" transform="rotate(' + f1(lean + j * 9 + 25) + ' ' + f1(gx + 1.8) + ' ' + f1(gy) + ')"/>';
      }
    }
    return s + '</g>';
  }
  function cornucopia(x, y, sc) {
    var s = '<g class="tg-horn" transform="translate(' + f1(x) + ' ' + f1(y) + ') scale(' + sc + ')">';
    s += '<ellipse cx="10" cy="0" rx="78" ry="7" fill="url(#tgShadow)"/>';
    // Horn: curls up to a point on the left, opens on the right.
    s += '<path d="M-58-44C-70-50-74-38-64-34C-56-31-54-40-60-42C-44-30-30-8 0-2C14 0 26-4 34-8L30-56C8-58-20-58-40-50C-48-47-54-46-58-44Z" fill="url(#tgWicker)" stroke="#4a2c0e" stroke-width="1.5"/>';
    s += '<path d="M-30-46C-24-30-14-14 0-6M-12-54C-6-36 4-20 16-8M8-57C12-40 18-24 26-10" stroke="#4a2c0e" stroke-opacity=".55" stroke-width="1.4" fill="none"/>';
    s += '<ellipse cx="33" cy="-32" rx="9" ry="25" fill="#3a220c" stroke="#c48c48" stroke-width="3"/>';
    // Spilling harvest.
    s += '<g>' +
      '<circle cx="70" cy="-11" r="11" fill="url(#tgApple)"/><path d="M70-22q1-5 4-6" stroke="#4a2c0e" stroke-width="1.5" fill="none"/>' +
      '<path d="M86-4c-8-2-12-12-8-20c3-6 1-10 4-12c4 2 2 6 5 12c4 8 2 18-1 20z" fill="url(#tgPear)"/>' +
      '<circle cx="54" cy="-30" r="5" fill="url(#tgGrape)"/><circle cx="62" cy="-28" r="5" fill="url(#tgGrape)"/><circle cx="58" cy="-21" r="5" fill="url(#tgGrape)"/>' +
      '<circle cx="66" cy="-20" r="5" fill="url(#tgGrape)"/><circle cx="62" cy="-13" r="5" fill="url(#tgGrape)"/><circle cx="54" cy="-14" r="5" fill="url(#tgGrape)"/>' +
      '<circle cx="50" cy="-22" r="5" fill="url(#tgGrape)"/><path d="M56-35q4-8 10-6" stroke="#4a6b22" stroke-width="2" fill="none"/>' +
      '<path d="M60-40c6-8 18-6 20 2c-8 4-16 4-20-2z" fill="#4a7d2a"/>' +
      '<circle cx="44" cy="-46" r="9" fill="url(#tgApple)"/>' +
      '<path d="M30-30c10-16 30-14 30 0c0 10-18 16-30 0z" fill="url(#tgPumpW)" stroke="#9c8a68" stroke-width=".8"/>' +
      '<path d="M40-8c-6-10 2-22 14-20c4 8-2 20-14 20z" fill="#d97706" stroke="#8a3a08" stroke-width=".8"/>' +
      '<ellipse cx="96" cy="-6" rx="7" ry="6" fill="url(#tgApple)"/>' +
      '</g>';
    s += pumpkin(52, 2, 12, 'o');
    return s + '</g>';
  }
  function sign(x, y, small) {
    var w = small ? 128 : 168, h = small ? 40 : 50;
    return '<g class="tg-sign" style="transform-origin:' + f1(x) + 'px ' + f1(y - h - 30) + 'px">' +
      '<ellipse cx="' + f1(x) + '" cy="' + f1(y) + '" rx="24" ry="4" fill="url(#tgShadow)"/>' +
      '<rect x="' + f1(x - 4) + '" y="' + f1(y - h - 34) + '" width="8" height="' + f1(h + 34) + '" fill="#6b4220" stroke="#3d240f"/>' +
      '<rect x="' + f1(x - w / 2) + '" y="' + f1(y - h - 30) + '" width="' + w + '" height="' + h + '" rx="5" fill="url(#tgWood)" stroke="#3d240f" stroke-width="1.5"/>' +
      '<path d="M' + f1(x - w / 2 + 6) + ' ' + f1(y - h - 18) + 'h' + f1(w - 30) + 'M' + f1(x - w / 2 + 20) + ' ' + f1(y - 40) + 'h' + f1(w - 30) + '" stroke="#5a3616" stroke-opacity=".35"/>' +
      '<circle cx="' + f1(x - w / 2 + 7) + '" cy="' + f1(y - h - 23) + '" r="1.8" fill="#3d240f"/><circle cx="' + f1(x + w / 2 - 7) + '" cy="' + f1(y - h - 23) + '" r="1.8" fill="#3d240f"/>' +
      '<text x="' + f1(x) + '" y="' + f1(y - h - 30 + h * .5) + '" text-anchor="middle" font-family="Georgia, \'Times New Roman\', serif" font-style="italic" font-weight="700" font-size="' + (small ? 15 : 19) + '" fill="#fff2d6" stroke="#3d240f" stroke-width=".6" paint-order="stroke">Happy Thanksgiving</text>' +
      '<text x="' + f1(x) + '" y="' + f1(y - 38 + (small ? 0 : -2)) + '" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="' + (small ? 8.5 : 10) + '" letter-spacing="1.5" fill="#ffd89a">FROM NITOPATH</text></g>';
  }
  function tufts(w, y, n) {
    var d = '';
    for (var i = 0; i < n; i++) {
      var x = rnd(0, w);
      d += 'M' + f1(x) + ' ' + y + 'q-2-6-5-9M' + f1(x) + ' ' + y + 'q1-7 0-11M' + f1(x) + ' ' + y + 'q3-5 6-8';
    }
    return '<path d="' + d + '" stroke="#8a7a36" stroke-width="1.2" fill="none" stroke-linecap="round"/>';
  }

  /* ---------- Hero: the turkey crew under the buttons ---------- */
  function buildHero() {
    var copy = doc.querySelector('.hero-map3d .hero-copy') || doc.querySelector('.hero .hero-copy');
    if (!copy) return;
    var scene = el('<div class="tg-crew" aria-label="Thanksgiving turkeys"></div>');
    var W = 560, H = 210;
    var back = '<svg class="tg-props tg-props-back" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMinYMax meet" aria-hidden="true">' +
      '<path d="M0 ' + (H - 8) + 'Q140 ' + (H - 22) + ' 280 ' + (H - 12) + 'T560 ' + (H - 10) + 'V' + H + 'H0Z" fill="url(#tgGround)" opacity=".85"/>' +
      tufts(W, H - 10, 22) + wheat(22, H - 10, 72, -10) + wheat(300, H - 10, 58, 6) +
      hay(196, H - 12, 96, 40) + '</svg>';
    var front = '<svg class="tg-props tg-props-front" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMinYMax meet" aria-hidden="true">' +
      pumpkin(64, H - 6, 26, 'o') + pumpkin(100, H - 5, 15, 'w') + pumpkin(36, H - 4, 12, 'g') + pumpkin(288, H - 5, 13, 'o') + pumpkin(548, H - 4, 12, 'g') + '</svg>';
    scene.innerHTML = back;
    var lane = el('<div class="tg-lane"></div>');
    [['t1', false], ['t2', false], ['t3', true]].forEach(function (t, n) {
      var walker = makeTurkey('walker', { shades: t[1], cls: t[0] });
      walker.style.animationDelay = (-n * 3.3) + 's';
      lane.appendChild(walker);
    });
    scene.appendChild(lane);
    var boss = makeTurkey('boss', { shades: true });
    scene.appendChild(boss);
    scene.insertAdjacentHTML('beforeend', front);
    var note = copy.querySelector('.hero-note');
    (note || copy.lastElementChild).after(scene);
    bosses.push(boss);
  }

  /* ---------- Footer: the harvest scene on every page ---------- */
  function buildFooter() {
    var foot = doc.querySelector('.site-footer');
    if (!foot) return;
    var scene = el('<div class="tg-harvest" aria-label="Happy Thanksgiving from NitoPath"></div>');
    foot.prepend(scene);
    function draw() {
      var W = Math.max(360, Math.round(scene.clientWidth || innerWidth)), H = 170, narrow = W < 700;
      if (scene._w === W) return;
      scene._w = W;
      var s = '<svg class="tg-props" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" aria-hidden="true">';
      s += '<path d="M0 ' + (H - 30) + 'C' + f1(W * .2) + ' ' + (H - 52) + ' ' + f1(W * .35) + ' ' + (H - 26) + ' ' + f1(W * .5) + ' ' + (H - 36) + 'S' + f1(W * .8) + ' ' + (H - 50) + ' ' + W + ' ' + (H - 32) + 'V' + H + 'H0Z" fill="url(#tgGround)"/>';
      s += '<path d="M0 ' + (H - 30) + 'C' + f1(W * .2) + ' ' + (H - 52) + ' ' + f1(W * .35) + ' ' + (H - 26) + ' ' + f1(W * .5) + ' ' + (H - 36) + 'S' + f1(W * .8) + ' ' + (H - 50) + ' ' + W + ' ' + (H - 32) + '" stroke="#9a7a3a" stroke-width="2" fill="none"/>';
      s += tufts(W, H - 30, Math.round(W / 22));
      // Corn rows at both ends.
      var cx, i;
      for (i = 0; i < (narrow ? 2 : 4); i++) s += corn(14 + i * 26, H - 28, 128 - i * 8, false);
      for (i = 0; i < (narrow ? 2 : 4); i++) s += corn(W - 14 - i * 26, H - 28, 128 - i * 8, true);
      s += wheat(narrow ? 70 : 128, H - 30, 62, 8) + wheat(W - (narrow ? 70 : 128), H - 30, 62, -8);
      cx = narrow ? W * .5 : W * .27;
      s += hay(cx - 70, H - 26, 120, 46) + hay(cx - 30, H - 72, 84, 34);
      s += pumpkin(cx - 82, H - 22, 18, 'w') + pumpkin(cx + 70, H - 22, 24, 'o') + pumpkin(cx + 100, H - 18, 13, 'g');
      if (!narrow) {
        s += sign(W * .5, H - 30, false);
        s += cornucopia(W * .72, H - 26, 1);
        s += pumpkin(W * .58, H - 22, 30, 'o') + pumpkin(W * .615, H - 20, 16, 'w') + pumpkin(W * .86, H - 22, 20, 'o') + pumpkin(W * .88, H - 18, 11, 'g');
      } else {
        s += sign(W * .5 + 4, H - 116 > 0 ? H - 74 : H - 30, true);
      }
      s += '</svg>';
      var old = scene.querySelector('.tg-props');
      if (old) old.outerHTML = s; else scene.insertAdjacentHTML('afterbegin', s);
    }
    draw();
    var lane = el('<div class="tg-lane"></div>');
    [['f1', true], ['f2', false]].forEach(function (t, n) {
      var walker = makeTurkey('walker', { shades: t[1], cls: t[0] });
      walker.style.animationDelay = (-n * 9) + 's';
      lane.appendChild(walker);
    });
    scene.appendChild(lane);
    var rt;
    addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(draw, 200); });
  }

  /* ---------- Header garland ---------- */
  var LEAF_PATHS = {
    maple: 'M0-11L1.6-6.5 4-7.6 3.3-2.8 7.4-4.6 6.6-2.4 10-2.6 7.4 1 9.6 2.2 4.6 4.8 5.3 6.8.6 5.9.3 6.2V11H-.3V6.2L-.6 5.9-5.3 6.8-4.6 4.8-9.6 2.2-7.4 1-10-2.6-6.6-2.4-7.4-4.6-3.3-2.8-4-7.6-1.6-6.5Z',
    oak: 'M0-11C2-11 2.6-8.6 2-7.4 4-8.4 5.6-6.6 4.4-4.6 6.6-5 7.6-2.6 5.6-1.2 7.6-.6 7.8 2 5.4 2.6 6.6 4.6 4.6 6.2 2.6 5 2.4 7 1 7.2.4 7.6V11H-.4V7.6L-1 7.2C-2.4 7-2.6 5-2.6 5-4.6 6.2-6.6 4.6-5.4 2.6-7.8 2-7.6-.6-5.6-1.2-7.6-2.6-6.6-5-4.4-4.6-5.6-6.6-4-8.4-2-7.4-2.6-8.6-2-11 0-11Z',
    birch: 'M0-11C5-7 7-2 5.6 2.6 4.4 6.4 2 8 .4 8.4V11H-.4V8.4C-2 8-4.4 6.4-5.6 2.6-7-2-5-7 0-11Z'
  };
  var LEAF_COLORS = ['#b91c1c', '#dc4a12', '#ea7a0c', '#d99a06', '#c2410c', '#8a3510', '#e0b020'];
  function buildGarland() {
    var head = doc.querySelector('.site-header');
    if (!head) return;
    var g = el('<div class="tg-garland" aria-hidden="true"></div>');
    head.appendChild(g);
    function draw() {
      var W = Math.round(innerWidth), sw = W < 700 ? 84 : 120, n = Math.ceil(W / sw) + 1, s = '';
      s += '<svg viewBox="0 0 ' + W + ' 28" width="' + W + '" height="28">';
      var rope = 'M-' + sw / 2 + ' 2';
      for (var i = 0; i < n; i++) rope += 'Q' + f1(i * sw) + ' 14 ' + f1(i * sw + sw / 2) + ' 2';
      s += '<path d="' + rope + '" stroke="#6b3d14" stroke-width="2" fill="none"/><path d="' + rope + '" stroke="#c9934a" stroke-width=".8" stroke-dasharray="2 3" fill="none"/>';
      var kinds = Object.keys(LEAF_PATHS);
      for (i = 0; i < n; i++) {
        var base = i * sw;
        for (var k = 0; k < 3; k++) {
          var t = (k + 1) / 4, x = base - sw / 2 + t * sw, y = 2 + 12 * 4 * t * (1 - t) * .98;
          var c = LEAF_COLORS[(i * 3 + k) % LEAF_COLORS.length], kind = kinds[(i + k) % 3], r = rnd(-30, 30);
          s += '<g class="tg-gl" style="transform-origin:' + f1(x) + 'px ' + f1(y) + 'px;animation-delay:' + f1(rnd(-5, 0)) + 's;animation-duration:' + f1(rnd(3.2, 5)) + 's">' +
            '<g transform="translate(' + f1(x) + ' ' + f1(y + 10) + ') rotate(' + f1(r + 180) + ') scale(' + f1(rnd(.8, 1.05)) + ')"><path d="' + LEAF_PATHS[kind] + '" fill="' + c + '" stroke="#3d1a08" stroke-opacity=".35" stroke-width=".5"/>' +
            '<path d="M0 9V-8M0-2L4-5M0-2L-4-5M0 2L4-1M0 2L-4-1" stroke="#3d1a08" stroke-opacity=".35" stroke-width=".5" fill="none"/></g></g>';
        }
        var ax = base, ay = 14;
        s += '<g class="tg-gl" style="transform-origin:' + f1(ax) + 'px ' + (ay - 2) + 'px;animation-delay:' + f1(rnd(-5, 0)) + 's"><path d="M' + f1(ax) + ' ' + (ay - 2) + 'v4" stroke="#6b3d14" stroke-width="1"/>' +
          '<ellipse cx="' + f1(ax) + '" cy="' + (ay + 7) + '" rx="2.8" ry="3.5" fill="#a8641f"/><path d="M' + f1(ax - 3.6) + ' ' + (ay + 4.4) + 'q3.6-3.4 7.2 0z" fill="#6b4220"/></g>';
      }
      g.innerHTML = s + '</svg>';
    }
    draw();
    var rt, lw = innerWidth;
    addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (Math.abs(innerWidth - lw) > 30) { lw = innerWidth; draw(); } }, 200); });
  }

  /* ---------- Falling leaves (canvas, with depth) ---------- */
  var leafSystems = [];
  var wind = 0, lastScroll = scrollY, pointer = { x: -999, y: -999 };
  var canBlur = (function () { try { var c = doc.createElement('canvas').getContext('2d'); c.filter = 'blur(2px)'; return c.filter === 'blur(2px)'; } catch (e) { return false; } })();
  var sprites = null;
  function makeSprites() {
    sprites = [];
    var kinds = Object.keys(LEAF_PATHS);
    kinds.forEach(function (kind) {
      var p = new Path2D(LEAF_PATHS[kind]);
      var veins = new Path2D('M0 10V-9M0-3L4.5-6M0-3L-4.5-6M0 1.5L5-1.5M0 1.5L-5-1.5M0 5L3.5 3M0 5L-3.5 3');
      LEAF_COLORS.forEach(function (col) {
        [0, 2.2, 4.5].forEach(function (blur) {
          var S = 96, c = doc.createElement('canvas'); c.width = c.height = S;
          var x = c.getContext('2d');
          if (blur && canBlur) x.filter = 'blur(' + blur + 'px)';
          x.translate(S / 2, S / 2); x.scale(3.4, 3.4);
          var gr = x.createLinearGradient(-8, -10, 8, 10);
          gr.addColorStop(0, shade(col, 30)); gr.addColorStop(.55, col); gr.addColorStop(1, shade(col, -35));
          x.fillStyle = gr; x.fill(p);
          x.strokeStyle = 'rgba(40,14,4,.45)'; x.lineWidth = .45; x.stroke(veins);
          x.strokeStyle = 'rgba(255,235,200,.25)'; x.lineWidth = .3; x.stroke(p);
          sprites.push({ c: c, blur: blur });
        });
      });
    });
  }
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16), r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  function LeafSystem(host, opts) {
    var self = this;
    this.host = host; this.opts = opts;
    var cv = this.cv = doc.createElement('canvas');
    cv.className = 'tg-leaves ' + (opts.cls || '');
    cv.setAttribute('aria-hidden', 'true');
    host.prepend(cv);
    if (opts.front) host.appendChild(cv);
    this.ctx = cv.getContext('2d');
    this.leaves = [];
    this.visible = true;
    this.resize();
    var n = opts.count(this.w, this.h);
    for (var i = 0; i < n; i++) this.leaves.push(this.spawn(true));
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { self.visible = es[0].isIntersecting; }).observe(host);
    leafSystems.push(this);
  }
  LeafSystem.prototype.resize = function () {
    var r = this.host.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    this.w = r.width; this.h = r.height; this.dpr = dpr;
    this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.height * dpr);
  };
  LeafSystem.prototype.spawn = function (anywhere) {
    var o = this.opts, z = rnd(o.zmin, o.zmax), tier = o.front ? 2 : z < .45 ? 1 : 0;
    var pool = sprites.filter(function (s, i) { return i % 3 === tier; });
    return {
      x: rnd(-20, this.w + 20), y: anywhere ? rnd(-40, this.h) : rnd(-80, -30), z: z,
      vx: 0, vy: 0, sp: pick(pool), size: (o.front ? 40 : 14) + z * (o.front ? 30 : 26),
      fall: 22 + z * 46, swayA: rnd(18, 46), swayF: rnd(.5, 1.1), ph: rnd(0, 6.3),
      rot: rnd(0, 6.3), rotS: rnd(-1.2, 1.2), flipF: rnd(.8, 2.2), alpha: o.front ? .75 : .45 + z * .55, burst: 0
    };
  };
  LeafSystem.prototype.burst = function (cx, cy, n) {
    if (this.opts.front || !this.visible) return;
    var r = this.cv.getBoundingClientRect();
    if (cx < r.left || cx > r.right || cy < r.top - 50 || cy > r.bottom + 50) return;
    for (var i = 0; i < n; i++) {
      var L = this.spawn(false);
      L.x = cx - r.left; L.y = cy - r.top; L.z = rnd(.6, 1); L.size = 14 + L.z * 24; L.alpha = 1;
      L.vx = rnd(-160, 160); L.vy = rnd(-260, -120); L.burst = 1;
      this.leaves.push(L);
    }
  };
  LeafSystem.prototype.step = function (t, dt) {
    if (!this.visible) return;
    var ctx = this.ctx, w = this.w, h = this.h, r = this.cv.getBoundingClientRect();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    var px = pointer.x - r.left, py = pointer.y - r.top;
    for (var i = this.leaves.length - 1; i >= 0; i--) {
      var L = this.leaves[i];
      // Pointer pushes nearby leaves away; wind from scrolling blows them sideways.
      var dx = L.x - px, dy = L.y - py, d2 = dx * dx + dy * dy;
      if (d2 < 9000) { var d = Math.sqrt(d2) || 1, f = (95 - d) * 9 * L.z; L.vx += dx / d * f * dt; L.vy += dy / d * f * dt * .6; }
      L.vx += (wind * 260 * L.z - L.vx) * Math.min(1, dt * (L.burst ? .9 : 1.6));
      L.vy += ((L.burst ? 0 : 0) - L.vy) * Math.min(1, dt * 1.2);
      if (L.burst) { L.vy += 420 * dt; if (L.vy > 0 && Math.abs(L.vx) < 40) L.burst = 0; }
      L.y += (L.fall + L.vy) * dt;
      L.x += L.vx * dt;
      L.rot += (L.rotS + L.vx * .004) * dt;
      var sway = Math.sin(t * L.swayF + L.ph) * L.swayA * L.z, flip = Math.cos(t * L.flipF + L.ph);
      if (L.y > h + 50 || L.x < -80 || L.x > w + 80) {
        if (this.leaves.length > this.opts.count(w, h)) { this.leaves.splice(i, 1); continue; }
        var N = this.spawn(false); if (L.x < -80) N.x = w + 30; else if (L.x > w + 80) N.x = -30;
        this.leaves[i] = N; continue;
      }
      ctx.globalAlpha = L.alpha * (flip < 0 ? .82 : 1);
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.translate(L.x + sway, L.y);
      ctx.rotate(L.rot + Math.sin(t * L.swayF + L.ph) * .5);
      ctx.scale(Math.max(.12, Math.abs(flip)) * (flip < 0 ? -1 : 1), 1);
      var S = L.size; ctx.drawImage(L.sp.c, -S / 2, -S / 2, S, S);
    }
    ctx.globalAlpha = 1;
  };

  function startLeaves() {
    makeSprites();
    var hero = doc.querySelector('.hero');
    if (hero) {
      new LeafSystem(hero, { zmin: .15, zmax: 1, count: function (w, h) { return Math.round(Math.min(46, w * h / 26000)); } });
      if (innerWidth > 820) new LeafSystem(hero, { front: true, cls: 'tg-leaves-front', zmin: 1, zmax: 1.2, count: function () { return 3; } });
    } else {
      var head = doc.querySelector('.page-head') || doc.querySelector('main > section');
      if (head) new LeafSystem(head, { zmin: .15, zmax: .8, count: function (w, h) { return Math.round(Math.min(16, w * h / 22000)); } });
    }
    var harvest = doc.querySelector('.tg-harvest');
    if (harvest) new LeafSystem(harvest, { zmin: .3, zmax: .9, count: function (w) { return Math.round(Math.min(10, w / 140)); } });

    var last = performance.now();
    function frame(now) {
      var dt = Math.min(.05, (now - last) / 1000); last = now;
      var sc = scrollY, v = (sc - lastScroll) / Math.max(dt, .001); lastScroll = sc;
      wind += (Math.max(-3, Math.min(3, -v / 900)) - wind) * Math.min(1, dt * 3);
      wind *= Math.pow(.25, dt);
      if (!doc.hidden) for (var i = 0; i < leafSystems.length; i++) leafSystems[i].step(now / 1000, dt);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    var rt;
    addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { leafSystems.forEach(function (L) { L.resize(); }); }, 150); });
  }

  /* ---------- The boss watches the pointer ---------- */
  var bosses = [];
  function watchPointer() {
    addEventListener('pointermove', function (e) {
      pointer.x = e.clientX; pointer.y = e.clientY;
      for (var i = 0; i < bosses.length; i++) {
        var b = bosses[i], r = b.getBoundingClientRect();
        var cx = r.left + r.width * .62, cy = r.top + r.height * .3;
        var dx = e.clientX - cx, dy = e.clientY - cy;
        if (Math.abs(dx) > 30) b.classList.toggle('facing-left', dx < 0);
        var a = Math.max(-14, Math.min(14, Math.atan2(dy, Math.abs(dx)) * 180 / Math.PI * .35));
        b.style.setProperty('--look', a.toFixed(1) + 'deg');
      }
    }, { passive: true });
    addEventListener('pointerleave', function () { pointer.x = pointer.y = -999; });
    doc.addEventListener('pointerout', function (e) { if (!e.relatedTarget) pointer.x = pointer.y = -999; });
  }

  /* ---------- Go ---------- */
  function init() {
    doc.body.insertAdjacentHTML('afterbegin', DEFS);
    buildGarland();
    buildHero();
    buildFooter();
    if (!reduce) { startLeaves(); watchPointer(); }
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
})();
