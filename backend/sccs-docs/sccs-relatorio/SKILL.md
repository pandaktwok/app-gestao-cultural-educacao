---
name: sccs-relatorio
description: Gera relatórios de execução de projeto da SCCS (Sociedade Cultural Cruzeiro do Sul) no padrão aprovado, com capa, indicadores, tabelas, fotos e assinaturas. Use quando pedirem relatório, prestação de contas ou relatório mensal de projeto/escola.
---
# Relatório SCCS

Antes de tudo, leia `../sccs-base/SKILL.md` (regras gerais, logos, aprovação). Aqui só está o que é específico do relatório.

## O que é
Documento A4 com: capa → 1–2 páginas de resumo (seções numeradas, cards, tabelas, barras, destaque) → páginas de fotos 2×2 → página de identificação e assinaturas. **Um relatório por escola/local.** Ver `estrutura.md`.

## Passos
1. Pergunte (uma vez só): nome do projeto e escola/local; mês de referência; logos e ordem (regras em `../sccs-base/references/logos.md`); representante legal e "elaborado por"; indicadores e textos de cada seção; fotos com título e data; .
2. Monte um JSON no formato de `exemplo/emeb.json` (copie e troque os dados).
3. Gere: `python build_relatorio.py spec.json drafts/<slug>/relatorio.pdf`
4. Mostre e pergunte "Aprovado?". Depois `python ../sccs-base/lib/aprovacao.py aprovar relatorio <slug> --nota "..."`.

## Regras
- Nunca invente números, datas ou nomes: se faltar, pergunte.
- Fotos só as enviadas; legenda "Atividade · Local" + "dd/mm/aaaa · horário".
- O texto pode variar; o padrão visual não. Não mude fontes, cores ou medidas.
- `"marca_dagua"` no JSON: `centro` (padrão), `deslocada` ou `nenhuma`.
- PDF primeiro. Depois pergunte "Quer que eu crie em DOCX para editar?"; só gere se o usuário confirmar (skill docx, mesmo padrão visual).
