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