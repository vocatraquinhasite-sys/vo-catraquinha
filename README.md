# 🐾 Vô Catraquinha

> "Todo vovô e vovó de patinhas merece um lar cheio de carinho"

Projeto acadêmico e social voltado ao acolhimento, cuidado e promoção da adoção responsável de **animais idosos** em situação de abandono.

---

## 📋 Sobre o Projeto

O **Vô Catraquinha** nasceu para dar visibilidade aos animais idosos — muitas vezes os últimos a serem notados e os primeiros a serem esquecidos nos abrigos. A plataforma conecta potenciais adotantes, ONGs, protetores independentes e voluntários, facilitando o processo de adoção e a gestão de apoios e doações.

---

## 🛠️ Tecnologias Utilizadas

O projeto foi desenvolvido com uma arquitetura moderna e separação clara entre front-end estático e serviços em nuvem:

* **Front-end:** HTML5, CSS3 (com variáveis e design responsivo) e JavaScript (Vanilla).
* **Banco de Dados & Backend:** [Supabase](https://supabase.com/) para persistência de dados, autenticação e gerenciamento de configurações.
* **Hospedagem de Mídia:** [Cloudinary](https://cloudinary.com/) para upload e armazenamento otimizado de imagens.
* **Deploy e Hospedagem:** [Render](https://render.com/) (plataforma em nuvem).

---

## ✨ Funcionalidades Principais

* **Vitrine de Animais (RF02):** Listagem de cães idosos disponíveis para adoção com filtros e detalhes individuais.
* **Painel Administrativo (Dashboard):** Área restrita para que a administração gerencie cadastros, atualize status de animais e altere configurações globais do site dinamicamente.
* **Estatísticas em Tempo Real (RF01):** Métricas sobre animais acolhidos, adoções realizadas e voluntários cadastrados.
* **Ferramentas de Apoio:** Canais diretos integrados via WhatsApp, campanhas de doação via PIX e fichas de envio para ONGs e protetores parceiros.

---

## 📁 Estrutura de Pastas

```text
├── assets/
│   └── img/            # Imagens locais do projeto (logotipos, ícones e fotos de fundo)
├── css/                # Folhas de estilo modulares (tokens, base, layout, componentes, home)
├── js/                 # Scripts de lógica, requisições à API, rotas e tratamento de componentes
├── *.html              # Páginas principais (index, animais, sobre, doacoes, dashboard, login, etc.)
└── README.md           # Documentação do projeto