(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var EXTENSOES = ['jpg', 'jpeg', 'png', 'webp', 'avif']; // formatos aceitos para as fotos
  var PASTA_IMG = 'img/'; // pasta das fotos das roupas
  var params = new URLSearchParams(location.search);
  var cabine = '3'; // demonstração: como se o QR Code da cabine 3 tivesse sido escaneado

  /* ============================================================
     Loja (fachada): catálogo, filtros e sacola
     ============================================================ */
  var PECAS = {
    vestido: { corpo: 'M40 10 Q50 21 60 10 L71 28 L62 43 L75 110 L25 110 L38 43 L29 28 Z', detalhe: 'M38 43 Q50 49 62 43' },
    blusa:   { corpo: 'M36 14 Q50 25 64 14 L89 35 L79 49 L70 43 L70 100 L30 100 L30 43 L21 49 L11 35 Z', detalhe: 'M42 16 Q50 30 58 16' },
    calca:   { corpo: 'M32 12 L68 12 L75 112 L55 112 L50 52 L45 112 L25 112 Z', detalhe: 'M32 20 L68 20' },
    jaqueta: { corpo: 'M37 12 L50 21 L63 12 L91 33 L83 54 L72 47 L72 98 L28 98 L28 47 L17 54 L9 33 Z', detalhe: 'M50 21 L50 98' },
    saia:    { corpo: 'M36 20 L64 20 L84 108 L16 108 Z', detalhe: 'M40 22 L30 106 M50 22 L50 106 M60 22 L70 106' },
    camisa:  { corpo: 'M35 12 L50 20 L65 12 L90 34 L80 50 L71 44 L71 102 L29 102 L29 44 L20 50 L10 34 Z', detalhe: 'M50 20 L50 102 M42 14 L50 26 L58 14' },
    cardigan:{ corpo: 'M36 12 L50 24 L64 12 L92 36 L84 58 L73 50 L73 100 L27 100 L27 50 L16 58 L8 36 Z', detalhe: 'M50 24 L50 100' },
    macacao: { corpo: 'M38 10 L62 10 L66 42 L73 112 L54 112 L50 64 L46 112 L27 112 L34 42 Z', detalhe: 'M38 10 L50 30 L62 10' }
  };

  var PRODUTOS = [
    { nome: 'Vestido midi Alice', img: 'vestido-alice',     peca: 'vestido',  cat: 'vestidos', cor: 'c1', fundo: 'fundo-1', info: 'Viscose · verde-mata',   preco: 289.9 },
    { nome: 'Blusa Lina de linho', img: 'blusa-lina',    peca: 'blusa',    cat: 'blusas',   cor: 'c2', fundo: 'fundo-2', info: 'Linho · terracota rosado', preco: 159.9 },
    { nome: 'Calça Rita alfaiataria', img: 'calca-rita', peca: 'calca',    cat: 'calcas',   cor: 'c3', fundo: 'fundo-3', info: 'Alfaiataria · azul-marinho', preco: 249.9 },
    { nome: 'Jaqueta Bia jeans', img: 'jaqueta-bia',      peca: 'jaqueta',  cat: 'casacos',  cor: 'c6', fundo: 'fundo-3', info: 'Jeans · lavagem clara',  preco: 329.9 },
    { nome: 'Saia plissada Nina', img: 'saia-nina',     peca: 'saia',     cat: 'calcas',   cor: 'c7', fundo: 'fundo-2', info: 'Poliamida · ameixa',      preco: 199.9 },
    { nome: 'Camisa Vera oversize', img: 'camisa-vera',   peca: 'camisa',   cat: 'blusas',   cor: 'c4', fundo: 'fundo-4', info: 'Algodão · areia',         preco: 179.9 },
    { nome: 'Cardigan Lia de tricô', img: 'cardigan-lia',  peca: 'cardigan', cat: 'casacos',  cor: 'c8', fundo: 'fundo-1', info: 'Tricô · verde-sálvia',    preco: 219.9 },
    { nome: 'Macacão Ana', img: 'macacao-ana',            peca: 'macacao',  cat: 'vestidos', cor: 'c5', fundo: 'fundo-4', info: 'Crepe · preto',           preco: 359.9 },
    { nome: 'Vestido Clara estampado', img: 'vestido-clara',peca: 'vestido',  cat: 'vestidos', cor: 'c2', fundo: 'fundo-4', info: 'Viscose · rosé',          preco: 269.9 },
    { nome: 'Blusa Duda manga longa', img: 'blusa-duda', peca: 'blusa',    cat: 'blusas',   cor: 'c3', fundo: 'fundo-1', info: 'Algodão · azul-noite',    preco: 139.9 },
    { nome: 'Calça Lu pantalona', img: 'calca-lu',     peca: 'calca',    cat: 'calcas',   cor: 'c1', fundo: 'fundo-2', info: 'Viscose · verde-mata',    preco: 229.9 },
    { nome: 'Camisa Bela de seda', img: 'camisa-bela',    peca: 'camisa',   cat: 'blusas',   cor: 'c7', fundo: 'fundo-3', info: 'Seda · ameixa',           preco: 349.9 }
  ];

  function arte(peca, cor, fundo, img, alt) {
    var div = document.createElement('div');
    div.className = 'arte ' + fundo + ' ' + cor;

    // Desenho de reserva (aparece se não houver foto ou se a foto não carregar)
    function desenharSvg() {
      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 100 125');
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-hidden', 'true');
      var g = document.createElementNS(NS, 'path');
      g.setAttribute('d', PECAS[peca].corpo);
      g.setAttribute('fill', 'currentColor');
      g.setAttribute('transform', 'translate(0 6)');
      var d = document.createElementNS(NS, 'path');
      d.setAttribute('d', PECAS[peca].detalhe);
      d.setAttribute('class', 'detalhe');
      d.setAttribute('transform', 'translate(0 6)');
      svg.append(g, d);
      div.appendChild(svg);
    }

    if (img) {
      var foto = document.createElement('img');
      var tentativa = 0;
      foto.alt = alt || '';
      foto.loading = 'lazy';
      // Se a foto não existir naquele formato, tenta o próximo; se nenhum existir, mostra o desenho.
      foto.addEventListener('error', function () {
        tentativa++;
        if (tentativa < EXTENSOES.length) {
          foto.src = PASTA_IMG + img + '.' + EXTENSOES[tentativa];
        } else {
          foto.remove();
          desenharSvg();
        }
      });
      foto.src = PASTA_IMG + img + '.' + EXTENSOES[0];
      div.appendChild(foto);
    } else {
      desenharSvg();
    }
    return div;
  }

  function brl(v) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

  var grade = document.getElementById('grade');
  var contador = document.getElementById('contador');
  var itens = 0;

  function desenharGrade(filtro) {
    var lista = PRODUTOS.filter(function (p) { return filtro === 'todos' || p.cat === filtro; });
    grade.replaceChildren.apply(grade, lista.map(function (p) {
      var li = document.createElement('li'); li.className = 'produto';
      var h = document.createElement('h3'); h.textContent = p.nome;
      var inf = document.createElement('p'); inf.className = 'info'; inf.textContent = p.info;
      var pr = document.createElement('p'); pr.className = 'preco';
      pr.textContent = brl(p.preco) + ' ';
      var parc = document.createElement('small'); parc.textContent = 'ou 3x de ' + brl(p.preco / 3); pr.appendChild(parc);
      var b = document.createElement('button'); b.type = 'button'; b.className = 'comprar'; b.textContent = 'Adicionar à sacola';
      b.addEventListener('click', function () {
        itens++; contador.textContent = String(itens); contador.hidden = false;
        b.textContent = 'Adicionado'; b.classList.add('ok');
        setTimeout(function () { b.textContent = 'Adicionar à sacola'; b.classList.remove('ok'); }, 1400);
      });
      li.append(arte(p.peca, p.cor, p.fundo, p.img, p.nome), h, inf, pr, b);
      return li;
    }));
  }

  function aplicarFiltro(f) {
    document.querySelectorAll('.filtro').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.filtro === f)); });
    desenharGrade(f);
  }
  document.querySelectorAll('.filtro').forEach(function (b) {
    b.addEventListener('click', function () { aplicarFiltro(b.dataset.filtro); });
  });
  document.querySelectorAll('nav [data-filtro]').forEach(function (a) {
    a.addEventListener('click', function () { aplicarFiltro(a.dataset.filtro); });
  });

  // Arte da capa (usa as fotos de três peças)
  var capa = document.querySelector('.capa-arte');
  [
    ['vestido', 'c1', 'fundo-1', 'vestido-alice', 'Vestido midi Alice'],
    ['jaqueta', 'c3', 'fundo-3', 'jaqueta-bia', 'Jaqueta Bia jeans'],
    ['saia', 'c7', 'fundo-2', 'saia-nina', 'Saia plissada Nina']
  ].forEach(function (t) {
    capa.appendChild(arte(t[0], t[1], t[2], t[3], t[4]));
  });
  desenharGrade('todos');

  fetch('/api/config').then(function (r) { return r.json(); }).then(function (c) {
    if (c.loja) {
      document.title = c.loja;
      document.getElementById('logo').textContent = c.loja.split(' ')[0];
      document.getElementById('chat-nome').textContent = 'Atendimento ' + c.loja.split(' ')[0];
      document.querySelector('.rodape strong').textContent = c.loja;
    }
  }).catch(function () {});

  /* ============================================================
     Atendimento: só existe quando o QR Code identifica a cabine
     ============================================================ */
  if (!cabine) return;

  var botaoChat = document.getElementById('chat-botao');
  var chat = document.getElementById('chat');
  var msgs = document.getElementById('chat-msgs');
  var opcoes = document.getElementById('chat-opcoes');
  var enviado = false, timer = null;

  var RESPOSTAS = [
    { tipo: 'ajuda',   texto: 'Falar com uma atendente aqui' },
    { tipo: 'saida',   texto: 'Quero sair com acompanhamento' },
    { tipo: 'seguida', texto: 'Estou sendo seguida' }
  ];

  function mensagem(quem, texto) {
    var p = document.createElement('p');
    p.className = 'msg ' + quem; p.textContent = texto;
    msgs.appendChild(p); msgs.scrollTop = msgs.scrollHeight;
  }

  function mostrarOpcoes() {
    opcoes.replaceChildren();
    RESPOSTAS.forEach(function (r) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'resposta'; b.textContent = r.texto;
      b.addEventListener('click', function () { enviar(r); });
      opcoes.appendChild(b);
    });
  }

  function iniciarConversa() {
    msgs.replaceChildren(); enviado = false; clearInterval(timer);
    mensagem('loja', 'Olá! Posso ajudar com alguma coisa?');
    mostrarOpcoes();
  }

  function abrir() {
    chat.hidden = false; botaoChat.hidden = true; botaoChat.setAttribute('aria-expanded', 'true');
    if (!msgs.children.length) iniciarConversa();
  }
  function fechar() {
    // Fecha e apaga a conversa deste aparelho; a loja continua na tela.
    chat.hidden = true; botaoChat.hidden = false; botaoChat.setAttribute('aria-expanded', 'false');
    msgs.replaceChildren(); opcoes.replaceChildren(); clearInterval(timer); enviado = false;
  }

  botaoChat.hidden = false;
  botaoChat.addEventListener('click', abrir);
  document.getElementById('chat-fechar').addEventListener('click', fechar);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !chat.hidden) fechar(); });
  setTimeout(abrir, 900);

  function enviar(r) {
    if (enviado) return;
    enviado = true;
    mensagem('cliente', r.texto);
    opcoes.querySelectorAll('button').forEach(function (b) { b.disabled = true; });

    fetch('/api/alerta', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: r.tipo, cabine: cabine })
    }).then(function (res) {
      return res.json().then(function (d) { return { ok: res.ok, d: d }; });
    }).then(function (res) {
      if (!res.ok) throw new Error(res.d.erro || '');
      mensagem('loja', 'Recebido. Uma atendente vai até você. Pode ficar onde está.');
      opcoes.replaceChildren();
      var sair = document.createElement('button');
      sair.type = 'button'; sair.className = 'resposta neutra'; sair.textContent = 'Voltar para a loja';
      sair.addEventListener('click', fechar);
      opcoes.appendChild(sair);
      acompanhar(res.d.id);
    }).catch(function (e) {
      enviado = false;
      mensagem('loja', (e && e.message && e.message !== 'Failed to fetch')
        ? e.message
        : 'Não consegui enviar agora. Chame uma atendente na loja ou, se estiver em risco, ligue 190.');
      mostrarOpcoes();
    });
  }

  function acompanhar(id) {
    var ultimo = 'novo', inicio = Date.now();
    timer = setInterval(function () {
      if (Date.now() - inicio > 30 * 60000) { clearInterval(timer); return; }
      fetch('/api/alerta/' + id).then(function (r) { return r.json(); }).then(function (d) {
        if (!d.status || d.status === ultimo) return;
        ultimo = d.status;
        if (ultimo === 'atendendo') mensagem('loja', 'Uma atendente está a caminho. Ela vai bater duas vezes na porta.');
        if (ultimo === 'resolvido') { mensagem('loja', 'Atendimento encerrado. Obrigada!'); clearInterval(timer); }
      }).catch(function () {});
    }, 4000);
  }
})();