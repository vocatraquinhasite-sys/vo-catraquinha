/**
 * divulgacao.js
 * ------------------------------------------------------------------
 * Envio da ficha de divulgação de cão idoso (ONGs/protetores parceiros).
 * Valida os grupos de checkbox (que exigem pelo menos 1 selecionado,
 * já que checkboxes não têm validação nativa de "obrigatório em grupo"
 * como os campos de texto) e envia tudo via FormData, incluindo os
 * arquivos de foto/vídeo anexados.
 * ------------------------------------------------------------------
 */
(function () {
  const form = document.getElementById('form-divulgacao');
  const mensagem = document.getElementById('mensagem-envio');
  const botao = document.getElementById('botao-enviar-divulgacao');

  function exibirMensagem(texto, tipo) {
    mensagem.hidden = false;
    mensagem.className = `mensagem-form mensagem-form--${tipo}`;
    mensagem.textContent = texto;
    mensagem.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function valoresMarcados(nomeGrupo) {
    return Array.from(form.querySelectorAll(`input[name="${nomeGrupo}"]:checked`)).map((el) => el.value);
  }

  function validarGruposObrigatorios() {
    const grupos = form.querySelectorAll('[data-grupo-obrigatorio]');
    for (const grupo of grupos) {
      const nomeGrupo = grupo.dataset.grupoObrigatorio;
      if (!valoresMarcados(nomeGrupo).length) {
        grupo.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return `Selecione ao menos uma opção em "${grupo.querySelector('legend').textContent.replace('*', '').trim()}".`;
      }
    }
    return null;
  }

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const erroGrupo = validarGruposObrigatorios();
    if (erroGrupo) {
      exibirMensagem(erroGrupo, 'erro');
      return;
    }

    const arquivos = document.getElementById('d-arquivos').files;
    if (!arquivos.length) {
      exibirMensagem('Inclua ao menos um arquivo de foto ou vídeo.', 'erro');
      return;
    }

    const formData = new FormData();
    formData.append('ong_nome_instagram', document.getElementById('d-ong').value.trim());
    formData.append('cidade_estado', document.getElementById('d-cidade').value.trim());
    formData.append('responsavel_whatsapp', document.getElementById('d-responsavel').value.trim());
    formData.append('animal_nome_sexo_idade', document.getElementById('d-animal').value.trim());
    formData.append('porte', valoresMarcados('d-porte').join(', '));
    formData.append('tempo_espera', document.getElementById('d-tempo-espera').value.trim());
    formData.append('temperamento', valoresMarcados('d-temperamento').join(', '));
    formData.append('entrega_condicoes', valoresMarcados('d-entrega').join(', '));
    formData.append('lar_ideal', valoresMarcados('d-lar-ideal').join(', '));
    formData.append('restricoes', document.getElementById('d-restricoes').value.trim());
    formData.append('aceita_outra_cidade', form.querySelector('input[name="d-outra-cidade"]:checked')?.value || '');
    formData.append('historia', document.getElementById('d-historia').value.trim());
    formData.append('materiais_enviados', valoresMarcados('d-materiais').join(', '));
    formData.append('autoriza_publicacao', String(document.getElementById('d-aut-publicacao').checked));
    formData.append('confirma_veracidade', String(document.getElementById('d-aut-veracidade').checked));
    formData.append('ciente_avaliacao_preliminar', String(document.getElementById('d-aut-avaliacao').checked));
    formData.append('compromete_avisar', String(document.getElementById('d-aut-avisar').checked));
    formData.append('observacoes_extra', document.getElementById('d-observacoes').value.trim());
    for (const arquivo of arquivos) formData.append('arquivos', arquivo);

    botao.disabled = true;
    botao.textContent = 'Enviando...';

    try {
      const resposta = await window.api.post('/divulgacao', formData, { isFormData: true });
      exibirMensagem(resposta.mensagem || 'Ficha enviada com sucesso!', 'sucesso');
      form.reset();
      form.hidden = true;
    } catch (erro) {
      exibirMensagem(erro.message || 'Não foi possível enviar a ficha. Tente novamente.', 'erro');
      botao.disabled = false;
      botao.textContent = 'Enviar ficha';
    }
  });
})();
