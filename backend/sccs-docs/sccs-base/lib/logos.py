"""Registro de logos da SCCS. As logos vivem em assets/logos/<tipo>/ e são listadas em registro.json.

Tipos: sccs | projeto | orgao-publico | fundo | patrocinador | apoiador
Uso (linha de comando):
  python logos.py listar
  python logos.py registrar --id camil --nome "Camil" --tipo patrocinador --arquivo /caminho/logo.png [--nivel municipal] [--nota "..."]
  python logos.py substituir --id camil --arquivo /caminho/melhor.png   # troca por versão de melhor qualidade
"""
import json, shutil, argparse, pathlib
from PIL import Image

BASE = pathlib.Path(__file__).resolve().parent.parent
LOGOS = BASE / "assets" / "logos"
REG = LOGOS / "registro.json"
TIPOS = ["sccs", "projeto", "orgao-publico", "fundo", "patrocinador", "apoiador"]


def carregar():
    return json.loads(REG.read_text(encoding="utf-8")) if REG.exists() else []


def salvar(lista):
    REG.write_text(json.dumps(lista, ensure_ascii=False, indent=2), encoding="utf-8")


def resolver(id_):
    for e in carregar():
        if e["id"] == id_:
            p = LOGOS / e["tipo"] / e["arquivo"]
            if not p.exists():
                raise FileNotFoundError(f"Arquivo da logo '{id_}' não encontrado: {p}")
            w, h = Image.open(p).size
            return {**e, "path": p, "aspect": w / h}
    raise KeyError(f"Logo '{id_}' não está no registro. Peça o arquivo ao usuário e registre com logos.py registrar.")


def _aparar(src, dst):
    im = Image.open(src).convert("RGBA")
    a = im.split()[3].point(lambda v: 255 if v > 10 else 0)
    bb = a.getbbox()
    if bb:
        im = im.crop(bb)
    im.save(dst)
    return im.size


def registrar(id_, nome, tipo, arquivo, nivel=None, nota="", qualidade="ok"):
    assert tipo in TIPOS, f"tipo deve ser um de {TIPOS}"
    lista = [e for e in carregar() if e["id"] != id_]
    (LOGOS / tipo).mkdir(parents=True, exist_ok=True)
    dst = LOGOS / tipo / f"{id_}.png"
    if tipo == "sccs":
        shutil.copy(arquivo, dst)
    else:
        _aparar(arquivo, dst)
    w, h = Image.open(dst).size
    lista.append({"id": id_, "nome": nome, "tipo": tipo, "arquivo": dst.name, "nivel": nivel,
                  "largura_px": w, "altura_px": h, "qualidade": qualidade, "nota": nota})
    salvar(lista)
    return dst


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("acao", choices=["listar", "registrar", "substituir"])
    ap.add_argument("--id"); ap.add_argument("--nome"); ap.add_argument("--tipo")
    ap.add_argument("--arquivo"); ap.add_argument("--nivel"); ap.add_argument("--nota", default="")
    a = ap.parse_args()
    if a.acao == "listar":
        for e in carregar():
            print(f'{e["id"]:22} {e["tipo"]:14} {e["largura_px"]}x{e["altura_px"]}  qualidade={e["qualidade"]}  {e.get("nota","")}')
    elif a.acao == "registrar":
        print(registrar(a.id, a.nome or a.id, a.tipo, a.arquivo, a.nivel, a.nota))
    else:
        old = next(e for e in carregar() if e["id"] == a.id)
        print(registrar(a.id, old["nome"], old["tipo"], a.arquivo, old.get("nivel"), old.get("nota", ""), "ok"))
