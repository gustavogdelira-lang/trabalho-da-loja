'use strict';
/* Projeto Guardiãs — Ponto de Ajuda
   Servidor sem dependências externas (Node 18+). */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/* ---------- Configuração (variáveis de ambiente) ---------- */
const PORT = Number(process.env.PORT) || 3000;
const SENHA = process.env.PAINEL_SENHA || '';
const SEGREDO = process.env.SEGREDO || crypto.randomBytes(32).toString('hex');
const NOME_LOCAL = (process.env.NOME_LOCAL || 'Estabelecimento').slice(0, 60);
const LOJA_NOME = (process.env.LOJA_NOME || 'Trama Moda').slice(0, 40);
const WEBHOOK_URL = process.env.WEBHOOK_URL || '';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const ARQUIVO = path.join(DATA_DIR, 'alertas.json');
const SESSAO_HORAS = 12;
const MAX_ALERTAS = 300;

if (!SENHA || SENHA.length < 8) {
  console.error('Defina PAINEL_SENHA com pelo menos 8 caracteres. Exemplo: PAINEL_SENHA="minha-senha-forte" node server.js');
  process.exit(1);
}

const TIPOS = {
  ajuda: 'Preciso de uma funcionária aqui',
  saida: 'Quero ir embora em segurança',
  seguida: 'Estou sendo seguida'
};
const STATUS_VALIDOS = ['novo', 'atendendo', 'resolvido'];

/* ---------- Armazenamento ---------- */
let alertas = [];
try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(ARQUIVO)) alertas = JSON.parse(fs.readFileSync(ARQUIVO, 'utf8'));
} catch (e) {
  console.error('Não foi possível ler os alertas salvos:', e.message);
  alertas = [];
}

let salvando = false, salvarDeNovo = false;
function salvar() {
  if (salvando) { salvarDeNovo = true; return; }
  salvando = true;
  const tmp = ARQUIVO + '.tmp';
  fs.writeFile(tmp, JSON.stringify(alertas), (err) => {
    if (!err) fs.rename(tmp, ARQUIVO, () => fim());
    else { console.error('Erro ao salvar:', err.message); fim(); }
  });
  function fim() {
    salvando = false;
    if (salvarDeNovo) { salvarDeNovo = false; salvar(); }
  }
}

/* ---------- Utilidades ---------- */
function ip(req) {
  const xf = req.headers['x-forwarded-for'];
  return (xf ? String(xf).split(',')[0].trim() : req.socket.remoteAddress) || 'desconhecido';
}

const limites = new Map();
function limitar(chave, max, janelaMs) {
  const agora = Date.now();
  const lista = (limites.get(chave) || []).filter((t) => agora - t < janelaMs);
  if (lista.length >= max) { limites.set(chave, lista); return false; }
  lista.push(agora);
  limites.set(chave, lista);
  return true;
}
setInterval(() => {
  const agora = Date.now();
  for (const [k, v] of limites) if (!v.some((t) => agora - t < 3600000)) limites.delete(k);
}, 600000).unref();

function assinar(valor) {
  return crypto.createHmac('sha256', SEGREDO).update(valor).digest('hex');
}
function iguais(a, b) {
  const A = Buffer.from(String(a)), B = Buffer.from(String(b));
  return A.length === B.length && crypto.timingSafeEqual(A, B);
}
function criarSessao() {
  const exp = String(Date.now() + SESSAO_HORAS * 3600000);
  return exp + '.' + assinar(exp);
}
function sessaoValida(req) {
  const cookie = req.headers.cookie || '';
  const m = cookie.match(/(?:^|;\s*)sessao=([^;]+)/);
  if (!m) return false;
  const [exp, sig] = m[1].split('.');
  if (!exp || !sig || !iguais(sig, assinar(exp))) return false;
  return Number(exp) > Date.now();
}

