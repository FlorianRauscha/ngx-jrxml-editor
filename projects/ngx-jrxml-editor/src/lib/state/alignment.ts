import type { ElementCommon } from '../model/element';
import type { ElementPath } from './path';

export type AlignMode = 'left' | 'h-center' | 'right' | 'top' | 'v-center' | 'bottom';
export type DistributeMode = 'horizontal' | 'vertical';

/** A patch describing the new x and/or y for one element, addressed by path. */
export interface Patch {
  path: ElementPath;
  x?: number;
  y?: number;
}

interface Item {
  path: ElementPath;
  el: ElementCommon;
}

/** Compute new positions for `align` operations. With fewer than two items the
 *  return is empty (alignment requires at least two elements). The returned
 *  patches describe only the axis being aligned — callers should preserve the
 *  other axis. */
export function computeAlignment(items: Item[], mode: AlignMode): Patch[] {
  if (items.length < 2) return [];
  const xs = items.map((i) => i.el.x);
  const ys = items.map((i) => i.el.y);
  const rights = items.map((i) => i.el.x + i.el.width);
  const bottoms = items.map((i) => i.el.y + i.el.height);

  switch (mode) {
    case 'left': {
      const target = Math.min(...xs);
      return items.map((i) => ({ path: i.path, x: target }));
    }
    case 'right': {
      const target = Math.max(...rights);
      return items.map((i) => ({ path: i.path, x: Math.round(target - i.el.width) }));
    }
    case 'h-center': {
      const cx = (Math.min(...xs) + Math.max(...rights)) / 2;
      return items.map((i) => ({ path: i.path, x: Math.round(cx - i.el.width / 2) }));
    }
    case 'top': {
      const target = Math.min(...ys);
      return items.map((i) => ({ path: i.path, y: target }));
    }
    case 'bottom': {
      const target = Math.max(...bottoms);
      return items.map((i) => ({ path: i.path, y: Math.round(target - i.el.height) }));
    }
    case 'v-center': {
      const cy = (Math.min(...ys) + Math.max(...bottoms)) / 2;
      return items.map((i) => ({ path: i.path, y: Math.round(cy - i.el.height / 2) }));
    }
  }
}

/** Distribute element centers evenly along one axis. The first and last
 *  (sorted by center on that axis) stay anchored; everything between gets
 *  evenly-spaced centers. With fewer than three items the return is empty. */
export function computeDistribution(items: Item[], mode: DistributeMode): Patch[] {
  if (items.length < 3) return [];
  const sorted =
    mode === 'horizontal'
      ? [...items].sort(
          (a, b) => a.el.x + a.el.width / 2 - (b.el.x + b.el.width / 2),
        )
      : [...items].sort(
          (a, b) => a.el.y + a.el.height / 2 - (b.el.y + b.el.height / 2),
        );

  const out: Patch[] = [];
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;

  if (mode === 'horizontal') {
    const firstCenter = first.el.x + first.el.width / 2;
    const lastCenter = last.el.x + last.el.width / 2;
    const step = (lastCenter - firstCenter) / (sorted.length - 1);
    for (let i = 1; i < sorted.length - 1; i++) {
      const item = sorted[i]!;
      const target = firstCenter + step * i;
      out.push({ path: item.path, x: Math.round(target - item.el.width / 2) });
    }
  } else {
    const firstCenter = first.el.y + first.el.height / 2;
    const lastCenter = last.el.y + last.el.height / 2;
    const step = (lastCenter - firstCenter) / (sorted.length - 1);
    for (let i = 1; i < sorted.length - 1; i++) {
      const item = sorted[i]!;
      const target = firstCenter + step * i;
      out.push({ path: item.path, y: Math.round(target - item.el.height / 2) });
    }
  }
  return out;
}
