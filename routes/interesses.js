/**
 * routes/interesses.js
 * ------------------------------------------------------------------
 * RF05 - Envio do formulário de interesse na adoção + registro de
 * cliques em "Chamar no WhatsApp".
 * ------------------------------------------------------------------
 */
const express = require('express');
const db = require('../database/db');
const { exigirAutenticacao } = require('../middleware/auth');

const router = express.Router();

const CAMPOS_OBRIGATORIOS = [
  'nome', 'idade', 'profissao', 'endereco', 'moradia', 'acesso_espacos',
  'onde_dormira', 'outros_animais', 'rotina_casa', 'passeios_semana',
  'pessoas_casa', 'responsavel_unico', 'nocao_adaptacao', 'plano_viagem',
  'preferencia_porte_idade', 'motivo_adocao', 'alergias', 'ciencia_responsabilidade',
];

router.post('/formulario', async (req, res) => {
  try {
    const body = req.body || {};
    const faltando = CAMPOS_OBRIGATORIOS.filter((campo) => !body[campo] || !String(body[campo]).trim());
    if (faltando.length) {
      return res.status(400).json({ erro: `Preencha todos os campos obrigatórios. Faltando: ${faltando.join(', ')}` });
    }

    if (body.animal_id) {
      const { rows } = await db.query('SELECT id FROM animais WHERE id = $1', [body.animal_id]);
      if (!rows[0]) return res.status(404).json({ erro: 'Animal informado não foi encontrado.' });
    }

    const { rows } = await db.query(
      `INSERT INTO interesses_adocao (
        animal_id, nome, idade, profissao, endereco, moradia, acesso_espacos, onde_dormira,
        outros_animais, tem_criancas, rotina_casa, passeios_semana, pessoas_casa, responsavel_unico,
        nocao_adaptacao, plano_viagem, preferencia_porte_idade, motivo_adocao, alergias,
        ciencia_adaptacao, ciencia_responsabilidade, ciencia_devolucao
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
      RETURNING id`,
      [
        body.animal_id || null, body.nome, body.idade, body.profissao, body.endereco, body.moradia,
        body.acesso_espacos, body.onde_dormira, body.outros_animais, body.tem_criancas || null,
        body.rotina_casa, body.passeios_semana, body.pessoas_casa, body.responsavel_unico,
        body.nocao_adaptacao, body.plano_viagem, body.preferencia_porte_idade, body.motivo_adocao,
        body.alergias, body.ciencia_adaptacao || null, body.ciencia_responsabilidade, body.ciencia_devolucao || null,
      ]
    );

    res.status(201).json({ ok: true, id: rows[0].id, mensagem: 'Formulário enviado com sucesso! Em breve entraremos em contato.' });
  } catch (erro) {
    console.error('Erro ao enviar formulário de adoção:', erro);
    res.status(500).json({ erro: 'Erro ao enviar o formulário. Tente novamente.' });
  }
});

router.post('/whatsapp', async (req, res) => {
  try {
    const { animal_id } = req.body || {};
    await db.query('INSERT INTO contatos_whatsapp (animal_id) VALUES ($1)', [animal_id || null]);
    res.status(201).json({ ok: true });
  } catch (erro) {
    console.error('Erro ao registrar contato WhatsApp:', erro);
    res.status(500).json({ erro: 'Erro ao registrar o contato.' });
  }
});

/* --------------------------- ADMINISTRATIVAS --------------------------- */

router.get('/formulario', exigirAutenticacao, async (req, res) => {
  try {
    const { status, animal_id } = req.query;
    const condicoes = [];
    const params = [];
    let i = 1;

    if (status) { condicoes.push(`i.status = $${i++}`); params.push(status); }
    if (animal_id) { condicoes.push(`i.animal_id = $${i++}`); params.push(animal_id); }
    const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';

    const { rows } = await db.query(
      `SELECT i.*, a.nome AS animal_nome
       FROM interesses_adocao i
       LEFT JOIN animais a ON a.id = i.animal_id
       ${where}
       ORDER BY i.criado_em DESC`,
      params
    );

    res.json({ total: rows.length, formularios: rows });
  } catch (erro) {
    console.error('Erro ao listar formulários:', erro);
    res.status(500).json({ erro: 'Erro ao carregar os formulários.' });
  }
});

router.get('/formulario/:id', exigirAutenticacao, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT i.*, a.nome AS animal_nome
       FROM interesses_adocao i
       LEFT JOIN animais a ON a.id = i.animal_id
       WHERE i.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Formulário não encontrado.' });
    res.json({ formulario: rows[0] });
  } catch (erro) {
    console.error('Erro ao buscar formulário:', erro);
    res.status(500).json({ erro: 'Erro ao carregar o formulário.' });
  }
});

router.patch('/formulario/:id/status', exigirAutenticacao, async (req, res) => {
  try {
    const { status } = req.body || {};
    const validos = new Set(['novo', 'em_analise', 'aprovado', 'recusado']);
    if (!validos.has(status)) return res.status(400).json({ erro: 'Status inválido.' });

    const { rows } = await db.query('SELECT id FROM interesses_adocao WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ erro: 'Formulário não encontrado.' });

    await db.query('UPDATE interesses_adocao SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ ok: true });
  } catch (erro) {
    console.error('Erro ao atualizar status do formulário:', erro);
    res.status(500).json({ erro: 'Erro ao atualizar o status.' });
  }
});

router.get('/whatsapp', exigirAutenticacao, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT c.*, a.nome AS animal_nome
       FROM contatos_whatsapp c
       LEFT JOIN animais a ON a.id = c.animal_id
       ORDER BY c.criado_em DESC`
    );
    res.json({ total: rows.length, contatos: rows });
  } catch (erro) {
    console.error('Erro ao listar contatos WhatsApp:', erro);
    res.status(500).json({ erro: 'Erro ao carregar os contatos.' });
  }
});

module.exports = router;
