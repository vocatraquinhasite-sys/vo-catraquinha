/**
 * routes/animais.js
 * ------------------------------------------------------------------
 * Rotas PÚBLICAS:
 *   GET  /api/animais            -> lista com filtros/pesquisa (RF02, RF03)
 *   GET  /api/animais/:id        -> perfil individual (RF04)
 *
 * Rotas ADMINISTRATIVAS (exigem token):
 *   POST   /api/animais            -> cadastrar (RF07)
 *   PUT    /api/animais/:id        -> editar (RF08)
 *   DELETE /api/animais/:id        -> excluir
 *   PATCH  /api/animais/:id/status -> marcar como adotado/disponível/em processo (RF09)
 *   POST   /api/animais/:id/fotos          -> upload de fotos (vai para o Cloudinary)
 *   PATCH  /api/animais/:id/fotos/:fotoId  -> substituir uma foto específica
 *   PATCH  /api/animais/:id/fotos/:fotoId/capa -> definir como foto de capa
 *   DELETE /api/animais/:id/fotos/:fotoId
 *   POST   /api/animais/:id/videos  -> adicionar link de vídeo
 *   DELETE /api/animais/:id/videos/:videoId
 * ------------------------------------------------------------------
 */
const express = require('express');
const db = require('../database/db');
const { exigirAutenticacao } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadBuffer, removerArquivo } = require('../utils/cloudinary');

const router = express.Router();

const STATUS_VALIDOS = new Set(['disponivel', 'processo', 'adotado']);
const PORTES_VALIDOS = new Set(['pequeno', 'medio', 'grande']);
const SEXOS_VALIDOS = new Set(['macho', 'femea']);
const ESPECIES_VALIDAS = new Set(['cachorro', 'gato', 'outro']);
const PASTA_CLOUDINARY = 'vo-catraquinha/animais';

async function buscarAnimalCompleto(id) {
  const { rows: animais } = await db.query('SELECT * FROM animais WHERE id = $1', [id]);
  const animal = animais[0];
  if (!animal) return null;

  const { rows: fotos } = await db.query(
    'SELECT id, url, public_id, ordem FROM animal_fotos WHERE animal_id = $1 ORDER BY ordem ASC, id ASC',
    [id]
  );
  const { rows: videos } = await db.query(
    'SELECT id, url, ordem FROM animal_videos WHERE animal_id = $1 ORDER BY ordem ASC, id ASC',
    [id]
  );
  return { ...animal, fotos, videos };
}

/* ------------------------------- PÚBLICAS ------------------------------- */

