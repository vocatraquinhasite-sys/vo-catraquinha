/**
 * admin-dashboard.js
 * ------------------------------------------------------------------
 * Lógica completa da área administrativa:
 *   - Guarda de autenticação (redireciona para o login se necessário)
 *   - Navegação entre seções
 *   - CRUD de animais (RF07/RF08/RF09) + upload de fotos e vídeos
 *   - Listagem/gestão de formulários de adoção (RF05)
 *   - CRUD de campanhas
 *   - Listagem de voluntários e contatos via WhatsApp
 *   - Troca de senha
 * ------------------------------------------------------------------
 */

/* ============================ AUTENTICAÇÃO ============================ */

async function garantirAutenticado() {
  const token = window.api.token.obter();
  if (!token) {
    window.location.href = '/admin/login.html';
    return null;
  }
  try {
    const resposta = await window.api.get('/auth/me', { autenticado: true });
    document.getElementById('admin-usuario-nome').textContent = resposta.admin.nome || resposta.admin.email;
    return resposta.admin;
  } catch (erro) {
    window.api.token.limpar();
    window.location.href = '/admin/login.html';
    return null;
  }
}

document.getElementById('botao-sair').addEventListener('click', () => {
  window.api.token.limpar();
  window.location.href = '/admin/login.html';
});

/* ============================ NAVEGAÇÃO ============================ */

const SECOES = ['visao-geral', 'animais', 'formularios', 'divulgacao', 'campanhas', 'voluntarios', 'whatsapp', 'configuracoes'];

function mostrarSecao(nome) {
  SECOES.forEach((s) => {
    document.getElementById(`secao-${s}`).hidden = s !== nome;
  });
  document.querySelectorAll('#admin-nav button').forEach((b) => {
    b.classList.toggle('ativo', b.dataset.secao === nome);
  });

  if (nome === 'visao-geral') carregarResumo();
  if (nome === 'animais') carregarAnimais();
  if (nome === 'formularios') carregarFormularios();
  if (nome === 'divulgacao') carregarDivulgacao();
  if (nome === 'campanhas') carregarCampanhas();
  if (nome === 'voluntarios') carregarVoluntarios();
  if (nome === 'whatsapp') carregarWhatsapp();
  if (nome === 'configuracoes') { verificarModoTesteEmail(); carregarContatoSite(); carregarImagensSite(); }
}

document.getElementById('admin-nav').addEventListener('click', (e) => {
  const botao = e.target.closest('button[data-secao]');
  if (botao) mostrarSecao(botao.dataset.secao);
});

/* Fechar painéis laterais */
document.querySelectorAll('[data-fechar-painel]').forEach((botao) => {
  botao.addEventListener('click', () => fecharPainel(botao.dataset.fecharPainel));
});
function abrirPainel(id) { document.getElementById(id).classList.add('aberto'); }
function fecharPainel(id) { document.getElementById(id).classList.remove('aberto'); }

function exibirMensagem(elId, texto, tipo) {
  const el = document.getElementById(elId);
  el.hidden = false;
  el.className = `mensagem-form mensagem-form--${tipo}`;
  el.textContent = texto;
}

const RÓTULOS_STATUS = { disponivel: 'Disponível', processo: 'Em processo', adotado: 'Adotado' };
const RÓTULOS_STATUS_FORM = { novo: 'Novo', em_analise: 'Em análise', aprovado: 'Aprovado', recusado: 'Recusado' };

function formatarData(iso) {
  try {
    return new Date(iso.replace(' ', 'T') + 'Z').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) { return iso; }
}

/* ============================ VISÃO GERAL ============================ */

async function carregarResumo() {
  const container = document.getElementById('cartoes-resumo');
  try {
    const [stats, formularios, voluntarios, divulgacoes] = await Promise.all([
      window.api.get('/stats'),
      window.api.get('/interesses/formulario', { autenticado: true }),
      window.api.get('/voluntarios', { autenticado: true }),
      window.api.get('/divulgacao', { autenticado: true }),
    ]);

    container.innerHTML = `
      <div class="cartao-resumo"><span class="cartao-resumo__numero">${stats.totalAcolhidos}</span><div class="cartao-resumo__rotulo">Animais cadastrados</div></div>
      <div class="cartao-resumo"><span class="cartao-resumo__numero">${stats.totalDisponiveis}</span><div class="cartao-resumo__rotulo">Disponíveis</div></div>
      <div class="cartao-resumo"><span class="cartao-resumo__numero">${stats.totalAdotados}</span><div class="cartao-resumo__rotulo">Adotados</div></div>
      <div class="cartao-resumo"><span class="cartao-resumo__numero">${formularios.total}</span><div class="cartao-resumo__rotulo">Formulários recebidos</div></div>
      <div class="cartao-resumo"><span class="cartao-resumo__numero">${divulgacoes.total}</span><div class="cartao-resumo__rotulo">Fichas de divulgação</div></div>
      <div class="cartao-resumo"><span class="cartao-resumo__numero">${voluntarios.total}</span><div class="cartao-resumo__rotulo">Voluntários</div></div>
    `;
  } catch (erro) {
    console.error(erro);
  }
}

/* ============================ ANIMAIS ============================ */

