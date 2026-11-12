(function () {
  var d = document, root = d.documentElement;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };

  // theme toggle (kept per visitor)
  function stored() { try { return localStorage.getItem('xb-theme'); } catch (e) { return null; } }
  var t = stored(); if (t) root.setAttribute('data-theme', t);
  $$('[data-theme-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      var cur = root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      var nx = cur === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', nx);
      try { localStorage.setItem('xb-theme', nx); } catch (e) {}
    });
  });

  // mobile drawer
  var drawer = $('#drawer');
  $$('[data-menu-open]').forEach(function (b) { b.addEventListener('click', function () { drawer.hidden = false; d.body.style.overflow = 'hidden'; b.setAttribute('aria-expanded', 'true'); }); });
  $$('[data-menu-close]').forEach(function (b) { b.addEventListener('click', function () { drawer.hidden = true; d.body.style.overflow = ''; }); });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer && !drawer.hidden) { drawer.hidden = true; d.body.style.overflow = ''; } });

  // toast
  var toastEl;
  function toast(msg) {
    if (!toastEl) { toastEl = d.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); d.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastEl._t); toastEl._t = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }
  function copy(text, okMsg) {
    try {
      navigator.clipboard.writeText(text).then(function () { toast(okMsg || 'Kopyalandı'); }, function () { toast('Mətni seçib kopyalayın'); });
    } catch (e) { toast('Mətni seçib kopyalayın'); }
  }
  $$('[data-copy]').forEach(function (b) { b.addEventListener('click', function () { copy(b.getAttribute('data-copy')); }); });
  $$('[data-copy-url]').forEach(function (b) { b.addEventListener('click', function () { copy(b.getAttribute('data-copy-url'), 'Link kopyalandı'); }); });

  // filters (blog, portfolio, lessons)
  $$('[data-filter-group]').forEach(function (g) {
    var target = $(g.getAttribute('data-filter-group'));
    var items = $$('[data-cat]', target);
    var search = $('input[type=search]', g);
    var empty = $('[data-empty]', target.parentNode);
    var cat = 'all';
    function apply() {
      var q = (search && search.value || '').toLowerCase().trim(), shown = 0;
      items.forEach(function (it) {
        var ok = (cat === 'all' || it.getAttribute('data-cat') === cat) && (!q || it.textContent.toLowerCase().indexOf(q) > -1);
        it.hidden = !ok; if (ok) shown++;
      });
      if (empty) empty.hidden = shown > 0;
    }
    $$('.chip', g).forEach(function (c) {
      c.addEventListener('click', function () {
        $$('.chip', g).forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        c.setAttribute('aria-pressed', 'true'); cat = c.getAttribute('data-val'); apply();
      });
    });
    if (search) search.addEventListener('input', apply);
  });

  // calculator
  var calc = $('#calc');
  if (calc) {
    var nf = function (n, dgt) { var s = (+n).toFixed(dgt || 0).split('.'); s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' '); return s.join(','); };
    var run = function () {
      var b = +$('#c-b').value, cpl = +$('#c-cpl').value, cr = +$('#c-cr').value, ch = +$('#c-ch').value;
      $('#o-b').textContent = nf(b) + ' ₼'; $('#o-cpl').textContent = nf(cpl, 1) + ' ₼'; $('#o-cr').textContent = cr + '%'; $('#o-ch').textContent = nf(ch) + ' ₼';
      var leads = b / cpl, sales = leads * cr / 100, rev = sales * ch;
      $('#r-l').textContent = nf(Math.round(leads)); $('#r-s').textContent = nf(Math.round(sales));
      $('#r-r').textContent = nf(Math.round(rev)) + ' ₼'; $('#r-o').textContent = nf(rev / b, 1) + 'x';
    };
    $$('input', calc).forEach(function (i) { i.addEventListener('input', run); }); run();
  }

  // contact form -> ready WhatsApp message
  var fm = $('#contact-form');
  if (fm) {
    fm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('#f-name'), phone = $('#f-phone');
      if (!name.value.trim()) { name.focus(); name.setCustomValidity('Adınızı yazın'); name.reportValidity(); name.setCustomValidity(''); return; }
      var msg = 'Salam Xəlil! Mən ' + name.value.trim() + '.' +
        ($('#f-biz').value.trim() ? '\nBiznes: ' + $('#f-biz').value.trim() : '') +
        '\nMaraqlandığım: ' + $('#f-svc').value +
        ($('#f-budget').value ? '\nBüdcə: ' + $('#f-budget').value : '') +
        (phone.value.trim() ? '\nTelefon: ' + phone.value.trim() : '') +
        ($('#f-msg').value.trim() ? '\n\n' + $('#f-msg').value.trim() : '');
      var out = $('#f-out'); out.hidden = false;
      $('pre', out).textContent = msg;
      $('#f-wa').href = 'https://wa.me/' + fm.getAttribute('data-wa') + '?text=' + encodeURIComponent(msg);
      $('#f-copy').onclick = function () { copy(msg, 'Mesaj kopyalandı'); };
      out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  // article: reading progress + toc highlight
  var art = $('.prose[data-article]');
  if (art) {
    var bar = d.createElement('div'); bar.className = 'progress'; d.body.appendChild(bar);
    var links = $$('.toc a'), heads = links.map(function (a) { return d.getElementById(a.getAttribute('href').slice(1)); });
    var onScroll = function () {
      var r = art.getBoundingClientRect(), h = r.height - innerHeight;
      bar.style.width = Math.max(0, Math.min(100, (-r.top / (h > 0 ? h : 1)) * 100)) + '%';
      var cur = -1; heads.forEach(function (h2, i) { if (h2 && h2.getBoundingClientRect().top < 140) cur = i; });
      links.forEach(function (a, i) { a.classList.toggle('on', i === cur); });
    };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }
})();