function cabecalhos(extra) {
  return Object.assign({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
  }, extra);
}
function json(res, status, corpo, extra) {
  res.writeHead(status, cabecalhos(Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, extra)));
  res.end(JSON.stringify(corpo));
}
function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let dados = '';
    req.on('data', (c) => {
      dados += c;
      if (dados.length > 2048) { reject(new Error('grande')); req.destroy(); }
    });
    req.on('end', () => {
      try { resolve(dados ? JSON.parse(dados) : {}); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}
function publico(a) {
  return { id: a.id, cabine: a.cabine, tipo: a.tipo, rotulo: a.rotulo, status: a.status, criadoEm: a.criadoEm, atualizadoEm: a.atualizadoEm };
}

/* ---------- Tempo real (Server-Sent Events) ---------- */
const clientes = new Set();
function transmitir(evento, dados) {
  const msg = 'event: ' + evento + '\ndata: ' + JSON.stringify(dados) + '\n\n';
  for (const res of clientes) res.write(msg);
}
setInterval(() => { for (const res of clientes) res.write(': batimento\n\n'); }, 25000).unref();

async function avisarWebhook(alerta) {
  if (!WEBHOOK_URL) return;
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'ALERTA — ' + NOME_LOCAL + ' — Cabine ' + alerta.cabine + ': ' + alerta.rotulo,
        local: NOME_LOCAL, cabine: alerta.cabine, tipo: alerta.tipo, rotulo: alerta.rotulo, criadoEm: alerta.criadoEm
      }),
      signal: AbortSignal.timeout(5000)
    });
  } catch (e) { console.error('Webhook falhou:', e.message); }
}

/* ---------- Arquivos estáticos (lista fechada) ---------- */
const PUBLICOS = {
  '/': ['ajuda.html', 'text/html; charset=utf-8'],
  '/ajuda': ['ajuda.html', 'text/html; charset=utf-8'],
  '/painel': ['painel.html', 'text/html; charset=utf-8'],
  '/qr': ['qr.html', 'text/html; charset=utf-8'],
  '/estilo.css': ['estilo.css', 'text/css; charset=utf-8'],
  '/loja.css': ['loja.css', 'text/css; charset=utf-8'],
  '/ajuda.js': ['ajuda.js', 'text/javascript; charset=utf-8'],
  '/painel.js': ['painel.js', 'text/javascript; charset=utf-8'],
  '/qr.js': ['qr.js', 'text/javascript; charset=utf-8']
};

/* ---------- Fotos das roupas (pasta public/img) ---------- */
const MIME_IMG = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml'
};

