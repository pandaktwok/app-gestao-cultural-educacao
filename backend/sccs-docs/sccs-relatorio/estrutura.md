# Estrutura do relatório (JSON)

```json
{ "logos": {"projeto": ["id"], "apoiadores": [], "publicos": ["id", ...], "patrocinadores": ["id", ...]},
  "marca_dagua": "centro",
  "capa": {"kicker": "RELATÓRIO MENSAL DE EXECUÇÃO", "titulo": "...", "subtitulo": "Julho de 2026",
           "esquerda": [["Representante legal", "..."], ["Elaborado por", "..."]],
           "direita": [["Contato", ["site", "e-mail", "@instagram"]]]},
  "paginas": [ {"tipo": "resumo", "kicker": "...", "titulo": "...", "sub": "...",
                "blocos": [ {"secao": {"n": "1", "titulo": "...", "texto": "..."}},
                            {"cards": [["12", "descrição"], ...]},
                            {"tabela": {"titulo": "...", "linhas": [["rótulo", "valor"]]}},
                            {"barras": [["rótulo", 8, 10]]}, {"destaque": "texto"} ]},
               {"tipo": "fotos", "kicker": "7. DOCUMENTOS COMPROBATÓRIOS ANEXADOS", "titulo": "...", "sub": "Registro fotográfico das atividades",
                "fotos": [{"arquivo": "fotos/e1.jpg", "titulo": "Ensaio · Local", "data": "06/07/2026 · 15h às 17h"}]},
               {"tipo": "encerramento", "kicker": "...", "titulo": "...", "linhas": [["Rótulo", "valor"]], "assinaturas": ["Nome / cargo", "Nome / cargo"]} ]}
```
Cada página de fotos leva até 4 fotos. A primeira página de resumo pode omitir `kicker` (o corpo começa pela seção). Veja `exemplo/emeb.json` para um caso completo com todos os campos.
