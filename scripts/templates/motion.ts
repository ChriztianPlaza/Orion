/**
 * The animation layer for templates marked `animated`.
 *
 * Everything here is plain CSS and vanilla JavaScript with no libraries. That
 * is a hard constraint, not a preference: an exported site is a folder the user
 * drops on a static host, so a template that needed GSAP from a CDN would
 * either break offline or quietly add a third-party dependency to a site we
 * promised was dependency-free.
 *
 * Every effect is wrapped so that `prefers-reduced-motion: reduce` leaves the
 * page fully readable and static — motion is added on top of a working page,
 * never required to reveal content.
 */

export function motionCss(): string {
  return `
/* ─────────────────────────────────────────────────────── animated layer */

/* Aurora: two slow-drifting radial washes behind the hero. */
.hero{position:relative;isolation:isolate}
.hero::before,.hero::after{
  content:"";position:absolute;z-index:-1;border-radius:50%;
  filter:blur(90px);opacity:.5;pointer-events:none;
}
.hero::before{
  width:52vw;height:52vw;max-width:680px;max-height:680px;
  top:-18%;left:-10%;
  background:radial-gradient(circle,var(--accent) 0%,transparent 68%);
  animation:aurora-a 22s ease-in-out infinite alternate;
}
.hero::after{
  width:44vw;height:44vw;max-width:560px;max-height:560px;
  top:6%;right:-8%;
  background:radial-gradient(circle,var(--accent-2,var(--accent)) 0%,transparent 68%);
  animation:aurora-b 28s ease-in-out infinite alternate;
}
@keyframes aurora-a{
  from{transform:translate3d(0,0,0) scale(1)}
  to{transform:translate3d(8%,6%,0) scale(1.18)}
}
@keyframes aurora-b{
  from{transform:translate3d(0,0,0) scale(1.1)}
  to{transform:translate3d(-7%,10%,0) scale(.92)}
}

/* Headline: words rise into place, staggered by index. */
.word{
  display:inline-block;
  opacity:0;
  transform:translateY(0.75em) rotate(2deg);
  animation:word-in .7s cubic-bezier(.16,1,.3,1) forwards;
  animation-delay:calc(var(--i) * 55ms);
}
@keyframes word-in{to{opacity:1;transform:none}}

/* Scroll reveal. Direction comes from the element's column position. */
[data-reveal]{
  opacity:0;
  transform:translateY(26px);
  transition:opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1);
  will-change:opacity,transform;
}
[data-reveal].in{opacity:1;transform:none}

/* Cards: a highlight that tracks the pointer, plus a small lift. */
.card,.shot{
  position:relative;
  transition:transform .35s cubic-bezier(.16,1,.3,1),border-color .35s ease;
}
.card::after{
  content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;
  opacity:0;transition:opacity .35s ease;
  background:radial-gradient(
    320px circle at var(--mx,50%) var(--my,50%),
    color-mix(in srgb,var(--accent) 22%,transparent),
    transparent 62%
  );
}
.card:hover::after{opacity:1}
.card:hover,.shot:hover{transform:translateY(-4px)}

/* Tilt, applied by script on pointer-capable devices. */
.tilt{transform-style:preserve-3d;transition:transform .18s ease-out}

/* Logo strip scrolls continuously once the script has doubled the row. */
.logos .wrap{overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
.logo-row[data-marquee]{flex-wrap:nowrap;width:max-content;animation:marquee 32s linear infinite}
.logos:hover .logo-row[data-marquee]{animation-play-state:paused}
@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}

/* Buttons gain a sheen that sweeps across on hover. */
.btn{position:relative;overflow:hidden}
.btn::after{
  content:"";position:absolute;top:0;left:-120%;width:60%;height:100%;
  background:linear-gradient(100deg,transparent,rgba(255,255,255,.28),transparent);
  transform:skewX(-18deg);transition:left .55s cubic-bezier(.16,1,.3,1);
}
.btn:hover::after{left:130%}

/* Section headings get an underline that draws in when revealed. */
.section-head h2{position:relative;display:inline-block}
.section-head h2::after{
  content:"";position:absolute;left:0;bottom:-8px;height:2px;width:100%;
  background:var(--accent);transform:scaleX(0);transform-origin:left;
  transition:transform .8s cubic-bezier(.16,1,.3,1) .15s;
}
.section-head.in h2::after{transform:scaleX(1)}

/* Numbers count up; reserve the width so the layout does not jitter. */
.stat-value{font-variant-numeric:tabular-nums}

/*
  Reduced motion: everything above resolves to its finished state. Content is
  visible and legible, nothing loops, nothing moves.
*/
@media (prefers-reduced-motion: reduce){
  .hero::before,.hero::after{animation:none;opacity:.28}
  .word{opacity:1;transform:none;animation:none}
  [data-reveal]{opacity:1;transform:none;transition:none}
  .card:hover,.shot:hover{transform:none}
  .card::after{display:none}
  .logo-row[data-marquee]{animation:none;flex-wrap:wrap;width:auto}
  .btn::after{display:none}
  .section-head h2::after{transform:scaleX(1);transition:none}
  .tilt{transform:none !important}
}
`;
}