let animalEmEdicaoId = null;

async function carregarAnimais() {
  const corpo = document.getElementById('tabela-animais-corpo');
  corpo.innerHTML = `<tr class="linha-carregando-tabela"><td colspan="7">Carregando...</td></tr>`;
  try {
    const resposta = await window.api.get('/animais?todosStatus=1');
    if (!resposta.animais.length) {
      corpo.innerHTML = `<tr class="linha-carregando-tabela"><td colspan="7">Nenhum animal cadastrado ainda. Clique em "Cadastrar animal" para começar.</td></tr>`;
      return;
    }
    corpo.innerHTML = resposta.animais
      .map(
        (a) => `
      <tr data-id="${a.id}">
        <td><img class="miniatura-tabela" src="${a.fotoCapa || 'https://images.unsplash.com/photo-1601758064135-953077c46bb2?w=200'}" alt="" /></td>
        <td>${window.escaparHtml(a.nome)}</td>
        <td>${a.especie}</td>
        <td>${a.porte}</td>
        <td>${a.sexo === 'femea' ? 'Fêmea' : 'Macho'}</td>
        <td>
          <select class="select-status-linha" data-acao="mudar-status" data-id="${a.id}">
            <option value="disponivel" ${a.status === 'disponivel' ? 'selected' : ''}>Disponível</option>
            <option value="processo" ${a.status === 'processo' ? 'selected' : ''}>Em processo</option>
            <option value="adotado" ${a.status === 'adotado' ? 'selected' : ''}>Adotado</option>
          </select>
        </td>
        <td class="acoes-linha">
          <button class="botao-icone" data-acao="editar-animal" data-id="${a.id}">✎ Editar</button>
          <button class="botao-icone botao-icone--perigo" data-acao="excluir-animal" data-id="${a.id}">🗑 Excluir</button>
        </td>
      </tr>`
      )
      .join('');
  } catch (erro) {
    corpo.innerHTML = `<tr class="linha-carregando-tabela"><td colspan="7">Erro ao carregar animais.</td></tr>`;
  }
}

document.getElementById('tabela-animais-corpo').addEventListener('click', async (e) => {
  const botao = e.target.closest('button[data-acao]');
  if (!botao) return;
  const id = botao.dataset.id;

  if (botao.dataset.acao === 'editar-animal') abrirFormularioAnimal(id);
  if (botao.dataset.acao === 'excluir-animal') {
    if (!confirm('Tem certeza que deseja excluir este animal? Essa ação não pode ser desfeita.')) return;
    try {
      await window.api.del(`/animais/${id}`, { autenticado: true });
      carregarAnimais();
    } catch (erro) {
      alert(erro.message);
    }
  }
});

document.getElementById('tabela-animais-corpo').addEventListener('change', async (e) => {
  const select = e.target.closest('select[data-acao="mudar-status"]');
  if (!select) return;
  try {
    await window.api.patch(`/animais/${select.dataset.id}/status`, { status: select.value }, { autenticado: true });
  } catch (erro) {
    alert(erro.message);
    carregarAnimais();
  }
});

function limparFormularioAnimal() {
  animalEmEdicaoId = null;
  document.getElementById('form-animal').reset();
  document.getElementById('a-id').value = '';
  document.getElementById('titulo-painel-animal').textContent = 'Cadastrar animal';
  document.getElementById('secao-midia-animal').hidden = true;
  document.getElementById('mensagem-form-animal').hidden = true;
  document.getElementById('grade-fotos-admin').innerHTML = '';
  document.getElementById('lista-videos-admin').innerHTML = '';
}

document.getElementById('botao-novo-animal').addEventListener('click', () => {
  limparFormularioAnimal();
  abrirPainel('overlay-painel-animal');
});

async function abrirFormularioAnimal(id) {
  limparFormularioAnimal();
  try {
    const resposta = await window.api.get(`/animais/${id}`);
    const a = resposta.animal;
    animalEmEdicaoId = a.id;
    document.getElementById('titulo-painel-animal').textContent = `Editar ${a.nome}`;
    document.getElementById('a-id').value = a.id;
    document.getElementById('a-nome').value = a.nome;
    document.getElementById('a-especie').value = a.especie;
    document.getElementById('a-status').value = a.status;
    document.getElementById('a-porte').value = a.porte;
    document.getElementById('a-sexo').value = a.sexo;
    document.getElementById('a-idade-anos').value = a.idade_anos ?? '';
    document.getElementById('a-idade-texto').value = a.idade_texto ?? '';
    document.getElementById('a-historia').value = a.historia ?? '';
    document.getElementById('a-destaque').checked = !!a.destaque;

    document.getElementById('secao-midia-animal').hidden = false;
    renderizarFotosAdmin(a.fotos);
    renderizarVideosAdmin(a.videos);

    abrirPainel('overlay-painel-animal');
  } catch (erro) {
    alert('Não foi possível carregar os dados do animal.');
  }
}

