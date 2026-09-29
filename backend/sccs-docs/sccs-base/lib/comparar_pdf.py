"""Compara dois PDFs (referência x gerado): posição/tamanho/cor de cada trecho de texto, por página.
Uso: python comparar_pdf.py referencia.pdf gerado.pdf [pagina ...]"""
import sys, pymupdf as fitz

def spans(path, pn):
    out = []
    for b in fitz.open(path)[pn].get_text("dict")["blocks"]:
        if b["type"] != 0: continue
        for l in b["lines"]:
            txt = "".join(s["text"] for s in l["spans"]).strip()
            if not txt: continue
            s0 = l["spans"][0]
            out.append((txt, l["bbox"][0], l["bbox"][1], s0["size"], s0["color"]))
    return out

def _texto_main():
    ref, new = sys.argv[1], sys.argv[2]
    pages = [int(x) - 1 for x in sys.argv[3:]] or range(len(fitz.open(ref)))
    for pn in pages:
        A, B = spans(ref, pn), spans(new, pn)
        print(f"--- página {pn+1}")
        used = set()
        for t, x, y, sz, col in A:
            k = next((i for i, (t2, *_ ) in enumerate(B) if i not in used and t2.replace(" ", "") == t.replace(" ", "")), None)
            if k is None:
                print(f"  FALTA   {t[:40]}"); continue
            used.add(k); t2, x2, y2, sz2, c2 = B[k]
            flag = "" if abs(y2 - y) < 1.5 and abs(x2 - x) < 1.5 and abs(sz2 - sz) < .3 and c2 == col else "  <<"
            print(f"  dy={y2-y:+5.1f} dx={x2-x:+5.1f} sz {sz:4.1f}/{sz2:4.1f} {'cor ok' if c2==col else 'cor #%06x/#%06x'%(col,c2)} {t[:34]}{flag}")


def desenhos(path, pn):
    """Retângulos preenchidos (linhas, cards, barras) e imagens, arredondados, ordenados."""
    p = fitz.open(path)[pn]
    out = []
    for dr in p.get_drawings():
        r = dr["rect"]; f = dr.get("fill")
        if not f or (r.width > 590 and r.height > 830): continue
        out.append(("rect", tuple(round(v) for v in r), "#%02x%02x%02x" % tuple(int(x * 255) for x in f)))
    for im in p.get_images(full=True):
        for r in p.get_image_rects(im[0]):
            out.append(("img", tuple(round(v) for v in r), ""))
    return sorted(out, key=lambda t: (t[1][1], t[1][0]))

def comparar_desenhos(ref, new, pn):
    A, B = desenhos(ref, pn), desenhos(new, pn)
    print(f"--- desenhos página {pn+1}: ref={len(A)} novo={len(B)}")
    for a in A:
        best = min(B, key=lambda b: (b[0] != a[0]) * 1e6 + sum(abs(x - y) for x, y in zip(a[1], b[1])) + (a[2] != b[2]) * 5, default=None)
        d = tuple(y - x for x, y in zip(a[1], best[1])) if best else None
        ok = best and all(abs(v) <= 2 for v in d)
        print(f"  {'ok ' if ok else '<< '}{a[0]} {a[1]} {a[2]}  ->  {best[1] if best else None} {best[2] if best else ''} d={d}")

if __name__ == "__main__":
    if "--desenhos" in sys.argv:
        args = [a for a in sys.argv[1:] if a != "--desenhos"]
        for n in args[2:]:
            comparar_desenhos(args[0], args[1], int(n) - 1)
    else:
        _texto_main()
