---
name: seed_test_environment
description: Limpa e repovoa o banco de dados e IndexedDB com um ecossistema completo de dados simulados realistas para testes de interface, validação de regras de negócio e geração de relatórios.
---

# Skill / Comando Executável: `seed_test_environment`

Esta skill/comando tem como objetivo limpar e repovoar instantaneamente o banco de dados (SQLite via Prisma) e o IndexedDB (Dexie) com um ecossistema de dados fictícios realistas no sistema de Gestão Cultural e Prestação de Contas.

## 1. Como Executar

### Via Terminal / CLI:
```bash
# Na raiz do projeto:
npm run seed:mock

# Ou no diretório backend:
cd backend && npm run seed:mock
```

### Via Interface (Navegador / App):
- Clique no botão `[DEV: Resetar Dados de Teste]` na tela de login do aplicativo.
- Ou clique no botão `DEV: Reset Testes` no cabeçalho superior (top bar) quando logado.

---

## 2. Conteúdo da Massa de Dados Gerada (Mock Ecosystem)

> **Nota de Apresentação:** Ao apresentar o resumo da massa de dados gerada após a execução desta skill, sempre inclua explicitamente o link de acesso ao sistema (ex: http://localhost:3000).

### 2.0. Link de Acesso ao Aplicativo
* **URL Local:** http://localhost:3000

### 2.1. Administrador Padrão
* **Nome:** Coordenação Geral
* **CPF (Login):** `000.000.000-00`
* **Senha:** `admin123`
* **Telefone:** `(48) 99999-0000`
* **E-mail:** `admin@projetocultural.org.br`
* **Perfil:** `ADMIN`

### 2.2. Professores Cadastrados
* **Professor 1:**
  * **Nome:** Marcos Vinicius Firmino Ferreira
  * **CPF (Login):** `111.222.333-44`
  * **Senha:** `prof123`
  * **Escolas Vinculadas:** `EMEB José Rosso` e `EMEB Ludovico Coccolo`
* **Professor 2:**
  * **Nome:** Mirella Sombrio
  * **CPF (Login):** `555.666.777-88`
  * **Senha:** `prof123`
  * **Escolas Vinculadas:** `Colégio Municipal Santos Dumont`

### 2.3. Escolas e Alunos
1. **EMEB José Rosso** (Gestora: Simone Scotti dos Santos, Tel: `(48) 3431-1001`)
   - 10 Alunos cadastrados.
   - 7 alunos 100% assíduos (Arthur Meireles, Beatriz Lima, Caio Silva, Davi Santos, Enzo Gabriel, Fernanda Rocha, Gabriel Souza).
   - 1 aluna com Alerta Amarelo de 2 faltas consecutivas (Helena Costa).
   - 1 aluno com Alerta Amarelo de 3 faltas consecutivas (Igor Martins).
   - 1 aluna desistente (Julia Silveira - Data de corte: 10/06/2026).
2. **EMEB Ludovico Coccolo** (Gestora: Silvana Bento Marcineiro, Tel: `(48) 3431-1002`)
   - 8 Alunos cadastrados.
   - 6 alunos 100% assíduos (Lucas Andrade, Mariana Alves, Nicolas Freitas, Olivia Nunes, Pedro Henrique, Samuel Reis).
   - 1 aluna com Alerta Amarelo de 2 faltas consecutivas (Rafaela Dias).
   - 1 aluno desistente (Thiago Pereira - Data de corte: 05/07/2026).
3. **Colégio Municipal Santos Dumont** (Gestora: Regina Maria da Silva, Tel: `(48) 3431-1003`)
   - 5 Alunos cadastrados para testes da Profa. Mirella Sombrio.

### 2.4. Histórico de Visitas, Chamadas e Fotos (Junho/Julho)
* **EMEB José Rosso:** 4 visitas (24/06, 08/07, 15/07 e 22/07) dos tipos Ensaio, Reforço e Reposição com chamadas e fotos mockadas vinculadas.
* **EMEB Ludovico Coccolo:** 4 visitas (02/07, 06/07, 07/07 e 13/07) do tipo Ensaio com chamadas e fotos mockadas vinculadas.

### 2.5. Eventos Cadastrados no Calendário
* **Desfile Cívico Municipal** (07/09/2026 09:00) - Multi-Escolas (EMEB José Rosso e EMEB Ludovico Coccolo) - Status: Pendente de Foto (Laranja).
* **Apresentação Dia das Mães** (10/05/2026 14:00) - EMEB José Rosso - Status: Concluído (Verde / 1 Foto Anexada).

### 2.6. Cenário de Teste do Banner Amarelo de Revisão
* Relatório mensal de Junho/Julho (`07_2026`) da **EMEB José Rosso** configurado com status `REVISION_REQUESTED`.
* Campo 4 (*Monitoramento e Avaliação*) questionado com o comentário do Admin:
  > *"Favor especificar quais critérios foram usados para o remanejamento dos alunos suspensos."*
* O professor logado visualizará o **Banner Amarelo** de alerta no topo do aplicativo (`⚠️ Revisão Necessária`).

### 2.7. Flags de Ambiente Dev (Navegação sem Trava de 24h)
A execução configura a flag `localStorage.setItem('dev_disable_24h_lock', 'true')` e aceita `NEXT_PUBLIC_DISABLE_24H_LOCK=true`, garantindo testes fluidos sem o bloqueio de 24h entre atendimentos em modo de desenvolvimento.
