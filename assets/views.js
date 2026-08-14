// GESTOR ARENA — views da fundação (Lote 0)
(function(){
  'use strict';
  var sb = GA.sb;
  var viewAtual = 'inicio';

  GA.mostrarView = function(v){
    viewAtual = v;
    GA.$$('#nav .nav-it').forEach(function(b){
      b.classList.toggle('on', b.getAttribute('data-v') === v);
    });
    var titulos = { inicio:'Início', agenda:'Agenda', unidades:'Unidades', quadras:'Quadras', locais:'Onde atuo',
                    parceiros:'Parceiros', equipe:'Equipe', config:'Configurações' };
    GA.$('#view-title').textContent = titulos[v] || '';
    GA.$('#content').innerHTML = '<div class="loading">Carregando…</div>';
    var fnMap = { inicio: vInicio, unidades: vUnidades, quadras: vQuadras, locais: vLocais,
               parceiros: vParceiros, equipe: vEquipe, config: vConfig };
    // views registradas por outros arquivos (ex.: agenda.js)
    if (GA._views) for (var k in GA._views) fnMap[k] = GA._views[k];
    var fn = fnMap[v];
    if (!fn) return;
    var pr = fn();
    if (pr && typeof pr.catch === 'function') pr.catch(function(e){   // views síncronas retornam undefined
      GA.erro(e, 'Falha ao carregar a tela');
      GA.$('#content').innerHTML =
        '<div class="empty"><div class="ico">⚠️</div><b>Não foi possível carregar</b>' +
        '<p>Verifique sua conexão e tente de novo.</p>' +
        '<button class="b-ghost" type="button" onclick="GA.mostrarView(\'' + v + '\')">Tentar novamente</button></div>';
    });
  };

  function pintar(html){ if (html !== undefined) GA.$('#content').innerHTML = html; }
  function q(tabela){ return sb.from(tabela).select('*').eq('org_id', GA.org.id); }

  // ---------- INÍCIO — painel de comando orientado a ação (§31 da concepção) ----------
  function saudacao(){ var h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; }
  function hojeISO(){ var d = new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function hh(t){ return String(t||'').slice(0,5); }
  var TIPO_ROT = { aula:'Aula / Escolinha', locacao:'Reserva avulsa', evento:'Evento',
                   manutencao:'Manutenção', bloqueio:'Bloqueio', cortesia:'Cortesia' };

  function vInicio(){
    var ehArena = GA.org.tipo === 'arena';
    return Promise.all([
      sb.rpc('agenda_quadras', { p_org: GA.org.id }),
      sb.rpc('meus_vinculos', { p_org: GA.org.id }),
      sb.from('memberships').select('user_id').eq('org_id', GA.org.id).eq('ativo', true),
      ehArena ? q('courts') : q('external_venues')
    ]).then(function(rs){
      rs.forEach(function(r){ if (r.error) throw r.error; });
      var quadras = rs[0].data || [], links = rs[1].data || [], eq = rs[2].data || [], estr = rs[3].data || [];
      var ativos = links.filter(function(l){ return l.status === 'ativo'; });
      var pendentes = links.filter(function(l){ return l.status === 'pendente' && !l.eu_criei; });
      var courtIds = quadras.map(function(x){ return x.court_id; });
      var nomeCourt = {}; quadras.forEach(function(x){ nomeCourt[x.court_id] = x.court_nome + (x.sou_dono ? '' : ' · ' + x.arena_nome); });

      var pRes = courtIds.length
        ? sb.rpc('agenda_reservas', { p_org: GA.org.id, p_court_ids: courtIds, p_de: hojeISO(), p_ate: hojeISO() })
        : Promise.resolve({ data: [], error: null });

      return pRes.then(function(rr){
        if (rr.error) throw rr.error;
        var hoje = (rr.data || []).sort(function(a,b){ return a.hora_inicio < b.hora_inicio ? -1 : 1; });

        // ocupação de hoje = horas reservadas / (quadras × 16h de jornada)
        var horasReservadas = hoje.reduce(function(s,x){
          var hi = parseInt(hh(x.hora_inicio),10), hf = parseInt(hh(x.hora_fim),10); if (hf<=hi) hf+=24;
          return s + (hf - hi);
        }, 0);
        var capacidade = Math.max(1, courtIds.length) * 16;
        var ocup = Math.min(100, Math.round(horasReservadas / capacidade * 100));

        var stats = ehArena
          ? [['📅','Reservas hoje', hoje.length],
             ['🏟️','Ocupação hoje', ocup + '%'],
             ['🤝','Parcerias ativas', ativos.length],
             ['⚠️','Pendências', pendentes.length]]
          : [['📅','Aulas hoje', hoje.filter(function(x){return x.sou_dono;}).length],
             ['🏟️','Arenas parceiras', ativos.length],
             ['👥','Equipe', eq.length],
             ['⚠️','Pendências', pendentes.length]];

        var nome = ((GA.profile && GA.profile.nome) || '').split(' ')[0] || 'bem-vindo';
        var html = '<div class="hello"><h2>' + saudacao() + ', ' + GA.esc(nome) + ' 👋</h2>' +
          '<p>Veja o que está acontecendo hoje na sua ' + (ehArena?'Arena':'escola') + '.</p></div>';

        html += '<div class="cards">' + stats.map(function(s){
          return '<div class="stat"><div class="ico">' + s[0] + '</div>' +
            '<div class="n">' + s[2] + '</div><div class="l">' + s[1] + '</div></div>';
        }).join('') + '</div>';

        html += '<div class="grid2">';
        // Sua Arena hoje
        html += '<div class="panel"><h3>' + (ehArena?'Sua Arena hoje':'Sua escola hoje') +
          '<a href="#" data-go="agenda" class="lnk">ver agenda →</a></h3>';
        if (!hoje.length) {
          html += '<div class="empty" style="padding:20px"><b>Nenhuma reserva para hoje</b>' +
            '<p>Que tal abrir a agenda e organizar o dia?</p>' +
            (GA.podeAgenda() ? '<button type="button" class="b" onclick="GA.mostrarView(\'agenda\')">Abrir agenda</button>' : '') + '</div>';
        } else {
          html += '<div class="today">' + hoje.slice(0,7).map(function(x){
            var titulo = x.titulo || TIPO_ROT[x.tipo] || 'Reserva';
            var quem = x.sou_dono ? (TIPO_ROT[x.tipo]||'') : (x.dono_nome || 'Ocupado');
            return '<div class="today-it"><div class="th">' + hh(x.hora_inicio) + '</div>' +
              '<div class="tb"><b>' + GA.esc(nomeCourt[x.court_id] || 'Quadra') + '</b>' +
              '<span>' + GA.esc(titulo) + (quem?' · '+GA.esc(quem):'') + '</span></div></div>';
          }).join('') + '</div>';
        }
        html += '</div>';

        // Precisa da sua atenção
        var aten = [];
        pendentes.forEach(function(l){
          aten.push(['🤝','<b>' + GA.esc(l.parceiro_nome||'Organização') + '</b> quer se vincular a você', 'parceiros']);
        });
        if (ehArena && !estr.filter(function(x){return x.ativo;}).length)
          aten.push(['🥅','Cadastre suas quadras para começar a agendar', 'quadras']);
        if (!ehArena && !ativos.length && !estr.length)
          aten.push(['📍','Diga onde você atua — arenas parceiras ou locais externos', 'locais']);
        if (eq.length <= 1)
          aten.push(['👥','Traga sua equipe para dentro do sistema', 'equipe']);
        if (ehArena && courtIds.length && ocup < 40)
          aten.push(['💡','Você tem bastante horário livre hoje — divulgue e preencha a agenda', 'agenda']);

        html += '<div class="panel"><h3>Precisa da sua atenção</h3>';
        html += aten.length
          ? '<div class="aten">' + aten.map(function(a){
              return '<a href="#" data-go="' + a[2] + '" class="aten-it"><span class="ai">' + a[0] + '</span>' +
                '<span>' + a[1] + '</span></a>';
            }).join('') + '</div>'
          : '<div class="empty" style="padding:20px"><b>Tudo em dia ✅</b><p>Nenhuma pendência aguardando você.</p></div>';
        html += '</div></div>';

        html += '<div class="panel"><h3>Seu código de parceria</h3>' +
          '<p style="font-size:13px;color:var(--tx2);margin-bottom:10px">' +
          (ehArena ? 'Escolinhas usam este código para se vincular à sua Arena.'
                   : 'Arenas usam este código para se vincular à sua escolinha.') + '</p>' +
          slugBox() + '</div>';
        pintar(html);
        ligarAtalhos();
      });
    });
  }

  function slugBox(){
    return '<div class="slugbox"><code id="slug-code">' + GA.esc(GA.org.slug) + '</code>' +
      '<button type="button" class="b-sm" onclick="GA.copiarSlug()">Copiar</button></div>';
  }
  GA.copiarSlug = function(){
    var el = GA.$('#slug-code');
    (navigator.clipboard ? navigator.clipboard.writeText(el.textContent) : Promise.reject())
      .then(function(){ GA.toast('Código copiado.'); })
      .catch(function(){ GA.toast('Copie manualmente: ' + el.textContent); });
  };
  function ligarAtalhos(){
    GA.$$('#content a[data-go]').forEach(function(a){
      a.addEventListener('click', function(e){ e.preventDefault(); GA.mostrarView(a.getAttribute('data-go')); });
    });
  }

  // ---------- UNIDADES (arena) ----------
  function vUnidades(){
    return q('units').order('criado_em').then(function(r){
      if (r.error) throw r.error;
      var lst = r.data || [];
      var html = '<div class="panel"><h3>Unidades' + btnNovo('GA.editarUnidade()', 'Nova unidade') + '</h3>';
      if (!lst.length) {
        html += vazio('📍', 'Nenhuma unidade ainda',
          'Unidade é o endereço físico da Arena. Cadastre a primeira para depois criar as quadras.',
          'GA.editarUnidade()', 'Cadastrar unidade');
      } else {
        html += '<table class="tb"><thead><tr><th>Nome</th><th>Endereço</th><th>Situação</th><th></th></tr></thead><tbody>' +
          lst.map(function(u){
            return '<tr><td data-l="Nome"><b>' + GA.esc(u.nome) + '</b></td>' +
              '<td data-l="Endereço">' + GA.esc([u.endereco, u.cidade, u.uf].filter(Boolean).join(' · ') || '—') + '</td>' +
              '<td data-l="Situação">' + chipAtivo(u.ativo) + '</td>' +
              '<td class="list-actions">' + (GA.podeEditar()
                ? '<button type="button" class="b-sm" onclick=\'GA.editarUnidade(' + JSON.stringify(u.id) + ')\'>Editar</button>' : '') +
              '</td></tr>';
          }).join('') + '</tbody></table>';
      }
      pintar(html + '</div>');
      GA._units = lst;
    });
  }

  GA.editarUnidade = function(id){
    var u = (GA._units || []).filter(function(x){ return x.id === id; })[0] || {};
    GA.modal('<h3>' + (id ? 'Editar unidade' : 'Nova unidade') + '</h3>' +
      '<label class="f"><span>Nome *</span><input id="un-nome" value="' + GA.esc(u.nome || '') + '"></label>' +
      '<label class="f"><span>Endereço</span><input id="un-end" value="' + GA.esc(u.endereco || '') + '"></label>' +
      '<div class="row2"><label class="f"><span>Cidade</span><input id="un-cid" value="' + GA.esc(u.cidade || '') + '"></label>' +
      '<label class="f"><span>UF</span><input id="un-uf" maxlength="2" value="' + GA.esc(u.uf || '') + '"></label></div>' +
      (id ? '<label class="f"><span>Situação</span><select id="un-ativo"><option value="true"' + (u.ativo ? ' selected' : '') + '>Ativa</option><option value="false"' + (!u.ativo ? ' selected' : '') + '>Inativa</option></select></label>' : '') +
      '<div class="foot"><button type="button" class="b-ghost" onclick="GA.fecharModal()">Cancelar</button>' +
      '<button type="button" class="b" id="un-save">Salvar</button></div>');
    GA.$('#un-save').addEventListener('click', function(){
      var nome = GA.$('#un-nome').value.trim();
      if (!nome) { GA.toast('Nome é obrigatório.', 'err'); return; }
      var dados = { org_id: GA.org.id, nome: nome,
        endereco: GA.$('#un-end').value.trim() || null,
        cidade: GA.$('#un-cid').value.trim() || null,
        uf: GA.$('#un-uf').value.trim().toUpperCase() || null };
      if (id) dados.ativo = GA.$('#un-ativo').value === 'true';
      salvar('units', id, dados, 'unidades');
    });
  };

  // ---------- QUADRAS (arena) ----------
  function vQuadras(){
    return Promise.all([
      q('courts').order('criado_em'),
      q('units').eq('ativo', true).order('nome'),
      sb.from('sports').select('*').eq('ativo', true).order('nome')
    ]).then(function(rs){
      for (var i = 0; i < rs.length; i++) if (rs[i].error) throw rs[i].error;
      var courts = rs[0].data || []; GA._courts = courts;
      GA._units = rs[1].data || []; GA._sports = rs[2].data || [];
      var html = '<div class="panel"><h3>Quadras e espaços' + btnNovo('GA.editarQuadra()', 'Nova quadra') + '</h3>';
      if (!GA._units.length) {
        html += vazio('📍', 'Antes, cadastre uma unidade',
          'Toda quadra pertence a uma unidade (o endereço da Arena).',
          "GA.mostrarView('unidades')", 'Ir para Unidades');
      } else if (!courts.length) {
        html += vazio('🥅', 'Nenhuma quadra ainda',
          'Cadastre suas quadras com a modalidade de cada uma — Futvôlei, Beach Tennis, Futebol e o que mais vier.',
          'GA.editarQuadra()', 'Cadastrar quadra');
      } else {
        html += '<table class="tb"><thead><tr><th>Quadra</th><th>Unidade</th><th>Modalidade</th><th>Estrutura</th><th>Situação</th><th></th></tr></thead><tbody>' +
          courts.map(function(c){
            var un = GA._units.filter(function(u){ return u.id === c.unit_id; })[0];
            var sp = GA._sports.filter(function(s){ return s.id === c.sport_id; })[0];
            var estrut = [c.coberta ? 'coberta' : null, c.iluminacao ? 'iluminação' : null]
              .filter(Boolean).join(' · ') || '—';
            return '<tr><td data-l="Quadra"><b>' + GA.esc(c.nome) + '</b></td>' +
              '<td data-l="Unidade">' + GA.esc(un ? un.nome : '—') + '</td>' +
              '<td data-l="Modalidade">' + GA.esc(sp ? sp.nome : '—') + '</td>' +
              '<td data-l="Estrutura">' + GA.esc(estrut) + '</td>' +
              '<td data-l="Situação">' + chipAtivo(c.ativo) + '</td>' +
              '<td class="list-actions">' + (GA.podeEditar()
                ? '<button type="button" class="b-sm" onclick=\'GA.editarQuadra(' + JSON.stringify(c.id) + ')\'>Editar</button>' : '') +
              '</td></tr>';
          }).join('') + '</tbody></table>';
      }
      pintar(html + '</div>');
    });
  }

  GA.editarQuadra = function(id){
    if (!(GA._units || []).length) { GA.mostrarView('unidades'); return; }
    var c = (GA._courts || []).filter(function(x){ return x.id === id; })[0] || {};
    GA.modal('<h3>' + (id ? 'Editar quadra' : 'Nova quadra') + '</h3>' +
      '<label class="f"><span>Nome *</span><input id="qd-nome" placeholder="Ex.: Quadra 01" value="' + GA.esc(c.nome || '') + '"></label>' +
      '<div class="row2">' +
      '<label class="f"><span>Unidade *</span><select id="qd-unit">' +
        GA._units.map(function(u){ return '<option value="' + u.id + '"' + (u.id === c.unit_id ? ' selected' : '') + '>' + GA.esc(u.nome) + '</option>'; }).join('') +
      '</select></label>' +
      '<label class="f"><span>Modalidade</span><select id="qd-sport"><option value="">—</option>' +
        GA._sports.map(function(s){ return '<option value="' + s.id + '"' + (s.id === c.sport_id ? ' selected' : '') + '>' + GA.esc(s.nome) + '</option>'; }).join('') +
      '</select></label></div>' +
      '<div class="row2">' +
      '<label class="f"><span>Capacidade (pessoas)</span><input id="qd-cap" type="number" min="1" value="' + (c.capacidade || '') + '"></label>' +
      '<label class="f"><span>Estrutura</span><div style="display:flex;gap:14px;padding-top:9px">' +
      '<label style="display:flex;gap:6px;font-size:13px"><input style="width:auto" type="checkbox" id="qd-cob"' + (c.coberta ? ' checked' : '') + '>Coberta</label>' +
      '<label style="display:flex;gap:6px;font-size:13px"><input style="width:auto" type="checkbox" id="qd-ilu"' + (c.iluminacao ? ' checked' : '') + '>Iluminação</label>' +
      '</div></label></div>' +
      '<label class="f"><span>Observações</span><textarea id="qd-obs" rows="2">' + GA.esc(c.obs || '') + '</textarea></label>' +
      (id ? '<label class="f"><span>Situação</span><select id="qd-ativo"><option value="true"' + (c.ativo ? ' selected' : '') + '>Ativa</option><option value="false"' + (!c.ativo ? ' selected' : '') + '>Inativa</option></select></label>' : '') +
      '<div class="foot"><button type="button" class="b-ghost" onclick="GA.fecharModal()">Cancelar</button>' +
      '<button type="button" class="b" id="qd-save">Salvar</button></div>');
    GA.$('#qd-save').addEventListener('click', function(){
      var nome = GA.$('#qd-nome').value.trim();
      if (!nome) { GA.toast('Nome é obrigatório.', 'err'); return; }
      var cap = parseInt(GA.$('#qd-cap').value, 10);
      var dados = { org_id: GA.org.id, nome: nome,
        unit_id: GA.$('#qd-unit').value,
        sport_id: GA.$('#qd-sport').value || null,
        capacidade: (cap > 0 ? cap : null),
        coberta: GA.$('#qd-cob').checked,
        iluminacao: GA.$('#qd-ilu').checked,
        obs: GA.$('#qd-obs').value.trim() || null };
      if (id) dados.ativo = GA.$('#qd-ativo').value === 'true';
      salvar('courts', id, dados, 'quadras');
    });
  };

  // ---------- ONDE ATUO (escola): arenas parceiras + locais externos ----------
  function vLocais(){
    return Promise.all([
      sb.rpc('meus_vinculos', { p_org: GA.org.id }),
      q('external_venues').order('criado_em')
    ]).then(function(rs){
      if (rs[0].error) throw rs[0].error;
      if (rs[1].error) throw rs[1].error;
      var parceiras = (rs[0].data || []).filter(function(l){ return l.status === 'ativo'; });
      var externos = rs[1].data || []; GA._venues = externos;

      var html = '<div class="panel"><h3>Arenas parceiras (no Gestor Arena)</h3>';
      html += parceiras.length
        ? '<table class="tb"><thead><tr><th>Arena</th><th>Cidade</th><th></th></tr></thead><tbody>' +
          parceiras.map(function(l){
            return '<tr><td data-l="Arena"><b>' + GA.esc(l.parceiro_nome || '—') + '</b></td>' +
              '<td data-l="Cidade">' + GA.esc([l.parceiro_cidade, l.parceiro_uf].filter(Boolean).join('/') || '—') + '</td>' +
              '<td class="list-actions">' +
              (l.parceiro_telefone ? GA.waBtn(l.parceiro_telefone, 'Olá! Somos da ' + GA.org.nome + ', parceiros pelo Gestor Arena.') : '') +
              '</td></tr>';
          }).join('') + '</tbody></table>'
        : '<div class="empty" style="padding:18px"><b>Nenhuma arena parceira ainda</b>' +
          '<p>Quando uma Arena que usa o Gestor Arena aceitar seu vínculo, ela aparece aqui — e as quadras dela ficam visíveis para você (a agenda compartilhada chega no próximo módulo).</p>' +
          '<button type="button" class="b-ghost" onclick="GA.mostrarView(\'parceiros\')">Convidar uma arena</button></div>';
      html += '</div>';

      html += '<div class="panel"><h3>Locais externos' + btnNovo('GA.editarLocal()', 'Novo local') + '</h3>';
      html += externos.length
        ? '<table class="tb"><thead><tr><th>Local</th><th>Endereço</th><th>Situação</th><th></th></tr></thead><tbody>' +
          externos.map(function(v){
            return '<tr><td data-l="Local"><b>' + GA.esc(v.nome) + '</b></td>' +
              '<td data-l="Endereço">' + GA.esc([v.endereco, v.cidade, v.uf].filter(Boolean).join(' · ') || '—') + '</td>' +
              '<td data-l="Situação">' + chipAtivo(v.ativo) + '</td>' +
              '<td class="list-actions">' +
              (v.telefone ? GA.waBtn(v.telefone, 'Olá! Aqui é da ' + GA.org.nome + '.') : '') +
              (GA.podeEditar() ? '<button type="button" class="b-sm" onclick=\'GA.editarLocal(' + JSON.stringify(v.id) + ')\'>Editar</button>' : '') +
              '</td></tr>';
          }).join('') + '</tbody></table>'
        : '<div class="empty" style="padding:18px"><b>Nenhum local externo</b>' +
          '<p>Arena que ainda não usa o Gestor Arena? Cadastre como local externo e siga trabalhando normalmente.</p>' +
          '<button type="button" class="b" onclick="GA.editarLocal()">Cadastrar local</button></div>';
      pintar(html + '</div>');
    });
  }

  GA.editarLocal = function(id){
    var v = (GA._venues || []).filter(function(x){ return x.id === id; })[0] || {};
    GA.modal('<h3>' + (id ? 'Editar local' : 'Novo local externo') + '</h3>' +
      '<label class="f"><span>Nome *</span><input id="lc-nome" placeholder="Ex.: Arena XPTO" value="' + GA.esc(v.nome || '') + '"></label>' +
      '<label class="f"><span>Endereço</span><input id="lc-end" value="' + GA.esc(v.endereco || '') + '"></label>' +
      '<div class="row2"><label class="f"><span>Cidade</span><input id="lc-cid" value="' + GA.esc(v.cidade || '') + '"></label>' +
      '<label class="f"><span>UF</span><input id="lc-uf" maxlength="2" value="' + GA.esc(v.uf || '') + '"></label></div>' +
      '<label class="f"><span>Telefone (WhatsApp)</span><input id="lc-tel" value="' + GA.esc(v.telefone || '') + '"></label>' +
      '<label class="f"><span>Observações</span><textarea id="lc-obs" rows="2">' + GA.esc(v.obs || '') + '</textarea></label>' +
      (id ? '<label class="f"><span>Situação</span><select id="lc-ativo"><option value="true"' + (v.ativo ? ' selected' : '') + '>Ativo</option><option value="false"' + (!v.ativo ? ' selected' : '') + '>Inativo</option></select></label>' : '') +
      '<div class="foot"><button type="button" class="b-ghost" onclick="GA.fecharModal()">Cancelar</button>' +
      '<button type="button" class="b" id="lc-save">Salvar</button></div>');
    GA.$('#lc-save').addEventListener('click', function(){
      var nome = GA.$('#lc-nome').value.trim();
      if (!nome) { GA.toast('Nome é obrigatório.', 'err'); return; }
      var dados = { org_id: GA.org.id, nome: nome,
        endereco: GA.$('#lc-end').value.trim() || null,
        cidade: GA.$('#lc-cid').value.trim() || null,
        uf: GA.$('#lc-uf').value.trim().toUpperCase() || null,
        telefone: GA.$('#lc-tel').value.trim() || null,
        obs: GA.$('#lc-obs').value.trim() || null };
      if (id) dados.ativo = GA.$('#lc-ativo').value === 'true';
      salvar('external_venues', id, dados, 'locais');
    });
  };

  // ---------- PARCEIROS (vínculo Arena–Escola) ----------
  function vParceiros(){
    var ehArena = GA.org.tipo === 'arena';
    var pode = GA.podeVincular();   // owner/admin/gerente — alinhado ao RPC (P3 #7)
    return sb.rpc('meus_vinculos', { p_org: GA.org.id })
      .then(function(r){
        if (r.error) throw r.error;
        var links = r.data || []; GA._links = links;
        var vivos = links.filter(function(l){ return l.status !== 'encerrado'; });

        var html = '<div class="panel"><h3>' +
          (ehArena ? 'Escolinhas e profissionais parceiros' : 'Arenas parceiras') +
          (pode ? '<button type="button" class="b" onclick="GA.novoVinculo()">Convidar parceiro</button>' : '') + '</h3>';
        if (!vivos.length) {
          html += '<div class="empty"><div class="ico">🤝</div><b>Nenhum vínculo ainda</b>' +
            '<p>' + (ehArena
              ? 'Convide as escolinhas que alugam suas quadras — cada lado vê só o que a parceria compartilha.'
              : 'Convide as arenas onde você dá aula — a agenda de vocês passa a conversar.') + '</p>' +
            (pode ? '<button type="button" class="b" onclick="GA.novoVinculo()">Convidar parceiro</button>' : '') +
            '</div>';
        } else {
          html += '<table class="tb"><thead><tr><th>' + (ehArena ? 'Escolinha' : 'Arena') +
            '</th><th>Cidade</th><th>Status</th><th></th></tr></thead><tbody>' +
            vivos.map(function(l){
              var chip = l.status === 'ativo' ? '<span class="chip ok">Ativo</span>'
                       : l.status === 'pendente' ? '<span class="chip warn">Pendente</span>'
                       : '<span class="chip off">' + GA.esc(l.status) + '</span>';
              var acoes = '';
              if (pode) {
                if (l.status === 'pendente' && !l.eu_criei) {
                  acoes = '<button type="button" class="b-sm" onclick=\'GA.responderVinculo(' + JSON.stringify(l.id) + ',"aceitar")\'>Aceitar</button>' +
                          '<button type="button" class="b-sm danger" onclick=\'GA.responderVinculo(' + JSON.stringify(l.id) + ',"recusar")\'>Recusar</button>';
                } else if (l.status === 'pendente') {
                  acoes = '<span style="font-size:12px;color:var(--tx3)">aguardando o outro lado</span>';
                } else {
                  acoes = '<button type="button" class="b-sm danger" onclick=\'GA.responderVinculo(' + JSON.stringify(l.id) + ',"encerrar")\'>Encerrar</button>';
                }
              }
              return '<tr><td data-l="' + (ehArena ? 'Escolinha' : 'Arena') + '"><b>' + GA.esc(l.parceiro_nome || '—') + '</b></td>' +
                '<td data-l="Cidade">' + GA.esc([l.parceiro_cidade, l.parceiro_uf].filter(Boolean).join('/') || '—') + '</td>' +
                '<td data-l="Status">' + chip + '</td>' +
                '<td class="list-actions">' + acoes + '</td></tr>';
            }).join('') + '</tbody></table>';
        }
        html += '</div><div class="panel"><h3>Seu código de parceria</h3>' + slugBox() + '</div>';
        pintar(html);
      });
  }

  GA.novoVinculo = function(){
    var ehArena = GA.org.tipo === 'arena';
    GA.modal('<h3>Convidar ' + (ehArena ? 'escolinha' : 'arena') + '</h3>' +
      '<p style="font-size:13px;color:var(--tx2);margin-bottom:14px">Peça o <b>código de parceria</b> do outro lado (ele aparece no Início do sistema dele) e cole aqui.</p>' +
      '<label class="f"><span>Código de parceria</span><input id="vc-slug" placeholder="ex.: escolinha-joao-a1b2c3"></label>' +
      '<div id="vc-preview"></div>' +
      '<div class="foot"><button type="button" class="b-ghost" onclick="GA.fecharModal()">Cancelar</button>' +
      '<button type="button" class="b" id="vc-go">Enviar convite</button></div>');
    GA.$('#vc-slug').addEventListener('change', function(){
      var s = GA.$('#vc-slug').value.trim();
      if (!s) return;
      sb.rpc('buscar_organizacao', { p_slug: s }).then(function(r){
        var d = (r.data || [])[0];
        GA.$('#vc-preview').innerHTML = d
          ? '<div class="slugbox" style="margin-bottom:6px"><code>' + GA.esc(d.nome) + ' — ' +
            (d.tipo === 'arena' ? 'Arena' : 'Escola') + (d.cidade ? ' · ' + GA.esc(d.cidade) : '') + '</code></div>'
          : '<p style="font-size:13px;color:var(--err)">Nenhuma organização com este código.</p>';
      });
    });
    GA.$('#vc-go').addEventListener('click', function(){
      var s = GA.$('#vc-slug').value.trim();
      if (!s) { GA.toast('Cole o código de parceria.', 'err'); return; }
      var btn = GA.$('#vc-go'); btn.disabled = true;
      sb.rpc('solicitar_vinculo', { p_minha_org: GA.org.id, p_slug_alvo: s })
        .then(function(r){
          if (r.error) throw r.error;
          GA.fecharModal();
          GA.toast('Convite enviado. O outro lado precisa aceitar.');
          GA.mostrarView('parceiros');
        })
        .catch(function(e){
          btn.disabled = false;
          GA.erro(e, 'Vínculo');
        });
    });
  };

  GA.responderVinculo = function(id, acao){
    var rotulo = { aceitar: 'aceitar esta parceria', recusar: 'recusar este convite', encerrar: 'encerrar esta parceria' }[acao];
    GA.modal('<h3>Confirmar</h3><p style="font-size:14px">Tem certeza que deseja ' + rotulo + '?</p>' +
      '<div class="foot"><button type="button" class="b-ghost" onclick="GA.fecharModal()">Voltar</button>' +
      '<button type="button" class="b" id="rv-go">Confirmar</button></div>');
    GA.$('#rv-go').addEventListener('click', function(){
      sb.rpc('responder_vinculo', { p_link: id, p_acao: acao })
        .then(function(r){
          if (r.error) throw r.error;
          GA.fecharModal();
          GA.toast(acao === 'aceitar' ? 'Parceria ativa! 🎉' : 'Feito.');
          GA.mostrarView('parceiros');
        })
        .catch(function(e){ GA.fecharModal(); GA.erro(e, 'Vínculo'); });
    });
  };

  // ---------- EQUIPE ----------
  function vEquipe(){
    return sb.from('memberships').select('user_id, role, ativo, profiles:user_id(nome, email, foto_url)')
      .eq('org_id', GA.org.id).order('criado_em')
      .then(function(r){
        if (r.error) throw r.error;
        var lst = (r.data || []).filter(function(m){ return m.ativo; });
        GA._equipe = lst;
        var html = '<div class="panel"><h3>Equipe' +
          (GA.podeAdmin() ? '<button type="button" class="b" onclick="GA.addMembro()">Adicionar pessoa</button>' : '') + '</h3>' +
          '<table class="tb"><thead><tr><th></th><th>Nome</th><th>E-mail</th><th>Papel</th><th></th></tr></thead><tbody>' +
          lst.map(function(m){
            var p = m.profiles || {};
            var nome = p.nome || p.email || m.user_id.slice(0, 8);
            var av = p.foto_url
              ? '<img alt="" src="' + GA.esc(p.foto_url) + '">'
              : GA.esc(GA.iniciais(nome));
            return '<tr><td data-l=""><div class="av" style="width:32px;height:32px;border-radius:50%;overflow:hidden;background:linear-gradient(135deg,var(--green),var(--sand));display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#0B0D0C">' + av + '</div></td>' +
              '<td data-l="Nome"><b>' + GA.esc(nome) + '</b>' + (m.user_id === GA.user.id ? ' <span class="chip off">você</span>' : '') + '</td>' +
              '<td data-l="E-mail">' + GA.esc(p.email || '—') + '</td>' +
              '<td data-l="Papel">' + GA.esc(GA.papelRotulo(m.role)) + '</td>' +
              '<td class="list-actions">' +
              (GA.podeAdmin() && m.user_id !== GA.user.id && m.role !== 'owner'
                ? '<button type="button" class="b-sm" onclick=\'GA.editarMembro(' + JSON.stringify(m.user_id) + ')\'>Papel</button>' +
                  '<button type="button" class="b-sm danger" onclick=\'GA.removerMembro(' + JSON.stringify(m.user_id) + ')\'>Remover</button>'
                : '') +
              '</td></tr>';
          }).join('') + '</tbody></table></div>';
        pintar(html);
      });
  }

  var PAPEIS_ATRIB = ['admin','gerente','financeiro','recepcao','operacional','coordenador','professor','visualizador'];
  function selectPapel(atual){
    return '<select id="mb-role">' + PAPEIS_ATRIB.map(function(p){
      return '<option value="' + p + '"' + (p === atual ? ' selected' : '') + '>' + GA.papelRotulo(p) + '</option>';
    }).join('') + '</select>';
  }

  GA.addMembro = function(){
    GA.modal('<h3>Adicionar pessoa</h3>' +
      '<p style="font-size:13px;color:var(--tx2);margin-bottom:14px">A pessoa precisa <b>já ter conta</b> no Gestor Arena (basta ela criar a conta grátis na tela de entrada).</p>' +
      '<label class="f"><span>E-mail da pessoa</span><input id="mb-email" type="email"></label>' +
      '<label class="f"><span>Papel</span>' + selectPapel('visualizador') + '</label>' +
      '<div class="foot"><button type="button" class="b-ghost" onclick="GA.fecharModal()">Cancelar</button>' +
      '<button type="button" class="b" id="mb-go">Adicionar</button></div>');
    GA.$('#mb-go').addEventListener('click', function(){
      var email = GA.$('#mb-email').value.trim();
      if (!email) { GA.toast('Informe o e-mail.', 'err'); return; }
      sb.rpc('adicionar_membro', { p_org: GA.org.id, p_email: email, p_role: GA.$('#mb-role').value })
        .then(function(r){
          if (r.error) throw r.error;
          GA.fecharModal(); GA.toast('Pessoa adicionada à equipe.');
          GA.mostrarView('equipe');
        })
        .catch(function(e){ GA.erro(e, 'Equipe'); });
    });
  };

  GA.editarMembro = function(userId){
    var m = (GA._equipe || []).filter(function(x){ return x.user_id === userId; })[0];
    if (!m) return;
    GA.modal('<h3>Papel de ' + GA.esc((m.profiles && m.profiles.nome) || 'membro') + '</h3>' +
      '<label class="f"><span>Papel</span>' + selectPapel(m.role) + '</label>' +
      '<div class="foot"><button type="button" class="b-ghost" onclick="GA.fecharModal()">Cancelar</button>' +
      '<button type="button" class="b" id="mb-go">Salvar</button></div>');
    GA.$('#mb-go').addEventListener('click', function(){
      sb.rpc('alterar_papel_membro', { p_org: GA.org.id, p_user: userId, p_role: GA.$('#mb-role').value })
        .then(function(r){
          if (r.error) throw r.error;
          GA.fecharModal(); GA.toast('Papel atualizado.');
          GA.mostrarView('equipe');
        })
        .catch(function(e){ GA.erro(e, 'Equipe'); });
    });
  };

  GA.removerMembro = function(userId){
    GA.modal('<h3>Remover da equipe</h3><p style="font-size:14px">A pessoa perde o acesso a esta organização. O histórico dela é preservado.</p>' +
      '<div class="foot"><button type="button" class="b-ghost" onclick="GA.fecharModal()">Voltar</button>' +
      '<button type="button" class="b" id="mb-go">Remover</button></div>');
    GA.$('#mb-go').addEventListener('click', function(){
      sb.rpc('remover_membro', { p_org: GA.org.id, p_user: userId })
        .then(function(r){
          if (r.error) throw r.error;
          GA.fecharModal(); GA.toast('Acesso removido.');
          GA.mostrarView('equipe');
        })
        .catch(function(e){ GA.erro(e, 'Equipe'); });
    });
  };

  // ---------- CONFIGURAÇÕES ----------
  function vConfig(){
    var o = GA.org;
    var pode = GA.podeAdmin();
    var dis = pode ? '' : ' disabled';
    pintar('<div class="panel"><h3>Dados da organização</h3>' +
      '<label class="f"><span>Nome</span><input id="cf-nome" value="' + GA.esc(o.nome) + '"' + dis + '></label>' +
      '<div class="row2">' +
      '<label class="f"><span>Telefone (WhatsApp)</span><input id="cf-tel" value="' + GA.esc(o.telefone || '') + '"' + dis + '></label>' +
      '<label class="f"><span>E-mail</span><input id="cf-email" value="' + GA.esc(o.email || '') + '"' + dis + '></label></div>' +
      '<div class="row2">' +
      '<label class="f"><span>Cidade</span><input id="cf-cid" value="' + GA.esc(o.cidade || '') + '"' + dis + '></label>' +
      '<label class="f"><span>UF</span><input id="cf-uf" maxlength="2" value="' + GA.esc(o.uf || '') + '"' + dis + '></label></div>' +
      (pode ? '<button type="button" class="b" id="cf-save">Salvar</button>'
            : '<p style="font-size:13px;color:var(--tx3)">Somente proprietário/administrador edita estes dados.</p>') +
      '</div>' +
      '<div class="panel"><h3>Código de parceria</h3>' + slugBox() + '</div>' +
      '<div class="panel"><h3>Sobre</h3><p style="font-size:13px;color:var(--tx2)">Gestor Arena v' + GA.esc(window.APP_VERSION) +
      ' · um produto <b>VIZIO</b> / INPERSON.</p></div>');
    if (pode) GA.$('#cf-save').addEventListener('click', function(){
      var nome = GA.$('#cf-nome').value.trim();
      if (!nome) { GA.toast('Nome é obrigatório.', 'err'); return; }
      sb.from('organizations').update({
        nome: nome,
        telefone: GA.$('#cf-tel').value.trim() || null,
        email: GA.$('#cf-email').value.trim() || null,
        cidade: GA.$('#cf-cid').value.trim() || null,
        uf: GA.$('#cf-uf').value.trim().toUpperCase() || null
      }).eq('id', o.id).then(function(r){
        if (r.error) throw r.error;
        GA.toast('Dados salvos.');
        o.nome = nome;
        return sb.from('organizations').select('*').eq('id', o.id).single();
      }).then(function(r){
        if (r && r.data) {
          GA.org = r.data;
          GA.orgs.forEach(function(x){ if (x.org.id === r.data.id) x.org = r.data; });
        }
        GA.definirOrg(o.id);
        GA.mostrarView('config');
      }).catch(function(e){ GA.erro(e, 'Configurações'); });
    });
  }

  // ---------- utilitários ----------
  function btnNovo(fn, rotulo){
    return GA.podeEditar()
      ? '<button type="button" class="b" onclick="' + fn + '">' + rotulo + '</button>' : '';
  }
  function vazio(ico, titulo, texto, fn, rotulo){
    return '<div class="empty"><div class="ico">' + ico + '</div><b>' + titulo + '</b><p>' + texto + '</p>' +
      (GA.podeEditar() ? '<button type="button" class="b" onclick="' + fn + '">' + rotulo + '</button>' : '') + '</div>';
  }
  function chipAtivo(a){
    return a ? '<span class="chip ok">Ativa</span>' : '<span class="chip off">Inativa</span>';
  }
  function salvar(tabela, id, dados, view){
    var p = id
      ? sb.from(tabela).update(dados).eq('id', id).eq('org_id', GA.org.id)
      : sb.from(tabela).insert(dados);
    p.then(function(r){
      if (r.error) throw r.error;
      GA.fecharModal();
      GA.toast('Salvo.');
      GA.mostrarView(view === 'locais' ? 'locais' : view);
    }).catch(function(e){ GA.erro(e, 'Salvar'); });
  }
})();
