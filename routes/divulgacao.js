/**
 * routes/divulgacao.js
 * ------------------------------------------------------------------
 * Ficha de divulgação de cão idoso, preenchida por ONGs/protetores
 * parceiros. Os arquivos (fotos e vídeos) vão direto para o
 * Cloudinary — cada um guarda url + public_id + tipo (imagem/vídeo),
 * necessário porque a exclusão no Cloudinary exige informar o
 * resource_type correto (image ou video).
 *
 * POST /api/divulgacao       -> pública (multipart/form-data, com arquivos)
 * GET  /api/divulgacao       -> admin, lista todas as fichas recebidas
 * GET  /api/divulgacao/:id   -> admin, detalhe de uma ficha
 * PATCH /api/divulgacao/:id/status -> admin, atualiza o status de análise
 * DELETE /api/divulgacao/:id -> admin, remove a ficha e seus arquivos
 * ------------------------------------------------------------------
 */
const express = require('express');
const db = require('../database/db');
const { exigirAutenticacao } = require('../middleware/auth');
const uploadDivulgacao = require('../middleware/uploadDivulgacao');
const { uploadBuffer, removerArquivo } = require('../utils/cloudinary');

const router = express.Router();
const PASTA_CLOUDINARY = 'vo-catraquinha/divulgacao';

const CAMPOS_OBRIGATORIOS = [
  'ong_nome_instagram', 'cidade_estado', 'responsavel_whatsapp', 'animal_nome_sexo_idade',
  'porte', 'tempo_espera', 'temperamento', 'entrega_condicoes', 'lar_ideal', 'aceita_outra_cidade',
  'historia', 'materiais_enviados',
];

async function buscarFichaCompleta(id) {
  const { rows: fichas } = await db.query('SELECT * FROM fichas_divulgacao WHERE id = $1', [id]);
  const ficha = fichas[0];
  if (!ficha) return null;
  const { rows: arquivos } = await db.query(
    'SELECT id, url, public_id, tipo FROM ficha_divulgacao_arquivos WHERE ficha_id = $1',
    [id]
  );
  return { ...ficha, arquivos };
}

function tipoDoArquivo(mimetype) {
  if (mimetype.startsWith('image/')) return 'imagem';
  if (mimetype.startsWith('video/')) return 'video';
  return 'outro';
}

router.post('/', uploadDivulgacao.array('arquivos', 10), async (req, res) => {
  try {
    const body = req.body || {};
    const arquivos = req.files || [];

    const faltando = CAMPOS_OBRIGATORIOS.filter((campo) => !body[campo] || !String(body[campo]).trim());
    if (faltando.length) {
      return res.status(400).json({ erro: `Preencha todos os campos obrigatórios. Faltando: ${faltando.join(', ')}` });
    }
    if (!arquivos.length) {
      return res.status(400).json({ erro: 'Inclua ao menos um arquivo de foto ou vídeo para divulgação.' });
    }

    const autorizacoesOk =
      body.autoriza_publicacao === 'true' &&
      body.confirma_veracidade === 'true' &&
      body.ciente_avaliacao_preliminar === 'true' &&
      body.compromete_avisar === 'true';
    if (!autorizacoesOk) {
      return res.status(400).json({ erro: 'É necessário concordar com todas as autorizações para enviar a ficha.' });
    }

    const { rows } = await db.query(
      `INSERT INTO fichas_divulgacao (
        ong_nome_instagram, cidade_estado, responsavel_whatsapp, animal_nome_sexo_idade,
        porte, tempo_espera, temperamento, entrega_condicoes, lar_ideal, restricoes,
        aceita_outra_cidade, historia, materiais_enviados,
        autoriza_publicacao, confirma_veracidade, ciente_avaliacao_preliminar, compromete_avisar,
        observacoes_extra
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,1,1,1,1,$14) RETURNING id`,
      [
        body.ong_nome_instagram, body.cidade_estado, body.responsavel_whatsapp, body.animal_nome_sexo_idade,
        body.porte, body.tempo_espera, body.temperamento, body.entrega_condicoes || null, body.lar_ideal,
        body.restricoes || null, body.aceita_outra_cidade, body.historia, body.materiais_enviados,
        body.observacoes_extra || null,
      ]
    );
    const fichaId = rows[0].id;

    // Envia cada arquivo para o Cloudinary (imagens e vídeos na mesma pasta,
    // o Cloudinary detecta automaticamente o tipo com resource_type: 'auto')
    for (const arquivo of arquivos) {
      const tipo = tipoDoArquivo(arquivo.mimetype);
      const { url, publicId } = await uploadBuffer(arquivo.buffer, {
        pasta: PASTA_CLOUDINARY,
        tipoRecurso: tipo === 'video' ? 'video' : 'image',
      });
      await db.query(
        'INSERT INTO ficha_divulgacao_arquivos (ficha_id, url, public_id, tipo) VALUES ($1, $2, $3, $4)',
        [fichaId, url, publicId, tipo]
      );
    }

    res.status(201).json({
      ok: true,
      id: fichaId,
      mensagem: 'Ficha enviada com sucesso! Vamos analisar e entrar em contato em breve.',
    });
  } catch (erro) {
    console.error('Erro ao enviar ficha de divulgação:', erro);
    res.status(500).json({ erro: 'Erro ao enviar a ficha. Tente novamente.' });
  }
});

