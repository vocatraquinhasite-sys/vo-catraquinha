/**
 * routes/voluntarios.js
 * ------------------------------------------------------------------
 * RF10 - Informações e cadastro para voluntários.
 * ------------------------------------------------------------------
 */
const express = require('express');
const db = require('../database/db');
const { exigirAutenticacao } = require('../middleware/auth');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { nome, contato, area_interesse, mensagem } = req.body || {};
    if (!nome || !contato) {
      return res.status(400).json({ erro: 'Nome e contato são obrigatórios.' });
    }

    const { rows } = await db.query(
      'INSERT INTO voluntarios (nome, contato, area_interesse, mensagem) VALUES ($1, $2, $3, $4) RETURNING id',
      [nome, contato, area_interesse || null, mensagem || null]
    );

    res.status(201).json({ ok: true, id: rows[0].id, mensagem: 'Cadastro recebido! Obrigada por querer ajudar os vovôs e vovós de patinha.' });
  } catch (erro) {
    console.error('Erro ao cadastrar voluntário:', erro);
    res.status(500).json({ erro: 'Erro ao enviar o cadastro. Tente novamente.' });
  }
});

router.get('/', exigirAutenticacao, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM voluntarios ORDER BY criado_em DESC');
    res.json({ total: rows.length, voluntarios: rows });
  } catch (erro) {
    console.error('Erro ao listar voluntários:', erro);
    res.status(500).json({ erro: 'Erro ao carregar os voluntários.' });
  }
});

router.delete('/:id', exigirAutenticacao, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id FROM voluntarios WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ erro: 'Registro não encontrado.' });
    await db.query('DELETE FROM voluntarios WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (erro) {
    console.error('Erro ao excluir voluntário:', erro);
    res.status(500).json({ erro: 'Erro ao excluir o registro.' });
  }
});

module.exports = router;
