---
name: sccs-base
description: Regras gerais de documentos da Sociedade Cultural Cruzeiro do Sul (SCCS) - cores, tipografia, grade, logos, imagens, rodapé e aprovação. Ler SEMPRE antes de gerar qualquer documento da SCCS (relatório, carta, ofício, papel timbrado, slides, apresentação, tutorial, portfólio).
---

# SCCS — regras gerais (base)

Todo documento da SCCS sai neste padrão, independente do texto. Esta skill guarda as regras; cada tipo de documento
tem a sua própria skill (`sccs-relatorio`, `sccs-papel-timbrado`, `sccs-slides`, ...) e só diz o que é o documento e como usar esta base.

## Formato
Gere PDF por padrão. Ao entregar, pergunte se quer também DOCX (editável); só faça se confirmar.

## Passos
1. Identifique o tipo de documento e leia a skill dele. Se não existir, use `sccs-slides` como modelo de "skill nova" e crie uma pasta `sccs-<tipo>/`.
2. Leia só o que a tarefa pede (tabela abaixo). Não leia tudo.
3. **Pergunte antes de gerar** (ver `references/regras.md`): logos do documento, o padrão de ordem (patrocinadores E→D ou "edital", ver logos.md) e a ORDEM exata delas, e dados que faltam. Nunca invente dados, nomes ou números.
4. Gere em `drafts/`, mostre o resultado e pergunte: "Aprovado?" (ver `references/aprovacao.md`).

## Qual arquivo ler
| Tarefa | Arquivo |
|---|---|
| Cores, contraste, paleta complementar | `references/cores.md` |
| Fontes, tamanhos, títulos, corpo, espaçamento | `references/tipografia.md` |
| Margens, rodapé, marca d'água, "Página N", capa | `references/grade.md` |
| Logos: tamanho, divisor, ordem de patrocinadores e apoios, cadastro de logo nova | `references/logos.md` |
| Fotos, legendas, gráficos, cards, tabelas | `references/imagens.md` |
| Regras que nunca se quebram e perguntas obrigatórias | `references/regras.md` |
| Ciclo de aprovação (5 por tipo) | `references/aprovacao.md` |
| Valores exatos em pt extraídos dos PDFs aprovados | `references/medidas-aprovadas.md` |
| Ver tudo junto (visual) | `brand-book.html` |

## Onde estão as coisas
- `lib/sccs.css` (tokens e componentes), `lib/sccs_layout.py` (monta as páginas e gera PDF), `lib/logos.py` (cadastro de logos), `lib/aprovacao.py`, `lib/comparar_pdf.py` (compara PDF gerado com um aprovado), `lib/build_brandbook.py`.
- `assets/logos/` (logo SCCS, projeto, órgãos públicos, fundos, patrocinadores, apoiadores) + `registro.json`.
- `fonts/` (Lora, Carlito, Liberation Serif, DM Serif Display) — a skill não depende de nada externo.

## Requisitos
Python 3 com `playwright` (Chromium), `pillow` e `pymupdf`. Instalação: `pip install playwright pillow pymupdf && playwright install chromium`.
