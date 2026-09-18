/**
 * tema-inline.js
 * ------------------------------------------------------------------
 * Este trecho é pensado para ser colado como <script> INLINE (não
 * como arquivo externo) dentro do <head>, antes de qualquer CSS ser
 * pintado na tela. Ele lê o tema salvo (ou a preferência do sistema
 * operacional) e aplica o atributo data-tema no <html> imediatamente,
 * evitando o "flash" de tema claro antes de trocar para o escuro.
 *
 * Motivo de existir como arquivo separado: serve de referência única
 * do trecho que é replicado inline em cada página HTML.
 * ------------------------------------------------------------------
 */
(function () {
  try {
    var salvo = localStorage.getItem('vo-catraquinha:tema');
    if (!salvo) {
      salvo = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
    }
    document.documentElement.setAttribute('data-tema', salvo);
  } catch (e) {
    /* localStorage indisponível: mantém o tema claro padrão */
  }
})();
