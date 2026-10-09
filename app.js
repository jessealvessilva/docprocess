// ===== CONFIGURAÇÃO =====
const API_URL = "https://purple-resonance-193c.raspy-pond-9283.workers.dev";

// ===== ESTADO =====
const estado = {
  tela: 'cpf',
  cliente: null,
  pedidos: [],
  filtro: ''
};

// ===== PONTO DE ENTRADA =====
function render() {
  const app = document.getElementById('app');
  const subtitulo = document.getElementById('subtitulo');

  if (estado.tela === 'cpf') {
    subtitulo.textContent = 'Informe seu CPF ou CNPJ para começar';
    app.innerHTML = telaCPF();
    bindTelaCPF();
  } else if (estado.tela === 'pedidos') {
    subtitulo.textContent = `Pedidos de ${estado.cliente?.name ?? ''}`;
    app.innerHTML = telaPedidos();
    bindTelaPedidos();
  }
}

// ===== TELA 1: CPF / CNPJ =====
function telaCPF() {
  return `
    <div class="card card-consulta mb-3">
      <div class="card-body p-4">
        <form id="formCPF" novalidate>
          <div class="mb-4">
            <label class="form-label fw-semibold">CPF ou CNPJ</label>
            <input type="text" class="form-control form-control-lg"
                   id="documento"
                   placeholder="Ex: 000.000.000-00 ou 00.000.000/0000-00"
                   inputmode="numeric" required>
            <div class="form-text">
              Informe apenas números, com ou sem pontuação.
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-lg w-100 fw-semibold">
            Consultar
          </button>
        </form>
      </div>
    </div>
  `;
}

function bindTelaCPF() {
  document.getElementById('formCPF').addEventListener('submit', async (e) => {
    e.preventDefault();
    const documento = document.getElementById('documento').value.trim();
    await validarCliente(documento);
  });
}

// ===== VALIDAÇÃO DE DOCUMENTO =====
function validarDocumento(doc) {
  const limpo = doc.replace(/[.\-\/\s]/g, '');
  if (!/^\d+$/.test(limpo)) return null;
  if (limpo.length === 11) return 'CPF';
  if (limpo.length === 14) return 'CNPJ';
  return null;
}

function limparDocumento(doc) {
  return doc.replace(/[.\-\/\s]/g, '');
}

// ===== VALIDA CLIENTE =====
async function validarCliente(documento) {
  const app = document.getElementById('app');

  const tipo = validarDocumento(documento);
  if (!tipo) {
    app.innerHTML = `
      <div class="alert alert-warning">
        Documento inválido. Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).
      </div>
      <button class="btn btn-outline-secondary w-100" onclick="voltarCPF()">
        Tentar novamente
      </button>`;
    return;
  }

  const docLimpo = limparDocumento(documento);
  app.innerHTML = `<div class="text-muted text-center py-4">Consultando...</div>`;

  try {
    const resp = await fetch(`${API_URL}/valida-cliente`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documento: docLimpo })
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    if (!data.cliente) {
      app.innerHTML = `
        <div class="alert alert-warning">
          Cliente não encontrado para o documento informado.
        </div>
        <button class="btn btn-outline-secondary w-100" onclick="voltarCPF()">
          Tentar novamente
        </button>`;
      return;
    }

    estado.cliente = data.cliente;
    estado.tela = 'pedidos';
    await carregarPedidos();

  } catch (err) {
    app.innerHTML = `
      <div class="alert alert-danger">Erro: ${err.message}</div>
      <button class="btn btn-outline-secondary w-100" onclick="voltarCPF()">
        Tentar novamente
      </button>`;
  }
}

// ===== TELA 2: PEDIDOS =====
async function carregarPedidos() {
  const app = document.getElementById('app');
  app.innerHTML = `<div class="text-muted text-center py-4">Carregando pedidos...</div>`;

  try {
    const resp = await fetch(`${API_URL}/lista-pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documento: estado.cliente.documento })
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    estado.pedidos = data.items ?? [];
    estado.filtro = '';
    render();

  } catch (err) {
    app.innerHTML = `
      <div class="alert alert-danger">Erro ao carregar pedidos: ${err.message}</div>
      <button class="btn btn-outline-secondary w-100" onclick="voltarCPF()">
        Voltar
      </button>`;
  }
}

function telaPedidos() {
  const filtrados = filtrarPedidos(estado.pedidos, estado.filtro);

  return `
    <div class="card card-consulta mb-3">
      <div class="card-body p-4">

        <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <div>
            <div class="fw-semibold">${estado.cliente?.name ?? ''}</div>
            <small class="text-muted">${estado.cliente?.documento ?? ''}</small>
          </div>
          <button class="btn btn-sm btn-outline-secondary" onclick="voltarCPF()">
            Nova consulta
          </button>
        </div>

        <div class="mb-3">
          <input type="text" class="form-control" id="busca"
                 placeholder="Buscar pedido..." value="${estado.filtro}">
        </div>

        <div class="text-muted small mb-2">
          ${filtrados.length} de ${estado.pedidos.length} pedido(s)
        </div>

        <div class="list-group list-group-flush">
          ${filtrados.length === 0
            ? `<div class="text-muted text-center py-4">Nenhum pedido encontrado.</div>`
            : filtrados.map(p => `
                <div class="list-group-item pedido-item px-0">
                  <div class="d-flex justify-content-between align-items-start gap-3">
                    <div class="flex-grow-1">
                      <div class="fw-semibold">${p.id ?? '-'}</div>
                      <small class="text-muted d-block">${p.descricao ?? ''}</small>
                    </div>
                    <span class="badge bg-primary-subtle text-primary-emphasis">
                      ${p.tipo ?? '-'}
                    </span>
                  </div>
                </div>
              `).join('')
          }
        </div>
      </div>
    </div>
  `;
}

function bindTelaPedidos() {
  const busca = document.getElementById('busca');
  if (busca) {
    busca.addEventListener('input', (e) => {
      estado.filtro = e.target.value;
      const app = document.getElementById('app');
      app.innerHTML = telaPedidos();
      bindTelaPedidos();
      document.getElementById('busca').focus();
    });
  }
}

function filtrarPedidos(pedidos, filtro) {
  if (!filtro) return pedidos;
  const f = filtro.toLowerCase();
  return pedidos.filter(p =>
    (p.id ?? '').toLowerCase().includes(f) ||
    (p.descricao ?? '').toLowerCase().includes(f) ||
    (p.tipo ?? '').toLowerCase().includes(f)
  );
}

// ===== NAVEGAÇÃO =====
function voltarCPF() {
  estado.tela = 'cpf';
  estado.cliente = null;
  estado.pedidos = [];
  estado.filtro = '';
  render();
}

// ===== INICIALIZA =====
render();
