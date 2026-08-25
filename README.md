# 🎨 Sistema de Gestão Cultural & Prestação de Contas (PWA)

Sistema web completo (PWA Bento UI) desenvolvido para acompanhamento pedagógico, registro de chamadas/frequência, curadoria de fotos de ensaios e apresentações, e **geração automatizada de relatórios mensais de prestação de contas em PDF**.

---

## ✨ Principais Funcionalidades

- **📱 Interface PWA Bento UI**: Design responsivo, elegante e intuitivo com suporte a Local-First.
- **📅 Controle de Chamadas e Frequência**: Registro diário de presença/ausência de alunos com cálculo percentual de assiduidade.
- **📸 Registro e Curadoria Fotográfica**: Envio de fotos de ensaios e eventos com carimbo automático de data, horário e escola.
- **🧙‍♂️ Assistente Guiado de Relatório Mensal (Wizard em 7 Etapas)**:
  1. *Descrição das Atividades Planejadas e Executadas* (Foco pedagógico + computação automática).
  2. *Público Beneficiário* (Tabela comparativa lado a lado por escola e contagem de público em eventos).
  3. *Indicadores de Resultado e Impacto*.
  4. *Monitoramento e Avaliação*.
  5. *Dificuldades Encontradas* (Condicional SIM/NÃO com preenchimento de texto padrão automático).
  6. *Resultados Alcançados* (Condicional à Seção 5).
  7. *Curadoria Fotográfica & Gerador de PDF* (Exportação em PDF A4 com rodapé institucional e assinaturas).
- **🔒 Níveis de Acesso & Segurança**: Perfis diferenciados para **Administrador/Diretoria** e **Professor de Campo**.
- **☁️ Integração com Google Drive**: Estruturação automática de pastas e sincronização de mídias e relatórios.

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **Framework**: Next.js 14 (App Router) + React 18
- **Estilização**: Tailwind CSS + Framer Motion (Animações Bento UI)
- **Ícones**: Lucide React
- **Exportação de PDF**: `html2pdf.js`

### Backend
- **Runtime**: Node.js & Express
- **Linguagem**: TypeScript
- **ORM & Banco de Dados**: Prisma ORM + SQLite
- **Autenticação**: JWT + Bcrypt

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- Node.js (v18+)
- npm ou yarn

### 1. Clonar o repositório
```bash
git clone https://github.com/pandaktwok/app-gestao-cultural-educacao.git
cd app-gestao-cultural-educacao
```

### 2. Configurar e Iniciar o Backend
```bash
cd backend
npm install
npx prisma db push
npx prisma db seed
npm run dev
```
*O servidor Backend executará em `http://localhost:4000/api`.*

### 3. Configurar e Iniciar o Frontend
```bash
cd ../frontend
npm install
npm run dev
```
*A aplicação Frontend executará em `http://localhost:3000`.*

---

## 🔑 Credenciais para Teste (Seed Inicial)

### 1. Administrador (Diretoria)
- **E-mail**: `admin@projeto.org`
- **Senha**: `admin123`

### 2. Professor de Campo
- **E-mail**: `professor@projeto.org`
- **Senha**: `prof123`

---

## 📜 Licença
Este projeto está sob a licença MIT.
