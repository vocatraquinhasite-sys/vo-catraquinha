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
  IMAGEM_HERO: '/assets/img/fotodomenu.png',
  IMAGEM_HISTORIA_HOME: '/assets/img/fotodosobre.jpg',
  IMAGEM_HISTORIA_SOBRE: '/assets/img/fotodosobre.jpg',

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
  })
  .catch(() => {
    /* Falha ao buscar: segue usando os valores padrão definidos acima */
  });
