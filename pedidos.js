// ============================================
// SISTEMA DE GERAÇÃO DE PEDIDOS
// ============================================

/**
 * Classe para gerenciar pedidos
 */
class GerenciadorPedidos {
  constructor() {
    this.pedidos = this.carregarPedidos();
    this.contadorPedidos = this.obterContadorPedidos();
  }

  /**
   * Carrega pedidos do localStorage
   */
  carregarPedidos() {
    const pedidosArmazenados = localStorage.getItem('itap_pedidos');
    return pedidosArmazenados ? JSON.parse(pedidosArmazenados) : [];
  }

  /**
   * Obtém o contador de pedidos
   */
  obterContadorPedidos() {
    const contador = localStorage.getItem('itap_contador_pedidos');
    return contador ? parseInt(contador) : 1000;
  }

  /**
   * Salva o contador de pedidos
   */
  salvarContador() {
    localStorage.setItem('itap_contador_pedidos', this.contadorPedidos.toString());
  }

  /**
   * Gera um número de pedido único
   * Formato: ITAP-20260228-1001
   */
  gerarNumeroPedido() {
    const data = new Date();
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    const sequencia = String(this.contadorPedidos).padStart(4, '0');
    
    const numeroPedido = `ITAP-${ano}${mes}${dia}-${sequencia}`;
    this.contadorPedidos++;
    this.salvarContador();
    
    return numeroPedido;
  }

  /**
   * Cria um novo pedido
   */
  criarPedido(dadosCliente, itens, total) {
    const pedido = {
      id: this.gerarNumeroPedido(),
      dataCriacao: new Date().toISOString(),
      dataFormatada: this.formatarData(new Date()),
      cliente: {
        nome: dadosCliente.nome,
        whatsapp: dadosCliente.whatsapp,
        endereco: dadosCliente.endereco,
        email: dadosCliente.email || ''
      },
      itens: itens,
      totais: {
        subtotal: total.subtotal,
        desconto: total.desconto || 0,
        total: total.total
      },
      status: 'pendente', // pendente, confirmado, preparando, pronto, entregue
      observacoes: dadosCliente.observacoes || ''
    };

    // Salvar pedido
    this.pedidos.push(pedido);
    this.salvarPedidos();

    return pedido;
  }

  /**
   * Salva pedidos no localStorage
   */
  salvarPedidos() {
    localStorage.setItem('itap_pedidos', JSON.stringify(this.pedidos));
  }

  /**
   * Busca um pedido pelo ID
   */
  buscarPedido(numeroPedido) {
    return this.pedidos.find(p => p.id === numeroPedido);
  }

