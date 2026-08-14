// GESTOR ARENA — módulo Agenda (Lote 1): grade quadra × horário (dia), reservas + recorrência
(function(){
  'use strict';
  var sb = GA.sb;
  GA._views = GA._views || {};

  var dayOff = 0;       // deslocamento de dia (0 = hoje)
  var quadras = [];
  var H_INI = 6, H_FIM = 22;   // faixa de horários exibida

  var TIPOS = [
    ['aula','Escolinha / Aula','t-aula'], ['locacao','Reserva avulsa','t-loc'],
    ['evento','Evento','t-evt'], ['manutencao','Manutenção','t-man'],
    ['bloqueio','Bloqueio','t-blq'], ['cortesia','Cortesia','t-cor']
  ];
  var DIAS_SEM = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  var DIAS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  var MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  function tipoLabel(t){ var x=TIPOS.filter(function(p){return p[0]===t;})[0]; return x?x[1]:t; }
  function tipoClasse(t){ var x=TIPOS.filter(function(p){return p[0]===t;})[0]; return x?x[2]:''; }

  function addDias(d,n){ var x=new Date(d); x.setHours(0,0,0,0); x.setDate(x.getDate()+n); return x; }
  function iso(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function hhmm(t){ return String(t||'').slice(0,5); }
  function horaDe(t){ return parseInt(String(t||'0').slice(0,2),10); }

  GA._views.agenda = function(){
    return sb.rpc('agenda_quadras', { p_org: GA.org.id }).then(function(r){
      if (r.error) throw r.error;
      quadras = r.data || [];
      if (!quadras.length) { GA.$('#content').innerHTML = agendaVazia(); return; }
      return renderDia();
    });
  };

  function agendaVazia(){
    var ehArena = GA.org.tipo === 'arena';
    return '<div class="empty"><div class="ico">📅</div><b>Sua agenda ainda não tem quadras</b>' +
      '<p>' + (ehArena
        ? 'Cadastre unidades e quadras para começar a agendar horários.'
        : 'Você agenda nas quadras de arenas parceiras. Peça a uma arena para compartilhar a agenda com você.') + '</p>' +
      '<button type="button" class="b" onclick="GA.mostrarView(\'' + (ehArena?'quadras':'parceiros') + '\')">' +
      (ehArena?'Ir para Quadras':'Ver parcerias') + '</button></div>';
  }

  function renderDia(){
    var dia = addDias(new Date(), dayOff);
    var chave = iso(dia);
    var hoje = addDias(new Date(),0);
    var ids = quadras.map(function(q){ return q.court_id; });
    var pode = GA.podeAgenda();

    return sb.rpc('agenda_reservas', { p_org: GA.org.id, p_court_ids: ids, p_de: chave, p_ate: chave })
      .then(function(r){
        if (r.error) throw r.error;
        var res = r.data || [];
        GA._resIndex = {}; res.forEach(function(x){ GA._resIndex[x.id]=x; });

        // índice: por quadra, hora -> reserva que cobre (e se é a hora de início)
        var cobre = {}; // court_id -> { hora -> {res, inicio:bool} }
        quadras.forEach(function(q){ cobre[q.court_id] = {}; });
        res.forEach(function(x){
          var hi = horaDe(x.hora_inicio), hf = horaDe(x.hora_fim);
          if (hf <= hi) hf = 24;                    // vira o dia
          for (var h=hi; h<hf; h++){
            if (!cobre[x.court_id]) continue;
            cobre[x.court_id][h] = { res:x, inicio:(h===hi) };
          }
        });

        var rotuloData = DIAS_SEM[dia.getDay()] + ', ' + dia.getDate() + ' de ' + MESES[dia.getMonth()] + ' de ' + dia.getFullYear();
        var ehHoje = chave === iso(hoje);

        // barra superior
        var html = '<div class="ag-top">' +
          '<div class="ag-nav">' +
            '<button type="button" class="b-sm" id="ag-prev" aria-label="Dia anterior">‹</button>' +
            '<button type="button" class="b-sm' + (ehHoje?' on':'') + '" id="ag-hoje">Hoje</button>' +
            '<button type="button" class="b-sm" id="ag-next" aria-label="Próximo dia">›</button>' +
          '</div>' +
          '<div class="ag-data">' + rotuloData + '</div>' +
          (pode ? '<button type="button" class="b" id="ag-nova">+ Nova reserva</button>' : '') +
          '</div>';

        // legenda
        html += '<div class="ag-legenda">' +
          '<span class="ag-lg livre">Livre</span>' +
          TIPOS.map(function(t){ return '<span class="ag-lg '+t[2]+'">'+t[1].split(' / ')[0]+'</span>'; }).join('') + '</div>';

        // grade
        html += '<div class="ag-grid-scroll"><div class="ag-grid" style="grid-template-columns:64px repeat(' + quadras.length + ',minmax(150px,1fr))">';
        // cabeçalho
        html += '<div class="ag-cell ag-corner"></div>';
        quadras.forEach(function(q){
          html += '<div class="ag-cell ag-colh"><b>' + GA.esc(q.court_nome) + '</b>' +
            '<span>' + GA.esc([q.sport_nome, (q.sou_dono?q.unit_nome:q.arena_nome)].filter(Boolean).join(' · ')) + '</span></div>';
        });
        // linhas por hora
        for (var h=H_INI; h<=H_FIM; h++){
          html += '<div class="ag-cell ag-hora">' + String(h).padStart(2,'0') + ':00</div>';
          quadras.forEach(function(q){
            var c = cobre[q.court_id][h];
            if (c && c.res){
              if (c.inicio){
                var x = c.res;
                var titulo = x.titulo || tipoLabel(x.tipo);
                var sub = x.sou_dono ? '' : (x.dono_nome || (x.titulo==='Ocupado'?'':tipoLabel(x.tipo)));
                var span = Math.min(horaDe(x.hora_fim)<=horaDe(x.hora_inicio)?24:horaDe(x.hora_fim), H_FIM+1) - h;
                html += '<div class="ag-cell ag-slot ' + tipoClasse(x.tipo) + (x.sou_dono?'':' alheia') + '" ' +
                  'style="grid-row:span ' + Math.max(1,span) + '" data-id="' + x.id + '">' +
                  '<span class="ag-slot-t">' + GA.esc(titulo) + '</span>' +
                  (sub ? '<span class="ag-slot-s">' + GA.esc(sub) + '</span>' : '') +
                  '<span class="ag-slot-h">' + hhmm(x.hora_inicio) + '–' + hhmm(x.hora_fim) + '</span></div>';
              }
              // horas de continuação: não emite célula (o span do início ocupa)
            } else {
              html += '<button type="button" class="ag-cell ag-livre"' + (pode?'':' disabled') +
                ' data-court="' + q.court_id + '" data-hora="' + String(h).padStart(2,'0') + ':00">' +
                (pode?'<span>+</span>':'') + '</button>';
            }
          });
        }
        html += '</div></div>';
        GA.$('#content').innerHTML = html;
        ligar(chave);
      });
  }

  function ligar(chave){
    GA.$('#ag-prev').addEventListener('click', function(){ dayOff--; renderDia(); });
    GA.$('#ag-next').addEventListener('click', function(){ dayOff++; renderDia(); });
    GA.$('#ag-hoje').addEventListener('click', function(){ dayOff=0; renderDia(); });
    var nova = GA.$('#ag-nova'); if (nova) nova.addEventListener('click', function(){ modalReserva(null, { data: chave }); });
    GA.$$('.ag-slot').forEach(function(b){ b.addEventListener('click', function(){ abrirReserva(b.getAttribute('data-id')); }); });
    GA.$$('.ag-livre').forEach(function(b){ b.addEventListener('click', function(){
      if (b.disabled) return;
      modalReserva(null, { data: chave, court: b.getAttribute('data-court'), hora: b.getAttribute('data-hora') });
    }); });
  }

  function abrirReserva(id){
    var x = (GA._resIndex||{})[id]; if (!x) return;
    var meu = x.sou_dono;
    if (!meu && !(GA.org.tipo==='arena' && GA.podeAgenda())) {
      GA.modal('<h3>Horário ocupado</h3>' +
        '<p style="font-size:14px">' + hhmm(x.hora_inicio) + '–' + hhmm(x.hora_fim) + '</p>' +
        '<p style="font-size:13px;color:var(--tx2);margin-top:6px">Este horário já está reservado nesta quadra.</p>' +
        '<div class="foot"><button type="button" class="b-ghost" onclick="GA.fecharModal()">Fechar</button></div>');
      return;
    }
    modalReserva(x, null);
  }

  function modalReserva(x, pre){
    x = x || {}; pre = pre || {};
    var edit = !!x.id;
    var courtSel = x.court_id || pre.court || (quadras[0] && quadras[0].court_id);
    var data = x.data || pre.data || iso(new Date());
    var ini = hhmm(x.hora_inicio) || (pre.hora || '19:00');
    var fim = hhmm(x.hora_fim) || (pre.hora ? String(Math.min(23,horaDe(pre.hora)+1)).padStart(2,'0')+':00' : '20:00');
    var tipo = x.tipo || 'aula';

    var html = '<h3>' + (edit ? 'Editar reserva' : 'Nova reserva') + '</h3>';
    if (edit) {
      var q0 = quadras.filter(function(k){return k.court_id===x.court_id;})[0] || {};
      html += '<p style="font-size:12px;color:var(--tx2);margin:-8px 0 14px">Quadra: <b>' + GA.esc(q0.court_nome||'') + '</b></p>';
    } else {
      html += '<label class="f"><span>Quadra</span><select id="rs-court">' +
        quadras.map(function(q){ return '<option value="'+q.court_id+'"'+(q.court_id===courtSel?' selected':'')+'>' +
          GA.esc(q.court_nome + (q.sou_dono?'':' · '+q.arena_nome)) + '</option>'; }).join('') + '</select></label>';
    }
    html += '<div class="row2">' +
      '<label class="f"><span>Data</span><input id="rs-data" type="date" value="' + data + '"></label>' +
      '<label class="f"><span>Tipo</span><select id="rs-tipo">' +
        TIPOS.map(function(t){ return '<option value="'+t[0]+'"'+(t[0]===tipo?' selected':'')+'>'+t[1]+'</option>'; }).join('') +
      '</select></label></div>' +
      '<div class="row2">' +
      '<label class="f"><span>Início</span><input id="rs-ini" type="time" value="' + ini + '"></label>' +
      '<label class="f"><span>Fim</span><input id="rs-fim" type="time" value="' + fim + '"></label></div>' +
      '<label class="f"><span>Título / Cliente</span><input id="rs-tit" placeholder="Ex.: Turma Futvôlei Iniciante" value="' + GA.esc(x.titulo && x.titulo!=='Ocupado' ? x.titulo : '') + '"></label>';

    if (!edit) {
      html += '<label class="ag-rep"><input id="rs-rep" type="checkbox"><span>Repetir toda semana</span></label>' +
        '<div id="rs-rep-box" style="display:none">' +
        '<label class="f"><span>Dias da semana</span><div id="rs-dias" class="ag-dias">' +
          DIAS.map(function(d,i){ return '<label><input type="checkbox" value="'+i+'"><span>'+d+'</span></label>'; }).join('') +
        '</div></label>' +
        '<label class="f"><span>Repetir até (opcional)</span><input id="rs-ate" type="date"></label></div>';
    }
    html += '<div class="foot">' +
      (edit ? '<button type="button" class="b-sm danger" id="rs-cancel" style="margin-right:auto">Cancelar reserva</button>' : '') +
      '<button type="button" class="b-ghost" onclick="GA.fecharModal()">Voltar</button>' +
      '<button type="button" class="b" id="rs-save">' + (edit?'Salvar':'Confirmar reserva') + '</button></div>';
    GA.modal(html);

    if (!edit) GA.$('#rs-rep').addEventListener('change', function(e){
      GA.$('#rs-rep-box').style.display = e.target.checked ? 'block' : 'none';
      if (e.target.checked){
        var v = GA.$('#rs-data').value; if (!v) return;
        var dow = new Date(v+'T12:00').getDay();
        GA.$$('#rs-dias input').forEach(function(c){ if (parseInt(c.value,10)===dow) c.checked = true; });
      }
    });
    if (edit) GA.$('#rs-cancel').addEventListener('click', function(){ cancelar(x.id); });
    GA.$('#rs-save').addEventListener('click', function(){ salvar(x, edit, courtSel); });
  }

  function salvar(x, edit, courtSel){
    var court = edit ? x.court_id : (GA.$('#rs-court') ? GA.$('#rs-court').value : courtSel);
    var data = GA.$('#rs-data').value, ini = GA.$('#rs-ini').value, fim = GA.$('#rs-fim').value;
    var tipo = GA.$('#rs-tipo').value, tit = GA.$('#rs-tit').value.trim();
    if (!data || !ini || !fim) { GA.toast('Preencha data e horários.', 'err'); return; }
    if (fim === ini) { GA.toast('Informe um horário de início e fim.', 'err'); return; }
    var btn = GA.$('#rs-save'); btn.disabled = true; btn.textContent = 'Salvando…';
    var p;
    if (edit) {
      p = sb.rpc('editar_reserva', { p_id: x.id, p_data: data, p_inicio: ini, p_fim: fim, p_tipo: tipo, p_titulo: tit });
    } else if (GA.$('#rs-rep') && GA.$('#rs-rep').checked) {
      var dias = GA.$$('#rs-dias input:checked').map(function(c){ return parseInt(c.value,10); });
      if (!dias.length) { GA.toast('Escolha ao menos um dia.', 'err'); btn.disabled=false; btn.textContent='Confirmar reserva'; return; }
      p = sb.rpc('criar_reserva_recorrente', { p_org: GA.org.id, p_court: court, p_dias: dias,
        p_inicio: ini, p_fim: fim, p_tipo: tipo, p_titulo: tit, p_vig_inicio: data, p_vig_fim: GA.$('#rs-ate').value || null, p_horizonte_dias: 120 });
    } else {
      p = sb.rpc('criar_reserva', { p_org: GA.org.id, p_court: court, p_data: data, p_inicio: ini, p_fim: fim, p_tipo: tipo, p_titulo: tit });
    }
    p.then(function(r){
      if (r.error) throw r.error;
      GA.fecharModal();
      if (r.data && typeof r.data==='object' && 'criadas' in r.data)
        GA.toast('Recorrência criada: ' + r.data.criadas + ' reserva(s)' + (r.data.puladas?', '+r.data.puladas+' pulada(s) por conflito':'') + '.');
      else GA.toast(edit?'Reserva atualizada.':'Reserva confirmada.');
      renderDia();
    }).catch(function(e){ GA.erro(e,'Reserva'); btn.disabled=false; btn.textContent=edit?'Salvar':'Confirmar reserva'; });
  }

  function cancelar(id){
    var x = (GA._resIndex||{})[id] || {};
    var temRec = !!x.recurring_id;
    GA.modal('<h3>Cancelar reserva</h3><p style="font-size:14px">Deseja cancelar esta reserva?</p>' +
      (temRec ? '<label class="ag-rep" style="margin-top:12px"><input id="rs-serie" type="checkbox"><span>Cancelar também as próximas repetições da série</span></label>' : '') +
      '<div class="foot"><button type="button" class="b-ghost" onclick="GA.fecharModal()">Voltar</button>' +
      '<button type="button" class="b" id="rs-conf">Confirmar</button></div>');
    GA.$('#rs-conf').addEventListener('click', function(){
      var serie = temRec && GA.$('#rs-serie') && GA.$('#rs-serie').checked;
      var p = serie ? sb.rpc('cancelar_recorrencia',{p_id:x.recurring_id,p_a_partir:x.data})
                    : sb.rpc('cancelar_reserva',{p_id:id});
      p.then(function(r){ if(r.error) throw r.error; GA.fecharModal();
        GA.toast(serie?'Série cancelada a partir desta data.':'Reserva cancelada.'); renderDia();
      }).catch(function(e){ GA.erro(e,'Cancelar'); });
    });
  }
})();
