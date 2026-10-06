/* Servidor simulado: na versão real, estas chamadas vão para o servidor Node. */
(function(){
  var ROT={ajuda:'Preciso de uma funcionária aqui',saida:'Quero ir embora em segurança',seguida:'Estou sendo seguida'};
  var alertas=[]; window.__alertas=alertas;
  var real=window.fetch.bind(window);
  function resp(s,o){return Promise.resolve(new Response(JSON.stringify(o),{status:s,headers:{'Content-Type':'application/json'}}));}
  window.fetch=function(url,opts){
    if(typeof url==='string'&&url.indexOf('/api/')===0){
      if(url==='/api/config') return resp(200,{local:'Bar Exemplo',loja:'Trama Moda'});
      if(url==='/api/alerta'&&opts&&opts.method==='POST'){
        var b=JSON.parse(opts.body);
        var rep=alertas.filter(function(a){return a.cabine===b.cabine&&a.tipo===b.tipo&&a.status!=='resolvido';})[0];
        if(rep) return resp(200,{id:rep.id});
        var a={id:'d'+Date.now().toString(16),cabine:b.cabine,tipo:b.tipo,rotulo:ROT[b.tipo],status:'novo',criadoEm:Date.now()};
        alertas.unshift(a); window.dispatchEvent(new Event('alertas')); return resp(201,{id:a.id});
      }
      var m=url.match(/^\/api\/alerta\/(.+)$/);
      if(m){var x=alertas.filter(function(a){return a.id===m[1];})[0]; return x?resp(200,{status:x.status}):resp(404,{erro:'Pedido não encontrado.'});}
    }
    return real(url,opts);
  };
})();