  /**
   * Formata data para exibição
   */
  formatarData(data) {
    const opcoes = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    };
    return new Intl.DateTimeFormat('pt-BR', opcoes).format(data);
  }

  /**
   * Gera arquivo JSON do pedido
   */
  gerarArquivoJSON(pedido) {
    return JSON.stringify(pedido, null, 2);
  }

  /**
   * Gera arquivo TXT do pedido
   */
  gerarArquivoTXT(pedido) {
    let conteudo = '';
    conteudo += '═══════════════════════════════════════════\n';
    conteudo += '🍦 PEDIDO ITAPOLITANA CAJURU 🍦\n';
    conteudo += '═══════════════════════════════════════════\n\n';
    
    conteudo += `📋 NÚMERO DO PEDIDO: ${pedido.id}\n`;
    conteudo += `📅 DATA: ${pedido.dataFormatada}\n\n`;
    
    conteudo += '👤 DADOS DO CLIENTE\n';
    conteudo += '───────────────────────────────────────────\n';
    conteudo += `Nome: ${pedido.cliente.nome}\n`;
    conteudo += `WhatsApp: ${pedido.cliente.whatsapp}\n`;
    conteudo += `Endereço: ${pedido.cliente.endereco}\n`;
    if (pedido.cliente.email) conteudo += `Email: ${pedido.cliente.email}\n`;
    conteudo += '\n';
    
    conteudo += '📦 ITENS DO PEDIDO\n';
    conteudo += '───────────────────────────────────────────\n';
    
    let indice = 1;
    pedido.itens.forEach(item => {
      conteudo += `\n${indice}. ${item.nome}\n`;
      conteudo += `   Tipo: ${item.tipo}\n`;
      conteudo += `   Quantidade: ${item.quantidade}\n`;
      conteudo += `   Preço Unitário: R$ ${item.preco.toFixed(2)}\n`;
      conteudo += `   Subtotal: R$ ${(item.quantidade * item.preco).toFixed(2)}\n`;
      
      if (item.sabores) {
        conteudo += `   Sabores: ${item.sabores.join(', ')}\n`;
      }
      
      indice++;
    });
    
    conteudo += '\n═══════════════════════════════════════════\n';
    conteudo += '💰 RESUMO FINANCEIRO\n';
    conteudo += '═══════════════════════════════════════════\n';
    conteudo += `Subtotal: R$ ${pedido.totais.subtotal.toFixed(2)}\n`;
    if (pedido.totais.desconto > 0) {
      conteudo += `Desconto: -R$ ${pedido.totais.desconto.toFixed(2)}\n`;
    }
    conteudo += `TOTAL: R$ ${pedido.totais.total.toFixed(2)}\n\n`;
    
    if (pedido.observacoes) {
      conteudo += '📝 OBSERVAÇÕES\n';
      conteudo += '───────────────────────────────────────────\n';
      conteudo += `${pedido.observacoes}\n\n`;
    }
    
    conteudo += '📅 INFORMAÇÕES IMPORTANTES\n';
    conteudo += '───────────────────────────────────────────\n';
    conteudo += '✅ Retirada na loja (Cajuru)\n';
    conteudo += '✅ Prazo: 03 dias úteis após confirmação\n';
    conteudo += '✅ Pagamento: Antecipado via PIX/Dinheiro\n';
    conteudo += '✅ Status: ' + this.traduzirStatus(pedido.status) + '\n\n';
    
    conteudo += '═══════════════════════════════════════════\n';
    conteudo += 'Obrigado por sua encomenda! 🙏\n';
    conteudo += '═══════════════════════════════════════════\n';
    
    return conteudo;
  }

  /**
   * Traduz status para português
   */
  traduzirStatus(status) {
    const traducoes = {
      'pendente': 'Pendente de Confirmação',
      'confirmado': 'Confirmado',
      'preparando': 'Preparando',
      'pronto': 'Pronto para Retirada',
      'entregue': 'Entregue'
    };
    return traducoes[status] || status;
  }

  /**
   * Baixa arquivo do pedido
   */
  baixarArquivo(pedido, formato = 'txt') {
    const conteudo = formato === 'json' 
      ? this.gerarArquivoJSON(pedido)
      : this.gerarArquivoTXT(pedido);
    
    const elemento = document.createElement('a');
    const blob = new Blob([conteudo], { type: 'text/plain' });
    elemento.href = URL.createObjectURL(blob);
    elemento.download = `Pedido_${pedido.id}.${formato}`;
    document.body.appendChild(elemento);
    elemento.click();
    document.body.removeChild(elemento);
  }

  /**
   * Exibe confirmação do pedido
   */
  exibirConfirmacao(pedido) {
    const html = `
      <div class="modal-confirmacao-pedido">
        <div class="confirmacao-conteudo">
          <h2>✅ Pedido Criado com Sucesso!</h2>
          
          <div class="numero-pedido">
            <p>Seu número de pedido:</p>
            <h3>${pedido.id}</h3>
            <button onclick="copiarParaClipboard('${pedido.id}')">📋 Copiar Número</button>
          </div>
          
          <div class="resumo-pedido">
            <h4>Resumo do Pedido:</h4>
            <p><strong>Total:</strong> R$ ${pedido.totais.total.toFixed(2)}</p>
            <p><strong>Itens:</strong> ${pedido.itens.length}</p>
            <p><strong>Data:</strong> ${pedido.dataFormatada}</p>
          </div>
          
          <div class="acoes">
            <button onclick="gerenciadorPedidos.baixarArquivo(gerenciadorPedidos.buscarPedido('${pedido.id}'), 'txt')" class="btn-download">
              📥 Baixar Comprovante (TXT)
            </button>
            <button onclick="gerenciadorPedidos.baixarArquivo(gerenciadorPedidos.buscarPedido('${pedido.id}'), 'json')" class="btn-download">
              📥 Baixar Dados (JSON)
            </button>
            <button onclick="fecharConfirmacao()" class="btn-fechar">
              ✕ Fechar
            </button>
          </div>
          
          <p class="aviso">
            📱 Você receberá uma confirmação via WhatsApp em breve.
          </p>
        </div>
      </div>
    `;
    
    // Inserir no DOM
    const container = document.getElementById('confirmacao-pedido-container');
    if (container) {
      container.innerHTML = html;
      container.style.display = 'block';
    }
  }
}

// ============================================
// INSTÂNCIA GLOBAL
// ============================================
const gerenciadorPedidos = new GerenciadorPedidos();

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Copia texto para clipboard
 */
function copiarParaClipboard(texto) {
  navigator.clipboard.writeText(texto).then(() => {
    showToast('✅ Número de pedido copiado!', 'sucesso');
  }).catch(() => {
    showToast('❌ Erro ao copiar', 'erro');
  });
}

/**
 * Fecha modal de confirmação
 */
function fecharConfirmacao() {
  const container = document.getElementById('confirmacao-pedido-container');
  if (container) {
    container.style.display = 'none';
    container.innerHTML = '';
  }
}

// ============================================
// EXEMPLO DE USO
// ============================================

/*
// Criar um novo pedido
const dadosCliente = {
  nome: 'João Silva',
  whatsapp: '11987654321',
  endereco: 'Rua das Flores, 123',
  email: 'joao@email.com',
  observacoes: 'Entregar na segunda-feira'
};

const itens = [
  { nome: 'Picolés Chocolate', tipo: 'Leite', quantidade: 25, preco: 2.00, sabores: ['Chocolate'] },
  { nome: 'Caixa 5L', tipo: 'Caixa', quantidade: 1, preco: 45.00, sabores: ['Morango', 'Baunilha'] }
];

const total = {
  subtotal: 95.00,
  desconto: 0,
  total: 95.00
};

const pedido = gerenciadorPedidos.criarPedido(dadosCliente, itens, total);
gerenciadorPedidos.exibirConfirmacao(pedido);
*/
