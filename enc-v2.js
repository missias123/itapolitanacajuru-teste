
// ENCOMENDAS.JS - Sorveteria Itapolitana Cajuru
// Lógica completa do fluxo de encomendas
const GIST_ID_PRECO = '92bd9d1997c2fdd225ad3115c7028445';
const GIST_RAW_PRECO = 'https://gist.githubusercontent.com/missias123/' + GIST_ID_PRECO + '/raw/itap-produtos.json';

async function carregarPrecosNuvem() {
  try {
    const resp = await fetch(GIST_RAW_PRECO + '?t=' + Date.now(), { cache: 'no-store' });
    if (!resp.ok) throw new Error('Gist indisponível');
    const dados = await resp.json();
    if (dados.picoles) {
      Object.entries(dados.picoles).forEach(([key, p]) => {
        if (produtos.picoles[key]) {
          produtos.picoles[key].preco_varejo = p.preco_varejo;
          produtos.picoles[key].preco_atacado = p.preco_atacado;
          if (p.estoque !== undefined) produtos.picoles[key].estoque = p.estoque;
        }
      });
    }
    if (dados.sorvetes_precos) produtos.sorvetes.precos = dados.sorvetes_precos;
    if (dados.milkshake) produtos.milkshake = dados.milkshake;
    if (dados.tacas) produtos.tacas = dados.tacas;
    if (dados.acai) produtos.acai = dados.acai;
    if (dados.caixas_viagem) produtos.caixas_viagem = dados.caixas_viagem;
    if (dados.isopores_viagem) produtos.isopores_viagem = dados.isopores_viagem;
    if (dados.sobremesas) produtos.sobremesas = dados.sobremesas;
    localStorage.setItem('itap_produtos_nuvem', JSON.stringify(dados));
    if (dados.caixas_enc && dados.caixas_enc.length > 0)
      localStorage.setItem('itap_caixas_enc', JSON.stringify(dados.caixas_enc));
    if (dados.tortas_enc && dados.tortas_enc.length > 0)
      localStorage.setItem('itap_tortas_enc', JSON.stringify(dados.tortas_enc));
    console.log('[Itap] Preços carregados da nuvem ✅');
    return true;
  } catch(e) {
    const cache = localStorage.getItem('itap_produtos_nuvem');
    if (cache) {
      try {
        const dados = JSON.parse(cache);
        if (dados.picoles) {
          Object.entries(dados.picoles).forEach(([key, p]) => {
            if (produtos.picoles[key]) {
              produtos.picoles[key].preco_varejo = p.preco_varejo;
              produtos.picoles[key].preco_atacado = p.preco_atacado;
            }
          });
        }
      } catch(e2) {}
    }
    return false;
  }
}

// Variáveis globais
var carrinho = [];
var produtoAtual = null;
var saboresSelecionados = [];
var selecoesPickle = {};        // seleções do modal atual (por sabor)
var selecoesPickleGlobal = {};  // acumulado de TODOS os tipos (chave: tipo_id + sabor)
var _nomeCliente = '';
var _telCliente = '';
var _enderecoCliente = '';

// Sabores carregados do admin (localStorage) ou lista padrão
function getSaboresAtivos() {
  const salvo = localStorage.getItem('itap_sabores');
  if (salvo) {
    const dados = JSON.parse(salvo);
    return dados.filter(s => !s.esgotado).map(s => s.nome);
  }
  return [
    "Abacaxi ao Vinho","Abacaxi Suíço","Algodão Doce (Blue Ice)","Amarena","Ameixa",
    "Banana com Nutella","Bis e Trufa","Cereja Trufada","Chocolate","Chocolate com Café",
    "Coco Queimado","Creme Paris","Croquer","Doce de Leite","Ferrero Rocher",
    "Flocos","Kinder Ovo","Leite Condensado","Leite Ninho",
    "Leite Ninho Folheado","Leite Ninho com Oreo","Limão",
    "Limão Suíço","Menta com Chocolate","Milho Verde","Morango Trufado",
    "Mousse de Maracujá","Mousse de Uva","Nozes","Nutella","Ovomaltine",
    "Pistache","Prestígio","Sensação","Torta de Chocolate"
  ];
}
const SABORES_SORVETE = getSaboresAtivos();

