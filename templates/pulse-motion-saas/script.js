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
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.section, .hero-media, .card, .shot').forEach(function (el, i) {
      el.setAttribute('data-reveal', '');
      el.style.transitionDelay = (i % 4) * 60 + 'ms';
      observer.observe(el);
    });
  }
})();
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
      var parts = textNode.nodeValue.split(/(\s+)/);
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
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        revealer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    document.querySelectorAll('.section, .section-head, .card, .shot, .stat').forEach(function (el, i) {
      el.setAttribute('data-reveal', '');
      el.style.transitionDelay = (i % 5) * 70 + 'ms';
      revealer.observe(el);
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
