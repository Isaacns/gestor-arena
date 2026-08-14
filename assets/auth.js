// GESTOR ARENA — sessão, onboarding multi-org, contexto e chip do usuário (§8.1)
(function(){
  'use strict';
  var sb = GA.sb;

  GA.user = null;      // auth user
  GA.profile = null;   // public.profiles
  GA.orgs = [];        // [{org, role}]
  GA.org = null;       // organização ativa {id,tipo,nome,slug,...}
  GA.role = null;      // papel na org ativa

  GA.podeEditar = function(){
    return ['owner','admin','gerente','operacional','coordenador'].indexOf(GA.role) >= 0;
  };
  GA.podeAdmin = function(){
    return ['owner','admin'].indexOf(GA.role) >= 0;
  };
  GA.podeVincular = function(){   // espelha o RPC solicitar/responder_vinculo
    return ['owner','admin','gerente'].indexOf(GA.role) >= 0;
  };
  GA.podeAgenda = function(){     // espelha a função pode_agenda do banco
    return ['owner','admin','gerente','operacional','recepcao','coordenador','professor'].indexOf(GA.role) >= 0;
  };

  // ---------- boot ----------
  GA.boot = function(){
    sb.auth.getSession().then(function(r){
      trocarSessao(r.data.session);
      sb.auth.onAuthStateChange(function(_ev, session){ trocarSessao(session); });
    });
  };

  var ultimoUid = '(boot)';
  function trocarSessao(session){
    var uid = session && session.user ? session.user.id : null;
    if (uid === ultimoUid) return;   // TOKEN_REFRESHED etc. não recarrega a tela
    ultimoUid = uid;
    GA.user = session ? session.user : null;
    if (!GA.user) { mostrarLogin(); return; }
    carregarContexto();
  }

  function mostrarLogin(){
    GA.$('#app').classList.remove('on');
    GA.$('#login-screen').style.display = 'flex';
  }

  function carregarContexto(){
    GA.$('#login-screen').style.display = 'none';
    var app = GA.$('#app');
    app.classList.add('on');
    GA.$('#content').innerHTML = '<div class="loading">Carregando seu espaço…</div>';

    Promise.all([
      sb.from('profiles').select('*').eq('id', GA.user.id).maybeSingle(),
      sb.from('memberships').select('role, ativo, organizations(*)')
        .eq('user_id', GA.user.id).eq('ativo', true)
    ]).then(function(rs){
      if (rs[0].error) throw rs[0].error;
      if (rs[1].error) throw rs[1].error;
      GA.profile = rs[0].data || { id: GA.user.id, nome: GA.user.email, email: GA.user.email };
      GA.orgs = (rs[1].data || [])
        .filter(function(m){ return m.organizations && m.organizations.status !== 'encerrada'; })
        .map(function(m){ return { org: m.organizations, role: m.role }; });
      if (!GA.orgs.length) { renderOnboarding(); return; }
      var salva = null;
      try { salva = localStorage.getItem('ga_org'); } catch(_e){}
      var esc = GA.orgs.filter(function(o){ return o.org.id === salva; })[0] || GA.orgs[0];
      GA.definirOrg(esc.org.id);
    }).catch(function(e){ GA.erro(e, 'Falha ao carregar'); });
  }

  GA.definirOrg = function(orgId){
    var par = GA.orgs.filter(function(o){ return o.org.id === orgId; })[0];
    if (!par) return;
    GA.org = par.org; GA.role = par.role;
    try { localStorage.setItem('ga_org', orgId); } catch(_e){}
    renderChrome();
    GA.mostrarView('inicio');
  };

  // ---------- login / criar conta ----------
  GA.entrar = function(ev){
    ev.preventDefault();
    var email = GA.$('#lg-email').value.trim();
    var senha = GA.$('#lg-senha').value;
    var btn = GA.$('#lg-btn'); btn.disabled = true; btn.textContent = 'Entrando…';
    sb.auth.signInWithPassword({ email: email, password: senha })
      .then(function(r){ if (r.error) throw r.error; })
      .catch(function(e){
        GA.erro(e.message === 'Invalid login credentials'
          ? { message: 'E-mail ou senha incorretos' } : e, 'Login');
      })
      .finally(function(){ btn.disabled = false; btn.textContent = 'Entrar'; });
    return false;
  };

  GA.criarConta = function(ev){
    ev.preventDefault();
    var nome  = GA.$('#cd-nome').value.trim();
    var email = GA.$('#cd-email').value.trim();
    var senha = GA.$('#cd-senha').value;
    if (!nome) { GA.toast('Informe seu nome.', 'err'); return false; }
    if (senha.length < 8) { GA.toast('A senha precisa de ao menos 8 caracteres.', 'err'); return false; }
    var btn = GA.$('#cd-btn'); btn.disabled = true; btn.textContent = 'Criando…';
    sb.auth.signUp({ email: email, password: senha, options: { data: { nome: nome } } })
      .then(function(r){
        if (r.error) throw r.error;
        if (r.data.session) return; // logado direto — onboarding assume
        GA.toast('Conta criada! Verifique seu e-mail para confirmar e depois entre.');
        GA.mostrarAbaLogin('entrar');
      })
      .catch(function(e){ GA.erro(e, 'Criar conta'); })
      .finally(function(){ btn.disabled = false; btn.textContent = 'Criar conta'; });
    return false;
  };

  GA.mostrarAbaLogin = function(aba){
    GA.$('#form-entrar').style.display = (aba === 'entrar') ? 'block' : 'none';
    GA.$('#form-criar').style.display  = (aba === 'criar')  ? 'block' : 'none';
  };

  GA.sair = function(){
    sb.auth.signOut().then(function(){ location.reload(); });
  };

  // ---------- onboarding (§30 da concepção: pergunta como você usa) ----------
  var onbTipo = null;
  function renderOnboarding(){
    GA.$('#sidebar').style.display = 'none';
    GA.$('#topbar').style.display = 'none';
    GA.$('#content').innerHTML =
      '<div style="max-width:520px;margin:6vh auto">' +
      '<div class="brandmark"><div class="dot">GA</div><b style="font-family:var(--display)">Gestor Arena</b></div>' +
      '<h2 style="font-family:var(--display);font-size:22px;margin-bottom:6px">Como você usa o Gestor Arena?</h2>' +
      '<p style="color:var(--tx2);font-size:14px">Isso define seu espaço de trabalho. Você poderá ter os dois depois.</p>' +
      '<div class="onb-opts">' +
      opt('arena', '🏟️ Sou proprietário ou administrador de uma Arena',
          'Quadras, agenda, locatários, contratos e financeiro do espaço.') +
      opt('escola', '🎓 Tenho uma escolinha ou projeto esportivo',
          'Alunos, turmas, professores, presença e mensalidades — nas arenas onde você atua.') +
      opt('ambos', '🏟️🎓 Tenho uma Arena e também uma escolinha',
          'Cria os dois espaços, com você como proprietário de ambos.') +
      '</div>' +
      '<div id="onb-form"></div></div>';
    function opt(v, t, d){
      return '<button type="button" class="onb-opt" data-v="' + v + '"><b>' + t + '</b><span>' + d + '</span></button>';
    }
    GA.$$('.onb-opt').forEach(function(b){
      b.addEventListener('click', function(){
        GA.$$('.onb-opt').forEach(function(x){ x.classList.remove('on'); });
        b.classList.add('on');
        onbTipo = b.getAttribute('data-v');
        var f = '';
        if (onbTipo === 'arena' || onbTipo === 'ambos')
          f += '<label class="f"><span>Nome da Arena</span><input id="onb-arena" placeholder="Ex.: Arena Beach Sports"></label>';
        if (onbTipo === 'escola' || onbTipo === 'ambos')
          f += '<label class="f"><span>Nome da escolinha / projeto</span><input id="onb-escola" placeholder="Ex.: Escolinha João Futvôlei"></label>';
        f += '<button class="b" id="onb-go" type="button">Começar</button>';
        GA.$('#onb-form').innerHTML = f;
        GA.$('#onb-go').addEventListener('click', concluirOnboarding);
      });
    });
  }

  function concluirOnboarding(){
    var chamadas = [];
    if (onbTipo === 'arena' || onbTipo === 'ambos') {
      var na = (GA.$('#onb-arena').value || '').trim();
      if (!na) { GA.toast('Informe o nome da Arena.', 'err'); return; }
      chamadas.push(['arena', na]);
    }
    if (onbTipo === 'escola' || onbTipo === 'ambos') {
      var ne = (GA.$('#onb-escola').value || '').trim();
      if (!ne) { GA.toast('Informe o nome da escolinha.', 'err'); return; }
      chamadas.push(['escola', ne]);
    }
    var btn = GA.$('#onb-go'); btn.disabled = true; btn.textContent = 'Criando…';
    // sequencial de propósito: erro no 2º não desfaz o 1º, mas o contexto recarrega e mostra o que existe
    var p = Promise.resolve();
    chamadas.forEach(function(c){
      p = p.then(function(){
        return sb.rpc('criar_organizacao', { p_tipo: c[0], p_nome: c[1] })
          .then(function(r){ if (r.error) throw r.error; });
      });
    });
    p.then(function(){
      GA.toast('Espaço criado. Bem-vindo!');
      GA.$('#sidebar').style.display = '';
      GA.$('#topbar').style.display = '';
      carregarContexto();
    }).catch(function(e){
      GA.erro(e, 'Onboarding');
      btn.disabled = false; btn.textContent = 'Começar';
    });
  }

  // ---------- chrome: sidebar, switcher, chip do usuário ----------
  function renderChrome(){
    GA.$('#sidebar').style.display = '';
    GA.$('#topbar').style.display = '';
    renderNav();
    renderSwitcher();
    renderChip();
  }

  function renderNav(){
    var itens = (GA.org.tipo === 'arena')
      ? [['inicio','🏠','Início'],['agenda','📅','Agenda'],['unidades','📍','Unidades'],['quadras','🥅','Quadras'],
         ['parceiros','🤝','Parceiros'],['equipe','👥','Equipe'],['config','⚙️','Configurações']]
      : [['inicio','🏠','Início'],['agenda','📅','Agenda'],['locais','📍','Onde atuo'],
         ['parceiros','🤝','Parceiros'],['equipe','👥','Equipe'],['config','⚙️','Configurações']];
    GA.$('#nav').innerHTML = itens.map(function(i){
      return '<button type="button" class="nav-it" data-v="' + i[0] + '">' +
             '<span aria-hidden="true">' + i[1] + '</span>' + i[2] + '</button>';
    }).join('');
    GA.$$('#nav .nav-it').forEach(function(b){
      b.addEventListener('click', function(){
        GA.mostrarView(b.getAttribute('data-v'));
        GA.$('#sidebar').classList.remove('open');
        GA.$('#side-bg').classList.remove('on');
      });
    });
  }

  function renderSwitcher(){
    var el = GA.$('#org-switch');
    el.innerHTML = '<div class="t">Espaço de trabalho</div>' +
      '<div class="n"><span class="tag' + (GA.org.tipo === 'escola' ? ' escola' : '') + '">' +
      (GA.org.tipo === 'arena' ? 'Arena' : 'Escola') + '</span> ' + GA.esc(GA.org.nome) + '</div>';
    el.onclick = function(){
      if (GA.orgs.length < 2) { GA.mostrarView('config'); return; }
      GA.modal('<h3>Selecionar espaço</h3>' +
        GA.orgs.map(function(o){
          return '<button type="button" class="onb-opt' + (o.org.id === GA.org.id ? ' on' : '') +
            '" data-org="' + o.org.id + '"><b>' + GA.esc(o.org.nome) + '</b>' +
            '<span>' + (o.org.tipo === 'arena' ? 'Arena' : 'Escola') + ' · você é ' + GA.esc(o.role) + '</span></button>';
        }).join(''));
      GA.$$('#modal-bg .onb-opt').forEach(function(b){
        b.addEventListener('click', function(){
          GA.fecharModal();
          GA.definirOrg(b.getAttribute('data-org'));
        });
      });
    };
  }

  function renderChip(){
    var quem = GA.$('#user-chip');
    var nome = (GA.profile && GA.profile.nome) || GA.user.email;
    var foto = GA.profile && GA.profile.foto_url;
    quem.innerHTML =
      '<div class="who"><b>' + GA.esc(nome) + '</b><span>' + GA.esc(papelRotulo(GA.role)) + '</span></div>' +
      '<div class="av">' + (foto ? '<img alt="" src="' + GA.esc(foto) + '">' : GA.esc(GA.iniciais(nome))) + '</div>';
    quem.onclick = abrirFichaPropria;
  }

  function papelRotulo(r){
    var m = { owner:'Proprietário', admin:'Administrador', gerente:'Gerente', financeiro:'Financeiro',
              recepcao:'Recepção', operacional:'Operacional', coordenador:'Coordenador',
              professor:'Professor', visualizador:'Visualizador' };
    return m[r] || r || '';
  }
  GA.papelRotulo = papelRotulo;

  // ---------- ficha própria (clicar no chip abre para edição — §8.1) ----------
  var fotoPendente = null;
  function abrirFichaPropria(){
    fotoPendente = null;
    var nome = (GA.profile && GA.profile.nome) || '';
    GA.modal('<h3>Meu perfil</h3>' +
      '<label class="f"><span>Nome</span><input id="pf-nome" value="' + GA.esc(nome) + '"></label>' +
      '<label class="f"><span>E-mail</span><input value="' + GA.esc(GA.user.email) + '" disabled></label>' +
      '<label class="f"><span>Foto (até 3 MB)</span><input id="pf-foto" type="file" accept="image/jpeg,image/png,image/webp"></label>' +
      '<div class="foot"><button type="button" class="b-ghost" onclick="GA.fecharModal()">Cancelar</button>' +
      '<button type="button" class="b" id="pf-save">Salvar</button></div>');
    GA.$('#pf-foto').addEventListener('change', function(e){
      var f = e.target.files[0];
      if (f && f.size > 3 * 1024 * 1024) { GA.toast('A foto passa de 3 MB.', 'err'); e.target.value = ''; return; }
      fotoPendente = f || null;   // só sobe AO SALVAR — cancelar não deixa lixo no Storage
    });
    GA.$('#pf-save').addEventListener('click', salvarFicha);
  }

  function salvarFicha(){
    var btn = GA.$('#pf-save'); btn.disabled = true; btn.textContent = 'Salvando…';
    var nome = GA.$('#pf-nome').value.trim();
    var p = Promise.resolve(null);
    if (fotoPendente) {
      var ext = (fotoPendente.name.split('.').pop() || 'jpg').toLowerCase();
      var path = GA.org.id + '/' + GA.user.id + '-' + Date.now() + '.' + ext;
      p = sb.storage.from('avatars').upload(path, fotoPendente, { upsert: true })
        .then(function(r){
          if (r.error) throw r.error;
          return sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
        });
    }
    p.then(function(url){
      var upd = { id: GA.user.id, nome: nome, email: GA.user.email };
      if (url) upd.foto_url = url;
      return sb.from('profiles').upsert(upd).then(function(r){ if (r.error) throw r.error; });
    }).then(function(){
      return sb.from('profiles').select('*').eq('id', GA.user.id).maybeSingle();
    }).then(function(r){
      GA.profile = r.data || GA.profile;
      renderChip();
      GA.fecharModal();
      GA.toast('Perfil atualizado.');
    }).catch(function(e){
      GA.erro(e, 'Perfil');
      btn.disabled = false; btn.textContent = 'Salvar';
    });
  }
})();
