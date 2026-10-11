// Måler, om tekst på et kort løber uden for kortets ramme (klippes ved kanten).
// Returnerer [{navn, side: "for"|"bag", px, procent, card}]. Delt af webuiens forhåndsvisning (iframe) og lav_pdf.py (Chromium). Kald: maalKortOverflow(document).
// Klipperne er .frame (overflow:hidden; rummer også .rules) og de indre elementer med overflow:hidden
// (.eff, .kicker, .dice). Et element tæller som overfyldt, når indholdet er mere end TOLERANCE px
// større end elementet selv (skriftafrunding giver op til ca. 1 px uden at noget klippes).
window.maalKortOverflow = function (doc) {
  const TOLERANCE = 2;
  const win = doc.defaultView;
  const out = [];
  doc.querySelectorAll(".card").forEach((card) => {
    const frame = card.querySelector(".frame");
    if (!frame) return; // .card.empty
    const navn = (card.querySelector("h3")?.textContent || "").trim();
    const side = card.classList.contains("back") ? "bag" : "for";
    let px = 0, procent = 0;
    [frame, ...frame.querySelectorAll("*")].forEach((el) => {
      if (el !== frame && win.getComputedStyle(el).overflow === "visible") return;
      if (!el.clientHeight && !el.clientWidth) return;
      const h = el.scrollHeight - el.clientHeight, b = el.scrollWidth - el.clientWidth;
      if (h > TOLERANCE) { px = Math.max(px, h); procent = Math.max(procent, (h / el.clientHeight) * 100); }
      if (b > TOLERANCE) { px = Math.max(px, b); procent = Math.max(procent, (b / el.clientWidth) * 100); }
    });
    if (px) out.push({ navn, side, px: Math.round(px), procent: Math.round(procent), card });
  });
  return out;
};
