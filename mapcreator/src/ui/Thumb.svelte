<script lang="ts">
  import { getKind } from '../objects';
  import { getSprite } from '../render/sprites';
  import { CELL_PX } from '../model/types';

  let { kindKey, size = 52, seed = 7 }: { kindKey: string; size?: number; seed?: number } = $props();
  let canvas = $state<HTMLCanvasElement>();

  $effect(() => {
    const kind = getKind(kindKey);
    if (!canvas || !kind) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const g = canvas.getContext('2d')!;
    g.clearRect(0, 0, canvas.width, canvas.height);
    // genstanden tegnes i sin standardstørrelse (uden skygge) og tilpasses miniaturen
    const params = Object.fromEntries(kind.params.map((p) => [p.key, p.default]));
    const spr = getSprite({ seed, w: kind.w * CELL_PX, h: kind.h * CELL_PX, params }, kind, 0.5);
    const k = Math.min((size * dpr) / spr.ww, (size * dpr) / spr.hh);
    // lys, store effekter (lys, tåge) trænger til en mørk bund for at kunne ses
    if (kind.family === 'light' || kind.family === 'fog') {
      g.fillStyle = '#3a3f4b';
      g.fillRect(0, 0, canvas.width, canvas.height);
    }
    g.imageSmoothingQuality = 'high';
    g.drawImage(spr.canvas, (canvas.width - spr.ww * k) / 2, (canvas.height - spr.hh * k) / 2, spr.ww * k, spr.hh * k);
  });
</script>

<canvas bind:this={canvas} style="width:{size}px;height:{size}px" aria-hidden="true"></canvas>

<style>
  canvas { display: block; border-radius: 4px; }
</style>
