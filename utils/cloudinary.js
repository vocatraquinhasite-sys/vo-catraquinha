/**
 * utils/cloudinary.js
 * ------------------------------------------------------------------
 * Configuração do Cloudinary e helpers para enviar/remover arquivos.
 *
 * Como funciona o fluxo, já que o multer agora usa memoryStorage:
 *   1) O multer recebe o arquivo e guarda os bytes em req.file.buffer
 *      (nada é salvo em disco — o disco do Render é efêmero).
 *   2) A rota chama `uploadBuffer(buffer, opcoes)`, que envia esses
 *      bytes direto para o Cloudinary via stream, sem passar por
 *      arquivo temporário.
 *   3) O Cloudinary responde com uma URL pública permanente
 *      (`secure_url`) e um identificador (`public_id`) — os dois são
 *      salvos no banco. O `public_id` é o que permite apagar ou
 *      substituir aquele arquivo especificamente depois.
 * ------------------------------------------------------------------
 */
const cloudinary = require('cloudinary').v2;

const configurado = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
);

if (configurado) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
} else {
  console.warn(
    '\n⚠️  Credenciais do Cloudinary não configuradas no .env (CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET).\n' +
    '    Uploads de imagem vão falhar até isso ser configurado.\n'
  );
}

/**
 * Envia um buffer (arquivo em memória) para o Cloudinary.
 * @param {Buffer} buffer - conteúdo do arquivo (req.file.buffer)
 * @param {Object} opcoes
 * @param {string} opcoes.pasta - subpasta no Cloudinary (ex: 'vo-catraquinha/animais')
 * @param {'image'|'video'|'auto'} [opcoes.tipoRecurso] - tipo do recurso, padrão 'auto'
 * @returns {Promise<{url: string, publicId: string, tipoRecurso: string}>}
 */
function uploadBuffer(buffer, { pasta, tipoRecurso = 'auto' } = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: pasta, resource_type: tipoRecurso },
      (erro, resultado) => {
        if (erro) return reject(erro);
        resolve({ url: resultado.secure_url, publicId: resultado.public_id, tipoRecurso: resultado.resource_type });
      }
    );
    stream.end(buffer);
  });
}

/**
 * Remove um arquivo do Cloudinary pelo public_id. Silencioso em caso de
 * erro (não deve travar uma exclusão/atualização no banco por causa de
 * um arquivo que talvez já não exista mais lá).
 */
async function removerArquivo(publicId, tipoRecurso = 'image') {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: tipoRecurso });
  } catch (erro) {
    console.error(`Falha ao remover arquivo do Cloudinary (public_id: ${publicId}):`, erro.message);
  }
}

module.exports = { cloudinary, uploadBuffer, removerArquivo, configurado };
