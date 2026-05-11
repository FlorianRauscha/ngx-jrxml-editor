/** Snap a coordinate or size value to the nearest multiple of `grid`.
 *  Set `grid` to 0 or 1 to disable snapping. */
export function snap(value: number, grid: number): number {
  if (grid <= 1) return Math.round(value);
  return Math.round(value / grid) * grid;
}

/** Default editor grid in CSS pixels. */
export const DEFAULT_GRID = 5;