/* --------------------------- ADMINISTRATIVAS --------------------------- */

router.get('/', exigirAutenticacao, async (req, res) => {
  try {
    const { status } = req.query;
    const { rows } = status
      ? await db.query('SELECT * FROM fichas_divulgacao WHERE status = $1 ORDER BY criado_em DESC', [status])
      : await db.query('SELECT * FROM fichas_divulgacao ORDER BY criado_em DESC');
    res.json({ total: rows.length, fichas: rows });
  } catch (erro) {
    console.error('Erro ao listar fichas de divulgação:', erro);
    res.status(500).json({ erro: 'Erro ao carregar as fichas.' });
  }
});

router.get('/:id', exigirAutenticacao, async (req, res) => {
  try {
    const ficha = await buscarFichaCompleta(req.params.id);
    if (!ficha) return res.status(404).json({ erro: 'Ficha não encontrada.' });
    res.json({ ficha });
  } catch (erro) {
    console.error('Erro ao buscar ficha de divulgação:', erro);
    res.status(500).json({ erro: 'Erro ao carregar a ficha.' });
  }
});

router.patch('/:id/status', exigirAutenticacao, async (req, res) => {
  try {
    const { status } = req.body || {};
    const validos = new Set(['novo', 'em_analise', 'aprovado', 'recusado']);
    if (!validos.has(status)) return res.status(400).json({ erro: 'Status inválido.' });

    const { rows } = await db.query('SELECT id FROM fichas_divulgacao WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ erro: 'Ficha não encontrada.' });

    await db.query('UPDATE fichas_divulgacao SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ ok: true });
  } catch (erro) {
    console.error('Erro ao atualizar status da ficha:', erro);
    res.status(500).json({ erro: 'Erro ao atualizar o status.' });
  }
});

router.delete('/:id', exigirAutenticacao, async (req, res) => {
  try {
    const ficha = await buscarFichaCompleta(req.params.id);
    if (!ficha) return res.status(404).json({ erro: 'Ficha não encontrada.' });

    for (const arquivo of ficha.arquivos) {
      await removerArquivo(arquivo.public_id, arquivo.tipo === 'video' ? 'video' : 'image');
    }

    await db.query('DELETE FROM fichas_divulgacao WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (erro) {
    console.error('Erro ao excluir ficha de divulgação:', erro);
    res.status(500).json({ erro: 'Erro ao excluir a ficha.' });
  }
});

module.exports = router;
