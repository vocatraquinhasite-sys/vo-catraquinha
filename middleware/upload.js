/**
 * middleware/upload.js
 * ------------------------------------------------------------------
 * Configura o recebimento de fotos enviadas pela dashboard para cada
 * animal. Usa memoryStorage (nada é salvo em disco): o multer só
 * valida e mantém o arquivo em memória (`req.file.buffer` /
 * `req.files[].buffer`), e a rota é quem envia esses bytes para o
 * Cloudinary — assim nenhuma imagem se perde nos "cold starts" ou
 * redeploys do Render.
 * ------------------------------------------------------------------
 */
const multer = require('multer');

const TIPOS_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024, files: 8 }, // 6MB por arquivo, até 8 fotos por vez
  fileFilter: (req, file, cb) => {
    if (!TIPOS_PERMITIDOS.has(file.mimetype)) {
      return cb(new Error('Formato de imagem não suportado. Envie JPG, PNG, WEBP ou GIF.'));
    }
    cb(null, true);
  },
});

module.exports = upload;
