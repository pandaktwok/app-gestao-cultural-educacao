# Especificação SCCS — medidas extraídas dos PDFs aprovados

Fonte: Relatório EMEB Ludovico Coccolo (3 versões: 1 logo, 2 logos, logos e marcas) e Carta de Anuência. Página A4 (595 × 842 pt). Todas as medidas em pontos (pt), a partir do canto superior esquerdo. Estes documentos foram aprovados pelo usuário como o padrão exato.

## 1. Cores
| Papel | Hex | Uso |
|---|---|---|
| Verde SCCS | `#005C35` | Etiquetas, numeração de seção, linhas de seção, valores de destaque, barras de gráfico, legenda de foto, rótulos da carta |
| Vinho | `#9B1B1B` | Todos os títulos (Lora), "Página N" |
| Vermelho SCCS | `#DF1225` | Traço sob o título da capa, barra lateral do destaque, topo do card "zero" |
| Grafite (texto) | `#2B2B2B` | Corpo de texto |
| Cinza médio | `#555555` | Subtítulos, descrições de card |
| Cinza claro | `#777777` | Observações entre parênteses |
| Filete claro | `#CFD8D1` | Linhas de tabela e borda de card |
| Cinza divisor | `#C8C8C8` | Divisor vertical entre logos |
| Rodapé texto | `#333333` | Bloco institucional |
| Rodapé linha | `#878787` | Linha acima do rodapé |

Contrastes calculados sobre branco: verde 8,1:1, vinho 8,2:1, vermelho 4,9:1 (só para elementos grandes e barras, não para texto pequeno), grafite 14,2:1, cinza médio 7,5:1.

## 2. Tipografia
- **Lora** (serifada): todos os títulos, número de seção em destaque nos cards, destaque de resultado. Cor vinho (exceto números de card, em verde/vermelho).
- **Carlito** (métrica compatível com Calibri): corpo, etiquetas, tabelas, legendas.
- **Liberation Serif** (métrica de Times New Roman): apenas rodapé institucional e **cartas/ofícios**.

| Elemento | Fonte | Tamanho | Peso | Cor | Espaçamento |
|---|---|---|---|---|---|
| Título da capa | Lora | 26 | bold | vinho | centralizado |
| Etiqueta da capa | Carlito | 9 | bold | verde | maiúsculas, tracking largo (~0,2 em) |
| Mês/subtítulo da capa | Carlito | 12 | regular | grafite | centralizado |
| Etiqueta de página (acima do título) | Carlito | 9 | bold | verde | maiúsculas, tracking largo |
| Título de página | Lora | 19 | bold | vinho | — |
| Subtítulo de página | Carlito | 10,5 | regular | cinza médio | — |
| Título de seção | Lora | 13,5 | bold | vinho | numeração "1." em Lora 11 verde |
| Corpo | Carlito | 11,8 | regular | grafite | entrelinha ~18,7 pt (1,6), justificado |
| Valor de card | Lora | 21 | bold | verde (vermelho se zero) | — |
| Descrição de card | Carlito | 9 | regular | cinza médio | — |
| Rótulo de grupo | Carlito | 10 | bold | verde | maiúsculas |
| Linha de tabela | Carlito | 10 | regular | grafite | valor em bold verde à direita |
| Observação | Carlito | 8,3 | regular | cinza claro | — |
| Destaque de resultado | Lora | 12 | regular | `#333333` | fundo vermelho 5%, barra lateral vermelha 4 pt |
| Legenda de foto (título) | Carlito | 8,5 | bold | branco | — |
| Legenda de foto (data/hora) | Carlito | 8,5 | regular | branco | — |
| Número da foto | Lora | 14 | bold | branco | "01", "02" |
| "Página N" | Carlito | 8 | regular | vinho | alinhado à direita, y=739 |
| Rodapé institucional | Liberation Serif | 7,5 | regular | `#333333` | centralizado, 5 linhas |

