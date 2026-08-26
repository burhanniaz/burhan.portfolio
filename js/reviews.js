/* ---------------------------------------------------------------
   Home-page reviews.

   The quotes come from the same project records the expertise page
   renders, so there is only ever one place to edit a review. When
   there are more cards than fit on screen the arrows appear and the
   track pages through them.
   --------------------------------------------------------------- */
(function(){
    var track = document.getElementById('reviewsTrack');
    if(!track || !window.PortfolioData) return;

    var nav  = document.getElementById('reviewsNav');
    var prev = document.getElementById('reviewsPrev');
    var next = document.getElementById('reviewsNext');

    var STAR = '<svg viewBox="0 0 24 24"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4 6.2 20.5l1.1-6.5L2.6 9.4l6.5-.9z"/></svg>';

    function escapeHtml(s){
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
                      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function safeUrl(u){ return /^https?:\/\//i.test(String(u || '').trim()); }

    function starsHtml(rating){
      var out = '';
      for(var i = 1; i <= 5; i++){
        out += STAR.replace('<svg', '<svg class="' + (i <= rating ? '' : 'off') + '"');
      }
      return '<div class="review-stars" role="img" aria-label="' + rating + ' out of 5">' + out + '</div>';
    }

    function sourceHtml(r){
      var name = (r.source || '').trim();
      var url  = (r.sourceUrl || '').trim();
      if(!name && !url) return '';
      if(!safeUrl(url)){
        return name ? '<span class="review-source is-plain">via ' + escapeHtml(name) + '</span>' : '';
      }
      return '<a class="review-source" href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' +
               (name ? 'View on ' + escapeHtml(name) : 'View original review') +
               '<span class="ext" aria-hidden="true">&#8599;</span>' +
             '</a>';
    }

    function cardHtml(item){
      var r = item.review;
      return '<article class="testimonial-card">' +
               starsHtml(r.rating) +
               '<q>' + escapeHtml(r.quote) + '</q>' +
               '<div class="testimonial-who">' +
                 '<div class="avatar" aria-hidden="true">' + escapeHtml(r.initials) + '</div>' +
                 '<div>' +
                   '<div class="testimonial-name">' + escapeHtml(r.name || 'Client') + '</div>' +
                   '<div class="testimonial-role">' +
                     escapeHtml(r.role || '') +
                     (item.project ? '<span class="testimonial-project"> &middot; ' + escapeHtml(item.project) + '</span>' : '') +
                   '</div>' +
                 '</div>' +
               '</div>' +
               sourceHtml(r) +
             '</article>';
    }

    /* ---------- paging ---------- */

    function syncNav(){
      if(!nav) return;
      var max = track.scrollWidth - track.clientWidth;
      // tolerance covers the track's 6px padding, which offsets where a
      // snapped swipe comes to rest at either end
      var EDGE = 8;
      // arrows only earn their place when there is somewhere to scroll to
      nav.hidden = max <= EDGE;
      if(nav.hidden) return;
      prev.disabled = track.scrollLeft <= EDGE;
      next.disabled = track.scrollLeft >= max - EDGE;
    }

    function page(dir){
      // no explicit `behavior` — that would override the CSS, which already
      // switches to an instant jump under prefers-reduced-motion
      track.scrollBy({ left: dir * track.clientWidth });
    }

    if(prev) prev.addEventListener('click', function(){ page(-1); });
    if(next) next.addEventListener('click', function(){ page(1); });
    track.addEventListener('scroll', syncNav, { passive: true });
    window.addEventListener('resize', syncNav);

    track.addEventListener('keydown', function(e){
      if(e.key === 'ArrowRight'){ e.preventDefault(); page(1); }
      if(e.key === 'ArrowLeft'){  e.preventDefault(); page(-1); }
    });

    /* ---------- render ---------- */

    PortfolioData.load().then(function(d){
      var items = PortfolioData.reviews(d);

      if(!items.length){
        track.innerHTML = '<p class="reviews-loading">No reviews yet.</p>';
        if(nav) nav.hidden = true;
        return;
      }

      track.innerHTML = items.map(cardHtml).join('');
      syncNav();
    }).catch(function(err){
      console.error('Could not load reviews:', err);
      track.innerHTML = '<p class="reviews-loading">Reviews are unavailable right now.</p>';
      if(nav) nav.hidden = true;
    });
  })();
