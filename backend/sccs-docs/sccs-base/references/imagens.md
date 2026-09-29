# Imagens, gráficos e componentes

## Fotos
- Sempre em grade 2 × 2 (4 por página), 245 × 187 pt, cantos arredondados 4 pt, recorte por preenchimento (sem distorcer).
- Legenda: barra verde `#005C35` (93% de opacidade), 34 pt de altura, colada na base da foto, filete branco de 1 pt no topo.
  Esquerda: número em Lora 14 branco ("01", "02", contínuo no documento inteiro). Direita: título em bold e data/hora, Carlito 8,5 branco.
- Título da legenda: "Atividade · Local" (ex.: "Ensaio · EMEB Ludovico Coccolo"). Data/hora: "06/07/2026 · 15h às 17h".
- Fotos agrupadas por atividade; cada página tem etiqueta "7. DOCUMENTOS COMPROBATÓRIOS ANEXADOS", título do grupo e subtítulo "Registro fotográfico das atividades".
- Nunca crie nem gere imagens. Só usa as que o usuário enviou. Peça original de melhor qualidade se a foto tiver menos de ~1000 px de largura em impressão.

## Componentes
- **Card de indicador:** valor (Lora 21) + descrição. Faixa de 3 pt no topo, verde; vermelha para zero/alerta.
- **Tabela de linhas:** filete `#CFD8D1`, valor à direita em bold verde, linha de 21,5 pt.
- **Barras horizontais:** verde, 10 pt de altura, proporcionais ao maior valor, valor em bold à direita.
- **Destaque de resultado:** fundo vermelho 5%, barra vermelha de 4 pt à esquerda, texto Lora 12.
- **Identificação:** tabela rótulo (verde bold) + valor, filete entre linhas. **Assinaturas:** duas linhas de 230 pt lado a lado.
- **Campos a preencher (cartas):** `[entre colchetes]`, com fundo verde 8%.
Todos estão prontos em `lib/sccs_layout.py` (cabecalho, secao, cards, tabela, barras, destaque, foto, grade_fotos, identificacao, assinaturas).
