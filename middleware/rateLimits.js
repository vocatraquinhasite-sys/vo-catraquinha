/**
 * middleware/rateLimits.js
 * ------------------------------------------------------------------
 * Limitadores de requisição para proteger a API contra abuso:
 *   - limiteGeral: aplicado a toda a API, evita varreduras/flood genérico.
 *   - limiteEscritaPublica: mais rígido, aplicado só às rotas públicas
 *     que QUALQUER visitante pode enviar dados (formulário de adoção,
 *     cadastro de voluntário, clique no WhatsApp) — sem isso, alguém
 *     poderia programar um script pra spammar essas rotas.
 * ------------------------------------------------------------------
 */
const rateLimit = require('express-rate-limit');

const limiteGeral = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // até 300 requisições por IP nesse intervalo (leitura de páginas, filtros, etc.)
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas requisições em pouco tempo. Aguarde um instante e tente novamente.' },
});

const limiteEscritaPublica = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 12, // até 12 envios por IP por hora nessas rotas específicas
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas de envio. Aguarde um pouco antes de tentar novamente.' },
});

module.exports = { limiteGeral, limiteEscritaPublica };
