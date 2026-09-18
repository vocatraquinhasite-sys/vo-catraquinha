/**
 * includes.js
 * ------------------------------------------------------------------
 * Renderiza o cabeçalho (navegação) e o rodapé em todas as páginas
 * públicas do site, a partir de um único lugar — evita duplicar o
 * mesmo HTML em cada arquivo .html e manter tudo sincronizado.
 *
 * Cada página só precisa ter:
 *   <div id="app-cabecalho"></div>  logo após <body>
 *   <div id="app-rodape"></div>     antes de fechar </body>
 * ------------------------------------------------------------------
 */
(function () {
  const LINKS_NAV = [
    { href: '/index.html', rotulo: 'Início' },
    { href: '/animais.html', rotulo: 'Animais' },
    { href: '/divulgacao.html', rotulo: 'Divulgar um cão' },
    { href: '/doacoes.html', rotulo: 'Doações' },
    { href: '/voluntarios.html', rotulo: 'Voluntários' },
    { href: '/sobre.html', rotulo: 'Sobre' },
  ];

  function caminhoAtual() {
    const p = window.location.pathname;
    if (p === '/' || p === '') return '/index.html';
    return p;
  }

  function renderizarCabecalho() {
    const alvo = document.getElementById('app-cabecalho');
    if (!alvo) return;

    const atual = caminhoAtual();
    const itensNav = LINKS_NAV.map(
      (item) => `<li><a class="nav-principal__link" href="${item.href}" ${item.href === atual ? 'aria-current="page"' : ''}>${item.rotulo}</a></li>`
    ).join('');

    alvo.innerHTML = `
      <header class="cabecalho">
        <div class="cabecalho__conteudo">
          <a href="/index.html" class="marca">
            <span class="marca__pata">🐾</span> Vô <span>Catraquinha</span>
          </a>

          <nav aria-label="Navegação principal">
            <ul class="nav-principal" id="nav-principal">
              ${itensNav}
            </ul>
          </nav>

          <div class="cabecalho__acoes">
            <button type="button" class="botao-tema" data-acao="alternar-tema" aria-pressed="false" aria-label="Ativar tema escuro">🌙</button>
            <a href="/animais.html" class="botao botao--primario botao--nav-cta">Adotar</a>
            <button type="button" class="botao-menu-mobile" id="botao-menu-mobile" aria-expanded="false" aria-controls="nav-principal" aria-label="Abrir menu">☰</button>
          </div>
        </div>
      </header>
    `;

    const botaoMenu = document.getElementById('botao-menu-mobile');
    const nav = document.getElementById('nav-principal');
    botaoMenu.addEventListener('click', () => {
      const aberto = nav.classList.toggle('aberto');
      botaoMenu.setAttribute('aria-expanded', String(aberto));
      botaoMenu.textContent = aberto ? '✕' : '☰';
    });

    if (window.theme_atualizarBotoes) window.theme_atualizarBotoes();
  }

  async function renderizarRodape() {
    const alvo = document.getElementById('app-rodape');
    if (!alvo) return;

    await (window.CONFIG_CARREGADO || Promise.resolve());

    const ano = new Date().getFullYear();
    const instagram = (window.CONFIG && window.CONFIG.INSTAGRAM_URL) || '#';
    const whatsapp = (window.CONFIG && window.CONFIG.linkWhatsapp()) || '#';
    const email = (window.CONFIG && window.CONFIG.EMAIL_CONTATO) || '';

    alvo.innerHTML = `
      <footer class="rodape">
        <div class="container">
          <div class="rodape__grid">
            <div>
              <div class="rodape__marca">🐾 Vô Catraquinha</div>
              <p class="rodape__descricao">Projeto social dedicado ao acolhimento, cuidado e adoção responsável de animais idosos em situação de abandono.</p>
            </div>
            <div>
              <div class="rodape__titulo">Navegação</div>
              <ul class="rodape__links">
                <li><a href="/animais.html">Ver animais</a></li>
                <li><a href="/divulgacao.html">Divulgar um cão idoso</a></li>
                <li><a href="/doacoes.html">Como doar</a></li>
                <li><a href="/voluntarios.html">Seja voluntário(a)</a></li>
                <li><a href="/sobre.html">Sobre o projeto</a></li>
              </ul>
            </div>
            <div>
              <div class="rodape__titulo">Contato</div>
              <ul class="rodape__links">
                <li><a href="${whatsapp}" target="_blank" rel="noopener">WhatsApp</a></li>
                <li><a href="${instagram}" target="_blank" rel="noopener">Instagram</a></li>
                ${email ? `<li><a href="mailto:${email}">${email}</a></li>` : ''}
              </ul>
            </div>
            <div>
              <div class="rodape__titulo">Área restrita</div>
              <ul class="rodape__links">
                <li><a href="/admin/login.html">Login administrativo</a></li>
              </ul>
            </div>
          </div>
          <div class="rodape__base">
            <span>© ${ano} Vô Catraquinha. Feito com carinho por quem acredita na adoção de animais idosos.</span>
            <div class="rodape__redes">
              <a href="${instagram}" target="_blank" rel="noopener" aria-label="Instagram do Vô Catraquinha">📷</a>
              <a href="${whatsapp}" target="_blank" rel="noopener" aria-label="WhatsApp do Vô Catraquinha">💬</a>
            </div>
          </div>
        </div>
      </footer>

      <a href="${whatsapp}" target="_blank" rel="noopener" class="whatsapp-flutuante" aria-label="Falar no WhatsApp">💬</a>
    `;
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderizarCabecalho();
    renderizarRodape();
  });
})();
