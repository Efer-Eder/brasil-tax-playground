"""Gera os GIFs do README (pt-BR e en-US) a partir das capturas reais.

Uso:
    node scripts/readme/capturar.mjs .readme-captura
    python scripts/readme/gerar_gifs.py .readme-captura docs/assets

Requer Pillow e ffmpeg no PATH. Fontes: Segoe UI e Cascadia Mono (Windows);
em outro sistema, ajuste FONTES. Nada é inventado: as telas e os números vêm
das capturas do app e da API pública (arquivo api.json).
"""

from __future__ import annotations

import json
import math
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ORIGEM = Path(sys.argv[1] if len(sys.argv) > 1 else ".readme-captura")
DESTINO = Path(sys.argv[2] if len(sys.argv) > 2 else "docs/assets")
DESTINO.mkdir(parents=True, exist_ok=True)

FONTES = {
    "sans": r"C:\Windows\Fonts\segoeui.ttf",
    "semi": r"C:\Windows\Fonts\seguisb.ttf",
    "mono": r"C:\Windows\Fonts\CascadiaMono.ttf",
}

# Tokens do efer.online (Studio Graphite).
BG = (11, 12, 14)
SURFACE_1 = (17, 18, 21)
SURFACE_2 = (22, 23, 27)
SURFACE_3 = (28, 29, 34)
BORDER = (33, 34, 38)
BORDER_STRONG = (46, 47, 52)
TEXT_1 = (237, 238, 240)
TEXT_2 = (160, 163, 171)
TEXT_3 = (108, 112, 122)
ACCENT = (115, 119, 240)
ACCENT_TEXT = (169, 171, 247)
SUCCESS = (76, 183, 130)
DANGER = (224, 100, 106)
WARNING = (217, 165, 74)


def fonte(tipo: str, tamanho: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONTES[tipo], tamanho)


def ease(t: float) -> float:
    """easeInOutCubic."""
    t = max(0.0, min(1.0, t))
    return 4 * t * t * t if t < 0.5 else 1 - (-2 * t + 2) ** 3 / 2


def fundo(w: int, h: int, grade: bool = True) -> Image.Image:
    img = Image.new("RGB", (w, h), BG)
    if grade:
        d = ImageDraw.Draw(img)
        for x in range(0, w, 40):
            d.line([(x, 0), (x, h)], fill=(17, 18, 21))
        for y in range(0, h, 40):
            d.line([(0, y), (w, y)], fill=(17, 18, 21))
        # Vinheta para a grade sumir nas bordas, como no hub.
        mascara = Image.new("L", (w, h), 0)
        md = ImageDraw.Draw(mascara)
        md.ellipse([-w * 0.2, -h * 0.6, w * 0.9, h * 1.0], fill=255)
        mascara = mascara.filter(ImageFilter.GaussianBlur(120))
        img = Image.composite(img, Image.new("RGB", (w, h), BG), mascara)
    return img


def retangulo(d: ImageDraw.ImageDraw, caixa, raio, fill=None, outline=None, width=1):
    d.rounded_rectangle(caixa, radius=raio, fill=fill, outline=outline, width=width)


def chip(d: ImageDraw.ImageDraw, x: int, y: int, texto: str, cor=TEXT_2, borda=BORDER_STRONG, fundo_=SURFACE_1, ponto=None, f=None):
    f = f or fonte("mono", 13)
    tw = d.textlength(texto, font=f)
    extra = 16 if ponto else 0
    w = int(tw + 24 + extra)
    retangulo(d, [x, y, x + w, y + 26], 13, fill=fundo_, outline=borda)
    if ponto:
        d.ellipse([x + 11, y + 10, x + 17, y + 16], fill=ponto)
    d.text((x + 12 + extra, y + 5), texto, font=f, fill=cor)
    return w


