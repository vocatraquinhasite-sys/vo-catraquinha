/**
 * seguranca.js
 * ------------------------------------------------------------------
 * Utilitário para "escapar" texto antes de inserir via innerHTML.
 *
 * Por quê isso existe: várias telas do site (principalmente a dashboard
 * administrativa) inserem no HTML dados que vieram de formulários
 * PÚBLICOS — qualquer visitante pode enviar o formulário de adoção ou
 * de voluntariado, por exemplo. Sem escapar esse texto, alguém mal
 * intencionado poderia enviar um formulário contendo código
 * (ex: `<script>` ou `<img onerror=...>`) que executaria dentro da
 * DASHBOARD quando a administradora visualizasse aquele envio — um
 * ataque XSS armazenado, que poderia até roubar o token de login dela.
 *
 * Sempre que um valor vindo de fora (nome, mensagem, história, resposta
 * de formulário) for inserido via innerHTML, ele deve passar por
 * escaparHtml() primeiro.
 * ------------------------------------------------------------------
 */
window.escaparHtml = function escaparHtml(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};
