<script lang="ts">
  /** Små streg-ikoner (24 × 24). `name` er et værktøj eller en lagtype. */
  let { name, size = 18 }: { name: string; size?: number } = $props();

  const PATHS: Record<string, string> = {
    // værktøjer
    hand: 'M8 13V5.5a1.5 1.5 0 0 1 3 0V11m0-1V4.5a1.5 1.5 0 0 1 3 0V11m0-4.5a1.5 1.5 0 0 1 3 0V13m0-4a1.5 1.5 0 0 1 3 0v5c0 4-3 7-7 7h-1.5c-2.5 0-4-1-5.5-3L4 14.5a1.5 1.5 0 0 1 2.4-1.8L8 14',
    select: 'M5 3l14 7-6 2-2 6z',
    stamp: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12v9M12 12L4 7.5M12 12l8-4.5',
    scatter: 'M6 7h.01M12 5h.01M18 8h.01M9 12h.01M15 13h.01M5 17h.01M12 18h.01M19 18h.01',
    line: 'M4 19L10 8l5 6 5-9',
    shape: 'M4 4h10v10H4zM14 10a6 6 0 1 1 0 .01',
    opening: 'M5 20V4h9l5 2v14zM14 4v16M11 12h.01',
    paint: 'M20 4l-9 9m-2 1.5c-2 0-3.5 1.5-3.5 3.5 0 1-1 2-2 2 3 1 8 .5 8-3 0-1.2-.9-2.5-2.5-2.5zM20 4c-1.5-1-3-.5-4.5 1l3.5 3.5C20.5 7 21 5.5 20 4z',
    erase: 'M8 20h12M4.5 14.5L14 5l5 5-9.5 9.5H7l-2.5-2.5a1.5 1.5 0 0 1 0-2z',
    // lagtyper
    ground: 'M3 17c3-2 5-2 9 0s6 2 9 0M3 12c3-2 5-2 9 0s6 2 9 0M3 7c3-2 5-2 9 0s6 2 9 0',
    floor: 'M4 4h16v16H4zM4 12h16M12 4v8M8 12v8M16 12v8',
    objects: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12v9M12 12L4 7.5M12 12l8-4.5',
    walls: 'M4 20V6h16v14M4 11h16M4 16h16M10 6v5M15 11v5M8 16v4',
    effects: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18 16l.8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8z',
    // andet
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
    eyeoff: 'M3 3l18 18M10.5 6.2A9 9 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3 3.5M6.5 7.5C3.8 9.3 2 12 2 12s4 7 10 7c1.5 0 2.8-.4 4-1M9.9 9.9a2.5 2.5 0 0 0 3.2 3.2',
    lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
    unlock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 6.8-1.2',
    plus: 'M12 5v14M5 12h14',
    up: 'M6 15l6-6 6 6',
    down: 'M6 9l6 6 6-6',
    trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
    left: 'M15 6l-6 6 6 6',
    right: 'M9 6l6 6-6 6',
  };
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d={PATHS[name] ?? ''} />
</svg>
