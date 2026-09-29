"""Biblioteca de layout SCCS: monta HTML no padrão aprovado e renderiza em PDF (Chromium via Playwright).

Uso mínimo:
    from sccs_layout import Doc
    d = Doc(logos={"projeto": ["musicos-do-futuro"], "apoiadores": [], "publicos": ["prefeitura-criciuma", "fia-criciuma"],
                   "patrocinadores": ["camil", "mercado-livre"]})
    d.add(d.capa(...)); d.add(d.pagina(corpo_html)); d.render("saida.pdf")
A ORDEM das listas de logos é a ordem de exibição (esquerda para a direita). Ela deve ser confirmada com o usuário.
"""
import pathlib, html
from logos import resolver

BASE = pathlib.Path(__file__).resolve().parent.parent
FONTS = BASE / "fonts"
CSS = (BASE / "lib" / "sccs.css").read_text(encoding="utf-8")

RODAPE = ("Sociedade Cultural Cruzeiro do Sul<br>CNPJ 83.729.103/0001-14<br>"
          "Rua Marcelo Lodetti, 156 Centro – CEP 88.801-510 Criciúma SC<br>"
          "E-mail: contato@sccruzeirodosul.org | @cruzeirodosul.cric<br>Telefone: (48) 99902-2337")


def font_faces():
    u = lambda f: (FONTS / f).as_uri()
    return f"""
@font-face{{font-family:Lora;src:url({u('Lora-Variable.ttf')});font-weight:400 700;font-style:normal}}
@font-face{{font-family:Lora;src:url({u('Lora-Italic-Variable.ttf')});font-weight:400 700;font-style:italic}}
@font-face{{font-family:Carlito;src:url({u('Carlito-Regular.ttf')});font-weight:400}}
@font-face{{font-family:Carlito;src:url({u('Carlito-Bold.ttf')});font-weight:700}}
@font-face{{font-family:Carlito;src:url({u('Carlito-Italic.ttf')});font-weight:400;font-style:italic}}
@font-face{{font-family:'Liberation Serif';src:url({u('LiberationSerif-Regular.ttf')});font-weight:400}}
@font-face{{font-family:'Liberation Serif';src:url({u('LiberationSerif-Bold.ttf')});font-weight:700}}
@font-face{{font-family:'Liberation Serif';src:url({u('LiberationSerif-Italic.ttf')});font-weight:400;font-style:italic}}
@font-face{{font-family:'DM Serif Display';src:url({u('dm-serif-display-latin-400-normal.woff2')});font-weight:400}}
@font-face{{font-family:'DM Serif Display';src:url({u('dm-serif-display-latin-400-italic.woff2')});font-weight:400;font-style:italic}}
"""


def esc(s):
    return html.escape(str(s), quote=False)


def _fit(logo, bw, bh):
    """Tamanho (w,h) em pt de uma logo dentro da caixa bw x bh, sem distorcer."""
    a = logo["aspect"]
    w = min(bw, bh * a)
    return w, w / a


def _img(logo, w, h):
    return f'<img src="{logo["path"].as_uri()}" style="width:{w:.1f}pt;height:{h:.1f}pt" alt="{esc(logo["nome"])}">'


def _grupo(ids, bw, bh, gap, escala=1.0):
    """Se a logo tem `largura_capa_pt` no registro (ajuste óptico aprovado), usa essa largura x escala;
    senão encaixa na caixa bw x bh."""
    imgs, hs, ws = [], [], []
    for i in ids:
        lg = resolver(i)
        if lg.get("largura_capa_pt"):
            w = lg["largura_capa_pt"] * escala; h = w / lg["aspect"]
        else:
            w, h = _fit(lg, bw, bh)
        imgs.append(_img(lg, w, h)); hs.append(h); ws.append(w)
    return imgs, (max(hs) if hs else 0), sum(ws) + gap * max(0, len(ids) - 1)


