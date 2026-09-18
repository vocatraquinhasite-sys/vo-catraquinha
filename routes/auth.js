/**
 * routes/auth.js
 * ------------------------------------------------------------------
 * Login da área administrativa + fluxos de troca de e-mail e senha
 * com confirmação por código enviado ao e-mail JÁ CADASTRADO na conta
 * (não ao novo e-mail sendo solicitado). Isso garante que, mesmo que
 * alguém tenha acesso à sessão logada, não consiga sequestrar a conta
 * sem também ter acesso à caixa de entrada já confiável.
 *
 * Senhas nunca são guardadas em texto puro: usamos bcrypt (hash + salt).
 * ------------------------------------------------------------------
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../database/db');
const { exigirAutenticacao } = require('../middleware/auth');
const { enviarEmail, emailCodigoVerificacao, smtpConfigurado } = require('../utils/mailer');

const router = express.Router();

/* ============================ LOGIN ============================ */

// Limite simples de tentativas por e-mail, em memória (mitiga força bruta básica)
const tentativasLogin = new Map(); // email -> { count, primeiraTentativaEm }
const LIMITE_TENTATIVAS = 8;
const JANELA_MS = 15 * 60 * 1000; // 15 minutos

function excedeuLimite(email) {
  const registro = tentativasLogin.get(email);
  if (!registro) return false;
  const dentroDaJanela = Date.now() - registro.primeiraTentativaEm < JANELA_MS;
  return dentroDaJanela && registro.count >= LIMITE_TENTATIVAS;
}
function registrarTentativaFalha(email) {
  const registro = tentativasLogin.get(email);
  if (!registro || Date.now() - registro.primeiraTentativaEm >= JANELA_MS) {
    tentativasLogin.set(email, { count: 1, primeiraTentativaEm: Date.now() });
  } else {
    registro.count += 1;
  }
}
function limparTentativas(email) {
  tentativasLogin.delete(email);
}

