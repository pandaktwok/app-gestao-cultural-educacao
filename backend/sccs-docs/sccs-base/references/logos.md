# Logos

## Regras de composição
1. A SCCS vem sempre primeiro e maior. Se há logo de projeto, ela fica ao lado da SCCS com um divisor vertical cinza fino (`#C8C8C8`).
2. Ordem das linhas, de cima para baixo:
   1. **SCCS | projeto**
   2. **Apoiadores** (quando houver)
   3. **Órgãos públicos e fundos | patrocinadores**
3. Na linha 3, da esquerda para a direita: governos por nível (federal, estadual, municipal), depois fundos (FIA, FMI etc.), depois um divisor, depois as marcas patrocinadoras **do maior para o menor patrocinador** (quem aportou mais, primeiro).
4. **Pergunte sempre a ordem** das logos antes de gerar: "Quais logos entram e em que ordem, do maior para o menor?". A ordem que o usuário responder vira a ordem do JSON.
5. As mesmas logos aparecem em TODAS as páginas do documento (capa maior, páginas internas menores).
6. Nunca redesenhe, recolora ou "melhore" uma logo. Só use os arquivos cadastrados. Se faltar, peça o arquivo.

## Dois padrões de ordem (definidos pelo usuário em 29/09/2026)
Referência: crédito do Museu Nacional/UFRJ (Instagram), hierarquia: governo federal / lei de incentivo → apoio financeiro → patrocínio platina → prata → bronze → apoios → parceiros.
- **Patrocinadores (padrão):** da esquerda para a direita, do maior para o menor patrocinador. O usuário define a ordem; a skill pergunta sempre.
- **Edital / governo federal (`"ordem": "edital"` no JSON de logos):** o bloco de governos fica à direita e é lido da direita para a esquerda: federal na extrema direita, depois estadual, depois municipal. Patrocinadores ficam à esquerda, E→D. Liste os governos no JSON do federal para o municipal.
- Sem `"ordem"`, vale o layout do relatório aprovado (governos/fundos à esquerda, patrocinadores à direita).
- Pergunte qual padrão usar e a ordem exata de cada grupo. Nunca assuma.

## Cadastro (memória de logos)
- Cada logo fica em `assets/logos/<tipo>/<id>.png` e é listada em `assets/logos/registro.json` (nome, tipo, nível, qualidade, nota).
- Quando o usuário trouxer uma logo nova ("essa é a logo do projeto X"): registre com
  `python lib/logos.py registrar --id x --nome "X" --tipo projeto --arquivo caminho.png`
  (tipos: sccs, projeto, orgao-publico, fundo, patrocinador, apoiador). A logo é recortada nas bordas transparentes automaticamente.
- Quando chegar uma versão melhor: `python lib/logos.py substituir --id x --arquivo melhor.png`.
- Logos com `qualidade` "exemplo" ou "baixa" no registro vieram dos PDFs de exemplo e devem ser substituídas por arquivos originais (PNG transparente ou SVG). Avise o usuário quando for usar uma delas em documento final.

## Tamanhos aprovados (pt, largura, na capa → página interna)
SCCS: 125 → 65 (155 na capa quando é a única logo). Projeto: 124 → 74. Prefeitura de Criciúma 79 → 50, FIA 105 → 67, Camil 93 → 60, Mercado Livre 66 → 42. Logos novas usam o encaixe automático numa caixa (capa 110 × 57, interna 67 × 37); se ficar desequilibrada, ajuste `largura_capa_pt` no registro (a página interna usa 0,64 dessa largura; projeto 0,6).
Espaços: 25,5 pt entre SCCS e projeto na capa (19,5 nas páginas), 28 pt entre logos da linha 3 (20 nas páginas), 22 pt entre linhas (7 nas páginas).
