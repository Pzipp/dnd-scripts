#!/usr/bin/env python3
"""Lav en print-klar PDF (A4, margin 0) fra en HTML-fil lavet af spellkort.py eller karakterark.py.

Brug:  python3 lav-pdf.py <fil.html> [ud.pdf]

Kræver Playwright med Chromium:
  pip install playwright
  playwright install chromium

Skrifttyperne hentes fra Google Fonts, så der skal være internet, når scriptet kører.
Print PDF'en i faktisk størrelse (100 %), ikke "tilpas til side".
"""
import os, sys
from playwright.sync_api import sync_playwright


def main():
    src = os.path.abspath(sys.argv[1])
    dst = sys.argv[2] if len(sys.argv) > 2 else os.path.splitext(src)[0] + ".pdf"
    html = open(src, encoding="utf-8").read()
    if "<html" not in html.lower():                    # generatorerne laver kun indholdet; pak det ind
        html = "<!doctype html><html lang='da'><head><meta charset='utf-8'></head><body>" + html + "</body></html>"
    tmp = src + ".tmp.html"
    open(tmp, "w", encoding="utf-8").write(html)
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            pg = b.new_page()
            pg.goto("file://" + tmp)
            pg.wait_for_load_state("networkidle")
            pg.evaluate("document.fonts.ready")
            pg.emulate_media(media="print")
            pg.pdf(path=dst, format="A4", print_background=True, prefer_css_page_size=True)
            b.close()
    finally:
        os.remove(tmp)
    print(dst)


if __name__ == "__main__":
    main()
