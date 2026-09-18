# 🐾 Vô Catraquinha — Site institucional

Site institucional do Projeto Vô Catraquinha, projeto social individual dedicado ao acolhimento, cuidado e adoção responsável de animais idosos em situação de abandono.

**Stack:** Node.js + Express + PostgreSQL (banco de dados) + Cloudinary (armazenamento de imagens/vídeos) + frontend em HTML/CSS/JS puro. Arquitetura pensada para rodar no plano gratuito do Render sem perder dados nos redeploys/reinícios (disco efêmero).

## Estrutura do projeto

```
vo-catraquinha/                (raiz do repositório)
├── database/          → db.js (pool de conexão), migrate.js (schema), seed.js (dados iniciais)
├── middleware/         → autenticação (JWT) e upload de arquivos (memória, não disco)
├── routes/             → rotas da API
├── utils/               → mailer.js (e-mail) e cloudinary.js (upload de imagens/vídeos)
├── public/              → Frontend (HTML + CSS + JavaScript puro)
│   ├── css/              → estilos (tokens de cor, tema claro/escuro, componentes)
│   ├── js/               → scripts das páginas públicas
│   ├── admin/            → área administrativa (login + dashboard)
│   └── *.html            → páginas do site
├── .env.example         → modelo de variáveis de ambiente (copie para .env)
└── server.js             → ponto de entrada
```

## Como rodar o projeto localmente

**Pré-requisitos:** Node.js 18+ e acesso a um banco PostgreSQL (local ou na nuvem — veja "Deploy" mais abaixo para opções gratuitas).

```bash
npm install                     # instala as dependências
cp .env.example .env            # copie o modelo e preencha DATABASE_URL, Cloudinary, etc.
npm run seed                    # cria as tabelas (migração) + admin inicial + dados de exemplo
npm start                       # inicia o servidor
```

Depois disso, acesse **http://localhost:3000**. O mesmo servidor entrega tanto o site público quanto a API.

⚠️ Sem preencher `CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` no `.env`, o site funciona normalmente, mas qualquer tentativa de enviar foto/vídeo retorna erro — essas credenciais são obrigatórias assim que for usar upload de imagens.

## Login administrativo

Acesse **http://localhost:3000/admin/login.html** com as credenciais definidas em `ADMIN_EMAIL_INICIAL`/`ADMIN_SENHA_INICIAL` no `.env` (usadas pelo `npm run seed` na primeira vez que o admin é criado).

⚠️ **Troque a senha assim que possível** pela própria dashboard, em *Configurações → Trocar senha*. As senhas nunca são salvas em texto puro — usamos hash com bcrypt.

## Configurações importantes antes de publicar o site

1. **Número de WhatsApp, Instagram, e-mail de contato e chave PIX**: editáveis direto pela dashboard, em *Configurações → Informações de contato do site* — não precisa mexer em código.
2. **JWT_SECRET**: no `.env`, troque por um valor aleatório e secreto antes de publicar (gere um com `openssl rand -hex 32`, por exemplo).
3. **DATABASE_URL** e as 3 credenciais do **Cloudinary**: veja a seção "Deploy no Render" abaixo.
4. **Envio de e-mail (SMTP)**: veja a seção abaixo — necessário para os códigos de verificação de troca de e-mail/senha funcionarem de verdade.

## Troca de e-mail e senha com código de verificação

Pela dashboard (**Configurações**), é possível trocar o e-mail de acesso e a senha da conta administrativa diretamente pelo site, com confirmação por código:

- Ao solicitar a troca, um **código de 6 dígitos é enviado para o e-mail já cadastrado** na conta (não para o novo e-mail sendo digitado) — isso impede que alguém com acesso à sessão logada consiga sequestrar a conta sem também ter acesso à caixa de entrada já confiável.
- O código expira em 15 minutos, só pode ser usado uma vez, e tem limite de tentativas.
- Para trocar a senha, também é necessário informar a senha atual antes de receber o código.

### Configurando o envio de e-mail (SMTP)

Sem essa configuração, o sistema **não envia e-mails de verdade** — o código aparece apenas no console/log do servidor (modo de teste, útil para desenvolvimento local). Para ativar o envio real, edite `.env`:

```
SMTP_HOST=smtp.seuprovedor.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-usuario-smtp
SMTP_PASS=sua-senha-smtp
SMTP_FROM="Vô Catraquinha <nao-responder@vocatraquinha.org>"
```