def faixa_logos(cfg, modo="interna"):
    """Retorna (html, altura_pt). Linhas: 1) SCCS | projeto  2) apoiadores  3) órgãos públicos e fundos | patrocinadores."""
    cover = modo == "capa"
    carta = modo == "carta"
    only_sccs = not cfg.get("projeto")
    if carta:
        b1 = (73, 73); b2 = (67, 37); gap = 20; rowgap = 7; dh = 51; dh2 = 26; e1 = 0.62; e2 = 0.64; gap1 = 19.5
    elif cover:
        b1 = (155, 155) if only_sccs else (125, 125)
        b2 = (110, 57); gap = 28; rowgap = 22; dh = 91 if not only_sccs else 0; dh2 = 40; e1 = 1.0; e2 = 1.0; gap1 = 25.5
    else:
        b1 = (65, 65)
        b2 = (67, 37); gap = 20; rowgap = 7; dh = 51; dh2 = 26; e1 = 0.6; e2 = 0.64; gap1 = 19.5
    rows, total = [], 0
    # linha 1
    s_imgs, s_h, _ = _grupo(["sccs"], *b1, gap)
    p_box = (b1[0] * 1.0, b1[1] * (0.75 if cover else 0.83))
    p_imgs, p_h, _ = _grupo(cfg.get("projeto", []), p_box[0] if cover else 74, p_box[1] if cover else 54, gap, e1)
    h1 = max(s_h, p_h)
    parts = s_imgs[:]
    if p_imgs:
        parts.append(f'<span class="div" style="width:{1 if cover else 2}pt;height:{dh}pt"></span>')
        parts += p_imgs
    rows.append((f'<div class="row" style="gap:{gap1}pt;height:{h1:.1f}pt">{"".join(parts)}</div>', h1))
    if carta:      # papel timbrado com texto: só SCCS (+ projeto), sem faixa de apoio
        return f'<div style="display:flex;flex-direction:column;align-items:center">{rows[0][0]}</div>', h1
    # linha 2: apoiadores
    if cfg.get("apoiadores"):
        a_imgs, a_h, _ = _grupo(cfg["apoiadores"], *b2, gap, e2)
        rows.append((f'<div class="row" style="gap:{gap}pt;height:{a_h:.1f}pt">{"".join(a_imgs)}</div>', a_h))
    # linha 3: públicos | patrocinadores
    pub, pat = cfg.get("publicos", []), cfg.get("patrocinadores", [])
    if pub or pat:
        edital = cfg.get("ordem") == "edital"   # patrocinadores E→D; governos à direita, do federal (extrema direita) para o municipal
        pu_imgs, pu_h, _ = _grupo(list(reversed(pub)) if edital else pub, *b2, gap, e2)
        pa_imgs, pa_h, _ = _grupo(pat, *b2, gap, e2)
        h3 = max(pu_h, pa_h)
        a, b = (pa_imgs, pu_imgs) if edital else (pu_imgs, pa_imgs)
        parts = a[:]
        if pu_imgs and pa_imgs:
            parts.append(f'<span class="div" style="width:1pt;height:{dh2}pt"></span>')
        parts += b
        rows.append((f'<div class="row" style="gap:{gap}pt;height:{h3:.1f}pt">{"".join(parts)}</div>', h3))
    total = sum(h for _, h in rows) + rowgap * (len(rows) - 1)
    inner = f'<div style="display:flex;flex-direction:column;gap:{rowgap}pt;align-items:center">{"".join(r for r, _ in rows)}</div>'
    return inner, total


# variações da marca d'água (sempre a logo SCCS). "centro" = padrão aprovado.
MARCAS = {
    "centro": "",
    "deslocada": "left:auto;right:-40pt;top:auto;bottom:70pt;width:330pt;",       # canto inferior direito, sangrando
    "deslocada-esquerda": "left:-40pt;right:auto;top:auto;bottom:70pt;width:330pt;",
}


