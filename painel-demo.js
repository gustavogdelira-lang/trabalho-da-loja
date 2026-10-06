(function(){
  var $=function(i){return document.getElementById(i);};
  var visL=$('visao-loja'),visP=$('visao-painel'),bL=$('ver-loja'),bP=$('ver-painel'),nNovos=$('n-novos');
  var ROT={novo:'Novo',atendendo:'Em atendimento',resolvido:'Resolvido'};
  var audio=null;
  function som(){try{if(!audio)audio=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();
    [0,.28,.56].forEach(function(d){var o=audio.createOscillator(),g=audio.createGain();o.frequency.value=880;g.gain.setValueAtTime(.0001,audio.currentTime+d);
    g.gain.exponentialRampToValueAtTime(.3,audio.currentTime+d+.02);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+d+.22);
    o.connect(g);g.connect(audio.destination);o.start(audio.currentTime+d);o.stop(audio.currentTime+d+.25);});}catch(e){}}
  function ir(painel){visL.hidden=painel;visP.hidden=!painel;bL.setAttribute('aria-pressed',String(!painel));bP.setAttribute('aria-pressed',String(painel));window.scrollTo(0,0);}
  bL.addEventListener('click',function(){ir(false);});
  bP.addEventListener('click',function(){ir(true);});
  function min(a){var m=Math.floor((Date.now()-a.criadoEm)/60000);return m<1?'agora mesmo':'há '+m+' min';}
  function cartao(a){
    var li=document.createElement('li');li.className='alerta '+a.status;
    var l=document.createElement('div');l.className='linha';
    var c=document.createElement('span');c.className='cab';c.textContent='Cabine '+a.cabine;
    var t=document.createElement('span');t.className='tempo';t.textContent=min(a);l.append(c,t);
    var mo=document.createElement('p');mo.className='motivo';mo.textContent=a.rotulo;
    var e=document.createElement('span');e.className='etq';e.textContent=ROT[a.status];
    li.append(l,mo,e);
    if(a.status!=='resolvido'){
      var bs=document.createElement('div');bs.className='bts';
      if(a.status==='novo'){var b1=document.createElement('button');b1.type='button';b1.className='bt';b1.textContent='Vou atender';
        b1.addEventListener('click',function(){a.status='atendendo';desenhar();});bs.append(b1);}
      var b2=document.createElement('button');b2.type='button';b2.className='bt claro';b2.textContent='Marcar como resolvido';
      b2.addEventListener('click',function(){a.status='resolvido';desenhar();});bs.append(b2);li.append(bs);
    }
    return li;
  }
  function desenhar(){
    var todos=window.__alertas,ab=todos.filter(function(a){return a.status!=='resolvido';}),en=todos.filter(function(a){return a.status==='resolvido';});
    $('abertos').replaceChildren.apply($('abertos'),ab.map(cartao));
    $('encerrados').replaceChildren.apply($('encerrados'),en.map(cartao));
    $('vazio').hidden=ab.length>0;
    var n=ab.filter(function(a){return a.status==='novo';}).length;
    nNovos.textContent=n;nNovos.hidden=!n;
  }
  window.addEventListener('alertas',function(){desenhar();if(!visP.hidden)som();});
  setInterval(function(){if(!visP.hidden)desenhar();},20000);
  desenhar();
})();