document.getElementById('form-animal').addEventListener('submit', async (e) => {
  e.preventDefault();
  const corpo = {
    nome: document.getElementById('a-nome').value.trim(),
    especie: document.getElementById('a-especie').value,
    status: document.getElementById('a-status').value,
    porte: document.getElementById('a-porte').value,
    sexo: document.getElementById('a-sexo').value,
    idade_anos: document.getElementById('a-idade-anos').value || '',
    idade_texto: document.getElementById('a-idade-texto').value.trim(),
    historia: document.getElementById('a-historia').value.trim(),
    destaque: document.getElementById('a-destaque').checked,
  };

  try {
    let animal;
    if (animalEmEdicaoId) {
      const resposta = await window.api.put(`/animais/${animalEmEdicaoId}`, corpo, { autenticado: true });
      animal = resposta.animal;
      exibirMensagem('mensagem-form-animal', 'Animal atualizado com sucesso!', 'sucesso');
    } else {
      const resposta = await window.api.post('/animais', corpo, { autenticado: true });
      animal = resposta.animal;
      animalEmEdicaoId = animal.id;
      document.getElementById('a-id').value = animal.id;
      document.getElementById('titulo-painel-animal').textContent = `Editar ${animal.nome}`;
      exibirMensagem('mensagem-form-animal', 'Animal cadastrado! Agora você já pode adicionar fotos e vídeos abaixo.', 'sucesso');
    }
    document.getElementById('secao-midia-animal').hidden = false;
    renderizarFotosAdmin(animal.fotos || []);
    renderizarVideosAdmin(animal.videos || []);
    carregarAnimais();
  } catch (erro) {
    exibirMensagem('mensagem-form-animal', erro.message, 'erro');
  }
});

/* ---- Fotos ---- */
let fotoEmSubstituicaoId = null;

function renderizarFotosAdmin(fotos) {
  const alvo = document.getElementById('grade-fotos-admin');
  alvo.innerHTML = fotos
    .map(
      (f, i) => `
      <div class="foto-admin-item">
        <img src="${f.url}" alt="" />
        ${i === 0 ? '<span class="foto-admin-item__capa">Capa</span>' : ''}
        <div class="foto-admin-item__acoes">
          ${i !== 0 ? `<button type="button" title="Definir como capa" data-acao="capa-foto" data-foto-id="${f.id}">★</button>` : ''}
          <button type="button" title="Substituir foto" data-acao="substituir-foto" data-foto-id="${f.id}">🔄</button>
          <button type="button" title="Remover foto" data-acao="remover-foto" data-foto-id="${f.id}">✕</button>
        </div>
      </div>`
    )
    .join('');
}

document.getElementById('input-fotos-animal').addEventListener('change', async (e) => {
  if (!animalEmEdicaoId || !e.target.files.length) return;
  const formData = new FormData();
  for (const arquivo of e.target.files) formData.append('fotos', arquivo);

  try {
    const resposta = await window.api.post(`/animais/${animalEmEdicaoId}/fotos`, formData, { autenticado: true, isFormData: true });
    renderizarFotosAdmin(resposta.animal.fotos);
    carregarAnimais();
  } catch (erro) {
    alert(erro.message);
  } finally {
    e.target.value = '';
  }
});

document.getElementById('grade-fotos-admin').addEventListener('click', async (e) => {
  const botaoRemover = e.target.closest('button[data-acao="remover-foto"]');
  const botaoCapa = e.target.closest('button[data-acao="capa-foto"]');
  const botaoSubstituir = e.target.closest('button[data-acao="substituir-foto"]');
  if (!animalEmEdicaoId) return;

  if (botaoRemover) {
    try {
      await window.api.del(`/animais/${animalEmEdicaoId}/fotos/${botaoRemover.dataset.fotoId}`, { autenticado: true });
      const resposta = await window.api.get(`/animais/${animalEmEdicaoId}`);
      renderizarFotosAdmin(resposta.animal.fotos);
      carregarAnimais();
    } catch (erro) {
      alert(erro.message);
    }
  }

  if (botaoCapa) {
    try {
      const resposta = await window.api.patch(`/animais/${animalEmEdicaoId}/fotos/${botaoCapa.dataset.fotoId}/capa`, null, { autenticado: true });
      renderizarFotosAdmin(resposta.animal.fotos);
      carregarAnimais();
    } catch (erro) {
      alert(erro.message);
    }
  }

  if (botaoSubstituir) {
    fotoEmSubstituicaoId = botaoSubstituir.dataset.fotoId;
    document.getElementById('input-substituir-foto').click();
  }
});

document.getElementById('input-substituir-foto').addEventListener('change', async (e) => {
  const arquivo = e.target.files[0];
  if (!arquivo || !animalEmEdicaoId || !fotoEmSubstituicaoId) return;

  const formData = new FormData();
  formData.append('foto', arquivo);

  try {
    const resposta = await window.api.patch(`/animais/${animalEmEdicaoId}/fotos/${fotoEmSubstituicaoId}`, formData, { autenticado: true, isFormData: true });
    renderizarFotosAdmin(resposta.animal.fotos);
    carregarAnimais();
  } catch (erro) {
    alert(erro.message);
  } finally {
    e.target.value = '';
    fotoEmSubstituicaoId = null;
  }
});

