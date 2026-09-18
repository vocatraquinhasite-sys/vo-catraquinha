/**
 * seed.js
 * ------------------------------------------------------------------
 * Popula o banco com:
 *   1) O usuário administrador inicial (senha vem do .env, com HASH).
 *   2) Alguns animais de EXEMPLO, apenas para visualizar o layout
 *      funcionando enquanto os dados reais não são cadastrados.
 *
 * Roda a migração do schema automaticamente antes de semear os dados
 * (por isso o Build Command do Render pode ser só `npm install && npm run seed`
 * — não precisa rodar migrate e seed como dois passos separados).
 *
 * Rodar com: npm run seed
 * ------------------------------------------------------------------
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');
const { migrar } = require('./migrate');

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL_INICIAL || 'admin@vocatraquinha.org';
  const senha = process.env.ADMIN_SENHA_INICIAL || 'MudeEstaSenha123';

  const { rows } = await db.query('SELECT id FROM admins WHERE email = $1', [email]);
  if (rows[0]) {
    console.log(`[seed] Admin "${email}" já existe. Nenhuma alteração feita.`);
    return;
  }

  const hash = bcrypt.hashSync(senha, 12);
  await db.query('INSERT INTO admins (nome, email, senha_hash) VALUES ($1, $2, $3)', [
    'Administrador(a) Vô Catraquinha',
    email,
    hash,
  ]);

  console.log('[seed] Admin criado com sucesso:');
  console.log(`        e-mail: ${email}`);
  console.log(`        senha : ${senha}  (troque após o primeiro login!)`);
}

async function seedAnimaisExemplo() {
  const { rows } = await db.query('SELECT COUNT(*) AS c FROM animais');
  if (Number(rows[0].c) > 0) {
    console.log('[seed] Já existem animais cadastrados. Pulando dados de exemplo.');
    return;
  }

  const exemplos = [
    {
      nome: 'Catraquinha', especie: 'cachorro', idade_anos: 11, idade_texto: '11 anos',
      porte: 'pequeno', sexo: 'macho',
      historia: 'Encontrado nas ruas com dificuldade de locomoção, deu nome ao projeto. Hoje é cheio de manhas e adora um cobertor quentinho.',
      status: 'disponivel', destaque: 1,
      foto: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=800',
    },
    {
      nome: 'Vovó Mel', especie: 'cachorro', idade_anos: 9, idade_texto: '9 anos',
      porte: 'medio', sexo: 'femea',
      historia: 'Calma, dócil e companheira. Foi entregue por uma família que se mudou de cidade e não pôde levá-la.',
      status: 'disponivel', destaque: 1,
      foto: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=800',
    },
    {
      nome: 'Seu Tobias', especie: 'gato', idade_anos: 10, idade_texto: '10 anos',
      porte: 'pequeno', sexo: 'macho',
      historia: 'Gato de rua idoso, muito carinhoso com quem ganha sua confiança. Já está castrado e vacinado.',
      status: 'processo', destaque: 0,
      foto: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=800',
    },
    {
      nome: 'Duquesa', especie: 'cachorro', idade_anos: 8, idade_texto: '8 anos',
      porte: 'grande', sexo: 'femea',
      historia: 'Já foi adotada com muito carinho por uma família parceira do projeto.',
      status: 'adotado', destaque: 0,
      foto: 'https://images.unsplash.com/photo-1517849845537-4d257902861a?w=800',
    },
  ];

  for (const ex of exemplos) {
    const { rows } = await db.query(
      `INSERT INTO animais (nome, especie, idade_anos, idade_texto, porte, sexo, historia, status, destaque)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [ex.nome, ex.especie, ex.idade_anos, ex.idade_texto, ex.porte, ex.sexo, ex.historia, ex.status, ex.destaque]
    );
    // Observação: a foto de exemplo aqui é só uma URL pública do Unsplash
    // (não passa pelo Cloudinary) — serve apenas para o layout não ficar
    // vazio antes de cadastrar os animais reais pela dashboard.
    await db.query('INSERT INTO animal_fotos (animal_id, url, ordem) VALUES ($1, $2, 0)', [rows[0].id, ex.foto]);
  }

  console.log(`[seed] ${exemplos.length} animais de exemplo inseridos.`);
}

async function seedCampanhaExemplo() {
  const { rows } = await db.query('SELECT COUNT(*) AS c FROM campanhas');
  if (Number(rows[0].c) > 0) return;

  await db.query(
    `INSERT INTO campanhas (titulo, descricao, meta_valor, valor_arrecadado, ativa)
     VALUES ($1, $2, $3, $4, 1)`,
    [
      'Ração e remédios de inverno',
      'Campanha para garantir ração de qualidade e medicamentos contínuos para os vovôs e vovós de patinha durante o inverno.',
      3000,
      850,
    ]
  );
  console.log('[seed] Campanha de exemplo inserida.');
}

async function rodarSeed() {
  await migrar();
  await seedAdmin();
  await seedAnimaisExemplo();
  await seedCampanhaExemplo();
  console.log('[seed] Concluído.');
}

rodarSeed()
  .then(() => db.end())
  .catch((erro) => {
    console.error('[seed] Falhou:', erro);
    process.exit(1);
  });
