/* MODO AURA v3 — perfil "Constelação" (adaptado para o Gestor Arena)
   Luz da marca atrás de todo o conteúdo (blend screen), campo de estrelas,
   orbs subindo e vinheta de profundidade. Acento lido de window.VZ_ACCENT.
   Respeita prefers-reduced-motion (mantém a luz, remove o movimento). */
(function () {
  if (window.__AURA_INIT__) return
  window.__AURA_INIT__ = true
  window.AURA = { version: '3-constelacao', variant: 'constelacao' }

  var ACC = window.VZ_ACCENT || '#1769FF'
  var CY = '#38BDF8' // ciano de brilho
  function rgb(hex) { var h = hex.replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)].join(',') }
  var R = rgb(ACC), RL = rgb(CY)

  var css = ''
    + '.vz-afix{position:fixed;inset:-14%;z-index:0;pointer-events:none;overflow:hidden}'
    + '.vz-cglow{position:absolute;inset:0;pointer-events:none;mix-blend-mode:screen;background:'
    + 'radial-gradient(58% 56% at 50% 38%,rgba(' + R + ',.30),transparent 70%),'
    + 'radial-gradient(46% 42% at 14% 6%,rgba(' + RL + ',.14),transparent 66%),'
    + 'radial-gradient(44% 40% at 92% 96%,rgba(' + R + ',.12),transparent 66%);'
    + 'animation:vzBreathe 9s ease-in-out infinite}'
    + '@keyframes vzBreathe{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:1;transform:scale(1.05)}}'
    + '.vz-stars{position:absolute;inset:0;pointer-events:none;animation:vzSky 120s linear infinite}'
    + '@keyframes vzSky{0%{transform:translate(0,0)}50%{transform:translate(-1.4%,-1.2%)}100%{transform:translate(0,0)}}'
    + '.vz-star{position:absolute;border-radius:50%;background:#F4F6FB;mix-blend-mode:screen;animation:vzTw 3.4s ease-in-out infinite}'
    + '@keyframes vzTw{0%,100%{opacity:.10;transform:scale(1)}50%{opacity:.8;transform:scale(1.6)}}'
    + '.vz-orb{position:absolute;border-radius:50%;pointer-events:none;mix-blend-mode:screen;filter:blur(1px)}'
    + '.vz-orb.o1{width:8px;height:8px;left:22%;top:64%;background:rgba(' + RL + ',.9);box-shadow:0 0 16px rgba(' + RL + ',.7);animation:vzRise 24s linear infinite}'
    + '.vz-orb.o2{width:5px;height:5px;left:70%;top:80%;background:rgba(' + R + ',.9);box-shadow:0 0 12px rgba(' + R + ',.6);animation:vzRise 32s linear infinite 7s}'
    + '.vz-orb.o3{width:6px;height:6px;left:46%;top:74%;background:rgba(' + RL + ',.85);box-shadow:0 0 14px rgba(' + RL + ',.6);animation:vzRise 28s linear infinite 13s}'
    + '@keyframes vzRise{0%{transform:translateY(0);opacity:0}12%{opacity:.9}88%{opacity:.5}100%{transform:translateY(-72vh);opacity:0}}'
    + '.vz-vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(120% 90% at 50% 40%,transparent 55%,rgba(0,0,0,.30) 100%)}'
    + '@media (prefers-reduced-motion:reduce){.vz-cglow,.vz-stars,.vz-star,.vz-orb{animation:none!important}}'

  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st)

  var fix = document.createElement('div'); fix.className = 'vz-afix'
  var glow = document.createElement('div'); glow.className = 'vz-cglow'; fix.appendChild(glow)
  var sky = document.createElement('div'); sky.className = 'vz-stars'
  for (var i = 0; i < 60; i++) {
    var s = document.createElement('span'); s.className = 'vz-star'
    var sz = (Math.random() * 1.6 + 0.6).toFixed(2)
    s.style.cssText = 'width:' + sz + 'px;height:' + sz + 'px;left:' + (Math.random() * 100).toFixed(2) + '%;top:' + (Math.random() * 100).toFixed(2) + '%;animation-delay:' + (Math.random() * 3.4).toFixed(2) + 's'
    sky.appendChild(s)
  }
  fix.appendChild(sky)
  ;['o1', 'o2', 'o3'].forEach(function (c) { var o = document.createElement('div'); o.className = 'vz-orb ' + c; fix.appendChild(o) })
  var vig = document.createElement('div'); vig.className = 'vz-vig'; fix.appendChild(vig)

  function mount() { document.body.insertBefore(fix, document.body.firstChild) }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount)
})();