function gerarToken(admin) {
  return jwt.sign(
    { id: admin.id, email: admin.email, nome: admin.nome },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

router.post('/login', async (req, res) => {
  const { email, senha } = req.body || {};
  if (!email || !senha) return res.status(400).json({ erro: 'Informe e-mail e senha.' });

  const emailNormalizado = String(email).trim().toLowerCase();
  if (excedeuLimite(emailNormalizado)) {
    return res.status(429).json({ erro: 'Muitas tentativas de login. Tente novamente em alguns minutos.' });
  }

  try {
    const { rows } = await db.query('SELECT * FROM admins WHERE email = $1', [emailNormalizado]);
    const admin = rows[0];

    if (!admin || !bcrypt.compareSync(senha, admin.senha_hash)) {
      registrarTentativaFalha(emailNormalizado);
      return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
    }

    limparTentativas(emailNormalizado);
    const token = gerarToken(admin);
    res.json({ token, admin: { id: admin.id, email: admin.email, nome: admin.nome } });
  } catch (erro) {
    console.error('Erro no login:', erro);
    res.status(500).json({ erro: 'Erro interno ao tentar entrar. Tente novamente.' });
  }
});

router.get('/me', exigirAutenticacao, (req, res) => {
  res.json({ admin: req.admin });
});

/* ================= CÓDIGOS DE VERIFICAÇÃO (helpers) ================= */

const DURACAO_CODIGO_MS = 15 * 60 * 1000; // 15 minutos
const LIMITE_TENTATIVAS_CODIGO = 5;
const INTERVALO_MINIMO_REENVIO_MS = 60 * 1000; // 1 minuto entre solicitações

function gerarCodigoNumerico() {
  const numero = crypto.randomInt(0, 1000000);
  return String(numero).padStart(6, '0');
}

async function solicitacaoRecenteDemais(adminId, finalidade) {
  const { rows } = await db.query(
    `SELECT criado_em FROM codigos_verificacao
     WHERE admin_id = $1 AND finalidade = $2 AND usado = 0
     ORDER BY id DESC LIMIT 1`,
    [adminId, finalidade]
  );
  if (!rows[0]) return false;
  // node-postgres já retorna colunas TIMESTAMP como objetos Date do JS
  return Date.now() - rows[0].criado_em.getTime() < INTERVALO_MINIMO_REENVIO_MS;
}

async function invalidarCodigosAnteriores(adminId, finalidade) {
  await db.query(
    'UPDATE codigos_verificacao SET usado = 1 WHERE admin_id = $1 AND finalidade = $2 AND usado = 0',
    [adminId, finalidade]
  );
}

async function criarEEnviarCodigo({ admin, finalidade, valorPendente }) {
  await invalidarCodigosAnteriores(admin.id, finalidade);

  const codigo = gerarCodigoNumerico();
  const codigoHash = bcrypt.hashSync(codigo, 8);
  const expiraEm = new Date(Date.now() + DURACAO_CODIGO_MS);

  await db.query(
    `INSERT INTO codigos_verificacao (admin_id, finalidade, codigo_hash, valor_pendente, expira_em)
     VALUES ($1, $2, $3, $4, $5)`,
    [admin.id, finalidade, codigoHash, valorPendente, expiraEm]
  );

  const { assunto, textoHtml } = emailCodigoVerificacao({ nomeAdmin: admin.nome, codigo, finalidade });
  return enviarEmail({ para: admin.email, assunto, textoHtml });
}

async function buscarCodigoAtivo(adminId, finalidade) {
  const { rows } = await db.query(
    `SELECT * FROM codigos_verificacao
     WHERE admin_id = $1 AND finalidade = $2 AND usado = 0
     ORDER BY id DESC LIMIT 1`,
    [adminId, finalidade]
  );
  return rows[0] || null;
}

async function validarCodigo(registro, codigoInformado) {
  if (!registro) return { valido: false, erro: 'Nenhuma solicitação pendente. Inicie o processo novamente.' };

  const expirado = registro.expira_em.getTime() < Date.now();
  if (expirado) return { valido: false, erro: 'O código expirou. Solicite um novo código.' };

  if (registro.tentativas >= LIMITE_TENTATIVAS_CODIGO) {
    return { valido: false, erro: 'Muitas tentativas incorretas. Solicite um novo código.' };
  }

  const confere = bcrypt.compareSync(String(codigoInformado || ''), registro.codigo_hash);
  if (!confere) {
    await db.query('UPDATE codigos_verificacao SET tentativas = tentativas + 1 WHERE id = $1', [registro.id]);
    return { valido: false, erro: 'Código incorreto. Verifique e tente novamente.' };
  }

  return { valido: true };
}

/* ====================== TROCA DE E-MAIL (2 etapas) ====================== */

router.post('/email/solicitar', exigirAutenticacao, async (req, res) => {
  try {
    const { novoEmail, senhaAtual } = req.body || {};
    const emailNovo = String(novoEmail || '').trim().toLowerCase();

    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regexEmail.test(emailNovo)) {
      return res.status(400).json({ erro: 'Informe um e-mail válido.' });
    }

    const { rows } = await db.query('SELECT * FROM admins WHERE id = $1', [req.admin.id]);
    const admin = rows[0];
    if (!admin) return res.status(404).json({ erro: 'Conta não encontrada.' });

    if (!senhaAtual || !bcrypt.compareSync(senhaAtual, admin.senha_hash)) {
      return res.status(401).json({ erro: 'Senha atual incorreta.' });
    }
    if (emailNovo === admin.email) {
      return res.status(400).json({ erro: 'Este já é o e-mail cadastrado atualmente.' });
    }

    const { rows: emailEmUso } = await db.query('SELECT id FROM admins WHERE email = $1 AND id != $2', [emailNovo, admin.id]);
    if (emailEmUso[0]) {
      return res.status(409).json({ erro: 'Este e-mail já está sendo usado por outra conta.' });
    }

    if (await solicitacaoRecenteDemais(admin.id, 'email')) {
      return res.status(429).json({ erro: 'Aguarde um instante antes de solicitar um novo código.' });
    }

    const resultado = await criarEEnviarCodigo({ admin, finalidade: 'email', valorPendente: emailNovo });
    res.json({
      ok: true,
      mensagem: `Enviamos um código de confirmação para ${admin.email}. Informe o código para concluir a troca.`,
      modoTeste: resultado.modoTeste || false,
    });
  } catch (erro) {
    console.error('Erro ao enviar e-mail de verificação:', erro);
    res.status(500).json({ erro: 'Não foi possível enviar o código de verificação. Tente novamente.' });
  }
});

router.post('/email/confirmar', exigirAutenticacao, async (req, res) => {
  try {
    const { codigo } = req.body || {};
    const registro = await buscarCodigoAtivo(req.admin.id, 'email');
    const resultado = await validarCodigo(registro, codigo);

    if (!resultado.valido) return res.status(400).json({ erro: resultado.erro });

    await db.query('UPDATE admins SET email = $1 WHERE id = $2', [registro.valor_pendente, req.admin.id]);
    await db.query('UPDATE codigos_verificacao SET usado = 1 WHERE id = $1', [registro.id]);

    const { rows } = await db.query('SELECT * FROM admins WHERE id = $1', [req.admin.id]);
    const adminAtualizado = rows[0];
    const novoToken = gerarToken(adminAtualizado);

    res.json({
      ok: true,
      mensagem: 'E-mail de acesso atualizado com sucesso!',
      token: novoToken,
      admin: { id: adminAtualizado.id, email: adminAtualizado.email, nome: adminAtualizado.nome },
    });
  } catch (erro) {
    console.error('Erro ao confirmar troca de e-mail:', erro);
    res.status(500).json({ erro: 'Erro interno ao confirmar o código.' });
  }
});

/* ====================== TROCA DE SENHA (2 etapas) ====================== */

router.post('/senha/solicitar', exigirAutenticacao, async (req, res) => {
  try {
    const { senhaAtual, novaSenha } = req.body || {};

    if (!senhaAtual || !novaSenha) {
      return res.status(400).json({ erro: 'Informe a senha atual e a nova senha.' });
    }
    if (String(novaSenha).length < 8) {
      return res.status(400).json({ erro: 'A nova senha deve ter pelo menos 8 caracteres.' });
    }

    const { rows } = await db.query('SELECT * FROM admins WHERE id = $1', [req.admin.id]);
    const admin = rows[0];
    if (!admin || !bcrypt.compareSync(senhaAtual, admin.senha_hash)) {
      return res.status(401).json({ erro: 'Senha atual incorreta.' });
    }

    if (await solicitacaoRecenteDemais(admin.id, 'senha')) {
      return res.status(429).json({ erro: 'Aguarde um instante antes de solicitar um novo código.' });
    }

    const novoHash = bcrypt.hashSync(novaSenha, 12);
    const resultado = await criarEEnviarCodigo({ admin, finalidade: 'senha', valorPendente: novoHash });

    res.json({
      ok: true,
      mensagem: `Enviamos um código de confirmação para ${admin.email}. Informe o código para concluir a troca de senha.`,
      modoTeste: resultado.modoTeste || false,
    });
  } catch (erro) {
    console.error('Erro ao enviar e-mail de verificação:', erro);
    res.status(500).json({ erro: 'Não foi possível enviar o código de verificação. Tente novamente.' });
  }
});

router.post('/senha/confirmar', exigirAutenticacao, async (req, res) => {
  try {
    const { codigo } = req.body || {};
    const registro = await buscarCodigoAtivo(req.admin.id, 'senha');
    const resultado = await validarCodigo(registro, codigo);

    if (!resultado.valido) return res.status(400).json({ erro: resultado.erro });

    await db.query('UPDATE admins SET senha_hash = $1 WHERE id = $2', [registro.valor_pendente, req.admin.id]);
    await db.query('UPDATE codigos_verificacao SET usado = 1 WHERE id = $1', [registro.id]);

    res.json({ ok: true, mensagem: 'Senha atualizada com sucesso!' });
  } catch (erro) {
    console.error('Erro ao confirmar troca de senha:', erro);
    res.status(500).json({ erro: 'Erro interno ao confirmar o código.' });
  }
});

router.get('/email-status', exigirAutenticacao, (req, res) => {
  res.json({ smtpConfigurado: smtpConfigurado() });
});

module.exports = router;
