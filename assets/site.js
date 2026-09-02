/* ═══════════════════════════════════════════════════════════════════════
   TIPMARKET — SITE BEHAVIOUR
   base.js already handles: nav / hamburger, [data-reveal], smooth
   scroll on in-page anchors. This file adds only what the home page
   composes on top: the hero surface, the brand switcher, the header rail,
   the live numerals and a reveal backstop.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var reduced = window.matchMedia &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Live numerals ─────────────────────────────────────────────────
     Every [data-tick] drifts around its base value on a slow, uneven
     beat, so the mocks read as a running operation instead of a
     screenshot. [data-mirror] renders the complementary outcome.       */
  function initTickers() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-tick]'));
    if (!nodes.length) return;

    var pairs = {};

    /* en-US is the page default; a node may still declare its own locale
       through data-locale when a mock needs a different one */
    function fmtInt(v, loc) {
      return Math.round(v).toLocaleString(loc || 'en-US');
    }

    function render(node, value) {
      var format = node.getAttribute('data-format');
      var suffix = node.getAttribute('data-suffix') || '';
      var prefix = node.getAttribute('data-prefix') || '';
      var text;
      if (format === 'int')        text = fmtInt(value, node.getAttribute('data-locale'));
      else if (format === 'cents') text = value.toFixed(2);
      else                         text = String(Math.round(value));
      node.textContent = prefix + text + suffix;

      /* Preço em centavos já é probabilidade: 0.45 é 45%. A escala vem
         do formato, senão a barra de um nó em centavos ficaria em 0%. */
      var pct = format === 'cents' ? value * 100 : value;

      var probId = node.getAttribute('data-prob');
      if (probId) {
        var bar = document.getElementById(probId);
        if (bar) bar.style.width = Math.round(pct) + '%';
      }

      /* a rosca dos cards Featured: mesmo contrato do data-prob, mas o
         alvo recebe a porcentagem numa custom property em vez de largura,
         porque o desenho dela é um conic-gradient e não uma barra. */
      var arcId = node.getAttribute('data-arc');
      if (arcId) {
        var arc = document.getElementById(arcId);
        if (arc) arc.style.setProperty('--p', Math.round(pct));
      }
    }

    var series = nodes.map(function (node) {
      var base   = parseFloat(node.getAttribute('data-tick'));
      var format = node.getAttribute('data-format');
      var step   = parseFloat(node.getAttribute('data-step')) ||
                   (format === 'cents' ? 0.02 : format === 'int' ? 4 : 2);
      var s = {
        node:   node,
        value:  base,
        base:   base,
        step:   step,
        format: format,
        upOnly: node.hasAttribute('data-up-only'),
        min:    format === 'cents' ? 0.03 : 2,
        max:    format === 'cents' ? 0.97 : 98
      };
      var pair = node.getAttribute('data-pair');
      if (pair) pairs[pair] = s;
      return s;
    });

    var mirrors = Array.prototype.slice.call(document.querySelectorAll('[data-mirror]'))
      .map(function (node) {
        var sib = node.parentNode &&
                  node.parentNode.querySelector('.tm-bin-fill');
        return { node: node, source: pairs[node.getAttribute('data-mirror')],
                 suffix: node.getAttribute('data-suffix') || '',
                 prefix: node.getAttribute('data-prefix') || '',
                 fill:   sib };
      })
      .filter(function (m) { return m.source; });

    function tick(s) {
      if (s.upOnly) {
        s.value += Math.round(Math.random() * s.step);
      } else if (s.format === 'int') {
        s.value += Math.round((Math.random() - 0.35) * s.step);
        if (s.value < s.base * 0.98) s.value = s.base * 0.98;
      } else {
        var delta = (Math.random() - 0.5) * 2 * s.step;
        s.value = Math.min(s.max, Math.max(s.min, s.value + delta));
        /* pulled gently back towards the base so it never wanders off */
        s.value += (s.base - s.value) * 0.12;
      }
      render(s.node, s.value);
    }

    function loop() {
      series.forEach(function (s) {
        /* uneven beat — each numeral moves on its own rhythm */
        if (Math.random() < 0.45) tick(s);
      });
      mirrors.forEach(function (m) {
        var v = m.source.format === 'cents' ? 1 - m.source.value : 100 - m.source.value;
        m.node.textContent = m.prefix +
          (m.source.format === 'cents' ? v.toFixed(2)
                                       : String(Math.round(v))) + m.suffix;
        if (m.fill) m.fill.style.width =
          Math.round(m.source.format === 'cents' ? v * 100 : v) + '%';
      });
    }

    if (reduced) return;
    setInterval(loop, 2200);
  }

  /* ── Header rail: position readout ─────────────────────────────────
     The rail reports where you are rather than just sitting there: the
     numeral of the section in view turns beam, and the hairline along
     the bottom edge tracks scroll depth through the page.            */
  function initTopbar() {
    var bar = document.querySelector('.tm-topbar');
    var progress = document.getElementById('tm-progress');
    var hero = document.getElementById('hero');
    /* apenas as ancoras: contact.html marca o proprio item com um <span
       class="tm-navlink is-active">, e varrer .tm-navlink inteiro apagaria
       essa marcacao no primeiro update() (nenhuma secao casa, active = -1). */
    var links = Array.prototype.slice.call(document.querySelectorAll('a.tm-navlink'));
    var targets = links.map(function (a) {
      return document.querySelector(a.getAttribute('href'));
    });
    if (!bar) return;

    var ticking = false;

    function update() {
      ticking = false;

      if (progress) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        var pct = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
        progress.style.width = (pct * 100).toFixed(2) + '%';
      }

      /* the rail's CTA lights up only once the hero's own CTA is gone */
      if (hero) {
        bar.classList.toggle('is-past-hero',
          hero.getBoundingClientRect().bottom <= 120);
      }

      /* the last section whose top has passed the rail wins */
      var active = -1;
      for (var i = 0; i < targets.length; i++) {
        if (targets[i] && targets[i].getBoundingClientRect().top <= 140) active = i;
      }
      links.forEach(function (a, i) { a.classList.toggle('is-active', i === active); });
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  /* ── O trilho arrastável (Quebras 2 e 5) ───────────────────────
     Duas seções mostram uma fileira de quatro cartões que, no telefone,
     viram um trilho arrastado de lado em vez de uma pilha. Uma função
     só serve as duas: o comportamento é idêntico e manter duas cópias
     garante que a segunda envelheça.

     O trilho em si é CSS — scroll-snap faz o transporte, e a fatia do
     cartão seguinte é a única afordância que um dedo precisa. Aqui
     ficam as duas coisas que o CSS não sabe dizer.

     Uma: um indicador de posição, para quatro cartões lerem como quatro
     em vez de como um número desconhecido atrás da borda. Ele é movido
     por um observer ancorado no trilho, não por conta em cima do
     scrollLeft: as larguras são porcentagens e o snap pousa em
     sub-pixel.

     Duas: um empurrão só, na primeira vez que o trilho entra em cena. A
     vontade de fazê-lo avançar sozinho acerta o problema — ninguém
     arrasta o que não sabe que arrasta — e erra o remédio: estes
     cartões são lidos, não olhados, e uma tira que se move debaixo de
     alguém no meio da frase é a razão de a WCAG 2.2.2 existir. Então
     ele anda uma vez, 30px, e volta. Isso ensina o gesto e sai da
     frente. Pulado se o leitor já tocou no trilho, ou pediu menos
     movimento.                                                        */
  function initSwipeRail(cfg) {
    var rail = document.getElementById(cfg.rail);
    var dots = document.getElementById(cfg.dots);
    if (!rail || !dots) return;

    var cards = Array.prototype.slice.call(rail.querySelectorAll(cfg.card));
    if (!cards.length) return;

    /* the track only scrolls on the phone, and a tab stop on a grid that
       does not scroll is a tab stop that does nothing */
    function syncAffordance() {
      var scrollable = rail.scrollWidth > rail.clientWidth + 4;
      if (scrollable) {
        rail.setAttribute('tabindex', '0');
        rail.setAttribute('role', 'group');
        rail.setAttribute('aria-label', cfg.label);
      } else {
        rail.removeAttribute('tabindex');
        rail.removeAttribute('role');
        rail.removeAttribute('aria-label');
      }
      return scrollable;
    }

    cards.forEach(function (card, i) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = cfg.dotClass;
      dot.setAttribute('aria-label', 'Slide ' + (i + 1) + ' of ' + cards.length);
      dot.setAttribute('aria-current', i === 0 ? 'true' : 'false');
      dot.addEventListener('click', function () {
        var delta = card.getBoundingClientRect().left - rail.getBoundingClientRect().left;
        rail.scrollTo({ left: rail.scrollLeft + delta - 24, behavior: 'smooth' });
      });
      dots.appendChild(dot);
    });
    var dotEls = Array.prototype.slice.call(dots.children);

    if (typeof IntersectionObserver !== 'undefined') {
      var track = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var at = cards.indexOf(e.target);
          dotEls.forEach(function (d, n) {
            d.setAttribute('aria-current', n === at ? 'true' : 'false');
          });
        });
      }, { root: rail, threshold: 0.6 });
      cards.forEach(function (c) { track.observe(c); });
    }

    var touched = false;
    ['pointerdown', 'touchstart', 'wheel', 'keydown'].forEach(function (ev) {
      rail.addEventListener(ev, function () { touched = true; },
                            { passive: true, once: true });
    });

    function nudge() {
      if (touched || reduced || rail.scrollLeft > 2) return;
      /* mandatory snap would fight a 30px move and yank it straight back,
         so the snap is lifted for the length of the hint only */
      rail.style.scrollSnapType = 'none';
      rail.scrollTo({ left: 30, behavior: 'smooth' });
      setTimeout(function () {
        rail.scrollTo({ left: 0, behavior: 'smooth' });
        setTimeout(function () { rail.style.scrollSnapType = ''; }, 420);
      }, 430);
    }

    syncAffordance();
    window.addEventListener('resize', syncAffordance);

    if (typeof IntersectionObserver !== 'undefined') {
      var hint = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          hint.unobserve(e.target);
          if (syncAffordance()) setTimeout(nudge, 420);
        });
      }, { threshold: 0.55 });
      hint.observe(rail);
    }
  }

  /* ── Entradas por scroll (Quebra 2) ───────────────────────────
     The three beats are all in CSS. The only thing that needs deciding
     here is when they start, and the section's own [data-reveal] is no
     help: it fires at the top of Quebra 2, four cards above this line,
     so the verdict would have finished animating long before anyone
     scrolled far enough to read it.

     Arming is done from here rather than in the stylesheet on purpose —
     see the note on .tm-close. A sentence that only appears if a script
     runs is a sentence that sometimes does not appear.                */
  function initEnterAnimations() {
    armOnEnter('tm-bo-stage', 0.25);
  }

  /* Arma o estado inicial e o solta quando o elemento entra em cena.
     A ordem importa: quem pinta o estado escondido é o JS, nunca o CSS,
     para que uma falha de script deixe a página completa em vez de
     deixar buracos. O palco usa limiar baixo (0.25) porque é alto —
     esperar 60% dele visível faria a animação começar tarde demais.  */
  function armOnEnter(id, threshold) {
    var el = document.getElementById(id);
    if (!el || reduced || typeof IntersectionObserver === 'undefined') return;

    el.classList.add('is-armed');
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        obs.unobserve(e.target);
        e.target.classList.remove('is-armed');
      });
    }, { threshold: threshold });
    obs.observe(el);
  }

  /* ── Reveal backstop ───────────────────────────────────────────────
     base.js runs initReveal() over [data-reveal]. This is idempotent
     insurance: if that script is blocked or slow, the page still reads
     rather than sitting at opacity:0.                                  */
  function initRevealBackstop() {
    var els = document.querySelectorAll('[data-reveal]');
    if (!els.length) return;
    function show(el) { el.classList.add('revealed'); }
    if (typeof IntersectionObserver !== 'undefined') {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { show(e.target); obs.unobserve(e.target); }
        });
      }, { threshold: 0.08 });
      Array.prototype.forEach.call(els, function (el) { obs.observe(el); });
    }
    setTimeout(function () { Array.prototype.forEach.call(els, show); }, 3000);
  }

  /* ── A simulação do widget (Quebra 4) ─────────────────────────
     A seção vende uma sequência, não um objeto: o leitor escolhe um
     lado, entra só com e-mail, recebe o código, tenta apostar, descobre
     que precisa depositar, deposita em cripto e vê a posição aberta.
     Sequência não cabe em foto, então o widget encena os oito passos.

     A linha do tempo é declarativa — cada passo diz que tela mostrar,
     onde pousar o cursor e o que fazer ao chegar. Isso mantém o roteiro
     legível e faz a edição ser mexer numa lista, não caçar setTimeout
     aninhado.

     Três cuidados que o resto da página também toma:

     Só roda quando está em cena, via IntersectionObserver, e para ao
     sair. Animação em segundo plano gasta bateria de quem nem está
     vendo.

     Tem pausa, abaixo do frame. É movimento automático acima de cinco
     segundos, e a WCAG 2.2.2 pede o controle — o mesmo motivo que o
     trilho de provas da Quebra 2 registra para não avançar sozinho.
     Com prefers-reduced-motion e a parada fora de cena, são as três
     defesas da peça.

     Em prefers-reduced-motion o laço não começa: congela no passo da
     posição aberta, que é o final feliz e o que a seção quer provar. */
  function initWidgetDemo() {
    var root = document.getElementById('tm-w');
    if (!root) return;

    var cursor  = document.getElementById('tm-w-cursor');
    var stage   = document.getElementById('tm-w-stage');

    /* abrir e recolher. O desfoque mora no palco, não no widget, porque
       quem borra é a matéria atrás. */
    function open()  { root.classList.remove('is-mini'); stage.classList.add('is-open'); }
    function close() { root.classList.add('is-mini');    stage.classList.remove('is-open'); }

    var outro = document.getElementById('tm-w-outro');
    function endCard(on) { if (outro) outro.classList.toggle('is-on', !!on); }
    var screens = {};
    Array.prototype.forEach.call(root.querySelectorAll('[data-screen]'), function (el) {
      screens[el.getAttribute('data-screen')] = el;
    });
    var tabs = Array.prototype.slice.call(root.querySelectorAll('.tm-w-tab'));

    var EMAIL = 'you@example.com';
    var CODE  = '482193';

    /* a tela que sai vai para a esquerda e a que entra vem da direita:
       o olho lê "avançou no fluxo" em vez de "trocou de div" */
    var leaving = null;
    function show(name) {
      var cur = root.querySelector('.tm-w-screen.is-on');
      if (cur && cur !== screens[name]) {
        cur.classList.remove('is-on');
        cur.classList.add('is-out');
        clearTimeout(leaving);
        (function (el) {
          leaving = setTimeout(function () { el.classList.remove('is-out'); }, 520);
        }(cur));
      }
      Object.keys(screens).forEach(function (k) {
        if (k === name) screens[k].classList.add('is-on');
        else if (screens[k] !== cur) screens[k].classList.remove('is-on');
      });
      /* as bolinhas são do carrossel de mercados; nas telas de fluxo
         elas não indicam nada e só poluem */
      root.classList.toggle('is-flow', name !== 'market');
    }
    /* n = quantos passos já foram vencidos (1..4) */
    var stepEls = Array.prototype.slice.call(
      root.querySelectorAll('#tm-w-steps span'));
    function step(n) {
      stepEls.forEach(function (el, i) {
        el.classList.toggle('is-done', i < n - 1);
        el.classList.toggle('is-on',   i === n - 1);
      });
    }
    function tab(name) {
      tabs.forEach(function (t) {
        t.classList.toggle('is-on', t.getAttribute('data-tab') === name);
      });
    }
    /* O cursor mira o centro do alvo, medido na hora: o widget tem três
       larguras e um pixel fixo só serviria para uma delas.

       A duração cresce com a distância — percurso curto é rápido, longo
       demora — que é o que separa uma mão de um teleporte. A curva passa
       um fio do alvo antes de assentar. */
    var cx = 0, cy = 0;
    function setPos(x, y) {
      var t = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
      cursor.style.setProperty('--tmw-pos', t);
      cursor.style.transform = t;
    }
    function moveTo(sel) {
      var el = sel && root.querySelector(sel);
      if (!el) { cursor.classList.remove('is-on'); return; }
      var r = el.getBoundingClientRect(), b = root.getBoundingClientRect();
      var x = r.left - b.left + r.width * 0.5;
      var y = r.top  - b.top  + r.height * 0.55;
      var d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
      cursor.style.transitionDuration =
        Math.min(760, Math.max(300, 250 + d * 1.45)) + 'ms';
      cursor.classList.add('is-on');
      setPos(x, y);
      cx = x; cy = y;
    }
    /* a onda nasce no ponto de contato e some — é o que faz o clique
       parecer um toque, e não uma troca de classe */
    function ripple() {
      var r = document.createElement('span');
      r.className = 'tm-w-ripple';
      r.style.transform = 'translate(' + Math.round(cx) + 'px,' + Math.round(cy) + 'px)';
      root.appendChild(r);
      setTimeout(function () { if (r.parentNode) r.parentNode.removeChild(r); }, 700);
    }
    function tap(sel) {
      var el = sel && root.querySelector(sel);
      ripple();
      cursor.classList.add('is-tap');
      if (el) el.classList.add('is-press');
      setTimeout(function () {
        cursor.classList.remove('is-tap');
        if (el) el.classList.remove('is-press');
      }, 190);
    }

    /* Digitação com variação por caractere e hesitação nos separadores.
       Intervalo fixo soa metrônomo, e era o detalhe que mais denunciava
       a simulação. */
    var typing = null;
    function type(sel, text, cps, done) {
      var host = root.querySelector(sel);
      var out  = host.querySelector('.tm-w-typed');
      host.classList.add('is-focus');
      out.textContent = '';
      var i = 0, base = 1000 / cps;
      clearTimeout(typing);
      (function step() {
        out.textContent = text.slice(0, ++i);
        if (i >= text.length) { if (done) done(); return; }
        var ch = text.charAt(i - 1);
        var d  = base * (0.6 + Math.random() * 0.85);
        if (ch === '@' || ch === '.' || ch === ' ' || ch === ',') d *= 2.2;
        typing = setTimeout(step, d);
      }());
    }
    function fillCode(done) {
      var cells = root.querySelectorAll('#tm-w-code i');
      Array.prototype.forEach.call(cells, function (c) {
        c.textContent = ''; c.classList.remove('is-in');
      });
      var i = 0;
      clearTimeout(typing);
      (function step() {
        cells[i].textContent = CODE.charAt(i);
        cells[i].classList.add('is-in');
        if (++i >= cells.length) { if (done) done(); return; }
        typing = setTimeout(step, 105 + Math.random() * 90);
      }());
    }

    function reset() {
      clearTimeout(typing);
      endCard(false);
      close();
      show('market'); tab('markets'); step(1);
      cursor.classList.remove('is-on');
      root.querySelector('#tm-w-yes').classList.remove('is-picked');
      root.querySelector('#tm-w-email .tm-w-typed').textContent = '';
      root.querySelector('#tm-w-amount .tm-w-typed').textContent = '';
      var q = root.querySelector('#tm-w-q25');
      if (q) q.classList.remove('is-on');
      root.querySelector('#tm-w-amount .tm-w-typed').textContent = '0.00';
      root.querySelector('#tm-w-fee').classList.remove('is-in');
      var bt = root.querySelector('#tm-w-confirm');
      bt.classList.add('is-off'); bt.textContent = 'Choose an amount';
      var bal = root.querySelector('#tm-w-bal');
      bal.textContent = '$0.00'; bal.classList.remove('is-funded');
      cx = 0; cy = 0; setPos(0, 0);
      Array.prototype.forEach.call(root.querySelectorAll('.tm-w-ripple'), function (r) {
        if (r.parentNode) r.parentNode.removeChild(r);
      });
      var st = root.querySelector('#tm-w-status');
      st.textContent = 'Waiting for the network…'; st.classList.remove('is-ok');
      Array.prototype.forEach.call(root.querySelectorAll('.is-focus'), function (e) {
        e.classList.remove('is-focus');
      });
    }

    /* ── o roteiro ───────────────────────────────────────────── */
    var script = [
      { at: 600,   run: function () { moveTo('#tm-w-head'); } },
      { at: 1200,  run: function () { tap('#tm-w-head'); open(); } },
      { at: 2000,  run: function () { moveTo('#tm-w-yes'); } },
      { at: 2500,  run: function () {
          tap('#tm-w-yes');
          root.querySelector('#tm-w-yes').classList.add('is-picked'); } },
      { at: 3000,  run: function () { show('email'); step(2); moveTo('#tm-w-email'); } },
      { at: 3400,  run: function () { type('#tm-w-email', EMAIL, 30); } },
      { at: 4500,  run: function () { moveTo('#tm-w-send'); } },
      { at: 5000,  run: function () { tap('#tm-w-send'); } },
      { at: 5400,  run: function () { show('code'); moveTo('#tm-w-code'); } },
      { at: 5800,  run: function () { fillCode(); } },
      { at: 6900,  run: function () { moveTo('#tm-w-enter'); } },
      { at: 7400,  run: function () { tap('#tm-w-enter'); } },
      { at: 7800,  run: function () { show('amount'); } },
      { at: 8200,  run: function () { moveTo('#tm-w-q25'); } },
      { at: 8700,  run: function () {
          tap('#tm-w-q25');
          root.querySelector('#tm-w-q25').classList.add('is-on');
          root.querySelector('#tm-w-amount .tm-w-typed').textContent = '25.00';
          root.querySelector('#tm-w-fee').classList.add('is-in');
          var bt = root.querySelector('#tm-w-confirm');
          bt.classList.remove('is-off');
          bt.textContent = 'Buy Yes · $25.00'; } },
      { at: 9400,  run: function () { moveTo('#tm-w-confirm'); } },
      { at: 9900,  run: function () { tap('#tm-w-confirm'); } },
      { at: 10300, run: function () { show('fund'); step(3); moveTo('#tm-w-deposit'); } },
      { at: 11400, run: function () { tap('#tm-w-deposit'); } },
      { at: 11800, run: function () { show('deposit'); } },
      { at: 12400, run: function () { moveTo('.tm-w-addr'); } },
      { at: 12900, run: function () { tap('.tm-w-addr'); } },
      { at: 13300, run: function () { moveTo(null); } },
      { at: 14000, run: function () {
          var st = root.querySelector('#tm-w-status');
          st.textContent = 'Deposit confirmed · $50.00';
          st.classList.add('is-ok');
          var bal = root.querySelector('#tm-w-bal');
          bal.textContent = '$50.00'; bal.classList.add('is-funded'); } },
      { at: 15000, run: function () { show('done'); step(4); } },
      { at: 16400, run: function () { show('positions'); tab('positions'); } },
      /* o fecho respira: a posição aberta fica mais um tempo em cena,
         o cartão monta devagar (ver .tm-w-outro no CSS) e só então a
         peça recolhe. O resto do roteiro corre porque está provando
         rapidez; esta parte é a única que pede leitura. */
      { at: 19800, run: function () { endCard(true); } },
      { at: 25600, run: function () { endCard(false); close(); } },
      { at: 26800, run: function () { reset(); } }
    ];

    /* O relógio do laço é guardado para que a pausa devolva de onde
       parou. Reiniciar do começo tornaria o controle inútil para o que
       ele existe: examinar um passo lá no meio sem ter de esperar o
       ciclo inteiro de novo.

       Sair de cena é diferente de pausar — ali o ponto é zerado, porque
       quem volta a rolar até o widget quer ver a história do início. */
    var timers = [], playing = false, startAt = 0, offset = 0;

    function play() {
      if (playing) return;
      playing = true;
      if (!offset) reset();
      startAt = Date.now() - offset;
      script.forEach(function (s) {
        if (s.at < offset) return;
        timers.push(setTimeout(function () {
          s.run();
          if (s.at === 26800) { playing = false; offset = 0; play(); }
        }, s.at - offset));
      });
    }
    function stop(keep) {
      if (playing && keep) offset = Date.now() - startAt;
      else if (!keep) offset = 0;
      playing = false;
      timers.forEach(clearTimeout);
      timers = [];
      clearTimeout(typing);
    }

    /* ── pausa ───────────────────────────────────────────────── */
    var ctl = document.getElementById('tm-w-ctl');
    var paused = false;
    if (ctl) {
      ctl.addEventListener('click', function () {
        paused = !paused;
        ctl.classList.toggle('is-paused', paused);
        ctl.querySelector('span').textContent = paused ? 'Resume' : 'Pause';
        ctl.setAttribute('aria-label',
          paused ? 'Resume the simulation' : 'Pause the simulation');
        if (paused) stop(true); else play();
      });
    }

    /* quem pediu menos movimento recebe o final, não o filme */
    if (reduced) {
      open(); show('positions'); tab('positions'); step(4); endCard(true);
      if (ctl) ctl.style.display = 'none';
      return;
    }

    /* só roda em cena: laço em segundo plano gasta bateria de quem nem
       está olhando */
    if (typeof IntersectionObserver === 'undefined') { play(); return; }
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !paused) play();
        else if (!e.isIntersecting) stop();
      });
    }, { threshold: 0.35 }).observe(root);
  }

  /* ── O formulário de interesse (contact.html) ────────────────
     A página inteira existe para este envio, então o script cuida de
     três coisas e só dessas três.

     Validação em português, no lugar da nativa. O novalidate no
     formulário não dispensa validação — ele impede que ela venha em
     balão do navegador, no idioma do sistema operacional, um campo por
     vez e sumindo sozinha. Aqui a mensagem fica ao lado do campo, todos
     os erros aparecem juntos e o foco vai para o primeiro.

     Reclamar tarde e perdoar cedo. Antes do primeiro envio o campo não
     é cobrado: ninguém gosta de ver "e-mail inválido" no meio da terceira
     letra. Depois que ele já errou uma vez, o erro sai assim que o valor
     fica bom, sem esperar o próximo envio.

     Entrega. Com data-endpoint preenchido, POST em JSON. Sem ele — que
     é o caso de um site estático — cai no mailto, que é o único caminho
     que de fato faz o lead chegar em alguém. Fingir sucesso e descartar
     seria a pior das opções, e é a fácil.                             */
  function initLeadForm() {
    var wrap = document.getElementById('tm-lead');
    var form = document.getElementById('tm-lead-form');
    if (!wrap || !form) return;

    var submit = document.getElementById('tm-lead-submit');
    var label  = submit.querySelector('[data-label]');
    var status = document.getElementById('tm-lead-status');
    var shell  = document.getElementById('tm-lead-shell');
    var okCard = document.getElementById('tm-lead-ok');
    var okMail = document.getElementById('tm-lead-ok-mail');
    var hp     = form.querySelector('[name="site_url"]');
    var company = form.elements['company'];
    var FALLBACK_MAIL = form.getAttribute('data-mailto') || 'comercial@tipmarket.com';

    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    /* Cada regra devolve a mensagem do erro ou nada. O primeiro campo da
       lista que falhar é também o que recebe o foco, então a ordem aqui
       é a ordem visual de propósito. */
    var RULES = [
      { name: 'name', check: function (v) {
          if (!v) return 'Tell us what to call you.';
          if (v.length < 2) return 'That name is too short.';
        } },
      { name: 'email', check: function (v) {
          if (!v) return 'We need an email to reply to.';
          if (!EMAIL_RE.test(v)) return 'That email looks incomplete.';
        } },
      { name: 'company', check: function (v) {
          /* afiliado e curioso não são cobrados: ver INTENTS */
          if (!company.required) return;
          if (!v) return 'Which company are you with?';
        } },
      { name: 'phone', check: function (v) {
          if (!v) return;
          if (v.replace(/\D/g, '').length < 8) return 'That phone number is incomplete.';
        } },
      { name: 'interest', check: function (v) {
          if (!v) return 'Pick one of the options.';
        } }
    ];

    function fieldOf(name) { return form.querySelector('[data-field="' + name + '"]'); }

    function valueOf(name) {
      if (name === 'interest') {
        var on = form.querySelector('[name="interest"]:checked');
        return on ? on.value : '';
      }
      var el = form.elements[name];
      return el ? el.value.trim() : '';
    }

    /* O aria-invalid vai nos controles, não no bloco: quem lê a tela
       precisa ouvir "inválido" ao pousar no campo, e aí a descrição já
       apontada por aria-describedby traz o porquê. */
    function mark(name, message) {
      var box = fieldOf(name);
      if (!box) return;
      var err = box.querySelector('.tm-field-err');
      box.classList.toggle('is-invalid', !!message);
      if (err) err.textContent = message || '';
      Array.prototype.forEach.call(box.querySelectorAll('input, textarea'), function (el) {
        if (message) el.setAttribute('aria-invalid', 'true');
        else el.removeAttribute('aria-invalid');
        if (el.classList.contains('field-input')) el.classList.toggle('field-error', !!message);
      });
    }

    function validate(only) {
      var failed = [];
      RULES.forEach(function (rule) {
        if (only && rule.name !== only) return;
        var message = rule.check(valueOf(rule.name));
        mark(rule.name, message);
        if (message) failed.push(rule.name);
      });
      return failed;
    }

    /* perdoar cedo: revalida só o campo que já está marcado */
    form.addEventListener('input', function (e) {
      var box = e.target.closest ? e.target.closest('.tm-field') : null;
      if (box && box.classList.contains('is-invalid')) validate(box.getAttribute('data-field'));
    });

    /* a escolha de produto: o rádio nativo continua fazendo o trabalho,
       a classe só pinta o cartão que o envolve */
    var opts = Array.prototype.slice.call(form.querySelectorAll('.tm-choice-opt'));

    /* ── a página fala do produto que a pessoa escolheu ──────────────
       Os três produtos caem em conversas diferentes, e até aqui a página
       falava só do white-label: quem vinha pelos afiliados lia "which
       markets you open" e um pedido de empresa que não tem. Agora a
       escolha reescreve o título, a lede, o rótulo do submit e a coluna
       da direita — e a empresa deixa de ser cobrada de quem não precisa.

       O texto com ênfase vai por innerHTML de propósito: as frases são
       literais deste arquivo, nunca valor digitado. Valor de campo
       continua saindo só por textContent, como no `done()`.          */
    var INTENTS = {
      whitelabel: {
        value: 'White-label platform',
        h1: 'Let’s put your market live.',
        sub: 'The infrastructure is ready. The rest is your call: <span class="text-ink font-medium">which markets you open, how they look, and when you go live.</span>',
        cta: 'Book my walkthrough',
        companyLabel: 'Company', companyPh: 'Your company', companyOptional: false,
        cover: ['Which markets make sense for your audience',
                'Payments, KYC and compliance in your country',
                'Liquidity, risk management and what the BackOffice delivers',
                'A real go-live timeline, and what comes after'],
        next: 'We set up a call to understand your audience and show how the operation looks end to end, <span class="text-ink font-medium">from the first live market to the first withdrawal.</span>',
        techBadge: 'For technical teams',
        tech: 'If you’d rather start from the API documentation and the integration scope, say so in your message. <span class="tm-em">We’ll bring the right engineers to the call.</span>'
      },
      widget: {
        value: 'Widget for my site',
        h1: 'Let’s put markets inside your stories.',
        sub: 'One line of code, zero changes to your CMS. The rest is your call: <span class="text-ink font-medium">which stories get a market, and how it looks in your pages.</span>',
        cta: 'Book my walkthrough',
        companyLabel: 'Company', companyPh: 'Your company or publication', companyOptional: false,
        cover: ['How the widget picks the market for each story',
                'Your brand: logo, color and language',
                'What the fast markets add to session time',
                'A real go-live timeline, and what comes after'],
        next: 'We set up a call to look at your site together and show the widget running on content like yours, <span class="text-ink font-medium">installed with one line of code.</span>',
        techBadge: 'For technical teams',
        tech: 'If you’d rather start from the API documentation and the integration scope, say so in your message. <span class="tm-em">We’ll bring the right engineers to the call.</span>'
      },
      affiliate: {
        value: 'Affiliate program',
        h1: 'Let’s get you earning.',
        sub: 'No integration and no code. You share your link. When your audience trades, <span class="text-ink font-medium">you get paid.</span>',
        cta: 'Apply as an affiliate',
        companyLabel: 'Company or channel', companyPh: 'Your company, site or channel', companyOptional: true,
        cover: ['How your link and tracking work',
                'Payouts: up to 40% revenue share, plus CPA per referral',
                'What counts as a qualified referral',
                'The content formats that convert best'],
        next: 'We review your audience and your channels, set up your link and your dashboard, and walk you through <span class="text-ink font-medium">how and when you get paid.</span>',
        techBadge: 'No code needed',
        tech: 'You share a link. <span class="tm-em">We track everything behind it.</span> No integration, no code, nothing to install.'
      },
      evaluating: {
        value: 'Just exploring for now',
        h1: 'Let’s find your way in.',
        sub: 'Not sure which of the three products fits? Tell us what you have today. <span class="text-ink font-medium">We’ll show you the shortest path to a live market.</span>',
        cta: 'Talk to a specialist',
        companyLabel: 'Company', companyPh: 'Your company', companyOptional: true,
        cover: ['The three ways in: white-label, widget and affiliates',
                'What each one asks of you, and what it pays',
                'Real examples for an audience like yours',
                'A real go-live timeline, and what comes after'],
        next: 'We set up a short call, map what you already have, and recommend <span class="text-ink font-medium">the product that gets you live fastest.</span>',
        techBadge: 'For technical teams',
        tech: 'If you’d rather start from the API documentation and the integration scope, say so in your message. <span class="tm-em">We’ll bring the right engineers to the call.</span>'
      }
    };
    /* O mapa da URL é fechado de propósito: o valor que vem de fora nunca
       vira conteúdo, só escolhe entre intenções já escritas aqui. */
    var ALIAS = {
      affiliate: 'affiliate', affiliates: 'affiliate',
      widget: 'widget',
      platform: 'whitelabel', whitelabel: 'whitelabel', b2b: 'whitelabel', operator: 'whitelabel',
      evaluating: 'evaluating', exploring: 'evaluating'
    };

    var current = 'whitelabel';
    var el = {
      hd:        document.getElementById('tm-lead-hd'),
      sub:       document.getElementById('tm-lead-sub'),
      compLabel: document.getElementById('tm-lead-company-label'),
      compReq:   document.getElementById('tm-lead-company-req'),
      compOpt:   document.getElementById('tm-lead-company-opt'),
      next:      document.getElementById('tm-lead-next'),
      cover:     document.getElementById('tm-lead-cover'),
      techBadge: document.querySelector('#tm-lead-tech .tm-aside-badge'),
      techBody:  document.getElementById('tm-lead-tech-body')
    };

    function apply(key) {
      var it = INTENTS[key] || INTENTS.whitelabel;
      current = INTENTS[key] ? key : 'whitelabel';

      if (el.hd)  el.hd.textContent = it.h1;
      if (el.sub) el.sub.innerHTML = it.sub;
      if (label && !submit.disabled) label.textContent = it.cta;

      if (el.compLabel) el.compLabel.textContent = it.companyLabel;
      if (el.compReq)   el.compReq.hidden = it.companyOptional;
      if (el.compOpt)   el.compOpt.hidden = !it.companyOptional;
      if (company) {
        company.required = !it.companyOptional;
        company.placeholder = it.companyPh;
      }
      /* trocar de intenção não pode deixar para trás um erro que já não
         se aplica — quem virou afiliado não deve nada no campo empresa */
      var compBox = fieldOf('company');
      if (compBox && compBox.classList.contains('is-invalid')) validate('company');

      if (el.next) el.next.innerHTML = it.next;
      if (el.cover) {
        el.cover.innerHTML = '';
        it.cover.forEach(function (t) {
          var li = document.createElement('li');
          li.textContent = t;
          el.cover.appendChild(li);
        });
      }
      if (el.techBadge) el.techBadge.textContent = it.techBadge;
      if (el.techBody)  el.techBody.innerHTML = it.tech;
    }

    function keyOf(value) {
      for (var k in INTENTS) { if (INTENTS[k].value === value) return k; }
      return null;
    }

    /* Quem chega de contact.html?i=affiliate já vem dizendo o que quer —
       obrigar a repetir a escolha é cobrar duas vezes pela mesma
       informação. Sem ?i=, entra o white-label: é o produto principal, e
       é o que a página já está dizendo no título e na coluna da direita.
       Deixar o grupo em branco com o texto todo falando de white-label
       era a página perguntando algo que ela mesma já tinha respondido. */
    function select(key) {
      var wanted = INTENTS[key].value;
      opts.forEach(function (o) {
        var r = o.querySelector('input');
        if (!r) return;
        var on = r.value === wanted;
        r.checked = on;
        o.classList.toggle('is-on', on);
      });
      apply(key);
    }
    (function () {
      var m = /[?&]i=([a-z]+)/.exec(window.location.search);
      select((m && ALIAS[m[1]]) || 'whitelabel');
    }());

    form.addEventListener('change', function (e) {
      if (e.target.name !== 'interest') return;
      opts.forEach(function (o) { o.classList.toggle('is-on', o.contains(e.target)); });
      validate('interest');
      var key = keyOf(e.target.value);
      if (key) apply(key);
    });

    function say(message) {
      status.textContent = message || '';
      status.classList.toggle('is-on', !!message);
    }

    function busy(on) {
      submit.disabled = on;
      label.textContent = on ? 'Sending…' : INTENTS[current].cta;
    }

    function payload() {
      var data = { source: 'contact.html' };
      RULES.forEach(function (r) { data[r.name] = valueOf(r.name); });
      data.message = valueOf('message');
      return data;
    }

    /* A frase inteira mora no HTML; daqui sai só o e-mail, por
       textContent — valor de campo nunca vira marcação. Devolvê-lo prova
       que o envio levou o que a pessoa escreveu e deixa o erro de
       digitação aparecer agora, e não depois de uma semana de silêncio.

       O is-sent vai também na grade: a coluna do "o que esperar" existia
       para convencer alguém a preencher, e nesse ponto já não tem
       ninguém para convencer. Ela sai e a confirmação fica sozinha. */
    function done(email) {
      if (okMail && email) okMail.textContent = email;
      wrap.classList.add('is-sent');
      if (shell) shell.classList.add('is-sent');
      okCard.focus();
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      say('');

      /* robô preencheu a armadilha: nada a fazer, e nada a contar */
      if (hp && hp.value) { done(valueOf('email')); return; }

      var failed = validate();
      if (failed.length) {
        var first = fieldOf(failed[0]);
        var el = first && first.querySelector('input, textarea');
        if (el) el.focus();
        say(failed.length === 1
              ? 'One field above still needs you.'
              : failed.length + ' fields above still need you.');
        return;
      }

      var data = payload();
      var endpoint = (form.getAttribute('data-endpoint') || '').trim();

      /* Sem endpoint o lead não sai do navegador. A tela de confirmação
         aparece assim mesmo, para a página poder ser revisada de ponta a
         ponta, e o aviso vai para o console — é o único lugar onde ele
         não atrapalha o visitante e ainda assim encontra quem for ligar
         o back-end. */
      if (!endpoint) {
        if (window.console && console.warn) {
          console.warn('[tipmarket] #tm-lead-form has no data-endpoint: ' +
                       'the lead was not sent anywhere.');
        }
        done(data.email);
        return;
      }

      busy(true);
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        busy(false);
        done(data.email);
      }).catch(function () {
        busy(false);
        say('We could not send that just now. Try again, or write to ' + FALLBACK_MAIL + '.');
      });
    });
  }

  /* ── Boot ──────────────────────────────────────────────────────────
     base.js binds the hamburger from a Promise chain, so it may land
     after this file. Nothing here depends on it.                       */
  /* ── A logo se montando (Quebra 7) ───────────────────────────────────
     Um rastro de luz, não uma nuvem. As partículas não voam cada uma por
     si: elas percorrem UM caminho comum — uma senoide que entra pelo alto
     da direita e cruza a seção inteira — separadas por um atraso ao longo
     dele. É isso que faz a fita ler como fita, com cabeça, corpo e cauda.

     A ordem conta a história:
       · a fita cruza o nome e o REVELA ao passar — o wordmark não é feito
         de partícula, ele acende sob a passagem;
       · na ponta esquerda o caminho deixa de ser onda e vira espiral, que
         se aperta até o raio do contorno do ícone;
       · as partículas que têm alvo assentam nesse contorno, o resto segue
         em frente e se apaga;
       · o gráfico acende dentro do ícone, com o nó em brasa, e a logo
         real assume.

     O brilho vem de composite 'lighter': onde a fita se dobra sobre si
     mesma as partículas somam e estouram em bloom, que é o que dá o ar
     de luz em vez de pontinho fosco.

     Os alvos saem de um rasterizado do ícone redesenhado neste canvas e
     medido sobre a caixa real do elemento. Nada toca arquivo externo:
     carregar o .svg como <img> sujaria o canvas e getImageData passaria a
     lançar sob file://.

     O estado escrito no HTML é o de repouso. Quem apaga a logo para
     montá-la é este código — sem JS, ou sob prefers-reduced-motion, ela
     simplesmente já está lá.                                          */
  function initLogoAssembly() {
    var host = document.getElementById('tm-logo-anim');
    var canvas = document.getElementById('tm-logo-particles');
    if (!host || !canvas || !canvas.getContext || reduced) return;
    var ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    var markWrap = host.querySelector('span');
    var markEl = host.querySelector('svg');
    var wordEl = host.querySelector('img');
    if (!markWrap || !markEl || !wordEl) return;

    var TAU = 6.283185307179586;

    /* ── linha do tempo (ms) — é aqui que se calibra o ritmo ──────── */
    var T_GHOST = 420;    /* o ícone fantasma sozinho em cena          */
    var T_TRAVEL = 5200;  /* a fita cruzando a seção                   */
    var T_WORD = 0;    /* não usado: o nome agora é revelado pela passagem */    /* o nome acende sob a passagem da fita      */
    var T_COIL = 3120;    /* o laço começa a fechar no ícone           */
    var T_LAND = 4180;    /* partículas assentadas no contorno         */
    var T_SPARK = 4330;   /* o gráfico acende                          */
    var T_MARK = 4790;    /* o ícone real assume                       */
    var T_END = 5340;

    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, parts = [], buckets = [], raf = 0, t0 = 0, done = false;
    var mkBox = null, wdBox = null, cy = 0, ampY = 0;

    function ease(x) { return 1 - Math.pow(1 - x, 3); }
    function easeIO(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
    function clamp01(x) { return x < 0 ? 0 : (x > 1 ? 1 : x); }

    function roundRect(o, x, y, w, h, r) {
      o.beginPath();
      o.moveTo(x + r, y);
      o.lineTo(x + w - r, y); o.quadraticCurveTo(x + w, y, x + w, y + r);
      o.lineTo(x + w, y + h - r); o.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      o.lineTo(x + r, y + h); o.quadraticCurveTo(x, y + h, x, y + h - r);
      o.lineTo(x, y + r); o.quadraticCurveTo(x, y, x + r, y);
      o.closePath();
    }

    function markSpace(o, mk) {
      var s = Math.min(mk.w / 51, mk.h / 52);
      o.translate(mk.x + (mk.w - 51 * s) / 2, mk.y + (mk.h - 52 * s) / 2);
      o.scale(s, s);
      return s;
    }

    /* o fantasma: só a silhueta, apagada, antes de a fita chegar */
    function paintGhost(o, mk, a) {
      o.save(); markSpace(o, mk);
      o.lineJoin = 'round'; o.lineCap = 'round';
      o.strokeStyle = 'rgba(138,197,250,' + (0.14 * a).toFixed(3) + ')';
      o.lineWidth = 2;
      roundRect(o, 1.5, 1, 48, 49, 14); o.stroke();
      o.strokeStyle = 'rgba(138,197,250,' + (0.11 * a).toFixed(3) + ')';
      o.lineWidth = 3.6;
      o.beginPath();
      o.moveTo(12, 34); o.lineTo(22, 24.5); o.lineTo(28, 30); o.lineTo(36.5, 19.5);
      o.stroke();
      o.restore();
    }

    /* o gráfico acendendo, com o nó em brasa */
    function paintSpark(o, mk, a) {
      o.save(); markSpace(o, mk);
      o.lineJoin = 'round'; o.lineCap = 'round';
      o.globalCompositeOperation = 'lighter';
      o.strokeStyle = 'rgba(150,205,255,' + (0.92 * a).toFixed(3) + ')';
      o.lineWidth = 3.6;
      o.beginPath();
      o.moveTo(12, 34); o.lineTo(22, 24.5); o.lineTo(28, 30); o.lineTo(36.5, 19.5);
      o.stroke();
      var g = o.createRadialGradient(36.5, 19.5, 0, 36.5, 19.5, 15);
      g.addColorStop(0, 'rgba(210,236,255,' + (0.85 * a).toFixed(3) + ')');
      g.addColorStop(0.32, 'rgba(138,197,250,' + (0.40 * a).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(138,197,250,0)');
      o.fillStyle = g;
      o.beginPath(); o.arc(36.5, 19.5, 15, 0, TAU); o.fill();
      o.fillStyle = 'rgba(224,242,255,' + (0.95 * a).toFixed(3) + ')';
      o.beginPath(); o.arc(36.5, 19.5, 4, 0, TAU); o.fill();
      /* halo geral do ícone no momento em que ele fecha */
      var h2 = o.createRadialGradient(25.5, 25.5, 4, 25.5, 25.5, 34);
      h2.addColorStop(0, 'rgba(138,197,250,' + (0.20 * a).toFixed(3) + ')');
      h2.addColorStop(1, 'rgba(138,197,250,0)');
      o.fillStyle = h2;
      o.beginPath(); o.arc(25.5, 25.5, 34, 0, TAU); o.fill();
      o.restore();
    }

    /* ── o caminho da fita ────────────────────────────────────────────
       u=0 é a entrada, no alto da direita, fora da tela; u=1 é o centro
       do ícone. Até COIL_U é onda; dali em diante vira espiral que se
       fecha no raio do contorno, que é como o laço do vídeo se aperta. */
    var COIL_U = 0.76;
    function pathAt(u, out) {
      if (u <= COIL_U) {
        var k = u / COIL_U;
        /* O avanço não é uniforme: k^0.55 faz a cabeça vencer depressa o
           trecho que ainda está fora da tela e chegar devagar à área do
           nome. Linear, 70% do percurso era gasto antes do wordmark e a
           fita o cruzava em ~0,5s — rápido demais para a revelação ser
           lida. Assim ela leva ~0,8s só atravessando o nome.
           A senoide usa o MESMO kx, senão o comprimento de onda variaria
           junto com a velocidade e a onda sairia deformada. */
        var kx = Math.pow(k, 0.55);
        out.x = W * 1.06 - kx * (W * 1.06 - (mkBox ? mkBox.x + mkBox.w / 2 : W * 0.2));
        var damp = 0.42 + 0.58 * Math.sin(Math.min(1, kx * 1.18) * Math.PI);
        out.y = cy + Math.sin(kx * TAU * 2.05 + 0.35) * ampY * damp
                   - (1 - Math.min(1, kx * 2.2)) * ampY * 1.15;
      } else {
        /* espiral: gira e encolhe até o raio do contorno do ícone */
        var c = (u - COIL_U) / (1 - COIL_U);
        var cx0 = mkBox ? mkBox.x + mkBox.w / 2 : W * 0.2;
        var cy0 = mkBox ? mkBox.y + mkBox.h / 2 : cy;
        var r0 = ampY * 1.05, r1 = mkBox ? mkBox.w * 0.46 : 26;
        var rr = r0 + (r1 - r0) * easeIO(clamp01(c));
        var ang = -0.5 + c * TAU * 0.95;
        out.x = cx0 + Math.cos(ang) * rr;
        out.y = cy0 + Math.sin(ang) * rr * 0.92;
      }
    }

    function build() {
      var cr = canvas.getBoundingClientRect();
      var mr = markEl.getBoundingClientRect();
      if (!cr.width || !cr.height || !mr.width) return false;

      W = cr.width; H = cr.height;
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      var mk = { x: mr.left - cr.left, y: mr.top - cr.top, w: mr.width, h: mr.height };
      mkBox = mk;
      var wr2 = wordEl.getBoundingClientRect();
      wdBox = { x: wr2.left - cr.left, w: wr2.width,
                cy: wr2.top - cr.top + wr2.height / 2 };
      revealed = 0;
      cy = mk.y + mk.h / 2;
      /* a amplitude também depende da LARGURA: presa só à altura do
         canvas ela dava o mesmo laço de 76px num telefone de 390,
         onde ele cobria o headline inteiro. */
      ampY = Math.min(H * 0.22, W * 0.085, 76);

      /* alvos: o contorno do ícone, rasterizado */
      var oc = document.createElement('canvas');
      oc.width = Math.max(2, Math.round(W));
      oc.height = Math.max(2, Math.round(H));
      var oct = oc.getContext('2d');
      if (!oct) return false;
      oct.save(); markSpace(oct, mk);
      oct.lineJoin = 'round'; oct.lineCap = 'round';
      oct.strokeStyle = '#7fb4e8'; oct.lineWidth = 2.4;
      roundRect(oct, 1.5, 1, 48, 49, 14); oct.stroke();
      oct.restore();
      var img;
      try { img = oct.getImageData(0, 0, oc.width, oc.height).data; }
      catch (e) { return false; }

      var hx = [], hy = [];
      for (var y = 0; y < oc.height; y++) {
        for (var x = 0; x < oc.width; x++) {
          if (img[(y * oc.width + x) * 4 + 3] > 110) { hx.push(x); hy.push(y); }
        }
      }

      var narrow = W < 760;
      var N = narrow ? 2100 : 3400;
      var LANDERS = Math.min(hx.length ? Math.round(N * 0.42) : 0, 1100);

      parts = [];
      for (var i = 0; i < N; i++) {
        /* lag = posição da partícula ao longo da fita. A cauda é mais
           rala que a cabeça, daí a potência: concentra perto de 0. */
        var lag = Math.pow(Math.random(), 0.78) * 0.92;
        var lands = i < LANDERS && hx.length;
        var k = lands ? (Math.random() * hx.length) | 0 : 0;
        var s2 = Math.random(), size;
        if (s2 < 0.54)      size = 0.48 + Math.random() * 0.62;
        else if (s2 < 0.85) size = 1.05 + Math.random() * 0.75;
        else                size = 1.75 + Math.random() * 1.25;
        /* azul da marca, do aço ao quase branco nas mais brilhantes */
        var t = Math.random();
        parts.push({
          lag: lag,
          off: (Math.random() - 0.5) * (narrow ? 22 : 30),
          jx: (Math.random() - 0.5) * 16,
          jy: (Math.random() - 0.5) * 16,
          ph: Math.random() * TAU,
          lands: lands,
          tx: lands ? hx[k] : 0, ty: lands ? hy[k] : 0,
          x: -999, y: 0, vx: 0, vy: 0, size: size,
          /* o facho é do tom da seta, #8ac5fa. Sob composite 'lighter'
             as sobreposições clareiam sozinhas, então a partícula tem de
             nascer bem azul — senão a soma estoura em branco. */
          r: Math.round(44 + t * 70),
          g: Math.round(130 + t * 64),
          b: Math.round(232 + t * 23),
          alpha: 0.40 + Math.random() * 0.55
        });
      }

      /* agrupamento por cor: um beginPath/arc/fill por partícula custaria
         milhares de chamadas por quadro. Cor e alpha são fixos, então dá
         para quantizá-los, ordenar uma vez e desenhar cada faixa num só
         path. A posição muda a cada quadro, a ordem não. O flag "lands"
         entra na chave porque os dois grupos apagam em tempos
         diferentes, via globalAlpha por faixa. */
      parts.forEach(function (q) {
        q.ab = Math.min(4, Math.floor((q.alpha - 0.40) / 0.55 * 5));
        q.key = ((q.lands ? 1 : 0) << 18) | ((q.r >> 5) << 11) |
                ((q.g >> 5) << 6) | ((q.b >> 5) << 3) | q.ab;
      });
      parts.sort(function (a, c) { return a.key - c.key; });

      buckets = [];
      var cur = -1;
      for (var bi = 0; bi < parts.length; bi++) {
        if (parts[bi].key !== cur) {
          cur = parts[bi].key;
          var p0 = parts[bi];
          buckets.push({
            start: bi, end: bi, lands: p0.lands,
            style: 'rgba(' + p0.r + ',' + p0.g + ',' + p0.b + ',' +
                   (0.40 + ((p0.ab + 0.5) / 5) * 0.55).toFixed(3) + ')'
          });
        }
        buckets[buckets.length - 1].end = bi;
      }
      return true;
    }

    var wordDone = false, markLit = false, revealed = 0;
    var pt = { x: 0, y: 0 };

    function frame(now) {
      if (!t0) t0 = now;
      var el = now - t0;
      var i, p;

      var ghostA = clamp01((el - 60) / T_GHOST) *
                   (1 - clamp01((el - (T_SPARK - 300)) / 420));

      /* A cabeça da fita percorre de 0 a 1 + o comprimento da cauda, em
         velocidade CONSTANTE. Com easing de saída ela disparava no início
         e cruzava o nome inteiro em ~300ms: a máscara saltava de 0 a 100
         sem passo intermediário e o nome acendia de uma vez, que é
         justamente o que não se quer. Um facho atravessando não
         desacelera — linear é o certo aqui. */
      var head = clamp01((el - T_GHOST) / T_TRAVEL) * 1.62;
      var landMix = easeIO(clamp01((el - T_COIL) / (T_LAND - T_COIL)));

      for (i = 0; i < parts.length; i++) {
        p = parts[i];
        var u = head - p.lag;
        if (u <= 0) { p.x = -999; continue; }

        pathAt(Math.min(u, 1.06), pt);
        /* a fita tem espessura: deslocamento perpendicular ao avanço,
           mais um bater lento que a faz respirar em vez de virar fio */
        var br = Math.sin(now * 0.0022 + p.ph) * 0.5 + 0.5;
        var px = pt.x + p.jx * br;
        var py = pt.y + p.off * (0.55 + br * 0.65) + p.jy * br;

        if (p.lands && landMix > 0) {
          p.x = px + (p.tx - px) * landMix;
          p.y = py + (p.ty - py) * landMix;
        } else {
          p.x = px; p.y = py;
        }
      }

      ctx.clearRect(0, 0, W, H);
      if (mkBox && ghostA > 0.004) paintGhost(ctx, mkBox, ghostA);

      /* 'lighter' é o que dá o bloom: onde a fita se dobra, as
         partículas somam e a luz estoura */
      ctx.globalCompositeOperation = 'lighter';
      var aStray = 1 - clamp01((el - (T_COIL - 120)) / 620);
      var aLand = 1 - clamp01((el - T_MARK) / 380);
      for (var kk = 0; kk < buckets.length; kk++) {
        var bk = buckets[kk];
        var ga = bk.lands ? aLand : aStray;
        if (ga <= 0.004) continue;
        ctx.globalAlpha = ga;
        ctx.fillStyle = bk.style;
        ctx.beginPath();
        for (i = bk.start; i <= bk.end; i++) {
          p = parts[i];
          if (p.x < -900) continue;
          ctx.moveTo(p.x + p.size, p.y);
          ctx.arc(p.x, p.y, p.size, 0, TAU);
        }
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      if (mkBox && el > T_SPARK - 200) {
        var sp = clamp01((el - (T_SPARK - 200)) / 380) *
                 (1 - clamp01((el - T_MARK) / 400));
        if (sp > 0.004) paintSpark(ctx, mkBox, sp);
      }

      /* ── o nome sendo revelado pela passagem do facho ──────────────
         Não acende de uma vez: a parte por onde a fita JÁ passou fica
         visível e o resto continua escondido. Como a fita corre da
         direita para a esquerda, a revelação corre junto — daí a máscara
         em gradiente ancorada em "to left", com a cabeça da fita
         convertida em fração da largura do wordmark. A borda macia é o
         que faz a luz parecer estar acendendo as letras, e não um
         retângulo deslizando por cima delas. */
      if (wdBox && !wordDone) {
        /* A frente de revelação segue um ponto ATRÁS da cabeça, onde a
           fita tem corpo — a ponta sozinha é rala demais para ler como
           "a luz passou aqui".

           E só avança enquanto a fita estiver na faixa vertical do nome.
           Sem essa trava, bastava o X cruzar as letras para revelar, e no
           começo do percurso a fita voa bem acima delas: o nome acendia
           sem nenhum facho à vista, que era o defeito. Guardar o máximo
           impede que a revelação ande para trás quando a onda sobe de
           novo. */
        var uRef = Math.min(head - 0.10, 1);
        if (uRef > 0) {
          pathAt(uRef, pt);
          if (Math.abs(pt.y - wdBox.cy) < ampY * 0.85) {
            var f2 = clamp01((wdBox.x + wdBox.w - pt.x) / wdBox.w);
            if (f2 > revealed) revealed = f2;
          }
        }
        /* rede de segurança: passada a cabeça pelo ícone, o nome está
           inteiro aceso de qualquer maneira */
        if (head >= 1) revealed = 1;
        var frac = revealed;
        var lit = Math.round(frac * 141) - 17;
        if (lit >= 124) {
          wordDone = true;
          wordEl.style.webkitMaskImage = '';
          wordEl.style.maskImage = '';
          wordEl.style.opacity = '1';
        } else {
          var mask = 'linear-gradient(to left, rgba(0,0,0,1) ' + lit +
                     '%, rgba(0,0,0,0) ' + (lit + 17) + '%)';
          wordEl.style.webkitMaskImage = mask;
          wordEl.style.maskImage = mask;
          wordEl.style.opacity = '1';
        }
      }
      if (!markLit && el >= T_MARK) { markLit = true; markWrap.style.opacity = '1'; }

      if (!done && el >= T_END) {
        done = true;
        host.classList.remove('is-assembling');
        host.classList.add('is-done');
        cancelAnimationFrame(raf);
        ctx.clearRect(0, 0, W, H);
        canvas.style.display = 'none';
        wordEl.style.opacity = '';
        wordEl.style.webkitMaskImage = '';
        wordEl.style.maskImage = '';
        markWrap.style.opacity = '';
        return;
      }
      raf = requestAnimationFrame(frame);
    }

    /* Medir cedo demais é o erro que custa caro aqui: a <img> do wordmark
       tem width:auto, então antes de carregar ela mede zero e a lockup
       inteira nasce menor do que vai ficar — e os alvos sairiam desse
       espaço encolhido. */
    function whenMeasurable(cb) {
      var fire = function () {
        if (wordEl.complete && wordEl.naturalWidth) { cb(); }
        else { wordEl.addEventListener('load', cb, { once: true }); }
      };
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(fire)['catch'](fire);
      } else { fire(); }
    }

    function play() {
      if (done || raf) return;
      /* a máscara nasce fechada: o nome está em opacity 1 desde já, e
         quem o esconde é a máscara — é ela que a fita vai abrindo */
      var m0 = 'linear-gradient(to left, rgba(0,0,0,1) -17%, rgba(0,0,0,0) 0%)';
      wordEl.style.webkitMaskImage = m0;
      wordEl.style.maskImage = m0;
      host.classList.add('is-assembling');
      whenMeasurable(function () {
        requestAnimationFrame(function () {
          if (!build()) { host.classList.remove('is-assembling'); return; }
          t0 = 0;
          raf = requestAnimationFrame(frame);
        });
      });
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) { io.disconnect(); play(); }
        });
      }, { threshold: 0.45 });
      io.observe(host);
    } else {
      play();
    }
  }

  function boot() {
    initTickers();
    initLogoAssembly();
    initTopbar();
    initSwipeRail({
      rail: 'tm-proofs', dots: 'tm-proof-dots',
      card: '.tm-proof', dotClass: 'tm-proof-dot',
      label: 'Four reasons to move now; swipe sideways'
    });
    initSwipeRail({
      rail: 'tm-step-rail', dots: 'tm-step-dots',
      card: '.tm-step-card', dotClass: 'tm-step-dot',
      label: 'The four integration steps; swipe sideways'
    });
    initWidgetDemo();
    initLeadForm();
    initEnterAnimations();
    initRevealBackstop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
