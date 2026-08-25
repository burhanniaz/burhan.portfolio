/* ---------------------------------------------------------------
   Admin panel — CRUD for categories, sub-categories, projects,
   experience and courses, plus image/video uploads for projects.
   Every write goes through /api/admin/* and needs the session cookie.
   --------------------------------------------------------------- */
(function(){
    var loginView = document.getElementById('loginView');
    var appView   = document.getElementById('appView');
    var toastEl   = document.getElementById('toast');
    if(!loginView) return;

    var state = { content: null, tab: 'categories' };

    /* ---------- Helpers ---------- */
    function esc(s){
      return String(s == null ? '' : s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }

    var toastTimer;
    function toast(msg, isErr){
      toastEl.textContent = msg;
      toastEl.classList.toggle('err', !!isErr);
      toastEl.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function(){ toastEl.classList.remove('show'); }, isErr ? 4500 : 2200);
    }

    async function api(path, opts){
      opts = opts || {};
      var res = await fetch(path, {
        method: opts.method || 'GET',
        headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
        body: opts.body ? JSON.stringify(opts.body) : undefined
      });

      if(res.status === 401){ showLogin(); throw new Error('Session expired — sign in again.'); }

      var data = null;
      try{ data = await res.json(); }catch(e){ /* empty body is fine */ }
      if(!res.ok) throw new Error((data && data.error) || ('Request failed (' + res.status + ')'));
      return data;
    }

    function csv(v){ return (v || []).join(', '); }
    function parseCsv(s){
      return String(s || '').split(',').map(function(x){ return x.trim(); }).filter(Boolean);
    }

    /* ---------- Auth ---------- */
    function showLogin(){
      loginView.classList.remove('adm-hidden');
      appView.classList.add('adm-hidden');
    }
    function showApp(){
      loginView.classList.add('adm-hidden');
      appView.classList.remove('adm-hidden');
    }

    document.getElementById('loginForm').addEventListener('submit', async function(e){
      e.preventDefault();
      var btn = document.getElementById('loginBtn');
      var err = document.getElementById('loginErr');
      err.textContent = '';
      btn.disabled = true; btn.textContent = 'Checking…';
      try{
        await api('/api/auth', { method: 'POST', body: { password: document.getElementById('pw').value } });
        document.getElementById('pw').value = '';
        await boot();
      }catch(ex){
        err.textContent = ex.message;
      }finally{
        btn.disabled = false; btn.textContent = 'Sign in';
      }
    });

    document.getElementById('logoutBtn').addEventListener('click', async function(){
      try{ await api('/api/auth', { method: 'POST', body: { action: 'logout' } }); }catch(e){}
      showLogin();
    });

    /* ---------- Tabs ---------- */
    var TABS = [
      { id: 'categories',    label: 'Categories',     note: 'The areas listed in the search bar on the Expertise page.' },
      { id: 'subcategories', label: 'Sub-categories', note: 'Shown as pills inside Projects, grouped under each category.' },
      { id: 'projects',      label: 'Projects',       note: 'Images and video are uploaded per project.' },
      { id: 'experience',    label: 'Experience',     note: 'Roles shown on the Experience tab.' },
      { id: 'courses',       label: 'Courses',        note: 'Courses shown on the Courses tab.' }
    ];

    function countFor(id){
      var c = state.content;
      if(!c) return 0;
      if(id === 'subcategories') return (c.subcatRows || []).length;
      return (c[id] || []).length;
    }

    function renderTabs(){
      document.getElementById('admTabs').innerHTML = TABS.map(function(t){
        return '<button class="adm-tab' + (t.id === state.tab ? ' is-active' : '') + '" data-tab="' + t.id + '">' +
               esc(t.label) + '<span class="n">' + countFor(t.id) + '</span></button>';
      }).join('');
    }

    document.getElementById('admTabs').addEventListener('click', function(e){
      var b = e.target.closest('.adm-tab');
      if(!b) return;
      state.tab = b.dataset.tab;
      render();
    });

    /* ---------- List rendering ---------- */
    function catName(id){
      var c = (state.content.categories || []).find(function(x){ return x.id === id; });
      return c ? c.name : id;
    }

    var ROWS = {
      categories: function(c){
        return { id: c.id, title: c.name,
                 sub: c.id + ' · ' + (c.kind || '') + ' · ' + ((c.tags || []).join(', ') || 'no tags') };
      },
      subcategories: function(s){
        return { id: s.id, title: s.name, sub: 'in ' + catName(s.category_id) };
      },
      projects: function(p){
        var media = (p.media || []).length;
        return { id: p.id, title: p.title || p.name,
                 sub: (p.areas || []).map(catName).join(', ') + ' · ' + media + ' media' +
                      ((p.subs || []).length ? ' · ' + p.subs.join(', ') : '') };
      },
      experience: function(x){
        return { id: x.id, title: x.role, sub: x.date + ' · ' + x.org };
      },
      courses: function(c){
        return { id: c.id, title: c.name, sub: (c.org || '') + ' · ' + (c.year || '') + ' · ' + (c.status || '') };
      }
    };

    function items(){
      if(state.tab === 'subcategories') return state.content.subcatRows || [];
      return state.content[state.tab] || [];
    }

    function render(){
      renderTabs();
      var meta = TABS.find(function(t){ return t.id === state.tab; });
      document.getElementById('secTitle').textContent = meta.label;
      document.getElementById('secNote').textContent = meta.note;

      var list = items();
      var wrap = document.getElementById('admList');

      if(!list.length){
        wrap.innerHTML = '<div class="adm-empty glass">Nothing here yet — use <b>+ Add</b> to create the first one.</div>';
        return;
      }

      var row = ROWS[state.tab];
      wrap.innerHTML = list.map(function(item){
        var r = row(item);
        return '<div class="adm-row glass" data-id="' + esc(r.id) + '">' +
                 '<div class="adm-row-main">' +
                   '<div class="adm-row-title">' + esc(r.title) + '</div>' +
                   '<div class="adm-row-sub">' + esc(r.sub) + '</div>' +
                 '</div>' +
                 '<div class="adm-row-actions">' +
                   '<button class="adm-btn sm" data-act="edit">Edit</button>' +
                   '<button class="adm-btn sm danger" data-act="del">Delete</button>' +
                 '</div>' +
               '</div>';
      }).join('');
    }

    document.getElementById('admList').addEventListener('click', async function(e){
      var btn = e.target.closest('[data-act]');
      if(!btn) return;
      var id = btn.closest('.adm-row').dataset.id;
      var rec = items().find(function(x){ return String(x.id) === String(id); });

      if(btn.dataset.act === 'edit') return openForm(rec);

      var label = rec.name || rec.title || rec.role || id;
      var extra = state.tab === 'categories'
        ? '\n\nProjects, roles and courses tagged with it will lose that tag, and its sub-categories will be removed too.'
        : '';
      if(!confirm('Delete "' + label + '"?' + extra)) return;

      try{
        await api('/api/admin/' + state.tab + '/' + encodeURIComponent(id), { method: 'DELETE' });
        toast('Deleted');
        await reload();
      }catch(ex){ toast(ex.message, true); }
    });

    document.getElementById('addBtn').addEventListener('click', function(){ openForm(null); });

    /* ---------- Form ---------- */
    function checkList(name, options, selected, valueKey){
      selected = selected || [];
      return '<div class="adm-checks">' + options.map(function(o){
        var val = valueKey ? o[valueKey] : o;
        var lbl = o.name || o;
        var on = selected.indexOf(val) > -1;
        return '<label class="adm-check' + (on ? ' on' : '') + '">' +
                 '<input type="checkbox" name="' + name + '" value="' + esc(val) + '"' + (on ? ' checked' : '') + '>' +
                 esc(lbl) + '</label>';
      }).join('') + '</div>';
    }

    function field(label, inner, hint){
      return '<div class="adm-field"><label>' + esc(label) + '</label>' + inner +
             (hint ? '<div class="adm-hint">' + esc(hint) + '</div>' : '') + '</div>';
    }
    function input(name, value, type){
      return '<input type="' + (type || 'text') + '" name="' + name + '" value="' + esc(value) + '">';
    }
    function textarea(name, value){
      return '<textarea name="' + name + '">' + esc(value) + '</textarea>';
    }

    var VIZ = ['core','flow','net','browser','chart','rag','db','code','all'];

    function formHtml(rec){
      var c = state.content;
      var isNew = !rec;
      rec = rec || {};

      if(state.tab === 'categories'){
        return field('Name', input('name', rec.name || ''), isNew ? 'The id is generated from this and never changes afterwards.' : 'Id: ' + rec.id + ' (fixed — other records point at it)') +
               '<div class="adm-grid2">' +
                 field('Kind', '<select name="kind"><option' + (rec.kind === 'Speciality' ? '' : ' selected') + '>Core domain</option><option' + (rec.kind === 'Speciality' ? ' selected' : '') + '>Speciality</option></select>') +
                 field('Animation', '<select name="viz">' + VIZ.map(function(v){
                   return '<option' + (rec.viz === v ? ' selected' : '') + '>' + v + '</option>';
                 }).join('') + '</select>') +
               '</div>' +
               field('Description', textarea('desc', rec.desc || '')) +
               field('Tags', input('tags', csv(rec.tags)), 'Comma separated — shown on the result card.') +
               field('Search keywords', input('keys', csv(rec.keys)), 'Comma separated — extra terms that should match this area.');
      }

      if(state.tab === 'subcategories'){
        return field('Category', '<select name="category_id">' + (c.categories || []).map(function(x){
                 return '<option value="' + esc(x.id) + '"' + (rec.category_id === x.id ? ' selected' : '') + '>' + esc(x.name) + '</option>';
               }).join('') + '</select>') +
               field('Name', input('name', rec.name || ''), 'Projects are linked to this by name — renaming it updates them automatically.');
      }

      if(state.tab === 'projects'){
        var subOpts = allSubNames();
        var rev = rec.review || {};
        return '<div class="adm-grid2">' +
                 field('Short name', input('name', rec.name || ''), 'Used in compact lists.') +
                 field('Title', input('title', rec.title || '')) +
               '</div>' +
               field('Description', textarea('desc', rec.desc || ''), 'The first two lines show; the rest is behind "Show more".') +
               field('Categories', checkList('areas', c.categories || [], rec.areas, 'id')) +
               field('Sub-categories', checkList('subs', subOpts, rec.subs), 'Only those belonging to the categories you ticked will ever be shown.') +
               field('Tags', input('tags', csv(rec.tags))) +
               '<div class="adm-grid2">' +
                 field('Live URL', input('live', rec.live || '', 'url')) +
                 field('Code URL', input('code', rec.code || '', 'url')) +
               '</div>' +
               field('Media', mediaHtml(rec.media || [])) +
               '<div class="adm-grid2">' +
                 field('Review quote', textarea('rq', rev.quote || '')) +
                 '<div>' +
                   field('Reviewer', input('rn', rev.name || '')) +
                   field('Role', input('rr', rev.role || '')) +
                   field('Rating', '<select name="rt">' + [5,4,3,2,1].map(function(n){
                     return '<option value="' + n + '"' + (Number(rev.rating || 5) === n ? ' selected' : '') + '>' + n + ' / 5</option>';
                   }).join('') + '</select>') +
                 '</div>' +
               '</div>';
      }

      if(state.tab === 'experience'){
        return '<div class="adm-grid2">' +
                 field('Dates', input('date', rec.date || ''), 'e.g. 2024 — Present') +
                 field('Role', input('role', rec.role || '')) +
               '</div>' +
               field('Organisation', input('org', rec.org || '')) +
               field('Description', textarea('desc', rec.desc || '')) +
               field('Categories', checkList('areas', c.categories || [], rec.areas, 'id'));
      }

      // courses
      return '<div class="adm-grid2">' +
               field('Course name', input('name', rec.name || '')) +
               field('Provider', input('org', rec.org || '')) +
             '</div>' +
             '<div class="adm-grid2">' +
               field('Year', input('year', rec.year || '')) +
               field('Status', '<select name="status"><option' + (rec.status === 'In progress' ? '' : ' selected') + '>Completed</option><option' + (rec.status === 'In progress' ? ' selected' : '') + '>In progress</option></select>') +
             '</div>' +
             field('Description', textarea('desc', rec.desc || '')) +
             field('Tags', input('tags', csv(rec.tags))) +
             field('Categories', checkList('areas', c.categories || [], rec.areas, 'id'));
    }

    function allSubNames(){
      var seen = {}, out = [];
      (state.content.subcatRows || []).forEach(function(s){
        if(!seen[s.name]){ seen[s.name] = 1; out.push(s.name); }
      });
      return out;
    }

    /* ---------- Media manager ---------- */
    var draftMedia = [];

    var ICON = {
      image: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.6"/><path d="M4 17l5-4 3 2.5 3-2 5 4"/></svg>',
      video: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9.5l5 2.5-5 2.5z"/></svg>',
      placeholder: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 12h8"/></svg>'
    };

    function mediaHtml(media){
      draftMedia = (media || []).map(function(m){
        return { type: m.type || 'placeholder', url: m.url || m.src || '', poster: m.poster || '', alt: m.alt || '', label: m.label || '' };
      });
      return '<div class="media-list" id="mediaList"></div>' +
             '<div class="media-add">' +
               '<input type="file" id="mediaFile" accept="image/*,video/*" class="adm-hidden" multiple>' +
               '<button class="adm-btn sm primary" type="button" id="mediaUpload">Upload image / video</button>' +
               '<button class="adm-btn sm" type="button" id="mediaUrl">Add by URL</button>' +
               '<button class="adm-btn sm" type="button" id="mediaPh">Add placeholder</button>' +
             '</div>' +
             '<div class="media-progress adm-hidden" id="mediaProg"><span></span></div>';
    }

    function paintMedia(){
      var wrap = document.getElementById('mediaList');
      if(!wrap) return;

      if(!draftMedia.length){
        wrap.innerHTML = '<div class="adm-hint">No media yet. Uploads go to Vercel Blob; placeholders are drawn by the site.</div>';
        return;
      }

      wrap.innerHTML = draftMedia.map(function(m, i){
        var thumb = m.type === 'image' && m.url ? '<img src="' + esc(m.url) + '" alt="">'
                  : m.type === 'video' && m.url ? '<video src="' + esc(m.url) + '" muted playsinline></video>'
                  : (ICON[m.type] || ICON.placeholder);

        // each media kind gets the one extra field that actually applies to it
        var second =
          m.type === 'placeholder'
            ? '<input type="text" data-i="' + i + '" data-k="label" value="' + esc(m.label) + '" placeholder="Placeholder caption">'
          : m.type === 'video'
            ? '<input type="text" data-i="' + i + '" data-k="poster" value="' + esc(m.poster) + '" placeholder="Poster image URL (optional)">'
            : '<input type="text" data-i="' + i + '" data-k="alt" value="' + esc(m.alt) + '" placeholder="Alt text — describes the image">';

        return '<div class="media-item">' +
                 '<div class="media-thumb">' + thumb + '</div>' +
                 '<div class="media-meta">' +
                   '<div class="media-kind">' + esc(m.type) + '</div>' +
                   (m.url ? '<div class="media-url" title="' + esc(m.url) + '">' + esc(m.url) + '</div>' : '') +
                   second +
                 '</div>' +
                 '<div class="media-ops">' +
                   '<button class="adm-btn sm" type="button" data-m="up"   data-i="' + i + '" ' + (i === 0 ? 'disabled' : '') + '>&uarr;</button>' +
                   '<button class="adm-btn sm" type="button" data-m="down" data-i="' + i + '" ' + (i === draftMedia.length - 1 ? 'disabled' : '') + '>&darr;</button>' +
                   '<button class="adm-btn sm danger" type="button" data-m="del" data-i="' + i + '">&times;</button>' +
                 '</div>' +
               '</div>';
      }).join('');
    }

    function wireMedia(){
      var list = document.getElementById('mediaList');
      if(!list) return;
      paintMedia();

      list.addEventListener('click', function(e){
        var b = e.target.closest('[data-m]');
        if(!b) return;
        var i = Number(b.dataset.i);
        if(b.dataset.m === 'del') draftMedia.splice(i, 1);
        if(b.dataset.m === 'up' && i > 0) draftMedia.splice(i - 1, 0, draftMedia.splice(i, 1)[0]);
        if(b.dataset.m === 'down' && i < draftMedia.length - 1) draftMedia.splice(i + 1, 0, draftMedia.splice(i, 1)[0]);
        paintMedia();
      });

      list.addEventListener('input', function(e){
        var inp = e.target.closest('input[data-i]');
        if(!inp) return;
        draftMedia[Number(inp.dataset.i)][inp.dataset.k] = inp.value;   // no repaint: keeps focus
      });

      document.getElementById('mediaPh').addEventListener('click', function(){
        draftMedia.push({ type: 'placeholder', url: '', poster: '', alt: '', label: 'Screenshot' });
        paintMedia();
      });

      document.getElementById('mediaUrl').addEventListener('click', function(){
        var url = prompt('Paste the image or video URL:');
        if(!url) return;
        var isVid = /\.(mp4|webm|mov)(\?|$)/i.test(url);
        draftMedia.push({ type: isVid ? 'video' : 'image', url: url.trim(), poster: '', alt: '', label: '' });
        paintMedia();
      });

      var fileInput = document.getElementById('mediaFile');
      document.getElementById('mediaUpload').addEventListener('click', function(){ fileInput.click(); });

      fileInput.addEventListener('change', async function(){
        var files = Array.prototype.slice.call(fileInput.files || []);
        fileInput.value = '';
        if(!files.length) return;

        if(!window.blobUpload){
          toast('Upload library unavailable — use "Add by URL" instead.', true);
          return;
        }

        var prog = document.getElementById('mediaProg');
        var bar = prog.querySelector('span');
        prog.classList.remove('adm-hidden');

        try{
          for(var i = 0; i < files.length; i++){
            var f = files[i];
            bar.style.width = '0%';
            var blob = await window.blobUpload(f.name, f, {
              access: 'public',
              handleUploadUrl: '/api/upload',
              onUploadProgress: function(p){ bar.style.width = (p.percentage || 0) + '%'; }
            });
            draftMedia.push({
              type: f.type.startsWith('video/') ? 'video' : 'image',
              url: blob.url, poster: '', alt: '', label: ''
            });
            paintMedia();
          }
          toast(files.length + ' file' + (files.length > 1 ? 's' : '') + ' uploaded');
        }catch(ex){
          toast('Upload failed: ' + ex.message, true);
        }finally{
          prog.classList.add('adm-hidden');
          bar.style.width = '0%';
        }
      });
    }

    /* ---------- Modal ---------- */
    var modal = null;

    function openForm(rec){
      closeForm();
      var isNew = !rec;
      var meta = TABS.find(function(t){ return t.id === state.tab; });
      var singular = meta.label.replace(/ies$/, 'y').replace(/s$/, '');

      modal = document.createElement('div');
      modal.className = 'adm-modal';
      modal.innerHTML =
        '<form class="adm-modal-card" id="admForm">' +
          '<div class="adm-modal-head">' +
            '<h3>' + (isNew ? 'New ' : 'Edit ') + esc(singular.toLowerCase()) + '</h3>' +
            '<button class="adm-btn sm" type="button" id="closeForm">Close</button>' +
          '</div>' +
          formHtml(rec) +
          '<div class="adm-actions">' +
            '<button class="adm-btn" type="button" id="cancelForm">Cancel</button>' +
            '<button class="adm-btn primary" type="submit" id="saveForm">' + (isNew ? 'Create' : 'Save changes') + '</button>' +
          '</div>' +
        '</form>';
      document.body.appendChild(modal);

      // keep the checkbox pills visually in sync
      modal.addEventListener('change', function(e){
        var cb = e.target.closest('.adm-check input');
        if(cb) cb.closest('.adm-check').classList.toggle('on', cb.checked);
      });

      modal.addEventListener('click', function(e){ if(e.target === modal) closeForm(); });
      document.getElementById('closeForm').addEventListener('click', closeForm);
      document.getElementById('cancelForm').addEventListener('click', closeForm);
      if(state.tab === 'projects') wireMedia();

      document.getElementById('admForm').addEventListener('submit', function(e){
        e.preventDefault();
        save(rec);
      });
    }

    function closeForm(){
      if(modal){ modal.remove(); modal = null; }
    }

    document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeForm(); });

    function collect(form){
      var f = {};
      Array.prototype.forEach.call(form.elements, function(el){
        if(!el.name) return;
        if(el.type === 'checkbox'){
          if(el.checked) (f[el.name] = f[el.name] || []).push(el.value);
        } else {
          f[el.name] = el.value;
        }
      });
      return f;
    }

    async function save(rec){
      var form = document.getElementById('admForm');
      var btn = document.getElementById('saveForm');
      var f = collect(form);
      var body;

      if(state.tab === 'categories'){
        if(!f.name.trim()) return toast('Name is required', true);
        body = { name: f.name, kind: f.kind, viz: f.viz, desc: f.desc,
                 tags: parseCsv(f.tags), keys: parseCsv(f.keys) };
      } else if(state.tab === 'subcategories'){
        if(!f.name.trim()) return toast('Name is required', true);
        body = { category_id: f.category_id, name: f.name };
      } else if(state.tab === 'projects'){
        if(!f.name.trim()) return toast('Short name is required', true);
        body = {
          name: f.name, title: f.title || f.name, desc: f.desc,
          areas: f.areas || [], subs: f.subs || [], tags: parseCsv(f.tags),
          media: draftMedia.map(function(m){
            return m.type === 'placeholder'
              ? { type: 'placeholder', label: m.label || 'Media' }
              : { type: m.type, url: m.url, poster: m.poster || '', alt: m.alt || '' };
          }),
          live: f.live || '#', code: f.code || '#',
          review: f.rq && f.rq.trim()
            ? { quote: f.rq, name: f.rn || '', role: f.rr || '',
                initials: (f.rn || '?').split(/\s+/).map(function(w){ return w[0]; }).join('').slice(0,2).toUpperCase(),
                rating: Number(f.rt) || 5 }
            : null
        };
      } else if(state.tab === 'experience'){
        if(!f.role.trim()) return toast('Role is required', true);
        body = { date: f.date, role: f.role, org: f.org, desc: f.desc, areas: f.areas || [] };
      } else {
        if(!f.name.trim()) return toast('Course name is required', true);
        body = { name: f.name, org: f.org, year: f.year, status: f.status,
                 desc: f.desc, areas: f.areas || [], tags: parseCsv(f.tags) };
      }

      btn.disabled = true; btn.textContent = 'Saving…';
      try{
        if(rec) await api('/api/admin/' + state.tab + '/' + encodeURIComponent(rec.id), { method: 'PUT', body: body });
        else    await api('/api/admin/' + state.tab, { method: 'POST', body: body });
        closeForm();
        toast('Saved');
        await reload();
      }catch(ex){
        toast(ex.message, true);
        btn.disabled = false; btn.textContent = rec ? 'Save changes' : 'Create';
      }
    }

    /* ---------- Boot ---------- */
    async function reload(){
      state.content = await api('/api/admin/all');
      render();
    }

    async function boot(){
      try{
        await reload();
        showApp();
      }catch(ex){
        showLogin();
        if(!/sign in/i.test(ex.message)) document.getElementById('loginErr').textContent = ex.message;
      }
    }

    (async function start(){
      try{
        var s = await api('/api/auth');
        if(s && s.authed) return boot();
      }catch(e){ /* not signed in, or no API here */ }
      showLogin();
    })();
  })();
