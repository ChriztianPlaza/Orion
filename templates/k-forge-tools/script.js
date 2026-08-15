/* Small, dependency-free behaviour. Yours to edit or delete. */
(function () {
  var nav = document.querySelector('.nav');
  var toggle = document.querySelector('.nav-toggle');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('.nav-links a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /*
   * Contact form.
   *
   * An exported site has no server, so rather than leave the button inert the
   * form hands the message to the visitor's mail client with the fields
   * already filled in. Replace this with a fetch() to your own endpoint or a
   * form service when you have one.
   */
  document.querySelectorAll('form.contact-form').forEach(function (form) {
    var to = form.getAttribute('data-mailto');
    var note = form.querySelector('.form-note');
    if (!to) return;

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!form.reportValidity()) return;

      var data = new FormData(form);
      var name = String(data.get('name') || '').trim();
      var email = String(data.get('email') || '').trim();
      var message = String(data.get('message') || '').trim();

      var subject = 'Website enquiry' + (name ? ' from ' + name : '');
      var body = message + '\n\n—\n' + name + (email ? '\n' + email : '');

      window.location.href =
        'mailto:' + to +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);

      if (note) note.textContent = 'Opening your email app…';
    });
  });

  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (event) {
      var id = anchor.getAttribute('href');
      if (!id || id === '#') return;
      var target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  if ('IntersectionObserver' in window) {
    /*
      Small blocks come in once 12% of them shows. A section can be taller than
      the window, so it may never reach 12% of itself while it fills the
      screen — those come in once a quarter-screen of them is visible instead.
      These elements start at opacity 0, so a reveal that never fires does not
      degrade to "no animation", it degrades to missing content.
    */
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var tallEnough = entry.intersectionRect.height >= window.innerHeight * 0.25;
        if (!entry.isIntersecting) return;
        if (entry.intersectionRatio < 0.12 && !tallEnough) return;
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      });
    }, { threshold: [0, 0.12] });

    document.querySelectorAll('.section, .hero-media, .card, .shot').forEach(function (el, i) {
      el.setAttribute('data-reveal', '');
      el.style.transitionDelay = (i % 4) * 60 + 'ms';
      observer.observe(el);
    });

    /* Images finishing late can move a block out from under the observer, so
       sweep once the page has settled and reveal whatever is on screen. */
    window.addEventListener('load', function () {
      setTimeout(function () {
        document.querySelectorAll('[data-reveal]').forEach(function (el) {
          if (el.classList.contains('in')) return;
          var r = el.getBoundingClientRect();
          if (r.top < window.innerHeight * 0.9 && r.bottom > 0) el.classList.add('in');
        });
      }, 400);
    });
  }
})();
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
    var parts = headline.innerHTML.split(/<br\s*\/?>/i);
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
