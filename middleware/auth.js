/**
 * middleware/auth.js
 * ------------------------------------------------------------------
 * Protege rotas administrativas exigindo um token JWT válido no
 * cabeçalho "Authorization: Bearer <token>".
 * ------------------------------------------------------------------
 */
const jwt = require('jsonwebtoken');

function exigirAutenticacao(req, res, next) {
  const cabecalho = req.headers.authorization || '';
  const [tipo, token] = cabecalho.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ erro: 'Não autenticado. Faça login novamente.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload; // { id, email, nome }
    next();
  } catch (err) {
    return res.status(401).json({ erro: 'Sessão inválida ou expirada. Faça login novamente.' });
  }
}

module.exports = { exigirAutenticacao };