def cursor(img: Image.Image, x: float, y: float, clique: float = 0.0):
    """Seta simples; `clique` de 0 a 1 desenha um anel que expande."""
    d = ImageDraw.Draw(img, "RGBA")
    if clique > 0:
        r = 6 + 22 * clique
        a = int(200 * (1 - clique))
        d.ellipse([x - r, y - r, x + r, y + r], outline=(169, 171, 247, a), width=2)
    pts = [(0, 0), (0, 17), (4.5, 13), (8, 20), (10.5, 19), (7, 12), (13, 12)]
    pts = [(x + px, y + py) for px, py in pts]
    d.polygon(pts, fill=(237, 238, 240, 255), outline=(11, 12, 14, 255))


class Video:
    def __init__(self, w: int, h: int, fps: int):
        self.w, self.h, self.fps = w, h, fps
        self.dir = Path(tempfile.mkdtemp(prefix="btp-gif-"))
        self.n = 0

    def add(self, img: Image.Image, segundos: float | None = None):
        vezes = 1 if segundos is None else max(1, round(segundos * self.fps))
        for _ in range(vezes):
            img.save(self.dir / f"f{self.n:05d}.png")
            self.n += 1

    def salvar(self, destino: Path, largura: int | None = None):
        escala = f"scale={largura}:-1:flags=lanczos," if largura else ""
        paleta = self.dir / "paleta.png"
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(self.fps), "-i", str(self.dir / "f%05d.png"),
             "-vf", f"{escala}palettegen=max_colors=192:stats_mode=diff", str(paleta)],
            check=True,
        )
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(self.fps), "-i", str(self.dir / "f%05d.png"),
             "-i", str(paleta), "-lavfi",
             f"{escala}paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle", "-loop", "0", str(destino)],
            check=True,
        )
        shutil.rmtree(self.dir, ignore_errors=True)
        print(f"{destino}  {destino.stat().st_size / 1024:.0f} KB  {self.n} quadros")


# ---------------------------------------------------------------- moldura de tela

JW, JH = 960, 712          # quadro do GIF
WX, WY, WW = 40, 28, 880   # janela
ESC = WW / 1280            # captura 1280 px -> 880 px
VH = round(800 * ESC)      # 550
BARRA = 34


def janela(conteudo: Image.Image, legenda: tuple[str, str], passo: str, progresso: float, url: str) -> Image.Image:
    img = fundo(JW, JH)
    d = ImageDraw.Draw(img)
    # Sombra e moldura.
    sombra = Image.new("L", (JW, JH), 0)
    ImageDraw.Draw(sombra).rounded_rectangle([WX + 6, WY + 16, WX + WW - 6, WY + BARRA + VH + 18], 14, fill=170)
    sombra = sombra.filter(ImageFilter.GaussianBlur(18))
    img = Image.composite(Image.new("RGB", (JW, JH), (4, 4, 5)), img, sombra)
    d = ImageDraw.Draw(img)
    retangulo(d, [WX - 1, WY - 1, WX + WW, WY + BARRA + VH], 12, fill=SURFACE_1, outline=BORDER_STRONG)
    for i in range(3):
        d.ellipse([WX + 14 + i * 16, WY + 12, WX + 24 + i * 16, WY + 22], fill=SURFACE_3, outline=BORDER_STRONG)
    f = fonte("mono", 12)
    tw = d.textlength(url, font=f)
    retangulo(d, [WX + WW / 2 - tw / 2 - 14, WY + 7, WX + WW / 2 + tw / 2 + 14, WY + 27], 6, fill=SURFACE_2, outline=BORDER)
    d.text((WX + WW / 2 - tw / 2, WY + 9), url, font=f, fill=TEXT_3)
    img.paste(conteudo.resize((WW, VH), Image.LANCZOS), (WX, WY + BARRA))
    # Barra de progresso fina embaixo da janela.
    y = WY + BARRA + VH + 1
    d.rectangle([WX, y, WX + WW, y + 2], fill=SURFACE_2)
    d.rectangle([WX, y, WX + int(WW * progresso), y + 2], fill=ACCENT)
    # Legenda.
    ly = y + 26
    f_passo = fonte("mono", 14)
    d.text((WX, ly + 3), passo, font=f_passo, fill=ACCENT_TEXT)
    titulo, sub = legenda
    d.text((WX + 40, ly - 2), titulo, font=fonte("semi", 21), fill=TEXT_1)
    d.text((WX + 40, ly + 28), sub, font=fonte("sans", 15), fill=TEXT_2)
    return img


