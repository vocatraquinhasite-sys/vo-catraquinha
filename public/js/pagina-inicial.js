/**
 * pagina-inicial.js
 * ------------------------------------------------------------------
 * Carrega as estatísticas (RF01) e os animais em destaque na home.
 * Depende de cartao-animal.js (window.cartaoAnimalHtml).
 * ------------------------------------------------------------------
 */
(function () {
  async function carregarEstatisticas() {
    const alvo = document.getElementById('grade-estatisticas');
    try {
      const stats = await window.api.get('/stats');
      alvo.innerHTML = `
        <div class="estatistica"><span class="estatistica__numero">${stats.totalAcolhidos}</span><span class="estatistica__rotulo">Animais acolhidos</span></div>
        <div class="estatistica"><span class="estatistica__numero">${stats.totalAdotados}</span><span class="estatistica__rotulo">Adoções realizadas</span></div>
        <div class="estatistica"><span class="estatistica__numero">${stats.totalDisponiveis + stats.totalEmProcesso}</span><span class="estatistica__rotulo">À espera de um lar</span></div>
        <div class="estatistica"><span class="estatistica__numero">${stats.totalVoluntarios}</span><span class="estatistica__rotulo">Voluntários cadastrados</span></div>
      `;
    } catch (erro) {
      console.error('Falha ao carregar estatísticas:', erro);
    }
  }

  async function carregarDestaques() {
    const alvo = document.getElementById('grade-destaques');
    try {
      let resposta = await window.api.get('/animais?destaque=1');
      if (!resposta.animais.length) {
        resposta = await window.api.get('/animais?status=disponivel');
      }
      const animais = resposta.animais.slice(0, 3);
      if (!animais.length) {
        alvo.innerHTML = `<div class="estado-vazio"><strong>Em breve, novos amigos por aqui</strong>Nenhum animal cadastrado no momento.</div>`;
        return;
      }
      alvo.innerHTML = animais.map(window.cartaoAnimalHtml).join('');
    } catch (erro) {
      alvo.innerHTML = `<div class="estado-vazio"><strong>Não foi possível carregar os animais</strong>Tente atualizar a página em instantes.</div>`;
      console.error(erro);
    }
  }

  async function atualizarImagensDaHome() {
    await (window.CONFIG_CARREGADO || Promise.resolve());
    const imgHero = document.getElementById('imagem-hero');
    const imgHistoria = document.getElementById('imagem-historia-home');
    // Confirmação pós-fetch: a foto já foi definida antes da pintura (via cache local).
    // Aqui só trocamos se o servidor tiver uma foto DIFERENTE da que estava em cache
    // (ex: a administradora trocou a imagem pela dashboard) — evita recarga à toa.
    if (imgHero && window.CONFIG.IMAGEM_HERO && imgHero.src !== window.CONFIG.IMAGEM_HERO) {
      imgHero.src = window.CONFIG.IMAGEM_HERO;
    }
    if (imgHistoria && window.CONFIG.IMAGEM_HISTORIA_HOME && imgHistoria.src !== window.CONFIG.IMAGEM_HISTORIA_HOME) {
      imgHistoria.src = window.CONFIG.IMAGEM_HISTORIA_HOME;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    carregarEstatisticas();
    carregarDestaques();
    atualizarImagensDaHome();
  });
})();
