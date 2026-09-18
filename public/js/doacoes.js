/**
 * doacoes.js
 * ------------------------------------------------------------------
 * RF06 - Exibe informações sobre doações e lista as campanhas ativas
 * cadastradas pela dashboard administrativa.
 * ------------------------------------------------------------------
 */
(function () {
  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function cartaoCampanha(c) {
    const meta = Number(c.meta_valor) || 0;
    const arrecadado = Number(c.valor_arrecadado) || 0;
    const percentual = meta > 0 ? Math.min(100, Math.round((arrecadado / meta) * 100)) : null;
    const imagem = c.imagem_url || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=700';

    return `
      <article class="cartao-campanha">
        <div class="cartao-campanha__imagem"><img src="${imagem}" alt="" loading="lazy" /></div>
        <div class="cartao-campanha__corpo">
          <h3>${window.escaparHtml(c.titulo)}</h3>
          <p>${window.escaparHtml(c.descricao)}</p>
          ${
            meta > 0
              ? `
            <div class="barra-progresso"><div class="barra-progresso__preenchimento" style="width:${percentual}%"></div></div>
            <div class="campanha__valores">
              <span>${formatarMoeda(arrecadado)} arrecadados</span>
              <span>Meta: ${formatarMoeda(meta)}</span>
            </div>`
              : ''
          }
        </div>
      </article>
    `;
  }

  async function carregarCampanhas() {
    const alvo = document.getElementById('lista-campanhas');
    try {
      const resposta = await window.api.get('/campanhas');
      if (!resposta.campanhas.length) {
        alvo.innerHTML = `<div class="estado-vazio"><strong>Nenhuma campanha ativa no momento</strong>Volte em breve ou fale com a gente pelo WhatsApp para saber como ajudar.</div>`;
        return;
      }
      alvo.innerHTML = `<div class="grade-campanhas">${resposta.campanhas.map(cartaoCampanha).join('')}</div>`;
    } catch (erro) {
      alvo.innerHTML = `<div class="estado-vazio"><strong>Não foi possível carregar as campanhas</strong>Tente novamente em instantes.</div>`;
    }
  }

  async function configurarAcoes() {
    await (window.CONFIG_CARREGADO || Promise.resolve());

    const linkWhatsapp = document.getElementById('link-whatsapp-doacao');
    if (linkWhatsapp) linkWhatsapp.href = window.CONFIG.linkWhatsapp();

    const chavePix = document.getElementById('chave-pix');
    if (chavePix) chavePix.textContent = window.CONFIG.CHAVE_PIX;

    const botaoCopiar = document.getElementById('botao-copiar-pix');
    if (botaoCopiar) {
      botaoCopiar.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(chavePix.textContent.trim());
          botaoCopiar.textContent = 'Chave copiada ✓';
          setTimeout(() => (botaoCopiar.textContent = 'Copiar chave'), 2000);
        } catch (e) {
          /* Navegador sem suporte a clipboard: a chave já está visível para cópia manual */
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    configurarAcoes();
    carregarCampanhas();
  });
})();