## 3. Grade da página
- Margem esquerda/direita do relatório: **45 pt** (largura útil 505 pt, de x=45 a x=550).
- Margem esquerda da carta: **68 pt** (texto justificado).
- Linha do rodapé: y=762, de x=40 a x=556, 1 pt, `#878787`. Texto do rodapé começa em y≈770, com 5 linhas a cada ~10 pt.
- "Página N": y=739, alinhada à direita em x=550.
- Marca d'água: logo SCCS quadrada, **425 × 425 pt**, em (85, 221), centrada na horizontal, opacidade em torno de 15% (ajustar comparando com o PDF aprovado). Aparece em todas as páginas, atrás do conteúdo.

## 4. Cabeçalho das páginas internas
- Faixa de logos centralizada no topo (y=17 a 126), sempre presente em todas as páginas internas.
- Só logo SCCS: 65 × 65 pt, em y=17.
- Duas logos: SCCS (65 pt) e logo do projeto (74 × 54 pt), separadas por divisor vertical cinza (2 pt de largura, 51 pt de altura).
- Logos e marcas: linha 1 = SCCS + projeto com divisor; linha 2 = logos institucionais e patrocinadores (altura ≈ 33 a 37 pt cada), com divisor entre os grupos. Ver regras de ordem na seção 7.

## 5. Capa
- Logos no centro superior (bloco entre y=170 e y=374 conforme o número de logos).
- Etiqueta (y=399), título (y=417), traço vermelho de 85 × 3 pt centrado (y=457), mês de referência (y=476).
- Bloco de dados em duas colunas (y=641 a 710): linha verde de 1 pt no topo (`#005C34`), à esquerda "Representante legal" e "Elaborado por" (rótulo verde bold 10 pt + valor grafite 10 pt), à direita "Contato" com site, e-mail e Instagram.
- Rodapé institucional igual às demais páginas. Não há "Página N" na capa.

## 6. Componentes
- **Seção numerada:** número + título Lora 13,5 vinho, com linha verde de 1 pt (`#005C34`) de x=45 a x=550 logo abaixo. Corpo começa ~12 pt abaixo da linha.
- **Cards de indicador (3 por linha):** 161 × 70 pt, largura útil dividida com 12 pt de espaço. Fundo branco (85% de opacidade), borda `#CFD8D1`, cantos arredondados, faixa de 3 pt no topo (verde; vermelho para zero/alerta). Valor Lora 21 + descrição Carlito 9.
- **Tabela de linhas:** sem bordas laterais, filete `#CFD8D1` de 1 pt entre linhas, altura de linha ~21 pt, valor à direita.
- **Gráfico de barras horizontais:** barras verde `#005C34`, altura ~10 pt, cantos arredondados, valor em bold à direita.
- **Destaque de resultado:** caixa de 505 × 32 pt, fundo vermelho 5%, barra vermelha de 4 pt à esquerda, texto Lora 12.
- **Grade de fotos (2 × 2):** cada foto 245 × 187 pt (incluindo a barra de legenda), espaço de 14 pt entre colunas (x=45 e x=304) e 14 pt entre linhas (y=229 e y=430). Cantos arredondados. Foto preenchendo a área (crop), sem distorção.
- **Legenda de foto:** barra verde `#005C34` com 93% de opacidade, 34 pt de altura, colada na base da foto com 1 pt de filete branco no topo. À esquerda o número Lora 14 branco ("01"); à direita, título bold e data/hora regular, Carlito 8,5 branco.
- **Cabeçalho de página de fotos:** etiqueta "7. DOCUMENTOS COMPROBATÓRIOS ANEXADOS" (verde), título do grupo (Lora 19 vinho), subtítulo "Registro fotográfico das atividades".
- **Tabela de identificação:** rótulo verde bold 10,8 na coluna esquerda (x=45), valor na coluna direita (x=142), filete `#CFD8D1` entre linhas, altura ~24 pt.
- **Assinaturas:** duas linhas de 230 pt (`#333333`), lado a lado com 45 pt de intervalo (x=45–275 e x=320–550), rótulo Carlito 9,5 centralizado abaixo.