class Doc:
    def __init__(self, logos, rodape=RODAPE, watermark=True):
        self.logos, self.rodape, self.watermark = logos, rodape, watermark
        self.pages = []
        self.n = 0

    # ---- estrutura de página
    def _base(self, inner, cls=""):
        wm = ""
        if self.watermark:
            uri = resolver("sccs")["path"].as_uri()
            estilo = MARCAS.get(self.watermark if isinstance(self.watermark, str) else "centro", "")
            wm = f'<img class="wm" style="{estilo}" src="{uri}">'
        return f'<section class="page {cls}">{wm}{inner}<div class="ft">{self.rodape}</div></section>'

    def add(self, page_html):
        self.pages.append(page_html)

    def capa(self, kicker, titulo, subtitulo, esquerda=(), direita=()):
        """esquerda: [(rotulo, valor)], direita: [(rotulo, [linhas])]"""
        self.n += 1
        strip, sh = faixa_logos(self.logos, "capa")
        block = 91                     # kicker + título + traço + subtítulo
        group = sh + 25 + block
        top = 330 - group / 2
        left = "".join(f"<b>{esc(r)}</b>{esc(v)}<div class='gap'></div>" for r, v in esquerda)
        right = "".join(f"<b>{esc(r)}</b>" + "<br>".join(esc(x) for x in ls) + "<div class='gap'></div>" for r, ls in direita)
        inner = (f'<div class="strip" style="top:{top:.1f}pt">{strip}</div>'
                 f'<div class="cv" style="top:{top + sh + 25.8:.1f}pt"><div class="kick">{esc(kicker)}</div><h1>{esc(titulo)}</h1>'
                 f'<div class="rule"></div><p>{esc(subtitulo)}</p></div>'
                 f'<div class="cvinfo"><div>{left}</div><div>{right}</div></div>')
        return self._base(inner)

    def pagina(self, corpo, deslocar=0):
        """Página interna: logos no topo, corpo abaixo, 'Página N' e rodapé. `corpo` já inclui kicker/h1 etc."""
        self.n += 1
        strip, sh = faixa_logos(self.logos, "interna")
        top_ct = max(158.7, 17 + sh + 30) + deslocar
        inner = (f'<div class="strip" style="top:17pt">{strip}</div>'
                 f'<div class="ct" style="top:{top_ct:.1f}pt">{corpo}</div>'
                 f'<div class="pn">Página {self.n}</div>')
        return self._base(inner)

    def carta(self, corpo, assinatura):
        """Papel timbrado com texto (carta, ofício, declaração). Corpo e assinatura em HTML (ver componentes de carta)."""
        self.n += 1
        strip, sh = faixa_logos(self.logos, "carta")
        inner = (f'<div class="strip" style="top:28pt">{strip}</div>'
                 f'<div class="ct">{corpo}<div class="sg">{assinatura}</div></div>')
        return self._base(inner, cls="carta")

    def html(self, titulo="Documento SCCS"):
        return (f'<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>{esc(titulo)}</title>'
                f'<style>{font_faces()}{CSS}</style><body>{"".join(self.pages)}</body></html>')

    def render(self, pdf_path, titulo="Documento SCCS", manter_html=True):
        from playwright.sync_api import sync_playwright
        pdf_path = pathlib.Path(pdf_path).resolve()
        h = pdf_path.with_suffix(".html")
        h.write_text(self.html(titulo), encoding="utf-8")
        with sync_playwright() as p:
            exe = pathlib.Path("/opt/pw-browsers/chromium")
            b = p.chromium.launch(executable_path=str(exe)) if exe.exists() else p.chromium.launch()
            pg = b.new_page()
            pg.goto(h.as_uri()); pg.wait_for_timeout(600)
            pg.pdf(path=str(pdf_path), width="210mm", height="297mm", print_background=True, prefer_css_page_size=True)
            b.close()
        if not manter_html:
            h.unlink()
        return pdf_path


# ---------- componentes de corpo (retornam HTML) ----------
def cabecalho(kicker, titulo, sub=""):
    return f'<div class="kick">{esc(kicker)}</div><h1>{esc(titulo)}</h1>' + (f'<div class="sub">{esc(sub)}</div>' if sub else '<div class="sub">&nbsp;</div>')


