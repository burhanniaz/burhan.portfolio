function initFinder(content){
    var search = document.getElementById('expertiseSearch');
    if(!search) return;

    var list     = document.getElementById('suggestList');
    var chipWrap = document.getElementById('quickChips');
    var card     = document.getElementById('resultCard');
    var badge    = document.getElementById('resultBadge');
    var viz      = document.getElementById('resultViz');
    var title    = document.getElementById('resultTitle');
    var desc     = document.getElementById('resultDesc');
    var tagWrap  = document.getElementById('resultTags');
    var count    = document.getElementById('resultCount');
    var goBtn    = document.getElementById('searchGo');

    /* ---------- Animated visuals, one per discipline ---------- */
    var VISUALS = {
      all: '<svg class="viz" viewBox="0 0 120 120">' +
        '<circle cx="60" cy="60" r="38" opacity=".3"/>' +
        '<g class="viz-spin">' +
          '<circle class="solid-alt" cx="60" cy="22" r="5"/>' +
          '<circle class="solid" cx="93" cy="41" r="5"/>' +
          '<circle class="solid-alt" cx="93" cy="79" r="5"/>' +
          '<circle class="solid" cx="60" cy="98" r="5"/>' +
          '<circle class="solid-alt" cx="27" cy="79" r="5"/>' +
          '<circle class="solid" cx="27" cy="41" r="5"/>' +
        '</g>' +
        '<circle class="viz-core solid" cx="60" cy="60" r="9"/>' +
      '</svg>',

      core: '<svg class="viz" viewBox="0 0 120 120">' +
        '<g class="viz-spin">' +
          '<ellipse cx="60" cy="60" rx="42" ry="17"/>' +
          '<ellipse cx="60" cy="60" rx="42" ry="17" transform="rotate(60 60 60)"/>' +
          '<ellipse class="alt" cx="60" cy="60" rx="42" ry="17" transform="rotate(120 60 60)"/>' +
        '</g>' +
        '<circle class="viz-core solid" cx="60" cy="60" r="10"/>' +
      '</svg>',

      flow: '<svg class="viz" viewBox="0 0 120 120">' +
        '<rect x="14" y="16" width="30" height="22" rx="5"/>' +
        '<rect class="alt" x="76" y="49" width="30" height="22" rx="5"/>' +
        '<rect x="14" y="82" width="30" height="22" rx="5"/>' +
        '<path d="M44 27h20v33h12"/>' +
        '<path d="M44 93h20V60h12"/>' +
        '<path class="viz-flow alt" d="M44 27h20v33h12"/>' +
        '<path class="viz-flow alt" d="M44 93h20V60h12"/>' +
      '</svg>',

      net: '<svg class="viz" viewBox="0 0 120 120">' +
        '<path d="M28 32 62 60 28 60 62 60 28 88 62 60 96 44M62 60 96 76"/>' +
        '<path class="viz-flow alt" d="M28 32 62 60 96 44"/>' +
        '<path class="viz-flow alt" d="M28 88 62 60 96 76"/>' +
        '<circle class="viz-blink solid" cx="28" cy="32" r="7"/>' +
        '<circle class="viz-blink solid" cx="28" cy="60" r="7"/>' +
        '<circle class="viz-blink solid" cx="28" cy="88" r="7"/>' +
        '<circle class="viz-blink solid-alt" cx="62" cy="60" r="8"/>' +
        '<circle class="solid-alt" cx="96" cy="44" r="6"/>' +
        '<circle class="solid-alt" cx="96" cy="76" r="6"/>' +
      '</svg>',

      browser: '<svg class="viz" viewBox="0 0 120 120">' +
        '<rect x="16" y="24" width="88" height="72" rx="8"/>' +
        '<path d="M16 42h88"/>' +
        '<circle class="solid" cx="28" cy="33" r="2.6"/>' +
        '<circle class="solid" cx="37" cy="33" r="2.6"/>' +
        '<path class="viz-slide alt" d="M30 58h44"/>' +
        '<path class="viz-slide alt" d="M30 71h58"/>' +
        '<path class="viz-slide alt" d="M30 84h32"/>' +
      '</svg>',

      chart: '<svg class="viz" viewBox="0 0 120 120">' +
        '<path d="M22 98h78"/>' +
        '<rect class="viz-bar solid" x="30" y="52" width="13" height="42" rx="3"/>' +
        '<rect class="viz-bar solid-alt" x="50" y="38" width="13" height="56" rx="3"/>' +
        '<rect class="viz-bar solid" x="70" y="60" width="13" height="34" rx="3"/>' +
        '<rect class="viz-bar solid-alt" x="90" y="30" width="13" height="64" rx="3"/>' +
        '<path class="viz-draw" d="M30 66 56 48 76 58 100 26"/>' +
      '</svg>',

      rag: '<svg class="viz" viewBox="0 0 120 120">' +
        '<path d="M38 20h30l16 16v58a6 6 0 0 1-6 6H38a6 6 0 0 1-6-6V26a6 6 0 0 1 6-6Z"/>' +
        '<path d="M67 20v18h17"/>' +
        '<path class="alt" d="M44 56h24M44 68h30M44 80h18"/>' +
        '<circle class="viz-ring alt" cx="60" cy="60" r="34"/>' +
        '<circle class="viz-ring alt" cx="60" cy="60" r="34"/>' +
        '<circle class="viz-ring alt" cx="60" cy="60" r="34"/>' +
      '</svg>',

      db: '<svg class="viz" viewBox="0 0 120 120">' +
        '<ellipse cx="60" cy="34" rx="30" ry="11"/>' +
        '<path d="M30 34v24c0 6 13.4 11 30 11s30-5 30-11V34"/>' +
        '<path d="M30 58v24c0 6 13.4 11 30 11s30-5 30-11V58"/>' +
        '<circle class="viz-drop solid-alt" cx="60" cy="60" r="4"/>' +
        '<circle class="viz-drop solid-alt" cx="46" cy="60" r="3"/>' +
        '<circle class="viz-drop solid-alt" cx="74" cy="60" r="3"/>' +
      '</svg>',

      code: '<svg class="viz" viewBox="0 0 120 120">' +
        '<path d="M40 40 20 60l20 20"/>' +
        '<path class="alt" d="M80 40l20 20-20 20"/>' +
        '<path class="viz-slide alt" d="M52 48h18"/>' +
        '<path class="viz-slide alt" d="M50 60h22"/>' +
        '<path class="viz-slide alt" d="M52 72h14"/>' +
        '<path class="viz-caret solid" d="M69 68h3v10h-3z"/>' +
      '</svg>'
    };

    /* The areas shown in the search bar (managed from /admin). */
    var DATA = content.categories;

    /* The reset option: shows every project, course and role below.
       Its null id is what tells the Explore section to stop filtering. */
    var ALL_ITEM = {
      id: null,
      name: 'All Categories',
      kind: 'Overview',
      viz: 'all',
      desc: 'Everything at once — every project, course, and role across all ' + DATA.length + ' areas, newest work first.',
      tags: ['Projects', 'Experience', 'Courses'],
      keys: ['all', 'everything', 'overview', 'all categories', 'show all', 'any']
    };

    /* ---------- Matching ---------- */
    function score(item, q){
      var name = item.name.toLowerCase();
      if(name === q) return 100;
      if(name.indexOf(q) === 0) return 90;
      if(name.indexOf(q) > -1) return 80;

      var i;
      for(i = 0; i < item.keys.length; i++){
        if(item.keys[i] === q) return 75;
        if(item.keys[i].indexOf(q) === 0) return 65;
      }
      for(i = 0; i < item.tags.length; i++){
        if(item.tags[i].toLowerCase().indexOf(q) > -1) return 55;
      }
      for(i = 0; i < item.keys.length; i++){
        if(item.keys[i].indexOf(q) > -1) return 45;
      }
      if(item.desc.toLowerCase().indexOf(q) > -1) return 25;
      return 0;
    }

    function match(q){
      q = q.trim().toLowerCase();
      if(!q) return DATA.slice();
      // "All Categories" is searchable too, and outranks a single area on an exact hit
      return [ALL_ITEM].concat(DATA)
        .map(function(item){ return { item: item, s: score(item, q) }; })
        .filter(function(r){ return r.s > 0; })
        .sort(function(a, b){ return b.s - a.s; })
        .map(function(r){ return r.item; });
    }

    /* ---------- Rendering ---------- */
    function escapeHtml(s){
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function highlight(name, q){
      q = q.trim().toLowerCase();
      var at = q ? name.toLowerCase().indexOf(q) : -1;
      if(at < 0) return escapeHtml(name);
      return escapeHtml(name.slice(0, at)) +
             '<mark>' + escapeHtml(name.slice(at, at + q.length)) + '</mark>' +
             escapeHtml(name.slice(at + q.length));
    }

    var current = null;

    function showResult(item, total, isSearching){
      if(!item){
        badge.textContent = 'No match';
        viz.innerHTML = '';
        title.textContent = 'Nothing found';
        desc.textContent = 'Try a broader term — a language, a tool, or the kind of problem you are solving.';
        tagWrap.innerHTML = '';
        count.textContent = '0 areas';
        current = null;
        return;
      }
      if(current === item.name) return;
      current = item.name;

      var isAll = item === ALL_ITEM;
      badge.textContent = isAll ? 'Overview' : (isSearching ? 'Best Match' : 'Featured');
      viz.innerHTML = VISUALS[item.viz] || '';
      title.textContent = item.name;
      desc.textContent = item.desc;
      tagWrap.innerHTML = item.tags.map(function(t){ return '<span>' + escapeHtml(t) + '</span>'; }).join('');
      count.textContent = isAll
        ? 'Showing all ' + DATA.length + ' areas'
        : (total === 1 ? '1 area matched' : total + ' areas matched');

      card.classList.remove('is-swapping');
      void card.offsetWidth;
      card.classList.add('is-swapping');
    }

    var activeIndex = -1;
    var results = [];

    function renderSuggestions(q){
      results = match(q);
      activeIndex = -1;

      if(!q.trim()){
        closeList();
        return;
      }

      if(!results.length){
        list.innerHTML = '<li class="suggest-empty">No expertise matches &ldquo;' + escapeHtml(q) + '&rdquo;</li>';
      } else {
        list.innerHTML = results.map(function(item, i){
          return '<li class="suggest-item" role="option" aria-selected="false" data-i="' + i + '">' +
                   '<span class="suggest-name">' + highlight(item.name, q) + '</span>' +
                   '<span class="suggest-kind">' + escapeHtml(item.kind) + '</span>' +
                 '</li>';
        }).join('');
      }

      list.classList.add('is-open');
      search.setAttribute('aria-expanded', 'true');
      showResult(results[0] || null, results.length, true);
      syncChips(results[0]);
    }

    function closeList(){
      list.classList.remove('is-open');
      list.innerHTML = '';
      search.setAttribute('aria-expanded', 'false');
      activeIndex = -1;
    }

    function setActive(i){
      var items = list.querySelectorAll('.suggest-item');
      if(!items.length) return;
      if(i < 0) i = items.length - 1;
      if(i >= items.length) i = 0;
      activeIndex = i;
      items.forEach(function(el, n){
        var on = n === i;
        el.classList.toggle('is-active', on);
        el.setAttribute('aria-selected', String(on));
      });
      showResult(results[i], results.length, true);
      syncChips(results[i]);
    }

    function pick(item){
      if(item === ALL_ITEM || item.id === null) return pickAll();
      search.value = item.name;
      closeList();
      results = [item];
      showResult(item, DATA.length, false);
      syncChips(item);
      // tells the Explore section below to narrow to this area
      document.dispatchEvent(new CustomEvent('expertise:change', { detail: item }));
    }

    // "All Categories" — drop the filter so everything shows below
    function pickAll(){
      search.value = '';
      closeList();
      results = DATA.slice();
      showResult(ALL_ITEM, DATA.length, false);
      syncChips(ALL_ITEM);
      document.dispatchEvent(new CustomEvent('expertise:clear'));
    }

    /* ---------- Quick-pick chips ---------- */
    function syncChips(item){
      var name = item ? item.name : null;
      chipWrap.querySelectorAll('.quick-chip').forEach(function(chip){
        chip.classList.toggle('is-active', chip.dataset.name === name);
      });
    }

    chipWrap.innerHTML = [ALL_ITEM].concat(DATA).map(function(item){
      return '<button class="quick-chip' + (item === ALL_ITEM ? ' is-all' : '') + '" type="button" ' +
               'data-name="' + escapeHtml(item.name) + '">' + escapeHtml(item.name) +
             '</button>';
    }).join('');

    chipWrap.addEventListener('click', function(e){
      var chip = e.target.closest('.quick-chip');
      if(!chip) return;
      var item = [ALL_ITEM].concat(DATA).filter(function(d){ return d.name === chip.dataset.name; })[0];
      if(item) pick(item);
    });

    /* ---------- Events ---------- */
    search.addEventListener('input', function(){ renderSuggestions(search.value); });

    search.addEventListener('focus', function(){
      if(search.value.trim()) renderSuggestions(search.value);
    });

    search.addEventListener('keydown', function(e){
      if(e.key === 'ArrowDown'){ e.preventDefault(); setActive(activeIndex + 1); }
      else if(e.key === 'ArrowUp'){ e.preventDefault(); setActive(activeIndex - 1); }
      else if(e.key === 'Enter'){
        e.preventDefault();
        var chosen = results[activeIndex > -1 ? activeIndex : 0];
        if(chosen) pick(chosen);
      }
      else if(e.key === 'Escape'){ closeList(); }
    });

    list.addEventListener('click', function(e){
      var row = e.target.closest('.suggest-item');
      if(!row) return;
      pick(results[Number(row.dataset.i)]);
    });

    goBtn.addEventListener('click', function(){
      var chosen = results[activeIndex > -1 ? activeIndex : 0];
      if(chosen) pick(chosen);
      search.focus();
    });

    document.addEventListener('click', function(e){
      if(!e.target.closest('.finder-search')) closeList();
    });

    // the Explore section's "clear filter" button resets the search too
    document.addEventListener('expertise:clear', function(){
      search.value = '';
      closeList();
      results = DATA.slice();
      showResult(ALL_ITEM, DATA.length, false);
      syncChips(ALL_ITEM);
    });

    /* ---------- Initial state: everything shown ---------- */
    showResult(ALL_ITEM, DATA.length, false);
    syncChips(ALL_ITEM);
  }

  window.PortfolioData.load().then(initFinder);
