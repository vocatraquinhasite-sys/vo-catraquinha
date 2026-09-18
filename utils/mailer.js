/**
 * mailer.js
 * ------------------------------------------------------------------
 * Envio de e-mails do sistema (códigos de verificação para troca de
 * e-mail/senha da conta administrativa).
 *
 * Configuração via .env (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS...).
 * Se SMTP_HOST não estiver preenchido, o e-mail não é enviado de
 * verdade — o código é apenas registrado no console do servidor, para
 * permitir testar o fluxo em ambiente de desenvolvimento sem precisar
 * de credenciais reais de e-mail.
 * ------------------------------------------------------------------
 */
const nodemailer = require('nodemailer');

function smtpConfigurado() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transportador = null;
function obterTransportador() {
  if (!smtpConfigurado()) return null;
  if (!transportador) {
    transportador = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transportador;
}

/**
 * Envia um e-mail. Se o SMTP não estiver configurado, apenas registra
 * no console (modo de teste/desenvolvimento) e resolve normalmente,
 * para não travar o fluxo da aplicação.
 */
async function enviarEmail({ para, assunto, textoHtml }) {
  const transporte = obterTransportador();

  if (!transporte) {
    console.log('\n📧 [MODO TESTE — SMTP não configurado no .env] E-mail não enviado de verdade.');
    console.log(`   Para: ${para}`);
    console.log(`   Assunto: ${assunto}`);
    console.log(`   Conteúdo: ${textoHtml.replace(/<[^>]+>/g, ' ')}\n`);
    return { modoTeste: true };
  }

  await transporte.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: para,
    subject: assunto,
    html: textoHtml,
  });
  return { modoTeste: false };
}

function emailCodigoVerificacao({ nomeAdmin, codigo, finalidade }) {
  const acao = finalidade === 'email' ? 'a troca do e-mail de acesso' : 'a troca da senha de acesso';
  return {
    assunto: `Seu código de verificação — Vô Catraquinha`,
    textoHtml: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color:#8c3f02;">🐾 Vô Catraquinha</h2>
        <p>Olá, ${nomeAdmin || 'administrador(a)'}!</p>
        <p>Recebemos uma solicitação para ${acao} da dashboard administrativa. Use o código abaixo para confirmar:</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px; background:#fcecd4; color:#6b2f01; padding: 14px 20px; border-radius: 10px; text-align:center;">${codigo}</p>
        <p>Este código expira em 15 minutos. Se você não solicitou essa alteração, ignore este e-mail e, por segurança, verifique o acesso à sua conta.</p>
      </div>
    `,
  };
}

module.exports = { enviarEmail, emailCodigoVerificacao, smtpConfigurado };