def secao(n, titulo, texto=""):
    t = f'<p class="txt">{esc(texto)}</p>' if texto else ""
    return f'<h2><i>{n}.</i> {esc(titulo)}</h2>{t}'


def cards(itens):
    """itens: [(valor, descricao, alerta_bool)]"""
    return '<div class="kp">' + "".join(
        f'<div class="{"r" if a else ""}"><b>{esc(v)}</b><span>{esc(d)}</span></div>' for v, d, a in itens) + '</div>'


def tabela(titulo, linhas):
    """linhas: [(rotulo, observacao, valor)]"""
    tr = "".join(f"<tr><td>{esc(a)} <small>({esc(b)})</small></td><td class='n'>{esc(c)}</td></tr>" for a, b, c in linhas)
    return f'<div class="tb"><h4>{esc(titulo)}</h4><table>{tr}</table></div>'


def barras(linhas):
    """linhas: [(rotulo, valor)] — barra proporcional ao maior valor."""
    mx = max(v for _, v in linhas) or 1
    rows = "".join(
        f'<div class="row"><span>{esc(a)}</span><div><div class="b" style="width:{v / mx * 99:.1f}%"></div></div><b>{v}</b></div>'
        for a, v in linhas)
    return f'<div class="bars">{rows}</div>'


def destaque(texto):
    return f'<div class="quote">{esc(texto)}</div>'


def foto(img_path, numero, titulo, data):
    return (f'<figure class="ph"><img class="f" src="{pathlib.Path(img_path).resolve().as_uri()}">'
            f'<figcaption><b>{numero:02d}</b><span class="t">{esc(titulo)}</span><span class="d">{esc(data)}</span></figcaption></figure>')


def grade_fotos(figs):
    return '<div class="grid">' + "".join(figs) + '</div>'


def identificacao(linhas):
    return '<div class="sig">' + "".join(f"<div><b>{esc(a)}</b><span>{esc(b)}</span></div>" for a, b in linhas) + '</div>'


def assinaturas(rotulos):
    return '<div class="lines">' + "".join(f"<span>{esc(r)}</span>" for r in rotulos) + '</div>'


# ---------- componentes de carta / ofício ----------
def rich(texto, modelo=True):
    """**negrito**; [campo] vira campo em destaque verde quando modelo=True (texto ainda a preencher)."""
    import re
    t = esc(texto)
    t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
    if modelo:
        t = re.sub(r"(“?\[[^\]]+\]”?)", r'<span class="ph">\1</span>', t)
    return t


def carta_topo(numero, titulo, destinatario=None, referencia=None, modelo=True):
    h = (f'<div class="num">Carta nº {f"<span class=ph>{esc(numero)}</span>" if modelo else esc(numero)}</div>') if numero else ""
    h += f'<h1>{esc(titulo)}</h1><div class="rule"></div>'
    linhas = []
    if destinatario: linhas.append(f"<b>A/C:</b> {rich(destinatario, modelo)}")
    if referencia: linhas.append(f"<b>Ref.:</b> {rich(referencia, modelo)}")
    if linhas: h += '<div class="dest">' + "<br>".join(linhas) + '</div>'
    return h


def carta_paragrafos(paragrafos, modelo=True):
    return "".join(f"<p>{rich(p, modelo)}</p>" for p in paragrafos)


def carta_data(texto, modelo=True):
    return f'<div class="data">{rich(texto, modelo)}</div>'


def carta_assinatura(nome, cargo, instituicao=""):
    return (f'<div class="ln"></div><b>{esc(nome)}</b><span>{esc(cargo)}</span>'
            + (f'<span>{esc(instituicao)}</span>' if instituicao else ""))


# ---------- extensões do app de gestão (nominata e chamada) ----------
def legenda(texto):
    return f'<div class="nota">{esc(texto)}</div>'


