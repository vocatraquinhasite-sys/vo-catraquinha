/**
 * api.js
 * ------------------------------------------------------------------
 * Pequeno wrapper sobre fetch() para conversar com o backend.
 * Fica disponível globalmente como `window.api`.
 * ------------------------------------------------------------------
 */
(function () {
  const BASE_URL = '/api';
  const CHAVE_TOKEN = 'vo-catraquinha:token';

  function obterToken() {
    return localStorage.getItem(CHAVE_TOKEN);
  }

  function salvarToken(token) {
    localStorage.setItem(CHAVE_TOKEN, token);
  }

  function limparToken() {
    localStorage.removeItem(CHAVE_TOKEN);
  }

  async function requisicao(caminho, { metodo = 'GET', corpo, autenticado = false, isFormData = false } = {}) {
    const cabecalhos = {};
    if (!isFormData) cabecalhos['Content-Type'] = 'application/json';
    if (autenticado) {
      const token = obterToken();
      if (token) cabecalhos['Authorization'] = `Bearer ${token}`;
    }

    const resposta = await fetch(`${BASE_URL}${caminho}`, {
      method: metodo,
      headers: cabecalhos,
      body: corpo ? (isFormData ? corpo : JSON.stringify(corpo)) : undefined,
    });

    let dados = null;
    const tipoConteudo = resposta.headers.get('content-type') || '';
    if (tipoConteudo.includes('application/json')) {
      dados = await resposta.json().catch(() => null);
    }

    if (!resposta.ok) {
      const mensagem = (dados && dados.erro) || `Erro ${resposta.status} ao comunicar com o servidor.`;
      const erro = new Error(mensagem);
      erro.status = resposta.status;
      erro.dados = dados;
      throw erro;
    }

    return dados;
  }

  window.api = {
    get: (caminho, opts) => requisicao(caminho, { ...opts, metodo: 'GET' }),
    post: (caminho, corpo, opts) => requisicao(caminho, { ...opts, metodo: 'POST', corpo }),
    put: (caminho, corpo, opts) => requisicao(caminho, { ...opts, metodo: 'PUT', corpo }),
    patch: (caminho, corpo, opts) => requisicao(caminho, { ...opts, metodo: 'PATCH', corpo }),
    del: (caminho, opts) => requisicao(caminho, { ...opts, metodo: 'DELETE' }),
    token: { obter: obterToken, salvar: salvarToken, limpar: limparToken },
  };
})();
