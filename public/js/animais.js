/**
 * animais.js
 * ------------------------------------------------------------------
 * RF02/RF03 - Listagem de animais com filtros (idade/porte/sexo/status)
 * e pesquisa por texto. Os filtros disparam uma nova consulta à API
 * (com um pequeno "debounce" na busca por texto para não sobrecarregar
 * o servidor a cada tecla digitada).
 * ------------------------------------------------------------------
 */
(function () {
  const grade = document.getElementById('grade-animais');
  const contador = document.getElementById('contador-resultados');
  const form = document.getElementById('form-filtros');
  const campoBusca = document.getElementById('campo-busca');
  const botaoLimpar = document.getElementById('botao-limpar-filtros');

  let temporizadorBusca = null;

  function montarQuery() {
    const dados = new FormData(form);
    const params = new URLSearchParams();
    for (const [chave, valor] of dados.entries()) {
      if (valor) params.set(chave, valor);
    }
    // Sem filtro explícito de status, queremos ver tudo (inclusive já adotados) na listagem completa,
    // mas com "adotados" ao final para não confundir quem procura adotar.
    return params.toString();
  }

  async function carregar() {
    grade.innerHTML = `<div class="carregando"><span class="carregando__ponto"></span><span class="carregando__ponto"></span><span class="carregando__ponto"></span></div>`;
    contador.textContent = '';

    try {
      const query = montarQuery();
      const resposta = await window.api.get(`/animais?todosStatus=1${query ? '&' + query : ''}`);
      renderizar(resposta.animais);
    } catch (erro) {
      grade.innerHTML = `<div class="estado-vazio"><strong>Não foi possível carregar os animais</strong>Tente novamente em instantes.</div>`;
      console.error(erro);
    }
  }

  function renderizar(animais) {
    if (!animais.length) {
      grade.innerHTML = `<div class="estado-vazio" style="grid-column: 1/-1;"><strong>Nenhum animal encontrado</strong>Tente ajustar os filtros ou o termo de pesquisa.</div>`;
      contador.textContent = '';
      return;
    }
    // Animais já adotados aparecem por último, para não competir por atenção com os disponíveis
    const ordenados = [...animais].sort((a, b) => (a.status === 'adotado') - (b.status === 'adotado'));
    grade.innerHTML = ordenados.map(window.cartaoAnimalHtml).join('');
    contador.textContent = `${animais.length} animal(is) encontrado(s)`;
  }

  form.addEventListener('change', carregar);

  campoBusca.addEventListener('input', () => {
    clearTimeout(temporizadorBusca);
    temporizadorBusca = setTimeout(carregar, 350);
  });

  botaoLimpar.addEventListener('click', () => {
    form.reset();
    carregar();
  });

  form.addEventListener('submit', (e) => e.preventDefault());

  document.addEventListener('DOMContentLoaded', carregar);
})();
