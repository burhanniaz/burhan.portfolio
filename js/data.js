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
            review: p.review || null
          };
        }),
        experience: d.experience || [],
        courses:    d.courses    || []
      };
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

    return { load: load, normaliseMedia: normaliseMedia };
  })();
