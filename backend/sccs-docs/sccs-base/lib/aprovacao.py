"""Ciclo de aprovação. Rodar de qualquer pasta.
  python aprovacao.py salvar   <tipo> <slug> arq1 [arq2 ...]     # copia para sccs-<tipo>/drafts/<slug>/
  python aprovacao.py aprovar  <tipo> <slug> [--nota "..."]      # move para aprovados/, atualiza indice.md, regenera brand book
  python aprovacao.py reprovar <tipo> <slug> --motivo "..."      # registra em drafts/<slug>/reprovado.md
  python aprovacao.py status
<tipo>: relatorio | papel-timbrado | slides | ... (pasta sccs-<tipo> ao lado de sccs-base)"""
import sys, shutil, argparse, pathlib, datetime

RAIZ = pathlib.Path(__file__).resolve().parent.parent.parent
MADURA = 5


def pasta(tipo):
    p = RAIZ / f"sccs-{tipo}"
    (p / "drafts").mkdir(parents=True, exist_ok=True)
    (p / "aprovados").mkdir(parents=True, exist_ok=True)
    return p


def tipos():
    return sorted(p.name[5:] for p in RAIZ.glob("sccs-*") if p.is_dir() and p.name != "sccs-base")


def contar(tipo):
    a = RAIZ / f"sccs-{tipo}" / "aprovados"
    return len([d for d in a.iterdir() if d.is_dir()]) if a.exists() else 0


def salvar(tipo, slug, arquivos):
    d = pasta(tipo) / "drafts" / slug
    d.mkdir(parents=True, exist_ok=True)
    for f in arquivos:
        shutil.copy(f, d / pathlib.Path(f).name)
    print(f"Rascunho salvo em {d}. Pergunte ao usuário: Aprovado?")


def aprovar(tipo, slug, nota=""):
    p = pasta(tipo)
    origem = p / "drafts" / slug
    if not origem.exists():
        sys.exit(f"Rascunho não encontrado: {origem}")
    destino = p / "aprovados" / slug
    if destino.exists():
        shutil.rmtree(destino)
    shutil.move(str(origem), destino)
    idx = p / "aprovados" / "indice.md"
    if not idx.exists():
        idx.write_text(f"# Aprovados — {tipo}\n\n| Data | Documento | Nota / variação escolhida |\n|---|---|---|\n", encoding="utf-8")
    with idx.open("a", encoding="utf-8") as f:
        f.write(f"| {datetime.date.today():%d/%m/%Y} | {slug} | {nota or '-'} |\n")
    n = contar(tipo)
    print(f"Aprovado: {slug} ({n}/{MADURA} de {tipo}).")
    if n >= MADURA:
        print(f"Base madura de '{tipo}' atingida: use os aprovados como referência principal.")
    try:
        from build_brandbook import gerar
        print("Brand book atualizado:", gerar())
    except Exception as e:
        print("Brand book não regenerado:", e)


def reprovar(tipo, slug, motivo):
    d = pasta(tipo) / "drafts" / slug
    d.mkdir(parents=True, exist_ok=True)
    with (d / "reprovado.md").open("a", encoding="utf-8") as f:
        f.write(f"- {datetime.date.today():%d/%m/%Y}: {motivo}\n")
    print("Motivo registrado. Ajuste e gere de novo.")


if __name__ == "__main__":
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
    ap = argparse.ArgumentParser()
    ap.add_argument("acao", choices=["salvar", "aprovar", "reprovar", "status"])
    ap.add_argument("tipo", nargs="?"); ap.add_argument("slug", nargs="?"); ap.add_argument("arquivos", nargs="*")
    ap.add_argument("--nota", default=""); ap.add_argument("--motivo", default="")
    a = ap.parse_args()
    if a.acao == "status":
        for t in tipos():
            n = contar(t)
            print(f"{t:16} {n}/{MADURA} aprovados" + ("  (base madura)" if n >= MADURA else ""))
    elif a.acao == "salvar":
        salvar(a.tipo, a.slug, a.arquivos)
    elif a.acao == "aprovar":
        aprovar(a.tipo, a.slug, a.nota)
    else:
        reprovar(a.tipo, a.slug, a.motivo)
