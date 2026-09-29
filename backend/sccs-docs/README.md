# Skills de documentos SCCS

Pasta autocontida (fontes, logos e código dentro dela). Skills:
- `sccs-base/` regras gerais, logos, fontes, aprovação, brand book. Sempre lida primeiro.
- `sccs-relatorio/`, `sccs-papel-timbrado/`, `sccs-slides/` um tipo de documento cada.

Requisitos (uma vez): `pip install playwright pillow pymupdf` e `playwright install chromium`.
Use numa pasta local gravável (Claude Code ou app desktop com a pasta conectada): `drafts/` e `aprovados/` precisam gravar.
Teste: `python sccs-relatorio/build_relatorio.py sccs-relatorio/exemplo/emeb.json /tmp/teste.pdf`.
PDF é o padrão; DOCX só sob confirmação do usuário (a ser gerado com a skill docx).