export function motionJs(): string {
  return `
/* Animation behaviour. Dependency-free and safe to delete. */
(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches) return;

  /* ---- headline: wrap each word so it can be staggered ---- */
  var headline = document.querySelector('.hero h1');
  if (headline && !headline.querySelector('.word')) {
    var index = 0;
    // Walk text nodes only, so inline markup inside the headline survives.
    var walker = document.createTreeWalker(headline, NodeFilter.SHOW_TEXT);
    var nodes = [];
    var node;
    while ((node = walker.nextNode())) nodes.push(node);

    nodes.forEach(function (textNode) {
      var parts = textNode.nodeValue.split(/(\\s+)/);
      var fragment = document.createDocumentFragment();
      parts.forEach(function (part) {
        if (!part.trim()) {
          fragment.appendChild(document.createTextNode(part));
          return;
        }
        var span = document.createElement('span');
        span.className = 'word';
        span.style.setProperty('--i', String(index++));
        span.textContent = part;
        fragment.appendChild(span);
      });
      textNode.parentNode.replaceChild(fragment, textNode);
    });
  }

  /* ---- scroll reveal ---- */
  if ('IntersectionObserver' in window) {
    /*
      A whole section is often taller than the window, so it can never reach
      12% of itself while you are looking straight at it. Those also come in
      once a quarter-screen of them is visible — without it they stay at
      opacity 0 and the section reads as missing rather than un-animated.
    */
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var tallEnough = entry.intersectionRect.height >= window.innerHeight * 0.25;
        if (!entry.isIntersecting || (entry.intersectionRatio < 0.12 && !tallEnough)) return;
        entry.target.classList.add('in');
        revealer.unobserve(entry.target);
      });
    }, { threshold: [0, 0.12], rootMargin: '0px 0px -8% 0px' });

    document.querySelectorAll('.section, .section-head, .card, .shot, .stat').forEach(function (el, i) {
      el.setAttribute('data-reveal', '');
      el.style.transitionDelay = (i % 5) * 70 + 'ms';
      revealer.observe(el);
    });

    /* Anything already on screen once the page settles is revealed outright,
       so a reveal that never fires cannot hide content. */
    window.addEventListener('load', function () {
      setTimeout(function () {
        document.querySelectorAll('[data-reveal]').forEach(function (el) {
          if (el.classList.contains('in')) return;
          var r = el.getBoundingClientRect();
          if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('in');
        });
      }, 400);
    });

    /* ---- stat counters ---- */
    var counter = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        counter.unobserve(el);

        var raw = el.textContent.trim();
        var match = raw.match(/^([^0-9-]*)(-?[0-9.,]+)(.*)$/);
        if (!match) return;
        var prefix = match[1];
        var suffix = match[3];
        var target = parseFloat(match[2].replace(/,/g, ''));
        if (!isFinite(target)) return;
        var decimals = (match[2].split('.')[1] || '').length;
        var grouped = match[2].indexOf(',') !== -1;

        var started = null;
        var duration = 1100;
        function frame(now) {
          if (started === null) started = now;
          var progress = Math.min(1, (now - started) / duration);
          // easeOutExpo
          var eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
          var value = (target * eased).toFixed(decimals);
          if (grouped) value = Number(value).toLocaleString(undefined, {
            minimumFractionDigits: decimals, maximumFractionDigits: decimals
          });
          el.textContent = prefix + value + suffix;
          if (progress < 1) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      });
    }, { threshold: 0.6 });

    document.querySelectorAll('.stat-value').forEach(function (el) { counter.observe(el); });
  }

  /* ---- pointer-tracked card highlight + tilt ---- */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.card').forEach(function (card) {
      card.classList.add('tilt');
      card.addEventListener('pointermove', function (event) {
        var rect = card.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;
        card.style.setProperty('--mx', x + 'px');
        card.style.setProperty('--my', y + 'px');
        var rx = ((y / rect.height) - 0.5) * -5;
        var ry = ((x / rect.width) - 0.5) * 5;
        card.style.transform =
          'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-4px)';
      });
      card.addEventListener('pointerleave', function () {
        card.style.transform = '';
      });
    });
  }

  /* ---- hero parallax, throttled to the frame ---- */
  var hero = document.querySelector('.hero');
  if (hero) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var offset = Math.min(window.scrollY, 600);
        hero.style.setProperty('--parallax', (offset * 0.15).toFixed(1) + 'px');
        var media = hero.querySelector('.hero-media');
        if (media) media.style.transform = 'translateY(' + (offset * 0.06).toFixed(1) + 'px)';
        ticking = false;
      });
    }, { passive: true });
  }

  /* ---- logo strip: duplicate the row so the loop has no visible seam ---- */
  document.querySelectorAll('.logo-row').forEach(function (row) {
    if (row.dataset.marquee) return;
    // The copy is decorative and would otherwise be read out twice.
    var clone = row.cloneNode(true);
    clone.querySelectorAll('li').forEach(function (li) {
      li.setAttribute('aria-hidden', 'true');
      row.appendChild(li);
    });
    row.dataset.marquee = '1';
  });
})();
`;
}