Alguns provedores comuns:
- **Gmail**: use uma ["senha de app"](https://myaccount.google.com/apppasswords) (não a senha normal da conta Google), `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`.
- **Outlook/Hotmail**: `SMTP_HOST=smtp.office365.com`, `SMTP_PORT=587`.
- Serviços dedicados de envio (SendGrid, Mailgun, Amazon SES, Resend, etc.) também funcionam — basta usar as credenciais SMTP fornecidas por eles.

Depois de configurar, reinicie o servidor (`npm start`). A dashboard mostra um aviso na seção Configurações caso o SMTP ainda não esteja ativo.

## Cadastrando os animais reais

Assim que a dona do projeto enviar as informações dos animais, use a dashboard (`/admin/dashboard.html` → seção **Animais**) para:

1. Clicar em **"+ Cadastrar animal"** e preencher nome, espécie, porte, sexo, idade e história.
2. Salvar o animal — a partir daí, a seção de **fotos** e **vídeos** aparece no mesmo painel para adicionar as mídias.
3. Fotos são enviadas diretamente do computador (upload). Vídeos são adicionados por link (YouTube, por exemplo).
4. Marcar **"Exibir em destaque"** para o animal aparecer na página inicial.
5. Alterar o status a qualquer momento (Disponível / Em processo / Adotado) direto na listagem.

Os 4 animais de exemplo inseridos pelo `npm run seed` podem ser editados ou excluídos livremente pela dashboard.

## Funcionalidades implementadas

- **Página inicial**: apresentação do projeto, banner, missão, história, estatísticas dinâmicas e animais em destaque.
- **Listagem de animais**: filtros por porte, sexo, espécie e status, além de pesquisa por texto.
- **Perfil individual do animal**: galeria de fotos, vídeos, história, e botão "Tenho Interesse" com duas opções (formulário completo de adoção ou WhatsApp direto).
- **Formulário completo de adoção**: réplica das 18 perguntas do questionário original, agora integrada ao site (sem depender do Google Forms).
- **Ficha de divulgação de cão idoso**: página para ONGs e protetores(as) parceiros enviarem um animal para divulgação, com upload de fotos/vídeos, réplica fiel do questionário original.
- **Fallback por WhatsApp em todos os formulários**: qualquer pessoa com dificuldade em preencher pelo site pode clicar em um aviso que abre o WhatsApp do projeto com uma mensagem pronta, pedindo o link do formulário.
- **Doações**: informações de chave PIX, doação de insumos, apadrinhamento e campanhas ativas cadastradas pela dashboard.
- **Voluntários**: informações sobre como ajudar e formulário de cadastro de interesse.
- **Informações de contato editáveis pela dashboard**: WhatsApp, Instagram, e-mail e chave PIX podem ser alterados direto pelo site, sem mexer em código — refletem automaticamente em todo o site.
- **Imagens gerais do site editáveis pela dashboard**: banner da página inicial e as fotos da seção "História" (início e Sobre) podem ser trocadas direto pela dashboard, sem mexer em código.
- **Área administrativa protegida por login** (JWT + senha com hash bcrypt): cadastro, edição, exclusão e marcação de status dos animais (incluindo substituir uma foto específica e definir a foto de capa); gerenciamento de campanhas; visualização dos formulários de adoção e fichas de divulgação recebidas, dos voluntários cadastrados e dos cliques em WhatsApp.
- **Segurança**: cabeçalhos HTTP protegidos (helmet), limite de requisições contra spam/flood, proteção contra XSS armazenado em conteúdo enviado pelo público, troca de e-mail/senha da conta admin com confirmação por código enviado ao e-mail já cadastrado.
- **Tema claro/escuro** com preferência salva no navegador.
- **Design responsivo**, com paleta de cores em tons de amarelo e laranja queimado (identidade visual do projeto).

## Tecnologias utilizadas

- **Frontend**: HTML5, CSS3 (variáveis CSS para o sistema de tema) e JavaScript puro (sem frameworks).
- **Backend**: Node.js + Express, com helmet (segurança) e express-rate-limit (proteção contra spam).
- **Banco de dados**: PostgreSQL (via `pg`) — hospedado em um serviço gerenciado (Render, Supabase ou Neon), com persistência real e independente do disco do servidor.
- **Armazenamento de imagens/vídeos**: Cloudinary — fotos de animais, arquivos de fichas de divulgação e imagens gerais do site nunca tocam o disco do servidor, evitando perda de dados em redeploys.
- **Autenticação**: JWT (JSON Web Token) + bcrypt para hash de senhas.
- **Upload**: Multer com `memoryStorage` (os arquivos passam direto da requisição para o Cloudinary, sem arquivo temporário em disco).
- **Envio de e-mail**: Nodemailer (códigos de verificação para troca de e-mail/senha).

## Deploy no Render (plano gratuito)

### 1. Criar o banco PostgreSQL gratuito

Escolha uma das opções abaixo (todas têm plano gratuito com connection string pronta):

**Opção A — Render Postgres** (mais simples, mesmo painel do deploy):
1. No painel do Render: **New → PostgreSQL**
2. Escolha o plano **Free**, dê um nome (ex: `vocatraquinha-db`) e crie
3. Depois de criado, copie o valor de **Internal Database URL** (não o "External" — o interno é mais rápido porque não sai da rede do Render, e é o que você vai usar na variável `DATABASE_URL`)

⚠️ O Postgres gratuito do Render **expira após 30 dias** e é apagado. Para uma entrega definitiva à instituição, prefira Supabase ou Neon (opções B/C), que têm plano gratuito permanente.

**Opção B — Supabase**:
1. Crie uma conta em [supabase.com](https://supabase.com) → **New Project**
2. Defina uma senha para o banco e escolha a região mais próxima
3. Em **Project Settings → Database → Connection string**, copie a URI no modo **Session pooler** (funciona melhor com o `pg` padrão) e substitua `[YOUR-PASSWORD]` pela senha que você definiu

**Opção C — Neon**:
1. Crie uma conta em [neon.tech](https://neon.tech) → **New Project**
2. No painel do projeto, copie a **Connection String** já pronta (formato `postgresql://usuario:senha@host/banco?sslmode=require`)

Qualquer uma das três: cole o valor copiado na variável `DATABASE_URL`.

### 2. Criar a conta gratuita do Cloudinary

1. Crie uma conta em [cloudinary.com](https://cloudinary.com/users/register/free) (plano gratuito, sem cartão de crédito)
2. No **Dashboard**, logo no topo, você verá três valores: **Cloud Name**, **API Key** e **API Secret** (clique no ícone de olho para revelar o Secret)
3. Copie os três

### 3. Configurar as variáveis de ambiente no Render

No seu Web Service do Render: **Environment → Add Environment Variable**, uma por uma:

```
DATABASE_URL=<a connection string copiada no passo 1>
DATABASE_URL_SSL=true
JWT_SECRET=<gere com: openssl rand -hex 32>
JWT_EXPIRES_IN=8h
ALLOWED_ORIGIN=https://seu-app.onrender.com
ADMIN_EMAIL_INICIAL=seu-email@real.com
ADMIN_SENHA_INICIAL=<uma senha forte — você troca depois pelo site>
WHATSAPP_NUMERO=5585999999999
CLOUDINARY_CLOUD_NAME=<copiado no passo 2>
CLOUDINARY_API_KEY=<copiado no passo 2>
CLOUDINARY_API_SECRET=<copiado no passo 2>
```

(Adicione também as variáveis `SMTP_*` se quiser que a troca de e-mail/senha por código funcione de verdade em produção — veja a seção sobre SMTP acima.)

### 4. Configurar o Web Service

- **Build Command**: `npm install && npm run seed`
- **Start Command**: `npm start`
- **Root Directory**: em branco (a raiz do repositório já é a raiz do projeto)

O `npm run seed` no Build Command cuida de tudo de uma vez: cria as tabelas no Postgres (se ainda não existirem — é seguro rodar a cada deploy, não duplica nada) e garante que o usuário administrador exista. Diferente do SQLite, **isso não precisa rodar de novo a cada redeploy só por causa do disco efêmero** — o banco agora está em um serviço externo persistente, então os dados cadastrados pela dashboard (animais, fotos, formulários recebidos) sobrevivem normalmente entre deploys.

### 5. Primeiro acesso

Acesse `https://seu-app.onrender.com/admin/login.html`, entre com as credenciais definidas em `ADMIN_EMAIL_INICIAL`/`ADMIN_SENHA_INICIAL`, e troque a senha imediatamente pela própria dashboard.

**Nota sobre "cold start"**: no plano gratuito do Render, o serviço "dorme" após ~15 min sem uso — a primeira requisição depois disso demora de 30 a 50 segundos pra responder. Isso é comportamento esperado do plano gratuito, não um erro.

