/**
 * voluntarios.js
 * ------------------------------------------------------------------
 * RF10 - Cadastro de interesse em voluntariado.
 * ------------------------------------------------------------------
 */
(function () {
  const form = document.getElementById('form-voluntario');
  const mensagem = document.getElementById('mensagem-envio-voluntario');
  const botao = document.getElementById('botao-enviar-voluntario');

  function exibirMensagem(texto, tipo) {
    mensagem.hidden = false;
    mensagem.className = `mensagem-form mensagem-form--${tipo}`;
    mensagem.textContent = texto;
    mensagem.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const dados = Object.fromEntries(new FormData(form).entries());
    botao.disabled = true;
    botao.textContent = 'Enviando...';

    try {
      const resposta = await window.api.post('/voluntarios', dados);
      exibirMensagem(resposta.mensagem || 'Cadastro enviado com sucesso!', 'sucesso');
      form.reset();
    } catch (erro) {
      exibirMensagem(erro.message || 'Não foi possível enviar o cadastro. Tente novamente.', 'erro');
    } finally {
      botao.disabled = false;
      botao.textContent = 'Enviar cadastro';
    }
  });
})();
