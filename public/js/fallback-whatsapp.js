/**
 * fallback-whatsapp.js
 * ------------------------------------------------------------------
 * Componente reutilizável: um link/aviso "Não está conseguindo
 * responder por aqui?" que aparece nos formulários do site. Ao
 * clicar, abre o WhatsApp do projeto com uma mensagem automática
 * pedindo o link do formulário original, para quem tiver alguma
 * dificuldade técnica em preencher direto no site.
 *
 * Uso: chamar `window.montarFallbackWhatsapp(idContainer, nomeFormulario)`
 * depois que window.CONFIG já existe (o próprio componente aguarda
 * window.CONFIG_CARREGADO antes de montar o link).
 *
 *   <div id="fallback-whatsapp"></div>
 *   <script>window.montarFallbackWhatsapp('fallback-whatsapp', 'de adoção');</script>
 * ------------------------------------------------------------------
 */
window.montarFallbackWhatsapp = async function montarFallbackWhatsapp(idContainer, nomeFormulario) {
  const alvo = document.getElementById(idContainer);
  if (!alvo) return;

  await (window.CONFIG_CARREGADO || Promise.resolve());

  const mensagem = `Olá! Não estou conseguindo responder o formulário ${nomeFormulario} pelo site. Poderiam me enviar o link para responder diretamente, por favor?`;
  const link = `https://wa.me/${window.CONFIG.WHATSAPP_NUMERO}?text=${encodeURIComponent(mensagem)}`;

  alvo.innerHTML = `
    <div class="aviso-fallback-form">
      <span>Está com dificuldade para preencher por aqui?</span>
      <a href="${link}" target="_blank" rel="noopener" class="aviso-fallback-form__link">
        💬 Peça o formulário pelo WhatsApp
      </a>
    </div>
  `;
};