def recorte(pagina: Image.Image, y: float, topo: Image.Image | None) -> Image.Image:
    """Recorta a janela de 1280x800 na posição y de uma captura de página inteira,
    mantendo o cabeçalho fixo (como no navegador)."""
    y = int(max(0, min(pagina.height - 800, y)))
    quadro = pagina.crop((0, y, 1280, y + 800))
    if topo is not None and y > 0:
        quadro.paste(topo, (0, 0))
    return quadro


def misturar(a: Image.Image, b: Image.Image, t: float) -> Image.Image:
    return Image.blend(a, b, ease(t))


# ---------------------------------------------------------------- GIF 1: tour

def gif_tour(idioma: str):
    L = {
        "pt": [
            ("Página do projeto", "O que é, como funciona e como usar, no visual do efer.online."),
            ("Card ao vivo do GitHub", "Commits, issues, PRs e o último CI, direto da API do GitHub."),
            ("Só o motor oficial faz conta", "O app valida o formato e repassa. Nenhuma alíquota no código."),
            ("API pública, sem cadastro", "Exemplos de curl, limites medidos e códigos de resposta."),
        ],
        "en": [
            ("Project page", "What it is, how it works and how to use it."),
            ("Live GitHub card", "Commits, issues, PRs and the latest CI run, from the GitHub API."),
            ("Only the official engine does math", "The app validates the shape and forwards it. No tax rates in the code."),
            ("Public API, no sign-up", "curl examples, measured limits and response codes."),
        ],
    }[idioma]
    pagina = Image.open(ORIGEM / "pagina-inteira.png").convert("RGB")
    pos = json.loads((ORIGEM / "posicoes.json").read_text(encoding="utf-8"))["pagina"]
    topo = pagina.crop((0, 0, 1280, 92))
    url = "efer.online/projeto/brasil-tax-playground"
    paradas = [0, pos["github"] - 110, pos["como"] - 110, pos["api"] - 110]
    v = Video(JW, JH, 15)
    total = len(paradas)
    for i, y in enumerate(paradas):
        if i > 0:
            y0 = paradas[i - 1]
            passos = 18
            for k in range(1, passos + 1):
                yy = y0 + (y - y0) * ease(k / passos)
                v.add(janela(recorte(pagina, yy, topo), L[i], f"0{i + 1}", (i - 1 + k / passos) / (total - 1), url))
        v.add(janela(recorte(pagina, y, topo), L[i], f"0{i + 1}", i / (total - 1), url), 2.4 if i else 2.0)
    v.salvar(DESTINO / f"tour-{idioma}.gif")


# ---------------------------------------------------------------- GIF 2: simulador

