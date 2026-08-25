/* ---------------------------------------------------------------
   Explore section: Projects / Experience / Courses.
   Everything here is filtered by the area chosen in the finder above
   (the 'expertise:change' event dispatched from js/expertise.js).
   --------------------------------------------------------------- */
function initExplore(content){
    var track = document.getElementById('segToggle');
    if(!track) return;

    /* All content comes from /api/content (managed from /admin), with
       data/seed.json as the offline fallback. See js/data.js. */
    var SUBCATS    = content.subcats;
    var PROJECTS   = content.projects;
    var EXPERIENCE = content.experience;
    var COURSES    = content.courses;

    /* ---------- Elements ---------- */
    var indicator = document.getElementById('segIndicator');
    var tabs      = Array.prototype.slice.call(track.querySelectorAll('.seg-btn'));
    var filterBar = document.getElementById('exploreFilter');
    var heading   = document.getElementById('exploreHeading');

    var subSwitch  = document.getElementById('subSwitch');
    var projList   = document.getElementById('projList');
    var expList    = document.getElementById('expList');
    var courseList = document.getElementById('courseList');

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function escapeHtml(s){
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function pad(n){ return n < 10 ? '0' + n : String(n); }
    function ext(href){ return /^https?:/i.test(href) ? ' target="_blank" rel="noopener"' : ''; }

    /* =========================================================
       Segmented toggle
       ========================================================= */
    function panelFor(tab){ return document.getElementById(tab.getAttribute('aria-controls')); }

    function moveIndicator(tab, animate){
      if(!animate) indicator.classList.add('no-anim');
      indicator.style.width = tab.offsetWidth + 'px';
      indicator.style.transform = 'translateX(' + tab.offsetLeft + 'px)';
      if(!animate){
        void indicator.offsetWidth;
        indicator.classList.remove('no-anim');
      }
    }

    function ripple(e, tab){
      if(reduceMotion) return;
      var box = track.getBoundingClientRect();
      var x, y;

      if(e && typeof e.clientX === 'number' && e.clientX !== 0){
        x = e.clientX - box.left;
        y = e.clientY - box.top;
      } else {
        var t = tab.getBoundingClientRect();
        x = t.left - box.left + t.width / 2;
        y = t.top - box.top + t.height / 2;
      }

      var far = Math.max(
        Math.hypot(x, y),
        Math.hypot(box.width - x, y),
        Math.hypot(x, box.height - y),
        Math.hypot(box.width - x, box.height - y)
      );

      var el = document.createElement('span');
      el.className = 'seg-ripple';
      el.style.width = el.style.height = (far * 2) + 'px';
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      track.appendChild(el);

      // animationend never fires while the tab is backgrounded, so back it with a timer
      var done = false;
      function clear(){ if(done) return; done = true; clearTimeout(timer); el.remove(); }
      var timer = setTimeout(clear, 1200);
      el.addEventListener('animationend', clear);
    }

    function selectTab(tab, e){
      if(tab.classList.contains('is-active')) return;
      ripple(e, tab);
      tabs.forEach(function(t){
        var on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        panelFor(t).classList.toggle('is-active', on);
      });
      moveIndicator(tab, true);
      // cards measure as 0-height while their panel is display:none — re-measure on return
      if(tab.id === 'tab-projects') syncAllClamps();
    }

    track.addEventListener('click', function(e){
      var tab = e.target.closest('.seg-btn');
      if(tab) selectTab(tab, e);
    });

    track.addEventListener('keydown', function(e){
      var i = tabs.indexOf(document.activeElement);
      if(i < 0) return;
      var next;
      if(e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      else if(e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      else if(e.key === 'Home') next = tabs[0];
      else if(e.key === 'End') next = tabs[tabs.length - 1];
      else return;
      e.preventDefault();
      next.focus();
      selectTab(next, null);
    });

    function placeIndicator(){
      moveIndicator(track.querySelector('.seg-btn.is-active') || tabs[0], false);
    }

    /* =========================================================
       Project cards — every project in the category stays visible;
       each keeps its own small carousel and its own unfoldable text.
       ========================================================= */
    var PH_ICON = '<svg viewBox="0 0 32 32"><rect x="3" y="6" width="26" height="20" rx="3"/>' +
                  '<circle cx="11" cy="14" r="2.6"/><path d="M4 23l7-6 5 4 4-3 8 7"/></svg>';
    var STAR = '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.5-5.9-3.2-5.9 3.2 1.2-6.5L2.5 9.5l6.6-.9z"/></svg>';

    function slideHtml(m){
      if(m.type === 'video'){
        return '<video src="' + escapeHtml(m.src) + '"' +
               (m.poster ? ' poster="' + escapeHtml(m.poster) + '"' : '') +
               ' controls preload="metadata" playsinline></video>';
      }
      if(m.type === 'image'){
        return '<img src="' + escapeHtml(m.src) + '" alt="' + escapeHtml(m.alt || '') + '" loading="lazy">';
      }
      return '<div class="media-placeholder">' + PH_ICON +
             '<span>' + escapeHtml(m.label || 'Media') + '</span></div>';
    }

    function reviewHtml(r){
      if(!r) return '<div class="pcard-review is-empty">No client review yet</div>';
      var stars = '';
      for(var i = 1; i <= 5; i++){
        stars += STAR.replace('<svg', '<svg class="' + (i <= (r.rating || 5) ? '' : 'off') + '"');
      }
      return '<div class="pcard-review">' +
               '<div class="review-stars" role="img" aria-label="' + (r.rating || 5) + ' out of 5">' + stars + '</div>' +
               '<p class="pcard-quote">' + escapeHtml(r.quote) + '</p>' +
               '<span class="pcard-who">' + escapeHtml(r.name) + ' &middot; ' + escapeHtml(r.role) + '</span>' +
             '</div>';
    }

    function cardHtml(p){
      var multi = p.media.length > 1;
      var media =
        '<div class="pcard-media"' + (multi ? ' tabindex="0"' : '') + '>' +
          '<div class="pcard-stage">' +
            p.media.map(function(m, n){
              return '<div class="media-slide' + (n === 0 ? ' is-active' : '') + '">' + slideHtml(m) + '</div>';
            }).join('') +
          '</div>' +
          (multi
            ? '<button class="pcard-nav prev" type="button" aria-label="Previous media">' +
                '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>' +
              '<button class="pcard-nav next" type="button" aria-label="Next media">' +
                '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>' +
              '<span class="pcard-counter">' + pad(1) + ' / ' + pad(p.media.length) + '</span>'
            : '') +
        '</div>';

      return '<article class="pcard glass">' +
        media +
        '<div class="pcard-body">' +
          '<h3>' + escapeHtml(p.title) + '</h3>' +
          '<div class="pcard-tags">' + p.tags.map(function(t){ return '<span>' + escapeHtml(t) + '</span>'; }).join('') + '</div>' +
          '<p class="pcard-desc">' + escapeHtml(p.desc) + '</p>' +
          '<button class="pcard-more" type="button" aria-expanded="false" hidden>' +
            '<span class="label">Show more</span><span class="chev" aria-hidden="true">&darr;</span>' +
          '</button>' +
          reviewHtml(p.review) +
          '<div class="pcard-links">' +
            '<a class="btn btn-primary" href="' + escapeHtml(p.live) + '"' + ext(p.live) + '>Live project <span aria-hidden="true">&rarr;</span></a>' +
            '<a class="btn btn-ghost" href="' + escapeHtml(p.code) + '"' + ext(p.code) + '>Code <span aria-hidden="true">&rarr;</span></a>' +
          '</div>' +
        '</div>' +
      '</article>';
    }

    function step(card, dir){
      var slides = card.querySelectorAll('.media-slide');
      if(slides.length < 2) return;

      var cur = 0;
      slides.forEach(function(s, n){ if(s.classList.contains('is-active')) cur = n; });
      var next = (cur + dir + slides.length) % slides.length;

      card.querySelectorAll('video').forEach(function(v){ if(!v.paused) v.pause(); });
      slides.forEach(function(s, n){ s.classList.toggle('is-active', n === next); });

      var c = card.querySelector('.pcard-counter');
      if(c) c.textContent = pad(next + 1) + ' / ' + pad(slides.length);
    }

    // "Show more" only appears on a card whose text really overflows two lines
    function syncCardClamp(card){
      var d = card.querySelector('.pcard-desc');
      var b = card.querySelector('.pcard-more');
      if(d.dataset.open === '1') return;          // leave an unfolded card alone
      d.classList.remove('no-clamp');
      d.style.maxHeight = '';
      var overflows = d.scrollHeight > d.clientHeight + 1;
      b.hidden = !overflows;
      if(!overflows) d.classList.add('no-clamp');
    }

    function syncAllClamps(){
      projList.querySelectorAll('.pcard').forEach(syncCardClamp);
    }

    function toggleDesc(card){
      var d = card.querySelector('.pcard-desc');
      var b = card.querySelector('.pcard-more');
      var open = d.dataset.open !== '1';

      d.dataset.open = open ? '1' : '';
      b.classList.toggle('is-open', open);
      b.setAttribute('aria-expanded', String(open));
      b.querySelector('.label').textContent = open ? 'Show less' : 'Show more';
      d.style.maxHeight = open ? d.scrollHeight + 'px' : '';
    }

    projList.addEventListener('click', function(e){
      var nav = e.target.closest('.pcard-nav');
      if(nav){ step(nav.closest('.pcard'), nav.classList.contains('next') ? 1 : -1); return; }
      var more = e.target.closest('.pcard-more');
      if(more) toggleDesc(more.closest('.pcard'));
    });

    projList.addEventListener('keydown', function(e){
      if(e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      var media = e.target.closest('.pcard-media');
      if(!media) return;
      e.preventDefault();
      step(media.closest('.pcard'), e.key === 'ArrowRight' ? 1 : -1);
    });

    projList.addEventListener('transitionend', function(e){
      if(e.propertyName !== 'max-height') return;
      var d = e.target;
      if(d.classList && d.classList.contains('pcard-desc') && d.dataset.open === '1'){
        d.style.maxHeight = 'none';
      }
    });

    function renderProjects(list, areaName){
      if(!list.length){
        projList.innerHTML = '<div class="panel-empty glass">No projects tagged <b>' +
                             escapeHtml(areaName) + '</b> yet.</div>';
        return;
      }
      projList.innerHTML = list.map(cardHtml).join('');
      syncAllClamps();
    }

    /* =========================================================
       Experience + Courses
       ========================================================= */
    function renderExperience(list, areaName){
      if(!list.length){
        expList.innerHTML = '<div class="panel-empty glass">No roles tagged <b>' +
                            escapeHtml(areaName) + '</b> yet.</div>';
        return;
      }
      expList.innerHTML = '<div class="timeline glass">' + list.map(function(x){
        return '<div class="timeline-item">' +
                 '<span class="timeline-date">' + escapeHtml(x.date) + '</span>' +
                 '<div>' +
                   '<div class="timeline-role">' + escapeHtml(x.role) + '</div>' +
                   '<div class="timeline-org">' + escapeHtml(x.org) + '</div>' +
                   '<p class="timeline-desc">' + escapeHtml(x.desc) + '</p>' +
                 '</div>' +
               '</div>';
      }).join('') + '</div>';
    }

    function renderCourses(list, areaName){
      if(!list.length){
        courseList.innerHTML = '<div class="panel-empty glass">No courses tagged <b>' +
                               escapeHtml(areaName) + '</b> yet.</div>';
        return;
      }
      courseList.innerHTML = '<div class="courses-grid">' + list.map(function(c){
        var done = /complete/i.test(c.status);
        return '<div class="course-card glass">' +
                 '<div class="course-top">' +
                   '<div><h3>' + escapeHtml(c.name) + '</h3>' +
                   '<div class="course-org">' + escapeHtml(c.org) + ' &middot; ' + escapeHtml(c.year) + '</div></div>' +
                   '<span class="course-status' + (done ? ' is-done' : '') + '">' + escapeHtml(c.status) + '</span>' +
                 '</div>' +
                 '<p class="desc">' + escapeHtml(c.desc) + '</p>' +
                 '<div class="course-tags">' + c.tags.map(function(t){ return '<span>' + escapeHtml(t) + '</span>'; }).join('') + '</div>' +
               '</div>';
      }).join('') + '</div>';
    }

    /* =========================================================
       Filtering
       ========================================================= */
    var activeArea = null;   // null === show everything
    var activeSub  = null;   // null === every sub-category of the active area

    function inArea(item){
      return !activeArea || item.areas.indexOf(activeArea.id) > -1;
    }

    function inSub(project){
      return !activeSub || (project.subs || []).indexOf(activeSub) > -1;
    }

    /* The sub-category row only makes sense inside an area, so it stays hidden
       until one is picked. Counts come from the area-filtered set, not the
       sub-filtered one, so the numbers do not change as you click through. */
    function renderSubSwitch(areaProjects){
      var list = activeArea ? SUBCATS[activeArea.id] : null;
      if(!list || !list.length){
        subSwitch.hidden = true;
        subSwitch.innerHTML = '';
        return;
      }

      var chips = ['<button class="sub-chip' + (activeSub === null ? ' is-active' : '') +
                   '" type="button" role="tab" aria-selected="' + (activeSub === null) + '" data-sub="">' +
                   'All <span class="n">' + areaProjects.length + '</span></button>'];

      list.forEach(function(sub){
        var n = areaProjects.filter(function(p){ return (p.subs || []).indexOf(sub) > -1; }).length;
        var on = activeSub === sub;
        chips.push('<button class="sub-chip' + (on ? ' is-active' : '') + (n === 0 ? ' is-empty' : '') +
                   '" type="button" role="tab" aria-selected="' + on + '" data-sub="' + escapeHtml(sub) + '">' +
                   escapeHtml(sub) + ' <span class="n">' + n + '</span></button>');
      });

      subSwitch.innerHTML = chips.join('');
      subSwitch.hidden = false;
    }

    subSwitch.addEventListener('click', function(e){
      var chip = e.target.closest('.sub-chip');
      if(!chip) return;
      activeSub = chip.dataset.sub || null;
      refresh();
    });

    // no numbers on the toggle — an empty tab just dims
    function setCounts(p, x, c){
      tabs[0].classList.toggle('is-empty', p === 0);
      tabs[1].classList.toggle('is-empty', x === 0);
      tabs[2].classList.toggle('is-empty', c === 0);
    }

    function renderFilterBar(){
      if(!activeArea){
        filterBar.innerHTML = '<span>Showing everything — pick an area above to narrow it down.</span>';
        return;
      }
      filterBar.innerHTML =
        '<span>Showing</span>' +
        '<span class="filter-pill">' + escapeHtml(activeArea.name) +
          '<button class="filter-clear" id="filterClear" type="button" aria-label="Clear filter">' +
            '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
          '</button>' +
        '</span>';
    }

    // changing area always resets the sub-category back to "All"
    function apply(area){
      activeArea = area || null;
      activeSub = null;
      refresh();
    }

    function refresh(){
      var label = activeArea ? activeArea.name : 'this area';

      var ps = PROJECTS.filter(inArea);          // area only — drives the sub counts
      var xs = EXPERIENCE.filter(inArea);
      var cs = COURSES.filter(inArea);
      var shownProjects = ps.filter(inSub);      // area + sub — drives the cards

      heading.textContent = activeArea ? activeArea.name : 'Work, history & learning';
      renderFilterBar();
      renderSubSwitch(ps);
      setCounts(shownProjects.length, xs.length, cs.length);

      renderProjects(shownProjects, activeSub || label);
      renderExperience(xs, label);
      renderCourses(cs, label);

      placeIndicator();
    }

    // the pill's X only announces the reset — the listener below does the work,
    // so clearing from here and clearing from the finder's "All Categories" agree
    filterBar.addEventListener('click', function(e){
      if(e.target.closest('#filterClear')){
        document.dispatchEvent(new CustomEvent('expertise:clear'));
      }
    });

    document.addEventListener('expertise:clear', function(){ apply(null); });

    document.addEventListener('expertise:change', function(e){
      apply(e.detail);
      // only pull the section into view if it is not already on screen
      var box = document.getElementById('explore').getBoundingClientRect();
      if(box.top > window.innerHeight * 0.9){
        document.getElementById('explore').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      }
    });

    /* ---------- Reflow ---------- */
    var reflow;
    window.addEventListener('resize', function(){
      clearTimeout(reflow);
      reflow = setTimeout(function(){
        placeIndicator();
        projList.querySelectorAll('.pcard').forEach(function(card){
          var d = card.querySelector('.pcard-desc');
          // an unfolded card's pixel cap would clip after a reflow — drop it
          if(d.dataset.open === '1') d.style.maxHeight = 'none';
          else syncCardClamp(card);
        });
      }, 150);
    });

    apply(null);
    if(document.fonts && document.fonts.ready){
      document.fonts.ready.then(function(){
        placeIndicator();
        syncAllClamps();
      });
    }
  }

  window.PortfolioData.load().then(initExplore);
