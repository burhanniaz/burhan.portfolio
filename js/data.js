/* ---------------------------------------------------------------
   One loader shared by expertise.js and explore.js.

   Tries the live API first, then falls back to the same seed file the
   database is built from — so the site still renders when opened from
   a plain static server, or if the database is briefly unreachable.
   --------------------------------------------------------------- */
window.PortfolioData = (function(){
    var cache = null;

    function normalise(d){
      d = d || {};
      return {
        categories: d.categories || [],
        subcats:    d.subcats    || {},
        projects:   (d.projects || []).map(function(p){
          return {
            id: p.id, name: p.name, title: p.title || p.name, desc: p.desc || '',
            areas: p.areas || [], subs: p.subs || [], tags: p.tags || [],
            media: (p.media || []).map(normaliseMedia),
            live: p.live || '#', code: p.code || '#',
            review: normaliseReview(p.review)
          };
        }),
        experience: d.experience || [],
        courses:    d.courses    || []
      };
    }

    // `source` / `sourceUrl` say where a review came from (Fiverr, Upwork, …).
    // Both are optional: an older review without them simply renders no link.
    function normaliseReview(r){
      if(!r || !(r.quote || '').trim()) return null;
      var name = r.name || '';
      return {
        quote: r.quote,
        name: name,
        role: r.role || '',
        initials: r.initials || initialsOf(name),
        rating: Number(r.rating) || 5,
        source: r.source || '',
        sourceUrl: r.sourceUrl || r.source_url || ''
      };
    }

    function initialsOf(name){
      return (name || '?').split(/\s+/).filter(Boolean)
        .map(function(w){ return w[0]; }).join('').slice(0, 2).toUpperCase() || '?';
    }

    // every review across all projects, newest project first, for the home page
    function reviews(d){
      return (d.projects || []).filter(function(p){ return p.review; })
        .map(function(p){
          return { review: p.review, project: p.title || p.name, areas: p.areas || [] };
        });
    }

    // the admin stores uploads as `url`; the original seed used `src`
    function normaliseMedia(m){
      return {
        type:   m.type || 'placeholder',
        src:    m.url || m.src || '',
        poster: m.poster || '',
        alt:    m.alt || '',
        label:  m.label || ''
      };
    }

    function load(){
      if(cache) return cache;

      cache = fetch('/api/content', { headers: { Accept: 'application/json' } })
        .then(function(r){
          if(!r.ok) throw new Error('api ' + r.status);
          return r.json();
        })
        .catch(function(){
          // no API here (static preview, or the DB is down) — use the seed
          return fetch('data/seed.json').then(function(r){ return r.json(); });
        })
        .then(normalise)
        .catch(function(err){
          console.error('Could not load site content:', err);
          return normalise(null);
        });

      return cache;
    }

    return { load: load, normaliseMedia: normaliseMedia, reviews: reviews };
  })();
