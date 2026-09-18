/**
 * middleware/uploadDivulgacao.js
 * ------------------------------------------------------------------
 * Upload de arquivos (fotos e vídeos) do formulário de divulgação.
 * memoryStorage: os arquivos vão para o Cloudinary, nunca para o
 * disco local do servidor.
 * ------------------------------------------------------------------
 */
const multer = require('multer');

const TIPOS_PERMITIDOS = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/quicktime', 'video/webm',
]);

const uploadDivulgacao = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 }, // 10MB por arquivo, até 10 arquivos
  fileFilter: (req, file, cb) => {
    if (!TIPOS_PERMITIDOS.has(file.mimetype)) {
      return cb(new Error('Formato de arquivo não suportado. Envie fotos (JPG/PNG/WEBP/GIF) ou vídeos (MP4/MOV/WEBM).'));
    }
    cb(null, true);
  },
});

module.exports = uploadDivulgacao;