/* ---- Vídeos ---- */
function renderizarVideosAdmin(videos) {
  const alvo = document.getElementById('lista-videos-admin');
  if (!videos.length) {
    alvo.innerHTML = `<p class="ajuda">Nenhum vídeo adicionado ainda.</p>`;
    return;
  }
  alvo.innerHTML = videos
    .map((v) => `<div class="video-admin-item"><span title="${v.url}">${v.url}</span><button type="button" class="botao-icone botao-icone--perigo" data-acao="remover-video" data-video-id="${v.id}">Remover</button></div>`)
    .join('');
}

document.getElementById('botao-add-video').addEventListener('click', async () => {
  const input = document.getElementById('input-video-url');
  if (!input.value.trim() || !animalEmEdicaoId) return;
  try {
    const resposta = await window.api.post(`/animais/${animalEmEdicaoId}/videos`, { url: input.value.trim() }, { autenticado: true });
    renderizarVideosAdmin(resposta.animal.videos);
    input.value = '';
  } catch (erro) {
    alert(erro.message);
  }
});

document.getElementById('lista-videos-admin').addEventListener('click', async (e) => {
  const botao = e.target.closest('button[data-acao="remover-video"]');
  if (!botao || !animalEmEdicaoId) return;
  try {
    await window.api.del(`/animais/${animalEmEdicaoId}/videos/${botao.dataset.videoId}`, { autenticado: true });
    botao.closest('.video-admin-item').remove();
  } catch (erro) {
    alert(erro.message);
  }
});

/* ============================ FORMULÁRIOS DE ADOÇÃO ============================ */

async function carregarFormularios() {
  const corpo = document.getElementById('tabela-formularios-corpo');
  corpo.innerHTML = `<tr class="linha-carregando-tabela"><td colspan="5">Carregando...</td></tr>`;
  try {
    const resposta = await window.api.get('/interesses/formulario', { autenticado: true });
    if (!resposta.formularios.length) {
      corpo.innerHTML = `<tr class="linha-carregando-tabela"><td colspan="5">Nenhum formulário recebido ainda.</td></tr>`;
      return;
    }
    corpo.innerHTML = resposta.formularios
      .map(
        (f) => `
      <tr>
        <td>${formatarData(f.criado_em)}</td>
        <td>${window.escaparHtml(f.nome)}</td>
        <td>${window.escaparHtml(f.animal_nome) || '—'}</td>
        <td>
          <select class="select-status-linha" data-acao="mudar-status-form" data-id="${f.id}">
            ${Object.entries(RÓTULOS_STATUS_FORM).map(([v, r]) => `<option value="${v}" ${f.status === v ? 'selected' : ''}>${r}</option>`).join('')}
          </select>
        </td>
        <td><button class="botao-icone" data-acao="ver-formulario" data-id="${f.id}">👁 Ver detalhes</button></td>
      </tr>`
      )
      .join('');
  } catch (erro) {
    corpo.innerHTML = `<tr class="linha-carregando-tabela"><td colspan="5">Erro ao carregar formulários.</td></tr>`;
  }
}

document.getElementById('tabela-formularios-corpo').addEventListener('change', async (e) => {
  const select = e.target.closest('select[data-acao="mudar-status-form"]');
  if (!select) return;
  try {
    await window.api.patch(`/interesses/formulario/${select.dataset.id}/status`, { status: select.value }, { autenticado: true });
  } catch (erro) {
    alert(erro.message);
  }
});

const CAMPOS_FORMULARIO_ROTULOS = {
  idade: 'Idade', profissao: 'Profissão', endereco: 'Endereço',
  moradia: 'Moradia', acesso_espacos: 'Acesso aos espaços da casa', onde_dormira: 'Onde dormirá',
  outros_animais: 'Outros animais', tem_criancas: 'Crianças em casa', rotina_casa: 'Rotina da casa',
  passeios_semana: 'Passeios por semana', pessoas_casa: 'Pessoas na casa', responsavel_unico: 'Responsável único',
  nocao_adaptacao: 'Noção de adaptação', plano_viagem: 'Plano para viagens', preferencia_porte_idade: 'Preferência de porte/idade',
  motivo_adocao: 'Motivo da adoção', alergias: 'Alergias na casa', ciencia_adaptacao: 'Ciência sobre adaptação',
  ciencia_responsabilidade: 'Ciência sobre responsabilidade', ciencia_devolucao: 'Ciência sobre impacto da devolução',
};

document.getElementById('tabela-formularios-corpo').addEventListener('click', async (e) => {
  const botao = e.target.closest('button[data-acao="ver-formulario"]');
  if (!botao) return;
  try {
    const resposta = await window.api.get(`/interesses/formulario/${botao.dataset.id}`, { autenticado: true });
    const f = resposta.formulario;
    const alvo = document.getElementById('detalhe-formulario-conteudo');
    alvo.innerHTML = `
      <p style="color:var(--texto-suave); margin-bottom:18px;">Enviado em ${formatarData(f.criado_em)} ${f.animal_nome ? `— interesse em <strong>${window.escaparHtml(f.animal_nome)}</strong>` : ''}</p>
      ${Object.entries(CAMPOS_FORMULARIO_ROTULOS)
        .map(([chave, rotulo]) => (f[chave] ? `<p><strong>${rotulo}:</strong><br>${window.escaparHtml(f[chave])}</p>` : ''))
        .join('')}
    `;
    abrirPainel('overlay-painel-formulario');
  } catch (erro) {
    alert('Não foi possível carregar o formulário.');
  }
});

