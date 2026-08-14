// GESTOR ARENA — core: cliente, helpers, tema, toasts, modal, VersionGate
(function(){
  'use strict';
  window.GA = window.GA || {};

  // ---------- Supabase ----------
  GA.sb = supabase.createClient(GA_CONFIG.SUPABASE_URL, GA_CONFIG.SUPABASE_ANON_KEY);

  // ---------- helpers ----------
  GA.$  = function(s, el){ return (el||document).querySelector(s); };
  GA.$$ = function(s, el){ return Array.prototype.slice.call((el||document).querySelectorAll(s)); };
  GA.esc = function(v){
    return String(v == null ? '' : v)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  };
  GA.iniciais = function(nome){
    return String(nome||'?').trim().slice(0,2).toUpperCase();
  };

  // ---------- toasts ----------
  GA.toast = function(msg, tipo){
    var box = GA.$('#toasts');
    var t = document.createElement('div');
    t.className = 'toast' + (tipo === 'err' ? ' err' : '');
    t.setAttribute('role','status');
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(function(){ t.remove(); }, tipo === 'err' ? 6500 : 4000);
  };
  GA.erro = function(e, contexto){
    console.error(contexto || 'erro', e);
    var m = (e && (e.message || e.error_description)) || 'Algo deu errado. Tente novamente.';
    // mensagens do Postgres/RPC vêm legíveis em pt — mostrar direto
    GA.toast((contexto ? contexto + ': ' : '') + m, 'err');
  };

  // ---------- modal ----------
  GA.modal = function(html){
    GA.fecharModal();
    var bg = document.createElement('div');
    bg.className = 'modal-bg'; bg.id = 'modal-bg';
    bg.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + html + '</div>';
    bg.addEventListener('click', function(e){ if (e.target === bg) GA.fecharModal(); });
    document.body.appendChild(bg);
    var f = GA.$('input,select,textarea', bg);
    if (f) f.focus();
  };
  GA.fecharModal = function(){
    var m = GA.$('#modal-bg'); if (m) m.remove();
  };
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') GA.fecharModal();
  });

  // ---------- tema (claro + escuro, persistido) ----------
  GA.aplicarTema = function(t){
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('ga_theme', t); } catch(_e){}
    var b = GA.$('#theme-btn'); if (b) b.textContent = (t === 'light' ? '🌙' : '☀️');
  };
  GA.alternarTema = function(){
    var atual = document.documentElement.getAttribute('data-theme') || 'dark';
    GA.aplicarTema(atual === 'light' ? 'dark' : 'light');
  };
  (function(){
    var t = 'dark';
    try { t = localStorage.getItem('ga_theme') || 'dark'; } catch(_e){}
    GA.aplicarTema(t);
  })();

  // ---------- WhatsApp (§12 dos padrões) ----------
  GA.waLink = function(tel, msg){
    var d = String(tel||'').replace(/\D/g,'');
    if (!d) return null;
    if (d.length <= 11 && d.slice(0,2) !== '55') d = '55' + d;
    return 'https://wa.me/' + d + (msg ? '?text=' + encodeURIComponent(msg) : '');
  };
  GA.waBtn = function(tel, msg, label){
    var url = GA.waLink(tel, msg);
    if (!url) return '';
    return '<a class="b-wa" target="_blank" rel="noopener" href="' + GA.esc(url) + '">' +
           (label || 'WhatsApp →') + '</a>';
  };

  // ---------- VersionGate (§14 — obrigatório) ----------
  function checarVersao(){
    fetch(location.pathname + '?_v=' + Date.now(), { cache: 'no-store' })
      .then(function(r){ return r.text(); })
      .then(function(html){
        var m = html.match(/window\.APP_VERSION\s*=\s*'([^']+)'/);
        if (m && m[1] && m[1] !== window.APP_VERSION) mostrarBanner(m[1]);
      })
      .catch(function(){ /* offline: silêncio */ });
  }
  function mostrarBanner(nova){
    if (GA.$('#update-banner')) return;
    var b = document.createElement('div');
    b.id = 'update-banner';
    b.innerHTML = '<span>✨ Uma versão novinha do Gestor Arena está pronta.</span>' +
                  '<button type="button">Atualizar agora</button>';
    GA.$('button', b).addEventListener('click', function(){
      try { sessionStorage.clear(); } catch(_e){}
      location.replace(location.pathname + '?v=' + encodeURIComponent(nova) + location.hash);
    });
    document.body.appendChild(b);
  }
  setTimeout(checarVersao, 8000);
  setInterval(checarVersao, 10 * 60 * 1000);
  window.addEventListener('focus', checarVersao);
  document.addEventListener('visibilitychange', function(){
    if (!document.hidden) checarVersao();
  });
})();
