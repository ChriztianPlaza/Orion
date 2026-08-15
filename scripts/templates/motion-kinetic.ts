/**
 * The kinetic motion layer.
 *
 * The original animated set opened on an aurora — two blurred radial washes
 * drifting behind the hero. It is the single most copied effect on the web and
 * it says nothing about the site it decorates, so none of it survives here.
 *
 * What replaces it is motion that comes from the layout rather than sitting
 * behind it: type revealed by a moving mask, sections uncovered by a clip
 * edge, a ticker that never stops, numbers that count, and elements that
 * enter from the side of the grid they belong to. Hard edges, no blur, no
 * floating light.
 *
 * Plain CSS and vanilla JavaScript — an exported folder has to run with
 * nothing installed. Everything collapses to a finished, readable page under
 * `prefers-reduced-motion`.
 */

export function kineticCss(): string {
  return `
/* ══════════════════════════════════════════════════════ kinetic motion */

/* Progress rule across the very top of the page. */
.k-progress{position:fixed;top:0;left:0;height:3px;width:0;background:var(--accent);z-index:999;will-change:width}

/*
  Headline reveal. Each line sits inside a clipping box and slides up into it,
  so the type is uncovered rather than faded — the mask is the animation.
*/
/*
  The mask is overflow:hidden, so a line box tightened to .9 line-height shears
  the descenders off every y, g and p — at display sizes that is glaring. The
  space is padded onto the sliding span rather than the mask, so the span's own
  height grows with it and translateY(105%) still clears the box completely.
  The mask then pulls the extra back out, leaving the spacing as drawn.
*/
.k-line{display:block;overflow:hidden;margin-bottom:-.7em}
.k-line > span{
  display:block;
  padding-bottom:.7em;
  transform:translateY(105%);
  animation:k-line-in .85s cubic-bezier(.16,1,.3,1) forwards;
  animation-delay:calc(var(--i) * 90ms);
}
@keyframes k-line-in{to{transform:translateY(0)}}

/* Sections are uncovered by a clip edge travelling across them. */
[data-wipe]{clip-path:inset(0 100% 0 0);transition:clip-path .9s cubic-bezier(.76,0,.24,1)}
[data-wipe].in{clip-path:inset(0 0 0 0)}

/* Grid items enter from the side of the grid they sit on. */
[data-enter]{opacity:0;transform:translateX(var(--from,0)) translateY(18px);transition:opacity .6s ease,transform .7s cubic-bezier(.16,1,.3,1)}
[data-enter].in{opacity:1;transform:none}

/* A ticker that never stops. Duplicated in script so the loop has no seam. */
.k-ticker{overflow:hidden;border-block:1px solid var(--border);background:var(--accent);color:var(--accent-ink)}
.k-ticker-row{display:flex;width:max-content;animation:k-marquee 26s linear infinite}
.k-ticker:hover .k-ticker-row{animation-play-state:paused}
.k-ticker-row span{
  display:inline-flex;align-items:center;gap:28px;padding:14px 28px;
  font-size:clamp(.95rem,1.6vw,1.35rem);font-weight:700;letter-spacing:-.01em;text-transform:uppercase;white-space:nowrap;
}
@keyframes k-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}

/* Buttons invert rather than glow: the fill wipes across from the left. */
.btn{position:relative;overflow:hidden;z-index:0;transition:color .28s ease,border-color .28s ease}
.btn::before{
  content:"";position:absolute;inset:0;z-index:-1;
  background:var(--ink);
  transform:scaleX(0);transform-origin:left;
  transition:transform .34s cubic-bezier(.76,0,.24,1);
}
.btn:hover::before{transform:scaleX(1)}
.btn-primary:hover{color:var(--bg)}
.btn-ghost:hover,.btn-outline:hover{color:var(--bg)}

/* Images sit in a box that crops them; the picture scales, the frame does not. */
.shot,.gallery-item{overflow:hidden}
.shot img,.gallery-item img,.card img{
  transition:transform .8s cubic-bezier(.16,1,.3,1);will-change:transform;
}
.shot:hover img,.gallery-item:hover img,.card:hover img{transform:scale(1.06)}

/* Cards square up against the accent instead of lifting on a shadow. */
.card{transition:background-color .3s ease,border-color .3s ease,color .3s ease}
.card:hover{border-color:var(--accent)}

/* Section headings get a rule that draws itself. */
.section-head h2{position:relative;display:inline-block;padding-bottom:.18em}
.section-head h2::after{
  content:"";position:absolute;left:0;bottom:0;height:3px;width:100%;
  background:var(--accent);transform:scaleX(0);transform-origin:left;
  transition:transform .8s cubic-bezier(.76,0,.24,1) .1s;
}
.section-head.in h2::after{transform:scaleX(1)}

/* Figures hold their width so a counting number cannot shift the layout. */
.stat-value{font-variant-numeric:tabular-nums}

/* Numbered index rows: the marker slides, the row shifts to meet the accent. */
.k-index-row{transition:background-color .3s ease,color .3s ease,padding-left .35s cubic-bezier(.16,1,.3,1)}
.k-index-row:hover{background:var(--accent);color:var(--accent-ink);padding-left:1.4rem}
.k-index-row:hover .k-index-num{color:var(--accent-ink)}

/* ═════════════════════════════════════════════ asymmetric section layout */

/* Hero: headline owns two thirds, facts sit in a narrow right column. */
.k-offset{display:grid;grid-template-columns:1.65fr .85fr;gap:clamp(32px,5vw,88px);align-items:end}
.k-offset-main h1{font-size:clamp(2.8rem,7.2vw,6.4rem);line-height:.94;margin:0 0 32px}
.k-offset-side .lede{margin:0 0 28px;max-width:38ch}
.k-side-figures{display:grid;gap:20px;margin:0;padding-top:24px;border-top:2px solid var(--ink)}
.k-side-figures dt{font-size:clamp(1.5rem,2.4vw,2.1rem);font-weight:800;line-height:1;margin:0}
.k-side-figures dd{margin:4px 0 0;font-size:.85rem;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.08em}
.k-bleed{margin-top:clamp(48px,6vw,96px);width:100%}
.k-bleed img{width:100%;height:auto;display:block}

/* Hero: poster type, meta pushed to the far side beneath it. */
.k-poster{font-size:clamp(3rem,13vw,11rem);line-height:.86;margin:0;letter-spacing:-.04em;text-wrap:balance}
.k-oversize-foot{display:grid;grid-template-columns:1fr auto;gap:32px;align-items:end;margin-top:clamp(32px,4vw,64px);padding-top:28px;border-top:2px solid var(--ink)}
.k-oversize-foot .lede{margin:0;max-width:46ch}

/* Hero: statement above, ledger of figures below, split hard. */
.k-ledger{display:grid;grid-template-columns:1fr;gap:clamp(36px,5vw,72px)}
.k-ledger-head h1{font-size:clamp(2.6rem,8vw,7rem);line-height:.92;margin:0}
.k-ledger-body{display:grid;grid-template-columns:1fr 1.1fr;gap:clamp(28px,4vw,64px);align-items:start;padding-top:32px;border-top:2px solid var(--ink)}
.k-ledger-rows{list-style:none;margin:0;padding:0;grid-column:2}
.k-ledger-rows li{display:flex;justify-content:space-between;gap:24px;align-items:baseline;padding:14px 0;border-bottom:1px solid var(--border)}
.k-ledger-rows .stat-value{font-size:clamp(1.4rem,2.2vw,2rem);font-weight:800;line-height:1}
.k-ledger-rows li span:last-child{color:var(--ink-muted);font-size:.9rem;text-align:right}

/* Hero: one long statement, nothing else competing. */
.k-statement{font-size:clamp(2rem,5.4vw,4.4rem);line-height:1.06;max-width:20ch;margin:0;letter-spacing:-.03em}
.k-statement-foot{display:flex;flex-wrap:wrap;gap:28px;align-items:center;justify-content:space-between;margin-top:clamp(36px,5vw,72px);padding-top:28px;border-top:2px solid var(--ink)}
.k-statement-foot p{margin:0;max-width:44ch;color:var(--ink-muted)}

/* Section heads split rather than centre. */
.k-head-split{display:grid;grid-template-columns:auto 1fr;gap:clamp(24px,4vw,72px);align-items:end;text-align:left}
.k-head-split .section-intro{margin:0;max-width:46ch;justify-self:end}

/* Numbered index. */
.k-index{list-style:none;margin:48px 0 0;padding:0;border-top:2px solid var(--ink)}
.k-index-row{display:grid;grid-template-columns:auto minmax(180px,1fr) 2fr;gap:clamp(16px,3vw,48px);align-items:baseline;padding:clamp(20px,2.4vw,32px) 0;border-bottom:1px solid var(--border)}
.k-index-num{font-size:.85rem;font-weight:700;color:var(--accent);letter-spacing:.1em}
.k-index-row h3{margin:0;font-size:clamp(1.2rem,2.2vw,1.9rem);line-height:1.1}
.k-index-row p{margin:0;color:var(--ink-muted);max-width:52ch}

/* Manifesto: pinned title, scrolling body. */
.k-manifesto{display:grid;grid-template-columns:.8fr 1.2fr;gap:clamp(32px,5vw,88px);align-items:start}
.k-manifesto-pin{position:sticky;top:96px}
.k-manifesto-pin h2{margin:0;font-size:clamp(1.8rem,4vw,3.4rem);line-height:1}
.k-manifesto-body{display:grid;gap:clamp(32px,4vw,64px)}
.k-manifesto-body article{padding-top:24px;border-top:1px solid var(--border)}
.k-step-num{display:block;font-size:.8rem;font-weight:700;letter-spacing:.12em;color:var(--accent);margin-bottom:12px}
.k-manifesto-body h3{margin:0 0 10px;font-size:clamp(1.15rem,1.9vw,1.6rem)}
.k-manifesto-body p{margin:0;color:var(--ink-muted);max-width:56ch}

/* Figures as rules across the page. */
.k-data-row{display:grid;grid-template-columns:auto auto 1fr;gap:clamp(16px,3vw,48px);align-items:baseline;padding:clamp(18px,2vw,28px) 0;border-bottom:1px solid var(--border)}
.k-data-row:first-child{border-top:2px solid var(--ink)}
.k-data-index{font-size:.8rem;font-weight:700;letter-spacing:.1em;color:var(--accent)}
.k-data-value{font-size:clamp(1.8rem,4.6vw,3.6rem);font-weight:800;line-height:1}
.k-data-label{color:var(--ink-muted);text-align:right}

/* A quote at display scale. */
.k-quote{margin:0;max-width:22ch}
.k-quote p{font-size:clamp(1.6rem,4.4vw,3.4rem);line-height:1.08;margin:0;letter-spacing:-.02em}
.k-quote footer{display:flex;gap:16px;flex-wrap:wrap;margin-top:32px;padding-top:20px;border-top:2px solid var(--ink);font-size:.9rem}
.k-quote footer span:last-child{color:var(--ink-muted)}

@media (max-width: 860px){
  .k-offset,.k-ledger-body,.k-manifesto,.k-head-split,.k-oversize-foot{grid-template-columns:1fr}
  .k-ledger-rows{grid-column:1}
  .k-manifesto-pin{position:static}
  .k-index-row{grid-template-columns:1fr;gap:8px}
  .k-data-row{grid-template-columns:auto 1fr;row-gap:6px}
  .k-data-label{text-align:left;grid-column:1 / -1}
  .k-head-split .section-intro{justify-self:start}
}

@media (prefers-reduced-motion: reduce){
  .k-progress{display:none}
  .k-line > span{transform:none;animation:none}
  [data-wipe]{clip-path:none;transition:none}
  [data-enter]{opacity:1;transform:none;transition:none}
  .k-ticker-row{animation:none;width:auto;flex-wrap:wrap}
  .btn::before{display:none}
  .shot img,.gallery-item img,.card img{transition:none}
  .shot:hover img,.gallery-item:hover img,.card:hover img{transform:none}
  .section-head h2::after{transform:scaleX(1);transition:none}
  .k-index-row{transition:none}
  .k-index-row:hover{padding-left:0}
}
`;
}

