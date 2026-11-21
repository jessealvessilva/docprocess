# Login B2B — integração do contrato

- Login: POST {WORKER_URL}/api/b2b/auth/login com JSON {"usuario":"...","senha":"..."}.
- Contrato de sucesso esperado: HTTP 2xx + {"autenticado":true,"cliente":{"nome":"..."}}.
- Se a API real retornar outro formato, adaptar Worker ou app.js. O contrato real não foi fornecido.
- Worker deve encaminhar a rota ao Protheus e criar sessão segura.
- `credentials: include` requer CORS com origem exata, Access-Control-Allow-Credentials: true e cookie HttpOnly, Secure, SameSite apropriado, além de proteção CSRF.
- sessionStorage armazena apenas nome para exibição, NÃO autenticação. Checagem de pedidos.html é só de navegação e pode ser contornada.
- Antes de expor dados ou gravar pedidos reais, cada API deve verificar sessão e autorização no servidor. Exigir HTTPS, rate limiting e não registrar senhas em logs.
- Mantidas importação Excel/CSV, limite de 10 MB, planilha única e geração simulada.
