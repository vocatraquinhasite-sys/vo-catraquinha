/**
 * db.js
 * ------------------------------------------------------------------
 * Pool de conexões com o PostgreSQL (Render Postgres, Supabase, Neon
 * ou qualquer outro Postgres compatível com a variável DATABASE_URL).
 *
 * Diferente do SQLite anterior, aqui TODA consulta é assíncrona
 * (retorna uma Promise) — por isso todas as rotas usam `await`.
 *
 * SSL: bancos gerenciados (Render/Supabase/Neon) exigem conexão via
 * SSL, mas geralmente com certificado autoassinado — por isso
 * `rejectUnauthorized: false`. Em desenvolvimento local (Postgres
 * rodando na sua máquina, sem SSL), defina DATABASE_URL_SSL=false
 * no .env para desligar essa exigência.
 * ------------------------------------------------------------------
 */
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('\n❌ Variável DATABASE_URL não definida no .env — configure a connection string do PostgreSQL antes de iniciar o servidor.\n');
  process.exit(1);
}

const usarSSL = process.env.DATABASE_URL_SSL !== 'false';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: usarSSL ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  // Erros em conexões ociosas do pool não devem derrubar o processo inteiro
  console.error('Erro inesperado no pool do PostgreSQL:', err);
});

module.exports = pool;
