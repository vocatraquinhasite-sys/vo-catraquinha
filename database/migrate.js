/**
 * migrate.js
 * ------------------------------------------------------------------
 * Cria (de forma idempotente — "IF NOT EXISTS") todas as tabelas do
 * projeto no PostgreSQL. Roda automaticamente antes do seed, e pode
 * ser chamado sozinho com `npm run migrate`.
 *
 * Principais diferenças em relação ao schema antigo (SQLite):
 *   - AUTOINCREMENT do SQLite -> SERIAL do Postgres
 *   - datetime('now') do SQLite -> NOW() do Postgres (tipo TIMESTAMP)
 *   - Colunas "public_id" novas em animal_fotos e
 *     ficha_divulgacao_arquivos: guardam o identificador do arquivo
 *     no Cloudinary, necessário para conseguir apagar/substituir a
 *     imagem lá quando o registro for removido/trocado no site.
 * ------------------------------------------------------------------
 */
require('dotenv').config();
const pool = require('./db');

const COMANDOS_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS admins (
    id            SERIAL PRIMARY KEY,
    nome          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    senha_hash    TEXT NOT NULL,
    criado_em     TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS animais (
    id              SERIAL PRIMARY KEY,
    nome            TEXT NOT NULL,
    especie         TEXT NOT NULL DEFAULT 'cachorro',
    idade_anos      NUMERIC,
    idade_texto     TEXT,
    porte           TEXT NOT NULL,
    sexo            TEXT NOT NULL,
    historia        TEXT,
    status          TEXT NOT NULL DEFAULT 'disponivel',
    destaque        INTEGER NOT NULL DEFAULT 0,
    criado_em       TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS animal_fotos (
    id          SERIAL PRIMARY KEY,
    animal_id   INTEGER NOT NULL REFERENCES animais(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    public_id   TEXT,
    ordem       INTEGER NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS animal_videos (
    id          SERIAL PRIMARY KEY,
    animal_id   INTEGER NOT NULL REFERENCES animais(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    ordem       INTEGER NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS interesses_adocao (
    id                      SERIAL PRIMARY KEY,
    animal_id               INTEGER REFERENCES animais(id) ON DELETE SET NULL,
    nome                    TEXT NOT NULL,
    idade                   TEXT NOT NULL,
    profissao               TEXT NOT NULL,
    endereco                TEXT NOT NULL,
    moradia                 TEXT NOT NULL,
    acesso_espacos          TEXT NOT NULL,
    onde_dormira            TEXT NOT NULL,
    outros_animais          TEXT NOT NULL,
    tem_criancas            TEXT,
    rotina_casa             TEXT NOT NULL,
    passeios_semana         TEXT NOT NULL,
    pessoas_casa            TEXT NOT NULL,
    responsavel_unico       TEXT NOT NULL,
    nocao_adaptacao         TEXT NOT NULL,
    plano_viagem            TEXT NOT NULL,
    preferencia_porte_idade TEXT NOT NULL,
    motivo_adocao           TEXT NOT NULL,
    alergias                TEXT NOT NULL,
    ciencia_adaptacao       TEXT,
    ciencia_responsabilidade TEXT NOT NULL,
    ciencia_devolucao       TEXT,
    status                  TEXT NOT NULL DEFAULT 'novo',
    criado_em               TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS contatos_whatsapp (
    id          SERIAL PRIMARY KEY,
    animal_id   INTEGER REFERENCES animais(id) ON DELETE SET NULL,
    criado_em   TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS campanhas (
    id              SERIAL PRIMARY KEY,
    titulo          TEXT NOT NULL,
    descricao       TEXT NOT NULL,
    imagem_url      TEXT,
    meta_valor      NUMERIC,
    valor_arrecadado NUMERIC DEFAULT 0,
    ativa           INTEGER NOT NULL DEFAULT 1,
    criado_em       TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS voluntarios (
    id          SERIAL PRIMARY KEY,
    nome        TEXT NOT NULL,
    contato     TEXT NOT NULL,
    area_interesse TEXT,
    mensagem    TEXT,
    criado_em   TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS codigos_verificacao (
    id            SERIAL PRIMARY KEY,
    admin_id      INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    finalidade    TEXT NOT NULL,
    codigo_hash   TEXT NOT NULL,
    valor_pendente TEXT,
    tentativas    INTEGER NOT NULL DEFAULT 0,
    usado         INTEGER NOT NULL DEFAULT 0,
    expira_em     TIMESTAMP NOT NULL,
    criado_em     TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS configuracoes_site (
    chave         TEXT PRIMARY KEY,
    valor         TEXT NOT NULL DEFAULT '',
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS fichas_divulgacao (
    id                    SERIAL PRIMARY KEY,
    ong_nome_instagram    TEXT NOT NULL,
    cidade_estado         TEXT NOT NULL,
    responsavel_whatsapp  TEXT NOT NULL,
    animal_nome_sexo_idade TEXT NOT NULL,
    porte                 TEXT NOT NULL,
    tempo_espera          TEXT NOT NULL,
    temperamento          TEXT NOT NULL,
    entrega_condicoes     TEXT,
    lar_ideal             TEXT NOT NULL,
    restricoes            TEXT,
    aceita_outra_cidade   TEXT NOT NULL,
    historia              TEXT NOT NULL,
    materiais_enviados    TEXT NOT NULL,
    autoriza_publicacao      INTEGER NOT NULL DEFAULT 0,
    confirma_veracidade      INTEGER NOT NULL DEFAULT 0,
    ciente_avaliacao_preliminar INTEGER NOT NULL DEFAULT 0,
    compromete_avisar        INTEGER NOT NULL DEFAULT 0,
    observacoes_extra     TEXT,
    status                TEXT NOT NULL DEFAULT 'novo',
    criado_em             TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS ficha_divulgacao_arquivos (
    id        SERIAL PRIMARY KEY,
    ficha_id  INTEGER NOT NULL REFERENCES fichas_divulgacao(id) ON DELETE CASCADE,
    url       TEXT NOT NULL,
    public_id TEXT,
    tipo      TEXT NOT NULL DEFAULT 'imagem'
  )`,

  `CREATE INDEX IF NOT EXISTS idx_animais_status ON animais(status)`,
  `CREATE INDEX IF NOT EXISTS idx_animais_destaque ON animais(destaque)`,
  `CREATE INDEX IF NOT EXISTS idx_interesses_animal ON interesses_adocao(animal_id)`,
  `CREATE INDEX IF NOT EXISTS idx_codigos_admin ON codigos_verificacao(admin_id, finalidade, usado)`,
  `CREATE INDEX IF NOT EXISTS idx_fichas_divulgacao_status ON fichas_divulgacao(status)`,
];

async function migrar() {
  console.log('[migrate] Conectando ao PostgreSQL...');
  const client = await pool.connect();
  try {
    for (const comando of COMANDOS_SCHEMA) {
      await client.query(comando);
    }
    console.log(`[migrate] ${COMANDOS_SCHEMA.length} comandos de schema aplicados com sucesso.`);
  } finally {
    client.release();
  }
}

// Permite tanto `require('./migrate').migrar()` (usado pelo seed.js)
// quanto rodar diretamente com `node database/migrate.js` / `npm run migrate`
if (require.main === module) {
  migrar()
    .then(() => {
      console.log('[migrate] Concluído.');
      pool.end();
    })
    .catch((err) => {
      console.error('[migrate] Falhou:', err);
      process.exit(1);
    });
}

module.exports = { migrar };