/* ---------- Rotas ---------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const rota = url.pathname;
  const seguro = req.headers['x-forwarded-proto'] === 'https';

  try {
    const mImg = rota.match(/^\/img\/([A-Za-z0-9._-]+\.(?:jpe?g|png|webp|avif|svg))$/i);
    if (req.method === 'GET' && mImg) {
      const arquivoImg = path.join(__dirname, 'public', 'img', mImg[1]);
      fs.readFile(arquivoImg, (err, dados) => {
        if (err) return json(res, 404, { erro: 'Imagem não encontrada.' });
        res.writeHead(200, cabecalhos({
          'Content-Type': MIME_IMG[path.extname(arquivoImg).toLowerCase()] || 'application/octet-stream',
          'Cache-Control': 'public, max-age=3600'
        }));
        res.end(dados);
      });
      return;
    }

    if (req.method === 'GET' && PUBLICOS[rota]) {
      const [arq, tipo] = PUBLICOS[rota];
      const conteudo = fs.readFileSync(path.join(__dirname, 'public', arq));
      res.writeHead(200, cabecalhos({ 'Content-Type': tipo, 'Cache-Control': 'no-cache' }));
      return res.end(conteudo);
    }

    if (req.method === 'GET' && rota === '/api/config') {
      return json(res, 200, { local: NOME_LOCAL, loja: LOJA_NOME, tipos: TIPOS });
    }

    /* --- Cliente pede ajuda (público, com limite de uso) --- */
    if (req.method === 'POST' && rota === '/api/alerta') {
      if (!limitar('alerta:' + ip(req), 6, 5 * 60000)) {
        return json(res, 429, { erro: 'Muitos pedidos em pouco tempo. Se estiver em risco, ligue 190.' });
      }
      const corpo = await lerCorpo(req);
      const tipo = String(corpo.tipo || '');
      const cabine = String(corpo.cabine || '').trim().slice(0, 20);
      if (!TIPOS[tipo]) return json(res, 400, { erro: 'Tipo de ajuda inválido.' });
      if (!/^[\p{L}\p{N} _-]{1,20}$/u.test(cabine)) return json(res, 400, { erro: 'Cabine inválida.' });

      const agora = Date.now();
      const repetido = alertas.find((a) => a.cabine === cabine && a.tipo === tipo && a.status !== 'resolvido' && agora - a.criadoEm < 120000);
      if (repetido) return json(res, 200, { id: repetido.id });

      const alerta = {
        id: crypto.randomBytes(12).toString('hex'),
        cabine, tipo, rotulo: TIPOS[tipo],
        status: 'novo', criadoEm: agora, atualizadoEm: agora
      };
      alertas.unshift(alerta);
      if (alertas.length > MAX_ALERTAS) alertas.length = MAX_ALERTAS;
      salvar();
      transmitir('alerta', publico(alerta));
      avisarWebhook(alerta);
      return json(res, 201, { id: alerta.id });
    }

    /* --- Cliente acompanha o próprio pedido (id secreto) --- */
    const mStatus = rota.match(/^\/api\/alerta\/([0-9a-f]{24})$/);
    if (req.method === 'GET' && mStatus) {
      const a = alertas.find((x) => x.id === mStatus[1]);
      if (!a) return json(res, 404, { erro: 'Pedido não encontrado.' });
      return json(res, 200, { status: a.status });
    }

    /* --- Login do painel --- */
    if (req.method === 'POST' && rota === '/api/login') {
      if (!limitar('login:' + ip(req), 10, 10 * 60000)) {
        return json(res, 429, { erro: 'Muitas tentativas. Aguarde alguns minutos.' });
      }
      const corpo = await lerCorpo(req);
      if (!iguais(crypto.createHash('sha256').update(String(corpo.senha || '')).digest('hex'),
                  crypto.createHash('sha256').update(SENHA).digest('hex'))) {
        return json(res, 401, { erro: 'Senha incorreta.' });
      }
      const cookie = 'sessao=' + criarSessao() + '; HttpOnly; SameSite=Strict; Path=/; Max-Age=' + SESSAO_HORAS * 3600 + (seguro ? '; Secure' : '');
      return json(res, 200, { ok: true }, { 'Set-Cookie': cookie });
    }
    if (req.method === 'POST' && rota === '/api/logout') {
      return json(res, 200, { ok: true }, { 'Set-Cookie': 'sessao=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
    }

    /* --- Rotas protegidas (equipe) --- */
    if (rota.startsWith('/api/') && ['/api/alertas', '/api/stream'].includes(rota) || /^\/api\/alertas\//.test(rota)) {
      if (!sessaoValida(req)) return json(res, 401, { erro: 'Entre com a senha da equipe.' });

      if (req.method === 'GET' && rota === '/api/alertas') {
        return json(res, 200, { local: NOME_LOCAL, alertas: alertas.slice(0, 100).map(publico), agora: Date.now() });
      }

      if (req.method === 'GET' && rota === '/api/stream') {
        res.writeHead(200, cabecalhos({
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no'
        }));
        res.write('retry: 3000\n\n');
        clientes.add(res);
        req.on('close', () => clientes.delete(res));
        return;
      }

      const m = rota.match(/^\/api\/alertas\/([0-9a-f]{24})\/status$/);
      if (req.method === 'POST' && m) {
        const corpo = await lerCorpo(req);
        const a = alertas.find((x) => x.id === m[1]);
        if (!a) return json(res, 404, { erro: 'Alerta não encontrado.' });
        if (!STATUS_VALIDOS.includes(corpo.status)) return json(res, 400, { erro: 'Status inválido.' });
        a.status = corpo.status;
        a.atualizadoEm = Date.now();
        salvar();
        transmitir('atualizacao', publico(a));
        return json(res, 200, publico(a));
      }
    }

    json(res, 404, { erro: 'Não encontrado.' });
  } catch (e) {
    if (!res.headersSent) json(res, 400, { erro: 'Requisição inválida.' });
  }
});

server.listen(PORT, () => {
  console.log('Guardiãs no ar em http://localhost:' + PORT + '  (painel: /painel, QR Codes: /qr)');
});