def nominata(linhas, colunas=2):
    """linhas: [(n, nome, idade, sexo, presencas, faltas, freq)] em ordem; vira 2 ou 3 tabelas lado a lado.
    Com 3 colunas as células de presenças/faltas somem (só a frequência) para caber o nome."""
    colunas = 3 if colunas == 3 else 2
    completo = colunas == 2
    tam = -(-len(linhas) // colunas) or 1
    blocos = [linhas[i * tam:(i + 1) * tam] for i in range(colunas)]
    larg = [16, None, 20, 26] + ([26, 26] if completo else []) + [30 if completo else 28]
    cg = "".join(f'<col style="width:{w}pt">' if w else "<col>" for w in larg)
    cab = ('<th class="c">Nº</th><th>Aluno</th><th class="c">Id.</th><th class="c">Sexo</th>'
           + ('<th class="c">Pres.</th><th class="c">Falt.</th>' if completo else "") + '<th class="c">Freq.</th>')
    tabs = []
    for b in blocos:
        tr = ""
        for n, nome, idade, sexo, pres, falt, freq in b:
            extra = (f'<td class="v">{pres}</td><td class="{"z" if falt else "c"}">{falt}</td>' if completo else "")
            tr += (f'<tr><td class="nn">{n}</td><td>{esc(nome)}</td><td class="c">{idade}</td><td class="c">{esc(sexo)}</td>'
                   f'{extra}<td class="v">{esc(freq)}</td></tr>')
        tabs.append(f'<table><colgroup>{cg}</colgroup><thead><tr>{cab}</tr></thead><tbody>{tr}</tbody></table>')
    return f'<div class="nom {"nom3" if not completo else ""}">{"".join(tabs)}</div>'


def chamada(datas, linhas, totais=None, resumo=None):
    """datas: ['04/08', ...]; linhas: [(n, nome, idade, sexo, [marcas 'P'|'F'|'-'], presencas, faltas, freq)];
    totais (opcional, só na última página): {'por_data': [..], 'presencas': n, 'faltas': n, 'freq': '89%'}.
    As colunas de resumo (P, F, Freq.) aparecem só quando `totais` é informado (última faixa de datas)."""
    resumo = (totais is not None) if resumo is None else resumo
    disp = 505 - 16 - 104 - 18 - 24 - (76 if resumo else 0)
    wd = max(14, min(24, int(disp / max(1, len(datas)))))
    cg = ('<col style="width:16pt"><col style="width:104pt"><col style="width:18pt"><col style="width:24pt">'
          + "".join(f'<col style="width:{wd}pt">' for _ in datas)
          + ('<col style="width:22pt"><col style="width:22pt"><col style="width:32pt">' if resumo else ""))
    cab = ('<th class="c">Nº</th><th>Aluno</th><th class="c">Id.</th><th class="c">Sexo</th>'
           + "".join(f'<th class="c" style="padding:0">{esc(d)}</th>' for d in datas)
           + ('<th class="c">P</th><th class="c">F</th><th class="c">Freq.</th>' if resumo else ""))
    tr = ""
    for n, nome, idade, sexo, marcas, pres, falt, freq in linhas:
        ms = "".join(
            f'<td class="m {"mp" if m == "P" else "mf" if m == "F" else "mz"}">{"–" if m == "-" else m}</td>' for m in marcas)
        rs = (f'<td class="v">{pres}</td><td class="{"z" if falt else "c"}">{falt}</td><td class="v">{esc(freq)}</td>' if resumo else "")
        tr += f'<tr><td class="nn">{n}</td><td>{esc(nome)}</td><td class="c">{idade}</td><td class="c">{esc(sexo)}</td>{ms}{rs}</tr>'
    if totais:
        tr += ('<tr class="tot"><td class="lb" colspan="4">Presentes no dia</td>'
               + "".join(f"<td>{x}</td>" for x in totais["por_data"])
               + f'<td>{totais["presencas"]}</td><td>{totais["faltas"]}</td><td>{esc(totais["freq"])}</td></tr>')
    return f'<div class="ch"><table><colgroup>{cg}</colgroup><thead><tr>{cab}</tr></thead><tbody>{tr}</tbody></table></div>'