/* ============================ FICHAS DE DIVULGAÇÃO ============================ */

const RÓTULOS_TIPO_ARQUIVO = { imagem: '🖼️', video: '🎞️', outro: '📎' };

async function carregarDivulgacao() {
  const corpo = document.getElementById('tabela-divulgacao-corpo');
  corpo.innerHTML = `<tr class="linha-carregando-tabela"><td colspan="6">Carregando...</td></tr>`;
  try {
    const resposta = await window.api.get('/divulgacao', { autenticado: true });
    if (!resposta.fichas.length) {
      corpo.innerHTML = `<tr class="linha-carregando-tabela"><td colspan="6">Nenhuma ficha de divulgação recebida ainda.</td></tr>`;
      return;
    }
    corpo.innerHTML = resposta.fichas
      .map(
        (f) => `
      <tr>
        <td>${formatarData(f.criado_em)}</td>
        <td>${window.escaparHtml(f.animal_nome_sexo_idade)}</td>
        <td>${window.escaparHtml(f.ong_nome_instagram)}</td>
        <td>${window.escaparHtml(f.cidade_estado)}</td>
        <td>
          <select class="select-status-linha" data-acao="mudar-status-divulgacao" data-id="${f.id}">
            ${Object.entries(RÓTULOS_STATUS_FORM).map(([v, r]) => `<option value="${v}" ${f.status === v ? 'selected' : ''}>${r}</option>`).join('')}
          </select>
        </td>
        <td class="acoes-linha">
          <button class="botao-icone" data-acao="ver-divulgacao" data-id="${f.id}">👁 Ver detalhes</button>
          <button class="botao-icone botao-icone--perigo" data-acao="excluir-divulgacao" data-id="${f.id}">🗑 Excluir</button>
        </td>
      </tr>`
      )
      .join('');
  } catch (erro) {
    corpo.innerHTML = `<tr class="linha-carregando-tabela"><td colspan="6">Erro ao carregar fichas.</td></tr>`;
  }
}

document.getElementById('tabela-divulgacao-corpo').addEventListener('change', async (e) => {
  const select = e.target.closest('select[data-acao="mudar-status-divulgacao"]');
  if (!select) return;
  try {
    await window.api.patch(`/divulgacao/${select.dataset.id}/status`, { status: select.value }, { autenticado: true });
  } catch (erro) {
    alert(erro.message);
  }
});

const CAMPOS_DIVULGACAO_ROTULOS = {
  ong_nome_instagram: 'ONG/Projeto (e Instagram)', cidade_estado: 'Cidade/Estado', responsavel_whatsapp: 'Responsável e WhatsApp',
  animal_nome_sexo_idade: 'Animal (nome, sexo, idade)', porte: 'Porte', tempo_espera: 'Tempo aguardando adoção',
  temperamento: 'Temperamento', entrega_condicoes: 'Será entregue', lar_ideal: 'Lar ideal', restricoes: 'Restrições/requisitos',
  aceita_outra_cidade: 'Aceita outra cidade/estado', historia: 'História', materiais_enviados: 'Materiais enviados',
  observacoes_extra: 'Observações extras',
};

document.getElementById('tabela-divulgacao-corpo').addEventListener('click', async (e) => {
  const botaoVer = e.target.closest('button[data-acao="ver-divulgacao"]');
  const botaoExcluir = e.target.closest('button[data-acao="excluir-divulgacao"]');

  if (botaoVer) {
    try {
      const resposta = await window.api.get(`/divulgacao/${botaoVer.dataset.id}`, { autenticado: true });
      const f = resposta.ficha;
      const alvo = document.getElementById('detalhe-divulgacao-conteudo');
      const galeria = f.arquivos.length
        ? `<div class="grade-fotos-admin">${f.arquivos
            .map((a) =>
              a.tipo === 'video'
                ? `<div class="foto-admin-item"><video src="${a.url}" style="width:100%;height:100%;object-fit:cover;" muted></video></div>`
                : `<div class="foto-admin-item"><img src="${a.url}" alt="" /></div>`
            )
            .join('')}</div>`
        : '<p class="ajuda">Nenhum arquivo anexado.</p>';

      alvo.innerHTML = `
        <p style="color:var(--texto-suave); margin-bottom:14px;">Enviado em ${formatarData(f.criado_em)}</p>
        <h3 style="font-size:1rem; margin-bottom:8px;">Arquivos enviados</h3>
        ${galeria}
        <div style="margin-top:18px;">
          ${Object.entries(CAMPOS_DIVULGACAO_ROTULOS)
            .map(([chave, rotulo]) => (f[chave] ? `<p><strong>${rotulo}:</strong><br>${window.escaparHtml(f[chave])}</p>` : ''))
            .join('')}
        </div>
      `;
      abrirPainel('overlay-painel-divulgacao');
    } catch (erro) {
      alert('Não foi possível carregar a ficha.');
    }
  }

  if (botaoExcluir) {
    if (!confirm('Excluir esta ficha de divulgação? Essa ação não pode ser desfeita.')) return;
    try {
      await window.api.del(`/divulgacao/${botaoExcluir.dataset.id}`, { autenticado: true });
      carregarDivulgacao();
    } catch (erro) {
      alert(erro.message);
    }
  }
});

