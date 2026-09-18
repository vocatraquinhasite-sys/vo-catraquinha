/**
 * theme.js
 * ------------------------------------------------------------------
 * Controla a alternância entre tema claro/escuro.
 * A aplicação do tema salvo acontece o mais cedo possível (ver o
 * pequeno script inline no <head> de cada página) para evitar o
 * "flash" de tema errado ao carregar a página. Este arquivo cuida
 * apenas da interação do botão de alternância.
 * ------------------------------------------------------------------
 */
(function () {
  const CHAVE_TEMA = 'vo-catraquinha:tema';

  function temaAtual() {
    return document.documentElement.getAttribute('data-tema') || 'claro';
  }

  function aplicarTema(tema) {
    document.documentElement.setAttribute('data-tema', tema);
    localStorage.setItem(CHAVE_TEMA, tema);
    atualizarBotoes(tema);
  }

  function atualizarBotoes(tema) {
    document.querySelectorAll('[data-acao="alternar-tema"]').forEach((botao) => {
      const escuro = tema === 'escuro';
      botao.setAttribute('aria-pressed', String(escuro));
      botao.textContent = escuro ? '☀️' : '🌙';
      botao.setAttribute('aria-label', escuro ? 'Ativar tema claro' : 'Ativar tema escuro');
      botao.title = escuro ? 'Ativar tema claro' : 'Ativar tema escuro';
    });
  }

  // Exposta globalmente para que includes.js possa sincronizar o ícone assim que
  // o cabeçalho (com o botão de tema) for injetado dinamicamente na página.
  window.theme_atualizarBotoes = () => atualizarBotoes(temaAtual());

  function iniciar() {
    atualizarBotoes(temaAtual());
    document.addEventListener('click', (evento) => {
      const botao = evento.target.closest('[data-acao="alternar-tema"]');
      if (!botao) return;
      const novoTema = temaAtual() === 'escuro' ? 'claro' : 'escuro';
      aplicarTema(novoTema);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