export function kineticJs(): string {
  return `
/* Kinetic behaviour. Dependency-free, safe to delete. */
(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches) return;

  /* ---- reading progress ---- */
  var bar = document.createElement('div');
  bar.className = 'k-progress';
  document.body.appendChild(bar);

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
      ticking = false;
    });
  }, { passive: true });

  /* ---- headline: split into lines, each masked ---- */
  var headline = document.querySelector('.hero h1');
  if (headline && !headline.querySelector('.k-line')) {
    // Split on the author's own line breaks so the mask follows the design
    // rather than wherever the text happens to wrap.
    var parts = headline.innerHTML.split(/<br\\s*\\/?>/i);
    if (parts.length > 1) {
      headline.innerHTML = parts
        .map(function (part, i) {
          return '<span class="k-line" style="--i:' + i + '"><span>' + part + '</span></span>';
        })
        .join('');
    } else {
      headline.innerHTML = '<span class="k-line" style="--i:0"><span>' + headline.innerHTML + '</span></span>';
    }
  }

  if (!('IntersectionObserver' in window)) return;

  /* ---- wipes and directional entries ---- */
  /*
    Short blocks come in once 15% of them shows, which reads well. A tall one —
    a full-bleed hero image can be most of a screen on its own — may never
    reach 15% while it is the thing you are looking at, so it comes in once a
    quarter-screen of it is visible instead. Without the second rule those
    stay clipped and the image simply never appears.
  */
  var reveal = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var tallEnough = entry.intersectionRect.height >= window.innerHeight * 0.25;
      if (!entry.isIntersecting || (entry.intersectionRatio < 0.15 && !tallEnough)) return;
      entry.target.classList.add('in');
      reveal.unobserve(entry.target);
    });
  }, { threshold: [0, 0.15], rootMargin: '0px 0px -6% 0px' });

  document.querySelectorAll('.section-head, .shot, .hero-media').forEach(function (el) {
    el.setAttribute('data-wipe', '');
    reveal.observe(el);
  });

  // Row lists read top to bottom, so they enter that way — each row rising a
  // beat after the one above it rather than the whole block appearing at once.
  document.querySelectorAll('.k-index-row, .k-data-row, .k-ledger-rows li, .k-manifesto-body article').forEach(function (row, i) {
    row.setAttribute('data-enter', '');
    row.style.transitionDelay = ((i % 8) * 70) + 'ms';
    reveal.observe(row);
  });

  document.querySelectorAll('.k-quote, .k-statement-foot').forEach(function (el) {
    el.setAttribute('data-enter', '');
    reveal.observe(el);
  });

  // Cards enter from the edge of the grid they belong to, so a three-column
  // row fans in rather than marching.
  document.querySelectorAll('.grid-2, .grid-3, .grid-4, .bento, .stat-grid, .gallery-grid').forEach(function (grid) {
    var items = Array.prototype.slice.call(grid.children);
    var columns = Math.max(1, Math.round(grid.offsetWidth / Math.max(1, items[0] ? items[0].offsetWidth : 1)));
    items.forEach(function (item, i) {
      var column = i % columns;
      var middle = (columns - 1) / 2;
      var offset = column < middle ? '-28px' : column > middle ? '28px' : '0px';
      item.setAttribute('data-enter', '');
      item.style.setProperty('--from', offset);
      item.style.transitionDelay = (i % columns) * 80 + 'ms';
      reveal.observe(item);
    });
  });

  /*
    Anything already on screen when the page settles is revealed outright.
    These elements are hidden by CSS until they are marked, so a reveal that
    never fires does not degrade to "no animation" — it degrades to missing
    content. Images changing the layout as they load is the usual cause.
  */
  function sweep() {
    document.querySelectorAll('[data-wipe],[data-enter]').forEach(function (el) {
      if (el.classList.contains('in')) return;
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('in');
    });
  }
  window.addEventListener('load', function () { setTimeout(sweep, 400); });

  /* ---- counting figures ---- */
  var counter = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      counter.unobserve(el);

      var match = el.textContent.trim().match(/^([^0-9-]*)(-?[0-9.,]+)(.*)$/);
      if (!match) return;
      var target = parseFloat(match[2].replace(/,/g, ''));
      if (!isFinite(target)) return;

      var decimals = (match[2].split('.')[1] || '').length;
      var grouped = match[2].indexOf(',') !== -1;
      var started = null;

      function frame(now) {
        if (started === null) started = now;
        var p = Math.min(1, (now - started) / 1200);
        var eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        var value = (target * eased).toFixed(decimals);
        if (grouped) {
          value = Number(value).toLocaleString(undefined, {
            minimumFractionDigits: decimals, maximumFractionDigits: decimals
          });
        }
        el.textContent = match[1] + value + match[3];
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }, { threshold: 0.6 });

  document.querySelectorAll('.stat-value').forEach(function (el) { counter.observe(el); });

  /* ---- ticker: duplicate the row so the loop has no visible seam ---- */
  document.querySelectorAll('.k-ticker-row').forEach(function (row) {
    if (row.dataset.doubled) return;
    row.dataset.doubled = '1';
    var clone = row.firstElementChild && row.firstElementChild.cloneNode(true);
    if (clone) {
      clone.setAttribute('aria-hidden', 'true');
      row.appendChild(clone);
    }
  });
})();
`;
}