/* ============================ CAMPANHAS ============================ */

let campanhaEmEdicaoId = null;

async function carregarCampanhas() {
  const corpo = document.getElementById('tabela-campanhas-corpo');
  corpo.innerHTML = `<tr class="linha-carregando-tabela"><td colspan="5">Carregando...</td></tr>`;
  try {
    const resposta = await window.api.get('/campanhas?todas=1');
    if (!resposta.campanhas.length) {
      corpo.innerHTML = `<tr class="linha-carregando-tabela"><td colspan="5">Nenhuma campanha cadastrada ainda.</td></tr>`;
      return;
    }
    corpo.innerHTML = resposta.campanhas
      .map(
        (c) => `
      <tr>
        <td>${window.escaparHtml(c.titulo)}</td>
        <td>${c.meta_valor ? 'R$ ' + Number(c.meta_valor).toLocaleString('pt-BR') : '—'}</td>
        <td>${c.valor_arrecadado ? 'R$ ' + Number(c.valor_arrecadado).toLocaleString('pt-BR') : 'R$ 0'}</td>
        <td>${c.ativa ? 'Sim' : 'Não'}</td>
        <td class="acoes-linha">
          <button class="botao-icone" data-acao="editar-campanha" data-id="${c.id}">✎ Editar</button>
          <button class="botao-icone botao-icone--perigo" data-acao="excluir-campanha" data-id="${c.id}">🗑 Excluir</button>
        </td>
      </tr>`
      )
      .join('');
  } catch (erro) {
    corpo.innerHTML = `<tr class="linha-carregando-tabela"><td colspan="5">Erro ao carregar campanhas.</td></tr>`;
  }
}

function limparFormularioCampanha() {
  campanhaEmEdicaoId = null;
  document.getElementById('form-campanha').reset();
  document.getElementById('c-ativa').checked = true;
  document.getElementById('titulo-painel-campanha').textContent = 'Nova campanha';
  document.getElementById('mensagem-form-campanha').hidden = true;
}

document.getElementById('botao-nova-campanha').addEventListener('click', () => {
  limparFormularioCampanha();
  abrirPainel('overlay-painel-campanha');
});

document.getElementById('tabela-campanhas-corpo').addEventListener('click', async (e) => {
  const botao = e.target.closest('button[data-acao]');
  if (!botao) return;
  const id = botao.dataset.id;

  if (botao.dataset.acao === 'editar-campanha') {
    try {
      const resposta = await window.api.get(`/campanhas/${id}`);
      const c = resposta.campanha;
      campanhaEmEdicaoId = c.id;
      document.getElementById('titulo-painel-campanha').textContent = `Editar campanha`;
      document.getElementById('c-id').value = c.id;
      document.getElementById('c-titulo').value = c.titulo;
      document.getElementById('c-descricao').value = c.descricao;
      document.getElementById('c-imagem').value = c.imagem_url || '';
      document.getElementById('c-meta').value = c.meta_valor ?? '';
      document.getElementById('c-arrecadado').value = c.valor_arrecadado ?? '';
      document.getElementById('c-ativa').checked = !!c.ativa;
      abrirPainel('overlay-painel-campanha');
    } catch (erro) {
      alert('Não foi possível carregar a campanha.');
    }
  }

  if (botao.dataset.acao === 'excluir-campanha') {
    if (!confirm('Excluir esta campanha?')) return;
    try {
      await window.api.del(`/campanhas/${id}`, { autenticado: true });
      carregarCampanhas();
    } catch (erro) {
      alert(erro.message);
    }
  }
});

document.getElementById('form-campanha').addEventListener('submit', async (e) => {
  e.preventDefault();
  const corpo = {
    titulo: document.getElementById('c-titulo').value.trim(),
    descricao: document.getElementById('c-descricao').value.trim(),
    imagem_url: document.getElementById('c-imagem').value.trim(),
    meta_valor: document.getElementById('c-meta').value || null,
    valor_arrecadado: document.getElementById('c-arrecadado').value || 0,
    ativa: document.getElementById('c-ativa').checked,
  };

  try {
    if (campanhaEmEdicaoId) {
      await window.api.put(`/campanhas/${campanhaEmEdicaoId}`, corpo, { autenticado: true });
      exibirMensagem('mensagem-form-campanha', 'Campanha atualizada!', 'sucesso');
    } else {
      await window.api.post('/campanhas', corpo, { autenticado: true });
      exibirMensagem('mensagem-form-campanha', 'Campanha criada!', 'sucesso');
    }
    carregarCampanhas();
    setTimeout(() => fecharPainel('overlay-painel-campanha'), 700);
  } catch (erro) {
    exibirMensagem('mensagem-form-campanha', erro.message, 'erro');
  }
});

/* ============================ VOLUNTÁRIOS ============================ */

