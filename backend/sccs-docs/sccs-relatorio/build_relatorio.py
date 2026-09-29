"""Gera um relatório SCCS a partir de um JSON (ver exemplo/emeb.json).
Uso: python build_relatorio.py spec.json saida.pdf
Fotos: caminhos relativos à pasta do JSON. A ordem das logos vem do JSON e deve ser confirmada com o usuário."""
import sys, json, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "sccs-base" / "lib"))
from sccs_layout import *


def build(spec_path, out_pdf):
    spec_path = pathlib.Path(spec_path).resolve()
    S = json.loads(spec_path.read_text(encoding="utf-8"))
    base = spec_path.parent
    d = Doc(S["logos"], watermark=S.get("marca_dagua", "centro") if S.get("marca_dagua", "centro") != "nenhuma" else False)
    c = S["capa"]
    d.add(d.capa(c["kicker"], c["titulo"], c["subtitulo"], c.get("esquerda", []), c.get("direita", [])))
    fotos_n = 0
    for p in S["paginas"]:
        t = p["tipo"]
        if t == "resumo":
            corpo = cabecalho(p["kicker"], p["titulo"], p.get("sub", "")) if p.get("kicker") else ""
            for b in p["blocos"]:
                if "secao" in b: corpo += secao(b["secao"]["n"], b["secao"]["titulo"], b["secao"].get("texto", ""))
                elif "cards" in b: corpo += cards([tuple(x) for x in b["cards"]])
                elif "tabela" in b: corpo += tabela(b["tabela"]["titulo"], [tuple(x) for x in b["tabela"]["linhas"]])
                elif "barras" in b: corpo += barras([tuple(x) for x in b["barras"]])
                elif "destaque" in b: corpo += destaque(b["destaque"])
            d.add(d.pagina(corpo, deslocar=0))
        elif t == "fotos":
            figs = []
            for f in p["fotos"]:
                fotos_n += 1
                figs.append(foto(base / f["arquivo"], fotos_n, f["titulo"], f["data"]))
            d.add(d.pagina(cabecalho(p["kicker"], p["titulo"], p.get("sub", "")) + grade_fotos(figs)))
        elif t == "nominata":
            d.add(d.pagina(cabecalho(p["kicker"], p["titulo"], p.get("sub", "")) + nominata([tuple(x) for x in p["linhas"]], p.get("colunas", 2))
                           + (legenda(p["legenda"]) if p.get("legenda") else "")))
        elif t == "chamada":
            tot = p.get("totais")
            d.add(d.pagina(cabecalho(p["kicker"], p["titulo"], p.get("sub", "")) + chamada(p["datas"], [(*x[:4], x[4], *x[5:]) for x in p["linhas"]], tot, p.get("resumo"))
                           + (legenda(p["legenda"]) if p.get("legenda") else "")))
        elif t == "encerramento":
            d.add(d.pagina(cabecalho(p["kicker"], p["titulo"], p.get("sub", "")) + identificacao([tuple(x) for x in p["linhas"]]) + assinaturas(p["assinaturas"])))
    return d.render(out_pdf, titulo=c["titulo"])


if __name__ == "__main__":
    print(build(sys.argv[1], sys.argv[2]))
