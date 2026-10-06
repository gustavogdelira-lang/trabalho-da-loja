(function () {
  var formLogin = document.getElementById('form-login');
  var areaPainel = document.getElementById('area-painel');
  var erroLogin = document.getElementById('erro-login');
  var conexao = document.getElementById('conexao');
  var listaAbertos = document.getElementById('lista-abertos');
  var listaEncerrados = document.getElementById('lista-encerrados');
  var vazio = document.getElementById('vazio-abertos');
  var btnSom = document.getElementById('btn-som');

  var alertas = {};      // id -> alerta
  var fonte = null;      // EventSource
  var somLigado = true;
  var audio = null;
  var tituloOriginal = document.title;
  var offsetRelogio = 0; // diferença entre relógio do servidor e do aparelho

  /* ---------- Entrada ---------- */
  function mostrarLogin() {
    areaPainel.hidden = true;
    formLogin.hidden = false;
    document.getElementById('senha').focus();
  }

  formLogin.addEventListener('submit', function (e) {
    e.preventDefault();
    erroLogin.textContent = '';
    iniciarAudio(); // o clique libera o som do navegador
    fetch('/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha: document.getElementById('senha').value })
    }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok) { erroLogin.textContent = res.d.erro || 'Não foi possível entrar.'; return; }
        document.getElementById('senha').value = '';
        formLogin.hidden = true;
        carregar();
      }).catch(function () { erroLogin.textContent = 'Sem conexão. Tente de novo.'; });
  });

  document.getElementById('btn-sair').addEventListener('click', function () {
    if (fonte) fonte.close();
    fetch('/api/logout', { method: 'POST' }).finally(mostrarLogin);
  });

  btnSom.addEventListener('click', function () {
    somLigado = !somLigado;
    btnSom.textContent = somLigado ? 'Som ligado' : 'Som desligado';
    if (somLigado) { iniciarAudio(); bip(); }
  });

  /* ---------- Dados ---------- */
  function carregar() {
    fetch('/api/alertas').then(function (r) {
      if (r.status === 401) { mostrarLogin(); throw new Error('login'); }
      return r.json();
    }).then(function (d) {
      offsetRelogio = d.agora - Date.now();
      document.getElementById('nome-local').textContent = d.local;
      alertas = {};
      d.alertas.forEach(function (a) { alertas[a.id] = a; });
      areaPainel.hidden = false;
      desenhar();
      conectar();
    }).catch(function (e) {
      if (e.message !== 'login') { conexao.textContent = 'Sem conexão'; conexao.className = 'conexao off'; setTimeout(carregar, 4000); }
    });
  }

  function conectar() {
    if (fonte) fonte.close();
    fonte = new EventSource('/api/stream');
    fonte.onopen = function () { conexao.textContent = 'Ao vivo'; conexao.className = 'conexao on'; };
    fonte.onerror = function () {
      conexao.textContent = 'Reconectando'; conexao.className = 'conexao off';
      // Se a sessão expirou, o servidor responde 401 e o navegador não reconecta.
      if (fonte.readyState === 2) carregar();
    };
    fonte.addEventListener('alerta', function (ev) {
      var a = JSON.parse(ev.data);
      alertas[a.id] = a;
      desenhar();
      avisar();
    });
    fonte.addEventListener('atualizacao', function (ev) {
      var a = JSON.parse(ev.data);
      alertas[a.id] = a;
      desenhar();
    });
  }

  function mudarStatus(id, status) {
    fetch('/api/alertas/' + id + '/status', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: status })
    }).then(function (r) {
      if (r.status === 401) mostrarLogin();
      return r.json();
    }).then(function (a) {
      if (a && a.id) { alertas[a.id] = a; desenhar(); }
    }).catch(function () {});
  }

  /* ---------- Tela ---------- */
  function minutos(a) {
    var m = Math.max(0, Math.floor((Date.now() + offsetRelogio - a.criadoEm) / 60000));
    if (m < 1) return 'agora mesmo';
    if (m < 60) return 'há ' + m + ' min';
    return 'há ' + Math.floor(m / 60) + ' h ' + (m % 60) + ' min';
  }
  var ROTULO_STATUS = { novo: 'Novo', atendendo: 'Em atendimento', resolvido: 'Resolvido' };

  function cartao(a) {
    var li = document.createElement('li');
    li.className = 'alerta ' + a.status;

    var topo = document.createElement('div'); topo.className = 'topo';
    var cab = document.createElement('span'); cab.className = 'cabine'; cab.textContent = 'Cabine ' + a.cabine;
    var tempo = document.createElement('span'); tempo.className = 'tempo'; tempo.dataset.id = a.id; tempo.textContent = minutos(a);
    topo.append(cab, tempo);

    var motivo = document.createElement('p'); motivo.className = 'motivo'; motivo.textContent = a.rotulo;
    var etq = document.createElement('span'); etq.className = 'etiqueta'; etq.textContent = ROTULO_STATUS[a.status];

    li.append(topo, motivo, etq);

    if (a.status !== 'resolvido') {
      var botoes = document.createElement('div'); botoes.className = 'botoes';
      if (a.status === 'novo') {
        var b1 = document.createElement('button'); b1.type = 'button'; b1.className = 'btn btn-primario'; b1.textContent = 'Vou atender';
        b1.addEventListener('click', function () { mudarStatus(a.id, 'atendendo'); });
        botoes.append(b1);
      }
      var b2 = document.createElement('button'); b2.type = 'button'; b2.className = 'btn btn-claro'; b2.textContent = 'Marcar como resolvido';
      b2.addEventListener('click', function () { mudarStatus(a.id, 'resolvido'); });
      botoes.append(b2);
      li.append(botoes);
    }
    return li;
  }

  function desenhar() {
    var todos = Object.keys(alertas).map(function (k) { return alertas[k]; })
      .sort(function (x, y) { return y.criadoEm - x.criadoEm; });
    var abertos = todos.filter(function (a) { return a.status !== 'resolvido'; });
    // Novos primeiro
    abertos.sort(function (x, y) {
      if ((x.status === 'novo') !== (y.status === 'novo')) return x.status === 'novo' ? -1 : 1;
      return y.criadoEm - x.criadoEm;
    });
    var encerrados = todos.filter(function (a) { return a.status === 'resolvido'; }).slice(0, 20);

    listaAbertos.replaceChildren.apply(listaAbertos, abertos.map(cartao));
    listaEncerrados.replaceChildren.apply(listaEncerrados, encerrados.map(cartao));
    vazio.hidden = abertos.length > 0;

    var novos = abertos.filter(function (a) { return a.status === 'novo'; }).length;
    document.title = novos ? '(' + novos + ') NOVO ALERTA — Guardiãs' : tituloOriginal;
  }

  setInterval(function () {
    document.querySelectorAll('.tempo[data-id]').forEach(function (el) {
      var a = alertas[el.dataset.id]; if (a) el.textContent = minutos(a);
    });
  }, 15000);

  /* ---------- Aviso sonoro e vibração ---------- */
  function iniciarAudio() {
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
    } catch (e) {}
  }
  function bip() {
    if (!somLigado || !audio) return;
    [0, 0.28, 0.56].forEach(function (atraso) {
      var o = audio.createOscillator(), g = audio.createGain();
      o.type = 'sine'; o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, audio.currentTime + atraso);
      g.gain.exponentialRampToValueAtTime(0.35, audio.currentTime + atraso + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + atraso + 0.22);
      o.connect(g); g.connect(audio.destination);
      o.start(audio.currentTime + atraso); o.stop(audio.currentTime + atraso + 0.25);
    });
  }
  function avisar() {
    bip();
    if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
  }
  document.addEventListener('click', iniciarAudio, { once: true });

  carregar();
})();