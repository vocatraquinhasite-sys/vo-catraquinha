/**
 * routes/configuracoes.js
 * ------------------------------------------------------------------
 * Configurações gerais do site: WhatsApp, Instagram, e-mail de contato,
 * chave PIX, e as imagens gerais do site (banner da home, fotos da
 * seção "História") — tudo editável pela dashboard, sem mexer em código.
 * As imagens agora vão para o Cloudinary (não mais para disco local).
 *
 * GET  /api/configuracoes         -> pública
 * PUT  /api/configuracoes         -> protegida, edita os campos de texto
 * PUT  /api/configuracoes/imagem  -> protegida, upload de uma imagem do site
 * ------------------------------------------------------------------
 */
const express = require('express');
const db = require('../database/db');
const { exigirAutenticacao } = require('../middleware/auth');
const uploadSiteImagem = require('../middleware/uploadSiteImagem');
const { uploadBuffer, removerArquivo } = require('../utils/cloudinary');

const router = express.Router();
const PASTA_CLOUDINARY = 'vo-catraquinha/site';

const PADROES_TEXTO = {
  whatsapp_numero: '5585999999999',
  instagram_url: 'https://www.instagram.com/vocatraquinha',
  email_contato: 'contato@vocatraquinha.org',
  chave_pix: 'contato@vocatraquinha.org',
};

// Chaves de imagem permitidas (cada uma guarda também uma chave companheira
// "<chave>_public_id" no banco, usada só internamente para poder apagar/
// substituir a imagem certa no Cloudinary depois)
const PADROES_IMAGEM = {
  imagem_hero: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=900',
  imagem_historia_home: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800',
  imagem_historia_sobre: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800',
};

const PADROES = { ...PADROES_TEXTO, ...PADROES_IMAGEM };

const ROTULOS_IMAGEM = {
  imagem_hero: 'Banner principal da página inicial',
  imagem_historia_home: 'Foto da seção "História" (página inicial)',
  imagem_historia_sobre: 'Foto da seção "História" (página Sobre)',
};

async function garantirPadroes() {
  for (const [chave, valor] of Object.entries(PADROES)) {
    await db.query(
      `INSERT INTO configuracoes_site (chave, valor)
       SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM configuracoes_site WHERE chave = $1)`,
      [chave, valor]
    );
  }
}
// Roda uma vez quando o módulo é carregado (idempotente — não duplica se já existir)
garantirPadroes().catch((erro) => console.error('Erro ao garantir configurações padrão:', erro));

async function lerConfiguracoes() {
  const { rows } = await db.query('SELECT chave, valor FROM configuracoes_site');
  const objeto = { ...PADROES };
  for (const linha of rows) objeto[linha.chave] = linha.valor;
  return objeto;
}

async function salvarConfiguracao(chave, valor) {
  await db.query(
    `INSERT INTO configuracoes_site (chave, valor, atualizado_em) VALUES ($1, $2, NOW())
     ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, atualizado_em = NOW()`,
    [chave, valor]
  );
}

router.get('/', async (req, res) => {
  try {
    res.json({ configuracoes: await lerConfiguracoes(), rotulosImagem: ROTULOS_IMAGEM });
  } catch (erro) {
    console.error('Erro ao carregar configurações:', erro);
    res.status(500).json({ erro: 'Erro ao carregar as configurações.' });
  }
});

router.put('/', exigirAutenticacao, async (req, res) => {
  try {
    const corpo = req.body || {};
    const atualizacoes = Object.entries(corpo).filter(([chave]) => Object.prototype.hasOwnProperty.call(PADROES_TEXTO, chave));

    if (!atualizacoes.length) {
      return res.status(400).json({ erro: 'Nenhuma configuração válida foi enviada.' });
    }

    for (const [chave, valor] of atualizacoes) {
      await salvarConfiguracao(chave, String(valor ?? '').trim());
    }

    res.json({ ok: true, configuracoes: await lerConfiguracoes() });
  } catch (erro) {
    console.error('Erro ao salvar configurações:', erro);
    res.status(500).json({ erro: 'Erro ao salvar as configurações.' });
  }
});

router.put('/imagem', exigirAutenticacao, uploadSiteImagem.single('imagem'), async (req, res) => {
  try {
    const { chave } = req.body || {};

    if (!chave || !Object.prototype.hasOwnProperty.call(PADROES_IMAGEM, chave)) {
      return res.status(400).json({ erro: 'Chave de imagem inválida.' });
    }
    if (!req.file) {
      return res.status(400).json({ erro: 'Nenhuma imagem enviada.' });
    }

    const { rows } = await db.query('SELECT valor FROM configuracoes_site WHERE chave = $1', [`${chave}_public_id`]);
    const publicIdAntigo = rows[0]?.valor || null;

    const { url, publicId } = await uploadBuffer(req.file.buffer, { pasta: PASTA_CLOUDINARY, tipoRecurso: 'image' });

    await salvarConfiguracao(chave, url);
    await salvarConfiguracao(`${chave}_public_id`, publicId);

    // Remove a imagem antiga do Cloudinary, já substituída (só se era um
    // upload nosso — as imagens padrão do Unsplash não têm public_id salvo)
    if (publicIdAntigo) await removerArquivo(publicIdAntigo, 'image');

    res.json({ ok: true, configuracoes: await lerConfiguracoes() });
  } catch (erro) {
    console.error('Erro ao enviar imagem do site:', erro);
    res.status(500).json({ erro: 'Erro ao enviar a imagem. Tente novamente.' });
  }
});

module.exports = router;
