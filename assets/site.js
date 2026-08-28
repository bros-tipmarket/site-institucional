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
    armOnEnter('tm-close', 0.6);
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

    var EMAIL = 'ana.souza@email.com';
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

    /* Quem chega de contact.html?i=affiliate já vem dizendo o que quer —
       obrigar a repetir a escolha é cobrar duas vezes pela mesma
       informação. O mapa é fechado de propósito: o valor da URL nunca
       vira conteúdo, só escolhe entre opções que já existem no HTML. */
    var SHORTCUTS = {
      affiliate: 'Affiliate program',
      platform:  'White-label platform',
      widget:    'Widget for my site'
    };
    (function () {
      var m = /[?&]i=([a-z]+)/.exec(window.location.search);
      var wanted = m && SHORTCUTS[m[1]];
      if (!wanted) return;
      opts.forEach(function (o) {
        var r = o.querySelector('input');
        if (!r || r.value !== wanted) return;
        r.checked = true;
        o.classList.add('is-on');
      });
    }());
    form.addEventListener('change', function (e) {
      if (e.target.name !== 'interest') return;
      opts.forEach(function (o) { o.classList.toggle('is-on', o.contains(e.target)); });
      validate('interest');
    });

    function say(message) {
      status.textContent = message || '';
      status.classList.toggle('is-on', !!message);
    }

    function busy(on) {
      submit.disabled = on;
      label.textContent = on ? 'Sending…' : 'Start operating';
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
  function boot() {
    initTickers();
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
