/* Site motion: Lenis smooth scrolling plus GSAP reveals.
   Several effects are plain-JS takes on React Bits components (reactbits.dev, MIT + Commons Clause):
   BlurText for the headline, SpotlightCard for cards, CountUp for numbers and ShinyText for the eyebrow.
   Everything is skipped when the visitor asks for reduced motion, and the page reads fine without it. */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function reveal() { root.classList.remove('motion-pending'); }

  // Spotlight on cards follows the pointer. Cheap enough to keep even with reduced motion.
  document.querySelectorAll('.card, .steps li, .plan').forEach(function (el) {
    el.classList.add('spot');
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  // The header hides while scrolling down and returns on the way up.
  var header = document.querySelector('.site-header'), lastY = 0;
  function onScroll(y) {
    if (!header) return;
    header.classList.toggle('scrolled', y > 8);
    var menuOpen = document.getElementById('nav-toggle');
    header.classList.toggle('tucked', y > 240 && y > lastY && !(menuOpen && menuOpen.checked));
    lastY = y;
  }

  if (reduce || !window.gsap || !window.ScrollTrigger) {
    reveal();
    window.addEventListener('scroll', function () { onScroll(window.scrollY); }, { passive: true });
    return;
  }

  var gsap = window.gsap;
  gsap.registerPlugin(window.ScrollTrigger);
  if (window.SplitText) gsap.registerPlugin(window.SplitText);

  // Smooth scrolling, driven by GSAP's ticker so ScrollTrigger stays in step.
  if (window.Lenis) {
    var lenis = new window.Lenis({ duration: 1.1, anchors: true });
    lenis.on('scroll', function (e) { window.ScrollTrigger.update(); onScroll(e.scroll); });
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  } else {
    window.addEventListener('scroll', function () { onScroll(window.scrollY); }, { passive: true });
  }

  var ease = 'power3.out';

  // Hero: headline words blur in, then the rest of the copy rises after it.
  var hero = document.querySelector('.hero');
  if (hero) {
    var h1 = hero.querySelector('h1');
    var tl = gsap.timeline({ defaults: { ease: ease } });
    if (h1 && window.SplitText) {
      var split = new window.SplitText(h1, { type: 'words', wordsClass: 'w' });
      tl.from(split.words, { opacity: 0, y: 18, filter: 'blur(10px)', duration: .8, stagger: .08 });
    } else if (h1) {
      tl.from(h1, { opacity: 0, y: 18, duration: .7 });
    }
    var copy = hero.querySelectorAll('.eyebrow, .hero-copy > p:not(.eyebrow), .actions .btn, .hero-note, .hero > .wrap > p, .hero .actions > *');
    tl.from(copy, { opacity: 0, y: 16, duration: .6, stagger: .07 }, '-=.45');

    // The illustration: phone floats in, the fast route sketches itself, cameras pop onto it,
    // then the chosen route draws over and the route sheet slides up.
    var art = hero.querySelector('.hero-map');
    if (art) {
      tl.from(art, { opacity: 0, y: 40, rotate: -2, duration: .9 }, .15);
      [['.r-fast', 1.0, .6], ['.r-pick', 1.2, 1.7]].forEach(function (r) {
        var p = art.querySelector(r[0]);
        if (!p || !p.getTotalLength) return;
        var len = p.getTotalLength();
        gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
        tl.to(p, { strokeDashoffset: 0, duration: r[1], ease: 'power2.inOut' }, r[2]);
      });
      var cams = art.querySelectorAll('.cams circle');
      if (cams.length) tl.from(cams, { scale: 0, transformOrigin: '50% 50%', duration: .35, stagger: .03, ease: 'back.out(2.5)' }, 1.2);
      var sheet = art.querySelector('.sheet');
      if (sheet) tl.from(sheet, { y: 170, duration: .7 }, 2.2);
      gsap.to(art, { y: -10, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 3 });
      gsap.to(art, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    }
  }
  reveal();

  // Sections: headings and leads rise in; groups of cards and steps stagger in together.
  gsap.utils.toArray('main section:not(.hero), main > .page, main article').forEach(function (sec) {
    var heads = sec.querySelectorAll(':scope > .wrap > h2, :scope > .wrap > .lead, :scope > .wrap > p, :scope h1, :scope > .wrap > div > h2, :scope > .wrap > div > p');
    if (heads.length) {
      gsap.from(heads, { opacity: 0, y: 24, duration: .7, stagger: .08, ease: ease,
        scrollTrigger: { trigger: sec, start: 'top 82%', once: true } });
    }
    sec.querySelectorAll('.grid, .steps, .plans').forEach(function (group) {
      gsap.from(group.children, { opacity: 0, y: 36, scale: .97, duration: .7, stagger: .1, ease: ease,
        scrollTrigger: { trigger: group, start: 'top 85%', once: true } });
    });
  });

  // Long-form pages: paragraphs, lists and headings drift up in small batches as they scroll in.
  window.ScrollTrigger.batch('.prose > *', {
    start: 'top 92%', once: true,
    onEnter: function (els) { gsap.fromTo(els, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .55, stagger: .05, ease: ease }); }
  });

  // Step numbers pop as they arrive.
  gsap.utils.toArray('.steps li > span').forEach(function (n) {
    gsap.from(n, { scale: 0, rotate: -90, duration: .6, ease: 'back.out(2)',
      scrollTrigger: { trigger: n, start: 'top 88%', once: true } });
  });

  // Count up any number marked with data-count (keeps its decimals and surrounding text).
  gsap.utils.toArray('[data-count]').forEach(function (el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var decimals = (el.getAttribute('data-count').split('.')[1] || '').length;
    var obj = { v: 0 };
    gsap.to(obj, { v: target, duration: 1.4, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: function () { el.textContent = obj.v.toFixed(decimals); } });
  });

  // Buttons lean slightly toward the pointer.
  if (window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.btn').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * .15, y: (e.clientY - r.top - r.height / 2) * .25, duration: .3 });
      });
      b.addEventListener('pointerleave', function () { gsap.to(b, { x: 0, y: 0, duration: .5, ease: 'elastic.out(1, .4)' }); });
    });
  }

  window.addEventListener('load', function () { window.ScrollTrigger.refresh(); });
})();
