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
  /* ── A logo se montando (Quebra 7) ───────────────────────────────────
     Uma entrada, não um elemento de cena: as partículas chegam rodando
     pela esquerda, assentam no desenho da própria lockup e entregam o
     lugar para ela. Depois disso o canvas sai e não custa mais nada.

     Os alvos saem de um rasterizado da lockup feita à mão neste canvas
     — o contorno do mark, a linha, o nó e os contornos do wordmark —
     medido em cima das caixas reais dos elementos, para as partículas
     assentarem exatamente onde a logo vai acender. Cada uma guarda a COR
     do pixel de onde veio, então o azul do gráfico e o branco do nome já
     chegam certos e o crossfade não tem salto de cor.

     Nada disso toca em arquivo externo: carregar o .svg como <img>
     sujaria o canvas (getImageData passa a lançar SecurityError sob
     file://). O wordmark vem como Path2D e o mark, como primitivas.

     O estado escrito no HTML é o de repouso. Quem apaga a logo para
     montá-la é este código — então, sem JS ou sob prefers-reduced-motion,
     ela simplesmente já está lá.                                      */
  function initLogoAssembly() {
    var host = document.getElementById('tm-logo-anim');
    var canvas = document.getElementById('tm-logo-particles');
    if (!host || !canvas || !canvas.getContext || reduced) return;
    if (typeof Path2D === 'undefined') return;
    var ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    var markEl = host.querySelector('svg');
    var wordEl = host.querySelector('img');
    if (!markEl || !wordEl) return;

    /* contornos do wordmark + o translate do <g> que os acompanha */
    var WM_D = [
      "M10.296-4.785L12.309-4.785L12.309 0L9.438 0Q6.369 0 4.653-1.502Q2.937-3.003 2.937-6.402L2.937-13.728L0.693-13.728L0.693-18.414L2.937-18.414L2.937-22.902L8.580-22.902L8.580-18.414L12.276-18.414L12.276-13.728L8.580-13.728L8.580-6.336Q8.580-5.511 8.976-5.148Q9.372-4.785 10.296-4.785 M16.962-20.328Q15.477-20.328 14.537-21.203Q13.596-22.077 13.596-23.364Q13.596-24.684 14.537-25.559Q15.477-26.433 16.962-26.433Q18.414-26.433 19.355-25.559Q20.295-24.684 20.295-23.364Q20.295-22.077 19.355-21.203Q18.414-20.328 16.962-20.328M14.124-18.414L19.767-18.414L19.767 0L14.124 0 M28.182-15.807Q29.007-17.094 30.459-17.886Q31.911-18.678 33.858-18.678Q36.135-18.678 37.983-17.523Q39.831-16.368 40.904-14.223Q41.976-12.078 41.976-9.240Q41.976-6.402 40.904-4.240Q39.831-2.079 37.983-0.908Q36.135 0.264 33.858 0.264Q31.944 0.264 30.476-0.528Q29.007-1.320 28.182-2.574L28.182 8.778L22.539 8.778L22.539-18.414L28.182-18.414L28.182-15.807M36.234-9.240Q36.234-11.352 35.063-12.556Q33.891-13.761 32.175-13.761Q30.492-13.761 29.321-12.540Q28.149-11.319 28.149-9.207Q28.149-7.095 29.321-5.874Q30.492-4.653 32.175-4.653Q33.858-4.653 35.046-5.891Q36.234-7.128 36.234-9.240 M67.122-18.612Q70.554-18.612 72.584-16.533Q74.613-14.454 74.613-10.758L74.613 0L69.003 0L69.003-9.999Q69.003-11.781 68.063-12.755Q67.122-13.728 65.472-13.728Q63.822-13.728 62.882-12.755Q61.941-11.781 61.941-9.999L61.941 0L56.331 0L56.331-9.999Q56.331-11.781 55.391-12.755Q54.450-13.728 52.800-13.728Q51.150-13.728 50.209-12.755Q49.269-11.781 49.269-9.999L49.269 0L43.626 0L43.626-18.414L49.269-18.414L49.269-16.104Q50.127-17.259 51.513-17.936Q52.899-18.612 54.648-18.612Q56.727-18.612 58.361-17.721Q59.994-16.830 60.918-15.180Q61.875-16.698 63.525-17.655Q65.175-18.612 67.122-18.612 M76.131-9.240Q76.131-12.078 77.203-14.223Q78.276-16.368 80.124-17.523Q81.972-18.678 84.249-18.678Q86.196-18.678 87.664-17.886Q89.133-17.094 89.925-15.807L89.925-18.414L95.568-18.414L95.568 0L89.925 0L89.925-2.607Q89.100-1.320 87.631-0.528Q86.163 0.264 84.216 0.264Q81.972 0.264 80.124-0.908Q78.276-2.079 77.203-4.240Q76.131-6.402 76.131-9.240M89.925-9.207Q89.925-11.319 88.753-12.540Q87.582-13.761 85.899-13.761Q84.216-13.761 83.044-12.556Q81.873-11.352 81.873-9.240Q81.873-7.128 83.044-5.891Q84.216-4.653 85.899-4.653Q87.582-4.653 88.753-5.874Q89.925-7.095 89.925-9.207 M103.983-15.345Q104.973-16.863 106.458-17.738Q107.943-18.612 109.758-18.612L109.758-12.639L108.207-12.639Q106.095-12.639 105.039-11.732Q103.983-10.824 103.983-8.547L103.983 0L98.340 0L98.340-18.414L103.983-18.414 M129.393 0L122.397 0L116.787-7.722L116.787 0L111.144 0L111.144-24.420L116.787-24.420L116.787-10.923L122.364-18.414L129.327-18.414L121.671-9.174 M147.576-9.504Q147.576-8.712 147.477-7.854L134.706-7.854Q134.838-6.138 135.811-5.231Q136.785-4.323 138.204-4.323Q140.316-4.323 141.141-6.105L147.147-6.105Q146.685-4.290 145.481-2.838Q144.276-1.386 142.461-0.561Q140.646 0.264 138.402 0.264Q135.696 0.264 133.584-0.891Q131.472-2.046 130.284-4.191Q129.096-6.336 129.096-9.207Q129.096-12.078 130.267-14.223Q131.439-16.368 133.551-17.523Q135.663-18.678 138.402-18.678Q141.075-18.678 143.154-17.556Q145.233-16.434 146.404-14.355Q147.576-12.276 147.576-9.504M134.739-10.989L141.801-10.989Q141.801-12.441 140.811-13.299Q139.821-14.157 138.336-14.157Q136.917-14.157 135.944-13.332Q134.970-12.507 134.739-10.989 M157.476-4.785L159.489-4.785L159.489 0L156.618 0Q153.549 0 151.833-1.502Q150.117-3.003 150.117-6.402L150.117-13.728L147.873-13.728L147.873-18.414L150.117-18.414L150.117-22.902L155.760-22.902L155.760-18.414L159.456-18.414L159.456-13.728L155.760-13.728L155.760-6.336Q155.760-5.511 156.156-5.148Q156.552-4.785 157.476-4.785",
      "M163.944 0.264Q162.459 0.264 161.519-0.611Q160.578-1.485 160.578-2.772Q160.578-4.092 161.519-4.983Q162.459-5.874 163.944-5.874Q165.396-5.874 166.337-4.983Q167.277-4.092 167.277-2.772Q167.277-1.485 166.337-0.611Q165.396 0.264 163.944 0.264"
    ];
    var WM_TR = [-0.69, 26.43];
    var WM_VB = { w: 166.58, h: 35.21 };
    var TAU = 6.283185307179586;

    /* tempos da entrada, em ms */
    var T_SWEEP = 430;   /* defasagem entre a 1ª e a última partícula */
    var T_FLY   = 820;   /* voo de cada uma até o seu lugar           */
    var T_SET   = 340;   /* assenta na mola antes de entregar         */

    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, parts = [], buckets = [], raf = 0, t0 = 0, done = false;

    function ease(x) { return 1 - Math.pow(1 - x, 3); }

    function roundRect(o, x, y, w, h, r) {
      o.beginPath();
      o.moveTo(x + r, y);
      o.lineTo(x + w - r, y); o.quadraticCurveTo(x + w, y, x + w, y + r);
      o.lineTo(x + w, y + h - r); o.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      o.lineTo(x + r, y + h); o.quadraticCurveTo(x, y + h, x, y + h - r);
      o.lineTo(x, y + r); o.quadraticCurveTo(x, y, x + r, y);
      o.closePath();
    }

    /* a lockup redesenhada no canvas, nas caixas reais dos elementos.
       O miolo do mark não é pintado: preencher #07070a geraria partículas
       da cor do fundo, invisíveis. O que vira ponto é o contorno. */
    function paintLockup(o, mk, wd) {
      var s = Math.min(mk.w / 51, mk.h / 52);
      o.save();
      o.translate(mk.x + (mk.w - 51 * s) / 2, mk.y + (mk.h - 52 * s) / 2);
      o.scale(s, s);
      o.lineJoin = 'round'; o.lineCap = 'round';
      o.strokeStyle = '#4a6480'; o.lineWidth = 2;
      roundRect(o, 1.5, 1, 48, 49, 14); o.stroke();
      o.lineWidth = 1.4;
      o.beginPath(); o.arc(36.5, 19.5, 6.3, 0, TAU); o.stroke();
      o.strokeStyle = '#8ac5fa'; o.lineWidth = 3.6;
      o.beginPath();
      o.moveTo(12, 34); o.lineTo(22, 24.5); o.lineTo(28, 30); o.lineTo(36.5, 19.5);
      o.stroke();
      o.fillStyle = '#8ac5fa';
      o.beginPath(); o.arc(36.5, 19.5, 4, 0, TAU); o.fill();
      o.restore();

      var ws = wd.w / WM_VB.w;
      o.save();
      o.translate(wd.x, wd.y);
      o.scale(ws, ws);
      o.translate(WM_TR[0], WM_TR[1]);
      o.fillStyle = '#ffffff';
      for (var i = 0; i < WM_D.length; i++) {
        try { o.fill(new Path2D(WM_D[i])); } catch (e) { return false; }
      }
      o.restore();
      return true;
    }

    function build() {
      var cr = canvas.getBoundingClientRect();
      var mr = markEl.getBoundingClientRect();
      var wr = wordEl.getBoundingClientRect();
      if (!cr.width || !cr.height || !mr.width || !wr.width) return false;

      W = cr.width; H = cr.height;
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      /* caixas dos elementos convertidas para o espaço do canvas */
      var mk = { x: mr.left - cr.left, y: mr.top - cr.top, w: mr.width, h: mr.height };
      var wd = { x: wr.left - cr.left, y: wr.top - cr.top, w: wr.width, h: wr.height };

      var oc = document.createElement('canvas');
      oc.width = Math.max(2, Math.round(W));
      oc.height = Math.max(2, Math.round(H));
      var oct = oc.getContext('2d');
      if (!oct) return false;
      if (!paintLockup(oct, mk, wd)) return false;

      var img;
      try { img = oct.getImageData(0, 0, oc.width, oc.height).data; }
      catch (e) { return false; }

      /* pixels cobertos viram candidatos, carregando a própria cor */
      var hx = [], hy = [], hr = [], hg = [], hb = [];
      for (var y = 0; y < oc.height; y++) {
        for (var x = 0; x < oc.width; x++) {
          var i4 = (y * oc.width + x) * 4;
          if (img[i4 + 3] > 110) {
            hx.push(x); hy.push(y);
            hr.push(img[i4]); hg.push(img[i4 + 1]); hb.push(img[i4 + 2]);
          }
        }
      }
      if (!hx.length) return false;

      var N = Math.min(2600, hx.length);
      var minX = Infinity, maxX = -Infinity, j;
      for (j = 0; j < hx.length; j++) {
        if (hx[j] < minX) minX = hx[j];
        if (hx[j] > maxX) maxX = hx[j];
      }
      var spanX = (maxX - minX) || 1;

      parts = [];
      for (j = 0; j < N; j++) {
        var k = (Math.random() * hx.length) | 0;
        var s2 = Math.random(), size;
        if (s2 < 0.60)      size = 0.34 + Math.random() * 0.44;
        else if (s2 < 0.88) size = 0.78 + Math.random() * 0.52;
        else                size = 1.30 + Math.random() * 0.80;
        parts.push({
          tx: hx[k], ty: hy[k],
          r: hr[k], g: hg[k], b: hb[k],
          x: 0, y: 0, vx: 0, vy: 0, size: size,
          alpha: 0.42 + Math.random() * 0.55,
          /* o atraso sai do X do alvo: é o que varre da esquerda p/ a direita */
          dly: ((hx[k] - minX) / spanX) * T_SWEEP,
          sp: Math.random() * TAU,
          /* de quão longe cada uma vem, para o bando não chegar em bloco */
          far: 0.55 + Math.random() * 0.75
        });
      }

      /* agrupamento por cor: um beginPath/arc/fill por partícula custaria
         milhares de chamadas por quadro. Cor e alpha são fixos, então dá
         para quantizá-los, ordenar uma vez e desenhar cada faixa num
         único path — a posição muda a cada quadro, a ordem não. */
      parts.forEach(function (q) {
        q.bk = ((q.r >> 5) << 10) | ((q.g >> 5) << 5) | (q.b >> 5);
        q.ab = Math.min(4, Math.floor((q.alpha - 0.42) / 0.55 * 5));
        q.key = q.bk * 5 + q.ab;
      });
      parts.sort(function (a, c) { return a.key - c.key; });

      buckets = [];
      var cur = -1;
      for (var bi = 0; bi < parts.length; bi++) {
        if (parts[bi].key !== cur) {
          cur = parts[bi].key;
          var p0 = parts[bi];
          buckets.push({
            start: bi, end: bi,
            style: 'rgba(' + p0.r + ',' + p0.g + ',' + p0.b + ',' +
                   (0.42 + ((p0.ab + 0.5) / 5) * 0.55).toFixed(3) + ')'
          });
        }
        buckets[buckets.length - 1].end = bi;
      }
      return true;
    }

    function frame(now) {
      if (!t0) t0 = now;
      var el = now - t0;
      var i, p;

      for (i = 0; i < parts.length; i++) {
        p = parts[i];
        var lt = (el - p.dly) / T_FLY;

        if (lt <= 0) {
          /* antes da sua vez, espera fora do canvas: assim não precisa de
             alpha próprio e o agrupamento por cor continua valendo */
          p.x = -W; p.y = p.ty;
          continue;
        }
        if (lt < 1) {
          /* voo: espiral que se fecha enquanto avança da esquerda */
          var e = ease(lt);
          var a = lt * Math.PI * 3.4 + p.sp;
          var rad = (1 - e) * H * 0.34;
          var sx = p.tx - W * 0.52 * p.far;
          p.x = sx + (p.tx - sx) * e + Math.cos(a) * rad;
          p.y = p.ty + Math.sin(a) * rad;
          p.vx = p.vy = 0;
          continue;
        }
        /* assenta na mola */
        p.vx += (p.tx - p.x) * 0.26;
        p.vy += (p.ty - p.y) * 0.26;
        p.vx *= 0.62; p.vy *= 0.62;
        p.x += p.vx; p.y += p.vy;
      }

      ctx.clearRect(0, 0, W, H);
      for (var kk = 0; kk < buckets.length; kk++) {
        var bk = buckets[kk];
        ctx.fillStyle = bk.style;
        ctx.beginPath();
        for (i = bk.start; i <= bk.end; i++) {
          p = parts[i];
          ctx.moveTo(p.x + p.size, p.y);
          ctx.arc(p.x, p.y, p.size, 0, TAU);
        }
        ctx.fill();
      }

      /* montada: acende a logo real, apaga as partículas e sai de cena */
      if (!done && el > T_SWEEP + T_FLY + T_SET) {
        done = true;
        host.classList.remove('is-assembling');
        host.classList.add('is-done');
        setTimeout(function () {
          cancelAnimationFrame(raf);
          ctx.clearRect(0, 0, W, H);
          canvas.style.display = 'none';
        }, 420);
      }
      raf = requestAnimationFrame(frame);
    }

    /* Medir cedo demais é o erro que custa caro aqui: a <img> do wordmark
       tem width:auto, então antes de carregar ela mede zero e a lockup
       inteira — e o canvas, que se dimensiona por ela — nasce menor do
       que vai ficar. Os alvos sairiam desse espaço encolhido e as
       partículas montariam a logo fora do lugar. Espera-se a imagem
       decodificada e as fontes prontas antes de tirar qualquer medida. */
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
      host.classList.add('is-assembling');
      whenMeasurable(function () {
        /* a classe precisa pintar antes do primeiro quadro, senão a logo
           real aparece por um quadro e a troca ganha um piscado */
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
