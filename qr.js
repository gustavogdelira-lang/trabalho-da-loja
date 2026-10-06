(function () {
  var base = document.getElementById('base');
  var folha = document.getElementById('folha');
  var erro = document.getElementById('erro');
  base.value = location.origin;

  function gerar() {
    erro.textContent = '';
    folha.replaceChildren();
    if (typeof QRCode === 'undefined') {
      erro.textContent = 'Não foi possível carregar o gerador de QR Code. Verifique a conexão com a internet e tente de novo.';
      return;
    }
    var qtd = Math.min(60, Math.max(1, parseInt(document.getElementById('qtd').value, 10) || 1));
    var ini = Math.min(999, Math.max(1, parseInt(document.getElementById('inicio').value, 10) || 1));
    var raiz = base.value.trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(raiz)) { erro.textContent = 'Informe o endereço completo do site, começando com https://'; return; }
    if (/localhost|127\.0\.0\.1/.test(raiz)) {
      erro.textContent = 'Atenção: este endereço só funciona no seu computador. Para imprimir, use o endereço público do site.';
    }

    for (var i = 0; i < qtd; i++) {
      var n = ini + i;
      var cartao = document.createElement('div'); cartao.className = 'adesivo';
      var chamada = document.createElement('strong'); chamada.textContent = 'Precisa de ajuda?';
      var qr = document.createElement('div'); qr.className = 'qr';
      var legenda = document.createElement('span'); legenda.textContent = 'Aponte a câmera. Cabine ' + n;
      cartao.append(chamada, qr, legenda);
      folha.append(cartao);
      new QRCode(qr, { text: raiz + '/ajuda?c=' + n, width: 160, height: 160, correctLevel: QRCode.CorrectLevel.M });
    }
  }

  document.getElementById('btn-gerar').addEventListener('click', gerar);
  document.getElementById('btn-imprimir').addEventListener('click', function () { window.print(); });
  window.addEventListener('load', gerar);
})();