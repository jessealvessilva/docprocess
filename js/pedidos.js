// Importação de pedidos: página independente.
const CHAVE_CLIENTE = 'portalCliente';
const estado = {
  cliente: null,
  importacao: { arquivo: null, itens: [], erros: [], processada: false, pedidoGerado: null }
};
try { estado.cliente = JSON.parse(sessionStorage.getItem(CHAVE_CLIENTE) || 'null'); } catch (_) {}
// Apenas navegação: autorização real deve ocorrer no Worker/Protheus.
if (!estado.cliente) window.location.replace('index.html');

// ===== UTILITÁRIOS =====
function escapeHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizarCabecalho(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function formatarQuantidade(valor) {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 4
  }).format(valor);
}

// Converte números no padrão brasileiro ou internacional.
// Exemplos: 10 | "10" | "1,5" | "1.234,56" | "1,234.56"
function converterQuantidade(valor) {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) && valor > 0 ? valor : null;
  }

  let texto = String(valor ?? '').trim();
  if (!texto) return null;

  texto = texto.replace(/\s/g, '');

  const temVirgula = texto.includes(',');
  const temPonto = texto.includes('.');

  if (temVirgula && temPonto) {
    if (texto.lastIndexOf(',') > texto.lastIndexOf('.')) {
      texto = texto.replace(/\./g, '').replace(',', '.');
    } else {
      texto = texto.replace(/,/g, '');
    }
  } else if (temVirgula) {
    texto = texto.replace(',', '.');
  }

  const numero = Number(texto);
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

function render() {
  const app = document.getElementById('app');
  const subtitulo = document.getElementById('subtitulo');
  if (subtitulo) subtitulo.textContent = estado.cliente?.name
    ? `Importação de pedido — ${estado.cliente.name}`
    : 'Importe uma planilha Excel com SKU e Quantidade';
  app.innerHTML = telaImportacao();
  bindTelaImportacao();
}

// ===== TELA 3: IMPORTAÇÃO DE PEDIDO =====
function telaImportacao() {
  const imp = estado.importacao;

  return `
    <div class="card card-consulta mb-3">
      <div class="card-body p-4">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <div>
            <h5 class="mb-1 fw-bold">Importar pedido</h5>
            <div class="text-muted small">Selecione uma planilha com SKU e Quantidade.</div>
          </div>
          <div class="d-flex align-items-center flex-wrap gap-2">
            <button class="btn btn-success" id="btnGerarPedido" ${!(imp.processada && imp.itens.length > 0 && imp.erros.length === 0 && !imp.pedidoGerado) ? 'disabled' : ''}>
              <i class="bi bi-check2-circle me-1"></i> ${imp.pedidoGerado ? 'Pedido gerado' : 'Gerar pedido (teste)'}
            </button>
            <button class="btn btn-sm btn-outline-secondary" id="btnRetornar">
              <i class="bi bi-arrow-left me-1"></i> Retornar
            </button>
          </div>
        </div>

        <div class="alert alert-light border small">
          <div class="fw-semibold mb-1">Formato esperado</div>
          <div>SKU | Quantidade</div>
          <div class="text-muted">Exemplo: PROD001 | 10</div>
          <div class="text-muted mt-1">Se um SKU aparecer mais de uma vez, as quantidades serão somadas.</div>
        </div>

        <div class="mb-3">
          <label for="arquivoPlanilha" class="form-label fw-semibold">Arquivo da planilha</label>
          <input class="form-control" type="file" id="arquivoPlanilha"
                 accept=".xlsx,.xls,.csv">
          <div class="form-text">Formatos aceitos: XLSX, XLS e CSV. Tamanho máximo: 10 MB. Selecione apenas um arquivo por vez.</div>
        </div>

        ${imp.arquivo ? `
          <div class="alert alert-secondary py-2 small mb-3">
            Arquivo selecionado: <strong>${escapeHtml(imp.arquivo)}</strong>
          </div>
        ` : ''}

        ${imp.processada ? renderResultadoImportacao() : `
          <div class="border rounded-3 text-center text-muted py-4">
            <i class="bi bi-file-earmark-spreadsheet fs-1 d-block mb-2"></i>
            A pré-visualização dos produtos aparecerá aqui.
          </div>
        `}
      </div>
    </div>
  `;
}

