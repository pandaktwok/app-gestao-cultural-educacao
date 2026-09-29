"""Gera sccs-base/brand-book.html (autocontido: fontes e imagens por caminho relativo).
Mostra cores, tipografia, logos cadastradas, componentes e os documentos aprovados de cada tipo.
Uso: python build_brandbook.py"""
import json, pathlib, html, re

BASE = pathlib.Path(__file__).resolve().parent.parent
RAIZ = BASE.parent
COR = [("Verde SCCS", "#005C35", "estrutura, etiquetas, linhas"), ("Vinho", "#9B1B1B", "títulos"), ("Vermelho SCCS", "#DF1225", "toque, alertas"),
       ("Grafite", "#2B2B2B", "texto"), ("Creme", "#F7F3EA", "fundo alternativo"), ("Menta", "#E6EFE9", "faixas"),
       ("Ouro escuro", "#8A6420", "ornamento"), ("Ouro", "#B8893B", "detalhe grande")]


def gerar():
    from sccs_layout import font_faces  # noqa
    faces = font_faces().replace("file://" + str(BASE) + "/", "")
    faces = re.sub(r"file://[^)'\"]*/fonts/", "fonts/", faces)
    cores = "".join(f'<div class="c"><i style="background:{h}"></i><b>{n}</b><code>{h}</code><span>{u}</span></div>' for n, h, u in COR)
    reg = json.loads((BASE / "assets/logos/registro.json").read_text(encoding="utf-8"))
    logos = "".join(f'<figure><img src="assets/logos/{e["tipo"]}/{e["arquivo"]}"><figcaption>{html.escape(e["nome"])}<br><small>{e["tipo"]} · {e.get("qualidade","")}</small></figcaption></figure>' for e in reg)
    aprov = ""
    for t in sorted(p for p in RAIZ.glob("sccs-*") if p.name != "sccs-base" and p.is_dir()):
        a = t / "aprovados"
        docs = sorted([d for d in a.iterdir() if d.is_dir()]) if a.exists() else []
        itens = ""
        for d in docs:
            pdfs = list(d.glob("*.pdf"))
            if pdfs:
                itens += f'<li><a href="../{t.name}/aprovados/{d.name}/{pdfs[0].name}">{html.escape(d.name)}</a></li>'
        aprov += f'<h3>{t.name[5:]} <small>{len(docs)}/5</small></h3><ul>{itens or "<li>nenhum aprovado ainda</li>"}</ul>'
    css = """body{font-family:Carlito,sans-serif;color:#2b2b2b;max-width:900px;margin:40px auto;padding:0 20px}
h1,h2,h3{font-family:Lora,serif;color:#9b1b1b}h2{border-bottom:1px solid #005c34;padding-bottom:4px;margin-top:40px}
.cs{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.c i{display:block;height:56px;border:1px solid #cfd8d1;border-radius:4px}
.c b,.c code,.c span{display:block;font-size:13px}.lg{display:flex;flex-wrap:wrap;gap:20px}.lg img{height:60px;max-width:160px;object-fit:contain}
figure{margin:0;text-align:center;font-size:12px}small{color:#777}.dm{font-family:'DM Serif Display',serif}.ls{font-family:'Liberation Serif',serif}"""
    corpo = f"""<h1>Brand book — Sociedade Cultural Cruzeiro do Sul</h1>
<h2>Cores</h2><div class="cs">{cores}</div>
<h2>Tipografia</h2><p style="font-family:Lora;font-size:26px;font-weight:700;color:#9b1b1b">Lora — títulos em vinho</p>
<p style="font-size:18px">Carlito — corpo de texto, tabelas e legendas. Ação Cultural Cruzeiro do Sul.</p>
<p class="ls" style="font-size:16px">Liberation Serif — rodapé e cartas oficiais.</p>
<p class="dm" style="font-size:26px;color:#005c35">DM Serif Display — destaque (slides)</p>
<h2>Logos cadastradas</h2><div class="lg">{logos}</div>
<h2>Regras</h2><p>Ver <code>references/</code>: cores, tipografia, grade, logos, imagens, regras, aprovação.</p>
<h2>Documentos aprovados</h2>{aprov}"""
    out = BASE / "brand-book.html"
    out.write_text(f'<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Brand book SCCS</title><style>{faces}{css}</style><body>{corpo}</body></html>', encoding="utf-8")
    return out


if __name__ == "__main__":
    print(gerar())