// Caixas de encomenda: carregadas do admin (localStorage) ou padrão
function getCaixasEncomenda() {
  const PADRAO = [
    { id:"cx5l_2s",  nome:"Caixa 5 Litros – 2 Sabores",  preco:100.00, maxSabores:2, estoque:20, esgotado:false },
    { id:"cx5l_3s",  nome:"Caixa 5 Litros – 3 Sabores",  preco:115.00, maxSabores:3, estoque:20, esgotado:false },
    { id:"cx10l_2s", nome:"Caixa 10 Litros – 2 Sabores", preco:150.00, maxSabores:2, estoque:15, esgotado:false },
    { id:"cx10l_3s", nome:"Caixa 10 Litros – 3 Sabores", preco:165.00, maxSabores:3, estoque:15, esgotado:false }
  ];
  try {
    const salvo = localStorage.getItem('itap_caixas_enc');
    if (salvo) {
      const dados = JSON.parse(salvo);
      return dados.map((c, i) => ({
        ...PADRAO[i] || {},
        ...c,
        maxSabores: PADRAO[i] ? PADRAO[i].maxSabores : 2
      }));
    }
  } catch(e) {}
  return PADRAO;
}

function getTortasEncomenda() {
  const PADRAO = [
    { id:"torta1", nome:"Torta de Sorvete", preco:100.00, maxSabores:3, estoque:10, esgotado:false }
  ];
  try {
    const salvo = localStorage.getItem('itap_tortas_enc');
    if (salvo) {
      const dados = JSON.parse(salvo);
      return dados.map((t, i) => ({
        ...PADRAO[i] || {},
        ...t,
        maxSabores: (PADRAO[i] ? PADRAO[i].maxSabores : 3)
      }));
    }
  } catch(e) {}
  return PADRAO;
}

const PRODUTOS = {
  caixas: getCaixasEncomenda(),
  tortas: getTortasEncomenda(),
  // Picolés carregados do products.js (fonte única)
  picoles: Object.entries(produtos.picoles).map(([key, p]) => ({
    id: 'pic_'+key,
    nome: p.nome,
    precoVarejo: p.preco_varejo,
    precoAtacado: p.preco_atacado,
    estoque: p.estoque,
    sabores: p.sabores
  }))
};


// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  // Modal carrinho: listeners diretos nos botões (sem conflito de dupla chamada)
  const modalCarrinho = document.getElementById('modal-carrinho');
  if (modalCarrinho) {
    // Fechar ao clicar no overlay (fora do modal-box)
    modalCarrinho.addEventListener('click', function(e) {
      if (e.target === modalCarrinho) fecharCarrinho();
    });
  }
  // Botão ir para dados (etapa 1 → 2)
  const btnIrDados = document.getElementById('btn-ir-dados');
  if (btnIrDados) {
    btnIrDados.addEventListener('click', function(e) {
      e.stopPropagation();
      irParaDados();
    });
  }
  // Botão Confirmar e Enviar Pedido (etapa 2 → 3)
  const btnFinalizar = document.getElementById('btn-finalizar');
  if (btnFinalizar) {
    btnFinalizar.addEventListener('click', function(e) {
      e.stopPropagation();
      finalizarPedido();
    });
  }
  // Botão Voltar ao Carrinho
  const btnVoltarEtapa = document.getElementById('btn-voltar-etapa');
  if (btnVoltarEtapa) {
    btnVoltarEtapa.addEventListener('click', function(e) {
      e.stopPropagation();
      mostrarEtapa('revisao');
    });
  }
  // Botão Continuar Comprando (etapa 1)
  const btnContinuar = document.getElementById('btn-continuar-comprando');
  if (btnContinuar) {
    btnContinuar.addEventListener('click', function(e) {
      e.stopPropagation();
      fecharCarrinho();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  // Botão Revisar Carrinho (etapa 2 → 1) - alias do voltar-etapa
  const btnVoltarEtapa2 = document.getElementById('btn-voltar-etapa2');
  if (btnVoltarEtapa2) {
    btnVoltarEtapa2.addEventListener('click', function(e) {
      e.stopPropagation();
      mostrarEtapa('revisao');
    });
  }
  // Botão Desistir e Voltar às Encomendas (etapa 3)
  const btnVoltarCardapio = document.getElementById('btn-voltar-cardapio');
  if (btnVoltarCardapio) {
    btnVoltarCardapio.addEventListener('click', function(e) {
      e.stopPropagation();
      fecharCarrinho();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  // Botão Voltar às Encomendas (etapa 2) — fecha o modal, mantém o carrinho
  const btnSairFormulario = document.getElementById('btn-sair-formulario');
  if (btnSairFormulario) {
    btnSairFormulario.addEventListener('click', function(e) {
      e.stopPropagation();
      fecharCarrinho();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Carregar preços da nuvem e re-renderizar
  carregarPrecosNuvem().then(() => {
    // Re-inicializar PRODUTOS com preços atualizados
    PRODUTOS.caixas = getCaixasEncomenda();
    PRODUTOS.tortas = getTortasEncomenda();
    PRODUTOS.picoles = Object.entries(produtos.picoles).map(([key, p]) => ({
      id: 'pic_'+key,
      nome: p.nome,
      precoVarejo: p.preco_varejo,
      precoAtacado: p.preco_atacado,
      estoque: p.estoque,
      sabores: p.sabores
    }));
    renderizarTudo();
    atualizarBotaoCarrinho();
  });
  renderizarTudo();
  atualizarBotaoCarrinho();
  // Abrir seção via hash (ex: encomendas.html#caixas)
  const hash = window.location.hash.replace('#','');
  const mapa = {caixas:'conteudo-caixas', tortas:'conteudo-tortas', picoles:'conteudo-picoles'};
  if(hash && mapa[hash]){
    const el = document.getElementById(mapa[hash]);
    if(el){ el.classList.add('aberto'); }
    setTimeout(()=>{
      const sec = document.getElementById(hash);
      if(sec) sec.scrollIntoView({behavior:'smooth', block:'start'});
    }, 200);
  }
  // Abrir caixas se vier de complementos
  if(hash === 'complementos'){
    const el = document.getElementById('conteudo-caixas');
    if(el){ el.classList.add('aberto'); }
    setTimeout(()=>{
      const sec = document.getElementById('caixas');
      if(sec) sec.scrollIntoView({behavior:'smooth', block:'start'});
    }, 200);
  }
  // Abrir acrescimos via hash
  if(hash === 'acrescimos'){
    const el = document.getElementById('conteudo-acrescimos');
    if(el){ el.classList.add('aberto'); }
    setTimeout(()=>{
      const sec = document.getElementById('acrescimos');
      if(sec) sec.scrollIntoView({behavior:'smooth', block:'start'});
    }, 200);
  }
  // Re-renderizar acrescimos ao abrir a seção
  const headerAcr = document.querySelector('#acrescimos .categoria-header');
  if(headerAcr){
    headerAcr.addEventListener('click', function(){
      setTimeout(renderizarAcrescimos, 50);
    });
  }
});

function renderizarTudo() {
  renderizarCaixas();
  renderizarTortas();
  renderizarPicolés();
  renderizarAcrescimos();
}

// ---- RENDERIZAR CAIXAS ----
function renderizarCaixas() {
  const c = document.getElementById('lista-caixas');
  if (!c) return;
  c.innerHTML = PRODUTOS.caixas.map(p => {
    const esgotado = p.esgotado || p.estoque <= 0;
    return `
    <div class="prod-card ${esgotado?'esgotado':''}">
      <div class="prod-body">
        <div class="prod-nome">${p.nome}</div>
        <div class="prod-preco">R$ ${p.preco.toFixed(2).replace('.',',')}</div>
        <div class="prod-estoque">${esgotado?'ESGOTADO':`Estoque: ${p.estoque}`}</div>
      </div>
      <button class="btn-add" ${esgotado?'disabled':''} onclick="abrirModalCaixa('${p.id}', this)">
        ${esgotado?'Indisponível':'Escolher Sabores'}
      </button>
    </div>`;
  }).join('');
}

// ---- RENDERIZAR TORTAS ----
function renderizarTortas() {
  const c = document.getElementById('lista-tortas');
  if (!c) return;
  c.innerHTML = PRODUTOS.tortas.map(p => {
    const esgotado = p.esgotado || p.estoque <= 0;
    return `
    <div class="prod-card ${esgotado?'esgotado':''}">
      <div class="prod-body">
        <div class="prod-nome">${p.nome}</div>
        <div class="prod-preco">R$ ${p.preco.toFixed(2).replace('.',',')}</div>
        <div class="prod-estoque">${esgotado?'ESGOTADO':`Estoque: ${p.estoque}`}</div>
      </div>
      <button class="btn-add" ${esgotado?'disabled':''} onclick="abrirModalTorta('${p.id}', this)">
        ${esgotado?'Indisponível':'Escolher Sabores'}
      </button>
    </div>`;
  }).join('');
}

// ---- RENDERIZAR PICOLÉS ----
function renderizarPicolés() {
  const c = document.getElementById('lista-picoles');
  if (!c) return;
  c.innerHTML = PRODUTOS.picoles.map(p => {
    const esgotado = p.estoque <= 0;
    return `
    <div class="prod-card ${esgotado?'esgotado':''}">
      <div class="prod-body">
        <div class="prod-nome">${p.nome}</div>
        <div class="prod-preco">R$ ${p.precoAtacado.toFixed(2).replace('.',',')} (Atacado)</div>
        <div class="prod-estoque">${esgotado?'ESGOTADO':`Estoque: ${p.estoque}`}</div>
      </div>
      <button class="btn-add" ${esgotado?'disabled':''} onclick="abrirModalPicolé('${p.id}', this)">
        ${esgotado?'Indisponível':'Ver Sabores'}
      </button>
    </div>`;
  }).join('');
}

// ---- RENDERIZAR ACRÉSCIMOS ----
function renderizarAcrescimos() {
  const c = document.getElementById('lista-acrescimos');
  if (!c) return;
  const acr = produtos.acrescimos || {};
  c.innerHTML = Object.entries(acr).map(([id, p]) => {
    const esgotado = p.estoque <= 0;
    return `
    <div class="prod-card ${esgotado?'esgotado':''}">
      <div class="prod-body">
        <div class="prod-nome">${p.nome}</div>
        <div class="prod-preco">R$ ${p.preco.toFixed(2).replace('.',',')}</div>
        <div class="prod-estoque">${esgotado?'ESGOTADO':`Estoque: ${p.estoque}`}</div>
      </div>
      <button class="btn-add" ${esgotado?'disabled':''} onclick="addAcrescimo('${id}')">
        ${esgotado?'Indisponível':'Adicionar'}
      </button>
    </div>`;
  }).join('');
}

function addAcrescimo(id) {
  const p = produtos.acrescimos[id];
  if (!p || p.estoque <= 0) return;
  const item = {
    id: 'acr_'+id,
    nome: p.nome,
    preco: p.preco,
    quantidade: 1,
    tipo: 'acréscimo'
  };
  addCarrinho(item);
  showToast(`✅ ${p.nome} adicionado!`, 'sucesso');
}

// ---- MODAIS ----
function abrirModal(id, originEl) {
  const m = document.getElementById(id);
  if (m) {
    m.classList.add('ativo');
    document.body.style.overflow = 'hidden';
  }
}
function fecharModal(id) {
  const m = document.getElementById(id);
  if (m) {
    m.classList.remove('ativo');
    document.body.style.overflow = '';
  }
}

// ---- MODAL CAIXA / TORTA ----
function abrirModalCaixa(id, originEl) {
  const p = PRODUTOS.caixas.find(x => x.id === id);
  if (!p) return;
  produtoAtual = p;
  saboresSelecionados = [];
  document.getElementById('caixa-titulo').textContent = p.nome;
  document.getElementById('caixa-max-sabores').textContent = p.maxSabores;
  const lista = document.getElementById('lista-sabores-caixa');
  lista.innerHTML = SABORES_SORVETE.map(s => `
    <div class="sabor-item" onclick="toggleSabor('${s}', this)">${s}</div>
  `).join('');
  abrirModal('modal-caixa', originEl);
}

function abrirModalTorta(id, originEl) {
  const p = PRODUTOS.tortas.find(x => x.id === id);
  if (!p) return;
  produtoAtual = p;
  saboresSelecionados = [];
  document.getElementById('caixa-titulo').textContent = p.nome;
  document.getElementById('caixa-max-sabores').textContent = p.maxSabores;
  const lista = document.getElementById('lista-sabores-caixa');
  lista.innerHTML = SABORES_SORVETE.map(s => `
    <div class="sabor-item" onclick="toggleSabor('${s}', this)">${s}</div>
  `).join('');
  abrirModal('modal-caixa', originEl);
}

function toggleSabor(sabor, el) {
  const idx = saboresSelecionados.indexOf(sabor);
  if (idx >= 0) {
    saboresSelecionados.splice(idx, 1);
    el.classList.remove('selecionado');
    // Feedback visual: remover com cor vermelha
    el.style.background = '#fee2e2';
    setTimeout(() => { el.style.background = ''; }, 300);
    showToast(`❌ ${sabor} removido`, 'info');
  } else {
    if (saboresSelecionados.length >= produtoAtual.maxSabores) {
      showToast(`⚠️ Máximo ${produtoAtual.maxSabores} sabores permitidos!`, 'alerta');
      // Efeito de erro no elemento
      el.style.animation = 'shake 0.3s';
      setTimeout(() => { el.style.animation = ''; }, 300);
      return;
    }
    saboresSelecionados.push(sabor);
    el.classList.add('selecionado');
    // Feedback visual: adicionar com cor verde
    el.style.background = '#dcfce7';
    setTimeout(() => { el.style.background = ''; }, 300);
    showToast(`✅ ${sabor} selecionado (${saboresSelecionados.length}/${produtoAtual.maxSabores})`, 'sucesso');
  }
  // Atualizar contador visual
  atualizarContadorSabores();
}

function atualizarContadorSabores() {
  const contador = document.getElementById('sabores-selecionados-count');
  if (contador) {
    contador.textContent = saboresSelecionados.length;
    // Feedback visual: mudar cor baseado no progresso
    if (saboresSelecionados.length === 0) {
      contador.style.color = '#9ca3af';
    } else if (saboresSelecionados.length < produtoAtual.maxSabores) {
      contador.style.color = '#f59e0b';
    } else {
      contador.style.color = '#22c55e';
    }
  }
}

function confirmarCaixa() {
  if (saboresSelecionados.length === 0) { 
    showToast('⚠️ Escolha ao menos 1 sabor!', 'alerta'); 
    return; 
  }
  const item = {
    id: produtoAtual.id + '_' + Date.now(),
    nome: produtoAtual.nome,
    preco: produtoAtual.preco,
    sabores: [...saboresSelecionados],
    quantidade: 1,
    tipo: produtoAtual.id.startsWith('cx') ? 'caixa' : 'torta'
  };
  addCarrinho(item);
  // Feedback visual de sucesso
  const btn = document.getElementById('btn-confirmar-caixa');
  if (btn) {
    btn.style.background = '#22c55e';
    btn.textContent = '✅ Adicionado!';
    setTimeout(() => {
      btn.style.background = '';
      btn.textContent = '✅ Confirmar Seleção';
    }, 1500);
  }
  fecharModal('modal-caixa');
  showToast(`✅ ${saboresSelecionados.length} sabor(es) adicionado(s) ao carrinho!`, 'sucesso');
  saboresSelecionados = [];
}

// ---- MODAL PICOLÉ (REPARO PERFEITO) ----
const MIN_PICOLES = 100;
const MAX_PICOLES = 250;
const LIMITE_POR_SABOR = 25;

function abrirModalPicolé(id, originEl) {
  const p = PRODUTOS.picoles.find(x => x.id === id);
  if (!p) return;
  produtoAtual = p;
  // Restaurar seleções já feitas para este tipo a partir do global
  selecoesPickle = {};
  Object.entries(selecoesPickleGlobal).forEach(([chave, qtd]) => {
    if (chave.startsWith(p.id + '::')) {
      const sabor = chave.slice(p.id.length + 2);
      selecoesPickle[sabor] = qtd;
    }
  });
  document.getElementById('picolé-titulo').textContent = p.nome;
  document.getElementById('picolé-precos').textContent =
    `Varejo: R$ ${p.precoVarejo.toFixed(2).replace('.',',')} | Atacado: R$ ${p.precoAtacado.toFixed(2).replace('.',',')}`;

  const lista = document.getElementById('lista-sabores-picolé');
  lista.innerHTML = p.sabores.map(s => {
    const qtdAtual = selecoesPickle[s] || 0;
    return `
    <div class="picolé-row">
      <span class="picolé-sabor-nome">${s}</span>
      <div class="qty-ctrl">
        <button class="btn-qty" onclick="qtdPickle('${s}', -1)">−</button>
        <span class="qty-val" id="pqty-${s.replace(/\s+/g,'_')}">${qtdAtual}</span>
        <button class="btn-qty" onclick="qtdPickle('${s}', 1)">+</button>
      </div>
    </div>`;
  }).join('');

  atualizarTotalPickle();
  abrirModal('modal-picolé', originEl);
}

function qtdPickle(sabor, delta) {
  if (!selecoesPickle[sabor]) selecoesPickle[sabor] = 0;
  
  const qtdAnterior = selecoesPickle[sabor];
  
  // Lógica de 1 em 1 unidade por clique
  let nova = qtdAnterior + delta;
  if (nova < 0) nova = 0;
  
  // TRAVA DE MÃO DE FERRO: Bloqueio absoluto em 25 unidades por sabor
  if (nova > LIMITE_POR_SABOR) {
    nova = LIMITE_POR_SABOR; // Força o valor a ser exatamente 25
    showToast(`⚠️ Limite de ${LIMITE_POR_SABOR} unidades por sabor atingido`, 'alerta');
  }

  // Verificar limite global de 250
  const totalGlobalAntigo = totalPickleGlobal();
  const diff = nova - qtdAnterior;
  if (totalGlobalAntigo + diff > MAX_PICOLES) {
    showToast(`⚠️ Máximo ${MAX_PICOLES} picolés no total. Você já tem ${totalGlobalAntigo}.`, 'alerta');
    return;
  }

  // Sincronização com estoque (se disponível no objeto produtoAtual)
  if (produtoAtual.estoque !== undefined && nova > produtoAtual.estoque) {
    showToast(`⚠️ Estoque insuficiente para ${sabor} (Disponível: ${produtoAtual.estoque})`, 'alerta');
    return;
  }

  // Atualizar seleção
  selecoesPickle[sabor] = nova;
  
  // Atualizar o global de forma sincronizada
  const chave = produtoAtual.id + '::' + sabor;
  if (nova === 0) { 
    delete selecoesPickleGlobal[chave]; 
  } else { 
    selecoesPickleGlobal[chave] = nova; 
  }

  // Atualizar contador visual e estado dos botões (TRAVA FÍSICA)
  const el = document.getElementById(`pqty-${sabor.replace(/\s+/g,'_')}`);
  if (el) {
    el.textContent = nova;
    // Feedback visual
    el.style.color = (nova === 25) ? '#22c55e' : (nova === 0 ? '#6b7280' : '#1565C0');
    el.style.fontWeight = (nova === 25) ? '900' : '700';
    
    // Bloquear/Desbloquear botões visualmente e fisicamente
    const row = el.closest('.picolé-row');
    if (row) {
      const btnPlus = row.querySelector('button:last-child');
      const btnMinus = row.querySelector('button:first-child');
      if (btnPlus) {
        btnPlus.disabled = (nova >= LIMITE_POR_SABOR);
        btnPlus.style.opacity = (nova >= LIMITE_POR_SABOR) ? '0.3' : '1';
        btnPlus.style.cursor = (nova >= LIMITE_POR_SABOR) ? 'not-allowed' : 'pointer';
      }
      if (btnMinus) {
        btnMinus.disabled = (nova <= 0);
        btnMinus.style.opacity = (nova <= 0) ? '0.3' : '1';
        btnMinus.style.cursor = (nova <= 0) ? 'not-allowed' : 'pointer';
      }
    }
  }
  
  // Atualizar totais e barra de progresso
  atualizarTotalPickle();
}

function totalPickleGlobal() {
  return Object.values(selecoesPickleGlobal).reduce((a,b)=>a+b,0);
}

function atualizarTotalPickle() {
  const totalGlobal = totalPickleGlobal();
  const el = document.getElementById('total-picoles');
  if (el) {
    el.textContent = totalGlobal;
    // Efeito visual quando o total muda
    el.style.transform = 'scale(1.1)';
    setTimeout(() => { el.style.transform = 'scale(1)'; }, 200);
  }
  
  const btn = document.getElementById('btn-add-picoles');
  const barraProgresso = document.querySelector('.barra-progresso-picolé'); // Se existir no HTML
  
  // Regras de validação do botão de adicionar
  if (btn) {
    if (totalGlobal === 0) {
      btn.disabled = true;
      btn.textContent = `🍭 Selecione ao menos ${MIN_PICOLES} picolés`;
      btn.style.background = '#d1d5db';
      btn.style.color = '#6b7280';
    } else if (totalGlobal < MIN_PICOLES) {
      btn.disabled = true;
      btn.textContent = `🔒 Faltam ${MIN_PICOLES - totalGlobal} picolés (Total: ${totalGlobal})`;
      btn.style.background = '#fbbf24';
      btn.style.color = '#000';
    } else if (totalGlobal > MAX_PICOLES) {
      btn.disabled = true;
      btn.textContent = `⚠️ Máximo ${MAX_PICOLES} picolés atingido (Total: ${totalGlobal})`;
      btn.style.background = '#f87171';
      btn.style.color = '#fff';
    } else {
      btn.disabled = false;
      btn.textContent = `✅ Adicionar ${totalGlobal} picolés ao carrinho`;
      btn.style.background = '#22c55e';
      btn.style.color = '#fff';
    }
  }

  // Bloquear todos os botões de "+" se o total global atingir 250
  const btnsPlus = document.querySelectorAll('.btn-qty:last-child');
  btnsPlus.forEach(b => {
    const row = b.closest('.picolé-row');
    if (row) {
      const sabor = row.querySelector('.picolé-sabor-nome').textContent;
      const qtdSabor = selecoesPickle[sabor] || 0;
      // Bloqueia se o total global for >= 250 OU se o sabor já tiver 25
      b.disabled = (totalGlobal >= MAX_PICOLES && qtdSabor === 0) || (qtdSabor >= LIMITE_POR_SABOR);
    }
  });
}  // Atualizar avisos visuais
  if (aviso) {
    if (totalGlobal > 0 && totalGlobal < MIN_PICOLES) {
      aviso.style.display = 'block';
      aviso.textContent = `🧳 Total: ${totalGlobal} picolés. Faltam ${MIN_PICOLES - totalGlobal} para o mínimo de atacado.`;
    } else if (totalGlobal > MAX_PICOLES) {
      aviso.style.display = 'block';
      aviso.textContent = `⚠️ Máximo ${MAX_PICOLES} picolés excedido. Reduza ${totalGlobal - MAX_PICOLES} unidades.`;
    } else {
      aviso.style.display = 'none';
    }
  }

  // Sincronizar barra de progresso no header
  const progressNum = document.getElementById('picole-progress-num');
  const progressFill = document.getElementById('picole-progress-fill');
  const progressStatus = document.getElementById('picole-progress-status');
  
  if (progressNum) progressNum.textContent = totalGlobal;
  if (progressFill) {
    const pct = Math.min((totalGlobal / MAX_PICOLES) * 100, 100);
    progressFill.style.width = pct + '%';
    progressFill.classList.toggle('ok', totalGlobal >= MIN_PICOLES && totalGlobal <= MAX_PICOLES);
  }
  if (progressStatus) {
    if (totalGlobal < MIN_PICOLES) {
      progressStatus.textContent = `🔒 Faltam ${MIN_PICOLES - totalGlobal}`;
    } else if (totalGlobal > MAX_PICOLES) {
      progressStatus.textContent = `⚠️ Máx. atingido`;
    } else {
      progressStatus.textContent = `✅ Pronto!`;
    }
  }
}

function confirmarPickle() {
  const totalGlobal = totalPickleGlobal();
  
  // Validação rigorosa de limites (100 a 250)
  if (totalGlobal < MIN_PICOLES) { 
    showToast(`⚠️ Mínimo ${MIN_PICOLES} picolés para atacado. Você tem ${totalGlobal}.`, 'alerta'); 
    return; 
  }
  if (totalGlobal > MAX_PICOLES) { 
    showToast(`⚠️ Máximo ${MAX_PICOLES} picolés permitido. Você tem ${totalGlobal}.`, 'alerta'); 
    return; 
  }

  // Sincronizar seleções globais com o carrinho de forma limpa
  // Primeiro, removemos picolés antigos do carrinho para evitar duplicações ou erros de contagem
  carrinho = carrinho.filter(item => item.tipo !== 'picolé');

  // Adicionamos as novas seleções validadas (1 a 25 por sabor)
  Object.entries(selecoesPickleGlobal).forEach(([chave, qtd]) => {
    if (qtd <= 0) return;
    
    const [tipoId, ...saborParts] = chave.split('::');
    const sabor = saborParts.join('::');
    const p = PRODUTOS.picoles.find(x => x.id === tipoId);
    
    if (p) {
      carrinho.push({
        id: tipoId + '::' + sabor,
        nome: sabor,
        nomeTipo: p.nome,
        preco: p.precoAtacado,
        quantidade: qtd,
        tipo: 'picolé'
      });
    }
  });

  // Limpar estados temporários do modal
  selecoesPickleGlobal = {};
  selecoesPickle = {};
  
  // Fechar modal e atualizar interface
  fecharModal('modal-picolé');
  atualizarBotaoCarrinho();
  
  // Feedback visual de sucesso
  showToast(`✅ ${totalGlobal} picolés adicionados ao carrinho com sucesso!`, 'sucesso');
  
  // Rolar suavemente para o botão do carrinho para guiar o utilizador
  const btnCarrinho = document.getElementById('btn-carrinho');
  if (btnCarrinho) {
    btnCarrinho.classList.add('pulse-animation');
    setTimeout(() => btnCarrinho.classList.remove('pulse-animation'), 2000);
  }
}

// ---- CARRINHO ----
function addCarrinho(item) {
  if (item.tipo === 'sorvete') {
    const ex = carrinho.find(c => c.id===item.id && JSON.stringify(c.sabores)===JSON.stringify(item.sabores));
    if (ex) { ex.quantidade++; }
    else carrinho.push(item);
  } else {
    carrinho.push(item);
  }
  atualizarBotaoCarrinho();
}

function atualizarBotaoCarrinho() {
  const total = carrinho.reduce((a,b)=>a+b.quantidade,0);
  const badge = document.getElementById('carrinho-badge');
  const btn = document.getElementById('btn-carrinho');
  if (badge) badge.textContent = total;
  if (btn) {
    btn.disabled = total === 0;
    btn.classList.toggle('ativo', total > 0);
  }
}

function abrirCarrinho() {
  if (carrinho.length === 0) { showToast('Carrinho vazio! Adicione produtos.','alerta'); return; }
  renderCarrinho();
  mostrarEtapa('revisao');
  abrirModal('modal-carrinho');
}

function fecharCarrinho() { fecharModal('modal-carrinho'); }

function renderCarrinho() {
  const lista = document.getElementById('lista-carrinho');
  const totalEl = document.getElementById('total-carrinho');
  if (!lista) return;
  let total = 0;
  lista.innerHTML = carrinho.map((item,i) => {
    const sub = item.preco * item.quantidade;
    total += sub;
    return `
    <div class="cart-item" style="flex-direction:column;align-items:stretch;padding:10px 14px;">
      <div style="font-size:10px;color:#9CA3AF;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin-bottom:2px">${item.nomeTipo || item.tipo}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <div style="flex:1;min-width:0">
          <div class="cart-item-nome" style="margin:0;font-size:15px;font-weight:800">${item.nome}</div>
          <div class="cart-item-preco-unit" style="margin:0">R$ ${item.preco.toFixed(2).replace('.',',')} / un.</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          <div class="qty-ctrl">
            <button class="btn-qty" onclick="qtdCarrinho(${i},-1)">−</button>
            <span class="qty-val">${item.quantidade}</span>
            <button class="btn-qty" onclick="qtdCarrinho(${i},1)">+</button>
          </div>
          <button class="btn-remover" onclick="removerItem(${i})" title="Remover">🗑️</button>
        </div>
      </div>
      <div style="text-align:right;font-weight:700;color:#1565C0;font-size:13px;margin-top:4px">R$ ${sub.toFixed(2).replace('.',',')}</div>
    </div>`;
  }).join('');
  
  if (totalEl) totalEl.textContent = `R$ ${total.toFixed(2).replace('.',',')}`;
  
  // Validação final do carrinho para picolés
  const totalPic = carrinho.filter(i=>i.tipo==='picolé').reduce((a,b)=>a+b.quantidade,0);
  const temPicole = carrinho.some(i=>i.tipo==='picolé');
  const aviso = document.getElementById('aviso-min-carrinho');
  const btnNext = document.getElementById('btn-ir-dados');
  
  if (temPicole && totalPic < MIN_PICOLES) {
    if (aviso) {
      aviso.style.display = 'block';
      aviso.style.cssText = 'display:block;background:#FEF2F2;border:2px solid #EF4444;border-radius:10px;padding:12px 14px;margin-top:10px;font-size:13px;font-weight:700;color:#DC2626;text-align:center';
      aviso.textContent = `🔒 Mínimo ${MIN_PICOLES} picolés para atacado. Faltam ${MIN_PICOLES - totalPic}.`;
    }
    if (btnNext) {
      btnNext.disabled = true;
      btnNext.style.opacity = '0.4';
    }
  } else {
    if (aviso) aviso.style.display = 'none';
    if (btnNext) {
      btnNext.disabled = false;
      btnNext.style.opacity = '1';
    }
  }
}

function qtdCarrinho(i, delta) {
  if (!carrinho[i]) return;
  const item = carrinho[i];
  const nova = item.quantidade + delta;
  if (nova <= 0) { removerItem(i); return; }
  
  if (item.tipo === 'picolé' && nova > MAX_PICOLES) {
    showToast(`⚠️ Máximo ${MAX_PICOLES} picolés no total.`, 'alerta');
    return;
  }
  
  item.quantidade = nova;
  renderCarrinho();
  atualizarBotaoCarrinho();
}

function removerItem(i) {
  carrinho.splice(i, 1);
  renderCarrinho();
  atualizarBotaoCarrinho();
  if (carrinho.length === 0) fecharCarrinho();
}

function mostrarEtapa(etapa) {
  const etapas = ['revisao', 'dados', 'sucesso'];
  etapas.forEach(e => {
    const el = document.getElementById('etapa-' + e);
    if (el) el.classList.toggle('ativa', e === etapa);
  });
}

function irParaDados() {
  mostrarEtapa('dados');
}

function finalizarPedido() {
  const nome = document.getElementById('cliente-nome').value;
  const tel = document.getElementById('cliente-tel').value;
  const end = document.getElementById('cliente-endereco').value;
  
  if (!nome || !tel || !end) {
    showToast('Preencha todos os dados!', 'alerta');
    return;
  }

  _nomeCliente = nome;
  _telCliente = tel;
  _enderecoCliente = end;

  // Gerar mensagem para WhatsApp
  let msg = `*NOVO PEDIDO - ITAPOLITANA*\n\n`;
  msg += `👤 *Cliente:* ${nome}\n`;
  msg += `📞 *Tel:* ${tel}\n`;
  msg += `📍 *Endereço:* ${end}\n\n`;
  msg += `🛒 *Itens:*\n`;
  
  let total = 0;
  carrinho.forEach(item => {
    const sub = item.preco * item.quantidade;
    total += sub;
    msg += `• ${item.quantidade}x ${item.nome} (${item.nomeTipo || item.tipo}) - R$ ${sub.toFixed(2).replace('.',',')}\n`;
    if (item.sabores && item.sabores.length > 0) {
      msg += `  _Sabores: ${item.sabores.join(', ')}_\n`;
    }
  });
  
  msg += `\n💰 *TOTAL: R$ ${total.toFixed(2).replace('.',',')}*`;

  const url = `https://api.whatsapp.com/send?phone=5516997012345&text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
  
  mostrarEtapa('sucesso');
  carrinho = [];
  atualizarBotaoCarrinho();
}

function showToast(msg, tipo) {
  const t = document.createElement('div');
  t.className = `toast ${tipo}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  }, 3000);
}

function abrirModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('ativo');
}

function fecharModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('ativo');
}
