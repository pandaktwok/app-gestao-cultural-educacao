# Ciclo de aprovação (5 por tipo de documento)

1. Todo documento novo é salvo em `sccs-<tipo>/drafts/<slug>/` (PDF, HTML e o JSON usado):
   `python lib/aprovacao.py salvar <tipo> <slug> arquivo1 arquivo2 ...`
2. Mostre o resultado e pergunte: **"Aprovado?"**
3. Se sim: `python lib/aprovacao.py aprovar <tipo> <slug> --nota "o que funcionou / variação escolhida"`.
   O documento vai para `aprovados/<slug>/`, entra no `aprovados/indice.md` (data, nota, variação) e o brand book é regenerado.
4. Se não: registre o motivo com `python lib/aprovacao.py reprovar <tipo> <slug> --motivo "..."`, ajuste e gere de novo.
5. **A contagem é por tipo**: 5 pitches, 5 papéis timbrados, 5 relatórios... Ao chegar em 5 aprovados de um tipo, ele passa a ter "base madura": use os 5 mais recentes como referência principal e mostre-os no `brand-book.html`.
6. Antes de gerar um documento de um tipo que já tem aprovados, leia o `indice.md` dele: reaproveite as variações que o usuário aprovou (ex.: marca d'água deslocada, ordem de logos).
7. `python lib/aprovacao.py status` mostra quantos aprovados cada tipo tem.