def gif_simulador(idioma: str):
    L = {
        "pt": [
            ("Escolha um exemplo ou edite o JSON", "Operação no formato OperacaoInput do motor. Os exemplos são fictícios."),
            ("O motor oficial responde", "Item 1 calculado, com a memória de cálculo escrita pelo próprio motor."),
            ("Erro por item, sem derrubar a operação", "O item 2 volta com REG-005 e o caminho do campo, como o motor mandou."),
            ("Requisição e resposta cruas", "Inspetor JSON lado a lado e exportação da simulação."),
            ("Entrada inválida não chega ao motor", "A validação estrutural explica cada problema com o caminho do campo."),
        ],
        "en": [
            ("Pick an example or edit the JSON", "Operation in the engine's OperacaoInput shape. Examples are fictitious."),
            ("The official engine answers", "Item 1 computed, with the calculation trail written by the engine itself."),
            ("Per-item errors, operation stays up", "Item 2 comes back with REG-005 and the field path, exactly as the engine sent it."),
            ("Raw request and response", "Side-by-side JSON inspector and simulation export."),
            ("Invalid input never reaches the engine", "Structural validation explains each problem with its field path."),
        ],
    }[idioma]
    url = "efer.online/projeto/brasil-tax-playground/simular"
    pos = json.loads((ORIGEM / "posicoes.json").read_text(encoding="utf-8"))
    ini = Image.open(ORIGEM / "sim-02-exemplo.png").convert("RGB")
    inteiro = Image.open(ORIGEM / "sim-04-resultado-inteiro.png").convert("RGB")
    invalido = Image.open(ORIGEM / "sim-05-invalido.png").convert("RGB")
    topo = ini.crop((0, 0, 1280, 92))
    v = Video(JW, JH, 15)
    n = 5

    # 1) cursor vai até o seletor de exemplo.
    sel = pos["select"]
    alvo = (WX + (sel["x"] + sel["w"] * 0.7) * ESC, WY + BARRA + (sel["y"] + sel["h"] * 0.55) * ESC)
    origem = (WX + 700, WY + BARRA + 420)
    for k in range(20):
        t = ease(k / 19)
        quadro = janela(ini, L[0], "01", 0.0, url)
        cursor(quadro, origem[0] + (alvo[0] - origem[0]) * t, origem[1] + (alvo[1] - origem[1]) * t)
        v.add(quadro)
    for k in range(8):
        quadro = janela(ini, L[0], "01", 0.0, url)
        cursor(quadro, *alvo, clique=k / 7)
        v.add(quadro)
    quadro = janela(ini, L[0], "01", 0.0, url)
    cursor(quadro, *alvo)
    v.add(quadro, 1.2)

    # 2) resultado: topo da página com o item 1 e a memória de cálculo.
    y_item1 = 0
    a = recorte(inteiro, y_item1, topo)
    for k in range(8):
        v.add(janela(misturar(ini, a, k / 7), L[1], "02", 0.25 * k / 7, url))
    v.add(janela(a, L[1], "02", 0.25, url), 2.6)

    # 3) rola até o item 2.
    y_item2 = pos["item2"] - 160
    for k in range(1, 19):
        yy = y_item1 + (y_item2 - y_item1) * ease(k / 18)
        v.add(janela(recorte(inteiro, yy, topo), L[2], "03", 0.25 + 0.25 * k / 18, url))
    v.add(janela(recorte(inteiro, y_item2, topo), L[2], "03", 0.5, url), 2.6)

    # 4) inspetor JSON no fim.
    y_fim = inteiro.height - 800
    for k in range(1, 19):
        yy = y_item2 + (y_fim - y_item2) * ease(k / 18)
        v.add(janela(recorte(inteiro, yy, topo), L[3], "04", 0.5 + 0.25 * k / 18, url))
    v.add(janela(recorte(inteiro, y_fim, topo), L[3], "04", 0.75, url), 2.2)

    # 5) entrada inválida.
    b = invalido
    ultimo = recorte(inteiro, y_fim, topo)
    for k in range(8):
        v.add(janela(misturar(ultimo, b, k / 7), L[4], "05", 0.75 + 0.25 * k / 7, url))
    v.add(janela(b, L[4], "05", 1.0, url), 2.8)
    v.salvar(DESTINO / f"simulador-{idioma}.gif")


# ---------------------------------------------------------------- GIF 3: API no terminal