async function carregarVoluntarios() {
  const corpo = document.getElementById('tabela-voluntarios-corpo');
  corpo.innerHTML = `<tr class="linha-carregando-tabela"><td colspan="6">Carregando...</td></tr>`;
  try {
    const resposta = await window.api.get('/voluntarios', { autenticado: true });
    if (!resposta.voluntarios.length) {
      corpo.innerHTML = `<tr class="linha-carregando-tabela"><td colspan="6">Nenhum cadastro de voluntário ainda.</td></tr>`;
      return;
    }
    corpo.innerHTML = resposta.voluntarios
      .map(
        (v) => `
      <tr>
        <td>${formatarData(v.criado_em)}</td>
        <td>${window.escaparHtml(v.nome)}</td>
        <td>${window.escaparHtml(v.contato)}</td>
        <td>${window.escaparHtml(v.area_interesse) || '—'}</td>
        <td>${window.escaparHtml(v.mensagem) || '—'}</td>
        <td><button class="botao-icone botao-icone--perigo" data-acao="excluir-voluntario" data-id="${v.id}">🗑 Excluir</button></td>
      </tr>`
      )
      .join('');
  } catch (erro) {
    corpo.innerHTML = `<tr class="linha-carregando-tabela"><td colspan="6">Erro ao carregar voluntários.</td></tr>`;
  }
}

document.getElementById('tabela-voluntarios-corpo').addEventListener('click', async (e) => {
  const botao = e.target.closest('button[data-acao="excluir-voluntario"]');
  if (!botao) return;
  if (!confirm('Remover este cadastro de voluntário?')) return;
  try {
    await window.api.del(`/voluntarios/${botao.dataset.id}`, { autenticado: true });
    carregarVoluntarios();
  } catch (erro) {
    alert(erro.message);
  }
});

/* ============================ WHATSAPP ============================ */

async function carregarWhatsapp() {
  const corpo = document.getElementById('tabela-whatsapp-corpo');
  const contador = document.getElementById('contador-whatsapp');
  corpo.innerHTML = `<tr class="linha-carregando-tabela"><td colspan="2">Carregando...</td></tr>`;
  try {
    const resposta = await window.api.get('/interesses/whatsapp', { autenticado: true });
    contador.textContent = `${resposta.total} contato(s)`;
    if (!resposta.contatos.length) {
      corpo.innerHTML = `<tr class="linha-carregando-tabela"><td colspan="2">Nenhum clique registrado ainda.</td></tr>`;
      return;
    }
    corpo.innerHTML = resposta.contatos
      .map((c) => `<tr><td>${formatarData(c.criado_em)}</td><td>${window.escaparHtml(c.animal_nome) || '—'}</td></tr>`)
      .join('');
  } catch (erro) {
    corpo.innerHTML = `<tr class="linha-carregando-tabela"><td colspan="2">Erro ao carregar.</td></tr>`;
  }
}

/* ============================ CONFIGURAÇÕES: INFORMAÇÕES DE CONTATO DO SITE ============================ */

async function carregarContatoSite() {
  try {
    const resposta = await window.api.get('/configuracoes');
    const c = resposta.configuracoes;
    document.getElementById('cfg-whatsapp').value = c.whatsapp_numero || '';
    document.getElementById('cfg-instagram').value = c.instagram_url || '';
    document.getElementById('cfg-email').value = c.email_contato || '';
    document.getElementById('cfg-pix').value = c.chave_pix || '';
  } catch (erro) {
    console.error('Erro ao carregar configurações do site:', erro);
  }
}

document.getElementById('form-contato-site').addEventListener('submit', async (e) => {
  e.preventDefault();
  const corpo = {
    whatsapp_numero: document.getElementById('cfg-whatsapp').value.trim(),
    instagram_url: document.getElementById('cfg-instagram').value.trim(),
    email_contato: document.getElementById('cfg-email').value.trim(),
    chave_pix: document.getElementById('cfg-pix').value.trim(),
  };
  const botao = e.target.querySelector('button[type="submit"]');
  botao.disabled = true;

  try {
    await window.api.put('/configuracoes', corpo, { autenticado: true });
    exibirMensagem('mensagem-contato-site', 'Informações de contato atualizadas! O site já reflete os novos dados.', 'sucesso');
  } catch (erro) {
    exibirMensagem('mensagem-contato-site', erro.message, 'erro');
  } finally {
    botao.disabled = false;
  }
});

/* ============================ CONFIGURAÇÕES: IMAGENS DO SITE ============================ */

async function carregarImagensSite() {
  try {
    const resposta = await window.api.get('/configuracoes');
    const c = resposta.configuracoes;
    document.querySelectorAll('.imagem-site-item').forEach((item) => {
      const chave = item.dataset.chave;
      const preview = item.querySelector('.imagem-site-item__preview');
      if (c[chave]) preview.src = c[chave];
    });
  } catch (erro) {
    console.error('Erro ao carregar imagens do site:', erro);
  }
}

