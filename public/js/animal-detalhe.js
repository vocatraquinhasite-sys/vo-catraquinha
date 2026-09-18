/**
 * animal-detalhe.js
 * ------------------------------------------------------------------
 * RF04 - Página individual do animal: nome, idade, porte, sexo,
 * história, fotos, vídeos e o botão "Tenho Interesse" (RF05), que
 * abre um modal com duas opções: formulário completo de adoção ou
 * WhatsApp direto.
 * ------------------------------------------------------------------
 */
(function () {
  const RÓTULOS_PORTE = { pequeno: 'Pequeno', medio: 'Médio', grande: 'Grande' };
  const RÓTULOS_SEXO = { macho: 'Macho', femea: 'Fêmea' };
  const RÓTULOS_STATUS = { disponivel: 'Disponível para adoção', processo: 'Em processo de adoção', adotado: 'Já foi adotado(a) 🎉' };
  const RÓTULOS_ESPECIE = { cachorro: 'Cachorro', gato: 'Gato', outro: 'Animal' };

  function idDaUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  }

  function urlEmbedVideo(url) {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
        let videoId = u.searchParams.get('v');
        if (!videoId && u.hostname.includes('youtu.be')) videoId = u.pathname.slice(1);
        if (videoId) return { tipo: 'iframe', src: `https://www.youtube.com/embed/${videoId}` };
      }
    } catch (e) { /* URL relativa (arquivo local) cai no tratamento abaixo */ }

    if (/\.(mp4|webm|ogg)$/i.test(url)) {
      return { tipo: 'video', src: url };
    }
    return { tipo: 'link', src: url };
  }

  function renderizarGaleria(fotos, nomeOriginal) {
    const nome = window.escaparHtml(nomeOriginal);
    const lista = fotos.length ? fotos : [{ url: 'https://images.unsplash.com/photo-1601758064135-953077c46bb2?w=900' }];
    const miniaturas = lista
      .map(
        (f, i) => `<button type="button" class="miniatura ${i === 0 ? 'ativa' : ''}" data-src="${f.url}" aria-label="Ver foto ${i + 1} de ${nome}"><img src="${f.url}" alt="" loading="lazy" /></button>`
      )
      .join('');

    return `
      <div class="galeria-principal">
        <img id="foto-principal" src="${lista[0].url}" alt="Foto de ${nome}" />
      </div>
      ${lista.length > 1 ? `<div class="galeria-miniaturas">${miniaturas}</div>` : ''}
    `;
  }

  function renderizarVideos(videos) {
    if (!videos.length) return '';
    const itens = videos
      .map((v) => {
        const info = urlEmbedVideo(v.url);
        if (info.tipo === 'iframe') {
          return `<div class="video-wrap"><iframe src="${info.src}" title="Vídeo de apresentação" allowfullscreen loading="lazy"></iframe></div>`;
        }
        if (info.tipo === 'video') {
          return `<div class="video-wrap"><video src="${info.src}" controls preload="metadata"></video></div>`;
        }
        return `<div class="video-wrap" style="display:flex;align-items:center;justify-content:center;"><a href="${info.src}" target="_blank" rel="noopener" style="color:#fff;">▶ Assistir vídeo</a></div>`;
      })
      .join('');

    return `
      <div class="secao-videos">
        <h2>Vídeos</h2>
        <div class="grade-videos">${itens}</div>
      </div>
    `;
  }

  function renderizarAnimal(animal) {
    document.getElementById('titulo-pagina').textContent = `${animal.nome} — Vô Catraquinha`;

    const alvo = document.getElementById('conteudo-animal');
    const jaAdotado = animal.status === 'adotado';
    const nomeSeguro = window.escaparHtml(animal.nome);
    const historiaSegura = animal.historia ? window.escaparHtml(animal.historia).replace(/\n/g, '<br>') : null;

    alvo.innerHTML = `
      <div class="container perfil-animal">
        <div>
          ${renderizarGaleria(animal.fotos, animal.nome)}
        </div>
        <div>
          <div class="perfil-animal__cabecalho">
            <h1 class="perfil-animal__nome">${nomeSeguro}</h1>
            <span class="selo selo--${animal.status}">${RÓTULOS_STATUS[animal.status]}</span>
          </div>
          <p style="color: var(--texto-suave); font-weight:600;">${RÓTULOS_ESPECIE[animal.especie] || 'Animal'} · ${RÓTULOS_SEXO[animal.sexo] || animal.sexo}</p>

          <div class="grade-atributos">
            <div class="atributo"><span class="atributo__rotulo">Idade</span><span class="atributo__valor">${animal.idade_texto || (animal.idade_anos ? animal.idade_anos + ' anos' : '—')}</span></div>
            <div class="atributo"><span class="atributo__rotulo">Porte</span><span class="atributo__valor">${RÓTULOS_PORTE[animal.porte] || animal.porte}</span></div>
            <div class="atributo"><span class="atributo__rotulo">Sexo</span><span class="atributo__valor">${RÓTULOS_SEXO[animal.sexo] || animal.sexo}</span></div>
          </div>

          <div class="perfil-animal__historia">
            <h2>História</h2>
            <p>${historiaSegura || 'Em breve traremos mais detalhes sobre a história deste animal.'}</p>
          </div>

          <div class="perfil-animal__acoes">
            ${
              jaAdotado
                ? `<button class="botao botao--fantasma" disabled>Este animal já foi adotado 🎉</button>`
                : `<button type="button" class="botao botao--primario" id="botao-tenho-interesse">🐾 Tenho Interesse</button>`
            }
            <a href="/animais.html" class="botao botao--fantasma">Ver outros animais</a>
          </div>
        </div>
      </div>

      <div class="container">
        ${renderizarVideos(animal.videos)}
      </div>
    `;

    // Troca de foto principal ao clicar nas miniaturas
    document.querySelectorAll('.miniatura').forEach((botao) => {
      botao.addEventListener('click', () => {
        document.getElementById('foto-principal').src = botao.dataset.src;
        document.querySelectorAll('.miniatura').forEach((b) => b.classList.remove('ativa'));
        botao.classList.add('ativa');
      });
    });

    if (!jaAdotado) {
      configurarModalInteresse(animal);
    }
  }

  async function configurarModalInteresse(animal) {
    const overlay = document.getElementById('overlay-interesse');
    const botaoAbrir = document.getElementById('botao-tenho-interesse');
    const botaoFechar = document.getElementById('fechar-modal-interesse');
    const linkFormulario = document.getElementById('opcao-formulario');
    const linkWhatsapp = document.getElementById('opcao-whatsapp');

    linkFormulario.href = `/formulario-adocao.html?animalId=${animal.id}&nome=${encodeURIComponent(animal.nome)}`;

    await (window.CONFIG_CARREGADO || Promise.resolve());
    linkWhatsapp.href = window.CONFIG.linkWhatsapp(animal.nome);

    function abrir() {
      overlay.classList.add('aberto');
      botaoFechar.focus();
    }
    function fechar() {
      overlay.classList.remove('aberto');
      botaoAbrir.focus();
    }

    botaoAbrir.addEventListener('click', abrir);
    botaoFechar.addEventListener('click', fechar);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) fechar(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.classList.contains('aberto')) fechar(); });

    // Registra o clique no WhatsApp para a dona ter um histórico na dashboard
    linkWhatsapp.addEventListener('click', () => {
      window.api.post('/interesses/whatsapp', { animal_id: animal.id }).catch(() => {});
    });
  }

  async function iniciar() {
    const id = idDaUrl();
    const alvo = document.getElementById('conteudo-animal');
    if (!id) {
      alvo.innerHTML = `<div class="container"><div class="estado-vazio"><strong>Animal não especificado</strong>Volte para a listagem e escolha um animal.</div></div>`;
      return;
    }
    try {
      const resposta = await window.api.get(`/animais/${id}`);
      renderizarAnimal(resposta.animal);
    } catch (erro) {
      alvo.innerHTML = `<div class="container"><div class="estado-vazio"><strong>Animal não encontrado</strong>Ele pode ter sido removido ou o link está incorreto.</div></div>`;
    }
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