def gif_api(idioma: str):
    dados = json.loads((ORIGEM / "api.json").read_text(encoding="utf-8"))
    st = dados["status"]["versao"]
    obj = dados["sim"]["resposta"]["objetos"][0]
    g = obj["tribCalc"]["IBSCBS"]["gIBSCBS"]
    memo = obj["tribCalc"]["IBSCBS"]["memoriaCalculo"]["cbs"]
    base = dados["base"]
    W, H = 960, 600
    TX, TY, TW, TH = 40, 28, 880, 470
    L = {
        "pt": [("Status do motor, sem chave", "GET /engine/status devolve a versão que o próprio motor informa."),
               ("Uma operação, a resposta do motor", "POST /simular/regime-regular: números e memória de cálculo vêm do motor oficial.")],
        "en": [("Engine status, no API key", "GET /engine/status returns the version the engine itself reports."),
               ("One operation, the engine's answer", "POST /simular/regime-regular: numbers and the calculation trail come from the official engine.")],
    }[idioma]
    fm = fonte("mono", 15)
    linha_h = 22

    def tela(linhas: list[tuple[str, tuple]], legenda, passo, prog, cursor_on=True):
        img = fundo(W, H)
        d = ImageDraw.Draw(img)
        retangulo(d, [TX - 1, TY - 1, TX + TW, TY + TH], 12, fill=(13, 14, 17), outline=BORDER_STRONG)
        d.rectangle([TX, TY + 33, TX + TW - 1, TY + 33], fill=BORDER)
        for i in range(3):
            d.ellipse([TX + 14 + i * 16, TY + 12, TX + 24 + i * 16, TY + 22], fill=SURFACE_3, outline=BORDER_STRONG)
        titulo = "terminal"
        ft = fonte("mono", 12)
        d.text((TX + TW / 2 - d.textlength(titulo, font=ft) / 2, TY + 9), titulo, font=ft, fill=TEXT_3)
        y = TY + 50
        visiveis = linhas[-18:]
        for texto, cor in visiveis:
            d.text((TX + 20, y), texto, font=fm, fill=cor)
            y += linha_h
        if cursor_on and visiveis:
            ult, _ = visiveis[-1]
            cx = TX + 20 + d.textlength(ult, font=fm) + 2
            d.rectangle([cx, y - linha_h + 3, cx + 8, y - 3], fill=ACCENT_TEXT)
        yb = TY + TH + 1
        d.rectangle([TX, yb, TX + TW, yb + 2], fill=SURFACE_2)
        d.rectangle([TX, yb, TX + int(TW * prog), yb + 2], fill=ACCENT)
        d.text((TX, yb + 29), passo, font=fonte("mono", 14), fill=ACCENT_TEXT)
        d.text((TX + 40, yb + 24), legenda[0], font=fonte("semi", 21), fill=TEXT_1)
        d.text((TX + 40, yb + 54), legenda[1], font=fonte("sans", 15), fill=TEXT_2)
        return img

    v = Video(W, H, 20)
    buf: list[tuple[str, tuple]] = []

    def digitar(cmd: str, legenda, passo, p0, p1, prompt="$ "):
        buf.append((prompt, TEXT_3))
        passo_chars = 3
        for i in range(0, len(cmd) + 1, passo_chars):
            buf[-1] = (prompt + cmd[:i], TEXT_1)
            v.add(tela(buf, legenda, passo, p0 + (p1 - p0) * i / max(1, len(cmd))))
        buf[-1] = (prompt + cmd, TEXT_1)

    def imprimir(linhas, legenda, passo, prog):
        for texto, cor in linhas:
            buf.append((texto, cor))
            v.add(tela(buf, legenda, passo, prog, cursor_on=False))

    host = base.replace("https://", "")
    digitar(f"curl -s {host}/engine/status", L[0], "01", 0.0, 0.2)
    v.add(tela(buf, L[0], "01", 0.2), 0.4)
    imprimir([
        ("{", TEXT_3),
        ('  "state": "disponivel",', SUCCESS),
        (f'  "versaoApp": "{st["versaoApp"]}",', TEXT_2),
        (f'  "versaoDb": "{st["versaoDb"]}",', TEXT_2),
        (f'  "dataVersaoDb": "{st["dataVersaoDb"]}"', TEXT_2),
        ("}", TEXT_3),
    ], L[0], "01", 0.3)
    v.add(tela(buf, L[0], "01", 0.35), 1.8)

    buf.clear()
    corpo = '{"dhFatoGerador":"2026-06-01T10:00:00-03:00","itens":[...]}'
    digitar(f"curl -s -X POST {host}/simular/regime-regular \\", L[1], "02", 0.4, 0.55)
    digitar(f"-d '{corpo}'", L[1], "02", 0.55, 0.7, prompt="    ")
    v.add(tela(buf, L[1], "02", 0.7), 0.4)
    # Quebra a memória de cálculo em linhas de ~64 caracteres.
    palavras, linhas_memo, atual = memo.split(), [], ""
    for p in palavras:
        if len(atual) + len(p) + 1 > 62:
            linhas_memo.append(atual)
            atual = p
        else:
            atual = f"{atual} {p}".strip()
    linhas_memo.append(atual)
    imprimir([
        ('"estadoItem": "CALCULADO"', SUCCESS),
        (f'"vBC": "{g["vBC"]}"   "pCBS": "{g["gCBS"]["pCBS"]}"   "vCBS": "{g["gCBS"]["vCBS"]}"', ACCENT_TEXT),
        (f'"vIBS": "{g["vIBS"]}"   "pIBSUF": "{g["gIBSUF"]["pIBSUF"]}"', ACCENT_TEXT),
        ('"memoriaCalculo.cbs":', TEXT_3),
    ] + [(f"  {l}", TEXT_2) for l in linhas_memo] + [
        (f'"motor": {{ "versaoApp": "{st["versaoApp"]}", "versaoDb": "{st["versaoDb"]}" }}', TEXT_3),
    ], L[1], "02", 0.9)
    v.add(tela(buf, L[1], "02", 1.0), 3.2)
    v.salvar(DESTINO / f"api-{idioma}.gif")


