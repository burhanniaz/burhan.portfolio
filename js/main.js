(function(){
    var els = document.querySelectorAll('.reveal');
    if(!('IntersectionObserver' in window)){
      els.forEach(function(el){ el.classList.add('is-visible'); });
    } else {
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting){
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      els.forEach(function(el){ io.observe(el); });
    }

    // duplicate marquee content for seamless loop
    var track = document.getElementById('marqueeTrack');
    if(track){ track.innerHTML += track.innerHTML; }

    // manual light/dark theme toggle, remembered per browser
    var root = document.documentElement;
    var toggle = document.getElementById('themeToggle');
    function readStored(){ try{ return localStorage.getItem('mb-theme'); }catch(e){ return null; } }
    function writeStored(v){ try{ localStorage.setItem('mb-theme', v); }catch(e){} }
    var stored = readStored();
    if(stored === 'light' || stored === 'dark'){ root.setAttribute('data-theme', stored); }
    function isDarkNow(){
      var attr = root.getAttribute('data-theme');
      if(attr === 'dark') return true;
      if(attr === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    function syncToggle(){
      var dark = isDarkNow();
      if(toggle){
        toggle.classList.toggle('is-dark', dark);
        toggle.setAttribute('aria-pressed', String(dark));
      }
    }
    syncToggle();
    if(toggle){
      toggle.addEventListener('click', function(){
        var next = isDarkNow() ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        writeStored(next);
        syncToggle();
      });
    }

    // mobile nav menu
    var burger = document.getElementById('navBurger');
    var mobileNav = document.getElementById('navMobile');
    if(burger && mobileNav){
      function closeMenu(){
        mobileNav.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      }
      burger.addEventListener('click', function(){
        var open = mobileNav.classList.toggle('is-open');
        burger.setAttribute('aria-expanded', String(open));
      });
      mobileNav.querySelectorAll('a').forEach(function(a){
        a.addEventListener('click', closeMenu);
      });
      window.addEventListener('resize', function(){
        if(window.innerWidth > 640){ closeMenu(); }
      });
    }

    // subtle mouse parallax on hero chips
    var visual = document.querySelector('.hero-visual');
    var chips = document.querySelectorAll('.float-chip, .stat-chip');
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(visual && !reduceMotion && window.matchMedia('(hover: hover)').matches){
      visual.addEventListener('mousemove', function(e){
        var r = visual.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        chips.forEach(function(chip, i){
          var depth = 6 + (i % 3) * 4;
          chip.style.setProperty('--px', (x * depth) + 'px');
          chip.style.setProperty('--py', (y * depth) + 'px');
          chip.style.transform = 'translate(' + (x*depth) + 'px,' + (y*depth) + 'px)';
        });
      });
      visual.addEventListener('mouseleave', function(){
        chips.forEach(function(chip){ chip.style.transform = ''; });
      });
    }
  })();