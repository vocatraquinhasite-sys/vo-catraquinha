/**
 * middleware/uploadSiteImagem.js
 * ------------------------------------------------------------------
 * Upload de imagens gerais do site (banner da home, fotos da seção
 * "História"), editáveis pela dashboard. memoryStorage: vai direto
 * para o Cloudinary, sem tocar no disco local.
 * ------------------------------------------------------------------
 */
const multer = require('multer');

const TIPOS_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const uploadSiteImagem = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!TIPOS_PERMITIDOS.has(file.mimetype)) {
      return cb(new Error('Formato de imagem não suportado. Envie JPG, PNG, WEBP ou GIF.'));
    }
    cb(null, true);
  },
});

module.exports = uploadSiteImagem;