# ---------------------------------------------------------------- GIF 4: banner

def gif_banner(idioma: str):
    W, H = 1200, 384
    T = {
        "pt": {
            "chip": "open source · MIT · motor oficial 1.7.2",
            "sub": "Um playground para os motores open source da Reforma Tributária: CBS, IBS e IS calculados pelo motor da Receita, nunca pelo app.",
            "nos": ["navegador", "BFF", "motor oficial"],
            "resp": "resposta crua do motor",
        },
        "en": {
            "chip": "open source · MIT · official engine 1.7.2",
            "sub": "A playground for Brazil's open source tax reform engines: CBS, IBS and IS computed by the official engine, never by the app.",
            "nos": ["browser", "BFF", "official engine"],
            "resp": "raw engine response",
        },
    }[idioma]
    dados = json.loads((ORIGEM / "api.json").read_text(encoding="utf-8"))
    g = dados["sim"]["resposta"]["objetos"][0]["tribCalc"]["IBSCBS"]["gIBSCBS"]
    v = Video(W, H, 20)
    quadros = 80
    base = fundo(W, H)
    d0 = ImageDraw.Draw(base)
    chip(d0, 48, 52, T["chip"], ponto=SUCCESS)
    d0.text((46, 92), "Brasil Tax", font=fonte("semi", 58), fill=TEXT_1)
    d0.text((46, 156), "Playground", font=fonte("semi", 58), fill=TEXT_3)
    # Subtítulo em até 2 linhas.
    fs = fonte("sans", 17)
    palavras, linhas, atual = T["sub"].split(), [], ""
    for p in palavras:
        if d0.textlength(f"{atual} {p}", font=fs) > 520:
            linhas.append(atual)
            atual = p
        else:
            atual = f"{atual} {p}".strip()
    linhas.append(atual)
    for i, l in enumerate(linhas[:3]):
        d0.text((48, 256 + i * 26), l, font=fs, fill=TEXT_2)

    # Diagrama à direita: três nós e uma linha.
    nx = [660, 840, 1030]
    ny = 150
    fn = fonte("mono", 14)
    for i, x in enumerate(nx):
        rotulo = T["nos"][i]
        tw = d0.textlength(rotulo, font=fn)
        retangulo(d0, [x - tw / 2 - 16, ny - 20, x + tw / 2 + 16, ny + 20], 8, fill=SURFACE_1,
                  outline=ACCENT if i == 2 else BORDER_STRONG)
        d0.text((x - tw / 2, ny - 10), rotulo, font=fn, fill=ACCENT_TEXT if i == 2 else TEXT_2)
    ligacoes = []
    for i in range(2):
        xa = nx[i] + d0.textlength(T["nos"][i], font=fn) / 2 + 16
        xb = nx[i + 1] - d0.textlength(T["nos"][i + 1], font=fn) / 2 - 16
        ligacoes.append((xa, xb))
        for x in range(int(xa), int(xb), 8):
            d0.line([(x, ny), (x + 4, ny)], fill=BORDER_STRONG, width=1)

    resp = [
        ('"estadoItem"', '"CALCULADO"', SUCCESS),
        ('"vBC"', f'"{g["vBC"]}"', ACCENT_TEXT),
        ('"pCBS"', f'"{g["gCBS"]["pCBS"]}"', ACCENT_TEXT),
        ('"vCBS"', f'"{g["gCBS"]["vCBS"]}"', ACCENT_TEXT),
    ]
    for q in range(quadros):
        img = base.copy()
        d = ImageDraw.Draw(img)
        t = q / quadros
        # Pacote indo (0 a 0.45) e voltando (0.5 a 0.9).
        if t < 0.45:
            p = ease(t / 0.45)
            total = sum(b - a for a, b in ligacoes)
            dist = p * total
            for a, b in ligacoes:
                if dist <= b - a:
                    x = a + dist
                    break
                dist -= b - a
            else:
                x = ligacoes[-1][1]
            d.ellipse([x - 5, ny - 5, x + 5, ny + 5], fill=ACCENT)
        elif 0.5 <= t < 0.9:
            p = ease((t - 0.5) / 0.4)
            total = sum(b - a for a, b in ligacoes)
            dist = (1 - p) * total
            for a, b in ligacoes:
                if dist <= b - a:
                    x = a + dist
                    break
                dist -= b - a
            else:
                x = ligacoes[-1][1]
            d.ellipse([x - 5, ny - 5, x + 5, ny + 5], fill=SUCCESS)
        # Painel da resposta aparece depois que o pacote chega ao motor.
        alfa = 0.0 if t < 0.45 else min(1.0, (t - 0.45) / 0.1)
        if alfa > 0:
            camada = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            dc = ImageDraw.Draw(camada)
            px, py = 640, 206
            a = int(255 * alfa)
            dc.rounded_rectangle([px, py, px + 500, py + 116], 10, fill=SURFACE_1 + (a,), outline=BORDER_STRONG + (a,))
            dc.text((px + 16, py + 10), T["resp"], font=fonte("mono", 12), fill=TEXT_3 + (a,))
            for i, (k, val, cor) in enumerate(resp):
                col = i % 2
                lin = i // 2
                xx = px + 16 + col * 240
                yy = py + 38 + lin * 34
                dc.text((xx, yy), k, font=fonte("mono", 15), fill=TEXT_3 + (a,))
                dc.text((xx + dc.textlength(k + " ", font=fonte("mono", 15)), yy), val, font=fonte("mono", 15), fill=cor + (a,))
            img = Image.alpha_composite(img.convert("RGBA"), camada).convert("RGB")
        v.add(img)
    v.add(img, 1.2)
    v.salvar(DESTINO / f"banner-{idioma}.gif")


if __name__ == "__main__":
    for idioma in ("pt", "en"):
        gif_banner(idioma)
        gif_tour(idioma)
        gif_simulador(idioma)
        gif_api(idioma)
