/**
 * routes/stats.js
 * ------------------------------------------------------------------
 * Estatísticas exibidas na página inicial (RF01): total de animais
 * acolhidos, total adotados, total esperando um lar, etc.
 * ------------------------------------------------------------------
 */
const express = require('express');
const db = require('../database/db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [totalAnimais, totalAdotados, totalDisponiveis, totalEmProcesso, totalVoluntarios] = await Promise.all([
      db.query('SELECT COUNT(*) AS c FROM animais'),
      db.query("SELECT COUNT(*) AS c FROM animais WHERE status = 'adotado'"),
      db.query("SELECT COUNT(*) AS c FROM animais WHERE status = 'disponivel'"),
      db.query("SELECT COUNT(*) AS c FROM animais WHERE status = 'processo'"),
      db.query('SELECT COUNT(*) AS c FROM voluntarios'),
    ]);

    res.json({
      totalAcolhidos: Number(totalAnimais.rows[0].c),
      totalAdotados: Number(totalAdotados.rows[0].c),
      totalDisponiveis: Number(totalDisponiveis.rows[0].c),
      totalEmProcesso: Number(totalEmProcesso.rows[0].c),
      totalVoluntarios: Number(totalVoluntarios.rows[0].c),
    });
  } catch (erro) {
    console.error('Erro ao carregar estatísticas:', erro);
    res.status(500).json({ erro: 'Erro ao carregar as estatísticas.' });
  }
});

module.exports = router;