## 7. Regras de logos e patrocinadores (ditadas pelo usuário)
- SCCS é sempre a primeira logo, no maior tamanho. A logo do projeto (se houver) fica ao lado, com divisor vertical.
- Ordem das logos institucionais e de patrocinadores: da esquerda para a direita, **do maior para o menor** patrocinador. Governos vêm por nível: federal, estadual e municipal (Brasil, governo estadual, governo municipal), depois os patrocinadores privados, do que mais aportou ao que menos aportou.
- Os **apoiadores** ficam separados dos patrocinadores.
- A skill **sempre pergunta** a ordem das logos ao usuário antes de gerar. Nunca assume.
- Só usa as imagens fornecidas. Nunca redesenha nem "melhora" uma logo.

## 8. Carta / ofício (papel timbrado com texto)
- Fonte: Liberation Serif (Times) em todo o texto.
- Logo SCCS 73 × 73 pt centralizada, em y=28.
- "Carta nº 000/2026": Liberation Serif 10,5 `#555555`, alinhado à direita, y=130.
- Título: Lora bold 17, vinho, maiúsculas, centralizado (y=160), com filete verde de 73 × 3 pt centralizado abaixo (y=185).
- Destinatário: "A/C:" e "Ref.:" em bold verde 11,5, valores 11,5 `#222222`, margem esquerda 68 pt.
- Corpo: 12 pt `#222222`, entrelinha ~20,3 pt, **justificado**, recuo de primeira linha de 34 pt (x=102), negrito `#111111` para nomes e expressões-chave, espaçamento entre parágrafos ~13 pt.
- Campos a preencher: entre colchetes `[ ]`, com fundo verde 8% (`#005C35` a 7,8%).
- Data: alinhada à direita.
- Assinatura: linha `#212121` de 221 pt centralizada (y=682); nome em bold 12, cargo 10,5 `#444444`, instituição e CNPJ 10,5 `#444444`.
- Rodapé institucional e marca d'água idênticos aos do relatório.

## 9. Rodapé institucional (fixo, todo documento)
```
Sociedade Cultural Cruzeiro do Sul
CNPJ 83.729.103/0001-14
Rua Marcelo Lodetti, 156 Centro – CEP 88.801-510 Criciúma SC
E-mail: contato@sccruzeirodosul.org | @cruzeirodosul.cric
Telefone: (48) 99902-2337
```
Dados de contato do bloco de capa: sccruzeirodosul.org · contato@sccruzeirodosul.org · @cruzeirodosul.cric. Representante legal: Fábio Paulo Matias.

## 10. Cores da logo (amostradas da imagem)
Verde `#085838` (folhas, próximo do `#005C35` usado nos documentos), vermelho `#E81828` / `#C81828` (fita), grafite `#383838` (lira e texto).

## 11. Paleta complementar proposta (para slides, infográficos, capas de outros tipos)
Base do padrão aprovado, mais três apoios neutros/quentes que contrastam bem com verde, vermelho e preto:
| Nome | Hex | Contraste | Uso sugerido |
|---|---|---|---|
| Creme | `#F7F3EA` | verde 7,3:1 · vinho 7,4:1 · grafite 12,8:1 | Fundo alternativo a branco, painéis |
| Menta | `#E6EFE9` | verde 6,9:1 | Fundo de faixa, linhas zebradas |
| Ouro escuro | `#8A6420` | 5,4:1 sobre branco | Ornamento, número de destaque, filete |
| Ouro | `#B8893B` | 3,1:1 sobre branco (só elementos grandes) 4,5:1 sobre grafite | Detalhe decorativo, ícones sobre fundo escuro |

O ouro dialoga com a lira e os louros da logo, e creme/ouro são combinações recorrentes com verde e vermelho em listas de paletas (buscas retornaram, por exemplo, Piktochart e Media.io; os artigos não foram abertos). Os contrastes acima foram calculados aqui (WCAG). É uma proposta: o usuário confirma antes de virar regra.
