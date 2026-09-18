/**
 * routes/campanhas.js
 * ------------------------------------------------------------------
 * Gerenciamento de campanhas (ex: arrecadação de ração, feira de
 * adoção, campanha de castração).
 * ------------------------------------------------------------------
 */
const express = require('express');
const db = require('../database/db');
const { exigirAutenticacao } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const somenteAtivas = req.query.todas !== '1';
    const { rows } = await db.query(
      somenteAtivas
        ? 'SELECT * FROM campanhas WHERE ativa = 1 ORDER BY criado_em DESC'
        : 'SELECT * FROM campanhas ORDER BY criado_em DESC'
    );
    res.json({ total: rows.length, campanhas: rows });
  } catch (erro) {
    console.error('Erro ao listar campanhas:', erro);
    res.status(500).json({ erro: 'Erro ao carregar as campanhas.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM campanhas WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ erro: 'Campanha não encontrada.' });
    res.json({ campanha: rows[0] });
  } catch (erro) {
    console.error('Erro ao buscar campanha:', erro);
    res.status(500).json({ erro: 'Erro ao carregar a campanha.' });
  }
});

router.post('/', exigirAutenticacao, async (req, res) => {
  try {
    const { titulo, descricao, imagem_url, meta_valor, valor_arrecadado, ativa } = req.body || {};
    if (!titulo || !descricao) {
      return res.status(400).json({ erro: 'Título e descrição são obrigatórios.' });
    }

    const { rows } = await db.query(
      `INSERT INTO campanhas (titulo, descricao, imagem_url, meta_valor, valor_arrecadado, ativa)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [titulo, descricao, imagem_url || null, meta_valor ?? null, valor_arrecadado ?? 0, ativa === false ? 0 : 1]
    );

    const { rows: campanha } = await db.query('SELECT * FROM campanhas WHERE id = $1', [rows[0].id]);
    res.status(201).json({ campanha: campanha[0] });
  } catch (erro) {
    console.error('Erro ao criar campanha:', erro);
    res.status(500).json({ erro: 'Erro ao criar a campanha.' });
  }
});

router.put('/:id', exigirAutenticacao, async (req, res) => {
  try {
    const { rows: existenteRows } = await db.query('SELECT * FROM campanhas WHERE id = $1', [req.params.id]);
    const existente = existenteRows[0];
    if (!existente) return res.status(404).json({ erro: 'Campanha não encontrada.' });

    const dados = {
      titulo: req.body.titulo ?? existente.titulo,
      descricao: req.body.descricao ?? existente.descricao,
      imagem_url: req.body.imagem_url ?? existente.imagem_url,
      meta_valor: req.body.meta_valor ?? existente.meta_valor,
      valor_arrecadado: req.body.valor_arrecadado ?? existente.valor_arrecadado,
      ativa: req.body.ativa === undefined ? existente.ativa : (req.body.ativa ? 1 : 0),
    };

    await db.query(
      `UPDATE campanhas SET titulo = $1, descricao = $2, imagem_url = $3,
       meta_valor = $4, valor_arrecadado = $5, ativa = $6, atualizado_em = NOW()
       WHERE id = $7`,
      [dados.titulo, dados.descricao, dados.imagem_url, dados.meta_valor, dados.valor_arrecadado, dados.ativa, req.params.id]
    );

    const { rows } = await db.query('SELECT * FROM campanhas WHERE id = $1', [req.params.id]);
    res.json({ campanha: rows[0] });
  } catch (erro) {
    console.error('Erro ao editar campanha:', erro);
    res.status(500).json({ erro: 'Erro ao editar a campanha.' });
  }
});

router.delete('/:id', exigirAutenticacao, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id FROM campanhas WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ erro: 'Campanha não encontrada.' });
    await db.query('DELETE FROM campanhas WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (erro) {
    console.error('Erro ao excluir campanha:', erro);
    res.status(500).json({ erro: 'Erro ao excluir a campanha.' });
  }
});

module.exports = router;
