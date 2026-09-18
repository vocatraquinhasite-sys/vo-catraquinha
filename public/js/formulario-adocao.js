/**
 * formulario-adocao.js
 * ------------------------------------------------------------------
 * Envia o formulário completo de adoção (RF05) para a API, associando
 * ao animal quando o link veio da página de perfil (?animalId=X).
 * ------------------------------------------------------------------
 */
(function () {
  const form = document.getElementById('form-adocao');
  const campoAnimalId = document.getElementById('campo-animal-id');
  const tituloFormulario = document.getElementById('titulo-formulario');
  const mensagem = document.getElementById('mensagem-envio');
  const botaoEnviar = document.getElementById('botao-enviar-form');

  function preencherContextoAnimal() {
    const params = new URLSearchParams(window.location.search);
    const animalId = params.get('animalId');
    const nome = params.get('nome');
    if (animalId) campoAnimalId.value = animalId;
    if (nome) tituloFormulario.textContent = `Formulário de adoção — ${nome}`;
  }

  function exibirMensagem(texto, tipo) {
    mensagem.hidden = false;
    mensagem.className = `mensagem-form mensagem-form--${tipo}`;
    mensagem.textContent = texto;
    mensagem.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function dadosDoFormulario() {
    const dados = new FormData(form);
    const objeto = {};
    for (const [chave, valor] of dados.entries()) {
      objeto[chave] = valor;
    }
    return objeto;
  }

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    botaoEnviar.disabled = true;
    botaoEnviar.textContent = 'Enviando...';

    try {
      const resposta = await window.api.post('/interesses/formulario', dadosDoFormulario());
      exibirMensagem(resposta.mensagem || 'Formulário enviado com sucesso!', 'sucesso');
      form.reset();
      form.hidden = true;
    } catch (erro) {
      exibirMensagem(erro.message || 'Não foi possível enviar o formulário. Tente novamente.', 'erro');
      botaoEnviar.disabled = false;
      botaoEnviar.textContent = 'Enviar formulário';
    }
  });

  document.addEventListener('DOMContentLoaded', preencherContextoAnimal);
})();
