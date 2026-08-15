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