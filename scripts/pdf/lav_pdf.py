#!/usr/bin/env python3
"""Lav print-klar PDF (A4, margin 0) fra HTML-filer lavet af karakterark.py eller spellkort.py.

Brug:  python3 lav_pdf.py <fil.html> [flere.html ...] [--skrifttyper MAPPE]
  Hver PDF lægges ved siden af sin HTML-fil (samme navn, endelsen .pdf).
  Normalt kører man i stedet:  python3 dnd.py karakterark valak --pdf

Kræver Playwright med Chromium:
  pip install playwright
  playwright install chromium

Skrifttyper:
  HTML-filerne henter IM Fell English og Crimson Pro fra Google Fonts, så der skal være internet.
  Uden internet (fx i en AI-agents sandkasse) giver PDF'en reserveskrifter, og tekst kan ombrydes
  anderledes, så kortene ikke passer. Løsning: installer skrifterne lokalt og peg på dem:
    mkdir -p ~/skrifter && cd ~/skrifter
    npm install @fontsource/im-fell-english @fontsource/im-fell-english-sc @fontsource/crimson-pro
    python3 lav_pdf.py fil.html --skrifttyper ~/skrifter

Print PDF'en i faktisk størrelse (100 %), ikke "tilpas til side".
"""
import argparse, base64, os, sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import faelles

# (css-familie, fontsource-pakke, vægt, stil)
SKRIFTER = [
    ("IM Fell English", "im-fell-english", 400, "normal"),
    ("IM Fell English", "im-fell-english", 400, "italic"),
    ("IM Fell English SC", "im-fell-english-sc", 400, "normal"),
    ("Crimson Pro", "crimson-pro", 400, "normal"),
    ("Crimson Pro", "crimson-pro", 400, "italic"),
    ("Crimson Pro", "crimson-pro", 600, "normal"),
    ("Crimson Pro", "crimson-pro", 600, "italic"),
    ("Crimson Pro", "crimson-pro", 700, "normal"),
    ("Crimson Pro", "crimson-pro", 700, "italic"),
]


def lokal_skrift_css(mappe):
    """@font-face-CSS (data-URI'er) fra @fontsource-pakker i mappe. Stopper, hvis ingen findes."""
    mappe = os.path.expanduser(mappe)
    baser = [os.path.join(mappe, "node_modules", "@fontsource"), os.path.join(mappe, "@fontsource"), mappe]
    css, fundet = [], 0
    for familie, pakke, vaegt, stil in SKRIFTER:
        for b in baser:
            fil = os.path.join(b, pakke, "files", f"{pakke}-latin-{vaegt}-{stil}.woff2")
            if os.path.isfile(fil):
                data = base64.b64encode(open(fil, "rb").read()).decode()
                css.append(f'@font-face{{font-family:"{familie}";font-style:{stil};font-weight:{vaegt};'
                           f'src:url(data:font/woff2;base64,{data}) format("woff2");}}')
                fundet += 1
                break
    if not fundet:
        faelles.fejl(f"Fandt ingen @fontsource-skrifter i {mappe}. Se lav_pdf.py for installation.")
    return "\n".join(css)


def lav_pdf(par, skrifttyper=None):
    """par: liste af (html_sti, pdf_sti). Én browser bruges til alle filer."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        faelles.fejl("Playwright mangler. Kør:  pip install playwright && playwright install chromium")
    css = lokal_skrift_css(skrifttyper) if skrifttyper else None
    with sync_playwright() as p:
        b = p.chromium.launch()
        for src, dst in par:
            src = os.path.abspath(src)
            html = open(src, encoding="utf-8").read()
            if "<html" not in html.lower():                 # spellkort.py laver kun indholdet; pak det ind
                html = "<!doctype html><html lang='da'><head><meta charset='utf-8'></head><body>" + html + "</body></html>"
            tmp = src + ".tmp.html"
            open(tmp, "w", encoding="utf-8").write(html)
            try:
                pg = b.new_page()
                if css:
                    pg.route("**/fonts.googleapis.com/**", lambda r: r.fulfill(status=200, content_type="text/css", body=css))
                pg.goto("file://" + tmp)
                try:
                    pg.wait_for_load_state("networkidle", timeout=20000)
                except Exception:
                    pass
                pg.evaluate("document.fonts.ready")
                if not pg.evaluate("[...document.fonts].some(f => f.status === 'loaded')"):
                    print(f"ADVARSEL: skrifttyperne blev ikke hentet til {os.path.basename(src)} (ingen internet?). "
                          "PDF'en får reserveskrifter. Se --skrifttyper.", file=sys.stderr)
                pg.emulate_media(media="print")
                pg.pdf(path=dst, format="A4", print_background=True, prefer_css_page_size=True)
                pg.close()
            finally:
                os.remove(tmp)
            print(dst)
        b.close()


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Lav print-klar A4-PDF fra HTML.")
    ap.add_argument("html", nargs="+", help="HTML-fil(er) fra karakterark.py eller spellkort.py")
    ap.add_argument("--skrifttyper", help="mappe med @fontsource-pakker (bruges, hvis Google Fonts ikke kan nås)")
    a = ap.parse_args()
    lav_pdf([(h, os.path.splitext(h)[0] + ".pdf") for h in a.html], a.skrifttyper)