document.getElementById('grade-imagens-site').addEventListener('change', async (e) => {
  const input = e.target.closest('input[type="file"]');
  if (!input || !input.files.length) return;

  const chave = input.dataset.chave;
  const item = input.closest('.imagem-site-item');
  const preview = item.querySelector('.imagem-site-item__preview');

  const formData = new FormData();
  formData.append('chave', chave);
  formData.append('imagem', input.files[0]);

  try {
    const resposta = await window.api.put('/configuracoes/imagem', formData, { autenticado: true, isFormData: true });
    preview.src = resposta.configuracoes[chave];
    exibirMensagem('mensagem-imagens-site', 'Imagem atualizada! O site já reflete a nova foto.', 'sucesso');
  } catch (erro) {
    exibirMensagem('mensagem-imagens-site', erro.message, 'erro');
  } finally {
    input.value = '';
  }
});

/* ============================ CONFIGURAÇÕES: TROCA DE E-MAIL/SENHA ============================ */

async function verificarModoTesteEmail() {
  try {
    const resposta = await window.api.get('/auth/email-status', { autenticado: true });
    document.getElementById('aviso-modo-teste-email').hidden = resposta.smtpConfigurado;
  } catch (erro) {
    /* silencioso: aviso não é crítico */
  }
}

/* ---- Troca de e-mail ---- */
const formEmailEtapa1 = document.getElementById('form-email-etapa1');
const formEmailEtapa2 = document.getElementById('form-email-etapa2');

formEmailEtapa1.addEventListener('submit', async (e) => {
  e.preventDefault();
  const corpo = {
    novoEmail: document.getElementById('novo-email').value.trim(),
    senhaAtual: document.getElementById('senha-confirma-email').value,
  };
  const botao = formEmailEtapa1.querySelector('button[type="submit"]');
  botao.disabled = true;

  try {
    const resposta = await window.api.post('/auth/email/solicitar', corpo, { autenticado: true });
    exibirMensagem('mensagem-email', resposta.mensagem, 'sucesso');
    formEmailEtapa1.hidden = true;
    formEmailEtapa2.hidden = false;
    document.getElementById('codigo-email').focus();
  } catch (erro) {
    exibirMensagem('mensagem-email', erro.message, 'erro');
  } finally {
    botao.disabled = false;
  }
});

formEmailEtapa2.addEventListener('submit', async (e) => {
  e.preventDefault();
  const codigo = document.getElementById('codigo-email').value.trim();
  const botao = formEmailEtapa2.querySelector('button[type="submit"]');
  botao.disabled = true;

  try {
    const resposta = await window.api.post('/auth/email/confirmar', { codigo }, { autenticado: true });
    window.api.token.salvar(resposta.token); // token atualizado com o novo e-mail
    document.getElementById('admin-usuario-nome').textContent = resposta.admin.nome || resposta.admin.email;
    exibirMensagem('mensagem-email', resposta.mensagem, 'sucesso');
    resetarFormularioEmail();
  } catch (erro) {
    exibirMensagem('mensagem-email', erro.message, 'erro');
  } finally {
    botao.disabled = false;
  }
});

document.getElementById('botao-cancelar-email').addEventListener('click', resetarFormularioEmail);

function resetarFormularioEmail() {
  formEmailEtapa1.reset();
  formEmailEtapa2.reset();
  formEmailEtapa1.hidden = false;
  formEmailEtapa2.hidden = true;
}

/* ---- Troca de senha ---- */
const formSenhaEtapa1 = document.getElementById('form-senha-etapa1');
const formSenhaEtapa2 = document.getElementById('form-senha-etapa2');

formSenhaEtapa1.addEventListener('submit', async (e) => {
  e.preventDefault();
  const corpo = {
    senhaAtual: document.getElementById('senha-atual').value,
    novaSenha: document.getElementById('nova-senha').value,
  };
  const botao = formSenhaEtapa1.querySelector('button[type="submit"]');
  botao.disabled = true;

  try {
    const resposta = await window.api.post('/auth/senha/solicitar', corpo, { autenticado: true });
    exibirMensagem('mensagem-senha', resposta.mensagem, 'sucesso');
    formSenhaEtapa1.hidden = true;
    formSenhaEtapa2.hidden = false;
    document.getElementById('codigo-senha').focus();
  } catch (erro) {
    exibirMensagem('mensagem-senha', erro.message, 'erro');
  } finally {
    botao.disabled = false;
  }
});

formSenhaEtapa2.addEventListener('submit', async (e) => {
  e.preventDefault();
  const codigo = document.getElementById('codigo-senha').value.trim();
  const botao = formSenhaEtapa2.querySelector('button[type="submit"]');
  botao.disabled = true;

  try {
    const resposta = await window.api.post('/auth/senha/confirmar', { codigo }, { autenticado: true });
    exibirMensagem('mensagem-senha', resposta.mensagem, 'sucesso');
    resetarFormularioSenha();
  } catch (erro) {
    exibirMensagem('mensagem-senha', erro.message, 'erro');
  } finally {
    botao.disabled = false;
  }
});

document.getElementById('botao-cancelar-senha').addEventListener('click', resetarFormularioSenha);

function resetarFormularioSenha() {
  formSenhaEtapa1.reset();
  formSenhaEtapa2.reset();
  formSenhaEtapa1.hidden = false;
  formSenhaEtapa2.hidden = true;
}

/* ============================ INICIALIZAÇÃO ============================ */

(async function iniciar() {
  const admin = await garantirAutenticado();
  if (!admin) return;
  carregarResumo();
})();