router.get('/', async (req, res) => {
  try {
    const { porte, sexo, status, especie, q, destaque } = req.query;

    const condicoes = [];
    const params = [];
    let i = 1;

    if (porte && PORTES_VALIDOS.has(porte)) { condicoes.push(`porte = $${i++}`); params.push(porte); }
    if (sexo && SEXOS_VALIDOS.has(sexo)) { condicoes.push(`sexo = $${i++}`); params.push(sexo); }
    if (especie && ESPECIES_VALIDAS.has(especie)) { condicoes.push(`especie = $${i++}`); params.push(especie); }

    if (status && STATUS_VALIDOS.has(status)) {
      condicoes.push(`status = $${i++}`);
      params.push(status);
    } else if (!req.query.todosStatus) {
      condicoes.push("status != 'adotado'");
    }
    if (destaque === '1') condicoes.push('destaque = 1');
    if (q && q.trim()) {
      condicoes.push(`(nome ILIKE $${i} OR historia ILIKE $${i})`);
      params.push(`%${q.trim()}%`);
      i++;
    }

    const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
    const { rows: animais } = await db.query(`SELECT * FROM animais ${where} ORDER BY criado_em DESC`, params);

    const ids = animais.map((a) => a.id);
    let fotosPorAnimal = {};
    if (ids.length) {
      const { rows: fotos } = await db.query(
        `SELECT animal_id, url FROM animal_fotos WHERE animal_id = ANY($1::int[]) ORDER BY ordem ASC, id ASC`,
        [ids]
      );
      for (const f of fotos) {
        if (!fotosPorAnimal[f.animal_id]) fotosPorAnimal[f.animal_id] = [];
        fotosPorAnimal[f.animal_id].push(f.url);
      }
    }

    const resultado = animais.map((a) => ({
      ...a,
      fotoCapa: (fotosPorAnimal[a.id] && fotosPorAnimal[a.id][0]) || null,
    }));

    res.json({ total: resultado.length, animais: resultado });
  } catch (erro) {
    console.error('Erro ao listar animais:', erro);
    res.status(500).json({ erro: 'Erro ao carregar os animais.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const animal = await buscarAnimalCompleto(req.params.id);
    if (!animal) return res.status(404).json({ erro: 'Animal não encontrado.' });
    res.json({ animal });
  } catch (erro) {
    console.error('Erro ao buscar animal:', erro);
    res.status(500).json({ erro: 'Erro ao carregar o animal.' });
  }
});

/* --------------------------- ADMINISTRATIVAS --------------------------- */

function validarCamposAnimal(body, { exigirTodos }) {
  const erros = [];
  const campos = {};

  if (body.nome !== undefined) campos.nome = String(body.nome).trim();
  else if (exigirTodos) erros.push('Nome é obrigatório.');

  if (body.especie !== undefined) {
    if (!ESPECIES_VALIDAS.has(body.especie)) erros.push('Espécie inválida.');
    else campos.especie = body.especie;
  }
  if (body.porte !== undefined) {
    if (!PORTES_VALIDOS.has(body.porte)) erros.push('Porte inválido (use pequeno, medio ou grande).');
    else campos.porte = body.porte;
  } else if (exigirTodos) erros.push('Porte é obrigatório.');

  if (body.sexo !== undefined) {
    if (!SEXOS_VALIDOS.has(body.sexo)) erros.push('Sexo inválido (use macho ou femea).');
    else campos.sexo = body.sexo;
  } else if (exigirTodos) erros.push('Sexo é obrigatório.');

  if (body.idade_anos !== undefined) campos.idade_anos = body.idade_anos === '' ? null : Number(body.idade_anos);
  if (body.idade_texto !== undefined) campos.idade_texto = String(body.idade_texto).trim();
  if (body.historia !== undefined) campos.historia = String(body.historia).trim();
  if (body.destaque !== undefined) campos.destaque = body.destaque ? 1 : 0;
  if (body.status !== undefined) {
    if (!STATUS_VALIDOS.has(body.status)) erros.push('Status inválido.');
    else campos.status = body.status;
  }

  return { erros, campos };
}

router.post('/', exigirAutenticacao, async (req, res) => {
  try {
    const { erros, campos } = validarCamposAnimal(req.body || {}, { exigirTodos: true });
    if (erros.length) return res.status(400).json({ erro: erros.join(' ') });

    const { rows } = await db.query(
      `INSERT INTO animais (nome, especie, idade_anos, idade_texto, porte, sexo, historia, status, destaque)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        campos.nome,
        campos.especie || 'cachorro',
        campos.idade_anos ?? null,
        campos.idade_texto || null,
        campos.porte,
        campos.sexo,
        campos.historia || null,
        campos.status || 'disponivel',
        campos.destaque || 0,
      ]
    );

    const animal = await buscarAnimalCompleto(rows[0].id);
    res.status(201).json({ animal });
  } catch (erro) {
    console.error('Erro ao cadastrar animal:', erro);
    res.status(500).json({ erro: 'Erro ao cadastrar o animal.' });
  }
});

router.put('/:id', exigirAutenticacao, async (req, res) => {
  try {
    const { rows: existentes } = await db.query('SELECT id FROM animais WHERE id = $1', [req.params.id]);
    if (!existentes[0]) return res.status(404).json({ erro: 'Animal não encontrado.' });

    const { erros, campos } = validarCamposAnimal(req.body || {}, { exigirTodos: false });
    if (erros.length) return res.status(400).json({ erro: erros.join(' ') });

    const camposPermitidos = ['nome', 'especie', 'idade_anos', 'idade_texto', 'porte', 'sexo', 'historia', 'status', 'destaque'];
    const atualizacoes = Object.keys(campos).filter((k) => camposPermitidos.includes(k));
    if (!atualizacoes.length) return res.status(400).json({ erro: 'Nenhum campo válido para atualizar.' });

    const setClause = atualizacoes.map((c, idx) => `${c} = $${idx + 1}`).join(', ');
    const valores = atualizacoes.map((c) => campos[c]);
    valores.push(req.params.id);

    await db.query(
      `UPDATE animais SET ${setClause}, atualizado_em = NOW() WHERE id = $${valores.length}`,
      valores
    );

    res.json({ animal: await buscarAnimalCompleto(req.params.id) });
  } catch (erro) {
    console.error('Erro ao editar animal:', erro);
    res.status(500).json({ erro: 'Erro ao editar o animal.' });
  }
});

router.delete('/:id', exigirAutenticacao, async (req, res) => {
  try {
    const animal = await buscarAnimalCompleto(req.params.id);
    if (!animal) return res.status(404).json({ erro: 'Animal não encontrado.' });

    // Remove as fotos do Cloudinary antes de apagar o registro (o ON DELETE
    // CASCADE cuida das linhas do banco, mas não dos arquivos remotos)
    for (const foto of animal.fotos) {
      await removerArquivo(foto.public_id, 'image');
    }

    await db.query('DELETE FROM animais WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (erro) {
    console.error('Erro ao excluir animal:', erro);
    res.status(500).json({ erro: 'Erro ao excluir o animal.' });
  }
});

router.patch('/:id/status', exigirAutenticacao, async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!STATUS_VALIDOS.has(status)) {
      return res.status(400).json({ erro: 'Status inválido. Use disponivel, processo ou adotado.' });
    }
    const { rows } = await db.query('SELECT id FROM animais WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ erro: 'Animal não encontrado.' });

    await db.query("UPDATE animais SET status = $1, atualizado_em = NOW() WHERE id = $2", [status, req.params.id]);
    res.json({ animal: await buscarAnimalCompleto(req.params.id) });
  } catch (erro) {
    console.error('Erro ao mudar status do animal:', erro);
    res.status(500).json({ erro: 'Erro ao atualizar o status.' });
  }
});

// Upload de fotos -> envia cada arquivo para o Cloudinary e salva URL + public_id
router.post('/:id/fotos', exigirAutenticacao, upload.array('fotos', 8), async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id FROM animais WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ erro: 'Animal não encontrado.' });

    const arquivos = req.files || [];
    if (!arquivos.length) return res.status(400).json({ erro: 'Nenhuma foto enviada.' });

    const { rows: maiorOrdemRows } = await db.query(
      'SELECT COALESCE(MAX(ordem), -1) AS m FROM animal_fotos WHERE animal_id = $1',
      [req.params.id]
    );
    let proximaOrdem = Number(maiorOrdemRows[0].m) + 1;

    for (const arquivo of arquivos) {
      const { url, publicId } = await uploadBuffer(arquivo.buffer, { pasta: PASTA_CLOUDINARY, tipoRecurso: 'image' });
      await db.query(
        'INSERT INTO animal_fotos (animal_id, url, public_id, ordem) VALUES ($1, $2, $3, $4)',
        [req.params.id, url, publicId, proximaOrdem++]
      );
    }

    res.status(201).json({ animal: await buscarAnimalCompleto(req.params.id) });
  } catch (erro) {
    console.error('Erro ao enviar fotos:', erro);
    res.status(500).json({ erro: 'Erro ao enviar as fotos. Tente novamente.' });
  }
});

router.delete('/:id/fotos/:fotoId', exigirAutenticacao, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM animal_fotos WHERE id = $1 AND animal_id = $2',
      [req.params.fotoId, req.params.id]
    );
    const foto = rows[0];
    if (!foto) return res.status(404).json({ erro: 'Foto não encontrada.' });

    await db.query('DELETE FROM animal_fotos WHERE id = $1', [req.params.fotoId]);
    await removerArquivo(foto.public_id, 'image');

    res.json({ ok: true });
  } catch (erro) {
    console.error('Erro ao remover foto:', erro);
    res.status(500).json({ erro: 'Erro ao remover a foto.' });
  }
});

// Substituir uma foto específica (mantém a posição/ordem, troca só o arquivo)
router.patch('/:id/fotos/:fotoId', exigirAutenticacao, upload.single('foto'), async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM animal_fotos WHERE id = $1 AND animal_id = $2',
      [req.params.fotoId, req.params.id]
    );
    const foto = rows[0];
    if (!foto) return res.status(404).json({ erro: 'Foto não encontrada.' });
    if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo enviado.' });

    const { url, publicId } = await uploadBuffer(req.file.buffer, { pasta: PASTA_CLOUDINARY, tipoRecurso: 'image' });
    await db.query('UPDATE animal_fotos SET url = $1, public_id = $2 WHERE id = $3', [url, publicId, req.params.fotoId]);

    // Remove a versão antiga do Cloudinary, já substituída
    await removerArquivo(foto.public_id, 'image');

    res.json({ animal: await buscarAnimalCompleto(req.params.id) });
  } catch (erro) {
    console.error('Erro ao substituir foto:', erro);
    res.status(500).json({ erro: 'Erro ao substituir a foto.' });
  }
});

// Definir uma foto como capa (a que aparece primeiro nos cards do site)
router.patch('/:id/fotos/:fotoId/capa', exigirAutenticacao, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id FROM animal_fotos WHERE id = $1 AND animal_id = $2',
      [req.params.fotoId, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Foto não encontrada.' });

    const { rows: menorOrdemRows } = await db.query(
      'SELECT COALESCE(MIN(ordem), 0) AS m FROM animal_fotos WHERE animal_id = $1',
      [req.params.id]
    );
    const novaOrdem = Number(menorOrdemRows[0].m) - 1;

    await db.query('UPDATE animal_fotos SET ordem = $1 WHERE id = $2', [novaOrdem, req.params.fotoId]);
    res.json({ animal: await buscarAnimalCompleto(req.params.id) });
  } catch (erro) {
    console.error('Erro ao definir foto de capa:', erro);
    res.status(500).json({ erro: 'Erro ao definir a foto de capa.' });
  }
});

router.post('/:id/videos', exigirAutenticacao, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id FROM animais WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ erro: 'Animal não encontrado.' });

    const { url } = req.body || {};
    if (!url || !String(url).trim()) return res.status(400).json({ erro: 'Informe a URL do vídeo.' });

    const { rows: maiorOrdemRows } = await db.query(
      'SELECT COALESCE(MAX(ordem), -1) AS m FROM animal_videos WHERE animal_id = $1',
      [req.params.id]
    );
    const proximaOrdem = Number(maiorOrdemRows[0].m) + 1;

    await db.query('INSERT INTO animal_videos (animal_id, url, ordem) VALUES ($1, $2, $3)', [req.params.id, String(url).trim(), proximaOrdem]);
    res.status(201).json({ animal: await buscarAnimalCompleto(req.params.id) });
  } catch (erro) {
    console.error('Erro ao adicionar vídeo:', erro);
    res.status(500).json({ erro: 'Erro ao adicionar o vídeo.' });
  }
});

router.delete('/:id/videos/:videoId', exigirAutenticacao, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id FROM animal_videos WHERE id = $1 AND animal_id = $2',
      [req.params.videoId, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Vídeo não encontrado.' });

    await db.query('DELETE FROM animal_videos WHERE id = $1', [req.params.videoId]);
    res.json({ ok: true });
  } catch (erro) {
    console.error('Erro ao remover vídeo:', erro);
    res.status(500).json({ erro: 'Erro ao remover o vídeo.' });
  }
});

module.exports = router;
