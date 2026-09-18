/**
 * admin-login.js
 * ------------------------------------------------------------------
 * Autenticação administrativa: envia e-mail/senha, guarda o token
 * JWT retornado e redireciona para a dashboard.
 * ------------------------------------------------------------------
 */
(function () {
  const form = document.getElementById('form-login');
  const botao = document.getElementById('botao-login');
  const mensagem = document.getElementById('mensagem-login');

  // Se já estiver autenticado, pula direto para a dashboard
  (async function verificarSessaoExistente() {
    const token = window.api.token.obter();
    if (!token) return;
    try {
      await window.api.get('/auth/me', { autenticado: true });
      window.location.href = '/admin/dashboard.html';
    } catch (e) {
      window.api.token.limpar();
    }
  })();

  function exibirErro(texto) {
    mensagem.hidden = false;
    mensagem.className = 'mensagem-form mensagem-form--erro';
    mensagem.textContent = texto;
  }

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    mensagem.hidden = true;
    botao.disabled = true;
    botao.textContent = 'Entrando...';

    const dados = Object.fromEntries(new FormData(form).entries());

    try {
      const resposta = await window.api.post('/auth/login', dados);
      window.api.token.salvar(resposta.token);
      window.location.href = '/admin/dashboard.html';
    } catch (erro) {
      exibirErro(erro.message || 'Não foi possível entrar. Verifique seus dados.');
      botao.disabled = false;
      botao.textContent = 'Entrar';
    }
  });
})();
