/**
 * server.js
 * ------------------------------------------------------------------
 * Ponto de entrada do backend do Projeto Vô Catraquinha.
 *
 * Estrutura:
 *   /api/auth          -> login administrativo
 *   /api/animais       -> listagem pública + CRUD administrativo
 *   /api/interesses    -> formulário de adoção + registro de WhatsApp
 *   /api/campanhas     -> campanhas de arrecadação
 *   /api/voluntarios   -> cadastro de voluntários
 *   /api/stats         -> estatísticas da home
 *   /api/configuracoes -> informações de contato editáveis pela dashboard
 *
 * Também serve o frontend estático (pasta /public). As imagens (fotos de
 * animais, fichas de divulgação, imagens do site) NÃO ficam mais no disco
 * local — vão direto para o Cloudinary, já que o disco do Render (plano
 * gratuito) é efêmero e apagaria tudo a cada redeploy/reinício.
 *
 * Camadas de segurança aplicadas aqui:
 *   - helmet: cabeçalhos HTTP de segurança (evita clickjacking, sniffing
 *     de tipo de conteúdo, esconde tecnologia do servidor, etc.)
 *   - rate limiting: protege contra flood/spam na API
 *   - CORS restrito: em produção, só aceita requisições da origem
 *     configurada em ALLOWED_ORIGIN (.env), em vez de aceitar qualquer site
 * ------------------------------------------------------------------
 */
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/auth');
const animaisRoutes = require('./routes/animais');
const interessesRoutes = require('./routes/interesses');
const campanhasRoutes = require('./routes/campanhas');
const voluntariosRoutes = require('./routes/voluntarios');
const statsRoutes = require('./routes/stats');
const configuracoesRoutes = require('./routes/configuracoes');
const divulgacaoRoutes = require('./routes/divulgacao');
const { limiteGeral, limiteEscritaPublica } = require('./middleware/rateLimits');

const app = express();
const PORT = process.env.PORT || 3000;

// Necessário quando o servidor roda atrás de um proxy reverso (ex: Nginx,
// Render, Railway) para o rate limiting identificar o IP real do visitante
app.set('trust proxy', 1);

// Cabeçalhos de segurança. CSP fica desativado porque as páginas usam um
// pequeno script inline (para aplicar o tema claro/escuro antes da
// primeira renderização, evitando "flash" de tema errado) — uma CSP
// padrão bloquearia esse script. As demais proteções do helmet continuam ativas.
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// Em produção, defina ALLOWED_ORIGIN no .env com o domínio real do site
// (ex: https://vocatraquinha.org) para que a API só aceite requisições
// vindas do próprio site. Sem essa variável, aceita qualquer origem —
// prático para desenvolvimento local, mas deve ser configurado antes de publicar.
const origensPermitidas = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(',').map((o) => o.trim())
  : true; // true = aceita qualquer origem (modo desenvolvimento)
app.use(cors({ origin: origensPermitidas }));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Limite geral de requisições em toda a API
app.use('/api', limiteGeral);

// API
app.use('/api/auth', authRoutes);
app.use('/api/animais', animaisRoutes);

// Rotas públicas de envio de formulário/voluntariado recebem um limite mais
// rígido (poucas requisições por hora), já que qualquer visitante sem login
// pode enviar dados nelas — é o alvo mais provável de spam/abuso automatizado.
app.use('/api/interesses/formulario', limiteEscritaPublica);
app.use('/api/interesses/whatsapp', limiteEscritaPublica);
app.use('/api/voluntarios', (req, res, next) => (req.method === 'POST' ? limiteEscritaPublica(req, res, next) : next()));
app.use('/api/divulgacao', (req, res, next) => (req.method === 'POST' ? limiteEscritaPublica(req, res, next) : next()));

app.use('/api/interesses', interessesRoutes);
app.use('/api/campanhas', campanhasRoutes);
app.use('/api/voluntarios', voluntariosRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/configuracoes', configuracoesRoutes);
app.use('/api/divulgacao', divulgacaoRoutes);

// Frontend estático (HTML/CSS/JS)
const PASTA_PUBLIC = path.join(__dirname, 'public');
app.use(express.static(PASTA_PUBLIC));

// Qualquer rota não-API cai no frontend (facilita links diretos tipo /animal.html?id=1)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(PASTA_PUBLIC, req.path.endsWith('.html') || req.path.includes('.') ? req.path : `${req.path === '/' ? '/index.html' : req.path}`), (err) => {
    if (err) res.status(404).sendFile(path.join(PASTA_PUBLIC, 'index.html'));
  });
});

// Tratamento de erros (ex: erros do multer no upload de fotos)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ erro: err.message || 'Erro interno no servidor.' });
});

app.listen(PORT, () => {
  console.log(`\n🐾 Servidor do Vô Catraquinha rodando em http://localhost:${PORT}\n`);
});
