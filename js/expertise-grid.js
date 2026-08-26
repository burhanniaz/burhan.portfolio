/* ---------------------------------------------------------------
   Home-page "What I build with" grid.

   Renders straight from the same admin-managed categories the
   Expertise search uses (js/data.js / PortfolioData), so adding,
   editing, or removing a category in /admin shows up here too.
   --------------------------------------------------------------- */
(function(){
    var grid = document.getElementById('expertiseGrid');
    if(!grid || !window.PortfolioData) return;

    var ICONS = {
      core:  '<circle cx="16" cy="16" r="5"/><path d="M16 3v6M16 23v6M3 16h6M23 16h6M7 7l4.2 4.2M20.8 20.8L25 25M25 7l-4.2 4.2M11.2 20.8L7 25"/>',
      flow:  '<rect x="4" y="13" width="7" height="7" rx="1"/><rect x="21" y="4" width="7" height="7" rx="1"/><rect x="21" y="22" width="7" height="7" rx="1"/><path d="M11 16h4a3 3 0 0 0 3-3V8h3M18 24h3v-8"/>',
      net:   '<circle cx="8" cy="8" r="3"/><circle cx="24" cy="9" r="3"/><circle cx="16" cy="24" r="3"/><path d="M10.5 9.8L21 8.7M9.5 10.8L15 21.5M22.7 11.5L17.3 21.5"/>',
      browser: '<rect x="3" y="6" width="26" height="20" rx="2"/><path d="M3 11h26M8 8.3h.01M11.5 8.3h.01"/>',
      chart: '<ellipse cx="16" cy="7" rx="11" ry="4"/><path d="M5 7v9c0 2.2 4.9 4 11 4s11-1.8 11-4V7M5 16v9c0 2.2 4.9 4 11 4s11-1.8 11-4v-9"/>',
      rag:   '<circle cx="16" cy="9" r="4"/><path d="M16 13v6M9 27v-3a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v3M6 27h20"/>',
      db:    '<ellipse cx="16" cy="7" rx="11" ry="4"/><path d="M5 7v18c0 2.2 4.9 4 11 4s11-1.8 11-4V7"/><path d="M5 16c0 2.2 4.9 4 11 4s11-1.8 11-4"/>',
      code:  '<path d="M11 8 4 16l7 8M21 8l7 8-7 8M18 5l-4 22"/>'
    };
    var DEFAULT_ICON = ICONS.core;

    function escapeHtml(s){
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function cardHtml(cat){
      var icon = ICONS[cat.viz] || DEFAULT_ICON;
      var tags = (cat.tags || []).map(function(t){ return '<span>' + escapeHtml(t) + '</span>'; }).join('');
      return '' +
        '<div class="expertise-card glass reveal">' +
          '<div class="expertise-icon"><svg viewBox="0 0 32 32">' + icon + '</svg></div>' +
          '<h3>' + escapeHtml(cat.name) + '</h3>' +
          '<p>' + escapeHtml(cat.desc || '') + '</p>' +
          '<div class="expertise-tags">' + tags + '</div>' +
        '</div>';
    }

    window.PortfolioData.load().then(function(content){
      var categories = content.categories || [];
      grid.innerHTML = categories.map(cardHtml).join('');

      var note = document.getElementById('expertiseNote');
      if(note && categories.length){
        note.textContent = categories.length + ' discipline' + (categories.length === 1 ? '' : 's') +
          ' I move between depending on what the problem actually needs.';
      }

      // main.js's reveal observer already ran before these cards existed
      var cards = grid.querySelectorAll('.reveal');
      if(!('IntersectionObserver' in window)){
        cards.forEach(function(el){ el.classList.add('is-visible'); });
      } else {
        var io = new IntersectionObserver(function(entries){
          entries.forEach(function(entry){
            if(entry.isIntersecting){
              entry.target.classList.add('is-visible');
              io.unobserve(entry.target);
            }
          });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        cards.forEach(function(el){ io.observe(el); });
      }
    });
  })();
