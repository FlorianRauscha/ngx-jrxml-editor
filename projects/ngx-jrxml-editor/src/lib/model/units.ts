export type Pixels = number;

export interface Box {
  x: Pixels;
  y: Pixels;
  width: Pixels;
  height: Pixels;
}

export type HAlign = 'Left' | 'Center' | 'Right' | 'Justified';
export type VAlign = 'Top' | 'Middle' | 'Bottom';

export type StretchType =
  | 'NoStretch'
  | 'ContainerHeight'
  | 'ContainerBottom'
  | 'ElementGroupHeight'
  | 'ElementGroupBottom';

export type PositionType = 'Float' | 'FixRelativeToTop' | 'FixRelativeToBottom';

export interface Color {
  /** "#RRGGBB" or named JR color. Stored as written in JRXML. */
  value: string;
}
