/**
 * config.js
 * ------------------------------------------------------------------
 * Configurações globais do site (WhatsApp, Instagram, e-mail, PIX).
 *
 * Os valores abaixo são apenas o FALLBACK inicial (usado enquanto a
 * busca ao servidor não termina, ou caso ela falhe). Os valores reais
 * são carregados de /api/configuracoes — e podem ser editados pela
 * dashboard administrativa, em Configurações → Informações de contato,
 * sem precisar mexer em código.
 *
 * Qualquer script que use window.CONFIG para montar um link (WhatsApp,
 * Instagram, PIX) deve dar `await window.CONFIG_CARREGADO;` antes,
 * para garantir que está usando os valores mais atuais.
 * ------------------------------------------------------------------
 */
window.CONFIG = {
  NOME_PROJETO: 'Vô Catraquinha',
  WHATSAPP_NUMERO: '5511984800072',
  INSTAGRAM_URL: 'https://www.instagram.com/vocatraquinha',
  EMAIL_CONTATO: 'vocatraquinhasite@gmail.com',
  CHAVE_PIX: '5511984800072',
  IMAGEM_HERO: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=900',
  IMAGEM_HISTORIA_HOME: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800',
  IMAGEM_HISTORIA_SOBRE: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800',

  mensagemWhatsappPadrao(nomeAnimal) {
    if (nomeAnimal) {
      return `Olá! Vi o(a) ${nomeAnimal} no site do Vô Catraquinha e tenho interesse em saber mais sobre a adoção. 🐾`;
    }
    return 'Olá! Encontrei o site do Vô Catraquinha e gostaria de saber mais sobre os animais disponíveis para adoção. 🐾';
  },

  linkWhatsapp(nomeAnimal) {
    const texto = encodeURIComponent(this.mensagemWhatsappPadrao(nomeAnimal));
    return `https://wa.me/${this.WHATSAPP_NUMERO}?text=${texto}`;
  },
};

// ---- Cache local (evita o "pisca" da imagem padrão) ----
// Guardamos no navegador a última configuração real recebida do servidor.
// Assim, nas visitas seguintes, os valores reais (ex: a foto do banner) já
// estão disponíveis de forma SÍNCRONA, antes mesmo da requisição terminar —
// e a imagem padrão nunca chega a aparecer na tela.
const CHAVE_CACHE_CONFIG = 'vo-catraquinha:config-cache';
try {
  const cache = JSON.parse(localStorage.getItem(CHAVE_CACHE_CONFIG) || '{}');
  Object.assign(window.CONFIG, cache);
} catch (e) {
  /* localStorage indisponível ou cache corrompido: segue com os padrões */
}

function salvarCacheConfig() {
  try {
    const { WHATSAPP_NUMERO, INSTAGRAM_URL, EMAIL_CONTATO, CHAVE_PIX, IMAGEM_HERO, IMAGEM_HISTORIA_HOME, IMAGEM_HISTORIA_SOBRE } = window.CONFIG;
    localStorage.setItem(
      CHAVE_CACHE_CONFIG,
      JSON.stringify({ WHATSAPP_NUMERO, INSTAGRAM_URL, EMAIL_CONTATO, CHAVE_PIX, IMAGEM_HERO, IMAGEM_HISTORIA_HOME, IMAGEM_HISTORIA_SOBRE })
    );
  } catch (e) {
    /* sem espaço/permissão: ignora, o site continua funcionando normalmente */
  }
}

// Promise resolvida assim que as configurações reais (vindas do banco de
// dados, editáveis pela dashboard) substituírem os valores padrão acima.
window.CONFIG_CARREGADO = fetch('/api/configuracoes')
  .then((resposta) => (resposta.ok ? resposta.json() : null))
  .then((dados) => {
    if (!dados || !dados.configuracoes) return;
    const c = dados.configuracoes;
    if (c.whatsapp_numero) window.CONFIG.WHATSAPP_NUMERO = c.whatsapp_numero;
    if (c.instagram_url) window.CONFIG.INSTAGRAM_URL = c.instagram_url;
    if (c.email_contato) window.CONFIG.EMAIL_CONTATO = c.email_contato;
    if (c.chave_pix) window.CONFIG.CHAVE_PIX = c.chave_pix;
    if (c.imagem_hero) window.CONFIG.IMAGEM_HERO = c.imagem_hero;
    if (c.imagem_historia_home) window.CONFIG.IMAGEM_HISTORIA_HOME = c.imagem_historia_home;
    if (c.imagem_historia_sobre) window.CONFIG.IMAGEM_HISTORIA_SOBRE = c.imagem_historia_sobre;
    salvarCacheConfig();
  })
  .catch(() => {
    /* Falha ao buscar: segue usando os valores padrão definidos acima */
  });
