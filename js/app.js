// Autenticação do cliente via Cloudflare Worker -> API Protheus.
// Ajuste somente a URL se o domínio do Worker mudar.
const API_URL = 'https://purple-resonance-193c.raspy-pond-9283.workers.dev';
const LOGIN_ENDPOINT = '/api/b2b/auth/login';
const CHAVE_CLIENTE = 'portalCliente';

const app = document.getElementById('app');
app.innerHTML = `
  <div class="card card-consulta mb-3">
    <div class="card-body p-4">
      <form id="formLogin" novalidate>
        <div class="mb-3">
          <label for="usuario" class="form-label fw-semibold">Usuário</label>
          <input id="usuario" name="usuario" type="text" class="form-control form-control-lg"
                 autocomplete="username" maxlength="100" required aria-describedby="usuarioErro">
          <div id="usuarioErro" class="invalid-feedback">Informe o usuário.</div>
        </div>
        <div class="mb-3">
          <label for="senha" class="form-label fw-semibold">Senha</label>
          <div class="input-group has-validation">
            <input id="senha" name="senha" type="password" class="form-control form-control-lg"
                   autocomplete="current-password" required aria-describedby="senhaErro">
            <button type="button" class="btn btn-outline-secondary" id="alternarSenha"
                    aria-label="Mostrar senha" aria-pressed="false">
              <i class="bi bi-eye" aria-hidden="true"></i>
            </button>
            <div id="senhaErro" class="invalid-feedback">Informe a senha.</div>
          </div>
        </div>
        <div id="mensagemLogin" role="alert" aria-live="polite"></div>
        <button id="btnEntrar" type="submit" class="btn btn-primary btn-lg w-100 fw-semibold">
          <span id="textoEntrar">Entrar</span>
        </button>
      </form>
    </div>
  </div>`;

const form = document.getElementById('formLogin');
const usuarioInput = document.getElementById('usuario');
const senhaInput = document.getElementById('senha');
const botao = document.getElementById('btnEntrar');
const mensagem = document.getElementById('mensagemLogin');
let enviando = false;

function informar(texto) {
  mensagem.replaceChildren();
  if (!texto) return;
  const alerta = document.createElement('div');
  alerta.className = 'alert alert-danger';
  alerta.textContent = texto;
  mensagem.appendChild(alerta);
}

function validarCampos() {
  const usuarioOk = usuarioInput.value.trim().length > 0;
  const senhaOk = senhaInput.value.length > 0;
  usuarioInput.classList.toggle('is-invalid', !usuarioOk);
  senhaInput.classList.toggle('is-invalid', !senhaOk);
  if (!usuarioOk) usuarioInput.focus();
  else if (!senhaOk) senhaInput.focus();
  return usuarioOk && senhaOk;
}

for (const campo of [usuarioInput, senhaInput]) {
  campo.addEventListener('input', () => {
    campo.classList.remove('is-invalid');
    informar('');
  });
}

document.getElementById('alternarSenha').addEventListener('click', (event) => {
  const mostrar = senhaInput.type === 'password';
  senhaInput.type = mostrar ? 'text' : 'password';
  event.currentTarget.setAttribute('aria-pressed', String(mostrar));
  event.currentTarget.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
  event.currentTarget.querySelector('i').className = mostrar ? 'bi bi-eye-slash' : 'bi bi-eye';
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (enviando || !validarCampos()) return;

  enviando = true;
  botao.disabled = true;
  document.getElementById('textoEntrar').textContent = 'Autenticando...';
  informar('');

  // Não armazenar usuário/senha em localStorage, sessionStorage ou URL.
  const usuario = usuarioInput.value.trim();
  const senha = senhaInput.value;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const resposta = await fetch(`${API_URL}${LOGIN_ENDPOINT}`, {
      method: 'POST',
      mode: 'cors',
      credentials: 'include', // Worker deve configurar CORS com origem explícita e cookies seguros.
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
      body: JSON.stringify({ usuario, senha })
    });

    let dados = null;
    try { dados = await resposta.json(); } catch (_) {}

    if (!resposta.ok) {
      if (resposta.status === 401 || resposta.status === 403) {
        throw new Error('Usuário ou senha inválidos.');
      }
      if (resposta.status === 429) {
        throw new Error('Muitas tentativas. Aguarde e tente novamente.');
      }
      throw new Error('Não foi possível autenticar. Tente novamente.');
    }

    // Contrato esperado: HTTP 2xx + { autenticado: true }.
    // Não considerar HTTP 200 isoladamente como login válido.
    if (!dados || dados.autenticado !== true) {
      throw new Error('Resposta de autenticação inesperada. Verifique o contrato da API.');
    }

    // Apenas informações de exibição. NÃO é uma credencial nem prova de autenticação.
    const cliente = dados.cliente && typeof dados.cliente === 'object' ? dados.cliente : {};
    sessionStorage.setItem(CHAVE_CLIENTE, JSON.stringify({
      name: String(cliente.nome ?? cliente.name ?? usuario).slice(0, 100)
    }));
    senhaInput.value = '';
    window.location.assign('pedidos.html');
  } catch (erro) {
    informar(erro.name === 'AbortError'
      ? 'Tempo de resposta excedido. Tente novamente.'
      : erro instanceof TypeError
        ? 'Não foi possível conectar ao serviço de autenticação.'
        : erro.message);
  } finally {
    clearTimeout(timeout);
    enviando = false;
    botao.disabled = false;
    document.getElementById('textoEntrar').textContent = 'Entrar';
  }
});
