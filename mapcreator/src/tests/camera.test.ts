import { describe, expect, it } from 'vitest';
import { createCamera, fit, MAX_ZOOM, MIN_ZOOM, screenToWorld, worldToScreen, zoomAt } from '../render/camera';

describe('camera', () => {
  it('worldToScreen og screenToWorld er hinandens omvendte', () => {
    const c = { zoom: 2.5, panX: 40, panY: -15 };
    const [sx, sy] = worldToScreen(c, 120, 80);
    const [wx, wy] = screenToWorld(c, sx, sy);
    expect(wx).toBeCloseTo(120);
    expect(wy).toBeCloseTo(80);
  });

  it('zoomAt lader punktet under markøren blive stående', () => {
    const c = { zoom: 1, panX: 10, panY: 20 };
    const before = screenToWorld(c, 300, 200);
    zoomAt(c, 300, 200, 1.7);
    const after = screenToWorld(c, 300, 200);
    expect(after[0]).toBeCloseTo(before[0]);
    expect(after[1]).toBeCloseTo(before[1]);
    expect(c.zoom).toBeCloseTo(1.7);
  });

  it('zoom klemmes til grænserne', () => {
    const c = createCamera();
    zoomAt(c, 0, 0, 1e6);
    expect(c.zoom).toBe(MAX_ZOOM);
    zoomAt(c, 0, 0, 1e-9);
    expect(c.zoom).toBe(MIN_ZOOM);
  });

  it('fit centrerer kortet', () => {
    const c = createCamera();
    fit(c, 1000, 600, 4000, 2750, 0);
    expect(c.zoom).toBeCloseTo(600 / 2750);
    const [x0] = worldToScreen(c, 0, 0);
    const [x1] = worldToScreen(c, 4000, 0);
    expect(x0 + (1000 - x1)).toBeCloseTo(2 * x0);
  });
});
