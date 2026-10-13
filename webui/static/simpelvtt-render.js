// Grid: cellestørrelse og offset er i tusindedele af viewportens korteste side (følger skærmen, ikke billedet), ganget med gridzoom.
// Fælles visning: billede og grid tegnes ens på DM-skærmens preview og på spillerskærmen.
// Zoom 1 = det roterede billede passer ind i vinduet. x/y er brøkdele af vinduets bredde/højde (uafhængige for billede og grid).
window.vttRender = function (box, img, canvas, view) {
  const W = box.clientWidth, H = box.clientHeight, nw = img.naturalWidth, nh = img.naturalHeight;
  if (!W || !H) return;
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  let night = box.querySelector('.night');
  if (!night) { night = document.createElement('div'); night.className = 'night'; box.insertBefore(night, canvas); }
  night.style.display = view.night ? 'block' : 'none';
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
  if (!nw || !nh) { img.style.display = 'none'; return; }
  img.style.display = '';
  const rot = (view.img.rot || 0) * Math.PI / 180, ca = Math.abs(Math.cos(rot)), sa = Math.abs(Math.sin(rot));
  const bw = nw * ca + nh * sa, bh = nw * sa + nh * ca;  // omsluttende boks om det roterede billede
  const fit = Math.min(W / bw, H / bh), s = fit * view.img.zoom;
  img.style.width = nw * s + 'px'; img.style.height = nh * s + 'px';
  img.style.transform = `translate(${W / 2 + view.img.x * W - nw * s / 2}px, ${H / 2 + view.img.y * H - nh * s / 2}px) rotate(${view.img.rot || 0}deg)`;
  const g = view.grid, u = Math.min(W, H) / 1000 * g.zoom, cell = g.size * u;
  if (!g.on || cell < 4) return;
  const ox = W / 2 + g.x * W + g.ox * u, oy = H / 2 + g.y * H + g.oy * u;
  const m = (v, c) => ((v % c) + c) % c;
  ctx.strokeStyle = g.color; ctx.globalAlpha = g.alpha; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = m(ox, cell); x <= W; x += cell) { ctx.moveTo(Math.round(x) + .5, 0); ctx.lineTo(Math.round(x) + .5, H); }
  for (let y = m(oy, cell); y <= H; y += cell) { ctx.moveTo(0, Math.round(y) + .5); ctx.lineTo(W, Math.round(y) + .5); }
  ctx.stroke(); ctx.globalAlpha = 1;
};
