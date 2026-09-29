# Extensões feitas para o app de gestão

Cópia da skill `sccs-docs` (sccs-base + sccs-relatorio), usada pelo backend para gerar o relatório mensal.
Mudanças em relação à skill original (nenhuma cor, fonte ou medida existente foi alterada):

- `sccs-base/lib/sccs.css`: bloco final "EXTENSÃO DO APP" (classes `.nom`, `.ch`, `.nota`), usando só os tokens da skill.
- `sccs-base/lib/sccs_layout.py`: novos componentes `nominata()`, `chamada()` e `legenda()`.
- `sccs-relatorio/build_relatorio.py`: novos tipos de página `nominata` e `chamada`.
- `sccs-relatorio/estrutura.md` (abaixo) continua valendo; os dois tipos novos:
  - `{"tipo": "nominata", "kicker", "titulo", "sub", "colunas": 2|3, "linhas": [[n, nome, idade, sexo, presencas, faltas, "83%"]], "legenda": "..."}`
  - `{"tipo": "chamada", "kicker", "titulo", "sub", "datas": ["04/08"], "linhas": [[n, nome, idade, sexo, ["P","F","-"], presencas, faltas, "83%"]], "resumo": true, "totais": {"por_data": [], "presencas": 0, "faltas": 0, "freq": "89%"}, "legenda": "..."}`

Se a skill original for atualizada, reaplique estes três arquivos. Requisitos de execução: `pip install playwright pillow` e `python -m playwright install chromium`.