function renderResultadoImportacao() {
  const imp = estado.importacao;

  const resumo = `
    <div class="row g-2 mb-3">
      <div class="col-6">
        <div class="border rounded-3 p-3 h-100">
          <div class="text-muted small">SKUs após consolidação</div>
          <div class="fs-4 fw-bold">${imp.itens.length}</div>
        </div>
      </div>
      <div class="col-6">
        <div class="border rounded-3 p-3 h-100">
          <div class="text-muted small">Inconsistências</div>
          <div class="fs-4 fw-bold ${imp.erros.length ? 'text-danger' : 'text-success'}">${imp.erros.length}</div>
        </div>
      </div>
    </div>
  `;

  const tabela = imp.itens.length
    ? `
      <div class="table-responsive tabela-itens-scroll mb-3" role="region" aria-label="Itens importados da planilha" tabindex="0">
        <table class="table table-sm table-striped table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th>SKU</th>
              <th class="text-end">Quantidade total</th>
            </tr>
          </thead>
          <tbody>
            ${imp.itens.map(item => `
              <tr>
                <td class="fw-semibold">${escapeHtml(item.sku)}</td>
                <td class="text-end">${formatarQuantidade(item.quantidade)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
    : `<div class="alert alert-warning">Nenhum produto válido foi encontrado na planilha.</div>`;

  const erros = imp.erros.length
    ? `
      <div class="alert alert-danger">
        <div class="fw-semibold mb-2">Verifique as inconsistências:</div>
        <ul class="mb-0 ps-3">
          ${imp.erros.map(erro => `<li>${escapeHtml(erro)}</li>`).join('')}
        </ul>
      </div>
    `
    : `<div class="alert alert-success">Planilha lida sem inconsistências.</div>`;

  const pedidoGerado = imp.pedidoGerado
    ? `
      <div class="alert alert-success mt-3 mb-3">
        <div class="fw-semibold"><i class="bi bi-check-circle me-1"></i> Pedido de teste gerado!</div>
        <div>Número: <strong>${escapeHtml(imp.pedidoGerado.id)}</strong></div>
        <div class="small">Pedido simulado nesta sessão. Nenhum dado foi gravado no Protheus.</div>
      </div>
    `
    : '';

  return `
    ${resumo}
    ${tabela}
    ${erros}
    ${pedidoGerado}
    <div class="d-flex justify-content-start">
      <button class="btn btn-outline-primary" id="btnNovaPlanilha">
        <i class="bi bi-arrow-repeat me-1"></i> Selecionar outra planilha
      </button>
    </div>
    <div class="form-text mt-3">
      A geração é simulada nesta versão. Nenhum pedido é enviado ou gravado no Protheus.
    </div>
  `;
}

let versaoImportacao = 0;

function bindTelaImportacao() {
  document.getElementById('btnRetornar')?.addEventListener('click', retornarLogin);
  document.getElementById('arquivoPlanilha')?.addEventListener('change', (e) => {
    const arquivos = e.target.files;
    if (!arquivos?.length) return;
    if (arquivos.length !== 1) {
      limparImportacao();
      alert('Selecione apenas uma planilha por vez.');
      return;
    }
    processarPlanilha(arquivos[0]);
  });
  document.getElementById('btnNovaPlanilha')?.addEventListener('click', limparImportacao);
  document.getElementById('btnGerarPedido')?.addEventListener('click', gerarPedidoTeste);
}

function abrirImportacao() {
  versaoImportacao++;
  estado.importacao = {
    arquivo: null,
    itens: [],
    erros: [],
    processada: false,
    pedidoGerado: null
  };
  render();
}

function limparImportacao() {
  versaoImportacao++;
  estado.importacao = {
    arquivo: null,
    itens: [],
    erros: [],
    processada: false,
    pedidoGerado: null
  };
  render();
}

async function processarPlanilha(arquivo) {
  const versaoAtual = ++versaoImportacao;
  const maxBytes = 10 * 1024 * 1024;
  if (arquivo.size > maxBytes) {
    estado.importacao = {
      arquivo: arquivo.name,
      itens: [],
      erros: ['O arquivo ultrapassa o limite de 10 MB.'],
      processada: true,
      pedidoGerado: null
    };
    render();
    return;
  }

  const extensao = arquivo.name.split('.').pop().toLowerCase();
  if (!['xlsx', 'xls', 'csv'].includes(extensao)) {
    estado.importacao = {
      arquivo: arquivo.name,
      itens: [],
      erros: ['Formato de arquivo não suportado. Selecione XLSX, XLS ou CSV.'],
      processada: true,
      pedidoGerado: null
    };
    render();
    return;
  }

  if (typeof XLSX === 'undefined') {
    estado.importacao.erros = ['Não foi possível carregar a biblioteca de leitura de planilhas. Atualize a página e tente novamente.'];
    estado.importacao.arquivo = arquivo.name;
    estado.importacao.processada = true;
    estado.importacao.pedidoGerado = null;
    render();
    return;
  }

  estado.importacao = {
    arquivo: arquivo.name,
    itens: [],
    erros: [],
    processada: false,
    pedidoGerado: null
  };
  render();

  try {
    const buffer = await arquivo.arrayBuffer();
    if (versaoAtual !== versaoImportacao) return;
    const workbook = XLSX.read(buffer, { type: 'array' });

    if (!workbook.SheetNames.length) {
      throw new Error('A planilha não possui nenhuma aba.');
    }

    const planilha = workbook.Sheets[workbook.SheetNames[0]];
    const linhas = XLSX.utils.sheet_to_json(planilha, {
      header: 1,
      defval: '',
      raw: false,
      blankrows: false
    });

    const resultado = interpretarLinhasPlanilha(linhas);

    if (versaoAtual !== versaoImportacao) return;
    estado.importacao = {
      arquivo: arquivo.name,
      itens: resultado.itens,
      erros: resultado.erros,
      processada: true,
      pedidoGerado: null
    };
    render();

  } catch (err) {
    if (versaoAtual !== versaoImportacao) return;
    estado.importacao = {
      arquivo: arquivo.name,
      itens: [],
      erros: [`Não foi possível ler a planilha: ${err.message}`],
      processada: true,
      pedidoGerado: null
    };
    render();
  }
}

function interpretarLinhasPlanilha(linhas) {
  const erros = [];
  const itensMap = new Map();

  if (!linhas.length) {
    return { itens: [], erros: ['A planilha está vazia.'] };
  }

  const cabecalho = linhas[0].map(normalizarCabecalho);
  const colunasPreenchidas = cabecalho
    .map((nome, indice) => ({ nome, indice }))
    .filter(coluna => coluna.nome !== '');

  if (colunasPreenchidas.length !== 2) {
    return {
      itens: [],
      erros: ['A planilha deve possuir exatamente duas colunas preenchidas: SKU e Quantidade.']
    };
  }

  const indiceSku = cabecalho.indexOf('sku');
  const indiceQuantidade = cabecalho.indexOf('quantidade');

  if (indiceSku === -1 || indiceQuantidade === -1 || indiceSku === indiceQuantidade) {
    return {
      itens: [],
      erros: ['Cabeçalho inválido. Utilize exatamente as colunas "SKU" e "Quantidade".']
    };
  }

  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i];
    const skuOriginal = linha[indiceSku];
    const quantidadeOriginal = linha[indiceQuantidade];

    if (String(skuOriginal ?? '').trim() === '' &&
        String(quantidadeOriginal ?? '').trim() === '') {
      continue;
    }

    const sku = String(skuOriginal ?? '').trim();
    const quantidade = converterQuantidade(quantidadeOriginal);
    const numeroLinha = i + 1;

    if (!sku) {
      erros.push(`Linha ${numeroLinha}: SKU não informado.`);
      continue;
    }

    if (quantidade === null) {
      erros.push(`Linha ${numeroLinha}: quantidade inválida para o SKU "${sku}". Informe um número maior que zero.`);
      continue;
    }

    const skuChave = sku.toUpperCase();
    if (itensMap.has(skuChave)) {
      itensMap.get(skuChave).quantidade += quantidade;
    } else {
      itensMap.set(skuChave, {
        sku,
        quantidade
      });
    }
  }

  return {
    itens: Array.from(itensMap.values()),
    erros
  };
}

// ===== GERAÇÃO SIMULADA DO PEDIDO =====
function gerarPedidoTeste() {
  const imp = estado.importacao;

  // Evita gerar mais de um pedido para a mesma importação.
  if (imp.pedidoGerado || !imp.processada || !imp.itens.length || imp.erros.length) {
    return;
  }

  const numero = `TESTE-${Date.now()}`;
  imp.pedidoGerado = { id: numero, itens: imp.itens.length };
  render();
}


function retornarLogin() {
  window.location.assign('index.html');
}

render();
